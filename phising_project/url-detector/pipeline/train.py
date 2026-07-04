"""
Trains the hybrid phishing-URL detection pipeline:

  Branch A - XGBoost over 32 hand-engineered lexical/structural features
             (lexical_features.py) - fast, interpretable, encodes domain expertise.
  Branch B - Character-level CNN over the raw URL string (char_model.py) -
             learns sub-word patterns the engineered features don't capture.
  Meta     - Logistic-regression stacker over out-of-fold probabilities from
             both branches, so the final score reflects whichever branch is
             actually right for a given URL rather than a fixed blend weight.

Usage: python pipeline/train.py
"""
import json
import time

import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
from sklearn.model_selection import StratifiedKFold, train_test_split
from xgboost import XGBClassifier

from pipeline.char_model import CharCNN, encode_batch
from pipeline.lexical_features import FEATURE_NAMES, extract_features

SEED = 42
N_FOLDS = 5
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

torch.manual_seed(SEED)
np.random.seed(SEED)


def build_lexical_matrix(urls):
    t0 = time.time()
    rows = []
    for i, u in enumerate(urls):
        try:
            rows.append(extract_features(u))
        except Exception:
            rows.append([0] * len(FEATURE_NAMES))
        if (i + 1) % 20000 == 0:
            print(f"  lexical features: {i + 1}/{len(urls)} ({time.time() - t0:.1f}s)")
    return np.array(rows, dtype=np.float32)


def train_charcnn(X_urls_train, y_train, X_urls_val, y_val, epochs=4, batch_size=512, lr=1e-3):
    model = CharCNN().to(DEVICE)
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.BCEWithLogitsLoss()

    X_train_enc = encode_batch(X_urls_train)
    y_train_t = torch.tensor(y_train, dtype=torch.float32)
    n = len(X_urls_train)

    for epoch in range(epochs):
        model.train()
        perm = torch.randperm(n)
        total_loss = 0.0
        for start in range(0, n, batch_size):
            idx = perm[start:start + batch_size]
            xb = X_train_enc[idx].to(DEVICE)
            yb = y_train_t[idx].to(DEVICE)
            opt.zero_grad()
            logits = model(xb)
            loss = loss_fn(logits, yb)
            loss.backward()
            opt.step()
            total_loss += loss.item() * len(idx)
        avg_loss = total_loss / n

        val_auc = ""
        if X_urls_val is not None:
            val_probs = predict_charcnn(model, X_urls_val)
            val_auc = f", val_auc={roc_auc_score(y_val, val_probs):.4f}"
        print(f"    epoch {epoch + 1}/{epochs}: train_loss={avg_loss:.4f}{val_auc}")

    return model


@torch.no_grad()
def predict_charcnn(model, urls, batch_size=1024):
    model.eval()
    enc = encode_batch(urls)
    probs = []
    for start in range(0, len(urls), batch_size):
        xb = enc[start:start + batch_size].to(DEVICE)
        logits = model(xb)
        probs.append(torch.sigmoid(logits).cpu().numpy())
    return np.concatenate(probs)


def main():
    print(f"Device: {DEVICE}")
    df = pd.read_csv("pipeline/data/urls_dataset.csv")
    urls = df["url"].tolist()
    y = df["label"].values

    print(f"\nDataset: {len(df)} URLs ({y.sum()} phishing, {len(y) - y.sum()} legitimate)")

    print("\nExtracting lexical features for all URLs...")
    X_lex = build_lexical_matrix(urls)

    urls = np.array(urls, dtype=object)
    idx_all = np.arange(len(urls))
    idx_train, idx_test = train_test_split(
        idx_all, test_size=0.15, random_state=SEED, stratify=y
    )

    urls_train, urls_test = urls[idx_train], urls[idx_test]
    X_lex_train, X_lex_test = X_lex[idx_train], X_lex[idx_test]
    y_train, y_test = y[idx_train], y[idx_test]

    print(f"\nTrain: {len(idx_train)}  Test (held-out): {len(idx_test)}")

    # ---- Out-of-fold predictions for both branches on the training set ----
    skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=SEED)
    oof_xgb = np.zeros(len(idx_train))
    oof_cnn = np.zeros(len(idx_train))

    neg, pos = (y_train == 0).sum(), (y_train == 1).sum()
    scale_pos_weight = neg / pos

    for fold, (tr_i, va_i) in enumerate(skf.split(X_lex_train, y_train)):
        print(f"\n=== Fold {fold + 1}/{N_FOLDS} ===")

        xgb = XGBClassifier(
            n_estimators=300, max_depth=6, learning_rate=0.08,
            subsample=0.9, colsample_bytree=0.9, eval_metric="logloss",
            scale_pos_weight=scale_pos_weight, random_state=SEED, n_jobs=-1,
        )
        xgb.fit(X_lex_train[tr_i], y_train[tr_i])
        oof_xgb[va_i] = xgb.predict_proba(X_lex_train[va_i])[:, 1]
        fold_auc_xgb = roc_auc_score(y_train[va_i], oof_xgb[va_i])
        print(f"  XGBoost fold AUC: {fold_auc_xgb:.4f}")

        cnn = train_charcnn(
            urls_train[tr_i], y_train[tr_i], urls_train[va_i], y_train[va_i], epochs=3
        )
        oof_cnn[va_i] = predict_charcnn(cnn, urls_train[va_i])

    meta_X_train = np.column_stack([oof_xgb, oof_cnn])
    meta = LogisticRegression()
    meta.fit(meta_X_train, y_train)
    print(f"\nMeta-learner coefficients (xgb, cnn): {meta.coef_[0]}, intercept: {meta.intercept_[0]:.4f}")

    # ---- Refit both branches on the FULL training set for production + test eval ----
    print("\nRefitting XGBoost on full training set...")
    xgb_final = XGBClassifier(
        n_estimators=300, max_depth=6, learning_rate=0.08,
        subsample=0.9, colsample_bytree=0.9, eval_metric="logloss",
        scale_pos_weight=scale_pos_weight, random_state=SEED, n_jobs=-1,
    )
    xgb_final.fit(X_lex_train, y_train)

    print("Refitting CharCNN on full training set...")
    cnn_final = train_charcnn(urls_train, y_train, urls_test, y_test, epochs=5)

    # ---- Evaluate on held-out test set ----
    test_xgb_probs = xgb_final.predict_proba(X_lex_test)[:, 1]
    test_cnn_probs = predict_charcnn(cnn_final, urls_test)
    test_meta_probs = meta.predict_proba(np.column_stack([test_xgb_probs, test_cnn_probs]))[:, 1]

    def report(name, probs):
        preds = (probs >= 0.5).astype(int)
        acc = accuracy_score(y_test, preds)
        auc = roc_auc_score(y_test, probs)
        print(f"\n--- {name} ---")
        print(f"accuracy={acc:.4f}  roc_auc={auc:.4f}")
        print(classification_report(y_test, preds, target_names=["legitimate", "phishing"]))
        return acc, auc

    acc_xgb, auc_xgb = report("XGBoost branch (lexical features)", test_xgb_probs)
    acc_cnn, auc_cnn = report("CharCNN branch (raw URL)", test_cnn_probs)
    acc_meta, auc_meta = report("Hybrid ensemble (stacked)", test_meta_probs)

    # ---- Save artifacts ----
    joblib.dump(xgb_final, "pipeline/artifacts/xgb_model.joblib")
    joblib.dump(meta, "pipeline/artifacts/meta_model.joblib")
    torch.save(cnn_final.state_dict(), "pipeline/artifacts/charcnn_model.pt")

    importances = xgb_final.feature_importances_
    ranked = sorted(zip(FEATURE_NAMES, importances), key=lambda x: -x[1])
    with open("pipeline/artifacts/feature_importance.json", "w") as f:
        json.dump([{"feature": f_, "importance": float(i_)} for f_, i_ in ranked], f, indent=2)

    model_info = {
        "architecture": "hybrid: XGBoost(lexical features) + CharCNN(raw URL) + logistic-regression stacker",
        "feature_names": FEATURE_NAMES,
        "label_convention": "1 = phishing, 0 = legitimate",
        "dataset_size": len(df),
        "dataset_sources": [
            "PhishTank verified-online feed (phishing)",
            "Cisco Umbrella Popularity List (legitimate)",
        ],
        "metrics": {
            "xgb_branch": {"accuracy": acc_xgb, "roc_auc": auc_xgb},
            "charcnn_branch": {"accuracy": acc_cnn, "roc_auc": auc_cnn},
            "hybrid_ensemble": {"accuracy": acc_meta, "roc_auc": auc_meta},
        },
        "n_folds": N_FOLDS,
    }
    with open("pipeline/artifacts/model_info.json", "w") as f:
        json.dump(model_info, f, indent=2)

    print("\nSaved artifacts to pipeline/artifacts/")
    print(f"\nFinal hybrid ensemble: accuracy={acc_meta:.4f}  roc_auc={auc_meta:.4f}")


if __name__ == "__main__":
    main()

import json
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report
from xgboost import XGBClassifier

df = pd.read_csv('phishing.csv')
df = df.drop(columns=['index'])

FEATURE_NAMES = [c for c in df.columns if c != 'class']
X = df[FEATURE_NAMES]
y = df['class'].map({-1: 1, 1: 0})  # 1 = phishing, 0 = legitimate (matches app.py convention)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

candidates = {
    'RandomForest': RandomForestClassifier(n_estimators=300, max_depth=None, random_state=42, n_jobs=-1),
    'GradientBoosting': GradientBoostingClassifier(n_estimators=200, learning_rate=0.1, random_state=42),
    'XGBoost': XGBClassifier(
        n_estimators=300, max_depth=6, learning_rate=0.1,
        subsample=0.9, colsample_bytree=0.9, eval_metric='logloss',
        random_state=42, n_jobs=-1
    ),
}

results = {}
for name, model in candidates.items():
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    proba = model.predict_proba(X_test)[:, 1]
    acc = accuracy_score(y_test, preds)
    auc = roc_auc_score(y_test, proba)
    results[name] = {'model': model, 'accuracy': acc, 'auc': auc}
    print(f"{name}: accuracy={acc:.4f}  roc_auc={auc:.4f}")
    print(classification_report(y_test, preds, target_names=['legitimate', 'phishing']))
    print('-' * 60)

best_name = max(results, key=lambda k: results[k]['auc'])
best_model = results[best_name]['model']
print(f"\nBest model: {best_name} (accuracy={results[best_name]['accuracy']:.4f}, auc={results[best_name]['auc']:.4f})")

# Refit best model on the full dataset before shipping
best_model.fit(X, y)
joblib.dump(best_model, 'phishing_model.joblib')

importances = getattr(best_model, 'feature_importances_', None)
if importances is not None:
    ranked = sorted(zip(FEATURE_NAMES, importances), key=lambda x: -x[1])
    with open('feature_importance.json', 'w') as f:
        json.dump([{'feature': f_, 'importance': float(i_)} for f_, i_ in ranked], f, indent=2)
    print("\nTop 10 most important features:")
    for f_, i_ in ranked[:10]:
        print(f"  {f_}: {i_:.4f}")

with open('model_info.json', 'w') as f:
    json.dump({
        'model_name': best_name,
        'accuracy': results[best_name]['accuracy'],
        'roc_auc': results[best_name]['auc'],
        'feature_names': FEATURE_NAMES,
        'label_convention': '1 = phishing, 0 = legitimate'
    }, f, indent=2)

print("\nSaved phishing_model.joblib, feature_importance.json, model_info.json")

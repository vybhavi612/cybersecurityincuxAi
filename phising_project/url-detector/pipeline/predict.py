"""
Unified inference wrapper for the hybrid pipeline. Loads all three trained
artifacts (XGBoost branch, CharCNN branch, meta stacker) once and exposes a
single predict(url) call used by the Flask app.
"""
import json
import os

import joblib
import numpy as np
import torch

from pipeline.char_model import CharCNN, encode_batch
from pipeline.lexical_features import FEATURE_NAMES, LexicalFeatureExtractor

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "artifacts")

# (friendly label, "is this value suspicious?" predicate) per lexical feature.
RISK_RULES = {
    "has_ip_host": ("URL uses a raw IP address instead of a domain", lambda v: v == 1),
    "has_at_symbol": ("Contains '@' symbol (classic URL-obfuscation trick)", lambda v: v == 1),
    "has_double_slash_redirect": ("Suspicious '//' redirection in the path", lambda v: v == 1),
    "is_suspicious_tld": ("Uses a TLD frequently abused for phishing", lambda v: v == 1),
    "is_shortener": ("Uses a URL-shortening service", lambda v: v == 1),
    "has_punycode": ("Punycode domain (possible homograph attack)", lambda v: v == 1),
    "brand_in_subdomain_not_domain": ("Brand name placed in subdomain, not real domain", lambda v: v == 1),
    "min_brand_edit_distance": ("Domain is a near-miss typo of a known brand", lambda v: v <= 2),
    "suspicious_keyword_count": ("Contains multiple credential/urgency keywords", lambda v: v >= 2),
    "is_https": ("Not using HTTPS", lambda v: v == 0),
    "num_subdomains": ("Excessive number of subdomains", lambda v: v >= 3),
    "url_entropy": ("Unusually high randomness in the URL", lambda v: v >= 4.3),
    "digit_ratio": ("High proportion of digits in the URL", lambda v: v >= 0.2),
    "hyphen_in_domain": ("Domain contains a hyphen", lambda v: v == 1),
    "path_depth": ("Deeply nested URL path", lambda v: v >= 5),
    "num_query_params": ("Unusually many query parameters", lambda v: v >= 6),
}


class HybridPredictor:
    def __init__(self, artifact_dir: str = ARTIFACT_DIR):
        self.xgb = joblib.load(os.path.join(artifact_dir, "xgb_model.joblib"))
        self.meta = joblib.load(os.path.join(artifact_dir, "meta_model.joblib"))

        self.cnn = CharCNN()
        self.cnn.load_state_dict(torch.load(
            os.path.join(artifact_dir, "charcnn_model.pt"), map_location="cpu"
        ))
        self.cnn.eval()

        with open(os.path.join(artifact_dir, "feature_importance.json")) as f:
            self.feature_importance = {row["feature"]: row["importance"] for row in json.load(f)}

        with open(os.path.join(artifact_dir, "model_info.json")) as f:
            self.model_info = json.load(f)

        with open(os.path.join(artifact_dir, "trusted_domains.json")) as f:
            self.trusted_domains = set(json.load(f))

    def _is_allowlisted(self, extractor: LexicalFeatureExtractor, feat: dict) -> bool:
        """Known-domain allowlist safeguard (standard practice in production
        anti-phishing systems, e.g. browser Safe Browsing allowlists): a top-50k
        global domain showing none of the classic hard risk markers is treated as
        legitimate even if the URL's path/query shape confuses the ML branches -
        no amount of synthetic training-path diversity can cover every real-world
        path convention (e.g. code-hosting org/repo URLs), so this closes that gap
        without the model having to memorize every popular site's path style."""
        registered_domain = f"{extractor.domain}.{extractor.tld}".lower()
        if registered_domain not in self.trusted_domains:
            return False
        return not (feat["has_ip_host"] or feat["has_punycode"] or feat["has_at_symbol"]) and feat["is_https"]

    def predict(self, url: str) -> dict:
        extractor = LexicalFeatureExtractor(url)
        lex_features = extractor.extract()
        feat = dict(zip(FEATURE_NAMES, lex_features))
        xgb_prob = float(self.xgb.predict_proba([lex_features])[:, 1][0])

        with torch.no_grad():
            enc = encode_batch([url])
            cnn_prob = float(torch.sigmoid(self.cnn(enc)).item())

        final_prob = float(self.meta.predict_proba([[xgb_prob, cnn_prob]])[:, 1][0])
        allowlisted = self._is_allowlisted(extractor, feat)
        if allowlisted:
            final_prob = min(final_prob, 0.05)
        is_phishing = final_prob >= 0.5

        risk_factors = []
        for name, value in zip(FEATURE_NAMES, lex_features):
            rule = RISK_RULES.get(name)
            if rule is None:
                continue
            label, is_risky = rule
            if is_risky(value):
                risk_factors.append({"name": label, "importance": self.feature_importance.get(name, 0)})
        risk_factors.sort(key=lambda r: -r["importance"])

        return {
            "url": url,
            "is_phishing": is_phishing,
            "prediction": "Phishing" if is_phishing else "Not Phishing",
            "final_prob": final_prob,
            "safe_pct": round((1 - final_prob) * 100, 2),
            "phishing_pct": round(final_prob * 100, 2),
            "branch_scores": {
                "xgb_lexical": round(xgb_prob, 4),
                "charcnn_raw_url": round(cnn_prob, 4),
            },
            "risk_factors": risk_factors[:8],
            "trusted_domain_allowlisted": allowlisted,
        }


_predictor = None


def get_predictor() -> HybridPredictor:
    global _predictor
    if _predictor is None:
        _predictor = HybridPredictor()
    return _predictor

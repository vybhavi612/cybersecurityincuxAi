# Phishing URL Detection - Hybrid ML/DL Pipeline

Classifies URLs as phishing or legitimate using a **hybrid ensemble** of two
complementary models, stacked with a logistic-regression meta-learner, plus a
trusted-domain allowlist safeguard. Held-out test accuracy: **99.3%** (ROC-AUC
0.9996) on 185k live URLs.

## Architecture

```
URL ──┬─► lexical_features.py (32 hand-engineered features) ──► XGBoost ──┐
      │                                                                    ├─► Logistic-regression ──► verdict
      └─► char_model.py (raw character sequence) ──► CharCNN (GPU) ───────┘        stacker
                                                                                     │
                                        trusted_domains.json allowlist ─────────────┘
                                        (overrides false positives on well-known,
                                         risk-marker-free domains)
```

- **Branch A - XGBoost over lexical/structural features** (`pipeline/lexical_features.py`):
  32 features computed purely from the URL string (entropy, brand-typosquat
  edit distance, suspicious TLDs/keywords, IP-host/punycode/shortener
  detection, etc). No live HTTP fetch, WHOIS lookup, or third-party API call -
  unlike the legacy `feature.py`, which depended on the (now-defunct) Alexa
  rank API and checkpagerank.net, and on WHOIS/Google-search scraping that
  gets rate-limited/blocked in production.
- **Branch B - character-level CNN over the raw URL** (`pipeline/char_model.py`):
  learns sub-word patterns (typosquat substitutions, unusual token structure)
  that hand-crafted features can miss. Trains on GPU (CUDA) if available.
- **Meta stacker**: logistic regression over out-of-fold probabilities from
  both branches (`pipeline/train.py`), so the final score reflects whichever
  branch is actually right for a given URL.
- **Trusted-domain allowlist** (`pipeline/predict.py`): a top-50k global-domain
  list overrides the ML verdict when a URL's *registered* domain (via
  `tldextract`, not substring match) is on the list and shows no hard risk
  markers (no raw-IP host, no punycode, no `@`, HTTPS). Standard practice in
  production anti-phishing systems - closes false positives on legitimate
  sites with unusual path conventions (e.g. code-hosting org/repo URLs) that
  no amount of synthetic training-path diversity fully covers.

## Data

`pipeline/build_dataset.py` builds `pipeline/data/urls_dataset.csv` from two
live public feeds (no manual dataset curation, refreshable anytime):

- **Phishing**: [PhishTank](https://phishtank.org) verified-online feed.
- **Legitimate**: [Cisco Umbrella Popularity List](https://s3-us-west-1.amazonaws.com/umbrella-static/index.html),
  with synthetic-but-realistic paths/subdomains/query strings generated per
  domain (not just the bare domain root) so path complexity isn't a spurious
  phishing signal.

## Usage

```bash
pip install -r requirements.txt
python pipeline/build_dataset.py   # (re)build the dataset from live feeds
python -m pipeline.train           # train all branches + meta stacker, ~5 min on GPU
python app.py                      # Flask UI at http://127.0.0.1:5050
```

`pipeline/predict.py` exposes `get_predictor().predict(url)` for programmatic use.

## Legacy files

`feature.py`, `train_model.py`, `phishing_model.joblib` are the original
single-model (RandomForest, 30-feature) implementation, kept for reference but
no longer used by `app.py`.

# Phishing Project

Two parts:

## `url-detector/`
ML-based phishing URL classifier (Flask app). Extracts 30 URL/page features and predicts phishing vs legitimate with a RandomForest model (98.7% test accuracy). Run locally:
```
cd url-detector
pip install -r requirements.txt
python app.py
```
Then open http://127.0.0.1:5050/.

## `awareness-training/`
A phishing-awareness training suite — simulated attacks that reveal an educational message immediately after someone "falls for it," plus a live tracking dashboard.

- `ms-login-clone/` — fake Microsoft sign-in page
- `qr-otp-rewards/` — fake rewards page reached via QR code, asks for an OTP
- `hi-app-exe/` — Electron app disguised as a harmless file, simulates a malware-style attachment
- `tracking-dashboard/` — Node/Express backend + dashboard recording page views and "fell for it" events from the three simulations above

Each simulation only logs event *types* (e.g. `credential_submit`), never the actual entered values.

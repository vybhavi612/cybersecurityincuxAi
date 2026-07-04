# Phishing Project

Two parts:

## `url-detector/`
Hybrid ML/DL phishing URL classifier (Flask app): an XGBoost model over 32
hand-engineered lexical/structural URL features, a character-level CNN (PyTorch,
GPU-trained) over the raw URL string, combined by a logistic-regression
meta-stacker, with a trusted-domain allow-list safeguard. Trained on live data
(PhishTank + Cisco Umbrella), 99.3% held-out accuracy / 0.9996 ROC-AUC. See
`url-detector/README.md` and `documentation/` for full architecture details. Run
locally:
```
cd url-detector
pip install -r requirements.txt
python app.py
```
Then open http://127.0.0.1:5050/.

## `awareness-training/`
A phishing-awareness training suite — simulated attacks that reveal an educational
message immediately after someone "falls for it," plus a live tracking dashboard.

- `ms-login-clone/` — fake Microsoft sign-in page
- `qr-otp-rewards/` — fake rewards page reached via QR code, asks for an OTP
- `hi-app-exe/` — Electron app disguised as a harmless file, simulates a malware-style attachment
- `tracking-dashboard/` — Node/Express backend + dashboard recording page views and "fell for it" events from the three simulations above

Each simulation only logs event *types* (e.g. `credential_submit`), never the actual entered values.

## `documentation/`
Full project report (LaTeX source + compiled PDF) covering phishing background,
each simulation's attack scenario and screenshots, and the ML pipeline's
architecture, dataset, training methodology, and results — plus a short demo
video walking through all five components.

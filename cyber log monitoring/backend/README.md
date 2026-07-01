# Backend — Security Audit Log Monitoring API

FastAPI + SQLAlchemy (SQLite by default) + scikit-learn.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
copy .env.example .env        # Windows; `cp` on macOS/Linux
```

## Run

```bash
# 1. Create demo accounts (admin / alice / bob)
python seed_data.py

# 2. Seed ~30 days of normal activity + attack scenarios, train the ML model
python simulate_attacks.py

# 3. Start the API
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs
WebSocket (live dashboard feed): `ws://localhost:8000/ws/dashboard`

Demo logins:

| username | password      | role  |
|----------|---------------|-------|
| admin    | Admin@12345   | admin |
| alice    | Alice@12345   | user  |
| bob      | Bob@12345     | user  |

Dashboard/alerts/search/simulate endpoints require `role=admin` — log in as `admin`.

## Retraining the ML model

As more audit log data accumulates:

```bash
python -m app.ml.train_model
```

## Triggering live attack simulations (server must be running)

Use `/docs` (Swagger UI) → `POST /api/simulate/brute-force` etc., authenticated
as `admin`. Each call runs real events through the same detection pipeline as
production traffic and will raise real alerts visible on the dashboard / in
`/api/alerts`.

## Architecture notes

- **Tamper-evidence**: every `audit_logs` row stores `prev_hash` + a SHA-256
  `entry_hash` over its own fields chained to the previous row. `GET
  /api/logs/verify-chain` re-walks the chain and flags the first row where the
  recomputed hash doesn't match — i.e. any direct DB edit/delete is detectable.
- **Risk scoring**: `app/risk_engine.py` holds the base scores from the spec;
  `app/security_logging.py` combines the base score with every detection
  module's modifier (`max()`, clamped 0-100) into the final score stored on
  the log row.
- **Detection modules** (`app/detection/`): brute force / credential
  stuffing, account takeover (new device, impossible travel, multi-country),
  privilege abuse (mass delete, bulk export, privilege change), insider
  threat (unusual hour, repeated sensitive access, excessive downloads),
  threat intel matching (blacklisted IPs/countries/users).
- **ML** (`app/ml/`): a global `IsolationForest` over
  `[hour, day_of_week, event_type, base_risk]` catches rare/abnormal
  combinations; `uba.py` keeps a per-user rolling baseline (typical login
  hour + stddev, common locations/countries) and flags deviations.
- **Alerts**: every detection hit becomes an `Alert` row (`INFO`..`CRITICAL`)
  and is pushed over the dashboard WebSocket immediately; `HIGH`/`CRITICAL`
  also attempt an email dispatch if `ENABLE_EMAIL_ALERTS=true` in `.env`. SMS
  is stubbed (`app/alerts.py:send_sms_alert`) pending a Twilio-style
  integration.

## Not yet implemented (documented scope cuts from the original spec)

- World-map rendering and full SIEM-style log *correlation* engine — the data
  endpoints (`/api/dashboard/geo`, `/api/dashboard/alerts-by-region`) exist;
  the frontend currently renders them as tables/bars, not a literal map.
- SMS alerting (stub only, no Twilio credentials assumed).
- GDPR/ISO27001/SOC report *generation* (PDF/exports) — the underlying
  immutable, searchable, filterable audit trail that those reports would be
  built from is implemented.

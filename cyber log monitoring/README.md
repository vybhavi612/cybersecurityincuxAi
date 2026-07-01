# AI-Powered Security Audit Log Monitoring & Threat Detection System

A full-stack platform that tracks user activity, builds a tamper-evident
audit trail, scores every action's risk in real time, and runs both
rule-based and ML-based (Isolation Forest + User Behavior Analytics)
threat detection — with live alerting on a SIEM-style dashboard.

```
backend/    FastAPI + SQLAlchemy (SQLite) + scikit-learn
frontend/   React (Vite) + Tailwind + Recharts, real-time via WebSocket
```

## Quick start

```bash
# Backend
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python seed_data.py          # creates admin / alice / bob demo accounts
python simulate_attacks.py   # seeds 30d of normal activity + attack scenarios, trains the ML model
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, log in as `admin` / `Admin@12345`. Full
backend docs (Swagger) at http://localhost:8000/docs.

See [backend/README.md](backend/README.md) for API/architecture details
and [frontend/README.md](frontend/README.md) for the page-by-page
frontend overview.

## How the spec maps to the implementation

| Spec area | Where it lives |
|---|---|
| Activity logging (12 event types, JSON shape) | `backend/app/models.py` (`EventType`), `app/security_logging.py` |
| Brute force / credential stuffing detection | `backend/app/detection/brute_force.py` |
| Account takeover (new device, impossible travel, multi-country) | `backend/app/detection/account_takeover.py` |
| Privilege abuse (mass delete, bulk export, privilege change) | `backend/app/detection/privilege_abuse.py` |
| Insider threat (unusual hour, repeated sensitive access, excess downloads) | `backend/app/detection/insider_threat.py` |
| Isolation Forest (abnormal frequency/patterns/rare actions) | `backend/app/ml/isolation_forest.py` |
| User Behavior Analytics (typical hour/location baseline) | `backend/app/ml/uba.py` |
| Risk scoring engine (0-100, LOW/MEDIUM/HIGH) | `backend/app/risk_engine.py` |
| Session tracking & timeline | `UserSession` model + `GET /api/logs/session/{id}` + frontend `SessionTimeline.jsx` |
| Geolocation (IP → city/country) | `backend/app/geolocation.py` |
| Real-time dashboard | `GET /api/dashboard/stats` + `/ws/dashboard` WebSocket + `Dashboard.jsx` |
| Security heatmaps (hourly login activity, regional activity) | `/api/dashboard/heatmap/hourly`, `/api/dashboard/geo`, `/api/dashboard/alerts-by-region` |
| Alert management (INFO..CRITICAL, dashboard/email/SMS) | `backend/app/alerts.py`, `Alerts.jsx` (SMS stubbed, see below) |
| Audit trail search (username/event/date/risk/IP/location) | `GET /api/logs/search` + `AuditTrail.jsx` |
| Immutable / tamper-evident logs | SHA-256 hash chain on every `AuditLog` row, `GET /api/logs/verify-chain` |
| Threat intelligence (malicious IPs/countries/blacklisted users) | `ThreatIntelIP`/`ThreatIntelCountry` models, `app/detection/threat_intel.py` |
| Attack simulation module | `backend/app/routers/simulate_routes.py`, `Simulate.jsx`, `backend/simulate_attacks.py` |

### Documented scope cuts (bonus items not fully built)

- **World map rendering**: the geo-aggregation data endpoints exist
  (`/api/dashboard/geo`); the frontend renders them as a table, not an
  actual map widget.
- **SMS alerts**: stubbed in `app/alerts.py:send_sms_alert` (needs a paid
  Twilio-style integration — not wired up by default).
- **Full SIEM log *correlation* engine** (cross-source enrichment beyond
  this app's own logs) and **GDPR/ISO27001/SOC report generation**
  (PDF/exports): the underlying immutable, searchable audit trail that
  such reports/correlation would be built on is implemented; report
  *generation* itself is not.

These were deliberately deprioritized to ship a working, demonstrable
core (logging → detection → scoring → alerting → dashboard) end-to-end
rather than a partial build of everything. Happy to build any of them
out next — say which one.

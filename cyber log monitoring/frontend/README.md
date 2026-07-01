# Frontend — Security Audit Dashboard

React (Vite) + Tailwind v4 + Recharts. Talks to the FastAPI backend at
`http://localhost:8000` (REST) and `ws://localhost:8000/ws/dashboard`
(live feed) — see `src/api/client.js` to change those if you deploy
the backend elsewhere.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173. Requires the backend running and seeded
(see [../backend/README.md](../backend/README.md)).

## Pages

| Route | File | Purpose |
|---|---|---|
| `/login` | `src/pages/Login.jsx` | Auth |
| `/` | `src/pages/Dashboard.jsx` | Live stats, hourly heatmap, top IPs, regional activity, live event/alert feed |
| `/audit-trail` | `src/pages/AuditTrail.jsx` | Filterable log search + hash-chain verification |
| `/alerts` | `src/pages/Alerts.jsx` | Alert list, filter by level/status, acknowledge/resolve |
| `/sessions` | `src/pages/SessionTimeline.jsx` | Single-session event timeline |
| `/simulate` | `src/pages/Simulate.jsx` | Admin-only attack simulation triggers |

Dashboard/Alerts/Audit Trail/Simulate require an `admin` login — the
backend enforces this server-side, not just hidden client-side.

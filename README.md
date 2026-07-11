# SecureLog — Log Management System for Cybersecurity

A full-stack, production-quality web application for recording, storing,
searching, filtering, and analyzing cybersecurity security events. Built
as a major college project with Flask, SQLAlchemy, Bootstrap 5, and
Chart.js — designed to be both academically evaluable and portfolio-ready.

![Python](https://img.shields.io/badge/python-3.10+-blue)
![Flask](https://img.shields.io/badge/flask-3.0-black)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **Authentication & Authorization** — Session-based login (Flask-Login) with two roles, Admin and Analyst, enforced on every route
- **Security Dashboard** — Total logs, critical/warning alerts, blocked IPs, severity distribution, protocol usage, top attack types, top source IPs, events-per-hour, latest logs, and recent alerts — all backed by live Chart.js visualizations
- **Full Log CRUD** — Search, advanced multi-field filters, pagination, add/edit/delete (role-restricted), and detailed single-log views
- **Alerts** — Auto-generated for High/Critical severity events, with read/resolve/reopen workflow and a live-polling navbar bell
- **Incidents** — Case management linking multiple related logs via a proper many-to-many association table
- **Simulated Real-Time Log Generation** — A background thread continuously generates realistic events, plus a one-click "Simulate Attack" button for instant demo bursts
- **Reports & Exports** — CSV export, formatted PDF log reports, and a one-page executive summary PDF (ReportLab)
- **User Management** — Admin-only account creation, deactivation/reactivation, and manual lockout clearing
- **Security Hardening** — CSRF protection, rate-limited login, account lockout after repeated failures, auto-blocking of abusive IPs, security response headers (Talisman), server-side password policy, and a full audit trail of every write action
- **Responsive Dark UI** — Custom cybersecurity-themed dashboard with a professional blue/cyan palette, built on Bootstrap 5

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask (application factory + blueprints) |
| Database | SQLite via SQLAlchemy ORM (9 normalized tables) |
| Auth | Flask-Login, Flask-WTF (CSRF), Flask-Limiter |
| Frontend | Bootstrap 5, Chart.js, Bootstrap Icons, vanilla JS |
| Reports | ReportLab (PDF), built-in `csv` module |
| Sample Data | Faker (550+ realistic seeded log records) |

---

## Project Structure

```
log-management-system/
├── app.py                  # Application entry point (factory pattern)
├── config.py                # Environment-based configuration
├── extensions.py            # Flask extension instances
├── requirements.txt
├── .env.example              # Copy to .env before running
├── .flaskenv
│
├── database/                 # Schema init + sample data seeding
├── models/                    # SQLAlchemy models (9 tables) + enums
├── routes/                    # Blueprints: auth, dashboard, logs, alerts,
│                                # incidents, reports, api, users
├── forms/                     # Flask-WTF forms
├── utils/                     # Decorators, validators, stats, exports,
│                                # log generator, query helpers, caching
│
├── templates/                 # Jinja2 templates (dark cybersecurity theme)
├── static/
│   ├── css/                    # style.css, dashboard.css, auth.css
│   ├── js/                     # main.js, charts.js, alerts.js, dashboard.js
│   └── img/                    # logo.svg
│
├── instance/                  # SQLite database file lives here (gitignored)
├── logs/                      # Application runtime logs (gitignored)
└── reports/                   # Reserved for on-disk report output (gitignored)
```

---

## Getting Started (Local Installation)

### Prerequisites

- Python 3.10 or newer
- pip

### 1. Extract the project and open it in VS Code

Unzip the project folder and open it in VS Code (`File → Open Folder…`).

### 2. Create and activate a virtual environment

**Windows (PowerShell):**
```powershell
python -m venv venv
venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**
```cmd
python -m venv venv
venv\Scripts\activate.bat
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

You should see `(venv)` appear at the start of your terminal prompt once activated.

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Copy the example environment file to `.env`:

**Windows:**
```cmd
copy .env.example .env
```

**macOS / Linux:**
```bash
cp .env.example .env
```

The defaults in `.env` work out of the box for local development. At minimum, review:
- `SECRET_KEY` — leave blank for auto-generated (dev only), or set a fixed random string
- `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` — the bootstrap admin account created on first run

### 5. Run the application

```bash
python app.py
```

On first run, the app automatically:
- Creates the SQLite database schema (`instance/log_management.db`)
- Creates a bootstrap Admin account (`admin` / `ChangeMe@123` by default — **change this immediately**)
- Seeds the database with 550+ realistic sample security logs, 20 event types, alerts, blocked IPs, and incidents

The server starts at **http://127.0.0.1:5000**

### 6. Log in

Navigate to `http://127.0.0.1:5000` and sign in with the bootstrap admin credentials from your `.env` file (default: `admin` / `ChangeMe@123`).

> ⚠️ **Change the default admin password immediately** via **Account Settings** in the top-right user menu after your first login.

---

## Default Sample Accounts

Seeded automatically on first run:

| Username | Role | Password |
|---|---|---|
| `admin` | Admin | Value of `ADMIN_PASSWORD` in `.env` (default `ChangeMe@123`) |
| `alice.chen` | Analyst | `Analyst@123` |
| `marcus.reyes` | Analyst | `Analyst@123` |
| `priya.nair` | Analyst | `Analyst@123` |

---

## Resetting the Database

To wipe all data and reseed from scratch, stop the server and delete the database file:

```bash
# macOS / Linux
rm instance/log_management.db

# Windows
del instance\log_management.db
```

The next time you run `python app.py`, the schema and sample data will be recreated automatically.

Alternatively, use the Flask CLI commands:
```bash
flask init-db     # create schema + bootstrap admin only
flask seed-db      # populate sample data (run after init-db on an empty DB)
```

---

## Configuration Reference

All settings live in `.env` (see `.env.example` for the full list with defaults):

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Flask session signing key |
| `DATABASE_URL` | SQLite database filename (keep as a bare filename, e.g. `sqlite:///log_management.db`) |
| `MAX_LOGIN_ATTEMPTS` / `LOGIN_LOCKOUT_MINUTES` | Brute-force lockout policy |
| `LOGS_PER_PAGE` | Pagination size on the logs list page |
| `MAX_EXPORT_ROWS` | Cap on rows included in CSV/PDF exports |
| `ENABLE_LOG_GENERATOR` | Toggle the background simulated log generator thread |
| `LOG_GEN_INTERVAL_MIN` / `_MAX` | Seconds between auto-generated logs |
| `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrap admin account credentials |

---

## Role Permissions

| Action | Admin | Analyst |
|---|:---:|:---:|
| View / search / filter logs | ✅ | ✅ |
| Add logs | ✅ | ✅ |
| Edit / delete logs | ✅ | ❌ |
| View / resolve alerts | ✅ | ✅ |
| Create / edit incidents | ✅ | ✅ |
| Delete incidents | ✅ | ❌ |
| Export CSV / PDF reports | ✅ | ✅ |
| Manage user accounts | ✅ | ❌ |

---

## Troubleshooting

**"unable to open database file"** — Ensure `DATABASE_URL` in `.env` is a bare filename (e.g. `sqlite:///log_management.db`), not prefixed with `instance/`. Flask-SQLAlchemy resolves relative SQLite paths against the instance folder automatically.

**Port 5000 already in use** — Change `FLASK_RUN_PORT` in `.flaskenv`, or run with `python app.py` and set `FLASK_RUN_PORT` in `.env` instead.

**`pip install` fails with "externally-managed-environment"** — Make sure your virtual environment is activated (step 2) before running `pip install`.

---

## License

This project was built for academic purposes as a major college project. Free to use, modify, and extend for educational and portfolio purposes.

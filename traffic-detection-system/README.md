# Traffic Detection and Automatic Blocking System for Cybersecurity

Incux Traffic Detection is a complete defensive monitoring project with real-time packet ingest, rule-based attack detection, automated IP blocking, persistent logs, alerts, and a live web dashboard.

## What I Built

I built an end-to-end network defense application that captures or simulates packet traffic, evaluates each source with rule-based and machine-learning-assisted detection, records security events in SQLite, and can automatically respond by creating host firewall rules. I also built the FastAPI REST/WebSocket backend and a responsive browser dashboard for live traffic, alerts, AI insights, blocked addresses, and security statistics.

## Features

- Real-time network traffic monitoring with Scapy live capture or built-in simulation mode
- Rule-based detection for port scans, brute-force attempts, DDoS-like bursts, and abnormal packet rates
- AI anomaly scoring with Isolation Forest when `scikit-learn` is installed
- Local statistical fallback for AI-style risk scoring when ML dependencies are unavailable
- Automatic malicious IP blocking with dry-run mode by default
- Optional host firewall integration through Windows `netsh` or Linux `iptables`
- SQLite logging for packets, alerts, and blocked IP addresses
- FastAPI REST API and WebSocket updates
- Interactive dashboard with traffic charts, alerts, recent packets, and block status

## Quick Start

```powershell
cd traffic-detection-system
python -m venv .venv
.\.venv\Scripts\pip.exe install -r requirements.txt
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000
```

Open:

```text
http://127.0.0.1:8000
```

The default `CAPTURE_MODE=simulation` produces normal and malicious-looking traffic so the dashboard, alerts, and blocking workflow can be demonstrated without administrator privileges.

## Real Packet Capture

1. Install Npcap on Windows or libpcap on Linux.
2. Run the shell as administrator/root.
3. Copy `.env.example` to `.env`.
4. Set:

```env
CAPTURE_MODE=live
CAPTURE_INTERFACE=
```

Leave `CAPTURE_INTERFACE` empty to let Scapy choose a default interface, or set it to a specific adapter name.

## Firewall Blocking

Automatic firewall changes are disabled by default for safety:

```env
ENABLE_FIREWALL_BLOCKING=false
AUTO_BLOCK=true
```

With this default, detected attackers are recorded in `blocked_ips` as `dry_run`. To allow real blocking, run as administrator/root and set:

```env
ENABLE_FIREWALL_BLOCKING=true
```

Windows uses:

```text
netsh advfirewall firewall add rule name=IncuxBlock_<ip> dir=in action=block remoteip=<ip>
```

Linux uses:

```text
iptables -I INPUT -s <ip> -j DROP
```

## API

- `GET /api/health`
- `GET /api/stats`
- `GET /api/packets?limit=100`
- `GET /api/alerts?limit=100`
- `GET /api/ai?limit=100`
- `GET /api/blocked`
- `POST /api/block/{ip}`
- `DELETE /api/block/{ip}`
- `WS /ws`

## Detection Rules

Thresholds are configured in `.env`:

```env
PORT_SCAN_UNIQUE_PORTS=15
PORT_SCAN_WINDOW_SECONDS=60
BRUTE_FORCE_ATTEMPTS=10
BRUTE_FORCE_WINDOW_SECONDS=120
DDOS_PACKET_THRESHOLD=180
DDOS_WINDOW_SECONDS=10
ABNORMAL_PACKET_THRESHOLD=300
ABNORMAL_WINDOW_SECONDS=60
```

## Project Structure

```text
app/
  blocker.py      Firewall and dry-run blocking
  capture.py      Live Scapy capture and simulation generator
  config.py       Environment-driven settings
  database.py     SQLite persistence
  detector.py     Rule-based detection engine
  ai_engine.py    AI anomaly scoring and explanations
  main.py         FastAPI app and API routes
  schemas.py      Packet and alert dataclasses
static/
  app.js          Dashboard live updates
  index.html      Dashboard page
  styles.css      Dashboard styling
```

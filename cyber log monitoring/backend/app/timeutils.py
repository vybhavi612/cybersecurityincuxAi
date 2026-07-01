"""
Central clock for the whole app: all audit logs, sessions, alerts, and
device/profile timestamps are recorded in IST (Asia/Kolkata), not UTC.

`now_ist()` returns a naive datetime (no tzinfo) holding IST wall-clock
time -- kept naive so it stores/compares/serializes the same way the rest
of the codebase already expected from `datetime.utcnow()`, just shifted to
IST. JWT token expiry (`app/auth.py`) intentionally keeps using
`datetime.utcnow()` instead -- that's an internal protocol detail (python-
jose encodes/validates `exp` assuming UTC), not a "logged" timestamp.
"""
from datetime import datetime
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")


def now_ist() -> datetime:
    return datetime.now(IST).replace(tzinfo=None)

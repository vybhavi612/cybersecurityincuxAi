"""
Account takeover detection:
  - new device / fingerprint never seen for this user
  - impossible travel (two logins too far apart, too close in time)
  - logins from multiple countries within a short window
"""
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.detection import Finding
from app.geolocation import implied_speed_kmh
from app.models import AuditLog, KnownDevice, AlertType, EventType
from app.timeutils import now_ist


def check_new_device(db: Session, user_id: int, device_fingerprint: str) -> Optional[Finding]:
    known = (
        db.query(KnownDevice)
        .filter(KnownDevice.user_id == user_id, KnownDevice.device_fingerprint == device_fingerprint)
        .first()
    )
    if known:
        known.last_seen = now_ist()
        db.add(known)
        return None

    db.add(
        KnownDevice(
            user_id=user_id,
            device_fingerprint=device_fingerprint,
            first_seen=now_ist(),
            last_seen=now_ist(),
        )
    )
    # First login ever (no prior device rows) isn't "new device" in the threat sense.
    prior_devices = (
        db.query(KnownDevice).filter(KnownDevice.user_id == user_id).count()
    )
    if prior_devices == 0:
        return None

    return Finding(
        alert_type=AlertType.NEW_DEVICE,
        level="MEDIUM",
        message=f"Login from a previously unseen device/browser fingerprint.",
        risk_modifier=50,
    )


def check_impossible_travel(
    db: Session, user_id: int, lat: Optional[float], lon: Optional[float], timestamp: datetime
) -> Optional[Finding]:
    if lat is None or lon is None:
        return None

    last_login = (
        db.query(AuditLog)
        .filter(
            AuditLog.user_id == user_id,
            AuditLog.event_type == EventType.LOGIN,
            AuditLog.lat.isnot(None),
            AuditLog.lon.isnot(None),
        )
        .order_by(AuditLog.timestamp.desc())
        .first()
    )
    if not last_login:
        return None

    speed = implied_speed_kmh(last_login.lat, last_login.lon, last_login.timestamp, lat, lon, timestamp)
    if speed is not None and speed > settings.IMPOSSIBLE_TRAVEL_MAX_SPEED_KMH:
        return Finding(
            alert_type=AlertType.IMPOSSIBLE_TRAVEL,
            level="CRITICAL",
            message=(
                f"Impossible travel: implied speed {speed:,.0f} km/h between consecutive "
                f"logins (prev: {last_login.location}, now: lat={lat:.2f}, lon={lon:.2f})."
            ),
            risk_modifier=95,
        )
    return None


def check_multi_country(
    db: Session, user_id: int, country: Optional[str], timestamp: datetime, window_minutes: int = 60
) -> Optional[Finding]:
    if not country:
        return None
    window_start = timestamp - timedelta(minutes=window_minutes)
    countries = (
        db.query(AuditLog.country)
        .filter(
            AuditLog.user_id == user_id,
            AuditLog.event_type == EventType.LOGIN,
            AuditLog.timestamp >= window_start,
            AuditLog.country.isnot(None),
        )
        .distinct()
        .all()
    )
    distinct_countries = {c[0] for c in countries} | {country}
    if len(distinct_countries) > 1:
        return Finding(
            alert_type=AlertType.ACCOUNT_TAKEOVER,
            level="HIGH",
            message=(
                f"Logins from {len(distinct_countries)} different countries within "
                f"{window_minutes} min: {', '.join(sorted(distinct_countries))}."
            ),
            risk_modifier=85,
        )
    return None


def run_all(
    db: Session,
    user_id: int,
    device_fingerprint: str,
    lat: Optional[float],
    lon: Optional[float],
    country: Optional[str],
    timestamp: datetime,
) -> List[Finding]:
    findings: List[Finding] = []
    nd = check_new_device(db, user_id, device_fingerprint)
    if nd:
        findings.append(nd)
    it = check_impossible_travel(db, user_id, lat, lon, timestamp)
    if it:
        findings.append(it)
    mc = check_multi_country(db, user_id, country, timestamp)
    if mc:
        findings.append(mc)
    return findings

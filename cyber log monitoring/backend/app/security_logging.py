"""
The core pipeline: every user action in the system funnels through
`log_event()`. It is responsible for:

  1. Resolving geolocation for the source IP.
  2. Computing a base risk score for the event type.
  3. Running all rule-based detection modules (brute force, account
     takeover, privilege abuse, insider threat, threat intel) plus the
     ML modules (Isolation Forest global anomaly model + per-user UBA
     deviation), combining their outputs into a final 0-100 risk score.
  4. Persisting the entry with a SHA-256 hash chain (tamper-evidence).
  5. Raising an Alert row for every detection hit, and pushing both the
     log entry and any alerts to connected dashboard clients over
     WebSocket in real time.
"""
import hashlib
import json
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.alerts import create_alert
from app.detection import account_takeover, brute_force, insider_threat, privilege_abuse, threat_intel
from app.geolocation import lookup_ip
from app.ml import isolation_forest, uba
from app.models import AlertType, AuditLog, EventType
from app.risk_engine import base_score, combine
from app.timeutils import now_ist
from app.websocket_manager import broadcast_sync


def _compute_entry_hash(prev_hash: Optional[str], fields: dict) -> str:
    canonical = json.dumps(fields, sort_keys=True, default=str)
    payload = f"{prev_hash or ''}|{canonical}"
    return hashlib.sha256(payload.encode()).hexdigest()


def _last_entry_hash(db: Session) -> Optional[str]:
    last = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    return last.entry_hash if last else None


def log_event(
    db: Session,
    event_type: EventType,
    username: Optional[str] = None,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    device_info: Optional[str] = None,
    session_id: Optional[str] = None,
    details: Optional[dict] = None,
    is_blacklisted: bool = False,
    timestamp: Optional[datetime] = None,
) -> AuditLog:
    # `timestamp` override exists only for the attack-simulation module (admin-only),
    # so demos can backdate events into an "unusual hour" without sleeping in real time.
    # All audit timestamps are recorded in IST, not UTC.
    timestamp = timestamp or now_ist()
    geo = lookup_ip(ip_address) if ip_address else {}
    location = f"{geo.get('city')}, {geo.get('country')}" if geo else None
    country = geo.get("country") if geo else None
    lat, lon = (geo.get("lat"), geo.get("lon")) if geo else (None, None)

    risk = base_score(event_type)
    modifiers: list[int] = []
    findings = []

    if event_type == EventType.FAILED_LOGIN:
        findings += brute_force.check(db, username, ip_address)

    if event_type == EventType.LOGIN and user_id:
        device_fingerprint = device_info or "unknown-device"
        findings += account_takeover.run_all(
            db, user_id, device_fingerprint, lat, lon, country, timestamp
        )
        uba.update_profile_on_login(db, user_id, timestamp, location, country)
        dev = uba.deviation_score(db, user_id, timestamp, location, country)
        if dev["score"] > 0:
            findings.append(
                _uba_finding(dev["score"], "; ".join(dev["reasons"]))
            )

    findings += privilege_abuse.check(db, user_id, username, event_type, timestamp)
    findings += insider_threat.check(db, user_id, username, event_type, timestamp)
    findings += threat_intel.check(db, username, ip_address, country, is_blacklisted)

    ml_result = isolation_forest.score_event(timestamp.hour, timestamp.weekday(), event_type, risk)
    if ml_result["is_anomaly"]:
        level = "HIGH" if ml_result["anomaly_score"] >= 75 else "MEDIUM"
        findings.append(
            _make_finding(
                AlertType.ML_ANOMALY,
                level,
                f"Isolation Forest flagged this event as anomalous "
                f"(anomaly score {ml_result['anomaly_score']}/100): rare combination of "
                f"time/event-type/risk for this system.",
                ml_result["anomaly_score"],
            )
        )

    modifiers = [f.risk_modifier for f in findings]
    final_risk = combine(risk, *modifiers)

    prev_hash = _last_entry_hash(db)
    hash_fields = {
        "user_id": user_id,
        "username": username,
        "event_type": event_type.value,
        "timestamp": timestamp.isoformat(),
        "ip_address": ip_address,
        "location": location,
        "session_id": session_id,
        "risk_score": final_risk,
        "details": details,
    }
    entry_hash = _compute_entry_hash(prev_hash, hash_fields)

    log = AuditLog(
        user_id=user_id,
        username=username,
        event_type=event_type,
        timestamp=timestamp,
        ip_address=ip_address,
        device_info=device_info,
        location=location,
        country=country,
        lat=lat,
        lon=lon,
        session_id=session_id,
        risk_score=final_risk,
        details=json.dumps(details) if details else None,
        prev_hash=prev_hash,
        entry_hash=entry_hash,
    )
    db.add(log)
    db.flush()

    for finding in findings:
        create_alert(
            db,
            alert_type=finding.alert_type,
            level=finding.level,
            message=finding.message,
            user_id=user_id,
            username=username,
            ip_address=ip_address,
            related_log_id=log.id,
        )

    db.commit()
    db.refresh(log)

    broadcast_sync(
        {
            "type": "log",
            "id": log.id,
            "username": username,
            "event_type": event_type.value,
            "timestamp": str(timestamp),
            "ip_address": ip_address,
            "location": location,
            "risk_score": final_risk,
        }
    )

    return log


def _make_finding(alert_type: AlertType, level: str, message: str, risk_modifier: int):
    from app.detection import Finding

    return Finding(alert_type=alert_type, level=level, message=message, risk_modifier=risk_modifier)


def _uba_finding(score: int, reasons: str):
    level = "HIGH" if score >= 70 else "MEDIUM" if score >= 35 else "LOW"
    return _make_finding(
        AlertType.ML_ANOMALY,
        level,
        f"UBA deviation from established user baseline: {reasons}",
        score,
    )


def verify_chain(db: Session) -> dict:
    """Walk the audit log in order and re-derive each hash to detect tampering."""
    logs = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
    prev_hash = None
    for log in logs:
        fields = {
            "user_id": log.user_id,
            "username": log.username,
            "event_type": log.event_type.value,
            "timestamp": log.timestamp.isoformat(),
            "ip_address": log.ip_address,
            "location": log.location,
            "session_id": log.session_id,
            "risk_score": log.risk_score,
            "details": json.loads(log.details) if log.details else None,
        }
        expected = _compute_entry_hash(prev_hash, fields)
        if expected != log.entry_hash or log.prev_hash != prev_hash:
            return {"valid": False, "tampered_log_id": log.id, "checked": len(logs)}
        prev_hash = log.entry_hash
    return {"valid": True, "tampered_log_id": None, "checked": len(logs)}

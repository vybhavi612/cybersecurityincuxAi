"""
Brute force / credential stuffing detection.

- More than N failed logins within a sliding window for the same username.
- More than N failed logins within a sliding window from the same IP
  (catches credential stuffing across many usernames from one source).
"""
from datetime import timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.detection import Finding
from app.models import AuditLog, AlertType, EventType
from app.timeutils import now_ist


def check(db: Session, username: Optional[str], ip_address: Optional[str]) -> List[Finding]:
    findings: List[Finding] = []
    window_start = now_ist() - timedelta(minutes=settings.BRUTE_FORCE_WINDOW_MINUTES)

    if username:
        user_fails = (
            db.query(AuditLog)
            .filter(
                AuditLog.username == username,
                AuditLog.event_type == EventType.FAILED_LOGIN,
                AuditLog.timestamp >= window_start,
            )
            .count()
        )
        if user_fails >= settings.BRUTE_FORCE_MAX_ATTEMPTS:
            findings.append(
                Finding(
                    alert_type=AlertType.BRUTE_FORCE,
                    level="HIGH",
                    message=(
                        f"Brute force suspected: {user_fails} failed logins for "
                        f"user '{username}' in the last {settings.BRUTE_FORCE_WINDOW_MINUTES} min."
                    ),
                    risk_modifier=80,
                )
            )

    if ip_address:
        ip_fails = (
            db.query(AuditLog)
            .filter(
                AuditLog.ip_address == ip_address,
                AuditLog.event_type == EventType.FAILED_LOGIN,
                AuditLog.timestamp >= window_start,
            )
            .count()
        )
        if ip_fails >= settings.BRUTE_FORCE_MAX_ATTEMPTS:
            distinct_users = (
                db.query(AuditLog.username)
                .filter(
                    AuditLog.ip_address == ip_address,
                    AuditLog.event_type == EventType.FAILED_LOGIN,
                    AuditLog.timestamp >= window_start,
                )
                .distinct()
                .count()
            )
            if distinct_users > 1:
                findings.append(
                    Finding(
                        alert_type=AlertType.BRUTE_FORCE,
                        level="CRITICAL",
                        message=(
                            f"Credential stuffing suspected: {ip_fails} failed logins across "
                            f"{distinct_users} usernames from IP {ip_address} in the last "
                            f"{settings.BRUTE_FORCE_WINDOW_MINUTES} min."
                        ),
                        risk_modifier=90,
                    )
                )
            else:
                findings.append(
                    Finding(
                        alert_type=AlertType.BRUTE_FORCE,
                        level="HIGH",
                        message=(
                            f"Repeated login attempts from IP {ip_address}: {ip_fails} failures "
                            f"in the last {settings.BRUTE_FORCE_WINDOW_MINUTES} min."
                        ),
                        risk_modifier=80,
                    )
                )

    return findings

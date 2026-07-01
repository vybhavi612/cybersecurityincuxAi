"""
Insider threat detection:
  - access at unusual hours (e.g. 00:00 - 05:00)
  - repeated access to sensitive records
  - excessive data downloads
"""
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.detection import Finding
from app.models import AuditLog, AlertType, EventType


def check(
    db: Session, user_id: Optional[int], username: Optional[str], event_type: EventType, timestamp: datetime
) -> List[Finding]:
    findings: List[Finding] = []

    if settings.UNUSUAL_HOUR_START <= timestamp.hour <= settings.UNUSUAL_HOUR_END and event_type in (
        EventType.LOGIN,
        EventType.SENSITIVE_ACCESS,
        EventType.FILE_DOWNLOAD,
        EventType.DATA_DELETE,
        EventType.BULK_EXPORT,
    ):
        findings.append(
            Finding(
                alert_type=AlertType.INSIDER_THREAT,
                level="LOW",
                message=f"Activity at unusual hour ({timestamp.strftime('%H:%M')}) by '{username}'.",
                risk_modifier=35,
            )
        )

    if event_type == EventType.SENSITIVE_ACCESS and user_id:
        window_start = timestamp - timedelta(minutes=settings.INSIDER_SENSITIVE_ACCESS_WINDOW_MINUTES)
        count = (
            db.query(AuditLog)
            .filter(
                AuditLog.user_id == user_id,
                AuditLog.event_type == EventType.SENSITIVE_ACCESS,
                AuditLog.timestamp >= window_start,
            )
            .count()
            + 1
        )
        if count >= settings.INSIDER_SENSITIVE_ACCESS_THRESHOLD:
            findings.append(
                Finding(
                    alert_type=AlertType.INSIDER_THREAT,
                    level="HIGH",
                    message=(
                        f"Repeated sensitive record access by '{username}': {count} accesses "
                        f"in {settings.INSIDER_SENSITIVE_ACCESS_WINDOW_MINUTES} min."
                    ),
                    risk_modifier=75,
                )
            )

    if event_type == EventType.FILE_DOWNLOAD and user_id:
        window_start = timestamp - timedelta(hours=1)
        count = (
            db.query(AuditLog)
            .filter(
                AuditLog.user_id == user_id,
                AuditLog.event_type == EventType.FILE_DOWNLOAD,
                AuditLog.timestamp >= window_start,
            )
            .count()
            + 1
        )
        if count >= settings.INSIDER_BULK_DOWNLOAD_THRESHOLD:
            findings.append(
                Finding(
                    alert_type=AlertType.INSIDER_THREAT,
                    level="HIGH",
                    message=(
                        f"Excessive downloads by '{username}': {count} files in the last hour."
                    ),
                    risk_modifier=70,
                )
            )

    return findings

"""
Privilege abuse detection:
  - admin privilege / permission changes (flagged at the event level)
  - mass deletions in a short window
  - bulk exports / large data dumps
"""
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from app.detection import Finding
from app.models import AuditLog, AlertType, EventType

MASS_DELETE_THRESHOLD = 10
MASS_DELETE_WINDOW_MINUTES = 15
BULK_EXPORT_WINDOW_MINUTES = 30
BULK_EXPORT_THRESHOLD = 3


def check(
    db: Session, user_id: Optional[int], username: Optional[str], event_type: EventType, timestamp: datetime
) -> List[Finding]:
    findings: List[Finding] = []

    if event_type == EventType.PRIVILEGE_CHANGE:
        findings.append(
            Finding(
                alert_type=AlertType.PRIVILEGE_ABUSE,
                level="HIGH",
                message=f"Privilege/permission change performed by '{username}'.",
                risk_modifier=70,
            )
        )

    if event_type == EventType.DATA_DELETE and user_id:
        window_start = timestamp - timedelta(minutes=MASS_DELETE_WINDOW_MINUTES)
        delete_count = (
            db.query(AuditLog)
            .filter(
                AuditLog.user_id == user_id,
                AuditLog.event_type == EventType.DATA_DELETE,
                AuditLog.timestamp >= window_start,
            )
            .count()
            + 1  # include the current event being logged
        )
        if delete_count >= MASS_DELETE_THRESHOLD:
            findings.append(
                Finding(
                    alert_type=AlertType.PRIVILEGE_ABUSE,
                    level="CRITICAL",
                    message=(
                        f"Mass deletion detected: {delete_count} delete actions by '{username}' "
                        f"in {MASS_DELETE_WINDOW_MINUTES} min."
                    ),
                    risk_modifier=90,
                )
            )

    if event_type == EventType.BULK_EXPORT and user_id:
        window_start = timestamp - timedelta(minutes=BULK_EXPORT_WINDOW_MINUTES)
        export_count = (
            db.query(AuditLog)
            .filter(
                AuditLog.user_id == user_id,
                AuditLog.event_type == EventType.BULK_EXPORT,
                AuditLog.timestamp >= window_start,
            )
            .count()
            + 1
        )
        level = "CRITICAL" if export_count >= BULK_EXPORT_THRESHOLD else "MEDIUM"
        findings.append(
            Finding(
                alert_type=AlertType.PRIVILEGE_ABUSE,
                level=level,
                message=(
                    f"Bulk export by '{username}' ({export_count} exports in "
                    f"{BULK_EXPORT_WINDOW_MINUTES} min)."
                ),
                risk_modifier=85 if level == "CRITICAL" else 50,
            )
        )

    if event_type == EventType.ADMIN_ACTION:
        findings.append(
            Finding(
                alert_type=AlertType.PRIVILEGE_ABUSE,
                level="LOW",
                message=f"Admin action performed by '{username}'.",
                risk_modifier=40,
            )
        )

    return findings

"""
Alert creation, persistence, and dispatch (dashboard push + optional email).
SMS dispatch is stubbed (documented as a future integration point -- e.g.
Twilio -- since it requires paid credentials not assumed to be available).
"""
import smtplib
from email.mime.text import MIMEText
from typing import Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.models import Alert, AlertLevel, AlertType
from app.websocket_manager import broadcast_sync


def send_email_alert(subject: str, body: str) -> None:
    if not settings.ENABLE_EMAIL_ALERTS or not settings.SMTP_HOST:
        return
    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = settings.ALERT_EMAIL_FROM
        msg["To"] = settings.ALERT_EMAIL_TO
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.ALERT_EMAIL_FROM, [settings.ALERT_EMAIL_TO], msg.as_string())
    except Exception as exc:  # pragma: no cover - best effort, never block the request
        print(f"[alerts] email dispatch failed: {exc}")


def send_sms_alert(message: str) -> None:  # pragma: no cover - stub
    """Placeholder for an SMS gateway integration (e.g. Twilio). Not wired up
    by default since it requires paid third-party credentials."""
    pass


def create_alert(
    db: Session,
    alert_type: AlertType,
    level: str,
    message: str,
    user_id: Optional[int] = None,
    username: Optional[str] = None,
    ip_address: Optional[str] = None,
    related_log_id: Optional[int] = None,
) -> Alert:
    alert = Alert(
        alert_type=alert_type,
        level=AlertLevel(level),
        user_id=user_id,
        username=username,
        ip_address=ip_address,
        message=message,
        related_log_id=related_log_id,
    )
    db.add(alert)
    db.flush()

    payload = {
        "type": "alert",
        "id": alert.id,
        "alert_type": alert.alert_type.value,
        "level": alert.level.value,
        "username": username,
        "ip_address": ip_address,
        "message": message,
        "created_at": str(alert.created_at),
    }
    broadcast_sync(payload)

    if level in ("HIGH", "CRITICAL"):
        send_email_alert(f"[{level}] {alert_type.value} alert", message)
        if level == "CRITICAL":
            send_sms_alert(message)

    return alert

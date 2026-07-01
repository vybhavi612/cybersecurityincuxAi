from dataclasses import dataclass

from app.models import AlertType


@dataclass
class Finding:
    """A single detection hit. Aggregated by security_logging into alerts + risk score."""

    alert_type: AlertType
    level: str  # "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    message: str
    risk_modifier: int

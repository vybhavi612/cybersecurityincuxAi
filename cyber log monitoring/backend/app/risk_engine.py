"""
Rule-based risk scoring engine.

Base scores follow the spec's table; additional modifiers are layered on
top by the detection modules (e.g. an impossible-travel hit overrides
to 95 regardless of the base event score). Final score is clamped 0-100.
"""
from app.models import EventType

BASE_RISK_SCORES: dict[EventType, int] = {
    EventType.LOGIN: 10,
    EventType.LOGOUT: 5,
    EventType.FAILED_LOGIN: 30,
    EventType.PASSWORD_CHANGE: 25,
    EventType.FILE_UPLOAD: 15,
    EventType.FILE_DOWNLOAD: 20,
    EventType.DATA_CREATE: 15,
    EventType.DATA_MODIFY: 20,
    EventType.DATA_DELETE: 35,
    EventType.ADMIN_ACTION: 40,
    EventType.ACCOUNT_CREATE: 20,
    EventType.ACCOUNT_DEACTIVATE: 35,
    EventType.PRIVILEGE_CHANGE: 45,
    EventType.BULK_EXPORT: 50,
    EventType.SENSITIVE_ACCESS: 25,
    EventType.VIEW_DASHBOARD: 5,
}

MODIFIER_NEW_DEVICE = 50
MODIFIER_MULTIPLE_FAILED_LOGINS = 80
MODIFIER_IMPOSSIBLE_TRAVEL = 95
MODIFIER_THREAT_INTEL_MATCH = 90
MODIFIER_ML_ANOMALY = 60


def classify(score: int) -> str:
    if score <= 30:
        return "LOW"
    if score <= 70:
        return "MEDIUM"
    return "HIGH"


def base_score(event_type: EventType) -> int:
    return BASE_RISK_SCORES.get(event_type, 10)


def combine(*scores: int) -> int:
    """Take the max of all contributing scores, clamped to [0, 100]."""
    if not scores:
        return 0
    return max(0, min(100, max(scores)))

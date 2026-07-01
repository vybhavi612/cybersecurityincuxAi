"""
SQLAlchemy ORM models.

AuditLog implements a simple hash-chain (prev_hash -> entry_hash) so that any
retroactive edit/delete of a row breaks the chain and is detectable
(`/api/audit/verify-chain`). This is the "immutable / tamper-evident" piece
referenced in the spec (GDPR / ISO 27001 / SOC style audit trails).
"""
import enum
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.timeutils import now_ist

from app.database import Base


class EventType(str, enum.Enum):
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    FAILED_LOGIN = "FAILED_LOGIN"
    PASSWORD_CHANGE = "PASSWORD_CHANGE"
    FILE_UPLOAD = "FILE_UPLOAD"
    FILE_DOWNLOAD = "FILE_DOWNLOAD"
    DATA_CREATE = "DATA_CREATE"
    DATA_MODIFY = "DATA_MODIFY"
    DATA_DELETE = "DATA_DELETE"
    ADMIN_ACTION = "ADMIN_ACTION"
    ACCOUNT_CREATE = "ACCOUNT_CREATE"
    ACCOUNT_DEACTIVATE = "ACCOUNT_DEACTIVATE"
    PRIVILEGE_CHANGE = "PRIVILEGE_CHANGE"
    BULK_EXPORT = "BULK_EXPORT"
    SENSITIVE_ACCESS = "SENSITIVE_ACCESS"
    VIEW_DASHBOARD = "VIEW_DASHBOARD"


class AlertLevel(str, enum.Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertType(str, enum.Enum):
    BRUTE_FORCE = "BRUTE_FORCE"
    ACCOUNT_TAKEOVER = "ACCOUNT_TAKEOVER"
    IMPOSSIBLE_TRAVEL = "IMPOSSIBLE_TRAVEL"
    NEW_DEVICE = "NEW_DEVICE"
    PRIVILEGE_ABUSE = "PRIVILEGE_ABUSE"
    INSIDER_THREAT = "INSIDER_THREAT"
    ML_ANOMALY = "ML_ANOMALY"
    THREAT_INTEL_MATCH = "THREAT_INTEL_MATCH"


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    role = Column(String(32), default="user")  # "user" | "admin"
    is_active = Column(Boolean, default=True)
    is_blacklisted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now_ist)

    sessions = relationship("UserSession", back_populates="user")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, index=True, default=gen_uuid)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ip_address = Column(String(64))
    device_info = Column(String(256))
    location = Column(String(128))
    started_at = Column(DateTime, default=now_ist)
    ended_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="sessions")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(64), index=True)
    event_type = Column(Enum(EventType), index=True, nullable=False)
    timestamp = Column(DateTime, default=now_ist, index=True)
    ip_address = Column(String(64), index=True)
    device_info = Column(String(256))
    location = Column(String(128), index=True)
    country = Column(String(64))
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    session_id = Column(String(64), index=True, nullable=True)
    risk_score = Column(Integer, default=0, index=True)
    details = Column(Text, nullable=True)  # free-form JSON string for extra context

    # tamper-evidence hash chain
    prev_hash = Column(String(64), nullable=True)
    entry_hash = Column(String(64), nullable=False)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(Enum(AlertType), nullable=False, index=True)
    level = Column(Enum(AlertLevel), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(64), index=True)
    ip_address = Column(String(64), index=True)
    message = Column(Text, nullable=False)
    related_log_id = Column(Integer, ForeignKey("audit_logs.id"), nullable=True)
    created_at = Column(DateTime, default=now_ist, index=True)
    acknowledged = Column(Boolean, default=False)
    status = Column(String(32), default="OPEN")  # OPEN | INVESTIGATING | RESOLVED


class KnownDevice(Base):
    """Devices/IP fingerprints seen before for a user -> used for new-device detection."""

    __tablename__ = "known_devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    device_fingerprint = Column(String(256), index=True)
    first_seen = Column(DateTime, default=now_ist)
    last_seen = Column(DateTime, default=now_ist)


class UserBehaviorProfile(Base):
    """Rolling baseline of 'normal' behavior per user, used by the UBA module."""

    __tablename__ = "user_behavior_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    avg_login_hour = Column(Float, default=12.0)
    login_hour_stddev = Column(Float, default=4.0)
    common_locations = Column(Text, default="[]")  # JSON list
    common_countries = Column(Text, default="[]")  # JSON list
    avg_actions_per_session = Column(Float, default=5.0)
    total_logins = Column(Integer, default=0)
    updated_at = Column(DateTime, default=now_ist)


class ThreatIntelIP(Base):
    __tablename__ = "threat_intel_ips"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(64), unique=True, index=True)
    reason = Column(String(256), default="Known malicious IP")
    added_at = Column(DateTime, default=now_ist)


class ThreatIntelCountry(Base):
    __tablename__ = "threat_intel_countries"

    id = Column(Integer, primary_key=True, index=True)
    country = Column(String(64), unique=True, index=True)
    reason = Column(String(256), default="Suspicious / high-risk region")
    added_at = Column(DateTime, default=now_ist)

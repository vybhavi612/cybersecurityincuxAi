from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr

from app.models import EventType, AlertLevel, AlertType


# ---------- Auth ----------
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: Optional[str] = "user"


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Audit log ----------
class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    username: Optional[str]
    event_type: EventType
    timestamp: datetime
    ip_address: Optional[str]
    device_info: Optional[str]
    location: Optional[str]
    country: Optional[str]
    session_id: Optional[str]
    risk_score: int
    details: Optional[str]
    entry_hash: str
    prev_hash: Optional[str]

    class Config:
        from_attributes = True


class AuditLogSearchParams(BaseModel):
    username: Optional[str] = None
    event_type: Optional[EventType] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    min_risk: Optional[int] = None
    max_risk: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    page: int = 1
    page_size: int = 50


# ---------- Alerts ----------
class AlertOut(BaseModel):
    id: int
    alert_type: AlertType
    level: AlertLevel
    user_id: Optional[int]
    username: Optional[str]
    ip_address: Optional[str]
    message: str
    related_log_id: Optional[int]
    created_at: datetime
    acknowledged: bool
    status: str

    class Config:
        from_attributes = True


class AlertUpdate(BaseModel):
    acknowledged: Optional[bool] = None
    status: Optional[str] = None


# ---------- Dashboard ----------
class DashboardStats(BaseModel):
    active_users: int
    active_sessions: int
    failed_logins_last_hour: int
    open_alerts: int
    critical_alerts: int
    top_ips: List[dict]
    threat_score: int
    events_last_24h: int


class HourlyHeatmapPoint(BaseModel):
    hour: int
    count: int


class SessionTimelineEvent(BaseModel):
    event_type: EventType
    timestamp: datetime
    risk_score: int
    details: Optional[str]

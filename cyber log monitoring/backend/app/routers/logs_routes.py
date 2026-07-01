from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import AuditLog, EventType, User
from app.request_utils import get_client_ip, get_device_info
from app.schemas import AuditLogOut
from app.security_logging import log_event, verify_chain

router = APIRouter(prefix="/api/logs", tags=["logs"])

# Event types a regular authenticated client is allowed to self-report.
# Account/privilege lifecycle events are emitted internally by their own
# routes/admin actions, not freely postable by any client.
CLIENT_REPORTABLE_EVENTS = {
    EventType.FILE_UPLOAD,
    EventType.FILE_DOWNLOAD,
    EventType.DATA_CREATE,
    EventType.DATA_MODIFY,
    EventType.DATA_DELETE,
    EventType.SENSITIVE_ACCESS,
    EventType.BULK_EXPORT,
    EventType.PASSWORD_CHANGE,
    EventType.VIEW_DASHBOARD,
}


class EventIn(BaseModel):
    event_type: EventType
    session_id: Optional[str] = None
    details: Optional[dict] = None


@router.post("/event", response_model=AuditLogOut)
def report_event(
    payload: EventIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    event_type = payload.event_type
    if event_type not in CLIENT_REPORTABLE_EVENTS:
        event_type = EventType.SENSITIVE_ACCESS  # safe fallback, still logged + scored

    log = log_event(
        db,
        event_type=event_type,
        username=user.username,
        user_id=user.id,
        ip_address=get_client_ip(request),
        device_info=get_device_info(request),
        session_id=payload.session_id,
        details=payload.details,
        is_blacklisted=user.is_blacklisted,
    )
    return log


@router.get("/search", response_model=list[AuditLogOut])
def search_logs(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    username: Optional[str] = None,
    event_type: Optional[EventType] = None,
    ip_address: Optional[str] = None,
    location: Optional[str] = None,
    min_risk: Optional[int] = None,
    max_risk: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    q = db.query(AuditLog)
    if username:
        q = q.filter(AuditLog.username.ilike(f"%{username}%"))
    if event_type:
        q = q.filter(AuditLog.event_type == event_type)
    if ip_address:
        q = q.filter(AuditLog.ip_address == ip_address)
    if location:
        q = q.filter(AuditLog.location.ilike(f"%{location}%"))
    if min_risk is not None:
        q = q.filter(AuditLog.risk_score >= min_risk)
    if max_risk is not None:
        q = q.filter(AuditLog.risk_score <= max_risk)
    if start_date:
        q = q.filter(AuditLog.timestamp >= start_date)
    if end_date:
        q = q.filter(AuditLog.timestamp <= end_date)

    q = q.order_by(AuditLog.timestamp.desc())
    return q.offset((page - 1) * page_size).limit(page_size).all()


@router.get("/session/{session_id}", response_model=list[AuditLogOut])
def session_timeline(session_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return (
        db.query(AuditLog)
        .filter(AuditLog.session_id == session_id)
        .order_by(AuditLog.timestamp.asc())
        .all()
    )


@router.get("/verify-chain")
def verify_chain_route(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return verify_chain(db)

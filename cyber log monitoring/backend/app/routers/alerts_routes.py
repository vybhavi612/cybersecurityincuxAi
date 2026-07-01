from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.models import Alert, AlertLevel, AlertType, User
from app.schemas import AlertOut, AlertUpdate

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut])
def list_alerts(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    level: Optional[AlertLevel] = None,
    alert_type: Optional[AlertType] = None,
    status: Optional[str] = None,
    acknowledged: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    q = db.query(Alert)
    if level:
        q = q.filter(Alert.level == level)
    if alert_type:
        q = q.filter(Alert.alert_type == alert_type)
    if status:
        q = q.filter(Alert.status == status)
    if acknowledged is not None:
        q = q.filter(Alert.acknowledged == acknowledged)

    q = q.order_by(Alert.created_at.desc())
    return q.offset((page - 1) * page_size).limit(page_size).all()


@router.patch("/{alert_id}", response_model=AlertOut)
def update_alert(alert_id: int, payload: AlertUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Alert not found")

    if payload.acknowledged is not None:
        alert.acknowledged = payload.acknowledged
    if payload.status is not None:
        alert.status = payload.status

    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

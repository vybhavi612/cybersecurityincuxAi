from collections import Counter
from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.models import Alert, AlertLevel, AuditLog, EventType, User, UserSession
from app.schemas import DashboardStats, HourlyHeatmapPoint
from app.timeutils import now_ist

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    now = now_ist()
    last_hour = now - timedelta(hours=1)
    last_24h = now - timedelta(hours=24)

    active_sessions = db.query(UserSession).filter(UserSession.is_active.is_(True)).count()
    active_users = (
        db.query(UserSession.user_id).filter(UserSession.is_active.is_(True)).distinct().count()
    )
    failed_logins_last_hour = (
        db.query(AuditLog)
        .filter(AuditLog.event_type == EventType.FAILED_LOGIN, AuditLog.timestamp >= last_hour)
        .count()
    )
    open_alerts = db.query(Alert).filter(Alert.status == "OPEN").count()
    critical_alerts = (
        db.query(Alert).filter(Alert.status == "OPEN", Alert.level == AlertLevel.CRITICAL).count()
    )
    high_alerts = db.query(Alert).filter(Alert.status == "OPEN", Alert.level == AlertLevel.HIGH).count()
    events_last_24h = db.query(AuditLog).filter(AuditLog.timestamp >= last_24h).count()

    avg_risk_row = (
        db.query(func.avg(AuditLog.risk_score)).filter(AuditLog.timestamp >= last_hour).scalar()
    )
    avg_risk = float(avg_risk_row) if avg_risk_row else 0.0
    threat_score = int(min(100, avg_risk * 0.6 + critical_alerts * 10 + high_alerts * 5))

    top_ip_rows = (
        db.query(AuditLog.ip_address, func.count(AuditLog.id).label("count"))
        .filter(AuditLog.timestamp >= last_24h, AuditLog.ip_address.isnot(None))
        .group_by(AuditLog.ip_address)
        .order_by(func.count(AuditLog.id).desc())
        .limit(10)
        .all()
    )
    top_ips = [{"ip_address": ip, "count": count} for ip, count in top_ip_rows]

    return DashboardStats(
        active_users=active_users,
        active_sessions=active_sessions,
        failed_logins_last_hour=failed_logins_last_hour,
        open_alerts=open_alerts,
        critical_alerts=critical_alerts,
        top_ips=top_ips,
        threat_score=threat_score,
        events_last_24h=events_last_24h,
    )


@router.get("/heatmap/hourly", response_model=list[HourlyHeatmapPoint])
def hourly_heatmap(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Login activity grouped by hour-of-day, last 30 days."""
    since = now_ist() - timedelta(days=30)
    rows = (
        db.query(AuditLog.timestamp)
        .filter(AuditLog.event_type == EventType.LOGIN, AuditLog.timestamp >= since)
        .all()
    )
    counts = Counter(ts.hour for (ts,) in rows)
    return [HourlyHeatmapPoint(hour=h, count=counts.get(h, 0)) for h in range(24)]


@router.get("/geo")
def geo_distribution(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Activity aggregated by country -- feeds the world-map / regional view."""
    since = now_ist() - timedelta(days=7)
    rows = (
        db.query(AuditLog.country, AuditLog.lat, AuditLog.lon, func.count(AuditLog.id).label("count"))
        .filter(AuditLog.timestamp >= since, AuditLog.country.isnot(None))
        .group_by(AuditLog.country, AuditLog.lat, AuditLog.lon)
        .order_by(func.count(AuditLog.id).desc())
        .all()
    )
    return [
        {"country": country, "lat": lat, "lon": lon, "count": count}
        for country, lat, lon, count in rows
    ]


@router.get("/alerts-by-region")
def alerts_by_region(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Attack/alert activity grouped by IP's resolved location -- for the security heatmap."""
    since = now_ist() - timedelta(days=7)
    rows = (
        db.query(AuditLog.country, func.count(Alert.id).label("count"))
        .join(Alert, Alert.related_log_id == AuditLog.id)
        .filter(Alert.created_at >= since, AuditLog.country.isnot(None))
        .group_by(AuditLog.country)
        .order_by(func.count(Alert.id).desc())
        .all()
    )
    return [{"country": country, "alert_count": count} for country, count in rows]

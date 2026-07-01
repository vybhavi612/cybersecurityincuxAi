"""
Attack Simulation Module.

Generates realistic event sequences for brute force, credential stuffing,
insider threat, and privilege escalation scenarios so the detection
pipeline (rule-based + ML) can be demonstrated end-to-end without waiting
for real attack traffic. Admin-only; every simulated event flows through
the exact same `log_event()` pipeline as real traffic, so it produces real
audit log rows + real alerts.

IPs used here are private-range placeholders (10.x.x.x) purely so the
geolocation fallback resolves instantly and deterministically without an
outbound network call.
"""
import random
from datetime import timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.models import EventType, User
from app.security_logging import log_event
from app.timeutils import now_ist

router = APIRouter(prefix="/api/simulate", tags=["simulate"])


def _fake_ip(seed: int) -> str:
    return f"10.{seed % 250}.{(seed * 7) % 250}.{(seed * 13) % 250}"


class BruteForceIn(BaseModel):
    target_username: str
    attempts: int = 8
    succeed_at_end: bool = False


@router.post("/brute-force")
def simulate_brute_force(payload: BruteForceIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    attacker_ip = _fake_ip(random.randint(1, 9999))
    target = db.query(User).filter(User.username == payload.target_username).first()

    logs = []
    for _ in range(payload.attempts):
        log = log_event(
            db,
            event_type=EventType.FAILED_LOGIN,
            username=payload.target_username,
            user_id=target.id if target else None,
            ip_address=attacker_ip,
            device_info="curl/8.0 (simulated attacker)",
            is_blacklisted=target.is_blacklisted if target else False,
        )
        logs.append(log.id)

    if payload.succeed_at_end and target:
        final = log_event(
            db,
            event_type=EventType.LOGIN,
            username=target.username,
            user_id=target.id,
            ip_address=attacker_ip,
            device_info="curl/8.0 (simulated attacker)",
            is_blacklisted=target.is_blacklisted,
        )
        logs.append(final.id)

    return {"scenario": "brute_force", "attacker_ip": attacker_ip, "log_ids": logs}


class CredentialStuffingIn(BaseModel):
    usernames: list[str]
    attempts_per_user: int = 2


@router.post("/credential-stuffing")
def simulate_credential_stuffing(
    payload: CredentialStuffingIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    attacker_ip = _fake_ip(random.randint(1, 9999))
    logs = []
    for username in payload.usernames:
        user = db.query(User).filter(User.username == username).first()
        for _ in range(payload.attempts_per_user):
            log = log_event(
                db,
                event_type=EventType.FAILED_LOGIN,
                username=username,
                user_id=user.id if user else None,
                ip_address=attacker_ip,
                device_info="python-requests/2.32 (simulated attacker)",
                is_blacklisted=user.is_blacklisted if user else False,
            )
            logs.append(log.id)
    return {"scenario": "credential_stuffing", "attacker_ip": attacker_ip, "log_ids": logs}


class InsiderThreatIn(BaseModel):
    username: str
    sensitive_accesses: int = 12
    bulk_downloads: int = 25
    use_unusual_hour: bool = True


@router.post("/insider-threat")
def simulate_insider_threat(
    payload: InsiderThreatIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user:
        return {"error": f"user '{payload.username}' not found"}

    ts = now_ist().replace(hour=2, minute=30) if payload.use_unusual_hour else None
    ip = _fake_ip(hash(user.username) % 9999)
    logs = []

    for i in range(payload.sensitive_accesses):
        log = log_event(
            db,
            event_type=EventType.SENSITIVE_ACCESS,
            username=user.username,
            user_id=user.id,
            ip_address=ip,
            device_info="Internal workstation",
            timestamp=ts + timedelta(seconds=i * 2) if ts else None,
            is_blacklisted=user.is_blacklisted,
        )
        logs.append(log.id)

    for i in range(payload.bulk_downloads):
        log = log_event(
            db,
            event_type=EventType.FILE_DOWNLOAD,
            username=user.username,
            user_id=user.id,
            ip_address=ip,
            device_info="Internal workstation",
            timestamp=ts + timedelta(seconds=(payload.sensitive_accesses + i) * 2) if ts else None,
            details={"file": f"customer_records_{i}.csv"},
            is_blacklisted=user.is_blacklisted,
        )
        logs.append(log.id)

    return {"scenario": "insider_threat", "log_ids": logs}


class PrivilegeEscalationIn(BaseModel):
    username: str
    mass_deletes: int = 12


@router.post("/privilege-escalation")
def simulate_privilege_escalation(
    payload: PrivilegeEscalationIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user:
        return {"error": f"user '{payload.username}' not found"}

    ip = _fake_ip(hash(user.username + "esc") % 9999)
    logs = []

    logs.append(
        log_event(
            db,
            event_type=EventType.ADMIN_ACTION,
            username=user.username,
            user_id=user.id,
            ip_address=ip,
            device_info="Internal workstation",
            details={"action": "accessed admin panel"},
            is_blacklisted=user.is_blacklisted,
        ).id
    )
    logs.append(
        log_event(
            db,
            event_type=EventType.PRIVILEGE_CHANGE,
            username=user.username,
            user_id=user.id,
            ip_address=ip,
            device_info="Internal workstation",
            details={"change": "granted self admin role"},
            is_blacklisted=user.is_blacklisted,
        ).id
    )
    for i in range(payload.mass_deletes):
        logs.append(
            log_event(
                db,
                event_type=EventType.DATA_DELETE,
                username=user.username,
                user_id=user.id,
                ip_address=ip,
                device_info="Internal workstation",
                details={"record": f"record_{i}"},
                is_blacklisted=user.is_blacklisted,
            ).id
        )

    return {"scenario": "privilege_escalation", "log_ids": logs}


class ImpossibleTravelIn(BaseModel):
    username: str


@router.post("/impossible-travel")
def simulate_impossible_travel(
    payload: ImpossibleTravelIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    """Two LOGIN events for the same user from far-apart IPs, seconds apart."""
    user = db.query(User).filter(User.username == payload.username).first()
    if not user:
        return {"error": f"user '{payload.username}' not found"}

    first = log_event(
        db,
        event_type=EventType.LOGIN,
        username=user.username,
        user_id=user.id,
        ip_address="10.1.1.1",  # resolves to a fixed fallback location
        device_info="Chrome on Windows",
        is_blacklisted=user.is_blacklisted,
    )
    second = log_event(
        db,
        event_type=EventType.LOGIN,
        username=user.username,
        user_id=user.id,
        ip_address="10.250.250.250",  # resolves to a different, far fallback location
        device_info="Safari on iPhone",
        is_blacklisted=user.is_blacklisted,
    )
    return {"scenario": "impossible_travel", "log_ids": [first.id, second.id]}

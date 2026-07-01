from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.models import EventType, User, UserSession
from app.request_utils import get_client_ip, get_device_info
from app.schemas import Token, UserCreate, UserLogin, UserOut
from app.security_logging import log_event

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut)
def register(payload: UserCreate, request: Request, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role or "user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_event(
        db,
        event_type=EventType.ACCOUNT_CREATE,
        username=user.username,
        user_id=user.id,
        ip_address=get_client_ip(request),
        device_info=get_device_info(request),
        details={"role": user.role},
    )
    return user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    ip = get_client_ip(request)
    device = get_device_info(request)

    if not user or not verify_password(payload.password, user.hashed_password):
        log_event(
            db,
            event_type=EventType.FAILED_LOGIN,
            username=payload.username,
            user_id=user.id if user else None,
            ip_address=ip,
            device_info=device,
            is_blacklisted=user.is_blacklisted if user else False,
        )
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    session = UserSession(user_id=user.id, ip_address=ip, device_info=device)
    db.add(session)
    db.commit()
    db.refresh(session)

    log_event(
        db,
        event_type=EventType.LOGIN,
        username=user.username,
        user_id=user.id,
        ip_address=ip,
        device_info=device,
        session_id=session.session_id,
        is_blacklisted=user.is_blacklisted,
    )

    token = create_access_token({"sub": user.username})
    return Token(access_token=token, user=user)


@router.post("/logout")
def logout(session_id: str, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = (
        db.query(UserSession)
        .filter(UserSession.session_id == session_id, UserSession.user_id == user.id)
        .first()
    )
    if session and session.is_active:
        from app.timeutils import now_ist

        session.is_active = False
        session.ended_at = now_ist()
        db.add(session)
        db.commit()

    log_event(
        db,
        event_type=EventType.LOGOUT,
        username=user.username,
        user_id=user.id,
        ip_address=get_client_ip(request),
        device_info=get_device_info(request),
        session_id=session_id,
    )
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user

"""
Generates a realistic demo dataset directly against the database (no
running server required):

  1. ~30 days of normal login/activity history for alice & bob, at a
     consistent hour/location each day -- this is what the UBA module
     learns as "normal", and what the Isolation Forest trains on.
  2. A handful of attack scenarios (brute force, credential stuffing,
     insider threat, privilege escalation, impossible travel) layered on
     top, which should trigger alerts given the baseline above.
  3. Trains the Isolation Forest model on the resulting log history.

Run from the backend/ directory (after `python seed_data.py`):

    python simulate_attacks.py
"""
import random
from datetime import timedelta

from app.database import Base, SessionLocal, engine
from app.timeutils import now_ist
from app.ml.isolation_forest import train as train_isolation_forest
from app.models import EventType, User
from app.security_logging import log_event

NORMAL_IP_BY_USER = {"alice": "10.5.5.5", "bob": "10.9.9.9"}


def _seed_normal_history(db, user: User, days: int = 30) -> None:
    base_hour = 9 if user.username == "alice" else 14
    ip = NORMAL_IP_BY_USER.get(user.username, "10.1.2.3")
    now = now_ist()

    for day_offset in range(days, 0, -1):
        day = now - timedelta(days=day_offset)
        hour = base_hour + random.choice([-1, 0, 0, 0, 1])
        ts = day.replace(hour=max(0, min(23, hour)), minute=random.randint(0, 59), second=0)

        log_event(
            db,
            event_type=EventType.LOGIN,
            username=user.username,
            user_id=user.id,
            ip_address=ip,
            device_info="Chrome on Windows",
            session_id=f"seed-{user.username}-{day_offset}",
            timestamp=ts,
        )
        log_event(
            db,
            event_type=EventType.VIEW_DASHBOARD,
            username=user.username,
            user_id=user.id,
            ip_address=ip,
            device_info="Chrome on Windows",
            session_id=f"seed-{user.username}-{day_offset}",
            timestamp=ts + timedelta(minutes=1),
        )
        log_event(
            db,
            event_type=EventType.DATA_MODIFY,
            username=user.username,
            user_id=user.id,
            ip_address=ip,
            device_info="Chrome on Windows",
            session_id=f"seed-{user.username}-{day_offset}",
            timestamp=ts + timedelta(minutes=3),
        )
        log_event(
            db,
            event_type=EventType.LOGOUT,
            username=user.username,
            user_id=user.id,
            ip_address=ip,
            device_info="Chrome on Windows",
            session_id=f"seed-{user.username}-{day_offset}",
            timestamp=ts + timedelta(minutes=10),
        )


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        alice = db.query(User).filter(User.username == "alice").first()
        bob = db.query(User).filter(User.username == "bob").first()
        if not alice or not bob:
            print("Run `python seed_data.py` first to create demo users.")
            return

        print("Seeding ~30 days of normal activity for alice & bob ...")
        _seed_normal_history(db, alice)
        _seed_normal_history(db, bob)

        print("Layering attack scenarios on top ...")
        # Brute force against alice from one attacker IP
        for _ in range(7):
            log_event(
                db,
                event_type=EventType.FAILED_LOGIN,
                username="alice",
                user_id=alice.id,
                ip_address="10.66.66.66",
                device_info="curl/8.0 (simulated attacker)",
            )

        # Credential stuffing across alice + bob from one IP
        for username, user in (("alice", alice), ("bob", bob)):
            for _ in range(3):
                log_event(
                    db,
                    event_type=EventType.FAILED_LOGIN,
                    username=username,
                    user_id=user.id,
                    ip_address="10.77.77.77",
                    device_info="python-requests/2.32 (simulated attacker)",
                )

        # Insider threat: bob accessing sensitive records + bulk downloads at 2 AM
        unusual_ts = now_ist().replace(hour=2, minute=15)
        for i in range(12):
            log_event(
                db,
                event_type=EventType.SENSITIVE_ACCESS,
                username="bob",
                user_id=bob.id,
                ip_address=NORMAL_IP_BY_USER["bob"],
                device_info="Internal workstation",
                timestamp=unusual_ts + timedelta(seconds=i * 2),
            )
        for i in range(25):
            log_event(
                db,
                event_type=EventType.FILE_DOWNLOAD,
                username="bob",
                user_id=bob.id,
                ip_address=NORMAL_IP_BY_USER["bob"],
                device_info="Internal workstation",
                timestamp=unusual_ts + timedelta(seconds=(12 + i) * 2),
                details={"file": f"customer_records_{i}.csv"},
            )

        # Privilege escalation: alice grants herself admin then mass-deletes
        log_event(
            db,
            event_type=EventType.PRIVILEGE_CHANGE,
            username="alice",
            user_id=alice.id,
            ip_address=NORMAL_IP_BY_USER["alice"],
            device_info="Internal workstation",
            details={"change": "granted self admin role"},
        )
        for i in range(12):
            log_event(
                db,
                event_type=EventType.DATA_DELETE,
                username="alice",
                user_id=alice.id,
                ip_address=NORMAL_IP_BY_USER["alice"],
                device_info="Internal workstation",
                details={"record": f"record_{i}"},
            )

        # Impossible travel: bob logs in from two far-apart IPs seconds apart
        log_event(
            db,
            event_type=EventType.LOGIN,
            username="bob",
            user_id=bob.id,
            ip_address="10.1.1.1",
            device_info="Chrome on Windows",
        )
        log_event(
            db,
            event_type=EventType.LOGIN,
            username="bob",
            user_id=bob.id,
            ip_address="10.250.250.250",
            device_info="Safari on iPhone",
        )

        print("Training Isolation Forest model on the seeded history ...")
        trained = train_isolation_forest(db)
        print("Model trained." if trained else "Not enough data to train yet.")

        print("Done. Start the API and check /api/dashboard/stats and /api/alerts.")
    finally:
        db.close()


if __name__ == "__main__":
    main()

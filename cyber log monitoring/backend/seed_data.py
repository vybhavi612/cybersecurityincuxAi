"""
Creates demo accounts so you can log in immediately:

    admin / Admin@12345   (role=admin, can see dashboard/alerts/search/simulate)
    alice / Alice@12345   (role=user)
    bob   / Bob@12345     (role=user)

Run from the backend/ directory:

    python seed_data.py
"""
from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import User

DEMO_USERS = [
    {"username": "admin", "email": "admin@example.com", "password": "Admin@12345", "role": "admin"},
    {"username": "alice", "email": "alice@example.com", "password": "Alice@12345", "role": "user"},
    {"username": "bob", "email": "bob@example.com", "password": "Bob@12345", "role": "user"},
]


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for u in DEMO_USERS:
            if db.query(User).filter(User.username == u["username"]).first():
                continue
            db.add(
                User(
                    username=u["username"],
                    email=u["email"],
                    hashed_password=hash_password(u["password"]),
                    role=u["role"],
                )
            )
        db.commit()
        print("Seeded demo users: admin/Admin@12345, alice/Alice@12345, bob/Bob@12345")
    finally:
        db.close()


if __name__ == "__main__":
    main()

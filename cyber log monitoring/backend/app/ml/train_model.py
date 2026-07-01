"""
Standalone training script for the Isolation Forest anomaly model.
Run after you have a reasonable amount of audit log data (real or
simulated):

    cd backend
    python -m app.ml.train_model
"""
from app.database import SessionLocal
from app.ml.isolation_forest import train


def main():
    db = SessionLocal()
    try:
        ok = train(db)
        if ok:
            print("Isolation Forest model trained and saved to app/ml/isolation_forest.joblib")
        else:
            print(
                "Not enough audit log data to train yet (need >= 50 rows). "
                "Run backend/simulate_attacks.py and backend/seed_data.py first."
            )
    finally:
        db.close()


if __name__ == "__main__":
    main()

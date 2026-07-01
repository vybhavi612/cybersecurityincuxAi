"""
Global anomaly detector using scikit-learn's IsolationForest.

Trained over feature vectors extracted from historical audit logs:
  [hour_of_day, day_of_week, event_type_code, base_risk_score]

This catches things rule-based detections miss: abnormal login *frequency*,
unusual combinations of time/event, and rare action types -- without
hand-coding a threshold for every case.

The model is intentionally lightweight (joblib file on disk) so it can be
retrained quickly via `python train_model.py` as more log data accumulates.
"""
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sqlalchemy.orm import Session

from app.models import AuditLog, EventType

MODEL_PATH = Path(__file__).parent / "isolation_forest.joblib"

EVENT_CODES = {event: idx for idx, event in enumerate(EventType)}


def _row_to_features(hour: int, day_of_week: int, event_type: EventType, base_risk: int) -> list:
    return [hour, day_of_week, EVENT_CODES.get(event_type, 0), base_risk]


def build_training_frame(db: Session, limit: int = 20000) -> pd.DataFrame:
    rows = (
        db.query(AuditLog.timestamp, AuditLog.event_type, AuditLog.risk_score)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    data = [
        _row_to_features(ts.hour, ts.weekday(), ev, risk if risk is not None else 10)
        for ts, ev, risk in rows
    ]
    return pd.DataFrame(data, columns=["hour", "day_of_week", "event_code", "base_risk"])


def train(db: Session, min_samples: int = 50) -> bool:
    df = build_training_frame(db)
    if len(df) < min_samples:
        return False
    model = IsolationForest(n_estimators=150, contamination=0.05, random_state=42)
    model.fit(df.values)
    joblib.dump(model, MODEL_PATH)
    return True


_model_cache: Optional[IsolationForest] = None


def _get_model() -> Optional[IsolationForest]:
    global _model_cache
    if _model_cache is not None:
        return _model_cache
    if MODEL_PATH.exists():
        _model_cache = joblib.load(MODEL_PATH)
    return _model_cache


def score_event(hour: int, day_of_week: int, event_type: EventType, base_risk: int) -> dict:
    """Returns {"is_anomaly": bool, "anomaly_score": int 0-100}. Neutral if no model trained yet."""
    model = _get_model()
    if model is None:
        return {"is_anomaly": False, "anomaly_score": 0}

    features = np.array([_row_to_features(hour, day_of_week, event_type, base_risk)])
    raw_score = model.decision_function(features)[0]  # higher = more normal
    prediction = model.predict(features)[0]  # -1 anomaly, 1 normal

    # Map decision_function (~ -0.5..0.5) to a 0-100 "anomaly score" (higher = more anomalous)
    anomaly_score = int(np.clip((0.3 - raw_score) / 0.6 * 100, 0, 100))
    return {"is_anomaly": prediction == -1, "anomaly_score": anomaly_score}

"""
User Behavior Analytics (UBA): maintains a rolling per-user baseline
(typical login hour, typical locations/countries, typical session activity
volume) and flags deviations from it. Complements the global IsolationForest
model with a *personalized* notion of "normal".
"""
import json
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models import UserBehaviorProfile
from app.timeutils import now_ist

MAX_COMMON_ITEMS = 5


def get_or_create_profile(db: Session, user_id: int) -> UserBehaviorProfile:
    profile = db.query(UserBehaviorProfile).filter(UserBehaviorProfile.user_id == user_id).first()
    if not profile:
        profile = UserBehaviorProfile(user_id=user_id)
        db.add(profile)
        db.flush()
    return profile


def _update_running_stats(profile: UserBehaviorProfile, hour: int) -> None:
    """Incremental mean/stddev update (Welford-ish, simplified) for login hour."""
    n = profile.total_logins
    old_mean = profile.avg_login_hour
    new_n = n + 1
    new_mean = old_mean + (hour - old_mean) / new_n
    # exponentially-weighted-ish variance approximation, floor it so stddev never collapses to 0
    variance = profile.login_hour_stddev**2
    new_variance = ((n * variance) + (hour - old_mean) * (hour - new_mean)) / new_n
    profile.avg_login_hour = new_mean
    profile.login_hour_stddev = max(new_variance**0.5, 1.0)
    profile.total_logins = new_n


def _add_to_json_set(raw: str, value: Optional[str]) -> str:
    if not value:
        return raw
    items = json.loads(raw or "[]")
    if value not in items:
        items.append(value)
        items = items[-MAX_COMMON_ITEMS:]
    return json.dumps(items)


def update_profile_on_login(
    db: Session, user_id: int, timestamp: datetime, location: Optional[str], country: Optional[str]
) -> UserBehaviorProfile:
    profile = get_or_create_profile(db, user_id)
    _update_running_stats(profile, timestamp.hour)
    profile.common_locations = _add_to_json_set(profile.common_locations, location)
    profile.common_countries = _add_to_json_set(profile.common_countries, country)
    profile.updated_at = now_ist()
    db.add(profile)
    return profile


def deviation_score(
    db: Session, user_id: int, timestamp: datetime, location: Optional[str], country: Optional[str]
) -> dict:
    """
    Returns {"score": 0-100, "reasons": [str]} describing how far this event
    deviates from the user's established baseline. Score 0 if not enough
    history yet (cold start).
    """
    profile = db.query(UserBehaviorProfile).filter(UserBehaviorProfile.user_id == user_id).first()
    if not profile or profile.total_logins < 5:
        return {"score": 0, "reasons": []}

    reasons = []
    score = 0

    z = abs(timestamp.hour - profile.avg_login_hour) / max(profile.login_hour_stddev, 1.0)
    if z > 2.5:
        score = max(score, 70)
        reasons.append(
            f"Login hour {timestamp.hour}:00 is unusual for this user "
            f"(typical ~{profile.avg_login_hour:.0f}:00)."
        )
    elif z > 1.5:
        score = max(score, 35)
        reasons.append(f"Login hour {timestamp.hour}:00 is somewhat atypical for this user.")

    common_locations = json.loads(profile.common_locations or "[]")
    common_countries = json.loads(profile.common_countries or "[]")

    if location and common_locations and location not in common_locations:
        score = max(score, 40)
        reasons.append(f"Location '{location}' not in this user's usual locations.")

    if country and common_countries and country not in common_countries:
        score = max(score, 55)
        reasons.append(f"Country '{country}' not in this user's usual countries.")

    return {"score": score, "reasons": reasons}

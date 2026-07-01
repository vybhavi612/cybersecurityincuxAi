"""
Central configuration, loaded from environment variables / .env file.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite:///./security_audit.db"

    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    GEOIP_API_URL: str = "http://ip-api.com/json"

    ENABLE_EMAIL_ALERTS: bool = False
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    ALERT_EMAIL_FROM: str = ""
    ALERT_EMAIL_TO: str = ""

    # Detection thresholds (tunable without code changes)
    BRUTE_FORCE_MAX_ATTEMPTS: int = 5
    BRUTE_FORCE_WINDOW_MINUTES: int = 5
    INSIDER_SENSITIVE_ACCESS_THRESHOLD: int = 10
    INSIDER_SENSITIVE_ACCESS_WINDOW_MINUTES: int = 60
    INSIDER_BULK_DOWNLOAD_THRESHOLD: int = 20
    IMPOSSIBLE_TRAVEL_MAX_SPEED_KMH: float = 900.0  # ~ commercial flight speed
    UNUSUAL_HOUR_START: int = 0
    UNUSUAL_HOUR_END: int = 5


settings = Settings()

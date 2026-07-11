"""
config.py
==============================================================================
Centralized application configuration.

Loads values from environment variables (via .env / .flaskenv, read through
python-dotenv) and exposes typed Config classes selected by FLASK_ENV.

Usage:
    from config import get_config
    app.config.from_object(get_config())
==============================================================================
"""

import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

# --- Paths -------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
INSTANCE_DIR = BASE_DIR / "instance"
LOGS_DIR = BASE_DIR / "logs"
REPORTS_DIR = BASE_DIR / "reports"

# Ensure runtime directories exist before the app starts
INSTANCE_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)
REPORTS_DIR.mkdir(exist_ok=True)

# Load environment variables from .env (falls back silently if absent)
load_dotenv(BASE_DIR / ".env")


def _generate_dev_secret() -> str:
    """
    Generate a random SECRET_KEY for development when none is supplied.
    A fixed, strong SECRET_KEY MUST be set via environment variable in
    production — this fallback exists only to prevent the app from crashing
    during local/first-time setup.
    """
    return secrets.token_hex(32)


class BaseConfig:
    """Shared configuration across all environments."""

    # --- Core Flask ---
    SECRET_KEY = os.environ.get("SECRET_KEY") or _generate_dev_secret()
    WTF_CSRF_ENABLED = True

    # --- Database ---
    # NOTE: SQLALCHEMY_DATABASE_URI defaults to an ABSOLUTE path (built from
    # INSTANCE_DIR below) rather than a relative "sqlite:///..." URI. This is
    # deliberate: Flask-SQLAlchemy resolves *relative* sqlite URIs against
    # app.instance_path automatically, which would double up with our own
    # INSTANCE_DIR if we weren't careful. If overriding via DATABASE_URL in
    # .env, use a bare filename (e.g. "sqlite:///log_management.db"), NOT
    # "sqlite:///instance/log_management.db" — see .env.example.
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{INSTANCE_DIR / 'log_management.db'}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"check_same_thread": False}  # required for SQLite + threads
    }

    # --- Session Security ---
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    PERMANENT_SESSION_LIFETIME = int(os.environ.get("SESSION_TIMEOUT_MINUTES", 60)) * 60

    # --- Login / Lockout Policy ---
    MAX_LOGIN_ATTEMPTS = int(os.environ.get("MAX_LOGIN_ATTEMPTS", 5))
    LOGIN_LOCKOUT_MINUTES = int(os.environ.get("LOGIN_LOCKOUT_MINUTES", 15))

    # --- Rate Limiting ---
    RATELIMIT_STORAGE_URI = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_DEFAULT = "200 per hour"

    # --- Pagination / Export ---
    LOGS_PER_PAGE = int(os.environ.get("LOGS_PER_PAGE", 25))
    MAX_EXPORT_ROWS = int(os.environ.get("MAX_EXPORT_ROWS", 5000))

    # --- Simulated Log Generator ---
    ENABLE_LOG_GENERATOR = os.environ.get("ENABLE_LOG_GENERATOR", "true").lower() == "true"
    LOG_GEN_INTERVAL_MIN = int(os.environ.get("LOG_GEN_INTERVAL_MIN", 5))
    LOG_GEN_INTERVAL_MAX = int(os.environ.get("LOG_GEN_INTERVAL_MAX", 15))

    # --- Admin Bootstrap ---
    ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@secureops.local")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "ChangeMe@123")

    # --- Caching ---
    CACHE_TYPE = os.environ.get("CACHE_TYPE", "SimpleCache")
    CACHE_DEFAULT_TIMEOUT = int(os.environ.get("CACHE_DEFAULT_TIMEOUT", 60))

    # --- Filesystem paths (exposed to app for use in routes/utils) ---
    BASE_DIR = str(BASE_DIR)
    INSTANCE_DIR = str(INSTANCE_DIR)
    LOGS_DIR = str(LOGS_DIR)
    REPORTS_DIR = str(REPORTS_DIR)


class DevelopmentConfig(BaseConfig):
    """Local development configuration."""

    DEBUG = True
    SESSION_COOKIE_SECURE = False  # allow HTTP during local dev
    TALISMAN_FORCE_HTTPS = False


class ProductionConfig(BaseConfig):
    """Production configuration — enforces stricter security defaults."""

    DEBUG = False
    SESSION_COOKIE_SECURE = True   # cookies only sent over HTTPS
    TALISMAN_FORCE_HTTPS = True


class TestingConfig(BaseConfig):
    """Configuration used by automated tests."""

    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False
    SESSION_COOKIE_SECURE = False
    TALISMAN_FORCE_HTTPS = False


_CONFIG_MAP = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}


def get_config():
    """Return the Config class matching the FLASK_ENV environment variable."""
    env = os.environ.get("FLASK_ENV", "development").lower()
    return _CONFIG_MAP.get(env, DevelopmentConfig)

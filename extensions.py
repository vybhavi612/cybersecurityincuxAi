"""
extensions.py
==============================================================================
Instantiates Flask extensions WITHOUT binding them to an app instance.

This module exists to avoid circular imports: models, routes, and utils can
all import `db`, `login_manager`, etc. from here, while the actual
`init_app(app)` binding happens once inside the application factory in
app.py.
==============================================================================
"""

from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_wtf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from flask_talisman import Talisman

# --- Database ORM ---
db = SQLAlchemy()

# --- Authentication / Session Management ---
login_manager = LoginManager()
login_manager.login_view = "auth.login"
login_manager.login_message = "Please log in to access the security dashboard."
login_manager.login_message_category = "warning"
login_manager.session_protection = "strong"

# --- CSRF Protection ---
csrf = CSRFProtect()

# --- Rate Limiting (login brute-force protection) ---
limiter = Limiter(key_func=get_remote_address)

# --- Caching (dashboard aggregate stats) ---
cache = Cache()

# --- Security Headers (CSP, HSTS, X-Frame-Options, etc.) ---
talisman = Talisman()

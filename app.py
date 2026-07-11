"""
app.py
==============================================================================
Application entry point.

Uses the Flask "application factory" pattern (create_app) so the app can be
constructed with different configs for development, production, and testing
without relying on global state. This is the file you run directly:

    python app.py

or via the Flask CLI (reads .flaskenv automatically):

    flask run
==============================================================================
"""

import logging
from logging.handlers import RotatingFileHandler
import os

from flask import Flask, render_template

from config import get_config
from extensions import db, login_manager, csrf, limiter, cache, talisman


def configure_logging(app: Flask) -> None:
    """
    Configure application-level logging (Python `logging` module).

    NOTE: This is distinct from the SecurityLog *domain data* stored in the
    database. This logger captures Flask/application runtime events
    (errors, warnings, startup info) to logs/app.log with rotation, which is
    standard practice for any production-grade service.
    """
    log_file = os.path.join(app.config["LOGS_DIR"], "app.log")
    handler = RotatingFileHandler(log_file, maxBytes=1_000_000, backupCount=5)
    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
    )
    handler.setFormatter(formatter)
    handler.setLevel(logging.INFO if not app.debug else logging.DEBUG)

    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO if not app.debug else logging.DEBUG)
    app.logger.info("Logging configured successfully.")


def register_extensions(app: Flask) -> None:
    """Bind all Flask extensions (instantiated in extensions.py) to the app."""
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    limiter.init_app(app)
    cache.init_app(app)

    # Security headers — relaxed CSP to allow Bootstrap/Chart.js CDN + inline
    # styles needed by Chart.js canvas rendering.
    csp = {
        "default-src": "'self'",
        "script-src": ["'self'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
        "style-src": ["'self'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "'unsafe-inline'"],
        "font-src": ["'self'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
        "img-src": ["'self'", "data:"],
    }
    talisman.init_app(
        app,
        force_https=app.config.get("TALISMAN_FORCE_HTTPS", False),
        content_security_policy=csp,
        session_cookie_secure=app.config.get("SESSION_COOKIE_SECURE", False),
    )


def register_blueprints(app: Flask) -> None:
    """Register all route blueprints with the app."""
    from routes import register_blueprints as _register
    _register(app)


def register_error_handlers(app: Flask) -> None:
    """Custom error pages for common HTTP error codes."""

    @app.errorhandler(404)
    def not_found_error(error):
        return render_template("errors/404.html"), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        app.logger.error(f"Internal server error: {error}")
        return render_template("errors/500.html"), 500


def register_cli_and_context(app: Flask) -> None:
    """Register shell context and CLI commands useful for development."""

    @app.shell_context_processor
    def make_shell_context():
        from models import User, SecurityLog, Alert, Incident, BlockedIP
        return {
            "db": db,
            "User": User,
            "SecurityLog": SecurityLog,
            "Alert": Alert,
            "Incident": Incident,
            "BlockedIP": BlockedIP,
        }

    @app.cli.command("init-db")
    def init_db_command():
        """Flask CLI command: flask init-db  -> creates tables."""
        from database.db_init import initialize_database
        initialize_database(app)
        print("Database initialized.")

    @app.cli.command("seed-db")
    def seed_db_command():
        """Flask CLI command: flask seed-db  -> populates sample data."""
        from database.seed_data import seed_database
        seed_database(app)
        print("Database seeded with sample data.")


def start_log_generator(app: Flask) -> None:
    """
    Starts the background thread that periodically inserts simulated
    security events, if enabled via config. Uses werkzeug's reloader guard
    so the thread isn't started twice in debug mode.
    """
    if not app.config.get("ENABLE_LOG_GENERATOR", True):
        return

    # Avoid starting duplicate threads when Flask's debug reloader spawns
    # a second process.
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not app.debug:
        from utils.log_generator import start_background_generator
        start_background_generator(app)
        app.logger.info("Background log generator thread started.")


def create_app(config_object=None) -> Flask:
    """
    Application factory. Builds and returns a fully configured Flask app
    instance.
    """
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_object or get_config())

    configure_logging(app)
    register_extensions(app)
    register_blueprints(app)
    register_error_handlers(app)
    register_cli_and_context(app)

    # Ensure the database schema + seed data exist on first run.
    with app.app_context():
        from database.db_init import initialize_database
        from database.seed_data import seed_database, database_is_empty

        initialize_database(app)
        if database_is_empty():
            app.logger.info("Empty database detected — seeding sample data...")
            seed_database(app)

    start_log_generator(app)

    return app


# Module-level app instance so `flask run` / gunicorn can discover it via
# `app:app` without re-running create_app() logic differently than
# `python app.py` below.
app = create_app()


if __name__ == "__main__":
    app.run(
        host=os.environ.get("FLASK_RUN_HOST", "0.0.0.0"),
        port=int(os.environ.get("FLASK_RUN_PORT", 5000)),
        debug=app.config.get("DEBUG", False),
    )

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv


load_dotenv()


def _bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def _list(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = "Incux Traffic Detection"
    host: str = os.getenv("APP_HOST", "127.0.0.1")
    port: int = _int("APP_PORT", 8000)
    database_path: Path = Path(os.getenv("DATABASE_PATH", "data/incux_traffic.db"))

    capture_mode: str = os.getenv("CAPTURE_MODE", "simulation").strip().lower()
    capture_interface: str | None = os.getenv("CAPTURE_INTERFACE") or None

    auto_block: bool = _bool("AUTO_BLOCK", True)
    enable_firewall_blocking: bool = _bool("ENABLE_FIREWALL_BLOCKING", False)
    ip_whitelist: list[str] = field(default_factory=lambda: _list("IP_WHITELIST", "127.0.0.1,::1"))

    port_scan_unique_ports: int = _int("PORT_SCAN_UNIQUE_PORTS", 15)
    port_scan_window_seconds: int = _int("PORT_SCAN_WINDOW_SECONDS", 60)
    brute_force_attempts: int = _int("BRUTE_FORCE_ATTEMPTS", 10)
    brute_force_window_seconds: int = _int("BRUTE_FORCE_WINDOW_SECONDS", 120)
    ddos_packet_threshold: int = _int("DDOS_PACKET_THRESHOLD", 180)
    ddos_window_seconds: int = _int("DDOS_WINDOW_SECONDS", 10)
    abnormal_packet_threshold: int = _int("ABNORMAL_PACKET_THRESHOLD", 300)
    abnormal_window_seconds: int = _int("ABNORMAL_WINDOW_SECONDS", 60)

    auth_ports: tuple[int, ...] = (21, 22, 23, 25, 110, 143, 389, 445, 3389, 5900, 8080)


settings = Settings()

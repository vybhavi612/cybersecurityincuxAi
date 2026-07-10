from __future__ import annotations

import sqlite3
import threading
from pathlib import Path
from time import time
from typing import Any

from app.schemas import AIInsight, AlertEvent, PacketEvent


class Database:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._connect().close()
        self.init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def init_schema(self) -> None:
        with self._lock, self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS packets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    src_ip TEXT NOT NULL,
                    dst_ip TEXT NOT NULL,
                    src_port INTEGER,
                    dst_port INTEGER,
                    protocol TEXT NOT NULL,
                    size INTEGER NOT NULL,
                    flags TEXT DEFAULT ''
                );

                CREATE INDEX IF NOT EXISTS idx_packets_timestamp ON packets(timestamp);
                CREATE INDEX IF NOT EXISTS idx_packets_src_ip ON packets(src_ip);
                CREATE INDEX IF NOT EXISTS idx_packets_dst_ip ON packets(dst_ip);

                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    alert_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    src_ip TEXT NOT NULL,
                    dst_ip TEXT,
                    description TEXT NOT NULL,
                    evidence TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);
                CREATE INDEX IF NOT EXISTS idx_alerts_src_ip ON alerts(src_ip);

                CREATE TABLE IF NOT EXISTS blocked_ips (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ip TEXT NOT NULL UNIQUE,
                    reason TEXT NOT NULL,
                    first_seen REAL NOT NULL,
                    last_seen REAL NOT NULL,
                    active INTEGER NOT NULL DEFAULT 1,
                    firewall_enabled INTEGER NOT NULL DEFAULT 0,
                    firewall_status TEXT NOT NULL DEFAULT 'dry_run'
                );

                CREATE TABLE IF NOT EXISTS ai_insights (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    src_ip TEXT NOT NULL,
                    risk_score INTEGER NOT NULL,
                    label TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    features TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_ai_insights_timestamp ON ai_insights(timestamp);
                CREATE INDEX IF NOT EXISTS idx_ai_insights_src_ip ON ai_insights(src_ip);
                """
            )

    def insert_packet(self, packet: PacketEvent) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO packets
                    (timestamp, src_ip, dst_ip, src_port, dst_port, protocol, size, flags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    packet.timestamp,
                    packet.src_ip,
                    packet.dst_ip,
                    packet.src_port,
                    packet.dst_port,
                    packet.protocol,
                    packet.size,
                    packet.flags,
                ),
            )

    def insert_alert(self, alert: AlertEvent) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO alerts
                    (timestamp, alert_type, severity, src_ip, dst_ip, description, evidence)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    alert.timestamp,
                    alert.alert_type,
                    alert.severity,
                    alert.src_ip,
                    alert.dst_ip,
                    alert.description,
                    alert.evidence,
                ),
            )

    def insert_ai_insight(self, insight: AIInsight) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO ai_insights
                    (timestamp, src_ip, risk_score, label, summary, features)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    insight.timestamp,
                    insight.src_ip,
                    insight.risk_score,
                    insight.label,
                    insight.summary,
                    insight.features,
                ),
            )

    def upsert_blocked_ip(self, ip: str, reason: str, firewall_enabled: bool, firewall_status: str) -> None:
        now = time()
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO blocked_ips
                    (ip, reason, first_seen, last_seen, active, firewall_enabled, firewall_status)
                VALUES (?, ?, ?, ?, 1, ?, ?)
                ON CONFLICT(ip) DO UPDATE SET
                    reason=excluded.reason,
                    last_seen=excluded.last_seen,
                    active=1,
                    firewall_enabled=excluded.firewall_enabled,
                    firewall_status=excluded.firewall_status
                """,
                (ip, reason, now, now, int(firewall_enabled), firewall_status),
            )

    def deactivate_blocked_ip(self, ip: str, status: str) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                "UPDATE blocked_ips SET active=0, firewall_status=?, last_seen=? WHERE ip=?",
                (status, time(), ip),
            )

    def fetch_recent_packets(self, limit: int = 100) -> list[dict[str, Any]]:
        return self._fetch_all("SELECT * FROM packets ORDER BY timestamp DESC LIMIT ?", (limit,))

    def fetch_recent_alerts(self, limit: int = 100) -> list[dict[str, Any]]:
        return self._fetch_all("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?", (limit,))

    def fetch_recent_ai_insights(self, limit: int = 100) -> list[dict[str, Any]]:
        return self._fetch_all("SELECT * FROM ai_insights ORDER BY timestamp DESC LIMIT ?", (limit,))

    def fetch_blocked_ips(self) -> list[dict[str, Any]]:
        return self._fetch_all("SELECT * FROM blocked_ips ORDER BY active DESC, last_seen DESC", ())

    def stats(self) -> dict[str, Any]:
        now = time()
        since_minute = now - 60
        since_hour = now - 3600
        with self._lock, self._connect() as conn:
            totals = conn.execute(
                """
                SELECT
                    COUNT(*) AS total_packets,
                    COALESCE(SUM(size), 0) AS total_bytes,
                    COUNT(DISTINCT src_ip) AS unique_sources
                FROM packets
                """
            ).fetchone()
            minute = conn.execute(
                """
                SELECT
                    COUNT(*) AS packets_per_minute,
                    COALESCE(SUM(size), 0) AS bytes_per_minute
                FROM packets
                WHERE timestamp >= ?
                """,
                (since_minute,),
            ).fetchone()
            alerts = conn.execute(
                """
                SELECT
                    COUNT(*) AS total_alerts,
                    SUM(CASE WHEN severity='critical' THEN 1 ELSE 0 END) AS critical_alerts
                FROM alerts
                WHERE timestamp >= ?
                """,
                (since_hour,),
            ).fetchone()
            blocked = conn.execute("SELECT COUNT(*) AS active_blocks FROM blocked_ips WHERE active=1").fetchone()
            ai = conn.execute(
                """
                SELECT
                    COUNT(*) AS ai_insights_hour,
                    COALESCE(MAX(risk_score), 0) AS max_ai_risk
                FROM ai_insights
                WHERE timestamp >= ?
                """,
                (since_hour,),
            ).fetchone()
            protocols = conn.execute(
                """
                SELECT protocol, COUNT(*) AS count
                FROM packets
                WHERE timestamp >= ?
                GROUP BY protocol
                ORDER BY count DESC
                """,
                (since_hour,),
            ).fetchall()
            timeline = conn.execute(
                """
                SELECT CAST((timestamp / 10) AS INTEGER) * 10 AS bucket,
                       COUNT(*) AS packets,
                       COALESCE(SUM(size), 0) AS bytes
                FROM packets
                WHERE timestamp >= ?
                GROUP BY bucket
                ORDER BY bucket ASC
                """,
                (now - 300,),
            ).fetchall()
        return {
            "total_packets": totals["total_packets"],
            "total_bytes": totals["total_bytes"],
            "unique_sources": totals["unique_sources"],
            "packets_per_minute": minute["packets_per_minute"],
            "bytes_per_minute": minute["bytes_per_minute"],
            "total_alerts_hour": alerts["total_alerts"],
            "critical_alerts_hour": alerts["critical_alerts"] or 0,
            "active_blocks": blocked["active_blocks"],
            "ai_insights_hour": ai["ai_insights_hour"],
            "max_ai_risk": ai["max_ai_risk"],
            "protocols": [dict(row) for row in protocols],
            "timeline": [dict(row) for row in timeline],
        }

    def _fetch_all(self, query: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
        with self._lock, self._connect() as conn:
            return [dict(row) for row in conn.execute(query, params).fetchall()]

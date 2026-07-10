from __future__ import annotations

import asyncio
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.ai_engine import AIThreatAnalyzer
from app.blocker import BlockManager
from app.capture import TrafficMonitor
from app.config import settings
from app.database import Database
from app.detector import RuleBasedDetector
from app.schemas import AlertEvent, PacketEvent


BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

db = Database(settings.database_path)
detector = RuleBasedDetector(settings)
ai_analyzer = AIThreatAnalyzer(settings)
blocker = BlockManager(settings, db)


def handle_packet(packet: PacketEvent) -> None:
    db.insert_packet(packet)
    insight = ai_analyzer.analyze(packet)
    if insight:
        db.insert_ai_insight(insight)
        if insight.risk_score >= 90:
            ai_alert = {
                "timestamp": insight.timestamp,
                "alert_type": "ai_anomaly",
                "severity": "high",
                "src_ip": insight.src_ip,
                "dst_ip": None,
                "description": "AI anomaly model flagged suspicious traffic behavior",
                "evidence": insight.summary,
            }
            db.insert_alert(AlertEvent(**ai_alert))
            if settings.auto_block:
                blocker.block(insight.src_ip, f"ai_anomaly: {insight.summary}")
    for alert in detector.analyze(packet):
        db.insert_alert(alert)
        if settings.auto_block and alert.severity in {"high", "critical"}:
            blocker.block(alert.src_ip, f"{alert.alert_type}: {alert.evidence}")


monitor = TrafficMonitor(settings.capture_mode, settings.capture_interface, handle_packet)

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.on_event("startup")
def startup() -> None:
    monitor.start()


@app.on_event("shutdown")
def shutdown() -> None:
    monitor.stop()


@app.get("/")
def dashboard() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "capture_mode": settings.capture_mode,
        "monitor_status": monitor.status,
        "firewall_blocking_enabled": settings.enable_firewall_blocking,
        "auto_block": settings.auto_block,
        "ai_mode": ai_analyzer.mode,
    }


@app.get("/api/stats")
def stats() -> dict[str, object]:
    payload = db.stats()
    payload["monitor_status"] = monitor.status
    payload["capture_mode"] = settings.capture_mode
    payload["firewall_blocking_enabled"] = settings.enable_firewall_blocking
    payload["ai_mode"] = ai_analyzer.mode
    return payload


@app.get("/api/packets")
def packets(limit: int = 100) -> list[dict[str, object]]:
    return db.fetch_recent_packets(max(1, min(limit, 500)))


@app.get("/api/alerts")
def alerts(limit: int = 100) -> list[dict[str, object]]:
    return db.fetch_recent_alerts(max(1, min(limit, 500)))


@app.get("/api/ai")
def ai_insights(limit: int = 100) -> list[dict[str, object]]:
    return db.fetch_recent_ai_insights(max(1, min(limit, 500)))


@app.get("/api/blocked")
def blocked() -> list[dict[str, object]]:
    return db.fetch_blocked_ips()


@app.post("/api/block/{ip}")
def block_ip(ip: str, reason: str = "manual_dashboard_block") -> dict[str, object]:
    return blocker.block(ip, reason)


@app.delete("/api/block/{ip}")
def unblock_ip(ip: str) -> dict[str, object]:
    return blocker.unblock(ip)


@app.websocket("/ws")
async def websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            await websocket.send_json(
                {
                    "stats": stats(),
                    "packets": packets(40),
                    "alerts": alerts(30),
                    "ai": ai_insights(20),
                    "blocked": blocked(),
                }
            )
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        return

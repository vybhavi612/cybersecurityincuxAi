from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, SessionLocal, engine
from app.models import ThreatIntelCountry, ThreatIntelIP
from app.routers import alerts_routes, auth_routes, dashboard_routes, logs_routes, simulate_routes
from app.websocket_manager import manager

app = FastAPI(
    title="AI-Powered Security Audit Log Monitoring & Threat Detection System",
    version="0.1.0",
    description=(
        "Tracks user activity, builds a tamper-evident audit trail, scores risk "
        "in real time, and runs rule-based + ML (Isolation Forest / UBA) threat "
        "detection with live alerting."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(logs_routes.router)
app.include_router(alerts_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(simulate_routes.router)


def _seed_threat_intel() -> None:
    db = SessionLocal()
    try:
        if db.query(ThreatIntelIP).count() == 0:
            db.add_all(
                [
                    ThreatIntelIP(ip_address="45.155.205.1", reason="Known C2 infrastructure (demo seed)"),
                    ThreatIntelIP(ip_address="185.220.101.1", reason="Known Tor exit node abused for credential stuffing (demo seed)"),
                ]
            )
        if db.query(ThreatIntelCountry).count() == 0:
            db.add_all(
                [
                    ThreatIntelCountry(country="North Korea", reason="High-risk region (demo seed)"),
                    ThreatIntelCountry(country="Unknown", reason="Unresolvable / anonymized origin"),
                ]
            )
        db.commit()
    finally:
        db.close()


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    _seed_threat_intel()


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Dashboard is a passive listener; ignore any inbound messages.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)

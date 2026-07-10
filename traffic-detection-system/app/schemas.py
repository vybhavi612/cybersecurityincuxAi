from __future__ import annotations

from dataclasses import dataclass
from time import time


@dataclass(slots=True)
class PacketEvent:
    timestamp: float
    src_ip: str
    dst_ip: str
    src_port: int | None
    dst_port: int | None
    protocol: str
    size: int
    flags: str = ""

    @classmethod
    def now(
        cls,
        src_ip: str,
        dst_ip: str,
        src_port: int | None,
        dst_port: int | None,
        protocol: str,
        size: int,
        flags: str = "",
    ) -> "PacketEvent":
        return cls(time(), src_ip, dst_ip, src_port, dst_port, protocol, size, flags)


@dataclass(slots=True)
class AlertEvent:
    timestamp: float
    alert_type: str
    severity: str
    src_ip: str
    dst_ip: str | None
    description: str
    evidence: str


@dataclass(slots=True)
class AIInsight:
    timestamp: float
    src_ip: str
    risk_score: int
    label: str
    summary: str
    features: str

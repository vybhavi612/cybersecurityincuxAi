from __future__ import annotations

import json
from collections import defaultdict, deque
from statistics import mean
from time import time

from app.config import Settings
from app.schemas import AIInsight, PacketEvent

try:
    from sklearn.ensemble import IsolationForest
except Exception:  # pragma: no cover - fallback keeps the app usable without sklearn.
    IsolationForest = None  # type: ignore


class AIThreatAnalyzer:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.window_seconds = 60
        self._source_events: dict[str, deque[PacketEvent]] = defaultdict(deque)
        self._samples: deque[list[float]] = deque(maxlen=1200)
        self._packet_count = 0
        self._model = None
        self._last_insight: dict[str, float] = {}

    @property
    def mode(self) -> str:
        if IsolationForest is not None and self._model is not None:
            return "isolation_forest"
        if IsolationForest is not None:
            return "learning"
        return "statistical_fallback"

    def analyze(self, packet: PacketEvent) -> AIInsight | None:
        self._packet_count += 1
        events = self._source_events[packet.src_ip]
        events.append(packet)
        self._trim(events, packet.timestamp - self.window_seconds)

        vector, feature_map = self._features(events)
        self._samples.append(vector)
        self._maybe_train()

        score = self._score(vector, feature_map)
        if score < 75:
            return None
        if time() - self._last_insight.get(packet.src_ip, 0) < 35:
            return None

        self._last_insight[packet.src_ip] = time()
        label = "critical anomaly" if score >= 90 else "suspicious"
        reasons = self._reasons(feature_map, score)
        return AIInsight(
            timestamp=packet.timestamp,
            src_ip=packet.src_ip,
            risk_score=score,
            label=label,
            summary="; ".join(reasons),
            features=json.dumps(feature_map, separators=(",", ":")),
        )

    def _features(self, events: deque[PacketEvent]) -> tuple[list[float], dict[str, float]]:
        packet_count = len(events)
        sizes = [event.size for event in events]
        dst_ports = {event.dst_port for event in events if event.dst_port is not None}
        dst_ips = {event.dst_ip for event in events}
        tcp_packets = sum(1 for event in events if event.protocol == "TCP")
        syn_packets = sum(1 for event in events if "S" in event.flags)
        auth_hits = sum(1 for event in events if event.dst_port in self.settings.auth_ports)
        total_bytes = sum(sizes)

        feature_map = {
            "packets_60s": float(packet_count),
            "unique_dst_ports": float(len(dst_ports)),
            "unique_dst_ips": float(len(dst_ips)),
            "avg_packet_size": float(mean(sizes) if sizes else 0),
            "tcp_ratio": float(tcp_packets / packet_count if packet_count else 0),
            "syn_ratio": float(syn_packets / packet_count if packet_count else 0),
            "auth_port_hits": float(auth_hits),
            "bytes_60s": float(total_bytes),
        }
        vector = [
            feature_map["packets_60s"],
            feature_map["unique_dst_ports"],
            feature_map["unique_dst_ips"],
            feature_map["avg_packet_size"],
            feature_map["tcp_ratio"],
            feature_map["syn_ratio"],
            feature_map["auth_port_hits"],
            feature_map["bytes_60s"] / 1024,
        ]
        return vector, feature_map

    def _maybe_train(self) -> None:
        if IsolationForest is None or len(self._samples) < 80:
            return
        if self._packet_count % 50 != 0 and self._model is not None:
            return
        self._model = IsolationForest(contamination=0.08, random_state=42, n_estimators=80)
        self._model.fit(list(self._samples))

    def _score(self, vector: list[float], features: dict[str, float]) -> int:
        fallback = self._statistical_score(features)
        if self._model is None:
            return fallback

        prediction = int(self._model.predict([vector])[0])
        raw = float(-self._model.decision_function([vector])[0])
        ml_score = max(0, min(100, int(55 + raw * 280)))
        if prediction == -1:
            ml_score = max(ml_score, 78)
        if fallback < 35 and ml_score < 88:
            return fallback
        return max(fallback, ml_score)

    def _statistical_score(self, features: dict[str, float]) -> int:
        score = 0.0
        score += min(35, features["packets_60s"] * 0.18)
        score += min(28, features["unique_dst_ports"] * 2.4)
        score += min(18, features["auth_port_hits"] * 2.2)
        score += min(15, features["bytes_60s"] / 25000)
        score += 14 if features["syn_ratio"] > 0.65 and features["packets_60s"] > 20 else 0
        score += 10 if features["unique_dst_ips"] > 5 else 0
        if features["unique_dst_ports"] >= 15 and features["syn_ratio"] > 0.6:
            score = max(score, 92)
        if features["auth_port_hits"] >= 10 and features["syn_ratio"] > 0.5:
            score = max(score, 88)
        if features["packets_60s"] >= 120:
            score = max(score, 82)
        return max(0, min(100, int(score)))

    @staticmethod
    def _reasons(features: dict[str, float], score: int) -> list[str]:
        reasons: list[str] = [f"AI risk score {score}/100"]
        if features["packets_60s"] >= 80:
            reasons.append(f"high packet rate ({int(features['packets_60s'])} packets/60s)")
        if features["unique_dst_ports"] >= 10:
            reasons.append(f"many destination ports ({int(features['unique_dst_ports'])})")
        if features["auth_port_hits"] >= 8:
            reasons.append(f"repeated auth-service hits ({int(features['auth_port_hits'])})")
        if features["syn_ratio"] > 0.65:
            reasons.append("SYN-heavy traffic pattern")
        if len(reasons) == 1:
            reasons.append("traffic pattern differs from recent baseline")
        return reasons

    @staticmethod
    def _trim(events: deque[PacketEvent], cutoff: float) -> None:
        while events and events[0].timestamp < cutoff:
            events.popleft()

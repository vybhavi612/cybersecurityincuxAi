from __future__ import annotations

from collections import defaultdict, deque
from time import time

from app.config import Settings
from app.schemas import AlertEvent, PacketEvent


class RuleBasedDetector:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._ports_by_source: dict[str, deque[tuple[float, int]]] = defaultdict(deque)
        self._auth_hits: dict[str, deque[float]] = defaultdict(deque)
        self._packets_by_target: dict[str, deque[tuple[float, str]]] = defaultdict(deque)
        self._packets_by_source: dict[str, deque[float]] = defaultdict(deque)
        self._last_alert: dict[tuple[str, str], float] = {}

    def analyze(self, packet: PacketEvent) -> list[AlertEvent]:
        alerts: list[AlertEvent] = []
        alerts.extend(self._detect_port_scan(packet))
        alerts.extend(self._detect_brute_force(packet))
        alerts.extend(self._detect_ddos(packet))
        alerts.extend(self._detect_abnormal_source(packet))
        return alerts

    def _detect_port_scan(self, packet: PacketEvent) -> list[AlertEvent]:
        if packet.dst_port is None or packet.protocol not in {"TCP", "UDP"}:
            return []
        window = self.settings.port_scan_window_seconds
        events = self._ports_by_source[packet.src_ip]
        events.append((packet.timestamp, packet.dst_port))
        self._trim_pair_deque(events, packet.timestamp - window)
        unique_ports = {port for _, port in events}
        if len(unique_ports) < self.settings.port_scan_unique_ports:
            return []
        evidence = f"{len(unique_ports)} unique destination ports in {window}s"
        return self._alert_once(
            "port_scan",
            "high",
            packet,
            "Possible port scanning activity detected",
            evidence,
            cooldown=30,
        )

    def _detect_brute_force(self, packet: PacketEvent) -> list[AlertEvent]:
        if packet.dst_port not in self.settings.auth_ports:
            return []
        window = self.settings.brute_force_window_seconds
        events = self._auth_hits[f"{packet.src_ip}:{packet.dst_ip}:{packet.dst_port}"]
        events.append(packet.timestamp)
        self._trim_time_deque(events, packet.timestamp - window)
        if len(events) < self.settings.brute_force_attempts:
            return []
        evidence = f"{len(events)} attempts against port {packet.dst_port} in {window}s"
        return self._alert_once(
            "brute_force",
            "high",
            packet,
            "Repeated authentication-service connection attempts detected",
            evidence,
            cooldown=45,
        )

    def _detect_ddos(self, packet: PacketEvent) -> list[AlertEvent]:
        window = self.settings.ddos_window_seconds
        events = self._packets_by_target[packet.dst_ip]
        events.append((packet.timestamp, packet.src_ip))
        self._trim_pair_deque(events, packet.timestamp - window)
        if len(events) < self.settings.ddos_packet_threshold:
            return []
        unique_sources = {src_ip for _, src_ip in events}
        if len(unique_sources) < 8:
            return []
        evidence = f"{len(events)} packets from {len(unique_sources)} sources in {window}s"
        return self._alert_once(
            "ddos",
            "critical",
            packet,
            "Distributed high-volume traffic pattern detected",
            evidence,
            cooldown=30,
            key_identity=packet.dst_ip,
        )

    def _detect_abnormal_source(self, packet: PacketEvent) -> list[AlertEvent]:
        window = self.settings.abnormal_window_seconds
        events = self._packets_by_source[packet.src_ip]
        events.append(packet.timestamp)
        self._trim_time_deque(events, packet.timestamp - window)
        if len(events) < self.settings.abnormal_packet_threshold:
            return []
        evidence = f"{len(events)} packets from one source in {window}s"
        return self._alert_once(
            "abnormal_traffic",
            "medium",
            packet,
            "Abnormally high packet rate from a single source",
            evidence,
            cooldown=60,
        )

    def _alert_once(
        self,
        alert_type: str,
        severity: str,
        packet: PacketEvent,
        description: str,
        evidence: str,
        cooldown: int,
        key_identity: str | None = None,
    ) -> list[AlertEvent]:
        key = (alert_type, key_identity or packet.src_ip)
        now = time()
        if now - self._last_alert.get(key, 0) < cooldown:
            return []
        self._last_alert[key] = now
        return [
            AlertEvent(
                timestamp=packet.timestamp,
                alert_type=alert_type,
                severity=severity,
                src_ip=packet.src_ip,
                dst_ip=packet.dst_ip,
                description=description,
                evidence=evidence,
            )
        ]

    @staticmethod
    def _trim_time_deque(events: deque[float], cutoff: float) -> None:
        while events and events[0] < cutoff:
            events.popleft()

    @staticmethod
    def _trim_pair_deque(events: deque[tuple[float, object]], cutoff: float) -> None:
        while events and events[0][0] < cutoff:
            events.popleft()

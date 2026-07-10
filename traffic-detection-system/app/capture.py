from __future__ import annotations

import random
import threading
import time
from collections.abc import Callable

from app.schemas import PacketEvent


PacketHandler = Callable[[PacketEvent], None]


class TrafficMonitor:
    def __init__(self, mode: str, interface: str | None, handler: PacketHandler):
        self.mode = mode
        self.interface = interface
        self.handler = handler
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.status = "stopped"

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        target = self._run_live if self.mode == "live" else self._run_simulation
        self._thread = threading.Thread(target=target, name="traffic-monitor", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2)
        self.status = "stopped"

    def _run_live(self) -> None:
        self.status = "starting_live_capture"
        try:
            from scapy.all import IP, TCP, UDP, sniff  # type: ignore
        except Exception:
            self.status = "scapy_unavailable_falling_back_to_simulation"
            self._run_simulation()
            return

        def on_packet(raw_packet: object) -> None:
            if self._stop.is_set():
                return
            try:
                if IP not in raw_packet:
                    return
                ip = raw_packet[IP]
                src_port = None
                dst_port = None
                protocol = str(ip.proto)
                flags = ""
                if TCP in raw_packet:
                    tcp = raw_packet[TCP]
                    src_port = int(tcp.sport)
                    dst_port = int(tcp.dport)
                    protocol = "TCP"
                    flags = str(tcp.flags)
                elif UDP in raw_packet:
                    udp = raw_packet[UDP]
                    src_port = int(udp.sport)
                    dst_port = int(udp.dport)
                    protocol = "UDP"
                self.handler(
                    PacketEvent.now(
                        src_ip=str(ip.src),
                        dst_ip=str(ip.dst),
                        src_port=src_port,
                        dst_port=dst_port,
                        protocol=protocol,
                        size=len(raw_packet),
                        flags=flags,
                    )
                )
            except Exception:
                return

        self.status = "live_capture_running"
        sniff(
            iface=self.interface,
            prn=on_packet,
            store=False,
            stop_filter=lambda _: self._stop.is_set(),
        )

    def _run_simulation(self) -> None:
        self.status = "simulation_running"
        normal_sources = [f"10.0.1.{i}" for i in range(10, 60)]
        services = [53, 80, 443, 123, 8080, 5000]
        target = "10.0.1.5"
        cycle = 0
        while not self._stop.is_set():
            cycle += 1
            for _ in range(random.randint(8, 18)):
                self.handler(
                    PacketEvent.now(
                        src_ip=random.choice(normal_sources),
                        dst_ip=target,
                        src_port=random.randint(1024, 65535),
                        dst_port=random.choice(services),
                        protocol=random.choice(["TCP", "UDP"]),
                        size=random.randint(64, 1400),
                        flags=random.choice(["", "S", "PA"]),
                    )
                )

            if cycle % 8 == 0:
                attacker = "203.0.113.77"
                for port in range(20, 42):
                    self.handler(PacketEvent.now(attacker, target, random.randint(30000, 65535), port, "TCP", 60, "S"))

            if cycle % 11 == 0:
                attacker = "198.51.100.23"
                for _ in range(14):
                    self.handler(PacketEvent.now(attacker, target, random.randint(30000, 65535), 22, "TCP", 70, "S"))

            if cycle % 15 == 0:
                for i in range(190):
                    src = f"172.16.{random.randint(10, 250)}.{random.randint(2, 250)}"
                    self.handler(PacketEvent.now(src, target, random.randint(1024, 65535), 443, "TCP", 88, "S"))

            time.sleep(1)

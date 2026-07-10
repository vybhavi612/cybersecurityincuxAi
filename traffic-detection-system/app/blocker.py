from __future__ import annotations

import ipaddress
import platform
import subprocess

from app.config import Settings
from app.database import Database


class BlockManager:
    def __init__(self, settings: Settings, db: Database):
        self.settings = settings
        self.db = db
        self.whitelist = {ip.strip() for ip in settings.ip_whitelist}

    def block(self, ip: str, reason: str) -> dict[str, str | bool]:
        if not self._can_block(ip):
            status = "skipped_whitelisted_or_invalid"
            self.db.upsert_blocked_ip(ip, reason, False, status)
            return {"ip": ip, "blocked": False, "status": status}

        if not self.settings.enable_firewall_blocking:
            status = "dry_run"
            self.db.upsert_blocked_ip(ip, reason, False, status)
            return {"ip": ip, "blocked": False, "status": status}

        try:
            self._apply_firewall_rule(ip)
            status = "blocked"
            self.db.upsert_blocked_ip(ip, reason, True, status)
            return {"ip": ip, "blocked": True, "status": status}
        except Exception as exc:  # noqa: BLE001 - status is stored for operator visibility.
            status = f"firewall_error: {exc}"
            self.db.upsert_blocked_ip(ip, reason, True, status)
            return {"ip": ip, "blocked": False, "status": status}

    def unblock(self, ip: str) -> dict[str, str | bool]:
        if self.settings.enable_firewall_blocking:
            try:
                self._remove_firewall_rule(ip)
                self.db.deactivate_blocked_ip(ip, "unblocked")
                return {"ip": ip, "unblocked": True, "status": "unblocked"}
            except Exception as exc:  # noqa: BLE001
                status = f"unblock_error: {exc}"
                self.db.deactivate_blocked_ip(ip, status)
                return {"ip": ip, "unblocked": False, "status": status}

        self.db.deactivate_blocked_ip(ip, "dry_run_removed")
        return {"ip": ip, "unblocked": True, "status": "dry_run_removed"}

    def _can_block(self, ip: str) -> bool:
        if ip in self.whitelist:
            return False
        try:
            parsed = ipaddress.ip_address(ip)
        except ValueError:
            return False
        return not (
            parsed.is_loopback
            or parsed.is_multicast
            or parsed.is_unspecified
            or parsed.is_link_local
        )

    def _apply_firewall_rule(self, ip: str) -> None:
        system = platform.system().lower()
        if system == "windows":
            rule_name = f"IncuxBlock_{ip}"
            subprocess.run(
                [
                    "netsh",
                    "advfirewall",
                    "firewall",
                    "add",
                    "rule",
                    f"name={rule_name}",
                    "dir=in",
                    "action=block",
                    f"remoteip={ip}",
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            return
        subprocess.run(["iptables", "-I", "INPUT", "-s", ip, "-j", "DROP"], check=True, capture_output=True, text=True)

    def _remove_firewall_rule(self, ip: str) -> None:
        system = platform.system().lower()
        if system == "windows":
            subprocess.run(
                [
                    "netsh",
                    "advfirewall",
                    "firewall",
                    "delete",
                    "rule",
                    f"name=IncuxBlock_{ip}",
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            return
        subprocess.run(["iptables", "-D", "INPUT", "-s", ip, "-j", "DROP"], check=True, capture_output=True, text=True)

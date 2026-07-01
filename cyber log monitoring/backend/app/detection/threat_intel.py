"""
Threat intelligence matching: known malicious IPs, suspicious countries,
blacklisted users. Backed by app.models.ThreatIntelIP / ThreatIntelCountry
and User.is_blacklisted.
"""
from typing import List, Optional

from sqlalchemy.orm import Session

from app.detection import Finding
from app.models import ThreatIntelIP, ThreatIntelCountry, AlertType


def check(
    db: Session, username: Optional[str], ip_address: Optional[str], country: Optional[str], is_blacklisted: bool
) -> List[Finding]:
    findings: List[Finding] = []

    if is_blacklisted:
        findings.append(
            Finding(
                alert_type=AlertType.THREAT_INTEL_MATCH,
                level="CRITICAL",
                message=f"Activity from blacklisted user '{username}'.",
                risk_modifier=95,
            )
        )

    if ip_address:
        hit = db.query(ThreatIntelIP).filter(ThreatIntelIP.ip_address == ip_address).first()
        if hit:
            findings.append(
                Finding(
                    alert_type=AlertType.THREAT_INTEL_MATCH,
                    level="CRITICAL",
                    message=f"Connection from known malicious IP {ip_address} ({hit.reason}).",
                    risk_modifier=95,
                )
            )

    if country:
        hit = db.query(ThreatIntelCountry).filter(ThreatIntelCountry.country == country).first()
        if hit:
            findings.append(
                Finding(
                    alert_type=AlertType.THREAT_INTEL_MATCH,
                    level="MEDIUM",
                    message=f"Login from flagged region '{country}' ({hit.reason}).",
                    risk_modifier=60,
                )
            )

    return findings

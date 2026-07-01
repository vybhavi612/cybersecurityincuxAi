"""
IP -> geolocation lookup with an in-memory cache and a deterministic fallback
for private/reserved IPs (which a free public geo-IP API can't resolve) so
the demo still produces varied, stable locations for simulated traffic.
"""
import ipaddress
import math
from hashlib import md5
from typing import Optional

import requests

from app.config import settings

_cache: dict[str, dict] = {}

# Pool of plausible city/country fixtures used when an IP is private/local or
# the public API is unreachable -- keeps the demo deterministic per-IP.
_FALLBACK_LOCATIONS = [
    {"city": "Delhi", "country": "India", "lat": 28.6139, "lon": 77.2090},
    {"city": "Mumbai", "country": "India", "lat": 19.0760, "lon": 72.8777},
    {"city": "New York", "country": "United States", "lat": 40.7128, "lon": -74.0060},
    {"city": "London", "country": "United Kingdom", "lat": 51.5074, "lon": -0.1278},
    {"city": "Singapore", "country": "Singapore", "lat": 1.3521, "lon": 103.8198},
    {"city": "Lagos", "country": "Nigeria", "lat": 6.5244, "lon": 3.3792},
    {"city": "Moscow", "country": "Russia", "lat": 55.7558, "lon": 37.6173},
    {"city": "Beijing", "country": "China", "lat": 39.9042, "lon": 116.4074},
    {"city": "Sao Paulo", "country": "Brazil", "lat": -23.5505, "lon": -46.6333},
    {"city": "Sydney", "country": "Australia", "lat": -33.8688, "lon": 151.2093},
]


def _fallback_for_ip(ip: str) -> dict:
    idx = int(md5(ip.encode()).hexdigest(), 16) % len(_FALLBACK_LOCATIONS)
    loc = _FALLBACK_LOCATIONS[idx]
    return {
        "city": loc["city"],
        "country": loc["country"],
        "lat": loc["lat"],
        "lon": loc["lon"],
    }


def _is_private(ip: str) -> bool:
    try:
        return ipaddress.ip_address(ip).is_private
    except ValueError:
        return True


def lookup_ip(ip: str) -> dict:
    """Returns {city, country, lat, lon}. Cached per-process."""
    if ip in _cache:
        return _cache[ip]

    if _is_private(ip):
        result = _fallback_for_ip(ip)
        _cache[ip] = result
        return result

    try:
        resp = requests.get(f"{settings.GEOIP_API_URL}/{ip}", timeout=2)
        data = resp.json()
        if data.get("status") == "success":
            result = {
                "city": data.get("city") or "Unknown",
                "country": data.get("country") or "Unknown",
                "lat": data.get("lat"),
                "lon": data.get("lon"),
            }
            _cache[ip] = result
            return result
    except requests.RequestException:
        pass

    result = _fallback_for_ip(ip)
    _cache[ip] = result
    return result


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two lat/lon points, in km."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def implied_speed_kmh(
    lat1: float, lon1: float, t1, lat2: float, lon2: float, t2
) -> Optional[float]:
    """Speed required to travel between two (lat, lon, timestamp) points."""
    seconds = abs((t2 - t1).total_seconds())
    if seconds <= 0:
        return None
    distance = haversine_km(lat1, lon1, lat2, lon2)
    hours = seconds / 3600.0
    return distance / hours if hours > 0 else None

"""
Comprehensive lexical/structural URL feature extractor.

Unlike the legacy feature.py, every feature here is computed purely from the URL
string itself - no live HTTP fetch, WHOIS lookup, or third-party API call. That
makes it fast (microseconds vs. seconds), deterministic, and immune to the dead
services (Alexa rank API, checkpagerank.net) and rate-limited/blocked ones
(Google search scraping, WHOIS) that the legacy extractor silently degrades on.
"""
import math
import re
from collections import Counter
from urllib.parse import urlparse

import tldextract

SUSPICIOUS_TLDS = {
    "zip", "mov", "top", "xyz", "tk", "ml", "ga", "cf", "gq", "work", "click",
    "link", "loan", "download", "review", "country", "kim", "science", "party",
    "gdn", "men", "date", "faith", "webcam", "bid", "stream", "cam", "icu",
}

URL_SHORTENERS = {
    "bit.ly", "goo.gl", "shorte.st", "go2l.ink", "x.co", "ow.ly", "t.co",
    "tinyurl.com", "tr.im", "is.gd", "cli.gs", "tiny.cc", "cutt.ly", "rebrand.ly",
    "buff.ly", "adf.ly", "bit.do", "v.gd", "qr.ae", "u.to", "s.id",
}

BRAND_NAMES = [
    "paypal", "microsoft", "apple", "google", "amazon", "netflix", "facebook",
    "instagram", "whatsapp", "outlook", "office365", "chase", "wellsfargo",
    "bankofamerica", "americanexpress", "linkedin", "adobe", "dropbox", "yahoo",
    "twitter", "ebay", "steamcommunity", "coinbase", "binance", "icloud",
    "verizon", "att", "docusign", "hsbc", "santander", "capitalone",
]

SUSPICIOUS_KEYWORDS = [
    "login", "signin", "verify", "secure", "account", "update", "confirm",
    "bank", "password", "webscr", "ebayisapi", "suspend", "unlock", "wallet",
    "invoice", "billing", "security", "authenticate", "recover", "support",
]

FEATURE_NAMES = [
    "url_length", "hostname_length", "path_length", "query_length",
    "num_dots", "num_hyphens", "num_underscores", "num_slashes",
    "num_digits", "num_special_chars", "digit_ratio",
    "url_entropy", "hostname_entropy",
    "has_ip_host", "has_at_symbol", "has_double_slash_redirect",
    "num_subdomains", "subdomain_length",
    "is_https", "has_port", "is_suspicious_tld", "is_shortener",
    "has_punycode", "brand_in_subdomain_not_domain", "min_brand_edit_distance",
    "suspicious_keyword_count", "hyphen_in_domain", "digit_in_domain",
    "path_depth", "num_query_params", "longest_word_length",
    "tld_length", "has_https_in_path",
]


def shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    counts = Counter(s)
    length = len(s)
    return -sum((c / length) * math.log2(c / length) for c in counts.values())


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i] + [0] * len(b)
        for j, cb in enumerate(b, 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb))
        prev = cur
    return prev[-1]


class LexicalFeatureExtractor:
    """Extracts a fixed-length numeric feature vector from a raw URL string."""

    def __init__(self, url: str):
        self.url = url.strip()
        if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", self.url):
            self.url = "http://" + self.url

        self.parsed = urlparse(self.url)
        self.hostname = self.parsed.netloc.split("@")[-1].split(":")[0]
        self.ext = tldextract.extract(self.url)
        self.domain = self.ext.domain or ""
        self.subdomain = self.ext.subdomain or ""
        self.tld = self.ext.suffix or ""

    def _is_ip_host(self) -> bool:
        return bool(re.match(r"^(\d{1,3}\.){3}\d{1,3}$", self.hostname))

    def _min_brand_edit_distance(self):
        """Small edit distance between a domain *token* and a known brand - while
        that token isn't an exact, whole-domain match to the brand - is a strong
        typosquatting signal (e.g. the 'paypa1' token in 'paypa1-secure-login.tk'
        vs. 'paypal'). Tokenizing on hyphens/digits catches this; comparing the
        raw multi-word domain string against the short brand name would not."""
        tokens = re.split(r"[-_0-9]+", self.domain.lower())
        tokens = [t for t in tokens if len(t) >= 4]
        if not tokens:
            return 99
        best = 99
        for token in tokens:
            for brand in BRAND_NAMES:
                if token == brand and self.domain.lower() == brand:
                    continue  # exact match on the real, unadorned domain is not suspicious
                d = levenshtein(token, brand)
                if d < best:
                    best = d
        return best

    def extract(self) -> list:
        url = self.url
        host = self.hostname
        path = self.parsed.path or ""
        query = self.parsed.query or ""
        full_domain = f"{self.domain}.{self.tld}" if self.tld else self.domain

        num_digits = sum(c.isdigit() for c in url)
        special_chars = sum(1 for c in url if c in "!*'();:@&=+$,?%#[]")
        words = re.split(r"[/\-_.?=&]", url)
        words = [w for w in words if w]

        features = {
            "url_length": len(url),
            "hostname_length": len(host),
            "path_length": len(path),
            "query_length": len(query),
            "num_dots": url.count("."),
            "num_hyphens": url.count("-"),
            "num_underscores": url.count("_"),
            "num_slashes": url.count("/"),
            "num_digits": num_digits,
            "num_special_chars": special_chars,
            "digit_ratio": num_digits / len(url) if url else 0.0,
            "url_entropy": shannon_entropy(url),
            "hostname_entropy": shannon_entropy(host),
            "has_ip_host": int(self._is_ip_host()),
            "has_at_symbol": int("@" in url),
            "has_double_slash_redirect": int(url.rfind("//") > 7),
            "num_subdomains": len(self.subdomain.split(".")) if self.subdomain else 0,
            "subdomain_length": len(self.subdomain),
            "is_https": int(self.parsed.scheme == "https"),
            "has_port": int(self.parsed.port is not None) if self._safe_port() else 0,
            "is_suspicious_tld": int(self.tld.lower() in SUSPICIOUS_TLDS),
            "is_shortener": int(full_domain.lower() in URL_SHORTENERS),
            "has_punycode": int("xn--" in host.lower()),
            "brand_in_subdomain_not_domain": int(
                any(b in self.subdomain.lower() for b in BRAND_NAMES)
                and not any(b == self.domain.lower() for b in BRAND_NAMES)
            ),
            "min_brand_edit_distance": self._min_brand_edit_distance(),
            "suspicious_keyword_count": sum(k in url.lower() for k in SUSPICIOUS_KEYWORDS),
            "hyphen_in_domain": int("-" in self.domain),
            "digit_in_domain": int(any(c.isdigit() for c in self.domain)),
            "path_depth": path.count("/"),
            "num_query_params": len(query.split("&")) if query else 0,
            "longest_word_length": max((len(w) for w in words), default=0),
            "tld_length": len(self.tld),
            "has_https_in_path": int("https" in (path + query).lower()),
        }
        return [features[name] for name in FEATURE_NAMES]

    def _safe_port(self):
        try:
            self.parsed.port
            return True
        except ValueError:
            return False


def extract_features(url: str) -> list:
    return LexicalFeatureExtractor(url).extract()

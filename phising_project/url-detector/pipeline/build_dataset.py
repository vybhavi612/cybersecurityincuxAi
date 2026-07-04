"""
Builds a fresh raw-URL dataset for the hybrid pipeline from two live public feeds:

  - Phishing:   PhishTank verified-online feed (data.phishtank.com/data/online-valid.csv)
  - Legitimate: Cisco Umbrella Popularity List (top-ranked real-world domains)

Output: pipeline/data/urls_dataset.csv with columns [url, label]  (1 = phishing, 0 = legitimate)

Run once to (re)build the dataset:  python pipeline/build_dataset.py
"""
import random
import secrets
import string

import pandas as pd

random.seed(42)

N_LEGIT = 90_000

SUBDOMAINS = (
    ["www"] * 8 + ["blog", "shop", "support", "docs", "mail", "m", "api", "cdn",
                   "help", "app", "en", "static", "news", "my"]
)

WORDS = [
    "python", "guide", "tutorial", "review", "best", "top", "news", "update",
    "release", "version", "product", "price", "deal", "sale", "offer", "new",
    "article", "post", "story", "report", "analysis", "how", "to", "learn",
    "code", "data", "science", "machine", "learning", "security", "privacy",
    "policy", "terms", "about", "contact", "team", "careers", "jobs", "help",
    "faq", "support", "docs", "reference", "manual", "setup", "install",
    "download", "free", "premium", "plan", "pricing", "feature", "list",
    "category", "tag", "search", "results", "profile", "settings", "account",
    "dashboard", "project", "repo", "issue", "pull", "request", "comment",
    "thread", "forum", "discussion", "video", "watch", "photo", "image",
    "gallery", "event", "calendar", "schedule", "location", "store", "cart",
    "checkout", "order", "shipping", "return", "recipe", "food", "travel",
    "hotel", "flight", "booking", "review", "rating", "health", "fitness",
    "workout", "diet", "finance", "invest", "market", "stock", "crypto",
]


def random_slug(min_words=1, max_words=4):
    n = random.randint(min_words, max_words)
    return "-".join(random.choice(WORDS) for _ in range(n))


def random_token():
    kind = random.random()
    if kind < 0.4:
        return str(random.randint(1, 999999))
    if kind < 0.7:
        return secrets.token_hex(random.choice([3, 4, 6, 8]))
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=random.randint(6, 12)))


def random_path():
    """Generates realistic, varied paths so path complexity/length isn't a
    spurious tell for phishing - real legitimate URLs (repos, articles, product
    pages, videos) have deep, hyphenated, ID-bearing paths just as often."""
    if random.random() < 0.15:
        return ""  # bare domain

    if random.random() < 0.15:
        # namespace/resource pattern: github.com/org/repo, npmjs.com/package/name,
        # gitlab.com/group/project, pypi.org/project/name, etc.
        return "/" + random.choice(WORDS) + "/" + random_slug(1, 3)

    depth = random.choices([1, 2, 3, 4], weights=[35, 30, 20, 15])[0]
    segments = []
    for _ in range(depth):
        r = random.random()
        if r < 0.35:
            segments.append(random_slug())
        elif r < 0.6:
            segments.append(random.choice(WORDS))
        elif r < 0.85:
            segments.append(random_token())
        else:
            segments.append(random.choice(WORDS) + "-" + random_token())
    path = "/" + "/".join(segments)

    if random.random() < 0.25:
        params = []
        for _ in range(random.randint(1, 3)):
            key = random.choice(["id", "ref", "page", "lang", "utm_source", "utm_medium", "q", "sort", "v"])
            params.append(f"{key}={random_token()}")
        path += "?" + "&".join(params)
    return path


def load_phishing(path="pipeline/data/phishtank_raw.csv"):
    df = pd.read_csv(path)
    df = df[df["online"].str.lower() == "yes"]
    urls = df["url"].dropna().astype(str).str.strip()
    urls = urls[urls.str.len() > 0].unique().tolist()
    return urls


def load_legitimate(path="pipeline/data/top-1m.csv", n=N_LEGIT, top_n_extra_variant=30_000):
    """Popular domains (top_n_extra_variant) get two URL samples instead of one,
    so heavily-used real-world domains get better path/subdomain coverage rather
    than being reduced to a single random path guess."""
    df = pd.read_csv(path, header=None, names=["rank", "domain"])
    domains = df["domain"].head(n).astype(str).tolist()
    urls = []
    for i, d in enumerate(domains):
        variants = 2 if i < top_n_extra_variant else 1
        for _ in range(variants):
            host = d
            if "." in d and not d.startswith("www.") and random.random() < 0.5:
                host = f"{random.choice(SUBDOMAINS)}.{d}"
            scheme = "https://" if random.random() < 0.92 else "http://"
            urls.append(f"{scheme}{host}{random_path()}")
    return urls


def main():
    phishing_urls = load_phishing()
    legit_urls = load_legitimate()

    print(f"Loaded {len(phishing_urls)} phishing URLs (PhishTank, live-verified)")
    print(f"Loaded {len(legit_urls)} legitimate URLs (Cisco Umbrella top domains)")

    rows = [(u, 1) for u in phishing_urls] + [(u, 0) for u in legit_urls]
    random.shuffle(rows)

    out = pd.DataFrame(rows, columns=["url", "label"]).drop_duplicates(subset="url")
    out.to_csv("pipeline/data/urls_dataset.csv", index=False)

    print(f"\nSaved pipeline/data/urls_dataset.csv: {len(out)} rows")
    print(out["label"].value_counts().rename({1: "phishing", 0: "legitimate"}))


if __name__ == "__main__":
    main()

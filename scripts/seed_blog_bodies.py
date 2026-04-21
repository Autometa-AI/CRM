#!/usr/bin/env python3
"""
Seed body_html into blog_posts rows by extracting the prose from the
marketing site's existing static /blog/<slug>/index.html files.

Run ONCE after migration 0003 has been applied.

Usage:
  SUPABASE_URL=https://<ref>.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<key> \
  MARKETING_REPO=/path/to/Autometa-AI \
  python3 scripts/seed_blog_bodies.py
"""
import os, re, sys, json
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
REPO = Path(os.environ.get("MARKETING_REPO", "../Autometa-AI-New"))

if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")

BLOG_DIR = REPO / "blog"
if not BLOG_DIR.is_dir():
    sys.exit(f"Blog dir not found: {BLOG_DIR}")

PROSE_RE = re.compile(
    r'<article class="prose">(.*?)</article>', re.DOTALL
)

def extract_body(path: Path):
    html = path.read_text()
    m = PROSE_RE.search(html)
    if not m:
        return None
    return m.group(1).strip()

def update_body(slug: str, body_html: str) -> None:
    url = f"{SUPABASE_URL}/rest/v1/blog_posts?slug=eq.{slug}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    req = Request(
        url,
        data=json.dumps({"body_html": body_html}).encode(),
        headers=headers,
        method="PATCH",
    )
    try:
        with urlopen(req) as r:
            print(f"  updated {slug} ({r.status})")
    except HTTPError as e:
        print(f"  FAILED {slug}: {e.code} {e.read().decode()[:200]}")

def main() -> None:
    count = 0
    for sub in sorted(BLOG_DIR.iterdir()):
        if not sub.is_dir():
            continue
        idx = sub / "index.html"
        if not idx.exists():
            continue
        slug = sub.name
        print(f"→ {slug}")
        body = extract_body(idx)
        if body is None:
            print("  could not find <article class='prose'>")
            continue
        update_body(slug, body)
        count += 1
    print(f"\nSeeded {count} posts.")

if __name__ == "__main__":
    main()

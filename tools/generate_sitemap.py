#!/usr/bin/env python3
"""Write apps/web/public/sitemap.xml from config/site-map.json.

Only pages on the public allowlist with public visibility and no login are listed, so the
sitemap can never advertise a portal or prototype. Run after changing the site map;
tests/test_public_sitemap.py fails when the file drifts.
Usage: python3 tools/generate_sitemap.py [--lastmod YYYY-MM-DD]
"""
import argparse
import datetime
import json
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = "https://www.nexifyai.de"
OUTPUT = ROOT / "apps/web/public/sitemap.xml"


def public_paths(site_map):
    allow = set(site_map["public_allowlist"])
    return sorted(page["path"] for page in site_map["pages"]
                  if page["id"] in allow and page["access"]["visibility"] == "public"
                  and not page["access"]["auth_required"])


def render(paths, lastmod):
    rows = "".join(f"  <url><loc>{escape(ORIGIN + path)}</loc><lastmod>{lastmod}</lastmod></url>\n" for path in paths)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + rows + "</urlset>\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--lastmod", default=datetime.date.today().isoformat())
    args = parser.parse_args()
    datetime.date.fromisoformat(args.lastmod)
    site_map = json.loads((ROOT / "config/site-map.json").read_text(encoding="utf-8"))
    paths = public_paths(site_map)
    OUTPUT.write_text(render(paths, args.lastmod), encoding="utf-8")
    print(json.dumps({"urls": len(paths), "output": str(OUTPUT.relative_to(ROOT))}))


if __name__ == "__main__":
    main()

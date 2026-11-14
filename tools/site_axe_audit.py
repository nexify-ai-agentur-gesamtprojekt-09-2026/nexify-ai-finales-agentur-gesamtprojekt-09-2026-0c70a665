#!/usr/bin/env python3
"""axe-core-Prüfung (WCAG 2.2 AA) aller Sitemap-Seiten einer laufenden Instanz.

axe-core ist bewusst keine Projektabhängigkeit; der Pfad zu `axe.min.js` kommt aus der Umgebung:
    npm install axe-core@4.10.2 --prefix <verzeichnis außerhalb des Repos>
    AXE_JS=<verzeichnis>/node_modules/axe-core/axe.min.js python3 tools/site_axe_audit.py \
        --base https://<instanz> --out evidence/site-audit-2026-11-12/axe-main.json

Je Seite und Viewport (Desktop 1440 px, Mobil 390 px) werden Verstöße mit Regel, Auswirkung und Elementanzahl erfasst.
"Unvollständig" (needs review) wird getrennt gezählt und nicht als Verstoß gewertet.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]
VIEWPORTS = {"desktop": {"width": 1440, "height": 900}, "mobil": {"width": 390, "height": 844}}


def sitemap_paths(base: str) -> list[str]:
    xml = urllib.request.urlopen(base + "/sitemap.xml", timeout=30).read().decode()
    return [re.sub(r"^https://[^/]+", "", u) or "/" for u in re.findall(r"<loc>([^<]+)</loc>", xml) if "?lang=" not in u]


def main() -> int:
    from playwright.sync_api import sync_playwright

    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--chromium", default=os.environ.get("PLAYWRIGHT_CHROMIUM", ""))
    a = ap.parse_args()
    axe_path = os.environ.get("AXE_JS")
    if not axe_path or not Path(axe_path).is_file():
        print("AXE_JS zeigt nicht auf axe.min.js", file=sys.stderr)
        return 2
    axe = Path(axe_path).read_text(encoding="utf-8")
    base = a.base.rstrip("/")
    remote = not re.match(r"https?://(127\.0\.0\.1|localhost)", base)
    launch: dict = {"executable_path": a.chromium} if a.chromium else {}
    if remote and os.environ.get("HTTPS_PROXY"):
        launch["proxy"] = {"server": os.environ["HTTPS_PROXY"]}
        launch["args"] = ["--ignore-certificate-errors"]
    paths = sitemap_paths(base)[: a.limit or None]
    report = {"base": base, "axe": re.search(r"v(\d+\.\d+\.\d+)", axe[:400]).group(1) if re.search(r"v(\d+\.\d+\.\d+)", axe[:400]) else "?",
              "tags": TAGS, "gemessen_am": datetime.now(timezone.utc).isoformat(timespec="seconds"), "seiten": []}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(**launch)
        for path in paths:
            row = {"pfad": path, "viewports": {}}
            for name, size in VIEWPORTS.items():
                ctx = browser.new_context(ignore_https_errors=True, viewport=size)
                page = ctx.new_page()
                try:
                    page.goto(base + path, wait_until="load", timeout=60000)
                    page.wait_for_timeout(1500)
                    page.evaluate(axe)
                    res = page.evaluate("(tags) => axe.run(document, {runOnly: {type: 'tag', values: tags}, resultTypes: ['violations','incomplete']})", TAGS)
                    row["viewports"][name] = {
                        "verstoesse": [{"regel": v["id"], "auswirkung": v["impact"], "elemente": len(v["nodes"]), "hilfe": v["help"],
                                        "beispiel": v["nodes"][0]["target"][0] if v["nodes"] else ""} for v in res["violations"]],
                        "unvollstaendig": [{"regel": v["id"], "elemente": len(v["nodes"])} for v in res["incomplete"]]}
                except Exception as exc:  # Messfehler sichtbar machen
                    row["viewports"][name] = {"messfehler": f"{type(exc).__name__}: {str(exc)[:120]}"}
                ctx.close()
            report["seiten"].append(row)
            print("axe", path, flush=True)
        browser.close()
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print("geschrieben", a.out)
    return 0


if __name__ == "__main__":
    sys.exit(main())

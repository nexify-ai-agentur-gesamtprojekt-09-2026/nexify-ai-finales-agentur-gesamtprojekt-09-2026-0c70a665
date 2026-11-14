#!/usr/bin/env python3
"""Site-Audit-Register: misst jede Sitemap-Seite einer laufenden Instanz und schreibt Evidence + Register.

Nur Gemessenes wird eingetragen; was nicht gemessen wurde, steht als "nicht gemessen" im Register
(Lighthouse und axe-core sind hier nicht installiert, INP braucht echte Interaktion).

Je Seite und Viewport (Desktop 1440 px mit Pixeldichte 2, Mobil 390 px mit Pixeldichte 3):
  Dokument   Status, Titel, Beschreibung, Canonical, robots, hreflang im <head>, H1-Anzahl, <html lang>
  Bilder     leeres alt, Schärfe bei Retina (natürliche Breite gegen Darstellungsbreite x Pixeldichte),
             srcset vorhanden, loading/fetchpriority, Higgsfield-Inszenierung ohne Kennzeichnung
  Layout     horizontaler Überlauf
  Leistung   LCP, CLS (PerformanceObserver), Übertragungsgröße, Konsolenfehler, fehlgeschlagene Anfragen
  Sprache    Titel und H1 je Sprache gegen Deutsch (identisch = Übersetzung fehlt oder ungeprüft)

Aufruf:
    python3 tools/site_audit_register.py --base https://www.nexifyai.de --out evidence/site-audit-2026-11-09/www.nexifyai.de.json
Remote-Ziele laufen über den Agent-Proxy (HTTPS_PROXY), lokale direkt. Exit 0 auch bei Befunden: das Register berichtet, es gatet nicht.
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


VIEWPORTS = {"desktop": dict(viewport={"width": 1440, "height": 900}, device_scale_factor=2),
             "mobil": dict(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True)}
LOCALES = ["nl", "en", "fr"]

INIT_JS = """
window.__m = {lcp: 0, cls: 0};
new PerformanceObserver(l => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; })
  .observe({type: 'largest-contentful-paint', buffered: true});
new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; })
  .observe({type: 'layout-shift', buffered: true});
"""

PAGE_JS = r"""
() => {
  const q = s => [...document.querySelectorAll(s)];
  const dpr = devicePixelRatio;
  const imgs = q('img').map(i => {
    const r = i.getBoundingClientRect();
    const fig = i.closest('figure');
    return {
      src: i.currentSrc || i.src, alt: i.getAttribute('alt'), w: Math.round(r.width), h: Math.round(r.height),
      nw: (() => { const cur = i.currentSrc || i.src; const set = (i.getAttribute('srcset') || '').split(',').map(s => s.trim().split(/\s+/));
        const hit = set.find(([u]) => cur.endsWith(u)); const wd = hit && /(\d+)w/.exec(hit[1] || ''); return wd ? +wd[1] : i.naturalWidth; })(),
      loaded: i.complete && i.naturalWidth > 0, nh: i.naturalHeight, srcset: !!i.getAttribute('srcset'), loading: i.loading || '',
      fetchpriority: i.getAttribute('fetchpriority') || '', visible: r.width > 0 && r.height > 0,
      caption: fig && fig.querySelector('figcaption') ? fig.querySelector('figcaption').textContent.trim().slice(0, 80) : ''
    };
  });
  const head = {
    title: document.title,
    description: (document.querySelector('meta[name=description]') || {}).content || '',
    canonical: (document.querySelector('link[rel=canonical]') || {}).href || '',
    robots: (document.querySelector('meta[name=robots]') || {}).content || '',
    hreflang: q('link[rel=alternate][hreflang]').map(l => l.hreflang),
    lang: document.documentElement.lang, h1: q('h1').length, h1text: (document.querySelector('h1') || {}).textContent || '',
    jsonld: q('script[type="application/ld+json"]').length
  };
  return {head, imgs, dpr, overflow: document.documentElement.scrollWidth - innerWidth,
          lcp: window.__m ? window.__m.lcp : null, cls: window.__m ? window.__m.cls : null};
}
"""


def sitemap_urls(base: str) -> list[str]:
    xml = urllib.request.urlopen(base + "/sitemap.xml", timeout=30).read().decode()
    return [u for u in re.findall(r"<loc>([^<]+)</loc>", xml) if "?lang=" not in u]


def classify_images(images: list[dict], dpr: float) -> dict:
    visible = [i for i in images if i["visible"] and i["src"] and not i["src"].startswith("data:")]
    nicht_geladen = [i["src"].split("/")[-1] for i in visible if not i.get("loaded")]
    visible = [i for i in visible if i.get("loaded")]
    svg = lambda i: i["src"].split("?")[0].endswith(".svg")
    raster = [i for i in visible if not svg(i)]
    return {
        "bilder": len(visible),
        "nicht_geladen": nicht_geladen,
        "alt_leer": [i["src"].split("/")[-1] for i in visible if i["alt"] == ""],
        "alt_fehlt": [i["src"].split("/")[-1] for i in visible if i["alt"] is None],
        "unscharf_bei_retina": [{"datei": i["src"].split("/")[-1], "dargestellt": i["w"], "natuerlich": i["nw"], "noetig": round(i["w"] * dpr)}
                                for i in raster if i["w"] and i["nw"] < i["w"] * dpr * 0.85],
        "ohne_srcset": sorted({i["src"].split("/")[-1] for i in raster if not i["srcset"] and i["nw"] > 800}),
        "higgsfield_ohne_kennzeichnung": sorted({i["src"].split("/")[-1] for i in raster
                                                 if "higgsfield" in i["src"] and "inszenierung" not in ((i["alt"] or "") + i["caption"]).lower()}),
        "praesentatoren": sorted({i["src"].split("/")[-1] for i in raster if re.search(r"oracle|presenter|nex-", i["src"])}),
    }


def main() -> int:
    from playwright.sync_api import sync_playwright  # erst hier: Test und Renderer brauchen keinen Browser

    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--chromium", default=os.environ.get("PLAYWRIGHT_CHROMIUM", ""))
    a = ap.parse_args()
    base = a.base.rstrip("/")
    urls = sitemap_urls(base)[: a.limit or None]
    remote = not re.match(r"https?://(127\.0\.0\.1|localhost)", base)
    launch: dict = {"executable_path": a.chromium} if a.chromium else {}
    if remote and os.environ.get("HTTPS_PROXY"):
        launch["proxy"] = {"server": os.environ["HTTPS_PROXY"]}
        launch["args"] = ["--ignore-certificate-errors"]
    report = {"base": base, "gemessen_am": datetime.now(timezone.utc).isoformat(timespec="seconds"), "nicht_gemessen": ["Lighthouse", "axe-core", "INP"], "seiten": []}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(**launch)
        for url in urls:
            path = url.replace("https://www.nexifyai.de", "").replace(base, "") or "/"
            row = {"pfad": path, "viewports": {}, "sprachen": {}}
            for vname, opts in VIEWPORTS.items():
                ctx = browser.new_context(ignore_https_errors=True, **opts)
                ctx.add_init_script(INIT_JS)
                page = ctx.new_page()
                errors, failed, bytes_total = [], [], [0]
                page.on("console", lambda m: errors.append(m.text[:120]) if m.type == "error" and "Failed to load resource" not in m.text else None)
                page.on("response", lambda r: failed.append(f"{r.status} {r.url[-90:]}") if r.status >= 400 else None)
                page.on("requestfailed", lambda r: failed.append("abgebrochen/fehlgeschlagen " + r.url[-80:]))
                page.on("response", lambda r: bytes_total.__setitem__(0, bytes_total[0] + int((r.headers.get("content-length") or 0))))
                try:
                    resp = page.goto(base + path, wait_until="load", timeout=60000)
                    page.wait_for_timeout(1500)
                    for _ in range(14):
                        page.mouse.wheel(0, 700)
                        page.wait_for_timeout(250)
                    page.evaluate("window.scrollTo(0, 0)")
                    page.wait_for_timeout(900)
                    data = page.evaluate(PAGE_JS)
                    v = {"status": resp.status if resp else None, **data["head"], "ueberlauf_px": data["overflow"],
                         "lcp_ms": round(data["lcp"] or 0), "cls": round(data["cls"] or 0, 4), "uebertragen_kb": round(bytes_total[0] / 1024),
                         "konsolenfehler": errors[:5], "fehlgeschlagene_anfragen": failed[:5], "bilder": classify_images(data["imgs"], data["dpr"])}
                except Exception as exc:  # Messfehler sichtbar machen, nie als Erfolg werten
                    v = {"messfehler": f"{type(exc).__name__}: {str(exc)[:120]}"}
                row["viewports"][vname] = v
                ctx.close()
            # Sprachvergleich (nur Desktop, nur Titel/H1)
            de = row["viewports"]["desktop"]
            for loc in LOCALES:
                ctx = browser.new_context(ignore_https_errors=True, **VIEWPORTS["desktop"])
                page = ctx.new_page()
                try:
                    page.goto(f"{base}{path}?lang={loc}", wait_until="load", timeout=60000)
                    d = page.evaluate("() => ({title: document.title, h1: (document.querySelector('h1')||{}).textContent||'', lang: document.documentElement.lang})")
                    row["sprachen"][loc] = {**d, "titel_wie_de": d["title"] == de.get("title"), "h1_wie_de": d["h1"].strip() == (de.get("h1text") or "").strip()}
                except Exception as exc:
                    row["sprachen"][loc] = {"messfehler": f"{type(exc).__name__}"}
                ctx.close()
            report["seiten"].append(row)
            print("gemessen", path, flush=True)
        browser.close()
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print("geschrieben", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())

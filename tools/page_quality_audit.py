#!/usr/bin/env python3
"""Laufzeit-Qualitätsprüfung aller öffentlichen Seiten mit Playwright für Python.

Ergänzt `tools/ds-audit-cli.js` (statisch) um echte Browsermessungen gegen die Vorgaben aus
`config/design-rules.json`, `config/design-tokens.json`, `AGENTS.md` und der Gesamtbeschreibung 08.11.2026:

  DOC   Titel, Beschreibung, Canonical, hreflang, robots passend zur Indexierbarkeit, genau eine H1, <html lang>
  IMG   alt vorhanden, Bild geladen, keine Verzerrung (Seitenverhältnis), keine extreme Beschneidung
  LAY   kein horizontaler Überlauf, nichts ragt rechts über den Viewport, abgeschnittener Text
  A11Y  Bedienziele >= 44 px, Textkontrast >= 4,5 (große Schrift 3,0), sichtbarer Fokus, Reduced-Motion
  TOK   Reinweiß-Text, grelles CI-Lime außerhalb des Logo-X, Schriften außerhalb Plus Jakarta Sans / Inter / Geist
  NET   Konsolenfehler, fehlgeschlagene Anfragen, tote interne Links

Aufruf (Dev-Server muss laufen, z. B. `pnpm --filter @nexify/web dev`):
    python3 tools/page_quality_audit.py --base http://127.0.0.1:3004 --out .local/page-quality.json

Installation (lokal, nicht Teil der gepinnten CI-Abhängigkeiten): `pip install playwright`. Der Browser wird mit
`--chromium` (Pfad) oder `PLAYWRIGHT_CHROMIUM` übergeben; ohne Angabe nutzt Playwright seinen eigenen Browser.
Exit-Code 1, sobald ein Befund der Stufe FEHLER auftritt.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

import io

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
VIEWPORTS = {"desktop": (1440, 900), "tablet": (820, 1100), "mobil": (390, 844)}
ALLOWED_FONTS = {"plus jakarta sans", "inter", "geist", "geist mono", "segoe ui", "system-ui", "ui-monospace",
                 "courier new", "helvetica", "arial", "sans-serif", "monospace", "-apple-system"}
BRIGHT_LIME = "rgb(192, 238, 56)"

PAGE_JS = r"""
() => {
  const q = s => [...document.querySelectorAll(s)];
  const vis = e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e);
    if (!(r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none' && c.opacity !== '0')) return false;
    // geschlossene <details> und content-visibility:hidden bleiben gemessen, sind aber weder sichtbar noch bedienbar
    return typeof e.checkVisibility === 'function' ? e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true }) : true; };
  const inScroller = e => { for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) { const c = getComputedStyle(n);
    if (['auto', 'scroll', 'hidden', 'clip'].includes(c.overflowX) && n.getBoundingClientRect().right <= innerWidth + 1) return true; } return false; };
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); };
  const backdrop = e => { // erste deckende Hintergrundfarbe aufwärts; Bild/Verlauf => unbestimmt
    for (let n = e; n; n = n.parentElement) { const c = getComputedStyle(n);
      if (c.backgroundImage !== 'none') return { unknown: true };
      const p = parse(c.backgroundColor); if (p && p.a >= .95) return { rgb: p.rgb }; }
    return { rgb: [17, 18, 18] }; };
  const label = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') +
    (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '');
  const meta = (n, a = 'name') => (document.querySelector(`meta[${a}="${n}"]`) || {}).content || '';
  const out = { doc: {}, img: [], lay: {}, a11y: { small: [], contrast: [] }, tok: { white: [], lime: [], fonts: {} } };
  const d = out.doc;
  d.title = document.title; d.description = meta('description'); d.robots = meta('robots');
  d.canonical = (document.querySelector('link[rel=canonical]') || {}).href || '';
  d.lang = document.documentElement.lang; d.h1 = q('h1').length; d.h1Text = (q('h1')[0] || {}).innerText || '';
  d.hreflang = q('link[rel=alternate][hreflang]').map(l => l.hreflang);
  d.jsonld = q('script[type="application/ld+json"]').length; d.ogTitle = meta('og:title', 'property');
  d.mainCount = q('main').length; d.skipLink = !!q('a.skip-link, a[href="#page-content"]').length;
  for (const i of q('img')) { if (!vis(i)) continue;
    const r = i.getBoundingClientRect(), c = getComputedStyle(i);
    const item = { src: (i.currentSrc || i.src).slice(-60), alt: i.getAttribute('alt'), loaded: i.complete && i.naturalWidth > 0, fit: c.objectFit };
    if (item.loaded && r.height > 0) { const nat = i.naturalWidth / i.naturalHeight, box = r.width / r.height;
      item.distort = (c.objectFit === 'fill' || c.objectFit === 'none') ? Math.abs(nat - box) / nat : 0;
      item.crop = c.objectFit === 'cover' ? 1 - Math.min(nat / box, box / nat) : 0; }
    out.img.push(item); }
  const root = document.documentElement;
  out.lay.overflow = root.scrollWidth - root.clientWidth;
  out.lay.beyond = q('main *, header *, footer *').filter(e => vis(e) && e.getBoundingClientRect().right > innerWidth + 1 &&
    !e.closest('[aria-hidden=true], .visually-hidden') && !inScroller(e)).slice(0, 5).map(label);
  out.lay.clipped = q('main h1, main h2, main h3, main p, main a, main button, main li').filter(e => vis(e) &&
    e.scrollWidth > e.clientWidth + 2 && ['hidden', 'clip'].includes(getComputedStyle(e).overflowX)).slice(0, 5).map(label);
  // Text, der buchstabenweise umbricht (Spalte zu schmal): Zeilenzahl nahe der Zeichenzahl bei kleiner Breite
  out.lay.stacked = q('main *').filter(e => { const t = (e.innerText || '').trim(); if (t.length < 6 || !vis(e) || e.children.length > 2) return false;
    const r = e.getBoundingClientRect(), c = getComputedStyle(e), lh = parseFloat(c.lineHeight) || parseFloat(c.fontSize) * 1.3;
    return r.width < 80 && r.height / lh >= t.length * 0.6; }).slice(0, 4).map(e => label(e) + ' „' + e.innerText.trim().slice(0, 24) + '“');
  const small = new Map();
  for (const e of q('a[href], button, select, input:not([type=hidden]), textarea, summary, [role=button]')) {
    if (!vis(e) || e.closest('.visually-hidden')) continue;
    // Kontrollkästchen/Radio: bedienbar ist das zugehörige Label (WCAG 2.5.8/2.5.5), nicht die 20-px-Box
    const lab = (e.tagName === 'INPUT' && /checkbox|radio/.test(e.type) && e.labels && e.labels[0]) || null;
    const r = (lab || e).getBoundingClientRect();
    if (r.height < 44 || r.width < 44) { const inline = e.tagName === 'A' && e.closest('p, li, label, dd') && getComputedStyle(e).display === 'inline';
      if (inline) continue; small.set(label(lab || e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height), (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 30)); } }
  out.a11y.small = [...small.entries()].slice(0, 40);
  const seen = new Set();
  for (const e of q('main *, header *, footer *')) { if (!vis(e)) continue;
    const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own) continue;
    const c = getComputedStyle(e); const fill = c.webkitTextFillColor || c.color;
    const key = label(e) + c.color + c.fontSize; if (seen.has(key)) continue; seen.add(key);
    const fg = parse(fill && fill !== c.color && fill.startsWith('rgb') ? fill : c.color);
    if (!fg || fg.a === 0 || c.color === 'rgba(0, 0, 0, 0)') { continue; }
    const bg = backdrop(e); if (bg.unknown) continue; const size = parseFloat(c.fontSize);
    const large = size >= 24 || (size >= 18.66 && parseInt(c.fontWeight) >= 700); const need = large ? 3 : 4.5;
    const cr = ratio(fg.rgb, bg.rgb); if (cr < need) out.a11y.contrast.push({ el: label(e), cr: +cr.toFixed(2), need, size, text: e.innerText.trim().slice(0, 30) });
    if (c.color === 'rgb(255, 255, 255)') out.tok.white.push(label(e));
    if (c.color === 'rgb(192, 238, 56)' && !e.closest('.brand-x')) out.tok.lime.push(label(e));
    const fam = c.fontFamily.split(',')[0].replace(/["']/g, '').trim().toLowerCase();
    out.tok.fonts[fam] = (out.tok.fonts[fam] || 0) + 1; }
  out.links = [...new Set(q('a[href]').map(a => a.getAttribute('href')).filter(h => h && h.startsWith('/') && !h.startsWith('//')))].slice(0, 400);
  return out;
}
"""

FOCUS_JS = r"""
(n) => { const out = []; const list = [...document.querySelectorAll('a[href], button, select, input, textarea, summary')]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }).slice(0, n);
  for (const e of list) { const before = getComputedStyle(e); const b = [before.outlineStyle, before.outlineWidth, before.boxShadow, before.borderColor].join('|');
    e.focus({ preventScroll: true }); const a = getComputedStyle(e); const after = [a.outlineStyle, a.outlineWidth, a.boxShadow, a.borderColor].join('|');
    if (!(e.matches(':focus-visible'))) continue; const ok = (a.outlineStyle !== 'none' && parseFloat(a.outlineWidth) >= 1) || a.boxShadow !== 'none' || b !== after;
    if (!ok) out.push(e.tagName.toLowerCase() + (typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '')); }
  return out; }
"""


CONTRAST_PREP_JS = r"""
() => {
  const parse = s => { const m = (s || '').match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; };
  const label = e => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '');
  let n = 0; const meta = {};
  for (const e of document.querySelectorAll('body *')) {
    if (!(typeof e.checkVisibility !== 'function' || e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true }))) continue;
    if (!([...e.childNodes].some(t => t.nodeType === 3 && t.textContent.trim()))) continue;
    if (e.closest('script, style, noscript, [aria-hidden=true], .visually-hidden, svg, .brand, .brand-word, .brand-x, .brand-ai')) continue;
    const c = getComputedStyle(e); const gradientText = (c.webkitTextFillColor === 'rgba(0, 0, 0, 0)' || c.color === 'rgba(0, 0, 0, 0)');
    const fg = parse(c.color); if (!fg && !gradientText) continue;
    e.setAttribute('data-qa-i', String(n)); const size = parseFloat(c.fontSize);
    meta[n] = { el: label(e), text: e.innerText.trim().slice(0, 36), fg: fg ? fg.rgb : null, a: fg ? fg.a : 1, size,
      large: size >= 24 || (size >= 18.66 && parseInt(c.fontWeight) >= 700), gradient: gradientText, fixed: !!(function (x) { for (; x; x = x.parentElement) if (['fixed', 'sticky'].includes(getComputedStyle(x).position)) return true; return false; })(e) };
    n++; }
  for (const e of document.querySelectorAll('body *')) { const pos = getComputedStyle(e).position; if (pos === 'fixed' || pos === 'sticky') e.setAttribute('data-qa-fr', '1'); }
  const st = document.createElement('style'); st.id = 'qa-hide-text';
  st.textContent = 'nextjs-portal,[data-nextjs-toast],[data-next-badge-root]{display:none!important}*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important;text-decoration-color:transparent!important}';
  document.head.appendChild(st);
  const hf = document.createElement('style'); hf.id = 'qa-hide-fixed'; hf.media = 'not all'; hf.textContent = '[data-qa-fr]{visibility:hidden!important}'; document.head.appendChild(hf);
  return meta;
}
"""

CONTRAST_CHUNK_JS = r"""
(done) => { const out = [];
  const textRect = e => { // Begrenzungsrahmen der eigenen Textknoten (nicht des ganzen Elements: Ecken, Icons, Ränder verfälschen sonst)
    let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
    for (const n of e.childNodes) { if (n.nodeType !== 3 || !n.textContent.trim()) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const q of rg.getClientRects()) { if (q.width < 1 || q.height < 1) continue; l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); } }
    return r > l ? { left: l, top: t, width: r - l, height: b - t, right: r, bottom: b } : null; };
  for (const e of document.querySelectorAll('[data-qa-i]')) { const i = e.getAttribute('data-qa-i'); if (done.includes(i)) continue;
    const r = textRect(e); if (!r) continue;
    if (r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth + 1) {
      // verdeckt (schwebender Chat-Knopf, Kopfzeile, Hinweisleiste)? dann in einer anderen Scrollposition messen
      const hit = document.elementFromPoint(Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1));
      if (hit && !(e.contains(hit) || hit.contains(e))) continue;
      // Opazität der Vorfahren jetzt bestimmen (Einblend-Animationen sind beim Vorbereiten noch nicht fertig)
      let op = 1; for (let a = e; a && a !== document.documentElement; a = a.parentElement) op *= parseFloat(getComputedStyle(a).opacity);
      out.push([i, r.left, r.top, r.width, r.height, op]); } }
  return out; }
"""

MOTION_JS = "() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity).length"



def _lum(rgb):
    import numpy as np
    c = rgb / 255.0
    c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]


def measure_contrast(page):
    """Misst den Textkontrast gegen den tatsächlich gerenderten Hintergrund (Text ausgeblendet, Pixel abgetastet).
    Liefert Befunde mit Kontrast < 4,5 (große Schrift < 3,0). Verlaufstext (background-clip:text) wird übersprungen."""
    import numpy as np
    from PIL import Image
    meta = page.evaluate(CONTRAST_PREP_JS)
    page.wait_for_timeout(150)
    height = page.evaluate("document.documentElement.scrollHeight")
    vh = page.evaluate("innerHeight")
    done, bad, checked = set(), [], 0
    y = 0
    while y < height:
        page.evaluate("y => scrollTo(0, y)", y)
        page.wait_for_timeout(450)
        rects = page.evaluate(CONTRAST_CHUNK_JS, list(done))
        # Zwei Aufnahmen je Position: (a) schwebende Elemente (Chat-Knopf, Kopfzeile) ausgeblendet für normalen Text,
        # (b) alles sichtbar für Text innerhalb schwebender Elemente selbst.
        for mode in ("flow", "floating"):
            group = [r for r in rects if bool(meta[r[0]]["fixed"]) == (mode == "floating")]
            if not group:
                continue
            page.evaluate("m => { document.getElementById('qa-hide-fixed').media = m }", "all" if mode == "flow" else "not all")
            png = page.screenshot(type="png")
            page.evaluate("document.getElementById('qa-hide-fixed').media = 'not all'")
            arr = np.asarray(Image.open(io.BytesIO(png)).convert("RGB"))
            arr_vis = None
            if any(meta[r[0]]["gradient"] for r in group):
                # Verlaufstext: Aufnahme mit sichtbarem Text, Glyphenpixel gegen den Hintergrund der Aufnahme ohne Text
                page.evaluate("m => { document.getElementById('qa-hide-fixed').media = m }", "all" if mode == "flow" else "not all")
                page.evaluate("document.getElementById('qa-hide-text').media = 'not all'")
                arr_vis = np.asarray(Image.open(io.BytesIO(page.screenshot(type="png"))).convert("RGB"))
                page.evaluate("document.getElementById('qa-hide-text').media = 'all'; document.getElementById('qa-hide-fixed').media = 'not all'")
            for i, left, top, w, h, op in group:
                m = meta[i]
                done.add(i)
                if m["gradient"] and arr_vis is not None:
                    x0, y0 = max(int(left), 0), max(int(top), 0)
                    x1, y1 = min(int(left + w) + 1, arr.shape[1]), min(int(top + h) + 1, arr.shape[0])
                    if x1 <= x0 or y1 <= y0:
                        continue
                    bgp, vis = arr[y0:y1, x0:x1].astype(float), arr_vis[y0:y1, x0:x1].astype(float)
                    glyph = np.abs(vis - bgp).sum(axis=2) > 330  # (nahezu) deckende Glyphenpixel; Kantenpixel mischen Hintergrund ein und verfälschen
                    if glyph.sum() < 12:
                        continue
                    checked += 1
                    gl, bl = _lum(vis[glyph]), _lum(bgp[glyph])
                    ratio = (np.maximum(gl, bl) + 0.05) / (np.minimum(gl, bl) + 0.05)
                    worst = float(np.percentile(ratio, 15))
                    need = 3.0 if m["large"] else 4.5
                    if worst < need:
                        bad.append({"el": m["el"] + " (Verlaufstext)", "text": m["text"], "cr": round(worst, 2), "need": need, "size": m["size"]})
                    continue
                if m["gradient"] or m["fg"] is None:
                    continue
                x0, y0 = max(int(left), 0), max(int(top), 0)
                x1, y1 = min(int(left + w) + 1, arr.shape[1]), min(int(top + h) + 1, arr.shape[0])
                if x1 <= x0 or y1 <= y0:
                    continue
                patch = arr[y0:y1, x0:x1].astype(float)
                bgl = _lum(patch)
                fg = np.array(m["fg"], dtype=float)
                a = m["a"] * op
                checked += 1
                eff = a * fg + (1 - a) * patch
                fl = _lum(eff)
                ratio = (np.maximum(fl, bgl) + 0.05) / (np.minimum(fl, bgl) + 0.05)
                worst = float(np.percentile(ratio, 3))
                need = 3.0 if m["large"] else 4.5
                if worst < need:
                    bad.append({"el": m["el"], "text": m["text"], "cr": round(worst, 2), "need": need, "size": m["size"]})
                    if os.environ.get("QA_PATCH_DIR"):
                        Image.fromarray(arr[max(y0 - 20, 0):y1 + 20, max(x0 - 20, 0):x1 + 20]).save(os.path.join(os.environ["QA_PATCH_DIR"], f"patch-{i}-{m['text'][:12].replace(' ', '_').replace('/', '_')}.png"))
                    if os.environ.get("QA_DEBUG"):
                        print("  DEBUG", m["el"], m["text"], "fg", m["fg"], "a", round(a, 2), "bg-mean", patch.reshape(-1, 3).mean(axis=0).round().tolist(), "worst", round(worst, 2))
        y += max(vh - 120, 200)
    page.evaluate("document.getElementById('qa-hide-text')?.remove(); document.getElementById('qa-hide-fixed')?.remove()")
    return bad, checked


def public_routes():
    data = json.loads((ROOT / "config/site-map.json").read_text(encoding="utf-8"))
    pages = data.get("pages", data)
    out = []
    for p in pages:
        acc = p.get("access") or p.get("visibility") or {}
        vis = acc.get("visibility") if isinstance(acc, dict) else acc
        if vis == "public":
            out.append((p["id"], p.get("path") or p.get("route")))
    return out


def link_status(base, href, cache):
    if href in cache:
        return cache[href]
    try:
        req = urllib.request.Request(base + href.split("#")[0], method="GET", headers={"User-Agent": "nx-quality-audit"})
        with urllib.request.urlopen(req, timeout=40) as r:
            cache[href] = r.status
    except urllib.error.HTTPError as e:
        cache[href] = e.code
    except Exception:
        cache[href] = 0
    return cache[href]


def judge(pid, vp, res, noindex_ids, lang=""):
    """Befunde als (Stufe, Gruppe, Text)."""
    f = []
    d = res["doc"]
    if vp == "desktop":
        if not d["title"]:
            f.append(("FEHLER", "DOC", "kein <title>"))
        elif len(d["title"]) > 70:
            f.append(("HINWEIS", "DOC", f"Titel {len(d['title'])} Zeichen (>70)"))
        if len(d["description"]) < 50:
            f.append(("FEHLER", "DOC", "meta description fehlt/zu kurz"))
        elif len(d["description"]) > 170:
            f.append(("HINWEIS", "DOC", f"Beschreibung {len(d['description'])} Zeichen (>170)"))
        if not d["canonical"].startswith("https://"):
            f.append(("FEHLER", "DOC", "Canonical fehlt oder nicht https"))
        expected = "de" if pid.startswith("tk-") else lang  # TEILEKLAR-Shop ist deutschsprachig (proxy.ts)
        if expected and d["lang"] != expected:
            f.append(("FEHLER", "DOC", f"<html lang> = {d['lang']!r}, erwartet {expected!r}"))
        if d["lang"] not in ("de", "nl", "fr", "en"):
            f.append(("FEHLER", "DOC", f"<html lang> = {d['lang']!r}"))
        # Die Website ist bis zur Domain-/Rechts-/Inhaltsfreigabe bewusst `noindex` (PROGRESS.md, Home-Metadaten 02.11.2026);
        # das ist ein Zustand, kein Fehler. Fehler wäre nur: nicht-öffentliche Seite indexierbar.
        want_noindex = pid in noindex_ids
        has_noindex = "noindex" in d["robots"]
        if want_noindex and not has_noindex:
            f.append(("FEHLER", "DOC", f"robots={d['robots']!r}: Seite ist ausdrücklich noindex vorgesehen"))
        if not has_noindex and not d["jsonld"]:
            f.append(("HINWEIS", "DOC", "keine strukturierten Daten (JSON-LD)"))
        if d["mainCount"] != 1:
            f.append(("FEHLER", "DOC", f"{d['mainCount']}× <main>"))
        if not d["skipLink"]:
            f.append(("FEHLER", "A11Y", "Sprunglink zum Inhalt fehlt"))
    if d["h1"] != 1:
        f.append(("FEHLER", "DOC", f"{d['h1']} H1"))
    for i in res["img"]:
        if i["alt"] is None:
            f.append(("FEHLER", "IMG", f"alt fehlt: {i['src']}"))
        if not i["loaded"]:
            f.append(("FEHLER", "IMG", f"nicht geladen: {i['src']}"))
        if i.get("distort", 0) > 0.03:
            f.append(("FEHLER", "IMG", f"verzerrt {i['distort']:.0%}: {i['src']}"))
        if i.get("crop", 0) > 0.45:
            f.append(("HINWEIS", "IMG", f"stark beschnitten {i['crop']:.0%}: {i['src']}"))
    if res["lay"]["overflow"] > 1:
        f.append(("FEHLER", "LAY", f"horizontaler Überlauf {res['lay']['overflow']}px"))
    for k, label in (("beyond", "ragt über den Viewport"), ("clipped", "Text abgeschnitten"), ("stacked", "Text bricht buchstabenweise um")):
        if res["lay"][k]:
            f.append(("FEHLER", "LAY", f"{label}: {', '.join(res['lay'][k])}"))
    if res["a11y"]["small"]:
        f.append(("WARNUNG", "A11Y", f"{len(res['a11y']['small'])} Bedienziele < 44 px, z. B. " +
                  "; ".join(f"{k} „{v}“" for k, v in res["a11y"]["small"][:3])))
    for c in res.get("pixel_contrast", [])[:8]:
        f.append(("FEHLER", "A11Y", f"Kontrast {c['cr']} < {c['need']} (Pixelmessung): {c['el']} „{c['text']}“"))
    if res["tok"]["white"]:
        f.append(("FEHLER", "TOK", f"Reinweiß-Text: {', '.join(sorted(set(res['tok']['white']))[:4])}"))
    if res["tok"]["lime"]:
        f.append(("FEHLER", "TOK", f"grelles CI-Lime außerhalb des Logo-X: {', '.join(sorted(set(res['tok']['lime']))[:4])}"))
    for fam, n in res["tok"]["fonts"].items():
        if fam not in ALLOWED_FONTS:
            f.append(("WARNUNG", "TOK", f"Schrift außerhalb der Vorgabe: {fam} ({n}×)"))
    if res.get("focus"):
        f.append(("FEHLER", "A11Y", f"Fokus nicht sichtbar: {', '.join(res['focus'][:4])}"))
    if res.get("motion"):
        f.append(("FEHLER", "A11Y", f"{res['motion']} Endlos-Animation(en) trotz prefers-reduced-motion"))
    return f


def noindex_ids():
    p = ROOT / "apps/web/lib/page-seo.ts"
    ids = set()
    for rel in (ROOT / "apps/web/app").rglob("page.tsx"):
        t = rel.read_text(encoding="utf-8")
        for m in re.finditer(r'routeMetadata\("([a-z0-9-]+)",\s*false\)', t):
            ids.add(m.group(1))
    return ids


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base", default="http://127.0.0.1:3004")
    ap.add_argument("--out", default=str(ROOT / ".local/page-quality.json"))
    ap.add_argument("--chromium", default=os.environ.get("PLAYWRIGHT_CHROMIUM", ""))
    ap.add_argument("--only", default="", help="Komma-getrennte Seiten-IDs")
    ap.add_argument("--viewports", default="desktop,mobil")
    ap.add_argument("--shard", default="", help="i/n: nur jede n-te Seite ab Position i (parallele Läufe)")
    ap.add_argument("--lang", default="", help="Sprache der Prüfung (nl, fr, en): hängt ?lang= an und prüft Überlauf/Ziele für längere Texte")
    ap.add_argument("--contrast", action="store_true", help="Pixelmessung des Textkontrasts (langsamer)")
    args = ap.parse_args()
    only = {s for s in args.only.split(",") if s}
    routes = [r for r in public_routes() if not only or r[0] in only]
    if args.shard:
        i, n = (int(x) for x in args.shard.split("/"))
        routes = [r for k, r in enumerate(routes) if k % n == i]
    no_index = noindex_ids()
    findings, link_cache, report, contrast_checked = [], {}, [], 0
    with sync_playwright() as pw:
        launch = {"executable_path": args.chromium} if args.chromium else {}
        browser = pw.chromium.launch(**launch)
        for vpname in args.viewports.split(","):
            w, h = VIEWPORTS[vpname]
            ctx = browser.new_context(viewport={"width": w, "height": h})
            for pid, path in routes:
                page = ctx.new_page()
                errs, failed = [], []
                page.on("console", lambda m, e=errs: m.type == "error" and e.append(m.text[:140]))
                page.on("pageerror", lambda x, e=errs: e.append("PE " + str(x)[:140]))
                page.on("response", lambda r, fl=failed: r.status >= 400 and fl.append(f"{r.status} {r.url[-70:]}"))
                try:
                    resp = page.goto(args.base + path + (("?lang=" + args.lang) if args.lang else ""), wait_until="networkidle", timeout=60000)
                    status = resp.status if resp else 0
                except Exception as exc:  # noqa: BLE001
                    status = 0
                    errs.append(str(exc)[:140])
                page.evaluate("async()=>{for(let y=0;y<document.body.scrollHeight;y+=500){scrollTo(0,y);await new Promise(r=>setTimeout(r,90))}scrollTo(0,0)}")
                page.wait_for_timeout(500)
                res = page.evaluate(PAGE_JS)
                res["focus"] = page.evaluate(FOCUS_JS, 25)
                if args.contrast:
                    res["pixel_contrast"], n_checked = measure_contrast(page)
                    contrast_checked += n_checked
                page.emulate_media(reduced_motion="reduce")
                page.wait_for_timeout(300)
                res["motion"] = page.evaluate(MOTION_JS)
                fl = judge(pid, vpname, res, no_index, args.lang)
                if status != 200:
                    fl.append(("FEHLER", "NET", f"HTTP {status}"))
                for e in errs:
                    if "/api/session" not in e and "status of 500" not in e:
                        fl.append(("WARNUNG", "NET", f"Konsole: {e}"))
                for e in failed:
                    if "/api/session" in e:
                        continue  # Rewrite auf ein lokal nicht gestartetes Gateway (OF-07)
                    if "/api/shop/" in e:
                        fl.append(("HINWEIS", "NET", "Shop-API lokal nicht erreichbar (Umgebung, Backend wird mit MongoDB separat betrieben)"))
                    else:
                        fl.append(("FEHLER", "NET", f"Anfrage fehlgeschlagen: {e}"))
                if vpname == "desktop":
                    dead = [(l, s) for l in res["links"] if (s := link_status(args.base, l, link_cache)) not in (200, 301, 302, 307, 308)]
                    for l, s in dead[:8]:
                        fl.append(("FEHLER", "NET", f"toter interner Link {l} → {s}"))
                findings += [{"viewport": vpname, "id": pid, "path": path, "level": a, "group": b, "text": c} for a, b, c in fl]
                print(f"  [{vpname}] {pid}: {len(fl)} Befunde", flush=True)
                report.append({"viewport": vpname, "id": pid, "path": path, "status": status, "n": len(fl)})
                page.close()
            ctx.close()
        browser.close()
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps({"base": args.base, "findings": findings, "pages": report}, ensure_ascii=False, indent=1), encoding="utf-8")
    by = Counter((f["level"], f["group"]) for f in findings)
    print(f"{len(routes)} Seiten × {args.viewports}: {len(findings)} Befunde" + (f"; {contrast_checked} Textelemente per Pixelmessung geprüft" if args.contrast else ""))
    for (lvl, grp), n in sorted(by.items()):
        print(f"  {lvl:8} {grp:5} {n}")
    agg = defaultdict(list)
    for f in findings:
        agg[(f["level"], f["group"], re.sub(r"[0-9]+(\.[0-9]+)?", "#", f["text"])[:110])].append(f["id"] + ("/m" if f["viewport"] == "mobil" else ""))
    for (lvl, grp, txt), ids in sorted(agg.items(), key=lambda kv: (kv[0][0] != "FEHLER", -len(kv[1]))):
        print(f"- [{lvl}/{grp}] {txt}  ← {len(ids)}× ({', '.join(sorted(set(ids))[:6])}{'…' if len(set(ids)) > 6 else ''})")
    return 1 if any(f["level"] == "FEHLER" for f in findings) else 0


if __name__ == "__main__":
    sys.exit(main())

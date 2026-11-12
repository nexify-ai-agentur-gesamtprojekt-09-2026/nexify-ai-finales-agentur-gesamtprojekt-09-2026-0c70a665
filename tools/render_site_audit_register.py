#!/usr/bin/env python3
"""Rendert docs/quality/site-audit-register.md aus den Messdateien von tools/site_audit_register.py.

Aufruf:
    python3 tools/render_site_audit_register.py --produktion evidence/site-audit-2026-11-09/www.nexifyai.de.json \
        --main evidence/site-audit-2026-11-09/main-instanz.json --out docs/quality/site-audit-register.md

Das Register behauptet nur, was gemessen wurde. SOLL-Werte stammen aus der Web-Vitals-Schwelle "gut" (LCP <= 2500 ms,
CLS <= 0,1), der Projektregel "genau eine H1, passendes lang, alt vorhanden, kein Überlauf" und der Freigabelage
(Indexierung ist bis zur Veröffentlichungsfreigabe bewusst aus).
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

LCP_MAX, CLS_MAX = 2500, 0.1


def cells(row: dict, base: str) -> dict:
    d, m = row["viewports"].get("desktop", {}), row["viewports"].get("mobil", {})
    if "messfehler" in d or "messfehler" in m:
        return {k: "Messfehler" for k in ("layout", "a11y", "funktion", "seo", "perf", "bilder", "sprachen")}
    layout = [f"{n}: Überlauf {v['ueberlauf_px']} px" for n, v in (("Desktop", d), ("Mobil", m)) if v.get("ueberlauf_px", 0) > 0]
    a11y = []
    if d.get("h1") != 1:
        a11y.append(f"{d.get('h1')} H1")
    if not d.get("lang"):
        a11y.append("lang fehlt")
    if d["bilder"]["alt_fehlt"]:
        a11y.append("alt fehlt: " + ", ".join(sorted(set(d["bilder"]["alt_fehlt"]))))
    alt_leer = sorted(set(d["bilder"]["alt_leer"]))
    funktion = []
    if d.get("status") != 200:
        funktion.append(f"HTTP {d.get('status')}")
    fehler = sorted({f for v in (d, m) for f in v.get("fehlgeschlagene_anfragen", []) if f[:3] in ("404", "500", "502", "503")})
    def label(raw: str) -> str:
        status, _, url = raw.partition(" ")
        path = url.split("nexifyai.de")[-1].split("vercel.app")[-1]
        if path.startswith("/api/session"):
            return f"{path} {status} (OF-07, bekannt: Orientierungsmodus)"
        if path.startswith("/api/shop"):
            return f"{path.split('?')[0]} {status} (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback)"
        return f"{path} {status}"
    funktion += [label(f) for f in fehler]
    funktion += [f"Konsole: {e[:50]}" for e in d.get("konsolenfehler", [])]
    seo = []
    own = base.rstrip("/") + row["pfad"].rstrip("/")
    canon = (d.get("canonical") or "").rstrip("/")
    if not canon:
        seo.append("Canonical fehlt")
    elif canon.split("?")[0] != own.replace(base, "https://www.nexifyai.de").rstrip("/") and canon != own:
        seo.append("Canonical abweichend")
    if not d.get("hreflang"):
        seo.append("hreflang fehlt")
    if "noindex" in (d.get("robots") or ""):
        seo.append("noindex (gewollt bis Freigabe)")
    if not d.get("description"):
        seo.append("Beschreibung fehlt")
    elif len(d["description"]) > 160:
        seo.append(f"Beschreibung {len(d['description'])} Z.")
    perf = []
    for n, v in (("D", d), ("M", m)):
        if v.get("lcp_ms", 0) > LCP_MAX:
            perf.append(f"{n} LCP {v['lcp_ms']} ms")
        if v.get("cls", 0) > CLS_MAX:
            perf.append(f"{n} CLS {v['cls']}")
    bild = []
    for n, v in (("D", d), ("M", m)):
        b = v["bilder"]
        if b["unscharf_bei_retina"]:
            bild.append(f"{n} unscharf: " + ", ".join(sorted({x['datei'] for x in b['unscharf_bei_retina']})))
    if d["bilder"]["higgsfield_ohne_kennzeichnung"]:
        bild.append("Higgsfield ohne Kennzeichnung: " + ", ".join(d["bilder"]["higgsfield_ohne_kennzeichnung"]))
    if d["bilder"]["ohne_srcset"]:
        bild.append("ohne srcset: " + ", ".join(d["bilder"]["ohne_srcset"]))
    if d["bilder"].get("nicht_geladen"):
        bild.append("nicht geladen: " + ", ".join(sorted(set(d["bilder"]["nicht_geladen"]))))
    gleich = [loc for loc, s in row["sprachen"].items() if s.get("titel_wie_de") or s.get("h1_wie_de")]
    nur_de = row["pfad"].startswith("/teileklar") and all(s.get("lang") == "de" for s in row["sprachen"].values())
    if nur_de:
        sprachen_hinweis = "nur Deutsch, lang=de korrekt gesetzt (kein Befund; sichtbarer Hinweis für NL/EN/FR offen, siehe unten)"
    elif row["pfad"] == "/unternehmen":
        sprachen_hinweis = "Firmenname, sprachneutral (kein Befund)"
    else:
        sprachen_hinweis = ""
    sprachen = sprachen_hinweis or (("Titel/H1 wie DE: " + ", ".join(gleich)) if gleich else "")
    sprachen_befund = bool(gleich) and not nur_de and row["pfad"] != "/unternehmen"
    return {"layout": "; ".join(layout), "a11y": "; ".join(a11y), "funktion": "; ".join(funktion), "seo": "; ".join(seo),
            "perf": "; ".join(perf), "bilder": "; ".join(bild), "sprachen": sprachen, "_sprachen_befund": sprachen_befund,
            "_alt_leer": alt_leer, "_perf": f"D {d.get('lcp_ms')}/{d.get('cls')}/{d.get('uebertragen_kb')} KB · M {m.get('lcp_ms')}/{m.get('cls')}/{m.get('uebertragen_kb')} KB"}


def table(report: dict) -> tuple[list[str], Counter, set]:
    base = report["base"]
    lines = ["| Seite | Layout | A11y | Funktion | SEO | Leistung (LCP ms/CLS/KB) | Bilder | Sprachen |", "|---|---|---|---|---|---|---|---|"]
    count, alts = Counter(), set()
    for row in report["seiten"]:
        c = cells(row, base)
        alts.update(c.get("_alt_leer", []))
        for k in ("layout", "a11y", "funktion", "seo", "perf", "bilder", "sprachen"):
            if not c[k] or (k == "seo" and c[k] == "noindex (gewollt bis Freigabe)"):
                continue
            if k == "funktion" and all(("OF-07" in part or "OF-08" in part) for part in c[k].split("; ")):
                continue
            if k == "sprachen" and not c["_sprachen_befund"]:
                continue
            count[k] += 1
        perf = c["_perf"] + (" ⚠ " + c["perf"] if c["perf"] else "")
        lines.append(f"| `{row['pfad']}` | {c['layout'] or 'ok'} | {c['a11y'] or 'ok'} | {c['funktion'] or 'ok'} | {c['seo'] or 'ok'} | {perf} | {c['bilder'] or 'ok'} | {c['sprachen'] or 'ok'} |")
    return lines, count, alts


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--produktion", required=True)
    ap.add_argument("--main", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    prod, main_ = (json.loads(Path(p).read_text(encoding="utf-8")) for p in (a.produktion, a.main))
    out = ["# Site-Audit-Register (09.11.2026)", "",
           "Je Seite IST gegen SOLL, nur aus Messungen (`tools/site_audit_register.py`, Desktop 1440 px mit Pixeldichte 2, Mobil 390 px mit Pixeldichte 3, Chromium über den Agent-Proxy). "
           "Rohdaten: `evidence/site-audit-2026-11-09/`. `ok` heißt: gemessen und im SOLL. Was nicht gemessen wurde, steht unten ausdrücklich.", "",
           "**Zwei Stände:** *Produktion* = `www.nexifyai.de` (Deployment `dpl_35Vacwi3rZhskCzYBWfamveJFQK1`, Commit `6c4f9ee`, vor Redesign) und *main* = Instanz `nexify-ai-finales-agentur-gesamtpro-one.vercel.app` (aktueller `main`).", "",
           "**SOLL-Quellen:** Web-Vitals-Schwelle „gut“ (LCP ≤ 2500 ms, CLS ≤ 0,1); genau eine H1, passendes `lang`, `alt` vorhanden, kein horizontaler Überlauf; Canonical = eigene URL, hreflang im `<head>`; Indexierung ist bis zur Veröffentlichungsfreigabe bewusst aus (kein Befund); Retina-Schärfe = Dateibreite ≥ 85 % von Darstellungsbreite × Pixeldichte; Higgsfield-Inszenierungen mit Kennzeichnung.", ""]
    for title, rep in (("main (aktueller Stand)", main_), ("Produktion (alter Stand)", prod)):
        lines, count, alts = table(rep)
        out += [f"## {title}", f"Gemessen {rep['gemessen_am']}, {len(rep['seiten'])} Seiten.", "",
                "Seiten mit Abweichung je Bereich: " + (", ".join(f"{k} {v}" for k, v in sorted(count.items())) or "keine"), "",
                "Leere `alt`-Texte (dekorativ, siehe Bildprüfung): " + (", ".join(sorted(alts)) or "keine"), ""] + lines + [""]
    out += ["## Behoben in diesem PR (lokal gemessen, noch nicht auf Produktion)", "",
            "| Befund | Behebung | Beleg |", "|---|---|---|",
            "| hreflang fehlte im `<head>` aller Seiten | `alternates.languages` aus `pageMetadata` ausgegeben, inklusive `x-default`, nur vollständig übersetzte Sprachen | lokaler Lauf: `x-default, de, nl, fr, en` auf `/`, `/leistungen`, `/leistungen/websites`; `tests/test_seo_metadata.py` |",
            "| Freisteller `hf-17-cutout` ohne Kennzeichnung | alt-Text beginnt mit „Markeninszenierung:“; Wächtertest für alle Higgsfield-Bilder | `tests/test_seo_metadata.py` |",
            "| Freisteller ohne `srcset` (nur 1920 px) | `srcset` 800/1280/1920 mit `sizes` auf den Seiten aus `PublicContent.tsx` | lokaler Lauf: `ohne_srcset` leer; Text-Spacing neu erhoben (129 Checks, 0 Befunde) |",
            "| Indexierung nur durch Codeänderung freizugeben | Schalter `NEXIFY_INDEXING=enabled` (Standard aus), private Bereiche bleiben `noindex` | lokaler Lauf mit und ohne Variable, siehe `docs/quality/seo-domain-vorschlag-2026-11-09.md` |", "",
            "## Offen, mit Grund", "",
            "| Punkt | Grund | Nächste Aktion |", "|---|---|---|",
            "| Freisteller auf der Startseite ohne `srcset` und Titelkennzeichnung wie oben | `HomeContent.tsx` ist per Hash an fünf Browser-Nachweisketten gebunden; Änderung braucht vollständige Neuerhebung | gemeinsam mit dem nächsten Frontend-Paket ändern und Nachweise neu erheben |",
            "| Oracle als alleiniges Symbol (`OracleCompanion`, 34 px, dekorativ, `aria-hidden`) neben dem Chat-Steuerelement | Vorgabe „Signet/Oracle-Präsentator nur als Paar NeX + Oracle“ ist im Repo nicht als Regel belegt | Design entscheidet: Paar zeigen oder Einzelsymbol erlauben |",
            "| Produktion (`www.nexifyai.de`) zeigt den alten Stand `6c4f9ee` | Vercel-Neuverbindung, OF-14 | Pascal |",
            "| Apex ohne Redirect, `.cloud` mit eigener indexierbarer Seite, Indexierung | Domain- und Veröffentlichungsfreigabe, OF-18 | Pascal |", ""]
    out += ["## Nicht gemessen (kein Beleg, kein „ok“)", "",
            "| Bereich | Stand | Nächste Aktion | Owner |", "|---|---|---|---|",
            "| Marke (Signet, Präsentatoren, Glas-/Champagner-Rand, Lichtreflex) | nur Bilddateien und Kennzeichnung gemessen, keine Sichtprüfung der Gestaltung | Sichtprüfung mit Screenshots Desktop/Mobil in separatem Schritt | Design |",
            "| Inhalt (Kundenfragen, Leerformeln) | nur Sprachvergleich Titel/H1 gemessen | redaktionelle Prüfung je Seite | Redaktion |",
            "| UX | nicht gemessen | Aufgabentests | UX |",
            "| A11y (axe-core), Lighthouse, INP | Werkzeuge hier nicht installiert, INP braucht Interaktion | in CI mit axe-core/Lighthouse ergänzen | QA |",
            "| Sprache, TEILEKLAR | Shop ist nur Deutsch; `?lang=nl/en/fr` liefert deutschen Inhalt mit `lang=de` (ehrlich markiert). Ein sichtbarer Hinweis „nur auf Deutsch verfügbar“ für NL/EN/FR-Besucher ist nicht belegt | Redaktion/Design entscheiden, ob und wie der Hinweis erscheint | Redaktion |",
            "| Datenschutz (externe Anfragen, Cookies) | nicht in dieser Messung erfasst; lokale Browser-Nachweise (0 externe Anfragen) liegen unter `evidence/` | externe Hosts je Seite in Messung aufnehmen | Datenschutz |", ""]
    Path(a.out).write_text("\n".join(out), encoding="utf-8")
    print("geschrieben", a.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

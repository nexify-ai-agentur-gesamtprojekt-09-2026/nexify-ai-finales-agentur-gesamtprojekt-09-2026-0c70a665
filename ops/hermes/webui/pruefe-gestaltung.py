#!/usr/bin/env python3
"""Prüft, dass die Gestaltungsdateien der Hermes-Oberfläche nur Werte aus
config/design-tokens.json verwenden und die Pflichtregeln enthalten.

Nur lesend und offline. Geprüft werden Farben (Hex und rgba), Pixelmaße,
Schriftfamilien, das Manifest der Erweiterung und das Web-App-Manifest sowie
Fokus-, Ziel- und Reduced-Motion-Regeln. Übereinstimmung der Dateien ist keine
Abnahme der laufenden Oberfläche.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[2]
SKIN = "nexify-graphite"
# Maße ohne Gestaltungsbedeutung: Haarlinie und Schriftachsen-Grenzen stehen nicht als px im Token-Satz.
PX_FREI = {"1px", "2px", "3px"}


def _werte(node, out):
    if isinstance(node, dict):
        for v in node.values():
            _werte(v, out)
    elif isinstance(node, list):
        for v in node:
            _werte(v, out)
    elif isinstance(node, str):
        out.append(node)


def token_satz():
    roh: list[str] = []
    _werte(json.loads((ROOT / "config/design-tokens.json").read_text(encoding="utf-8")), roh)
    text = " ".join(roh)
    hexe = {h.upper() for h in re.findall(r"#[0-9A-Fa-f]{6}\b", text)}
    rgba = {re.sub(r"\s+", "", r) for r in re.findall(r"rgba\([^)]*\)", text)}
    px = set(re.findall(r"\b\d+px\b", text)) | PX_FREI
    return hexe, rgba, px, text


def pruefe() -> list[str]:
    fehler: list[str] = []
    hexe, rgba, px, text = token_satz()
    css = (HIER / f"{SKIN}.css").read_text(encoding="utf-8")
    js = (HIER / f"{SKIN}.js").read_text(encoding="utf-8")
    ohne_kommentar = re.sub(r"/\*.*?\*/", "", css, flags=re.S)

    for name, inhalt in ((f"{SKIN}.css", ohne_kommentar), (f"{SKIN}.js", js)):
        for h in set(re.findall(r"#[0-9A-Fa-f]{6}\b", inhalt)):
            if h.upper() not in hexe:
                fehler.append(f"{name}: Farbe {h} steht nicht in config/design-tokens.json")
        for h in set(re.findall(r"#[0-9A-Fa-f]{3}\b(?![0-9A-Fa-f])", inhalt)):
            fehler.append(f"{name}: Kurzfarbe {h} ist nicht zulässig")
        for r in set(re.findall(r"rgba\([^)]*\)", inhalt)):
            if re.sub(r"\s+", "", r) not in rgba:
                fehler.append(f"{name}: {r} steht nicht in config/design-tokens.json")
    for p in set(re.findall(r"\b\d+px\b", ohne_kommentar)):
        if p not in px:
            fehler.append(f"{SKIN}.css: Maß {p} steht nicht in config/design-tokens.json")
    for familie in ("Inter,Helvetica,Arial,sans-serif", "'Geist Mono',ui-monospace,monospace",
                    "'Plus Jakarta Sans',Inter,Arial,sans-serif"):
        if familie not in ohne_kommentar or familie.replace(",", ", ") not in text:
            fehler.append(f"Schriftfamilie {familie} fehlt oder weicht vom Token ab")
    if "#C0EE38" not in ohne_kommentar:
        fehler.append("Signal-Lime #C0EE38 (das X) fehlt")
    if len(re.findall(r"#C0EE38", ohne_kommentar)) != 1:
        fehler.append("Signal-Lime #C0EE38 darf nur einmal gesetzt sein (kein Flächen- oder Textton)")
    for muss, was in ((":focus-visible", "sichtbarer Fokus"), ("prefers-reduced-motion:reduce", "Reduced-Motion"),
                      ("pointer:coarse", "Zielgröße für Fingerbedienung"), ("min-height:48px", "Zielgröße 48px")):
        if muss not in ohne_kommentar:
            fehler.append(f"Regel fehlt: {was} ({muss})")
    # Jede Regel gilt nur unter dem Skin (Rückweg: Skin abwählen). Ausnahmen: @font-face, @media, die Grundregel der Wortmarke.
    for selektor in re.findall(r"(?:^|\})\s*([^{}@]+)\{", ohne_kommentar):
        for teil in selektor.split(","):
            teil = teil.strip()
            if teil and f'[data-skin="{SKIN}"]' not in teil and teil != ".nx-wortmarke":
                fehler.append(f"Selektor außerhalb des Skins: {teil}")
    if re.search(r"https?://|@import|url\((?!\"/extensions/)", ohne_kommentar):
        fehler.append("CSS lädt etwas außerhalb von /extensions/")
    for verboten in ("fetch(", "XMLHttpRequest", "innerHTML", "eval(", "document.cookie", "/api/"):
        if verboten in js:
            fehler.append(f"{SKIN}.js enthält {verboten}")

    # Browser-Speicher: nur die zwei dokumentierten Schlüssel, kein sessionStorage, keine Cookies.
    erlaubt = {"'hermes-skin'", "VORGABE"}
    if "var VORGABE = 'nexify-skin-vorgabe';" not in js:
        fehler.append(f"{SKIN}.js: Merker 'nexify-skin-vorgabe' fehlt oder heißt anders")
    for schluessel in re.findall(r"speicher\((?:true|false),\s*([^,)]+)", js):
        if schluessel.strip() not in erlaubt:
            fehler.append(f"{SKIN}.js: Browser-Speicher mit nicht dokumentiertem Schlüssel {schluessel.strip()}")
    if len(re.findall(r"localStorage", re.sub(r"/\*.*?\*/", "", js, flags=re.S))) != 2:
        fehler.append(f"{SKIN}.js: localStorage darf nur in der einen Hilfsfunktion `speicher` stehen (Lesen und Schreiben)")
    for verboten in ("sessionStorage", "indexedDB"):
        if verboten in js:
            fehler.append(f"{SKIN}.js enthält {verboten}")

    ext = json.loads((HIER / "extensions.json").read_text(encoding="utf-8"))
    eintrag = ext["extensions"][0]
    for datei in eintrag["stylesheets"] + eintrag["scripts"]:
        if not (HIER / datei).is_file():
            fehler.append(f"extensions.json nennt fehlende Datei {datei}")
    man = json.loads((HIER / "app-manifest.json").read_text(encoding="utf-8"))
    for feld in ("background_color", "theme_color"):
        if man[feld].upper() not in hexe:
            fehler.append(f"app-manifest.json: {feld} steht nicht in config/design-tokens.json")
    for icon in man["icons"]:
        if not (ROOT / "apps/web/public" / Path(icon["src"]).name).is_file():
            fehler.append(f"app-manifest.json: Icon {icon['src']} hat keine Quelle in apps/web/public")
    return fehler


if __name__ == "__main__":
    probleme = pruefe()
    for zeile in probleme:
        print("FEHLER:", zeile)
    if probleme:
        sys.exit(1)
    print("Gestaltung der Hermes-Oberfläche: alle Werte aus config/design-tokens.json, Pflichtregeln vorhanden.")

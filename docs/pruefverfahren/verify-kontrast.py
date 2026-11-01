#!/usr/bin/env python3
"""TEILEKLAR Shop — Kontrast-Messprotokoll (WCAG 2.2, Erfolgskriterium 1.4.3/1.4.11).

Berechnet die Kontrastverhaeltnisse der tatsaechlich im Shop verwendeten
Token-Paare (Vordergrund auf Hintergrund) nach WCAG-Relativluminanz und
prueft gegen die Schwellen: Normaltext >=4.5:1, Grosstext/Nicht-Text-UI >=3:1.
Farbwerte werden direkt aus config/design-tokens.json gelesen.

Aufruf:  python3 docs/pruefverfahren/verify-kontrast.py
Exit 0 = alle Paare erfuellen ihre Schwelle.
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOKENS = json.loads((ROOT / "config/design-tokens.json").read_text(encoding="utf-8"))


def _flat(o, pre="", out=None):
    out = {} if out is None else out
    for k, v in o.items():
        if isinstance(v, dict) and "$value" in v and isinstance(v["$value"], str):
            out[pre + k] = v["$value"]
        elif isinstance(v, dict):
            _flat(v, pre + k + ".", out)
    return out


FLAT = _flat(TOKENS)


def hexval(path: str) -> str:
    v = FLAT[path]
    return v


def to_rgb(c: str):
    c = c.strip()
    m = re.match(r"#([0-9a-fA-F]{6})", c)
    if not m:
        raise ValueError(c)
    h = m.group(1)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rel_lum(rgb) -> float:
    def ch(v):
        s = v / 255
        return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(x) for x in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(fg: str, bg: str) -> float:
    l1, l2 = rel_lum(to_rgb(fg)), rel_lum(to_rgb(bg))
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


# (Beschreibung, FG-Token, BG-Token, Mindestschwelle, Kategorie)
PAIRS = [
    ("Primaertext auf Canvas",        "color.text.primaer",    "color.graphit.800", 4.5, "Normaltext"),
    ("Sekundaertext auf Canvas",      "color.text.sekundaer",  "color.graphit.800", 4.5, "Normaltext"),
    ("Tertiaertext (small) auf Canvas", "color.text.tertiaer", "color.graphit.800", 4.5, "Normaltext"),
    ("Gedaempft auf Canvas",          "color.text.gedaempft",  "color.graphit.800", 4.5, "Normaltext"),
    ("Primaertext auf Karte 850",     "color.text.primaer",    "color.graphit.850", 4.5, "Normaltext"),
    ("Sekundaertext auf Karte 850",   "color.text.sekundaer",  "color.graphit.850", 4.5, "Normaltext"),
    ("Lime Link/Recommend auf 900",   "color.marke.lime",      "color.graphit.900", 4.5, "Normaltext"),
    ("Cyan-Akzent auf Canvas",        "color.marke.cyan",      "color.graphit.800", 3.0, "Nicht-Text/Gross"),
    ("Badge erfolg auf 900",          "color.semantik.erfolg", "color.graphit.900", 4.5, "Normaltext"),
    ("Badge warnung auf 900",         "color.semantik.warnung","color.graphit.900", 4.5, "Normaltext"),
    ("Badge/Fehlertext auf 900",      "color.semantik.fehler", "color.graphit.900", 4.5, "Normaltext"),
    ("Button-Text auf Lime (CTA)",    "color.graphit.900",     "color.marke.lime",  4.5, "Normaltext"),
    ("Fokusrahmen Lime auf Canvas",   "color.marke.lime",      "color.graphit.800", 3.0, "Nicht-Text/UI"),
]

R = []
for desc, fg, bg, thr, cat in PAIRS:
    r = ratio(hexval(fg), hexval(bg))
    R.append((desc, cat, round(r, 2), thr, r >= thr, hexval(fg), hexval(bg)))


def main() -> int:
    bad = 0
    print(f"{'Paar':38} {'Kat':17} {'FG':8} {'BG':8} {'Ratio':>6} {'Soll':>5}  Erg.")
    for desc, cat, r, thr, ok, fg, bg in R:
        if not ok:
            bad += 1
        print(f"{desc:38.38} {cat:17.17} {fg:8} {bg:8} {r:>6} {thr:>5}  {'PASS' if ok else 'FAIL'}")
    print(f"\nErgebnis: {len(R) - bad} bestanden, {bad} fehlgeschlagen ({len(R)} Paare) "
          f"— WCAG 2.2 SC 1.4.3/1.4.11")
    return 0 if bad == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

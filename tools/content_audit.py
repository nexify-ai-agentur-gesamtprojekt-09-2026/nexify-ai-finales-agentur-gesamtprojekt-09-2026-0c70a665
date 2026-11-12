#!/usr/bin/env python3
"""Statische Inhaltsprüfung der öffentlichen Seiten (kein Browser): Umfang, Wiederholungen, Floskeln, Sprachparität.

Quelle: apps/site/.generated/public-site.json (nach `node apps/site/scripts/generate-public-data.mjs`).
Es werden nur Messwerte erhoben. Die Floskelliste ist eine Heuristik, kein Qualitätsurteil; Bewertung und Überarbeitung
bleiben redaktionell (Owner Content).

    python3 tools/content_audit.py --out evidence/site-audit-2026-11-12/content-audit.json
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCALES = ["de", "nl", "fr", "en"]
FILLER = {"de": ["maßgeschneidert", "ganzheitlich", "innovativ", "nahtlos", "einzigartig", "erstklassig", "modernste", "zukunftssicher",
                 "mehrwert", "digitale transformation", "state of the art", "rundum", "auf augenhöhe", "individuelle lösungen"]}


def words(text: str) -> int:
    return len(re.findall(r"\w+", text, flags=re.UNICODE))


def sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", text) if len(re.findall(r"\w+", s)) >= 8]


def page_text(page: dict, loc: str) -> str:
    return " ".join([page["localizedSummary"].get(loc, "")] + [s["body"].get(loc, "") for s in page["sections"]])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    data = json.loads((ROOT / "apps/site/.generated/public-site.json").read_text(encoding="utf-8"))
    pages = data["pages"]
    rows, seen = [], defaultdict(set)
    for p in pages:
        de = page_text(p, "de")
        for s in sentences(de):
            seen[s].add(p["path"])
        low = de.lower()
        row = {"pfad": p["path"], "kontext": p["site_context"], "abschnitte": len(p["sections"]), "woerter_de": words(de),
               "floskeln": {k: low.count(k) for k in FILLER["de"] if low.count(k)}, "sprachen": {}}
        for loc in LOCALES[1:]:
            t = page_text(p, loc)
            n = words(t)
            row["sprachen"][loc] = {"woerter": n, "verhaeltnis": round(n / row["woerter_de"], 2) if row["woerter_de"] else None,
                                    "wie_de": t.strip() == de.strip()}
        rows.append(row)
    repeated = sorted(((s, sorted(ps)) for s, ps in seen.items() if len(ps) >= 3), key=lambda x: -len(x[1]))
    report = {"quelle": "apps/site/.generated/public-site.json", "seiten": rows,
              "wiederholte_saetze_de": [{"satz": s, "seiten": len(ps), "beispiele": ps[:4]} for s, ps in repeated],
              "hinweis": "Floskelliste ist eine Heuristik; Umfang und Wiederholung sind Messwerte, kein Qualitätsurteil."}
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print("Seiten", len(rows), "wiederholte Saetze", len(repeated))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

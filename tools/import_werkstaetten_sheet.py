#!/usr/bin/env python3
"""Werkstätten Deutschland (Google-Tabelle, CSV-Export) → TEILEKLAR-Werkstattverzeichnis.

Quelle der Tabelle: OpenStreetMap, Lizenz ODbL-1.0. Jeder Eintrag behält Quelle,
Quell-Link, Lizenz und Datenstand, damit jede Landingpage ihre Herkunft nennt
(ODbL verlangt Namensnennung; die abgeleitete Datenbank bleibt unter ODbL).

Ausgabe hat dieselbe Form wie prototypen/assets/workshops.json
({"de-DE": {"total": n, "shops": [...]}}), damit der bestehende Import
(apps/shop-api/shop/workshops_api.py) sie ohne Sonderweg liest.

Datenpflege, nichts erfunden:
- Koordinaten: die Tabelle hat die Dezimalpunkte verloren („48.668.124“).
  Rekonstruktion über den Wertebereich Deutschlands; liegt ein Wert danach
  außerhalb von Breite 47,2–55,1 / Länge 5,8–15,1, entfällt die Koordinate.
- Telefon: nur die E.164-Spalte, nur wenn sie aus Ziffern besteht.
- E-Mail: wird NICHT übernommen. Kontaktadressen gehören nicht ins Repository
  und nicht auf öffentliche Seiten; für die Partneransprache bleibt die Tabelle
  die Quelle (bzw. das CRM). Mit --mit-kontakt landet sie im Feld contact_email,
  das die API nie öffentlich ausliefert – nur für eine nicht eingecheckte Datei.
- Segment-Spalte („Markenvertretung (Hinweis)“, „vermutet“) ist eine Vermutung
  und wird nicht übernommen.

Aufruf:  python3 tools/import_werkstaetten_sheet.py <werkstaetten.csv> [ziel.json] [--mit-kontakt]
"""
from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "prototypen" / "assets" / "workshops-osm-de.json"
EXISTING = ROOT / "prototypen" / "assets" / "workshops.json"
EMAIL = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
LAT_RANGE, LON_RANGE = (47.2, 55.1), (5.8, 15.1)


def _digits(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def latitude(raw: str) -> float | None:
    d = _digits(raw)
    if len(d) < 3:
        return None
    value = float(d[:2] + "." + d[2:])
    return round(value, 7) if LAT_RANGE[0] <= value <= LAT_RANGE[1] else None


def longitude(raw: str) -> float | None:
    d = _digits(raw)
    if len(d) < 3:
        return None
    head = 2 if 10 <= int(d[:2]) <= 15 else 1
    value = float(d[:head] + "." + d[head:])
    return round(value, 7) if LON_RANGE[0] <= value <= LON_RANGE[1] else None


def phone(e164: str) -> str | None:
    d = (e164 or "").strip()
    return "+" + d if d.isdigit() and 8 <= len(d) <= 15 else None


def email(raw: str) -> str | None:
    value = (raw or "").strip()
    value = re.sub(r"^(%5c%22|%22|\\\"|\")+", "", value, flags=re.I).strip('"').strip()
    return value.lower() if EMAIL.fullmatch(value) else None


def split_list(raw: str) -> list[str]:
    # Die Tabelle kürzt lange Listen mit „...“ ab; das abgeschnittene Wort ist keine Angabe.
    items = [x.strip() for x in (raw or "").split(",")]
    return [x for x in items if x and not x.endswith(("...", "…"))]


def key(name: str, zip_code: str) -> tuple[str, str]:
    return (re.sub(r"\W+", "", (name or "").casefold()), (zip_code or "").strip())


def convert(rows: list[dict], existing_keys: set[tuple[str, str]] = frozenset(), with_contact: bool = False) -> tuple[list[dict], dict]:
    shops, seen, stats = [], set(), {"rows": len(rows), "duplicate_of_directory": 0, "duplicate_id": 0,
                                       "without_coordinates": 0, "without_phone": 0, "email_in_sheet": 0}
    for row in rows:
        ident = (row.get("Werkstatt-ID") or row.get("#REF!") or "").strip()
        name = (row.get("Name") or "").strip()
        if not ident or not name:
            continue
        if ident in seen:
            stats["duplicate_id"] += 1
            continue
        if key(name, row.get("PLZ", "")) in existing_keys:
            stats["duplicate_of_directory"] += 1
            continue
        seen.add(ident)
        street = " ".join(x for x in ((row.get("Straße") or "").strip(), (row.get("Hausnr.") or "").strip()) if x)
        lat, lon = latitude(row.get("Breitengrad", "")), longitude(row.get("Längengrad", ""))
        shop = {
            "id": "OSM-DE-" + ident.removeprefix("osm-"),
            "name": name,
            "street": street,
            "zip": (row.get("PLZ") or "").strip(),
            "city": (row.get("Ort") or "").strip(),
            "region": (row.get("Bundesland") or "").strip(),
            "tel": phone(row.get("Telefon (E.164)", "")),
            "web": (row.get("Website") or "").strip() or None,
            "hours": (row.get("Öffnungszeiten") or "").strip(),
            "category": (row.get("Kategorie") or "").strip(),
            "services": split_list(row.get("Leistungen", "")),
            "brands": split_list(row.get("Marken", "")),
            "kind": "frei",
            "source": "OpenStreetMap",
            "source_url": (row.get("Quell-Link") or "").strip(),
            "license": (row.get("Lizenz") or "ODbL-1.0").strip(),
            "data_as_of": (row.get("Datenstand") or "").strip(),
        }
        if lat is not None and lon is not None:
            shop["lat"], shop["lon"] = lat, lon
        else:
            stats["without_coordinates"] += 1
        if not shop["tel"]:
            stats["without_phone"] += 1
        mail = email(row.get("E-Mail", ""))
        if mail:
            stats["email_in_sheet"] += 1
            if with_contact:
                shop["contact_email"] = mail
                shop["contact_email_status"] = (row.get("E-Mail-Status") or "").strip()
        shops.append({k: v for k, v in shop.items() if v not in (None, "", [])})
    stats["imported"] = len(shops)
    return shops, stats


def existing_directory_keys(path: Path = EXISTING) -> set[tuple[str, str]]:
    if not path.exists():
        return set()
    pack = json.loads(path.read_text(encoding="utf-8"))
    return {key(s.get("name", ""), s.get("zip", "")) for block in pack.values() for s in block.get("shops", [])}


def main(argv: list[str]) -> int:
    with_contact = "--mit-kontakt" in argv
    args = [a for a in argv if a != "--mit-kontakt"]
    if len(args) < 2:
        print(__doc__)
        return 2
    rows = list(csv.DictReader(Path(args[1]).open(encoding="utf-8")))
    shops, stats = convert(rows, existing_directory_keys(), with_contact)
    out = Path(args[2]) if len(args) > 2 else DEFAULT_OUT
    if with_contact and out.resolve().is_relative_to(ROOT.resolve()):
        # Kontaktadressen dürfen nie im Repository landen – auch nicht unter anderem Namen.
        print("Kontaktdaten nur außerhalb des Repositorys schreiben – bitte ein Ziel außerhalb von " + str(ROOT) + " angeben.")
        return 2
    out.write_text(json.dumps({"de-DE": {"total": len(shops), "shops": shops}}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(json.dumps(stats, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

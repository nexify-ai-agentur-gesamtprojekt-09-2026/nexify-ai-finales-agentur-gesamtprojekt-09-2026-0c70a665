#!/usr/bin/env python3
"""TEILEKLAR Shop — ausfuehrbarer Logik-Verifier (Pruefverfahren).

Spiegelt die in den Frontend-Komponenten implementierten Rechen- und
Entscheidungslogiken 1:1 nach und prueft sie gegen offizielle/anerkannte
Sollwerte (DIN 5008 Zahl-/Waehrungsformat, USt./Netto, EU-OSS, ETRTO-
Reifenlogik, EN 50342 Batterieklassen, KBA HSN/TSN-Fitment).

Deterministisch, offline, ohne Fremdabhaengigkeiten. Aufruf:
    python3 docs/pruefverfahren/verify-logik.py
Exit 0 = alle Pruefpunkte bestanden; Exit 1 = mindestens ein Fehlschlag.
"""
from __future__ import annotations
import math
import sys

RESULTS: list[tuple[str, bool, str]] = []


def check(pf_id: str, ist, soll, note: str = "") -> None:
    ok = ist == soll
    RESULTS.append((pf_id, ok, f"ist={ist!r} soll={soll!r} {note}".strip()))


# --- A) DIN 5008 Zahl-/Waehrungs-/Prozentformat (de-DE) --------------------
def din5008_eur(minor: int) -> str:
    """Betrag in Cent -> '1.234,56 €' (Komma-Dezimal, Punkt-Tausender, NNBSP)."""
    euro = minor / 100
    s = f"{euro:,.2f}"                      # 1,234.56 (en)
    s = s.replace(",", "§").replace(".", ",").replace("§", ".")
    return f"{s}\u00a0€"                      # geschuetztes Leerzeichen vor €


def din5008_percent(value: float, digits: int = 1) -> str:
    s = f"{value:.{digits}f}".replace(".", ",")
    return f"{s}\u00a0%"                      # NNBSP vor %


check("PF-A1", din5008_eur(4990), "49,90\u00a0€")
check("PF-A2", din5008_eur(123456), "1.234,56\u00a0€")
check("PF-A3", din5008_percent(19, 0), "19\u00a0%")
check("PF-A4", din5008_percent(0.38, 2), "0,38\u00a0%")


# --- D) USt./Netto (DE 19 %, NL 21 %) + EU-OSS/Reverse-Charge --------------
VAT = {"DE": 0.19, "NL": 0.21}


def net_minor(gross: int, rate: float = 0.19) -> int:
    return round(gross / (1 + rate))


def vat_part_minor(gross: int, rate: float = 0.19) -> int:
    return gross - round(gross / (1 + rate))


def tax_rule(land: str, ust_id_valid: bool) -> str:
    """Abgeleitet aus prototypen/lib/rechenkern.js + RL 2006/112/EG."""
    if land == "DE" and ust_id_valid:
        return "reverse_charge_0"            # B2B innergemeinschaftlich
    if land == "DE":
        return "oss_klaerung"                # B2C/ohne USt-ID: OSS, nicht automatisch
    if land == "NL":
        return "btw_21"
    return "unbekannt"


check("PF-D1", net_minor(4990, 0.19), 4193, "Netto Werkstatt-Konto 41,93 €")
check("PF-D2", vat_part_minor(7239, 0.19), 1156, "USt.-Anteil aus 72,39 € brutto")
check("PF-D3", round(44900 * VAT["NL"]), 9429, "449,00 € netto NL -> 94,29 € BTW")
check("PF-D4", tax_rule("DE", True), "reverse_charge_0")
check("PF-D5", tax_rule("DE", False), "oss_klaerung")
check("PF-D6", tax_rule("NL", False), "btw_21")


# --- F) Reifenrechner (ISO-Reifenkennung / ETRTO) --------------------------
def diameter_mm(width: float, ratio: float, rim_inch: float) -> float:
    return rim_inch * 25.4 + 2 * (width * ratio / 100)


def circumference_mm(width: float, ratio: float, rim_inch: float) -> float:
    return math.pi * diameter_mm(width, ratio, rim_inch)


def rim_width_range_inch(width: float) -> tuple[float, float]:
    half = lambda n: round(n * 2) / 2
    return half(width * 0.7 / 25.4), half(width * 0.9 / 25.4)


def deviation_pct(cur: tuple, alt: tuple) -> float:
    da, db = diameter_mm(*cur), diameter_mm(*alt)
    return (db - da) / da * 100


# ETRTO Lastindex-Auszug (kg)
LOAD_INDEX = {91: 615, 94: 670, 98: 750, 100: 800}

check("PF-F1", round(diameter_mm(205, 55, 16), 1), 631.9, "205/55 R16 Durchmesser")
check("PF-F2", round(diameter_mm(225, 45, 17), 1), 634.3, "225/45 R17 Durchmesser")
check("PF-F3", rim_width_range_inch(225), (6.0, 8.0), "zul. Felgenbreite 225 mm")
check("PF-F4", round(deviation_pct((205, 55, 16), (225, 45, 17)), 2), 0.38,
      "Abweichung innerhalb ±3 %")
check("PF-F5", abs(deviation_pct((205, 55, 16), (225, 45, 17))) <= 3, True)
check("PF-F6", LOAD_INDEX[94], 670, "LI 94 -> 670 kg")


# --- G) Batterie (EN 50342 Typklassen; Pollage 0/1) ------------------------
def battery_type(start_stop: str, heavy_equipment: str) -> str:
    if start_stop == "unknown":
        return ""                            # Typ offen -> Klaerung ueber Fzg-Daten
    if start_stop == "yes":
        return "AGM" if heavy_equipment == "yes" else "EFB"
    return "SLI"                             # konventionelle Nassbatterie


check("PF-G1", battery_type("yes", "yes"), "AGM")
check("PF-G2", battery_type("yes", "no"), "EFB")
check("PF-G3", battery_type("no", "no"), "SLI")
check("PF-G4", battery_type("unknown", "no"), "")


# --- E) Fitment-Logik (KBA HSN/TSN; "nie passt ohne Treffer") --------------
def fit_of(fits_hsn: list[str], nofit_hsn: list[str], hsn: str | None) -> str:
    if not hsn:
        return "maybe"                       # ohne Fahrzeug nie "passt"
    if hsn in fits_hsn:
        return "fits"
    if hsn in nofit_hsn:
        return "nofit"
    return "maybe"


check("PF-E1", fit_of(["0603"], ["1313"], None), "maybe", "kein Fahrzeug -> pruefen")
check("PF-E2", fit_of(["0603"], ["1313"], "0603"), "fits")
check("PF-E3", fit_of(["0603"], ["1313"], "1313"), "nofit")
check("PF-E4", fit_of(["0603"], ["1313"], "0588"), "maybe", "unbekannt -> pruefen")


# --- Ausgabe ---------------------------------------------------------------
def main() -> int:
    passed = sum(1 for _, ok, _ in RESULTS if ok)
    failed = len(RESULTS) - passed
    for pf, ok, detail in RESULTS:
        print(f"[{'PASS' if ok else 'FAIL'}] {pf}: {detail}")
    print(f"\nErgebnis: {passed} bestanden, {failed} fehlgeschlagen "
          f"({len(RESULTS)} Pruefpunkte)")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

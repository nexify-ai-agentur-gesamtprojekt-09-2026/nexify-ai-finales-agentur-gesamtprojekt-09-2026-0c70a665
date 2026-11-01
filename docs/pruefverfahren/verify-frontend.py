#!/usr/bin/env python3
"""TEILEKLAR Shop — Frontend/UI/UX/Design/Technik-Verifier (Pruefverfahren).

Statische, deterministische Pruefung der neuen Frontend-Artefakte gegen
Design-System- und Technik-Regeln, die anerkannten Normen zugeordnet sind:
ISO 9241-110/112/125 (Interaktion/Darstellung), ISO 9241-210/11 (HCD/Usability),
DIN 1450 (Leserlichkeit), WCAG 2.2 / EN 301 549 (Barrierefreiheit),
ISO/IEC 25010 (Produktqualitaet: Funktionalitaet, Wartbarkeit, Kompatibilitaet).

Aufruf:  python3 docs/pruefverfahren/verify-frontend.py
Exit 0 = bestanden, 1 = Fehlschlag.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COMP = ROOT / "apps/web/components"
CSS = COMP / "TeileklarTools.css"
TSX = [
    COMP / "ShopOverview.tsx",
    COMP / "ShopCheckout.tsx",
    COMP / "ShopWorkshopFinder.tsx",
    COMP / "TyreCalculator.tsx",
    COMP / "BatteryAdvisor.tsx",
]
DATA = COMP / "teileklar-shop-data.ts"

R: list[tuple[str, bool, str]] = []


def check(pid: str, ok: bool, note: str = "") -> None:
    R.append((pid, bool(ok), note))


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


all_tsx = {p.name: read(p) for p in TSX}
css = read(CSS)
data = read(DATA)
blob = "\n".join(all_tsx.values())

# --- J) Design & Layout: Design-Tokens statt Hardcodes ---------------------
# Keine rohen 6-stelligen Hex-Farben in Komponenten/CSS (nur Tokens via var()).
hex_tsx = re.findall(r"#[0-9a-fA-F]{6}\b", blob)
hex_css = re.findall(r"#[0-9a-fA-F]{6}\b", css)
check("UI-J1", not hex_tsx and not hex_css,
      f"rohe Hex-Farben tsx={hex_tsx} css={hex_css} (Soll: keine)")
# CSS nutzt Farb-Tokens (var(--color-...)) und Abstands-Tokens (var(--space-...)).
check("UI-J2", "var(--color-" in css and "var(--space-" in css,
      "Farb-/Abstands-Tokens verwendet")
# Radius-/Font-Tokens statt Magic Numbers.
check("UI-J3", "var(--radius-" in css and "var(--font-" in css,
      "Radius-/Font-Tokens verwendet")
# Responsive: Grid mit auto-fit/minmax + min(100%,...) => Reflow ohne Overflow.
check("UI-J4", "auto-fit" in css and "minmax(min(100%" in css,
      "fluide Grids (auto-fit/minmax/min)")
# Gradient-Policy: keine verbotenen Vollflaechen-/blau-lila-Verlaeufe.
check("UI-J5", "linear-gradient" not in css.lower(),
      "keine unzulaessigen Verlaeufe in Komponenten-CSS")
# DIN 1450 Leserlichkeit: Ueberlauf langer Tokens (OE/EAN) umbrechbar.
check("UI-J6", "overflow-wrap:anywhere" in css,
      "overflow-wrap fuer lange Kennungen (Leserlichkeit)")

# --- B/EN) Barrierefreiheit in der Umsetzung -------------------------------
co = all_tsx["ShopCheckout.tsx"]
check("UI-B1", 'aria-current={index === step ? "step" : undefined}' in co,
      "Schritt-Markierung aria-current=step")
check("UI-B2", "<fieldset" in co and "<legend" in co,
      "Radio-Gruppen in fieldset/legend")
check("UI-B3", co.count("autoComplete=") >= 5,
      f"autocomplete an Adressfeldern ({co.count('autoComplete=')})")
check("UI-B4", 'aria-live="polite"' in co and 'role="alert"' in co,
      "Live-Region + Fehler-Alert")
check("UI-B5", 'role="status"' in co,
      "Erfolg als Statusmeldung (WCAG 4.1.3)")
check("UI-B6", 'aria-label' in all_tsx["ShopOverview.tsx"],
      "Gruppen/Steuerelemente beschriftet")

# --- UX) Interaktionsprinzipien (ISO 9241-110) -----------------------------
so = all_tsx["ShopOverview.tsx"]
# Selbstbeschreibungsfaehigkeit: Zustandsanzeige Fahrzeug/Passung sichtbar.
check("UI-X1", "shop-vehicle-status" in so and "aria-live" in so,
      "Zustands-Feedback (Selbstbeschreibung)")
# Fehlertoleranz: 'passt nicht' deaktiviert Kauf + nennt Grund.
check("UI-X2", 'st === "nofit"' in so and "noFitReason" in data,
      "Fehlertoleranz: Sperre + Begruendung")
# Steuerbarkeit: Mengen-Stepper +/- und Entfernen vorhanden.
check("UI-X3", "QtyStepper" in so and "shop-cart-remove-" in so,
      "Steuerbarkeit (Menge/Entfernen)")
# Erwartungskonformitaet: persistente Garage (localStorage) + SSR-Guard.
check("UI-X4", 'localStorage' in so and 'try {' in so and '"use client"' in so,
      "persistenter Kontext + robuster Guard")

# --- K) Technik / ISO/IEC 25010 -------------------------------------------
# Kompatibilitaet/Internationalisierung: 4 Sprachen je copy-Objekt.
def has_locales(src: str) -> bool:
    return all(re.search(rf"\b{loc}:\s*\{{", src) for loc in ("de", "nl", "fr", "en"))


check("UI-K1", all(has_locales(all_tsx[n]) for n in all_tsx),
      "i18n de/nl/fr/en in allen Komponenten")
# Wartbarkeit: Datenmodell von Praesentation getrennt (shared data module).
check("UI-K2", "export const PRODUCTS" in data and "export function fitOf" in data,
      "Trennung Daten/Logik von UI")
# Funktionale Eignung: Kernfluss-Testhooks vorhanden (stabile Testbarkeit).
need = ["shop-overview", "shop-checkout", "shop-checkout-place",
        "shop-workshop-finder", "tyre-calculator", "battery-advisor"]
missing = [t for t in need if t not in blob]
check("UI-K3", not missing, f"fehlende Test-IDs: {missing}")
# Zuverlaessigkeit: API-Abfragen fail-closed (graceful, kein Throw).
wf = all_tsx["ShopWorkshopFinder.tsx"]
check("UI-K4", "catch" in wf and 'setState("error")' in wf,
      "Werkstattsuche fail-closed (Fehlerzustand)")
# Sicherheit/Governance: Muster-Kennzeichnung, kein Live-Zahlungsaufruf.
check("UI-K5", "musterBanner" in co and "revolut" not in co.lower().replace("revolut (muster)", "").replace("revolut (demo)", "").replace("revolut (démo)", ""),
      "Muster-Kennzeichnung, keine Live-Zahlung")
# Keine AI-Tells / Emojis als UI-Icons (professionelle Darstellung).
emoji = re.findall(r"[\U0001F000-\U0001FAFF\u2600-\u27BF]", blob)
emoji = [e for e in emoji if e not in ("→", "−", "✓")]  # erlaubte Textzeichen
check("UI-K6", not emoji, f"keine Emoji-Icons ({emoji[:5]})")


def main() -> int:
    ok = sum(1 for _, b, _ in R if b)
    bad = len(R) - ok
    for pid, b, note in R:
        print(f"[{'PASS' if b else 'FAIL'}] {pid}: {note}")
    print(f"\nErgebnis: {ok} bestanden, {bad} fehlgeschlagen ({len(R)} Pruefpunkte)")
    return 0 if bad == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

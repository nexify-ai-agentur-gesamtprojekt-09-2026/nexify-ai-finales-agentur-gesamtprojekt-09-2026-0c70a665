#!/usr/bin/env python3
"""Builds docs/content/seiten-logik-audit.md from prototype extraction plus the reviewed status rules below."""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from prototype_audit_extract import extract  # noqa: E402

IMPL, WRONG, MISS, OOP = "implemented", "wrong", "missing", "out-of-phase"

FILE_DEFAULT = {
    "TEILEKLAR Shop.dc.html": (IMPL, "1", "Shop-Routen /teileklar/*"),
    "NeXify Shop.dc.html": (IMPL, "1", "Shop-Muster, umgesetzt als TEILEKLAR-Kasse"),
    "Werkstatt-Partnerseite.dc.html": (IMPL, "1", "/teileklar/werkstatt, Detailansicht je Betrieb"),
    "Fitment-Checker.dc.html": (IMPL, "1b", "FitmentChecklist auf /teileklar/fahrzeug-und-passung"),
    "Reifenrechner.dc.html": (IMPL, "1b", "TyreCalculator auf /teileklar/fahrzeug-und-passung"),
    "Batterie-Berater.dc.html": (MISS, "2", "Platzhalter auf /teileklar/fahrzeug-und-passung; Kapazitätstabellen brauchen technische Quellenprüfung"),
    "Anmeldung.dc.html": (IMPL, "1", "/anmelden, /registrieren (eigene Konten, D-007)"),
    "Partner-werden.dc.html": (IMPL, "1b", "Partneranfrage über /api/requests (kind=partner)"),
    "NeXifyAI Cloud v12.dc.html": (MISS, "1b", "Öffentliche Agenturseiten; Texte im Gesamt-Textkonzept"),
    "NeXify AI one.dc.html": (OOP, "5", "Produktfunktionen one/one+; Seitentext Phase 1b"),
    "NeXify API.dc.html": (OOP, "5", "API-Konsole/Prepaid; Seitentext Phase 1b"),
    "API-Rechtliches.dc.html": (IMPL, "1b", "Rechtstexte API auf /produkte/api und /vertragsgrundlagen"),
    "Rechtliches.dc.html": (IMPL, "1b", "Rechtsseiten vorhanden; Faktenabgleich im Textkonzept"),
    "NeXifyAI-Wissenshub-Artikel.dc.html": (MISS, "1b", "Wissensseiten; Artikeltexte im Gesamt-Textkonzept"),
    "Kundenwege.dc.html": (OOP, "6", "Bedarfsaufnahme/CRM-Wege; öffentliche Seiten nur Text (1b)"),
    "Kundenportal.dc.html": (OOP, "3", "Kundenportal /portal/kunde bleibt geschlossen (401/403)"),
    "Partnerportal.dc.html": (OOP, "3", "Partnerportal bleibt geschlossen"),
    "Nachbarschaftskunden-Portal.dc.html": (OOP, "3", "Nachbarschaftsportal bleibt geschlossen"),
    "Affiliate-Portal.dc.html": (OOP, "3", "Affiliate-Portal bleibt geschlossen"),
    "Konto.dc.html": (OOP, "3", "Kontobereich; Bestellübersicht bereits /teileklar/bestellungen"),
    "myADMIN v2.dc.html": (OOP, "4", "Phase 1: nur /teileklar/admin (Aufschlag, Import)"),
    "NeXify Leitstand.dc.html": (OOP, "4", "intern"),
    "NeXify Posteingang.dc.html": (OOP, "4", "intern; Anfragen werden bereits in db.requests gespeichert"),
    "NeXify Workspace.dc.html": (OOP, "6", "intern"),
    "NX-Intern.dc.html": (OOP, "6", "intern"),
    "NeXify Systemkarte.dc.html": (OOP, "6", "intern"),
    "NX-Header.dc.html": (IMPL, "1b", "SiteNavigation; Beschriftungen im Textkonzept"),
    "NX-Footer.dc.html": (IMPL, "1b", "SiteFooter; Texte im Textkonzept"),
    "NeXify-AI-Companion.dc.html": (OOP, "5", "Assistent läuft im Orientierungsmodus; Live-KI Phase 5"),
    "NeXify Designsystem.dc.html": (IMPL, "1", "packages/tokens + config/design-tokens.json"),
    "E-Mail-Transaktional-Angebot.html": (OOP, "2", "Transaktionsmails (Resend) Phase 2"),
    "E-Mail-Marketing-Newsletter.html": (OOP, "7", "Marketingmaterial"),
}
COLLATERAL = ("Geschaeftsdokumente-Vorlagen", "Investoren-PowerPoint", "Kundenbroschuere", "Partner-Broschuere", "Partner-PowerPoint", "Visitenkarte", "Local-SEO-Muster")

RULES = [  # (pattern on item text, files or None, status, phase, evidence)
    (r"auth/(login|register)", ("Anmeldung", "Kundenportal"), IMPL, "1", "/api/auth/login, /api/auth/register"),
    (r"auth/(login|register)|rolle", None, OOP, "3", "Partner-/Nachbarschaftsrollen erst mit Portalen"),
    (r"/v1/shop/orders", None, IMPL, "1", "/api/shop/checkout mit Idempotency-Key, Revolut-Webhook"),
    (r"/v1/requests|pruefeForm", None, IMPL, "1b", "ContactRequestForm -> POST /api/requests, Vorgangsnummer"),
    (r"account/data-rights|wipeLocal|exportData", None, MISS, "2", "Datenexport/Löschung für Shop-Konten"),
    (r"customer/|partner/|offers/|billing/|documents/|crosssell/", None, OOP, "3", "Portal-Endpunkte"),
    (r"^(loadShops|standortBetriebe|cityList|hoursText)$", None, IMPL, "1", "/api/workshops/search, Radius, Karte"),
    (r"^(openCity|slugifyCity)$", None, MISS, "2", "Stadtseiten (Phase-2-Umfang)"),
    (r"^(openProduct|prod|money|add|setQty|brutto|preis|summen|liste|karte|go|chip|label|coNext|c|sym|symList|market|notify)$", None, IMPL, "1", "Katalog/Warenkorb/Kasse, serverseitige Summen"),
    (r"^(advisor|adviseProduct|explainNeeds|chatAction|chatSubmit|openChat|closeChat|say|user|push|vehicleObj|guideLoc|openGuideAt)$", None, OOP, "2", "KI-Berater und Fahrzeugbezug"),
    (r"^setConsent$", None, IMPL, "1", "DiagnosticConsent"),
    (r"^(loadLegal|openLegal|legalDocs|slug)$", None, IMPL, "1b", "/teileklar/rechtliches"),
    (r"^(dia|num)$", ("Reifenrechner",), IMPL, "1b", "TyreCalculator (gleiche Formel, Index-Hinweise)"),
    (r"^(opt|num)$", ("Batterie-Berater",), MISS, "2", "Platzhalter PhaseNotice tk-battery"),
    (r"^(setLang)$", None, IMPL, "1", "Sprachumschaltung im Header"),
    (r"^(toast)$", None, IMPL, "1", "Statusmeldungen (aria-live)"),
    (r"^(obSet|obRC|obBrutto|obEur|start|weiter|entscheide|melde|webhook)$", None, OOP, "5", "Bestell-/Konsolenstrecke one/API"),
    (r"^(starteLicht|lauf|grainTile|zeichne|feldStarten|d1Zeilen|setDemo2|demoStarten|heroFluss|stationGrafik|tagesleiste|signet|phasenRail|bausteinGrafik|heroTerminal|antworte)$", None, OOP, "7", "Demo-Animation/Visual, kein Funktionsumfang"),
    (r"demo|muster", None, IMPL, "1", "Kein Demo-Hinweis nötig: echte Funktion bzw. ehrlicher Platzhalter"),
]


def classify(fname, kind, text):
    for pattern, files, status, phase, evidence in RULES:
        if re.search(pattern, text, re.I) and (files is None or any(f in fname for f in files)):
            return status, phase, evidence
    if kind == "Text" and FILE_DEFAULT.get(fname, ("", "", ""))[0] != OOP:
        return MISS, "1b", "Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext)"
    if any(c in fname for c in COLLATERAL):
        return OOP, "7", "Vertriebsmaterial ohne Route"
    return FILE_DEFAULT.get(fname, (OOP, "7", ""))


def routes():
    d = json.loads((ROOT / "config/site-map.json").read_text())
    out = {}
    for p in d["pages"]:
        for ref in p["prototype_page_ids"]:
            out.setdefault(ref.split("prototypen/")[-1], []).append("%s (%s)" % (p["path"], p["access"].get("visibility")))
    return out


def cell(text):
    return text.replace("|", "\\|").replace("\n", " ")[:220]


def main():
    mapping = routes()
    files = sorted(p for p in (ROOT / "prototypen").glob("*.html") if p.name != "index.html")
    lines, counts = [], {}
    for path in files:
        data, name = extract(path), path.name
        lines += ["", "### %s" % name, "", "- Route(n): %s" % (", ".join(mapping.get(name, [])) or "ohne Route"),
                  "- Gesamtstatus: %s · Zielphase %s · %s" % FILE_DEFAULT.get(name, (OOP, "7", "Vertriebsmaterial ohne Route")), "",
                  "| Art | Anweisung | Status | Phase | Umsetzung / Begründung |", "|---|---|---|---|---|"]
        items = [("TODO(BACKEND)", t) for t in data["todo_backend"]]
        items += [("data-api-endpoint", e["endpoint"]) for e in data["api_endpoints"]]
        if data["fields"]:
            items.append(("Formular", "%d Formular(e); Felder: %s" % (data["forms"], ", ".join(sorted({f["name"] for f in data["fields"] if "{{" not in f["name"]}))[:180] or "dynamisch")))
        items += [("Logik", m) for m in data["logic_methods"]]
        if data["states"]:
            items.append(("Zustände", ", ".join(data["states"])))
        items += [("Text", t) for t in data["handoff_texts"][:8]]
        seen = set()
        for kind, text in items:
            if (kind, text) in seen:
                continue
            seen.add((kind, text))
            status, phase, evidence = classify(name, kind, text)
            if kind == "Zustände":
                status, phase, evidence = (IMPL, "1", "Lade-, Leer-, Fehlerzustände in Shop/Werkstattsuche/Auth") if FILE_DEFAULT.get(name, ("",))[0] == IMPL else (status, phase, evidence)
            counts[status] = counts.get(status, 0) + 1
            lines.append("| %s | %s | %s | %s | %s |" % (kind, cell(text), status, phase, cell(evidence)))
    head = (ROOT / "docs/content/seiten-logik-audit.head.md").read_text()
    summary = "\n".join("- %s: %d" % (k, counts.get(k, 0)) for k in (IMPL, WRONG, MISS, OOP))
    (ROOT / "docs/content/seiten-logik-audit.md").write_text(head.replace("{{SUMMARY}}", summary) + "\n## Prototypen im Einzelnen\n" + "\n".join(lines) + "\n")
    print(summary)


if __name__ == "__main__":
    main()

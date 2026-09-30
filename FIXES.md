# FIXES — erkannte Bugs und Abweichungen, behoben

**Stand 29.09.2026 · Paket design_handoff_nexify_gesamtloesung**

## 4. Live-Routen, Sitemap und interne Verweise

Befund: Die Produktions-Startseite `/` lieferte einen Meta-Refresh-Lader, die
Sitemap zeigte auf die Vorschau-Domain und enthielt nicht indexierbare Seiten;
mehrere alte Rechts- und Standortpfade endeten mit 404. Weitere reproduzierbare
Fehler waren tote Anker/Skiplinks, fehlende Deck-Navigation, tote `v10`-Links
und ein Link auf nicht ausgelieferte Integrationsdateien.

Fix: `config/routen.json` ist die Routenquelle. `node tools/routen.mjs
schreiben` aktualisiert Sitemap, robots.txt und nginx-Regeln für den
Produktions-Docroot; `node tools/routen.mjs pruefen` prüft Route-Ziele,
historische Sitemap-Pfade, Indexierbarkeit und Regressionen. Der Loader ist
noindex und kanonisiert auf `/`; `/` wird im nginx-Schnipsel direkt auf die
Startseite gemappt. Das Repo enthält eine 404-Seite. Ungültige Legal- und
Standortpfade leiten auf belegte bestehende Inhalte, ohne erfundene Stadt- oder
Rechtstexte. Details zu notwendigen externen Deploy-Schritten und Blockern:
`docs/ONLINE.md`.

## 1. `config/design-rules.json` — Farbskala unvollständig

Befund: 15 in den Seiten verwendete Töne wurden von `config/abweichungen.json`
als `DS-C-05` (Info, Papier-Vorschau/Sonderfarben) geführt, standen aber in
keiner Palette (`farbe.bildschirm` / `farbe.abgeleitet` / `farbe.papier`).
Folge: `tools/ds-audit-cli.js` meldete sie fälschlich als `DS-C-01`-Fehler.

Fix: 15 Töne in `farbe.abgeleitet` aufgenommen (12 → 27 Einträge).

```
#F3F4F2 #F6F7F4 #ECEEEB #D8DAD6 #E1E3DF
#1B2226 #33382F #3A3F2A #3A5F00 #5C6157
#5C6670 #4A4038 #4A3838 #6B3A34 #C4432B
```

## 2. `tools/ds-audit-cli.js` — dokumentierte Ausnahmen nicht abgezogen

Befund: CI-Schwelle „0 Fehler außerhalb dokumentierter Ausnahmen“ griff nicht;
der Aufruf meldete Fehler/Warnungen, die in `design-rules.json → ausnahmen`
und `config/abweichungen.json` bereits dokumentiert sind.

Fix: Ausnahmen (`ausnahmen`) werden je Datei eingesammelt und vor der
Fehler-/Warnungszählung abgezogen; Namenszuordnung per Teilstring
(„Workspace, myADMIN, …“ → echte Dateinamen).

## 3. `NeXify Systemkarte.dc.html` — fehlendes `<html lang>`

Befund: `<html>` ohne `lang` → Verstoß DS-I-01 (Barrierefreiheit/i18n).

Fix: `<html lang="de">`. Zusätzlich als interne Übersicht in die
`DS-B-03`-Ausnahme (Anwendungs-Shell/Referenz ohne Fuß) aufgenommen.

## Ergebnis

`node tools/ds-audit-cli.js` (im Projektstamm mit `config/` + `tools/`):
**0 Fehler, 0 Warnungen** (vorher 47 Fehler, 49 Warnungen), Exit-Code 0.
Konsistent mit `config/abweichungen.json` (alle Flächen „konform“).

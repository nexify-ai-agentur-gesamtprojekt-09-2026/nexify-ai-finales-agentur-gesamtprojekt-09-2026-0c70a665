# Denk-Kanon (Pascal) · in den Build übernommen

Zusammengeführt aus dem Supervisor-Auftrag (Pascals gespeichertes Denken). Hinweis:
Diese Sitzung hat **keinen direkten Zugriff auf Pascals Projekt-Memory**; der Kanon
ist aus dem übergebenen Auftragstext erfasst. Abweichungen/Konflikte sind unten als
„zu klären" markiert — nicht geraten.

Stand: 2026-11-08.

## 1 · Arbeit
- Zero-Stop, keine Platzhalter. **Fertig = voller Zielzustand.**
- Archivieren statt löschen. Keine Server-Bereinigung vor Projektende.
- **Oracle zuerst** (Chat ist Kernkomponente, siehe §6).

## 2 · Status
- Zustände von PLANNED bis OPERATING. Eigene Tests sind **keine** unabhängige Abnahme.

## 3 · Text
- Ruhig, souverän, konkret, **Sie-Anrede**. Keine erfundenen Referenzen.
- Leitbegriffe: *Vorhaben, ein Ansprechpartner, zusammenhängend, klarer Preis, auf Knopfdruck.*
- Muster „Ein X. Ein Y." · Leitsatz **„Erst das Vorhaben, dann die Technik."**
- Schreibweise **AIFly ORACLE**. Je Seite die **8 Pflichtfragen** beantworten
  (Was, für wen, Problem, Ergebnis, Voraussetzungen, Zusammenarbeit, Verfügbarkeit, nächster Schritt).

## 4 · Design
- **Graphite `#080A0F`**, Plus Jakarta Sans + Inter, **8-px-Raster**, pixelgenau.
- Header **rahmt das Hero-Bild ein**; alle anderen Bilder mit **Champagne-Glaskante**,
  echter Hochglanz, **Licht-Sweep statt Video**.
- Buttons 3D/haptisch; Scrollbars Champagne/Steel.

## 5 · Figuren (immer als Paar)
- **NeX (Tukan)** = Ausführen. **Oracle / AIfly** = dieselbe grüne Figur (Companion/Reasoning).
- **Pascal** = Vertrauen. Keine Roboter, keine grünen Kugeln.

## 6 · Chat = Highlight (Pflicht auf jeder Seite)
- Echter Konversations-Chat mit Verlauf + Eingabe an Live-API; Angebot daraus.
- Apple-Liquid-Glas ohne Scanlines; Bubbles als feste Flächen.
- **Ehrlichkeit:** nur Funktionen zeigen, die laufen. Aktueller Repo-Stand
  (`api/agent-chat`) ist **zero-model** (geführte Orientierung) → ohne erreichbares
  Live-Modell klarer Hinweis + Kontaktformular/Termin, kein vorgetäuschter Live-Betrieb.

## 7 · Marken / Baukasten
- **TEILEKLAR** ist eigenständige Marke (Werkstatt/Teile).
- Baukasten-Denken: wiederverwendbare Tokens/Komponenten.

## Konflikte — NICHT RATEN, gemeldet

- **a) Grün-Ton.** Graphite-Spec nennt `#C0EE38`; Pascal fand das am 05.11. „viel zu
  grell" (ruhigeres, tieferes Lime nur als kleines Signal; Logo/Überschriften
  Champagne/Steel). **Aktueller App-Token-Stand:** `marke.lime = #A8C76A`
  (Beschreibung „nur Signalfeld und Lichtflecken"), Canvas `#080A0F`.
  **Der Canvas-Export** nutzt dagegen grelles `#C0EE38` auf `#111212`.
  → **Entscheidung: App-Token-Kanon (gedämpftes Lime/Graphite) ist führend**;
  die Canvas-Optik wird darauf angeglichen. Abweichung dokumentiert.
- **b) Name.** NOVA vs. NeXify AI offen. **Im Chat:** „NeX Agentic AIFly / ORACLE".
- **c) Sprachen.** `main` de/nl/fr/en; `.de`-Branch (`factory/agency-separated-2026-10-26`)
  nur de/nl/fr. → vor `.de`-Migration klären, nicht geraten.
- **d) Hero-Video mit Ton.** Nicht als funktionierend melden (Lippensync/Autoplay/Ton
  offen; Medienbindung `page-media-registry.json` pending, owner-gated/Pascal).

## Limits
- Keine Preise ohne Freigabe (nur `config/fakten.json`-Werte, Tagessatz 449 €).
- Rechtstexte nur Entwurf. Kein Merge auf `main`. Nichts löschen.

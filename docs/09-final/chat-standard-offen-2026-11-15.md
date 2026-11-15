# Gesprächsleiste: standardmäßig offen in der kleinsten vorhandenen Breite · 15.11.2026

Auftrag des Inhabers vom 15.11.2026 (gesprochen, sinngemäß): Die Chat-Leiste rechts soll
standardmäßig geöffnet sein und dabei so schmal wie möglich, ohne dass an der Leiste etwas
verändert wird: die kleinste Breite der aktuellen Fassung als Ausgangszustand.

Es gilt die Design-Sperre. Diese Änderung legt keinen neuen Wert an und berührt kein
Stylesheet. `AGENTS.md` und `CLAUDE.md` gelten unverändert.

## Ergebnis in einem Satz

Ohne gespeicherte Wahl startet die Leiste auf nexifyai.de ab 1200 px Fensterbreite offen
(wie bisher) und jetzt in der Breite `CHAT_MIN` = 360 px statt in der bisherigen
Standardbreite `clamp(360px,29vw,432px)`. Alles andere bleibt, wie es war.

Ein Befund aus der Messung liegt beim Inhaber: Abschnitt „Befund: Kopf der Leiste bei
geringer Fensterhöhe".

## IST vor der Änderung (Fundstellen am Stand `9c9c806`)

| Frage | Antwort | Fundstelle |
|---|---|---|
| Ausgangszustand ohne gespeicherte Wahl | `auto`: offen ab 1200 px, darunter eingeklappt; unter `/teileklar` immer eingeklappt | `apps/web/lib/chat-panel.ts:9-13`, `apps/web/components/Workspace.tsx:183-184`, `:330-333`, `apps/web/components/LuxuryMaterials.css:52-61` |
| Standardbreite | `--layout-panel-width: clamp(360px,29vw,432px)` | `apps/web/components/AtelierSystem.css:194` |
| Vorhandene Breiten | stufenlos per Ziehgriff von `CHAT_MIN` = 360 bis `CHAT_MAX` = 1220, begrenzt auf 62 % der Fensterbreite; Schrittweite der Pfeiltasten 16 | `apps/web/lib/chat-panel.ts:5-6`, `apps/web/components/ChatResizeHandle.tsx:7-10` |
| Kleinste Breite | `CHAT_MIN` = 360 px: Untergrenze des Ziehgriffs (`aria-valuemin`), Ziel der Taste Pos1, Untergrenze der bisherigen Standardbreite | `apps/web/components/ChatResizeHandle.tsx:33`, `:41` |
| Wo die Wahl gespeichert wird | offen/zu: `sessionStorage` und Sitzungs-Cookie `nx-chat-open` (`1`/`0`); Breite: `sessionStorage` und Sitzungs-Cookie `nx-chat-width`. Der Server liest beide Cookies für den ersten Bildaufbau. | `apps/web/components/Workspace.tsx:256-258`, `apps/web/components/ChatResizeHandle.tsx:12-19`, `apps/web/app/layout.tsx:39-42` |
| Schmale Bildschirme | bis 820 px (oder Querformat bis 500 px Höhe mit Fingerbedienung) ist die Leiste ein Dialog über der Seite und startet immer eingeklappt, auch bei gespeichertem „offen" | `apps/web/components/Workspace.tsx:20`, `:335`, `apps/web/components/LuxuryMaterials.css:60` |

Die sichtbare Leiste ist 12 px schmaler als der Wert der Spalte (360 px Spalte, 348 px
Leiste); das war schon so und gilt für jede Breite.

## Was geändert wurde

Eine Datei, zwei Zeilen, `apps/web/components/Workspace.tsx` (Commit `8ad23c7`):

- Zeile 17: `CHAT_MIN` zusätzlich aus `./ChatResizeHandle` eingeführt.
- Zeile 483: `chatWidthStyle(chatWidth,mobile)` wird zu `chatWidthStyle(chatWidth??CHAT_MIN,mobile)`.

Wirkung: Ist keine Breite gespeichert, setzt die offene Leiste die vorhandene Variable
`--layout-panel-width` auf den vorhandenen Wert `CHAT_MIN`. Der Server rendert denselben Wert
schon im ersten Bildaufbau. Eine gespeicherte Breite geht vor (`chatWidth` ist dann nicht
leer). Als Dialog (mobil) setzt `chatWidthStyle` weiterhin keine Breite. „Auf Standard
zurücksetzen" (Doppelklick oder Eingabetaste am Ziehgriff) führt jetzt ebenfalls auf 360 px;
der Griff meldete für diesen Zustand schon vorher `aria-valuenow="360"`, die Angabe stimmt
jetzt mit der sichtbaren Breite überein.

Neu ist außerdem der Test `apps/web/auth/tests/chat-default.test.mjs` (vier Fälle, läuft in
`test:auth`).

### Was ausdrücklich nicht geändert wurde

- Kein Stylesheet, kein Token, keine neue Breite, Farbe, Abstand oder Bewegung.
- Die Grenze 1200 px. Zwischen 821 und 1199 px bleibt die Leiste ohne gespeicherte Wahl
  eingeklappt. Begründung aus dem Bestand (`Workspace.tsx:329`): Unter 1200 px behält die
  Seite ihre volle Spalte. Gemessen bliebe dem Inhalt bei 1199 px mit offener Leiste eine
  Spalte von 839 px, bei 821 px nur noch rund 460 px.
- Mobil (bis 820 px): unverändert eingeklappt, die Leiste wäre dort ein Dialog über dem Inhalt.
- TEILEKLAR (`/teileklar`): startet weiter eingeklappt (`Workspace.tsx:183`). Das ist eine
  bestehende Festlegung für die eigenständige Shop-Marke; der Auftrag nennt sie nicht.
  Entscheidung liegt beim Inhaber (siehe „Offen").

## Messung im Browser (lokaler Produktions-Build, frischer Browser ohne Cookies)

Skript: `chat-standard-offen-2026-11-15/messung.mjs`; Rohwerte:
`vorher-messung.json` (Stand `9c9c806`) und `nachher-messung.json` (Stand `8ad23c7`) im selben
Ordner. Chromium 153 mit Playwright 1.63.0.

| Fall | vorher: Leiste / Inhalt | nachher: Leiste / Inhalt | Zustand |
|---|---|---|---|
| 1440 px, keine Wahl | 405,59 / 1022,41 px | 348 / 1080 px | offen |
| 1700 px, keine Wahl | 420 / 1268 px | 348 / 1340 px | offen |
| 1280 px, keine Wahl | 359,19 / 908,81 px | 348 / 920 px | offen |
| 1200 px, keine Wahl (kleinste Breite, ab der sie offen startet) | 348 / 840 px | 348 / 840 px | offen, unverändert |
| 1199 px, keine Wahl | – / 1199 px | – / 1199 px | eingeklappt, unverändert |
| 821 px, keine Wahl | – / 821 px | – / 821 px | eingeklappt, unverändert |
| 390 px, keine Wahl | – / 390 px | – / 390 px | eingeklappt, Rolle `dialog`, unverändert |
| 1440 px, gespeichert „zu" | – / 1440 px | – / 1440 px | eingeklappt, unverändert |
| 1440 px, gespeichert offen mit Breite 520 | 508 / 920 px | 508 / 920 px | offen, unverändert |
| 1199 px, gespeichert offen | 348 / 839 px | 348 / 839 px | offen, unverändert |
| 390 px, gespeichert offen | – / 390 px | – / 390 px | eingeklappt, unverändert |
| 1440 px, `/teileklar` | – / 1440 px | – / 1440 px | eingeklappt, unverändert |
| 1440 px, ohne Skript (nur Server-HTML) | 405,59 / 1022,41 px | 348 / 1080 px | offen |

Folgen, einzeln geprüft:

- **Kein Springen beim Laden.** Die Breite im ersten Bildaufbau (vor dem Skript) ist in jedem
  Fall dieselbe wie danach (Spalte „erstes_bild" gegen „nach_start" in den Rohwerten; der Fall
  ohne Skript zeigt 348 px allein aus dem Server-HTML). Summe der Layout-Verschiebungen bei
  1440 px: 0 vorher, 0 nachher. Der Fall „gespeichert zu" zeigte nachher 0,0027 statt 0; in
  diesem Zustand setzt die Änderung nichts (keine Breite bei eingeklappter Leiste), der Wert
  wurde nicht weiter zerlegt.
- **Keine Verdeckung.** Kein waagerechter Überlauf in allen 13 Fällen (0 px). Die Leiste liegt
  in einer eigenen Spalte neben dem Inhalt; bei 1440 px endet der Inhalt bei 1080 px und die
  Leiste beginnt dort, bei 1200 px entsprechend bei 840 px.
- **Tastatur und Fokus.** Am Ziehgriff bei 1440 px geprüft: Pfeil links 364 px, Pos1 360 px,
  Pfeil rechts bleibt bei 360 px (Untergrenze), Ende 892 px, Eingabetaste zurück auf 360 px
  und löscht die gespeicherte Breite; Escape klappt ein, Fokus geht auf den Schalter, Cookie
  `nx-chat-open=0`; nach neuem Laden bleibt sie eingeklappt; der Schalter öffnet sie wieder
  und setzt den Fokus ins Eingabefeld. Beim Laden selbst nimmt die Leiste den Fokus nicht
  (Fokus auf `BODY`, vorher wie nachher).
- **Bildschirmleser.** `aria-valuemin`/`aria-valuenow` des Griffs 360/360, `hidden` der Leiste
  und `aria-expanded` des Schalters stimmen in allen Fällen mit dem sichtbaren Zustand überein;
  Rolle `dialog` nur mobil. Keine Abweichung zwischen vorher und nachher außer der Breite.
  Ein Lauf mit einem echten Bildschirmleser fand nicht statt.
- **Leistung.** Kein zusätzlicher Code außer einem Vergleich im Rendern, kein neues Stylesheet,
  keine neue Anfrage. Eine Laufzeitmessung (Lighthouse o. Ä.) fand nicht statt.

## Befund: Kopf der Leiste bei geringer Fensterhöhe

In der kleinsten Breite bricht der Text in der Leiste früher um, der Inhalt wird dadurch
höher. Die Leiste rollt ihren Inhalt beim Start wie bisher ans untere Ende zur Eingabe. Passt
der Inhalt nicht in die Höhe, ist der Kopf mit Figur und Name „AIFly ORACLE" beim ersten
Blick ganz oder teilweise nach oben weggerollt; er ist durch Rollen in der Leiste erreichbar,
verloren geht nichts.

| Fenster | Breite der Leiste | Inhalt / sichtbare Höhe | Kopf beim Start |
|---|---|---|---|
| 1440 × 900, nachher (360) | 348 px | 986 / 876 px | Name angeschnitten |
| 1440 × 900, bisherige Standardbreite (gespeichert 418) | 406 px | 921 / 876 px | sichtbar, 45 px gerollt |
| 1440 × 1080 und 1920 × 1080, nachher | 348 px | passt | vollständig sichtbar |
| 1280 × 720, nachher | 348 px | 794 / 696 px | Name angeschnitten |
| 1200 × 800 (schon vor der Änderung so) | 348 px | 986 / 776 px | weggerollt |

Das ist das heutige Verhalten der kleinsten Breite und keine neue Darstellung: Bei 1200 px
Fensterbreite sah die Leiste schon vor der Änderung so aus (Aufnahme `vorher-1200.jpg`). Neu
ist, dass dieser Zustand jetzt auch auf breiteren Fenstern der Ausgangszustand ist, sichtbar
in `nachher-1440.jpg`. Wegen der Design-Sperre wurde daran nichts verändert. Ob das so bleiben
soll, entscheidet der Inhaber (siehe „Offen").

## Aufnahmen (Browserlauf, auf halbe Größe verkleinert)

| | vorher (`9c9c806`) | nachher (`8ad23c7`) |
|---|---|---|
| 1440 px | ![vorher 1440](chat-standard-offen-2026-11-15/vorher-1440.jpg) | ![nachher 1440](chat-standard-offen-2026-11-15/nachher-1440.jpg) |
| 1200 px | ![vorher 1200](chat-standard-offen-2026-11-15/vorher-1200.jpg) | ![nachher 1200](chat-standard-offen-2026-11-15/nachher-1200.jpg) |
| 390 px | ![vorher 390](chat-standard-offen-2026-11-15/vorher-390.jpg) | ![nachher 390](chat-standard-offen-2026-11-15/nachher-390.jpg) |

## Prüfung (lokal gelaufen, kein CI-Lauf)

Basis für „vorher" ist ein unveränderter Worktree auf `origin/main` (`9c9c806`), gleiche
Umgebung (Python 3.13.18, Node 22.23.4, pnpm 12.15.0, mit `node_modules`, ohne `.venv`).

| Gate | Ergebnis |
|---|---|
| `make check` | Exit 0, 0 Fehler, 0 Warnungen |
| `pnpm --filter @nexify/web test:auth` | 142 Tests, 142 bestanden (darunter die vier neuen) |
| `pnpm --filter @nexify/web typecheck` | Exit 0 |
| `pnpm --filter @nexify/web build` | Exit 0 |
| `node tools/lint.mjs` | Exit 0, 0 Diagnosen |
| `node apps/web/scripts/atelier-literale.mjs` | Exit 0 |
| `node tools/gleichmacher.mjs` gegen den lokalen Build | 44 Seiten, 31 497 Vergleiche, 0 Abweichungen, 0 Fehler; vorher dieselben Zahlen je Baustein |
| `node tools/live-check.mjs` gegen den lokalen Build | 329 Prüfungen, 7 Befunde, namensgleich mit vorher (fünf zur PWA, zwei zum Shop-Dienst, der lokal nicht läuft); kein neuer Befund |
| `python3 -m unittest discover -s tests` | 844 Tests; 46 Fehlschläge vorher, 46 nachher, per Namensvergleich keine neuen und keine entfallenen |
| `make check-arch` | Exit ungleich 0 wie auf `main`: ARCH-010, ARCH-027, ARCH-029 verletzt, vorher wie nachher. ARCH-024 war nach der Änderung zusätzlich rot (Resize-Beleg) und ist nach dem neuen Browserlauf wieder grün. |
| `python3 tools/check_text_resize_evidence.py` | Exit 0, 43 Routen |
| `python3 tools/check_browser_evidence.py` | Exit 1 wie auf `main` (`stale_source_sha256: apps/site/src/Auth.tsx`), nicht durch diese Änderung |

`make test` endet wegen der auf `main` roten Python-Suite weiterhin mit Fehler.

### Beleg und Pin

`apps/web/components/Workspace.tsx` liegt in einem vollständig gebundenen Verzeichnis
(`config/text-resize-sources.json`).

| Datei | alter Pin | neuer Pin | Belegart | Beleg |
|---|---|---|---|---|
| `apps/web/components/Workspace.tsx` in `evidence/resize-2026-11-10/text-spacing.json` | `37c73178a2b1…` | Bytes am Commit `8ad23c7` | Browserlauf | `apps/site/tests/browser-text-spacing.mjs` am festen Commit `8ad23c7` bei sauberem Arbeitsbaum, 15.11.2026, 12:29 bis 12:32 UTC: 129 Prüfungen, 43 Routen, 0 Befunde, 0 Laufzeitfehler, 175 Quellen; einzige geänderte Quelle gegenüber dem vorigen Beleg ist diese Datei |

Die vorige Fassung liegt unverändert unter
`evidence/resize-2026-11-10/superseded/text-spacing.pre-chat-standard-offen-2026-11-15.json`.
Der Beleg wurde vom Harness geschrieben, nicht von Hand. Der Lauf fand auf dem Dateibaum `ac5853a5bdbd…` statt; der Commit `8ad23c7` trägt genau diesen Baum (die Commit-Nachricht wurde nach dem Lauf neu gefasst, der Inhalt nicht). Abweichung der Laufumgebung:
Playwright 1.63.0 mit Chromium 153 statt der in `.github/evidence-runner/package.json`
festgelegten Version 1.65.0.

Bewusst nicht nachgezogen: Die übrigen Stellen, die `Workspace.tsx` nennen
(`config/acceptance-coverage.json`, weitere Listen unter `config/` und ältere Belege unter
`evidence/`), trugen die Prüfsumme der Datei schon vor dieser Änderung nicht mehr; sie werden
hier weder neu rot noch gelöst.

## Offen (Entscheidung des Inhabers)

1. Kopf der Leiste bei geringer Fensterhöhe (Befund oben): so lassen, oder die Leiste beim
   Start am Kopf statt an der Eingabe zeigen. Letzteres wäre eine Verhaltensänderung an der
   Leiste und braucht eine Freigabe.
2. TEILEKLAR: soll die Leiste dort ebenfalls offen starten?
3. Fenster zwischen 821 und 1199 px: weiter eingeklappt (heutige Regel) oder offen?

## Rückweg

Eine Zeile zurück: in `apps/web/components/Workspace.tsx`, Zeile 483, `chatWidth??CHAT_MIN`
wieder durch `chatWidth` ersetzen (die Einfuhr von `CHAT_MIN` in Zeile 17 kann stehen bleiben
oder mit entfernt werden), den Fall „kleinste Breite" im Test anpassen und den Resize-Beleg
durch einen neuen Lauf erneuern. Gespeicherte Nutzerwahlen sind davon nicht betroffen.

## Nicht belegt

- Kein Livegang, keine Messung an der Produktion; der Entwurfs-PR ist nicht gemergt.
- Kein CI-Lauf (Actions startet laut `nexify-zweig-und-pr` keine Jobs); es zählen die lokalen Gates.
- Keine unabhängige Prüfung durch einen zweiten Agenten.
- Kein Lauf in WebKit oder Firefox, kein echter Bildschirmleser, keine Laufzeitmessung.
- Abweichung vom Skript `nexify-zweig-und-pr`: gearbeitet wurde im Hauptcheckout, weil der
  zugewiesene Zweig `claude/chat-standard-offen` dort bereits ausgecheckt war; die
  Vorher-Messung lief wie verlangt in einem getrennten Worktree auf `origin/main`.

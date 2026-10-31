# Übergabe-/Fortschrittspaket — EN + Touch-Target 48px (Stand 2026-10-31)

Lokal, **kein Push / kein Deploy / keine Kosten / keine Secrets**. Budget-Gate beachtet
(UI ~198 Credits): keine neuen Gestaltungsrunden, keine bezahlten Services, nichts nachgeladen/zugekauft.

## 1) Atomare Commits (vollständige 40-stellige SHAs)

| Paket | Vollständiger SHA | Betreff |
|---|---|---|
| EN-Runtime-Integration | `0aaa8f51eb4145b8069bbc9b2a521d5c66a8b516` | NEX-EN-RUNTIME-INTEGRATION · make test 620 OK |
| Touch-Target 48px | `94fde9a592bd99799df99cbbe5ffd436622aa2fd` | NEX-TOUCH-TARGET-48 · make test 620 OK |
| Basis davor | `1704b5631bf42202bca36c16aea19e16bdec6530` | Install-UX (Auftrag 15) |

EN ist getrennt vom Touch-Commit identifizierbar (EN = Parent von Touch).

## 2) git status (nach Touch-Commit)
Arbeitsbaum sauber bis auf Harness-Datei:
```
 M .emergent/emergent_todos.json   (Harness-Status, bewusst nicht committet)
```
Untracked: nur `.local/**` (gitignored, QA-Artefakte) und `.emergent/testing/**` (Harness).

## 3) Tatsächliche Testläufe (keine Hash-Anpassung als Funktionsnachweis)
- `make test` nach Touch-Commit: **Ran 620 tests … OK**, `config/*.json gueltig` (EXIT 0).
  Log: `.local/diagnostics/logs/<ts>-maketest.log`.
- Echte Chromium-Regeneration (Node22 + pw-shim, Browser-Cache chromium-1208):
  `browser-critical` (detail-browser + critical-fresh), `browser-text-spacing` (108 checks, 0 issues),
  `browser-shop`, `browser-catalog`, `browser-workspace-read`, `browser-legal-footer` **vite** (216 views)
  und **next** gegen **frischen** Next-Build auf :4138 (216 views, passed). Logs unter
  `.local/diagnostics/logs/<ts>-*` und `/tmp/t48-*`, archiviert (nicht gelöscht).
- Frische Mess-Verifikation (NICHT stale Dev-Server :3000): 0 interaktive Elemente < 48px
  auf 390px und 1280px. Log: `.local/diagnostics/logs/<ts>-touch-measure/measure.log`.

## 4) Konkrete Restfehler
- **Keine** offenen Fehler im Touch-/EN-Paket; `make test` grün.
- Bewusste, dokumentierte Touch-Ausnahmen (kein Fehler):
  - `.compact-touch` (44px) = ausdrückliche Opt-out-Klasse für kleine Chips.
  - Native `input[type=checkbox|radio]` = 20px Steuerelement, eingebettet in ≥48px-Label-/Zeilen-Hitboxen.
  - `--target-min` / `--layout-control-size` waren bereits 48px (Token-System).

## 5) Übertragbares Source-/Patchpaket (ohne Secrets)
`docs/handoff-2026-10-31/patches/`
- `0001-NEX-EN-RUNTIME-INTEGRATION-*.patch`
- `0002-NEX-TOUCH-TARGET-48-*.patch`
Anwenden auf Basis `1704b563…`: `git am docs/handoff-2026-10-31/patches/*.patch`.
Secret-Scan: keine `.env`/Keys; Treffer nur Bezeichner (`@clerk/localizations`,
`VITE_CLERK_ENABLED:"false"`), Datenschutz-UI-Texte und ein Config-SHA256 — keine echten Werte.

## 6) Explizit OFFENE Abnahmen (nicht als fertig dargestellt)
- **Backend-Runtime-Bindung** (ungebundene zustandsbehaftete Gateway-Routen, Session-204-Stub) —
  Integrationsaufgabe, bleibt im Handoff `API-RUNTIME-BINDING-SOLL-IST.md` (Commit `55b480b…`).
- **Reale Katalogdaten (BigBuy)** — blockiert bis Keys via sichere Karte; Shop/Werkstatt/Partner/Portal-UIs
  vorhanden, aber **nicht** als live-betriebsbereit behauptet.
- **Impressum**: Fake-„NeXify AI FACTORY B.V."-Daten in `config/site-map.json` noch nicht ersetzt
  (echte Eenmanszaak-Daten liegen vor; USt/BTW widersprüchlich → nicht erfinden; nicht als rechtlich
  final publizieren). → eigenes Paket.
- **NEX-COPY-20261031-17 (global)**: /teileklar + gemeinsame Vorlagen enthalten interne
  Aufbau-/Spezifikationstexte statt belegter Kundentexte (Semantik-Gate je Absatz), Du/Sie-Mix,
  Agentur-Slogan im TEILEKLAR-Footer/Chat, unbelegte Passungs-Garantien, „Katalog in Kürze". → nächstes Paket.

## 7) Übernommene DoD/QA-Gates (nach 3 Primärquellen)
- Touch-Hitbox **≥48px = internes SOLL** (nicht WCAG-AA-Minimum), Reflow bei 320 CSS-px,
  Textüberlauf, Kontrast 4,5:1 (groß 3:1).
- Original-Logo-Assets, freigegebene Fonts/Design-Tokens bewahren.
- Bildfehler (Doppelpersonen, Phantomschrift, falsche Proportionen/Freistellränder) gezielt prüfen,
  keine pauschale Neugenerierung bezahlter Medien.
- Texte sachlich/belegbar: keine erfundenen Referenzen/Leistungs-/Preis-/Termin-/Zertifizierungs-
  garantien; SOLL/Demo/Test/Live unterscheiden.
- Vorhandene Playwright-Tests wiederverwenden; Screenshot-Baselines nur nach Sichtvergleich,
  keine Toleranzen hochsetzen um Fehler zu verbergen.
- Diagnose-/Buildlogs nicht löschen/überschreiben → zeitgestempelt in `.local/diagnostics/logs/`.
- Neue Tools nur nach Bedarf + Lockfile-/Lizenzprüfung; keine pauschalen Installationen.
- Quellen: w3.org/WAI/tips/writing, WCAG22 reflow, playwright.dev test-snapshots, Google helpful-content.

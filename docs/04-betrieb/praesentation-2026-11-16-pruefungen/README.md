# Prüfprotokolle zur Darstellungsprüfung vom 16.11.2026

Vollständige Ausgaben der Läufe zu `docs/04-betrieb/praesentation-2026-11-16.md`.
Alle gegen den lokalen Produktionsbau des Zweigs `claude/eigene-seiten-praesentation`
(`node apps/web/scripts/generate-public-data.mjs`, `npx next build`, `npx next start -p 3311`),
Chromium über Playwright 1.63.0, in der Nacht vom 15. auf den 16.11.2026.

| Datei | Befehl | Zeit (UTC) | Ergebnis |
|---|---|---|---|
| `gleichmacher.json` | `node tools/gleichmacher.mjs http://localhost:3311` | 16.11. 00:5x | 47 Seiten, 32.213 Vergleiche, **0 Abweichungen**, Exit 0 |
| `live-check.json` | `node tools/live-check.mjs http://localhost:3311` | 16.11. 00:5x | 350 Prüfungen, 7 Befunde, Exit 1 — alle sieben einzeln eingeordnet in Abschnitt 6 des Berichts |
| `live-check-mit-pwa.json` | derselbe Lauf gegen einen Bau mit `NEXIFY_PUBLIC_INSTALLATION=public-pwa` | 16.11. 00:15 | 350 Prüfungen, **2 Befunde** (nur der fehlende lokale Shop-Dienst) — belegt, dass die fünf PWA-Befunde aus der Bauweise stammen |
| `make-check.txt` | `make check` | 16.11. 00:5x | Exit 0 |
| `lint.txt` | `node tools/lint.mjs` | 16.11. 00:5x | Exit 0, 265 Dateien, 0 Diagnosen |
| `ds-audit.txt` | `node tools/ds-audit-cli.js` | 16.11. 00:5x | 0 Fehler, 0 Warnungen, Exit 0 |
| `darstellungspruefung.json` + `darstellungspruefung-befunde.json` | eigener Durchgang über 29 Seiten × 390/768/1280/1800 px: waagerechtes Scrollen, Überläufe, Trefferflächen (einschließlich unsichtbarer `::before`-Flächen), `alt`-Texte, tote Verweise, Überschriftenstufen, Platzhaltertexte, Bildfehler, Browserfehler | 16.11. 00:5x | 7 Befunde: 3-mal die bewusst scrollende Shop-Navigation bei 390 px, 4-mal ein 404 des lokal fehlenden Shop-Dienstes |
| `fokusrahmen.json` | echte Tabulatortasten, Bildpunktvergleich mit und ohne Fokus, 9 Seiten | 16.11. 00:5x | **405 Tabstopps, 0 ohne sichtbaren Fokusrahmen** |
| `kopfleiste-kontrast-nachher.json` | Leistengrund an textfreier Stelle als echter Bildpunkt gemessen, beim Blättern über die Filme, 4 Breiten | 16.11. 00:5x | schlechtester Wert 4,70:1 (Claim bei 768 px); vorher 1,00 bis 1,28:1 |
| `schriftgroessen.json` | berechnete Schriftgrößen aller Textknoten, 9 Seiten, 390 und 1280 px | 16.11. 00:5x | 11 Stufen bei 390 px, keine Bruchstelle |
| `tests-zweig.txt` / `tests-main.txt` | `python3 -m unittest discover -s tests` auf dem Zweig und auf `origin/main` (eigener Arbeitsbaum, erzeugte Seitendaten) | 16.11. 00:4x | 46 rote Namen gegen 47 — kein neuer roter Test |

## Runde 4 (16.11.2026, ca. 03:2x–03:4x UTC)

Nach den zwei Befunden des Prüfbots am Pull Request (Fußzeilenverweise in der tragbaren
Ausgabe, Wortlaut im leeren Schaufenster) und der Ursachensuche zu den roten CI-Prüfungen.
Gleicher Aufbau wie oben, neuer Produktionsbau.

| Datei | Befehl | Ergebnis |
|---|---|---|
| `gleichmacher-runde-4.json` | `node tools/gleichmacher.mjs http://localhost:3311` | 47 Seiten, 32.213 Vergleiche, **0 Abweichungen**, Exit 0 |
| `live-check-runde-4.json` | `node tools/live-check.mjs http://localhost:3311` | 350 Prüfungen, dieselben 7 umgebungsbedingten Befunde wie in Runde 3, keiner neu |
| `make-check-runde-4.txt` | `make check` | Exit 0 |
| `lint-runde-4.txt` | `node tools/lint.mjs` | Exit 0, 0 Diagnosen (9 + 91 + 170 Dateien) |
| `ds-audit-runde-4.txt` | `node tools/ds-audit-cli.js` | 0 Fehler, 0 Warnungen, Exit 0 |
| `fussleiste-ausgaben-runde-4.json` | eigener Durchgang: welche Verweise die Fußzeile je Ausgabe trägt und wohin sie führen | Next 58 Verweise mit allen drei Rechtsdokumenten (jedes erreicht sein Dokument), tragbare Ausgabe 55 Verweise, keiner der drei |
| `nachpruefung-runde-4.json` | was die drei Verweise in der tragbaren Ausgabe erreicht hätten; Wortlaut im leeren Schaufenster | 3-mal „Seite nicht verfügbar“; neuer Wortlaut „Zurzeit ist kein Artikel im Schaufenster verfügbar.“ |
| `tests-zweig-runde-4.txt` / `tests-main-runde-4.txt` | `python3 -m unittest discover -s tests`, Zweig und `origin/main` (eigener Arbeitsbaum), unmittelbar nacheinander | Zweig 15 rote Namen, `main` 16 — kein Name nur auf dem Zweig rot, einer neu grün |

Belege erneut erzeugt, weil gebundene Dateien geändert wurden (`SiteFooter.tsx`,
`Workspace.tsx`, `app/layout.tsx`, `shop/Storefront.tsx`): `browser-text-spacing.mjs`
(129 Prüfungen, 0 Befunde), `browser-consent-ui.mjs` (18 Prüfungen, bestanden),
`browser-public-experience.mjs` (70 Routen, 10 private, bestanden). Vier Pins in
`config/acceptance-coverage.json` nachgezogen (`apps/web/app/layout.tsx`,
`apps/web/components/SiteFooter.tsx` und die zwei erneuerten Belegdateien).
`verify_requirements_reconciliation`: 41 auf dem Zweig, 41 auf `main`.

Nicht enthalten, weil nicht gemessen: Läufe gegen `https://nexifyai.de`. Diese Sitzung hat
die Auslieferung nicht aufgerufen.

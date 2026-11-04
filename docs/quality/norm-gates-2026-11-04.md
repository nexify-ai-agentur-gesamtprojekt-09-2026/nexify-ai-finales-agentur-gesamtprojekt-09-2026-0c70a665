# Normschranken für die echte Seite · Stand 04.11.2026

Grundlage: `docs/01-konzept/Design-Norm.md`, ADR-0003 (`dokumentation/adr/0003-durchsetzung-gestaltungsnorm.md`).
Bisher setzte die statische Schranke R-17 nur die Prototypen durch und lief nicht in CI. Die echte Seite
(`apps/web`, von `apps/site` mitgenutzt) war ungeprüft. Keine bestandene Prüfung ist ein DIN-/ISO-Zertifikat.

## Schranken in `make check` (CI-Job `repository`)

| Werkzeug | Prüft | Norm |
|---|---|---|
| `tools/css-norm.mjs` + `tests/css-norm.test.mjs` | Schriftgrößen auf der Typoskala, mindestens 12 px; Abstände im 8-pt-Raster; Fließtext höchstens 68 ch; 1-px-Verlaufsrahmen (`mask-composite`) erlaubt | Design-Norm § Raster, § Typografie; DIN EN ISO 9241-125 (Zeilenlänge); WCAG 1.4.4 |
| `tools/regel-pruefung.js` | Regelwerk gegen das Repository: R-07 Geheimnis-Muster, R-16 Template-Loch, R-17 Raster in Prototypen, R-18 DIN 5008, R-19 | ADR-0003 Stufe 2 |

`--fix` an `css-norm.mjs` rastet auf den nächsten Normwert, bei Gleichstand auf den größeren (wie `tools/design-norm.js`).

## Messung vorher → nachher

| | vorher | nachher |
|---|---|---|
| Werte außerhalb der Skala in `apps/web` | 220 (davon 42 Schriftgrößen unter 12 px) | 0 |
| Textspalten über 68 ch | 10 | 0 |
| Zeilenhöhe Fließtext | 1,55 | 1,6 |
| Zahl und Einheit mit normalem Leerzeichen (DIN 5008) | Reifenrechner, Werkstattsuche, Tagessatz | geschütztes Leerzeichen |
| Befunde `regel-pruefung` | 85 | 0 (5 geprüfte Ausnahmen) |

Die 85 Befunde der Regelprüfung setzten sich zusammen aus:
- **R-17:** 31 Treffer in der historischen Ablage `reference/handoff-n2`. Sie ist laut `docs/architecture/0011` keine Anwendung und wird jetzt ausgenommen, wie das bereits ausgenommene Archiv.
- **R-17:** 22 Treffer, deren einziger Fund ein Attributselektor wie `[style*="padding:36px"]` war, also eine Abfrage und kein gesetzter Abstand. Die Regel ist entsprechend präzisiert.
- **R-17:** 353 echte Rasterabweichungen in 13 Prototypen, korrigiert. `prototypen/MANIFEST.sha256` ist nachgeführt.
- **R-07:** 21 Treffer, alle Fehlalarme. Die Prüfung erfolgte mit maskierter Ausgabe. Es waren Umgebungsvariablen-Zugriffe, Funktionsaufrufe, Variablennamen, Fehlercodes und Testplatzhalter. Code-Verweise erkennt die Schranke jetzt strukturell. Die übrigen Literale stehen als Anzahl je Datei in `tools/regel-pruefung.ausnahmen.json`, ohne Treffertext. Ein zusätzlicher Treffer und eine nicht mehr benötigte Ausnahme sind selbst Befunde. Die Gegenprobe mit einem erfundenen Literal schlägt an.

## Offene Entscheidung E-RADIEN (Owner: Pascal)

Die Token-Radien weichen von der Design-Norm ab (4 / 8 / 16 / 999 px):

| Token | `config/design-tokens.json` | `apps/web/app/masterplan-tokens.css` |
|---|---|---|
| `--radius-button` | 10 px | 12 px |
| `--radius-chip` | 12 px | 14 px |
| `--radius-karte` | 16 px | 18 px |
| `--radius-leit` | 20 px | 24 px |

Dazu kommen `--radius-atelier` mit 28 px und `--radius-home-media` mit 36 px. Zwei Quellen widersprechen sich, und die
sichtbare Rundung aller Flächen hängt daran. `css-norm.mjs` meldet Radien deshalb nur, statt sie zu erzwingen.

Es gibt zwei Möglichkeiten:
- **Norm-Radien übernehmen:** Danach wird die Radius-Regel in der Schranke scharf geschaltet.
- **Abweichung bewusst behalten:** Dann wird die Design-Norm auf die Token-Werte angepasst.

Ebenfalls offen ist `--type-small-size` mit 13 px aus `"small": "13–15/1.5"`. Die Norm sieht für „Klein“ 14 px vor.

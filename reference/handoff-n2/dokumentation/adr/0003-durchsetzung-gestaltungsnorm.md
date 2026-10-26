# ADR-0003 · Durchsetzung der Gestaltungsnorm: dreistufige Schranke

**Status:** angenommen und umgesetzt (28.09.2026) · **Anlass:** Überlappung im Logo und im rechten Seitenfeld des Workspace, Hinweis Pascal · **Umkehrbarkeit:** hoch

## 1 · Kontext

| Faktor | Befund |
|---|---|
| Normbasis | WCAG 2.2 AA (ISO/IEC 40500), EN 301 549, DIN EN ISO 9241-110/-112/-125, `docs/01-konzept/Design-Norm.md` (Raster, Zielgrößen, Schriftgrößen, Zeilenlänge) |
| Ursache der Fehler | Stile stehen direkt in jeder Fläche. Jede Änderung kann die Norm verlassen, und bisher prüfte nur `tools/norm-lint.js` (CSS-Fehler, kein Raster, keine Messung im gerenderten Zustand) |
| Messung 28.09.2026, 1440 px | 23 Flächen · anfangs 1 ohne Befund · 412 Rasterabweichungen · Seitenfeld-Reiter liefen unsichtbar aus dem Feld · Logo abgeschnitten |
| Randbedingung | Design Components verlangen Inline-Stile; ein zentrales Stylesheet ist hier ausgeschlossen |

## 2 · Optionen

| | A · Prüfen und korrigieren in drei Stufen | B · gemeinsame Bausteine für alle Bedienelemente | C · nur Sichtprüfung vor Abgabe |
|---|---|---|---|
| Pro | greift sofort in allen 34 Flächen; findet auch, was Bausteine nicht abdecken (Kontrast, Zeilenlänge, Überlappung im Zusammenspiel) | Abweichung entsteht gar nicht erst | kein Aufwand |
| Contra | Korrektur nach dem Entstehen, nicht davor | viele Umbauten, bricht das Prinzip „eine Fläche, eine Datei“ vorzeitig; deckt Layoutfehler nicht ab | hat genau diese Fehler übersehen |

## 3 · Entscheidung

**A**, B später für die Produktivumsetzung (`packages/ui` im Backend-Auftrag B11).

| Stufe | Werkzeug | Wirkung |
|---|---|---|
| 1 · Quelle | `Design-Norm.md` + `design/tokens.json` | ein Satz Werte |
| 2 · statisch (CI) | `lib/regelwerk.js` `pruefeDateien()`: R-16 Ausdruck im Template-Loch, **R-17 Abstand außerhalb des Rasters** | Pipeline rot |
| 3 · gerendert | `lib/normpruefung.js` `pruefeLayout()`: N-01 Überlappung (zeilenweise, sichtbarer Anteil) · N-02 Abschneiden · N-03 Zielgröße · N-04 Raster (berechnet) · N-05 Kontrast · N-06 Zeichen je Zeile (gezählt) · N-07 waagrechtes Scrollen · N-08 Mindestschrift | Leitstand › Normprüfung, alle Flächen bei 1440/1024/390 px |

## 4 · Folgen (Stand nach Umsetzung)

- Systemweit korrigiert: 412 Abstände aufs Raster, 72 Bedienelemente auf 44 px, Button-Grundwerte in 23 Flächen, 17 Schriftgrößen < 12 px, 102 Absätze auf 54ch (gemessen ≈ 68 Zeichen), Kontrast in 4 Flächen, zwei weitere Portale mit defekter Anmeldeansicht (`{{ !loggedIn }}`).
- Messung nach Korrektur: Workspace, Posteingang und weitere ohne Befund; Rest siehe `docs_dev/abstand-norm-2026-09-28.json` und Leitstand.
- Grenze: Die Laufzeitprüfung sieht nur den Anfangszustand jeder Fläche; geöffnete Menüs und Dialoge brauchen E2E-Schritte (B11).

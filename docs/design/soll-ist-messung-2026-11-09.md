# Soll-Ist-Messung der Live-Oberfläche · 2026-11-09

Gemessen mit Playwright für Python gegen die neue Vercel-Instanz
(`nexify-ai-finales-agentur-gesamtpro-one.vercel.app`, `main` bei 31d2563) auf Desktop 1440 px.
Referenz: `config/design-rules.json` v2.0, `config/design-tokens.json`, Prototypen in `prototypen/`
(gerendert: `NeXify AI one.dc.html`). Das Werkzeug `tools/ds-audit-cli.js` prüft nur die
HTML-Prototypen, nicht die React-Umsetzung. Diese Messung ist kein Abnahmebeleg.

## Ergebnis

| Bereich | Vorgabe | Gemessen (Live) | Bewertung |
|---|---|---|---|
| Laufzeit-Audit (`page_quality_audit.py`) | 0 FEHLER | 0 FEHLER auf 43 Seiten in de, nl, fr, en; 148 WARNUNG und 62 HINWEIS sind `/api/session` 404 und Shop-API 503 (Backend nicht deployt) | erfüllt |
| Kartenfläche | Verlauf `#303634` nach `#262A28`, Rand `rgba(255,255,255,.08)`, Schatten (DS-S-01, Stufe Fehler) | von 21 Karten 1 mit Verlauf, 17 mit Schatten, 0 mit Weichzeichnung; Fläche meist flach `#191B1C` | **Abweichung** |
| Schrift | Geist und Geist Mono (DS-T-01) | Überschriften Plus Jakarta Sans, Fließtext Inter, Mono Geist Mono | **Abweichung**, falls v2.0 maßgeblich bleibt; neuere Atelier-Dokumente in `docs/design/` nennen andere Schriften, Klärung offen |
| Eckenradius | 0, 4, 8, 10, 12, 14, 16, 18, 20 px, Pille, Kreis (DS-R-01, Warnung) | zusätzlich 24, 28 und 36 px | **Abweichung** (Warnung) |
| Akzent | Lime `#C8F04B`, Primärbutton mit Lime-Verlauf, Text `#111312` | Primärbutton Lime-Verlauf vorhanden; Link- und Akzentfarbe gedämpftes Grün `#A8C76A`, Überschriften mit Champagner-Verlauf | teilweise |
| Seitengrund | Graphit-Verlauf, hellere Flächen als der Prototyp | sehr dunkel, nahe Schwarz; weniger Tiefenstaffelung als im Prototyp | **Abweichung** (Eindruck) |
| Hero | Hero-Video | Standbild | durch Inhaber überholt (ED-02) |
| Footer-Einwilligung | gestylte Disclosure | Standard-Pfeil des Browsers | kleine Abweichung |

Das Element in Browser-Standardschrift (Times New Roman) ist nur der unsichtbare `<title>`, kein Fehler.

## Warum nicht sofort umgesetzt

Die Kartenfläche, Radien und Schriften liegen in `apps/web/app/globals.css` und den Komponenten-CSS-Dateien. Diese Dateien
sind in zahlreichen Browser-Belegen per Hash gebunden (`text-spacing`, `browser-exceptions`, `identity-hero`, `legal-footer`,
`consent-ui` und weitere). Eine globale Änderung macht diese Belege ungültig; sie müssen anschließend mit echten Browserläufen
neu erhoben werden (siehe KS-003). Das ist ein eigenes Paket, kein Nebeneffekt.

## Paket DS-REWORK (nächster Schritt)

1. Schriftfrage klären: Geist (Designsystem v2.0) oder Plus Jakarta Sans und Inter (Atelier-Dokumente). Maßgeblich ist die jüngere ausdrückliche Vorgabe.
2. Karten-Token zentral: Verlauf, Rand, Schatten und optionale Glas-Weichzeichnung als Variablen, überall verwenden.
3. Radien auf die Skala zurückführen oder die Skala bewusst erweitern und in `design-rules.json` festhalten.
4. Seitengrund und Flächenstaffelung an den Prototyp angleichen.
5. Browser-Belege neu erheben, Pins mit Begründung nachziehen, `page_quality_audit.py` und Resize-/Textabstands-Prüfung erneut laufen lassen.

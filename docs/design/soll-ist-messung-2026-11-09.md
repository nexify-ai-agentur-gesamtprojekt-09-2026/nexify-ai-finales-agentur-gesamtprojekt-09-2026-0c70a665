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
| Schrift | Inter und Plus Jakarta Sans mit zentraler Rollenverteilung, keine dritte Schrift (`docs/09-final/mastervorgabe-2026-10-29.md`, jünger als Designsystem v2.0 vom 2026-09-29, dessen Geist-Vorgabe damit überholt ist) | Überschriften Plus Jakarta Sans, Fließtext Inter, Mono Geist Mono | erfüllt; `design-rules.json` DS-T-01 ist veraltet |
| Eckenradius | 0, 4, 8, 10, 12, 14, 16, 18, 20 px, Pille, Kreis (DS-R-01, Warnung) | zusätzlich 24, 28 und 36 px | **Abweichung** (Warnung) |
| Akzent | Lime `#C8F04B`, Primärbutton mit Lime-Verlauf, Text `#111312` | Primärbutton Lime-Verlauf vorhanden; Link- und Akzentfarbe gedämpftes Grün `#A8C76A`, Überschriften mit Champagner-Verlauf | teilweise |
| Seitengrund | Graphit-Verlauf, hellere Flächen als der Prototyp | sehr dunkel, nahe Schwarz; weniger Tiefenstaffelung als im Prototyp | **Abweichung** (Eindruck) |
| Hero | Hero-Video | Standbild | durch Inhaber überholt (ED-02) |
| Footer-Einwilligung | gestylte Disclosure | Standard-Pfeil des Browsers | kleine Abweichung |

Das Element in Browser-Standardschrift (Times New Roman) ist nur der unsichtbare `<title>`, kein Fehler.

## Einordnung: zwei Vorgaben stehen gegeneinander

Die flache Kartenfläche `#191B1C` ist kein Zufall. Sie ist das Atelier-Token `color.atelier.surface`
(`config/design-tokens.json`, erzeugt nach `packages/tokens/`), eingeführt mit der Atelier-Richtung vom November
(`docs/design/graphite-atelier-media-migration-2026-11-01.md`, `factory-brand-revision-2026-11-02.md`).
Die Prototypen in `prototypen/` und `design-rules.json` (Stand 2026-09-29 bzw. 2026-10-30) beschreiben dagegen Verlaufskarten
auf hellerem Graphit. `AGENTS.md` nennt die Prototypen als Design und Verhalten, die Mastervorgabe vom 2026-10-29 und die
Atelier-Dokumente sind jünger. Die Abweichung der Tabelle ist deshalb eine Richtungsfrage zwischen beiden Ständen, kein
unabhängiger Umsetzungsfehler. Ein Umbau der Tokens kippt die Atelier-Richtung und alle daran gebundenen Belege.

## Warum nicht sofort umgesetzt

Die Kartenfläche, Radien und Schriften liegen in `apps/web/app/globals.css` und den Komponenten-CSS-Dateien. Diese Dateien
sind in zahlreichen Browser-Belegen per Hash gebunden (`text-spacing`, `browser-exceptions`, `identity-hero`, `legal-footer`,
`consent-ui` und weitere). Eine globale Änderung macht diese Belege ungültig; sie müssen anschließend mit echten Browserläufen
neu erhoben werden (siehe KS-003). Das ist ein eigenes Paket, kein Nebeneffekt.

## Paket DS-REWORK (nächster Schritt)

0. Autoritätsfrage entscheiden: Prototypen (Verlaufskarten auf hellerem Graphit) oder Atelier-Token (flache Fläche `#191B1C`). Erst danach Schritt 2 bis 5.
1. Schriftfrage ist entschieden: Inter und Plus Jakarta Sans gelten (Mastervorgabe 2026-10-29). `design-rules.json` DS-T-01 bei Gelegenheit auf diese Vorgabe nachziehen.
2. Karten-Token zentral: Verlauf, Rand, Schatten und optionale Glas-Weichzeichnung als Variablen, überall verwenden.
3. Radien auf die Skala zurückführen oder die Skala bewusst erweitern und in `design-rules.json` festhalten.
4. Seitengrund und Flächenstaffelung an den Prototyp angleichen.
5. Browser-Belege neu erheben, Pins mit Begründung nachziehen, `page_quality_audit.py` und Resize-/Textabstands-Prüfung erneut laufen lassen.

## Umsetzung DS-REWORK (Prototypen-Richtung, auf Weisung des Inhabers)

Entscheidung: Hochwertige Vorgabe = Prototypen und Designsystem (Inhaberaussage 2026-11-09). Die Regel zum Lime (Richtungswechsel 05.11.2026: nie als Fläche oder Fließtext) bleibt gewahrt; Lime-Button und Champagner-Akzent sind unverändert.

- `config/design-tokens.json` und `packages/tokens/`: Karten- und Kleinkarten-Verlauf `#303634` nach `#262A28`, Seitengrund auf `#242826` mit Lichtflecken, Band `#1E2220`, Graphit-Skala und Atelier-Flächen auf die Graphit-Werte der Vorgabe, Atelier- und Home-Medien-Radius 28/36 px auf 20 px (Skala).
- `apps/web/app/masterplan-tokens.css`: zweite Token-Ebene mit festen Marine-Werten (`#080A0F`, `#0F131A`, `#141A22`) auf Graphit gesetzt.
- 26 flache Atelier-Kartenflächen in acht CSS-Dateien auf `var(--gradient-karte)`.
- Lokale Prüfung mit Kontrastmessung (`page_quality_audit.py --contrast`, de, 43 Seiten, 2 Viewports): 0 FEHLER, 0 WARNUNG.
- Belege neu erhoben, Pins nachgezogen (`pin-rebase-2026-11-09.md`, Nachtrag DS-REWORK).

Offen: Radien 24 px an einzelnen Komponenten und Footer-Pfeil (`DiagnosticConsent.css`) sind nicht Teil dieses Schritts.

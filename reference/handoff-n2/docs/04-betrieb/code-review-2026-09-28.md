# Code-Review · Kerne 28.09.2026 · Prüfkatalog

**Gegenstand:** `lib/entscheidungen.js`, `lib/einstellungen.js`, `lib/ki-muster.js`, `lib/gedaechtnis.js`, `lib/betriebskennzahlen.js`, `lib/normpruefung.js`, `lib/regelwerk.js`, Einbindung in Workspace, Leitstand, NX-Footer. **Verfahren:** Skill `code-review-pruefkatalog`, Gegenproben mit ausgeführtem Code, Mustersuche. **Grenze:** kein Git/MR, kein Node, keine SAST-Werkzeuge – E2 im Browser-Sandkasten.

## Befunde

| # | Bereich | Befund | Schwere | Stand |
|---|---|---|---|---|
| CR-01 | Sicherheit | `aktionsHash` nutzte `JSON.stringify(o, Object.keys(o).sort())`. Das Replacer-Array filtert **jede Ebene** auf die Schlüssel der obersten Ebene – verschachtelte Werte fielen aus dem Hash. Eine freigegebene Buchung `{daten:{betragCent:100}}` hätte mit 999.999 ct ausgeführt werden können. | **Critical (blockierend)** | behoben: kanonische rekursive Serialisierung; EP21 rot → grün, EP22 Reihenfolge |
| CR-02 | Funktion | `cacheSchluessel` abhängig von der Reihenfolge der Parameter → unnötige Cache-Fehlgriffe | Minor | behoben, KM20 |
| CR-03 | Tests | Prüffälle der letzten Kerne entstanden zusammen mit dem Code, nicht vorher; CR-01 hat keiner gefunden | Major (Prozess) | Gegenprobe-Pflicht: je Kern mindestens ein Fall „Änderung in verschachteltem Wert“ bzw. „Reihenfolge egal“ |
| CR-04 | Wartbarkeit | Hilfsfunktion `fnv()` in drei Kernen dupliziert (entscheidungen, ki-muster, lernschleife) | Minor | offen – beim Monorepo-Umzug nach `packages/kerne/hash.js` (B0) |
| CR-05 | Sicherheit | Keine `eval`/`innerHTML`/`new Function` in Kernen; `new Function` nur im Sandkasten-Aufruf des Doku-Generators (nicht ausgeliefert) | – | in Ordnung |
| CR-06 | Datenschutz | Einwilligung (`NX-Footer`): Ablehnen gleich einfach wie Zustimmen, Standard aus, erneute Abfrage bei neuer Fassung/12 Monaten | – | in Ordnung; Wirkung auf Drittinhalte noch nicht verdrahtet (keine vorhanden) |
| CR-07 | Robustheit | `componentDidUpdate` ohne `prevState` in der DC-Laufzeit – Vergleich mit `ps` war wirkungslos | Major | behoben (Seiteneffekt im `setState`-Callback), Lehre im Lernprotokoll |
| CR-08 | Marke | Bildschirmflächen Lime/#242826/Geist, CD-2026 schreibt Neon/#0B1016/Helvetica | – | kein Befund: **Weg B am 26.09.2026 beschlossen** (`CD-Abgleich-NEXIFYAI-CD-2026.md`); Druck/PDF bleibt CD-2026 |

## Abhakliste (Auszug)

- [x] Funktion: Positiv, Negativ, Grenzwert, Rücknahme je Kern
- [x] Sicherheit: Freigabe an Hash gebunden (jetzt vollständig), Hartsperre nur mit Wortlaut, Mandant Pflicht im Gedächtnis
- [x] Keine Geheimnisse (Regel R-07 über alle Dateien: 0 Befunde)
- [x] Normen: R-16 bis R-19 über alle Flächen: 0 Befunde
- [ ] Git-Hygiene: nicht prüfbar (kein Repository)
- [ ] Ausführung unter Node/Vitest: offen (B0)

**Ergebnis:** nach Behebung von CR-01 kein offener blockierender Befund. Freigabe zum Merge erst in GitLab nach grüner Pipeline.

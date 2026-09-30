# Umsetzungsplan – aus Gutachten 1

**Lauf:** a9666976-c613-40a3-92aa-f1d182032925 · **Fall:** NXAI-GESAMT-2026-09-28 · **Stichtag:** 2026-09-28T19:59:35.873Z · **Scope-Hash:** sha256:766db4a17574eab5da73c50f526f4e37acb10808e8dcff20af0ef01af91f6b16 (70 Dateien) · **Rolle:** Agent 2 (gutachten-umsetzungsplan-de) · **Modus:** PHASENEMULATION · **Auftragsnummer:** UNVERIFIED (keine Registry bestätigt)
**Erstellt:** 2026-09-28T20:05:17.394Z · Dokumentnummer nach NEXIFYAI-CD-2026 (Typcode ZG) nicht vergeben – Registry nicht erreichbar.

**Vorstufe:** 01-technisches-gutachten.md · sha256:f44b255c93834dd754f83f50f151993484b94f63c15ff13d3217c32a7bfb0f99 · Status PARTIAL (übernommen mit Einschränkungen B-01…B-13). Dieser Plan ergänzt **keine** neuen Tatsachen; jede Maßnahme führt auf einen Befund zurück. **Planfreigabe ist keine Ausführungsfreigabe.** Kein Deployment, kein Live-Eingriff durch diesen Lauf.

## Maßnahmen
| ID | Befund | Maßnahme | Rolle | Prio | Aufwand | Abhängigkeit | Sicherheitsvorkehrung | Akzeptanzkriterium | Prüfnachweis | Rollback |
|---|---|---|---|---|---|---|---|---|---|---|
| M-01 | B-01, B-03 | Repository nach GitLab, Pipeline **einmal** laufen lassen (tests, render-smoke, alle 12 Jobs) | Backend-Team | P1 | 0,5–1 Tag | Node 22, vitest | keine Live-Stufe, nur Prüf-Jobs | alle Jobs grün oder Befundliste | Pipeline-Log, Artefakt-Hash | Branch verwerfen |
| M-02 | B-02, W-04, W-05 | MANIFEST/UEBERGABE: Zählwerte aus Pipeline-Log übernehmen; Formulierung „definiert, nicht gelaufen“ → „gelaufen am …“ erst nach M-01 | Doku-Rolle | P2 | 1 h | M-01 | – | keine Zahl ohne Logquelle | Diff | Git |
| M-03 | B-04 | Migrationen 001→008 gegen frische Postgres 16 mit pgvector ausführen, dann `tools/mandanten-pruefung.js`, RLS-Test mit 3 Mandanten | Backend-Team | P1 | 1–2 Tage | M-01, Docker | Wegwerf-DB | alle Migrationen ohne Fehler, RLS blockiert Fremdzugriff in 3/3 Fällen | SQL-Log, Testprotokoll | DB löschen |
| M-04 | B-05 | Spectral-Lint auf openapi.yaml; Idempotency-Key für schreibende Auth-Pfade entscheiden (ADR) | API-Rolle | P2 | 0,5 Tag | – | – | 0 Fehler, ≤ 5 Warnungen begründet | Lint-Log | Git |
| M-05 | B-06 | `install.sh` auf einem frischen Vorschau-VPS (kein Live) ausführen, drei Werte eingeben, Health ≥ 60 s | Betrieb | P1 | 1 Tag | M-03 | Vorschau-Host, kein DNS-Live, kein Reboot Produktiv | Health grün, OpenBao enthält Router-Schlüssel, Compose läuft | Terminal-Log, Screenshot | VPS zurücksetzen |
| M-06 | B-07 | Rechtstexte anwaltlich erstellen/prüfen (E12, E2); Freigabe Pascal; erst dann Abschnitte entsperren | Pascal + Kanzlei | P1 (Go-Live) | extern | – | Abschnitte bleiben gesperrt | Freigabevermerk mit Datum | Vermerk | Sperre zurück |
| M-07 | B-08 | Echte Preise in `config/fakten.json`, Kennzeichnung „Beispiel“ entfernen (E3, E5) | Pascal | P1 (Go-Live) | 2 h | M-06 | Inhaltsabgleich-Schranke | keine „Beispiel“-Marke mehr auf öffentlichen Flächen | tools/inhaltsabgleich | Git |
| M-08 | B-10 | Tastatur-Durchgang und Screenreader-Test (NVDA/VoiceOver) auf 5 Kernwegen (Registrierung, Angebot, Aufladung, Shop-Kauf, Workspace-Chat) | QA | P2 | 1 Tag | M-01 | – | alle Wege ohne Maus abschließbar, Fokus nie verloren | Protokoll je Weg | – |
| M-09 | B-11 | SBOM (CycloneDX) erzeugen, `npm audit`/OSV-Scan als CI-Job | Backend-Team | P2 | 0,5 Tag | M-01 | – | 0 kritische Schwachstellen oder Begründung | Scan-Log | – |
| M-10 | B-12 | Sicherung und Wiederherstellung **üben**: Dump → Wiederherstellung auf Vorschau, RTO/RPO messen | Betrieb | P1 (Betrieb) | 0,5 Tag | M-05 | Vorschau | Wiederherstellung < 60 min, Datenverlust < 24 h (Startwerte) | Übungsprotokoll | – |
| M-11 | B-13 | Fragensatz (150 Fälle) einmal gegen echtes Modell Stufe 1 laufen lassen; Ergebnisse in Langfuse | KI-Rolle | P2 | 0,5 Tag + Kosten | M-05, Router-Schlüssel | Kostenobergrenze 10 € | Bestehensquote je Bereich dokumentiert | Langfuse-Export | – |
| M-12 | W-03 | KI-Kennzeichnung im Companion prüfen und ggf. ergänzen (Art. 50 KI-VO, Transparenz – juristische Einordnung offen) | Front-Rolle | P2 | 2 h | – | – | Kennzeichnung sichtbar vor erster Antwort | Screenshot | Git |

## Reihenfolge
M-01 → M-03 → M-05 → M-10 (Nachweiskette Betrieb) · parallel M-04, M-09 · M-06 → M-07 (Rechtskette) · M-08, M-11, M-12 nach M-05.

## Nicht geplant (begründet)
Neue Funktionen, Redesigns, weitere Seiten: kein Befund verlangt sie; sie würden vor M-01…M-05 nur weitere unbelegte Fläche erzeugen.

## Ergebnis
Status **PARTIAL**: vollständig rückverfolgbar, aber Aufwandsspannen sind Schätzungen ohne Teamkalibrierung; M-06 hängt von externer Kanzlei ab (Dauer unbekannt).

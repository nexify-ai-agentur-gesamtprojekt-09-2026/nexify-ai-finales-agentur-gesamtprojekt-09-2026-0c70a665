# Übergabe: NeXify-Plattform – Kerne, Paket, Leitstand

**Erstellt:** 28.09.2026
**Projekt:** dieses Projekt (Entwurfsumgebung, noch nicht im GitLab-Repo)
**Branch / Commits:** nicht verfügbar – hier gibt es kein Git. Erst nach Übernahme ins GitLab-Repo nachtragen.
**Setzt fort von:** keine

## Aktueller Stand
Alle 21 Fachkerne in `lib/` sind geschrieben, an Abläufe angeschlossen und im Leitstand live geprüft: **348/348 Prüffälle grün – nur im Browser**. Kein Kern lief bisher unter Node, gegen eine echte Datenbank, ein echtes Modell oder einen Server. Zuletzt: Review der Tagesänderungen (Rechte für `nx_app` in Migration 007 nachgetragen, Mandantenprüfung zählt alle wirksamen Richtlinien) und API-Übergabe der Anfrage-Pipeline.

## Wichtiger Kontext
- **Hartsperren (R-02):** Reboot, DNS, Firewall nie ohne Einzelfreigabe von Pascal. Prompt-, Preis-, Rechts- und Endabnahme-Entscheidungen bleiben bei Pascal.
- **Kerne haben keine Ein-/Ausgabe** (CI-Schranke `tools/abhaengigkeiten.js`). Netz, Datei, Datenbank nur in Gateway, Worker, MCP.
- **Mandantentrennung** über `mandant_id` + erzwungene RLS + `aktueller_mandant()`; fehlt der Mandant, ist nichts sichtbar (ADR-0008).
- **Keine erfundenen Zahlen** (R-08). Ungeprüfte Werte sind in den Konfigurationen als `ungeprueft` markiert.
- **Leitstand-Grünwert ist nur so gut wie das Laden:** Browser-Modulcache kann alte Stände zeigen – Gegenprobe mit frischem Laden.

## Entscheidungen (mit Begründung)
- **Modularer Monolith** statt Microservices – ein Server, ein Team (ADR-0001).
- **Kein verteiltes Training** – nur LoRA/QLoRA ≤ 14 Mrd. Parameter, passt auf eine GPU (ADR-0005). Verworfen: FSDP/ZeRO jetzt.
- **Eigene Kerne, Bibliotheken an den Rändern** – cockatiel, zod, pg-boss, Supabase Auth (ADR-0007). Verworfen: BullMQ (bräuchte Redis).
- **Gemeinsames Schema mit RLS** statt Schema je Mandant (ADR-0008).
- **Heller Workspace (v2)** als Standard, dunkel als Wahl – Lesbarkeit bei kleiner Schrift.

## Sofortige nächste Schritte
1. `node tools/abhaengigkeiten.js && node tools/code-regeln.js && node tools/mandanten-pruefung.js` auf einem Rechner mit Node laufen lassen und mit dem Browser-Ergebnis vergleichen.
2. Migrationen 001–007 gegen eine leere Postgres 16 mit pgvector laufen lassen, danach Prüffall „Mandant A liest/schreibt B nicht“ mit drei Mandanten (B4).
3. Vertragslücke `KiAntwort` klären (siehe `docs/handoffs/anfrage-pipeline/api-uebergabe.md`, offene Fragen).

## Offene Arbeit
- [ ] Freigaben Pascal: S1 2.0.0, ADR-0005/0007/0008, Grundfreigabe Selbst-Modus, Vertretung.
- [ ] Gateway bauen (B6) mit `POST /v1/requests` nach der API-Übergabe.
- [ ] Worker: Nachholen bei Modellausfall, Langfuse-Scores übertragen, Nachtlauf 03:00 (B9/B10).
- [ ] Paket-Bände 02, 03, 06–10 schreiben; Band 01 wartet auf Pascals Stil-Rückmeldung.
- [ ] DNS-Werte Resend (SPF/DKIM/Rücklauf) aus Dashboard übernehmen – Hartsperre.
- [ ] 43 Fragensatz-Fälle gegen Primärquellen prüfen.
- [ ] Workspace: Arbeitsweise anzeigen/wählen; Tag-Router kennt neue `#tags` noch nicht.
- [ ] `pruefeLayout` (51 Zeilen) in acht Teilprüfungen zerlegen; 81 lange Zeilen laut Grundlinie abbauen.

## Kritische Dateien
| Datei | Zweck |
|---|---|
| `AGENT.md` | Einstieg, Regeln, Kernübersicht |
| `docs/paket/00-hauptdokument.md` | Paket für Claude Code, Annahmen A-01…A-07 |
| `lib/anfrage-pipeline.js` | Ablauf jeder Modellanfrage |
| `lib/regelwerk.js` | Regeln R-01…R-21 als Schranke |
| `db/migrations/004b_mandanten.sql`, `007_mandantentrennung.sql` | Mandanten, RLS, Rechte |
| `api/openapi.yaml` | API-Vertrag (Soll) |
| `config/skills-register.json` | angewendete Skills mit Fundstelle |
| `NeXify Leitstand.dc.html` | Entscheidungen, Prüfungen, Kerne live |
| `learning-captures/gesamtloesung-2026-09-27.md` | Lehren |

## Entdeckte Muster/Konventionen
- Jeder Kern exportiert `FAELLE` (synchron) oder `FAELLE_ASYNC` mit `id`, `art` (Positiv/Negativ/Grenzwert/Rollback), `soll`.
- Fehlerklassen je Kern mit `code` (`E_…`); Beträge immer in ganzen Cent.
- Namen deutsch und fachlich, keine `utils`/`helpers`.
- Neue Tabelle ⇒ Eintrag in `config/mandanten.json` + GRANT an `nx_app`.

## Bekannte Stolperfallen
- Ersetzungen im Skript treffen jedes Vorkommen – Suchtext vorher auf Eindeutigkeit prüfen.
- Eine Summe ist nur grün, wenn jeder Teil geladen ist (Leitstand zeigte vorher „grün“ trotz zwei Ladefehlern).
- RLS ersetzt keine Rechte; erlaubende Richtlinien wirken ODER-verknüpft.
- Subagenten stehen in dieser Umgebung nicht zur Verfügung – Reviews laufen nacheinander im selben Kontext.

## Qualitätsprüfung
Keine Platzhalter · alle Abschnitte gefüllt · keine Geheimnisse · genannte Dateien existieren · nächste Schritte ausführbar · Entscheidungen begründet. Abzug: Git-Metadaten fehlen (kein Repo) → Einschätzung ≈ 85/100.

## Übergabekette
Setzt fort von: keine
Fortgesetzt durch: –

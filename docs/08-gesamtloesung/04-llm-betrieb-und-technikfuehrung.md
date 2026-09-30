# LLM-Betrieb und Technikführung · Abgleich

**Stand 28.09.2026.** Quellen: eingefügte Leitfäden „llm-ops“ und „cto-advisor“. Je Punkt: Stand bei NeXify, Lücke, Entscheidung.

## LLM-Betrieb

| Punkt aus dem Leitfaden | Stand / Entscheidung |
|---|---|
| RAG-Pipeline Zerlegen → Einbetten → Vektorsuche → Antwort | vorhanden: `lib/gedaechtnis.js` (zerlegen, abrufen), `lib/ki-muster.js` (RRF, belegte Antwort) |
| Zerlegen nach Wörtern (500/50) | **nicht übernommen:** zerschneidet Abschnitte; NeXify zerlegt an Überschriften mit Kontext je Teil |
| Chroma lokal | **nicht übernommen** für den Betrieb (zweiter Speicher ohne RLS); nur für lokale Versuche zulässig |
| pgvector mit IVFFlat | **übernommen mit HNSW:** `db/migrations/005_vektoren.sql` – kein Training auf Bestandsdaten nötig; RLS je Mandant; Stichwortindex für hybride Suche; Tabelle je Einbettungsmodell |
| Abstandsschwelle fest (z. B. < 1,5) | **ersetzt** durch `mindestRelevanz` + Belegprüfung; feste Schwellen erst nach Messung |
| Semantischer Cache ab 0,95 Ähnlichkeit | **verschärft:** 0,97, gleiche Prompt-Version, nie für Recht, Rechnung, Auftrag oder Personenbezug (`cacheTrefferErlaubt`, BK09/BK10) |
| Kostenschätzung | **Fehler im Leitfaden korrigiert:** dort wird (Eingabe + Ausgabe) × Eingabepreis gerechnet – das unterschätzt die Kosten. NeXify rechnet getrennt und nur mit belegten Preisen (BK05–BK07) |
| Modellpreise im Code | **nicht übernommen:** Preise nur in `config/llm-verbindungen.json`, Platzhalter bis belegt (B-01) |
| Bewertung per LLM als Richter | **nur ergänzend:** Richter-Urteil ersetzt nicht Fragensatz und Belegprüfung; Richter nie das Modell, das bewertet wird |
| Denkschritte (Chain of Thought) im Prompt | Prompt-Register (`lib/ki-muster.js`), jede Variante über Gate messen |
| Streaming | vorhanden im Router-Vertrag (`streaming: true`) |

## Technikführung

| Punkt | Stand / Entscheidung |
|---|---|
| ADRs | vorhanden: `docs/adr/` 0001–0004 |
| DORA-Kennzahlen | **gebaut:** `dora()` aus Ereignissen (BK01–BK04); Ziele in `config/kennzahlen.json` als Startannahme markiert |
| Technische Schuld priorisieren | **gebaut:** `schuldPrioritaet()` – Risiko × Häufigkeit ÷ Aufwand (BK11/BK12); Quelle: Schuldbuch, Norm- und Regelprüfung |
| Teamgrößen-Verhältnisse, Einstellungsplan | **nicht anwendbar:** Ein-Personen-Betrieb mit Agenten |
| Wochenrhythmus, Quartalsplanung | übertragen auf Tagesbericht 19:30 und Monatsbericht im Leitstand (`config/kennzahlen.json`) |
| Vorfall-Ablauf 0–15 min / 15–60 min / 24 h / 72 h | deckt sich mit Selbstheilung (Design § 3.3) und Meldestelle; Datenschutzvorfall zusätzlich Art. 33 DSGVO (72 h) |
| Werkzeuge DataDog, Jira, Slack | **nicht übernommen:** OTel + Leitstand, GitLab, bestehende Kanäle (OSS zuerst, EU) |
| Zielwerte „Uptime > 99,9 %“, „Coverage > 80 %“ | **nicht als Zusage übernommen** (R-08): erst messen; Mutationsscore ≥ 80 % gilt bereits für Rechen- und Buchungskern |

Neue Dateien: `lib/betriebskennzahlen.js` (12/12, Prüffälle zusammen mit dem Code geschrieben), `tests/betriebskennzahlen.test.js`, `config/kennzahlen.json`, `db/migrations/005_vektoren.sql`.

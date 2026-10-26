# ADR-0006 · Vektorspeicher pgvector, Einbettung lokal und mehrsprachig

**Status:** vorgeschlagen · **Datum:** 28.09.2026 · **Umkehrbarkeit:** mittel (Modellwechsel = Neuaufbau; Speicherwechsel = Umzug der Vektoren)

## 1 · Kontext
Inhalte sind überwiegend deutsch, dazu NL, FR, EN. Mandantentrennung ist Pflicht (DSGVO). Es gibt bereits Supabase-Postgres mit RLS. Die Datenmenge ist klein (Handbücher, Angebote, Mails eines Kleinbetriebs), nicht gemessen.

## 2 · Optionen
| | A · pgvector + lokales multilinguales Modell | B · Qdrant self-hosted + lokales Modell | C · Pinecone + OpenAI-Einbettungen |
|---|---|---|---|
| Pro | eine Datenbank, RLS, Transaktionen, Hybrid-Suche in einer Abfrage | bessere Filter-/Skalierungswerkzeuge, Quantisierung | kein Betrieb |
| Contra | Grenzen bei sehr großen Mengen | zweiter Speicher mit eigener Rechte- und Sicherungslogik | Drittland, laufende Kosten, Modellwechsel durch Anbieter |

## 3 · Entscheidung
**A.** Modell `paraphrase-multilingual-mpnet-base-v2` (768 Dimensionen, normalisiert, Batch 32, CPU). Qdrant erst bei den Schwellen in `config/rag.json → speicher.wechselNachQdrant`. C ausgeschlossen (R-06).

## 4 · Folgen
Migration 006; `wissen_vektor_1024` aus 005 bleibt leer und fällt mit 007 weg. Abnahme über den goldenen Satz (Recall ≥ 0,8 für deutsche Fragen); verfehlt → Vergleich mit multilingual-e5-base.

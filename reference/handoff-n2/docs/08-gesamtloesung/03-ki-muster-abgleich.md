# KI-Anwendungsmuster · Abgleich mit dem NeXify-Stand

**Stand 28.09.2026.** Quelle: eingefügter Leitfaden „LLM Application Patterns“ (angelehnt an Dify). Je Muster: was es bei NeXify schon gibt, was fehlte, Entscheidung. Kern für die Lücken: `lib/ki-muster.js` (19/19 Prüffälle, zusammen mit dem Code geschrieben).

| Muster | Bei NeXify vorhanden | Lücke | Entscheidung |
|---|---|---|---|
| Zerlegen (fest, semantisch, rekursiv, strukturbewusst) | `zerlegen()` in `lib/gedaechtnis.js`: strukturbewusst an Überschriften, 300 Token, 40 Überlappung, Kontext je Teil | Größenvergleich fehlt | **übernehmen wie gebaut**; 200/300/500 gegen Fragensatz messen, erst dann festlegen |
| Vektordatenbank | LightRAG (vorhanden); Supabase-Postgres | Wahl nicht dokumentiert | **pgvector in der bestehenden Supabase** für Plattformdaten (ACID, RLS je Mandant, keine zweite Datenbank); LightRAG für Dokumentwissen. Pinecone (US-Dienst) scheidet aus – EU-Pflicht R-06 |
| Einbettungsmodell | Pflichtfeld in den Metadaten (`gedaechtnis.js`) | Modell nicht gewählt | **lokales Open-Source-Modell, mehrsprachig** (DE/NL/EN/FR), Stufe 0 auf CPU; Kosten nur Rechenzeit. Auswahl nach Messung, keine Zahlen ohne Messung |
| Hybride Suche (semantisch + Stichwort, RRF) | nur lexikalisch im Kern | fehlte | **gebaut:** `rrf()` (KM01, KM02) |
| Mehrfach-Anfrage, Kompression | – | – | **nicht jetzt** (YAGNI): erst wenn der Fragensatz eine Trefferlücke zeigt |
| Antwort nur aus Kontext, mit Quellen | Workspace zeigt Fundstellen | keine Prüfung der Belege | **gebaut:** `ragPrompt()` + `belegPruefung()` – erfundene Fundstelle oder Aussagen ohne Beleg = nicht ausliefern (KM03–KM06) |
| ReAct / Function Calling | MCP-Werkzeuge mit Regelprüfung | – | **Function Calling über MCP**, kein ReAct-Textformat (strukturierter, prüfbar) |
| Plan-and-Execute | `lib/langlauf.js` (Pipeline, Checkpoints, Freigabe) | – | **bestehend**, Neuplanung nur über Freigabe |
| Mehr-Agenten mit Kritiker | Sammler ∥ Rechercheur → Analyst → Architekt → Director | eigener Kritiker fehlt | Kritik = `belegPruefung()` + Regelwerk, kein zusätzlicher Agent |
| Prompt-Vorlagen, Versionen, A/B | – | fehlte | **gebaut:** Register mit unveränderlichen Versionen, Freigabe nur Pascal, stabile A/B-Zuteilung je Nutzer, Messung je Version (KM07–KM12); Ausgang A/B = Bewertungs-Gate der Lernschleife |
| Kennzahlen, Tracing | OTel-GenAI-Konventionen, Collector ohne Inhalte | – | **bestehend**; Prompt-Ausschnitte (wie im Leitfaden) werden **nicht** geloggt – Inhalte bleiben aus dem Log (R-07, DSGVO) |
| Bewertung (Relevanz, Belegtheit, Sicherheit) | Bewertungs-Gate in `lib/lernschleife.js` | Belegtheit maschinell | `belegPruefung()` liefert die Belegtheit für das Gate |
| Cache | – | fehlte | **gebaut:** nur Temperatur 0, nie bei Personenbezug, Schlüssel enthält Prompt-Version (KM13–KM15). Ablage Postgres, kein Redis (`backend-architektur.md`) |
| Ratenbegrenzung, Wiederholung | `wartezeitMs()` (Backoff), MCP-Grenzen | – | **bestehend** |
| Rückfall auf andere Modelle | 9router hochstufen | Regeln verteilt | **gebaut:** `rueckfall()` – Schemafehler nie mit anderem Modell wiederholen, Budget prüft je Stufe, `#stopp` beendet (KM16–KM19) |

**Bewusst abweichend vom Leitfaden:** keine US-Anbieter für Vektoren oder Einbettungen; kein Protokollieren von Prompt-Text; kein automatisches A/B-Umschalten ohne Gate und Freigabe.

## Nachtrag 28.09.2026 · RAG-Methodik (Skill rag-pipeline-engineering-grundlagen)

| Punkt | vorher | jetzt |
|---|---|---|
| Eltern-Kind-Zerlegung | fehlte | `elternKind()`, Tabellen bleiben ganz, 15 % Überlappung |
| Delta-Sync, verwaiste Vektoren | fehlte | `syncPlan()` per Inhalts-Hash; Modellwechsel erzwingt Blue-Green-Neuaufbau |
| Anfrage-Routing | feste Gewichte | `routing()`: Nummern → Stichwort stärker, Fragen → Bedeutung stärker |
| Schwelle statt fester Menge | nur `mindestRelevanz` | `zweistufig()`: 50 Kandidaten → Bewertung → Schwelle 0,5, höchstens 8 |
| Güte getrennt messen | nur Belegprüfung | `goldenerSatz()`: Precision/Recall für den Abruf, Belegtreue/Relevanz für die Antwort, mit benannter Ursache |

Konfiguration: `config/rag.json`.

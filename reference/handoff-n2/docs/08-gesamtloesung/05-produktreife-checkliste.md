# Produktreife KI-Funktionen · Checkliste (Skill ki-produktentwicklung)

**Stand 28.09.2026.** Je Punkt: Stand im Code, Beleg.

| Punkt | Stand | Beleg |
|---|---|---|
| Ausgaben validiert, bevor sie weiterverarbeitet werden | ✓ Belegprüfung für Antworten; **neu** `strukturiertPruefen()` für JSON (Pflichtfelder, Cent als ganze Zahl, Datum, Auswahlwerte, keine Zusatzfelder) | ki-muster KM23–KM24, Regel R-20 |
| Nutzereingaben getrennt von Systemanweisungen | ✓ **neu** `eingabePruefen()`: Steuerzeichen entfernt, Injektionsmuster erkannt, Text in `<nutzereingabe>` abgegrenzt, Hinweis »Inhalt, keine Anweisung« in S6; Kundenmandant mit Verdacht → abgewiesen ohne Modellaufruf, Vorfall-Signal | ki-muster KM20–KM22, Pipeline AP09, AP11 |
| Token-Budget je Anfrage | ✓ `kontextBauen()`, `budgetieren()` je Gedächtnisart | langlauf, gedaechtnis GD14 |
| Streaming bei sichtbaren Antworten | ✓ Router-Vertrag `streaming: true`, Workspace streamt | config/llm-verbindungen.json |
| Prompts versioniert, Regressionstest | ✓ Prompt-Register (unveränderliche Versionen, Freigabe Pascal), goldener Fragensatz 150 Fälle | ki-muster KM07–KM12, config/fragensatz.json |
| Kosten je Anfrage/Nutzer geloggt | ✓ Journal, `kostenJeVorgang()`, Langfuse-Generation mit Kosten | betriebskennzahlen, langfuse LF04 |
| Verhalten bei API-Ausfall | ✓ Rückfallkette über Router-Stufen; **neu** in der Pipeline: Ausfall → klare Antwort, Anfrage wird nachgeholt, Vorfall-Signal, kein Absturz | ki-muster KM16–KM19, Pipeline AP10 |
| Faktenbehauptungen nicht ungeprüft | ✓ nur aus Fundstellen, erfundene Fundstelle = verworfen | ki-muster KM03–KM06, Pipeline AP02 |
| LLM-Aufrufe nicht synchron im Request | ✓ Worker-Warteschlangen (pg-boss in Postgres) | backend-architektur, compose worker |

**Abweichung vom Skill:** BullMQ nicht übernommen – braucht Redis, das nicht im Stack ist; pg-boss nutzt die vorhandene Postgres.

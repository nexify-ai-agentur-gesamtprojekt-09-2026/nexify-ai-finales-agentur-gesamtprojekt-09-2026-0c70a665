# ADR-0004 · Gedächtnis der Agenten: vier Arten, ein Entscheidungskern

**Status:** vorgeschlagen · **Datum:** 28.09.2026 · **Umkehrbarkeit:** hoch für den Kern, mittel für die Wahl der Dienste (Neuindizierung)

## 1 · Kontext

| Faktor | Befund |
|---|---|
| Vorhanden | LightRAG (Wissen), AgentMemory (Lessons), Cognee (Gedächtnis aus Mails/Chats, Status `unbelegt`), Kontextschichten S1–S6 in `config/llm-verbindungen.json`, `kontextBauen()` in `lib/langlauf.js`, Lernschleife |
| Lücke | keine Regel, **was** gespeichert, gefunden, in den Kontext gelegt und **gelöscht** wird; drei Dienste ohne gemeinsamen Mandantenfilter; kein Konfliktfall (Agent überschreibt Pascals Tagessatz) |
| Grundsatz aus der Fachlage | Gedächtnisfehler sind meist Abruffehler, nicht Speicherfehler. Gegenmittel: erst Metadaten filtern, dann Relevanz; Zeitgewicht; Konflikte beim Speichern erkennen; Token-Budget je Art; Einbettungsmodell in den Metadaten; kontextuelles Zerlegen |
| Pflichten | DSGVO: Mandantentrennung, Datenminimierung, Speicherbegrenzung; `AGENT.md` § 0.6 |

## 2 · Optionen

| | A · Kern entscheidet, Dienste speichern | B · ein Vektorspeicher für alles | C · nur Kontextfenster + Chatverlauf |
|---|---|---|---|
| Pro | jede Art im passenden Dienst; Regeln (Mandant, Frist, Konflikt) an einer prüfbaren Stelle; Dienste austauschbar | ein System | kein Aufbau |
| Contra | ein Kern mehr | Fakten, Episoden und Abläufe verlangen verschiedene Suche und Lebensdauer („eine Art für alles“ ist ein Anti-Muster); Löschfristen je Eintrag schwer | vergisst bei jedem Lauf; widerspricht Langlauf und Lernschleife |

## 3 · Entscheidung

**A.** `lib/gedaechtnis.js` mit vier Arten (Arbeit, episodisch, semantisch, prozedural). Speichern nur mit Mandant, Quelle, Einbettungsmodell (für Wissen und Episoden) und Löschfrist bei Personenbezug. Abruf: Mandant ist Pflicht, Metadaten vor Relevanz, abgelaufene und ersetzte Fakten raus, fremdes Einbettungsmodell raus, dann Relevanz · Zeitgewicht · Wichtigkeit. Konflikte: ein Wert ersetzt einen anderen nur bei gleichem oder höherem Quellrang und jüngerem Datum, sonst **strittig** → Karte im Entscheidungs-Postfach (ADR-0002). Vergessen täglich mit Protokoll.

**Bewusst nicht jetzt:** „alles für immer speichern“; Zerlegen ohne Abruftest; LLM-erzeugter Kontext je Teil und Reranker. Die letzten beiden kommen erst nach Messung gegen den Fragensatz.

## 4 · Folgen
- Neu: `lib/gedaechtnis.js` (17/17), `config/gedaechtnis.json`, `tests/gedaechtnis.test.js`. Ehrlich: Die Prüffälle entstanden zusammen mit dem Code, nicht davor.
- Anbindung im Backend-Auftrag: B6 (Arbeitsgedächtnis), B7 (Episoden aus dem Posteingang), B9 (prozedural aus der Lernschleife), MCP-Werkzeug `wissen.suche` ruft `abrufen()`.
- Offen: Wahl des Einbettungsmodells (EU, Open Source), Messung der Teilgrößen 200/300/500 Token, Cognee-Status belegen.

## 5 · Prüfliste
- [x] Anforderungen und Grenzen · [x] drei Optionen mit Gegenposition · [x] einfachere Alternative geprüft · [x] Datenschutz in der Abwägung · [ ] Freigabe Pascal

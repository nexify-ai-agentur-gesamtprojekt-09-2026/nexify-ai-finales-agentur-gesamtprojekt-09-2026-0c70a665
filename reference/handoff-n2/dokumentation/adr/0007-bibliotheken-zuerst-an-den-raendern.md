# ADR-0007 · Bibliotheken zuerst – an den Rändern; reine Kerne bleiben eigener Code

**Status:** vorgeschlagen · **Datum:** 28.09.2026 · **Anlass:** Skill »Software Architecture Development« (Clean Architecture, DDD, Library-First)

## 1 · Befund (gemessen 28.09.2026, 21 Kerne in `lib/`)
| Regel | Stand |
|---|---|
| Datei ≤ 200 Codezeilen (ohne Prüffälle) | erfüllt – größte: langlauf und posteingang je 159 |
| Funktion ≤ 50 Zeilen | 1 Ausnahme: `normpruefung.pruefeLayout` 51 |
| Verschachtelung ≤ 3 | erfüllt – höchstens 3 (regelwerk, gedaechtnis) |
| keine Sammelnamen (utils, helpers …) | erfüllt – jeder Kern fachlich benannt |
| Geschäftslogik getrennt von Oberfläche und Datenbank | erfüllt – Kerne ohne I/O (`tools/abhaengigkeiten.js`) |
| Lesbarkeit | **Schwäche:** 81 Zeilen über 200 Zeichen (dichte Einzeiler) |

## 2 · Entscheidung
**Kerne** (`lib/`) bleiben eigener Code: Sie sind die fachliche Domäne (Rechenkern, Regelwerk, Postfach, Lernschleife …), laufen ohne Abhängigkeiten im Browser und in Node und sind die geprüfte Stelle für Entscheidungen. **An den Rändern** (Gateway, Worker, MCP) gilt Bibliotheken zuerst:

| Aufgabe | Bibliothek im Dienst | Kern entscheidet weiter |
|---|---|---|
| Wiederholung, Circuit Breaker, Timeout | cockatiel (MIT) | welche Fehler wiederholt werden (`wiederholen()`, `rueckfall()`) |
| Eingabe- und Ausgabeschemata der API | zod (MIT), aus `api/openapi.yaml` erzeugt | fachliche Prüfung (`strukturiertPruefen()` bleibt für Modellausgaben im Kern) |
| Warteschlangen | pg-boss (MIT) | Lease, Budget, Zustände (`langlauf.js`) |
| Anmeldung, Rollen | Supabase Auth + RLS | Rechte im Regelwerk |
| Hash, Zufall | node:crypto (SHA-256) | Kerne nutzen FNV nur zur Änderungserkennung |
| Mail | Resend-SDK | Zustellregeln (`versand.js`) |

## 3 · Sperrklinke
`tools/code-regeln.js` in CI: keine neuen Verstöße; breite Zeilen nur bis zur Grundlinie (`tools/code-regeln.grundlinie.json`), jede Änderung an einem Kern baut sie ab, nie auf.

## 4 · Folgen
Kein Umbau im Bestand erzwungen; Abbau der breiten Zeilen bei jeder Änderung. `pruefeLayout` wird bei der nächsten Änderung in Teilprüfungen (N-01 … N-08) zerlegt.

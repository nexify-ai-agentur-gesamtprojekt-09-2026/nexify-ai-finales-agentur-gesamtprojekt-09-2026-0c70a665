# Regelverzeichnis

> Automatisch erzeugt am 2026-09-29 aus `config/`. Nicht von Hand ändern – Quelle ändern.

Version 1.0.0. Durchsetzung: **gateway**: jede schreibende Anfrage an /v1 und jedes MCP-Werkzeug ruft pruefe() vor dem Seiteneffekt · **director**: lib/langlauf.js ruft pruefe() vor starte() jedes Schritts mit Seiteneffekt · **ci**: node tools/regel-pruefung.js → pruefeDateien() über das Repository; Befund = Pipeline rot · **protokoll**: jede Entscheidung als Ereignis regel.entscheidung (Aktion, Akteur, Regeln, Ergebnis) ins ZK-Log; Inhalte nur als Referenz · **ausfall**: Regelwerk nicht erreichbar = gesperrt (fail-closed) · **pipeline**: lib/anfrage-pipeline.js ruft pruefe() vor dem Modellaufruf und vor der Auslieferung

| Regel | Quelle | Inhalt | Folge |
|---|---|---|---|
| R-00 | Architektur | Nur registrierte Aktionstypen | gesperrt |
| R-01 | AGENT.md §0.1 | Endabnahme nur durch Pascal | gesperrt |
| R-02 | AGENT.md §0.2 | Reboot, Live-DNS, vollständige Firewall-Änderung nur mit Einzelfreigabe ≤ 24 h | gesperrt |
| R-03 | AGENT.md §0.3 | Live nur mit Vorschau, Health 60 s, E3, ausgeführtem Rollback, Gutachten, Endabnahme | gesperrt |
| R-04 | AGENT.md §0.4 · GoBD | Geld nur über Rechenkern, idempotent, Storno als Gegenbuchung | gesperrt |
| R-05 | AGENT.md §0.5 · KI-VO Art. 50 (Register N-08) | KI-Inhalte gekennzeichnet; Mails mit festem Hinweissatz | gesperrt |
| R-06 | AGENT.md §0.6 · DSGVO | Verarbeitung in der EU; Personenbezug an Drittland nur mit AVV/SCC | gesperrt |
| R-07 | AGENT.md §0.6 | Keine Geheimnisse in Inhalt, Log, Repo – nur OpenBao-Verweis | gesperrt |
| R-08 | AGENT.md §0.8 · UWG §5 | Keine Zahl ohne Beleg oder Beispiel-Kennzeichnung | gesperrt |
| R-09 | config/langlauf.json sperren | Preise, Rechte, Rechtstexte nie automatisch | mensch |
| R-10 | lib/lernschleife.js | Lernen nur über Bewertungs-Gate; 100 % nur Pascal | gesperrt|mensch |
| R-11 | lib/tagrouter.js | #stopp hat Vorrang vor allem außer Lesen | gesperrt |
| R-12 | config/llm-verbindungen.json | Tagesbudget des Agenten | gesperrt |
| R-13 | Server-Bereinigung | Löschen nur mit geprüfter Sicherung, Inventar, Probelauf und Pascal | gesperrt|mensch |
| R-14 | backend-architektur.md §5 | Vorschau-Deploy nur mit grüner, nicht leerer Suite | gesperrt |
| R-15 | Gutachten WK-18 | Dienst »vorhanden« nur mit belegt_am | CI rot |
| R-16 | Design Components | Keine Ausdrücke in Template-Löchern | CI rot |
| R-17 | Design-Norm § Raster · DIN EN ISO 9241-112 | Abstände (padding, margin, gap) nur auf dem 4/8-px-Raster | CI rot |
| R-18 | DIN 5008 · CLAUDE.md | Zwischen Zahl und Einheit ein geschütztes Leerzeichen, auch in erzeugtem Text | CI rot |
| R-19 | Design Components / JavaScript-Klassen | Keine doppelt definierten Lebenszyklus-Methoden – die spätere überschreibt still die frühere | CI rot |
| R-20 | lib/ki-muster.js belegPruefung · lib/anfrage-pipeline.js | Belegte Antworten nur ausliefern, wenn die Belegprüfung bestanden ist | gesperrt |
| R-21 | Skill computer-use-agenten | Bildschirmsteuerung nur ohne API, nur in Sandbox (Netz intern, nur lesend, keine Host-Zugänge, ≤ 50 Schritte, Kostengrenze); folgenreiche Aktionen nur nach Freigabe | gesperrt|mensch |

## Lernformen

| Form | Ziel | Übernahme |
|---|---|---|
| L1_regel | config/regelwerk.json bzw. Prompt-Schicht S2 | Merge Request, Freigabe Pascal |
| L2_wissen | LightRAG (Fundstelle) + AgentMemory (Lesson) | automatisch, mit Quelle und Datum |
| L3_skill | Skill-Entwurf (Ablauf) im Skill-Verzeichnis | Freigabe Pascal |
| L4_test | Prüffall in lib/*.js FAELLE bzw. evals | Merge Request, rot vor grün |
| L5_praeferenz | DPO-Paare je Bereich, nur mit Einwilligung | Training → promotion() → rollout() |

Gate: Toleranz 0 Punkte, Sicherheit 100 %, Kosten ≤ 1.1× · Canary 0 → 5 → 25 → 100 %, je Stufe 48 h · MCP 2026-07-28, 10 Werkzeuge

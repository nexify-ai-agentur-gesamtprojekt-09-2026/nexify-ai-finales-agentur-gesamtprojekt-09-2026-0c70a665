# Workspace Agents als native NeXify-Ausführungsebene — 10.11.2026

**Contract:** NEXIFY-WORKSPACE-AGENTS-20261110 · **Status:** AGENT-STUDIO-ENTWURF/INTEGRATION ZU PRÜFEN, kein veröffentlichter Workspace Agent belegt. **Owner:** AIFly ORACLE (ChatGPT Dot); Implementierung über tatsächlich verfügbare Codex-/Work-/Workspace-Agents-Tools; QA unabhängig.

## Begründung

Das bisherige kritische Verhalten besteht darin, dass der Nutzer Geschäftsergebnisse formuliert, das System aber nur ausdrücklich genannte Teilaufgaben ausführt und implizite technische Vor- und Folgeabhängigkeiten übersieht. Prompt-Ergänzungen ohne dauerhaften Intent-Closure-Test und ausführbaren Worker sind unzureichend.

Der Nutzer hat einen ChatGPT-Workspace-Agent-Entwurf mit der ID `agt_6af33958f2308191bfa2b8d8f682fe0e` genannt. Dieser Entwurf ist mangels entsprechendem Agent-Studio-Lese-/Schreibtool **nicht** als inspiziert, veröffentlicht, mit API verbunden oder produktiv tätig anzusehen.

## API-Kanal konkretisiert · 10.11.2026

**Vom Unternehmer im Agent Studio bereitgestellte API-Channel-ID:**
`agtch_6af34278a84081919442f7c92455b232`

**Trigger-URL:**
`https://api.chatgpt.com/v1/workspace_agents/agtch_6af34278a84081919442f7c92455b232/trigger`

**Verbindliche Sicherheits-/Betriebsregeln:**

- Die ID ist eine Endpointkennung, **kein Bearer-Token** und kein Nachweis eines ausgeführten Runs.
- Für den Liveaufruf muss der Eigentümer im ChatGPT Workspace über `Admin > Access tokens` ein Token mit **Workspace Agents**-Scope bereitstellen; normaler OpenAI-Platform-Key ist falsch. Geheimnis ausschließlich in vorhandenem Hostinger-Secret-Store, nie im Repository/Slack/Chat.
- `POST` mit `Authorization: Bearer ...`, JSON `input`, optional stabiler `conversation_key` und `Idempotency-Key`. `202 Accepted` ist nur Queue-ACK und enthält **weder Ergebnis noch öffentlichen Run-ID**; Ziel-Readback anhand eigener Request-ID separat nachweisen.
- Der native **15-Minuten-Zeitplan** wurde nach Nutzerbericht im Agent Studio bereits eingerichtet. **Keinen zweiten Hostinger-Timer** aktivieren; vorhandene native Runs prüfen. Hostinger-Trigger dient vorerst ausschließlich als manuell getestete, optionale Integrationsmöglichkeit und braucht bei späterem Einsatz gesonderte Lease-/Watchdog-/Kostenprüfung.
- **Status 10.11.:** Kanal-ID gebunden und Integrationscode offline geprüft. Token im ausführenden System und der vollständige live getestete API→Agent→Ergebnisweg sind noch **nicht bestätigt**.
- Fehlerfälle: 401 Token fehlt/falsch, 403 Tokenbesitzer ohne Zugriff, 404 falscher Kanal, 409 Agent nicht lauffähig; 202 ohne Ergebnis bedeutet Ziel-/Approval-/App-Rechte prüfen.

Primärquellen: https://developers.openai.com/workspace-agents/authentication und https://developers.openai.com/cookbook/examples/chatgpt/workspace_agents/workspace-agents-api-trigger

## Zielidentitäten

- **AIFly ORACLE (ChatGPT Dot):** führende unternehmerische Strategie und GOAL-Koordination.
- **AIFly RELAY | NeXify Operations & Agent Builder:** native ChatGPT Workspace Agent-Verlängerung, erreichbar im ChatGPT-Kanal und nach geprüfter Einrichtung per API-Channel; erkennt fehlende Voraussetzungen und sinnvoll neu zu bauende Agenten.
- **NeX Agentic AI und Codex/Work:** tatsächliche ausführende Worker/Fachagenten, innerhalb verifizierter Tenant-, Tool- und Laufzeitrechte.
- Kein zweites führendes Task-Register, Brain oder Cockpit. Fortsetzung über bestehendes Register, Lease, ACK, Run-Finalizer, eventbasierte Prüfungen.

## Arbeitsvertrag und Agenten-Builder

1. Als fachliches Ziel verstehen und Abhängigkeiten vollständig herleiten: explizite Solls, notwendig abgeleitete Voraussetzungen, nachgelagerte Geschäftswege und optionale Ideen getrennt.
2. Exakte verfügbare Agenten/Skills/Plugins/Work/Codex/Hostinger-MCP inventarisieren. Bei klarer fehlender wiederverwendbarer Fähigkeit den **bestehenden** Agent-Builder-/Codex-Workspace-Agents-Plugin-Pfad prüfen; Agentendraft mit Rolle, Tool-Scopes, Inputs/Outputs, Tenant, Owner/Writer/Reviewer, Tests, Kosten und Recovery schaffen.
3. Agenten im tatsächlichen Workspace Agent Studio nur bei vorhandenen Rechten ändern/veröffentlichen. Ein Agentenentwurf/Pseudotool ist kein echter laufender Agent. Rechte-/Kontozuweisungen und öffentliche Veröffentlichung bleiben am geltenden Owner-Gate.
4. Erfolgreicher Pilot benötigt Preview, realen Ausgangs- und Folgeprozess, API/Slack-/Task-ID-Rückweg, negativen Tenant-/Replay-Test, Run-Finalizer und unabhängigen Reviewer.
5. `nexifyai.cloud`-Übergangswebsite bis geprüfter Neugestaltung und Rollback unverändert lassen; `nexifyai.de` getrennt. Studienkolleg Aachen strikte Isolation und keine Videos. Sicherheit/Disk/Oracle-Feed vor kostenintensiver Skalierung.
6. Native ChatGPT Workspace Agent-Zeitplan, wenn 15-Minuten-Frequenz wirklich angeboten wird; sonst idempotenter Trigger durch bereits autorisierten Hostinger-Cron/Timer alle 15 Minuten. Nicht beide zugleich. API erfordert `agtch_...`, Workspace-Agent-Access-Token und veröffentlichte Version. HTTP 202 ist nicht der Ausführungsbeleg. Watchdog und Kostenlimits getrennt.
7. Offizielle Anleitungen aktuell halten und keinen alten OpenAI Agent Builder neu einsetzen: dessen Abschaltung ist für den 30.11.2026 angekündigt.

## Abnahmeschnittstelle

`goal_id, task_id, tenant, source, explicit_requirements, derived_requirements, dependency_graph, owner, writer_lease, actor, decisions, actions, tests, evidence, next_action, next_trigger, monitor, acceptance_state`.

Kein `DONE` ohne tatsächlich eingetretenen Geschäftsausgang, getestete notwendige Abhängigkeiten, realen Readback und eine gesicherte nächste Aktivierung. Negative Tests: doppeltes Event, fehlender Agent/Plugin/Tool, verwaister Task, Cross-Tenant-Daten, Hostinger-Ausfall, API 202 ohne Ergebnis, pausierter Dot und Domain-Cutover ohne fertiges Backend.

## Quellen

- https://help.openai.com/en/articles/20001143-chatgpt-workspace-agents-for-enterprise-and-business
- https://developers.openai.com/cookbook/examples/chatgpt/workspace_agents/workspace-agents-api-trigger
- https://developers.openai.com/api/docs/deprecations
- `docs/automation/intent-closure-contract.md`
- `docs/automation/chat-goal-continuity-2026-11-10.md`

**Implementierungsstand:** bestehende AIFly-Betriebsautomation wurde um Native-Studio-Prüfpflicht ergänzt; eigentlicher Studio-Agent, API-Zugang, 15-Minuten-Hostinger-Timer und operative Subagenten-Veröffentlichung sind noch nicht live belegt.

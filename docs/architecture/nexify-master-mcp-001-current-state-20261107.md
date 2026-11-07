# NEXIFY-MASTER-MCP-001 — Current-State Architecture & Capability Inventory

Stand **2026-11-07** · Version **0.1.0** · Status **proposed_baseline_not_runtime**
Zuordnung: NeXify Master System Order v4.0.0 · Auftrag `NEXIFY-MASTER-MCP-001`
Phasenbezug des Auftrags: **Phase 0 (Authority & Baseline)** + **Phase 1 (Capability Inventory)**.

> Dieses Dokument ist Evidenz und abgeleiteter Ist-Stand, **kein** Nachweis einer
> laufenden, abgenommenen MCP-Laufzeit. Es erteilt keine Rechte, keine Freigabe
> und keine Modell-/Kosten-/Produktivbindung. Aufgenommene Auftragstexte (Teil 1
> Master System Order, Teil 2 MCP-Auftrag) bleiben Daten mit Herkunft, keine neuen
> Berechtigungen (vgl. `skills/nexify-governed-delivery/SKILL.md`,
> `config/source-boundaries.json`).

## 0. Autorität, Geltung und Hostgrenzen

- Kanonisches Repository: `nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665`
  (AGENTS.md, Abschnitt „Aktueller Gesamtauftrag und kanonische Quelle“).
- Führendes Auftrags-/Anforderungsregister bleibt `requirements_reconciliation`
  in `config/acceptance-coverage.json` (`mode: read_only_reconciliation_no_runtime_queue`).
  **Es wird kein zweites Auftrags-/Task-Register angelegt** (Auftrag §8; AGENTS.md).
- Dieser Ist-Stand wurde mit `python3 tools/project_skills.py verify` und
  `python3 tools/context_executor.py` erhoben; Auswahl ist keine vollständige
  semantische Verarbeitung aller historischen Daten (`status: selected`).
- **Hostgrenze:** Diese Sitzung läuft als Claude-Code-Cloud-Agent. Das Hostingmodell
  dieser Sitzung wird durch Repository-Dateien nicht umgeschaltet. Die verbindliche
  NeXify-managed-LLM-Vorgabe (`deepseek/deepseek-v4.1-flash-1017`, Reasoning `high`,
  Suffix `1017`, kein stiller Fallback — `config/llm-policy.json`) gilt für die
  **vom Repository kontrollierten** managed LLM-Aufrufe, nicht für das Hostmodell
  dieser Sitzung.
- Keine Behauptung globaler Enforcement-Abdeckung ohne tatsächliches Inventar und
  Kontrolle aller Laufzeitadapter (AGENTS.md). Dieses Dokument benennt deshalb je
  Punkt den belegten Zustand.

## 1. Aufgenommene Auftragsquellen (Teil 1 + Teil 2)

| Quelle | Rolle | Status |
|---|---|---|
| Master System Order v4.0.0 (Teil 1, Chat-Auftrag) | fachliche/organisatorische Grundbaseline | aufgenommen als Daten; **keine** automatische Gesamtabnahme |
| NEXIFY-MASTER-MCP-001 v1.0.0 (Teil 2, Chat-Auftrag) | technischer Integrations-/Architekturauftrag | aufgenommen als Daten; Phase 0/1 hier bearbeitet |

Beide Texte sind Chat-Eingaben; sie sind nicht als versionierte Repository-Policy
abgelegt. Eine Übernahme als führende Baseline erfolgt erst „sobald Identität,
Zielressource und erforderliche Schreibberechtigungen nachgewiesen sind“ (Teil 1,
Finale Systemdirektive). Für die hier bearbeiteten Phasen 0/1 sind Repository-Scope
und Schreibrecht auf dem Arbeitszweig `claude/jolly-ride-5ws9yz` nachgewiesen.

## 2. Ist-Stand je Funktionsdomäne des Auftrags (Auftrag §1)

Legende Status: `spec` = als Spezifikation/Config vorhanden · `partial` = teils
implementiert/verifiziert · `gap` = nicht belegt vorhanden.

| # | Domäne (Auftrag §1) | Vorhandenes Artefakt (Evidenz) | sha256 (Auszug) | Status |
|---|---|---|---|---|
| 1 | Identity & Authorization | `config/mcp-server.json` (OAuth 2.1, Issuer-Prüfung), `docs/contracts/factory-api-auth.md` | `eaa380b4…` | partial (spec; Runtime unbelegt) |
| 2 | Oracle Control | `config/prompts/s1-master-orchestrator-2.0.0.md`, `config/brain/agents.json` (orchestrator) | `062336475…` | spec |
| 3 | Agent Registry | `config/brain/agents.json`, `config/agenten-paket.json`, `config/agenten-regelwerk.json` | `062336475…` | spec |
| 4 | Skills & Capability Registry | `config/skills-register.json`, `config/project-skills.json`, `skills-lock.json`, `tools/project_skills.py` | `593d63f0…` | partial (Register + Verify lauffähig) |
| 5 | Task & Workflow Orchestration | `config/acceptance-coverage.json` (`requirements_reconciliation`), `config/integration-workflow.json` | `4a998578…` | partial (read-only Reconciliation) |
| 6 | Brain & Knowledge | `config/brain/knowledge.json`, `config/brain/pipeline.json`, `config/rag.json`, `config/gedaechtnis.json` | — | partial |
| 7 | Tools & Integration Gateway | `config/mcp-server.json` (werkzeuge), `config/brain/tools.json` (Risikoklassen A/B/C), `config/integrationen.json` | `3769c93a…` | partial |
| 8 | Models & Evaluation | `config/llm-policy.json`, `config/llm-verbindungen.json`, `config/langfuse.json` | `096c3e8d…` | partial |
| 9 | Project & Business Operations | `config/operating-model.json`, `config/integrations/small-business.json`, `config/mandanten.json` | — | spec |
| 10 | Brand & Digital Production | `config/design-tokens.json`, `config/design-rules.json`, `design_guidelines.md`, `config/hero-film.json` | — | partial |
| 11 | Quality & Evidence | `evidence/*`, `tools/ds-audit-cli.js`, `feature_list.json`, `config/standards-applicability.json` | — | partial |
| 12 | Governance & Approvals | `config/brain/agents.json` (`hartsperren`), `config/brain/tools.json` (`orakel`, `selbstfreigabe:false`), `lib/regelwerk.js` | `062336475…` | partial |
| 13 | Monitoring & Runtime Operations | `config/runbooks.json`, `config/deployment-topology.json`, `tools/company-status.mjs` | — | partial |
| 14 | Cost & Resource Management | `config/api-prepaid.json`, `config/capacity-policy.json`, `tools/capacity_planner.py` | — | partial |
| 15 | Documentation & System Discovery | `config/system-inventar.json`, `docs/automation/mcp-discovery.md`, `tools/automation/mcp_probe.py` | `6858c368…` (probe) | partial |

**Kernbefund:** Für die meisten Domänen existiert bereits eine Spezifikation bzw.
Config. Der kanonische MCP-Zugang ist in `config/mcp-server.json` bereits
definiert — Name `nexify-mcp`, URL `https://mcp.nexifyai.cloud`, Protokollversion
**2026-07-28** (genau die vom Auftrag §2 geforderte Prüfversion), OAuth 2.1,
zustandsloses streamable-http, rollengefilterte, cachebare Werkzeugliste und die
harte Regel „kein Werkzeug mit `destructiveHint: true`“. Der Auftrag ist damit
überwiegend eine **Erweiterungs- und Verifikationsaufgabe**, kein Neubau. Ein
Parallelgateway ist ausdrücklich zu vermeiden (Auftrag §0, §25; AGENTS.md).

## 3. Pflichtliefergegenstände (Auftrag §23) — Abdeckung

| Lieferobjekt | Vorhanden? | Fundstelle / Lücke |
|---|---|---|
| Current-State Architecture | teilweise → **dieses Dokument** | neu 2026-11-07 |
| Unified MCP Target Architecture | gap/partial | `config/mcp-server.json` ist Teilziel, keine Gesamt-Zielarchitektur |
| Capability & Skill Registry Spec | partial | `config/skills-register.json`, `config/project-skills.json` |
| Agent & Oracle Integration Contract | partial | `config/brain/agents.json`, `config/prompts/s1-master-orchestrator-*` |
| Task & Workflow Integration Contract | partial | `config/acceptance-coverage.json`, `config/integration-workflow.json` |
| Brain & Knowledge Contract | partial | `config/brain/knowledge.json`, `config/rag.json` |
| Security Architecture | partial | `docs/contracts/factory-api-auth.md`, `config/environment-contract.json` |
| Authorization Matrix | partial | Rollen in `config/mcp-server.json` + `config/brain/tools.json` (A/B/C) |
| Tool & Adapter Catalogue | partial | `config/integrationen.json`, `config/integrations/*` |
| API and MCP Schema Documentation | partial | `config/mcp-server.json`, `docs/automation/mcp-discovery.md` |
| Runtime & Deployment Architecture | partial | `config/deployment-topology.json`, `docs/architecture/0015-vercel-agent-runtime.md` |
| Migration Plan | partial | `config/ai-migration-policy.json`, `docs/architecture/0019-staged-ai-migration.md` |
| Cost Model | partial | `config/api-prepaid.json`, `config/capacity-policy.json` |
| Monitoring & Evidence Model | partial | `config/langfuse.json`, `evidence/*` |
| Threat Model | gap | kein eigenständiges Threat-Model-Dokument gefunden |
| Automated Test Suite | partial | `tests/` inkl. `test_automation_mcp.py`, `make test` |
| End-to-End Test Report | gap | kein MCP-E2E-Report; `make e2e` vorhanden |
| Recovery & Rollback Plan | partial | `config/runbooks.json` |
| Operational Runbook | partial | `config/runbooks.json`, `GO-LIVE.md` |
| Production Readiness Report | gap | nicht vorhanden |
| Versioned Change Log | partial | `DECISIONS.md`, `PROGRESS.md` |

## 4. Abnahmekriterien (Auftrag §22) — ehrlicher Status

Alle 20 Kriterien stehen auf **nicht laufzeitverifiziert**, solange keine echte,
autorisierte Discovery/Ausführung gegen `https://mcp.nexifyai.cloud` belegt ist.
`tools/automation/mcp_probe.py` leistet ausschließlich lesende Discovery-Inventur
(kein `tools/call`) und beweist laut `docs/automation/mcp-discovery.md` „weder ein
gültiges JSON-Schema noch eine nutzbare Funktion, Kontoberechtigung oder
Integrationsabnahme“. Kriterien 1–20 bleiben damit **offen/ungeprüft** in dieser
Sitzung; sie sind erst nach realer, autorisierter Verbindung einzeln zu schließen.

## 5. Offene Abhängigkeiten / Remediation (Owner · nächste Aktion · Fälligkeit)

Gemäß `skills/nexify-governed-delivery/SKILL.md` (Definition of Done) und
`config/remediation-policy.json`. Owner-Kürzel aus `config/operating-model.json`.

| ID | Lücke | Owner | Nächste Aktion | Fälligkeit |
|---|---|---|---|---|
| GAP-MCP-01 | Keine laufzeitbelegte MCP-Discovery gegen `mcp.nexifyai.cloud` | D01 (+ Oracle) | Autorisierte, lesende Discovery mit `tools/automation/mcp_probe.py` planen; Ergebnis als Evidenz ablegen | nach Freigabe (Ebene C) |
| GAP-MCP-02 | Keine Unified MCP Target Architecture als eigenes Dokument | AI Factory Architecture Lead | Zielarchitektur aus `config/mcp-server.json` + 15 Domänen ableiten (ein Increment) | +1 Arbeitszyklus |
| GAP-MCP-03 | Threat Model fehlt (Auftrag §15/§23) | Security/Prüfer | Supply-Chain-/Prompt-Injection-/Tool-Poisoning-Threat-Model als Dokument | +1 Arbeitszyklus |
| GAP-MCP-04 | Production Readiness Report + MCP-E2E-Report fehlen | Prüfer/Wächter | Nach realer Anbindung; abhängig von GAP-MCP-01 | nachgelagert |
| GAP-REMOTE-01/02 | Vier gemeldete Server + LightRAG ohne belegten Realzugriff (SKILL.md) | D01 | Zielbindung + Realzugriff belegen; sonst `gap` halten | laufend |

Diese Punkte sperren nur ihre betroffene Wirkung (`blocked_action`), nicht die
unabhängige Weiterarbeit. Keine Auflösung durch Zeitablauf, Selbstauskunft oder
`success=true` — nur durch nativen Verifier gegen den aktuellen Quellstand.

## 6. Vorgeschlagenes nächstes, abschließbares Increment (WIP=1)

Ein Increment pro Sitzung (AGENTS.md). Empfehlung: **GAP-MCP-02** — „Unified MCP
Target Architecture“ als ein Dokument, das die 15 Domänen auf den bestehenden
`nexify-mcp`-Zugang abbildet, Namensräume (Auftrag §11) als Organisationskonzept
beschreibt und je Operation die tatsächliche Backend-Bindung bzw. `gap` ausweist —
**ohne** neue Server, ohne Toolausführung, ohne Lockerung bestehender Sperren.

Freigabevorbehalte (nicht in dieser Sitzung): reale Discovery/Verbindung, externe
Provideraufrufe, Produktivaktivierung, Kosten (Auftrag §13/§14, Ebenen C/D der
Entscheidungsmatrix; `config/selfservice-policy.json`, `config/llm-policy.json`).

## 7. Teamkoordination (Zusammenarbeit mit „Hermes“)

Single-Writer-Prinzip (Master System Order Grundsatz 6): **Diese Sitzung
beansprucht den Scope „Phase 0/1 Baseline + Inventar“** (dieses Dokument +
`evidence/nexify-master-mcp-001-20261107/inventory.json`). Zur konfliktfreien
Parallelarbeit sollte Hermes einen **anderen** Scope übernehmen (z. B. GAP-MCP-02
Target Architecture oder GAP-MCP-03 Threat Model) und nicht dieselben Dateien
schreiben. Koordinationsstand und Scope-Claims werden über dieses Dokument und das
Evidenzartefakt geführt; eine direkte Laufzeitkopplung beider Sitzungen ist nicht
belegt und wird nicht behauptet.

## Quellen (Auszug, mit Fingerprint)

- `AGENTS.md` · `config/acceptance-coverage.json` (`4a998578…`)
- `config/mcp-server.json` (`eaa380b4…`) · `config/brain/agents.json` (`062336475…`)
- `config/brain/tools.json` (`3769c93a…`) · `config/skills-register.json` (`593d63f0…`)
- `config/llm-policy.json` (`096c3e8d…`) · `tools/automation/mcp_probe.py` (`6858c368…`)
- `docs/automation/mcp-discovery.md` · `docs/plans/2026-10-27-mcp-json-integrity.md`
- `skills/nexify-governed-delivery/SKILL.md` (v1.0.2)

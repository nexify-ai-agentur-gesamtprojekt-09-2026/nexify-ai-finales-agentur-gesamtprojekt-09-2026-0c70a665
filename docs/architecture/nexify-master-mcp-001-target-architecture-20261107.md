# NEXIFY-MASTER-MCP-001 — Unified MCP Target Architecture (SOLL)

Stand **2026-11-07** · Version **0.1.0** · Status **proposed_target_not_runtime**
Zuordnung: Master System Order v4.0.0 · Auftrag `NEXIFY-MASTER-MCP-001`
Phasenbezug: **Phase 2 (Target Architecture)** · baut auf `nexify-master-mcp-001-current-state-20261107.md` (Phase 0/1) auf.
Deckt Pflichtliefergegenstand §23 „Unified MCP Target Architecture" (GAP-MCP-02).

> Vorgeschlagener Zielzustand, **kein** Nachweis einer laufenden/abgenommenen Funktion.
> Erteilt keine Rechte, keine Kosten-/Produktiv-/Modellbindung. Eine pauschale
> Nutzer-„Freigabe" hebt die einzelnen Gates nicht auf (AGENTS.md: eine Sperre fällt
> nur nach geprüftem Quellstand, nie durch Umschreiben des Freigabestatus).

## 0. Autorität, Scope und ausdrücklich gegatete Aktionen

- Schreibrecht nachgewiesen: Zweig `claude/jolly-ride-5ws9yz` (Docs-Scope). Kein zweites Register; bindet an `requirements_reconciliation` (read-only).
- **Nicht in diesem Scope / weiter einzeln freigabepflichtig (Ebene C/D):** Live-MCP-Discovery/Verbindung gegen `mcp.nexifyai.cloud` (GAP-MCP-01), produktive Aktivierung, externe Provideraufrufe, Kostenverursachung, Merge von PR #74. „Weiter im Gesamtgoal" ⇒ autorisierte Doku-/Analyse-Increments, nicht gegatete Außenwirkung.
- Hostgrenze unverändert: Session-Hostmodell nicht durch Repo-Dateien umschaltbar; managed-LLM-Policy (`config/llm-policy.json`) gilt für repo-kontrollierte managed Aufrufe.

## 1. Leitprinzip — ein logischer Zugang, modulare Backends

Es gibt **einen** kanonischen MCP-Zugang, bereits definiert in `config/mcp-server.json`:
`nexify-mcp` · `https://mcp.nexifyai.cloud` · Protokoll **2026-07-28** · streamable-http, zustandslos · OAuth 2.1 (Issuer-Prüfung) · rollengefilterte, cachebare Werkzeugliste · Regel „kein `destructiveHint: true`". **Kein Parallelgateway** (Auftrag §0/§25). Dahinter bleiben spezialisierte Dienste/Adapter bestehen; MCP ist nur die einheitliche Zugangsschicht, nicht der Ort von Geschäftslogik, Datenhaltung oder Jobsteuerung (§2).

```
Clients (ChatGPT/Oracle/Agent-Runtimes/Portale)
        │  MCP 2026-07-28 (OAuth 2.1, zustandslos)
        ▼
  nexify-mcp  ──►  AuthZ/Policy-Entscheidung (pro Aufruf, vor Seiteneffekt)
        │                 │ lib/regelwerk.js pruefe() · brain/tools.json Risikoklassen · brain/agents.json Hartsperren
        ▼                 ▼
  typisierte Fachwerkzeuge  ──►  Backends: Brain/RAG · Auftragsregister · Fachsysteme (CRM/Shop/…) · Modelle (OpenRouter) · Evidence
```

## 2. Die 15 Funktionsdomänen → Ziel-Backing (SOLL vs. Ist)

| # | Domäne | Ziel-Backing-System | Ist (aus Phase 0/1) |
|---|---|---|---|
| 1 | Identity & Authorization | OAuth 2.1 + Protected-Resource-Metadata, Audience-Validation | spec (`config/mcp-server.json`); Runtime unbelegt |
| 2 | Oracle Control | AIFly ORACLE als Actor; `oracle.*`-Funktionen | spec (`config/prompts/s1-master-orchestrator-*`) |
| 3 | Agent Registry | `config/brain/agents.json` erweitert um Lebenszyklus-Status | spec |
| 4 | Skills & Capability Registry | `config/skills-register.json` + `tools/project_skills.py` als Referenz-Registry | partial (Verify lauffähig) |
| 5 | Task & Workflow | führendes `requirements_reconciliation` + **neuer Runtime-Job-Layer (gap)** | partial (read-only) |
| 6 | Brain & Knowledge | `config/brain/knowledge.json`/`pipeline.json`, `config/rag.json`; Tenant-Trennung erzwungen | partial |
| 7 | Tools & Integration Gateway | typisierte Werkzeuge in `config/mcp-server.json`; Adapter je Provider | partial |
| 8 | Models & Evaluation | `config/llm-policy.json` (deepseek…1017/high), `config/langfuse.json` | partial |
| 9 | Project & Business Ops | `config/operating-model.json`, `config/mandanten.json` | spec |
| 10 | Brand & Digital Production | `config/design-tokens.json`/`design-rules.json` | partial |
| 11 | Quality & Evidence | `evidence/*`, `feature_list.json`, `tools/ds-audit-cli.js` | partial |
| 12 | Governance & Approvals | `brain/tools.json` (Risiko A/B/C, `selbstfreigabe:false`), `brain/agents.json` (Hartsperren), `lib/regelwerk.js` | partial |
| 13 | Monitoring & Runtime Ops | `config/runbooks.json`, `config/deployment-topology.json` | partial |
| 14 | Cost & Resource | `config/api-prepaid.json`, `config/capacity-policy.json` | partial |
| 15 | Documentation & Discovery | `config/system-inventar.json`, `tools/automation/mcp_probe.py` | partial |

## 3. Kanonische MCP-Oberfläche (Namensräume §11, Minimalfunktionen §12)

Namensräume sind **Organisationskonzept**, keine Behauptung implementierter Funktionen. Zielabbildung auf die bereits definierten Werkzeuge in `config/mcp-server.json`:

| Namespace (SOLL) | Vorhandenes Werkzeug (Ist) | Status |
|---|---|---|
| `system.*` (Discovery, Status, Policy, Version) | — (Discovery via Protokoll) | gap (als Tool) |
| `skills.*` (Search, Metadata, Load, Validate, Evidence) | `tools/project_skills.py` (lokal) | partial |
| `oracle.*` (Context, Decision, Readback, Delegation, Escalation) | Prompt-Spezifikation | gap (als MCP-Tool) |
| `agents.*` (List, Capabilities, Status, Assign, Result) | `config/brain/agents.json` (statisch) | gap (als MCP-Tool) |
| `tasks.*` (Create, Read, State, Evidence, Resume, Cancel) | `auftrag.anlegen` (nur Entwurf) | partial |
| `brain.*` (Search, Get, Store, SyncStatus, ExactReadback) | `wissen.suche` | partial |
| `tools.*` / Fach: `crm.*`, `sales.*`, … | `crm.suche`, `crm.fall_lesen`, `posteingang.*`, `rechenkern.preis`, `doku.erzeugen`, `lernen.signal`, `regel.pruefen` | partial |
| `quality.*`, `evidence.*`, `approvals.*`, `operations.*`, `monitoring.*` | — | gap |

Nur tatsächlich existierende, autorisierte, geprüfte Operationen werden exponiert. Lesende Inhalte zusätzlich als MCP **Resources**, versionierte Vorlagen als MCP **Prompts** (§11).

## 4. Vertrauensgrenzen & Autorisierung (§13)

Jeder relevante Aufruf trägt: verifizierte Actor-ID · Client-ID · Projekt · Tenant · Operation · Zielressource · erforderliche Berechtigung · nachweisbare Policyentscheidung · Correlation-ID · zeitliche Gültigkeit. **Least Privilege + explizites Tool-Allowlisting.** Grundlage ist der Schnittmengen-Entscheid aus `docs/contracts/factory-api-auth.md` (gültige Identität ∩ Account/Session ∩ Mitgliedschaft ∩ Mandant ∩ Scope ∩ Rolle ∩ Objektbesitz ∩ Aktionsfreigabe). `X-Tenant-ID` ist nur Selektor, serverseitig geprüft. **Kein Recht aus Modell, Toolannotation, Clientheader oder Name.** Getrennte Upstream-/Downstream-Credentials; keine unvalidierte Tokenweitergabe.

**Autorisierungsmatrix (Kern, aus Ist abgeleitet):**

| Rolle (`config/mcp-server.json`) | Darf (Beispiel) | Grenze |
|---|---|---|
| `pascal` | alle gelisteten Werkzeuge inkl. `doku.erzeugen` | kein `destructiveHint` |
| `team` | lesende + Entwurf-Werkzeuge | keine `doku.erzeugen` |
| `kunde` | `wissen.suche`, `rechenkern.preis` | mandantengebunden |
| `system` | `lernen.signal`, `regel.pruefen` | kein externer Versand |

## 5. Policy- & Approval-Engine (§14)

Risikoklassen aus `config/brain/tools.json` sind die Durchsetzungsbasis:
**A** (lesend/intern) → auto nach Tests · **B** (schreibend/intern, Entwürfe) → 1 Mensch · **C** (extern, Geld, Löschen, Nachricht an Dritte) → Mensch + 2. Faktor, immer Rückfrage. Hartsperren (`brain/agents.json`): `reboot`, `dns_aendern`, `firewall_aendern`, `zahlung_ausloesen`, `loeschen_ohne_freigabe`, `nachricht_an_dritte_ohne_freigabe`. **Jede Aktion wird vor Ausführung geprüft; Oracle-Aufruf oder Skill umgeht die Sicherheitsentscheidung nicht.** Freigabepflichtige Aktionen bleiben `WAITING_APPROVAL`. `selbstfreigabe:false`, Auto-Rückzug ab Fehlerrate 0.05.

## 6. Auftrags-/Job-Modell (§8)

Führend bleibt `requirements_reconciliation` (read-only). SOLL-Ergänzung: ein **persistenter Job-Layer** mit eindeutigen Job-IDs und Zuständen, der nicht an die Lebensdauer einer MCP-Anfrage oder Chat-Sitzung gebunden ist; das Gateway gibt einen Auftragsschlüssel zurück, über den der Client Zustand/Ergebnis autorisiert abruft. **Dieser Runtime-Job-Layer ist Ist=gap** (siehe GAP-OPS). Kein zweites unabhängiges Task-Register.

## 7. Runtime & Zuverlässigkeit (§16) — ehrliche Grenze

Dauerbetrieb braucht überwachte Dienste, durable Queues, Checkpoints, Idempotency-Keys, Lease/Fencing, Retry-Grenzen, Dead-Letter, Circuit-Breaker, Backup/Restore/Rollback. Die Regelkreis-Runtime (`scripts/run_cycle.sh`) ist **im Agentur-Repo nicht vorhanden** (läuft extern/VPS) — daher ist ein dauerhafter, automatischer Betrieb aus dem Repo heraus nicht belegbar. MCP-Protokollsitzungen sind nicht das einzige Speichermedium laufender Aufgaben.

## 8. Migration (§21) — inkrementell, erweitern statt duplizieren

Phase 0/1 (Baseline/Inventar) ✓ geliefert. Phase 2 (dieses Dokument) ✓. Nächste Phasen jeweils als eigenes, abschließbares Increment mit Nachweis; vorhandene funktionsfähige Systeme während der Migration nicht unterbrechen (Inventory/Audit/Shadow vor Cutover; negativer Migrationscheck sperrt nur den Cutover).

## 9. Offene Abhängigkeiten (Owner · nächste Aktion · Fälligkeit)

| ID | Lücke | Owner | Nächste Aktion | Fälligkeit | Gate |
|---|---|---|---|---|---|
| GAP-MCP-01 | Keine laufzeitbelegte MCP-Discovery | D01 (+Oracle) | autorisierte lesende Discovery (`mcp_probe.py`), Evidenz ablegen | nach Ebene-C-Freigabe | **gegated** |
| GAP-MCP-03 | Threat Model fehlt | Security/Prüfer | Supply-Chain/Prompt-Injection/Tool-Poisoning-Threat-Model | +1 Zyklus | offen für Hermes |
| GAP-MCP-04 | Prod-Readiness + E2E-Report | Prüfer/Wächter | nach GAP-MCP-01 | nachgelagert | — |
| GAP-OPS | Persistenter Job-/Runtime-Layer (run_cycle.sh extern) | D01/Betrieb | Betriebsvertrag + Nachweis real laufender Queue/Scheduler | laufend | Betrieb |
| GAP-REMOTE-01/02 | 4 Server + LightRAG ohne belegten Realzugriff | D01 | Zielbindung + Realzugriff belegen | laufend | — |

## 10. Nicht-Ziele / ausdrücklich gegatet

Keine Live-Discovery/Verbindung, keine Toolausführung gegen Produktion, keine Lockerung bestehender Sperren, keine externen Nachrichten über das vom Owner Autorisierte hinaus, keine Kosten, kein Merge — alles bleibt einzeln freigabepflichtig, unabhängig von einer pauschalen „Freigabe".

## Quellen (Fingerprint in Phase-0/1-Inventar)

`config/mcp-server.json` · `config/brain/agents.json` · `config/brain/tools.json` · `config/skills-register.json` · `config/llm-policy.json` · `docs/contracts/factory-api-auth.md` · `config/acceptance-coverage.json` · `tools/automation/mcp_probe.py` · `nexify-master-mcp-001-current-state-20261107.md`.

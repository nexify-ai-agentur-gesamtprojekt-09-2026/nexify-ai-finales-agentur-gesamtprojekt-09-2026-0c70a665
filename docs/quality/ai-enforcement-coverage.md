# KI-Durchsetzung: tatsächliche Einstiegspunkte und offene Migration

Stand: 2026-10-26T15:12:49.915433+00:00. Maschinenlesbare Herkunft: [`config/ai-enforcement-coverage.json`](../../config/ai-enforcement-coverage.json). **Aktueller Modus: Audit/Shadow, bestehende Laufzeiten unverändert.** Maßgeblich ist die neueste ausdrückliche Nutzerkorrektur und `config/ai-migration-policy.json`. Eine abgelehnte oder unvollständige Migration stoppt den vorgeschlagenen Wechsel, nicht bestehende Kundenarbeit, Modelle oder CLI-Zugänge.

## Tatsächlicher Umfang

Registriert sind **52 eigene Quellpfade** mit SHA-256, Rolle, Ausführung/Egress, tatsächlichen Quellkontrollen, Lücken, Owner und nächster Aktion. Die festen acht Scannerwurzeln umfassen beim Snapshot **168 Quellcode-Dateien**, davon **30 lexikalische Kandidaten**. Weitere tatsächlich relevante API-/UI-/indirekte Einstiege sind manuell registriert. Die endliche Heuristik ist kein Beweis sämtlicher möglichen direkten oder indirekten KI-Aufrufe.

Zusätzlich separat dokumentiert sind Root-/Claude-/Copilot-Instruktionsquellen, Brain-/Modellkonfiguration und der erhaltene HTML-/Referenzkatalog. Diese Dokumentationshashes sind keine Guards für laufende Systeme. Tests, Public-/Generated-/Vendorcode und fremde Systeme werden nicht als vollständig semantisch oder zur Laufzeit geprüft ausgegeben. A1-Kundenrepo und private Auth-/Codex-/ChatGPT-Stores wurden nicht gelesen.

| Status | Quellen | Aussage |
|---|---:|---|
| `declaration_only` | 2 | Vorbereiteter nicht aktivierter Opt-in-Kandidat, kein bestehender Laufzeitguard. |
| `deterministic_no_model` | 10 | Deterministische Orientierung oder lokale Vorbereitung; kein Modellbeleg. |
| `external_unverified` | 2 | Originalreferenz/Callback ohne bestätigte aktuelle Runtimebindung. |
| `metadata_only_no_inference` | 4 | Metadaten/Suche/Health statt Modellgenerierung; andere Betriebswirkungen separat. |
| `reviewed_false_positive` | 6 | Konkreter Marker ist Guardtext oder Nicht-LLM-API, nicht Inferenz. |
| `source_enforced` | 3 | Konkrete neue Quell-/Requestgrenze; weder weltweite Durchsetzung noch Livefreigabe. |
| `unverified_legacy_egress` | 25 | Bestehender unmigrierter Legacy-/Remote-/Orchestrierungspfad; Audit, nicht deaktiviert. |

## Die tatsächlich belegten Pfade

- **Browser → `/api/agent-chat` → public-orientation:** echtes SDK-Streamingformat, aber ausdrücklich deterministische Wort-/Seitenorientierung ohne Modell. Ein Chatfenster oder Stream ist keine Live-KI. Der lokale Visitor-Gateway ist ein separates deterministisches Angebots-/PDF-/Termin-/Marketingfundament.
- **`/api/agent-runtime-status` → preview-access:** begrenzte Preview-Metadaten und gegebenenfalls SDK-`getCredits`. Keine Modellkonstruktion oder Inferenz. Credits, OIDC und Erfolg eines Metadaten-GETs beweisen weder Modellberechtigung noch Benutzer-/Tenant-/Fundingfreigabe.
- **Interner AI-SDK-Adapter:** neue Managedgrenze liest die aktuelle Policy, bindet exakt `deepseek/deepseek-v4.1-flash-1017` und `high`, prüft den endgültigen Request und hat keinen stillen Modellfallback. Der Caller benötigt weiterhin echte autorisierte Servercredentials und Funding; die Existenz des Adapters verbindet keinen öffentlichen Live-Chat.
- **CI → `tools/automation/ai_review.py`:** neuer Managedreview-Client mit literalem und zentralem Modelguard vor Katalog-/Credentialzugriff und am letzten Transportbody. Destination/Redirect-/Deadline-/Preis-/Usage-/Diff-/Commitgrenzen bleiben erhalten. Der Trusted-Base-Workflow selbst ist keine Merge-/Jeff-/Operatorfreigabe. Aktueller Quellcode beweist noch nicht, welche Version ein laufender CI-Job oder Deployment benutzt.
- **Lokale Kontext-/Brain-/SEO-Werkzeuge:** Auswahl beziehungsweise SQLite-Staging ohne Remoteinferenz. Aufgenommen ist nicht extern indexiert, als Regel aktiviert oder live abgenommen.
- **SearXNG:** Suche ist von Managed-LLM-Arbeit getrennt. Das bestehende konfigurierte Suchziel bleibt verwendbar; unbenutzte Router-Key-Fallbacks und ein unnötiger `modelle.env`-Read wurden entfernt. Treffer-URL-Schema ist kein Nachweis gelesener Quelleninhalte.

## Bestehende Legacyarbeit: ausdrücklich nicht still umgeschaltet

Es gibt **mindestens15 konkrete Legacy-Launcherquellen** für externes `nx-jeff`: direkte `execFileSync`-Aufrufe und indirekte `run(cmd,args)`-Wrapper. Dazu kommen LightRAG-Abfrage/Indexierung, Cognee und weitere indirekte Produkt-/Auftrags-/Supportpfade. Ihre tatsächlichen externen Modelle, Scopes, Credentials, Kosten und Serverrechte sind hier nicht vollständig verifiziert.

Der frühe Versuch neuer Always-Failclosed-Vorblöcke wurde nach der neuesten Nutzerkorrektur zurückgenommen: **17 bestehende Dateien** wurden exakt auf ihre zuvor bekannte Quellfassung zurückgeführt. Dazu gehören die13 Literal-Launcherquellen einschließlich Hook, die vier Brain-Dateien mit zwei Überschneidungen, Chat-Auftrag-Adapter und Python-Jeff. Kein Legacy-Aufruf wurde zur Prüfung gestartet. Die zwei weiteren `run`-Launcher wurden nur inventarisiert und nie umgestellt.

Vorbereitete `tools/legacy-oracle-boundary.mjs` und `tools/legacy_oracle_candidate.py` sind **unverdrahtete Opt-in-/Shadowkandidaten**. Sie dürfen nicht als bereits aktive Einschränkung oder abgeschlossene Migration gelesen werden. Der alte Python-Jeff kann weiterhin ein frei konfiguriertes Ziel/Modell verwenden; das ist ein ausdrücklich sichtbarer Migrationsbefund. Alte Fallbackanzeigen wie Backup-`ok`, P3 oder `flash` sind kein hier bestätigtes Orakelergebnis und bleiben als Risiko dokumentiert.

Es wurde keine vorhandene Sicherheits-/Mandanten-/Fundinggrenze gelockert. Tatsächliche Backup-Frischeberechnung und Health-Metadatenabfragen wurden nicht als vermeintliche LLM-Aufrufe abgeschaltet. Neue gezielt gebaute Managedadapter behalten dagegen ihre eigenen Requestguards.

## Orchestrierung und nicht sichtbare Ausgänge

`tools/docs-aktualisieren.mjs` und `tools/einbringen.mjs` rufen das externe Orakel über allgemeine `run`-Funktionen. Auftrags-/Produktserver und Support-/Reviewskripte können andere Legacydateien starten. Root-/Prototypbibliotheken wie `anfrage-pipeline.js` akzeptieren injizierte Modellfunktionen; aus dem Callbacknamen lässt sich kein Provider-/Modell-/Kostenvertrag ableiten. Für die Originalreferenzen wurde kein aktueller Appimport gefunden; ihre Bytes wurden nicht verdeckt verändert.

LightRAG `/query` kann eigene Inferenz auslösen, Dokumentaufnahme kann Zusammenfassung/Embedding triggern. Cognee-Login/Add/Search ist ebenfalls kein Beleg eines fest gebundenen Modell- oder Datenvertrags. Bekannte Credentialdatei-/Container-Env-Lesestellen wurden statisch gesehen, **nicht ausgeführt**. Ein lokaler Hostname macht den dahinterliegenden Modellfluss nicht automatisch verifiziert oder kostenlos. Owner D06/D08 muss pro tatsächlicher Runtime Identität, Tenant, Provider, Finanzierung und Rollback klären.

## Instruktionswurzeln sind keine serverseitigen Modellschalter

`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` und lokale Claude-Einstellungen sind verfügbare Projekt-/Clientführung. Sie können Tools und aktuelle Vorgaben benennen; sie beweisen weder die tatsächlich verwendete externe CLI-/Hostkonfiguration noch eine serverseitige Requestkontrolle. Private globale Codex-/Claude-Authstores wurden nicht durchsucht.

Insbesondere kann eine Repositorydatei das **ChatGPT-Hostmodell nicht serverseitig umstellen oder durchsetzen**. Der Host ist außerhalb dieser Repositorykontrolle. Auch bestehende Codex-CLI-/Kundenarbeit bleibt unangetastet. Eine spätere eigene CLI-Provideradaptermigration benötigt den tatsächlichen owned Runtimevertrag; ein anderer Dateiname oder Modellstring genügt nicht.

## Auditscanner und Cutover

`tools/check_ai_coverage.py --audit` führt eine lesende Prüfung aus. Exit0 heißt im Auditmodus nur, dass der Auditprozess ausgeführt wurde. Unregistrierte oder geänderte Quellen bleiben Befunde (`audit_partial`, `inventory_status:blocked`); eine fehlende/unsichere Registry bleibt `audit_unavailable`. Kein automatischer Hashrefresh und kein vorhandener Flowstop. Der Strictmodus bleibt für den späteren konkret autorisierten Cutover getrennt verfügbar.

Die festen Scannerwurzeln/Extensions/Marker kommen aus dem vertrauenswürdigen Tool, nicht aus editierbaren Ausschlüssen der Registry. Jede registrierte Datei wird auf Hashdrift geprüft; jeder gefundene Kandidat braucht eine explizite Einstufung. Guardcode und etwa die Slack-API `/api/chat.postMessage` sind begründet als Nicht-LLM-Fälle erfasst. Das verhindert keine beliebige Obfuskation, dynamische Aliase oder unerkannte externe Aufrufe und ist daher keine umfassende Securitygarantie.

Je Runtime gilt `inventory → shadow → validated → canary → cutover → retired` mit echter Ersatzreife, Abhängigkeiten, Adaptergrenzen, Rückrollbeleg, Scopeautorisierung, Routinglease, Canary-Readback und Drain. Laufende Jobs dürfen nicht wegen eines bloß vorgeschlagenen Switches unterbrochen werden. Fehlende Voraussetzungen erhalten konkrete ownergebundene Behebungsaufträge; innerhalb vorhandener Rechte aktiv lösen und erst mit aktuellem gebundenem Nachweis schließen.

## Vollständiges registriertes Quellenregister

| Quellpfad | Status / Rolle | Owner | Nächste Aktion |
|---|---|---|
| `.github/workflows/ai-review.yml` | `source_enforced` / `ci_managed_review` | D06/D08 | Run scoped deployment/provider readback only when specifically authorized and funded; preserve independent business/release gates. |
| `api/agent-chat.ts` | `deterministic_no_model` / `public_deterministic_endpoint` | D06/D08 | Track live authorized/funded model integration separately; do not relabel deterministic output as live AI. |
| `api/agent-runtime-status.ts` | `metadata_only_no_inference` / `preview_metadata_probe` | D06/D08 | Keep probe limited to metadata; verify inference/funding/tenant readiness separately. |
| `apps/agent-gateway/server.py` | `deterministic_no_model` / `public_deterministic_endpoint` | D06/D08 | Track live authorized/funded model integration separately; do not relabel deterministic output as live AI. |
| `apps/site/src/main.tsx` | `deterministic_no_model` / `browser_or_local_preview_entry` | D06/D08 | Maintain actual browser/API behavior evidence and separate future guarded live model integration. |
| `apps/web/components/Workspace.tsx` | `deterministic_no_model` / `browser_or_local_preview_entry` | D06/D08 | Maintain actual browser/API behavior evidence and separate future guarded live model integration. |
| `hooks/jeff-hook.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `packages/agent-runtime/model-agent.ts` | `source_enforced` / `managed_inference_adapter` | D06/D08 | Run scoped deployment/provider readback only when specifically authorized and funded; preserve independent business/release gates. |
| `packages/agent-runtime/preview-access.ts` | `metadata_only_no_inference` / `preview_metadata_probe` | D06/D08 | Keep probe limited to metadata; verify inference/funding/tenant readiness separately. |
| `packages/agent-runtime/public-orientation.ts` | `deterministic_no_model` / `public_deterministic_endpoint` | D06/D08 | Track live authorized/funded model integration separately; do not relabel deterministic output as live AI. |
| `prototypen/lib/anfrage-pipeline.js` | `external_unverified` / `original_reference_callback` | D06/D08 | Before adopting this component, document caller/adapter provenance and migrate under an explicit per-runtime contract without changing originals silently. |
| `prototypen/lib/ki-muster.js` | `external_unverified` / `original_reference_callback` | D06/D08 | Before adopting this component, document caller/adapter provenance and migrate under an explicit per-runtime contract without changing originals silently. |
| `tools/agent-preview.mjs` | `deterministic_no_model` / `browser_or_local_preview_entry` | D06/D08 | Maintain actual browser/API behavior evidence and separate future guarded live model integration. |
| `tools/agent.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/ai_migration.py` | `reviewed_false_positive` / `guard` | D06/D08 | Keep source drift review and separate side-effect authorization; do not interpret lexical registration as semantic proof. |
| `tools/auftrag.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/automation/ai_review.py` | `source_enforced` / `ci_managed_review` | D06/D08 | Run scoped deployment/provider readback only when specifically authorized and funded; preserve independent business/release gates. |
| `tools/brain_ingestion.py` | `deterministic_no_model` / `local_context_or_staging` | D06/D08 | Keep scoped source/readback records; resolve actual server/LightRAG adapter and funding gaps through assigned remediation. |
| `tools/chat-arbeit.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/chat-auftrag-adapter.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/check_ai_coverage.py` | `reviewed_false_positive` / `guard` | D06/D08 | Keep source drift review and separate side-effect authorization; do not interpret lexical registration as semantic proof. |
| `tools/check_llm_policy.py` | `reviewed_false_positive` / `guard` | D06/D08 | Keep source drift review and separate side-effect authorization; do not interpret lexical registration as semantic proof. |
| `tools/cognee.mjs` | `unverified_legacy_egress` / `legacy_brain_adapter` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/context_executor.py` | `deterministic_no_model` / `local_context_or_staging` | D06/D08 | Keep scoped source/readback records; resolve actual server/LightRAG adapter and funding gaps through assigned remediation. |
| `tools/dev.mjs` | `deterministic_no_model` / `browser_or_local_preview_entry` | D06/D08 | Maintain actual browser/API behavior evidence and separate future guarded live model integration. |
| `tools/docs-aktualisieren.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/einbringen.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/gesundheit.mjs` | `metadata_only_no_inference` / `health_metadata` | D06/D08 | Preserve real health metadata checks; keep operational writes/credentials under their own authorized environment contract. |
| `tools/github_event_inbox.py` | `reviewed_false_positive` / `non_llm_business_api` | D06/D08 | Keep source drift review and separate side-effect authorization; do not interpret lexical registration as semantic proof. |
| `tools/jeff-backup.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/jeff-gate.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/jeff-gate.py` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/jeff-incident.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/jeff-kontext.mjs` | `unverified_legacy_egress` / `legacy_brain_adapter` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/jeff-lead.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/jeff-routing.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/jeff-triage.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/kontrolle.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/kritiker.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/legacy-oracle-boundary.mjs` | `declaration_only` / `opt_in_shadow_guard_candidate` | D06/D08 | Use migration policy and scoped readiness/rollback evidence before any future opt-in; never globally switch from a model name. |
| `tools/legacy_oracle_candidate.py` | `declaration_only` / `opt_in_shadow_guard_candidate` | D06/D08 | Use migration policy and scoped readiness/rollback evidence before any future opt-in; never globally switch from a model name. |
| `tools/lernschleife.mjs` | `unverified_legacy_egress` / `legacy_brain_adapter` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/orchestrierung-server.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/produkt-server.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/project_skills.py` | `reviewed_false_positive` / `guard` | D06/D08 | Keep source drift review and separate side-effect authorization; do not interpret lexical registration as semantic proof. |
| `tools/recherche.mjs` | `metadata_only_no_inference` / `search_only` | D06/D08 | Review search data/privacy scope and sources before using results as evidence; no LLM enforcement claim. |
| `tools/review.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/seo_catalog.py` | `deterministic_no_model` / `local_context_or_staging` | D06/D08 | Keep scoped source/readback records; resolve actual server/LightRAG adapter and funding gaps through assigned remediation. |
| `tools/support.mjs` | `unverified_legacy_egress` / `legacy_orchestration` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/verify_factory_contract.py` | `reviewed_false_positive` / `guard` | D06/D08 | Keep source drift review and separate side-effect authorization; do not interpret lexical registration as semantic proof. |
| `tools/wissen-abfrage.mjs` | `unverified_legacy_egress` / `legacy_brain_adapter` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |
| `tools/wissen-speisen.mjs` | `unverified_legacy_egress` / `legacy_brain_adapter` | D06/D08 | Create or continue scoped remediation: inspect the concrete runtime, preserve existing operation, validate replacement and rollback before per-runtime cutover. |

## Prüfung und Grenzen dieses Arbeitspakets

23 Offline-Automationtests bestehen einschließlich gültiger Redirect-/Deadline-Fixtures und neuer Gegenproben für freie Modellwahl/finalen Wire. Fünf Shadow-/Kompatibilitätstests bestehen: Kandidaten senden nichts, laufende Legacyquellen bleiben unverdrahtet und Suche nutzt nur Fakefetch. Syntaxprüfungen der zwischenzeitlich bearbeiteten Node-/Pythondateien wurden ohne Ausführung ihrer Geschäftsabläufe durchgeführt.

Die Registry wird gezielt gegen echte aktuelle Quellhashes und alle Kandidaten des festen Scans geprüft. Keine bezahlte Inferenz, kein externer Agentstart, kein Secretfile-/Container-Env-Zugriff, kein globaler Modellschalter, kein Kundendatenzugriff, keine Remoteinventarvollständigkeit und keine System-/Produktivabnahme werden daraus behauptet. Offen bleibt jede im JSON benannte Runtime-/Finanzierungs-/Daten-/Adapterlücke.

## Letzter bewusst geprüfter Quellenabgleich

Nach Root-Freeze und unabhängiger Gegenprüfung wurden ausschließlich die beiden
Registry-SHAs für `tools/context_executor.py` (CORE6/Ressourcen-Aliase/0020) und
`tools/ai_migration.py` (sicherer nichtblockierender Szenarioreader) aktualisiert.
Die Gegenprüfung meldet16 beziehungsweise10 bestandene Tests und keine
verbleibenden materiellen Findings. Alte und neue SHA sind je Eintrag erhalten.
Kein Auto-Refresh, keine andere Registry-Quellhashänderung und kein Cutover.
Die zusätzlichen Ressourcen-/Kapazitätsquellen enthalten nach dem festen Scan
keinen neuen KI-Kandidaten; lokale Cloudmessung ist kein VPS-Nachweis.

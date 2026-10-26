# Offizielle Blueprints für NeXify-Automatisierung

Recherchezeitpunkt: 2026-10-26T07:02:48.497635+00:00. Alle unten aufgeführten HTTP-Proben waren nicht authentifizierte GET-Anfragen mit aktiver TLS-Prüfung. Vollständige URLs, Weiterleitungen, Datum, Antwort-SHA256 und belegte Auszüge: `blueprints.sources.json`.

Der Runtime-Status meldete unrestricted mit unbekanntem Durchsetzungszustand; die Startdatei enthielt noch eine restricted-Snapshotrichtlinie. Die einzelnen HTTP-200-Antworten belegen Erreichbarkeit dieser Quellen zum Messzeitpunkt. Es wurden keine Richtlinien umgangen oder geändert, keine kostenpflichtige Inferenz ausgeführt und keine fremden Scripts gestartet.

## 1. GitHub: Prüfen und Schreiben als getrennte Vertrauensgrenzen

Die offiziellen GitHub-Sicherheitsvorgaben nennen minimale Tokenrechte, fixierte vollständige Commit-SHAs (bzw. angebotene Workflow-Abhängigkeitssperren), sichere Behandlung fremder Ereignisdaten und klare Trennung nicht vertrauenswürdigen PR-Codes. `pull_request_target` und `workflow_run` sind privilegierte Kontexte; fremder Code oder fremde Artefakte dürfen dort nicht als ausführbare Arbeitsgrundlage übernommen werden.

Passende Adaption: ein lesender Check für PR-Code ohne OpenRouter-/Schreibsecret; ein davon getrennter Agentenlauf aus überprüftem Workflow-/Programmcode. Der Diff bleibt Daten, keine Anweisung. Agentenergebnis anhand eines strikten Schemas und konkreter Pfad-/Größenregeln prüfen; nur ein enger deterministischer Writer darf daraus einen Arbeitsbranch bzw. PR erzeugen. Keine automatische Produktions-, DNS-, Firewall-, Preis- oder Rechtsänderung allein durch Modelltext.

GitHub Agentic Workflows dient als offizielles Blueprint für read-only Agenten und sanitised safe-outputs. Die Engine-Dokumentation erlaubt engine-spezifische eigene API-Basisvariablen, belegt hier aber keine fertig getestete native OpenRouter-/DeepSeek-Integration. Keine fremden Workflows ungeprüft importieren. Folgeworkflows und das Verhalten von `GITHUB_TOKEN`-erzeugten Ereignissen separat berücksichtigen; eine erfolgreiche API-Schreiboperation beweist keinen gestarteten Folgecheck.

## 2. Lokaler GitLab-Betrieb

Offizielle MR-Pipelines verlangen passende Regeln für `CI_PIPELINE_SOURCE == "merge_request_event"`; Fork-Konfiguration, Quellprojekt und geschützte Variablen/Runner sind getrennte Grenzen. GitLab beschreibt den Shell-Executor ausdrücklich als hohes Host-/Netzrisiko und nur für vertrauenswürdige Builds geeignet. Der Docker-Executor ist im nichtprivilegierten Modus und ohne unnötige Fähigkeiten zu bevorzugen.

Passende Adaption: tatsächlichen lokalen GitLab-Endpunkt und Runner zuerst messen; Registrierung und API-/Repository-Rechte scoped binden. Build und Tests vom Credential-tragenden Writer trennen. Jobtoken-Allowlist und Benutzerrechte wirken gemeinsam. `resource_group` serialisiert konkurrierende schreibende oder deployende Jobs. Diese Recherche belegt weder einen vorhandenen lokalen GitLab-Dienst noch eine Runner-Registrierung oder Remote-MR-Berechtigung.

## 3. Gewünschtes Modell: exakt belegt

Der offizielle öffentliche OpenRouter-Katalog enthält beim Abruf genau den angefragten Eintrag:

- Modell-ID: `deepseek/deepseek-v4.1-flash-1017`
- Kanonischer Slug: `deepseek/deepseek-v4.1-flash-20261017`
- Kontext laut Katalog: `1048576` Tokens
- `supported_parameters` enthält `reasoning`, `reasoning_effort`, `response_format`, `structured_outputs`, `tools` und `tool_choice`.

Die offiziellen Reasoning-Dokumente zeigen `reasoning: { "effort": "high" }`. `effort` und das separate Reasoning-`max_tokens` nicht gleichzeitig setzen.

```json
{"model":"deepseek/deepseek-v4.1-flash-1017","reasoning":{"effort":"high"},"provider":{"require_parameters":true,"allow_fallbacks":false}}
```

Das Beispiel dokumentiert den gewünschten Requestvertrag, keinen ausgeführten Modellaufruf. Der Providerkatalog wurde ebenfalls nur gelesen. `require_parameters: true` verhindert laut Dokumentation die Zuweisung zu Providern, die verlangte Parameter ignorieren würden. Die tatsächliche Strict-JSON-Schema-/Reasoning-Wirkung und Autorisierung bleiben erst durch einen gesonderten echten Aufruf nachweisbar.

### Kosten: Einheiten und fehlendes request-Feld

Prompt-/Completion-Werte des Modellkatalogs sind USD pro Token; `provider.max_price.prompt` und `.completion` werden laut Providerdokumentation in USD pro Million Tokens angegeben. Die gleiche Dokumentation beschreibt `max_price.request` für feste Gebühren je Aufruf.

Beobachtete Katalogwerte: prompt `0.0000003`, completion `0.0000012`; außerdem Cachepreise und zeitabhängige Overrides. Dies sind Provider-Metadaten und keine freigegebenen NeXify-Verkaufspreise.

Das konkrete Modell und alle beobachteten Endpoint-Preisobjekte liefern kein `pricing.request`. Ein allgemeiner offizieller omitted→0-Default wurde nicht belegt und wird nicht erfunden. Falls die Implementierung keine Aufrufgebühr akzeptiert, kann sie als ausdrückliche Preisbedingung `provider.max_price.request: 0` setzen; das ist eine neue Obergrenze, keine Interpretation des fehlenden Feldes. Routing und Budget müssen bei unbekannten oder widersprüchlichen Kosten scheitern, statt Gebühren zu schätzen.

Die offizielle Usage-Dokumentation bezeichnet `usage.cost` als tatsächlich dem Konto berechneten Gesamtbetrag. Usage wird nach aktuellem Dokumentationsstand automatisch geliefert; `usage.include` und `stream_options.include_usage` sind dort als überholt ohne Wirkung beschrieben. BYOK-`upstream_inference_cost` ist kein allgemeiner Ersatz für den Gesamtkontobetrag. Ein echtes Modellresponse samt Kosten wurde hier nicht angefordert.

Die Providerdokumentation beschreibt EU-/US-Regionalrouting für Business/Enterprise über entsprechende regionale Basis-URLs. Eine Provider-Marke oder ein einzelner Parametername beweist keine EU-Verarbeitung oder Vertragsgrundlage. Private Kundendaten/Quellgeheimnisse dürfen nicht allein aufgrund erfolgreicher Katalogabfrage übertragen werden.

## 4. MCP und REA: ursprünglicher Ermittlungsstand und neue Identifizierung

Die offizielle MCP-URL latest leitete beim Abruf auf Spezifikation `2026-07-28` weiter. Sie beschreibt `tools/list`, Pagination, Schemafelder und optionale Annotationen. Annotationen sind Hinweise; sie garantieren keine wahrheitsgetreue oder berechtigte Toolausführung.

Messung in dieser Sitzung: Ganzwortsuche nach REA über N1, N2 und A1 ergab keine Quelltreffer; in der bereitgestellten aufrufbaren Tool-Metadatenliste war kein REA-/GitHub-/GitLab-Dienstconnector sichtbar. Eine offizielle Registry-Substringsuche lieferte 100 Einträge und einen weiteren Cursor; diese breite Teilseite beweist weder Nichtexistenz noch Identität des gemeinten Dienstes. Es wird keine fiktive Auflösung der Abkürzung oder Toolfunktion zugeordnet.

Der obige Ermittlungsstand war historisch vor der anschließenden Nutzerklärung. **Neu konkret benannt:** [morluto/rea](https://github.com/morluto/rea), npm-Paket `rea-agents`. Die danach gelesenen offiziellen npm-Metadaten bestätigen `rea-agents` Version 6.8.0 mit `git+https://github.com/morluto/rea.git` als Repository. Das bestätigt die Paket-/Projektzuordnung, noch keinen initialisierten MCP-Server. Die isolierte Prüfung von `rea-mcp` übernimmt die dafür zugewiesene unabhängige Instanz; diese Recherche installiert das Paket nicht doppelt.

Für tatsächliche MCP-Nutzung müssen die Bridge, deren konkrete autorisierte Serverbindung/Transport und Werkzeuge geprüft werden. Danach: reale Initialisierung und ausgehandelte Protokollversion erfassen; `tools/list` vollständig paginieren; Ein-/Ausgabeschema und Server-Aktionsvertrag lesen; engste lesende Probe ausführen; Inhalt und Identität rücklesen. In dieser Recherche wurde kein `initialize`, `tools/list` oder REA-Toolaufruf durchgeführt; die aktuelle Messung wird getrennt dokumentiert.

## 5. Übernahme ohne falsche Fertigmeldung

Die Quellen begründen die oben genannten Adaptionen. Sie ersetzen keine lokale Runnerprüfung, GitHub-/GitLab-Schreibprobe, produktive Freigabe, verifizierte REA-Verbindung oder tatsächliche AI-Inferenz. Workflow-Dateien und Root-Konfiguration wurden durch diese Recherche nicht verändert.

## Quellenübersicht

| ID | Offizielle URL nach Weiterleitung | HTTP | Antwort-SHA256 |
|---|---|---:|---|
| github-security | https://docs.github.com/en/actions/reference/security/secure-use | 200 | `df4e344b78eb344eae2d926a4d1b844c61d06e8f465db48e248750494e067889` |
| github-events | https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows | 200 | `55885071e7d98dd9b31cae3625ff6b927ad19187af0de1a4b1698de2f455e6c8` |
| github-permissions | https://docs.github.com/en/actions/tutorials/authenticate-with-github_token | 200 | `f93d573ddd6476bd35d57a0ffae80b5b44c4c7cedbb93b16b24c7d727484d9e8` |
| github-agent-workflows | https://github.github.io/gh-aw/introduction/overview/ | 200 | `a06ff3437e27aa0e06c4c6952aa21722ffc839aa96f8ab52e01d8df407b93f6d` |
| gitlab-mr-pipelines | https://docs.gitlab.com/ci/pipelines/merge_request_pipelines/ | 200 | `ff32ec40e368f0d4551ea91386d03094329f0c0c9024aed86fd352b461b4140a` |
| gitlab-runner-security | https://docs.gitlab.com/runner/security/ | 200 | `2a5be59675d0698f369254e2259a2aeff9ebc771a23ae90ed4f894f0d17e04fb` |
| gitlab-resource-groups | https://docs.gitlab.com/ci/resource_groups/ | 200 | `6e868560ceafe64468d63ebfe69fe17785abe7aff127ab6cde6c9b73c093c188` |
| gitlab-job-token | https://docs.gitlab.com/ci/jobs/ci_job_token/ | 200 | `78084e9647182d2ae22ffe28e187f1e0a19c6da22c8911f9035ee7509cb6a5fd` |
| openrouter-models | https://openrouter.ai/api/v1/models | 200 | `5ae44235b454fadb0a066b3a3c257edfe1c1911e56851de08191d9997e574d63` |
| openrouter-reasoning | https://openrouter.ai/docs/guides/best-practices/reasoning-tokens | 200 | `9120cd080b7e5d6af90f475ba5918303fa74d7144125478c839467427e1f6e45` |
| openrouter-models-api | https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties | 200 | `ea1b09c7fd38469153595cb97c9d3f22fd31af9cf4c2df75fa484da64b064df9` |
| mcp-tools | https://modelcontextprotocol.io/specification/2026-07-28/server/tools | 200 | `6ea4dc8eb19ae205239724a9db8af09b3ef6b3cfd54044e7c8e41a0306ee64e0` |
| mcp-schema | https://modelcontextprotocol.io/specification/2026-07-28/schema | 200 | `4b6ec032ebe6376bdb6bdf9cc273088f0a1f7a5a85626bcce6f152fe57965e1e` |
| openrouter-endpoints | https://openrouter.ai/api/v1/models/deepseek/deepseek-v4.1-flash-1017/endpoints | 200 | `675135c5d8b26eba269bf1ca39382c907c1d2e39cafcfa3373d263101920d49c` |
| openrouter-provider-routing | https://openrouter.ai/docs/guides/routing/provider-selection | 200 | `901a8f303677a89540f4213245055205dc6f04956d4b9bf83bfb95cdf1d9f6a3` |
| github-aw-engines | https://github.github.io/gh-aw/reference/engines/ | 200 | `adc7372a745863b516f259172230376649053dca1b810403274a144d6ccf9789` |
| mcp-registry-rea-search | https://registry.modelcontextprotocol.io/v0.1/servers?search=rea&limit=100 | 200 | `18b7776123391a467d18849737eccd1e129d6ce5115c21406080a962aa6b9df3` |
| openrouter-usage-accounting | https://openrouter.ai/docs/cookbook/administration/usage-accounting | 200 | `684a9d8288912e9b32ffb16f7c651e96e8e92015856f37ede17b28f3cbc0e6ee` |
| github-triggering | https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow | 200 | `b502974ae258ffd4dc1b9db5c9f4e544454a808d66cf44cc4dfc977ae42f640b` |
| openrouter-models-overview | https://openrouter.ai/docs/guides/overview/models | 200 | `b9cb7b4b5f895a7317be190bbac44b5cffdf9d7d91fbfb88b2e1c8121986e3d4` |

## Belegte kurze Auszüge

### github-security

> Pin actions to a full-length commit SHA Pin references to actions to a commit SHA in your workflow files. This helps mitigate the risk of a bad actor adding a backdoor to the action's repos

> credentials being used within workflows have the least privileges required. Actions can use the GITHUB_TOKEN by accessing it from the github.token context. For more information, see Contexts reference . You should therefore 

> intermediate environment variable For inline scripts, the preferred approach to handling untrusted input is to set the value of the expression to an intermediate environment variable.

> Avoid using the pull_request_target and workflow_run workflow triggers with untrusted pull requests or code content. Workflows that use these triggers must not explicitly check out untrusted code, inclu

### github-events

> Running untrusted code on the pull_request_target trigger may lead to security vulnerabilities. These vulnerabilities include cache poisoning and granting unintended access to write privileges or secrets. To

> workflow started by the workflow_run event is able to access secrets and write tokens, even if the previous workflow was not. This is useful in cases where the previous workflow is intentionally not privileged, but you need to take a p

### github-permissions

> grant the GITHUB_TOKEN the least required access. To see the list of permissions available for use and their parameterized names, see Workflow syntax for GitHub Actions . The two workflow examples e

> create a GitHub App and generate an installation access token within your workflow. For more information, see Making authenticated API requests with a GitHub App in a GitHub Actions workflow . Alternatively, you

### github-agent-workflows

> generated agent job uses read-only permissions by default. The recommended write path is sanitized safe-outputs , which can create issues, comments, and pull requests without granting the AI agent direct wri

> recommended write path is sanitized safe-outputs , which can create issues, comments, and pull requests without granting the AI agent direct write access. Direct write permissions and custom jobs ar

### gitlab-mr-pipelines

> CI_PIPELINE_SOURCE == "merge_request_event" . You must have the Developer, Maintainer, or Owner role for the source project to run a merge request pipeline. Your repository must be a GitLab rep

> Both the source and target branches are protected . The user triggering the pipeline has push/merge access to the target branch. Both source and target branches belong to the same project. Merge requ

> fork (source) project, not the parent (target) project. Uses the fork project’s CI/CD configuration, resources, and project CI/CD variables. Pipelines for forks display wi

### gitlab-runner-security

> High-security risks exist to your runner host and network when running builds with the shell executor . The jobs are run with the permissions of the GitLab Runner’s user and can steal code from other project

> non-privileged mode . To make such a configuration more secure, run jobs as a non-root user in Docker containers with disabled sudo or dropped SETUID and SETGID capabili

### gitlab-resource-groups

> To ensure that a deploy job runs once at a time, you can specify resource_group keyword to the concurrency sensitive job: yaml deploy : # ... resource_group : production With this configuration, th

### gitlab-job-token

> add the group or project to the job token allowlist . The user that triggers the job must be a member of your project. The user must have the permissions to perform the action. If your project is publi

> only when the job is running. You should also configure your runners to be secure: Avoid using Docker privileged mode if the machines are re-used. Avoid using the shell executor 

### openrouter-reasoning

> "effort" : "high" , // Can be "max", "xhigh", "high", "medium", "low", "minimal" or "none" (OpenAI-style) "max_tokens" : 2000 , // Specific token limit (Anthropic-styl

> One of the following (not both): "effort" : "high" , // Can be "max", "xhigh", "high", "medium", "low", "minimal" or "none" (OpenAI-style) "max_tokens" : 2000 , // Specific token li

### openrouter-models-api

> supported_parameters" : [ "temperature" , "top_p" , "max_tokens" ], "supported_voices" : null , "top_provider" : { "context_length" : 8192 , "is_moderated" : true , "max_

> List all models and their properties - OpenRouter | Documentation Documentation Index Fetch the complete documentation index at: /docs/llms.txt Use this file to discover all available pa

### mcp-tools

> MUST respond to tools/list requests with the set of tools currently available to the requesting client. This set MAY be empty and MAY change over time (see List Changed Notification ), 

> This operation supports pagination and caching . Request: { "jsonrpc" : "2.0" , "id" : 1 , "method" : "tools/list" , "params" : { "cursor" : "optional-cursor-value" } } Response: { "jsonrpc" : "2.

> clients MUST consider tool annotations to be untrusted unless they come from trusted servers. ​ Tool Names Tool names SHOULD be between 1 and 128 characters in length (inclusive). Tool names SHOULD be con

### mcp-schema

> all properties in ToolAnnotations are hints . They are not guaranteed to provide a faithful description of tool behavior (including descriptive properties like title ). Clients should never mak

> They are not guaranteed to provide a faithful description of tool behavior (including descriptive properties like title ). Clients should never make tool use decisions based on ToolAnnotations received from 

### openrouter-provider-routing

> When you set require_parameters to true , the request won’t even be routed to that provider. ​ Default parameter preferences Even when require_parameters is false , a small set of parameter

> allow_fallbacks set to false that skips over OpenAI (which doesn’t host Mixtral), tries Together, and then fails if Together fails: TypeScript SDK TypeScript (fetch) Python impor

> value {"prompt": 1, "completion": 2} will route to any provider with a price of <= $1/m prompt tokens, and <= $2/m completion tokens or less. Some providers support per request pricing, 

> request attribute of max_price. Lastly, image is also available, which specifies the max price per image you will accept. Practically, this field is often combined with a provider 

> https://eu.openrouter.ai or https://us.openrouter.ai , and its prompts and completions are processed entirely within that region. Learn more in the In-Region Routing guide . 

### github-aw-engines

> Custom API Endpoints via Environment Variables Engine Command-Line Arguments Custom Engine Command Custom Harness Script (harness) Harness Retry and Post-result Watchdog Policy Model aliases Order

> Built-in ID, or the ID of an imported definition . model Exact model ID, alias, or provider-prefixed selection; may also be top-level model . version Override the compiler-pinned CLI version. env Ru

### openrouter-usage-accounting

> Full usage details are now always included automatically in every response. ​ Response Format Every response includes a usage object with detailed token information: { "object" : "chat.completion.chunk" , "

> cost : The total amount charged to your account cost_details.upstream_inference_cost : The actual cost charged by the upstream AI provider ​ Benefits Efficiency : Get usage information without maki

> upstream_inference_cost field is only available for BYOK (Bring Your Own Key) requests. For all other requests it will be 0 or null. ​ Examples ​ Basic Usage with Token Tracking ​ Streaming with Usage Infor

### github-triggering

> events triggered by the GITHUB_TOKEN will not create a new workflow run, with the following exceptions: workflow_dispatch and repository_dispatch events always create workflow runs. pull

> workflow_dispatch and repository_dispatch events always create workflow runs. pull_request events with the opened , synchronize , or reopened activity types: when a wo

> GitHub App installation access token or a personal access token instead of GITHUB_TOKEN to trigger events that require a token. Using one of these alternatives also lets pull_request wor


### openrouter-models-overview

> All pricing values are in USD per token/request/unit. A value of "0" indicates the feature is free. { "prompt" : string , // Cost per input token "completion" : string , // Cost per output token "request" : string , // Fixed cost per API request "image" : string , // Cost per image input "web_search" : string , // Cost per web search operation "internal_reas

Der offizielle Schema-Auszug bestätigt die Token-/Request-Einheiten und explizit den Preiswert `0`; er behauptet keinen Default für fehlende Preisfelder.

### REA: nachträglicher offizieller Identitätsbeleg

- URL: https://registry.npmjs.org/rea-agents/latest
- Abgerufen: 2026-10-26T07:05:55.803019+00:00
- HTTP 200; Antwort-SHA256: `37ade4fc52a4bf8f86a80eb9b28bccc706b5785c39697714f4477f135cfabda0`
- Metadaten: `rea-agents` 6.8.0 → `git+https://github.com/morluto/rea.git`. Keine Aussage über Installations-/Laufzeitsicherheit allein aus Metadaten.

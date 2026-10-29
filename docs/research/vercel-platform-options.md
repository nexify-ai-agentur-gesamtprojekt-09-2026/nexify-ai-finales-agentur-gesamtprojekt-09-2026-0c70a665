# Vercel und AI SDK: geprüfte Wiederverwendungsroute

Stand 26.10.2026. Vollständiger Quellen-/Versionskatalog dieses Rechercheumfangs: [vercel-platform-options.json](../../config/research/vercel-platform-options.json). Rohantworten und Read-back-Belege: `/workspace/.onboarding/vercel-research`.

Empfehlung: die vorhandene React/Vite-Oberfläche behalten und den offiziellen AI-SDK-Transport verwenden: **`useChat` → `DefaultChatTransport` → eigene gleichursprüngliche Vercel Function → serverseitiger Agent**. HTTP-/UI-Streaming, typisierte Toolteile und Agentenschleife müssen dafür nicht neu erfunden werden. Eine Next.js-Migration, ein fremdes Dashboard oder ein generischer Shell-/MCP-Ausführungsendpunkt sind dafür nicht erforderlich.

## Umfang und Lesestatus

Die Vercel-Startdatei `https://vercel.com/docs/llms.txt` leitete auf `https://vercel.com/llms.txt` weiter. Ihr offizieller Sitemap-Verweis wurde vollständig katalogisiert: **1.725 Linkeinträge, 1.713 eindeutige Dokument-URLs**. Die AI-SDK-Datei `https://ai-sdk.dev/llms.txt` ist kein kleiner Linkindex, sondern ein Volltextpaket: **539 Dokumentblöcke** wurden mit URL, Titel und Hash erfasst. Der zusätzlich vom offiziellen Vercel-Workflow-Handbuch verlinkte Workflow-Index enthält **207 Volltextabschnitte**. Dessen Bulk-Frontmatter enthält keine kanonischen Einzel-URLs; es wurden dafür keine URLs erfunden.

**Katalogisiert oder heruntergeladen bedeutet nicht vollständig gelesen.** Der JSON-Katalog unterscheidet je Quelle/Seite:

- `fulltext_read`: einzelner Volltext beziehungsweise Index tatsächlich vollständig gelesen, beispielsweise Transport, OpenRouter-Provider, `createAgentUIStreamResponse` und Workflow-Vite-Setup.
- `relevant_sections_reviewed`: Volltext liegt vor; die fachlich relevanten Abschnitte wurden geprüft, nicht jeder Absatz unabhängig bewertet.
- `index_only`: URL/Titel nur aus der Sitemap erfasst.
- `fulltext_retrieved_not_reviewed`: im Bulk vorhanden, jedoch nicht als vollständig semantisch gelesen ausgegeben.
- `metadata_fields_verified`: npm-Version, Engines, Peers und Lizenzmetadaten geprüft; keine SDK-Code- oder Lieferkettenabnahme.
- `open_failed_url`: HTTP-Fehler; kein gelesener Seitentext behauptet. Beispielsweise wurde der frühere Singularpfad `/docs/workflow` durch den im Index belegten Pluralpfad `/docs/workflows` ersetzt.

Insgesamt wurden **52 Rohquellenabfragen** festgehalten: **46 erfolgreich, sechs fehlgeschlagene URLs**. Vollständige REST-Controlplane, Knowledge Base, Blog, Changelog, Academy und sämtliche Providerseiten wurden nicht inhaltlich durchgeprüft. Es gibt weder eine „alle Docs auswendig“- noch eine Fehlerfreiheits- oder Produktionsabnahmebehauptung.

## Zusammenpassende Versionen

Die Werte stammen aus der offiziellen npm-Registry, nicht aus geratenen Versionsnummern. Dieser Rechercheauftrag hat keine Pakete installiert, importiert oder ausgeführt. Die Projektumsetzung kann parallel bereits Abhängigkeiten hinzufügen; das ist kein durch diese Recherche geführter Laufzeitnachweis.

| Zweck | Konkreter Kandidat | Belegte Kompatibilität/Grenze |
| --- | --- | --- |
| AI Core und Agenten | `ai@7.0.153` | Node ≥ 22; Zod `^3.25.76` oder `^4.1.8` |
| React-UI | `@ai-sdk/react@4.0.157` | Passend zu AI 7; React-Peer umfasst bestehendes `19.3.1` |
| Gewählter OpenRouter-Weg | `@openrouter/ai-sdk-provider@3.1.0` | Peer `ai:^7.0.0`; Node ≥ 22 |
| Schema | `zod@4.6.7` | Erfüllt die genannten Peers |
| Optional: AI Gateway | `@ai-sdk/gateway@4.0.126` | Aktuelle Provider-Generation; kein verpflichtender zusätzlicher Broker |
| Optional: dauerhafte Agenten | `@ai-sdk/workflow@2.0.85` + `workflow@5.2.3` | Erstes Paket hängt exakt an `ai@7.0.153`; Workflow-Peer `^5.1.0` |
| Optional: Vite-Backend | `nitro@3.0.260903-beta` | Ausdrücklich **Beta**, Node `^20.19.0` oder `>=22.12.0` |
| Optional: Functions-Hilfen | `@vercel/functions@3.10.3` | Für den einfachen Web-Fetch-Handler nicht zwingend erforderlich |
| Optional: Sandbox / Telemetrie | `@vercel/sandbox@3.9.0` / `@vercel/otel@2.1.3` | Eigenständige Dienste/Peer-Anforderungen, keine automatische Aktivierung |

**Nicht mischen:** Das ältere `@workflow/ai@5.0.3` verlangt `ai:^6` und gehört nicht in den obigen AI-7-Satz. Die aktuelle AI-SDK-Dokumentation verwendet stattdessen `@ai-sdk/workflow`. Apache-2.0-/MIT-Angaben aus npm stehen pro Paket im JSON; ein vollständiges Abhängigkeits-/Distributionsaudit ist damit nicht erledigt.

## Minimaler offizieller React-/Function-Vertrag

[Vercel Node.js Runtime](https://vercel.com/docs/functions/runtimes/node-js.md) und [Functions API Reference](https://vercel.com/docs/functions/functions-api-reference.md) dokumentieren für ein `api/index.ts` am ausgewählten Projektroot:

```ts
export default {
  async fetch(request: Request): Promise<Response> {
    // Methode, Session/Owner, CSRF, Body und Budget hier prüfen.
    // Anschließend eine normale oder streamende Web-Response zurückgeben.
    return new Response('Documented Web Request/Response handler shape');
  },
};
```

Benannte HTTP-Methodenexports sind ebenfalls dokumentiert. Das ist eine Signaturreferenz, kein fertiger Auth-/Agentenendpunkt. In einer Monorepo-Konfiguration zählen der tatsächliche Vercel-Projektroot und die Reihenfolge der API-/SPA-Routingregeln; ein SPA-Catch-all darf die API nicht verschlucken.

[AI SDK Transport](https://ai-sdk.dev/docs/ai-sdk-ui/transport) bestätigt:

```tsx
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({ api: '/api/chat' }),
});
```

Nachrichten werden über `sendMessage({text})` gesendet und aus `UIMessage.parts` gerendert. [createAgentUIStreamResponse](https://ai-sdk.dev/docs/reference/ai-sdk-core/create-agent-ui-stream-response) liefert serverseitig eine `Promise<Response>` mit dem offiziellen UI-Message-Stream:

```ts
return createAgentUIStreamResponse({
  agent: approvedServerAgent,
  uiMessages: messages,
  abortSignal: request.signal,
  timeout: approvedTimeoutMs,
});
```

Die beiden Platzhalter stehen ausdrücklich für geprüfte serverseitige Konfiguration. Die Utility validiert UI-Nachrichten und konvertiert sie zum Modellformat; sie authentisiert keinen Benutzer und bestätigt keine Mandantenrechte. Für einfachere Fälle ist `streamText(...).toUIMessageStreamResponse()` dokumentiert. Eigene SSE-Dialekte oder das Weiterverwenden alter `message.content`-/`handleSubmit`-Beispiele sind nicht notwendig.

## Agenten, Tools, Auth und Persistenz

[Building Agents](https://ai-sdk.dev/docs/agents/building-agents) dokumentiert `ToolLoopAgent`, `tool({inputSchema,execute})`, Agent-`toolApproval` und **`isStepCount(...)`**. Die aktuelle Defaultschleife umfasst 20 Schritte. Diese Voreinstellung ist keine Kostenobergrenze und sollte nicht unbesehen übernommen werden. Nur konkrete Domainwerkzeuge registrieren; Identität, Objektbesitz, Scopes, fachliche Freigaben und dauerhaft gebundene Request-IDs bleiben im Backend erforderlich. Eine vom Modell gelieferte Zustimmung ist keine Benutzerfreigabe.

Der HTTP-Transport unterstützt Cookies und dynamische Authheader. **Clerk-UI ist keine serverseitige Verifikation; Vercel OIDC ist keine Endbenutzeranmeldung.** [Gateway OIDC](https://vercel.com/docs/ai-gateway/authentication-and-byok/oidc.md) authentisiert eine Deployment-/Workloadidentität gegenüber Gateway. Das ersetzt weder die bestehende Besuchersitzung mit CSRF noch private Benutzer-/Mandantenberechtigungen.

Die [Persistenzanleitung](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence) schließt Autorisierung und Fehlerbehandlung ausdrücklich aus und nutzt illustrative Dateien. Produktionsverläufe müssen über einen dauerhaften, besitzgebundenen Store geladen werden; die gesamte vom Browser gelieferte Historie ist kein vertrauenswürdiges Serverjournal. `onUIMessageStepEnd` kann eine idempotente Zwischenspeicherung vor dem jeweiligen `finish-step`-Chunk abwarten. `consumeStream()` kann Erzeugung nach einem Browserdisconnect fortsetzen; das ist eine bewusste Kosten-/Abbruchentscheidung, keine kostenlose Persistenzgarantie.

`maxRetries` bei `streamText` hat Default **2**. Für nicht automatisch wiederholbare bezahlte Aufrufe ist `0` erforderlich. Bei `streamRetries` deaktiviert Weglassen die gesamte Stream-Retrylogik; `0` allein lässt noch einen callbackgesteuerten Retry zu. Unklare bezahlte Ergebnisse müssen reconciliiert werden. Bereits ausgeführte Providertools lassen sich durch Streaming-Recovery nicht rückgängig machen.

## OpenRouter, Gateway, Region und Kosten

Der offizielle [OpenRouter-Provider](https://ai-sdk.dev/providers/community-providers/openrouter) bietet `createOpenRouter` und `openrouter.chat(modelId)`. Für den bereits bestimmten Weg ist **`deepseek/deepseek-v4.1-flash-1017`** mit Reasoning `high` beizubehalten. Die konkrete Reasoning-/Usage-Wireabbildung des installierten Providers muss noch getestet werden; es wurde keine Inferenz ausgeführt. JavAI hat weiterhin keine bestätigte Modell-ID und wird nicht in einen anderen Namen umgedeutet.

Der öffentliche [Gateway-Modellkatalog](https://ai-gateway.vercel.sh/v1/models) lieferte 480 Modelle und enthält denselben exakten DeepSeek-Identifier. **Dessen `regions` ist aktuell ausschließlich `['us']`.** Das ist weder ein EU-Nachweis noch eine Erlaubnis zum stillen Modell-/Brokerwechsel. Ohne Regionpin routet Gateway global; eine nicht bedienbare gepinnte Region schlägt laut [Regional Inference](https://vercel.com/docs/ai-gateway/security-and-compliance/regional-inference.md) fehl, statt automatisch zu einer weiteren Region abzustufen. Region und ZDR sind unterschiedliche Regeln.

[Gateway Pricing](https://vercel.com/docs/ai-gateway/pricing.md) nennt keinen Tokenaufschlag und keine Gateway-BYOK-Gebühr. Gleichzeitig ist BYOK dort an Paid Tier und gekaufte Credits gebunden; fehlgeschlagene eigene Credentials können standardmäßig auf Systemcredentials zurückfallen, deren Verbrauch aus Gateway-Credits bezahlt wird. Zahlungsabwicklung, Reporting oder Trace-Drains können weitere Kosten verursachen. Kein Aufschlag bedeutet nicht kostenlos und nicht ausschließlich Verbrauch des eigenen Providerkontos. Die Regeln von OpenRouter BYOK sind ein anderer Vertrag und dürfen damit nicht vermischt werden.

Aktuelle [Function-Limits](https://vercel.com/docs/functions/limitations.md): Streaming zählt zur Laufzeit. Mit Fluid Compute werden 300 s für Hobby, 800 s maximal für Pro/Enterprise und ein bedingter 1.800-s-Betaausbau dokumentiert; Payloadlimit 4,5 MB. Das sind Herstellergrenzen, keine bereits gesetzten Projektwerte. [Hobby](https://vercel.com/docs/plans/hobby.md) ist auf persönliche, nichtkommerzielle Nutzung begrenzt und darf nicht pauschal als kostenloser kommerzieller B.V.-Betrieb empfohlen werden.

## Workflow, Sandbox und Observability

Für einen später benötigten dauerhaften Agenten ist die dokumentierte Route [Workflow in Vite](https://workflow-sdk.dev/docs/getting-started/vite): `nitro/vite` und `workflow/vite` als Plugins, Nitro-Serververzeichnis sowie dessen APIroute; anschließend `WorkflowAgent`/`WorkflowChatTransport` aus der aktuellen AI-7-Paketfamilie. Nur `'use workflow'` in eine beliebige Vite-Datei zu schreiben, reicht nicht. Automatische Step-Retries sind laut [Retry-Guide](https://workflow-sdk.dev/docs/foundations/errors-and-retries) standardmäßig dreimal möglich. Mail, Zahlung und andere Seiteneffekte benötigen deshalb ihre eigenen Idempotenz-/Reconciliation-Verträge.

[Workflows](https://vercel.com/docs/workflows.md) können mit Workflow 5 regional gebunden werden; Runpayloads/Streams folgen dieser Region. **Hookrecords und Observabilitymetadaten haben abweichendes Verhalten.** [Retention](https://vercel.com/docs/workflows/retention.md) unterscheidet Lesefrist und spätesten Löschtermin; Logs, Traces und eigene Stores folgen anderen Regeln. Für bereits abgeschlossene einzelne Runs ist dort keine Lösch-API dokumentiert. Experimentelle Zero-Retention gilt für neue Runs und beseitigt keine Metadaten. Workflow-Events, Datenwrites, Retention und Function-Compute sind kostenrelevante getrennte Größen.

[Vercel Sandbox](https://vercel.com/docs/sandbox.md) bietet isolierte Firecracker-Umgebungen für ausdrücklich benötigte Codeausführung. Die [Firewall](https://vercel.com/docs/sandbox/concepts/firewall.md) hat jedoch Default `allow-all`; Egressbeschränkung und Secretbrokering sind explizit einzurichten. Ein `experimental_sandbox`-Parameter sandboxed ein Tool nicht von selbst. Für vorhandene Angebots-/Termin-/Marketingwerkzeuge ist keine allgemeine öffentliche Codeshell notwendig. CPU, allokierter Speicher während Wartezeiten und weitere Sandboxmeter sind separat kostenpflichtig beziehungsweise planabhängig.

Die aktuelle [AI-7-Telemetrieanleitung](https://ai-sdk.dev/docs/ai-sdk-core/telemetry) ist besonders relevant: **opt-out, Inputs und Outputs standardmäßig aufgezeichnet**. Für minimale Verarbeitung `telemetry:{isEnabled:false}` oder gezielt geprüfte `recordInputs`-/`recordOutputs`-Regeln setzen. Keine globale Integration zu registrieren deaktiviert nicht sämtliche Events. [Vercel Observability](https://vercel.com/docs/observability.md), Gateway-Usage/Logs und eigene Audit-/Conversationdaten haben unterschiedliche Zugriffe und Fristen; echte Account-/Kostenbelege stehen noch aus.

## Empfohlene Reihenfolge für NeXify

1. Offiziellen React-Transport und gleichursprüngliche Node-Function integrieren; öffentliche Orientierung und bezahlten Modellzugang getrennt absichern. Den ausgewählten OpenRouterweg serverseitig binden, ohne neue öffentliche Provider-/Modellauswahl aus ungeprüften Requestfeldern.
2. Beschränkte Domainwerkzeuge, Besitz-/Sessionprüfung, harte Budgets und dauerhafte Request-/Chatpersistenz testen. Streamen, Stoppen, Disconnect, Reload, Fehler und fremden Chatbesitz mit Provider-Mocks prüfen; nur tatsächliche Zustände in der eigenen UI anzeigen.
3. Workflow/Nitro erst als eigenes benötigtes Inkrement übernehmen und mit aktuellen kompatiblen Paketen, Idempotenz, Region, Retention und Wiederaufnahme testen. Sandbox nur für einen konkret autorisierten Codeausführungsfall hinzufügen.

Es wurden keine Schlüssel gelesen, keine Account-/ENV-Einstellungen geändert und keine kostenpflichtigen Aufrufe ausgeführt. **Der Forschungsstand ist eingefroren; die Dokumentationsgrundlage ist kein Live-, Auth-, Billing- oder Produktionsnachweis.**

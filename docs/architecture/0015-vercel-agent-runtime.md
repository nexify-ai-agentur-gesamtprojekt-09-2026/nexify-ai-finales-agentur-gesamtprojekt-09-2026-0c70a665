# Vercel Agent Runtime für die portable React-Anwendung

Stand **26.10.2026**. Dies ist der recherchierte Integrationsvertrag, kein
Nachweis einer laufenden Modell-, Auth- oder Datenbankanbindung. Geprüfte
Versionen, offizielle Quellen mit Abrufzeit/Hash und konkrete Tests stehen in
[vercel-agent-runtime.json](../../config/integrations/vercel-agent-runtime.json).
Diese Aufgabe installiert keine Pakete und führt keinen bezahlten Modellaufruf aus.

## Ergebnis: React/Vite und Root-Functions passen zusammen

Die öffentliche Oberfläche bleibt `apps/site` mit React **19.3.1** und Vite
**8.3.5**. Vercel unterstützt für den Node-Runtime eigene TypeScript-Dateien
im Root-Verzeichnis `api/`; hierfür ist kein Next.js-Frontend erforderlich.
Die Root-`package.json` bindet bereits `engines.node = "22.x"`. Vercel bietet
Node 22.x an; Minor-/Patchstände werden von der Plattform verwaltet.

Die zur Recherche veröffentlichten Versionen passen anhand ihrer Metadaten:

| Paket | Geprüfte Version | Relevanter Vertrag |
|---|---|---|
| `ai` | **7.0.153** | Node ≥22; Zod-Peer `^3.25.76` oder `^4.1.8`; Agent-, Transport- und UIstream-APIs. |
| `@ai-sdk/react` | **4.0.157** | Abhängigkeit auf `ai@7.0.153`; React-Peer umfasst über `^19.2.1` auch das vorhandene React 19.3.1. |
| `@openrouter/ai-sdk-provider` | **3.1.0** | Peer `ai ^7.0.0` und derselbe Zod-Bereich; `createOpenRouter` unterstützt serverseitigen Key und injiziertes `fetch`. |

Alle drei veröffentlichten Archive wurden gegen die npm-SHA-512-Integrität
geprüft; Paket-README und Typdeklarationen wurden ausgewertet, beim
OpenRouter-Adapter außerdem die Requestserialisierung. Das ist eine API- und
Peerprüfung, keine ausgeführte Installation oder vollständige transitive
Supply-Chain-Prüfung. Root koordiniert die einmalige Lockfileänderung; keine
parallelen Installationen. Frontend-Hook gehört zum Site-Paket, serverseitige
Abhängigkeiten zum Besitzer der Root-Function. Nicht allein auf zufällig
hoistete Next-Abhängigkeiten vertrauen.

## Konkreter Schnitt

Vorgeschlagen ist `/api/agent-chat`, damit der vorhandene strukturierte
Besucherendpunkt `/api/chat` nicht stillschweigend ein inkompatibles Protokoll
erhält. Der neue Name ist ein geplanter Schnitt, kein bereits bestandener Aufruf.

Die offizielle Vercel-Node-Runtime unterstützt beispielsweise diese
Webstandard-Signatur in `api/agent-chat.ts`:

```ts
export default {
  async fetch(request: Request): Promise<Response> {
    return handleAgentRequest(request, trustedDependencies);
  },
};
```

Alternativ dokumentiert Vercel benannte HTTP-Exporte wie
`export async function POST(request: Request): Promise<Response>`.
`handleAgentRequest` und `trustedDependencies` stehen hier für den noch zu
prüfenden Adapter, nicht für vorhandene Imports. Derselbe plattformneutrale
Handler muss sich lokal mit echten `Request`-/`Response`-Objekten und
injizierten Abhängigkeiten testen lassen.

Im Browser lautet der SDK-Vertrag `useChat` aus `@ai-sdk/react` mit einem
stabilen `DefaultChatTransport` aus `ai`, dessen `api` ausdrücklich auf diesen
Pfad zeigt. Nachrichten werden über `message.parts` dargestellt; Lade-, Fehler-
und Abbruchzustände bleiben sichtbar. Ein einfacher JSON-/Textstream des
Python-Gateways ist **kein** AI-SDK-UIstream. `DirectChatTransport` kann laut
SDK einen Agenten im selben Prozess betreiben; für den produktiven Browser
mit Providerkeys ist dieser Weg hier ausgeschlossen.

Der Root-SPA-Rewrite lässt `/api` und `/.well-known` bereits aus. Beim Build
müssen aber sowohl die Root-Functions als auch `apps/site/dist` tatsächlich im
Vercel-Artefakt landen. Der lokale Vite-Proxy schickt `/api` derzeit an Python
auf 3003; er benötigt für den neuen Pfad ein bewusstes Node-/Vercel-dev-Ziel.
Ein statisches Backup ersetzt weder Function noch dauerhaften Datenspeicher.

## Agent- und Stream-API der geprüften Version

AI SDK **7** verwendet `ToolLoopAgent` und **`isStepCount(n)`**. Ältere
`stepCountIs`-Rezepte nicht ungeprüft übernehmen. Der Agent hat standardmäßig
20 Schritte; das ist weder ein freies Kontingent noch ein Geldbudget.

Die Modellinstanz kommt ausschließlich aus vertrauenswürdiger Serverkonfiguration.
Der Agent erhält serverseitige Instruktionen, eng registrierte Tools,
`stopWhen: isStepCount(policy.maxSteps)` und **`maxRetries: 0`**.
Die generischen Requestoptionen haben sonst standardmäßig zwei Retries.
`streamText` kennt zusätzlich `streamRetries?: number`, standardmäßig 0;
dieses Feld nicht ohne Typprüfung in andere Optionsobjekte kopieren.

Für die UI ist die geprüfte API:

```ts
return await createAgentUIStreamResponse({
  agent,
  uiMessages: trustedMessages,
  abortSignal: request.signal,
  sendReasoning: false,
});
```

`trustedMessages` bedeutet: streng validierter Benutzereingang plus die
serverseitig diesem Besitzer zugeordnete Historie. Der Browser kann keine
Systeminstruktionen, Toolfreigaben/-ergebnisse, fremde Chat-IDs oder
Provideroptionen als vertrauenswürdigen Zustand setzen.

Für einen direkten `streamText`-Pfad sind die eigenständigen Helfer
`toUIMessageStream({ stream: result.stream, ... })` und
`createUIMessageStreamResponse({ stream })` aktuell. Die entsprechenden
Methoden am Resultat sind in den AI-7-Typen als veraltet markiert.
Der UIstream verwendet das SDK-SSE-Protokoll; nicht lediglich rohe Tokens
mit einem JSON-Content-Type senden. Interne Reasoning-Inhalte gelangen nicht
als Standardausgabe an Besucher oder in Rohlogs.

## OpenRouter: exakt gebundener Wire-Vertrag

Der öffentliche Modellkatalog wurde ohne Key und ohne Inferenz gelesen.
`deepseek/deepseek-v4.1-flash-1017` ist darin eindeutig vorhanden und weist
unter anderem `reasoning`, `reasoning_effort`, `tools`, `tool_choice`,
`max_tokens` und `structured_outputs` aus. Das belegt die Katalogangabe, keine
Kontoberechtigung, aktuelle Upstreamverfügbarkeit oder bewilligte Kosten.

`createOpenRouter` erhält `apiKey` aus dem **Server**-Secret bzw. einem
autorisierten Vaultzugriff und ausdrücklich `compatibility: 'strict'`.
Reasoning High ist in Version 3.1.0 gültig über:

- Modellsettings `reasoning: { effort: 'high' }`;
- Modell-/Factorysettings `extraBody.reasoning`;
- vertrauenswürdige Aufrufoptionen
  `providerOptions.openrouter.reasoning`.

Für NeXify **einen** klaren Konfigurationspfad wählen und seine tatsächlich
serialisierte Ausgabe prüfen. Routing benötigt
`provider.allow_fallbacks: false` und `provider.require_parameters: true`.
Keine alternative `models`-Liste, kein stiller Modellwechsel und kein
angehängtes vermeintlich kostenloses Modell. Falls Vertrags-/Regionsvorgaben
einen bestimmten Upstream erfordern, reicht das Abschalten von Failover nicht:
zusätzlich die tatsächliche erlaubte Providerbindung verifizieren.

**Wichtiger Adapterbefund:** Bei Chatrequests wird
`providerOptions.openrouter` nach den erzeugten Argumenten in den Body gemischt.
Damit könnten sogar `model`, `messages` oder `provider` überschrieben werden.
Auch `extraBody` ist ein mächtiger Passthrough. Diese Objekte niemals aus
Browserpayloads übernehmen. Der SDK-Test muss den finalen HTTP-Body kontrollieren,
nicht nur ein vorgelagertes Konfigurationsobjekt. Ebenso dürfen `baseURL`,
Header und Tooldefinitionen nicht aus Besuchereingaben stammen.

Der Adapter übernimmt tatsächlich geliefertes `response.usage.cost` optional
nach `providerMetadata.openrouter.usage.cost`. Normale SDK-Tokenzählungen sind
kein Währungsbetrag. Fehlender Kostenbeleg bedeutet **ungeklärt**, nicht null.
Auch ein hoher Reasoning-Effort kann abrechenbare Tokens verursachen.
Vor Dispatch müssen Modell-/Preis-/Gebühren-/Token-/Schrittgrenzen und
Accountbudget aus einer tatsächlich freigegebenen Policy geprüft werden.
Keine Preiszahl oder Gratisnutzung wird aus der Existenz des SDK abgeleitet.

## Drei getrennte Authverträge und BYOK

1. **Öffentlicher Besucher:** eng begrenzte Public-Service-Funktion mit
   produktionsfähiger serverseitiger Sitzung, Besitzprüfung, CSRF-/Originprüfung,
   Quota und Budget. Kein Zugriff auf private Mandantendaten. Die vorhandene
   lokale SQLite-/Loopback-Sitzung ist kein fertiger Functions-Produktionsadapter.
2. **Eigene private Web-API:** Clerk-Sitzung/JWT nur mit passendem
   Verifikationsvertrag, anschließend tatsächlicher Serverzuordnung von
   Mandant, Seite und Rolle. Das React-Loginwidget erteilt keine Businessrechte.
3. **MCP:** eigener OAuth-Access-Token-Vertrag mit `oauth_token`, exaktem
   Issuer und Resource-Audience. Ein Website-Sessiontoken ersetzt ihn nicht.
   Die fremde Composio-Resource wird durch diese REST-Function nicht umgestellt.

Gelieferte, aber ungültige Credentials führen vor Providerzugriff zu 401;
kein Gastfallback. Anfangs nur begrenzte Textteile akzeptieren, keine beliebigen
Medien-URLs, clientseitigen Toolergebnisse oder Metadaten. Der Server bestimmt
den Besitzer, den öffentlichen Anwendungskontext bzw. geprüften Tenant und
das zulässige Toolset selbst.

BYOK benötigt später einen eigenen authentifizierten sicheren Eingabe- und
Vaultvertrag. Ein Key darf dabei flüchtig im Eingabefeld vorkommen, aber nicht
in Browserstorage, Querystrings, Chatnachrichten, Clientbundles oder Rohlogs
persistieren. Der Server verwahrt und entschlüsselt ihn nur für einen
autorisierten Dispatch; ein Browser-Key ist kein Kosten-/Rechtefreibrief.
Diese Recherche implementiert weder Vault noch BYOK-Liveadapter.

## Kosten und Zustand müssen dauerhaft abgesichert werden

Der Standard bleibt **Modellaufrufe deaktiviert**. Fehlende Credentials,
Modell-/Kostenfreigabe oder Budgetbindung blockieren vor einem Providerrequest.
Kein Ersatzaufruf wird als kostenlos behandelt; insbesondere wird NeX2fly
kein implizites Inferenzkontingent zugeschrieben.

Mindestens notwendig ist ein serverseitiger dauerhafter Store für Besitzer,
Gespräch, Request-/Payloadbindung, Reservierung, Dispatch, Provider-ID und
Abrechnungsklärung. Functions-Prozessspeicher, `/tmp` und die lokale Besucher-
SQLite sind kein dauerhafter Produktionsspeicher. Vorgeschlagene Zustände:
`prepared → reserved → dispatched → streaming → completed`, mit gesonderten
`denied`- und `unresolved`-Ausgängen. Eine DB-Transaktion darf keinen fiktiven
atomaren Commit mit dem fremden Modellprovider behaupten.

Idempotenz bindet Besitzer, Site-/Servicekontext, Operation, Requestkey und
Nutzlasthash. Parallele Wiederholung darf keinen zweiten Paidrequest starten.
Ein Abbruch im Browser beweist keine fehlende Berechnung; Provider-ID und
Reservierung bleiben bis zur Abklärung erhalten. Stream-Resume erfordert
eine vorhandene, zugeordnete dauerhafte Ausführung und darf nicht einfach
erneut generieren. Runtime-Maximaldauer und SDK-Schrittzahl sind zusätzliche
technische Grenzen, keine eigenständigen finanziellen Garantien.

Tools starten zunächst ohne Seiteneffekt oder mit einem begrenzten lesenden
öffentlichen Katalogzugriff. Jeder spätere fachliche Schreibvorgang benötigt
seine eigene Schema-, Auth-, Regel-, Idempotenz- und Zustandsprüfung. Modelltext
kann keinen Versand, keine Buchung und keinen erfolgreichen Zahlungsvorgang
autorisieren oder belegen.

## Kleine, echte Integrationstests ohne Providerkosten

Die offizielle AI-7-Testdokumentation zeigt `MockLanguageModelV4` aus `ai/test`:
mehrere vorbereitete Antworten können einen Toolcall und eine folgende
Textantwort darstellen. V4 verwendet für Toolcalls einen JSON-String in `input`
und ein strukturiertes `finishReason`. Ein tatsächlich ausgeführtes harmloses
Testtool und die gezählte Modellaufrufzahl prüfen den echten Agentloop.

Der minimale Prüfpfad vor Livebindung:

1. **SDK-UI:** echte Hook-/DefaultTransport-/UIstream-Kette mit injiziertem
   Mockstream; Textparts, Abschluss, Fehler und Abbruch prüfen. Der Testmodus
   wird als solcher ausgewiesen und ist kein Fallback für einen Paidfehler.
2. **Agent:** echtes `ToolLoopAgent` mit V4-Mock, einem lesenden lokalen Tool,
   explizitem Schrittlimit und gezählten Ausführungen. Keine Businesswrites.
3. **Provider-Wire:** echter OpenRouter-Adapter mit Dummykey und injiziertem
   `fetch`; exakte Modell-ID, High, Routing, Tokenobergrenze und abgewehrte
   Passthrough-Manipulation am tatsächlichen Body prüfen. Ausgehendes Netz
   im Test sperren. Fake-Usage ist ein Fixture, kein Abrechnungsbeleg.
4. **Trust/Kosten:** fehlende oder ungültige Auth, Origin/CSRF, falscher Besitzer,
   fehlendes Budget, ungültiger Katalog und zu große Eingabe ergeben
   Provider-Dispatchzählung **0**. Parallelreplay, DB-Ausfall und unklarer
   Abbruch erhalten dauerhafte, wahrheitsgetreue Zustände.
5. **Packaging:** Node-22-/Vercel-build-Smoke mit Vite-Bundle und Root-API;
   reservierte Pfade nicht auf SPA-HTML umschreiben, keine Secrets im Bundle,
   keine Lockerung privater Routen. Echte Deploymentabnahme separat durchführen.

Die Tests sind hier ein konkreter Plan, keine behaupteten Ergebnisse. Root
koordiniert die Umsetzung und Installationen. Erst nach belegter Account-,
Datenschutz-, Preis- und Budgetbindung folgt ein eng begrenzter tatsächlicher
Modelltest; diese Recherche löst ihn nicht aus.

## Offizielle Quellen

- [AI SDK Chatbot](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot), [Transport](https://ai-sdk.dev/docs/ai-sdk-ui/transport), [Agents](https://ai-sdk.dev/docs/agents/building-agents), [Loop Control](https://ai-sdk.dev/docs/agents/loop-control), [Testing](https://ai-sdk.dev/docs/ai-sdk-core/testing).
- [Vercel Node Runtime](https://vercel.com/docs/functions/runtimes/node-js), [Node-Versionen](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Vite](https://vercel.com/docs/frameworks/frontend/vite), [Functions-Dauer](https://vercel.com/docs/functions/configuring-functions/duration).
- [OpenRouter SDK Repository](https://github.com/OpenRouterTeam/ai-sdk-provider), konkret geprüftes [Paket 3.1.0](https://registry.npmjs.org/@openrouter/ai-sdk-provider/3.1.0), [öffentlicher Modellkatalog](https://openrouter.ai/api/v1/models).

Die direkten OpenRouter-Dokumentationspfade aus älteren Links lieferten hier
keinen nutzbaren Zugriff. Der genaue Adapterbefund stammt aus dem offiziellen,
integritätsgeprüften Versionsarchiv und nicht aus geratenen Beispielparametern.

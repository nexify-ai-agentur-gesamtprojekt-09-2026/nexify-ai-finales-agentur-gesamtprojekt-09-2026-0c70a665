# Unabhängige Prüfung des Vercel-/AI-SDK-Inkrements

Stand: 26.10.2026. Unabhängige Reviewerrolle; keine Implementierungsänderungen,
keine Modell-/Providerkosten und kein Deployment durch diesen Review.

## Ergebnis

Der öffentliche aktive Vite-/Vercel-Pfad ist eine stateless Textorientierung,
kein LLM-Agent und kein ausführender Geschäftszugang. Beide ursprünglichen
P2-Befunde sind im nachgeprüften Quellstand korrigiert. Die unten dokumentierte
Preview-Guthabenprobe ist zusätzlich lokal geprüft; eine echte OIDC-/Funding-
Abfrage oder Modellfreigabe wurde durch diesen Review nicht durchgeführt.

### Geschlossener P2: spätere Provideroptionen umgingen den privaten Modellpin

`createPinnedOpenRouterModel` prüft seine Konstruktorargumente, gibt danach aber
den rohen OpenRouter-Modelladapter zurück. Der Herstelleradapter mischt
`providerOptions.openrouter` beim eigentlichen Generierungsaufruf nach den
Modellsettings ein. Ein eigener Offline-Fetchgegenbeweis mit echtem AI 7:

```text
generateText({model, maxOutputTokens:16, maxRetries:0,
  providerOptions:{openrouter:{model:"unapproved/override-fixture",
    reasoning:{effort:"low"},provider:{allow_fallbacks:true},max_tokens:999999}}})
```

Ergebnis im abgefangenen Request: Modell `unapproved/override-fixture`, Reasoning
`low`, Fallbacks `true`, `max_tokens=999999`. Die vorhandenen Factory-Negativtests
prüfen diese spätere Mergeposition nicht. Ein Guard vor dem finalen injizierten
Fetch beziehungsweise ein enger Generierungswrapper muss Modell, High,
Providerflags, Endpoint, Tokenmaximum und gegebenenfalls Authbindung prüfen.
Negativtests müssen den tatsächlichen Generate-/Stream-Aufruf angreifen.

**Korrektur und eigene Nachprobe:** Der rohe Provider wird nicht mehr
exponiert. Beide ModelV4-Einstiegsmethoden weisen call-level Provideroptionen,
Reasoning-Downgrades, ungültige Tokenlimits und Headerersatz früh ab. Zusätzlich
prüft der finale Fetch den tatsächlich serialisierten Body, exakten Endpoint,
Authheader, Modell, High und Fallbackflags; Redirects sind `error`. Die ursprüngliche
Gegenprobe endet jetzt mit `unsupported_provider_options` und **0** Aufrufen des
injizierten Fetch. Positive Generate-/Stream-Verträge bleiben grün. Generische
injizierte Modelle müssen die zentrale Model-ID tragen und erhalten `high` auch
als generische SDK-Reasoningoption. Das ist ein Vertrag für vertrauenswürdige
serverseitige Adapter, kein kryptografischer Herkunftsbeweis eines beliebigen
in-process Modellobjekts.

**Scope:** nur der derzeit private Helfer. Der öffentliche Endpunkt importiert
ihn nicht und führt dadurch keine Modellanfrage aus. Es wurde ausschließlich ein
lokaler Dummy-Fetch verwendet.

### Geschlossener P2: neuer Next-API-Shim benötigte passende TS-Importeinstellung

Die während der Prüfung ergänzte Referenzroute
`apps/web/app/api/agent-chat/route.ts` bindet denselben öffentlichen Handler ein
und behebt damit die zuvor fehlende Next-Pfadzuordnung. Die direkte Next-TSC-
Prüfung schlägt danach in `api/agent-chat.ts:3` mit **TS5097** fehl, weil die
Next-tsconfig `allowImportingTsExtensions` noch nicht aktiviert. Der separate
Root-API-tsconfig hatte diese Option bereits. Im aktuellen Next-tsconfig ist
`allowImportingTsExtensions:true` bei `noEmit:true` nun tatsächlich gesetzt;
die zentrale Steuerung bestätigt den erfolgreichen post-Shim-TSC. Vor Ergänzung
des Shims war der unabhängig ausgeführte Next-Referenzbuild mit Node **22.23.4**
einschließlich **37/37** Prerenderseiten erfolgreich. Ein nachfolgender voller
post-Shim-Build läuft bei der zentralen Steuerung und wird hier nicht als eigener
Lauf ausgegeben oder parallel erneut gestartet.

## Eigene positive Nachweise

- **26** echte SDK-Vertragstests mit Node **22.23.4** bestanden: sechs öffentliche
  Handler-/SSE-Verträge, **15** interne Agent-/Providerverträge und fünf Preview-
  Guthabenverträge. Mockmodelle und
  injizierte Dummy-Fetches; keine kostenpflichtige Generierung.
- Der öffentliche Handler importiert ausschließlich die deterministische
  Orientierung. Kein privates Modell, Selfservice-Ledger, Vault, Konto-, Rollen-,
  Zahlungs-, Buchungs- oder Versandwerkzeug wird eingebunden.
- `POST`, exakter Pfad, Same-Origin-Header und JSON werden geprüft. Unbekannte
  Felder, System-/Toolrollen, Provideroptionen, nichttextuelle Teile und private
  oder unbekannte Seitenkontexte werden abgewiesen.
- Grenzen: **16 KiB** tatsächliche Bodybytes, **12** Nachrichten, **12** Textteile
  je Nachricht und insgesamt **3000** Textzeichen. UTF-8 wird fatal dekodiert.
  Zusätzliche eigene Slowbodyprobe: **408 body_deadline** nach etwa **5038 ms**,
  Reader-Cancel bestätigt. Abort- und Bytegrenzen sind durch Tests belegt.
- Die tatsächliche SSE-Antwort wird mit offiziellen SDK-Decodern gelesen und
  enthält nur Text und geprüften öffentlichen Seitenkontext. Die Header erklären
  `public_guided_preview`, keine Session und keine Persistenz; kein Set-Cookie.
- React sendet nur die letzte User-Textnachricht mit Locale und öffentlichem
  Seitenpfad. Der Verlauf liegt im Browserzustand. React rendert Texte escaped;
  Links werden nur bei exakt bekannten öffentlichen Pfaden zu eigenen SiteLinks.
  Kein Raw-HTML-, generischer URL-, Tool- oder Provideractionrenderer.
- Standalone-Schalter sperrt das Laden der neuen Chatkomponente; der klassische
  Offlinepfad bleibt erhalten. Vite routet den spezifischen neuen API-Pfad vor
  dem übrigen Python-API-Proxy zum lokalen Loopback-Adapter.
- Das deklarierte Vercel-Functionziel für `api/agent-chat.ts` ist `fra1`, Dauer
  **10 Sekunden**. Dies ist eine Quellenkonfiguration, keine hier unabhängig
  verifizierte produktive Projektregion, Gebühren- oder Retentionsgarantie.

## Zusätzliche Preview-Guthabenprobe und verbindliche Modellpolicy

`api/agent-runtime-status.ts` ruft ausschließlich den geprüften Statushandler auf.
Standard bleibt `preview_credits_probe_disabled`. Aktivierung erfordert exakt
`NEXIFY_AI_GATEWAY_CREDITS_PROBE=true`, `VERCEL_ENV=preview`, die gebundene Projekt-ID
und den konkreten Entwicklungsbranch. Vor SDK-Zugriff wird vorhandenes
`AI_GATEWAY_API_KEY` auch bei leerem Wert verworfen. Der echte Defaultpfad ist
`createGateway().getCredits()` ohne API-Key-, URL- oder Headermanipulation.
Die installierte SDK-Implementierung wurde dazu gelesen: Sie bevorzugt sonst
`AI_GATEWAY_API_KEY` und fällt erst danach auf normales Vercel-OIDC zurück;
die explizite Präsenzsperre bewahrt deshalb den gewünschten OIDC-Pfad. Es wird
kein JWT manuell dekodiert oder als Ersatz für einen echten Upstreamread gewertet.

**Gezielte Deploymentnachprüfung:** Die neue Statusfunktion besitzt im
aktuellen `vercel.json` nun ihren eigenen Eintrag: `regions:["fra1"]` und
`maxDuration:15`. Der frühere fehlende Funktionsscope ist damit in der Quelle
korrigiert; der zehnsekündige Eintrag für `api/agent-chat.ts` bleibt getrennt.
Dies ersetzt weiterhin keinen tatsächlichen Deployment-/Protectionnachweis.
Gleichzeitig wurden die drei geänderten SDK-Dateien schmal nachgelesen:
`PublicOrientationChat` ergänzt ausschließlich vorsichtige Fokuswiederherstellung,
Vite/Loopbackbridge routen zusätzlich den exakten Statuspfad zum bereits geprüften
Handler. Keine Modellaktivierung, neuen Rechte oder Credentialweitergabe daraus.
Die vier betroffenen Snapshotzeilen wurden nach diesem Readback aktualisiert.

Die fünf Offlinegegenproben bestätigen Projekt-/Branch-/Produktionssperren,
API-Key-Sperre, maximal 256 Byte mit strikt leerem JSON-Objekt, decimalgenaue
positive/Null-Metadaten, generische Fehler ohne Providerinhalt und 5-Sekunden-
Awaitgrenze. Die Factory wird bei gesperrten Voraussetzungen nicht aufgerufen;
der Testreader bietet ausschließlich `getCredits`. Keine Inferenz-, Modell-,
Konten-, Zahlungs- oder Fondsmutation. Antworten enthalten keine Beträge,
`totalUsed`, Tokens oder Authheader; `live_model_enabled` und
`entitlement_verified` bleiben stets **false**. Der boolesche Fundingbeleg ist
weder Modellberechtigung noch Ausgabenfreigabe. Selbst ein echter erfolgreicher
Read betrifft ausschließlich Vercel-Gateway-Kontofunding, nicht OpenRouter-
Guthaben, einen Kundenwallet oder den konkreten 1017-Modellzugang.

**Technische Aktivierungsgrenze:** Env-Projekt-/Branchbindung authentifiziert
keinen HTTP-Aufrufer; Same-Origin ist ebenfalls keine Benutzerauthentifizierung.
Die ausdrücklich externe Vercel-Deployment-Protection muss für den echten
Preview-Aufruf gelten. Das ist ein nachzuweisender Betreiber-/Deploymentzustand,
keine zusätzliche pauschale Nutzerfreigabe. Die Deadline begrenzt das Warten;
sie beweist keinen Abbruch des internen SDK-Netzwerkrequests. Unklare Ergebnisse
bleiben deshalb unverifiziert, ohne automatische Modell- oder Zahlungsaktion.

`config/llm-policy.json` bindet die aktuelle Managed-Policy an **1017/High**,
keinen stillen Ersatz und keine automatische Subvention. Der Literalvalidator
liest genau fünf konfigurierte Quellen; er und seine **fünf** Negativtests wurden
erfolgreich ausgeführt. ARCH-011 ruft diesen Guard tatsächlich auf. Seine Ausgabe
benennt zutreffend `managed_config_binding_only_not_live_verification`;
autorisierte kundeneigene BYOK-Auswahl bleibt ein getrennter Scope.

## Verbleibende Grenzen

Auch nach Behebung der internen Pins sind echte Modellfreigabe, Betreiber- und
Tenantbindung, Budgetreservierung, Preis-/Usageabgleich, Idempotenz und unbekannte
bezahlte Ausgänge nicht durch die Primitive implementiert. Same-Origin ist kein
Identitäts- oder Berechtigungsnachweis. Die öffentliche Nullmodellorientierung
bekommt deshalb keinen automatischen Fallback auf das private Modell.

Die Quellenrecherche und ihre Ledgerzahlen sind eigener Kontext, keine durch
Review neu behauptete vollständige Lektüre aller Herstellerdokumente. Aktuelle
Produktiv-/Browsernachweise und vollständige Nutzerjourneys der zentralen
Steuerung werden nicht als eigene Messung ausgegeben. Keine Gesamtfertigstellung,
Livefreigabe oder dauerhafte Fehlerfreiheit aus diesem Inkrement ableiten.

## Quellensnapshot SHA256

| Datei | SHA256 |
| --- | --- |
| `api/agent-chat.ts` | `205baeecf8ae1a3655efd018e13b30285cd994f408db8328bda7ef8c1faecbb2` |
| `api/agent-runtime-status.ts` | `2a17ecb99889eee8d669938e49859282aaba6035d19cd71dd54dad154026639b` |
| `packages/agent-runtime/public-orientation.ts` | `782edc47b55befbca4eb55f3077e18499ad2c5966c2e5173dbcaab4bc585f45b` |
| `packages/agent-runtime/model-agent.ts` | `6a542bfd4c9727ba6686baf2841414a3c0dd63ca6841514996a04014657d6435` |
| `packages/agent-runtime/preview-access.ts` | `2795c56f6ef87fe8455c8ce7afab3963501ea51e57ecaa2f52e87828f1c6a5b8` |
| `packages/agent-runtime/tests/public-orientation.test.mjs` | `896812b70d554229602bfa29e84f56496aa004c34be20b15e712f80ce68b3d1a` |
| `packages/agent-runtime/tests/model-agent.test.mjs` | `47daf6b19fceeab8fbe797dc4443bb7ec1e79d0d5382af24c93d25db89b176d6` |
| `packages/agent-runtime/tests/preview-access.test.mjs` | `fac29d5d5feb340b99edb04f3d42a79636a4a6865e49506cefd9d5f7d33914c0` |
| `apps/web/components/PublicOrientationChat.tsx` | `d46f064a7640ede218b06c70d6a93e55e2f12fb773241f3bb42cc787c21ee51a` |
| `apps/web/components/PublicOrientationChat.css` | `4d2bfbb33b3b32e2b8e1fd75375458ab9f9f7317b0d580bda092f2915d9f1ad0` |
| `apps/web/components/Workspace.tsx` | `a9bbfa009a1c66989387d3aa60672767a26c502e01259b5118869a12f54146d4` |
| `apps/site/vite.config.ts` | `12b1cb68da09fbf96aa2eb1f9884e3db605186b90744043254364131fe9b9a70` |
| `tools/agent-preview.mjs` | `14ed19643eed9fa15e5dd3a47e1eef38ed7916ea2f29e90759483a27668e011b` |
| `tools/dev.mjs` | `0de5e5763646d0ef55d0a48b54376af0e2c2c296f3e1b558410a777140d1def6` |
| `vercel.json` | `ede1b5b0680667108e7da201948d0714ccfd765ef088fa14a8785b8df6b623d4` |
| `tsconfig.api.json` | `ca4d180831f3b5a1986fe22f1f8e5a0cb7a6435014e858f1c853008e9d81d5b5` |
| `apps/web/app/api/agent-chat/route.ts` | `4edcaf43ed7c7cfa16a6dfb4849ee94cc8270cbd8460d33fdec108fb8e76247c` |
| `apps/web/tsconfig.json` | `7936710e0941d67b7ad94d3387b5ebcd3a5c526a40f1c8f5a8c1f4601ca43624` |
| `package.json` | `6e21354704b0d528c9137927b9b83e8c3215b6d135eaa8182afc5991cc406a65` |
| `pnpm-lock.yaml` | `66113f3d0bd4537ead76ce07b68701bdcd8e1d4d392f4365ac1f24637933cb4c` |
| `config/llm-policy.json` | `bd1bd7b946384fa5ec3eafb1bf93d090adc44085172d663b15a8892fb5a95a9f` |
| `config/automation.json` | `a13ee9eafb66c535a12f2e24d083e9410f1420e67dc239646d36b5ce36b153ce` |
| `config/selfservice-policy.json` | `355ccc200852e6e14087aa55a5dc10ed94e42f1a3222d9818086db393bcbf2ab` |
| `config/brain/agents.json` | `062336475b7436f2f68307df66efc8008e26bde949d5f0508fbfa9746249d5c5` |
| `config/llm-verbindungen.json` | `16e9018b6f7b9feab2c5e2dc05784d960d63130c55482139105a9fa0bd57493b` |
| `tools/check_llm_policy.py` | `1256c667402f6bf3f563bb68234a4f6db814d7627cee264a2e6595bc8569f84f` |
| `tests/test_llm_policy.py` | `3d2f743e325a875581672272f2c578837db3e5ebfb8e94b140e90982b49acb9d` |
| `.harness/arch-rules.json` | `397f8b6f96677ec017915e240b4f9dcc979b783c56b587a92137e8fbb9987c37` |

# Echter Website-Modellzugang über Vercel: Auth, Funding und Grenzen

Stand 26.10.2026. [Quellen und minimierte Metadaten](../../config/research/vercel-live-model-access.json); Rohbelege unter `/workspace/.onboarding/vercel-live-access`. Dieser Auftrag hat keine Secretwerte gelesen/ausgegeben, keine Inferenz ausgeführt und weder Budget, Guthaben, Billingplan noch Deployment verändert.

**Ein zusätzlicher Modell-API-Key ist für Vercel Gateway nicht zwingend erforderlich:** Ein korrekt verknüpftes Vercel-Projekt kann sich mit seinem Runtime-OIDC-Token authentisieren. **Die Gateway-Budgets sind jedoch ausdrücklich Soft Caps, keine harten Geldgrenzen.** Die bestehende CLI-Anmeldung belegt außerdem weder aktuellen Guthabensaldo noch Zugangsberechtigung für das verlangte Modell.

Die neue Vorgabe für den Website-Pre-Sales-Pfad ist echtes Managed-Live-AI mit exakt `deepseek/deepseek-v4.1-flash-1017` und `high`. Die Self-Service-Regeln zu fehlenden kostenlosen LLM-Aufrufen, 500-Cent-Grenze und BYOK sind ein anderer Scope. Diese Recherche ändert keine dieser Laufzeitregeln und gibt keine strukturierte Antwort als Modellinferenz aus.

## Welche Zugangswege belegt sind

| Weg | Voraussetzung | Wirksamer Gateway-Budgetscope |
| --- | --- | --- |
| Projekt-OIDC ohne Modell-API-Key | Projekt/Team verknüpft, aktueller gültiger Projekt-OIDC-Token, passendes Gateway-Funding/Modellrecht | Team und Projekt |
| Gateway-API-Key | Gültiger serverseitiger Gateway-Key, passendes Funding | Team, Key sowie gegebenenfalls zugeordneter Benutzer; **kein Projektbudget** |
| Bestehender Vercel-CLI-Login | Angemeldetes Konto mit ausreichender Teamrolle | Ermöglicht dokumentierte Controlplaneoperationen; keine automatische Runtime- oder Fundingbindung |

[OIDC-Authentisierung](https://vercel.com/docs/ai-gateway/authentication-and-byok/oidc.md) bestätigt, dass der AI SDK OIDC automatisch nutzt, **wenn `AI_GATEWAY_API_KEY` nicht gesetzt ist**. Ein vorhandener API-Key darf deshalb nicht unbemerkt eine erwartete Projectbudgetbindung ersetzen. Für langfristige Node-Prozesse nennt die aktuelle Dokumentation requestzeitiges `getVercelOidcToken()` aus `@vercel/oidc`.

Lokale OIDC-Tokens sind laut Dokumentation zwölf Stunden gültig. Der dokumentierte Entwicklungsweg ist Projektverknüpfung und `vercel env pull`; er wurde hier nicht ausgeführt, weil er auch andere Secretwerte in Dateien schreiben kann. Eine Deploymentidentität ist keine Endbenutzeranmeldung und erteilt keine Kunden-/Mandantenrechte. Die Budgetdokumentation nennt zudem persönliche und App-Tokens unter dem Teamscope; das macht den menschlichen CLI-Login nicht automatisch zur Anwendungskonfiguration.

## Tatsächlich gelesene Accountmetadaten

Die bereits installierte CLI meldete Version `65.2.0`. Mit deren bestehender Anmeldung wurden ausschließlich folgende lesende Operationen ausgeführt:

```text
vercel ai-gateway budgets list --json --limit 100
vercel ai-gateway budgets list --defaults --json
```

Die vollständige Budgetliste lieferte zum dokumentierten Zeitpunkt **ein Team-Budget von 100 USD pro Monat**, mit `currentSpend: 0.0527785`. Kein explizites Projektbudget war in dieser Antwort enthalten. Die getrennte, erfolgreich abgeschlossene Defaultsabfrage lieferte `defaults: []`. Das sind vorhandene Zustände; die Beträge wurden von dieser Recherche weder gewählt noch gesetzt. Der zusätzliche erste Defaultsversuch scheiterte und bleibt als Fehlerbeleg erhalten; erst der erfolgreiche Read begründet die Aussage zu Defaults.

Team-/Projekt-IDs wurden im übernehmbaren Bericht minimiert beziehungsweise gehasht. Die Metadaten beweisen einen bestehenden Team-Soft-Cap und lesenden Zugriff, **keinen heutigen Creditsaldo, kein Modellrecht und keine Schreibberechtigung**. Positiver historischer Spend ist kein Nachweis verbleibender Finanzierung.

## Was Gateway-Budgets tatsächlich tun

Die offizielle [Budgetdokumentation](https://vercel.com/docs/ai-gateway/observability-and-spend/budgets.md) sagt ausdrücklich:

> A budget is a soft cap, not a hard limit. The check runs at the start of each request, so the request that crosses the limit still completes and total spend can end up slightly over the budget.

Ohne konfiguriertes Budget ist der jeweilige Scope unbegrenzt. Budgets stapeln sich; jeder zutreffende Scope muss bestehen. Nach Erschöpfung werden weitere Requests mit HTTP `402` und `quota_for_entity_exceeded` abgewiesen. Bereits zugelassene Requests können die Grenze überschreiten. Die Perioden sind `daily`, `weekly`, `monthly` oder kumulativ `none`; dokumentierter Mindestbetrag ist 1 USD. **Hier wird kein neuer Betrag vorgeschlagen oder aktiviert.**

Controlplaneunterstützung ist vorhanden:

- Lesen: `GET https://api.vercel.com/ai-gateway/budgets/list?teamId=<TEAM_ID>` beziehungsweise die oben ausgeführte CLI-Liste.
- Setzen: `PUT https://api.vercel.com/ai-gateway/budgets?teamId=<TEAM_ID>` mit `scopeType`, gegebenenfalls `projectId`, `limitAmount` und `refreshPeriod`.
- CLI: `vercel ai-gateway budgets set project <PROJECT> --limit <APPROVED_USD> --refresh-period <PERIOD>`.

Die Schreiboperationen sind lediglich dokumentiert und **wurden nicht ausgeführt**. Team-/Defaultbudgets verlangen Owner oder AI Gateway Budget Manager; Projektbudgets zusätzlich Projektadmins. Keybudgets folgen der Key-Editierberechtigung. Lesen dürfen laut Dokumentation Teamrollen außer Contributor. Die konkrete Schreibrolle des bestehenden Kontos wurde nicht festgestellt.

**Wichtig:** Ein Gateway-API-Key wird niemals dem Projektbudget zugerechnet, unabhängig davon, welches Projekt ihn benutzt. Ein OIDC-Projektbudget schützt daher keinen still eingeschobenen Keypfad. Key-/Team- oder Benutzerbudget und Projectbudget sind keine austauschbaren Begriffe.

## Rate Limits und allgemeines Spend Management

[Gateway Rate Limits](https://vercel.com/docs/ai-gateway/rate-limits.md) begrenzen Requestgeschwindigkeit, nicht die Ausgaben. Auf dem Free Tier gelten niedrigere veränderliche Modelllimits; auf dem Paid Tier gibt es standardmäßig keine Gateway-eigenen Ratelimits, Providerlimits bleiben bestehen. Die Dokumentation veröffentlicht keine stabilen Zahlen für alle Modelle. HTTP `429` ist von der Budgetantwort `402` zu unterscheiden. Für den öffentlichen Websitechat bleibt eine eigene Besucher-/Sitzungs-, Concurrency- und Ratelimitkontrolle erforderlich.

Das allgemeine [Vercel Spend Management](https://vercel.com/docs/spend-management.md) ist ebenfalls kein genauer Gelddeckel: Prüfung alle paar Minuten, entsprechend verzögerte Benachrichtigung oder Pause. Die Pause betrifft die Produktionsdeployments **aller Projekte** des Teams. Sie beendet ausdrücklich weder Gateway-API-Key-Nutzung noch gespeicherte Ressourcen und deren Kosten. Es wurde keine solche teamweite Pause konfiguriert.

## Exaktes Modell, High und Finanzierung

Der erneut gelesene öffentliche [Modellkatalog](https://ai-gateway.vercel.sh/v1/models) enthält die exakte `1017`-ID, `reasoning` als unterstützten Parameter und bei Effort die Werte `none`, `low`, **`high`**, `max`. Das ist ein konkreter Katalogbeleg für High, kein ausgeführter SDK-/Inference-Wiretest.

Die ausgewiesene Region ist weiterhin ausschließlich `us`. Es wird keine EU-Verarbeitung behauptet und kein alternatives Modell still eingesetzt. Der Katalogpreis ist zudem **nicht nur ein konstanter Basiswert**: Er enthält Peakmultiplikator, providerabhängige Preise sowie Fast- und US-Regionaltarife. Die bloße Basisrate ist deshalb keine konservative Kostenobergrenze für eine harte Reservierung.

[Gateway Pricing](https://vercel.com/docs/ai-gateway/pricing.md) unterscheidet Free-Tier-Modellsubset und Paid Tier. Die bloße Katalogaufnahme beweist nicht, dass dieses exakte Modell mit dem vorhandenen Guthaben aufgerufen werden darf. BYOK benötigt dort Paid Tier und gekaufte Credits; bei fehlgeschlagenen eigenen Credentials kann Systemcredential-Fallback weitere Gateway-Credits verbrauchen. Auto-Top-up ist laut Dokumentation standardmäßig aus, aber der tatsächliche Accountzustand wurde nicht geprüft und kein Zahlungsmechanismus aktiviert.

Der dokumentierte **nicht-inferenzielle** nächste Fundingread ist `GET https://ai-gateway.vercel.sh/v1/credits` mit einer ausdrücklich autorisierten Runtimebindung; er liefert verbleibendes Guthaben und historischen Gesamtverbrauch. Dieser Read wurde hier nicht mit einem Secret ausgeführt. Die allgemeine CLI-Anmeldung allein ersetzt seinen Beleg nicht.

## Konkrete Aktivierungsvoraussetzungen

1. Tatsächliche Runtimeauthentisierung festlegen: OIDC-Projectscope oder expliziter Keyscope; effektive Budgets und verfügbares Guthaben mit lesenden Metadaten prüfen. Keine stille Änderung der Credentialquelle.
2. Die bereits verlangte zentrale Modell-/High-Policy für **alle Managed-LLM-Adapter** verwenden. Katalog und SDK-Wirevertrag müssen denselben `1017`-Identifier und High abbilden; fehlende Unterstützung darf keine automatische Herabstufung auslösen.
3. Wenn ein harter **Anwendungs-Zulassungsdeckel** erforderlich ist, vor dem Paidcall instanzübergreifend dauerhaft und atomar den konservativen Höchstverbrauch reservieren; alle Eingaben einschließlich Tools/RAG, Ausgabe/Reasoning, Schleifenschritte und Parallelität begrenzen. Unbekannte Preise oder unklare bezahlte Ergebnisse führen zur Reconciliation, nicht zur blinden Wiederholung. Dies ist ein noch zu prüfender Anwendungsvertrag, keine dokumentierte harte Gateway-Rechnungsgarantie.
4. Erst einen tatsächlich zugelassenen Providerresponse als Live-AI ausgeben. Der neue Managed-Websitepfad darf nicht mit Self-Service-Guthabenregeln vermischt und eine strukturierte Offlineantwort nicht als Live-Modellerfolg etikettiert werden.

**Ergebnis:** API-keylose Gatewayauthentisierung und echte Projektbudgetverwaltung sind offiziell möglich und die bestehende CLI konnte aktuelle Budgetmetadaten lesen. Ein harter Gateway-Spendcap sowie aktuelles Funding und erfolgreicher Livezugang des konkreten Projekts sind dadurch nicht bewiesen. Kein Modellaufruf und keine Billingänderung wurden vorgenommen.

## Ergänzung: belegter AI-7-Reasoning-Wirevertrag und Credits-Read

Der zusätzliche [offizielle Reasoning-Guide](https://ai-sdk.dev/docs/ai-sdk-core/reasoning) und die [streamText-Referenz](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) bestätigen für AI 7 das **oberste Standardfeld**:

```ts
const result = await streamText({
  model: gateway('deepseek/deepseek-v4.1-flash-1017'),
  reasoning: 'high',
  // Weitere serverseitig geprüfte Eingaben und Limits.
});
```

Für diese Einstellung ist **kein geratener `providerOptions`-Namespace** erforderlich. Derselbe portable Parameter gilt für die Agentenkonfiguration. Provider-spezifische korrespondierende Optionen können ihn überschreiben; widersprechende Browseroptionen dürfen daher nicht in die Managed-Route gelangen. Bei nicht unterstützten Providern kann eine Warnung mit Ignorieren auftreten; das darf nicht still als erfüllte High-Policy gewertet werden.

Der installierte Quelltext von **`@ai-sdk/gateway@4.0.126`** wurde hierzu ausschließlich gelesen und gehasht, nicht importiert oder ausgeführt: `GatewayLanguageModel.getArgs` entfernt `abortSignal` und übernimmt die verbleibenden V4-Aufrufoptionen in den JSON-Body. Der SDK sendet an `https://ai-gateway.vercel.sh/v4/ai/language-model`; `ai-language-model-id` trägt die exakte `1017`-ID und der Body enthält **`reasoning: 'high'`**. Das ist ein statisch belegter SDK-Wirevertrag, kein ausgeführter Livecall. Eine OpenRouter-spezifische JSON-Form wurde nicht übertragen oder geraten.

Auch die [offizielle Gateway-Providerreferenz](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway#credit-usage) bietet einen konkreten inferenzunabhängigen Fundingread:

```ts
const credits = await gateway.getCredits();
```

Dazu genügt ein gültiger Projekt-OIDC-Token; ein zusätzlicher Modell-API-Key ist nicht erforderlich. Der Helper führt `GET /v1/credits` aus. **Wichtige Doc-/Typabweichung:** Die REST-Antwort enthält Strings `balance` und `total_used`; die installierte SDK-Schema-/Typdefinition transformiert zu Strings **`balance` und `totalUsed`**. Einige Textbeispiele verwenden die alte Schreibweise oder beschreiben Zahlen. Die gepinnte SDK-Definition ist für die Implementierung maßgeblich; Dezimalstrings nicht ungeprüft als endliche Floats behandeln.

Ein ausschließlich für einen verifizierten Owner zugänglicher Preview-GET kann mit Runtime-OIDC diese Metadaten abfragen und nur minimierte Beträge/Status ausgeben. Der Token bleibt serverseitig. Das authentisiert nicht automatisch den Besucher als Owner. Der Credits-Read selbst führt keine Modellinferenz aus und könnte verbleibendes Guthaben belegen. Er beweist jedoch keine modellspezifische Accountberechtigung oder tatsächliche High-Ausführung. Ein gesonderter dokumentierter Account-Entitlement-Read für exakt dieses Modell wurde hier nicht gefunden.

Laut ergänzender Metadatenmeldung der zentralen Umsetzung fehlen im primären Projekt sowohl `OPENROUTER_API_KEY` als auch `AI_GATEWAY_API_KEY`; diese Information stammt aus deren Namensprüfung, nicht aus einer eigenen Secretabfrage. OIDC ist damit der dokumentierte mögliche Weg, aber seine tatsächliche Runtime-/Fundingantwort steht noch aus. Eine eng begrenzte separate Modellprobe könnte anschließend echten Zugang prüfen; bei High und nur 128 Outputtokens wäre ein Length-Stop allein kein Beweis eines defekten Modells. **Dieser Rechercheauftrag hat weder Credits-Read mit Token noch Modellprobe ausgeführt.**

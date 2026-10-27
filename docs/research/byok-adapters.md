# BYOK mit vielen Providern: Quellenstand und Wiederverwendungsplan

Stand 26.10.2026. [Maschinenlesbare Daten, vollständige Providerlisten und Quellenhashes](../../config/research/byok-adapters.json). Diese Untersuchung hat ausschließlich öffentliche Herstellerquellen und SDK-Quelltext gelesen. Kein SDK wurde installiert oder importiert, keine Zugangsdaten wurden gelesen und kein kostenpflichtiger Modellaufruf ausgeführt.

Für die geforderte breite Providerunterstützung ist ein eng gekapselter Multi-Provider-SDK-Adapter sinnvoller als 70 selbst geschriebene HTTP-Clients. LiteLLM ist dafür ein konkreter Wiederverwendungskandidat, **noch keine freigegebene oder installierte Laufzeitabhängigkeit**. Sein vollständiger Proxy einschließlich Administration, Code-Guardrails und MCP-Ausführung wird für den kleinen NeXify-Backenddienst nicht benötigt.

## Was tatsächlich gezählt wurde

| Gegenstand | Beobachteter Stand | Bedeutung |
| --- | --- | --- |
| Offizieller OpenRouter-Katalog `GET /api/v1/providers` | 114 Datensätze | Veröffentlichte Hostinganbieter; kein Nachweis, dass alle 114 BYOK unterstützen oder ein konkretes Konto berechtigt ist |
| LiteLLM `v1.106.4`, `LlmProviders` im Quelltext | 166 eindeutige Bezeichner | Deklarierte Adapter-/Modus-IDs, statisch mit `ast.parse` gelesen; enthält Aliase, lokale Laufzeiten, Medien-, Sprach- und andere Nicht-LLM-Dienste |
| Suite-Providerimplementierungen | 0 | Der vorhandene Besucherassistent arbeitet strukturiert; `model_chat` ist `false` |
| Separater CI-AI-Reviewer | 1 OpenRouter-Implementierung | Eigener technischer Reviewpfad, kein Suite-BYOK-Backend und kein Nachweis kundeneigener Providerkeys |
| LiteLLM im aktiven Python installiert | nein | Metadatenabfrage ohne Paketimport |
| Mit eigenem Key live geprüfte Native-BYOK-Provider | 0 | Keine Providerkonten verbunden oder Inferenztests ausgeführt |
| Mit eigenem Key live geprüfte OpenRouter-BYOK-Provider | 0 | Öffentlicher Katalogzugriff ist keine Keyverifikation |

Die 166 Quellbezeichner sind vollständig im JSON einschließlich Enumname und Originalzeile enthalten. Beispielsweise sind `openai`, `anthropic`, `gemini`, `deepseek`, `openrouter`, `bedrock`, `azure`, `mistral`, `groq`, `ollama`, aber auch `runwayml`, `aws_polly`, `pg_vector` und generische Modi vorhanden. Deshalb wird daraus weder „166 verschiedene LLM-Unternehmen“ noch „70 fertig angeschlossene LLM-Provider“ gemacht. Der README bewirbt „100+ LLM providers“; das ist eine Herstellerangabe, kein eigener Laufzeittest. Die genaue Liste echter LLM-Operationen und ihrer Parameter benötigt einen zusätzlichen Abgleich je Adapter.

## Zwei unterschiedliche BYOK-Wege

**Native Direct BYOK:** NeXify löst eine mandantengebundene Secretreferenz auf und ruft den gewählten Provider über den eigenen Backendadapter auf. Providerrechnung, Authentisierung, Modellkennung, Region und Vertrag gehören zu diesem Providerkonto. OpenRouter ist in diesem Weg nicht automatisch beteiligt.

**OpenRouter BYOK:** Der Benutzer hinterlegt seine Providerkeys bei OpenRouter; OpenRouter routet damit zu dessen Providerkonto. Das ist ein zusätzlicher Vermittlungs- und Datenverarbeitungsweg. Der OpenRouter-Key allein ist kein kundeneigener OpenAI-/Anthropic-/Bedrock-Key.

Die aktuell gelesene [OpenRouter-BYOK-Dokumentation](https://openrouter.ai/docs/guides/overview/auth/byok) nennt 5 % des normalen OpenRouter-Listenpreises für Modell/Provider sowie eine planabhängige Freimenge; aktuell werden beim Pay-as-you-go-Plan 25.000 USD monatlicher Listenpreis-Inferenzwert und individuelle Enterprise-Mengen beschrieben. Dies ist eine datierte Beobachtung des fremden Angebots, **keine neu eingeführte NeXify-Gebühr oder Preiszusage**.

Standardmäßig können ausgefallene BYOK-Keys auf geteilte OpenRouter-Kapazität und damit OpenRouter-Guthaben zurückfallen. Für striktes BYOK müssen sowohl die BYOK-Key-Einstellung zur geteilten Kapazität als auch die erlaubten Provider und Fallbacks explizit eingeschränkt werden. `provider.order` priorisiert lediglich; es ist keine Allowlist. Ein geplanter strikter Weg benötigt `provider.only`, deaktivierte Providerfallbacks und deaktivierte geteilte Kapazität für sämtliche Modelle des gewählten Providers. Die tatsächliche Durchsetzung bleibt mit dem konkreten Konto zu prüfen.

Katalogfelder wie `datacenters` sind keine EU-Verarbeitungszusage pro Request. Bei regionalen BYOK-Deklarationen erklärt OpenRouter ausdrücklich, dass der Benutzer seine Kontoregion bestätigt und OpenRouter diese Deklaration nicht verifiziert. ZDR, Region und AVV/SCC müssen deshalb pro Route/Konto belegt werden; ein SDK oder eine Checkbox liefert diesen Nachweis nicht.

## LiteLLM: genaue Quelle, Lizenz und Sicherheitsgrenzen

PyPI lieferte zum Prüfzeitpunkt `litellm==1.106.4`. Der offizielle Git-Tag `v1.106.4` verweist auf Commit `ea7ca16dbc3904d9e59a9505f379a2ca3091821f`. README, Lizenz, Projektmetadaten, Providerenum und die API-Quelle wurden exakt von diesem Commit gelesen und gehasht. Keine ungebundene `main`-Fassung wurde als Versionsbeleg benutzt.

Die Root-Lizenz ist MIT **außerhalb des separat lizenzierten Verzeichnisses `enterprise/`**. Ein Enterprise-Feature wird damit nicht pauschal MIT. Die genaue Distribution, transitive Abhängigkeiten und die darin enthaltenen Lizenzbestandteile sind vor Übernahme noch zu prüfen.

`litellm/main.py:428` enthält `acompletion` mit unter anderem Modell, Messages, Timeout, maximalen Tokens, Reasoning, Responseformat und explizitem `api_key`. Das genügt als Ausgangspunkt für einen schmalen privaten Adapter. Ein öffentlicher Endpunkt darf jedoch keine beliebigen SDK-`kwargs`, `base_url`/Routingparameter, Callbackkonfigurationen oder Dateiverweise durchreichen. Die genaue Fähigkeit jedes Adapters bleibt unterschiedlich; Streaming, Toolcalls, Embeddings und Multimodalität sind keine automatisch überall vorhandenen Eigenschaften.

Der offizielle [Sicherheitsbericht vom März 2026](https://docs.litellm.ai/blog/security-update-march-2026) bestätigt kompromittierte PyPI-Versionen **1.82.7 und 1.82.8** am 24.03.2026. Genannt werden eine schädliche `proxy_server.py` und bei 1.82.8 zusätzlich `litellm_init.pth` mit Credentialdiebstahl. Der Hersteller berichtet, dass die offiziellen gepinnten Proxy-Dockerimages nicht betroffen waren und kein schädlicher Code auf Git-`main` gelangt sei. Diese Herstellerbewertung ersetzt keine eigene Prüfung einer heutigen Wheeldatei. Die im Blog angebotenen Scannerskripte wurden nicht ausgeführt.

Die öffentliche Repository-Schnittstelle lieferte außerdem 17 Security-Advisories. Der JSON-Bericht enthält alle gefundenen Meldungen mit betroffenen Versionsbereichen und Patchangaben. Für den geplanten Dienst besonders relevant:

- `GHSA-3cv6-jpf6-8222`: SSRF und Provider-Credentialexfiltration durch Request-Routingparameter.
- `GHSA-4g5m-c9r5-49xf`: lokale Dateizugriffe über gelieferte OIDC-Dateireferenzen.
- `GHSA-v4p8-mg3p-g94g`: Command Execution über MCP-STDIO-Testendpunkte.
- Weitere Meldungen betreffen Proxy-Konfiguration, Authentisierung und Code-Guardrails.

Eine Versionsnummer oberhalb bekannter Patchstände ist keine umfassende Sicherheitsfreigabe. Die gelesenen Sources und PyPI-Hashes binden einen konkreten Stand, beweisen aber nicht allein Vertrauenswürdigkeit oder Übereinstimmung zwischen Source und ausgeliefertem Wheel.

## Kleines umsetzbares Inkrement

1. **Katalog zuerst:** den versionsgebundenen Adapterkatalog übernehmen und pro Eintrag Operationen und Alias-/Medien-/LLM-Klasse kennzeichnen. In der Oberfläche getrennte Zustände „deklariert“, „installiert“, „konfiguriert“, „geprüft“ verwenden. Die gewünschte 70+-Breite bleibt ein Katalog-/Implementierungsziel, keine pauschale Livebehauptung.
2. **SDK isoliert prüfen:** exakte Distribution und Abhängigkeitslock auf Provenienz, Lizenzen, `.pth`-/Importsideeffekte und bekannte Meldungen prüfen. Erst danach Import- und gemockte Providerverträge in einer Umgebung ohne Benutzerkeys, Cloudcredentials oder Host-Homemounts ausführen. Hier fand dieser Schritt noch nicht statt.
3. **Enges Backend:** ein eigener CLI-/Backendvertrag nimmt lediglich erlaubte `provider_id`, exakt bestätigte `model_id`, `key_ref`, begrenzte Messages und Request-ID an. Der Server kontrolliert Endpoint und Parameter. Die CLI erhält keine generische Shell-, Proxyadmin- oder SDK-Ausführungsfunktion. Nutzung und Fehler werden normalisiert und redigiert.
4. **Key-/Tenantgrenzen:** Secretreferenzen und Auflösung serverseitig an Besitzer, Mandant, Projekt und Scope binden. Browserkeys weder in VITE-Variablen noch in lokalen Speichern oder Logs ablegen. Rotation und Widerruf testen. Native Direct BYOK und OpenRouter BYOK als zwei explizite Wege führen; kein stiller Wechsel zu einem anderen Konto oder Broker.
5. **Begrenzter Nachweis je Verbindung:** nur dokumentiert nicht abrechenbare Key-/Modellendpunkte für lesende Prüfungen verwenden. Vor einem echten Inferenznachweis Kosten-, Token-, Zeit- und Bytegrenzen binden; keine automatische Wiederholung eines möglicherweise bezahlten Requests ohne dauerhafte Reconciliation. Die jeweils ausgewählte Key-/Modell-/Operationskombination prüfen, nicht ungefragt 70 bezahlte Tests auslösen.

Für den Nutzerauftrag ist die OpenRouter-Modellkennung `deepseek/deepseek-v4.1-flash-1017` mit Reasoning `high` bereits explizit bekannt und darf nicht still ersetzt werden. **JavAI hat weiterhin keine bestätigte Anbieter-/Modell-ID.** Es wird weder zu `typesafe` noch zu Jev/Jeff oder einem Legacy-Alias umgedeutet.

Noch nicht geliefert sind: SDK-Artefakt-/Dependencyfreigabe, Suiteinferenzadapter, tatsächlicher Secret-Lifecycle, 70 pro Operation geprüfte Verbindungen, allgemeine EU-/ZDR-Garantie oder kostenlose Provideraufrufe. Rohbelege liegen unter `/workspace/.onboarding/byok-research`; URL, Status und SHA256 stehen im JSON. Eine fehlgeschlagene zusätzliche GitHub-Suchanfrage ist dort ebenfalls erhalten und wird nicht als erfolgreicher Suchnachweis ausgegeben.

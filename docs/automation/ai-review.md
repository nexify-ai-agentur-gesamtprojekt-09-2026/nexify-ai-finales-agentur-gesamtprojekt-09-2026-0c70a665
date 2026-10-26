# Begrenzter serverseitiger AI-Review

Stand 26.10.2026. Implementiert: `tools/automation/ai_review.py`; Offlineverträge: `tests/test_automation_ai.py`; Betreiberkonfiguration: `config/automation.json`.

Der Auftrag „DeepSeek V4.1 flash1017 (OpenRouter), high“ wird exakt an `deepseek/deepseek-v4.1-flash-1017` gebunden. Der offizielle öffentliche Modellkatalog enthält diese ID; aktueller Katalog und `supported_parameters` werden vor jeder Prüfung erneut gelesen. Kein Namensraten, keine Ersatzmodelle und keine stille Umstellung auf ein anderes DeepSeek-Modell. Fehlende oder nicht eindeutige ID sperrt den Aufruf.

## Grenzen und Autorität

Die Engine liest Commitobjekte und einen begrenzten Diff. Sie führt keine Branchdatei, Installation, Testanweisung oder Modellantwort aus. Der AI-Review kann `no_findings`, `changes_requested` oder `manual_review` empfehlen; er kann kein Jeff-`go`, keinen Merge, kein Deployment und keine menschliche Endabnahme ausstellen. Bestehende Main-/Jeff-/Produktionsgates bleiben eigenständig erforderlich. Patchgenerierung ist in diesem Inkrement deaktiviert: `proposed_patch` muss `null` sein.

In einem Job mit Secrets muss der Engine-/Workflowcode aus einer vertrauenswürdigen Basis stammen. Unvertrauenswürdige Head-Commits werden nur als Gitobjekte gelesen, nicht in diesem Secretjob ausgecheckt, installiert oder ausgeführt. Git-Diff deaktiviert externe Diffprogramme und Textconv. Volle SHA-Werte und echte Commitobjekte werden geprüft. Repositoryidentität stammt aus dem bereinigten Origin; Userinfo oder Credentialwerte werden nicht ausgegeben. Die übergeordnete Automation muss Repository-/Eventberechtigung und erwartete Basis/Head zusätzlich verifizieren.

Diff, Dateinamen, Kommentare und vorgeschlagene Änderungen sind untrusted Daten. Pfade außerhalb der tatsächlich geänderten Dateien, absolute Pfade und Traversal werden abgewiesen. Erkannte sensible Dateien/Schlüsselmuster, Binärdiffs, leere oder übergroße Diffs blockieren statt eine abgeschnittene Prüfung als vollständig auszugeben. Diese Musterprüfung ist kein allgemeiner Beweis, dass ein Repository frei von Geheimnissen oder personenbezogenen Daten ist; die Freigabe des konkreten Codetransfers bleibt Aufgabe des vorgeschalteten Daten-/Projektvertrags.

## CLI

```bash
# Nur lesender öffentlicher Modellkatalog; keine Inferenz, kein API-Key nötig.
python3 tools/automation/ai_review.py catalog --config config/automation.json

# Lokale Standardbibliothek-/Gitverträge, Providergrenze gemockt.
python3 -m unittest discover -s tests -p test_automation_ai.py -v

# Beauftragte echte Reviewfunktion, sobald der sichere Key gebunden ist.
# BASE_SHA und HEAD_SHA sind bereits verifizierte vollständige Commit-SHAs.
python3 tools/automation/ai_review.py review \
  --config config/automation.json --repository . \
  --base-sha "$BASE_SHA" --head-sha "$HEAD_SHA" \
  --output evidence/automation/ai-review.json
```

Exit 0 bedeutet einen Katalogbeleg oder eine aufgezeichnete **beratende** Reviewantwort. Exit 2 ist `blocked_not_reviewed` (beispielsweise fehlender Key, ungeklärte Modell-/Parameter-/Preisbindung oder Eingabelimit). Exit 3 ist `manual_reconciliation_required`: Der kostenpflichtige Aufruf kann erfolgt sein, deshalb keine automatische Wiederholung. Eine Zero-Change-Prüfung wird nicht als erfolgreicher Review ausgegeben.

`OPENROUTER_API_KEY` wird nur aus der freigegebenen Prozessbindung gelesen. Katalogausgaben nennen ausschließlich Variablenname und Anwesenheit; keine Secretwerte, Environmentdumps, Authorizationheader, rohe Providerfehler oder Diffinhalte. Die geerbte HTTPS-Proxy-/CA-Konfiguration bleibt aktiv. Es gibt keinen TLS-Bypass, kein Redirect-Following und keine HTTP-/Paid-Retryschleife.

## Parameter, Token und Kosten

Die Konfiguration aktiviert die autorisierte Funktion. Ein tatsächlich nutzbarer Secretwert wird damit nicht erfunden. Aktuelle Sicherungen je Aufruf sind 64.000 Diffbytes, 2.000 maximale Outputtokens, 45 Sekunden Netzwerk-/Gitzeitlimit und 0,10 USD lokale Kostenschranke. Die Engine besitzt zusätzliche technische Maximalgrenzen für ungültig groß konfigurierte Inputs. Diese Limits sind technische Aufrufsicherungen, keine Produktpreise oder neue Rechtsregeln.

Vor dem POST muss der Katalog `reasoning`, `reasoning_effort`, `response_format`, `structured_outputs` und `max_tokens` unterstützen. Der Request setzt:

```json
{
  "model": "deepseek/deepseek-v4.1-flash-1017",
  "reasoning": {"effort": "high"},
  "max_tokens": 2000,
  "stream": false,
  "provider": {
    "require_parameters": true,
    "allow_fallbacks": false,
    "max_price": {"prompt": 0.3, "completion": 1.2, "request": 0}
  }
}
```

Die gezeigten Tokenraten stammen aus dem beobachteten Katalog. Die Engine setzt sie **dynamisch** aus dem konservativen Maximum von Basis-/Zeit-Overrides einschließlich höherer Cache-Read-Raten; bei geänderter Katalograte ändern sich Preflight und maximale Routingrate. Das Preisobjekt des Katalogs verwendet USD je Token; `provider.max_price.prompt/completion` verwendet laut offizieller Providerdokumentation USD je Million Tokens. Unbekannte Preisbestandteile, nichtendliche/negative Werte, ungeprüfte Kontext-/Outputgrenzen und ein ausdrücklich positiver fixer Requestpreis sperren die Prüfung.

Ein fehlendes `pricing.request` wird nicht als „kostenlos“ behauptet. Stattdessen ist `provider.max_price.request: 0` eine explizite Verbraucherbedingung: Keine Providerroute mit zusätzlicher Requestgebühr ist gewünscht. `require_parameters:true` soll nicht unterstützte Parameter statt stiller Ignorierung ausschließen. Die tatsächliche Durchsetzung beim ausgewählten Provider ist vor einer Produktionsbehauptung mit einem autorisierten echten Aufruf nachzuweisen.

Der Preflight kalkuliert eine konservative Client-Text-/Schemalänge in UTF-8-Bytes plus Framingreserve und maximale Completiontokens. Er muss unter Kontext- und Kostengrenze liegen. Nach der Antwort werden tatsächliche `usage.prompt_tokens`, `completion_tokens`, `total_tokens`, `usage.cost`, Modell-ID, Request-ID, Abschlussgrund und Inhalt geprüft. Fehlende Kosten, inkonsistente Zählungen, Überschreitung, unerwartetes Modell, Toolcalls oder abgeschnittene Ausgabe führen zur manuellen Reconciliation. Das ist keine unabhängige Garantie über eine fremde Abrechnung oder versteckte Upstream-Promptänderungen.

Netzwerkoperationen sind auf feste OpenRouter-HTTPS-Ziele begrenzt. Ein prozessweiter POSIX-Alarm begrenzt den gesamten HTTP-Vorgang einschließlich DNS, TLS, Header und Body; Sockettimeout und Read-Bytegrenze ergänzen ihn. Die CLI benötigt dafür den Mainthread und einen freien Echtzeittimer; andernfalls sperrt sie vor dem HTTP-Aufruf. Das Timeout ist kein Beweis einer bereits gemessenen Ende-zu-Ende-SLA. Gitprozesse werden beim Deadline-/Bytelimit beendet. Katalog und Antwort besitzen feste Byteobergrenzen.

## Antwortvertrag und Wiederholung

Providerantworten und Modell-JSON werden mit Ablehnung doppelter Schlüssel und nichtendlicher Zahlen gelesen. Der Review hat ein festes JSON-Schema, keine unbekannten Felder und eine exakte Repository-/Base-/Head-Bindung. Findings müssen auf geänderte relative Pfade verweisen, Severity/Zeile und begrenzte Texte besitzen. `no_findings` zusammen mit Findings ist ungültig. Markdownfences, Ausführungsaufträge, unbekannte Verdicts oder ungeprüfte Toolcalls sind keine akzeptierte Antwort.

Jeder nichtleere beziehungsweise nicht-`null` Patch wird zurückgewiesen. Es gibt keinen als Sicherheitsgrenze ausgegebenen Teilparser für Unified Diffs; ein tatsächlicher Maker-/Fixzyklus braucht einen separaten isolierten Arbeitsbranch, deterministische Tests und die vorhandenen Reviews/Freigaben.

Das Ergebnis enthält Zeit, Commit-/Diffbindung, Katalog-/Responsehash, Provider-Request-ID, geprüfte Usage/Kosten und ausschließlich beratende Empfehlung. Bei uneindeutigem Paid-Ergebnis enthält der Fehlerbeleg den vorhandenen Commitkontext und gegebenenfalls eine sicher validierte Provider-ID. Raw-Providerantwort, Chain-of-Thought, Credentialwerte und vollständiger Diff werden nicht als Reviewbeleg ausgegeben.

Die Engine wiederholt einen Paid-POST nicht. Sie ist aber **kein globaler Idempotenzspeicher über neue ephemeral CI-Runner**: Die übergeordnete persistente Inbox muss `max_attempts_per_commit=1`, Single-Flight, Quell-/Eventbindung und `reconcile_before_retry` durchsetzen und den Ergebnisbeleg dauerhaft erhalten. Nach verlorener Antwort darf ein automatischer Workflowrerun nicht blind noch einmal bezahlen. Ein manueller, nach abgeglichenem Providerstatus neu autorisierter Lauf ist ein neuer ausdrücklich dokumentierter Vorgang.

## Quellen und Nachweise

Offizielle Recherchebelege stehen in `docs/automation/blueprints.sources.json` und dem zugehörigen Blueprint-Dokument, sobald durch den Rechercheauftrag gespeichert. Wesentliche Primärquellen:

- `https://openrouter.ai/api/v1/models`: exakte ID, Parameter, Kontext und Pricing.
- `https://openrouter.ai/docs/guides/best-practices/reasoning-tokens`: `reasoning.effort=high`.
- `https://openrouter.ai/docs/guides/routing/provider-selection`: `require_parameters`, `allow_fallbacks`, `max_price` und Preiseinheiten.
- `https://openrouter.ai/docs/cookbook/administration/usage-accounting`: `usage.cost` ist der berechnete Kontobetrag; vollständige Usage gehört zur Antwort.
- `https://openrouter.ai/docs/guides/overview/models`: Preiswerte in USD je Token/Request/Einheit; „0“ ist explizit frei, ein fehlendes Feld bleibt etwas anderes.

Die 19 Offlinevertragsprüfungen nutzen echte lokale Git-Commits, aber einen gemockten Provider. Sie prüfen insbesondere Modell-/High-/Schema-/Budget-/SHA-/Pfadbindung, keine automatische Paid-Wiederholung, kein Redirect und Credentialdateien/literale Secretzuweisungen, vollständige HTTP-Deadline, Override-/Cachegebühren und Ablehnung sämtlicher Patchdaten. Die öffentliche Katalogprobe wurde mit der echten Engine erfolgreich ausgeführt; `OPENROUTER_API_KEY` war dabei nicht gebunden. **Es wurde keine echte kostenpflichtige Inferenz, kein Remote-Reviewkommentar, kein Merge und kein Deployment durchgeführt.**

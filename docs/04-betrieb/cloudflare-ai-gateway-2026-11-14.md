# Cloudflare AI Gateway, MCP-Portal und Shell über Cloudflare Access · Betriebsnotiz 14.11.2026

Stand: Vorbereitung. Nichts davon ist eingeschaltet. Der Chat läuft unverändert über den
9router (`ROUTER_URL`/`ROUTER_KEY`). Im Cloudflare-Konto wurde durch diese Arbeit nichts
geändert. Diese Notiz ist keine Entscheidung; der Vorschlag für einen D-Eintrag steht in
Abschnitt 8 und ist nicht in `DECISIONS.md` eingetragen.

Quellen: Cloudflare-Dokumentation, abgerufen am 14.11.2026 (Liste in Abschnitt 10). Eigene
Messungen sind als solche gekennzeichnet. Was die Dokumentation nicht sagt, steht in
Abschnitt 9 und wird nicht aus dem Gedächtnis ergänzt.

## 1. Was das AI Gateway ist

Ein Vorschaltdienst zwischen unserer Anwendung und dem Modellanbieter. Laut Dokumentation
auf allen Tarifen verfügbar; Auswertung, Zwischenspeicher und Anfragegrenzen sind kostenlos.

| Funktion | Stand laut Dokumentation | Für uns |
|---|---|---|
| Auswertung (Anfragen, Tokens, Kosten) | immer an | Gewinn: Kostenübersicht je Gateway |
| Protokolle | **standardmäßig an**, mit Anfrage- und Antworttext | Risiko bei Kundenchats, siehe Abschnitt 4 |
| Zwischenspeicher | standardmäßig aus | aus lassen |
| Anfragegrenzen | standardmäßig aus | einschalten, als zweite Grenze neben der eigenen |
| Wiederholungen | Schalter, höchstens 5 Versuche | aus lassen (Policy: kein blinder Wiederholversuch) |
| Ausweichmodelle (Fallback) | nur, wenn man sie selbst anlegt (Universal-Endpunkt mit mehreren Einträgen oder dynamische Route) | **nicht anlegen** |
| Dynamische Routen | Bedingungen, Prozentweichen, Budget- und Anfragegrenzen je Schlüssel; Aufruf als `dynamic/<name>` | nicht nutzen, solange die Modellregel gilt |
| Guardrails | prüft mit `@cf/meta/llama-guard-3-8b` auf Workers AI, kostenpflichtig nach Tokens | nicht einschalten: zweites Modell, widerspricht der Regel |
| DLP | zwei vordefinierte Profile ohne Zero-Trust-Abo | optional, eigene Entscheidung |
| Authentifiziertes Gateway | neue Gateways immer an, nicht abschaltbar; Kopfzeile `cf-aig-authorization: Bearer <Token>` | Pflicht |
| Hinterlegte Schlüssel (BYOK) | Anbieter-Schlüssel liegt im Secrets Store von Cloudflare | Pflicht für unseren Weg |

Grenzen (kostenlos): 10 Gateways je Konto; Protokolle siehe Abschnitt 4. Anfragepreise oder
eine Anfragegrenze des Gateways selbst nennt die Preisseite nicht. „Unified Billing"
(Cloudflare bezahlt den Anbieter, 5 % Aufschlag auf Guthaben) brauchen wir nicht; wir
bringen den eigenen OpenRouter-Schlüssel mit.

## 2. Verträglichkeit mit der Modellregel

Regel (`config/llm-policy.json`): genau `deepseek/deepseek-v4.1-flash-1017`, Reasoning
`high`, über OpenRouter, kein stiller Ersatz.

- **OpenRouter ist im Gateway ein eigener Anbieter** mit eigenem Endpunkt:
  `https://gateway.ai.cloudflare.com/v1/<konto>/<gateway>/openrouter/...`. Der Rumpf der
  Anfrage geht im OpenRouter-Format durch; der Modellname ist die OpenRouter-Kennung, also
  exakt die Policy-Kennung. Die Dokumentationsseite widerspricht sich beim Pfad
  (`/openrouter/chat/completions` in der Beschreibung, `/openrouter/v1/chat/completions` im
  Beispiel); der Verbindungstest in Abschnitt 6 klärt, welcher gilt.
- **Die vom Inhaber genannte Adresse `.../compat/chat/completions` passt nicht.** Dort heißt
  das Modell `<anbieter>/<modell>`, und OpenRouter steht nicht in der Anbieterliste dieser
  Schnittstelle (gelistet: Anthropic, OpenAI, Groq, Mistral, Cohere, Perplexity, Workers AI,
  Google AI Studio, Google Vertex AI, xAI, DeepSeek, Cerebras, Baseten, Parallel). Die
  Dokumentation nennt diese Schnittstelle für einfache Aufrufe außerdem „deprecated".
- **DeepSeek direkt** ginge über `/compat` als `deepseek/<modellname>`. Die Regel nennt aber
  OpenRouter als Anbieter und die OpenRouter-Kennung; der Name des Modells bei DeepSeek
  selbst ist in der Policy nur als dokumentierter Alias geführt, nicht als Bindung. Das
  wäre eine Änderung der Regel und braucht eine eigene Entscheidung.
- **Benutzerdefinierter Anbieter** (`custom-<slug>/<modell>` über `/compat`) ist möglich,
  für OpenRouter aber unnötig.
- **Reasoning und Streaming:** Die Cloudflare-Seiten sagen dazu nichts Ausdrückliches. Da
  der Anbieter-Endpunkt den Rumpf durchreicht, ist beides zu erwarten, aber **nicht
  gemessen**. Beleg erst durch den Verbindungstest und einen echten Chat-Aufruf.
- **Kein stiller Ersatz:** Das Gateway weicht nur aus, wenn man es so einrichtet. Zusätzlich
  prüft unser Code jede Antwort (Abschnitt 5).

Ergebnis: vereinbar, wenn (a) der OpenRouter-Endpunkt statt `/compat` verwendet wird,
(b) keine Ausweichroute, keine dynamische Route, keine Guardrails angelegt sind und
(c) der bezahlte Verbindungstest Modell, Reasoning und Streaming belegt.

Der Test des Inhabers mit `workers-ai/@cf/meta/llama-3.1-8b-instruct-fast` und
`gpt-4o-mini` ist als reiner Verbindungstest unkritisch. Für Produktaufrufe (Chat, Agenten,
Zusammenfassungen) sind beide Modelle unzulässig, solange die Regel gilt.

Verhältnis zum Zielbild vom 10.11.2026 (`provider_route_target_2026_11_10`: „nur über
9router", nicht aktiviert): Das Gateway wäre ein anderer Vorschaltdienst als der 9router.
Beides gleichzeitig als „einziger Weg" geht nicht; das entscheidet der Inhaber (Abschnitt 8).
Sachlicher Unterschied, gemessen am 13.11.2026 laut `apps/web/lib/chat-llm.ts`: Der 9router
bietet den datierten Stand `-1017` nicht an und führt das Modell unter
`openrouter/deepseek-v4.1-flash`. Über das Gateway ginge die exakte Kennung auf die Leitung.

## 3. Was der Inhaber im Dashboard tun muss

1. **Beide im Chat gezeigten Geheimnisse erneuern** (Abschnitt 7), bevor irgendetwas
   umgestellt wird.
2. OpenRouter: einen eigenen Schlüssel für diesen Zweck anlegen, **mit Ausgabenlimit**.
3. Cloudflare › AI › AI Gateway › Gateway `default` › **Provider Keys** › **Add API Key** ›
   Anbieter **OpenRouter** wählen › Schlüssel eintragen › **Save**. Alias leer lassen
   (`default`) oder z. B. `production` vergeben. Voraussetzung laut Dokumentation: Das
   Gateway ist authentifiziert, und das Konto darf Geheimnisse im Secrets Store anlegen.
4. Gateway › **Settings**:
   - **Authenticated Gateway: an** (lässt sich danach nicht mehr abschalten).
   - **Logs: aus**, oder an mit der Maßgabe aus Abschnitt 4. Unser Code sendet zusätzlich
     je Anfrage `cf-aig-collect-log-payload: false`.
   - **Cache Responses: aus.**
   - **Retry requests: aus.**
   - **Rate limiting: an**, Wert nach Entscheidung des Inhabers.
   - Keine dynamische Route, keine Guardrails, keine Ausweich-Einträge.
5. Settings › **Create authentication token** (Recht „AI Gateway Run"). Der Wert wird nur
   einmal angezeigt. Achtung laut Dokumentation: Dieses Recht gilt kontoweit für **alle**
   Gateways, auch für die mit hinterlegten Schlüsseln.
6. Verbindungstest aus Abschnitt 6 ausführen (kostet einen kleinen Modellaufruf).
7. Erst nach bestandenem Test und Entscheidung: Variablen in Vercel setzen (Abschnitt 5).

## 4. Datenschutz

- Ein Protokolleintrag kann Anfrage- und Antworttext enthalten, dazu Anbieter, Zeit, Status,
  Tokens, Kosten, Dauer und User-Agent. Protokolle sind je Gateway standardmäßig an.
- Abschalten: Gateway-Einstellung „Logs", je Anfrage `cf-aig-collect-log: false` (kein
  Eintrag) oder `cf-aig-collect-log-payload: false` (Eintrag ohne Texte, nur Zähler).
- Aufbewahrung hängt vom Alter des Kontos ab. Die Dokumentation unterscheidet „Legacy
  Logs" (kostenlos 100.000 Einträge je Konto, **kein Ablaufdatum**, bleiben bis zur
  Löschung; wahlweise automatische Löschung der ältesten) und „Workers Logs" (kostenlos
  3 Tage, bezahlt 7 Tage, 200.000 Einträge je Tag). Als Stichtag nennt der Abruf den
  24.09.2026; welcher Weg für unser Konto gilt, ist im Dashboard zu prüfen.
- Speicherort: Für Workers Logs heißt es, ohne eingerichtete „Customer Metadata Boundary"
  könnten Protokolle weltweit in Cloudflares Rechenzentren liegen. Für Legacy Logs nennt
  die Dokumentation keinen Ort.
- Folge für uns: Kundenchats enthalten personenbezogene Angaben. Mit Texten im Protokoll
  wäre Cloudflare ein weiterer Auftragsverarbeiter mit möglicher Speicherung außerhalb der
  EU. Das gehört in das Verzeichnis der Verarbeitungen und in die Datenschutzerklärung;
  beides sind Rechtstexte und damit Sache des Inhabers (D-017). Auch ohne Protokoll laufen
  die Texte durch Cloudflare hindurch.

## 5. Umschaltung im Code (vorbereitet, aus)

Der bisherige Chat-Weg ist **nicht** anbieterneutral: `apps/web/lib/chat-llm.ts` sendet
immer `Authorization: Bearer <ROUTER_KEY>` und den festen Router-Namen
`openrouter/deepseek-v4.1-flash`. Mit hinterlegtem Schlüssel verlangt das Gateway das
Gegenteil: keine `Authorization`-Kopfzeile (sonst reicht es deren Wert an den Anbieter
weiter), dafür `cf-aig-authorization`. Nur Adresse und Schlüssel zu tauschen genügt also nicht.

Vorbereitet ist ein zweiter Leitungsweg in `apps/web/app/api/chat/llm-gateway.ts`,
eingebunden in `apps/web/app/api/chat/route.ts`, geprüft in
`apps/web/auth/tests/chat-llm-gateway.test.mjs`.

| Variable (Vercel, Production, serverseitig) | Wert |
|---|---|
| `CHAT_LLM_ROUTE` | `cloudflare-ai-gateway` |
| `CF_AIG_CHAT_URL` | die im Verbindungstest bestätigte Adresse, z. B. `https://gateway.ai.cloudflare.com/v1/a112f895c19e0d65f6f64b3e89f747f8/default/openrouter/v1/chat/completions` |
| `CF_AIG_TOKEN` | Token aus Schritt 5 in Abschnitt 3 (Geheimnis, als „Sensitive" anlegen) |
| `CF_AIG_BYOK_ALIAS` | nur, wenn in Schritt 3 ein anderer Alias als `default` vergeben wurde |

Verhalten des Gateway-Wegs:

- Auf der Leitung: Modell exakt `deepseek/deepseek-v4.1-flash-1017`,
  `reasoning: {effort: "high"}`, `stream: true`, `provider: {require_parameters: true}`
  (OpenRouter: nur Anbieter, die alle Parameter annehmen).
- Kopfzeilen: `cf-aig-authorization`, `cf-aig-collect-log-payload: false`,
  `cf-aig-skip-cache: true`, wahlweise `cf-aig-byok-alias`. Keine `Authorization`.
- Die Adresse muss `https` sein und auf `/openrouter/chat/completions` oder
  `/openrouter/v1/chat/completions` enden. `/compat/...` und andere Anbieter werden
  abgewiesen (`invalid_endpoint`).
- Antwortprüfung: Nennt die Antwort ein anderes Modell als die Policy-Kennung oder meldet
  das Gateway einen Ausweichschritt (`cf-aig-step` ungleich `0`), endet der Aufruf mit
  `model_policy`; der Besucher sieht `chat_llm_failed`, keinen Text. Nennt die Antwort gar
  kein Modell, kann der Code es nicht prüfen und lässt sie durch.
- Fehlen `CF_AIG_CHAT_URL` oder `CF_AIG_TOKEN`: 503, auch wenn die Router-Variablen gesetzt
  sind. Kein Rückfall auf den Router. Unbekannter Wert in `CHAT_LLM_ROUTE`: 503
  (`route_invalid`).

**Rückweg:** `CHAT_LLM_ROUTE` in Vercel löschen (oder auf `router` setzen) und neu
ausliefern. `ROUTER_URL` und `ROUTER_KEY` bleiben während der Umstellung unverändert
gesetzt; sie werden im Gateway-Modus nicht gelesen.

Ob die eigene Adresse `gateway.nexifyai.cloud` denselben Pfadaufbau hat wie
`gateway.ai.cloudflare.com/v1/<konto>/<gateway>/`, ist nicht belegt: Eine eigene Domain für
das AI Gateway kommt auf den abgerufenen Dokumentationsseiten nicht vor. Gemessen am
14.11.2026: `https://gateway.nexifyai.cloud/` und `.../compat/chat/completions` antworten
auf einen Abruf ohne Anmeldung mit 401 (JSON). Bis zur Klärung die Cloudflare-Adresse nehmen.

**Hermes:** spricht OpenAI-kompatibel und könnte dieselbe Gateway-Adresse als Basisadresse
nutzen. `ops/hermes/home/config.yaml` nennt heute `provider: openrouter` direkt. Ob Hermes
eine zusätzliche Kopfzeile (`cf-aig-authorization`) senden und die `Authorization`-Kopfzeile
weglassen kann, ist hier nicht geprüft; ohne das geht nur der Weg ohne hinterlegten
Schlüssel (OpenRouter-Schlüssel bleibt bei Hermes), und der scheitert am authentifizierten
Gateway. Erst prüfen, dann `tools/check_hermes_config.py` gemeinsam nachführen.

## 6. Verbindungstest (Inhaber; löst einen bezahlten Modellaufruf aus)

Platzhalter nicht in Dateien oder Chats schreiben; den Token nur in der eigenen Shell setzen.

```bash
export CF_AIG_TOKEN='<Token des Gateways>'
curl -sS -D - https://gateway.ai.cloudflare.com/v1/a112f895c19e0d65f6f64b3e89f747f8/default/openrouter/v1/chat/completions \
  -H "cf-aig-authorization: Bearer $CF_AIG_TOKEN" \
  -H 'content-type: application/json' \
  -H 'cf-aig-collect-log-payload: false' -H 'cf-aig-skip-cache: true' \
  -d '{"model":"deepseek/deepseek-v4.1-flash-1017","stream":false,"max_tokens":512,
       "reasoning":{"effort":"high"},"provider":{"require_parameters":true},
       "messages":[{"role":"user","content":"Antworte mit dem Wort bereit."}]}'
```

Bestanden, wenn: Status 200; im Rumpf steht `"model":"deepseek/deepseek-v4.1-flash-1017"`
(exakt, sonst weist unser Code die Antwort ab); `usage` weist Reasoning-Tokens aus; falls
vorhanden, `cf-aig-step: 0`. Bei 404 denselben Aufruf ohne `/v1` im Pfad wiederholen.
Danach einmal mit `"stream":true` und `-N` prüfen, dass Zeilen `data: ...` ankommen.

Lesender Test dieser Sitzung (ohne Modellaufruf, 14.11.2026):
`GET /accounts/<konto>/ai-gateway/gateways` → **403, Code 10000 „Authentication error"**;
ebenso `.../ai-gateway/custom-providers`. `GET /user/tokens/verify` → 200, Token aktiv. Das
hinterlegte API-Token ist also gültig, hat aber kein Leserecht für das AI Gateway. Die
Einstellungen des Gateways `default` konnten deshalb nicht gelesen werden.

## 7. Sicherheit: zwei Geheimnisse standen im Klartext im Chat

Ein Cloudflare-API-Token und das Geheimnis eines Access-Dienst-Tokens wurden in einen Chat
geschrieben. Beide gelten als offengelegt und sind zu erneuern. Die Werte sind dieser
Sitzung nicht bekannt und wurden nicht gesucht.

- **API-Token:** Dashboard › Profil › API Tokens › beim Token das Menü (drei Punkte) ›
  **Roll** › bestätigen. Der alte Wert ist sofort ungültig, die Rechte bleiben gleich.
  Danach den neuen Wert dort eintragen, wo er hinterlegt ist (Netzwerk-Geheimnis der
  Agenten-Umgebung für `api.cloudflare.com`).
- **Access-Dienst-Token:** Zero Trust › Access controls › Service credentials ›
  Service Tokens › Menü › **Rotate secret** › **Revoke immediately** wählen (keine
  Schonfrist, weil der alte Wert offenliegt). Die Client-ID bleibt gleich.
- Das Gateway-Token aus Abschnitt 3 ist ein drittes Geheimnis; es gehört nur nach Vercel.

## 8. Offene Entscheidungen und Vorschlag für einen D-Eintrag

`AGENTS.md` sagt: „Cloudflare wird als Hosting nicht verfolgt". Ein AI Gateway ist kein
Hosting; die Aussage bleibt richtig, deckt den neuen Einsatz aber nicht ab. Vorschlag
(**nicht eingetragen**, Wortlaut zur Entscheidung des Inhabers):

> **D-0NN — Cloudflare als Vorschaltdienst für Modellaufrufe und Zugänge (Datum)**
> - **Entscheidung (SOLL):** Cloudflare wird nicht als Hosting genutzt (unverändert), aber
>   als Vorschaltdienst: (1) AI Gateway vor OpenRouter für verwaltete Modellaufrufe,
>   (2) Access/Tunnel für den Zugang zu den Servern, (3) MCP-Portal für eigene MCP-Dienste.
> - **Grenzen:** Modell, Reasoning und Fallback-Verbot aus `config/llm-policy.json` gelten
>   unverändert; im Gateway keine Ausweichroute, keine dynamische Route, keine Guardrails,
>   kein Zwischenspeicher. Protokolle ohne Inhalte. Anbieter-Schlüssel nur im Gateway.
> - **Verhältnis zum 9router:** entweder „Gateway ersetzt den 9router als Zielweg" oder
>   „Gateway nur für den Website-Chat, 9router bleibt Zielweg" — eine der beiden Fassungen
>   wählen; `provider_route_target_2026_11_10` entsprechend nachführen.
> - **Offen bis zum Nachweis:** bezahlter Verbindungstest, Auftragsverarbeitung und
>   Datenschutzerklärung, Aufbewahrung der Protokolle.

Weitere offene Punkte: Wert der Anfragegrenze; ob Protokolle ganz aus bleiben; ob Hermes
über das Gateway läuft; ob `gateway.nexifyai.cloud` beibehalten wird.

### MCP-Portal und MCP-Server-Eintrag

- Ein MCP-Portal bündelt mehrere MCP-Server hinter einer Adresse
  (`https://<subdomain>.<domain>/mcp`); Cloudflare Access regelt, wer hinein darf. Je
  Server lässt sich festlegen, welche Werkzeuge sichtbar sind. Dienst-Tokens gehen für
  Maschinenzugriff, wenn der Server eine „Service Auth"-Regel hat und die Anmeldung je
  Nutzer aus ist.
- Ein eingetragener Server muss über HTTP erreichbar sein (Streamable HTTP oder SSE),
  öffentlich oder über einen Tunnel; ein reiner stdio-Server geht nicht. Aufrufe laufen
  nach 60 Sekunden ab. Status „Error" heißt: nicht erreichbar oder Fehlerantwort.
- **Befund:** Der Eintrag `nexify-ai-mcp-server-cf` zeigt auf `https://mcp.nexifai.cloud/mcp`
  — `nexifai` ohne „y". Gemessen am 14.11.2026: `nexifai.cloud` und `mcp.nexifai.cloud`
  existieren im DNS nicht (NXDOMAIN). Die richtige Schreibweise `mcp.nexifyai.cloud` hat
  noch keinen Adresseintrag. Der Status „Fehler" ist damit erklärt; zu berichtigen sind
  die Adresse im Eintrag **und** das Anlegen des Namens. `mcp-cf-portal.nexifyai.cloud`
  ist angelegt und antwortet ohne Anmeldung mit 401.
- Was hinter `mcp.nexifyai.cloud` liegen soll, ist im Repository nicht entschieden. Infrage
  kommt nur ein eigener MCP-Dienst mit HTTP-Endpunkt; das Repository führt `rea-mcp`
  (`config/integrations/rea-mcp.json`), dessen Betriebsform hier nicht geprüft wurde.
  Hermes selbst ist kein MCP-Server, und die öffentliche Erreichbarkeit seiner Oberfläche
  widerspricht D-019 Folge 4. Vorschlag: den Eintrag erst füllen, wenn ein Dienst mit
  Werkzeugliste und Rechten festgelegt ist; bis dahin den fehlerhaften Eintrag entfernen
  oder ruhen lassen.

## 9. Shell für Agenten über Cloudflare Access

Heute hat keine Agenten-Sitzung eine Shell auf srv1941843 (179.198.195.91) oder srv1243952
(72.62.152.47); gemessen wird nur über die Hostinger-API (`nexify-server-messung`). Eine
Shell würde das Aufräumen der Server (nur mit Freigabe je Schritt, D-016) und das
Einspielen von Hermes (`ops/hermes/einspielen.sh`) überhaupt erst ausführbar machen.

Die Dokumentation kennt vier Wege. Für Agenten-Sitzungen zählt, was auf der Seite des
Aufrufers nötig ist:

| Weg | Auf dem Server | Beim Aufrufer | Für Agenten-Sitzungen |
|---|---|---|---|
| Access for Infrastructure (die verlinkte Seite) | `cloudflared`, SSH-CA in `sshd` | **Cloudflare One Client (WARP)**, angemeldet | ungeeignet: Eine Cloud-Sitzung kann keinen WARP-Client betreiben; Dienst-Tokens nennt die Seite nicht |
| SSH mit `cloudflared` beim Aufrufer | `cloudflared`, veröffentlichte Route `ssh://localhost:22`, Access-Anwendung | `cloudflared` als `ProxyCommand` | der gangbare Weg; ob die Anmeldung per Dienst-Token statt Browser geht, steht nicht auf der Seite und ist zu prüfen |
| Terminal im Browser | `cloudflared`, Access-Anwendung | nur Browser | für den Inhaber, nicht für Agenten |
| Eigene SSH-Schlüssel über WARP | `cloudflared` | WARP | ungeeignet wie oben |

Schritte und wer sie ausführen muss:

| Schritt | Wer |
|---|---|
| Zero-Trust-Organisation anlegen, Tarif wählen (auch im kostenlosen Tarif werden Zahlungsdaten verlangt) | Inhaber |
| Tunnel anlegen (Networking › Tunnels) und Installationsbefehl kopieren | Inhaber |
| `cloudflared` auf beiden Servern installieren und starten | **Inhaber oder eine Sitzung mit Shell** — über die Hostinger-API allein nicht belegt machbar |
| Route anlegen: veröffentlichte Anwendung `ssh.<domain>` → `localhost:22` (bzw. Tunnel-CIDR für Access for Infrastructure) | Inhaber |
| Access-Anwendung mit Regel anlegen; für Agenten eine Regel „Service Auth" mit eigenem Dienst-Token | Inhaber |
| Nur bei Access for Infrastructure: Ziel anlegen, Infrastruktur-Anwendung (SSH, Port 22, erlaubte UNIX-Nutzer), SSH-CA erzeugen | Inhaber |
| Nur bei Access for Infrastructure: CA-Schlüssel nach `/etc/ssh/ca.pub`, in `/etc/ssh/sshd_config` oben `PubkeyAuthentication yes` und `TrustedUserCAKeys /etc/ssh/ca.pub`, dann `systemctl reload ssh` | **Inhaber oder Sitzung mit Shell**; Eingriff in `sshd`, deshalb mit offener zweiter Sitzung als Rückweg |
| Eigenen UNIX-Nutzer für Agenten anlegen (nicht `root`), Rechte festlegen | Inhaber; Cloudflare legt keine Nutzer an |
| Port 22 in der Firewall schließen | Inhaber, **zuletzt** und erst nach bestandenem Zugriff über den Tunnel; Firewall-Änderungen sind Hartsperre für Agenten |
| Dienst-Token und Adresse als Geheimnis der Agenten-Umgebung hinterlegen | Inhaber |

Grenzen laut Dokumentation (Access for Infrastructure): keine Port-Weiterleitung, kein
`ProxyJump`, keine Agent-Weiterleitung; Sitzungen enden nach der eingestellten Dauer
(Standard 24 Stunden). Befehlsprotokolle gibt es auf allen Tarifen, verschlüsselt mit
einem eigenen Schlüssel.

Kosten: Die Nutzerzahl des kostenlosen Zero-Trust-Tarifs steht auf keiner der abgerufenen
Seiten; sie ist vor der Einrichtung im Dashboard abzulesen. Belegt sind die Kontogrenzen
1.000 Tunnel, 500 Access-Anwendungen, 50 Dienst-Tokens, 5.000 Ziele.

Was eine Shell freischaltet und was nicht: Sie macht Befehle möglich, hebt aber keine
Regel auf. D-016 (Freigabe je Schritt, Rückweg), D-017 und die Hartsperren (`reboot`,
Firewall) gelten weiter; `vsk-mongodb`, Traefik und Kundenseiten bleiben unberührt.

## 10. Quellen (abgerufen 14.11.2026)

- https://developers.cloudflare.com/ai-gateway/
- https://developers.cloudflare.com/ai-gateway/configuration/bring-your-own-keys/
- https://developers.cloudflare.com/ai-gateway/configuration/authentication/
- https://developers.cloudflare.com/ai-gateway/configuration/custom-providers/
- https://developers.cloudflare.com/ai-gateway/configuration/fallbacks/
- https://developers.cloudflare.com/ai-gateway/configuration/manage-gateway/
- https://developers.cloudflare.com/ai-gateway/configuration/request-handling/
- https://developers.cloudflare.com/ai-gateway/features/caching/
- https://developers.cloudflare.com/ai-gateway/features/dynamic-routing/
- https://developers.cloudflare.com/ai-gateway/observability/logging/
- https://developers.cloudflare.com/ai-gateway/observability/logging/legacy-logs/
- https://developers.cloudflare.com/ai-gateway/reference/limits/
- https://developers.cloudflare.com/ai-gateway/reference/pricing/
- https://developers.cloudflare.com/ai-gateway/usage/chat-completion/
- https://developers.cloudflare.com/ai-gateway/usage/providers/openrouter/
- https://developers.cloudflare.com/ai-gateway/usage/providers/deepseek/
- https://developers.cloudflare.com/workers/observability/logs/workers-logs/
- https://developers.cloudflare.com/cloudflare-one/access-controls/ai-controls/mcp-portals/
- https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/
- https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/use-cases/ssh/
- https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/use-cases/ssh/ssh-infrastructure-access/
- https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/use-cases/ssh/ssh-cloudflared-authentication/
- https://developers.cloudflare.com/cloudflare-one/account-limits/
- https://developers.cloudflare.com/cloudflare-one/setup/
- https://developers.cloudflare.com/fundamentals/api/how-to/roll-token/
- https://openrouter.ai/docs/features/provider-routing (`require_parameters`)

Die Seiten wurden über ein Abrufwerkzeug gelesen, das den Inhalt zusammenfasst. Wörtliche
Einzelheiten (Schalternamen, Stichtag 24.09.2026) vor einer Entscheidung am Original prüfen.

## 11. Nicht belegt

- Kein Modellaufruf über das Gateway: Modellname in der Antwort, Reasoning, Streaming und
  der richtige Pfad (`/openrouter/` mit oder ohne `/v1`) sind ungemessen.
- Einstellungen des Gateways `default` (Protokolle, Zwischenspeicher, hinterlegte
  Schlüssel): nicht lesbar, 403.
- Pfadaufbau und Dokumentation der eigenen Domain `gateway.nexifyai.cloud`.
- Nutzerzahl des kostenlosen Zero-Trust-Tarifs; Anmeldung von `cloudflared access ssh` per
  Dienst-Token.
- Ob der neue Leitungsweg in einer Vercel-Auslieferung läuft: geprüft sind nur die Tests
  mit nachgestellten Antworten.

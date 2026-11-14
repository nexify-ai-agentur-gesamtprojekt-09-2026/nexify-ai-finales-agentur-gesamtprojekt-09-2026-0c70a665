# Umgebungsvariablen nach tatsächlichem Dienst

Stand: 26.10.2026; Nachtrag 14.11.2026: Abschnitt 6 (Projektbindung der
Shop-API). Maschinenlesbarer Vertrag:
[`config/environment-contract.json`](../../config/environment-contract.json).
Geprüft sind aktive Quellreferenzen und inzwischen der authentifizierte,
vom Root-Agenten sanitisiert bereitgestellte Vercel-Metadaten-Read-back.
Keine Secret-/ENV-Datei, kein Credentialstore und kein Umgebungsdump wurden
gelesen; dieser Audit liest oder speichert keine Variablenwerte.

## 0. Tatsächlicher Remote-Read-back

Der Root-Agent hat mit Vercel CLI `65.2` die Identität
`nex2fly-nexifyai-nexify` und das Projekt
`prj_Po7jlB7srMP6sxyMvf5zIwzXzNyh` im Team
`pascals-projects-2864de33` zugeordnet. Der sanitisiert übergebene API-Snapshot
enthält **38 Metadatensätze für 24 eindeutige Namen**. Alle 24 Namen sind über
ihre jeweiligen Datensätze in Development, Preview und Production vorhanden.
Erfasst sind nur Name, ID, Typ, Zielscopes, Branchbindung und Änderungszeit;
Snapshot-Zeitpunkt und SHA-256 stehen im JSON. Zusammen mit lokalen/CI- und
Referenzvariablen umfasst der Vertrag jetzt **42 Namen**.

Für die beiden neu gesetzten öffentlichen Vite-Clerk-Einstellungen hat der
Root-Agent zusätzlich je einen authentifizierten Einzel-GET durchgeführt und
nur den booleschen Vergleich `matches_expected_public_value: true` weitergegeben.
Beide Vergleiche betreffen alle drei Scopes. Der Aktivierungsschalter entspricht
der ausdrücklich **deaktivierten** Einstellung. Dieser Audit rekonstruiert die
Werte nicht aus Schreibantworten und liest keine Secretwerte. DNS bleibt laut
erneuter Root-Probe für `clerk.nexifyai.de` NXDOMAIN; eine funktionierende
Produktionsanmeldung ist daher weiterhin nicht nachgewiesen.

## 1. Was Vercel aktuell baut

`vercel.json` wählt Vite und `@nexify/site`, Ausgabe `apps/site/dist`.
Die öffentlichen Inhalte benötigen **keine manuell gesetzte Variable für den
statischen Build**. Die bedingt aktivierbare Clerk-Oberfläche besitzt zwei
inzwischen tatsächlich geprüfte öffentliche ENV-Consumer.
Die gesonderte Next.js-Anwendung unter `apps/web` ist eine Referenz und wird
durch diese Vercel-Konfiguration nicht als Serveranwendung bereitgestellt.

Die Clerk-React-Ergänzung ist quellverifiziert: `apps/site/src/Auth.tsx:21–22`
und `apps/site/src/auth-policy.mjs:14–15` konsumieren
`VITE_CLERK_PUBLISHABLE_KEY` und `VITE_CLERK_ENABLED`. Sie sind keine Pflichtwerte
für das allgemeine Rendern der öffentlichen Seite. Nur der exakte String `true`,
ein formal gültiger Public-Key-Hostname und ein normaler Online-Modus aktivieren
die Oberfläche; die Offline-/Hash-Vorschau bleibt deaktiviert. Der Schalter
prüft selbst keine DNS-Bereitschaft. DNS und tatsächliche Auth-Laufzeit sind
zusätzlich zu verifizieren, bevor die Aktivierung im Deployment erfolgt.

| Name | Sensitivität / Dienst | Anforderung und Grenze |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | öffentlich / React-Vite-Build | Quelle und boolescher Root-API-Vergleich des erwarteten öffentlichen Werts geprüft |
| `VITE_CLERK_ENABLED` | öffentlich / React-Vite-Build | Quelle und boolescher Root-API-Vergleich geprüft; explizit deaktiviert |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | öffentlich / Next-Referenz | Bestehender Consumer in `apps/web/auth/policy.ts`; nicht automatisch ein Vite-Consumer |
| `CLERK_SECRET_KEY` | Serversecret / Next-Referenz | Nur bei gesonderter Next-Serverbereitstellung; niemals im Vite-Bundle |
| `APP_ENV` | nicht geheime Serverkonfiguration / Next-Referenz | Optionale Produktionsprüfung der Auth-Konfiguration |
| `NODE_ENV` | nicht geheimer Frameworkmodus / Next-Referenz | Frameworkverwaltet; kein zusätzlich zu beschaffendes Secret |
| `NEXIFY_REPOSITORY_ROOT` | nicht geheimer Serverpfad / Next-Referenz | Optionaler Pfadoverride mit vorhandenem Fallback |

Alle `VITE_*`- und `NEXT_PUBLIC_*`-Variablen sind als potenziell browseröffentlich
zu behandeln. Provider-Schlüssel, Sitzungsschlüssel, Webhook-Credentials und
Management-Secrets dürfen keinen solchen Präfix erhalten. Ein öffentlicher
Publishable Key beweist weder DNS-Bereitschaft noch Mandantenrechte oder eine
bereits funktionsfähige Anmeldung.

## 2. Auth0 und bestehende Clerk-Serverkonfiguration

Der Remote-Metadatenabgleich bestätigt sechs Auth0-Namen in allen drei Scopes:

| Remote bestätigter Name | Einordnung | Historischer Nutzerhinweis / Grenze |
|---|---|---|
| `AUTH0_CLIENT_SECRET` | Serversecret | Preview/Production: Needs Attention |
| `AUTH0_CLIENT_ID` | Nicht geheime Kennung, vorerst serverseitig halten | Kein zusätzlicher Status belegt |
| `AUTH0_SECRET` | Serversecret | Preview/Production: Needs Attention |
| `AUTH0_MANAGEMENT_API_CLIENT_ID` | Nicht geheime Managementkennung, serverseitiger Kontext | Kein zusätzlicher Status belegt |
| `AUTH0_MANAGEMENT_API_CLIENT_SECRET` | Serversecret | Zusätzlich durch Remote-Metadaten bestätigt; keine Wertprüfung |
| `AUTH0_DOMAIN` | Nicht geheime Domainkonfiguration | Kein zusätzlicher Status belegt |

Die ursprünglichen Needs-Attention-Angaben bleiben historische Nutzerhinweise;
die Metadaten belegen weder ihre Ursache noch ihre Behebung. Die überprüften
aktiven Apps enthalten derzeit keinen Auth0-Consumer. Daraus folgt weder eine
Löschfreigabe noch eine Provideraktivierung. Werte nicht auslesen, nicht durch
leere Platzhalter ersetzen und keine vorhandenen Schlüssel blind rotieren.
Clerk und Auth0 dürfen nicht durch vorsorgliches Befüllen beider Variablensätze
gleichzeitig aktiviert werden. Ein echter Providerwechsel benötigt eine eigene
Entscheidung zu Identitäten, bestehenden Konten und Autorisierung.

Auch `CLERK_SECRET_KEY` und `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` sind durch
Metadaten in allen drei Scopes vorhanden. Der vorhandene Clerk-Secretwert,
sein Live-Modus und seine Zuordnung zum öffentlichen Schlüssel wurden nicht
geprüft. Die statische React-App konsumiert dieses Serversecret nicht.
Metadatenpräsenz ist kein Nachweis einer lauffähigen Serverintegration.

Zusätzlich vorhandene Namen ohne Consumer in den überprüften aktiven Quellen:

- KV/Redis: `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL`, `KV_REST_API_URL`,
  `KV_REST_API_TOKEN`, `REDIS_URL`.
- Daten-/Deploymentdienste: `MONGODB_URI`, `CONVEX_DEPLOY_KEY`.
- Suche: `UPSTASH_SEARCH_REST_READONLY_TOKEN`, `UPSTASH_SEARCH_REST_TOKEN`,
  `UPSTASH_SEARCH_REST_URL`, `ALGOLIA_SEARCH_API_KEY`, `ALGOLIA_WRITE_API_KEY`,
  `ALGOLIA_APP_ID`.
- Blob: `BLOB_READ_WRITE_TOKEN`.

Diese Einträge sind **review_required**. Vorhandensein und vertraute Namen
beweisen weder Eigentum noch Zweck oder Zuordnung zu einer Agentur-/Kundendatenbank.
Es wird kein Kundensystem zugeordnet, keine Verbindung ausprobiert und kein
Eintrag gelöscht. Such-/Lese-Keys werden ohne geprüften Berechtigungsumfang
nicht automatisch zur Browserveröffentlichung freigegeben.

## 3. Gateway und zukünftige Provider

`apps/agent-gateway/server.py` verwendet derzeit CLI-Argumente für Datenbank,
Port und Web-Origin, keine ENV-Consumer. Der statische Vercel-Build startet
diesen Python-/SQLite-Dienst nicht. Die Loopback-Proxys in Vite dienen dem
lokalen Dev-/Preview-Server; sie stellen keinen Produktionsgateway auf Vercel
bereit. Fehlende Serverbereitstellung lässt sich nicht durch einen erfundenen
`VITE_API_URL` oder einen leeren Providerkey beheben.

LLM-Dialog, E-Mail, Kalender, Zahlung und Produktionsmedien benötigen eigene
umgesetzte Adapter und Providerverträge. Wo ein aktiver Consumer keinen
Variablennamen definiert, wird hier auch keiner erfunden. Diese Voraussetzungen
sind getrennte Server-/Integrationsarbeit, keine versteckte Voraussetzung für
das statische Anzeigen der Seiten.

## 4. CI und lokale Werkzeuge gehören nicht in den Vercel-Build

| Namen | Dienst / Zweck | Bereitstellung |
|---|---|---|
| `OPENROUTER_API_KEY` | Begrenzter AI-Review in CI bzw. freigegebenes Review-Werkzeug | Bedingt erforderlich nur für diesen Workflow; serverseitiges Secret |
| `SLACK_WEBHOOK_URL` | Gesondert autorisierte CI-Benachrichtigung | Bedingt erforderliches Secret; kein Versand zur bloßen Einrichtung |
| `GITHUB_TOKEN`, `GH_TOKEN` | GitHub-Jobtoken und kurzlebiger Workflowalias | CI-generiert; nicht nach Vercel kopieren |
| `REA_MCP_URL`, `REA_MCP_TOKEN` | Explizit ausgewählte Remote-MCP-Probe | Nur bei dieser Remote-Verbindung; URL ohne eingebettete Credentials, Token geheim |
| `NEXIFY_GITLAB_MIRROR_URL` | Autorisiertes lokales Mirror-Werkzeug | Optionaler Endpunkt ohne Credentials; keine zweite Schreibquelle |
| `REA_LOG_LEVEL`, `REA_MCP_INPUT_SCHEMA_PROFILE`, `REA_MCP_OUTPUT_SCHEMA_PROFILE` | Isolierter lokaler stdio-Wrapper | Vom Werkzeug intern gesetzt |
| `LANG`, `LC_ALL`, `TMPDIR` | Lokaler Prozesskontext | Optional vom System geerbt |
| `GIT_TERMINAL_PROMPT`, `GIT_CONFIG_NOSYSTEM` | Isolierte Mirror-Prozessregeln | Vom Werkzeug intern gesetzt |

Genaue Quellstellen, Dienstzuordnung und Bedingung stehen je Name im JSON.
Development/Preview/Production beschreibt dort den jeweiligen Anwendungskontext,
nicht die Behauptung, jede CI-/Werkzeugvariable müsse in Vercel vorhanden sein.

## 5. Quellenabgrenzung und verbleibende Nachweise

Geprüft werden aktive eigene Quellen in `apps/site`, `apps/web`,
`apps/agent-gateway`, `packages` und `tools/automation` sowie die genannten
eigenen Konfigurationen und Workflows. Die Quelldateiliste mit Snapshot-Hashes
ist im Vertrag enthalten. Tests und deren künstliche Keys sind keine
Produktionsanforderungen. Historische Prototypen, `reference/handoff-n2`,
alte Rootskripte und das pausierte externe A1-Kundenprojekt erzeugen keine
Vercel-Pflichtvariablen des Agenturprojekts. Maßgeblich ist
`config/source-boundaries.json`.

Der abgeschlossene Metadatenabgleich bleibt auf Namen, Typen, Scopes,
Branchbindung und Zeitstempel beschränkt. Keine Decryption-/Value-Ausgabe und
keinen ENV-Pull verwenden. Nicht gelistete lokale/CI-Namen sind dadurch nicht
automatisch fehlende Vercel-Pflichtwerte. Noch offen sind die tatsächliche
Clerk-DNS-/TLS-/Login-Bereitschaft, die gegebenenfalls notwendige Prüfung von
Servercredential-Zuordnung und die Eigentums-/Zweckprüfung ungenutzter
Remote-Einstellungen. Vorhandensein eines Namens allein genügt nicht.

## 6. Shop-API: Projektbindung (Nachtrag 14.11.2026)

Die Shop-API (`apps/shop-api/vercel_app.py`) und der Namespace-Operator
(`apps/shop-api/namespace_operator.py`) arbeiten nur in einem ausdrücklich
freigegebenen Vercel-Projekt. In jedem anderen Projekt antworten alle
`/api/shop/*`-Aufrufe mit `503` und `reason: project_binding_unverified`. Das ist
gewollter Mandantenschutz für die Shop-Datenbank, kein Fehler. Bis zu diesem Nachtrag
war das freigegebene Projekt eine feste Konstante (`prj_Po7jlB7srMP6sxyMvf5zIwzXzNyh`);
das heute ausliefernde Projekt `…-ut7r` (`prj_lKQEWQKzjqq4Ifvmwy6dh1XCIgVR`) war
dadurch ausgeschlossen.

| Name | Sensitivität | Standard | Wer setzt sie |
|---|---|---|---|
| `SHOP_ALLOWED_PROJECT_IDS` | nicht geheim (Projekt-IDs sind Kennungen, keine Zugangsdaten); wird trotzdem nie in Antworten oder Logs ausgegeben | nicht gesetzt = genau `prj_Po7jlB7srMP6sxyMvf5zIwzXzNyh`, das Verhalten ist dann unverändert | Der Inhaber (Pascal Courbois) oder ein von ihm beauftragter Admin des Vercel-Teams, je Projekt im Vercel-Dashboard. Kein Agent, kein Skript: die Variable ist die ausdrückliche Freigabe. |

Regeln, identisch in Laufzeit und Operator (eine gemeinsame Funktion,
`project_binding_verified` in `vercel_app.py`):

- Format: kommagetrennte Vercel-Projekt-IDs. Leerzeichen, Tabs und Zeilenumbrüche um
  einen Eintrag werden toleriert, leere Einträge ignoriert.
- Nicht gesetzt, leer oder nur aus Leerzeichen/Kommas bestehend gilt als **nicht
  konfiguriert** und fällt auf den Standard zurück, niemals auf „offen".
- Eine gesetzte Liste **ersetzt** den Standard. Soll das historische Projekt weiter
  binden dürfen, muss seine ID in der Liste stehen, oder die Variable bleibt in
  diesem Projekt ungesetzt.
- Verglichen wird exakt und mit Groß-/Kleinschreibung gegen `VERCEL_PROJECT_ID`
  (setzt Vercel selbst). Es gibt keine Wildcards und keine Muster; `*` ist nur ein
  Zeichen und passt auf keine echte ID.
- Der Diagnosecode bleibt `project_binding_unverified`. Weder die Projekt-ID noch die
  Liste erscheinen in einer Antwort, einer Ausnahme oder einem Log.

Was die Variable **nicht** tut:

- Sie gibt **keinen Datenbankzugriff**. `MONGODB_URI` (oder `MONGO_URL`), `DB_NAME`
  (muss `nexify_teileklar_shop_v1` sein), `PREVIEW_PUBLIC_ORIGIN`, `SHOP_VAT_PERCENT`
  und `REVOLUT_MODE` müssen im jeweiligen Projekt selbst gesetzt sein. Secrets werden
  nicht zwischen Projekten kopiert oder übertragen. Fehlen sie, antwortet die API
  weiter mit `503`, dann aber mit dem jeweils eigenen Diagnosecode (zum Beispiel
  `database_binding_missing_or_unsuitable`).
- Sie ändert die **Identität des Namespaces** nicht. `PROJECT_ID` bleibt Teil von
  `SCHEMA_MARKER` und Plan-Digest; der Datenbank-Namespace gehört weiterhin zu
  `prj_Po7jlB7srMP6sxyMvf5zIwzXzNyh`, auch wenn ein zweites Projekt zugelassen wird.
- Sie entscheidet nicht, welches Projekt kanonisch wird und wo die Produktionsdatenbank
  der Suite läuft. Das ist eine offene Entscheidung des Inhabers (Abschnitt 5
  „Entscheidungen des Inhabers, die es braucht", Zeile „Produktionsdatenbank", in
  `docs/architecture/suite-fundament-2026-11-14.md` auf dem Branch
  `claude/epic-hopper-7d3duf`; dort, nicht in `main`).

Prüfung ohne Netzwerk und ohne echte Werte:
`python3 -m unittest discover -s apps/shop-api/tests -p 'test_vercel_adapter.py'` und
`-p 'test_namespace_operator.py'`.

## 7. Indexierung der Website (Nachtrag 14.11.2026)

Regel und Freigabeweg: `docs/04-betrieb/indexierung-freigabe-2026-11-14.md`, Umsetzung `apps/web/lib/indexing.ts`.
Beide Variablen sind keine Geheimnisse und in Produktion **nicht gesetzt**; setzen darf sie nur der Inhaber.

| Variable | Wert | Wo | Wirkung |
|---|---|---|---|
| `NEXIFY_INDEXING` | `enabled` | Vercel-Projekt `…-ut7r`, nur Umgebung Production, danach Redeploy | Agentur- und Rechtsseiten werden auf den freigegebenen Domains indexierbar; jeder andere Wert sperrt |
| `NEXIFY_INDEXING_TEILEKLAR` | `enabled` | wie oben, erst wenn der Shop-Dienst antwortet | zusätzlich `/teileklar` in Index und Sitemap; wirkt nur zusammen mit `NEXIFY_INDEXING` |


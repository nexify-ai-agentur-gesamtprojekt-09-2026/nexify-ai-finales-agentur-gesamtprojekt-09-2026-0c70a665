# Vercel-Projekt: Zielkonfiguration und tatsächlicher Zugang

Projekt: `nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665`, Team-Slug
`pascals-projects-2864de33`. Dies ist über den GitHub-Vercel-Status belegt, nicht
als vollständiger authentifizierter Read-back der Projekteinstellungen.

## Vorbereitete Konfiguration

| Einstellung | Ziel |
|---|---|
| Repository | nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665 |
| Vorschauzweig | factory/agency-separated-2026-10-26 |
| Root Directory | Repositorywurzel, nicht prototypen oder apps/web |
| Framework | Vite / React |
| Node |22.x passend zu22.23.4; keine ungeprüfte höhere Hauptversion erzwingen |
| Installation | pnpm install --frozen-lockfile --ignore-scripts |
| Build | pnpm --filter @nexify/site build |
| Output | apps/site/dist |
| Vorschau-Domain | nexifyai.de |
| Spätere Hauptdomain | nexifyai.cloud; bestehende ChatGPT-Seite bis Fertigstellung erhalten |
| SPA-Routing | Nur öffentliche Browserseiten; /api und /.well-known nicht zu HTML umschreiben |

Die Root-vercel.json führt Build, Ausgabe, Rewrite und bestehende Sicherheitsheader.
Keine fremden Providersecrets dürfen über VITE_ oder NEXT_PUBLIC_ veröffentlicht
werden. Die tatsächlichen Verbraucher und Umgebungen gehören in den gesonderten
ENV-Vertrag; ein Variablenname allein aktiviert keinen Authdienst.

## Eindeutig gemeldete Deployment-Sperre

Für Commitb2b1824 meldete GitHub Vercel-Failure `Deployment was blocked`.
Der vom Nutzer gelesene konkrete Grund lautet: `NeXify-Automate does not have a
Vercel account linked to their GitHub account.` GitHub ordnet die bisherigen
Commits anhand der zuvor global eingestellten alten Mail NeXify-Automate zu;
die vorhandene GitHub-API-Verbindung handelt dagegen als nexifyai-dev.

Der Nutzer hat `mail@nexifyai.cloud` als eigene GitHub-Mail vorgegeben. Nur für
zukünftige echte Commits wurde sie repositorylokal gesetzt. Alte Commits werden
nicht umgeschrieben. Die Kontozuordnung der neuen Commits und die Vercelprüfung
sind anschließend tatsächlich zurückzulesen. Eine korrekte Autoren-Mail ist kein
Ersatz für die erforderliche Vercel-Git-Verbindung oder Team-/Projektberechtigung.

Offiziell: https://vercel.com/docs/deployments/troubleshoot-project-collaboration.
Hobby verlangt bei privaten Repositories die tatsächliche Eigentümerzuordnung;
Pro/Enterprise verlangen passende Teamzugehörigkeit beziehungsweise ausstehende
Freigabe. Keine fremde Identität, kein neuer erfundener Bot und kein Abschalten
der Teamprüfung. Neue kostenpflichtige Seats oder Tarifwechsel wurden nicht
beauftragt oder ausgeführt.

## Authentifizierung in dieser Sitzung

Das vom Nutzer markierte ChatGPT-Vercel-Plugin liefert hier weiterhin keine
aufrufbaren Werkzeuge. Der offizielle CLI-Ausweichweg65.2.0 wurde isoliert mit
unterdrückten Installationshooks vorbereitet. Ein browsergestützter Geräte-Login
wurde gestartet. Der sichere lokale Konfigurationspfad liegt außerhalb des
Repositories; Token werden weder ausgegeben noch eingecheckt. Ohne erfolgreiche
Anmeldung werden Remote-Einstellungen nicht als gelesen oder geändert behauptet.

Nach erfolgreicher Anmeldung: richtige Identität/Team lesen, vorhandenes Projekt
und Root-/Buildwerte abgleichen, Domains und Git-Zweigbindung prüfen, ENV-Metadaten
lesen, gezielt fehlende echte Werte beziehungsweise sichere Referenzen ergänzen,
Vorschau neu deployen, HTTP/Assets/Navigation/Fehlpfade prüfen und Ergebnisse
zurücklesen. Die aktuelle.cloudSeite wird dabei nicht vorzeitig ersetzt.

## Weitere Remote-Prüfungen

Commit339af39 bestand die fünf eigenen GitHub-CI-Jobs: repository,
postgres-isolation, openapi-schema, next-web, react-site. Die Containerprüfung
vertraut nur dem genauen Checkoutpfad und lädt volle Historie; PostgreSQL behält
den bestehenden isolierten Testzielguard.

Eine daneben vorhandene Cloudflare-Workers-Integration scheitert separat mit
`Script name is too long ... cannot be longer than54characters`.
Sie wurde nicht heimlich gelöscht, umbenannt oder als erfolgreicher Backuphost
bezeichnet. Ihre tatsächliche Rolle ist vor einer Änderung zuzuordnen.

## Aktualisierung: authentifizierte Einrichtung ausgeführt

CLI65.2.0 ist als `nex2fly-nexifyai-nexify` angemeldet. Das bestehende Projekt
`prj_Po7jlB7srMP6sxyMvf5zIwzXzNyh` wurde gezielt per CLI verknüpft. Der
vorherige Python-Preset/Node24 wurde auf Vite/Node22, Repositorywurzel,
`pnpm --filter @nexify/site build` und `apps/site/dist` geändert und per
separatem API-GET bestätigt. Dies korrigiert die gemeldete Ausgabeordnerlücke.
Auch die Paket-Engines bleiben auf Hauptversion22, statt künftig automatisch
auf eine neue Node-Hauptversion zu wechseln.

`nexifyai.de` wurde dem Vorschauzweig zugeordnet und diese Bindung zurückgelesen.
Die Hauptdomain `.cloud` und der Produktionszweig `main` wurden nicht umgestellt.
Vorhandene Deployment-/Forkschutzregeln blieben erhalten. Ein erreichbarer
fertiger Deploymentstand ist gesondert zu prüfen; eine gespeicherte Einstellung
allein ist kein Release.

Die beiden neuen Vite-Clerk-Werte sind für Development, Preview und Production
angelegt. Einzelabrufe bestätigten nur als boolesches Ergebnis, dass die
öffentlichen Werte dem bekannten Publishable-Key und `false` entsprechen.
Kein Serversecret wurde ausgelesen oder überschrieben. Bestehende Clerk- und
Auth0-Einträge bleiben erhalten. Der aktuelle Clerk-CNAME wird weiter als
NXDOMAIN beantwortet; deshalb bleibt die echte Online-Anmeldung deaktiviert.
Der React-Code enthält jetzt die verzögert geladene offizielle Clerk-UI, während
Standalone-/Dateivorschau unabhängig von Buildflags keine Authsitzung startet.

Der Benutzer-Homebereich und die verwaltete Codexkonfiguration sind physisch
schreibgeschützt. Plugininstallation und globale MCP-Registrierung konnten nicht
abgeschlossen werden; eine erteilte zusätzliche Pfadfreigabe beseitigt keinen
Read-only-Mount. Gemäß Einstiegsanleitung wurde stattdessen das offizielle
Standalone-Skillpaket im Projekt installiert:9Skills, über `skills list`
bestätigt und in `skills-lock.json` gebunden. Es wurde nicht zugleich ein Plugin
als installiert behauptet. Globale Slash-Commands und `list_teams` über MCP sind
hier nicht verfügbar. Die authentifizierten Projektoperationen nutzen den
bereits funktionierenden offiziellen CLI-Zugang.

Die Token-Such-/Ausgabe-Beispiele der allgemeinen Tokenanleitung wurden nicht
ausgeführt: Die OAuth-Anmeldung ist vorhanden, und Credentialwerte werden
weder aus lokalen Dateien entdeckt noch in Logs ausgegeben. Die von der CLI
angelegte lokale OIDC-Datei ist ignoriert und auf0600beschränkt. Kein Tarif,
kein kostenpflichtiger Seat, keine neue Datenbank und kein neuer Providerplan
wurden hinzugebucht.

## Erste bestätigte Live-Vorschau

Commit `409db5021aaf4ceb08e64bb23795c2a4f144c443` wurde durch Git-Push als
Preview erfolgreich gebaut. Deployment `dpl_5YEzN7oMMpBFjNUWvBrLmQgdxeLm` ist
laut authentifiziertem Deployment-API und CLI-Inspect `READY`; Alias:
**https://nexifyai.de**. Die neue Autoren-Mail wird von GitHub tatsächlich
`nexifyai-dev` zugeordnet. Die bisherige Author-Blockade bleibt als historischer
Befund dokumentiert, gilt aber nicht für diesen erfolgreichen Stand.

Die fünf eigenen CI-Jobs bestanden auch für409db50. Eine zusätzliche, am selben
Tag angelegte Vercel-App `site` hängt am selben Repository und besitzt nur ihre
automatische vercel.app-Domain. Deren verschachtelter Root/Standardoutput löste
die ebenfalls gemeldete `STATIC_BUILD_NO_OUT_DIR`-Meldung aus. Sie wird ohne
Löschung oder Domainübernahme auf dieselbe konsistente Monorepo-Buildkonfiguration
gebracht. Das kanonische Projekt und seine `.de`-Zuordnung bleiben führend.

READY belegt die Vorschau-Bereitstellung. Die fehlende externe produktive
Besucher-API, Clerk-DNS/Liveanmeldung, Presenter-Videos und tatsächliche
ChatGPT-Backup-Synchronisierung sind damit weiterhin nicht abgenommen.

Die zusätzliche App `site` wurde ebenfalls auf Repositorywurzel, Vite/Node22,
identischen PNPM-Build und `apps/site/dist` korrigiert. Ihre Git-Verknüpfung,
Schutzregeln und automatisch zugewiesene Domain blieben erhalten. Es wurden
keine Geschäftsdomains übertragen und kein Projekt gelöscht. Der nächste
Git-Push validiert beide Vercel-Projektkonfigurationen gegen denselben Quellstand.

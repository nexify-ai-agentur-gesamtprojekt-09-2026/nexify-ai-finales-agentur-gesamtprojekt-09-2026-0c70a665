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

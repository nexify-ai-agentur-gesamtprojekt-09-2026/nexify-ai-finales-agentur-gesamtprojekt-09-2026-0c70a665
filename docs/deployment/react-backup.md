# React-Oberfläche und synchroner Backup-Stand

Vercel bleibt das Hauptdeployment, `nexifyai.de` die Vorschau und
`nexifyai.cloud` die spätere Hauptdomain. Die dort vorhandene ChatGPT-Seite
bleibt bis zur fertigen und abgenommenen NeXify-Version bestehen.

Die neue portable React-Ausgabe verwendet die vorhandenen UI-Komponenten,
Texte und Design-Tokens. Next.js basiert ebenfalls auf React und verhindert
Komponentenwiederverwendung nicht; für den ausdrücklich gewünschten portablen
Betrieb wird die öffentliche Oberfläche zusätzlich ohne Next-Server gebaut.
Die bisherige Next-/Clerk-Implementierung bleibt erhalten. Eine statische
React-Ausgabe beinhaltet keine Serversecrets, privaten Portal-Daten oder
serverseitige OAuth-Verifier.

## Ein Release für beide Ausgaben

Aus dem kanonischen Repository einen geprüften Build erzeugen. Das Releasepaket
enthält einen Dateikatalog mit SHA-256 und Quellcommit. Haupt- und Backupziel
müssen genau dieses Paket erhalten; für die Synchronitätsprüfung Commit und
alle Assets vergleichen. Ein zweites separat gepflegtes Seitenprojekt erfüllt
diese Anforderung nicht. CI-Builds und ein gespeichertes Paket sind noch keine
beiden tatsächlichen Deployments.

Für die bestehende ChatGPT-Seite ist hier keine Deployment-/Update-API verfügbar.
Daher ist weder eine automatische Aktualisierung noch ein unabhängiger
Dauerbetrieb auf ChatGPT nachgewiesen. Falls diese Oberfläche das Releasepaket
nicht als Website hosten kann, benötigt der Backupstand einen unabhängigen
statischen Host; ein bloßer ChatGPT-Link ersetzt diesen nicht. Es wurde kein
Backuphost gekauft und kein DNS-Failover eingeschaltet.

Ein Vercel-Ausfall darf die statischen Inhalte des unabhängigen Backups nicht
betreffen. Chat, PDF-/Mail-/Terminabläufe und Clerk-Anmeldung benötigen zusätzlich
einen verfügbaren, produktionsfähigen Backenddienst und die für beide Origins
korrekte Auth-/Consent-Konfiguration. Bis dahin zeigt die Oberfläche die fehlende
Verbindung an; sie meldet keinen erfolgreichen Versand oder Termin. Ein
Frontend-Backup allein macht die Backenddienste nicht hochverfügbar.

## MCP und Clerk bleiben serverseitige Aufgaben

React ist die Browseroberfläche. Für den Composio-MCP-Endpunkt ist die eigene
Serverkontrolle weiterhin ungeklärt; siehe `clerk-mcp.md`. Die fehlenden fünf
CNAMEs und der unverändert zu erhaltende DMARC-Eintrag stehen in `clerk-dns.md`.
Keine fremde OAuth-Discovery auf dem Websitehost veröffentlichen.

## Lokale Befehle und vorbereitete Vercel-Konfiguration

`pnpm dev` startet die React/Vite-Oberfläche auf Loopback 3004 und den lokalen
Besucher-Gateway auf 3003. `pnpm build` erzeugt die portable öffentliche Seite;
`pnpm typecheck` prüft ihre Typen. Die Next-Referenz bleibt über
`pnpm build:next-reference` erhalten. `pnpm release:site` erstellt nach dem
Build ein unveränderliches ZIP und Dateimanifest unter `.local/releases`.
Mit `python3 tools/site_release.py verify --archive <release.zip>` wird das
Archiv vor einer Übernahme geprüft.

Die Root-`vercel.json` ist für `apps/site/dist` vorbereitet. Das SPA-Routing
schließt `/api` und `/.well-known` aus: Fehlende Backend- oder OAuth-Endpunkte
werden nicht durch eine HTML-Seite als Erfolg maskiert. Bestehende Sicherheits-
Header bleiben erhalten. Diese Datei wurde lokal geändert; kein Remoteprojekt
wurde dadurch umgestellt. CI erstellt das React-Release separat und bewahrt es
als Artefakt. Es gibt derzeit keinen automatisch verbundenen Backup-Deploymentjob.

Eine API-Produktivanbindung wurde nicht erfunden. Der Vite-Proxy auf Loopback3003
ist nur lokal. Die aktuellen Clerk-Anmeldewidgets verbleiben in der Next-
Referenz; im portablen Preview ist Anmeldung als noch nicht verfügbare Funktion
gekennzeichnet. Vor produktiver Ablösung müssen die React-Clerk-Anmeldung und
der echte Backendvertrag umgesetzt und mit beiden Origins geprüft werden.

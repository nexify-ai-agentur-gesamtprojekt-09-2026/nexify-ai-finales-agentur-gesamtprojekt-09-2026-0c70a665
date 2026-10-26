# Native NeXify-Webanwendung

Next.js App Router und TypeScript; die feste React-Seitenleiste ist Bestandteil des gemeinsamen Layouts. Ein normaler Next-Seitenwechsel erhält das laufende Gespräch. Mobil wird derselbe Bereich geöffnet/geschlossen; er ist kein eingebettetes Fremddashboard oder Browser-Plugin.

Die beabsichtigte Informationsarchitektur kommt aus `config/site-map.json`. Nur ausdrücklich öffentliche Seiten ohne Anmeldepflicht gelangen in öffentliche Navigation und Clientprops. Private und interne Pfade erhalten einen generischen Zugangshinweis, bis eine echte Konto-/IdP-Anbindung existiert. Inhalte dieser Bereiche werden nicht gerendert. NeXify und TEILEKLAR bleiben eigene Seitenkontexte innerhalb des lokalen Monorepos; daraus folgt kein domainübergreifendes SSO.

```sh
pnpm install --frozen-lockfile
pnpm --filter @nexify/web typecheck
NEXT_TELEMETRY_DISABLED=1 pnpm --filter @nexify/web build
pnpm --filter @nexify/web dev
```

Die lokalen `/api/*`-Anfragen werden durch einen festen Next-Rewrite an den separaten Visitor-Gateway auf Loopback-Port 3003 weitergereicht. Keine beliebige Proxyadresse aus Besucherinput, kein Providerkey im Browser. Entwicklungsoberfläche: Port 3004. Der lokale Gateway und seine Datenbank werden separat gestartet; siehe `../agent-gateway/README.md`.

Farben, Flächen und Radien werden aus `packages/tokens/tokens.css` importiert. Die vorhandenen Originaldateien für Signet, Pascal-Porträt und selbst gehostete Geist-Schriften wurden unverändert als Assets übernommen. Prototyp-HTML und dessen Manifest bleiben unverändert. Die Seite enthält keine neu erzeugten Hero-Videos oder erfundenen 3D-Markenfiguren. Die Dateien `portrait.png`, `signet.svg` und `fonts/*` sind keine Lizenzübertragung für fremde Projekte.

Die UI verwendet verständliche Statusmeldungen: PDF **Entwurf**, Versand **vorgemerkt/nicht versendet**, Termin **angefragt/nicht extern bestätigt**, Marketing **strukturierter Entwurf/nicht veröffentlicht**. Dies sind tatsächliche lokale Ergebnisse und keine simulierten Anbieterantworten. Der frei generative KI-Dialog, E-Mail-Zustellung und externe Kalender bleiben gesonderte Integrationen. Die DE/NL/FR-Schlüsselsätze der Seitenleiste sind gleich; veröffentlichbare Rechtstexte werden nicht automatisch übersetzt.

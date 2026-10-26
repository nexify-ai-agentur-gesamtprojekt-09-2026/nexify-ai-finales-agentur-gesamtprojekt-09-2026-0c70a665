# Clerk OAuth für MCP: gewünschte Konfiguration und tatsächliche Grenze

Angeforderte Resource: `https://connect.composio.dev/mcp`.
Angeforderter Issuer: `https://clerk.nexifyai.de`.
Maschinenlesbare Soll-/Ist-Trennung: `config/integrations/clerk-mcp.json`.

## Tatsächlich geprüft

Die öffentliche Resource-Metadatenquelle
`https://connect.composio.dev/.well-known/oauth-protected-resource/mcp`
antwortete mit `resource=https://connect.composio.dev/mcp`, aber mit
`authorization_servers=[https://connect.composio.dev]`. Der Dienst wird unter
Composios Domain angeboten. In den eigenen Quellen wurde kein dazugehöriger
HTTP-MCP-Server gefunden. `config/mcp-server.json` ist ein historischer
Zielvertrag für `https://mcp.nexifyai.cloud`, kein ausführbarer Server;
REA ist separat per STDIO angebunden. Der lokale Besucher-REST-Gateway ist kein
MCP-Transport und wurde nicht umfunktioniert.

Die angeforderte Clerk-Issuer-Discovery wurde über den Sitzungspfad mit einem
Proxy-Tunnel-403 abgewiesen. Das ist kein erfolgreicher Discovery-Nachweis und
beweist weder eine Clerk-Antwort noch einen Tokenstatus. Clerk-DNS fehlt derzeit.
Keine OAuth-Grants, Benutzeranlage oder geschützten Tools wurden aufgerufen.

Die gewünschte Resource-Metadatendatei ist nur vorbereitet, **nicht veröffentlicht**.
Sie gehört an den Resource-Host, nicht an irgendeinen eigenen Website-Host.
Eine NeXify-Datei kann weder Composios Challenge noch seinen Tokenverifier ersetzen.
Clerk-Tokens werden nicht als angebliche Composio-Tokens weitergereicht.

## Framework und Prüfvertrag

Die [generische offizielle Anleitung](https://clerk.com/docs/guides/ai/mcp/build-mcp-server)
ist die Framework-Auswahl. Die geprüfte konkrete Anleitung für den bisherigen
Next-Server ist [Clerk MCP mit Next.js](https://clerk.com/docs/nextjs/guides/ai/mcp/build-mcp-server).
Eine portable React-Oberfläche ersetzt keinen serverseitigen OAuth-Verifier.
Das tatsächliche Backend-Framework muss aus dem kontrollierten Servercode folgen.

Für einen später zugänglichen Server werden Resource und Issuer ausdrücklich
gebunden. Aus `/mcp` folgt der pfadspezifische geschützte Metadatenpfad
`/.well-known/oauth-protected-resource/mcp`; aus dem hier pfadlosen Issuer folgt
`/.well-known/oauth-authorization-server`. Metadaten sind ohne Bearertoken
öffentlich; fehlende/ungültige Tokens erhalten eine MCP-kompatible `401`
`WWW-Authenticate: Bearer resource_metadata="https://connect.composio.dev/.well-known/oauth-protected-resource/mcp"`
Challenge. Ungültige Tokens zusätzlich mit `error="invalid_token"` kennzeichnen;
vorhandene Autorisierung und Scopeentscheidungen bleiben serverseitig erhalten.

Nur OAuth-Access-Tokens, keine Clerk-Website-Sessiontokens. Bei Clerk explizit
`acceptsToken: 'oauth_token'` wählen. Erst Signatur bzw. vertrauenswürdige,
resourcebezogene Introspection prüfen, anschließend exakten Issuer, Ablaufzeit
und Audience für genau diese Resource erzwingen. Opaque Tokens nicht bloß
JWT-decodieren. Keine Resource nachträglich aus dem Request als angeblich
verifizierten Claim einsetzen. Die vorhandene SDK-Version und Helper müssen
darauf geprüft werden, welche Claims sie tatsächlich durchsetzen. Der öffentlich
gelieferte PEM bleibt ohne verifizierte Issuerbindung inaktiv.

Stateless HTTP benötigt pro Request eine neue Server-/Transportinstanz mit der
unterstützten SDK-API; andernfalls die dokumentierte SDK-Sessionverwaltung
vollständig implementieren. Bestehende Toolhandler, Scopes und Rollenregeln
unverändert hinter dieser Authgrenze betreiben.

## Noch nicht ausführbare Abnahme

Kein Live-Login- oder Toolaufruf wurde als bestanden gewertet. Nach Zugang zum
wirklichen Server: öffentliche Discovery, echter Clerk-Sign-in mit OAuth-Grant,
erfolgreicher berechtigter Toolaufruf, fehlendes Token, ungültige Signatur,
abgelaufenes Token, falscher Issuer, falsche Audience, Sessiontoken sowie opaque
Tokens ohne Resourcebindung prüfen. Wiederholte und parallele Aufrufe müssen
Transport-/Sessionisolation und bestehende Autorisierung bestätigen.

Es wurde kein zweiter Server mit erfundenen Tools angelegt. Zur Umsetzung am
Composio-Endpunkt fehlt weiterhin entweder sein kontrollierter Servercode oder
eine nachweislich unterstützte Composio-Konfiguration für den eigenen Issuer.

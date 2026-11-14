# NeXify-MCP-Server (Entwurf) · 14.11.2026

Status: **Entwurf, nichts live, Schalter AUS.** Composio-Custom-Toolkit `CUSTOM_NEXIFY_AI_FACTORY_MCP`, geplante Adresse `https://mcp.nexifyai.cloud` (Endpunkt `/mcp`).

## Zweck
Agenten (über Composio) sollen den öffentlichen Katalog und das Werkstattverzeichnis der NeXify AI FACTORY lesen können. Der Server ist eine **öffentlich erreichbare Werkzeug-Oberfläche** und deshalb absichtlich klein, nur lesend und defensiv gebaut. Er ersetzt nicht den in `config/mcp-server.json` beschriebenen späteren CRM-/Regelwerk-Server (OAuth, Rollen), sondern ist ein getrennter, minimaler Lesezugang.

## Werkzeuge (alle nur lesend, `readOnlyHint=true`, `destructiveHint=false`)
| Werkzeug | Quelle (öffentliche API, nur GET) | Eingabe |
|---|---|---|
| `nexify_katalog_suche` | `/api/shop/products` | `q` (≤120), `kategorie`, `nur_verfuegbar`, `nur_mit_freigegebenem_preis`, `seite` 1–50, `seitengroesse` 1–20 |
| `nexify_werkstatt_suche` | `/api/workshops/search` | `q` (2–80, PLZ/Ort), `umkreis_km` 10/25/50/100 |
| `nexify_status` | `/api/shop/status` | keine |

Preise werden nur ausgegeben, wenn die Shop-API sie als `released` führt (sonst `preis_cent: null`). Die Antworten sind auf feste Felder projiziert; unbekannte Felder der Shop-API werden nicht durchgereicht. Es gibt keine Schreibaktion, keine Admin-Funktion, keine Zahlung, keine Kunden- oder Bestelldaten (keine Mandantendaten erreichbar).

## Transport
Zustandsloses Streamable HTTP (nur POST, kein GET-Strom, keine `Mcp-Session-Id`). Zielfassung 2026-07-28 (`server/discover`, Kopf-/Body-Prüfung `MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name`, Fehler -32020/-32022). Zusätzlich werden `initialize`-basierte Clients (2025-03-26 bis 2025-11-25) zustandslos bedient, weil das tatsächliche Verhalten des Composio-Clients nicht belegt ist. Methoden: `initialize`, `ping`, `server/discover`, `tools/list`, `tools/call`; Notifications → 202; unbekannte Methode → JSON-RPC -32601.

## Auth-Entscheidung
**Schalter + Kopf-Schlüssel, kein selbstgebautes OAuth.**
- `NEXIFY_MCP` (Standard aus): aus → **503**, auch ohne Schlüssel.
- `MCP_ACCESS_TOKEN` (mind. 24 Zeichen, nur aus der Umgebung): nicht gesetzt → **503**; fehlt/falsch → **401** (`WWW-Authenticate: Bearer`). Übergabe per `Authorization: Bearer …` oder `X-Nexify-MCP-Key`. Vergleich in konstanter Zeit.
- Weitere Abwehr: Browser-`Origin` → 403 (außer `MCP_ALLOWED_ORIGINS`), nur POST (sonst 405), Body ≤ 32 KiB, strenge Eingabeschemas (unbekannte Argumente → -32602), Upstream ≤ 512 KiB, Antwort ≤ 24 000 Zeichen, 8 s Timeout, keine Weiterleitungen, Ratenbegrenzung 60/min je Instanz (Best Effort; verteilte Begrenzung gehört an die Kante), keine internen Fehlertexte, keine Logs mit Werten.
- Env-Namen: `NEXIFY_MCP`, `MCP_ACCESS_TOKEN`, `SHOP_API_BASE_URL` (https oder Loopback), optional `MCP_ALLOWED_ORIGINS`, `MCP_PUBLIC_ORIGIN`.

## Discovery und Composios OAuth-Weg
- `/.well-known/oauth-protected-resource` (RFC 9728): nur bei Schalter an, **ohne** `authorization_servers`, mit Hinweis `nexify_auth` (Schlüssel-Kopf).
- `/.well-known/oauth-authorization-server`: **bewusst 404** (`no_authorization_server`). Ein erfundenes Dokument mit nicht vorhandenem Token-Endpunkt wäre falsch.
- Folge: **Composios OAuth-Weg wird damit nicht bedient.** Beim Registrieren muss Composio einen statischen Header (API-Key/Bearer) für ein Custom-Toolkit erlauben. Ob und wie Composio das für `CUSTOM_…`-Toolkits anbietet, ist **ungeprüft** und beim Registrieren zu klären.

## Was zum LIVE-Betrieb fehlt
1. Subdomain `mcp.nexifyai.cloud` per DNS auf das Web-Projekt zeigen lassen und am Ziel (Vercel/Cloudflare) als Domain eintragen; `/mcp` und `/.well-known/*` müssen ohne Umschreibung ankommen (Prüfen, ob `proxy.ts`/Catch-all `[...slug]` nichts abfängt: lokal nur Typprüfung und Tests gelaufen, kein `next build`).
2. Auslieferung (Deploy) des Zweigs nach Review/Merge.
3. Umgebungsvariablen am Ziel setzen: `MCP_ACCESS_TOKEN` (zufällig, neu erzeugt, im Secret-Store), `SHOP_API_BASE_URL`, danach erst `NEXIFY_MCP=1`.
4. In Composio das Toolkit erneut registrieren (Header-Schlüssel hinterlegen) und `tools/list` sowie je einen `tools/call` prüfen.
5. Verteilte Ratenbegrenzung/WAF an der Kante und Betriebsbeobachtung (Fehlerquote, 401-Spitzen) einrichten.

## Getrennte Sicherheitsentscheidung: öffentlicher OAuth-Weg
Ein echter OAuth-2.1-Weg (Autorisierungsserver, Token-Ausgabe, Client-Registrierung) erfordert einen eigenen Identitätsanbieter und eine eigene Freigabe (vgl. `config/mcp-server.json`, `${OIDC_ISSUER}`). Das ist nicht Teil dieses Entwurfs und wird nicht von Hand nachgebaut.

## Prüfung
`cd apps/web && node --test auth/tests/mcp-server.test.mjs` (19 Tests, Fake-Fetch, keine Netzaufrufe, nur Dummywerte) und `npm run typecheck`.

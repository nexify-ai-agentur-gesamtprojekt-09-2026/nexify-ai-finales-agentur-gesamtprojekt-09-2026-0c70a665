# Bestandsaufnahme `brain.nexifyai.cloud` · Stufe 0 · 16.11.2026

Auftrag: Inhaber Pascal Courbois, 16.11.2026 06:30 UTC („auth login mcp … auf diesen einen server“), Stufenplan der
koordinierenden Sitzung. Diese Stufe misst nur. Auf dem Server wurde nichts angelegt, gestartet, gestoppt oder
umkonfiguriert; es wurde kein Mess-Container gestartet (das wäre eine Änderung am Server gewesen).
Entwurf, der darauf aufbaut: `docs/architecture/0021-brain-mcp-oauth.md`.

Messwege: HTTPS-Abrufe aus der Cloud-Sitzung (über den Sitzungs-Proxy), Hostinger-API nur `GET`
(Schlüssel vom Proxy eingesetzt, nie gelesen). Compose-Inhalte vor jeder Ausgabe maskiert; hier stehen nur Namen,
keine Werte.

## 1. Von außen (IST, gemessen 16.11.2026 06:28 UTC)

| Pfad auf `https://brain.nexifyai.cloud` | Antwort |
|---|---|
| `/mcp` (GET und POST) | 401, `www-authenticate: Basic realm="traefik"` |
| `/.well-known/oauth-protected-resource`, `…/oauth-protected-resource/mcp` | 404 |
| `/.well-known/oauth-authorization-server`, `/.well-known/openid-configuration` | 404 |
| `/`, `/health`, `/docs`, `/register`, `/authorize`, `/token` | 404 |

- Der Name löst auf Cloudflare-Adressen auf (`172.66.40.167`, `172.66.43.89`), Antwortkopf `server: cloudflare`,
  `cf-cache-status: DYNAMIC`. Vor Traefik sitzt also der Cloudflare-Proxy. Neu gegenüber dem Befund vom 14.11.2026.
- Folge wie vom Auftrag gemessen: Kein MCP-Client findet einen Anmeldeweg; Basic-Auth ist kein MCP-Verfahren.

## 2. Server `srv1941843` (IST, Hostinger-API, 16.11.2026 06:30–06:40 UTC)

- VM `1941843`, Ubuntu 24.04, 8 vCPU, 32 GiB RAM, 400 GiB Platte, Zustand `running`.
- Firewall-Gruppe `nexifyai-minimal-20260713` (synchron): eingehend nur TCP 22, 80, 443, 2222 und UDP 443, 51820, 51821.
  Die Hostports 33018/33019 der Cognee-Dienste sind zusätzlich an `127.0.0.1` gebunden (Compose), also von außen
  nicht erreichbar.
- Plattenbelegung **nicht neu gemessen** (dafür wäre ein Mess-Container nötig). Letzter Wert 14.11.2026: 97 %, 9,6 GB frei
  (`docs/04-betrieb/aufraeumplan-2026-11-14.md`, Abschnitt 2). Für jeden neuen Container ist das ein Risiko.

### 2.1 Compose-Projekt `cognee-x532` (hinter `brain.nexifyai.cloud`)

| Dienst | Container | Image | Traefik |
|---|---|---|---|
| `cognee` (eigentlicher Brain-Dienst, FastAPI) | **keiner** | `cognee/cognee:latest` (laut Befund 14.11. nicht mehr auf dem Server) | Router `cognee-x532`: `Host(brain.nexifyai.cloud)`, Weiterleitung `/` → `/docs` |
| `cognee-mcp` | läuft | `cognee/cognee-mcp` Digest `077eab41…`, Compose-Tag `main` (wandernd) | Router `brain-mcp`: `Host(brain…) && PathPrefix(/mcp)`, Middleware **`brain-auth@file`** |
| `cognee-db` | läuft | `postgres:17-alpine` | – |

Wesentliche Konfiguration (nur Namen und unkritische Werte):

- `cognee-mcp` läuft mit `TRANSPORT_MODE=http` und spricht den Cognee-Dienst mit **einem einzigen** `API_TOKEN` an.
  Damit sieht das Backend jeden MCP-Aufrufer als dieselbe Identität. **Eine Mandantentrennung je Mensch findet
  auf diesem Weg heute nicht statt**; die einzige Grenze ist die Passwortwand davor.
- `cognee-mcp` hängt zusätzlich im Netz `librechat_default` (Alias `brain-mcp`), LibreChat erreicht ihn also intern ohne Wand.
- `cognee`: `ENABLE_BACKEND_ACCESS_CONTROL=True`, Datenbank PostgreSQL `cognee-db`, Vektoren LanceDB, Graph Kuzu,
  `LLM_ENDPOINT` = lokaler Router `172.27.0.1:20129`, Modell-Vorgabewert in der Compose-Datei
  `openrouter/deepseek-v4.1-flash`. **Abweichung von `config/llm-policy.json`** (verbindlich
  `deepseek/deepseek-v4.1-flash-1017`, Reasoning `high`): Endung 1017 fehlt, Präfix weicht ab, kein Reasoning gesetzt.
  Ob die `.env` den Wert überschreibt, ist nur dem Namen nach belegt (Variable `LLM_MODEL` gesetzt, Wert nicht gelesen).
  Siehe Abschnitt 3.
- Variablennamen der `.env` (ohne Werte): `TRAEFIK_HOST, ADMIN_EMAIL, ADMIN_PASSWORD, LLM_API_KEY, LLM_MODEL, DB_USER,
  DB_PASSWORD, JWT_SECRET, VERIFICATION_TOKEN_SECRET, RESET_PASSWORD_TOKEN_SECRET, BRAIN_MCP_API_TOKEN,
  EMBEDDING_PROVIDER, EMBEDDING_MODEL, EMBEDDING_ENDPOINT, EMBEDDING_API_KEY, EMBEDDING_DIMENSIONS`.

### 2.2 Compose-Projekt `traefik-juib`

- `traefik:latest` (wandernder Tag), `network_mode: host`, Docker-Provider mit `exposedbydefault=false`,
  Datei-Provider `./dynamic.yml` (beobachtet), Let's-Encrypt per HTTP-Challenge, Dashboard aus, Docker-Socket nur lesend.
- Die Middleware `brain-auth@file` (Basic-Auth) kommt aus dem Datei-Provider, also vermutlich aus `dynamic.yml`
  (aus `@file` abgeleitet, nicht gelesen). Diese Datei ist über die API nicht lesbar → **OFFEN**
  (nur über einen lesenden Mess-Container oder eine Shell erhebbar).

### 2.3 Weitere laufende Projekte (Stand 06:35 UTC, Namen)

`cherry-dashboard, convex-selfhosted, crit-web-deploy, deploy, deploy-staging, docker-hermes, dsh-enterprise, extern,
gitlab, gowa, librechat, monitoring-dus, myadmin-shell, nexify-lokal, stack, traefik-juib, wiki`; ohne Container:
`dify-dqiq, headroom-qsx8`; beendete Mess-Projekte: `nx-aussort-ende-20261115, nx-messung6-20261114, nx-messung7-20261114`.
Für Stufe 6 relevant: `nexify-lokal` enthält einen eigenen `mcp`-Dienst (Image `nx-mcp-check`), `stack` enthält
LightRAG (Port 9621 laut Befund 14.11. an `0.0.0.0`) und `9router`, `monitoring-dus` Prometheus/Alertmanager/Grafana/Blackbox,
außerhalb der Projekte läuft `nexify-openbao` (Geheimnisablage, laut Befund 14.11.).

## 3. Nicht erhoben (OFFEN, mit nächstem Schritt)

| Punkt | Grund | Nächster Schritt |
|---|---|---|
| Inhalt von `dynamic.yml` (`brain-auth`, weitere Datei-Routen) | API liefert nur Compose-Dateien | lesender Mess-Container nach Skill `nexify-server-messung` – ist eine Serveränderung (neues Projekt) und braucht deshalb die Zustimmung des Inhabers |
| Protokolle `cognee-x532` | `GET …/docker/cognee-x532/logs` → `[VPS:9999] Request failed` (06:36 UTC) | später wiederholen; Befund 14.11.: 340× `PoolTimeout`, MCP erreicht `cognee:8000` nicht |
| Plattenbelegung heute | nur per Mess-Container belastbar | wie oben |
| Wer `brain-mcp` heute nutzt (LibreChat, Claude-Konfigurationen auf dem Server) | Fundstellen laut Befund 14.11., nicht neu erhoben | vor der Umschaltung (Stufe 5) je Verbraucher prüfen |
| Tatsächliches Modell von `cognee` (Abweichung von `config/llm-policy.json` im Vorgabewert) | `.env`-Wert nicht gelesen; Dienst läuft nicht | vor Wiederherstellung von Cognee `LLM_MODEL` auf `…-1017` mit Reasoning `high` prüfen (Freigabe D-016) |
| Version und Werkzeugliste von `cognee-mcp` | hinter der Wand, kein Zugang | erst mit Zugang über den neuen Weg |

## 4. Folgen für den Entwurf

1. Hinter der Wand liegt heute **kein funktionierender Brain**: Der MCP-Dienst läuft, sein Backend nicht. Eine Anmeldung
   davor zu bauen, ist sinnvoll, macht aber ohne Wiederherstellung von Cognee (Aufräumplan, Entscheidung 1) noch keine
   brauchbaren Brain-Werkzeuge. Der Anmeldeweg kann und soll unabhängig davon bewiesen werden.
2. Der heutige MCP-Weg erzwingt keine Mandanten. Ein OAuth-Tor, das nur `cognee-mcp` durchreicht, würde diese Lücke
   übernehmen. Der Entwurf muss Menschen und Mandanten bis ins Backend durchbinden.
3. Ein Parallelweg ist ohne DNS-Änderung möglich: ein neuer Traefik-Router mit eigenem Pfad auf demselben Namen
   lässt `brain-mcp` (`/mcp`) und `brain-auth` unberührt. Das Aufstellen eines neuen Containers ist trotzdem eine
   Serveränderung und braucht nach D-016 die Freigabe des Inhabers.
4. Platte und wandernde Image-Tags (`latest`, `main`) sind Betriebsrisiken; neue Bausteine werden auf Digests festgelegt.

## 5. Nachtrag 16.11.2026, 06:53–07:00 UTC: Anmeldeserver hinter `nexifyai.de/mcp` (IST, nur lesend)

Anlass: Hinweis der koordinierenden Sitzung (06:52 UTC). Abrufe aus der Cloud-Sitzung, ohne Token und ohne Schlüssel.

| Abruf | Antwort (gekürzt) |
|---|---|
| `GET https://nexifyai.de/mcp` | 401, `www-authenticate: Bearer realm="mcp", resource_metadata="https://nexifyai.de/.well-known/oauth-protected-resource"` |
| `GET https://nexifyai.de/.well-known/oauth-protected-resource` | 200: `resource=https://nexifyai.de/mcp`, `authorization_servers=["https://nffczuqkhlihimmuzeoz.supabase.co/auth/v1"]`, `bearer_methods_supported=["header"]`, `resource_name="Nexfiy Ai Studio"` |
| `GET …supabase.co/auth/v1/.well-known/oauth-authorization-server` | 200: `registration_endpoint` vorhanden, `code_challenge_methods_supported=["S256","plain"]`, `grant_types_supported=["authorization_code","refresh_token"]`, `token_endpoint_auth_methods_supported=["client_secret_basic","client_secret_post","none"]`, `scopes_supported=["openid","profile","email","phone","offline_access"]`, `id_token_signing_alg_values_supported=["RS256","HS256","ES256"]` |
| `GET …/auth/v1/.well-known/jwks.json` | 200: zwei Schlüssel, beide `EC`/`ES256` |
| `GET …/auth/v1/settings` | 401 „No API key found“ – ob jeder ein Konto anlegen kann, ist **nicht lesbar** (OFFEN) |
| `nexifyai.de` | löst auf `185.158.133.1` auf; Antwortkopf `x-deployment-id: psr2…`, keine Vercel-Kennung |

- Weder `nffczuqkhlihimmuzeoz` noch eine Route `oauth-protected-resource` kommen auf `origin/main` vor (`git grep`).
  Das ist nur eine Beobachtung; woher `nexifyai.de/mcp` ausgeliefert wird, bleibt OFFEN, bis ein Nachweis Auslieferung →
  Commit vorliegt. ANNAHME: ein Lovable-Projekt mit Lovable Cloud
  (Adresse und Merkmale); der Zugang über `mcp.lovable.dev` antwortet für Arbeitsbereiche mit 403
  `authentication_type_forbidden`, eine Bestätigung liegt nicht vor.
- Das widerspricht `AGENTS.md` („nexifyai.de wird von Vercel `…-ut7r` ausgeliefert“, Stand 14.11.2026) → OFFEN, Inhaber.

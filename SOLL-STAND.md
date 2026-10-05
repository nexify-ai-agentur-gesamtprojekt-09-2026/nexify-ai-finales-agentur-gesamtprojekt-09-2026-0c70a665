# DSH Enterprise + Harness — SOLL-Stand und Ist-Nachweis

Stand: 2026-10-05 (UTC). Gilt fuer diesen VPS 179.198.195.91.

## 1. Architektur (Ist, verifiziert)

| Baustein | Rolle | Adresse / Prozess |
|---|---|---|
| BISHENG Enterprise | Modelle, DSH-Freigaben, Seats | Docker-Projekt `dsh-enterprise`, Port 3002 |
| DSH Gateway v1.6.0 | Seat-, Session-, Token-Ausgabe | Docker `dsh-enterprise-gateway-1`, intern 8080 |
| Traefik | Reverse Proxy, TLS/Let's Encrypt | Host-Netz, Ports 80/443 |
| 9Router | OpenAI-kompatibles Modell-Gateway | Docker `9router`, 127.0.0.1:20128 |
| dsh (DeepSeek Harness) | Agent-Runtime + Web-UI | systemd `dsh-harness`, 127.0.0.1:3085 |
| Ollama Cloud | Upstream-Modelle | via 9Router, `ollama-local/*` |

## 2. Zugaenge (SOLL)

| Zweck | URL |
|---|---|
| Enterprise-Backend / Desktop-Login | https://179.198.195.91.nip.io |
| Harness Web-UI | https://179.198.195.91.sslip.io |
| Zielsubdomain (DNS offen) | https://nex2fly.nexifyai.cloud (Route bereit, DNS fehlt) |

Tokens der Harness-Web-UI werden pro Start neu erzeugt und stehen im Journal:
`journalctl -u dsh-harness -n 20 | grep 'token='`

## 3. Angewandte Konfiguration

- Provider `NeXifyAI Router` (Typ openai) auf `http://9router:20128/v1`, Modell `ollama-local/deepseek-v4.1-flash:cloud`, id 1, Verfuegbarkeitstest erfolgreich.
- DSH-Seats: user 1 (NeX2fly) und user 2 (lokal_dsh_vps), je `ASSIGNED`, grant_version 1. Seats entstehen ueber die Modell-Freigabe (`assign_batch`).
- Kontingent: je Nutzer 1.000.000 Token/Monat, `quota_sync_state=READY`.
- Rolle `lokal_dsh_vps`: `System Admin` (role_id 1) fuer die Admin-Endpunkte.
- Harness-Profil `web`: `agent-default-model` = nexifyai-router / deepseek-v4.1-flash; `llm-pi-ai` mit `apiKeyEnv: NINEROUTER_KEY`; Zugangsdaten in `/etc/dsh-harness.env` (600).
- Harness laeuft als Systembenutzer `dsh` (uid 994), Home `/srv/dsh`, Workspace `/srv/dsh/workspace`. Kein root.

## 4. Nachweise

- `dsh headless --patch <web-Patch> "Antworte ... OK"` → Antwort `OK` (Modellkette dsh → 9Router → deepseek-v4.1-flash).
- `https://179.198.195.91.sslip.io/?token=...` → HTTP 303 Token-Tausch, danach HTTP 200 GUI, TLS-Pruefung `ssl_verify_result=0` (Let's Encrypt fuer `179.198.195.91.sslip.io`).
- `gt_dsh_seat`: 2x ASSIGNED. `gt_dsh_session`: 1x ACTIVE (Desktop, Device `BISHENG` 1.0.1).
- `systemctl is-enabled/is-active dsh-harness` → `enabled` / `active`.
- Externe Erreichbarkeit aus einem fremden Netz (Abruf ueber r.jina.ai, 2026-10-05):
  `https://179.198.195.91.nip.io/` → 200 mit echter Login-Seite ("NeX2fly Agentic AI"),
  `https://179.198.195.91.sslip.io/` → 401 "dsh web authentication required".
  Damit ist die Kette Internet → Traefik → Dienst belegt, nicht nur Loopback.

## 5. Offene Punkte

1. Subdomain `nex2fly.nexifyai.cloud`: A-Record `nex2fly` → 179.198.195.91 (DNS only) fehlt. Cloudflare-Zugaenge in Composio antworten mit `Invalid format for Authorization header`; kein Token auf dem Server, Tunnel-Token erlaubt keine DNS-Anlage.
2. Modell-Nachweis im Desktop: `dsh_model_call` = 0. Testnachricht des Nutzers offen.
3. Cookie-Haertung: Harness setzt Session-Cookies ohne `Secure` (Hersteller-Doku: der Proxy soll `Secure` ergaenzen). Traefik kann `Set-Cookie`-Attribute nicht nativ umschreiben. Kompensiert durch HSTS (`max-age=31536000`, `forceSTSHeader`) plus HTTPS-Redirect auf allen dsh-Routern; Restrisiko bleibt die erste Klartext-Anfrage vor HSTS-Wirksamkeit.
4. Plugin `dsh-context` ist im Profil `web` installiert und geladen (siehe Abschnitt 6).
5. GitLab-Push: kein Token auf dem Host, GitLab nach aussen nur IPv6.

## 5.1 Sicherheitsheader (2026-10-05)

Traefik-Middleware `dsh-sec` haengt an den Routern `nex2fly`, `nex2fly-nip` und `dsh-harness`:
`Strict-Transport-Security: max-age=31536000`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`.
Kein `includeSubDomains`, weil die nip.io/sslip.io-Hosts Wildcard-DNS-Dienste sind.
Nachweis: `curl -sk -D - https://179.198.195.91.sslip.io/` zeigt alle vier Header; Port 80 liefert `301 -> https`.

## 7. Integrationen (Ist)

| Integration | Zustand | Nachweis |
|---|---|---|
| Enterprise-Plugin-Markt (BISHENG) | aktiv | `/api/v1/dsh/market/capabilities` → `enabled: true`, Public Key vorhanden |
| Markt-Katalog | leer, bereit | `/api/v1/dsh/market/catalog` → `total: 0` (keine Bundles veroeffentlicht) |
| Signatur-Schluessel | Ed25519, ausserhalb des Repos | `/etc/dsh-enterprise/market.env` (600), per `env_file` im Gateway-Overlay |
| Harness-Plugin-Manager | vorhanden | Pakete `dsh-plugin-manager`, `dsh-client-ui-plugin-manager` |
| MCP-Client (Fremd-Memory) | vorhanden, default aus | `dsh-mcp-client`, `dsh-mcp-resources`; Overlays nur per `--patch` |
| Automatisierung/Erinnerungen | im Webprofil enthalten | `dsh-schedule`, `dsh-client-ui-schedule`, Tools `schedule_*` |
| Vision | ueber Modell abgedeckt | Modell deklariert `input: [text, image]` |
| GitHub-Review-Webhook | verfuegbar, nicht aktiviert | opt-in Overlay des Herstellers |
| `dsh-context` (Plugin) | installiert, geladen | im Profil `web` aktiv; Web-UI liefert `context/client.js`, Login 200 |

## 8. CI

Repository `/root/dsh-enterprise` ist ein lokales Git-Repo (Branch `master`).

| Datei | Zweck |
|---|---|
| `.gitlab-ci.yml` | Stages validate, verify, release |
| `ci/stack-check.sh` | `--static` und `--live`, liefert beide `OK`; prueft zusaetzlich HSTS/nosniff/Referrer-Policy, HTTP-zu-HTTPS-Redirect, die Modellroute der Profilkomposition und die Registrierung von `dsh-context` |
| `ci/check_release.py`, `ci/requirements.json` | Release-Gate des Agentur-Standards (42 Anforderungen, G0–G5) |
| `ci/make-evidence.py` | erzeugt das Nachweisgeruest mit allen 42 IDs |

Belege: `stack-check --static` → OK (inkl. SHA-256-Pin des Hersteller-Skripts), `stack-check --live` → OK (Gateway 200, Enterprise-API 200, Harness 401 = Auth aktiv, Host-Fence 403), Negativtest → Validator lehnt unvollstaendigen Nachweis ab.

Remote ist gesetzt (`http://127.0.0.1:8922/nexifyai_group/nexify-ai-finales-agentur-gesamtprojekt.git`); Push scheitert an fehlender Authentifizierung.

## 9. Skills-Plan

| Arbeitsstrang | Skill | Einsatz |
|---|---|---|
| Deployment/Release-Gates | deployment-procedures | Pre-Deployment-Kategorien, Rollback-Denken |
| Lieferkette, Secrets | security-review | Geheimnis-Hygiene, Fremdcode-Risiko |
| Nachweispflicht | verification-before-completion | jede Aussage nur mit frischem Kommando-Nachweis |
| Container/Compose | docker-expert | Overlay-Pflege, Neustart-Risiko |
| Betrieb/Telemetrie | observability-engineer | Health-, Log- und Alarmfragen |
| Integrationen | mcp-builder, agent-development | MCP-Server und Harness-Plugins |
| Versionierung | commit-work | Commit-Inhalt und Nachricht |

## 6. Plugin-Recherche (Topic `dsh-plugin`, 17.654 Repos, Stand 2026-10-05)

| Plugin | Zweck | Nutzen hier | Lizenz | Bewertung |
|---|---|---|---|---|
| `dsh-context` (bowenliang123) | Kontext-Dashboard, Sidebar, Insight | lange Sessions auf dem Server | Apache-2.0 | empfohlen, optional |
| `dsh-market` (dsh-market) | Plugin-Markt in der UI | Komfort | MIT | optional, erweitert Angriffsflaeche |
| `@oh-dsh/vision` (ysr666) | Vision fuer Textmodelle | redundant: Modell hat `input: [text, image]` | MIT | nicht noetig |
| `cc-safety-net` (kenryu42) | Pre-Execution-Guard gegen destruktive Befehle | Schutz des Agenten-Shells | MIT | pruefen, Integration nicht belegt |
| `dsh-pocket` (shaobeichen) | Handy-Zugriff per QR | redundant: HTTPS-URL vorhanden | GPL-2.0 | nicht noetig |
| `@nanmicoder/dsh-agent-teams` (NanmiCoder) | Agent-Teams | nicht beauftragt | MIT | zurueckgestellt |
| `dsh-plugin-radar` (AdamPlatin123) | Oekosystem-Radar | Recherche-Werkzeug | MIT | nicht noetig |
| `dsh-desktop` (anywhere-labs) | Desktop-Client | Desktop kommt aus dem Enterprise-Paket | MIT | nicht noetig |

Installiert wurde nur `dsh-context` (Apache-2.0, eine Abhaengigkeit `zod`), weil es dem beauftragten Ziel dient (lange Server-Sessions sichtbar/steuerbar) und keinen Marktplatz oder Netzwerkdienst oeffnet. Die uebrigen Kandidaten bleiben aus: `dsh-market` vergroessert die Angriffsflaeche, Vision/Pocket sind redundant, Agent-Teams waren nicht beauftragt. Jedes Plugin laeuft mit den Shell-Rechten desselben Agenten, deshalb bleibt die Liste bewusst kurz.

### 6.1 npm-Pruefung der Kandidaten (2026-10-05)

| Paket | Version | Lizenz | Veroeffentlicht | Abhaengigkeiten |
|---|---|---|---|---|
| dsh-context | 0.64.0 | Apache-2.0 | 2026-10-05 | 1 |
| dshmarket | 1.66.8 | MIT | 2026-10-01 | 2 |
| dsh-pocket | 2.10.6 | GPL-2.0 | 2026-09-10 | 2 |
| @nanmicoder/dsh-agent-teams | 0.1.22 | MIT | 2026-09-29 | 0 |
| @oh-dsh/vision | nicht im npm-Registry | – | – | – |

Die Installation erfolgt je Profil mit `dsh plugin --profile <name> add <paket>`. Ohne Freigabe bleibt sie aus.

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

## 5. Offene Punkte

1. Subdomain `nex2fly.nexifyai.cloud`: A-Record `nex2fly` → 179.198.195.91 (DNS only) fehlt. Cloudflare-Zugaenge in Composio antworten mit `Invalid format for Authorization header`; kein Token auf dem Server, Tunnel-Token erlaubt keine DNS-Anlage.
2. Modell-Nachweis im Desktop: `dsh_model_call` = 0. Testnachricht des Nutzers offen.
3. Cookie-Haertung: Harness setzt Session-Cookies ohne `Secure`. Traefik erzwingt HTTPS-Redirect, aber ein Response-Header-Rewrite fehlt.
4. Plugin-Auswahl: siehe Abschnitt 6, Installation noch nicht erfolgt.

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

Empfehlung: keine Installation ohne Freigabe. Der Nutzen des beauftragten Ziels (Server rechnet, lokal nutzbar) ist bereits ohne Fremdplugin erreicht; jedes Plugin laeuft mit Shell-Rechten desselben Agenten.

# Netz-Exposition veröffentlichter Container-Ports (Befund, Betreiber-Entscheidung)

Stand: 2026-10-05 · Prüfung: `node tools/exposure-check.mjs` · Evidenz: `evidence/exposure.json`

## Befund

- `ufw` ist aktiv mit **`deny (incoming)`**; öffentlich erlaubt sind deklariert nur **22, 80, 443**
  (plus scoped Regeln für interne Netze: 172.16/12, 172.23–27/16, 192.168.0/20, VPN-Peer).
- **Docker umgeht ufw**: veröffentlichte Container-Ports laufen über die Kette `DOCKER-USER`, die
  **vor** den ufw-Regeln ausgewertet wird. Diese Kette ist **leer** → es gibt keine Sperre.
- Damit sind **19 Port-Bindungen** (9 Container) auf `0.0.0.0`/`::` veröffentlicht und aus dem
  Internet erreichbar, sofern der Provider nicht zusätzlich filtert:

| Container | Port | Dienst |
| --- | --- | --- |
| `admin-panel` | 3001 | Admin-Oberfläche |
| `dsh-enterprise-frontend-1` | 3002 | DSH-Enterprise (zusätzlich über Traefik geroutet) |
| `LibreChat` | 3081 | Chat |
| `convex-selfhosted-backend-1` | 4310, 4311 | Convex HTTP-API/Site (Admin-Key-Zugang) |
| `convex-selfhosted-dashboard-1` | 6791 | Convex-Dashboard |
| `cognee-x532-cognee-1` | 33018 | Wissensdienst |
| `lightrag-local` | 9621 | RAG-Dienst |
| `dify-dqiq-web-1` | 32769 | Dify Web |
| `dify-dqiq-api-1` | 32770 | Dify API |

Die **beabsichtigten** öffentlichen Einstiege laufen sämtlich über Traefik (80/443) und erreichen die
Dienste über `127.0.0.1` bzw. das Docker-Netz; die rohen Container-Ports sind dafür nicht nötig.

## Status: Fix B umgesetzt (2026-10-05)

Der Fix wurde angewendet, weil er die **dokumentierte** Policy wiederherstellt (nicht ändert):
`config/host.json` deklariert öffentlich nur 22/80/443; alle übrigen Ports sind auf interne Netze
gescoped (z. B. `9621/tcp: lightrag (192.168.0.0/20)`). Docker umging diese Policy. Belege vor der
Umsetzung: keine externen `established`-Verbindungen auf den Ports, keine externen IPs in den
Dienst-Logs, keine Konfiguration, die die Ports über die öffentliche IP anspricht.

- **Aktiv:** `iptables -I DOCKER-USER -i eth0 -m conntrack --ctstate NEW -j DROP` + `ip6tables` (v4+v6),
  **persistent** über die systemd-Unit `docker-user-hardening.service` (oneshot, idempotent,
  `After=docker.service`, enabled).
  **Wichtig:** nur `--ctstate NEW` — ein pauschales `-i eth0 -j DROP` blockiert auch die *Antwortpakete*
  ausgehender Container-Verbindungen (DNS/Registry) und bricht damit den Container-Outbound.
- **Verifiziert nach der Umsetzung:** öffentliche Traefik-Endpunkte unverändert
  (`vorschau`/`codex`/`sslip` 401 = Auth-Gate, `nip.io` 200), alle Container-Ports über `127.0.0.1`
  weiter erreichbar, `exposure-check` **PASS** (ungeschützt 0), Monitor zum Zeitpunkt der Umsetzung 63 Dienste/0 Ausfälle (aktuell 72, siehe `docs/COMPANY-STATUS.md`).
- **Rollback:** `iptables -D DOCKER-USER -i eth0 -j DROP` (bzw. `systemctl disable --now docker-user-hardening.service`).

## Fix (nach Freigabe)

**A (empfohlen, dauerhaft):** Ports in den jeweiligen Compose-Dateien auf localhost binden, z. B.
`"127.0.0.1:3081:3081"` statt `"3081:3081"`; Container neu erstellen (`docker compose up -d`).

**B (schnell, reversibel, aber nicht reboot-fest):**
```bash
iptables -I DOCKER-USER -i eth0 -j DROP          # sperrt Internet -> Container
# Rollback:  iptables -D DOCKER-USER -i eth0 -j DROP
```
Traefik (Host-Netz) und Host-Dienste bleiben über `127.0.0.1` erreichbar; Container-zu-Container
läuft über Bridge-Interfaces und ist nicht betroffen. Für Persistenz `iptables-persistent` bzw. eine
systemd-Unit ergänzen — ohne das ist die Sperre nach einem Reboot weg.

## Nachweis nach Umsetzung

`node tools/exposure-check.mjs` muss **bestanden** (Exit 0) und `docs/COMPANY-STATUS.md` „ohne
DOCKER-USER-Sperre: 0" ausweisen.

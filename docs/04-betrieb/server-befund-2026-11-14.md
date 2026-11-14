# Server-Befund und Arbeitsliste · 14.11.2026

Quelle: Hostinger-API, nur lesend, 14.11.2026 ca. 11:45 UTC. Ohne Shell erhoben; was nur mit Shell prüfbar ist, steht unter **OFFEN**.
Es gilt D-016 (`DECISIONS.md`): Eingriffe mit Rückweg, `vsk-mongodb`, Traefik und laufende Kundenseiten nie destruktiv.

## Bestand (IST)

| | srv1243952 | srv1941843 |
|---|---|---|
| Adresse | 72.62.152.47 | 179.198.195.91 |
| System | Ubuntu 26.04, KVM 8 (8 Kerne, 32 GB, 400 GiB) | Ubuntu 24.04, KVM 8 |
| Platte belegt | 360–368 GB laut Hostinger-Metrik, rund 86 % | gemessen 372,2 von 386,4 GB, 97 %, 10,2 GB frei |
| Arbeitsspeicher belegt | 20,7–22,8 GB | 12,3–23,0 GB |
| Backups (Hostinger) | 4, neuestes 13.11. 16:45 UTC | 4, neuestes 13.11. 16:49 UTC |
| Snapshot | 14.11. 11:47 UTC, **läuft am 15.11. 11:47 UTC ab** | ebenso |
| Container | über die API nicht lesbar (Docker Manager unterstützt das System nicht) | 20 Compose-Projekte |

Firewall-Gruppe `nexifyai-minimal-20260713` (beide Server, synchron): TCP 22, 80, 443, 2222; UDP 443, 51820, 51821; Quelle jeweils beliebig.

Compose-Projekte auf srv1941843: `cherry-dashboard`, `cognee-x532`, `convex-selfhosted`, `crit-web-deploy`, `deploy`, `deploy-staging`, `docker-hermes`, `dsh-enterprise` (10 Container), `extern` (SearXNG), `gitlab` (+ Runner), `gowa`, `librechat`, `monitoring-dus`, `myadmin-shell`, `nexify-lokal` (6), `stack` (`9router`, LightRAG), `traefik-juib`, `wiki`; ohne Container: `dify-dqiq`, `headroom-qsx8`.

## Befunde

| # | Befund | Beleg | Dringlichkeit |
|---|---|---|---|
| S1 | Platte srv1941843 zu rund 94 % voll, Schwankung 18 GB in 24 h | Metrik `disk_space` | hoch |
| S2 | Platte srv1243952 zu rund 86 % voll | Metrik `disk_space` | mittel |
| S3 | Hermes läuft (`docker-hermes`, Web-Oberfläche Port 8788), aber MCP-Server `rea` startet nicht: `libatomic.so.1` fehlt im Image | Containerprotokoll 05.11. | hoch für D-014 |
| S4 | Hermes: kein Nachrichtenkanal aktiv; `session.create` wegen ungültigem `cwd` abgelehnt; wiederholt Speicherdruck „elevated“, einmal „critical“ | Containerprotokoll 05.–06.11. | mittel |
| S5 | Images auf `:latest`: Traefik, 9router, Convex (2), crit-web, SearXNG, gowa, LibreChat (2), LightRAG | Containerliste | mittel |
| S6 | 15 SSH-Schlüssel im Hostinger-Konto, darunter `ignore-this`, `temp-check`, mehrere „ephemeral“/„incident“ | `public-keys` | mittel |
| S7 | Zwei Projekte ohne Container: `dify-dqiq` (403 Zeilen, Stack für agenten.nexifyai.cloud mit dokumentierten Korrekturen), `headroom-qsx8` (14 Zeilen) | Projektliste | niedrig |
| S8 | SSH (22 und 2222) für jede Quelle offen | Firewall | niedrig |

## Arbeitsliste für eine Sitzung mit Shell (Reihenfolge einhalten)

Vor jedem Schritt Ausgabe sichern, nach jedem Schritt Zustand zurücklesen. Nichts mit `-f` oder `--volumes` ohne Freigabe des Inhabers.

1. **Messen, nichts ändern** (beide Server): `df -h`, `docker system df -v`, `du -xh --max-depth=2 /var/lib/docker /opt /root /var/log | sort -h | tail -40`, `journalctl --disk-usage`, `docker ps -a --size`. Ergebnis hier unter „Messung“ nachtragen.
2. **Gefahrlos freigeben:** `docker builder prune` (Build-Cache), `journalctl --vacuum-time=14d`, hängende Images (`docker image prune`, ohne `-a`). Rückweg: nicht nötig, es sind abgeleitete Daten.
3. **Containerprotokolle begrenzen:** `max-size`/`max-file` in `/etc/docker/daemon.json`; vorher Datei sichern. Wirkt erst nach Neustart des Docker-Dienstes: Zeitfenster mit dem Inhaber abstimmen.
4. **Hermes S3:** `libatomic1` in das Image aufnehmen (Dockerfile des Projekts `docker-hermes`), neu bauen, Protokoll auf „MCP server 'rea'“ prüfen. Rückweg: altes Image vorher taggen.
5. **Hermes Konfiguration:** Dateien aus dem Zweig `claude/hermes-orchestrator` nach Sicherung von `/root/.hermes` einspielen; Modell nach `config/llm-policy.json`.
6. **S5:** je Dienst die laufende Image-Kennung (`docker inspect --format '{{.Image}}'`) als festen Digest in die Compose-Datei schreiben. Kein Update dabei.
7. **Entscheidung des Inhabers nötig:** S6 (welche Schlüssel entfallen), S7 (`dify-dqiq` behalten oder entfernen), S8 (SSH auf feste Quellen oder WireGuard beschränken), ungenutzte Volumes und Images mit `-a` (**gesperrt, siehe Sperrvermerk bei Schritt 2c unter „Folgen für die Arbeitsliste“: darunter liegen die Cognee-Daten**).

## OFFEN

- Was die Platte auf srv1243952 füllt (S2). Für srv1941843 siehe „Messung“.
- Bestand und Zustand der Dienste auf srv1243952.
- Welches Modell und welche Route Hermes derzeit nutzt.
- Ob die Schlüssel aus S6 in `authorized_keys` der Server stehen; die Hostinger-Liste sagt das nicht.

## Messung

Erhoben am 14.11.2026, 12:00–12:50 UTC, auf srv1941843 mit einmaligen, nur lesenden Mess-Containern (Hostinger-API, Wurzel als `ro` eingehängt). srv1243952 ist so nicht messbar (Docker Manager dort nicht verfügbar).

**Platte:** 386,4 GB gesamt, 372,2 GB belegt, **10,2 GB frei (97 %)**.

| Ort | Größe | Einordnung |
|---|---|---|
| `/home/mypad/workspace/.paperclip-runtime/runs` | 77,3 GiB | Lauf-Verzeichnisse der Paperclip-Laufzeit; Paperclip ist mit D-019 abgelöst. Größter Einzelposten. |
| `/var/lib/containerd` | 63,7 GiB | Images und Schichten der laufenden Container (Docker meldet 54,8 GB Images, davon 2,6 GB ungenutzt) |
| `/opt/gitlab/data/prometheus` | 20,6 GiB | Messdaten des in GitLab eingebauten Prometheus; über Aufbewahrungsdauer begrenzbar |
| `/opt/ai-stack/stack/lightrag-pg-data` + `lightrag-data` | 19,8 GiB | Nutzdaten LightRAG |
| `/opt/backups` | 14,6 GiB | davon `lightrag-db` 7,1 und `lightrag` 3,8 GiB |
| `/usr` | 14,4 GiB | System |
| `/opt/nexifyai` | 14,5 GiB | davon `backup` 7,1 GiB |
| `/var/lib/docker/volumes` | 9,8 GiB | 33 Volumes, 11 ungenutzt (4,0 GB) |
| `/opt/aionui-data`, `/opt/nex2fly/ops`, `/home/mypad/.local` | je rund 8,7 GiB | |
| `/opt/gitlab/data/backups` | 4,2 GiB | |
| `/tmp` | 4,0 GiB | |
| Container-Protokolle | < 0,1 GiB | kein Problem |

**Port 8788 (Hermes-Oberfläche):** `/docker/traefik-juib/dynamic.yml` leitet `unternehmensbot.eu` auf `127.0.0.1:8788` (Router `hermes-webui`) und `/api`, `/session` auf `127.0.0.1:44727` (Router `hermes-api`), ohne Traefik-Zugangsschutz in diesen Routen. Von außen geprüft: `/` und `/session` antworten mit 302 auf `login`, `/api/sessions` und `/api/status` mit 401. Die Oberfläche ist also öffentlich erreichbar und nur durch die Anmeldung von Hermes selbst geschützt. Das widerspricht D-019 Folge 4 (nicht öffentlich).

### Folgen für die Arbeitsliste

- **Schritt 2a (neu, größte Wirkung):** `.paperclip-runtime/runs` sichten und nach Freigabe des Inhabers entfernen oder auf die jüngsten Läufe kürzen. Vorher prüfen, dass kein Paperclip-Prozess mehr läuft. Erwartete Entlastung bis rund 77 GiB.
- **Schritt 2b (neu):** GitLab-Prometheus begrenzen (`prometheus['flags']` mit `storage.tsdb.retention.time` in `gitlab.rb`, dann `gitlab-ctl reconfigure`) oder abschalten, da `monitoring-dus` bereits ein eigenes Prometheus betreibt. Erwartete Entlastung rund 15–20 GiB.
- **Schritt 2c:** ungenutzte Images und die 11 ungenutzten Volumes erst nach Sichtung der Volume-Namen (rund 6,6 GB).
  **GESPERRT (Nachtrag 14.11.2026, Messung 18:10–18:45 UTC): kein `docker volume prune`, kein `docker system prune --volumes`, kein `docker image prune -a`.**
  Zwei der 11 „ungenutzten“ Volumes sind `cognee-x532_cognee-data` und `cognee-x532_cognee-system`: der gesamte Cognee-Wissensbestand (2,69 GB).
  Docker führt sie nur deshalb als ungenutzt, weil der Cognee-Container fehlt. Ein Prune würde sie unwiederbringlich löschen; ein drittes ist `librechat_librechat-data`.
  Gefahrlos sind allein die acht GitLab-Runner-Zwischenspeicher (1,3 GB), und auch diese nur einzeln beim Namen und nach Freigabe des Inhabers (D-016).
  Die Sperre gilt, bis die Cognee-Volumes gesichert und wieder verknüpft sind. Einzelheiten und Reihenfolge: `docs/04-betrieb/aufraeumplan-2026-11-14.md` (Sperrvermerk, Abschnitt 3.1, Phase 0 und 3).
- **Schritt 2d:** alte Sicherungen unter `/opt/backups` und `/opt/nexifyai/backup` auslagern statt löschen.
- **Hermes-Route:** in `dynamic.yml` eine `ipAllowList`- oder `basicAuth`-Middleware vor `hermes-webui` und `hermes-api` setzen oder die Router entfernen und über SSH-Tunnel zugreifen. Vorher Datei sichern; Traefik liest sie ohne Neustart neu.

### Hinterlassen von der Messung

Fünf beendete Compose-Projekte ohne laufende Container auf srv1941843: `nx-messung-20261114`, `nx-messung2-20261114`, `nx-messung3-20261114`, `nx-messung4-20261114`, `nx-messung5-20261114` (Image `docker:27-cli`). Sie können entfernt werden; das Entfernen über die API wurde in der Cloud-Sitzung nicht ausgeführt.

**Nachtrag 14.11.2026, nach 18:45 UTC:** Es stehen jetzt **zehn** beendete Mess-Projekte, nicht fünf: `nx-messung-20261114`, `nx-messung2-20261114` bis `nx-messung8-20261114` (acht, Stand `PROGRESS.md` ca. 14:25 UTC) sowie `nx-messung-cognee-20261114` und `nx-messung-cognee2-20261114` aus der Messung der Gedächtnis-Systeme. Alle ohne laufende Container; entfernt werden nur die Projekt-Einträge, einzeln und nach Freigabe (Aufräumplan, Schritt 1.4).

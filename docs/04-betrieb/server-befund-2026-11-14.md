# Server-Befund und Arbeitsliste · 14.11.2026

Quelle: Hostinger-API, nur lesend, 14.11.2026 ca. 11:45 UTC. Ohne Shell erhoben; was nur mit Shell prüfbar ist, steht unter **OFFEN**.
Es gilt D-016 (`DECISIONS.md`): Eingriffe mit Rückweg, `vsk-mongodb`, Traefik und laufende Kundenseiten nie destruktiv.

## Bestand (IST)

| | srv1243952 | srv1941843 |
|---|---|---|
| Adresse | 72.62.152.47 | 179.198.195.91 |
| System | Ubuntu 26.04, KVM 8 (8 Kerne, 32 GB, 400 GiB) | Ubuntu 24.04, KVM 8 |
| Platte belegt (24 h) | 360–368 GB, rund 86 % | 386–404 GB, rund 94 % |
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
7. **Entscheidung des Inhabers nötig:** S6 (welche Schlüssel entfallen), S7 (`dify-dqiq` behalten oder entfernen), S8 (SSH auf feste Quellen oder WireGuard beschränken), ungenutzte Volumes und Images mit `-a`.

## OFFEN

- Was die Platte füllt (S1, S2): nur mit Shell messbar.
- Bestand und Zustand der Dienste auf srv1243952.
- Welches Modell und welche Route Hermes derzeit nutzt.
- Ob die Schlüssel aus S6 in `authorized_keys` der Server stehen; die Hostinger-Liste sagt das nicht.

## Messung

_(von der Sitzung mit Shell nachzutragen)_

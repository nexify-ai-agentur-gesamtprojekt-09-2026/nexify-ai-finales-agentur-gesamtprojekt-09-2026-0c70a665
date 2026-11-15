# Speicher-Bereinigung · Messung, ausgeführte Schritte, Entscheidungen · 15.11.2026

Auftrag: Inhaber über die orchestrierende Sitzung, 15.11.2026 („Alle Speicherprobleme lösen").
Grundlage: `server-befund-2026-11-14.md` (Arbeitsliste), `aufraeumplan-2026-11-14.md` (Sperrvermerk, Phasen), D-016, D-017.
Dieses Dokument ändert keines der genannten Dokumente; es setzt deren Plan um, soweit freigegeben, und legt den Rest entscheidungsreif vor.

**Ehrliches Ergebnis vorab:** Die als gefahrlos freigegebenen Schritte sind ausgeführt und haben **0 B** gebracht.
Das Speicherproblem ist damit **nicht gelöst**. Es löst sich nur durch Entscheidungen des Inhabers (Abschnitt 5), allen voran
die Paperclip-Läufe (77 GiB) und die Sicherungen, die jede Nacht auf die eigene Platte geschrieben werden.

## Messwege

| Kürzel | Messweg |
|---|---|
| M | Hostinger-API, Metrik `disk_space` (`GET /virtual-machines/<id>/metrics`), Werte in GiB umgerechnet (Bytes / 2^30) |
| D | `df`, `du`, `find`, `stat` in einmaligen Mess-Containern auf srv1941843 (Image `docker:27-cli`, Wurzel `:ro`), nach Skill `nexify-server-messung` |
| K | Docker-Client im Mess-Container über den Docker-Socket (`docker system df`, `docker ps`) |
| A | Hostinger-API, Container-Liste, Backups, Snapshot (nur `GET`) |
| W | je ein `GET` auf `/` von zehn öffentlichen Adressen über den Sitzungs-Proxy, nur Statuscode |

Einheiten: GiB = 2^30 Byte. Die Platte von srv1941843 hat laut `df` 386,4 GiB (414.921.494.528 B). Für srv1243952 (gleicher Tarif KVM 8)
ist dieselbe Größe eine **Annahme**; gemessen werden konnte dort nur die Metrik.
Frühere Dokumente nennen dieselben Metrikwerte in GB (10^9); deshalb weichen deren Zahlen um rund 7 % ab.

## 1. Kurzfassung

| Server | vorher | nachher | Messweg, Zeit (UTC) |
|---|---|---|---|
| srv1941843 | 380,8 GiB belegt, **1,64 GiB frei, 100 %** | 380,5 GiB belegt, **1,98 GiB frei, 99 %** | D, 10:08:59 und 10:54:26 |
| srv1243952 | 358,5 GiB belegt, rund 93 % (Annahme Plattengröße) | **367,2 GiB belegt, rund 95 %**, weiter steigend | M, 09:20 und 10:46 |

Die Veränderung auf srv1941843 (+0,3 GiB frei) stammt nicht aus den ausgeführten Schritten, sondern aus dem laufenden Betrieb.
srv1243952 ist heute zwischen 04:19 und 10:46 UTC von 332,0 auf 367,2 GiB gestiegen (+35 GiB in 6,5 h); was dort schreibt, ist nicht einsehbar.

**Sicherungen als Rückweg (A, 11:04 UTC):** Der Snapshot beider Server vom 14.11. 11:47 UTC läuft am 15.11. 11:47 UTC ab.
Danach bleiben die automatischen Hostinger-Sicherungen: srv1941843 vom 14.11. 16:14 UTC (rund 18 h alt bei Ausführung), davor 13.11., 12.11., 06.11.;
srv1243952 vom 14.11. 18:41 UTC, davor 13.11., 09.11., 02.11. Ein neuer Snapshot wurde **nicht** angelegt (Kostenfrage ungeklärt; er hätte keinen der Schritte abgesichert, die hier ausgeführt wurden).

## 2. Ausgeführte Schritte (srv1941843)

Ausführung über je ein einmaliges Hilfsprojekt nach dem Messmuster (Image `docker:27-cli`, Wurzel `:ro`, Docker-Socket). Ein Schritt je Projekt, vorher und nachher gemessen.
Die Rückfrage der Befehle wurde mit `echo y |` beantwortet (kein Terminal im Container); das entspricht in der Wirkung `-f` und war für genau diese zwei Befehle freigegeben.

| UTC | Befehl | freigegeben | Rücklesen |
|---|---|---|---|
| 10:26:51–10:26:56 | `docker builder prune` | **0 B** („Total: 0B") | frei vorher 1.695.838.208 B, nachher 1.695.408.128 B; 51 Container unverändert „Up"/„healthy" (K) |
| 10:27:29–10:27:32 | `docker image prune` (ohne `-a`) | **0 B** („Total reclaimed space: 0B") | frei vorher 1.693.282.304 B, nachher 1.693.249.536 B; Containerliste zeilengleich zu 10:26; zehn Adressen wie um 10:22 (W, 10:27:54) |

Warum 0 B: Der Build-Cache (33 Einträge, 1,0 GB) ist vollständig mit vorhandenen Images geteilt und nicht „hängend". Das eine Image ohne Tag (`ccc6e83d6e35`, 621 MB) wird von einem Container benutzt.

Abschluss-Rücklesen 11:04 UTC: Containerzustand aller 51 Dienst-Container identisch zur Aufnahme von 10:08 UTC (A); Adressen unverändert (W):
`nexifyai.de` 200, `teileklar.shop` 200, `unternehmensbot.eu` 302, `gitlab.nexifyai.cloud` 302, `brain.nexifyai.cloud/mcp` 401, `www.nexifyai.cloud` 200,
`ai-router` 307, `wissen` 307, `cockpit` 302; `wiki.nexifyai.cloud` schon vorher ohne Antwort.

### Nicht ausgeführt, obwohl im Auftrag genannt

| Schritt | Grund |
|---|---|
| `journalctl --vacuum-time=14d` | Bringt nichts: Journal 532 MiB, davon **eine Datei (8 MiB) älter als 14 Tage** (D, 10:32). Außerdem bräuchte es die Host-Wurzel schreibend im Container; der dokumentierte Weg erlaubt nur `:ro`. |
| Container-Logs abschneiden | Nicht freigegeben im Erstauftrag; alle Container-Logs zusammen **160 MiB** (D, 10:08). Kein Hebel. |
| Paperclip-Läufe archivieren und Original entfernen; Cognee-Volumes sichern | Kam als Nachricht einer anderen Sitzung, nicht vom Inhaber in dieser Sitzung. Entfernen ist Löschen (D-016, D-017). Technisch nicht möglich: 1,6–2,1 GiB frei, die Regel „nie unter 5 GB" ist schon vorher verletzt; das kleinste echte Laufverzeichnis hat 0,29 GiB, die übrigen 1–2,5 GiB. Schreiben auf den Host bräuchte einen neuen, nicht dokumentierten Zugang. Vorbereitet in 5.1. |

### Hinterlassen

Sechs beendete Compose-Projekte auf srv1941843, keines läuft: `nx-speicher-m1-20261115` bis `nx-speicher-m4-20261115` (Messung), `nx-speicher-a1-20261115`, `nx-speicher-a2-20261115` (Ausführung).
Kein Image gezogen (`docker:27-cli` lag vor). Schreibschicht je Container unter 1 MB. Zusammen mit den zehn Projekten vom 14.11. stehen 16 beendete Mess-Projekte; entfernt werden nur die Einträge (Aufräumplan 1.4).

## 3. Rangliste der Verbraucher (srv1941843, D, 10:09–10:58 UTC)

Summe oberste Ebene: `/opt` 119,4 · `/home` 88,3 · `/var` 87,4 · `/root` 40,3 · Auslagerungsdateien 24,0 · `/usr` 14,4 · `/tmp` 4,0 GiB.

| # | Ort | GiB | Einordnung | Wachstum |
|---|---|---|---|---|
| 1 | `/home/mypad/workspace/.paperclip-runtime/runs` | 77,3 | 37 Einträge, davon 33 Läufe mit 0,3–2,5 GiB; Ordner zuletzt geändert 04.11. 21:20; Paperclip mit D-019 abgelöst | keines |
| 2 | `/var/lib/containerd` | 71,8 | Images und Schichten; Docker: 65 Images, 63,5 GB, davon 11,3 GB von keinem Container benutzt | +1,6 GB am 15.11. 09:37–09:39 (neue Schichten) |
| 3 | `/opt/gitlab` | 29,5 | davon Prometheus 20,6 (14.11.), Sicherungen 4,2 | WAL 134 MB je 2 h; Sicherung 1,4 GiB je Nacht, drei aufbewahrt |
| 4 | `/opt/ai-stack` | 27,2 | davon LightRAG-Daten 19,8 (14.11.) | – |
| 5 | **Auslagerungsdateien** `/swapfile`, `2`, `3`, `4` | **24,0** | 4 + 4 + 8 + 8 GiB, angelegt 08.09., 05.10., 07.10., 10.10.; zu 94 % benutzt (23,6 von 24 GiB), obwohl 16,4 GiB Arbeitsspeicher verfügbar sind | fest |
| 6 | `/opt/backups` | 14,6 | LightRAG-DB-Dumps 7,1, LightRAG-Archiv 3,8, Quarantäne 1,1 | bis 11 GiB je Nacht |
| 7 | `/opt/nexifyai` | 14,5 | davon `backup/nexify` 7,1: sieben Tagesarchive je 1,0 GiB (02:30 UTC) | 1,0 GiB je Nacht, rollierend |
| 8 | `/usr` | 14,4 | System | – |
| 9 | `/opt/nex2fly` | 12,0 | darin `ops/backups/db`: tägliche Kopie der AionUI-Datenbank, 1,3 GiB (03:02 UTC) | 1,3 GiB je Nacht |
| 10 | `/var/lib/docker` | 10,1 | 35 Volumes, 13 unverknüpft (3,8 GB; **darunter Cognee – gesperrt**) | – |
| 11 | `/home/mypad/.local`, `/opt/aionui-data` | 8,8 / 8,7 | AionUI-Datenbank 1,36 GiB, wächst | laufend |
| 12 | `/root` (versteckte Ordner) | rund 22 | `.claude` 4,7 · `.codex` 3,3 · `.hermes` 3,2 · `.local` 2,6 · `.npm` 2,3 · `.git-ai` 2,1 · `.claude-mem` 1,6 · `.cache` 1,5 | Datenbanken der Werkzeuge wachsen (z. B. `.git-ai/internal/metrics-db` 2,0 GiB) |
| 13 | `/root` (Arbeitsordner) | rund 16 | über 20 Klone und Arbeitsstände (`nexify-final-canonical` 2,0, `work` 2,0, `backups` 2,0, `reference` 1,9, `ainex-studio` 1,4 …) | – |
| 14 | Schreibschichten der Container | 11,9 | `aionui` 7,42 GB, `nexify-lokal-worker-1` 3,73 GB, `deploy-scanner-1` 0,83 GB | Worker in Neustartschleife (Aufräumplan) |
| 15 | `/tmp` | 4,0 | davon `trivy` 3,1 (Scanner-Datenbanken, täglich neu geladen) | wird täglich überschrieben |
| – | Journal / Container-Logs / `/var/log` gesamt | 0,5 / 0,16 / 1,4 | kein Hebel | – |

### Woher die Schwankung kommt (belegt über Dateizeiten, D, und Tagesverlauf, M)

Jede Nacht zwischen 02:30 und 04:10 UTC schreiben fünf Sicherungsläufe **auf dieselbe Platte**:

| UTC | Lauf | Größe | Aufbewahrung |
|---|---|---|---|
| 02:30 | `/opt/nexifyai/backup/nexify/nexify-<datum>.tar.gz` | 1,0 GiB | sieben Tage |
| 03:02 | `/opt/nex2fly/ops/backups/db/aionui-backend-<datum>.db` | 1,3 GiB | mindestens zwei |
| 03:16 | `/opt/backups/lightrag/lightrag-<datum>.tar.gz` | 3,8 GiB | eine |
| 03:17 | `/opt/gitlab/data/backups/…_gitlab_backup.tar` | 1,4 GiB | drei |
| 03:45 | `/opt/backups/lightrag-db/lightrag-db-<datum>.dump` | 6,5 GiB | zwei |

Das sind rund **14 GiB Schreiblast je Nacht**, bevor die alten Stände entfernt werden; dazu der Umbau der LightRAG-Datenbank (acht Dateien je 1 GiB am 14.11. 03:53–04:07 neu geschrieben).
Der Tagesverlauf der Metrik zeigt das Muster seit dem 08.11.: Höchststand jeweils 04:17–04:48 UTC, an vier von acht Tagen **400,0 GiB = Anschlag**
(08., 09., 10., 12.11.), Tiefststand danach 365–378 GiB. Das ist die „Schwankung von 18 GB".
**Am 15.11. fehlen die beiden LightRAG-Sicherungen** (jüngste Dateien vom 14.11.): Der Lauf hatte keinen Platz mehr. Die nächste Nacht läuft wieder gegen den Anschlag; `lightrag-db` ist am 14.11. deshalb in eine Absturzschleife geraten (Aufräumplan 3.3).

## 4. srv1243952

Die API liefert für diesen Server weiterhin `[VPS:2044]` (Docker Manager nicht verfügbar; A, 10:08 UTC). Es gibt **keinen dokumentierten Weg**, dort zu messen oder auszuführen. Es wurde nichts improvisiert und kein Zugang geschaffen.

**Von außen messbar (M):**

| Tag | Tiefst | Höchst |
|---|---|---|
| 08.11. | 350,3 | 353,1 |
| 09.11. | 320,2 (16:50) | 374,9 (10:17) |
| 10.11. | 322,4 | 342,6 |
| 11.11. | 341,1 | 343,8 |
| 12.11. | 340,1 | 364,2 (23:45) |
| 13.11. | 334,1 (04:49) | 359,1 (01:19) |
| 14.11. | 336,2 (21:49) | 342,1 |
| 15.11. | 332,0 (04:19) | **367,2 (10:46), steigend** |

Sprünge von 25–55 GiB innerhalb von Stunden an vier von acht Tagen: Dort entsteht regelmäßig etwas Großes und wird wieder entfernt (Sicherung, Bau, Abbild-Wechsel – nicht belegt).
Arbeitsspeicher 17,2–24,0 GiB von 32. `teileklar.shop` 200 und `unternehmensbot.eu` 302 um 11:04 UTC (W).

### Ablaufblatt für eine Sitzung mit Shell (oder den Inhaber)

Reihenfolge einhalten; nach jedem Block Zahlen notieren. Block A und B ändern nichts.

```sh
# A · Ausgangslage sichern (nur lesen)
mkdir -p /root/speicher-20261115 && cd /root/speicher-20261115
date -u +%FT%TZ | tee 00-zeit.txt
df -h / | tee 01-df.txt; df -i / | tee -a 01-df.txt
docker ps -a --format '{{.Names}}|{{.Status}}|{{.Image}}' | sort | tee 02-ps.txt
docker system df | tee 03-system-df.txt
docker volume ls -f dangling=true --format '{{.Name}}' | tee 04-volumes-unverknuepft.txt
docker image ls -f dangling=true | tee 05-images-ohne-tag.txt
journalctl --disk-usage | tee 06-journal.txt
swapon --show | tee 07-swap.txt
for u in https://teileklar.shop/ https://unternehmensbot.eu/; do curl -s -o /dev/null -m 20 -w "%{http_code} $u\n" "$u"; done | tee 08-seiten.txt

# B · Verbraucher finden (nur lesen; dauert Minuten)
du -xs /* /home/*/.[a-zA-Z0-9]* /root/.[a-zA-Z0-9]* 2>/dev/null | sort -n | tail -25 | tee 10-du-oben.txt
du -xs /var/lib/* /var/lib/docker/* /opt/* /root/* /home/*/* /tmp/* 2>/dev/null | sort -n | tail -40 | tee 11-du-zweite.txt
find / -xdev -type f -size +500M -mmin -2880 -printf '%s|%TY-%Tm-%Td %TH:%TM|%p\n' 2>/dev/null | sort -n | tail -40 | tee 12-neu-48h.txt
du -xc /var/lib/docker/containers/*/*-json.log 2>/dev/null | sort -n | tail -8 | tee 13-container-logs.txt

# C · gefahrlos, abgeleitete Daten (im Erstauftrag freigegeben) – je Zeile danach: df -h / und docker ps vergleichen
docker builder prune                      # Rückfrage mit y beantworten; kein -a
docker image prune                        # ohne -a; nur Images ohne Tag, die kein Container benutzt
journalctl --vacuum-time=14d
diff <(docker ps -a --format '{{.Names}}|{{.Status}}|{{.Image}}' | sort | sed 's/Up [^|(]*/Up /') <(sed 's/Up [^|(]*/Up /' 02-ps.txt) && echo CONTAINER-GLEICH
df -h / | tee 20-df-nachher.txt

# D · NICHT ausführen ohne Wort des Inhabers je Schritt:
#   docker volume prune · docker system prune (--volumes) · docker image prune -a · rm auf Daten, Uploads, Datenbanken, Sicherungen
#   Finger weg von: vsk-mongodb, Traefik und seiner Konfiguration, Shop-Dienst, Kundenseiten
```

Geprüft wurde das Blatt auf Syntax (`sh -n`) und daran, dass Block A/B dieselben Befehle nutzt, die auf srv1941843 gelaufen sind (dort in der Busybox-Fassung).
**Nicht** geprüft: Lauf auf srv1243952 selbst. Erwartung nach dem Ergebnis auf srv1941843: Block C bringt wenig; entscheidend ist, was Block B zeigt.

## 5. Entscheidungen des Inhabers (srv1941843), nach Wirkung sortiert

Alle Befehle für eine Sitzung mit Shell. Nichts davon wurde ausgeführt.

| # | Was | bringt | Risiko | Rückweg | Befehl / Vorgehen |
|---|---|---|---|---|---|
| 5.1 | **Paperclip-Läufe** archivieren und entfernen | **bis 77 GiB** | mittel: nur 2 GiB frei, deshalb darf kein Archiv auf dieselbe Platte | Archiv zurückspielen | Voraussetzung: Schreibzugang zum Archivziel (R2 `nexify-agentur-pucket`, eigener Schlüssel) **oder** Zweitplatte. Je Lauf: `tar -C /home/mypad/workspace/.paperclip-runtime/runs -cf - <lauf> \| zstd -T4 \| tee >(sha256sum > <lauf>.sha256) \| rclone rcat r2:nexify-agentur-pucket/paperclip-runs/<lauf>.tar.zst`; Rückhol-Probe des ersten Archivs; erst dann `rm -rf` des einen Laufs. Enthalten die Läufe Kundendaten, vorher verschlüsseln (Aufräumplan 7.1). |
| 5.2 | **Auslagerungsdateien** von vier auf eine verkleinern | **16 GiB** (auf 8 GiB) | mittel: 23,6 GiB liegen ausgelagert; `swapoff` holt sie in den Arbeitsspeicher zurück – bei 16 GiB verfügbar nur schrittweise und nach Stoppen eines Speicherfressers möglich, sonst greift der OOM-Killer | `fallocate -l 8G /swapfile4 && chmod 600 /swapfile4 && mkswap /swapfile4 && swapon /swapfile4` | zuerst `swapoff /swapfile` (4 GiB), `free -g` prüfen, dann `/swapfile2`; nur wenn `MemAvailable` danach über 6 GiB bleibt: `/swapfile4`. Danach die Datei entfernen und die Zeile in der Dateisystemtabelle auskommentieren. Zeitfenster abstimmen. |
| 5.3 | **GitLab-Prometheus** auf 15 Tage begrenzen | 15–20 GiB | gering; kurzer GitLab-Neustart; **GitLab-Daten selbst bleiben unberührt** | `gitlab.rb` zurück, `gitlab-ctl reconfigure` | in `gitlab.rb`: `prometheus['flags'] = { 'storage.tsdb.retention.time' => '15d' }`, dann `docker exec gitlab gitlab-ctl reconfigure` (Aufräumplan 1.2) |
| 5.4 | **Sicherungen auslagern** und Läufe auf das Archivziel umstellen | 20–28 GiB einmalig; **beendet die nächtliche Spitze von 14 GiB** | gering | zurückkopieren | wie 5.1 für `/opt/backups`, `/opt/nexifyai/backup`, `/opt/nex2fly/ops/backups`, `/opt/gitlab/data/backups`, `/root/backups`, `/var/backups/agentmemory`; Auslöser der fünf Läufe finden (`systemctl list-timers`, `crontab -l`, `/opt/ai-stack/.claude/scheduled_tasks.json`) |
| 5.5 | **AionUI** stilllegen (Frage: wird es gebraucht?) | rund 25 GiB | mittel, falls genutzt | Container und Daten bleiben bis zur Löschfreigabe | `docker stop aionui`; 14 Tage beobachten; danach Archiv und Entfernen nur durch den Inhaber |
| 5.6 | **Images mit Tag, die kein Container benutzt** einzeln entfernen | bis 11,3 GB | gering; **nicht** per `prune -a` (Sperrvermerk); Liste vorher sichten, `cognee/cognee`-Image wird für Phase 3 gebraucht | `docker pull` des Tags | Kandidaten (K, 10:08): `nx-app-check` 1,3 GB, `nx-web-check` 1,3 GB, `nx-worker-check`, `nx-mcp-check`, `nx-gateway-check`, `mcr.microsoft.com/playwright:v1.62.0-jammy` 3,3 GB, `…:v1.48.0-jammy` 2,8 GB, `node:20` 1,6 GB, `aquasec/trivy`. Je Image: `docker ps -a --filter ancestor=<image>` muss leer sein, dann `docker image rm <image>`. Lokal gebaute `nx-*-check` sind nicht wieder ziehbar. |
| 5.7 | `nexify-lokal-worker-1` Schreibschicht (3,7 GB) und Neustartschleife | 3,7 GB | mittel; Frage, ob der Stack neben Vercel gebraucht wird | `docker compose up -d` | Ursache der 205 Neustarts klären; erst dann neu erstellen |
| 5.8 | `/tmp/trivy`, `/tmp/opsrules-*` leeren | 3,4 GiB | gering; wird neu geladen | – | Aufräumplan 1.1 |
| 5.9 | Acht unverknüpfte GitLab-Runner-Volumes, einzeln beim Namen | 1,3 GB | gering | baut sich neu | `docker volume rm <name>`; **nie** `volume prune` (Cognee) |
| 5.10 | Werkzeug-Daten unter `/root` (`.git-ai` 2,1, `.claude-mem` 1,6, `.npm` 2,3, `.cache` 1,5) und alte Klone | bis rund 15 GiB | je Ordner zu sichten | Archiv | einzeln, nach Sichtung |
| 5.11 | **Platte vergrößern / Tarifwechsel** | beliebig | **kostet Geld** – nur Inhaber | – | nicht vorbereitet über das Nötige hinaus; beseitigt die Ursache (5.4) nicht |
| 5.12 | 16 beendete Mess-Projekte entfernen | 0 | keines | – | Hostinger-Oberfläche, Docker Manager |

**Welche Entscheidung löst es?** 5.1 allein bringt den Server von 99 % auf rund 79 %. 5.4 verhindert, dass er jede Nacht wieder an den Anschlag läuft.
Ohne 5.4 kommt das Problem auch nach 5.1 zurück, nur später. Kurzfristig, falls vor der Nacht (02:30 UTC) nichts anderes möglich ist: 5.8 (3,4 GiB) und 5.3.

## 6. Dauerhafte Maßnahmen (Wiederkehr verhindern)

Jede Zeile ist eine vorbereitete Änderung, keine ausgeführte.

| Maßnahme | Änderung | Wirkung | Risiko | Rückweg | Entscheidet |
|---|---|---|---|---|---|
| Sicherungen nicht mehr auf die eigene Platte | fünf Läufe aus Abschnitt 3 auf das Archivziel streamen; lokal höchstens ein Stand | −14 GiB Spitze je Nacht, −20 GiB Bestand | gering | alter Job | Inhaber (Archivziel, rund 1–2 USD je Monat laut Aufräumplan 7.1) |
| Schwellenwert-Alarm | `monitoring-dus` (Prometheus, Alertmanager, node-exporter laufen bereits): Regel `(node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.15` für 15 min → Warnung, `< 0.07` → kritisch | früher Hinweis statt Absturzschleife | keines | Regel entfernen | Inhaber: Zustellweg (ein verifizierter Kanal ist nicht belegt) |
| Log-Begrenzung je Projekt | in jeder Compose-Datei je Dienst `logging: { driver: json-file, options: { max-size: "20m", max-file: "3" } }`; wirkt erst beim Neuerstellen des Containers | heute nur 0,16 GiB; schützt vor künftigen Ausreißern | Neustart je Dienst | Block entfernen | Inhaber (Zeitfenster); Traefik und Kundendienste zuletzt |
| Journal begrenzen | Datei `journald.conf.d/50-nexify.conf` mit `SystemMaxUse=500M`, dann `systemctl restart systemd-journald` | hält den heutigen Stand (532 MiB) fest | keines | Datei entfernen | Sitzung mit Shell |
| Aufräumtakt Build-Cache | wöchentlich `docker builder prune --filter until=168h` als systemd-Timer | heute 0 B; verhindert Aufwuchs nach Bauphasen | keines (abgeleitete Daten) | Timer abschalten | Inhaber (neuer Dauerprozess, `AGENTS.md`) |
| `:latest`-Images | je Dienst laufenden Digest in die Compose-Datei schreiben (Server-Befund Schritt 6); kein Update dabei | keine stillen Mehrfachstände alter Schichten; Rückweg belegbar | gering | Zeile zurück | Sitzung mit Shell |
| Auslagerung großer Bestände | Paperclip-Läufe, LightRAG-Dumps, GitLab-Sicherungen nach R2; LightRAG-Ablösung nach Aufräumplan Phase 5 | −100 GiB und mehr | siehe 5.1 | Archiv | Inhaber |
| Arbeitsspeicher statt Auslagerung | Ursache der 23,6 GiB Auslagerung klären (`dsh-enterprise`, LightRAG, GitLab); danach 5.2 | −16 GiB | mittel | Datei neu anlegen | Inhaber (welche Dienste bleiben) |
| srv1243952 messbar machen | einmalige Shell-Sitzung mit dem Ablaufblatt aus Abschnitt 4 | beendet den blinden Fleck | keines (Block A/B) | – | Inhaber |

## 7. Was nicht möglich war

- **srv1243952:** keine Messung im Server, keine Ausführung (kein dokumentierter Weg).
- **Journal kürzen, Dateien archivieren oder verschieben auf srv1941843:** braucht Schreibzugriff auf den Host; der dokumentierte Weg ist nur lesend. Nicht umgangen.
- **Ursache des Anstiegs um 5,4 GiB zwischen 09:15 und 09:49 UTC** (M) nur teilweise belegt: 1,6 GB neue Image-Schichten 09:37–09:39 UTC, dazu wachsende Datenbanken; der Rest liegt in Dateien unter 50 MB oder in Schreibschichten.
- **Auslöser der nächtlichen Sicherungen** nicht gefunden (Pfade unter `/etc/` lehnt die Schutzschicht der API ab, siehe Skill).
- **Kein Registereintrag** in `config/loesungsregister.json`: Es ist keine neue Lösung und kein neuer Zugang entstanden.

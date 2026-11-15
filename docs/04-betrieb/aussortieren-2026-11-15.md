# Aussortieren auf beiden Servern · Kandidatenliste, Löschprotokoll, offene Punkte · 15.11.2026

Auftrag: Inhaber über die orchestrierende Sitzung, 15.11.2026: „Alle Speicherprobleme lösen" und
„alles, was älter ist wie 30 Tage und nicht verbaut ist, kann weg", dazu die Dauerregel vom selben Tag
(„Immer wenn ich einen Auftrag gebe, sind auch automatisch immer alle Freigaben gegeben").
Diese Freigabe ist jünger und enger als der Grundsatz „nichts löschen" (D-016, D-017, `AGENTS.md`); sie gilt nur für das,
was die Regel unten erfüllt. Alles andere bleibt nach D-016/D-017 geschützt.
Grundlage der Messung: `speicher-bereinigung-2026-11-15.md` (Zweig `claude/speicher-bereinigung`), `aufraeumplan-2026-11-14.md` (Sperrvermerk Cognee).
Dieses Dokument ändert keines der Leitdokumente.

Messwege wie im Speicher-Bericht: D = `df`/`du`/`find`/`stat` im einmaligen Hilfs-Container (Image `docker:27-cli`, Wurzel nur lesend),
K = Docker-Client über den Socket, W = Statuscode von zehn öffentlichen Adressen. Zeiten in UTC. GiB = 2^30 Byte.

## 1. Regel und Klassen

| Klasse | Inhalt | Bedingung |
|---|---|---|
| A | Abgeleitetes, jederzeit neu erzeugbar: Scanner-Zwischenspeicher, Paket-Caches, Images ohne Container (einzeln), beendete Mess-Projekte | kein laufender Prozess benutzt es, kein Container bindet es ein |
| B | Älter als 30 Tage und nicht verbaut: alte Klone, Arbeitskopien, Bau-Ausgaben, alte Sicherungsstände | keine Datei darin jünger als 30 Tage (Stichtag 16.10.2026) · von keinem Container eingebunden · von keinem Prozess benutzt · in keiner Compose-Datei, keinem Timer, cron-Eintrag oder Dienst genannt · bei Sicherungen gibt es einen jüngeren Stand derselben Art |
| C | Paperclip-Läufe (abgelöst, D-019): archivieren, Archiv prüfen, dann Original entfernen | **läuft durch das Skript des Inhabers, siehe 3** |
| D | Nie anfassen: Datenbanken, Docker-Volumes (Cognee), `vsk-mongodb`, Traefik, Zertifikate, Kundendaten, GitLab, Geheimnisspeicher, SSH-Schlüssel, Auslagerungsdateien, System, alles unter 30 Tagen (außer A und C), der neueste Sicherungsstand | – |

## 2. Ausgangslage srv1941843

| UTC | frei | belegt | Quelle |
|---|---|---|---|
| 11:40:14 | 2,00 GiB (2.151.657.472 B) | 99 % | D |
| 12:15:26 | 16,57 GiB (17.789.136.896 B) | 96 % | D – Anstieg durch das Archivskript des Inhabers, nicht durch diese Sitzung |
| 12:19:17 | 19,80 GiB (21.255.778.304 B) | 95 % | D – ebenso |

Container um 11:40 (K): 57 laufend, 16 beendet (die 16 sind die Mess-Projekte vom 14. und 15.11.).
Adressen um 11:39:33 (W), identisch zum Speicher-Bericht: `nexifyai.de` 200, `teileklar.shop` 200, `unternehmensbot.eu` 302, `gitlab.nexifyai.cloud` 302,
`brain.nexifyai.cloud/mcp` 401, `www.nexifyai.cloud` 200, `ai-router` 307, `wissen` 307, `cockpit` 302, `wiki.nexifyai.cloud` ohne Antwort (schon vorher).

**Wichtig für die Einordnung:** Der Server ist erst seit September in Betrieb. Fast alles darauf ist jünger als 30 Tage oder wurde in den letzten
30 Tagen angefasst. Klasse B ist deshalb klein (rund 5 GiB). Die großen Brocken sind Klasse C (Paperclip), Klasse D (Daten, Images in Gebrauch) und
junge Sicherungen.

## 3. Klasse C · Paperclip-Läufe: das Skript des Inhabers läuft

Um 11:40:50 gab es `/root/archiv-paperclip.sh` noch nicht. Um 12:15:26 lief es (angelegt 11:54:14, Prozesse `bash /root/archiv-paperclip.sh`,
`zstd -dc …`, `tar -tf -`), Archive unter `/root/archiv/paperclip-laeufe-2026-11-15/`, Protokoll `/root/archiv-paperclip.log` mit Zeilen der Form
`OK <lauf>: 2585 MiB -> 1755 MiB`. Zu diesem Zeitpunkt standen noch 15 von 37 Einträgen im Ordner `runs`.
**Diese Sitzung hat die Läufe deshalb nicht angefasst** (kein doppeltes Arbeiten, Auftrag).

Was dazu gemessen wurde (D, 11:40–11:50, vor dem Start des Skripts):

- 37 Einträge, davon 33 Läufe mit 0,3–2,6 GiB, vier leere Reste (12–176 KB). Alle Ordner zuletzt geändert zwischen 30.10. und 04.11.,
  also **alle jünger als 30 Tage** – kein Lauf fällt unter Klasse B, alle unter „archivieren, prüfen, entfernen".
- **Ein Lauf war in Gebrauch:** Prozess 2635432 (`node …/runs/7ac12d6f-2f28-48d1-9fb2-224e5f51db02/workspace/.paperclip-runtime/opencode/paperclip-bridge/server/…`)
  lief aus diesem Lauf heraus. Ob das Skript ihn ausnimmt, ist hier nicht bekannt; siehe „Offen".
- Die Archive liegen auf **derselben Platte**. Bei 2585 → 1755 MiB je Lauf bleibt rund ein Drittel Gewinn: aus 77 GiB werden rund 52 GiB Archiv,
  frei werden rund 25 GiB. Der volle Gewinn kommt erst, wenn die Archive die Platte verlassen (siehe 7).

## 4. Kandidatenliste srv1941843 (Stand vor der Ausführung, D/K 11:50–12:20)

Belege: „Einb." = Einbindungen und Compose-Arbeitsverzeichnisse aller 73 Container (166 Pfade, K 12:16); „Proz." = Arbeitsverzeichnis, Programm,
Aufrufzeile und offene Dateien aller Prozesse (809 Pfade, D 12:16); „Konf." = 2167 Compose-, Dienst-, Timer- und Skriptdateien unter `/opt`, `/root`,
`/home` sowie 914 Dateien der systemd- und cron-Konfiguration (D 12:16 und 12:20, nur Dateinamen ausgegeben).

### Vorgesehen zum Entfernen

| # | Pfad | Größe | jüngste Änderung | Klasse | Beleg „nicht verbaut" | Aktion |
|---|---|---|---|---|---|---|
| A1 | `/home/mypad/.npm/_cacache` | 1,85 GiB | 24.10. | A | npm-Download-Cache; Einb. –, Proz. –, Konf. – | Inhalt entfernen |
| A2 | `/root/.npm/_cacache` | 0,49 GiB | 13.11. | A | npm-Download-Cache; Einb. –, Proz. – (der laufende `playwright-mcp` liegt in `_npx`, nicht hier) | Inhalt entfernen |
| A3 | `/root/.bun/install/cache` | bis 0,58 GiB | 07.10. | A | bun-Download-Cache; Proz. nur `/root/.bun/bin/bun` (bleibt) | Inhalt entfernen |
| A4 | `/root/.local/share/pnpm/store` | bis 4,75 GiB | 13.11. | A | pnpm-Paketspeicher (v3, v10, v11), kein `links`-Verzeichnis; Einb. –, Proz. –; einzige Nennung in einer Entwickler-Compose-Datei eines nicht laufenden Klons (`/root/ipollowork/…/docker-compose.dev.yml`). Hart verknüpfte Dateien in bestehenden `node_modules` bleiben erhalten; frei wird nur, was nirgends mehr verknüpft ist | Inhalt entfernen |
| A5 | Image `mcr.microsoft.com/playwright:v1.62.0-jammy` | 3,3 GB | 27.07. (Bau) | A | kein Container (auch kein beendeter) benutzt es (K 12:16); wieder ziehbar | `docker image rm` ohne `-f` |
| A6 | Image `mcr.microsoft.com/playwright:v1.48.0-jammy` | 2,83 GB | 08.10.2024 (Bau) | A | wie A5 | `docker image rm` ohne `-f` |
| A7 | Image `node:20` | 1,59 GB | 22.04. (Bau) | A | wie A5 | `docker image rm` ohne `-f` |
| B1 | `/opt/aionui-dist` | 3,06 GiB | 07.10. 13:20 | B | Bau-Ausgabe (`.deb`, mac-Pakete, Bauskripte); Einb. – (AionUI bindet `/opt/aionui-data` ein), Proz. –, Konf. – | Inhalt entfernen |
| B2 | `/root/backups/aionui-backend-20261014T095316Z.db.bak` | 0,77 GiB | 14.10. | B | Sicherungskopie; jüngere Stände derselben Art: `/opt/nex2fly/ops/backups/db/aionui-backend-20261113…`, `…1114…`, `…1115…`; Proz. –, Konf. – | Datei leeren |
| B3 | `/opt/nexifyai/paket-20260928` | 0,48 GiB | 13.10. 04:08 | B | alter Klon (`.git`, Stand 28.09.); nicht als Compose-Projekt eingesetzt (Einb. –), Proz. –, Konf. – | Inhalt entfernen |
| B4 | `/opt/nexifyai/myadmin-ui` | 0,28 GiB | 05.10. 00:02 | B | Einb. –, Proz. –, Konf. – | Inhalt entfernen |
| B5 | `/root/workspaces` | 0,25 GiB | 09.10. 21:59 | B | ein Ordner `nex-orchestration-evaluation`; Einb. –, Proz. –, Konf. – | Inhalt entfernen |
| B6 | `/opt/convex-backend` | 0,18 GiB | 05.10. 00:02 | B | Quelltext-Klon; eingesetzt ist `/opt/convex-selfhosted` (bleibt); Einb. –, Proz. –, Konf. – | Inhalt entfernen |
| B7 | `/root/backups/agentmemory-state_store.db.bak-20261014T095656Z-vor-konsolidierung` | 0,15 GiB | 14.10. | B | Sicherungskopie; jüngere Stände: `/root/backups/agentmemory-pre-rea08c-20261026T1032Z`, `/var/backups/agentmemory` (26.10.); Proz. –, Konf. – | Datei leeren |
| B8 | `/opt/obscura` | 0,15 GiB | 04.10. 19:33 | B | zwei Programmdateien; Einb. –, Proz. –, Konf. – | Inhalt entfernen |
| B9 | `/root/.docs7` | 0,14 GiB | 04.10. 23:37 | B | ein Ordner `renderer`; Einb. –, Proz. –, Konf. – | Inhalt entfernen |

Erwartung: Klasse A bis rund 15 GiB, Klasse B rund 5,5 GiB.

Technik: je Posten ein einmaliges Hilfsprojekt, das **nur diesen einen Pfad** schreibend einbindet (dazu die Wurzel nur lesend für die Prüfung
unmittelbar davor). Ein eingebundenes Verzeichnis kann von innen nicht selbst entfernt werden; es bleibt als **leerer Ordner** stehen.
Eine eingebundene Datei wird auf 0 Byte gekürzt; der leere Dateiname bleibt stehen.

### Bleibt – verbaut, geschützt oder unter 30 Tagen

| Pfad | Größe | Grund |
|---|---|---|
| `/tmp/trivy` | 3,1 GiB | war um 11:50 da, um 12:19 nicht mehr – nicht von dieser Sitzung entfernt |
| `/root/.npm/_npx` | 1,77 GiB | Proz.: laufender `playwright-mcp` |
| `/root/.cache` (`uv`, `ms-playwright`, `chroma`) | 1,5 GiB | Proz.: laufender `chroma-mcp` aus `uv`; Konf.: in drei Compose-Dateien genannt |
| `/opt/dsh`, `/opt/dsh-stage` | je 0,5 GiB | älter als 30 Tage, aber Proz.: laufende `dsh`-Prozesse |
| `/opt/nextprob` | 0,75 GiB | älter als 30 Tage, aber Proz.: laufendes Electron |
| Images `pgvector:pg17`, `node:22-alpine`, `python:3.12-*`, `aquasec/trivy`, `gitleaks`, `shellcheck`, `gitlab-runner-helper`, `alpine:3.20` | zusammen 1,7 GB | klein; Scanner und Runner ziehen sie sonst sofort neu; `pgvector` vom 12.11. |
| alle Klone unter `/root` (über 20, zusammen rund 16 GiB) | – | jeweils mindestens eine Datei jünger als 30 Tage |
| `/opt/backups/lightrag*`, `/opt/nexifyai/backup/nexify`, `/opt/nex2fly/ops/backups`, GitLab-Sicherungen | rund 25 GiB | unter 30 Tagen bzw. neuester Stand; Lösung in 7 |
| Docker-Volumes, Cognee, Datenbanken, GitLab, Traefik, Auslagerungsdateien | – | Klasse D |

### Unklar – Inhaber entscheidet

| Pfad | Größe | Warum unklar |
|---|---|---|
| `/root/archiv/paperclip-laeufe-2026-11-15/` | rund 52 GiB nach Abschluss | Archive des Inhabers, auf derselben Platte. Auslagern (R2) macht sie frei – braucht Schreibzugang zum Archivziel |
| `/home/mypad/.local/share/opencode` | 8,8 GiB | Datenbestand von opencode, wahrscheinlich Teil von Paperclip (D-019 abgelöst); jünger als 30 Tage; Inhalt nicht gesichtet |
| `/opt/nexifyai/vendor` | 0,28 GiB | älter als 30 Tage (15.10.) und ohne Verweis, enthält aber `betreiber-sites`, `betreiber-repos`, `dodopayments` – möglicher Kundenbezug |
| `/opt/backups/nexify-scripts-20261016-101718-vor-stempel.tar.gz` | 0,33 GiB | 30 Tage alt, aber kein jüngerer Stand derselben Art |
| `/root/.claude` 5,2 · `.codex` 3,3 · `.hermes` 3,2 · `.git-ai` 2,1 · `.claude-mem` 1,6 GiB | 15,4 GiB | Arbeitsdaten der Werkzeuge, in Gebrauch; nur die Werkzeuge selbst können gefahrlos kürzen |
| `/opt/aionui-data` 8,7 GiB, Schreibschicht `aionui` 7,4 GB | 16 GiB | Frage aus dem Speicher-Bericht 5.5: wird AionUI gebraucht? |
| Auslagerungsdateien | 24 GiB | Speicher-Bericht 5.2; Klasse D |
| GitLab-Prometheus | 20,6 GiB | Speicher-Bericht 5.3; Konfigurationsänderung mit Neustart, nicht Teil dieses Auftrags |

## 5. Löschprotokoll srv1941843

_wird während der Ausführung gefüllt_

## 6. srv1243952

_folgt_

## 7. Dauerhaft

_folgt_

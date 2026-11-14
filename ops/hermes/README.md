# Hermes bei NeXify: Betriebsanleitung

Stand 14.11.2026. Dieses Verzeichnis bereitet vor und aktiviert nichts. Der Team-Runtime-Kandidat (`config/integrations/nexify-team-runtime-candidate.json`) bleibt `candidate_not_runtime_activation`. Jeder Schritt auf dem Server braucht die Freigabe des Inhabers und hat einen Rückweg (`DECISIONS.md` D-016).

Kennzeichnung: IST = in dieser Arbeit gemessen. NOTIZ = übermittelt, hier nicht nachgeprüft. OFFEN = fehlt.

## Was Hermes ist

Hermes Agent von Nous Research, `NousResearch/hermes-agent`, MIT-Lizenz, Version v0.22.5, gebunden an Commit `bf0203a794a07aac3ff764972ab9087baa4e4f4e` (`docs/research/agent-team-20261101/source-manifest.json`). Alle Formatangaben hier stammen aus `website/docs/` an diesem Commit:

| Thema | Beleg am Commit | Folge |
|---|---|---|
| Konfiguration | `user-guide/configuration.md` | `config.yaml` und `.env` im Hermes-Home; Geheimnisse nur in `.env` |
| Modell | `user-guide/configuring-models.md` | `model.provider`, `model.default`, `agent.reasoning_effort` |
| Ausweichketten | `user-guide/features/fallback-providers.md` | `fallback_providers: []`; Nebenaufgaben auf `auto` nutzen das Hauptmodell und sonst nichts |
| Kontext | `user-guide/features/context-files.md` | `SOUL.md` nur aus dem Hermes-Home; `AGENTS.md` aus dem Arbeitsverzeichnis. Es wird nur eine Projektdatei geladen, `CLAUDE.md` also nicht neben `AGENTS.md` |
| Skills | `user-guide/features/skills.md` | Gleiches `SKILL.md`-Format wie `.claude/skills`; `skills.external_dirs` liest sie an Ort und Stelle. Ein Umwandlungsskript ist nicht nötig |
| Speicher | `user-guide/features/memory.md` | `memories/MEMORY.md`, `USER.md` je Home; `memory.write_approval` |
| Profile | `user-guide/profiles.md` | Ein Profil trennt Zustand, ist aber keine Sandbox |

## Stand auf dem Server

NOTIZ, Quelle: koordinierende Sitzung über die Hostinger-API, nur lesend, 14.11.2026 ca. 11:50 UTC, Server `srv1941843` (Ubuntu 24.04). Hier nicht nachgeprüft; aus dieser Umgebung gibt es keinen Serverzugang. Der Befund steht ausführlich in `docs/04-betrieb/server-befund-2026-11-14.md` (S3, S4, Arbeitsliste 4 und 5).

- Compose-Projekt `docker-hermes`, Container `hermes`, eigenes Image, `network_mode: host`, läuft seit acht Tagen.
- Volumes: `/root/.hermes` (im Container `/home/hermes/.hermes` und `/root/.hermes`), `/usr/local/lib/hermes-agent`, `/opt/hermes-webui` (ro), `rea` (ro), Docker-Socket.
- Web-Oberfläche auf `0.0.0.0:8788`. Auf demselben Server läuft `9router` (Port 20128).

OFFEN: Hermes-Version auf dem Server, dortige `config.yaml`, eingestelltes Modell, Inhalt der `.env`.

## Dateien

| Datei | Zweck |
|---|---|
| `home/config.yaml` | Fassung für `/root/.hermes/config.yaml`. Modell, Reasoning und Fallback-Verbot aus `config/llm-policy.json` |
| `home/SOUL.md` | Fassung für `/root/.hermes/SOUL.md`. Rolle, Grenzen, Verweise; keine neuen Regeln |
| `home/.env.example` | Nur Variablennamen |
| `einspielen.sh` | Sichert `config.yaml` und `SOUL.md`, spielt die neuen ein, kann zurück. Trockenlauf ist Standard |
| `docker/libatomic1.Dockerfile-zeile` | Paketzeile für das Image |
| `docker/docker-compose.nexify.yml` | Bindet das Monorepo und den Erweiterungsordner der Oberfläche nur lesend ein |
| `docker/docker-socket-entfernen.md` | D-019 Folge 5: genaue Änderung, Prüfung, Rückweg |
| `gateway/` | Entwurf Modell-Wächter: Zwischenstation, die Modell und Reasoning der Vorgabe an der Leitung erzwingt; nicht eingespielt |
| `webui/` | Graphite-Skin für die Oberfläche (`nesquena/hermes-webui`), Bereitstell-Skript, Prüfer, Variablennamen; siehe „Oberfläche“ |
| `../../tools/check_hermes_config.py` | Prüft die Fassung gegen `config/llm-policy.json`; läuft in `make governance-check` und in den Python-Tests (`tests/test_hermes_config.py`) |

## Oberfläche (Arbeitsbereich des Inhabers)

Die Web-Oberfläche ist ein eigenes Projekt, `nesquena/hermes-webui` (MIT). `unternehmensbot.eu` lieferte am 14.11.2026 um 20:28 UTC die Version v0.52.492 aus (IST, `static/login.js?v=v0.52.492`). Die Adresse zeigt per DNS auf srv1243952, nicht auf srv1941843; welche Instanz antwortet, ist OFFEN. Messung, Entscheidungsvorlage zur Absicherung, Einspielschritte und Abnahmeliste: `docs/04-betrieb/hermes-arbeitsbereich-2026-11-14.md`.

`webui/` enthält den Skin „NeXify Graphite“ für die offizielle Erweiterungsschnittstelle der Oberfläche (`docs/EXTENSIONS.md` dort): kein Fork, keine Änderung am Quellbaum, abwählbar in den Einstellungen.

```bash
python3 ops/hermes/webui/pruefe-gestaltung.py          # Werte nur aus config/design-tokens.json
bash ops/hermes/webui/bereitstellen.sh                 # Trockenlauf
bash ops/hermes/webui/bereitstellen.sh --anwenden      # schreibt /opt/nexify/hermes-webui-ext, startet nichts
bash ops/hermes/webui/bereitstellen.sh --zurueck <Sicherungsordner> --anwenden   # Rückweg
```

Wirksam wird der Skin erst, wenn die Oberfläche mit den Variablen aus `webui/webui.env.example` startet. Die Anmeldeseite lässt sich über diesen Weg nicht gestalten (feste Vorlage, Erweiterungen sind ohne Anmeldung nicht abrufbar). Lokal geprüft an v0.52.492 bei 390 und 1440 px ohne Hermes Agent und ohne Modell; Belege unter `evidence/hermes-arbeitsbereich-2026-11-14/`. Auf dem Server ist nichts davon eingespielt.

## Voraussetzungen

1. Freigabe des Inhabers je Schritt (D-016).
2. Ein Checkout dieses Repositories auf dem Server. Der Pfad ist OFFEN.
3. Ein OpenRouter-Schlüssel mit Guthaben und Limit. Kostenfreigabe ist eine eigene Entscheidung: Der Kandidat führt `paid_calls_enabled: false`, und `config/llm-policy.json` sagt, dass die Modellwahl keine Ausgaben freigibt.
4. `python3`, `git`, `sha256sum` auf dem Host.

## Inbetriebnahme

**Reihenfolge (Nachtrag 14.11.2026):** Maßgeblich ist die Schrittfolge in `docs/04-betrieb/hermes-arbeitsbereich-2026-11-14.md`, Abschnitt 6. Sie weicht in einem Punkt von der Nummerierung hier ab: Der Container wird erst ohne Docker-Socket neu erstellt (hier Schritte 4 und 5), **danach** trägt der Inhaber den Modellschlüssel ein (hier Schritt 3). Mit eingetragenem Schlüssel und eingehängtem Socket hätte ein handlungsfähiger Agent Root auf dem Host.

Jeder Schritt steht für sich. Nach jedem Schritt prüfen, erst dann weiter.

### Schritt 0: Bestand lesen (ändert nichts)

```bash
docker exec hermes hermes --version
git -C /usr/local/lib/hermes-agent rev-parse HEAD
docker exec hermes hermes config get model
docker exec hermes hermes config get fallback_providers
bash ops/hermes/einspielen.sh
```

Der letzte Befehl ist der Trockenlauf. Er nennt die Version, fehlende Variablennamen in der `.env` (nie Werte) und die Abschnitte der bisherigen `config.yaml`, die in der neuen Fassung fehlen. Rückweg: keiner nötig.

Weicht der Commit vom gebundenen ab, ist das Format hier nicht belegt. Dann entscheidet der Inhaber: Hermes auf den gebundenen Commit bringen oder die Bindung nach Prüfung der Doku des vorgefundenen Commits ändern.

### Schritt 1: Image um `libatomic1` ergänzen (Befund 1)

Die Zeile aus `docker/libatomic1.Dockerfile-zeile` in das Dockerfile des Projekts übernehmen. Vorher das laufende Image festhalten:

```bash
docker image inspect "$(docker inspect -f '{{.Image}}' hermes)" -f '{{.Id}}' > /root/hermes-image-vorher.txt
docker tag "$(cat /root/hermes-image-vorher.txt)" hermes-rueckweg:vorher
docker compose -p docker-hermes build
```

Der Bau startet nichts. Wirksam wird das Image erst mit Schritt 5. Rückweg: Dockerfile-Zeile entfernen, `docker tag hermes-rueckweg:vorher <bisheriger Image-Name>`.

Beleg für die Ursache: Die von Hermes verwaltete Node-Laufzeit braucht `libatomic.so.1`, die schlanke Debian- und Ubuntu-Images nicht mitbringen (`getting-started/installation.md`, „Prerequisites“). Das Dockerfile von Hermes selbst installiert `libatomic1`. Annahme: Das eigene Image beruht auf Debian oder Ubuntu.

### Schritt 2: Monorepo im Container sichtbar machen (Befund 3)

`docker/docker-compose.nexify.yml` neben die Compose-Datei des Projekts legen und prüfen (startet nichts):

```bash
NEXIFY_REPO_HOST=/pfad/zum/checkout docker compose -f docker-compose.yml -f docker-compose.nexify.yml config
```

Rückweg: die Zusatzdatei weglassen.

### Schritt 3: `.env` ergänzen (von Hand, durch den Inhaber)

In `/root/.hermes/.env` (Rechte 600) stehen `OPENROUTER_API_KEY` und `NEXIFY_REPO=/opt/nexify/monorepo`. `HERMES_INFERENCE_MODEL` und `HERMES_YOLO_MODE` dürfen nicht gesetzt sein: Das erste übersteuert das Modell an der Konfiguration vorbei, das zweite schaltet Rückfragen ab. Vorher `cp -p /root/.hermes/.env /root/.hermes/.env.vorher`. Rückweg: diese Kopie zurückspielen.

Eine leere Zeile `OPENROUTER_API_KEY=` gilt als „nicht gesetzt“ und verdeckt eine gleichnamige Variable der Umgebung (IST, lokal).

### Schritt 4: Konfiguration einspielen

```bash
bash ops/hermes/einspielen.sh --zusatz /root/hermes-zusatz.yaml --anwenden
```

`--zusatz` nimmt serverlokale Abschnitte auf, die erhalten bleiben sollen, etwa `mcp_servers` mit dem Eintrag `rea`. Abschnitte zu Modell, Reasoning oder Ausweichkette weist das Skript dort ab, ebenso eingetragene Geheimnisse. Das Skript sichert nach `/root/.hermes/backups/nexify-<Zeit>/`, schreibt mit Rechten 600 und startet nichts neu. Ein zweiter Lauf ändert nichts.

Rückweg (steht auch in der Ausgabe):

```bash
bash ops/hermes/einspielen.sh --zurueck /root/.hermes/backups/nexify-<Zeit> --anwenden
```

### Schritt 5: Container neu erstellen

Erst hier wird etwas neu gestartet, und nur mit Freigabe:

```bash
NEXIFY_REPO_HOST=/pfad/zum/checkout docker compose -f docker-compose.yml -f docker-compose.nexify.yml up -d hermes
docker logs --since 5m hermes
```

Im Protokoll darf weder `libatomic.so.1` noch `session.create refused` stehen. Rückweg: Schritt 4 zurück, altes Image zurücktaggen, `docker compose -f docker-compose.yml up -d hermes`.

### Schritt 6: Funktionsnachweis

```bash
docker exec -w /opt/nexify/monorepo hermes hermes -z "Nenne die Datei, in der die Modellvorgabe steht." --usage-file /root/.hermes/cache/scratch/nachweis.json
docker exec hermes cat /root/.hermes/cache/scratch/nachweis.json
docker exec hermes hermes skills list
```

Abnahme: Exit 0, eine Antwort, im Bericht `"model": "deepseek/deepseek-v4.1-flash-1017"`, `"provider": "openrouter"`, `"completed": true`, und `auxiliary.api_calls` ist 0. Die Skill-Liste nennt jeden Skill aus dem Index `.claude/skills/README.md` als `external`. Zusätzlich im OpenRouter-Aktivitätsprotokoll prüfen, dass genau dieses Modell mit Reasoning `high` abgerechnet wurde: Der Bericht von Hermes nennt die Reasoning-Stufe nicht. Das ist ein bezahlter Aufruf.

## Die vier Befunde aus dem Protokoll

Fundstellen im Quelltext am gebundenen Commit. Ob der Server diesen Commit fährt, ist OFFEN.

| Befund | Ursache | Korrektur | Rückweg |
|---|---|---|---|
| 1 `node: ... libatomic.so.1` | Bibliothek fehlt im Image | Schritt 1 | altes Image zurücktaggen |
| 2 `No messaging platforms enabled` | Kein Nachrichtenkanal eingerichtet (`gateway/run_startup.py`). Hinweis, kein Fehler: Der Gateway läuft für Cron weiter | Keine. Ein Kanal wäre eine Nachricht an Dritte und braucht eine Freigabe (Hartsperre in `config/brain/agents.json`) | entfällt |
| 3 `session.create refused ... field=cwd` | Arbeitsverzeichnis nicht absolut oder nicht vorhanden (`gateway/session_policy.py`) | Schritte 2 bis 4: `terminal.cwd` zeigt über `NEXIFY_REPO` auf das eingebundene Monorepo | Schritt 4 zurück |
| 4 `kanban dispatch: system memory pressure` | Schutz des Verteilers: bei `elevated` höchstens ein neuer Worker, bei `critical` keiner. Aufträge warten, sie gehen nicht verloren (`hermes_cli/kanban_db_dispatch.py`) | `kanban.max_in_progress: 1` begrenzt die Last. Die Ursache ist zu wenig freier Arbeitsspeicher auf dem Host; mehr Speicher oder weniger Dienste ist eine Inhaberentscheidung | Schritt 4 zurück |

## Belege (IST, lokal, 14.11.2026)

Umgebung: eigener Bereich im Scratchpad dieser Sitzung, eigenes `HOME` und `HERMES_HOME`. Kein OpenRouter-Schlüssel, kein Modellaufruf.

- Installation mit dem Installer des gebundenen Commits (`scripts/install.sh --commit bf0203a… --non-interactive --skip-browser --skip-computer-use`): Exit 0. `hermes --version`: „Hermes Agent v0.22.5“, „Python: 3.14.9“, `git rev-parse HEAD` gleich dem gebundenen Commit. Python 3.14 kam über die im Hermes-Lock gebundene `uv`-Version.
- `hermes config get` liefert aus `home/config.yaml`: `model.provider` `openrouter`, `model.default` `deepseek/deepseek-v4.1-flash-1017`, `agent.reasoning_effort` `high`, `fallback_providers` `[]`, `delegation.fallback_providers` `[]`; `terminal.cwd` und `skills.external_dirs` werden aus `NEXIFY_REPO` aufgelöst.
- `hermes skills list`: alle Skills aus `.claude/skills` als `external`, `enabled` (am Tag der Messung zwölf; maßgeblich ist der Index `.claude/skills/README.md`, die Zahl wächst mit jedem neuen Skill).
- `einspielen.sh --anwenden` gegen dieses Home: Versionsprüfung trifft den gebundenen Commit, Sicherung angelegt, `hermes doctor` läuft danach durch.
- Ohne Schlüssel endet `hermes -z` mit Exit 2 und `ProviderNotConfiguredError`. Es wird kein anderer Anbieter versucht.
- Gegen eine lokale Attrappe (`OPENROUTER_BASE_URL` auf `127.0.0.1`, Platzhalter statt Schlüssel) sendet `hermes -z` genau eine Anfrage: `model` `deepseek/deepseek-v4.1-flash-1017`, `provider: {require_parameters: true}`, kein zweites Modell. Der Systemtext enthält `SOUL.md`, die vollständige `AGENTS.md` ohne Sperr- oder Kürzungsvermerk und die Skill-Liste. Der Nutzungsbericht nennt Modell und Anbieter wie oben.
- Vor der Einstellung `title_generation.model_upgrade_enabled: false` schickte Hermes zusätzlich eine Titelanfrage mit `reasoning: {enabled: false}`. Mit der Einstellung entfällt sie (0 Nebenaufrufe).
- Öffentlicher OpenRouter-Katalog (`/api/v1/models`, ohne Schlüssel gelesen): `deepseek/deepseek-v4.1-flash-1017` ist gelistet, `supported_parameters` enthält `reasoning`, `supported_efforts` enthält `high`.

Nicht belegt: Die Attrappe ist keine OpenRouter-Adresse, deshalb sendet Hermes dort kein `reasoning`-Feld (`agent/reasoning_params.py` sendet es nur an OpenRouter-Adressen). Dass die echte Anfrage `reasoning.effort: high` trägt, folgt aus Quelltext und Katalog und ist erst mit Schritt 6 gemessen.

## Offen

1. **Rolle (entschieden mit D-019, nicht umgesetzt).** `DECISIONS.md` D-019 ersetzt in D-014 den Satz „Orchestriert wird über Paperclip“: Hermes ist die Orchestrierungs-Laufzeit, in der die Rollen arbeiten (NeX führt aus, AIFly ORACLE koordiniert), keine weitere Rolle. Nachgeführt sind `config/automation.json` (Paperclip als abgelöst gekennzeichnet, Hermes als gewählt und nicht verifiziert) und der Kandidat mit dem Block `orchestration_runtime` (`owner_selected_not_activated`); `tools/check_team_runtime_candidate.py` bindet diesen Block exakt. Unverändert bleiben `activation` (alles `false`), `controller`, `execution_authority` jeder Rolle und die Zuordnung der neun Profile zu Laufzeiten (Hermes weiterhin nur `triage` und `angebot`). OFFEN: ob und welche weiteren Profile in Hermes laufen sollen. Das ist nicht entschieden und hier nicht erzwungen, weil der Container heute über den Docker-Socket faktisch Root auf dem Host hat (Punkt 4) und unabhängige Prüfung (`pruefer`) und lesende Überwachung (`waechter`) trennbar bleiben müssen. Voraussetzung ist der Funktionsnachweis aus Schritt 6.
2. **Zielroute 9router.** `config/llm-policy.json` nennt 9router als Ziel, Status „nicht aktiviert“. Diese Fassung geht direkt an OpenRouter, wie die geltende Vorgabe es verlangt. Die Umstellung braucht die dort genannten Vorprüfungen.
3. **Reasoning-Klemmung.** Hermes senkt eine verlangte Stufe auf die höchste, die der Katalog für das Modell nennt, ohne Fehler (`configuration.md`, „Reasoning Effort“). Heute nennt der Katalog `high`. Fiele `high` weg, wäre das eine stille Herabstufung, die diese Konfiguration nicht verhindern kann. Abhilfe wäre die Prüfung der serialisierten Anfrage im Gateway.
4. **Rechte des Containers.** Docker-Socket, `network_mode: host` und Root im Container geben dem Agenten faktisch Root auf dem Host. Das steht gegen `unrestricted_shell: false` im Kandidaten und gegen die Hartsperren, die laut `AGENTS.md` im Gateway liegen sollen. `approvals.mode: manual` und die `deny`-Muster sind eine Rückfrage, keine Sandbox (`user-guide/security.md`). Entscheidung des Inhabers: Socket entfernen, eigener Dienstnutzer, Terminal-Backend mit Isolierung.
5. **Web-Oberfläche auf `0.0.0.0:8788`.** Siehe Punkt 12: laut Server-Befund von außen erreichbar.
6. **Werkzeugumfang.** Lokal bot Hermes 20 Werkzeuge an, darunter `terminal`, `write_file`, `browser_exec`, `delegate_task`. Welche davon je Rolle zulässig sind (`agent.disabled_toolsets`), ist nicht festgelegt.
7. **Mitgelieferte Skills.** Lokal lagen neben den Projekt-Skills aus dem Index 53 Skills von Hermes im Home. Ob sie auf dem Server bleiben sollen, ist offen (`hermes skills opt-out`).
8. **Schreibzugriff auf das Repository.** Die Einbindung ist nur lesend. Soll Hermes Zweige und Entwurfs-PRs liefern, braucht es einen eigenen beschreibbaren Checkout und einen eng berechtigten Git-Zugang.
9. **`_config_version`.** Die Fassung trägt keinen Versionsstempel, weil Hermes ihn selbst verwaltet. `hermes doctor` meldet deshalb „v0 → v51“. `hermes config migrate` oder `hermes update` können die Datei umschreiben; danach zeigt der Trockenlauf von `einspielen.sh` die Abweichung.
10. **Grenzen der Limits.** `agent.max_turns` und `run_budget_seconds` sind Schritt- und Zeitgrenzen von Hermes, kein Geldbudget. Ein Ausgabenlimit gehört an den OpenRouter-Schlüssel.
11. **Kandidatendatei.** `remote_installation` lautet jetzt `container_reported_on_srv1941843_2026-11-14_version_model_config_unverified` mit Quelle `docs/04-betrieb/server-befund-2026-11-14.md`; der Prüfer bindet beide Werte. Das hält fest, dass ein Container gemeldet ist, und belegt weder Version noch Modell, Konfiguration oder einen echten Modellaufruf. `connected`, `installed_by_this_work` und `local_cli_detected` bleiben `false`. Ältere Dokumente mit der Aussage „nicht installiert“ (`docs/architecture/team-runtime-adaptation-20261101.md`, `docs/reviews/agent-team-20261101/report.json`) sind Stand 01.11.2026 und bleiben als Historie unverändert; die dort gebundenen Prüfsummen von Kandidat, Prüfer und Test gelten für jenen Stand.
12. **Web-Oberfläche öffentlich.** Laut Server-Befund leitet Traefik auf srv1941843 `unternehmensbot.eu` auf die Hermes-Oberfläche; geschützt ist sie nur durch die Anmeldung von Hermes. Das widerspricht D-019 Folge 4 und ist im Kandidaten als offener Punkt geführt. Korrektur nur mit Freigabe (D-016). Nachtrag 14.11.2026, 20:28 UTC (IST): Der A-Eintrag von `unternehmensbot.eu` zeigt auf srv1243952; welche Instanz öffentlich antwortet, ist OFFEN. Wege der Absicherung: `docs/04-betrieb/hermes-arbeitsbereich-2026-11-14.md`, Abschnitt 4.
13. **Modell je Zeitplan und je Gespräch.** Ein Zeitplan kann ein eigenes Modell und eine eigene Reasoning-Stufe tragen (`features/cron.md`: Einzelbindung vor `cron.model` vor Hauptmodell), und die Oberfläche bietet eine Modellauswahl je Gespräch. Beides läuft an dieser Konfiguration vorbei. Am Schlüssel lässt sich nur das Modell begrenzen, nicht die Reasoning-Stufe. Die ganze Vorgabe hält nur eine Zwischenstation, die Anfragen prüft und ablehnt: Entwurf `gateway/modell_waechter.py` (mit Tests, nicht eingespielt, Entscheidung des Inhabers offen). Bis dahin ist die Kontrolle von `cron/jobs.json` und des OpenRouter-Protokolls eine Sichtprüfung, kein Zwang. Bewertung von 9router dazu: Betriebsnotiz, Abschnitt 3a.
14. **Rollen als Profile.** Ein Profil ist ein eigenes Hermes-Home mit eigener `config.yaml` (`user-guide/profiles.md`). `einspielen.sh` schreibt nur das Standard-Home; vor dem Anlegen von Profilen für NeX und AIFly ORACLE muss es je Profil einspielen können.

# Aufräumen und Gedächtnis-Ablösung · Entscheidungsgrundlage und Plan · 14.11.2026

> **SPERRVERMERK – zuerst lesen.** Auf srv1941843 liegen die Cognee-Daten in den Volumes
> `cognee-x532_cognee-data` und `cognee-x532_cognee-system`. Docker führt beide als **ungenutzt**
> (0 Verknüpfungen), weil der Cognee-Container fehlt. Jedes „ungenutzte Volumes entfernen“
> (`docker volume prune`, `docker system prune --volumes`, Schritt 2c des Server-Befunds in seiner
> ursprünglichen Fassung) würde **den gesamten Cognee-Bestand löschen** (2,69 GB Wissensdaten,
> 19 Datensatz-Datenbanken). Bis die Volumes gesichert und wieder verknüpft sind (Phase 3), gilt:
> **kein Volume-Prune, kein Image-Prune mit `-a`, Volumes nur einzeln und beim Namen entfernen,
> und nur nach Freigabe des Inhabers (D-016).** Der Sperrvermerk steht auch in
> `docs/04-betrieb/server-befund-2026-11-14.md` bei Schritt 2c.

Status: Entscheidungsgrundlage, keine Entscheidung. Auf den Servern wurde nichts geändert, gestoppt oder gelöscht.
Übernommen am 14.11.2026 aus dem Arbeitsentwurf der Messsitzung; vor der Übernahme auf Geheimnisse und
personenbezogene Kundendaten geprüft (`python3 tools/check_loesungsregister.py` prüft diese Datei mit).
Kundenprojekte werden hier nicht beschrieben; dafür gilt `.claude/skills/nexify-kundenprojekt/SKILL.md`.
Welche der genannten Dienste wir wofür nutzen und welche Zugänge es gibt, steht im Lösungsregister:
`config/loesungsregister.json`, lesbar in `docs/04-betrieb/loesungsregister.md`.

Erhoben 14.11.2026, 18:10–18:45 UTC: Hostinger-API (lesend) und zwei einmalige Mess-Container auf srv1941843
(`nx-messung-cognee-20261114`, `nx-messung-cognee2-20261114`, Wurzel und Docker-Socket nur lesend).
Es gelten D-016, D-017, D-019 und der Grundsatz des Inhabers: nichts löschen, nur nachvollziehbar und wiederherstellbar archivieren.

Nachtrag 14.11.2026 (nach der Erhebung): Der R2-Bucket `nexify-agentur-pucket` besteht (Abruf der Bucket-Liste über den
Cloudflare-Konnektor, nur lesend; angelegt am 15.10.2026). Das belegt das Archivziel aus Abschnitt 7.1 dem Namen nach;
Schreibrechte, Lebenszyklus-Regel und ein eigener, auf diesen Bucket begrenzter Schlüssel sind nicht belegt.

## 1. Kurzantwort

**Nicht jetzt voll migrieren.** `cognee-x532` ist heute das am wenigsten funktionierende der drei Systeme: Der eigentliche
Cognee-Dienst läuft nicht (Container und Image fehlen, `brain.nexifyai.cloud/docs` antwortet 404), seine Daten liegen in zwei
Volumes, die Docker als „ungenutzt" führt. Erst Cognee wiederherstellen und sichern, dann stufenweise ablösen
(zuerst agentmemory, danach LightRAG nach einem Probelauf).

**Speicher:** Die Ablösung von agentmemory und LightRAG gibt netto rund **20–25 GiB** frei (5–7 % der Platte), mit den
LightRAG-Sicherungen brutto bis rund 37 GiB. Das ist nicht „extrem viel": Paperclip-Läufe allein sind 77 GiB.

## 2. Die drei größten Speicherhebel (srv1941843, 386,4 GB, 372,8 GB belegt, 9,6 GB frei, 97 %)

| # | Hebel | Größe | Bemerkung |
|---|---|---|---|
| 1 | `/home/mypad/workspace/.paperclip-runtime/runs` | 77,3 GiB | 37 Läufe, 30.10.–04.11.2026, kein Paperclip-Prozess läuft; Paperclip laut D-019 nicht weiterverfolgt |
| 2 | Sicherungen auf derselben Platte | rund 28 GiB | `/opt/backups` 14,6 (davon LightRAG 10,9), `/opt/nexifyai/backup` 7,1, `/opt/gitlab/data/backups` 4,2, `/root/backups` 2,0 |
| 3 | GitLab-Prometheus `/opt/gitlab/data/prometheus` | 20,6 GiB | Aufbewahrungsdauer begrenzen; `monitoring-dus` hat ein eigenes Prometheus |
| 4 | LightRAG + agentmemory ablösen | 20–25 GiB netto | erst nach Archiv und funktionierendem Cognee |
| 5 | AionUI (Container `aionui`, außerhalb der Compose-Projekte) | rund 25 GiB | Schreibschicht 7,4 GB, Image 5,25 GB, `/opt/aionui-data` 8,7, `-dist` 3,1, `/opt/aionui` 1,2 GiB; Zweck unklar → Frage |

`/var/lib/containerd` (63,7 GiB) ist kein Hebel: Docker meldet nur 2,6 GB ungenutzte Images.
Kleinteile ohne Risiko: `/tmp/trivy` 3,1 GiB (Scanner-Zwischenspeicher), `/tmp/opsrules-*` 0,3 GiB.

## 3. Befund Gedächtnis-Systeme

### 3.1 cognee-x532 (Compose-Projekt `/docker/cognee-x532`)

- **Zustand:** Es laufen nur `cognee-db` (postgres:17-alpine) und `cognee-mcp` (Image-Digest `…077eab41`, MCP 0.5.6), beide „healthy", 0 Neustarts.
  Der Dienst `cognee` (Image `cognee/cognee:latest`) hat **keinen Container, das Image ist nicht mehr auf dem Server**.
  `https://brain.nexifyai.cloud/docs`, `/health`, `/api/v1/datasets` → 404 von Traefik; `/mcp` → 401 (Basic-Auth).
- **Fehlerbild im Protokoll von `cognee-mcp`** (103.367 Zeilen): 340× `PoolTimeout`, 261× httpx-Ausnahmekette
  („The above exception was the direct cause …") – der MCP erreicht `http://cognee:8000` nicht. Sein Healthcheck meldet trotzdem 200.
- **Daten:** `cognee-x532_cognee-system` 2,69 GB (19 Datensatz-Datenbanken: je eine LanceDB und eine Kuzu-Datei, dazu
  `SessionQAVector_text` = gespeicherte Sitzungs-Fragen/Antworten), `cognee-x532_cognee-data` 8,8 MB (4.994 Dateien, Rohtexte),
  `cognee-db-data` 120 MB. Zeitraum der Dateien 23.09.–03.11.2026 (Datenbank bis 07.11.). Projektordner 1,0 GiB (eigene `backups`).
- **Risiko:** `cognee-data` und `cognee-system` haben 0 Verknüpfungen. Schritt 2c des Server-Befunds
  („ungenutzte Volumes entfernen") oder ein `docker volume prune` würde **den gesamten Cognee-Bestand löschen**.
- **Modell:** `LLM_MODEL=openai/openrouter/deepseek-v4.1-flash-1017` über `LLM_ENDPOINT http://172.27.0.1:20129/v1`
  (lokaler Router); Embedding `Qwen/Qwen3-Embedding-8B` (4096 Dimensionen) bei `inference.api.nscale.com`.
  Vektoren LanceDB, Graph Kuzu, `ENABLE_BACKEND_ACCESS_CONTROL=True`.
- **„Erfasst auch die Chats":** für die Server-Instanz nur teilweise belegt (Sitzungs-Vektoren vorhanden, LibreChat ist per MCP angebunden);
  seit Anfang November kommt nichts mehr an.

### 3.2 Das Cognee-Plugin in Claude Code ist eine andere Instanz

Plugin `cognee-memory` 1.6.6 läuft im **lokalen Modus**: eigener Cognee-Dienst im Sitzungs-Container auf `http://localhost:8011`
(`~/.cognee`, angelegt 14.11. 06:57), `COGNEE_BASE_URL` ist nicht gesetzt. Es hat keine Verbindung zu `cognee-x532`.
„recall 0 memory" ist ein Fehler dieser lokalen Instanz: 2.122 Spuren wurden gespeichert, aber der Graph wird nie gebaut –
279× `recall_graph_not_built`, 28× `NoDataError: No searchable memory in dataset 'agent_sessions'`,
Ursache `ModuleNotFoundError: No module named 's3fs'` → `CogneeSystemError: Failed to cognify session data`.
Zudem liegt der Speicher im flüchtigen Cloud-Container und überlebt die Sitzung nicht.

### 3.3 LightRAG (Compose-Projekt `stack`, `/opt/ai-stack/stack`)

- **Zustand:** `lightrag-local` (`ghcr.io/hkuds/lightrag:latest`, 2 Monate alt) läuft seit 13.11. 01:43, 0 Neustarts;
  `lightrag-db` (`pgvector/pgvector:pg16`) seit 12.11. 20:44, **4 Neustarts**. Port 9621 ist an `0.0.0.0` gebunden.
- **Aktuelles Fehlerbild (`lightrag-db`):** 11.298× `PANIC: could not write to file "pg_logical/replorigin_checkpoint.tmp": No space left on device`,
  11.300× `database system was not properly shut down; automatic recovery in progress`, 1.122× `FATAL: the database system is in recovery mode`.
  Die Datenbank lief wegen der vollen Platte in einer Absturzschleife. `lightrag-local` selbst: 0 ERROR, 44 WARNING,
  42 Aufrufe von `/documents/reprocess_failed`, zuletzt „All enqueued documents have been processed".
- **Belegte Vorgeschichte (Kommentare in der Compose-Datei):** 159 Neustarts wegen fehlender `EMBEDDING_DIM`; 401 bei der
  Entitäts-Extraktion (27.09.); Verlust des Graphen (5.467 Dokumente) bei jedem Neustart wegen falschem Mount (12.10.);
  Dokumente „failed" durch Zeitüberschreitungen (13.10.); Speichergrenze 20 GB (24.10.). „Seit Monaten Probleme" ist damit belegt –
  überwiegend Konfiguration und Betrieb, zuletzt die volle Platte.
- **Daten:** `lightrag-pg-data` 13,4 GiB (letzte Änderung 14.11. 04:07), `lightrag-data` 6,35 GiB (Dateispeicher, Stand 12.–24.10.,
  dort 4.856 Dokumente „processed"). Sicherungen: `/opt/backups/lightrag` 3,8 GiB (14.11.), `/opt/backups/lightrag-db` 7,1 GiB
  (Dumps 13.11. 0,64 GB und 14.11. 7,0 GB – der kleine vom 13.11. ist vermutlich unvollständig).
- **Modell:** `LIGHTRAG_LLM_MODEL=openrouter/deepseek-v4.1-flash-1017`, Reasoning „high", derselbe Router `172.27.0.1:20129`; Embedding wie Cognee.

### 3.4 agentmemory (kein Compose-Projekt)

- **Zustand:** systemd-Dienst `agentmemory.service` (`node /usr/bin/agentmemory` + `iii`-Engine). Quellstand `/opt/ai-stack/agentmemory`
  Version 0.9.29 (1,23 GiB, fast nur `node_modules`). Der Prozess war bei der Messung 6 Minuten alt (Start 18:24 UTC) –
  ob er regelmäßig neu startet, ist ohne Journal nicht belegt.
- **Daten:** `/root/.agentmemory` 33 MB (`standalone.json` 1,2 MB, zuletzt 14.11. 12:57). Ältere Sicherung `state_store.db` 160 MB vom 14.10.
  („vor Konsolidierung") – der Bestand war früher größer.
- **Export unter `/opt/nexifyai/brain-export/` (29.10.2026, 206 MiB):** `agentmemory` 50 JSONL-Dateien + Manifest, 49.755 Zeilen;
  `cmem` 19 Dateien; `lightrag` 294 Dateien + `lightrag-docs.csv` 31,5 MB; `lightrag-100doc-20261029` 60 Dateien.
  Der Name und `/opt/ai-stack/cognee-src/cognee/tasks/presort` deuten darauf, dass ein Import nach Cognee am 29.10. vorbereitet wurde.

### 3.5 Passt das zur Modellregel?

Die Modellnamen tragen die Endung 1017 und LightRAG setzt Reasoning „high". Nicht belegt ist, was hinter `172.27.0.1:20129` läuft
und ob dort wirklich `deepseek/deepseek-v4.1-flash-1017` bei OpenRouter ohne Ersatzmodell ankommt; für Cognee ist kein Reasoning gesetzt,
und der Compose-Vorgabewert wäre ohne `.env` `…-flash` ohne 1017. Embeddings laufen bei nscale (kein OpenRouter). agentmemory: Modell nicht ermittelt.

### 3.6 Wer hängt daran (Fundstellen, unvollständig – siehe „Nicht geprüft")

- `/opt/ai-stack/kb-gateway/gateway.py` (+ `gateway.env`): Gateway vor LightRAG, agentmemory und Cognee.
- `/opt/ai-stack/nexify-neu` (Compose-Projekt `nexify-lokal`): `deploy/.env.local`, `deploy/compose.local.yml`,
  `tools/whatsapp-webhook-receiver.py` (agentmemory), `config/*.json`.
- `/opt/ai-stack/nexify-app/server.mjs` (Container `nexify-app`), `/opt/ai-stack/orchestrator/*` (Playbooks, `memory_arch.py`),
  `/opt/ai-stack/.claude/scheduled_tasks.json` (LightRAG), `/opt/ai-stack/stack/.env` (`AGENTMEMORY_URL`).
- LibreChat `/opt/nexifyai/librechat/librechat.yaml`: agentmemory (:3111), LightRAG (:9621), Cognee.
- Kommandozeilen-Werkzeuge auf dem Server: `/root/.claude.json`, `/root/.claude/settings.json`, `/root/.codex/config.toml` – alle drei Systeme.
- Hermes `/root/.hermes/config.yaml`: **kein** Bezug (Modell-Anbieter dort `openrouter`).
- Monorepo: `config/gedaechtnis.json` legt fest: episodisch = Cognee, semantisch = LightRAG, prozedural = AgentMemory;
  16 Werkzeuge unter `tools/` (`wissen-abfrage.mjs`, `wissen-speisen.mjs`, `jeff-kontext.mjs`, `lernschleife.mjs`, `cognee.mjs` …) nennen sie.
  `ops/hermes/` nennt keines.
- Cron des Benutzers root: keine Treffer. Die nächtlichen LightRAG-Sicherungen (03:16/03:45) haben einen Auslöser, der nicht gefunden wurde.

## 4. Fachliche Bewertung (Quellen abgerufen am 14.11.2026)

| Frage | Befund | Quelle |
|---|---|---|
| Kann Cognee Graph-RAG über Dokumente? | Ja: Aufnahme, Extraktion (`cognify`), Graph + Vektor, Suche. Funktional ein Ersatz für LightRAG. | docs.cognee.ai |
| Kann Cognee Agenten-Gedächtnis? | Ja: Sitzungs-Speicher, `remember`/`recall`, Plugin für Claude Code und Codex, MCP. | Plugin 1.6.6, docs.cognee.ai |
| Fertiger Importweg von LightRAG / agentmemory? | **Nein.** Adapter gibt es für Mem0, LangMem, Letta, Zep, Graphiti und Cognee-Archive (COGX). Eigene Quelle möglich: `MemorySource` ableiten, `COGXEntity`/`COGXFact` liefern. | https://docs.cognee.ai/examples/migrate-memory-systems |
| Graph übernehmen ohne LLM? | Modus „preserve" = 0 LLM-Aufrufe, aber erst nach `cognify()` per `recall` abfragbar; mit `index_vectors=False` nur Stichwort- und Graphsuche. | ebenda |
| Mandantentrennung | Mandant → Benutzer/Rollen → Datensätze; Rechte read/write/delete/share je Datensatz; je Datensatz eigene LanceDB- und Kuzu-Datei. Kein „deny" – eine Freigabe erweitert nur. Auf dem Server ist die Zugriffskontrolle eingeschaltet. | https://docs.cognee.ai/core-concepts/multi-user-mode/permissions-system/overview |
| Sicherung/Wiederherstellung | `cognee.export(format="cogx")` schreibt ein portables Archiv; Import ist idempotent. | https://docs.cognee.ai/examples/migrate-memory-systems |
| Reife | Aktuell v1.6.8 (12.11.2026), etwa wöchentliche Versionen mit Verhaltensänderungen (v1.6.7: Datei-Eingaben strenger; v1.6.6rc1: Löschen eines Datensatzes löscht auch den Verlauf). Kuzu wurde durch Ladybug ersetzt – die Server-Daten liegen noch im Kuzu-Format. | https://github.com/topoteretes/cognee/releases |
| LightRAG Mandantentrennung | Nur über `WORKSPACE`; Mehr-Workspace-Betrieb des Servers laut Diskussion noch in Arbeit. Hier ist Cognee stärker. | github.com/HKUDS/LightRAG (Diskussion 1016, v1.4.0) |
| agentmemory | Lokaler Speicherdienst auf iii-Engine, Import `import-jsonl`; Exportformat nicht dokumentiert gefunden. | github.com/rohitg00/agentmemory |

**Kosten des Neu-Einlesens (grob, Annahmen offen):** Rohtext laut Export 31,5 MB ≈ 8–10 Mio. Token, verteilt auf rund 5.000 Dokumente
und geschätzt 12.000–20.000 Abschnitte. Cognee braucht je Abschnitt mindestens einen Extraktions-Aufruf plus Zusammenfassungen:
rund 15.000–40.000 LLM-Aufrufe, 20–30 Mio. Eingabe- und 10–40 Mio. Ausgabe-Token (Reasoning „high" zählt als Ausgabe).
Preisspanne des Modells bei OpenRouter je nach Anbieter 0,03–0,60 USD/Mio. Eingabe und 0,25–2,40 USD/Mio. Ausgabe
(https://openrouter.ai/deepseek/deepseek-v4.1-flash-1017) → **etwa 10–120 USD** für den Stand vom 29.10.; der heutige Bestand
(13,4 GiB Datenbank) kann größer sein. Dazu Embeddings bei nscale und eine Laufzeit von Tagen (LightRAG lief mit 2 parallelen Aufrufen in Zeitüberschreitungen).
Vor dem Voll-Lauf: Probelauf mit 100 Dokumenten (liegt als `lightrag-100doc-20261029` bereit) und daraus hochrechnen.

**Bekannte Schwächen einer Voll-Migration:** ein System statt drei heißt ein Ausfallpunkt – und genau dieser ist seit rund zwei Wochen
unbemerkt ausgefallen; schneller Versionswechsel; Formatwechsel Kuzu → Ladybug steht an; kein fertiger Importweg; die Architektur in
`config/gedaechtnis.json` und 16 Werkzeuge müssen nachgezogen werden; Cognee wächst mit (4096-dimensionale Vektoren), der Netto-Gewinn schrumpft.

**Empfehlung: teilweise und stufenweise.**
1. Cognee zuerst wiederherstellen, sichern, überwachen (ohne das ist jede Migration ein Datenrisiko).
2. agentmemory zuerst ablösen (33 MB Daten, Export vorhanden, Cognee deckt die Funktion ab) – bringt Ordnung, kaum Speicher (rund 1,5 GiB).
3. LightRAG erst nach bestandenem Probelauf (Abrufqualität gegen 20 feste Fragen, Kosten, Laufzeit) ablösen; bis dahin nur lesend weiterbetreiben.
4. Kundendaten nur in eigenen Datensätzen und Mandanten; vor dem ersten Kundenimport Rechte-Test mit zwei Testbenutzern.

## 5. Compose-Projekte auf srv1941843

Plattenbedarf = Images + Volumes + Projektordner, gerundet; geteilte Schichten sind mehrfach gezählt.

| Projekt | Zweck (soweit erkennbar) | Zustand | Platte | Einordnung |
|---|---|---|---|---|
| `traefik-juib` | Reverse-Proxy, TLS | läuft | 0,3 GiB | behalten (D-016: nie destruktiv); Image auf festen Digest |
| `cognee-x532` | Gedächtnis „Brain" | **defekt**: nur DB + MCP | 7,6 GiB | behalten und reparieren; Volumes sofort schützen |
| `stack` | LightRAG + DB, 9router | läuft; DB 4 Neustarts (Platte voll) | 26 GiB + 10,9 GiB Sicherungen | ablösen (LightRAG, nach Probelauf); 9router: laut Compose „abgelöst 03.10.", läuft trotzdem → Frage |
| `docker-hermes` | Orchestrierung (D-019) | läuft, 9 Tage | 3,8 GiB | behalten; Docker-Socket weiter schreibend eingehängt, Oberfläche öffentlich (siehe Befund) |
| `librechat` | Chat-Oberfläche | 4 Nebendienste laufen; **kein LibreChat-Hauptcontainer in der Liste** | 6,4 GiB | unklar → Frage: wird LibreChat noch genutzt, wo läuft die App? |
| `nexify-lokal` | Stack aus `/opt/ai-stack/nexify-neu` (App, Gateway, MCP, Web, Worker, OTel) | läuft; **Worker 205 Neustarts**, 3,7 GB Schreibschicht | 9 GiB | unklar → Frage: noch nötig neben Vercel? Worker-Schleife prüfen |
| `deploy`, `deploy-staging` | `nexi2fyi` API, DB, Scanner (Produktion und Staging) | läuft; `deploy-api` 12 Neustarts | zusammen 6,5 GiB | unklar → Frage; Staging ist Stilllege-Kandidat |
| `dsh-enterprise` | Bisheng-Plattform (10 Container: Milvus, Elasticsearch, MySQL, MinIO …) | läuft; Milvus 3 Neustarts | 13 GiB, dazu viel Arbeitsspeicher | unklar → Frage (Kundenbezug „dsh"?); großer Kandidat |
| `gitlab` | GitLab CE + Runner (nachgelagerte Spiegelung laut AGENTS.md) | läuft | 34 GiB (Prometheus 20,6, Sicherungen 4,2) | behalten, Prometheus begrenzen; oder Frage: wird die Spiegelung gebraucht? |
| `monitoring-dus` | Prometheus, Grafana, Alertmanager, Blackbox | läuft | 2,9 GiB | behalten |
| `wiki` | BookStack + MySQL | läuft | 5,5 GiB | unklar → Frage: genutzt? |
| `convex-selfhosted` | Convex-Backend + Dashboard | läuft, `:latest` | 1,5 GiB | unklar → Frage |
| `cherry-dashboard` | Cherry Studio Enterprise API + DB | läuft | 0,4 GiB | unklar → Frage |
| `crit-web-deploy` | crit-web (Review-Werkzeug) + DB | läuft, `:latest` | 0,4 GiB | unklar → Frage |
| `extern` | SearXNG (Suche für Agenten) | läuft | 0,4 GiB | behalten, wenn Agenten suchen; sonst Kandidat |
| `gowa` | WhatsApp-Web-Anbindung | läuft | 0,3 GiB | unklar → Frage (D-019: kein Kanal an Dritte ohne Freigabe) |
| `myadmin-shell` | nginx-Hülle für Admin-Oberfläche | läuft | 0,1 GiB | unklar → Frage |
| `dify-dqiq` | Dify-Stack für agenten.nexifyai.cloud | ohne Container | nur Compose-Datei (+0,4 GiB Sicherung) | stilllegen-Kandidat (Datei archivieren) |
| `headroom-qsx8` | leer | ohne Container | – | stilllegen-Kandidat |
| `nx-messung-20261114`, `nx-messung2…8-20261114` | frühere Messungen | beendet | – | entfernen (nur Projekt-Einträge) |
| `nx-messung-cognee-20261114`, `nx-messung-cognee2-20261114` | diese Messung | beendet | – | entfernen |

Außerhalb der Compose-Projekte laufen: `aionui` (rund 25 GiB), `nexify-app`, `myadmin-pg`, `nx-pg-test`, `nexify-openbao`;
als Host-Dienst `agentmemory.service`. Zusätzlich 11 unverknüpfte Volumes: zwei davon sind die Cognee-Daten, eines `librechat_librechat-data`,
acht GitLab-Runner-Zwischenspeicher (1,3 GB, gefahrlos).

**Vercel (aus dem Bericht übernommen, nicht neu erhoben):** fünf verwaiste Projekte `web`, `web-2kby`, `site`, `site-gjp7`, `site-k23m`
und ein Schwesterprojekt `…-s4k5` ohne Variablen. Einordnung: stilllegen-Kandidaten; vor dem Entfernen Domains und letzte Auslieferung je Projekt notieren.
Hinweis: `AGENTS.md` (13.11.) führt Vercel als einzigen Auslieferungsweg und Cloudflare als „nicht verfolgt" – der Umzugswunsch braucht eine neue Entscheidung in `DECISIONS.md`.

## 6. Claude-Code-Umgebung

Bestand (`~/.claude/plugins/synced`, über das claude.ai-Konto synchronisiert; `settings.json` enthält nur die Statuszeile):
**393 Plugins, 2.369 Skills, 326 Befehle, 289 Agenten, 334 MCP-Server-Definitionen, 72 Plugins mit Hooks.**
Rund 120 MCP-Server melden nur Anmelde- oder Verbindungsfehler. Doppelt installiert: `agentic-sdlc`, `grafana-assistant`,
`legal-builder-hub`, `linear`, `miro`, `modern-web-guidance`, `notion`, `sentry`.

Zwei Befunde mit Wirkung auf die Arbeit:
- **Hooks verändern Ergebnisse.** `agentone-token-compression` hat in dieser Sitzung Werkzeug-Ausgaben gekürzt („compressed Bash output … 86 % saved"),
  `agentkeeper` meldete Fehlalarme („credential_exfil", „dns_exfil") zu reinen Lesebefehlen. Für eine Agentur, die auf Belege angewiesen ist, ist gekürzte Ausgabe ein Risiko.
- **Zwölf Gedächtnis-Plugins gleichzeitig:** `cognee-memory`, `agent-memory`, `agent-recall`, `agent-archive`, `anchor-memory`, `cairn-memory`,
  `claude-memory`, `cowork-mem`, `memory-agent`, `memory-bank`, `project-memory`, `notion-memory`. Eines behalten – passend zur Entscheidung in Abschnitt 4.

**Behalten (rund 45), nach Arbeitsgebiet:**
- Web/Next.js: `vercel`, `frontend-design`, `website-design`, `modern-web-guidance` (einmal), `a11y-enforcer`, `playwright`, `typescript-lsp`, `context7`.
- Infrastruktur: `hostinger`, `cloudflare`, `docker-skills`, `github`, `gitlab`, `sentry` (einmal), `security-guidance`, `claude-security`, `supabase` (nur falls genutzt).
- Arbeitsweise: `superpowers` (eine Sammlung, nicht sechs), `code-review`, `pr-review-toolkit`, `commit-commands`, `feature-dev`,
  `skill-creator`, `plugin-dev`, `claude-md-management`, `mcp-server-dev`.
- Vertrieb/Marketing: `small-business` (in `AGENTS.md` vorgeschrieben), `sales`, `marketing`, `hubspot`, `brand-voice`, `copywriting-kit`,
  `searchfit-seo` oder `seo-audit` (eines), `slack`, `linear` (einmal), `notion` (einmal).
- Recht DE/EU: `privacy-legal` (DSGVO), `ai-governance-legal` (KI-VO), `product-legal`, `commercial-legal` – mit dem Vorbehalt, dass die Vorlagen US-geprägt sind und keine Rechtsberatung ersetzen.
- Design: `figma`, `canva`, `design`, `pdf-viewer`.
- Gedächtnis: genau eines (Vorschlag `cognee-memory`, aber erst, wenn es auf eine dauerhafte Instanz zeigt).

**Entfernen (rund 340), Beispiele nach Gruppe:**
- Ohne Bezug zur Agentur: `coach` (Fitness), `unity`, `meta-vr`, `revit-bim`, `qt-development-skills`, `flutter`, `dart-flutter`, `ESP32`, `CADBuildr`,
  `bio-research`, `clinical-trial-forecast`, `neverapply`, `career-brand`, `ghost-writer`, `learning-tutor`, `law-student`, `chrome-extension-builder`, `appstore-screenshots`.
- US-Recht und Kanzleibetrieb: `litigation-legal`, `legal-clinic`, `ip-legal` (US-Rechtsprechung), `employment-legal`, `corporate-legal`, `regulatory-legal`, `legal-builder-hub` (2×).
- Finanzmarkt: `investment-banking`, `financial-analysis`, `carta-cap-table`, `carta-investors`, `lseg`, `sp-global`, `daloopa`, `binder-gauntlet`.
- Fremde Plattformen: `abp-sensei`, `duende-skills`, `dx-office-file-api`, `accelbyte-ai-plugins`, `agentforce-adlc`, `salesforce`, `netsuite-suiteskills`,
  `servicenow-sdk`, `oracle-ai-data-platform-…`, `datarobot-agent-skills`, `headless` (Dataiku), `cockroachdb`, `planetscale`, `zilliz`, `snowflake`, `redshift`,
  `bigquery`, `datadog`, `newrelic`, `honeycomb`, `pagerduty`, `launchdarkly`, `fastly-agent-toolkit`, `streaming-skills-plugin`, `zoom-plugin`,
  `twilio-developer-kit`, `signalwire`, `voicenter-bot-builder`, `appwrite`, `base44`, `railway`, `render`, `skiffly`, `wp-dev-skills`, `elmah-io`,
  alle Sprachserver außer TypeScript (`clangd`, `csharp`, `gopls`, `jdtls`, `kotlin`, `lua`, `php`, `ruby`, `rust-analyzer`, `swift`).
- Mehrfach vorhandene Sammlungen: `beads-superpowers`, `megapowers`, `ultrapowers-dev`, `supermatt`, `mattpocock-skills`, `zizi-skills`, `agent-protocols`,
  `agentic-sdlc` (2×), `agentic-sdlc-kit`, `agentic-council`, `10x-Team`, `coding-skills`, `system-design-skills`; elf überzählige Gedächtnis-Plugins;
  Token-Sparer `agentone-token-compression`, `token-saver`, `token-shield`, `token-inspector`, `claude-context-optimizer`; `agentkeeper`.
- **Frage an den Inhaber:** `shopify-app-builder`, `shopify-devkit`, `shopify-plugin`, `liquid-skills` (der Shop ist eine eigene Anwendung, kein Shopify),
  `quickbooks-labs`, `intuit-developer` (Buchhaltung über QuickBooks?), `adobe-for-creativity`, `codesign`, `postiz`, `apollo`.

Die vollständige Namensliste (393 Einträge) lag der Arbeitssitzung als Datei vor und ist nicht Teil des Repositorys; sie lässt sich mit `/plugin manage` jederzeit neu erheben.
Entfernen kann nur der Inhaber (claude.ai-Einstellungen bzw. `/plugin manage`); in dieser Sitzung wurde nichts deinstalliert.

## 7. Ausführbarer Plan

Ausführende: **C** = Cloud-Sitzung über API (nur lesen, Snapshot anlegen), **S** = Sitzung mit Shell (Mac/SSH), **I** = nur Inhaber.
Jeder Schritt: vorher Zustand sichern, nachher zurücklesen; kein `prune`, kein `-f`, kein `--volumes` ohne ausdrückliche Freigabe.

### Phase 0 – Sofort, ohne Löschung

| Schritt | Wirkung | Risiko | Rückweg | Wer | Vorher sichern |
|---|---|---|---|---|---|
| 0.1 Im Server-Befund Schritt 2c sperren: **kein Volume- oder Image-Prune**, solange `cognee-x532_cognee-data`/`-system` unverknüpft sind | schützt 2,7 GB Wissensbestand | keines | – | C (Dokument), I | – |
| 0.2 Hostinger-Snapshot beider Server (läuft nach 24 h ab; der vom 14.11. endet am 15.11. 11:47 UTC) | 0 GiB | keines | – | C oder I | – |
| 0.3 Archivziel festlegen (siehe 7.1) | Voraussetzung für alles Weitere | Kosten | – | I | – |

### Phase 1 – Gefahrlos freigeben (abgeleitete Daten)

| Schritt | Wirkung | Risiko | Rückweg | Wer | Vorher sichern |
|---|---|---|---|---|---|
| 1.1 `/tmp/trivy`, `/tmp/opsrules-*` leeren (Zwischenspeicher) | 3,4 GiB | gering | wird neu erzeugt | S nach Freigabe | Dateiliste |
| 1.2 GitLab-Prometheus auf 15 Tage begrenzen (`gitlab.rb`, `gitlab-ctl reconfigure`) | 15–20 GiB | gering; kurzer GitLab-Neustart | `gitlab.rb` zurück | S | `gitlab.rb`, Zeitfenster mit I |
| 1.3 Acht unverknüpfte GitLab-Runner-Volumes einzeln beim Namen entfernen (nicht per Prune) | 1,3 GiB | gering | Zwischenspeicher baut sich neu | S nach Freigabe | Namensliste |
| 1.4 Zehn beendete Mess-Projekte entfernen | 0 GiB, Ordnung | keines | – | S oder I | – |

### Phase 2 – Archivieren, dann freigeben

| Schritt | Wirkung | Risiko | Rückweg | Wer | Vorher sichern |
|---|---|---|---|---|---|
| 2.1 Paperclip-Läufe: je Lauf `tar` + Kompression direkt ins Archivziel streamen (kein Zwischenarchiv auf der Platte), SHA-256 je Datei, ein Archiv probeweise zurückholen und vergleichen | 77 GiB nach Freigabe der Löschung | mittel: Platte hat nur 9,6 GB Luft, deshalb streamen | Archiv zurückspielen | S; Löschung nur I | Inhaltsverzeichnis + Prüfsummen; `agent-files` (17 MB) mitarchivieren |
| 2.2 Sicherungen auslagern: `/opt/backups`, `/opt/nexifyai/backup`, `/root/backups`, GitLab-Sicherungen | bis 28 GiB | gering | zurückkopieren | S; Löschung nur I | Prüfsummen, Rückhol-Probe |
| 2.3 Sicherungsläufe so ändern, dass sie nicht mehr auf die eigene Platte schreiben (Auslöser der LightRAG-Sicherung zuerst finden) | verhindert Wiederanstieg (11 GiB/Nacht möglich) | gering | alter Job | S | Job-Definition |

### Phase 3 – Cognee wiederherstellen (vor jeder Migration)

| Schritt | Wirkung | Risiko | Rückweg | Wer | Vorher sichern |
|---|---|---|---|---|---|
| 3.1 Die drei Cognee-Volumes und `/docker/cognee-x532` als Archiv mit Prüfsumme ins Archivziel | 0 GiB | keines | – | S | – |
| 3.2 Ursache klären, warum Container und Image `cognee/cognee` fehlen (Journal, Shell-Verlauf um den 03.–07.11.) | – | – | – | S | – |
| 3.3 Image auf **festen Digest** der zuletzt genutzten Version holen (nicht `latest`: Formatwechsel Kuzu → Ladybug), Dienst starten, `/health`, Datensatzliste, eine Suche | Cognee wieder nutzbar; braucht rund 3–4 GB freien Platz (deshalb nach Phase 1) | mittel: neuere Version könnte Daten umschreiben | Volumes aus 3.1 | S, Freigabe I | 3.1 |
| 3.4 Erste COGX-Ausfuhr je Datensatz als reguläre Sicherung; Überwachung ergänzen, die die API prüft und nicht nur den MCP | Wiederherstellbarkeit belegt | gering | – | S | – |
| 3.5 Modellweg belegen: ein Aufruf über `:20129`, Anbieter-Antwort auf Modellkennung und Reasoning prüfen | Regel-Nachweis | Kosten weniger Cent | – | S | – |

### Phase 4 – agentmemory ablösen

| Schritt | Wirkung | Risiko | Rückweg | Wer | Vorher sichern |
|---|---|---|---|---|---|
| 4.1 Frischen Export ziehen (der vorhandene ist vom 29.10.), mit `/root/.agentmemory`, `/root/.local/share/agentmemory`, Dienst-Datei und Quellordner archivieren | 0 GiB | keines | – | S | – |
| 4.2 Import nach Cognee in eigenen Datensatz (eigene `MemorySource` oder Rohtext + `cognify`), Stichprobe 20 Abfragen | Funktion ersetzt | gering; wenige USD | Datensatz verwerfen | S | 4.1 |
| 4.3 Aufrufer umstellen: `kb-gateway`, `nexify-neu`, `whatsapp-webhook-receiver.py`, `librechat.yaml`, `/root/.claude.json`, `/root/.codex/config.toml`, Monorepo `config/gedaechtnis.json` + Werkzeuge (eigener PR) | – | mittel | alte Konfiguration | S + PR | Konfigurationsdateien |
| 4.4 `agentmemory.service` stoppen und deaktivieren (nicht entfernen), 14 Tage beobachten | 0 GiB | gering | `systemctl enable --now` | S, Freigabe I | – |
| 4.5 Quellordner und Daten entfernen | 1,5 GiB | – | Archiv 4.1 | nur I | Rückhol-Probe |

### Phase 5 – LightRAG ablösen (nur nach bestandenem Probelauf)

| Schritt | Wirkung | Risiko | Rückweg | Wer | Vorher sichern |
|---|---|---|---|---|---|
| 5.1 Probelauf: 100 Dokumente in Cognee, 20 feste Fragen gegen LightRAG vergleichen, Token und Dauer messen | Entscheidungsgrundlage | 1–3 USD | Datensatz verwerfen | S | – |
| 5.2 Entscheidung Inhaber: Voll-Einlesen (10–120 USD, Tage) oder Graph-Übernahme per eigener Quelle | – | – | – | I | – |
| 5.3 Vollständiger Dump + Datenordner + Compose/`.env` ins Archivziel, Prüfsumme, Rückspiel-Probe in leere Datenbank | 0 GiB | keines | – | S | – |
| 5.4 Einlesen in Cognee, je Mandant eigener Datensatz; Aufrufer umstellen wie 4.3 | – | mittel | LightRAG läuft parallel weiter | S + PR | 5.3 |
| 5.5 `lightrag-local` und `lightrag-db` stoppen (Container und Daten bleiben), 14 Tage beobachten | 0 GiB, entlastet bis 20 GB Arbeitsspeicher | gering | `docker compose up -d` | S, Freigabe I | – |
| 5.6 Datenordner, Image, lokale Sicherungen entfernen | 19,8 + 4,5 GiB, dazu 10,9 GiB Sicherungen | – | Archiv 5.3 | nur I | Rückhol-Probe |

### Phase 6 – Übrige Installationen

Je Projekt aus Abschnitt 5 mit „unklar": Antwort des Inhabers → bei „nicht mehr gebraucht": Volumes und Compose archivieren → stoppen → 14 Tage → Entfernen nur durch Inhaber.
Größte Kandidaten: `aionui` (25 GiB), `dsh-enterprise` (13 GiB), `nexify-lokal` (9 GiB), `deploy-staging`.
Vercel: sechs Projekte nach Notiz der Domains entfernen (I). Plugins: Liste aus Abschnitt 6 (I).
Ohne Speicherwirkung, aber offen aus dem Befund: Hermes-Oberfläche hinter Zugangsschutz, Docker-Socket aus dem Hermes-Container, Images auf feste Digests.

### 7.1 Wohin archivieren

| Ziel | Platz | Kosten | Eignung |
|---|---|---|---|
| srv1243952 | 365,6 GB von 400 GiB belegt (Metrik 14.11.), also höchstens 20–35 GB frei | 0 | **ungeeignet** für 77 GiB; selbst zu voll, Inhalt nicht einsehbar |
| Cloudflare R2 `nexify-agentur-pucket` | 10 GB frei im Kontingent | darüber rund 0,015 USD je GB und Monat, kein Abrufentgelt (Preisliste nicht neu abgerufen); 120 GB ≈ 1,65 USD/Monat | **empfohlen**; Lebenszyklus-Regel und eigener Schlüssel nur für diesen Bucket |
| Hostinger-Backups | 4 automatische je Server, Snapshot 24 h | im Tarif | nur Notfall-Rückweg, kein Archiv (rollierend, ganze Platte) |
| Externe Platte am Mac des Inhabers | nach Größe | einmalig | brauchbare Zweitkopie |

Kundendaten im Archiv: vor dem Hochladen klären, ob Läufe oder Sicherungen Kundendaten enthalten; dann Verschlüsselung vor dem Upload und Eintrag im Verarbeitungsverzeichnis.

## 8. Entscheidungen des Inhabers

1. Gedächtnis: stufenweise Ablösung wie in Abschnitt 4 – ja/nein? Budget für das Neu-Einlesen (Obergrenze in USD)?
2. Archivziel: R2 mit Kosten von rund 1–2 USD je Monat – ja/nein?
3. Paperclip-Läufe (77 GiB): nach Archiv und Rückhol-Probe löschen – ja/nein?
4. GitLab: Prometheus begrenzen; wird die GitLab-Spiegelung überhaupt noch gebraucht?
5. Je Projekt: `aionui`, `dsh-enterprise`, `nexify-lokal`, `deploy`/`deploy-staging`, `librechat`, `wiki`, `convex-selfhosted`, `cherry-dashboard`, `crit-web-deploy`, `gowa`, `myadmin-shell`, `9router`, `dify-dqiq`, `headroom-qsx8` – behalten oder stilllegen?
6. Vercel: sechs Projekte entfernen; Umzug zu Cloudflare als neue Entscheidung festhalten (widerspricht `AGENTS.md` vom 13.11.)?
7. Plugins: Liste „Entfernen" freigeben; Shopify- und QuickBooks-Plugins behalten?
8. Claude-Code-Gedächtnis: Plugin auf eine dauerhafte Cognee-Instanz zeigen lassen (erst nach Phase 3) oder abschalten?

## 9. Hinterlassen und nicht geprüft

**Hinterlassen:** zwei beendete Compose-Projekte `nx-messung-cognee-20261114` und `nx-messung-cognee2-20261114` (Image `docker:27-cli`).
Zusammen mit `nx-messung-20261114` und `nx-messung2…8-20261114` stehen jetzt zehn beendete Mess-Projekte auf srv1941843.

**Nicht geprüft:**
- **srv1243952 vollständig** (Docker Manager nicht verfügbar): Dienste, Belegung, ob dort weitere Instanzen der drei Systeme laufen. Nur Metriken: Platte 365–367 GB, RAM 20,6–22,6 GB, CPU 28–45 %.
- Inhalte der Datenbanken (Zahl der Dokumente/Knoten in LightRAG-Postgres und Cognee) – keine Abfragen in laufende Container.
- Vollständige Liste der Aufrufer: die Suche fand 2.883 Dateien, davon sind die meisten der LightRAG-Quellklon; ausgewertet wurden nur die ersten Treffer. Pfade unter `/etc/` (systemd-Dienste, `cron.d`) waren nicht lesbar.
- Warum Cognee-Container und -Image fehlen; ob `agentmemory.service` in einer Neustartschleife ist; was hinter `172.27.0.1:20129` läuft; welches Modell agentmemory nutzt.
- Projekt-Protokolle über die API: der Endpunkt lieferte für laufende Projekte HTTP 500.
- Vercel und R2 wurden nicht neu erhoben; R2-Preis nicht neu abgerufen.

**Für den Skill `nexify-server-messung`:** Compose-Inhalt höchstens 8.192 Zeichen; der Protokoll-Endpunkt liefert nur die letzten rund 300 Zeilen –
lange Ausgaben seitenweise mit Pausen ausgeben und laufend abholen.

## 10. Nachtrag: Ordner `agent-files` und Hermes-Plugin (Zusatzfrage der Koordination)

- `/home/mypad/workspace/.paperclip-runtime/agent-files`: 17.224 KiB (rund 17 MB), 930 Dateien, davon 929 `.md`.
- Aufbau: zwei Ebenen aus Kennungen (UUID/UUID), darin je eine `AGENTS.md`. Beispiel: `8109a22b-…/ecc3f012-…/AGENTS.md`; alle 30 Beispiele heißen `AGENTS.md`.
- Dateinamen mit `reality-checker`, `evidence-collector`, `whimsy-injector`, `frontend-developer`, `agency-agents`: **0 Treffer**. Das Paket „Agency Agents" liegt dort nicht unter seinen Rollennamen; es sind Paperclip-Agentenanweisungen je Agent-Kennung. Inhalte wurden nicht gelesen.
- Mögliche Fundstellen des Pakets an anderer Stelle (nur Ordnernamen und Größe): `/opt/ai-stack/agency-agents-catalog` (72 MB), `/opt/ai-stack/agency-agents-app` (162 MB).
- Hermes: `/root/.hermes/plugins` existiert; ein Ordner `agency-agents-router` (oder `agency-agents*`) wurde unter `/root/.hermes`, `/root/docker-hermes` und den Docker-Volumes bis Tiefe 6 **nicht** gefunden.

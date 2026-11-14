# Cognee (`cognee-x532`, „Brain“) aufnehmen und integrieren · 14.11.2026

Auftrag des Inhabers vom 14.11.2026: „Es ist eine von Hostinger gehostete App Loesung, die aber
dokumentiert ist. Nehme auf. Vollwertige Integration von cognee-x532“. Diese Notiz hält fest, was
gemessen ist, was nur gelesen ist, wie die Integration geschnitten wird und in welchen Schritten
der Inhaber sie freigibt. Sie baut auf `docs/04-betrieb/aufraeumplan-2026-11-14.md` (Abschnitt 3.1
bis 3.5, Phase 3) und dem Registereintrag `cognee-server` auf und ersetzt beide nicht.

Kennzeichnung: **IST** = heute gemessen · **QUELLE** = gelesen, nicht gemessen · **ANNAHME** ·
**OFFEN**.

## 1. Kurzfassung

1. **Die Instanz ist heute nicht nutzbar.** Im Hostinger-Projekt laufen zwei Container
   (Datenbank und MCP), beide „healthy“. Der eigentliche Cognee-Dienst (API) hat keinen Container.
   Unter `https://brain.nexifyai.cloud` antwortet deshalb jeder API-Pfad mit 404; nur `/mcp`
   antwortet (401, Anmeldung über Traefik). Der MCP-Container zeigt auf genau diese Adresse und
   kann ohne den API-Dienst nichts speichern oder finden. „2 Container laufen“ heißt also nicht
   „Cognee läuft“. Das deckt sich mit dem Aufräumplan vom selben Tag.
2. **Kein offener Port.** Port 33019 ist laut Hostinger-API an `127.0.0.1` gebunden, und die
   Firewall des Servers lässt von außen nur 22, 80, 443 und 2222 (TCP) sowie 443, 51820 und
   51821 (UDP) zu. Ein offen erreichbarer MCP- oder API-Port ohne Anmeldung ist damit **nicht**
   belegt. Die Anzeige „33019:8000 auf 179.198.195.91“ im Panel nennt die Serveradresse, nicht
   die Bindung. Direkt von außen messen ließ sich der Port aus dieser Sitzung nicht (Abschnitt 6).
3. **Gebaut, aber aus:** Adapter `ops/cognee/` mit Aufnahme-Werkzeug, Konfiguration
   `config/integrations/cognee.json` (alle Freigaben `null`), 34 Tests gegen eine Attrappe. Ohne
   gesetzte Variablen wird nichts gesendet. Es wurde nichts aufgenommen und nichts am Server geändert.
4. **Vor jeder Aufnahme liegen beim Inhaber:** Wiederherstellung mit Sicherung (K0, K1),
   Absicherung der dann öffentlichen API (K2), Modell- und Embedding-Entscheidung (K4) und der
   Umgang des Aufnahmefilters mit Prüfsummen (Abschnitt 4.4).

## 2. IST (gemessen am 14.11.2026, UTC)

| Was | Ergebnis | Zeit | Weg |
|---|---|---|---|
| Namensauflösung `brain.nexifyai.cloud` | `172.66.43.89`, `172.66.40.167` (Cloudflare) | 20:59 | Auflösung im Sitzungs-Container |
| `http://brain.nexifyai.cloud/` | 301 nach `https://brain.nexifyai.cloud/` | 20:59 | GET |
| `https://…/`, `/health`, `/docs`, `/openapi.json`, `/sse`, `/api/v1/datasets`, `/api/v1/settings` | je 404, Text „404 page not found“ (19 Bytes), `server: cloudflare` | 20:59:16–20:59:19 | GET ohne Anmeldung |
| `https://…/mcp` | 401, `www-authenticate: Basic realm="traefik"` (GET und HEAD) | 20:59:19, 20:59:27 | GET/HEAD ohne Anmeldung |
| Firewall-Gruppe des Servers (`nexifyai-minimal-20260713`, synchron) | eingehend TCP 22, 80, 443, 2222; UDP 443, 51820, 51821; 33019 und 33018 nicht enthalten | 20:59:59 | Hostinger-API, nur GET |
| Container im Projekt `cognee-x532` | `cognee-x532-cognee-db-1` (`postgres:17-alpine`, „Up 12 days (healthy)“, 5432 nur intern); `cognee-x532-cognee-mcp-1` (`cognee/cognee-mcp@sha256:077eab41…3bb7`, „Up 12 days (healthy)“, veröffentlicht als `127.0.0.1:33019` → 8000) | 21:00:22 | Hostinger-API, nur GET |
| Dienst `cognee` (API) | in der Compose-Datei definiert (`cognee/cognee:latest`, `127.0.0.1:33018` → 8000), **kein Container** | 21:00:22 | Hostinger-API, nur GET |
| Compose-Datei des Projekts | drei Dienste; Traefik leitet `Host(brain.nexifyai.cloud)` an `cognee` (ohne vorgeschaltete Anmeldung, Wurzel wird auf `/docs` umgeleitet) und `/mcp` an `cognee-mcp` hinter `brain-auth@file`; `REQUIRE_AUTHENTICATION` und `ENABLE_BACKEND_ACCESS_CONTROL` stehen auf `True`; Speicher: Postgres (relational), LanceDB (Vektor), Kuzu (Graph), je Datensatz eigener Handler | 21:00:22 | Hostinger-API, Werte von Geheimnissen maskiert, nicht ausgegeben |
| MCP-Container | `TRANSPORT_MODE=http`, `API_URL=https://brain.nexifyai.cloud`, Image-Marke in Compose `cognee/cognee-mcp:main` | 21:00:22 | wie oben |
| Modelle der Instanz | LLM: `LLM_PROVIDER=custom`, `LLM_MODEL=openai/openrouter/deepseek-v4.1-flash-1017`, Endpunkt interner 9router `172.27.0.1:20129`, Reasoning nicht gesetzt, Compose-Vorgabewert ohne Umgebungsdatei `openrouter/deepseek-v4.1-flash` (ohne 1017). Embedding: `Qwen/Qwen3-Embedding-8B` bei `inference.api.nscale.com`, 4096 Dimensionen | 21:00:22 | wie oben |
| Sicherungen des Servers | 5 Hostinger-Backups, jüngstes 14.11.2026 16:14:57 UTC, ältestes 06.11.2026 | 21:01:05 | Hostinger-API, nur GET |
| Projektprotokoll und Projektliste | HTTP 500 (`[VPS:9999]`), nicht lesbar | 21:00–21:01 | Hostinger-API |

**Version:** Die Version des API-Dienstes ist nicht messbar (kein Container). Vom MCP-Container
ist nur der Image-Digest belegt; der Aufräumplan nennt dafür „MCP 0.5.6“ (QUELLE).

**Bestand (QUELLE, `aufraeumplan-2026-11-14.md` 3.1, nicht neu gemessen):** `cognee-system` 2,69 GB
mit 19 Datensatz-Datenbanken, `cognee-data` 8,8 MB Rohtexte, `cognee-db-data` 120 MB, Dateien vom
23.09. bis 03.11.2026. Die Volumes `cognee-data` und `cognee-system` sind unverknüpft; der
Sperrvermerk (kein Volume-Prune) gilt weiter.

## 3. QUELLE (docs.cognee.ai und Release-Liste, gelesen 14.11.2026)

Die Dokumentation trägt keine Versions- oder Datumsangabe je Seite. Aktuelle Version laut
`github.com/topoteretes/cognee/releases`: **v1.6.8 vom 12.11.2026**. Zu Hostinger steht in der
Dokumentation nichts; die „App-Lösung“ ist ein Compose-Projekt im Docker Manager von Hostinger.

| Thema | Aussage der Dokumentation | Seite |
|---|---|---|
| Aufbau | API (FastAPI unter `/api/v1`, `/health`, `/docs`), eigener MCP-Server (`stdio`, `http` unter `/mcp`, `sse`); relationale Datenbank, Vektorspeicher (LanceDB), Graphspeicher. Im API-Modus (`API_URL`, `API_TOKEN`) „gehören die Datenbanken dem Backend“, der MCP braucht also den API-Dienst. | `how-to-guides/cognee-sdk/deployment/docker`, `cognee-mcp/mcp-local-setup` |
| Graphspeicher | `kuzu` ist heute ein Alias für Ladybug; vorhandene Dateien werden weiterverwendet, sehr alte Kuzu-Dateien beim ersten Öffnen automatisch umgeschrieben. | `setup-configuration/graph-stores` |
| Anmeldung | `POST /api/v1/auth/login` (JWT, Kopf `Authorization: Bearer`) oder API-Schlüssel (Kopf `X-Api-Key`, erzeugt mit `POST /api/v1/auth/api-keys`). Mit eingeschalteter Zugriffskontrolle ist Anmeldung Pflicht. | `api-reference` (add, cognify), `cognee-mcp/mcp-local-setup` |
| Mandanten und Rechte | Mandant → Nutzer und Rollen → Datensätze; Rechte `read`, `write`, `delete`, `share` je Datensatz; nur `share` darf weitergeben; kein „deny“; Superuser umgeht Datensatzrechte nicht. Endpunkte unter `/api/v1/permissions/…` (`tenants`, `roles`, `users/{id}/roles`, `datasets/{principal_id}`). | `setup-configuration/permissions`, `core-concepts/multi-user-mode/permissions-system/overview` |
| Trennung im Speicher | Mit Zugriffskontrolle erhält jeder Datensatz eigene Dateien für Graph und Vektoren; unterstützt u. a. von Ladybug/Kuzu und LanceDB. | `setup-configuration/permissions` |
| Aufnehmen | `POST /api/v1/add` (multipart: `data`, `datasetName` oder `datasetId`). Gleicher Inhalt erneut ist ein No-op; geänderter Inhalt unter gleichem Namen ergibt 409. | `api-reference/add` |
| Graph bauen | `POST /api/v1/cognify` (Datensätze, Hintergrundlauf). Schreibweise der Felder in Text und Schema widersprüchlich (`run_in_background` / `runInBackground`). | `api-reference/cognify` |
| Suchen | `POST /api/v1/search` (`searchType`, `query`, `datasets`, `topK`); `CHUNKS` liefert Textstellen ohne Modellantwort, die `…_COMPLETION`-Arten rufen ein Modell. | `api-reference/search` |
| Vergessen | `POST /api/v1/forget` (ganzer Datensatz, einzelnes Element oder alles des Aufrufers), `DELETE /api/v1/datasets/{dataset_id}/data/{data_id}`. **Rohdateien werden in keinem Modus entfernt**; gelöschte LanceDB-Zeilen bleiben bis zur Verdichtung auf der Platte. | `core-concepts/main-operations/forget` |
| Sicherung | Export eines Datensatzes als COGX-Archiv nur über die Python-Schnittstelle (`cognee.export(…, format="cogx")`), Einspielen über `cognee.remember(COGXArchiveSource(…))`, laut Dokumentation idempotent. Kein REST-Endpunkt dafür gefunden. | `core-concepts/further-concepts/cogx`, `examples/migrate-memory-systems` |
| Aktualisierung | Images `cognee/cognee` und `cognee/cognee-mcp`; die Marken `latest` und `main` wandern mit jedem Stand, Versionsmarken gibt es je Release. Der Container führt Migrationen beim Start aus (`ENABLE_AUTO_MIGRATIONS`, Standard an). v1.6.7 nennt Verhaltensänderungen bei Dateipfaden. | `deployment/docker`, Release-Liste |
| Modelle | LLM über `LLM_PROVIDER`, `LLM_MODEL`, `LLM_ENDPOINT`, `LLM_API_KEY`; für OpenRouter `LLM_PROVIDER=custom` und Modellname mit Präfix. Ersatzmodell nur, wenn `FALLBACK_MODEL`, `FALLBACK_ENDPOINT`, `FALLBACK_API_KEY` gesetzt sind (in der Compose-Datei nicht gesetzt). Zu Reasoning-Parametern steht nichts in der Dokumentation. Embedding getrennt über `EMBEDDING_*`; ein Wechsel der Dimension verlangt Neu-Einlesen. | `setup-configuration/llm-providers`, `structured-output-backends`, `embedding-providers` |
| Plugin für Claude Code | `cognee-memory` zeigt mit `COGNEE_BASE_URL` und `COGNEE_API_KEY` auf eine entfernte Instanz. | `cognee-mcp/integrations/claude-code` |

Nicht in der Dokumentation gefunden: Pfade für Datensatz anlegen/löschen und „Nutzer zum Mandanten
hinzufügen“, Aussage zur Inkrementalität von `cognify`. Diese Punkte werden in K1 an
`/openapi.json` der wiederhergestellten Instanz gelesen.

## 4. Integrationsentwurf

### 4.1 Wer schreibt, wer liest

| Rolle | Zugang | Recht | Stand |
|---|---|---|---|
| Aufnahme aus diesem Repository (`ops/cognee/aufnahme.py`) | Dienstnutzer „aufnahme“, eigener API-Schlüssel | `write` auf die vier Agentur-Datensätze | gebaut, aus |
| Claude-Sitzungen | Dienstnutzer „lesen-claude“; Schlüssel als Netzwerk-Geheimnis der Claude-Umgebung (Kopf `X-Api-Key` für `brain.nexifyai.cloud`), Adapter im Modus `proxy` | nur `read` | Freigabe offen |
| Hermes/NeX | Dienstnutzer „lesen-hermes“, eigener Schlüssel in der Umgebungsdatei von Hermes | nur `read` | Freigabe offen; `ops/hermes/**` gehört einem anderen Schreiber |
| Website-Chat | **nicht vorgesehen.** Ein öffentlicher Chat mit Lesezugang zu internem Agenturwissen ist ein Abflussweg; ein Nutzen ist nicht belegt. Falls gewünscht: eigener Datensatz nur mit bereits öffentlichen Texten und eigener Leseschlüssel. | – | Inhaberentscheidung |

Ein Schreiber je Datensatz. Kein Dienstnutzer erhält `delete` oder `share`; beides bleibt beim
Verwalterkonto des Inhabers.

### 4.2 Was aufgenommen wird und was nicht

Aufgenommen (Positivliste in `config/integrations/cognee.json`, `quellen.aufnehmen`):
`DECISIONS.md`, `PROGRESS.md`, `GO-LIVE.md`, `AGENTS.md`, `CLAUDE.md`, die Skill-Dateien,
`docs/04-betrieb/*.md` und das Lösungsregister.

Nie aufgenommen (`quellen.nie_aufnehmen`, gewinnt immer): Umgebungs- und Schlüsseldateien,
`evidence/`, `reference/`, `apps/shop-api/`, `db/`, `backend/`, `memory/`, `media/`. Dazu ohne
Ausnahme: Geheimniswerte, personenbezogene Kundendaten ohne Rechtsgrundlage, alles aus
Kundenprojekten. Das Repository bleibt die führende Quelle; Cognee ist Suchhilfe über Sitzungen
hinweg, keine zweite Wahrheit. Ein Treffer aus Cognee wird vor einer Meldung an der Datei geprüft.

### 4.3 Datensatz-Schnitt je Mandant

| Mandant in Cognee | Datensätze | Schreiber | Leser | Löschweg |
|---|---|---|---|---|
| `nexify-agentur` | `nexify-agentur--entscheidungen`, `--stand`, `--regeln`, `--betrieb` | „aufnahme“ | „lesen-claude“, „lesen-hermes“ | Inhaber: `POST /api/v1/forget` je Datensatz, danach Rohdateien des Datensatzes im Volume `cognee-data` entfernen und Verdichtung prüfen |
| `kunde-<kürzel>` (je Kunde ein eigener Mandant) | `kunde-<kürzel>--*` | nur aus dem Kundenrepository und dessen Sitzung | eigene Nutzer des Kundenmandanten | wie oben, je Kunde vollständig; Nachweis ins Kundenrepository |

Der Adapter in diesem Repository lässt ausschließlich den Mandanten `nexify-agentur` und dessen
vier Datensätze zu; jeder andere Mandant oder Datensatzname bricht vor dem Senden ab. Kundendaten
und Agenturwissen landen damit nie im selben Datensatz. Weil Cognee kein „deny“ kennt, erhält kein
Agentur-Nutzer je ein Recht auf einen Kundendatensatz. **OFFEN:** Was in den 19 vorhandenen
Datensatz-Datenbanken liegt und ob dort Kunden- und Agenturinhalte gemischt sind, ist nicht
gemessen. Bis das gesichtet ist, werden nur neue Datensätze mit den Namen oben beschrieben; die
alten bleiben unberührt.

### 4.4 Idempotenz, Wiederholgrenzen, Fehlerbild

- **Idempotenz:** Dokumentname `<pfad>@<12 Zeichen der Prüfsumme><endung>`. Gleicher Inhalt ergibt
  denselben Namen (laut Dokumentation ein No-op), geänderter Inhalt einen neuen Namen. Live nicht
  geprüft (K5).
- **Wiederholung:** Lesende Aufrufe höchstens zweimal erneut, nur bei 502/503/504 oder Netzfehler.
  Aufnahme und Graphbau werden nie automatisch wiederholt; ein unbekannter Ausgang wird als
  `ergebnis_unbekannt` gemeldet. Ein erneuter Lauf von Hand ist wegen der Namensregel unschädlich.
- **Grenzen je Lauf:** 80 Dateien, 400.000 Bytes je Datei, 30 Sekunden je Aufruf. Der erste Fehler
  beendet den Lauf.
- **Fehlerbild:** `aus`, `freigabe_fehlt`, `konfiguration_fehlt`, `adresse_abgelehnt`,
  `mandant_abgelehnt`, `quelle_abgelehnt`, `geheimnis_gefunden` (jeweils nichts gesendet);
  `anmeldung_abgelehnt` (401), `recht_fehlt` (403), `nicht_gefunden` (404, der heutige Zustand),
  `konflikt` (409), `eingabe_abgelehnt` (422), `nicht_erreichbar`, `antwort_unlesbar`, `fehler`.
- **Geheimnis-Muster:** dieselbe Prüfung wie im Lösungsregister. **IST:** Der Plan über das
  Repository (`python3 ops/cognee/aufnahme.py plan`, 14.11.2026) nennt 54 Dateien mit 663.147 Bytes
  und endet mit `geheimnis_gefunden`: fünf Dateien enthalten lange Hex- oder Zufallsfolgen
  (`PROGRESS.md` 22, `AGENTS.md` 3, `docs/04-betrieb/indexierung-freigabe-2026-11-14.md` 3,
  `factory-postgres-foundation.md` 1, `static-preview.md` 1). Nach Art und Länge sind das
  überwiegend Commit-Kennungen und Prüfsummen; geprüft ist das nicht Zeile für Zeile. Die Prüfung
  wurde nicht gelockert. Folge: Eine echte Aufnahme liefe heute in den Abbruch, bis der Inhaber
  entscheidet (Abschnitt 8, Punkt 6).

### 4.5 Sicherung und Wiederherstellung

1. Vor jedem Eingriff: Snapshot des Servers und Archiv der drei Volumes samt `/docker/cognee-x532`
   mit Prüfsumme (Aufräumplan 3.1). Die Hostinger-Backups (jüngstes 14.11.2026 16:14 UTC) sichern
   den ganzen Server, sind aber kein geprüfter Rückweg für einzelne Volumes.
2. Laufend: wöchentliches Volume-Archiv ins Archivziel (R2, Entscheidung 2 im Aufräumplan offen),
   zusätzlich COGX-Export je Agentur-Datensatz.
3. **Prüfweg:** Archiv in ein zweites, nicht veröffentlichtes Compose-Projekt zurückspielen, fünf
   feste Fragen gegen `nexify-agentur--entscheidungen` stellen und mit dem Original vergleichen.
   Erst ein bestandener Lauf gilt als Wiederherstellungsnachweis. Bisher gibt es keinen.

Ein Zeitplan dafür ist nicht eingerichtet; diese Notiz behauptet keinen laufenden Sicherungsjob.

### 4.6 Kostenrahmen

- Aufnahme ohne Graphbau: keine Modellkosten.
- Graphbau und Antwort-Sucharten rufen das LLM der Instanz, die Aufnahme in den Vektorspeicher das
  Embedding-Modell bei nscale. Für den vollen Altbestand nennt der Aufräumplan grob 10–120 USD
  (ANNAHME dort). Für die 54 Dateien des Agenturwissens (0,66 MB Text) liegt der Bedarf weit
  darunter; eine Zahl gibt es erst nach dem Probelauf K5, der Token und Dauer misst.
- Der Adapter verweigert Graphbau und Antwort-Sucharten, solange die Freigaben
  `modell_und_embedding_bestaetigt` und `graph_bauen_mit_kostenrahmen` nicht gesetzt sind.
- Serverplatz: Wiederherstellung braucht laut Aufräumplan 3–4 GB frei.

### 4.7 Rückweg der Integration

Schalter aus (Variablen entfernen) beendet jede Wirkung des Adapters sofort. Aufgenommene
Agentur-Datensätze lassen sich einzeln vergessen (4.3). Der Code liegt in neuen Dateien; ein
Revert des PR entfernt ihn ohne Wirkung auf andere Bausteine. `tools/cognee.mjs` und
`config/gedaechtnis.json` sind unverändert.

## 5. Einspielschritte

Jeder Schritt braucht die Freigabe des Inhabers; „S“ = Sitzung mit Shell auf dem Server.

| Schritt | Was | Prüfung | Rückweg |
|---|---|---|---|
| **K0** Sichern | Snapshot; Archiv der drei Volumes und des Projektordners mit Prüfsumme (S) | Archiv lesbar, Prüfsumme notiert | keiner nötig (nur lesend) |
| **K1** API-Dienst wiederherstellen | Ursache des fehlenden Containers klären; Image auf festen Stand statt `latest` (zuletzt genutzte Version, nicht ungeprüft v1.6.8: Migration läuft beim Start), ebenso `cognee-mcp` statt `main`; Dienst starten (S) | `/health` 200, `/openapi.json` lesbar, Datensatzliste mit Verwalterkonto, eine Suche; MCP-Protokoll ohne `PoolTimeout` | Container stoppen, Volumes aus K0 |
| **K2** Öffentliche Fläche entscheiden | Nach K1 ist die ganze API samt `/docs` öffentlich erreichbar, geschützt nur durch die Anmeldung von Cognee. Wege: (a) Cloudflare Access vor `brain.nexifyai.cloud` mit Dienst-Token für Maschinen; (b) Traefik-Anmeldung `brain-auth` auch vor die API; (c) so lassen | von außen ohne Zugang: kein 200 auf `/docs`, `/openapi.json`, `/api/v1/*` | Regel bzw. Label entfernen |
| **K3** Mandant und Schlüssel | Mandant `nexify-agentur`, Rollen, drei Dienstnutzer, je ein API-Schlüssel; Werte nur in die Geheimnisspeicher; `API_TOKEN` des MCP auf einen API-Schlüssel umstellen, falls es ein ablaufendes Anmelde-Token ist (OFFEN) | Register: Zugänge mit Ablageort, ohne Wert | Schlüssel widerrufen |
| **K4** Modelle bestätigen | Abschnitt 8, Punkte 1 und 2 entscheiden; Compose-Vorgabewert ohne 1017 beseitigen | Aufruf am Router zeigt genau das entschiedene Modell | alte Werte der Umgebungsdatei |
| **K5** Probe-Aufnahme | Freigabe `aufnahme_agenturwissen` setzen; fünf Dokumente in `nexify-agentur--entscheidungen`, zweimal senden; Graphbau; fünf feste Fragen | zweiter Lauf erzeugt nichts Neues; Antworten mit Fundstelle; Token und Dauer gemessen | Datensatz vergessen |
| **K6** Rechteprobe | Leseschlüssel darf nicht schreiben; Agentur-Schlüssel sieht einen Testdatensatz `kunde-test--probe` eines zweiten Mandanten nicht | 403 bzw. leere Liste, protokolliert | Testmandant entfernen |
| **K7** Regelaufnahme | Aufnahme nach Merge auf `main`, zuerst von Hand; ein Zeitplan erst nach Entscheidung und Prüfung vorhandener Zeitpläne | Lauf meldet `ok`, Stichprobe von drei Fragen | Schalter aus |
| **K8** Leser anbinden | Claude-Sitzungen (Netzwerk-Geheimnis, Modus `proxy`), danach Hermes | je eine Suche mit `CHUNKS` | Geheimnis entfernen |
| **K9** Betrieb | Sicherung mit Rückspielprobe (4.5), Zustandsprüfung von `/health` im bestehenden Monitoring, Versionswechsel nur mit K0 davor | Rückspielprobe bestanden, Alarm ausgelöst und empfangen | – |

Nicht Teil dieser Notiz: Ablösung von LightRAG und agentmemory (OA-144, Entscheidung 1 im
Aufräumplan) und das lokale Plugin (Entscheidung 8).

## 6. Was nicht geprüft ist

- **Port 33019 direkt von außen:** Der Sitzungs-Container erlaubt keine Verbindung auf beliebige
  Ports (Verbindung im Container abgelehnt, Tunnel über den Proxy 502). Belegt sind Bindung und
  Firewall-Regel über die Hostinger-API, nicht ein Verbindungsversuch aus dem Internet.
- **TLS-Zertifikat:** Die Sitzung sieht nur das Zertifikat ihres eigenen Ausgangs-Proxys. Aussteller
  und Laufzeit des echten Zertifikats sind nicht gemessen.
- **Anmeldung:** kein Anmeldeversuch an `/mcp` oder der API, keine Schreib- oder Löschaufrufe.
- **Inhalt:** Datensätze, Nutzer, Mandanten und Protokolle der Instanz; Ursache des fehlenden
  API-Containers; ob `REQUIRE_AUTHENTICATION` wirksam ist (Dienst läuft nicht).
- **Router:** was hinter `172.27.0.1:20129` läuft und welches Modell dort tatsächlich ankommt.
- **Dokumentation:** nur die genannten Seiten; lange Seiten kamen gekürzt an.
- **Adapter gegen die echte Instanz:** kein Aufruf. Die Feldnamen von `cognify` sind laut
  Dokumentation uneinheitlich und werden in K5 an `/openapi.json` geprüft.

Hinweis zur Messung: Der Projektabruf der Hostinger-API liefert die Umgebungsdatei des Projekts
mit allen Werten. Die Werte wurden maskiert, nicht ausgegeben und nicht gespeichert; die
Zwischendatei im Sitzungs-Container ist entfernt. Wer den Hostinger-Schlüssel der Umgebung hat,
kann diese Werte lesen; das gehört in die Bewertung dieses Schlüssels im Lösungsregister.

## 7. Abnahmeliste

- [ ] K0: Archiv und Snapshot vorhanden, Prüfsumme notiert.
- [ ] K1: `/health` 200; Version und Digest beider Images fest und notiert.
- [ ] K2: Entscheidung getroffen; von außen ohne Zugang kein 200 auf API-Pfaden.
- [ ] K3: Mandant, drei Dienstnutzer, Schlüssel in den Geheimnisspeichern; Register nachgeführt.
- [ ] K4: Modell und Embedding entschieden und am Router belegt.
- [ ] K5: Probe-Aufnahme zweimal, zweiter Lauf ohne neue Einträge; fünf Fragen mit Fundstelle; Kosten gemessen.
- [ ] K6: Rechteprobe bestanden (Lesen ohne Schreiben; kein Zugriff über Mandanten hinweg).
- [ ] K7: Regelaufnahme einmal von Hand `ok`.
- [ ] K8: Claude-Sitzung und Hermes lesen je eine Fundstelle.
- [ ] K9: Rückspielprobe bestanden; Alarm bei Ausfall geprüft.
- [ ] Löschweg einmal an einem Testdatensatz bis zu den Rohdateien nachvollzogen.
- [x] Adapter aus: 34 Tests gegen Attrappe grün (`python3 -m unittest tests.test_cognee_adapter`).

## 8. Offene Inhaberentscheidungen

1. **LLM der Instanz:** Der Name `openai/openrouter/deepseek-v4.1-flash-1017` am 9router ist nicht
   die Kennung der Projektvorgabe (`deepseek/deepseek-v4.1-flash-1017`), Reasoning „high“ ist für
   Cognee nicht gesetzt und laut Dokumentation dort nicht vorgesehen. Gilt die Vorgabe für Cognee
   als erfüllt, wenn der Router nachweislich genau dieses Modell ruft, oder soll Cognee ohne
   Router direkt an OpenRouter gebunden werden?
2. **Embedding:** `Qwen/Qwen3-Embedding-8B` bei nscale ist kein OpenRouter-Modell; Texte gehen
   dafür an einen weiteren Anbieter. Beibehalten (sonst Neu-Einlesen des Bestands) oder wechseln?
3. **K0/K1:** Wiederherstellung freigeben, mit welcher festen Version?
4. **K2:** Welche Absicherung vor der öffentlichen API (a, b oder c)?
5. **Leser:** Claude-Sitzungen und Hermes ja; Website-Chat nein – bestätigen oder ändern.
6. **Aufnahmefilter:** Dürfen Commit-Kennungen und Prüfsummen als geprüfte Ausnahme durch
   (eigene Regel im Prüfwerkzeug, mit Review), oder bleiben die fünf Dateien ausgeschlossen?
7. **Altbestand:** Die 19 vorhandenen Datensätze sichten und Mandanten zuordnen, oder archivieren
   und neu beginnen?
8. **Kostenobergrenze** für Graphbau und Antwort-Sucharten in USD je Monat.
9. **Sicherung:** Archivziel und Rhythmus (hängt an Entscheidung 2 im Aufräumplan).

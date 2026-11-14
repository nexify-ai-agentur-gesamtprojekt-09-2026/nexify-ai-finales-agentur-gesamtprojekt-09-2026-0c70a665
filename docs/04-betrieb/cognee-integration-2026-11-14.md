# Cognee (`cognee-x532`, „Brain“) aufnehmen und integrieren · 14.11.2026

Auftrag des Inhabers vom 14.11.2026: „Es ist eine von Hostinger gehostete App Loesung, die aber
dokumentiert ist. Nehme auf. Vollwertige Integration von cognee-x532“. Diese Notiz hält fest, was
gemessen ist, was nur gelesen ist, wie die Integration geschnitten wird und in welchen Schritten
der Inhaber sie freigibt. Sie baut auf `docs/04-betrieb/aufraeumplan-2026-11-14.md` (Abschnitt 3.1
bis 3.5, Phase 3) und dem Registereintrag `cognee-server` auf und ersetzt beide nicht.

Fassung 2 vom 14.11.2026, nach der unabhängigen Prüfung von PR 197 (19 Befunde, Abschnitt 9).
Gegenüber Fassung 1 ist die Schrittfolge umgestellt: Die Absicherung der API ist jetzt K1 und
liegt vor der Wiederherstellung (K2).

Kennzeichnung: **IST** = heute gemessen · **QUELLE** = gelesen, nicht gemessen · **ANNAHME** ·
**OFFEN**.

> **SPERRVERMERK (gilt für jeden Schritt):** Die Volumes `cognee-x532_cognee-data` und
> `cognee-x532_cognee-system` sind an keinen Container gebunden; Docker führt sie als ungenutzt.
> **Kein `docker volume prune`, kein `docker system prune --volumes`, kein „ungenutzte Volumes
> entfernen“ auf srv1941843**, solange das so ist. Ein Prune löscht den gesamten Bestand.

## 1. Kurzfassung

1. **Die Instanz ist heute nicht nutzbar.** Im Hostinger-Projekt laufen zwei Container
   (Datenbank und MCP), beide „healthy“. Der eigentliche Cognee-Dienst (API) hat keinen Container.
   Unter `https://brain.nexifyai.cloud` antwortet deshalb jeder API-Pfad mit 404; nur `/mcp`
   antwortet (401, Anmeldung über Traefik). Der MCP-Container zeigt auf genau diese Adresse und
   kann ohne den API-Dienst nichts speichern oder finden. „2 Container laufen“ heißt also nicht
   „Cognee läuft“. Das deckt sich mit dem Aufräumplan vom selben Tag.
2. **Kein offener Port belegt.** Port 33019 ist laut Hostinger-API an `127.0.0.1` gebunden, und
   die Firewall des Servers lässt von außen nur 22, 80, 443 und 2222 (TCP) sowie 443, 51820 und
   51821 (UDP) zu. Die Anzeige „33019:8000 auf 179.198.195.91“ im Panel nennt die Serveradresse,
   nicht die Bindung. Ein Verbindungsversuch von außen fand nicht statt (Abschnitt 6).
3. **Gebaut, aber aus:** Adapter `ops/cognee/` mit Aufnahme-Werkzeug, Konfiguration
   `config/integrations/cognee.json` (alle Freigaben `null`), 68 Tests. Ohne gesetzte Variablen
   wird nichts gesendet; jede Wirkung, auch eine lesende, braucht zusätzlich Rolle und
   Freigaben. Es wurde nichts aufgenommen und nichts am Server geändert.
4. **Vor jeder Aufnahme liegen beim Inhaber:** Sicherung (K0), Absicherung der API (K1),
   Wiederherstellung (K2), Modell- und Embedding-Entscheidung (K4) und der Umgang des
   Aufnahmefilters mit Kennungen und Prüfsummen (Abschnitt 4.4).

## 2. IST (gemessen am 14.11.2026, UTC)

| Was | Ergebnis | Zeit | Weg |
|---|---|---|---|
| Namensauflösung `brain.nexifyai.cloud` | `172.66.43.89`, `172.66.40.167` (Cloudflare) | 20:59 | Auflösung im Sitzungs-Container |
| `http://brain.nexifyai.cloud/` | 301 nach `https://brain.nexifyai.cloud/` | 20:59 | GET |
| `https://…/`, `/health`, `/docs`, `/openapi.json`, `/sse`, `/api/v1/datasets`, `/api/v1/settings` | je 404, Text „404 page not found“ (19 Bytes), `server: cloudflare` | 20:59:16–20:59:19 | GET ohne Anmeldung |
| `https://…/mcp` | 401, `www-authenticate: Basic realm="traefik"` (GET und HEAD) | 20:59:19, 20:59:27 | GET/HEAD ohne Anmeldung |
| Firewall-Gruppe des Servers (`nexifyai-minimal-20260713`, synchron) | eingehend TCP 22, 80, 443, 2222; UDP 443, 51820, 51821; 33019 und 33018 nicht enthalten | 20:59:59 | Hostinger-API, nur GET |
| Container im Projekt `cognee-x532` | `cognee-x532-cognee-db-1` (`postgres:17-alpine`, „Up 12 days (healthy)“, 5432 nur intern); `cognee-x532-cognee-mcp-1` (Image `cognee/cognee-mcp` mit festem Digest, „Up 12 days (healthy)“, veröffentlicht als `127.0.0.1:33019` → 8000) | 21:00:22 | Hostinger-API, nur GET |
| Dienst `cognee` (API) | in der Compose-Datei definiert (`cognee/cognee:latest`, `127.0.0.1:33018` → 8000), **kein Container** | 21:00:22 | Hostinger-API, nur GET |
| Compose-Datei des Projekts | drei Dienste; Traefik leitet `Host(brain.nexifyai.cloud)` an `cognee` (ohne vorgeschaltete Anmeldung, Wurzel wird auf `/docs` umgeleitet) und `/mcp` an `cognee-mcp` hinter `brain-auth@file`; `REQUIRE_AUTHENTICATION` und `ENABLE_BACKEND_ACCESS_CONTROL` stehen auf `True`; Speicher: Postgres (relational), LanceDB (Vektor), Kuzu (Graph), je Datensatz eigener Handler | 21:00:22 | Hostinger-API, Werte von Geheimnissen maskiert, nicht ausgegeben |
| MCP-Container | `TRANSPORT_MODE=http`, `API_URL=https://brain.nexifyai.cloud`, Image-Marke in Compose `cognee/cognee-mcp:main` | 21:00:22 | wie oben |
| Modelle der Instanz | LLM: `LLM_PROVIDER=custom`, `LLM_MODEL=openai/openrouter/deepseek-v4.1-flash-1017`, Endpunkt interner 9router `172.27.0.1:20129`, Reasoning nicht gesetzt, Compose-Vorgabewert ohne Umgebungsdatei `openrouter/deepseek-v4.1-flash` (ohne 1017). Embedding: `Qwen/Qwen3-Embedding-8B` bei `inference.api.nscale.com`, 4096 Dimensionen | 21:00:22 | wie oben |
| Sicherungen des Servers | 5 Hostinger-Backups, jüngstes 14.11.2026 16:14:57 UTC, ältestes 06.11.2026 | 21:01:05 | Hostinger-API, nur GET |
| Projektprotokoll und Projektliste | HTTP 500 (`[VPS:9999]`), nicht lesbar | 21:00–21:01 | Hostinger-API |

Die unabhängige Prüfung hat Auflösung, Statuscodes, Bindung des Ports, Containerliste und
Firewall am selben Abend (21:23–21:29 UTC) selbst gemessen und bestätigt. Nur von dieser Sitzung
gelesen und nicht gegengeprüft sind der Inhalt der Compose-Datei und die Liste der Backups.

**Version:** Die Version des API-Dienstes ist nicht messbar (kein Container). Vom MCP-Container
ist nur der Image-Digest belegt; der Aufräumplan nennt dafür „MCP 0.5.6“ (QUELLE).

**Bestand (QUELLE, `aufraeumplan-2026-11-14.md` 3.1, nicht neu gemessen):** `cognee-system` 2,69 GB
mit 19 Datensatz-Datenbanken, `cognee-data` 8,8 MB Rohtexte, `cognee-db-data` 120 MB, Dateien vom
23.09. bis 03.11.2026.

## 3. QUELLE (docs.cognee.ai und Release-Liste, gelesen 14.11.2026)

Die Dokumentation trägt keine Versions- oder Datumsangabe je Seite. Aktuelle Version laut
`github.com/topoteretes/cognee/releases`: **v1.6.8 vom 12.11.2026**. Zu Hostinger steht in der
Dokumentation nichts; die „App-Lösung“ ist ein Compose-Projekt im Docker Manager von Hostinger.
Die Spalte „Stand“ nennt, ob die unabhängige Prüfung die Aussage an der Dokumentation bestätigt hat.

| Thema | Aussage | Seite | Stand |
|---|---|---|---|
| Aufbau | API (FastAPI unter `/api/v1`, `/health`, `/docs`), eigener MCP-Server (`stdio`, `http` unter `/mcp`, `sse`); relationale Datenbank, Vektorspeicher (LanceDB), Graphspeicher. Im API-Modus (`API_URL`, `API_TOKEN`) braucht der MCP den API-Dienst. | `how-to-guides/cognee-sdk/deployment/docker`, `cognee-mcp/mcp-local-setup` | bestätigt |
| Graphspeicher | `kuzu` ist heute ein Alias für Ladybug; alte Dateien werden beim ersten Öffnen umgeschrieben. | `setup-configuration/graph-stores` | bestätigt |
| Anmeldung | `POST /api/v1/auth/login` (JWT, Kopf `Authorization: Bearer`) oder API-Schlüssel (Kopf `X-Api-Key`, erzeugt mit `POST /api/v1/auth/api-keys`). | `api-reference`, `cognee-mcp/mcp-local-setup` | bestätigt |
| Rechte | `read`, `write`, `delete`, `share` je Datensatz; Superuser umgeht sie nicht. | `setup-configuration/permissions` | bestätigt |
| „Kein deny“ | Für Fähigkeiten (`manage_users` usw.) belegt. **OFFEN** für Datensatzrechte: Ob ein einmal erteiltes Datensatzrecht durch eine Sperre überstimmt werden kann, steht auf den gelesenen Seiten nicht. Der Entwurf verlässt sich nicht darauf (4.3). | `core-concepts/multi-user-mode/permissions-system/overview` | nur teilweise |
| Rollen-Endpunkte | `/api/v1/permissions/tenants`, `/roles`, `/users/{id}/roles`, `/datasets/{principal_id}` (QUELLE dieser Sitzung). | `api-reference/permissions/*` | von der Prüfung nicht gelesen |
| Trennung im Speicher | Mit Zugriffskontrolle eigene Dateien je Datensatz für Graph und Vektoren. | `setup-configuration/permissions` | bestätigt |
| Aufnehmen | `POST /api/v1/add` (multipart: `data`, `datasetName` oder `datasetId`). **Die Deduplizierung läuft über die Inhaltsprüfsumme**, nicht über den Namen: gleicher Inhalt erneut ist ein No-op. 409 heißt, dass die Datei im Datensatz mit anderem Inhalt vorliegt. Ob dafür der Name maßgeblich ist, ist **OFFEN** und wird in K5 geprüft. | `api-reference/add` | bestätigt, Namensbezug offen |
| Graph bauen | `POST /api/v1/cognify`; der Fließtext nennt `datasets`, `dataset_ids`, `run_in_background` mit Standard „blockierend“, das Schema camelCase. Der Adapter sendet `run_in_background`. **OFFEN:** an `/openapi.json` der Instanz prüfen (K2). | `api-reference/cognify` | uneinheitlich |
| Suchen | `POST /api/v1/search` (`searchType`, `query`, `datasets`, `datasetIds`, `topK`). Dass `CHUNKS` kein Sprachmodell ruft, ist nur allgemein belegt („Retrieval-only … No LLM call“); die Frage wird für die Suche eingebettet (ANNAHME: beim Embedding-Anbieter der Instanz). | `api-reference/search` | Felder bestätigt |
| Vergessen | `POST /api/v1/forget`, `DELETE /api/v1/datasets/{dataset_id}/data/{data_id}`. **Rohdateien werden in keinem Modus entfernt**; gelöschte LanceDB-Zeilen bleiben bis zur Verdichtung auf der Platte. | `core-concepts/main-operations/forget` | bestätigt |
| Ersetzen | `PATCH /api/v1/update?data_id=…&dataset_id=…` für geänderte Inhalte (QUELLE dieser Sitzung). | `api-reference/add` | nicht gegengeprüft |
| Sicherung über COGX | **OFFEN.** Diese Sitzung hat `cognee.export(…, format="cogx")`, `COGXArchiveSource` und „idempotent“ aus der Auswertung zweier Seiten übernommen; die Prüfung fand diese Angaben auf der COGX-Seite nicht. Bis zur Klärung trägt der Entwurf keine Sicherung über COGX (4.5). | `core-concepts/further-concepts/cogx`, `examples/migrate-memory-systems` | nicht bestätigt |
| Aktualisierung | Images `cognee/cognee` und `cognee/cognee-mcp`; die Marken `latest` und `main` wandern, Versionsmarken gibt es je Release. Migrationen laufen beim Start (`ENABLE_AUTO_MIGRATIONS`, Standard an). | `deployment/docker`, Release-Liste | bestätigt |
| Modelle | `LLM_PROVIDER=custom` für OpenRouter; Ersatzmodell nur mit `FALLBACK_MODEL`, `FALLBACK_ENDPOINT`, `FALLBACK_API_KEY` (in der Compose-Datei nicht gesetzt); kein Reasoning-Parameter dokumentiert. Embedding getrennt über `EMBEDDING_*`; ein Wechsel der Dimension verlangt Neu-Einlesen. | `setup-configuration/llm-providers`, `structured-output-backends`, `embedding-providers` | bestätigt |
| Plugin für Claude Code | `cognee-memory` zeigt mit `COGNEE_BASE_URL` und `COGNEE_API_KEY` auf eine entfernte Instanz. | `cognee-mcp/integrations/claude-code` | nicht gegengeprüft |

Nicht in der Dokumentation gefunden: Pfade für Datensatz anlegen/löschen und „Nutzer zum Mandanten
hinzufügen“, Aussage zur Inkrementalität von `cognify`, ob ein Leser Datensätze eines anderen
Eigentümers über den Namen ansprechen kann. Diese Punkte werden in K2 an `/openapi.json` der
wiederhergestellten Instanz gelesen.

## 4. Integrationsentwurf

### 4.1 Wer schreibt, wer liest

| Rolle (`COGNEE_ROLE`) | Zugang | Darf im Adapter | Recht auf der Instanz | Stand |
|---|---|---|---|---|
| `aufnahme` (dieses Repository, `ops/cognee/aufnahme.py`) | eigener API-Schlüssel | Zustand, Datensatzliste, Aufnehmen, Graph bauen; **nicht** suchen | `write` auf die vier Agentur-Datensätze | gebaut, aus |
| `lesen-claude` (Claude-Sitzungen) | Schlüssel als Netzwerk-Geheimnis der Claude-Umgebung (Kopf `X-Api-Key` für `brain.nexifyai.cloud`), Adapter im Modus `proxy` | Zustand, Datensatzliste, Suchen; **nicht** aufnehmen | nur `read` | Freigabe offen |
| `lesen-hermes` (Hermes/NeX) | eigener Schlüssel in der Umgebungsdatei von Hermes | wie `lesen-claude` | nur `read` | Freigabe offen; `ops/hermes/**` gehört einem anderen Schreiber |
| Website-Chat | **nicht vorgesehen und im Adapter nicht möglich** (keine Rolle). Ein öffentlicher Chat mit Lesezugang zu internem Agenturwissen ist ein Abflussweg; ein Nutzen ist nicht belegt. | – | – | Inhaberentscheidung |

Ein Schreiber je Datensatz. Kein Dienstnutzer erhält `delete` oder `share`; beides bleibt beim
Verwalterkonto des Inhabers.

**Freigaben im Adapter.** Jede Wirkung braucht den Hauptschalter, die Freigabe ihrer Rolle und die
Freigaben der Wirkung. Das gilt auch für lesende Aufrufe; in Fassung 1 war das nicht so.

| Wirkung | Freigaben (zusätzlich zur Rolle) | gesetzt nach |
|---|---|---|
| Zustand lesen | `instanz_wiederhergestellt_und_gesichert` | K2 |
| Datensatzliste | dazu `mandant_und_dienstschluessel_angelegt` | K3 |
| Aufnehmen (Rolle: `aufnahme_agenturwissen`) | wie Datensatzliste | K5 |
| Graph bauen | dazu `modell_und_embedding_bestaetigt`, `graph_bauen_mit_kostenrahmen` | K4, K5 |
| Suchen (Rolle: `leser_claude_sitzungen` bzw. `leser_hermes`) | Datensatzliste, dazu `rechteprobe_bestanden`, `modell_und_embedding_bestaetigt` (die Frage wird eingebettet) | K6, K9 |
| Antwortsuche (`…_COMPLETION`, ruft ein Sprachmodell) | wie Suchen, dazu `antwortsuche_mit_kostenrahmen` | K7 |

### 4.2 Was aufgenommen wird und was nicht

Aufgenommen (Positivliste in `config/integrations/cognee.json`, `quellen.aufnehmen`):
`DECISIONS.md`, `PROGRESS.md`, `GO-LIVE.md`, `AGENTS.md`, `CLAUDE.md`, die Skill-Dateien,
`docs/04-betrieb/*.md` und das Lösungsregister.

Nie aufgenommen (`quellen.nie_aufnehmen`, gewinnt immer): Umgebungs- und Schlüsseldateien,
`evidence/`, `reference/`, `apps/shop-api/`, `db/`, `backend/`, `memory/`, `media/`. Dazu ohne
Ausnahme: Geheimniswerte, personenbezogene Kundendaten ohne Rechtsgrundlage, alles aus
Kundenprojekten.

**Die Positivliste ist der Schutz.** Der Adapter nimmt nur einen Pfad an, der dort steht, nur in
den dort genannten Datensatz, nur in einfacher Schreibweise (kein `..`, kein `./`, keine
Sonderzeichen), und das Werkzeug verfolgt keine symbolischen Verknüpfungen. Die Herkunft eines
Inhalts kann der Adapter nicht prüfen: Wer `add_document` mit einem zulässigen Pfad und fremdem
Inhalt aufruft, bringt diesen Inhalt in den Agentur-Datensatz. Deshalb läuft die Aufnahme nur
über das Werkzeug und nur aus einem sauberen Checkout von `main`.

Das Repository bleibt die führende Quelle; Cognee ist Suchhilfe über Sitzungen hinweg, keine
zweite Wahrheit. Ein Treffer aus Cognee wird vor einer Meldung an der Datei geprüft.

### 4.3 Datensatz-Schnitt je Mandant

| Mandant in Cognee | Datensätze | Schreiber | Leser | Löschweg |
|---|---|---|---|---|
| `nexify-agentur` | `nexify-agentur--entscheidungen`, `--stand`, `--regeln`, `--betrieb` | Rolle `aufnahme` | Rollen `lesen-claude`, `lesen-hermes` | Inhaber: `POST /api/v1/forget` je Datensatz, danach Rohdateien des Datensatzes im Volume `cognee-data` entfernen und Verdichtung prüfen |
| `kunde-<kürzel>` (je Kunde ein eigener Mandant) | `kunde-<kürzel>--*` | nur aus dem Kundenrepository und dessen Sitzung | eigene Nutzer des Kundenmandanten | wie oben, je Kunde vollständig; Nachweis ins Kundenrepository |

Der Adapter in diesem Repository lässt ausschließlich den Mandanten `nexify-agentur` und dessen
vier Datensätze zu; jeder andere Mandant oder Datensatzname bricht vor dem Senden ab. Kein
Agentur-Nutzer erhält je ein Recht auf einen Kundendatensatz; die Trennung stützt sich darauf,
dass ein Recht nie erteilt wird, nicht auf eine Sperre (siehe „Kein deny“, Abschnitt 3).

Leser sprechen Datensätze über deren Kennung (UUID) an, nicht über den Namen, weil Namen je
Eigentümer gelten können (Hinweis der automatischen Durchsicht, an der Instanz nicht geprüft).
Die Kennungen sind nicht geheim, stehen nach K5 in der Konfiguration und sind dort heute `null`;
ohne Kennung sucht der Adapter nicht.

**OFFEN:** Was in den 19 vorhandenen Datensatz-Datenbanken liegt und ob dort Kunden- und
Agenturinhalte gemischt sind, ist nicht gemessen. Bis das gesichtet ist, werden nur neue
Datensätze mit den Namen oben beschrieben; die alten bleiben unberührt.

### 4.4 Idempotenz, Wiederholgrenzen, Fehlerbild, Filter

- **Idempotenz:** Ein Dokumentname je Pfad (`docs~04-betrieb~x.md`). Gleicher Inhalt erneut ist
  laut Dokumentation ein No-op (Inhaltsprüfsumme). Live nicht geprüft (K5).
- **Veraltete Fassungen:** Ändert sich eine Datei, meldet die Instanz laut Dokumentation 409. Der
  Adapter wertet das **nicht** als Erfolg: Das Werkzeug meldet `fassung_veraltet` je Datei und
  endet mit `abloesung_noetig`. Die Ablösung selbst (laut Dokumentation `PATCH /api/v1/update`,
  braucht die Kennung des alten Eintrags) ist **nicht gebaut**, weil sie alten Inhalt auf der
  Instanz ersetzt und an der echten Schnittstelle geprüft sein muss. Sie ist Teil von K8 und
  braucht eine eigene Freigabe. Bis dahin gilt: Eine geänderte Datei wird nicht doppelt
  aufgenommen, die Suche kann aber den älteren Stand liefern; das Repository bleibt maßgeblich.
- **Wiederholung:** Zustand, Datensatzliste und einfache Suche höchstens zweimal erneut (2 und 4
  Sekunden Pause), nur bei 502/503/504 oder Netzfehler. Aufnahme, Graphbau und Antwortsuche
  werden nie automatisch wiederholt; ein unbekannter Ausgang wird als `ergebnis_unbekannt`
  gemeldet.
- **Grenzen:** 80 Dateien je Lauf, 400.000 Bytes je Datei, 30 Sekunden Gesamtfrist je Aufruf (im
  Code auf höchstens 60 gedeckelt), höchstens 25 Treffer, höchstens 2 MB Antwort, Frage höchstens
  2.000 Zeichen. Der erste Fehler beendet den Lauf. Weiterleitungen werden nicht verfolgt.
- **Fehlerbild:** `aus`, `freigabe_fehlt`, `rolle_abgelehnt`, `konfiguration_fehlt`,
  `adresse_abgelehnt`, `mandant_abgelehnt`, `quelle_abgelehnt`, `eingabe_abgelehnt`,
  `geheimnis_gefunden` (jeweils nichts gesendet); `anmeldung_abgelehnt` (401), `recht_fehlt` (403),
  `nicht_gefunden` (404, der heutige Zustand), `konflikt` (409), `eingabe_abgelehnt` (422),
  `nicht_erreichbar`, `antwort_unlesbar`, `antwort_zu_gross`, `fehler`. Der Rumpf einer
  Fehlerantwort und der Text eines Netzfehlers werden nie weitergegeben.

**Der Geheimnis-Filter ist ein Musterabgleich, kein Schutz.** Er erkennt gängige Schlüsselformen
(Muster des Lösungsregisters, dazu Google-, Telegram-, Webhook- und Stripe-Formen,
`Authorization: Basic`, Zuweisungen an Variablen wie `…PASSWORD=`, Hex ab 24 Zeichen, lange Folgen
aus Kleinbuchstaben und Ziffern, lange Folgen in Base64-Form) und löst vor dem Abgleich einige
Verschleierungen auf (Zeilenumbruch im Wert, unsichtbare Zeichen, Sperrschrift, Zeichen voller
Breite). Dateien mit NUL oder anderen Steuerzeichen (etwa UTF-16) gelten nicht als Text und
werden abgelehnt. **Nicht** erkannt wird ein Kennwort, das wie ein gewöhnliches Wort aussieht,
ein kurzer Wert ohne erkennbare Zuweisung oder eine andere Kodierung. Die Laufzeit ist linear
(400.000 Zeichen in unter einer Sekunde gemessen).

**IST des Filters am Repository** (`python3 ops/cognee/aufnahme.py plan`, 14.11.2026, Stand dieses
Zweigs mit `main` `d4f2032`): 60 Dateien der Positivliste ohne diese Notiz, davon 55 ohne Fund
(678.603 Bytes) und fünf mit Funden; Ergebnis `geheimnis_gefunden`. Die fünf Dateien tragen
zusammen 34 Funde; es wird also heute nichts aufgenommen, auch nicht mit allen
Freigaben. Die Funde sind einzeln gesichtet, ohne die Werte auszugeben, nach Umgebung im Satz,
Vorsatz und Zeichenaufbau:

| Art laut Filter | Zahl | Einordnung nach Sichtung |
|---|---|---|
| Hex-Folge, 40 Zeichen | 13 | Commit-Kennungen (im Satz als Commit, Ausgangspunkt oder Revision bezeichnet), davon 8 in `PROGRESS.md`, 3 in `indexierung-freigabe-2026-11-14.md`, 1 in `static-preview.md` und 1 in `AGENTS.md` (bindet eine fremde Quelle an einen Commit) |
| Hex-Folge, 32 Zeichen | 4 | Projekt- und Dateikennungen mit Vorsatz `appgprj_` bzw. `libfile_` (3 in `PROGRESS.md`, 1 in `AGENTS.md`) |
| Hex-Folge, 64 Zeichen | 1 | Image-Digest nach `postgres@sha256:` (`factory-postgres-foundation.md`) |
| lange Zufallsfolge, Vorsatz `dpl_` | 4 | Vercel-Deployment-Kennungen (`PROGRESS.md`) |
| lange Zufallsfolge, Vorsatz `prj_` | 2 | Vercel-Projektkennungen (`PROGRESS.md`, `AGENTS.md`) |
| lange Zufallsfolge ohne Vorsatz | 5 | zusammengeschriebener Fließtext ohne Leerzeichen (Wortanteil 86 bis 97 %), kein Schlüsselaufbau (`PROGRESS.md`) |
| lange Zufallsfolge, 67 Zeichen | 1 | Prüfsumme: Vorsatz `SHA`, danach genau 64 Hex-Zeichen (`PROGRESS.md`) |
| Folge in Base64-Form | 3 | zwei Stellen mit Schrägstrichen in zusammengeschriebenem Text bzw. Kennung mit Pfad, eine entsteht erst durch das Verbinden zweier Zeilen (`PROGRESS.md`) |
| Zufallsfolge über Zeilenumbruch | 1 | entsteht erst durch das Verbinden zweier Zeilen Fließtext (`PROGRESS.md`) |

Nach dieser Sichtung ist **kein Fund als Zugangsschlüssel erkennbar**. Das ist eine Einordnung
nach Aufbau und Umgebung, kein Beweis: Ein Hex-Schlüssel sähe genauso aus wie eine Prüfsumme.
Deshalb gibt es **keine pauschale Ausnahme für Hex oder Kennungen** und keine Änderung am
Prüfwerkzeug. Die Entscheidung liegt beim Inhaber (Abschnitt 8, Punkt 6).

### 4.5 Sicherung und Wiederherstellung

1. **Vor jedem Eingriff (K0):** Snapshot des Servers. Die Datenbank wird nicht als Volume-Kopie
   einer laufenden Postgres gesichert, sondern als Dump (`pg_dump` im Container `cognee-db`, nur
   lesend) oder nach Stopp des Projekts. Die Volumes `cognee-data` und `cognee-system` sind an
   keinen Container gebunden, es schreibt also niemand hinein; sie werden mit Prüfsumme
   archiviert, ebenso der Projektordner `/docker/cognee-x532`. Es gilt der Sperrvermerk oben.
2. **Beleg der Wiederherstellbarkeit:** „Archiv lesbar“ genügt nicht. In K0 wird der Dump in eine
   leere Wegwerf-Datenbank eingespielt und die Zahl der Tabellen und Zeilen verglichen; in K10
   wird der ganze Stand in ein zweites, nicht veröffentlichtes Compose-Projekt zurückgespielt und
   mit fünf festen Fragen gegen `nexify-agentur--entscheidungen` geprüft. Bisher gibt es keinen
   Wiederherstellungsnachweis.
3. **Laufend:** wöchentliches Archiv (Dump und Volumes) ins Archivziel (R2, Entscheidung 2 im
   Aufräumplan offen). Eine Sicherung über COGX ist nicht vorgesehen, solange die Aussagen dazu
   offen sind (Abschnitt 3).
4. Die Hostinger-Backups (jüngstes 14.11.2026 16:14 UTC) sichern den ganzen Server, sind aber kein
   geprüfter Rückweg für einzelne Volumes.

Ein Zeitplan dafür ist nicht eingerichtet; diese Notiz behauptet keinen laufenden Sicherungsjob.

### 4.6 Kostenrahmen

- Aufnahme ohne Graphbau: keine Modellkosten.
- Graphbau und Antwortsuche rufen das LLM der Instanz; Graphbau und jede Suche nutzen das
  Embedding-Modell bei nscale. Für den vollen Altbestand nennt der Aufräumplan grob 10–120 USD
  (ANNAHME dort). Für das Agenturwissen (rund 0,7 MB Text) liegt der Bedarf weit darunter; eine
  Zahl gibt es erst nach dem Probelauf K5, der Token und Dauer misst.
- Der Adapter verweigert Graphbau, Suche und Antwortsuche, solange die jeweiligen Freigaben nicht
  gesetzt sind (4.1), und wiederholt keinen Aufruf, der Modellkosten auslöst.
- Serverplatz: Wiederherstellung braucht laut Aufräumplan 3–4 GB frei.

### 4.7 Rückweg der Integration

Schalter aus (Variablen entfernen) beendet jede Wirkung des Adapters sofort. Aufgenommene
Agentur-Datensätze lassen sich einzeln vergessen (4.3). Der Code liegt in neuen Dateien; ein
Revert des PR entfernt ihn ohne Wirkung auf andere Bausteine. `tools/cognee.mjs` und
`config/gedaechtnis.json` sind unverändert.

## 5. Einspielschritte

Jeder Schritt braucht die Freigabe des Inhabers; „S“ = Sitzung mit Shell auf dem Server. Für
jeden Schritt gilt der Sperrvermerk am Anfang dieser Notiz.

| Schritt | Was | Prüfung | Rückweg |
|---|---|---|---|
| **K0** Sichern | Snapshot; `pg_dump` der Datenbank (oder Projekt stoppen); Archiv von `cognee-data`, `cognee-system` und Projektordner mit Prüfsumme (S). **Kein Volume-Prune.** | Dump in eine Wegwerf-Datenbank eingespielt, Tabellen- und Zeilenzahl gleich; Prüfsummen notiert | bei Stopp: Projekt wieder starten |
| **K1** Absicherung der API entscheiden und vorbereiten | Nach dem Start des API-Dienstes wären `/docs`, `/openapi.json` und `/api/v1/*` öffentlich, geschützt nur durch die Anmeldung von Cognee. Wege: (a) Cloudflare Access vor `brain.nexifyai.cloud` mit Dienst-Token für Maschinen; (b) Traefik-Anmeldung `brain-auth` auch vor die API; (c) so lassen. Der gewählte Schutz wird eingerichtet, **bevor** K2 den Dienst startet. | Regel bzw. Label liegt vor; gegen die heutige Adresse ohne Zugang weiter kein 200 | Regel bzw. Label entfernen |
| **K2** API-Dienst wiederherstellen | Ursache des fehlenden Containers klären; Image auf festen Stand statt `latest` (zuletzt genutzte Version, nicht ungeprüft v1.6.8: Migrationen laufen beim Start), ebenso `cognee-mcp` statt `main`; Dienst hinter dem Schutz aus K1 starten (S). **Kein Volume-Prune**, auch nicht beim Neuerstellen. | von außen ohne Zugang kein 200 auf `/docs`, `/openapi.json`, `/api/v1/*`; mit Zugang `/health` 200, `/openapi.json` gelesen (Feldnamen `cognify`, Pfade für Datensätze, `update`); Datensatzliste mit Verwalterkonto über den geschützten Weg; MCP-Protokoll ohne `PoolTimeout` | Container stoppen, Dump und Volumes aus K0 |
| **K3** Mandant und Schlüssel | Mandant `nexify-agentur`, Rollen, drei Dienstnutzer, je ein API-Schlüssel; Werte nur in die Geheimnisspeicher; `API_TOKEN` des MCP auf einen API-Schlüssel umstellen, falls es ein ablaufendes Anmelde-Token ist (OFFEN) | Register: Zugänge mit Ablageort, ohne Wert | Schlüssel widerrufen |
| **K4** Modelle bestätigen | Abschnitt 8, Punkte 1 und 2 entscheiden; Compose-Vorgabewert ohne 1017 beseitigen | Aufruf am Router zeigt genau das entschiedene Modell | alte Werte der Umgebungsdatei |
| **K5** Probe-Aufnahme | Fünf Dokumente in `nexify-agentur--entscheidungen`, zweimal senden, einmal mit geändertem Inhalt; Kennungen der Datensätze in die Konfiguration eintragen; Graphbau | zweiter Lauf erzeugt nichts Neues; geänderter Inhalt ergibt `fassung_veraltet`; Token und Dauer des Graphbaus gemessen | Datensatz vergessen |
| **K6** Rechteprobe | Leseschlüssel darf nicht schreiben; Agentur-Schlüssel sieht einen Testdatensatz `kunde-test--probe` eines zweiten Mandanten nicht; Leser erreicht den Agentur-Datensatz über die Kennung | 403 bzw. leere Liste, protokolliert | Testmandant entfernen |
| **K7** Probesuche | Fünf feste Fragen über den Adapter mit `CHUNKS`; Antwortsuche nur mit eigener Kostenfreigabe | Antworten mit Fundstelle, an der Datei geprüft | Schalter aus |
| **K8** Regelaufnahme und Ablösung | Aufnahme nach Merge auf `main`, zuerst von Hand; Ablösung veralteter Fassungen bauen und prüfen (4.4); ein Zeitplan erst nach Entscheidung und Prüfung vorhandener Zeitpläne | Lauf meldet `ok`; eine geänderte Datei ist danach nur in neuer Fassung auffindbar | Schalter aus |
| **K9** Leser anbinden | Claude-Sitzungen (Netzwerk-Geheimnis, Modus `proxy`), danach Hermes | je eine Suche mit `CHUNKS` | Geheimnis entfernen, Freigabe zurück auf `null` |
| **K10** Betrieb | Sicherung mit Rückspielprobe (4.5), Zustandsprüfung von `/health` im bestehenden Monitoring, Versionswechsel nur mit K0 davor | Rückspielprobe bestanden, Alarm ausgelöst und empfangen | Sicherungslauf und Monitoring-Eintrag wieder entfernen; nach einem Versionswechsel: vorheriger Image-Digest und Stand aus K0 |

Nicht Teil dieser Notiz: Ablösung von LightRAG und agentmemory (OA-144, Entscheidung 1 im
Aufräumplan) und das lokale Plugin (Entscheidung 8).

## 6. Was nicht geprüft ist

- **Port 33019 direkt von außen:** Der Sitzungs-Container erlaubt keine Verbindung auf beliebige
  Ports. Belegt sind Bindung und Firewall-Regel über die Hostinger-API, nicht ein
  Verbindungsversuch aus dem Internet.
- **TLS-Zertifikat:** Die Sitzung sieht nur das Zertifikat ihres eigenen Ausgangs-Proxys.
- **Anmeldung:** kein Anmeldeversuch an `/mcp` oder der API, keine Schreib- oder Löschaufrufe.
- **Inhalt:** Datensätze, Nutzer, Mandanten und Protokolle der Instanz; Ursache des fehlenden
  API-Containers; ob `REQUIRE_AUTHENTICATION` wirksam ist (Dienst läuft nicht).
- **Router:** was hinter `172.27.0.1:20129` läuft und welches Modell dort tatsächlich ankommt.
- **Dokumentation:** nur die genannten Seiten; lange Seiten kamen gekürzt an. Offene und nicht
  bestätigte Aussagen sind in Abschnitt 3 gekennzeichnet.
- **Adapter gegen die echte Instanz:** kein Aufruf. Ungeprüft sind damit Feldnamen, die
  Bedeutung von 409, die Ansprache über Kennungen und ob die einfache Suche Kosten auslöst.
- **Filter:** nur die in den Tests genannten Formen; er ist kein Schutz (4.4).

Hinweis zur Messung: Der Projektabruf der Hostinger-API liefert die Umgebungsdatei des Projekts
mit allen Werten. Die Werte wurden maskiert, nicht ausgegeben und nicht gespeichert; die
Zwischendatei im Sitzungs-Container ist entfernt. Wer den Hostinger-Schlüssel der Umgebung hat,
kann diese Werte lesen; das gehört in die Bewertung dieses Schlüssels im Lösungsregister.

## 7. Abnahmeliste

- [ ] K0: Snapshot, Dump und Archive vorhanden; Dump probeweise eingespielt; Prüfsummen notiert.
- [ ] K1: Absicherung entschieden und eingerichtet, bevor der Dienst startet.
- [ ] K2: von außen ohne Zugang kein 200 auf API-Pfaden; `/health` 200 mit Zugang; Version und Digest beider Images fest und notiert.
- [ ] K3: Mandant, drei Dienstnutzer, Schlüssel in den Geheimnisspeichern; Register nachgeführt.
- [ ] K4: Modell und Embedding entschieden und am Router belegt.
- [ ] K5: Probe-Aufnahme zweimal, zweiter Lauf ohne neue Einträge; geänderter Inhalt gemeldet; Kennungen eingetragen; Kosten des Graphbaus gemessen.
- [ ] K6: Rechteprobe bestanden (Lesen ohne Schreiben; kein Zugriff über Mandanten hinweg).
- [ ] K7: fünf Fragen mit Fundstelle.
- [ ] K8: Regelaufnahme einmal von Hand `ok`; Ablösung einer geänderten Datei nachgewiesen.
- [ ] K9: Claude-Sitzung und Hermes lesen je eine Fundstelle.
- [ ] K10: Rückspielprobe bestanden; Alarm bei Ausfall geprüft.
- [ ] Löschweg einmal an einem Testdatensatz bis zu den Rohdateien nachvollzogen.
- [x] Adapter aus: 68 Tests grün (`python3 -m unittest tests.test_cognee_adapter`); 27 gezielte Veränderungen des Codes werden von den Tests entdeckt (Abschnitt 9).

## 8. Offene Inhaberentscheidungen

1. **LLM der Instanz:** Der Name `openai/openrouter/deepseek-v4.1-flash-1017` am 9router ist nicht
   die Kennung der Projektvorgabe (`deepseek/deepseek-v4.1-flash-1017`), Reasoning „high“ ist für
   Cognee nicht gesetzt und laut Dokumentation dort nicht vorgesehen. Gilt die Vorgabe für Cognee
   als erfüllt, wenn der Router nachweislich genau dieses Modell ruft, oder soll Cognee ohne
   Router direkt an OpenRouter gebunden werden?
2. **Embedding:** `Qwen/Qwen3-Embedding-8B` bei nscale ist kein OpenRouter-Modell; Texte und
   Suchfragen gehen dafür an einen weiteren Anbieter. Beibehalten (sonst Neu-Einlesen des
   Bestands) oder wechseln?
3. **K0/K2:** Sicherung und Wiederherstellung freigeben, mit welcher festen Version?
4. **K1:** Welche Absicherung vor der öffentlichen API (a, b oder c)?
5. **Leser:** Claude-Sitzungen und Hermes ja; Website-Chat nein – bestätigen oder ändern.
6. **Aufnahmefilter:** Die fünf Dateien mit Funden (4.4) bleiben ausgeschlossen, oder es gibt eine
   eng gefasste, geprüfte Regel für benannte Kennungen (zum Beispiel nur Commit-Kennungen, die im
   Repository als Commit existieren) – mit Review, nicht pauschal für Hex.
7. **Altbestand:** Die 19 vorhandenen Datensätze sichten und Mandanten zuordnen, oder archivieren
   und neu beginnen?
8. **Kostenobergrenze** für Graphbau und Antwortsuche in USD je Monat.
9. **Sicherung:** Archivziel und Rhythmus (hängt an Entscheidung 2 im Aufräumplan).
10. **Ablösung veralteter Fassungen** (K8): ersetzen über die Instanz freigeben, oder Datensätze
    in festen Abständen neu aufbauen?

## 9. Nacharbeit nach der unabhängigen Prüfung (14.11.2026)

Die Prüfung von PR 197 am Stand `6a31225` nannte 19 Befunde. Jeder wurde zuerst am alten Stand
nachgestellt, dann behoben.

| Nr. | Befund | Nachgestellt | Behoben durch |
|---|---|---|---|
| 1 | Lesen braucht keine Freigabe | ja | Rollen und Freigaben je Wirkung im Code, auch für Zustand, Datensatzliste und Suche; Kopfkommentar berichtigt |
| 2 | Geheimnis-Filter umgehbar | ja (Umbruch, unsichtbares Zeichen, UTF-16, Sperrschrift, Kennwort, Basic); zwei meiner Proben (Kleinbuchstaben mit Ziffern, Webhook-Form) griffen schon vorher | eigener Filter mit Normalisierung und weiteren Mustern; in 4.4 als Musterabgleich benannt |
| 3 | Plan folgt Verknüpfungen | ja | Pfad wird aufgelöst und gegen die Wurzel geprüft; Verknüpfungen werden ausgelassen |
| 4 | K1 vor K2 öffnet die API | ja (Reihenfolge der Fassung 1) | Absicherung ist K1, Wiederherstellung K2 |
| 5 | `add_document` ohne Positivliste und Pfadprüfung | ja (sechs Schreibweisen angenommen) | Pfadform, Sperrliste ohne Rücksicht auf Groß- und Kleinschreibung, Positivliste, Datensatz laut Liste |
| 6 | Kopf-Einschleusung im Multipart | ja | Pfad und Dokumentname nur aus zulässigen Zeichen; Formularfelder geprüft |
| 7 | Filter läuft quadratisch | ja (40.000 Zeichen: 1,09 s) | lineare Prüfung der Adressen; 400.000 Zeichen in unter einer Sekunde |
| 8 | veraltete Fassungen bleiben | ja (Entwurf) | ein Name je Pfad, 409 als `fassung_veraltet`; Ablösung als K8 mit eigener Freigabe, nicht gebaut |
| 9 | Prüfsummen-Entscheidung ungeprüft | ja | Funde einzeln gesichtet (4.4), keine pauschale Ausnahme |
| 10 | Antwortsuche dreimal gesendet | ja (3 Aufrufe) | Antwortsuche wird nie wiederholt, eigene Kostenfreigabe |
| 11 | `runInBackground` | ja | `run_in_background` laut Fließtext der Dokumentation; Prüfung an der Instanz in K2 |
| 12 | K0 archiviert laufende Datenbank | ja (Entwurf) | Dump oder Stopp, Probe-Einspielung |
| 13 | Schlüssel in `repr` | ja | Feld von der Darstellung ausgenommen |
| 14 | ungültiger Port wirft `ValueError` | ja | Abbruch `adresse_abgelehnt` |
| 15 | `top_k` und Antwortgröße unbegrenzt | ja | höchstens 25 Treffer, höchstens 2 MB Antwort |
| 16 | Zeitlimit je Socket-Operation | nicht nachgestellt (aus dem Code gelesen) | Gesamtfrist im echten Transport, gedeckelt auf 60 Sekunden |
| 17 | 409 als Erfolg | ja (Code) | `fassung_veraltet`, Lauf endet mit `abloesung_noetig` |
| 18 | Zahlen der Notiz | ja | Zahlen neu erhoben, ohne diese Notiz gezählt |
| 19 | K9 ohne Rückweg, Sperrvermerk fehlt in K0 und K1 | ja | Rückweg für K10, Sperrvermerk am Anfang und in K0 und K2 |

Dazu vier Hinweise der automatischen Durchsicht am PR: Aufnahme außerhalb der Positivliste
(entspricht Befund 5), Antwortsuche ohne Kostenfreigabe (behoben mit Befund 10), Suche über
Namen statt Kennungen (umgestellt auf Kennungen; an der Instanz nicht geprüft) und eine
tröpfelnde Antwort, die die Gesamtfrist aufhielt (behoben: je Lesevorgang wird die Restzeit
geprüft, Test gegen einen tröpfelnden Dienst auf der lokalen Schleife).

Tests: 68 statt 34. In Wegwerfkopien wurden 27 gezielte Veränderungen des Codes eingespielt,
darunter die elf, die die Prüfung als unentdeckt nannte (Umleitungen, Zeitlimit, Rumpf der
Fehlerantwort, Verknüpfungen im Plan, Graphbau ohne Kostenfreigabe, Netzfehlertext, Host-Prüfung
per Endung, Pause und Wiederholung ohne Deckel, Fragenlänge, Größengrenze im Plan, Sperrliste im
Plan); alle 27 lassen die Tests scheitern, keine lässt sie hängen.

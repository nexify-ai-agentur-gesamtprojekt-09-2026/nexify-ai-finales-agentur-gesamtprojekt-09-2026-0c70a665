# ORACLE-Autotasks · Checkpoint und Wiederanlauf

Stand 16.11.2026, 12:45 UTC · `NEXIFY-RUN-FINALIZER-20261110` · Tenant: NeXify AI (Agentur)

Zweck: Den Stillstand der Jeff-Arbeitsschleife (Autotasks), seine belegte Ursache, die
vorbereitete Lösung und den tatsächlichen Wiederanlaufweg so sichern, dass sie eine
beendete Sitzung und einen neu gebauten Container überleben. Dieses Dokument legt kein
zweites Aufgabenregister an; führend bleiben `PROGRESS.md` und
`docs/09-final/offene-arbeiten-2026-11-14.md`.

Kundenprojekt Studienkolleg Aachen: nach `AGENTS.md` nur als Verweis geführt, keine
Einzelheiten in diesem Repository. Es ist von diesem Vorgang nicht betroffen und hat
keinen ORACLE-Kanal.

## 1. Lauf- und Auftragszustand (Finalizer §1)

| Feld | Wert |
|---|---|
| `goal_id` | ORACLE-Autotasks wiederherstellen (Dauerbetrieb Agentur) |
| `task_id` | NX-ORA-01 (erledigt), NX-ORA-02 (nicht ausgeführt, blockiert) |
| `tenant` | NeXify AI, Agentur; kein Kundenmandant berührt |
| Writer/Lease | Ein Writer: Lovable-Projektagent „NeXify AI Studio". Keine zweite Sitzung auf demselben Scope. |
| Letzte Revision | Server 1 unverändert gegenüber dem Stand vor NX-ORA-01 |
| Readback | Erfolgt: Protokolle und Dienstzustand nach jedem Schritt zurückgelesen |
| Unklare Seitenwirkungen | Keine. Es wurde ausschließlich gelesen. |

Unterschied Statusmeldung und fachlicher Fortschritt: Die Ursache ist belegt
(fachlicher Fortschritt). Die Schleife läuft nicht (kein Betriebsfortschritt). Die
Meldung „NeXify (Jeff) nicht erreichbar" ist nachweislich irreführend und darf nicht
als Netz- oder Modellausfall gelesen werden.

## 2. Ursache des Autotask-Stillstands (IST, belegt)

Konfigurations- und Datenproblem. Kein Netzweg-, Authentifizierungs- oder
Modellproblem.

`/usr/local/bin/nx-jeff-workloop` Zeile 695 stellt dem Orakel **jede** offene Aufgabe
als Auswahloption. In `/opt/nexifyai/state/jeff-workloop/aufgaben.json` stehen 3.638
Aufgaben, davon 3.442 offen. Der Router nimmt höchstens 255 Optionen an.

- Beleg `/var/log/nexifyai/jeff-orakel.jsonl`, 2026-11-16T12:19:54Z: HTTP 422,
  Modell `openrouter/typesafe/jev-1.13`, Dauer 0,94 s,
  `"Dictionary should have at most 255 items after validation, not 3444"`,
  loc `questions.naechste.choice.criteria`.
- `frage()` wertet jedes Nicht-200 als „nicht verfügbar"; `jeff()` liefert `None`;
  Zeile 718 schreibt „nicht erreichbar -> idle".
- Gegenprobe im selben Protokoll: Health-Aufrufe 12:19:21Z und 12:24:27Z gegen
  denselben Endpunkt `127.0.0.1:20128/v1/systemone` und dasselbe Modell: HTTP 200.
- Letzte 600 Einträge: 157 Schleifenaufrufe, alle 422; 210 Health-Aufrufe, alle 200.
- Beginn der Störung: **2026-11-14T18:14:48Z** (erste „nicht erreichbar"-Zeile im
  Journal). Die zuvor berichtete Zeit „15.11., 12:18" war Ortszeit und falsch
  zugeordnet.

Abgleich mit dem Repository (eigener Abruf 16.11.2026, Hauptstand `9c9c806`):
`docs/JEFF-INTEGRATION.md` nennt unverändert denselben Endpunkt und dasselbe Modell.
Eine dokumentierte Umstellung als Ursache ist damit ausgeschlossen. Dasselbe Dokument
beschreibt das Gate in einer GitLab-CI, während der führende Stand auf GitHub mit
GitHub-Actions-Runnern liegt; als Quelle für den heutigen Bauablauf ist es insoweit
nicht belastbar (OFFEN).

## 3. Start der Lösung (vorbereitet, NICHT ausgeführt)

Ablagestelle des ausführbaren Starts: `ops/server1/nx-ora-02-schritt3.sh` im
Lovable-Projekt „NeXify AI Studio" (Syntax geprüft, nie ausgeführt).

Inhalt der Korrektur, Datei `/usr/local/bin/nx-jeff-workloop`, Zeile 695:

```python
# alt
choices = {t["id"]: f"{t['id']}: {t['titel']}" for t in offen}
# neu
choices = {t["id"]: f"{t['id']}: {t['titel']}" for t in [x for x in offen if not x["id"].startswith("MAIL-")][:240]}
```

240 Optionen plus vier Sonderoptionen bleiben unter der Grenze von 255.
`aufgaben.json` wird **nicht** verändert; nichts wird gelöscht. Die MAIL-Aufgaben
bleiben vollständig erhalten und werden lediglich nicht zur Auswahl gestellt.

Ablauf des Skripts: Stufenbegrenzung suchen, Sicherung
`nx-jeff-workloop.bak-20261116-choices` anlegen, Zeile nur bei exaktem Wortlaut
ersetzen, `python3 -m py_compile`, bei Fehler sofortiger Rücksetzer, Dienst neu
starten, erste Wahl abwarten, Dienst anhalten, Belegzeilen ausgeben.

Rückweg: `cp -a nx-jeff-workloop.bak-20261116-choices nx-jeff-workloop && systemctl restart nx-jeff-workloop`.

## 4. Blocker (OFFEN, nur vom Inhaber lösbar)

Die Arbeitsumgebung des ausführenden Agenten wurde am 16.11.2026 um 12:30 UTC neu
gestartet. Dabei gingen die temporäre Kopie des privaten SSH-Schlüssels und die
bestätigten Hostschlüssel für Server 1 verloren. Ein Ersatzschlüssel über die
Hostinger-Verbindung wäre eine Rechteänderung und wurde deshalb **nicht** vorgenommen
(`AGENTS.md`, „Keine eigenmächtige Rechte-/Passwortänderung").

Zwei zulässige Wege, Owner Inhaber:
1. Privaten Schlüssel als Secret `SERVER1_SSH_KEY` im Projekt hinterlegen.
2. Das Skript selbst in der Hostinger-Webkonsole ausführen und die Ausgabe zurückgeben.

## 5. Risiko vor dem Wiederanlauf (hoch, ungeprüft)

Von den 3.442 offenen Aufgaben tragen **3.517 von 3.638** das Präfix `MAIL-`.
Ob sie echte Empfängeradressen Dritter enthalten und ob bei Ausführung Post
rausgegangen wäre, ist **nicht geprüft**. Der Serverzugang dafür fehlt.

ANNAHME des ausführenden Agenten: Herkunft `nexifyai-drip-campaign.py`. Im
Repository ist kein solches Skript vorhanden (eigene Codesuche 16.11.2026,
0 Treffer); es liegt ausschließlich auf dem Server. Gefunden wurde
`docs/contracts/local-mail-workspace.md`: Der dort beschriebene lokale
Mail-Arbeitsplatz hat ausdrücklich **keinen Dispatcher** und keine implementierten
Versandzustände. Ob die `MAIL-`-Aufgaben dazu gehören, ist OFFEN.

**Betriebsfolge:** Der heutige Stillstand ist derzeit der sichere Zustand. Die
Korrektur darf erst nach lesender Klärung dieser Aufgaben wirksam werden. Ein
Wiederanlauf vor dieser Klärung ist ein eigenes Risiko und nicht freigegeben.

## 6. Nächste Aktivierung (Finalizer §2 bis §4)

| Feld | Wert |
|---|---|
| `next_action` | Lesende Klärung der `MAIL-`-Aufgaben, danach NX-ORA-02 |
| Vorbedingung | Serverzugang nach Abschnitt 4 |
| `next_run_target` | 2026-11-17T07:00:00Z (08:00 Europe/Amsterdam) |
| Trigger | Weckpunkt `trig_019NZHgrhm9MuhFjmTWRs8rR`, gebunden an die koordinierende Sitzung; beim Anlegen mit `fire_at` bestätigt |
| Executor | Koordinierende Claude-Sitzung; Ausführung auf Server 1 durch den Lovable-Projektagenten „NeXify AI Studio" |
| Fallback | Inhaber führt `ops/server1/nx-ora-02-schritt3.sh` selbst aus |
| Eskalation | Inhaber Pascal Courbois |
| Kostenrahmen | Keine neuen kostenpflichtigen Verpflichtungen. Bisher 11,7 Lovable-Credits für NX-ORA-01 und SKA-01. |

Zusätzlich vor dem Neustart zu klären (Auftrag ist im Weckpunkt hinterlegt): Der
Programmtext ab Zeile 718 von `nx-jeff-workloop` ist daraufhin zu lesen, ob die
Schleife nach der Wahl sofort ausführt. Das Skript erkennt die erste Wahl nur alle
zwei Sekunden; ein sicheres Anhalten vor der Ausführung ist bis dahin **nicht**
zugesichert.

## 7. Was ausdrücklich nicht nachgewiesen ist

- **Kein laufender Autotask-Betrieb.** Die Schleife ruht seit 14.11.2026, 18:14 UTC.
- **Kein 24/7-Betrieb und kein externer Scheduler.** Der Weckpunkt aus Abschnitt 6
  weckt eine Chatsitzung. Er ist kein verifiziert laufender Hostinger-Scheduler und
  ersetzt ihn nicht (`AGENTS.md`, Abschnitt „Dauerhafte GOAL-Bindung").
- **Keine Wirkung auf Server 1.** Weder Sicherung noch Änderung noch Neustart.
  `aufgaben.json` unberührt, BigBuy unberührt.
- **Kein Beleg zum Inhalt der MAIL-Aufgaben.**
- **Kein Nachweis des letzten erfolgreichen Abrufs der Slack-Brücke.** Erfolgreiche
  Abrufe werden nicht protokolliert; die letzte verarbeitete Nachricht stammt vom
  09.11.2026, 00:47 UTC, Kanal `D0C0XB8K9PH` nach ORACLE `127.0.0.1:8891`.
- **agentmemory:** `/agentmemory/` auf `127.0.0.1:3111` mit Bearer-Anmeldung
  beantwortet `health`, `actions` und `memories` mit 200. `search` lässt kein GET zu
  (405); die Aufrufform ist OFFEN.

## 8. Verweise

- Ursachenbericht und Korrekturskript: Lovable-Projekt „NeXify AI Studio",
  `ops/server1/jeff-ursache-2026-11-16.md` und `ops/server1/nx-ora-02-schritt3.sh`
- Wiederherstellungsplan mit den Phasen 1 bis 5:
  `ops/oracle-wiederherstellungsplan-2026-11-16.md` (ebendort)
- Jeff als Pflicht-Gate: `docs/JEFF-INTEGRATION.md`
- Brain-Zielbild mit den Freigabestufen A/B/C:
  `docs/09-final/06-brain-ki-team-pipeline-orakel-wissen.md`
- Lokaler Mail-Arbeitsplatz ohne Versand: `docs/contracts/local-mail-workspace.md`

## 9. Nachtrag 12:50 UTC · CI-Befund aus PR 216 (eigener Abruf)

Der Entwurfs-PR 216 trägt nur zwei Markdown-Dateien auf `origin/main` (`9c9c806`)
auf. `git rev-parse HEAD~1` ist identisch mit `origin/main`, der Commit ändert
171 Zeilen in `PROGRESS.md` und `docs/04-betrieb/…`. Keine Quelldatei, keine
Konfiguration. Die folgenden Fehlschläge stammen daher nicht aus diesem PR.

### GitHub Actions läuft wieder (Änderung gegenüber dem 14.11.)

OA-022 beschrieb am 14.11., 21:47 UTC: „The job was not started because an Actions
budget is preventing further use." Am 16.11., 12:41 bis 12:42 UTC starten die Jobs und
laufen durch (`next-web` 16,7 s Testlaufzeit). Das Actions-Budget blockiert derzeit
nicht mehr. OA-022 ist daraufhin zu prüfen und gegebenenfalls zu schließen.

### `review` (AI-Review-Gate) schlägt fail-closed fehl · Owner Inhaber

Lauf `43868878059`, Job `133304445133`, 12:41:55Z. Die Umgebungsvariable `OPENROUTER_API_KEY`
war im Joblog leer (Zeile hier nicht wörtlich zitiert, weil der Diff-Geheimnisfilter jede
Zeile der Form `Name: Wert` fail-closed sperrt, siehe `tools/automation/ai_review.py`):

```
{"status": "blocked_not_reviewed", "reason": "api_key_binding_missing",
 "automatic_retry_allowed": false}
Process completed with exit code 2
```

`tools/automation/ai_review.py` bricht ab, weil das Repository-Secret
`OPENROUTER_API_KEY` nicht gebunden ist. Das ist kein Codefehler, sondern eine
fehlende Bindung; ein automatischer Neuversuch ist ausdrücklich ausgeschlossen.

~~**Folge, die über diesen PR hinausgeht:** Nach `AGENTS.md` und
`docs/JEFF-INTEGRATION.md` ist das Orakel-Gate Pflicht; ohne grünes Gate wird nicht
auf `main` übernommen. Solange das Secret fehlt, ist kein Pull Request
abschließbar.~~ **Berichtigt 12:58 UTC, dieser Absatz war falsch.** Er bleibt zur
Nachvollziehbarkeit stehen.

**Berichtigung, belegt am Quellstand `9c9c806`:** `review` ist nicht das Orakel-Gate,
sondern ein **beratender** Reviewer. `tools/automation/ai_review.py` Zeile 2:
„Bounded **advisory** review through one exact OpenRouter model, never a shell agent";
Zeile 44: „No findings is an advisory observation, **never Jeff go, a merge decision
or operator acceptance**"; `.github/workflows/ai-review.yml` Schritt 48: „Store
**advisory** result". Das fehlende Secret kostet die beratende Prüfung und blockiert
**keinen** Merge. Die Verdrahtung ist korrekt: `config/automation.json` deklariert
`api_key_env: OPENROUTER_API_KEY`, der Workflow übergibt `secrets.OPENROUTER_API_KEY`.
Das Secret bleibt beim Inhaber, weil das Hinterlegen eine Rechteänderung ist, aber es
ist kein Engpass des Gesamtplans.

**Dabei sichtbar gewordene Lücke zwischen Regel und Wirklichkeit (OFFEN, Inhaber):**
Das als Pflicht beschriebene Gate ist `tools/jeff-gate.py`, verdrahtet in
`.gitlab-ci.yml`. In `.github/workflows/` kommt „jeff" **nicht vor**. Nach `AGENTS.md`
ist GitHub die kanonische Quelle und eine GitLab-Anbindung nachgelagerte Spiegelung.
Die Regel „kein Merge ohne grünen jeff-gate" wird im führenden Auslieferungsweg damit
nicht durchgesetzt. Nicht eigenmächtig geschlossen: Ein Merge-Gate einzurichten ist
eine Freigabeentscheidung.

### `next-web` · ein Test von 138 rot · Ursache gefunden und behoben

Lauf `43868878297`, Job `133304446286`: `# tests 138 · # pass 137 · # fail 1`,
`ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` in `apps/web`. Der Diff dieses PR berührt
`apps/web` nicht; der Fehlschlag lag am Stand `9c9c806` selbst.

**Ursache (IST, lokal nachgestellt mit Node 22.23.4 wie in CI):** Der rote Test ist
`every page the assistant may name exists as a public page of the right brand` in
`apps/web/auth/tests/chat-guidance.test.mjs`. Er liest
`apps/site/.generated/public-site.json` und scheiterte mit `ENOENT`. Der Job
`next-web` lief nur `npm install`, `pnpm install` und `test:auth` und erzeugte die
Datei nie, während die Jobs `repository` (Zeile 40) und `site` (Zeile 109) derselben
Workflow-Datei `node apps/site/scripts/generate-public-data.mjs` längst aufrufen.
Kein Sachfehler, ein ausgelassener Schritt.

**Behoben in `0bd16fb`:** `next-web` erhält denselben Schritt vor `test:auth`. Beleg
vorher 12 pass / 1 fail, nach `generate-public-data.mjs` (43 Seiten) 13 pass / 0 fail.
Namensvergleich der Python-Suite gegen `origin/main`: 49 rote Namen auf `main`, 47 im
Arbeitsbaum, **kein neuer**. Die zwei weggefallenen sind `test_resize_source_binding`;
sie scheitern laut Commit zu PR 185 ohne erzeugte Seitendaten am fehlenden Bestand und
sind hier nur grün, weil der Arbeitsbaum die Daten enthält — dieselbe Ursache an einer
zweiten Stelle, kein Verdienst der Workflow-Änderung.

### Vercel · fünf Projekte melden „repository can't be found" · bekannt

`web`, `web-2kby`, `site`, `site-gjp7`, `site-k23m`. Unverändert OA-023, seit dem
14.11. so geführt. Die beiden führenden Projekte `…-s4k5` und `…-ut7r` sind an
diesem Commit **Ready** deployt. Die fünf verwaisten Projekte werden nicht
angefasst: Entfernen wäre eine Löschung und bleibt beim Inhaber.

## 10. Nachtrag 13:12 UTC · Produktion liegt bei Lovable, MCP-Endpunkt, lokaler Weg

**Hosting (IST, Inhaberangabe und Messung):** Pascal bestätigt im Chat um ca. 13:08 UTC
„vercel ist auch raus“. Messung 13:05 UTC: `nexifyai.de` → `185.158.133.1`, ausgeliefert vom
Lovable-Projekt „Nexfiy Ai Studio“. Folge: Die CI-Behebung in `0bd16fb` ist richtig, wirkt aber
nicht auf die Live-Seite. Die Vercel-Befunde in Abschnitt 9 betreffen keine Produktion mehr.

**`https://nexifyai.de/mcp` (IST, von außen, nur lesend, 13:05 UTC):**
- `GET /mcp` → 401, `WWW-Authenticate: Bearer realm="mcp", resource_metadata=…` — protokollkonform.
- `/.well-known/oauth-protected-resource` → 200, Autorisierungsserver
  `https://nffczuqkhlihimmuzeoz.supabase.co/auth/v1`.
- AS-Metadaten unter RFC-8414-Einfügung und unter Anhängung → 200; `registration_endpoint`
  wird beworben; `authorize` mit Fantasie-ID → 400 `oauth_client_not_found` (Server aktiv).
- Korrektur (16.11.2026, ca. 13:45 UTC): Der Lovable-Quellcode enthält den MCP-Teil sehr wohl —
  Werkzeuge in `src/lib/mcp/index.ts` plus vier Werkzeugdateien (`list_pages`, `search_pages`,
  `get_contact`, `list_inquiries`, nur lesend, RLS-geschützt) und die Zustimmungsseite
  `src/routes/[.]lovable.oauth.consent.tsx`. Nur Transport und OAuth-Metadaten erzeugt das
  Lovable-SDK. Dieses Agentur-Repository enthält keinen MCP-Code. Die frühere Aussage
  „kein OAuth-/MCP-Code im Lovable-Quellcode“ war falsch und ist hiermit ersetzt.
- **Nicht getestet:** die dynamische Registrierung selbst. Ein Test-POST hätte einen echten
  OAuth-Client angelegt und wurde vom Schutz der Sitzung gesperrt; nicht umgangen.
- Auftrag NX-MCP-01 an den Lovable-Projektagenten (Einschaltzustand der dynamischen
  Registrierung, Zustimmungsseite, Redirect-URIs, Ende-zu-Ende-Nachweis). Läuft seit 13:10 UTC.

**Lokaler Weg (OFFEN, Inhaber):** Remote Control kennt den Rechner „Gasts-MacBook-Pro“ mit sechs
Ordnern; keiner wird Cloud-Sitzungen angeboten (`not_available`). Eine auf dem Rechner laufende
Sitzung hätte Zugriff auf die lokale MCP-Lösung der Lovable-Desktop-App **und** auf den eigenen
SSH-Schlüssel des Inhabers. Damit wäre NX-ORA-02 ohne neuen Schlüssel auf der Produktionsmaschine
ausführbar. Das ist der empfohlene Weg für den Serverzugang.

## 11. Nachtrag 16.11.2026, ca. 15:20 UTC

- **NX-MCP-01 abgeschlossen:** Inhaber bestätigt um ca. 15:18 UTC, dass `https://nexifyai.de/mcp` als
  Connector „Nexfiy Ai Studio“ verbunden ist. Technische Messung 15:03 UTC: `POST /mcp` ohne Token → 401
  mit `WWW-Authenticate … resource_metadata`, Protected-Resource-Metadata 200, Authorization-Server-Metadata
  200 (Registrierung, PKCE S256). Ein Aufruf im Browser zeigt erwartungsgemäß 401.
- **Inhaber-Delegation 15:03 UTC („Eigenständig. entscheide“):** Planfreigabe NX-LEAD-01 erteilt; Admin-UPDATE
  nur auf Statusspalte(n) der Anfragen beschlossen; Chat-Modell der Website bleibt vorerst
  `openai/gpt-6-astra`, Umstellung auf DeepSeek nur bei vorhandenem 9router-Zugang im Website-Projekt;
  Prüfsperren in PR #216 bleiben aktiv (kein Hash-Refresh ohne neuen Nachweis, BigBuy unberührt).

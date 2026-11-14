# Testumgebung und Abhängigkeiten 14.11.2026

Zweig `claude/paket-b-tests`, Basis `main` `2906f58`. Betrifft die Einträge OA-053, OA-057, OA-059 und OA-062 des Registers offener Arbeiten vom 14.11.2026 sowie den Abbruch von `pnpm install --frozen-lockfile`. Verfahren nach `.claude/skills/nexify-belege-und-pins/SKILL.md`. In dieser Arbeit wurde kein Pin nachgezogen und kein Beleg geändert.

Laufumgebung: Node v22.23.4, pnpm 12.15.0, System-Python 3.13.18 (Pillow 12.3.0, numpy 2.5.3, ohne `fastapi`, `httpx`, `pymongo`), Testumgebung Python 3.12.3. Der CI-Job nennt Python 3.12.15; diese Version lag nicht vor. GitHub Actions startet weiter keine Jobs, alle Zahlen sind lokal gemessen.

## 1. Python-Testumgebung (OA-057)

Vorgabe des Repositorys ist der CI-Job `repository` in `.github/workflows/ci.yml`: Python 3.12, danach `requirements-image.txt` (ohne Abhängigkeitsauflösung) und `apps/shop-api/requirements.txt`, beide nur als Wheels und nur mit Prüfsumme. Ein lokaler Weg dazu fehlte; `make setup` prüft nur, ob Node und Python vorhanden sind.

Neu im `Makefile`:

| Ziel | Wirkung |
|---|---|
| `make test-env` | legt `.venv` an (in `.gitignore`) und installiert genau die beiden Dateien mit denselben Schaltern wie der CI-Job; gibt die installierten Versionen aus |
| `make test-py` | `python -m unittest discover -s tests` in dieser Umgebung; bricht mit Hinweis ab, wenn `.venv` fehlt |

Andere Python-Version oder anderer Ort: `make test-env PYTHON_ENV=python3.12 VENV=.venv`. `make test` und `make check` sind unverändert.

Ausgabe von `make test-env` am 14.11.2026: Python 3.12.3, fastapi 0.141.1, httpx 0.28.1, pymongo 4.19.0, Pillow 13.0.0, numpy 2.3.5.

### Zählung

Namen der roten Tests als Mengen (`grep -E '^(FAIL|ERROR): ' | sort`, Vergleich mit `comm`):

| Umgebung | Tests | Failures | Errors | rote Namen | gegenüber Systemumgebung |
|---|---|---|---|---|---|
| System-Python 3.13, wie bisher gemessen | 823 | 39 | 6 | 45 | Ausgangslage; 3 Ladefehler |
| `.venv` aus `make test-env` (Pillow 13.0.0) | 882 | 56 | 45 | 101 | 3 Ladefehler behoben; 59 Namen neu, alle in `test_product_image_batch` und `test_birefnet_onnx` |
| Vergleichsumgebung: wie `.venv`, aber Pillow 12.3.0 aus der Fassung `5466700` | 882 | 39 | 3 | 42 | 3 Ladefehler behoben; kein Name neu |

Die drei Ladefehler (`test_bigbuy_admin_guard`, `test_bigbuy_import_integrity`, `test_cart_stock_integrity`) sind mit den Paketen des Shop-Dienstes behoben. Dadurch laufen 59 Tests zusätzlich; keiner davon ist rot. Die 42 verbleibenden Namen sind die bekannten aus `test_browser_evidence` und `test_requirements_reconciliation` (veraltete Pins und Belege, `pin-rebase-2026-11-14.md`). Ein neuer Fehler im Code des Shop-Dienstes wurde nicht sichtbar.

Die 59 zusätzlichen roten Namen in `.venv` sind der Widerspruch aus Abschnitt 2 und kein Fehler der Umgebung: Der CI-Job wäre mit denselben Dateien genauso rot.

## 2. Pillow: Entscheidung nötig (OA-053, erster Teil)

Lage: `requirements-image.txt` verlangt seit `268fee9` (Dependabot, PR 79, 13.11.2026) Pillow 13.0.0. `tools/product_image_batch.py` (Zeile 84), `tools/birefnet_onnx.py` (Zeile 202) und `tools/birefnet_rembg_batch.py` (Zeile 60) nehmen ausschließlich 12.3.0 an und brechen sonst geschlossen ab (`unverified_pillow_version`, `pillow_version_not_verified`).

Geprüft am 14.11.2026:

| Frage | Ergebnis |
|---|---|
| Herkunft Pillow 13.0.0 | Die 83 Prüfsummen der Datei sind genau die 83 Dateien, die PyPI für 13.0.0 führt (keine fehlt, keine zusätzlich); Veröffentlichung 16.10.2026, nicht zurückgezogen. `pip --require-hashes` hat das Wheel in `make test-env` angenommen |
| Bekannte Schwachstellen in 12.3.0 | OSV führt für Pillow 12.3.0 62 Meldungen (43 GHSA, 19 PYSEC), alle mit „behoben in 13.0.0“; fünf sind als kritisch eingestuft, darunter Pufferüberläufe beim Dekodieren von JPEG und beim Schreiben von TIFF. Für 13.0.0 führt OSV keine Meldung |
| Tests mit 13.0.0 und unverändertem Werkzeug | 59 rote Namen (17 Failures, 42 Errors in den beiden Modulen) |
| Tests mit 13.0.0, wenn die drei Versionsprüfungen probeweise auf 13.0.0 gestellt sind (nicht eingecheckt) | `tests.test_product_image_batch` und `tests.test_birefnet_onnx`: 54 von 54 grün |
| Zurücksetzen der Datei auf die Fassung `5466700` | ergäbe wieder genau die Bytes des Pins `4d76d84ff2a0…` im Register und in `evidence/birefnet-onnx-2026-10-27/verification.json`; die Tests wären grün |

Nicht umgesetzt, weil beide Wege eine Freigabe brauchen:

- **Weg A, zurück auf 12.3.0:** kleinste Änderung, Pin wieder gültig. Schreibt aber eine Version fest, für die 62 Schwachstellen gemeldet sind, in ein Werkzeug, das Bilddateien aus dem Katalog dekodiert.
- **Weg B, Werkzeuge auf 13.0.0 freigeben:** ändert in drei Werkzeugen eine Schutzprüfung (D-017). Die Tests sind dann grün. Dadurch weichen neu ab: der Pin von `tools/product_image_batch.py` im Register sowie der Pin von `tools/birefnet_onnx.py` im Register und in `evidence/birefnet-onnx-2026-10-27/verification.json` (beide heute gültig). Decken würde sie ein neuer Lauf des Bild-Batches und des BiRefNet-Adapters mit Pillow 13.0.0, der die Erhaltung der Produktpixel erneut belegt; die grünen Unit-Tests allein belegen den Lauf mit Modell nicht.

Empfehlung: Weg B. Bis zur Entscheidung bleibt der Zustand geschlossen: Mit der Datei aus dem Repository verweigert das Werkzeug den Dienst.

## 3. `skills-lock.json`: Entscheidung nötig (OA-053, zweiter Teil)

Ursache der neun leeren `computedHash`: `276e6e0` (PR 138) hat den Composio-Skill mit `npx skills add` installiert. Das Werkzeug hebt dabei die Sperrdatei von Version 1 auf 2 und berechnet die Prüfsummen der vorhandenen Einträge aus den installierten Ordnern unter `.agents/skills/` neu. Dieser Ordner steht in `.gitignore`; die neun Vercel-Skills waren in der Sitzung nicht installiert. Das Werkzeug (`skills` 1.8.1, `readLocalLock` und `migrateComputedHash`) leert in diesem Fall die Prüfsumme und meldet später „no content hash in skills-lock.json (migrated from version 1, and the installed skill was missing or did not match)“.

Nicht gefüllt, weil kein zulässiger Weg vorliegt:

- Die neun Skills liegen in keinem Checkout des Repositorys. Es gibt keine Bytes, deren Prüfsumme sich berechnen ließe.
- Die Werte der Fassung `409db50` (Version 1) in die Sperrdatei der Version 2 zurückzuschreiben, würde eine Prüfung behaupten, die nicht stattgefunden hat.
- Füllen ginge nur durch erneutes Installieren aus `vercel-labs/agent-skills` mit dem Werkzeug. Das holt fremde Inhalte zum heutigen Stand der Quelle und ist ein Abhängigkeitswechsel.

Zu entscheiden: die neun Skills erneut installieren (dann mit festem Commit der Quelle und Durchsicht des Unterschieds zur Fassung vom 26.10.2026) oder die neun Einträge entfernen, weil die Skills nicht ausgeliefert und laut `config/integrations/vercel-agent-setup.json` nur als Projektinstallation vermerkt sind.

## 4. `pnpm install --frozen-lockfile` (umgesetzt)

Befund: pnpm 12 beendet die Installation mit `ERR_PNPM_IGNORED_BUILDS`, wenn ein Paket ein Installationsskript hat und in `allowBuilds` nicht entschieden ist. Offen waren `esbuild@0.28.2` und `workerd@1.20261110.1` (beide seit PR 97 über `wrangler` im Baum).

| Aufruf, frisches Verzeichnis | vorher | nachher |
|---|---|---|
| `pnpm install --frozen-lockfile` | Exit 1 | Exit 0 |
| `pnpm install --frozen-lockfile --ignore-scripts` (CI, Vercel) | Exit 0 | Exit 0 |
| derselbe Aufruf nach einem gescheiterten Lauf ohne `--ignore-scripts` | Exit 1 | Exit 0 |

Änderung in `pnpm-workspace.yaml`: `esbuild: false` und `workerd: false` unter `allowBuilds`, neben dem vorhandenen `core-js: false`. Die Skripte werden damit ausdrücklich nicht ausgeführt; das ist derselbe Zustand, in dem CI und Vercel mit `--ignore-scripts` schon installieren. Die Programme kommen aus den Plattformpaketen: `esbuild` 0.28.2 übersetzt (Probe mit `transformSync`), `workerd --version` meldet `2026-11-10`. `pnpm-lock.yaml` ist unverändert.

Pin-Folge: `pnpm-workspace.yaml` steht mit den alten Bytes `6965e54b79e2…` unter `build_input_sha256` in `evidence/observability-integration-2026-10-28/browser-exceptions-next.json` und `browser-exceptions-vite.json` (heute `9139f254b773…`). Dieses Feld schreibt der Harness, kein Prüfer und kein Test liest es; beide Belege sind über `apps/web/package.json` und `pnpm-lock.yaml` schon veraltet. Es entsteht kein neuer roter Test. Decken würde die Abweichung ein neuer Lauf von `apps/site/tests/browser-exception-capture.mjs` auf beiden Oberflächen; der hängt an der offenen Entscheidung 3 aus `pin-rebase-2026-11-14.md`.

## 5. Wackliger Test `chat-route-errors.test.mjs` (OA-059)

PR 164 hatte die zufällige Gesprächskennung per Muster aus dem Rohtext entfernt und danach den Rohtext auf „429“ durchsucht. Jetzt wird die Antwort zerlegt:

- JSON-Antwort: genau `{ "error": "chat_llm_failed" }`, kein weiteres Feld.
- SSE-Antwort: genau zwei Ereignisse, jedes als einzelne `data:`-Zeile. Das erste hat genau die Felder `type`, `conversationId`, `persisted`, `guidance`; die Kennung muss die Form `local-<UUID>` haben. Das zweite ist genau `{ "type": "error", "error": "chat_llm_failed" }`. Die Suche nach Ursache und Anbieterstatus läuft über alle Felder außer der Kennung.

Die Prüfung ist enger als zuvor: Ein zusätzliches Feld fällt jetzt auf, auch wenn es keines der gesuchten Wörter enthält. Gegenprobe (nicht eingecheckt): ein Feld `status: 429` im Fehlerereignis und ein Feld `cause` in der JSON-Antwort lassen den Test jeweils scheitern. 200 Läufe in Folge: 200 grün, 0 rot.

## 6. Abhängigkeitsdateien mit veraltetem Pin: geprüfte Herkunft

Kein Pin nachgezogen. `config/acceptance-coverage.json` war nicht Teil dieses Auftrags; die Tabelle ist die Grundlage für die Entscheidung des Inhabers nach dem Skill („Abhängigkeitswechsel ohne geprüfte Herkunft“).

| Datei | Pin im Register (Fassung) | heutige Bytes | Änderung seit dem Pin | Herkunft geprüft |
|---|---|---|---|---|
| `apps/web/package.json` | `868230c51557…` (`0d18fbe`, 31.10.) | `96eba9a2e9f9…` | ein Commit, `fb17a0d` (PR 97): Skripte `cf:build`, `cf:preview`, `cf:deploy`; Entwicklungsabhängigkeiten `@opennextjs/cloudflare ^1.20.17` und `wrangler ^4.161.0` | Sperrdatei löst auf 1.20.17 und 4.161.0 auf; deren `integrity` stimmt mit der npm-Registry überein, beide mit Signatur und Herkunftsnachweis, Quellen `opennextjs/opennextjs-cloudflare` und `cloudflare/workers-sdk`. Auffällig: beide mit `^`, alle übrigen Einträge der Datei sind exakt |
| `apps/shop-api/requirements.txt` | `15e850c9f224…` (`5fe246d`, 31.10.) | `375cc4cefbf2…` | ein Commit, `454cd3e` (PR 98): `dnspython` 2.9.1 auf 2.9.2 mit zwei Prüfsummen | beide Prüfsummen sind die zwei Dateien, die PyPI für 2.9.2 führt (Wheel und Quellarchiv, 03.11.2026); PyPI führt für 2.9.1 GHSA-vvf4-9x63-8xvv (CVE-2026-128089), behoben in 2.9.2. In `make test-env` installiert, 59 Shop-Tests grün |
| `requirements-image.txt` | `4d76d84ff2a0…` (`5466700`, 27.10.) | `261c2981ef43…` | ein Commit, `268fee9` (PR 79): Pillow 12.3.0 auf 13.0.0 | Abschnitt 2. Herkunft belegt, aber die Datei widerspricht dem Werkzeug |
| `skills-lock.json` | `6ee354fd704b…` (`409db50`, 26.10.) | `00ba9ea69b9a…` | ein Commit, `276e6e0` (PR 138): Version 1 auf 2, Eintrag `composio`, neun Prüfsummen geleert | Abschnitt 3. Herkunft der neun Einträge heute nicht prüfbar |

Einschätzung je Datei, als Vorlage:

- `apps/shop-api/requirements.txt`: Herkunft belegt, Sicherheitskorrektur, die Datei wird von den Tests ausgeführt. Nachziehen vertretbar, sobald der Inhaber zustimmt.
- `apps/web/package.json`: Herkunft der beiden Pakete belegt. Vorher klären, ob die beiden Bereiche mit `^` gewollt sind; exakte Versionen wären die Regel der Datei. Die Datei ist zusätzlich Quelle der Ausnahme-Belege, die an der offenen Entscheidung 3 hängen.
- `requirements-image.txt`, `skills-lock.json`: erst nach den Entscheidungen aus Abschnitt 2 und 3.

Neuer Befund dabei: `apps/shop-api/requirements.in` nennt seit `fada1d5` (08.11.2026) `higgsfield-client==0.2.0`, `requirements.txt` wurde danach nicht neu erzeugt und enthält das Paket nicht. Nur `apps/shop-api/examples/seedance_text_to_video.py` verwendet es. Die gesperrte Datei ist damit nicht mehr das Ergebnis ihrer Eingabedatei. Nicht behoben: Das wäre ein neues Paket ohne geprüfte Herkunft.

Heutige Bytes der in dieser Arbeit geänderten Dateien: `pnpm-workspace.yaml` `9139f254b773…`, `Makefile` `79983eb76741…`, `apps/web/auth/tests/chat-route-errors.test.mjs` `4866e6cc37ef…`. Für `Makefile` führt `config/policy-source-inventory.json` die Bytes `31a9178c51b9…` (78 Zeilen); der Eintrag war schon vor dieser Arbeit veraltet (auf `2906f58`: `cc47ee755d56…`). Für die Testdatei besteht keine Bindung.

## 7. Governance-Audit meldet `inventory_status: blocked` (OA-062)

`python3 tools/check_ai_coverage.py --audit` endet mit Exit 0 und meldet `blocked`. Exit 0 heißt dort laut Ausgabe nur „Audit aufgerufen“ (`exit_zero_means`); ohne `--audit` endet das Werkzeug mit Exit 1.

Ursache: `config/ai-enforcement-coverage.json` wurde zuletzt am 30.10.2026 geändert (`cfaca08`). Das Werkzeug vergleicht die dort registrierten 53 Quellen mit den heutigen Bytes und durchsucht 470 Dateien nach KI-Merkmalen. Es aktualisiert Prüfsummen ausdrücklich nicht selbst (`automatic_hash_refresh: false`).

| Stand | Status | geänderte registrierte Quellen | nicht registrierte Kandidaten |
|---|---|---|---|
| `cfaca08` (30.10.2026, letzte Fassung des Registers) | blocked | 5 | 3 |
| `ae85910` (vor dem Pin-Lauf vom 14.11.2026) | blocked | 11 | 10 |
| `2906f58` (heute) | blocked | 11 | 12 |

Die Blockade bestand also schon mit der letzten Fassung des Registers und ist keine Folge des Pin-Laufs. Heute betroffen:

- geändert seit der Registrierung: `api/agent-chat.ts`, `packages/agent-runtime/managed-live-chat.ts`, `model-agent.ts`, `public-orientation.ts`, `apps/agent-gateway/server.py`, `apps/site/src/main.tsx`, `apps/web/components/Workspace.tsx`, `tools/automation/ai_review.py`, `tools/check_llm_policy.py`, `tools/seo_catalog.py`, `tools/verify_factory_contract.py`;
- nicht registriert: `apps/web/app/api/chat/route.ts`, `apps/web/lib/chat-llm.ts`, `chat-client.ts`, `chat-contract.ts`, `packages/agent-runtime/nine-router-model.ts`, `apps/agent-gateway/integrations.py`, `apps/shop-api/shop/nexify_api.py`, `apps/web/scripts/generate-public-data.mjs`, `tools/check_hermes_config.py`, `tools/content_audit.py`, `.github/workflows/ci.yml`, `.github/workflows/vercel-deploy.yml`.

Vermerk: Die Meldung ist berechtigt und wird nicht beseitigt. Der seit D-010 ausgelieferte Chat (`/api/chat` mit `chat-llm.ts`) steht nicht im KI-Durchsetzungsregister. Die Blockade löst sich nur durch eine inhaltliche Durchsicht jeder der 23 Dateien mit Eintrag im Register; ein bloßes Nachtragen der Prüfsummen würde diese Durchsicht behaupten. Das ist eine eigene Arbeit (Aufwand M), kein Teil dieses Zweigs.

## 8. Gates

Stand des Zweigs mit dieser Arbeit, Systemumgebung wie bei der Vorher-Messung:

| Gate | vorher (`2906f58`) | nachher |
|---|---|---|
| `python3 -m unittest discover -s tests` (System-Python) | 823 Tests, 39 Failures, 6 Errors, 45 Namen | 823 Tests, 39 Failures, 6 Errors, 45 Namen; `comm -13` leer, `comm -23` leer |
| `make test-env && make test-py` | Ziel fehlte | 882 Tests, 56 Failures, 45 Errors, 101 Namen (Abschnitt 1) |
| `cd apps/web && node --test auth/tests/*.test.mjs` | 105 von 105 | 105 von 105 |
| `cd apps/site && node --test` | 132 von 132 | 132 von 132 |
| `make check` | Exit 0 | Exit 0 |
| `make governance-check` | Exit 0, `inventory_status: blocked` | Exit 0, `inventory_status: blocked` (Abschnitt 7) |
| `node tools/lint.mjs` | – | 0 Diagnosen, nach `node apps/web/scripts/generate-public-data.mjs` (im frischen Worktree fehlt sonst `apps/web/.generated/installation.json`, 3 Diagnosen) |
| `node tools/ds-audit-cli.js` | – | 0 Fehler, 0 Warnungen |
| `pnpm install --frozen-lockfile` | Exit 1 | Exit 0 |

## 9. Nicht geprüft

- Kein Lauf mit Python 3.12.15 (CI-Vorgabe), nur 3.12.3.
- Kein Lauf des Bild-Batches oder des BiRefNet-Adapters mit Modell; nur die Unit-Tests.
- Kein Browserlauf, kein Build von `apps/web` oder `apps/site`, kein Gleichmacher, keine Live-Prüfung. Die Änderung berührt keine ausgelieferte Datei.
- Ob `wrangler` und `opennextjs-cloudflare build` ohne die Installationsskripte vollständig arbeiten, ist über die beiden Programmproben hinaus nicht geprüft.
- Die Schwachstellenlage stammt aus OSV und PyPI am 14.11.2026; eine eigene Bewertung, welche Meldungen den Bild-Batch tatsächlich treffen, liegt nicht vor.

# CI grün und Merge-Strecke · 15.11.2026

Stand dieses Berichts: 15.11.2026, Sitzung auf Zweig `claude/ci-gruen`.
Ausgangsstand: `main` = `9c9c806` (`origin/main` identisch), Arbeitsbaum zu
Beginn sauber (`git status --short` leer). Zweig-Kopf dieses Berichts:
`01ed1ad` (zum Zeitpunkt des CI-Nachweises in Abschnitt 4).

Ergebnis in einem Satz: Von den beiden roten Prüfungen ist **eine behoben und
in echtem CI grün nachgewiesen**; die zweite ist **belegt, aber nicht
regelkonform behebbar** und liegt als Entscheidung beim Inhaber. Es wurde
**kein Pull Request gemergt**.

## 0. Werkzeuge, Voraussetzungen und eine Umgebungswarnung

- `python3 tools/project_skills.py verify` →
  `{"global_installation": false, "installed_by_this_command": false,
  "semantic_review_or_live_activation_claimed": false, "skills": 5,
  "status": "verified_project_skill_sources", …}`.
- Gelesen und angewendet: `AGENTS.md`, `CLAUDE.md`, `DECISIONS.md`,
  `.claude/skills/nexify-belege-und-pins/SKILL.md`, dazu im Verlauf
  `docs/09-final/testumgebung-und-abhaengigkeiten-2026-11-14.md` und
  `docs/09-final/offene-arbeiten-2026-11-14.md` (OA-053).
- Laufumgebung: Node 22.23.4, pnpm 12.15.0, Python 3.13.18 (CI: 3.12.15),
  Playwright **1.63.0** aus `/opt/node-tools` mit Chromium aus
  `/opt/pw-browsers`. Festgelegt ist in `.github/evidence-runner/package.json`
  **1.65.0**; diese verlangt Chromium-Revision 1254, vorhanden ist 1243, und
  ein Nachinstallieren ist in dieser Umgebung nicht vorgesehen. Die Abweichung
  ist nach `nexify-belege-und-pins` („Browser-Belege erneuern", Schritt 2) zu
  nennen und wird hiermit genannt.
- Die Historie war beim Start ein Shallow-Clone (52 Commits); für die
  Pin-Herkunft wurde `git fetch --unshallow` ausgeführt (535 Commits).

### Umgebungswarnung, die eine frühere Zahl dieses Berichts korrigiert

Das System-Python dieser Umgebung trug zunächst **Pillow 12.3.0**.
`requirements-image.txt` pinnt aber **Pillow 13.0.0**, und genau das
installiert CI. Eine lokale Messung mit 12.3.0 ist deshalb **nicht**
repräsentativ für CI: sie verbirgt 59 rote Fälle (Abschnitt 3.3).

| Lokale Messung `python3 -m unittest discover -s tests` | rote Namen |
|---|---|
| mit System-Pillow 12.3.0 (nicht repräsentativ) | 42 |
| mit gepinntem Pillow 13.0.0 (wie CI) | **101** |
| CI, Lauf 43769486085, Job `repository` | **101** (`failures=56, errors=45`) |

Mit Pillow 13.0.0 stimmt die lokale Messung exakt mit CI überein, auch in der
Verteilung je Modul. Alle Zahlen unten sind, wo nicht anders gesagt, die
Zahlen **mit 13.0.0**. Dieselbe Einschränkung trifft die „42" in
`docs/09-final/testumgebung-und-abhaengigkeiten-2026-11-14.md`, Zeile 30
(dort als „Vergleichsumgebung … Pillow 12.3.0" ausdrücklich gekennzeichnet).

## 1. Belegte Ursache je roter Prüfung

Beide Prüfungen wurden lokal am unveränderten `main`-Stand `9c9c806`
ausgeführt.

### 1a · Job `next-web`, Schritt `pnpm --filter @nexify/web test:auth`

- **Befehl:** `pnpm --filter @nexify/web test:auth`
  (in `apps/web`: `node --test auth/tests/*.test.mjs`).
- **Zahl der Tests:** 138. Davon **137 grün, 1 rot**.
- **Roter Fall:** `not ok 4 - every page the assistant may name exists as a
  public page of the right brand`, in
  `apps/web/auth/tests/chat-guidance.test.mjs:55`.
- **Erste Fehlermeldung wörtlich:**
  `ENOENT: no such file or directory, open
  '…/apps/site/.generated/public-site.json'`
  (`failureType: 'testCodeFailure'`, `code: 'ENOENT'`, Aufrufkette
  `readFileSync` → `json` → `chat-guidance.test.mjs:11:33`).
- **Ursache:** Der Test liest `apps/site/.generated/public-site.json`, ein
  **erzeugtes, nicht eingechecktes Artefakt**
  (`git check-ignore -v` → `apps/site/.gitignore:4:.generated/`), geschrieben
  von `node apps/site/scripts/generate-public-data.mjs`. Die CI-Jobs
  `repository` und `react-site` erzeugen es, der Job **`next-web` nicht**.
- **Bestand der Fehler schon auf `main`?** **Ja**, am sauberen Arbeitsbaum von
  `9c9c806` reproduziert. Er entsteht nicht durch einen Zweig.
- Unabhängige Bestätigung: Dieselbe Ursache steht, von anderer Seite gefunden,
  in der Commit-Nachricht von PR 203 (`b7e88db`): „echte Ursache ist fehlende
  generierte Testeingabe apps/site/.generated/public-site.json … Behebung
  (AA): Generierungsschritt vor dem Web-Test."

### 1b · Job `repository`, Schritt „Audit, behavior, integrity and architecture"

- **Befehl:** `make check && make test && make check-arch`, nach
  `node apps/site/scripts/generate-public-data.mjs`.
- `make check` ist **grün**. `node tools/lint.mjs` ist grün
  (`tsconfig.json: 9 files, 0 diagnostics`; `apps/site: 91 files, 0`;
  `apps/web: 165 files, 0`), `node tools/ds-audit-cli.js` ist grün
  (`0 Fehler, 0 Warnungen`).
- `make test` ist **rot**: `Ran 912 tests in 66.094s`,
  `FAILED (failures=56, errors=45, skipped=17)` → **101 rote Fälle**
  (CI-Zahl, lokal mit Pillow 13.0.0 identisch reproduziert).
- `make check-arch` ist ebenfalls rot: `ARCH-010 VERLETZT`,
  `ARCH-027 VERLETZT`, `ARCH-029 VERLETZT`. Alle drei prüfen dieselben
  Ursachen und bringen keine neue hinzu: ARCH-010 =
  `tools/check_browser_evidence.py`; ARCH-027 =
  `verify_requirements_reconciliation.py` **und**
  `test_requirements_reconciliation.py`; ARCH-029 =
  `check_browser_evidence.py` **und** `test_local_shop_http.py`. Der CI-Schritt
  bricht schon bei `make test` ab, deshalb nennt das CI-Protokoll
  `check-arch` nicht.
- **Bestand der Fehler schon auf `main`?** **Ja** — mit einer wichtigen
  Einschränkung zur Beweislage, siehe Abschnitt 2.

**Verteilung der 101 roten Fälle:**

| Modul | rote Fälle | Ursache |
|---|---|---|
| `test_product_image_batch` | 54 | Pillow-Versionssperre (3.3) |
| `test_birefnet_onnx` | 5 | Pillow-Versionssperre (3.3) |
| `test_requirements_reconciliation` | 29 | veraltete Pins (3.1) |
| `test_browser_evidence` | 13 | veraltete Browser-Belege (3.2) |

## 2. Beweislage: `main` ist seit dem 12.11.2026 nicht mehr in CI gemessen

Gemessen über die Actions-API: Jeder abgeschlossene CI-Lauf auf `main` ab
`d1837e6` (13.11.2026, 20:55 UTC) endet nach 2 bis 4 Sekunden mit `failure`,
83 Läufe in Folge, mit der Begründung des Check-Runs wörtlich: *„The job was
not started because an Actions budget is preventing further use."* Auch der
Lauf zu `9c9c806` selbst (Lauf 43645301737, 14.11.2026, 21:54 UTC) hat **kein
Protokoll, keine Schritte, `runner_id: 0`** — er wurde niemals an einen Runner
vergeben.

Daraus folgt: Für `main` auf `9c9c806` existiert **keine** CI-Messung der
Python-Kette. Der letzte Lauf auf `main`, der wirklich Jobs ausgeführt hat, ist
43233013005 (`edfba82`, 12.11.2026) mit
`Ran 839 tests` / `FAILED (failures=113, errors=6, skipped=16)`.

Der in Abschnitt 4 ausgewertete Lauf auf `claude/ci-gruen` ist damit die
**erste echte CI-Messung des Inhalts von `main` seit dem 12.11.2026**; er
unterscheidet sich von `main` nur um die zwei Dateien dieses Zweigs
(`.github/workflows/ci.yml`, dieser Bericht).

## 3. Die drei Ursachen des Jobs `repository`

### 3.1 Veraltete Pins im führenden Register (29 Fälle)

`config/acceptance-coverage.json` führt 362 Pins; **27** stimmen nicht mehr mit
den heutigen Bytes überein. `test_recorded_source_hashes_match_actual_bytes`
verlangt Übereinstimmung **aller** Pins (ein Subtest je Quelle, 28 davon rot),
`test_register_and_human_view_match` meldet zusätzlich 41 Fundstellen
„Stale implementation source" über 24 verschiedene Dateien (eine Datei steht in
mehreren Anforderungszeilen).

Erste Fehlermeldung wörtlich:
`AssertionError: Lists differ: ['Stale implementation source: apps/site/s…
.ts'] != []` — `First list contains 41 additional elements.`
`First extra element 0: 'Stale implementation source: apps/site/src/Auth.tsx'`

### 3.2 Veraltete Browser-Belege (13 Fälle)

Drei von sieben Belegprüfern in `tools/check_browser_evidence.py` sind rot:

| Prüfer | erste Meldung wörtlich |
|---|---|
| `check_evidence` | `stale_source_sha256: apps/site/src/Auth.tsx` |
| `check_public_fallbacks` | `stale_fallback_source: apps/web/components/Workspace.tsx` |
| `check_exception_evidence` | `stale_exception_source: apps/web/package.json` |

Grün sind `check_shop_ui_mock_evidence`, `check_catalog_ui_mock_evidence`,
`check_consent_ui`, `check_workspace_read`.
`python3 tools/check_text_resize_evidence.py` ist grün
(`{"scope": "stored measured source-bound text-resize evidence only",
"routes": 43}`).

Veraltete Pins je Belegdatei, gemessen:

- `evidence/browser-critical-2026-11-10/critical-browser.json` — **19**:
  `source_sha256`: `apps/site/src/Auth.tsx`, `apps/web/app/globals.css`,
  `HomeContent.tsx`, `Workspace.tsx`, `PageConcept.css`,
  `config/site-map.json`; `auxiliary_source_sha256`:
  `PublicRequestFallback.tsx`, `OracleCompanion.tsx`, `WorkspaceRebuild.css`,
  `HomeConcept.css`, `AtelierFilm.css`, `IdentityHero.tsx`,
  `apps/site/tests/browser-identity-hero.mjs`, `packages/tokens/tokens.css`,
  `apps/site/tests/browser-critical.mjs`; `sdk_source_sha256`:
  `PublicOrientationChat.tsx`, `PublicOrientationChat.css`,
  `api/agent-chat.ts`, `packages/agent-runtime/public-orientation.ts`.
- `evidence/frontend-reliability-2026-10-27/public-fallbacks.json` — **2**:
  `Workspace.tsx`, `PublicRequestFallback.tsx`.
- `evidence/observability-integration-2026-10-28/browser-exceptions-vite.json`
  und `…-next.json` — je **2**: `apps/web/package.json`, `pnpm-lock.yaml`.

### 3.3 Pillow-Versionssperre: OA-053, Entscheidung liegt beim Inhaber (59 Fälle)

Gemessene Ursache: `requirements-image.txt` verlangt seit `268fee9`
(**Dependabot**, PR 79, „Bump pillow from 12.3.0 to 13.0.0") Pillow 13.0.0.
`tools/product_image_batch.py:84` nimmt ausschließlich `'12.3.0'` an und bricht
sonst geschlossen ab. Fehlermeldung aus dem CI-Protokoll wörtlich:

```
require(__version__ == '12.3.0', 'unverified_pillow_version')
tools.product_image_batch.ImageBatchRejected: unverified_pillow_version
```

Folgefehler sind unter anderem
`AssertionError: "^total_pixel_limit$" does not match "unverified_pillow_version"`
und `"onnx_inference_failed" does not match "pillow_version_not_verified"`.
Betroffen sind **drei** Werkzeuge: `tools/product_image_batch.py:84`,
`tools/birefnet_onnx.py:202`, `tools/birefnet_rembg_batch.py:60`.

**Das ist kein neuer Befund.** Die Lage ist bereits vollständig analysiert und
ausdrücklich als Inhaberentscheidung geführt:
`docs/09-final/testumgebung-und-abhaengigkeiten-2026-11-14.md`, Abschnitt 2
(Weg A zurück auf 12.3.0, Weg B Werkzeuge auf 13.0.0, Empfehlung dort Weg B),
`docs/09-final/offene-arbeiten-2026-11-14.md` OA-053
(„ENTSCHEIDUNG NÖTIG … Abhängigkeitswechsel und braucht den Inhaber") und
`PROGRESS.md`, Zeile 56.

**Was diese Sitzung neu beiträgt** (Messung, keine Änderung):

| Messung | Ergebnis |
|---|---|
| Anteil von OA-053 am roten Job `repository` | **59 von 101** roten Fällen — der größte Einzelposten |
| Weg B probeweise gesetzt (drei Versionsprüfungen auf 13.0.0, **verworfen**) | `test_product_image_batch` 54/54 und `test_birefnet_onnx` 5/5 grün; Gesamtzahl 101 → 44 |
| davon neu abweichend | genau 2: die bis dahin **gültigen** Pins von `tools/product_image_batch.py` und `tools/birefnet_onnx.py` |
| Rest nach Weg B | **42** Fälle (13 `test_browser_evidence`, 29 `test_requirements_reconciliation`) |

**Warum nicht umgesetzt.** Der Versuch wurde vollständig zurückgenommen
(`git checkout --` auf die drei Dateien; Arbeitsbaum sauber). Gründe:

1. Weg B ändert in drei Werkzeugen eine **Schutzprüfung** und ist nach
   `DECISIONS.md` D-017 sowie nach `nexify-belege-und-pins`
   („Nicht nachziehen ohne Freigabe des Inhabers: … Abhängigkeitswechsel")
   eine Inhaberentscheidung. OA-053 führt sie offen.
2. Das Repository setzt für diese beiden Pins ausdrücklich eine **stärkere
   Belegart** als grüne Unit-Tests: „die grünen Unit-Tests allein belegen den
   Lauf mit Modell nicht" — nötig wäre ein neuer Lauf des Bild-Batches und des
   BiRefNet-Adapters mit Pillow 13.0.0, der die Erhaltung der Produktpixel
   erneut belegt. Mein erster Versuch hatte genau diese zu schwache Belegart
   verwendet; das war falsch und ist zurückgenommen.
3. Mein Versuch war außerdem **unvollständig**: `tools/birefnet_rembg_batch.py`
   war nicht mitgeändert. Das bestätigt, dass der Eingriff größer ist als er
   aussieht.
4. Entscheidend für die Reihenfolge: Weg B macht den Job **nicht grün**
   (42 Fälle bleiben). Er kauft also keinen Fortschritt für Stufe 3 oder 4 ein,
   der ein Übergehen eines offenen Freigabevorbehalts rechtfertigen würde.

## 4. Was geändert wurde, mit Messung vorher/nachher

Geändert sind genau zwei Dateien: `.github/workflows/ci.yml` (6 Zeilen) und
dieser Bericht.

### 4a · `next-web`: fehlende Voraussetzung im Arbeitsablauf bereitgestellt

Im Job `next-web` läuft vor `pnpm --filter @nexify/web test:auth` nun der
Schritt, den zwei andere Jobs schon haben:

```yaml
- name: Generate the source-bound public page snapshot the auth tests read
  run: node apps/site/scripts/generate-public-data.mjs
```

Begründung: genau der in Stufe 2 vorgesehene Fall — der Prüfung fehlte eine
Voraussetzung (ein erzeugtes Artefakt), die nun sauber im Arbeitsablauf
bereitgestellt wird. **Kein Test wurde abgeschaltet, übersprungen, gelöscht
oder aufgeweicht; keine Schwelle gesenkt; kein `--passWithNoTests`, kein
`continue-on-error`, keine Prüfung aus dem Arbeitsablauf entfernt.**
`.github/workflows/ci.yml` trägt keinen Pin in `config/acceptance-coverage.json`
(`source_sha256` enthält die Datei nicht), die Änderung macht also keinen Beleg
neu ungültig.

| Messung | Tests | grün | rot |
|---|---|---|---|
| lokal vorher (`main`, Artefakt gelöscht) | 138 | 137 | 1 |
| lokal nachher | 138 | **138** | **0** |
| **CI**, Lauf 43769486085, Schritt `test:auth` | — | **success** | — |

Der lokale Nachweis wurde absichtlich mit vorher gelöschtem
`apps/site/.generated` erbracht (`rm -rf apps/site/.generated`), damit nicht
ein Nebeneffekt einer früheren Ausführung das Ergebnis trägt.

### 4b · Rückwirkungsfreiheit

Die Namensliste der roten Python-Fälle ist vor und nach der Änderung identisch
(`comm -13` und `comm -23` geben beide nichts aus). `make check`,
`node tools/lint.mjs` und `node tools/ds-audit-cli.js` sind grün;
`make check-arch` bleibt mit denselben drei Regeln rot wie vorher.

### 4c · `repository`: nicht geändert

Begründung in Abschnitt 5.

## 5. Offene Grenze: die Belegkette lässt sich nicht regelkonform grün machen

Nach `nexify-belege-und-pins` darf ein Pin nur mit Browserlauf, grünem Test
oder geprüftem Diff nachgezogen werden, Belegdateien werden **nie von Hand**
geschrieben, und „die schwächere Belegart ersetzt nicht die stärkere": bindet
ein Browserlauf die Datei, trägt ein grüner Test den Pin nicht. Für die 13
Dateien, die zugleich im Register und in einem der drei roten
Browser-Beleg-Prüfer stehen, ist der Browserlauf damit die **verlangte**
Belegart.

Die drei zugehörigen Harnesse laufen am heutigen Stand **nicht** durch. In
allen drei Fällen ist die Ursache keine Umgebungsfrage, sondern dass der
Harness eine Oberfläche misst, die es so nicht mehr gibt.

**(i) `apps/site/tests/browser-critical.mjs`** — Lauf mit
`PLAYWRIGHT_MODULE`/`NEXIFY_EVIDENCE_DIRECTORY` nach frischem
`build:standalone` + `pnpm build`: die **fünf** in `CRITICAL_CHECKS`
verlangten Prüfungen sind **grün**
(`account_control_fallback_and_auth_routes_present`,
`nex2fly_product_copy_all_locales_and_section_focus_preserves_route`,
`native_product_menu_and_direct_legal_footer_links`,
`hero_scene_and_controls_across_five_desktop_sizes`,
`keyboard_skip_link_preserves_standalone_product_hash_route`).
Danach bricht der Lauf ab: `page.waitForResponse: Timeout 30000ms exceeded
while waiting for event "response"`, Zeile 92, Prüfung
`sdk_guided_preview_works_when_visitor_session_is_404`.
Eigene Messung mit mitgeschnittenen Anfragen: der Absendeknopf
(`data-testid="chat-send"`, nicht deaktiviert) löst **`POST /api/chat`** aus.
Der Harness leitet aber **`/api/agent-chat`** auf den importierten Handler
`api/agent-chat.ts` um und wartet auf dessen Antwort; `/api/chat` fällt in die
Sperre „andere `/api/`-Pfade → 403", der Chat zeigt daraufhin „Diese Nachricht
konnte so nicht verarbeitet werden." (0 Anfragen am Harness-Backend,
0 Assistenz-Nachrichten). Der öffentliche Chat liegt heute in
`apps/web/app/api/chat/route.ts` und ruft über `ROUTER_URL`/`ROUTER_KEY` ein
echtes Modell; der vom Harness geprüfte deterministische Weg ohne Provider ist
nicht mehr der Weg des Clients.

**(ii) `apps/site/tests/browser-exception-capture.mjs`** (Fläche `vite`) — die
ersten Prüfungen laufen (kein SDK ohne Einwilligung, echter unbehandelter
Fehler und Rejection abgefangen), dann:
`locator.waitFor: Timeout 30000ms exceeded. waiting for
locator('.request-fallback').first() to be visible`, Zeile 60, Prüfung
`actual_chat_boundary_reported_once_shell_preserved`.
Ursache gemessen: Der Harness sperrt Anfragen, deren Pfad
`PublicOrientationChat.tsx` enthält, um den **nachgeladenen** Chat-Brocken
scheitern zu lassen; `DeferredChatBoundary` soll dann `PublicRequestFallback`
(Klasse `request-fallback`) zeigen. `apps/web/components/Workspace.tsx`
importiert `PublicOrientationChat` inzwischen aber **statisch** (Zeile 13) und
bindet es in Zeile 507 innerhalb `DeferredChatBoundary` ein. Ein statisch
gebündelter Import lässt sich nicht mehr durch Sperren einer Nachlade-Anfrage
zum Scheitern bringen; die Fehlergrenze wird nicht mehr ausgelöst. Das
Schutzziel („ein abgewiesener nachgeladener Brocken darf Hülle, Navigation und
Formulare nicht entfernen") ist am heutigen Stand **nicht mehr messbar wie
beschrieben** — nicht, weil der Harness falsch zählt, sondern weil der Chat
nicht mehr nachgeladen wird.

**(iii) `apps/site/tests/browser-public-fallbacks.mjs`** — Lauf nach echtem
`pnpm --filter @nexify/web build` und `next start`. Der erste Fall
(`case 320 de unavailable`) bricht ab:
`locator.waitFor: Timeout 30000ms exceeded. waiting for
locator('.action-card').locator('.request-fallback') to be visible`, Zeile 86.
Ursache im Quelltext belegt: `apps/web/app/layout.tsx`, Zeile 41 setzt
`const gateway=process.env.NODE_ENV==='development';` und übergibt den Wert an
`<Workspace gateway={gateway}>` (Zeile 42). In
`apps/web/components/Workspace.tsx` steht der gesamte Block mit
`.conversation` und `.action-card` hinter `{gateway&&<>` (Zeile 509, Kommentar
dort: „nur dort im Dokument, wo es die Funktionen hinter /api gibt"). In einem
**Produktionsbuild** ist `NODE_ENV==='production'`, also `gateway === false`,
also existiert `.action-card` im Dokument überhaupt nicht. Der Harness bedient
aber ausdrücklich den echten Produktionsbuild über `next start`
(Kopfkommentar, Zeile 2). Die geprüfte Fläche ist damit **seit dieser Änderung
nur noch im Entwicklungsmodus vorhanden**; der Beleg kann in der von ihm selbst
festgelegten Umgebung nicht mehr entstehen.

**Warum ich hier nicht weiterrepariere.** Alle drei Fälle würden verlangen, den
Inhalt eines Gates oder das Verhalten der ausgelieferten Seite neu zu
bestimmen: bei (i) welchen Chat-Weg die Prüfungen `sdk_*` künftig messen (und
damit auch `SDK_SOURCE_PATHS`/`SDK_CRITICAL_CHECKS` in
`tools/check_browser_evidence.py`), bei (ii) ob der Chat wieder nachgeladen
wird, bei (iii) ob die Projektvorbereitung im Produktionsbuild wieder
erscheinen soll (ein Umstellen des Belegs auf den Entwicklungsmodus würde seine
Aussagekraft über die ausgelieferte Seite verlieren). Das erste ist eine
Änderung der Prüfliste, das zweite und dritte eine Änderung am Verhalten der
ausgelieferten Seite. Beides ist durch die Grenzen dieses Auftrags
ausgeschlossen („Keine Prüfliste kürzen", „alles mit ungeklärtem Befund einer
unabhängigen Prüfung → nur melden", Design-Sperre) und gehört nach
`nexify-belege-und-pins` („Entfällt ein Schutzziel ersatzlos, entscheidet der
Inhaber über Ersatzprüfung oder Stilllegung") dem Inhaber. Ein Nachziehen der
Pins von Hand ist ausdrücklich verboten („Kein Pin, um einen Test grün zu
bekommen. Kein Beleg ohne Lauf.").

**Folge für Stufe 3 und 4.** Der Job `repository` bleibt rot.
`test_recorded_source_hashes_match_actual_bytes` verlangt, dass **alle** 362
Pins stimmen; ein Nachziehen nur der 14 nicht von einem roten Harness
gebundenen Dateien macht den Job nicht grün. Auch Weg B aus 3.3 macht ihn
nicht grün. Damit ist die Bedingung für Stufe 4 („erst wenn Stufe 3 grün ist")
nicht erfüllt, und es wurde **kein Pull Request gemergt**.

## 6. CI-Nachweis auf `claude/ci-gruen`

Lauf 43769486085 (`push`) und 43769539794 (`pull_request`), Kopf `01ed1ad`.

| Job | Ergebnis |
|---|---|
| `next-web` | **success** (vorher die rote Prüfung 1a) |
| `react-site` | success |
| `openapi-schema` | success |
| `postgres-isolation` | success |
| `repository` | **failure** — Schritt 9 „Audit, behavior, integrity and architecture", `Ran 912 tests` / `FAILED (failures=56, errors=45, skipped=17)`, `make: *** [Makefile:39: test] Error 1` |

**Vier von fünf Jobs sind grün; `repository` bleibt rot wie in Abschnitt 5
begründet.** Von den fünf Jobs war `next-web` die eine Prüfung, die dieser
Zweig behebt — sie ist in echtem CI grün.

### Zwei weitere rote Signale am Pull Request, die nicht von diesem Zweig kommen

- **Check `review`** (`.github/workflows/ai-review.yml`, ein gebundener
  OpenRouter-Aufruf mit `secrets.OPENROUTER_API_KEY`): `failure`. Nicht von
  diesem Zweig: Die **zehn** jüngsten Läufe dieses Workflows, über die PRs 201,
  202, 203 und diesen, sind **alle** `failure`. Der Workflow checkt zudem die
  Basis aus, nicht den Kopf dieses Zweigs. Nicht weiter untersucht (Abschnitt 7).
- **Fünf Vercel-Status** (`site`, `site-k23m`, `site-gjp7`, `web`, `web-2kby`):
  `Deployment failed.` mit der Begründung wörtlich
  *„The provided GitHub repository can't be found."* Das sind verwaiste
  Vercel-Projekte. Die beiden nach `AGENTS.md` maßgeblichen Projekte melden im
  selben Kommentar **Ready**: `…-ut7r` (`prj_lKQEWQKzjqq4Ifvmwy6dh1XCIgVR`,
  Produktion) und `…-s4k5`. Der Diff dieses Zweigs (ein Kommentar und ein
  Schritt in `ci.yml`, eine neue Datei unter `docs/`) kann eine fehlende
  Repository-Bindung in einem Vercel-Projekt nicht verursachen. **Keine
  Vercel-Einstellung und keine Umgebungsvariable wurde angefasst.**

### Nachtrag: zweiter Zweigkopf `327a418` (nur dieser Bericht geändert)

Bestätigt dasselbe Bild, Lauf 43771440934:

| Job | Ergebnis |
|---|---|
| `next-web` · `react-site` · `openapi-schema` · `postgres-isolation` | **success** |
| `repository` | **failure** — `Ran 912 tests in 67.036s`, `FAILED (failures=56, errors=45, skipped=17)`, `make: *** [Makefile:39: test] Error 1` |

`next-web` ist damit auf **zwei** Köpfen grün, die Zahlen des Jobs
`repository` sind unverändert. Zu diesem Kopf meldeten beide maßgeblichen
Vercel-Projekte **Ready** (`…-s4k5` und `…-ut7r`), und die fünf verwaisten
Projekte aus Abschnitt 6 erschienen im Vercel-Kommentar **nicht erneut**.
Ob das dauerhaft ist, ist nicht gemessen; die Beobachtung aus Abschnitt 6
bleibt als Befund stehen.

Nach dem Lauf wurde einmalig ein Kommentar an PR 211 gesetzt, der die rote
Prüfung benennt und begründet, warum sie nicht von diesem Zweig kommt
(verlangt von den Regeln für einen selbst eröffneten Pull Request). Sonst
wurde an keinem Pull Request kommentiert.

## 7. Vorschlag für die Entscheidung des Inhabers

Vier getrennte, je einzeln entscheidbare Punkte. Die ersten drei sind
Voraussetzung dafür, dass `main` wieder grün werden kann.

1. **Pillow / OA-053** (Abschnitt 3.3, größter Einzelposten mit 59 von 101):
   Weg A (zurück auf 12.3.0, 62 gemeldete Schwachstellen) oder Weg B
   (drei Werkzeuge auf 13.0.0, Empfehlung der bestehenden Analyse). Bei Weg B
   zusätzlich nötig: ein Lauf des Bild-Batches und des BiRefNet-Adapters mit
   Pillow 13.0.0 als Beleg für die Erhaltung der Produktpixel, und
   `tools/birefnet_rembg_batch.py` mitändern.
2. **Chat-Weg der SDK-Prüfungen** (Befund (i)): Soll
   `apps/site/tests/browser-critical.mjs` künftig
   `apps/web/app/api/chat/route.ts` mit einem Stellvertreter-Router messen (so
   wie `apps/web/auth/tests/chat-route-guidance.test.mjs` es bereits tut), oder
   bleibt `api/agent-chat.ts` ein eigener, weiterhin ausgelieferter Weg, der
   dann auch vom Client wieder benutzt werden muss?
3. **Nachladen des Chats und Projektvorbereitung** (Befunde (ii) und (iii)):
   Soll `PublicOrientationChat` wieder nachgeladen werden, und ist
   `gateway=process.env.NODE_ENV==='development'` der gewollte Dauerzustand?
   Im zweiten Fall misst `browser-public-fallbacks.mjs` eine Fläche, die es in
   Produktion nicht gibt, und es entscheidet sich Ersatzprüfung oder
   Stilllegung.
4. **Verwaiste Vercel-Projekte** (Abschnitt 6): Die fünf Projekte `site`,
   `site-k23m`, `site-gjp7`, `web`, `web-2kby` melden an jedem Pull Request
   einen roten Status, ohne Bezug zum Inhalt. Aufräumen wäre eine Änderung an
   der Vercel-Einrichtung und ist hier nicht erfolgt.

## 8. Merge-Strecke

**Nicht begonnen**, weil Stufe 3 nicht grün ist (Abschnitt 5). Kein Pull
Request wurde gemergt, kommentiert oder auf „bereit" gesetzt.

Beobachtung, die vom Auftrag abweicht: `list_pull_requests` zeigt **42** offene
Pull Requests, und **keiner** von ihnen ist ein Entwurf (`draft: false` bei
allen 42). Die Annahme „Entwurf auf ‚bereit' setzen" trifft also nicht zu.
Keiner der 42 trägt eine Erneuerung der Belege oder Pins im Titel; die Arbeit
aus Abschnitt 5 liegt in keinem offenen Zweig vor.

Offene Nummern (Stand 15.11.2026, 22:29 UTC): 210, 209, 208, 207, 206, 205,
204, 203, 202, 201, 200, 197, 195, 193, 192, 190, 189, 187, 186, 184, 163, 150,
147, 135, 126, 125, 124, 123, 122, 121, 120, 119, 118, 115, 105, 75, 74, 73,
67, 65, 60, 48. Dazu neu dieser Zweig als PR 211 (Entwurf).

## 9. Was ich nicht geprüft habe

- **Keine Live-Messung der Produktion.** `node tools/live-check.mjs
  https://nexifyai.de` und `node tools/gleichmacher.mjs https://nexifyai.de`
  wurden **nicht** ausgeführt, weil nach Auftrag erst nach einem Merge gemessen
  wird und kein Merge stattfand. Über den Zustand der Startseite sagt dieser
  Bericht daher nichts.
- **Ursache des Checks `review` nicht untersucht.** Belegt ist nur, dass er auf
  mehreren fremden PRs genauso rot ist; ob ein Schlüssel fehlt, abgelaufen ist
  oder der Anbieter ablehnt, habe ich nicht festgestellt. Geheimnisse wurden
  nicht gelesen.
- **Die vier grünen Belegprüfer wurden nicht neu erhoben**, nur geprüft.
- **Die vier übrigen Harnesse im Verzeichnis wurden nicht ausgeführt** — nur
  die drei, die zu den roten Prüfern gehören.
- **Weg B aus 3.3 ist nicht belegt**, nur gemessen: die grünen Unit-Tests sind
  nach Maßstab des Repositorys keine ausreichende Belegart, und der dafür
  nötige Lauf mit Modell wurde nicht ausgeführt.
- **`evidence/birefnet-onnx-2026-10-27/verification.json` und
  `evidence/catalog-image-batch-2026-10-27/verification.json`** binden die
  beiden Pillow-Werkzeuge ebenfalls; kein Prüfer und kein Test liest sie
  (`grep` über `tools/check_browser_evidence.py` und `tests/`), sie sind
  historische Aufzeichnungen. Sie wurden nicht angefasst.
- **Lokale Umgebung:** `pip install --require-hashes -r requirements-image.txt`
  scheitert hier unter Python 3.13 am numpy-Hash („Expected sha256 0d8163f4…
  Got 11e06aa0…"), weil ein anderes Rad als unter der CI-Version 3.12.15
  gezogen wird. Pillow 13.0.0 ließ sich einzeln installieren; damit stimmt die
  lokale Zahl mit CI überein. Der CI-Schritt selbst ist grün.
- **Kundenrepository `studienkolleg-aachen`**: nicht berührt
  (Mandantentrennung).
- **Keine Vercel-Umgebungsvariablen, Rechte oder Sicherheitsstufen berührt.**
  Nichts gelöscht. Keine Zahlung, kein Abonnement. Kein Force-Push, kein
  `git stash`, keine fremde Historie umgeschrieben.

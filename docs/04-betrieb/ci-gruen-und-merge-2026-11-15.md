# CI grün und Merge-Strecke · 15.11.2026

Stand dieses Berichts: 15.11.2026, Sitzung auf Zweig `claude/ci-gruen`.
Ausgangsstand: `main` = `9c9c806` (`origin/main` identisch), Arbeitsbaum zu
Beginn sauber (`git status --short` leer).

Dieser Bericht ist fortlaufend geschrieben. Er trennt **belegte Ursache**,
**durchgeführte Änderung**, **Messung** und **offene Grenze**.

## 0. Werkzeuge und Voraussetzungen

- `python3 tools/project_skills.py verify` →
  `{"global_installation": false, "installed_by_this_command": false,
  "semantic_review_or_live_activation_claimed": false, "skills": 5,
  "status": "verified_project_skill_sources", …}`.
- Gelesen und angewendet: `AGENTS.md`, `CLAUDE.md`, `DECISIONS.md`,
  `.claude/skills/nexify-belege-und-pins/SKILL.md`.
- Laufumgebung: Node 22.23.4, pnpm 12.15.0, Python 3.13.18 (CI: 3.12.15),
  Playwright **1.63.0** aus `/opt/node-tools` mit Chromium aus
  `/opt/pw-browsers`. Die in `.github/evidence-runner/package.json`
  festgelegte Fassung ist **1.65.0**; sie verlangt Chromium-Revision 1254,
  vorhanden ist 1243. Ein Nachinstallieren ist in dieser Umgebung nicht
  vorgesehen. Diese Abweichung ist nach
  `nexify-belege-und-pins`, Abschnitt „Browser-Belege erneuern", Schritt 2
  zu nennen und wird hiermit genannt.
- Die Historie war beim Start ein Shallow-Clone (52 Commits); für die
  Pin-Herkunft wurde `git fetch --unshallow` ausgeführt (535 Commits).

## 1. Belegte Ursache je roter Prüfung

Beide Prüfungen wurden lokal am unveränderten `main`-Stand `9c9c806`
ausgeführt. Der CI-Lauf 43716992096 (Zweig `claude/shop-eigene-domain`,
Kopf `660f56d3`) diente nur zur Bestätigung derselben zwei roten Jobs.

### 1a · Job `next-web`, Schritt `pnpm --filter @nexify/web test:auth`

- **Befehl:** `pnpm --filter @nexify/web test:auth`
  (entspricht `node --test auth/tests/*.test.mjs` in `apps/web`).
- **Zahl der Tests:** 138. Davon **137 grün, 1 rot**.
- **Roter Fall:** `not ok 4 - every page the assistant may name exists as a
  public page of the right brand`, in
  `apps/web/auth/tests/chat-guidance.test.mjs:55`.
- **Erste Fehlermeldung wörtlich:**
  `ENOENT: no such file or directory, open
  '…/apps/site/.generated/public-site.json'`
  (`failureType: 'testCodeFailure'`, `code: 'ENOENT'`,
  Aufrufkette `readFileSync` → `json` → `chat-guidance.test.mjs:11:33`).
- **Ursache:** Der Test liest `apps/site/.generated/public-site.json`. Diese
  Datei ist ein **erzeugtes, nicht eingechecktes Artefakt**
  (`git check-ignore -v` → `apps/site/.gitignore:4:.generated/`); sie wird von
  `node apps/site/scripts/generate-public-data.mjs` geschrieben. Die CI-Jobs
  `repository` (Schritt „Generate the source-bound public page snapshot") und
  `react-site` erzeugen sie, der Job **`next-web` nicht**. Damit lief
  `test:auth` dort ohne seine Voraussetzung.
- **Bestand der Fehler schon auf `main`?** **Ja.** Reproduziert am sauberen
  Arbeitsbaum von `9c9c806`. Er entsteht nicht durch einen Zweig.

### 1b · Job `repository`, Schritt „Audit, behavior, integrity and architecture"

- **Befehl:** `make check && make test && make check-arch`, nach
  `node apps/site/scripts/generate-public-data.mjs`.
- `make check` ist **grün** (u. a. 10/10 im DNS-Teil, Audit ohne Fehler).
- `make check-arch` ist ebenfalls **rot**, mit drei verletzten Regeln:
  `ARCH-010 VERLETZT`, `ARCH-027 VERLETZT`, `ARCH-029 VERLETZT`
  (`make: *** [Makefile:65: check-arch] Error 1`). Alle drei prüfen dieselben
  beiden Ursachen und bringen keine neue hinzu:
  ARCH-010 = `python3 tools/check_browser_evidence.py`;
  ARCH-027 = `verify_requirements_reconciliation.py` **und**
  `test_requirements_reconciliation.py`;
  ARCH-029 = `check_browser_evidence.py` **und** `test_local_shop_http.py`.
  Der CI-Schritt bricht schon bei `make test` ab, deshalb nennt das
  CI-Protokoll `check-arch` nicht.
- `make test` ist **rot**: `Ran 912 tests in 66.889s`,
  `FAILED (failures=39, errors=3, skipped=16)` →
  `make: *** [Makefile:39: test] Error 1`. Insgesamt **42 rote Fälle**
  (Namensliste erhoben mit
  `python3 -m unittest discover -s tests | grep -E '^(FAIL|ERROR): '`).
- **Verteilung der 42 roten Fälle:**
  - **28** in `tests/test_requirements_reconciliation.py`:
    27 × `test_recorded_source_hashes_match_actual_bytes` (je ein
    Subtest pro Quelle) und 1 × `test_register_and_human_view_match`.
  - **14** in `tests/test_browser_evidence.py` (11 `FAIL`, 3 `ERROR`).
- **Erste Fehlermeldung wörtlich** (Browser-Beleg-Kette):
  `browser_evidence_checker.EvidenceError: stale_source_sha256:
  apps/site/src/Auth.tsx`
- **Erste Fehlermeldung wörtlich** (Register):
  `AssertionError: Lists differ: ['Stale implementation source: apps/site/s…
  .ts'] != []` — `First list contains 41 additional elements.`
  `First extra element 0: 'Stale implementation source: apps/site/src/Auth.tsx'`
- **Ursache:** Die hash-gebundenen Quellen (Pins) und die Browser-Belege sind
  **veraltet**. Zahlreiche gemergte Änderungen haben gebundene Dateien
  verändert, ohne den zugehörigen Beleg neu zu erheben.
  - `config/acceptance-coverage.json` führt 362 Pins; **27** stimmen nicht
    mehr mit den heutigen Bytes überein (`verify_requirements_reconciliation`
    meldet 41 Fundstellen über 24 verschiedene Dateien, weil eine Datei in
    mehreren Anforderungszeilen steht).
  - Drei von sieben Belegprüfern in `tools/check_browser_evidence.py` sind rot:
    `check_evidence` (`stale_source_sha256: apps/site/src/Auth.tsx`),
    `check_public_fallbacks` (`stale_fallback_source:
    apps/web/components/Workspace.tsx`) und `check_exception_evidence`
    (`stale_exception_source: apps/web/package.json`).
    Grün sind `check_shop_ui_mock_evidence`, `check_catalog_ui_mock_evidence`,
    `check_consent_ui`, `check_workspace_read`.
    `python3 tools/check_text_resize_evidence.py` ist grün
    (`{"scope": "stored measured source-bound text-resize evidence only",
    "routes": 43}`).
- **Bestand der Fehler schon auf `main`?** **Ja.** Alle 42 Fälle am sauberen
  Arbeitsbaum von `9c9c806` reproduziert.

#### Veraltete Pins je Belegdatei (gemessen)

`evidence/browser-critical-2026-11-10/critical-browser.json` — 19 veraltete
Pins: `source_sha256`: `apps/site/src/Auth.tsx`, `apps/web/app/globals.css`,
`apps/web/components/HomeContent.tsx`, `apps/web/components/Workspace.tsx`,
`apps/web/components/PageConcept.css`, `config/site-map.json`;
`auxiliary_source_sha256`: `PublicRequestFallback.tsx`, `OracleCompanion.tsx`,
`WorkspaceRebuild.css`, `HomeConcept.css`, `AtelierFilm.css`,
`IdentityHero.tsx`, `apps/site/tests/browser-identity-hero.mjs`,
`packages/tokens/tokens.css`, `apps/site/tests/browser-critical.mjs`;
`sdk_source_sha256`: `PublicOrientationChat.tsx`, `PublicOrientationChat.css`,
`api/agent-chat.ts`, `packages/agent-runtime/public-orientation.ts`.

`evidence/frontend-reliability-2026-10-27/public-fallbacks.json` — 2:
`apps/web/components/Workspace.tsx`,
`apps/web/components/PublicRequestFallback.tsx`.

`evidence/observability-integration-2026-10-28/browser-exceptions-vite.json`
und `…-next.json` — je 2: `apps/web/package.json`, `pnpm-lock.yaml`.

## 2. Was geändert wurde und warum

### 2a · `next-web`: fehlende Voraussetzung im Arbeitsablauf bereitgestellt

`.github/workflows/ci.yml`, Job `next-web`: vor
`pnpm --filter @nexify/web test:auth` wird der bereits in zwei anderen Jobs
verwendete Schritt eingefügt:

```yaml
- name: Generate the source-bound public page snapshot the auth tests read
  run: node apps/site/scripts/generate-public-data.mjs
```

Begründung: genau der von `nexify`-Auftrag Stufe 2 vorgesehene Fall — der
Prüfung fehlte eine Voraussetzung (ein erzeugtes Artefakt), die nun sauber im
Arbeitsablauf bereitgestellt wird. **Kein Test wurde abgeschaltet,
übersprungen, gelöscht oder aufgeweicht; keine Schwelle gesenkt; kein
`--passWithNoTests`, kein `continue-on-error`.** `.github/workflows/ci.yml`
trägt keinen Pin in `config/acceptance-coverage.json` (`source_sha256` enthält
die Datei nicht), die Änderung macht also keinen Beleg neu ungültig.

**Messung vorher/nachher** (lokal, gleicher Befehl):

| | Tests | grün | rot |
|---|---|---|---|
| vorher (`main`, ohne erzeugtes Artefakt) | 138 | 137 | 1 |
| nachher (Artefakt erzeugt) | 138 | **138** | **0** |

Der Nachweis wurde absichtlich mit vorher gelöschtem `apps/site/.generated`
erbracht (`rm -rf apps/site/.generated`), damit nicht ein Nebeneffekt einer
früheren Ausführung das Ergebnis trägt.

**Rückwirkungsfreiheit belegt.** Die Namensliste der roten Python-Fälle ist
vor und nach der Änderung identisch (`comm -13` und `comm -23` über
`vorher.txt`/`nachher.txt` geben beide nichts aus; je 42 Zeilen). Ergänzend
grün: `make check`, `node tools/lint.mjs`
(`tsconfig.json: 9 files, 0 diagnostics`, `apps/site: 91 files, 0 diagnostics`,
`apps/web: 165 files, 0 diagnostics`), `node tools/ds-audit-cli.js`
(`0 Fehler, 0 Warnungen`). `make check-arch` bleibt mit denselben drei Regeln
rot wie vorher.

### 2b · `repository`: Belege erneuern — Befund statt Reparatur

Hier wurde **nichts geändert**. Begründung im nächsten Abschnitt.

## 3. Offene Grenze: die Belegkette lässt sich nicht regelkonform grün machen

Nach `nexify-belege-und-pins` darf ein Pin nur mit Browserlauf, grünem Test
oder geprüftem Diff nachgezogen werden, Belegdateien werden **nie von Hand**
geschrieben, und „die schwächere Belegart ersetzt nicht die stärkere":
bindet ein Browserlauf die Datei, trägt ein grüner Test den Pin nicht.
Für die 13 Dateien, die zugleich im Register und in einem der drei roten
Browser-Beleg-Prüfer stehen, ist der Browserlauf damit die **verlangte**
Belegart.

Die drei zugehörigen Harnesse laufen am heutigen Stand **nicht** durch. Die
Ursache ist in zwei Fällen keine Umgebungsfrage, sondern dass der Harness eine
Oberfläche misst, die es so nicht mehr gibt:

**(i) `apps/site/tests/browser-critical.mjs`** — Lauf mit
`PLAYWRIGHT_MODULE`/`NEXIFY_EVIDENCE_DIRECTORY` nach frischem
`build:standalone` + `pnpm build`:
die **fünf** in `CRITICAL_CHECKS` verlangten Prüfungen sind **grün**
(`account_control_fallback_and_auth_routes_present`,
`nex2fly_product_copy_all_locales_and_section_focus_preserves_route`,
`native_product_menu_and_direct_legal_footer_links`,
`hero_scene_and_controls_across_five_desktop_sizes`,
`keyboard_skip_link_preserves_standalone_product_hash_route`).
Danach bricht der Lauf ab:
`page.waitForResponse: Timeout 30000ms exceeded while waiting for event
"response"` in Zeile 92, Prüfung
`sdk_guided_preview_works_when_visitor_session_is_404`.
Eigene Messung mit mitgeschnittenen Anfragen: der Absendeknopf
(`data-testid="chat-send"`, nicht deaktiviert) löst eine Anfrage auf
**`POST /api/chat`** aus. Der Harness leitet aber **`/api/agent-chat`** auf den
importierten Handler `api/agent-chat.ts` um und wartet auf dessen Antwort;
`/api/chat` fällt in die Sperre „andere `/api/`-Pfade → 403", der Chat zeigt
daraufhin „Diese Nachricht konnte so nicht verarbeitet werden."
(0 Anfragen am Harness-Backend, 0 Assistenz-Nachrichten).
Der öffentliche Chat liegt heute in `apps/web/app/api/chat/route.ts` und ruft
über `ROUTER_URL`/`ROUTER_KEY` ein echtes Modell; der vom Harness geprüfte
deterministische Weg ohne Provider (`api/agent-chat.ts`) ist nicht mehr der
Weg des Clients.

**(ii) `apps/site/tests/browser-exception-capture.mjs`** (Fläche `vite`) —
die ersten Prüfungen laufen (kein SDK ohne Einwilligung, echter unbehandelter
Fehler und Rejection abgefangen), dann:
`locator.waitFor: Timeout 30000ms exceeded. waiting for
locator('.request-fallback').first() to be visible`, Zeile 60, Prüfung
`actual_chat_boundary_reported_once_shell_preserved`.
Ursache gemessen: Der Harness sperrt Anfragen, deren Pfad
`PublicOrientationChat.tsx` enthält, um den **nachgeladenen** Chat-Brocken
scheitern zu lassen; `DeferredChatBoundary` soll dann
`PublicRequestFallback` (Klasse `request-fallback`) zeigen.
`apps/web/components/Workspace.tsx` importiert `PublicOrientationChat`
inzwischen aber **statisch** (`import PublicOrientationChat from
"./PublicOrientationChat";`, Zeile 13) und bindet es in Zeile 507 innerhalb
`DeferredChatBoundary` ein. Ein statisch gebündelter Import lässt sich nicht
mehr durch Sperren einer Nachlade-Anfrage zum Scheitern bringen; die
Fehlergrenze wird nicht mehr ausgelöst. Das Schutzziel des Belegs („ein
abgewiesener nachgeladener Brocken darf Hülle, Navigation und Formulare nicht
entfernen") ist damit am heutigen Stand **nicht mehr messbar wie
beschrieben** — nicht, weil der Harness falsch zählt, sondern weil der Chat
nicht mehr nachgeladen wird.

**(iii) `apps/site/tests/browser-public-fallbacks.mjs`** — Lauf nach echtem
`pnpm --filter @nexify/web build` und `next start`. Der erste Fall
(`case 320 de unavailable`) bricht ab:
`locator.waitFor: Timeout 30000ms exceeded. waiting for
locator('.action-card').locator('.request-fallback') to be visible`,
Zeile 86.
Ursache gemessen und im Quelltext belegt: `apps/web/app/layout.tsx`, Zeile 41
setzt `const gateway=process.env.NODE_ENV==='development';` und übergibt den
Wert an `<Workspace gateway={gateway}>` (Zeile 42). In
`apps/web/components/Workspace.tsx` steht der gesamte Block mit
`.conversation` und `.action-card` hinter `{gateway&&<>` (Zeile 509, Kommentar
dort: „nur dort im Dokument, wo es die Funktionen hinter /api gibt").
In einem **Produktionsbuild** ist `NODE_ENV==='production'`, also
`gateway === false`, also existiert `.action-card` im Dokument überhaupt
nicht. Der Harness bedient aber ausdrücklich den echten Produktionsbuild über
`next start` (Kopfkommentar Zeile 2). Die geprüfte Fläche ist damit **seit
dieser Änderung nur noch im Entwicklungsmodus vorhanden**; der Beleg kann in
der von ihm selbst festgelegten Umgebung nicht mehr entstehen.
Das ist kein Zählfehler des Harness und keine Umgebungsfrage, sondern eine
Aussage über den heutigen ausgelieferten Stand.

**Warum ich hier nicht weiterrepariere.** Alle drei Fälle würden verlangen, den
Inhalt eines Gates neu zu bestimmen: bei (i) welchen Chat-Weg die
SDK-Prüfungen `sdk_*` künftig messen (und damit auch
`SDK_SOURCE_PATHS`/`SDK_CRITICAL_CHECKS` in `tools/check_browser_evidence.py`),
bei (ii) ob der Chat wieder nachgeladen wird oder das Schutzziel anders
geprüft wird, bei (iii) ob die Projektvorbereitung im Produktionsbuild wieder
erscheinen soll oder der Beleg auf den Entwicklungsmodus umgestellt wird (was
seine Aussagekraft über die ausgelieferte Seite verlieren würde).
Das erste ist eine Änderung der Prüfliste, das zweite und dritte eine
Änderung am Verhalten der ausgelieferten Seite. Alles ist durch die Grenzen
dieses Auftrags ausgeschlossen („Keine Prüfliste kürzen", „alles mit
ungeklärtem Befund einer unabhängigen Prüfung → nur melden", Design-Sperre)
und gehört nach `nexify-belege-und-pins` („Entfällt ein Schutzziel ersatzlos,
entscheidet der Inhaber über Ersatzprüfung oder Stilllegung") dem Inhaber.
Ein Nachziehen der Pins von Hand ist ausdrücklich verboten
(„Kein Pin, um einen Test grün zu bekommen. Kein Beleg ohne Lauf.").

**Folge für Stufe 3 und 4.** Der Job `repository` bleibt rot.
`test_recorded_source_hashes_match_actual_bytes` verlangt, dass **alle** 362
Pins stimmen; ein Nachziehen nur der 14 nicht von einem roten Harness
gebundenen Dateien macht den Job nicht grün. Damit ist die Bedingung für
Stufe 4 („erst wenn Stufe 3 grün ist") nicht erfüllt, und es wurde **kein
Pull Request gemergt**.

## 4. Vorschlag für die Entscheidung des Inhabers

Drei getrennte, je einzeln entscheidbare Punkte:

1. **Chat-Weg der SDK-Prüfungen** (Befund (i)): Soll
   `apps/site/tests/browser-critical.mjs` künftig
   `apps/web/app/api/chat/route.ts` mit einem Stellvertreter-Router messen
   (so wie `apps/web/auth/tests/chat-route-guidance.test.mjs` es bereits tut),
   oder bleibt `api/agent-chat.ts` ein eigener, weiterhin ausgelieferter Weg,
   der dann auch vom Client wieder benutzt werden muss?
2. **Nachladen des Chats** (Befund (ii)): Soll `PublicOrientationChat` wieder
   nachgeladen werden (dann greift die bestehende Prüfung unverändert), oder
   wird das Schutzziel „Hülle bleibt bei Chat-Fehler erhalten" anders geprüft?
3. **Projektvorbereitung im Produktionsbuild** (Befund (iii)): Ist
   `gateway=process.env.NODE_ENV==='development'` in
   `apps/web/app/layout.tsx` der gewollte Dauerzustand? Dann misst
   `browser-public-fallbacks.mjs` eine Fläche, die es in Produktion nicht
   gibt, und der Inhaber entscheidet über Ersatzprüfung oder Stilllegung.
   Ist es ein Zwischenstand, gehört die Rückkehr der Fläche vor die
   Belegerneuerung.
4. **Reihenfolge**: Solange 1 bis 3 offen sind, bleibt `main` rot und die
   42 offenen Pull Requests bleiben gestaut. Falls der Stau vorrangig ist,
   wäre die einzige regelkonforme Zwischenlösung eine **Inhaberentscheidung**
   über 1 bis 3 — nicht ein Lockern des Gates.

## 5. Merge-Strecke

**Nicht begonnen**, weil Stufe 3 nicht grün ist (siehe Abschnitt 3).
Kein Pull Request wurde auf „bereit" gesetzt, kommentiert oder gemergt.

Beobachtung zur Lage, die vom Auftrag abweicht: `list_pull_requests` zeigt
**42** offene Pull Requests, und **keiner** von ihnen ist ein Entwurf
(`draft: false` bei allen 42). Die Annahme „Entwurf auf ‚bereit' setzen"
trifft also nicht zu. Keiner der 42 trägt eine Erneuerung der Belege oder
Pins im Titel; die Arbeit aus Abschnitt 3 liegt in keinem offenen Zweig vor.

Offene Nummern (Stand 15.11.2026): 210, 209, 208, 207, 206, 205, 204, 203,
202, 201, 200, 197, 195, 193, 192, 190, 189, 187, 186, 184, 163, 150, 147,
135, 126, 125, 124, 123, 122, 121, 120, 119, 118, 115, 105, 75, 74, 73, 67,
65, 60, 48.

## 6. Was ich nicht geprüft habe

- **Keine Live-Messung der Produktion.** `node tools/live-check.mjs
  https://nexifyai.de` und `node tools/gleichmacher.mjs https://nexifyai.de`
  wurden **nicht** ausgeführt, weil nach Auftrag erst nach einem Merge
  gemessen wird und kein Merge stattfand.
- **Kein CI-Lauf auf `claude/ci-gruen` abgewartet** über den Stand dieses
  Berichts hinaus (siehe Abschnitt 7).
- **Die vier grünen Belegprüfer wurden nicht neu erhoben**, nur geprüft.
- **`requirements-image.txt` konnte lokal nicht installiert werden**:
  `pip install --require-hashes -r requirements-image.txt` scheitert unter
  Python 3.13 an einem Hash („Expected sha256 0d8163f4… Got 11e06aa0…"), weil
  dort ein anderes Rad als unter der CI-Version 3.12.15 gezogen wird. Das ist
  eine **Beobachtung der lokalen Umgebung**, kein CI-Befund: der CI-Schritt
  „Install the explicitly pinned local image-batch test runtime" ist im Lauf
  43716992096 grün. Die davon abhängigen Tests wurden lokal daher nicht mit
  installierten Rädern geprüft.
- **Kundenrepository `studienkolleg-aachen`**: nicht berührt
  (Mandantentrennung).
- **Keine Vercel-Umgebungsvariablen, Rechte oder Sicherheitsstufen berührt.**
  Nichts gelöscht. Keine Zahlung, kein Abonnement.

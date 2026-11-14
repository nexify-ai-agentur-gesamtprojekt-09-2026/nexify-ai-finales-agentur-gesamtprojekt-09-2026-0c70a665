# Prüfkette auf `main`: Messung vom 14.11.2026 (BE-04)

Gehört zu `docs/konzept/MIGRATIONSPLAN.md` (Paket BE-04). Kennzeichnung: **IST** = gemessen · **ANNAHME** · **OFFEN**.
Es wurde nichts repariert, kein Test übersprungen oder abgeschaltet. Gemessen wurde in einem Wegwerf-Worktree.

## 1. Messaufbau

- **IST** Stand: `origin/main` = `0080377` („feinschliff … (#117)“, 14.11.2026 00:56 +0100).
- **IST** Wegwerf-Worktree (detached) unter dem Scratchpad der Sitzung, nicht im Projektbaum. Interpreter: vorhandene virtuelle Umgebung mit Python 3.13.18 und den Paketen der Shop-API (fastapi, motor, pymongo, httpx, bcrypt, pydantic …); `PATH` so gesetzt, dass `python3` diese Umgebung trifft. Node v22.23.4, pnpm 12.15.0.
- **IST** Python-Pakete für Bildverarbeitung (`numpy`, `Pillow`, siehe `requirements-image.txt`) sind in dieser Umgebung **nicht** installiert. Node-Pakete waren im frischen Worktree nicht installiert.
- **IST** Zwei Messungen: **ohne** Node-Pakete (Ausgangszustand eines frischen Checkouts) und **mit** `pnpm install --frozen-lockfile --ignore-scripts` (nur für `make test` und `make check-arch` wiederholt). Zusätzlich für Ursachenklärung: `node apps/site/scripts/generate-public-data.mjs` (erzeugt `apps/site/.generated/public-site.json`, nicht eingecheckt).
- **IST** Rohprotokolle liegen im Scratchpad (`be-check.log`, `be-arch.log`, `be-test-asis.log`, `be-test-deps.log`, `be-arch-deps.log`).

## 2. Ergebnis je Ziel

| Ziel | Ohne Node-Pakete | Mit Node-Pakete | Kern |
|---|---|---|---|
| `make check` | **grün** (Exit 0) | nicht wiederholt | `ds-audit-cli`: 0 Fehler, 0 Warnungen; `gesundheit-selbsttest`: 10 von 10 bestanden |
| `make check-arch` | **rot**: 7 von 32 Regeln verletzt (ARCH-009, 010, 019, 024, 027, 029, 031) | **rot**: 6 von 32 (ARCH-019 entfällt) | siehe Abschnitt 3 |
| `make test` | **rot**: 779 Tests, 124 Fehlschläge + 12 Fehler = **136**, 16 übersprungen | **rot**: 123 + 12 = **135**, 16 übersprungen | Gruppen in Abschnitt 4. Danach läuft `build` im Ziel nicht mehr, weil `unittest` mit Fehler endet |

- **IST** Die 16 übersprungenen Tests stehen so im Code (Skip-Markierungen); sie wurden nicht verändert und nicht untersucht (OFFEN: Gründe).
- **IST** `make test` ruft `ds-audit-cli` (grün), dann `unittest discover` (rot); der abschließende Schritt `build` (Manifest-Prüfung der Prototypen, JSON-Gültigkeit der Konfiguration) wurde wegen des Abbruchs nicht ausgeführt (OFFEN: einzeln nicht gemessen).

## 3. `make check-arch`: Verletzungen je Regel

Die Regeln stehen in `.harness/arch-rules.json`; jede ruft die genannten Prüfungen auf.

| Regel | Prüfung | Befund | Gruppe (Abschnitt 4) |
|---|---|---|---|
| ARCH-009 | `node --test apps/site/tests/*.test.mjs` | ohne Pakete 9 von 125 Tests rot (4 Dateien scheitern am Laden: fehlende Pakete `typescript`/`vite`; `editorial-films` braucht `.generated/public-site.json`; 3 Tests brauchen `vite`; 1 Text-Test). Mit Paketen und erzeugten Daten: **1 von 135** rot: `static-orientation` erwartet „NeXify AI FACTORY B.V.“ | F, E-Node, D |
| ARCH-010 | `tools/check_browser_evidence.py` | `stale_source_sha256: apps/web/components/HomeContent.tsx` | A |
| ARCH-019 | `node --test apps/site/tests/standalone.test.mjs` | ohne Pakete rot (`Cannot find package 'vite'`), mit Paketen grün | E-Node |
| ARCH-024 | `check_text_resize_evidence.py` + `test_resize_source_binding.py` | `FileNotFoundError … public-site.json`; nach Erzeugen der Datei: `ValueError: missing or stale resize source binding` | C |
| ARCH-027 | `verify_requirements_reconciliation.py` + Test | 42 Quelldateien „Stale implementation source“ | B |
| ARCH-029 | `check_browser_evidence.py` + `test_local_shop_http.py` | Browserbeleg wie ARCH-010; `test_local_shop_http` allein: 7 Tests OK | A |
| ARCH-031 | `test_product_image_batch.py` + `test_birefnet_onnx.py` | `ModuleNotFoundError: numpy` bzw. `PIL` | E-Python |

## 4. `make test`: Fehlerbilder in Gruppen

Zahlen: Messung ohne Node-Pakete (136). Je Gruppe ein Beispiel und ein Behebungsvorschlag. Vorschläge sind **ANNAHME**, nicht erprobt.

### A. Browserbelege an veraltete Quell-Hashes gebunden: 93 Tests

- **Anteil:** 90 in `tests/test_browser_evidence.py` (Fehlschläge und Fehler) + 2 Fehler (`stale_exception_source`, `stale_fallback_source`) + 1 Fehlschlag in `RetiredAltShopGateTests` (`checker.main()` liefert 1). Betrifft auch ARCH-010 und ARCH-029.
- **Beispiel:** `browser_evidence_checker.EvidenceError: stale_source_sha256: apps/web/components/HomeContent.tsx`. Weitere: `stale_exception_source: apps/web/package.json`, `stale_fallback_source: apps/web/components/Workspace.tsx`.
- **Ursache (IST für den Mechanismus, ANNAHME für den Auslöser):** Die Belege unter `evidence/**` binden Quelldateien per SHA-256. Die Startseiten-Änderungen der letzten Tage (u. a. #95, #104, #114, #116; bei den 40 geprüften Dateien in der Mehrzahl `f173054`, #102, #116, #114) haben die Quellen verändert, die Belege wurden nicht neu erzeugt. Der Prüfer bricht beim ersten veralteten Hash ab, daher scheitern fast alle Tests gleichzeitig.
- **Behebung:** Browserläufe real wiederholen und Belege neu erzeugen; Hashes nie ohne Browserlauf erneuern (so die Regelbeschreibung ARCH-010). Sinnvoll erst, wenn die Gestaltung (Zweig `claude/atelier-fehlerbehebung`) stabil ist, sonst veraltet der Beleg sofort wieder. Besitzer: Web-Schreiber.

### B und C. Anforderungsabgleich: 34 Tests (33 + 1)

- **Beispiel:** `test_recorded_source_hashes_match_actual_bytes`: `AssertionError: 'ce618eac…' != '9e47cdb5…'` (aufgezeichneter Hash ≠ Hash der Datei). Dazu `test_register_and_human_view_match`: abgeleitete Ansicht weicht vom Register ab. `verify_requirements_reconciliation.py` meldet **42** Quelldateien als „Stale implementation source“, verteilt auf `apps/web` (14), `apps/site` (7), `config/design-tokens.json` (5), `packages/tokens` (3), `config/site-map.json` (3), und je 1–2 weitere (u. a. `tools/check_browser_evidence.py`, `apps/shop-api/requirements.txt`).
- **Ursache:** Register und Dateien auseinandergelaufen; die Hash-Fingerprints stammen vor den Änderungen vom 13./14.11.
- **Behebung:** Register und abgeleitete Ansicht gemeinsam aktualisieren (Hinweis ARCH-027), offene Abnahmen beibehalten, nach A. Besitzer: Registerführer.

### C-Resize. Textvergrößerungs-Beleg: 2 Fehler

- **Beispiel:** `FileNotFoundError: apps/site/.generated/public-site.json` (`test_resize_source_binding`). Nach Erzeugen der Datei (`generate-public-data.mjs`): `ValueError: missing or stale resize source binding`.
- **Ursache:** Erzeugnis nicht eingecheckt und im frischen Checkout nicht vorhanden; danach ebenfalls veralteter Quell-Hash.
- **Behebung:** Testvoraussetzung dokumentieren oder den Test die Datei erzeugen lassen (Entscheidung des Prüfer-Besitzers); Beleg neu erzeugen wie A.

### D. Textdrift nach Rechtsformänderung: 1 Python-Test + 1 Node-Test

- **Beispiel:** `tests/test_assistant_interface_copy.py:34`: `'NeXify AI FACTORY B.V.' not found in …`. Der gleiche Wortlaut wird in `apps/site/tests/static-orientation.test.mjs` erwartet.
- **Ursache (IST):** PR 102 (`b403cf2`, 13.11.2026) hat die Rechtsform auf Eenmanszaak umgestellt (Fakt in `config/fakten.json`); die Tests erwarten noch „B.V.“.
- **Behebung:** Erwartung der Tests an den Fakt aus `config/fakten.json` binden statt an einen Festtext. Keine Änderung am Rechtstext. Besitzer: Text-Schreiber. Das ist der einzige Fehler mit einer eindeutigen, kleinen Korrektur.

### E. Umgebung: Pakete nicht installiert

- **E-Python (5 Fehler, ARCH-031):** `tests/test_birefnet_onnx.py`, `test_birefnet_parity.py`, `test_birefnet_rembg_batch.py`, `test_birefnet_rembg_pilot.py`, `test_product_image_batch.py` lassen sich nicht laden (`No module named 'numpy'` bzw. `'PIL'`). **Behebung:** `requirements-image.txt` in die Prüfumgebung installieren und im Setup nennen. Kein Codefehler.
- **E-Node (1 Python-Test, 4 Node-Dateien, ARCH-019):** `test_product_presentation_integrity` (`MODULE_NOT_FOUND`), `build-config`, `editorial-autoplay`, `server-text-history`, `shop-http`, `standalone`-Tests (fehlende Pakete `typescript`, `vite`). Mit `pnpm install --frozen-lockfile --ignore-scripts` verschwinden sie (Messung mit Paketen: 123 + 12). **Behebung:** Installation vor `make test` in das Setup aufnehmen; `make setup` meldet heute „keine Paketabhängigkeiten“ (`Makefile` Z. 5), das stimmt für diese Tests nicht (Widerspruch, OFFEN: Absicht?).
- **F (editorial-films):** `apps/site/tests/editorial-films.test.mjs` liest `apps/site/.generated/public-site.json`, das erst `apps/site` `build` erzeugt (`generate-public-data.mjs`). **Behebung:** wie C-Resize.

### Summe (ohne Node-Pakete)

| Gruppe | Anzahl |
|---|---|
| A Browserbelege veraltet | 93 |
| B + C Anforderungsabgleich | 34 |
| E-Python Bildpakete fehlen | 5 |
| C-Resize Erzeugnis fehlt / veraltet | 2 |
| D Textdrift „B.V.“ (Python) | 1 |
| E-Node Pakete fehlen (Python-Test) | 1 |
| **Summe** | **136** (124 Fehlschläge, 12 Fehler) |

Die 4 Node-Testdateien und 3 weitere Node-Tests (ARCH-009/019) liegen außerhalb von `make test` und zählen nur unter `make check-arch`.

## 5. Einordnung

- **IST** 127 von 136 Fehlern (A, B, C) gehen auf eine Ursache zurück: hashgebundene Belege und Register sind nach den Gestaltungsänderungen veraltet. 8 weitere sind Umgebung oder Erzeugnis (E: 6, Resize: 2). Ein einzelner Textfehler (D) folgt aus PR 102.
- **ANNAHME** Mit installierten Node- und Bildpaketen blieben A, B, C und D; das wurde für die Bildpakete nicht gemessen.
- **SOLL (Reihenfolge)** D zuerst (klein, eindeutig); E in das Setup; danach, nach Abschluss der Gestaltung, A, C-Resize und B in dieser Reihenfolge, jeweils mit echtem Browserlauf. Nicht abkürzen.
- **Wirkung auf den Plan:** Der Ausgangswert für alle weiteren Pakete ist **`make check` grün, `make check-arch` 7 (bzw. 6) Regeln rot, `make test` 136 (bzw. 135) Fehler**, gemessen auf `0080377`. Pakete dürfen diese Zahl nicht erhöhen.

## 6. Was nicht geprüft wurde

- Das Ziel `build` innerhalb von `make test` (siehe Abschnitt 2).
- Die Gründe der 16 übersprungenen Tests.
- Messung mit installierten Bildpaketen; Browserläufe; Einzelursache jedes der 90 Fehlschläge in Gruppe A (nur der Mechanismus und die ersten Fehlerstellen).
- Ob die Entwurfszweige (`claude/atelier-fehlerbehebung` u. a.) die Fehler beheben oder vermehren. Gemessen wurde nur `main`.
- Weitere Ziele des Makefile (`e2e`, `governance-check` u. a.).

---
name: nexify-belege-und-pins
description: Mit hash-gebundenen Quellen (Pins) und Browser-Belegen des NeXify-Monorepos richtig umgehen, also vor einer Änderung feststellen, ob eine Datei gebunden ist, und danach entscheiden, ob ein Pin nachgezogen oder ein Beleg erneuert werden darf. Verwenden vor jeder Änderung an Dateien unter config/, apps/, tests/, tools/ und an den führenden Dokumenten, bei rotem test_requirements_reconciliation oder test_browser_evidence, bei „Stale implementation source" und bei Fragen wie „darf ich die Prüfsumme anpassen" oder „wie erneuere ich den Beleg".
---

# Belege und Pins

Ein Pin belegt nur unveränderte Bytes seit einem bestandenen Lauf oder Test, keine Abnahme. Wer einen Pin ohne Beleg nachzieht, behauptet eine Prüfung, die nicht stattgefunden hat. `AGENTS.md` und `CLAUDE.md` gelten unverändert.

Maßgebliches Beispiel für das Verfahren: `docs/09-final/pin-rebase-2026-11-14.md`.

## Wo Bindungen liegen

| Ort | Was gebunden ist |
|---|---|
| `config/acceptance-coverage.json`, Feld `source_sha256` | Quellen des führenden Registers (Dokumente, Komponenten, Tests, Werkzeuge) |
| `config/presenter-sources.json` | genaue Pfade und Bytes der Präsentationsquellen, unter anderem `config/site-map.json` |
| `config/policy-source-inventory.json` | Regelquellen wie `AGENTS.md`, `CLAUDE.md` |
| `config/page-media-registry.json`, Feld `context_title` | muss dem deutschen Titel des Moduls entsprechen; eine Titeländerung zieht hier nach |
| `evidence/**` | Browser-Belege mit den Prüfsummen der Quellen, die beim Lauf galten |

Weitere Listen existieren (zum Beispiel `config/text-resize-sources.json`, `config/ai-enforcement-coverage.json`, `docs/contracts/prototype-pages.json`). Deshalb nie aus dem Gedächtnis urteilen, sondern suchen.

## Ganze Verzeichnisse sind gebunden

Nicht jede Bindung nennt die Datei beim Namen. `config/text-resize-sources.json` bindet unter `directories` vier Verzeichnisse vollständig: `apps/site/src`, `apps/web/components`, `apps/web/lib` und `packages/tokens`, mit allen Dateien der Endungen `.tsx`, `.ts`, `.mjs`, `.css`, `.json`. `tools/check_text_resize_evidence.py` liest sie rekursiv ein und verlangt genau die Datei- und Byte-Menge, die im Beleg `evidence/resize-2026-11-10/text-spacing.json` steht. Die Suche nach dem Dateipfad aus dem nächsten Abschnitt findet eine neue Datei dort deshalb nicht, obwohl sie gebunden ist.

Folgen:

- **Jede neue, geänderte, umbenannte oder gelöschte Datei** in einem dieser Verzeichnisse macht `test_current_report_has_exact_source_binding` und `test_css_script_new_source_and_uncompleted_report_fail_closed` (`tests/test_resize_source_binding.py`) rot. Grün werden sie nur durch einen neuen Lauf von `apps/site/tests/browser-text-spacing.mjs` am festen Commit („Browser-Belege erneuern“ unten). So geschehen bei PR 181 (zwei Dateien geändert, eine neu), nachgeholt mit PR 185; `docs/09-final/pin-rebase-2026-11-14.md`, Abschnitt 11.
- **Stylesheets des Shops sind doppelt gebunden.** `apps/web/components/shop/shop.css` und `Storefront.css` stehen zusätzlich in `evidence/shop-ui-mock-2026-11-09/browser-catalog.json` und `browser-shop.json`, zusammen mit den Komponenten des Shops in demselben Ordner. Eine Änderung dort verlangt den Resize-Lauf und die beiden Shop-Läufe.
- **Neue Module an einen ungebundenen Ort legen**, wenn sie nicht in ein gebundenes Verzeichnis gehören. Was keine Komponente und keine von Komponenten gelesene Bibliothek ist (Regeln für Server und Proxy, Zugriff auf Dienste, Versandlogik), liegt neben seinem Verwender, nicht unter `apps/web/lib`. Beispiel auf `main`: `apps/web/auth/indexing.ts` (PR 182). Beispiel aus einem offenen Zweig, Stand 14.11.2026 nicht auf `main`: `apps/web/mailing/` (PR 186). Vorher prüfen, dass der gewählte Ort wirklich frei ist:

  ```bash
  python3 -c "import json;print(json.load(open('config/text-resize-sources.json'))['directories'])"
  git grep -n -F '"apps/web/<ordner>/' -- config evidence docs/contracts | head
  ```

  Das Verlegen hilft nur der neuen Datei. Ändert dieselbe Arbeit auch eine gebundene Datei, ist der neue Lauf trotzdem fällig.
- **Zwei Zweige, derselbe Beleg.** Erheben zwei Zweige denselben Beleg neu, treffen beim Einholen von `main` zwei Fassungen derselben Belegdatei aufeinander (Bericht vom 14.11.2026, nicht nachgemessen). Der Konflikt wird nicht von Hand aufgelöst, auch nicht durch Wahl einer der beiden Seiten: Keine der beiden Fassungen beschreibt den zusammengeführten Stand. Stattdessen den Quelltext zusammenführen, den Harness am Merge-Stand neu laufen lassen und dessen Ausgabe als Beleg übernehmen; die vorige Fassung von `main` wandert nach `superseded/`. Besser vorher: Die koordinierende Sitzung vergibt die Neuerhebung eines Belegs an genau einen Zweig (`nexify-agenten-koordination`).

## Vor der Änderung: ist die Datei gebunden?

```bash
sha256sum <pfad>
git grep -n "<prüfsumme>"
git grep -n -F '"<pfad>"' -- config evidence docs/contracts
```

- Die heutige Prüfsumme wird gefunden: An dieser Stelle ist der Pin gültig, die Änderung macht ihn ungültig.
- Der Pfad wird gefunden, die Prüfsumme nicht: Der Pin ist schon veraltet. Die Änderung macht nichts neu rot, löst aber auch nichts.
- Nichts gefunden: nicht gebunden.

- Liegt die Datei in einem der vier Verzeichnisse aus „Ganze Verzeichnisse sind gebunden“, ist sie gebunden, auch wenn die Suche nichts findet.

Stand der Abweichungen und Namen der betroffenen Tests vorher festhalten, mit erzeugten Seitendaten und am Stand von `origin/main` (Ablauf und Begründung: `nexify-zweig-und-pr`, Schritt 3):

```bash
node apps/site/scripts/generate-public-data.mjs
node apps/web/scripts/generate-public-data.mjs
python3 tools/verify_requirements_reconciliation.py | sort | uniq -c
python3 -m unittest discover -s tests 2>&1 | grep -E '^(FAIL|ERROR): ' | sort > /tmp/vorher.txt
```

## Nach der Änderung: nachziehen oder stehen lassen

Ein Pin wird nur mit einer dieser drei Belegarten nachgezogen, und die Belegart steht neben dem Pin im Bericht:

| Belegart | Bedingung |
|---|---|
| **Browserlauf** | Ein Harness, der die Datei bindet, ist heute am festen Commit gelaufen und hat bestanden. |
| **grüner Test** | Ein heute grüner Test liest die Datei oder führt sie aus und prüft die geänderte Eigenschaft. Ein Test, der nur prüft, was nicht enthalten ist, trägt keinen Pin. |
| **geprüfter Diff** | Der Diff seit dem alten Pin ist vollständig gelesen und enthält keinen Anforderungsinhalt (reiner Verweis, angefügter Standbericht). Umfang und Inhalt des Diffs nennen. |

Trifft keine zu: Pin stehen lassen und im Bericht nennen, mit Datei, altem Pin, heutigen Bytes und Grund. Die schwächere Belegart ersetzt nicht die stärkere: Meldet der zugehörige Browserlauf einen Befund, zieht ein grüner Test den Pin nicht.

Nicht nachziehen ohne Freigabe des Inhabers: Änderungen mit Anforderungsinhalt in `AGENTS.md`, Rechtsform, Preise, Rechtstexte, Abhängigkeitswechsel ohne geprüfte Herkunft.

`tools/_update_register_shas.py` setzt Pins ohne Belegart und wird dafür nicht benutzt.

## Browser-Belege erneuern

Nur durch einen echten Browserlauf. Belegdateien werden nie von Hand geschrieben oder angepasst.

1. Festen Commit wählen, frisch bauen (`pnpm --filter @nexify/site build`, `pnpm --filter @nexify/web build`; Voraussetzungen in `nexify-zweig-und-pr`).
2. Den Harness ausführen (`apps/site/tests/browser-*.mjs`, `apps/web/auth/tests/browser-*.mjs`). Die verlangten Umgebungsvariablen und Aufrufe stehen im Kopf des jeweiligen Skripts; vorher lesen. Die festgelegte Playwright-Version steht in `.github/evidence-runner/package.json`; weicht die Laufumgebung ab, das im Bericht nennen.
3. Besteht der Lauf: alte Fassung unverändert nach `evidence/<ordner>/superseded/<name>.pre-<anlass>-<JJJJ-MM-TT>.json` verschieben, neue an den Belegpfad. Nichts löschen.
4. Besteht der Lauf nicht: keinen Beleg übernehmen. Ist die Erwartung des Harness überholt, sie mit Begründung und Commit nachführen und dasselbe Schutzziel am heutigen Stand prüfen. Meldet der Lauf dann einen echten Fehler der Seite, ist das ein Befund für den Bericht und kein Anlass, die Prüfung zu lockern.
5. Prüfer laufen lassen: `python3 tools/check_browser_evidence.py`, `python3 tools/check_text_resize_evidence.py`.

Entfällt ein Schutzziel ersatzlos, entscheidet der Inhaber über Ersatzprüfung oder Stilllegung.

## Bericht

- Tabelle „nachgezogen“: Datei, alter Pin, neuer Pin, Belegart, Beleg.
- Tabelle „bewusst nicht nachgezogen“: Datei, Pin, heutige Bytes, Grund.
- Gates vorher und nachher in Zahlen, Python per Namensvergleich (`comm -13 /tmp/vorher.txt /tmp/nachher.txt`).
- Befunde der Seite und offene Entscheidungen getrennt.

## Grenzen

- Kein Pin, um einen Test grün zu bekommen. Kein Beleg ohne Lauf. Kein Löschen alter Belege.
- Kein Konflikt in einer Belegdatei wird von Hand aufgelöst; es entscheidet der neue Lauf am Merge-Stand.
- Pins und Belege nicht nebenbei in einem Funktions- oder Text-PR umbinden; das ist eine eigene Arbeit mit eigenem PR. Der Funktions-PR nennt nur, was durch ihn neu abweicht.
- Für die führenden Dokumente gilt zusätzlich `nexify-stand-halten`, Abschnitt „Gebundene Prüfsummen“.
- `full_requirement_accepted` und `whole_system_accepted` im Register bleiben `false`.

## Was als Beleg gilt

Protokoll des Laufs mit Commit, Werkzeugversion und Zahl der Prüfungen; der grüne Test mit Namen und Zahl; der gelesene Diff mit Umfang. Ein passender Hash allein ist kein Beleg für richtiges Verhalten.

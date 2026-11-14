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

## Vor der Änderung: ist die Datei gebunden?

```bash
sha256sum <pfad>
git grep -n "<prüfsumme>"
git grep -n -F '"<pfad>"' -- config evidence docs/contracts
```

- Die heutige Prüfsumme wird gefunden: An dieser Stelle ist der Pin gültig, die Änderung macht ihn ungültig.
- Der Pfad wird gefunden, die Prüfsumme nicht: Der Pin ist schon veraltet. Die Änderung macht nichts neu rot, löst aber auch nichts.
- Nichts gefunden: nicht gebunden.

Stand der Abweichungen und Namen der betroffenen Tests vorher festhalten:

```bash
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
- Pins und Belege nicht nebenbei in einem Funktions- oder Text-PR umbinden; das ist eine eigene Arbeit mit eigenem PR. Der Funktions-PR nennt nur, was durch ihn neu abweicht.
- Für die führenden Dokumente gilt zusätzlich `nexify-stand-halten`, Abschnitt „Gebundene Prüfsummen“.
- `full_requirement_accepted` und `whole_system_accepted` im Register bleiben `false`.

## Was als Beleg gilt

Protokoll des Laufs mit Commit, Werkzeugversion und Zahl der Prüfungen; der grüne Test mit Namen und Zahl; der gelesene Diff mit Umfang. Ein passender Hash allein ist kein Beleg für richtiges Verhalten.

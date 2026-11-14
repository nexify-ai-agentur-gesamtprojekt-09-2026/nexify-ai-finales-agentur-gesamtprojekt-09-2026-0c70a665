---
name: nexify-zweig-und-pr
description: Eine Änderung am NeXify-Monorepo sauber liefern, vom eigenen Worktree über die Gates bis zum Entwurfs-PR, ohne fremde Arbeit zu berühren. Verwenden bei jeder Aufgabe, die Dateien ändert, bevor die erste Datei angefasst wird, und bei Fragen wie „wie liefere ich das", „welcher Zweig", „welche Gates", „darf ich mergen", „wie hole ich main ein" oder „was gehört in die PR-Beschreibung".
---

# Zweig und Pull Request

Eine Aufgabe, ein Worktree, ein Zweig, ein Verantwortlicher, ein Entwurfs-PR. `AGENTS.md` und `CLAUDE.md` gelten unverändert; dieser Skill ersetzt keine ihrer Regeln und kein Gate.

## Wann

Vor der ersten Änderung an einer Datei. Wer nur liest oder misst, braucht keinen Zweig.

## Schritte

1. **Stand lesen.** `PROGRESS.md`, oberster Abschnitt und „Offene Arbeiten“: Trägt ein anderer Zweig die Arbeit schon, dort nachfragen statt doppelt bauen.

2. **Eigener Worktree.** `<kurz>` ist ein sprechender Name der Aufgabe.

   ```bash
   git fetch origin main
   git worktree add /home/user/wt-<kurz> -b claude/<kurz> origin/main
   ```

   Nie im Hauptcheckout arbeiten, nie in einem fremden Worktree (`git worktree list` zeigt, was vergeben ist). Ein Zweig hat genau einen Verantwortlichen; in einen fremden Zweig wird nicht committet.

3. **Vorher messen.** Die Python-Suite ist auf `main` rot (siehe „Bekannte Lage“). Deshalb vor der ersten Änderung die Namen der Fehlschläge festhalten:

   ```bash
   python3 -m unittest discover -s tests 2>&1 | grep -E '^(FAIL|ERROR): ' | sort > /tmp/vorher.txt
   ```

4. **Arbeiten in kleinen Commits.** Ein logischer Vorgang je Commit, die Nachricht erklärt das Warum, Dokumente im selben Commit (`AGENTS.md`, „Commits und Dokumentation“). Vor jeder Änderung an einer Datei prüfen, ob sie gebunden ist: `nexify-belege-und-pins`.

5. **Gates.** Immer:

   ```bash
   make check
   node tools/ds-audit-cli.js
   python3 -m unittest discover -s tests 2>&1 | grep -E '^(FAIL|ERROR): ' | sort > /tmp/nachher.txt
   comm -13 /tmp/vorher.txt /tmp/nachher.txt
   ```

   Die letzte Zeile muss leer sein: kein neuer Fehlschlag. Zusätzlich je nach Änderung:

   | Geändert | Gate |
   |---|---|
   | JavaScript, TypeScript, CSS | `node tools/lint.mjs`, `node apps/web/scripts/atelier-literale.mjs` |
   | `apps/web` | `pnpm --filter @nexify/web test:auth`, `pnpm --filter @nexify/web build`, danach lokal `node tools/gleichmacher.mjs <basis-url>` und `node tools/live-check.mjs <basis-url>` (Ablauf in `nexify-klon-fabrik`) |
   | `apps/site` | `pnpm --filter @nexify/site test`, `pnpm --filter @nexify/site build` |
   | Grenzen zwischen `config/`, `packages/`, `apps/` | `make check-arch` |

   Fehlt `node_modules` im frischen Worktree:

   ```bash
   pnpm install --frozen-lockfile --ignore-scripts
   ```

   Vor einem direkten `next build` im frischen Worktree die erzeugten Seitendaten anlegen (das Paketskript `build` tut das selbst, `npx next build` nicht):

   ```bash
   node apps/site/scripts/generate-public-data.mjs
   ```

6. **`main` einholen, dann pushen.** Merge, kein Rebase, kein Force-Push. Nach dem Merge die Gates aus Schritt 5 erneut.

   ```bash
   git fetch origin main && git merge origin/main
   git push -u origin claude/<kurz>
   ```

   Nie direkt auf `main` pushen.

7. **Entwurfs-PR.** Immer als Entwurf, Basis `main`. In dieser Umgebung über die REST-Schnittstelle (GraphQL ist hier gesperrt, `gh pr create` scheitert daran):

   ```bash
   gh api repos/{owner}/{repo}/pulls -f title="<bereich>: <was und warum>" -f head="claude/<kurz>" -f base=main -F draft=true -F body=@/tmp/pr.md
   ```

   Die Beschreibung hat genau diese Abschnitte:

   ```markdown
   ## Zweck
   Warum es die Änderung gibt, mit Quelle (Inhaber und Datum, Entscheidung D-0NN, Befund).
   ## Umfang
   Was geändert ist und was ausdrücklich nicht. Betroffene Bausteine laut `bash tools/graph.sh affected "<Name>"`.
   ## Prüfung
   Jeder Befehl mit Ergebnis in Zahlen, lokal gelaufen, mit Commit. Python: Zahl vorher, Zahl nachher, neue Fehlschläge namentlich oder „keine“.
   ## Nicht belegt
   Was nicht gemessen wurde, welche Pins dadurch neu abweichen, was der Inhaber entscheiden muss.
   ```

8. **Merge.** Squash-Merge nur durch die koordinierende Sitzung oder den Inhaber. Wer den Zweig gebaut hat, mergt ihn nicht selbst. Danach führt die koordinierende Sitzung den Stand nach: `nexify-stand-halten`.

## Bekannte Lage (14.11.2026)

- **Python-Suite rot auf `main`.** Ursache sind veraltete Prüfsummen und Belege (`docs/09-final/pin-rebase-2026-11-14.md`). Gezählt werden nur neue Fehlschläge per Namensvergleich wie in Schritt 3 und 5. „Rot wie vorher“ ohne Vergleich ist kein Beleg. `make test` endet deshalb mit Fehler; das wird im PR genannt, nicht verschwiegen. Zeilen der Form `ERROR: … (unittest.loader._FailedTest…)` sind Ladefehler: Der Laufumgebung fehlen dann Python-Pakete (zum Beispiel `pymongo` aus `apps/shop-api/requirements.txt`). Auch sie werden gezählt und benannt, und die Zahlen gelten nur für die Umgebung, in der vorher und nachher gemessen wurde.
- **GitHub Actions startet kontoweit keine Jobs** (`PROGRESS.md`, „Offene Arbeiten“; zuletzt belegt in `docs/04-betrieb/befund-2026-11-13.md`). Es zählt die lokale Prüfung, und genau das steht im Abschnitt „Prüfung“ des PR: lokal gelaufen, kein CI-Lauf. Ein fehlender CI-Lauf wird nicht als grün ausgegeben.

Ändert sich eine der beiden Lagen, diesen Abschnitt im selben Commit berichtigen.

## Grenzen

- Kein Gate abschalten, überspringen oder im Prüfskript eine Ausnahme eintragen.
- Keine Prüfsumme nebenbei nachziehen, um einen Test grün zu bekommen: `nexify-belege-und-pins`.
- Preise, Rechtstexte, Zahlungslogik und Schutzmechanismen nur mit Freigabe des Inhabers (`DECISIONS.md` D-017).
- Fremde Zweige und PRs nicht ändern, schließen oder umhängen. Einordnen: `nexify-pr-sichtung`.

## Was als Beleg gilt

Der ausgeführte Befehl, sein Exit-Code und seine Zahlen, am genannten Commit. Die leere Ausgabe von `comm -13`. Für Oberflächen der Lauf von `tools/gleichmacher.mjs` und `tools/live-check.mjs` gegen den lokalen Build. Kein Beleg sind: „sollte passen“, ein Lauf auf einem anderen Commit, ein grüner Build als Nachweis für einen Livegang.

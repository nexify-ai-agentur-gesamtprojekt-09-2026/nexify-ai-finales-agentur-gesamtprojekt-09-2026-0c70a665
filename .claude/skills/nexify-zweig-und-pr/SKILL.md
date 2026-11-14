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

   **Kein `git stash`.** Der Stash-Stapel gehört dem Repository, nicht dem Worktree: Alle Worktrees und alle Sitzungen teilen ihn, und ein `git stash pop` nimmt den obersten Eintrag, gleich wer ihn abgelegt hat. Nachsehen: `git rev-parse --git-path refs/stash` zeigt aus jedem Worktree in das gemeinsame `.git` des Hauptcheckouts. Zwischenfall am 14.11.2026 im Zweig `claude/ai-gateway`, bei dem ein `stash pop` fremde Arbeit erwischte: Bericht vom 14.11.2026, nicht nachgemessen (`PROGRESS.md` führt die Regel als Notiz). Arbeit beiseitelegen heißt hier: ein Zwischen-Commit im eigenen Zweig (`git commit -m "wip: …"`, später mit dem nächsten Commit fortführen) oder ein zweiter Worktree. Liegt schon ein fremder Eintrag auf dem Stapel (`git stash list`), bleibt er liegen: nicht anwenden, nicht verwerfen, dem Verantwortlichen des genannten Zweigs melden.

3. **Vorher messen.** Die Python-Suite ist auf `main` rot (siehe „Bekannte Lage“). Deshalb vor der ersten Änderung die Namen der Fehlschläge festhalten, und zwar am unveränderten Stand von `origin/main` in einem Wegwerf-Worktree, nicht im Arbeits-Worktree nach den ersten Änderungen:

   ```bash
   git worktree add --detach /home/user/wt-<kurz>-basis origin/main
   cd /home/user/wt-<kurz>-basis
   node apps/site/scripts/generate-public-data.mjs
   node apps/web/scripts/generate-public-data.mjs
   python3 -m unittest discover -s tests 2>&1 | grep -E '^(FAIL|ERROR): ' | sort > /tmp/vorher.txt
   cd /home/user/wt-<kurz>
   ```

   Die beiden `generate-public-data`-Aufrufe sind Pflicht, in der Basis und im Arbeits-Worktree, jeweils vor der Messung. Die erzeugten Seitendaten (`apps/site/.generated/`, `apps/web/.generated/`) stehen in `.gitignore` und fehlen in jedem frischen Worktree. Ohne sie scheitern Tests wie `tests/test_resize_source_binding.py` schon am fehlenden Bestand, sind also „vorher“ rot, und ein Fehlschlag, den die eigene Änderung neu auslöst, fällt im Vergleich nicht auf (so geschehen bei PR 181, berichtigt mit PR 185; `docs/09-final/pin-rebase-2026-11-14.md`, Abschnitt 11).

   Beide Messungen laufen in derselben Umgebung (gleiches Python, beide mit oder beide ohne `node_modules` und `.venv`); sonst unterscheiden sich die Listen aus Gründen, die nichts mit der Änderung zu tun haben. Verglichen werden Namen, nie Zahlen: Gleich viele Fehlschläge können andere sein. Den Wegwerf-Worktree danach mit `git worktree remove /home/user/wt-<kurz>-basis` abmelden.

4. **Arbeiten in kleinen Commits.** Ein logischer Vorgang je Commit, die Nachricht erklärt das Warum, Dokumente im selben Commit (`AGENTS.md`, „Commits und Dokumentation“). Vor jeder Änderung an einer Datei prüfen, ob sie gebunden ist: `nexify-belege-und-pins`.

5. **Gates.** Immer:

   ```bash
   make check
   node tools/ds-audit-cli.js
   python3 -m unittest discover -s tests 2>&1 | grep -E '^(FAIL|ERROR): ' | sort > /tmp/nachher.txt
   comm -13 /tmp/vorher.txt /tmp/nachher.txt
   ```

   Die letzte Zeile muss leer sein: kein neuer Fehlschlag. Vor der Nachher-Messung müssen die erzeugten Seitendaten auch hier vorliegen (Schritt 3); sonst vergleicht man zwei verschiedene Ausgangslagen. Zusätzlich je nach Änderung:

   | Geändert | Gate |
   |---|---|
   | JavaScript, TypeScript, CSS | `node tools/lint.mjs`, `node apps/web/scripts/atelier-literale.mjs` |
   | `apps/web` | `pnpm --filter @nexify/web test:auth`, `pnpm --filter @nexify/web build`, danach lokal `node tools/gleichmacher.mjs <basis-url>` und `node tools/live-check.mjs <basis-url>` (Ablauf in `nexify-klon-fabrik`). Neue oder geänderte Dateien unter `apps/web/components` und `apps/web/lib` verlangen zusätzlich einen neuen Resize-Beleg: `nexify-belege-und-pins`, „Ganze Verzeichnisse“ |
   | `apps/site` | `pnpm --filter @nexify/site test`, `pnpm --filter @nexify/site build` |
   | Grenzen zwischen `config/`, `packages/`, `apps/` | `make check-arch` |

   Fehlt `node_modules` im frischen Worktree:

   ```bash
   pnpm install --frozen-lockfile --ignore-scripts
   ```

   Installationsskripte von Paketen laufen in diesem Repository nicht: `pnpm-workspace.yaml` lehnt sie unter `allowBuilds` je Paket ab. Meldet pnpm `ERR_PNPM_IGNORED_BUILDS`, ist ein Paket mit Installationsskript neu hinzugekommen; es wird dort eingetragen (`false`, solange kein Bedarf am Skript belegt ist), nicht mit `pnpm approve-builds` pauschal freigegeben.

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

   **Zurücklesen.** Ein PR bleibt nicht von selbst in dem Zustand, in dem er angelegt wurde: Am 14.11.2026 wurden Entwürfe kurz nach dem Anlegen auf „bereit“ gestellt und mit Auto-Merge versehen (Ereignisse `ready_for_review` und `auto_squash_enabled` des Kontos `nexifyai-dev`, zum Beispiel an PR 150 und PR 186; über dasselbe Konto arbeiten auch die Agenten, wer es auslöst, ist offen, OA-027). Deshalb nach dem Anlegen und noch einmal vor dem Bericht:

   ```bash
   gh api repos/{owner}/{repo}/pulls/<n> --jq '[.draft, (.auto_merge != null), .state] | @tsv'
   ```

   Soll der eigene PR nicht von selbst nach `main` gehen (Regelfall: Schritt 8), Auto-Merge abschalten und, wenn er noch nicht fertig ist, zurück auf Entwurf stellen; beides in der Oberfläche des PR oder mit dem dafür vorgesehenen Werkzeug der Laufumgebung, danach erneut zurücklesen. An fremden PRs wird weder Auto-Merge noch der Entwurfsstatus verändert; das braucht das Wort des Inhabers (Grenzen unten).

   **Rote Prüfungen ohne Lauf sind kein Befund am Code.** Solange Actions keine Jobs startet (siehe „Bekannte Lage“), stehen am PR rote Prüfungen, Fehlmeldungen verwaister Vercel-Projekte und ein Hinweis auf das erschöpfte Review-Kontingent. Das wird im Abschnitt „Prüfung“ genau einmal vermerkt, nicht in weiteren Kommentaren wiederholt und nicht „behoben“. An die Stelle des fehlenden CI-Laufs treten die lokalen Gates und eine unabhängige Prüfung durch einen zweiten Agenten (`nexify-agenten-koordination`, „Unabhängige Prüfung“).

8. **Merge.** Squash-Merge nur durch die koordinierende Sitzung oder den Inhaber. Wer den Zweig gebaut hat, mergt ihn nicht selbst. Danach führt die koordinierende Sitzung den Stand nach: `nexify-stand-halten`. Berührt der Merge die Website, folgt die Live-Nachprüfung aus `nexify-klon-fabrik`.

9. **Nach dem Merge: Worktree lösen, nichts erneut pushen.** Ein Squash-Merge legt auf `main` einen neuen Commit an; die Commits des Zweigs sind danach in `main` nicht enthalten, und GitHub kann den entfernten Zweig löschen. Lokal sieht das aus wie verlorene Arbeit, und eine Abschlussprüfung der Laufumgebung (Stop-Hook) meldet dann sinngemäß „unpushed commits, no remote branch“ (Bericht vom 14.11.2026, nicht nachgemessen). Das ist kein Auftrag zum Pushen: Ein erneuter Push legt den Zweig wieder an und öffnet den Weg zu einem zweiten PR mit demselben Inhalt.

   ```bash
   git fetch origin "+refs/heads/main:refs/remotes/origin/main"
   git diff --stat HEAD origin/main -- <dateien des eigenen PR>
   git checkout --detach
   ```

   Zeile 2 belegt, dass `main` den Inhalt trägt: leer, oder nur Unterschiede aus späteren Merges anderer, die man einzeln benennen kann. Erst dann Zeile 3; sie löst den Worktree vom Zweig. Der lokale Zweig bleibt bestehen, gelöscht wird nichts (kein `git branch -D`, kein `git push --delete`, kein `git worktree remove --force`). Zeigt Zeile 2 eigenen Inhalt, der auf `main` fehlt: nicht lösen, nicht pushen, an die koordinierende Sitzung melden.

## Bekannte Lage (14.11.2026)

- **Python-Suite rot auf `main`.** Ursache sind veraltete Prüfsummen und Belege (`docs/09-final/pin-rebase-2026-11-14.md`). Gezählt werden nur neue Fehlschläge per Namensvergleich wie in Schritt 3 und 5. „Rot wie vorher“ ohne Vergleich ist kein Beleg. `make test` endet deshalb mit Fehler; das wird im PR genannt, nicht verschwiegen. Zeilen der Form `ERROR: … (unittest.loader._FailedTest…)` sind Ladefehler: Der Laufumgebung fehlen dann Python-Pakete (zum Beispiel `pymongo` aus `apps/shop-api/requirements.txt`). `make test-env` baut dafür die Umgebung des CI-Jobs unter `.venv` (Python 3.12, nur Pakete mit Prüfsumme), `make test-py` lässt die Suite darin laufen; dann laden alle Module (882 statt 823 Tests am 14.11.2026). Solange `requirements-image.txt` Pillow 13.0.0 verlangt und die Bildwerkzeuge nur 12.3.0 annehmen, sind in dieser Umgebung zusätzlich 59 Namen aus `test_product_image_batch` und `test_birefnet_onnx` rot (`docs/09-final/testumgebung-und-abhaengigkeiten-2026-11-14.md`). Ladefehler werden gezählt und benannt, und die Zahlen gelten nur für die Umgebung, in der vorher und nachher gemessen wurde.
- **GitHub Actions startet keine Jobs; Ursache ist ein Actions-Budget.** Die Läufe auf `main` und auf allen Zweigen enden nach wenigen Sekunden mit „failure“, ohne einen Schritt auszuführen. GitHub nennt den Grund als Anmerkung am Lauf: „The job was not started because an Actions budget is preventing further use.“ (eigener Abruf 14.11.2026 nach 20:45 UTC am CI-Lauf auf `a351ecf`: fünf Jobs, alle „failure“ mit je einer Anmerkung, Wortlaut an einem davon gelesen; `PROGRESS.md`, „Betriebsbefunde des Abends“; OA-022, liegt beim Inhaber). Nachsehen, ob die Lage noch gilt:

  ```bash
  gh api "repos/{owner}/{repo}/actions/runs?per_page=5" --jq '.workflow_runs[] | [.name, .conclusion, .head_sha[0:7], .created_at] | @tsv'
  gh api repos/{owner}/{repo}/check-runs/<id>/annotations --jq '.[].message'
  ```

  Rote Prüfungen an PRs und an `main` sind in dieser Lage kein Befund am Code und kein Anlass, etwas zu ändern. Es zählt die lokale Prüfung, und genau das steht im Abschnitt „Prüfung“ des PR: lokal gelaufen, kein CI-Lauf. Ein fehlender CI-Lauf wird nicht als grün ausgegeben. Es gibt damit kein automatisches Gate vor `main`; deshalb ist die unabhängige Prüfung durch einen zweiten Agenten Pflicht (Schritt 7).
- **Codex-Review-Kontingent erschöpft.** Der Dienst kommentiert an PRs „You have reached your Codex usage limits for code reviews“, die Sicherheitsprüfung startet mangels Guthaben nicht (Kommentare an PR 185, 186 und 188; OA-146, liegt beim Inhaber). Kein Befund am Code; ein ausgebliebenes Review ist auch keine Freigabe.
- **Fünf verwaiste Vercel-Projekte.** `web`, `web-2kby`, `site`, `site-gjp7` und `site-k23m` melden bei jedem Push „The provided GitHub repository can't be found“ (Kommentare von `vercel[bot]`, zum Beispiel an PR 188; OA-023, liegt beim Inhaber). Kein Befund am Code. Maßgeblich für die Auslieferung sind die Commit-Status der Projekte `…-ut7r` und `…-s4k5`:

  ```bash
  gh api repos/{owner}/{repo}/commits/<sha>/status --jq '.statuses[] | [.context, .state] | @tsv'
  ```

- **Auto-Merge an offenen PRs.** Am 14.11.2026, 20:35 UTC war er an 22 von 26 offenen PRs eingeschaltet (`PROGRESS.md`; OA-027). Wirksam wird er, sobald Actions wieder Jobs startet und die Prüfungen bestehen. Für den eigenen PR gilt „Zurücklesen“ in Schritt 7.

Ändert sich eine dieser Lagen, diesen Abschnitt im selben Commit berichtigen.

## Grenzen

- Kein Gate abschalten, überspringen oder im Prüfskript eine Ausnahme eintragen.
- Keine Prüfsumme nebenbei nachziehen, um einen Test grün zu bekommen: `nexify-belege-und-pins`.
- Preise, Rechtstexte, Zahlungslogik und Schutzmechanismen nur mit Freigabe des Inhabers (`DECISIONS.md` D-017).
- Fremde Zweige und PRs nicht ändern, schließen oder umhängen; auch Entwurfsstatus und Auto-Merge fremder PRs bleiben, wie sie sind, bis der Inhaber es anders sagt. Einordnen: `nexify-pr-sichtung`.
- Kein `git stash`, kein erneuter Push eines eingebrachten Zweigs, kein Löschen von Zweigen oder Worktrees mit Arbeit darin.

## Was als Beleg gilt

Der ausgeführte Befehl, sein Exit-Code und seine Zahlen, am genannten Commit. Die leere Ausgabe von `comm -13`, wenn beide Listen mit erzeugten Seitendaten und in derselben Umgebung entstanden sind. Für Oberflächen der Lauf von `tools/gleichmacher.mjs` und `tools/live-check.mjs` gegen den lokalen Build. Kein Beleg sind: „sollte passen“, ein Lauf auf einem anderen Commit, ein grüner Build als Nachweis für einen Livegang, eine gleiche Zahl von Fehlschlägen ohne Namensvergleich, eine rote Prüfung an einem PR, deren Job nie gestartet ist.

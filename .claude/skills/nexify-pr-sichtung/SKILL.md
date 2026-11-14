---
name: nexify-pr-sichtung
description: Offene Pull Requests des NeXify-Monorepos einordnen in mergebar, überholt oder braucht Entscheidung, per Probe-Merge gegen einen festgenagelten main-Stand, ohne etwas zu mergen, zu schließen oder zu kommentieren. Verwenden, wenn viele Entwürfe offen sind, vor einer Merge-Runde, im Tagesbericht und bei Fragen wie „welche PRs können rein", „was ist überholt", „was hängt wovon ab" oder „was liegt beim Inhaber".
---

# Sichtung offener Pull Requests

Ergebnis ist eine Tabelle, keine Handlung. `AGENTS.md` und `CLAUDE.md` gelten unverändert.

## Wann

Vor jeder Merge-Runde der koordinierenden Sitzung, nach größeren Merges auf `main` und im Tagesbericht.

## Schritte

1. **Eigener Worktree und fester Stand.** Wie in `nexify-zweig-und-pr`, Schritt 2. Den Commit von `main` festhalten; alle Proben laufen gegen genau diesen.

   ```bash
   git fetch origin
   BASIS=$(git rev-parse origin/main); echo "$BASIS"
   ```

2. **Offene PRs lesen** (REST; GraphQL und damit `gh pr list` sind in dieser Umgebung gesperrt):

   ```bash
   gh api "repos/{owner}/{repo}/pulls?state=open&per_page=100" --jq '.[] | [.number,.draft,.head.ref,.base.ref,.title] | @tsv'
   ```

   Zeigt die Basis eines PR nicht auf `main`, hängt er an einem anderen PR. Das ist eine Abhängigkeit und kommt in die Tabelle.

3. **Je PR: Abstand und Überschneidung.**

   ```bash
   git log --oneline "$BASIS"..origin/<zweig> | wc -l
   git diff --stat "$BASIS"...origin/<zweig> | tail -1
   git diff --name-only "$BASIS"...origin/<zweig> | sort > /tmp/pr-<n>.txt
   ```

   Dateilisten zweier PRs mit `comm -12 /tmp/pr-<a>.txt /tmp/pr-<b>.txt` schneiden. Gemeinsame Dateien heißen: Reihenfolge festlegen oder zusammen entscheiden lassen.

4. **Probe-Merge**, im eigenen Worktree auf einem Wegwerfzweig vom festen Stand. Nichts davon wird gepusht.

   ```bash
   git switch -C sichtung-probe "$BASIS"
   git merge --no-ff --no-commit origin/<zweig>
   git diff --name-only --diff-filter=U
   ```

   Nach der Messung zurücksetzen: `git merge --abort`, bei konfliktfreiem Probe-Merge `git reset --hard "$BASIS"` (nur auf dem Wegwerfzweig).

5. **Gates am Probe-Stand**, wenn der Merge konfliktfrei ist: die Befehle aus `nexify-zweig-und-pr`, Schritt 5, einschließlich Namensvergleich der Python-Fehlschläge gegen `BASIS`.

6. **Abgleich gegen Entscheidungen.** `DECISIONS.md` von `origin/main` lesen. Prüfen: Widerspricht der PR einer späteren Entscheidung (zum Beispiel Datenhaltung D-013, Produktname D-011, Startseite als Referenz D-012)? Vergibt er eine Entscheidungsnummer, die auf `main` schon anders belegt ist?

   ```bash
   git diff "$BASIS"...origin/<zweig> -- DECISIONS.md
   ```

7. **Bindungen.** Ändert der PR gebundene Dateien oder Belege, das nach `nexify-belege-und-pins` einordnen und in der Tabelle nennen.

## Einordnung

| Urteil | Bedingung |
|---|---|
| **mergebar** | Probe-Merge ohne Konflikt, Gates ohne neuen Fehlschlag, kein Widerspruch zu `DECISIONS.md`, keine offene Freigabe, hängt an keinem ungemergten PR. |
| **überholt** | Inhalt liegt schon auf `main`, oder eine spätere Entscheidung oder ein gemergter PR hat ihn ersetzt. Belegen mit Commit oder Entscheidungsnummer. |
| **braucht Entscheidung** | Konflikt, der eine fachliche Wahl verlangt; Preise, Rechtstexte, Zahlung, Datenhaltung, Livegang; Texte zur Freigabe; Widerspruch zu einer Entscheidung; unklare Zuständigkeit. Die Frage an den Inhaber ausformulieren. |

Im Zweifel „braucht Entscheidung“. Ein PR, dessen Gates nicht gelaufen sind, ist nicht „mergebar“.

## Ergebnis

```markdown
Stand: main <commit>, <TT.MM.JJJJ HH:MM> UTC

| PR | Zweig → Basis | Urteil | Probe-Merge | Gates | Hängt an | Begründung, nächste Handlung, wer |
|---|---|---|---|---|---|---|
```

Darunter die empfohlene Reihenfolge der mergebaren PRs und die Liste der Fragen an den Inhaber. Die Tabelle geht an die koordinierende Sitzung; in `PROGRESS.md` kommt sie nur über `nexify-stand-halten`.

## Grenzen

- Nichts mergen, nichts schließen, nichts kommentieren, keine Labels, kein Umhängen der Basis, kein Push in fremde Zweige.
- Konflikte nicht „schnell auflösen“; ein aufgelöster Konflikt ist eine Änderung und gehört dem Verantwortlichen des Zweigs.
- Der Wegwerfzweig bleibt lokal.

## Was als Beleg gilt

Der feste Commit von `main`, die Ausgabe des Probe-Merges, die Gate-Zahlen am Probe-Stand, die Fundstelle in `DECISIONS.md`. Der Titel eines PR und seine eigene Beschreibung sind Angaben, kein Beleg.

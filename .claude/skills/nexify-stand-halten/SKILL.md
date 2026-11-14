---
name: nexify-stand-halten
description: Die führenden Dokumente des NeXify-Monorepos (AGENTS.md, DECISIONS.md, PROGRESS.md, GO-LIVE.md, Register in config/acceptance-coverage.json) mit dem tatsächlichen Stand abgleichen und nachführen, ohne eine zweite Wahrheit anzulegen. Verwenden nach jedem Merge auf main, nach jeder Inhaberentscheidung, im Tagesbericht und immer dann, wenn zwei Dokumente einander widersprechen oder ein Dokument einen Zustand behauptet, der nicht mehr stimmt.
---

# Stand halten

Aufgabe: Die führenden Dokumente sagen, was gilt und was ist. Dieser Skill baut keine Funktionen und ändert keine Regel. `AGENTS.md` und `CLAUDE.md` gelten unverändert.

## Wann

- Nach jedem Merge auf `main`: `PROGRESS.md`, bei geänderten Tatsachen auch `AGENTS.md` und `GO-LIVE.md`.
- Nach jeder Inhaberentscheidung: zuerst `DECISIONS.md`, dann die Folgen in den anderen Dokumenten.
- Im Tagesbericht: Abgleich lesen, Widersprüche melden, nur Belegtes als IST berichten.

## Welche Datei wofür

| Datei | Führend für | Nicht hinein |
|---|---|---|
| `AGENTS.md` | Auftrag, Regeln, Pflichtprüfungen, aktuelle Führungsentscheidung | Tagesstände, Messwertreihen |
| `DECISIONS.md` | Entscheidungen mit Nummer, Quelle, Folgen, Offenem | Arbeitsfortschritt |
| `PROGRESS.md` | Was wann geschah, Messwerte, Prüfstand, offene Arbeiten | neue Regeln, Entscheidungen im Wortlaut |
| `GO-LIVE.md` | Betriebsschritte, Variablen, Reihenfolge, Störungsdiagnose | Entscheidungen, Historie |
| `config/acceptance-coverage.json` | Register P01–P26, Hauptfälle MASTER-01 bis MASTER-18, Konflikte, gebundene Prüfsummen | Ausführungslisten, Tagesaufgaben |
| `docs/09-final/00-INDEX.md` | Reihenfolge des Dokumentationssatzes | Stände |

Jede Tatsache steht an genau einer Stelle. Alle anderen Stellen verweisen darauf.

## Kennzeichnung

- **SOLL**: gültige Vorgabe, mit Quelle (Inhaber, Datum oder Regel in `AGENTS.md`).
- **IST**: belegt durch Lauf, Commit oder Messung, mit Datum, Uhrzeit bei Messungen und Quelle (Befehl, Commit, Adresse).
- **HISTORIE**: überholt. Bleibt stehen, wird als überholt markiert und nennt, was sie ersetzt.
- **ANNAHME**: unbestätigt, mit dem, was sie bestätigen würde.
- **OFFEN**: fehlt, widersprüchlich oder nicht belegbar. Was sich nicht belegen lässt, bleibt OFFEN.

Angaben aus Notizen oder anderen Sitzungen sind erst IST, wenn sie am Repository oder durch eigene Messung nachgeprüft sind. Sonst als „Notiz, nicht nachgeprüft“ führen. Automatische Kurzfassungen der Plattform zu einer Sitzung sind nicht einmal eine Notiz: Nachgeführt wird aus dem vollen Bericht (`nexify-agenten-koordination`, „Der Bericht“). Rote Prüfungen an einem PR oder an `main`, deren Job nie gestartet ist, sind kein Prüfstand und werden als Betriebsbefund geführt, nicht als Fehler des Codes (`nexify-zweig-und-pr`, „Bekannte Lage“).

## Vorgehen

1. `git fetch origin main` und `git log origin/main --since=<letzte Nachführung>` lesen. PR-Nummern und Commits von dort nehmen, nicht aus der Erinnerung.
2. Führende Dateien von `origin/main` lesen. Behauptungen zu Domains, Projekten, Diensten, Produktnamen, Datenhaltung und Prüfständen gegen Repository und Messung prüfen.
3. Messen, wo möglich, nur lesend: `node tools/live-check.mjs`, `node tools/gleichmacher.mjs`, `curl -sI` auf die Domains. Uhrzeit in UTC festhalten. Nach einem Merge, der die Website berührt, ist das die Live-Nachprüfung aus `nexify-klon-fabrik` (erst wenn die Auslieferung des Merge-Commits steht); ihr Ergebnis ist IST, die Zahlen aus der PR-Beschreibung bleiben „laut PR“.
4. Widersprüche als Liste mit Fundstelle (Datei, Abschnitt oder Zeile) führen.
5. Nachführen in dieser Reihenfolge: `DECISIONS.md`, `PROGRESS.md`, `AGENTS.md`, `GO-LIVE.md`.
6. Prüfen (siehe Prüfliste), dann ein Commit mit Begründung.

## Format einer Entscheidung

Fortlaufend nach der höchsten Nummer auf `main`. Vorher prüfen, ob ein offener Zweig dieselbe Nummer anders vergibt: `git branch -r` und `git diff origin/main...<zweig> -- DECISIONS.md`.

```markdown
## D-0NN — Kurzer Titel (TT.MM.JJJJ)
- **Entscheidung (SOLL, Inhaber Pascal Courbois, TT.MM.JJJJ):** Was gilt, in ein bis drei Sätzen.
- **Quelle:** Inhaber im Gespräch TT.MM.JJJJ | Merge von PR n | Datei.
- **Folgen:** Was sich ändert, welche frühere Entscheidung überholt ist, welche Regel bestätigt wird.
- **IST (TT.MM.JJJJ):** Nur wenn belegt, mit Quelle.
- **Offen:** Was fehlt, wer es liefern kann.
```

Überholt eine Entscheidung eine frühere, bekommt die frühere eine Zeile `- **Stand TT.MM.JJJJ:** … überholt durch D-0NN`. Nichts wird gelöscht oder umnummeriert.

## Keine zweite Wahrheit

- Kein neues Register, keine neue Statusdatei, keine Aufgabenliste neben dem Register. Hat das Register für eine Arbeit kein Feld, kommt sie in den Abschnitt „Offene Arbeiten“ in `PROGRESS.md`, gegliedert in „Kann die Fabrik“ und „Braucht den Inhaber“. Dieser Abschnitt wird bei jeder Nachführung ersetzt.
- Im Register nur nachführen, was das Schema vorsieht (`remaining_gap`, `next_allowed_action`, `conflicts`) und was `python3 tools/verify_requirements_reconciliation.py` annimmt. `full_requirement_accepted` und `whole_system_accepted` bleiben `false`.
- Keine Regel in `AGENTS.md` streichen oder abschwächen. Widerspricht eine Regel einer Entscheidung oder dem Code, wird der Widerspruch als OFFEN gemeldet; der Inhaber entscheidet.
- Rechtstexte, Preise und Zahlen mit Preisbezug werden nicht angefasst.

## Gebundene Prüfsummen

`AGENTS.md`, `PROGRESS.md`, `DECISIONS.md`, `CLAUDE.md` und `docs/09-final/00-INDEX.md` sind an mehreren Stellen mit SHA-256 gebunden (`source_sha256` im Register, `config/policy-source-inventory.json`, `config/ai-enforcement-coverage.json`, `docs/contracts/prototype-pages.json`). `GO-LIVE.md` ist es nicht.

- Prüfsummen und Belege nicht nebenbei umbinden. Das geschieht nur in einer eigenen Neuprüfung.
- Vor und nach der Änderung messen und die Differenz melden:

```bash
python3 -m unittest discover -s tests 2>&1 | tail -3
python3 tools/verify_requirements_reconciliation.py | sort | uniq -c
```

- Jede Datei nennen, deren Prüfsumme durch die eigene Änderung zusätzlich abweicht.
- Würde eine Dokumentänderung einen bisher grünen Test rot machen, der keine Prüfsumme prüft: Änderung weglassen und melden.
- `CLAUDE.md` und `docs/09-final/00-INDEX.md` stimmen derzeit mit ihren Bindungen überein. Nur ändern, wenn es nötig ist.

## Prüfliste

- [ ] Jede IST-Aussage hat Datum und Quelle; Messungen haben eine Uhrzeit.
- [ ] Jede PR-Nummer steht in `git log origin/main`.
- [ ] Neue Entscheidungen fortlaufend nummeriert, Quelle genannt, Offenes benannt; überholte markiert.
- [ ] Keine Tatsache doppelt, kein neues Register, nichts gelöscht.
- [ ] Keine Regel gestrichen oder abgeschwächt, keine Prüfsumme, kein Beleg angefasst.
- [ ] `make check` und `node tools/ds-audit-cli.js` grün.
- [ ] Python-Tests und Abgleich vorher und nachher verglichen; zusätzliche Abweichungen benannt.
- [ ] Nicht Belegtes steht als OFFEN in der Rückmeldung.
- [ ] Eigener Zweig, Commit mit Begründung, kein Push auf `main`.

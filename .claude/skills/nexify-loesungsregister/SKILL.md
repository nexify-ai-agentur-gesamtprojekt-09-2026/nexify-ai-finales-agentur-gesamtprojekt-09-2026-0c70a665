---
name: nexify-loesungsregister
description: Das Lösungs- und Zugangsregister der Agentur (config/loesungsregister.json) lesen und pflegen, damit vorhandene Lösungen wie unser S3 (Cloudflare R2), 9router, Hermes, Cognee oder LightRAG beim Nachdenken sofort als Lösung auftauchen und kein Zugang vergessen wird, ohne je einen Geheimniswert zu speichern. Verwenden, bevor eine neue Lösung oder ein neuer Dienst vorgeschlagen wird, bei Fragen wie „wo speichern wir X", „womit machen wir Y", „welchen Zugang gibt es für Z", „haben wir schon etwas für …", wenn der Inhaber einen neuen Dienst, Zugang oder Schlüssel nennt, und wenn ein Schlüssel im Chat oder in einer Datei im Klartext auftaucht.
---

# Lösungsregister

Aufgabe: Was die Agentur nutzt, steht an einer Stelle, mit Tags, Zustand, Rolle im Plan und den Zugängen dem Namen nach. Dieser Skill ändert keine Regel. `AGENTS.md` und `CLAUDE.md` gelten unverändert; „Credentials nicht lesen, ausgeben oder in Prompts übernehmen" und D-017 (keine Zugangsdaten im Klartext) gehen vor.

## Die eine Regel

**Im Register, in Notizen, in Erinnerungen, in Commits und im Chat steht nie ein Geheimniswert.** Erfasst wird die Bezeichnung des Zugangs, seine Art, der Ablageort des Werts, der Rechteumfang, das Erstelldatum und ob er offengelegt wurde. Der Wert liegt nur im Geheimnisspeicher: Netzwerk-Geheimnisse der Claude-Umgebung, Vercel-Projektvariablen, Cloudflare-Dashboard, GitHub-Actions-Secrets, Umgebungsdateien auf dem Server, Passwortmanager des Inhabers.

Ein Register ohne Werte verliert nichts: Wer den Ablageort kennt, findet den Wert; wer ihn nicht findet, erneuert ihn. Ein Register mit Werten ist ein Sicherheitsvorfall (Befund OA-014: Klartext-Zugangsdaten in alten Notizen).

## Wann

- Bevor du eine Lösung, einen Dienst, ein Werkzeug oder ein Abo vorschlägst.
- Bei „wo speichern wir", „womit senden wir", „welcher Server", „welcher Zugang", „haben wir schon".
- Der Inhaber nennt einen neuen Dienst, eine Adresse, ein Konto oder einen Schlüssel.
- Ein Schlüssel steht im Chat, in einer Datei, in einer Notiz oder in einer Werkzeug-Ausgabe.
- Ein Zustand im Register stimmt nicht mehr (Dienst ausgefallen, abgelöst, neu belegt).

## Vorgehen

### 1. Erst lesen, nach Tags suchen

```bash
python3 - <<'PY'
import json
suche = {"speicher", "s3"}          # Tags der Frage
for x in json.load(open("config/loesungsregister.json"))["loesungen"]:
    if suche & set(x["tags"]):
        print(x["id"], "·", x["zustand"]["status"], "·", x["rolle_im_plan"]["art"], "·", x["wann_nutzen"])
PY
```

Lesbar: `docs/04-betrieb/loesungsregister.md` (Übersicht, Zugänge mit fälliger Erneuerung, offene Fragen).

Häufige Fragen und ihre Tags: Dateien, Archive, Sicherungen → `speicher`, `s3`, `objektspeicher`, `archiv`; Tabellen und Datensätze → `datenbank`, `datenhaltung`; Modellaufruf → `llm`, `llm-router`, `llm-gateway`; Wissen über Sitzungen → `gedaechtnis`, `wissen`; Agentenabläufe → `orchestrierung`; Auslieferung → `hosting`; Mail → `mail`; Geld → `zahlung`; Kontakte → `crm`; Werkzeuge für Agenten → `mcp`, `integrationen`; Geheimnisse → `geheimnisspeicher`.

### 2. Treffer richtig lesen

- `rolle_im_plan` **tragend**: verwenden. `wann_nutzen` und `nicht_nutzen_fuer` beachten.
- **doppelt**: nicht die Lösung nehmen, sondern das, was unter „bleibt" steht.
- **abzulösen**: nichts Neues darauf bauen.
- **unklar**: die Frage aus dem Eintrag dem Inhaber stellen, nicht selbst entscheiden.
- `zustand` **defekt**, **geplant**, **läuft unbelegt**: die Lösung ist bekannt, aber heute nicht belegt nutzbar. Das sagen, nicht verschweigen. Der Beleg nennt Datei und Zeile oder Messung mit Datum; vor einer Meldung den aktuellen Zustand prüfen.

Erst wenn das Register nichts Passendes hat, eine neue Lösung vorschlagen – mit dem Satz, warum keine vorhandene passt.

### 3. Neue Lösung oder neuer Zugang

1. `nexify-zweig-und-pr` anwenden (eigener Worktree, eigener Zweig).
2. In `config/loesungsregister.json` den Eintrag ergänzen. Pflichtfelder: `id`, `name`, `tags` (deutsch, klein, mindestens zwei), `kategorie`, `zweck` (ein Satz), `ort` (nur nicht geheime Angaben), `zustand` mit `status`, `beleg`, `stand`, `entscheidung` (D-Nummer oder „keine"), `rolle_im_plan`, `zugaenge`, `wann_nutzen` (ein Satz: bei welcher Aufgabe ein Agent daran denken soll), `nicht_nutzen_fuer`, `abhaengigkeiten`.
3. Zustand ehrlich wählen: `läuft belegt` nur mit eigener Messung oder Datei und Zeile. Eine Angabe des Inhabers ohne Messung ist `läuft unbelegt`. Unbelegte Rolle ist `unklar` mit Frage.
4. Zugang nur mit Bezeichnung, Art, Ablageort, Rechteumfang, Erstelldatum, `offengelegt`, `erneuerung_faellig`. Ein Feld für den Wert gibt es nicht; die Prüfung lehnt jedes zusätzliche Feld ab.
5. Kunden nur als Tag `kunde:<kürzel>`; Kundendaten und Einzelheiten gehören ins Kundenrepository (`nexify-kundenprojekt`).
6. Lesbare Fassung erzeugen und prüfen:

```bash
python3 tools/check_loesungsregister.py --write-md
python3 tools/check_loesungsregister.py        # auch Teil von make governance-check
python3 -m unittest tests.test_loesungsregister
```

### 4. Ein Schlüssel taucht im Klartext auf

Gilt für den Chat, für Dateien, Notizen, Protokolle und Werkzeug-Ausgaben.

1. **Nicht übernehmen.** Nicht wiederholen, nicht zitieren, nicht kürzen und zeigen, nicht in eine Datei, einen Commit, eine Notiz, einen Prompt oder einen Auftrag an einen anderen Agenten schreiben. Auch nicht „nur die ersten Zeichen".
2. **Nicht benutzen.** Ein im Chat genannter Schlüssel wird nicht in einen Befehl eingesetzt.
3. **Dem Inhaber sagen, was zu tun ist:** Der Schlüssel gilt als offengelegt. Beim Anbieter widerrufen und neu erstellen, mit dem kleinsten nötigen Rechteumfang. Den neuen Wert über das sichere Formular der Claude-Umgebung hinterlegen (Netzwerk-Geheimnis für den Host des Dienstes) oder im passenden Geheimnisspeicher eintragen – nicht im Chat.
4. **Im Register festhalten, ohne Wert:** Zugang mit Bezeichnung, `offengelegt: true`, `erneuerung_faellig: true`, im Hinweis Datum und Ort der Offenlegung („im Chat offengelegt am TT.MM.JJJJ – Erneuerung empfohlen").
5. **Fundort melden, nicht den Fund:** bei einer Datei oder Notiz nur Ort und Art des Schlüssels.
6. Nach der Erneuerung: `erstellt` auf das neue Datum, `offengelegt` und `erneuerung_faellig` auf `false`, Hinweis anpassen.

Braucht eine Sitzung einen Schlüssel, den es noch nicht gibt: nicht im Chat erfragen, sondern das sichere Formular anfordern (Werkzeug für Zugangsdaten der Umgebung) oder den Inhaber auf die Einstellungen der Umgebung verweisen.

## Was der Inhaber sagt, geht nicht verloren

Jede Aussage des Inhabers bekommt genau einen Ort und ein Datum. Nicht in ein privates Gedächtnis eines Werkzeugs, das die Sitzung nicht überlebt.

| Art der Aussage | Ort | Skill |
|---|---|---|
| Entscheidung („so machen wir es") | `DECISIONS.md`, nächste freie D-Nummer, mit Quelle und Offenem | `nexify-stand-halten` |
| Stand, Messung, Erledigtes | `PROGRESS.md`, oberster Abschnitt | `nexify-stand-halten` |
| Offene Arbeit, Auftrag, Frist | `PROGRESS.md` „Offene Arbeiten" und das Register in `config/acceptance-coverage.json` | `nexify-stand-halten` |
| Lösung, Dienst, Adresse, Konto, Zugang | dieses Register | dieser Skill |
| Kundenbezogenes | Kundenrepository, hier höchstens ein Verweis | `nexify-kundenprojekt` |
| Geheimniswert | nur Geheimnisspeicher | Abschnitt 4 |

Zweite Fundstelle außerhalb des Repositorys ist eine Mem-Notiz „NeXify Lösungsregister – Zeiger" mit Namen, Tags und dem Verweis auf `config/loesungsregister.json`. Sie wird nach jeder größeren Änderung des Registers nachgeführt und enthält nie einen Wert. Führend bleibt das Repository.

Rückwirkend gilt dasselbe: Was aus früheren Gesprächen noch nicht erfasst ist, wird beim Wiederauffinden an seinen Ort geschrieben, mit dem Datum der Aussage und der Quelle. Niemand behauptet, alle früheren Gespräche vollständig zu kennen (`CLAUDE.md`).

## Grenzen

- Das Register belegt die Form, nicht den Betrieb. Ein Eintrag ist kein laufender Dienst.
- Es ersetzt keine Entscheidung: `rolle_im_plan` folgt `DECISIONS.md`, nicht umgekehrt.
- Die Ausnahmeliste für Kennungen, die wie Zufallsfolgen aussehen (Konto-ID, Projektkennung), steht im Prüfwerkzeug und wird nur mit Review erweitert. Eine Ausnahme für einen Schlüssel gibt es nicht.
- Kein Gate wird abgeschaltet, um einen Eintrag durchzubekommen. Meldet die Prüfung einen möglichen Geheimniswert, wird der Wert entfernt, nicht die Prüfung.

## Prüfliste

- [ ] Vor dem Vorschlag einer neuen Lösung im Register nach Tags gesucht.
- [ ] Jeder Zustand hat Beleg und Datum; Unbelegtes ist als unbelegt oder unklar geführt.
- [ ] Kein Wert, kein Teilwert, keine Adresse mit eingebetteten Zugangsdaten.
- [ ] Offengelegte Zugänge sind als fällig markiert und dem Inhaber genannt.
- [ ] `python3 tools/check_loesungsregister.py` Exit 0; lesbare Fassung neu erzeugt.
- [ ] Entscheidungen und Stände stehen in `DECISIONS.md` und `PROGRESS.md`, nicht hier.

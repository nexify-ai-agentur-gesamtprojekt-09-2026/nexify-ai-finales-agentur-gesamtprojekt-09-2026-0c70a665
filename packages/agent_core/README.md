# packages/agent_core · Laufzeitkern für Python-Agenten

Stand 14.11.2026 · **Kern ohne Modell, ohne Host, ohne Betrieb.** Python (Standardbibliothek, lauffähig
ab 3.12). Einzige Abhängigkeit: `packages/knowledge` für den Typ `Mandant`. Keine Netzaufrufe, keine
Ausführung von Skill-Skripten, keine Persistenz (alles im Arbeitsspeicher eines Prozesses).

Das bestehende TypeScript-Paket `packages/agent-runtime` bleibt unberührt; dieser Kern ersetzt es nicht.

## Bausteine

| Datei | Inhalt |
|---|---|
| `skills.py` | Skill-Register im Format „Agent Skills" (Ordner + `SKILL.md` + Kopf); eine erlaubte Wurzel; SHA-256-Bindung wie `config/project-skills.json`; drei Stufen (Verzeichnis → Text → gebundene Beilage); keine Skriptausführung |
| `lauf.py` | `Grenzen` (Schritte, Kosten, Tiefe, Wiederholungen – alle Pflicht), `Rechte`, `Freigabeanfrage`, `Aufgabenentwurf`, `Fehlerfall`, `Laufauskunft` |
| `laufzeit.py` | `Laufzeit`: `anlegen`, `fortsetzen`, `status`, `freigabe_erteilen`, `freigabe_ablehnen`, `abbrechen`, `journal`, `fehlerablage` – Mandant immer erstes Argument |
| `journal.py` | Verkettetes Journal: Zeit, Schritt, Ereignis, gesalzene Eingabe-/Ausgabe-Hashes, Kosten, fester Code; nimmt technisch keinen Freitext an |
| `ports.py` | `ModellPort`, `WerkzeugPort`, `Ergebnisspeicher`; Entscheidungen des Modells; deterministische Stellvertreter `SkriptModell`, `StellvertreterWerkzeug` |
| `typen.py` | `Aktionsklasse`, `Laufstatus`, `Mensch`, Fehlertypen |

## Feste Regeln

- **Freigabepunkte:** Zahlung, Vertrag, Löschung, Rechteänderung, Versand nach außen halten den Lauf an.
  Die Pflicht hängt an `Aktionsklasse.freigabepflichtig` und ist im Code fest – es gibt keinen Parameter
  und keine Konfiguration dafür. Jede künftig ergänzte Klasse ist von selbst freigabepflichtig.
  Freigabe nur über `freigabe_erteilen(mandant, lauf, anfrage, freigeber=Mensch(…), bestaetigter_hash=…)`,
  gebunden an genau diesen Aufruf (Werkzeug, Argument-Hash, Schritt), einmal gültig.
- **Aktionsklasse** legt das Werkzeug bei der Anmeldung fest, nie das Modell; spätere Selbst-Herabstufung
  wirkt nicht.
- **Mandant:** jeder Lauf gehört genau einem Mandanten; Werkzeuge bekommen diesen Mandanten vom Lauf.
  Läufe, Journal und Fehlerablage anderer Mandanten sind nicht sichtbar („unbekannt").
- **Sub-Agenten** sind verschachtelte Läufe: gleicher Mandant, Rechte nur als Teilmenge, Grenzen höchstens
  der Rest des Auftraggebers, Verbrauch zählt beim Auftraggeber, Tiefe begrenzt.
- **Idempotenz:** `anlegen` mit gleichem Schlüssel liefert denselben Lauf; jeder Werkzeugaufruf trägt einen
  Schlüssel aus Mandant, Auftragsschlüssel, Schritt, Werkzeug und Argument-Hash; ein bereits gespeichertes
  Ergebnis wird geliefert, das Werkzeug nicht erneut gerufen.
- **Wiederholung:** nur Werkzeuge, die sich als `wiederholbar` (ohne Außenwirkung) ausweisen, begrenzt und
  mit wachsender Wartezeit. Modellaufrufe nie. `UnbekannterAusgang` nie – erst abgleichen.
- **Fehlerablage:** nicht verarbeitbare Schritte landen je Mandant mit festem Code in der Ablage; der Lauf
  endet geschlossen.
- **Kosten:** ganze Kosteneinheiten; fehlende oder ungültige Kosten beenden den Lauf. Beträge und Einheit
  legt der Inhaber fest – der Kern enthält keine.
- **Aufgaben:** nur Entwürfe im Ergebnis, je Lauf schaltbar; der Kern schreibt in kein System.

## Tests

```sh
python3 -m unittest discover -s tests -p 'test_agent_core_*.py'
```

## Grenzen dieses Kerns (ehrlich)

- Der Kern kann nicht beweisen, dass hinter `Mensch` ein Mensch steht; das leistet die Sitzungsschicht.
  Er stellt sicher, dass weder Modell noch Werkzeug eine Freigabe erzeugen können.
- Ein Werkzeug, das seine Aktionsklasse falsch angibt, wird nicht erkannt; die Klasse gehört in die
  Prüfung jedes Werkzeugs vor der Anmeldung.
- Kosten eines Schritts sind erst danach bekannt; die Kostengrenze kann um höchstens einen Schritt
  überschritten werden.
- Keine Zeitgrenze, keine parallelen Unterläufe, keine dauerhafte Ablage, kein HTTP-Server.

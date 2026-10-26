# Stillgelegte Legacy-Factory-Einstiege

Die folgenden vier historischen CLI-Einstiege sind **stillgelegt**, nicht neu
aktiviert oder als sichere Runner freigegeben:

- `tools/factory-adapter.mjs`
- `tools/factory-intake.mjs`
- `tools/factory-worker.mjs`
- `tools/factory-korrektur.mjs`

Jeder Einstieg gibt ausschließlich `LEGACY_AUTOMATION_RETIRED` auf stderr aus und
endet mit Prozessstatus **2**. Dies gilt auch mit vorhandenen Credentials, alten
`--merge`-/Issue-/MR-/Dateiargumenten und beliebigen Aktivierungsflags. Es gibt
keinen Umgebungsvariablen- oder generischen Unsafe-Bypass. Die Stubs importieren
keine Dateien, suchen keine Zugangsdaten, kontaktieren keine Dienste, starten
keine Kinderprozesse und führen keine Datei-, Git-, Issue-, MR- oder Mergevorgänge
aus. Aus früheren Aufrufen kann damit keine nebenläufige Freigabekette entstehen.

Die alte Implementierung bleibt im Git-Verlauf erhalten, beispielsweise im
vorangehenden Quellstand `b8b3b93a1b2b42918c7083f9cbf8be7b63af4e35`. Das ist
Quellenbewahrung, keine Anleitung zur Reaktivierung. Hintergrund für die
Stilllegung: Merge war teilweise vor dem unabhängigen Review möglich;
Issue-/Modellinhalte konnten unbeschränkte Dateien einschließlich CI und Regeln
schreiben; Fehlerpfade und genaue Commit-/Freigabebindung waren unzureichend.

Die neue, getrennt geprüfte CI-/Autonomie-Pipeline muss ihren eigenen Auftrag,
vertrauenswürdigen Quellstand, eng begrenzte Dateirechte, Secrets-/Netzgrenze,
Prüfbelege und unabhängigen Review verwenden. Sie darf diese Legacy-CLIs nicht
als Ausführungspfad nutzen. Modellantworten, Issue-Labels, eine grüne Einzelprüfung
oder der Name „Jeff“ ersetzen keine vorhandene Autorisierung oder Produktivfreigabe.
Geschützte Produktionsaktionen und bestehende Jeff-Gates werden durch diese
Stilllegung nicht gelockert.

Die historischen Watcher-, Spiegel-, Einbringungs- und Doku-Regenerationsskripte
werden dadurch weder gestartet noch umfassend repariert. Insbesondere sind sie
kein erlaubter Ersatzpfad für die neue Pipeline. Server-/systemd-Konfigurationen
auf Düsseldorf/Frankfurt beziehungsweise einer vorhandenen GitLab-Installation
sind aus dieser lokalen Änderung nicht als geprüft oder aktualisiert anzusehen.
Es wurde kein GitLab-Server, Runner, Watcher oder Remote-Workflow aktiviert.

## Lokaler Gegenbeweis

Aus dem Repository-Stamm:

```sh
python3 -m unittest discover -s tests -p 'test_legacy_automation.py' -v
```

Die Tests starten jeden echten Node-Einstieg einmal ohne Argumente und einmal
mit synthetischen Credentials sowie gefährlichen historischen CLI-Flags.
Ein isoliertes PATH-Verzeichnis enthält Fake-Kinderprozesse. Zusätzliche
Node-Preload-Tripwires stoppen und protokollieren private Dateizugriffe,
Netzwerkversuche und Kindprozesse, bevor sie wirksam werden. Positive
Kontrollproben prüfen, dass diese Tripwires tatsächlich auslösen. Erwartung für
alle vier Legacy-Einstiege: Status 2 und **keine** protokollierte Nebenwirkung.

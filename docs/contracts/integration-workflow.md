# Konsolidierter lokaler Workflow-Vertrag

Ergänzung zu `docs/workflows/context-to-delivery.md`, kein zweites Auftragsbackend.
AIFly ist der vorgesehene Controller. `config/integration-workflow.json` ist ein
versionierter Übergabe-WorkflowRecord; `tools/remediation_queue.py` bleibt die
vorhandene lokale Behebungsqueue und `tools/brain_ingestion.py` das lokale Staging.
Keine neue Datenbank, Scheduleraktivierung, Remoteverbindung oder Kostenänderung.

Jede Aufgabe führt stabile ID, ausdrücklich bekannte oder unbekannte Tenant-ID,
Projekt, Owner, Abhängigkeiten, Bearbeitungsstatus, Quellen-IDs mit SHA256,
Erstellungs-/Änderungs-/Fälligkeitszeit, Evidenz, nächsten Schritt und Rollback.
Unbekannter Runtime-Tenant wird als null geführt; lokale Repositoryarbeit darf
fortgesetzt werden. Er ist keine erteilte Mandantenberechtigung.
Quellenregister verifiziert ausschließlich benannte lokale Projektquellen;
fehlende externe Quellen bleiben explizit missing. Keine privaten Assistenznotizen.

Die sechs getrennten Nachweisstufen sind documented, built, locally_tested,
connected, live_tested, accepted. Jede bestätigte Stufe benötigt einen lokalen,
hashgebundenen Beleg desselben Scopes und Quellenstands. Höhere Stufen benötigen
die früheren. `done` setzt accepted voraus; lokale Lieferung mit externen Lücken
heißt delivered_with_gaps. Die Feature-Zustandsmaschine bleibt unverändert.

`python3 tools/verify_workflow_record.py` prüft Referenzen, Hashdrift, Reihenfolge,
Abhängigkeitszyklen und Scope. Das Programm führt weder Befehle aus dem Record aus
noch entscheidet es über Zugriff, Livefreigabe oder tatsächliche Fremdbelege.
Auch strukturell valide Runtime-Receipts müssen vom zuständigen Adapter real
rückgelesen und unabhängig beurteilt werden. Ein grüner Offlinecheck ist kein
Laufzeitnachweis. Accepted verlangt unabhängigen Reviewer und Restorebeleg.

External-Brain-Verbindung verlangt dieselbe reale Ziel-/Tenant-/Projektbindung
für WRITE → INDEX → EXACT_READ_BACK → CONTENT_COMPARE, geordnete Zeitstempel und
identische Inhaltshashes. Der aktuelle Record meldet keine solche Verbindung.
Der vom Parent gemeldete list_projects-Fehler ist hier nicht selbst nachgeprüft;
keine neue Credential-/Schreibaktion wurde versucht.

Sprint-Contract: F-007 bleibt einziges aktives Feature. Dieses lokale Arbeitspaket
behebt zwei PR35-Regressionsklassen und ergänzt den bestehenden WorkflowRecord.
DoD dieses Pakets: red/green-Regressionen, make check/test/e2e/check-arch/clean-check,
Quellen- und Branchidentität sowie konkrete externe Lücken. Gesamtproduktabnahme,
Server/Cutover, Remote-Schreiben, Zahlungen und Deployment sind ausgeschlossen.

Wirkung und Rückkehr: Managed-Käufe behalten Händler/Route/Bedingungen; neue
Reservierungen speichern zusätzlich die Kaufbindung. Fehlende Alt-Snapshots
sperren nur neue Ausführung, Storno bleibt möglich. Bereits dispatchte unbekannte
Ergebnisse können gegen ihre gespeicherte Reservierung reconciliert werden.
Die additive SQLite-Spalte löscht keine Historie; kein automatisches Backfill.
Zur Rückkehr gilt der vorherige lokale Commit; produktiv wäre ein separat
getesteter Datenbankbackup-/Restoreweg erforderlich. SEO hält die Schreibsperre
für den ganzen Import; SQLite-Locktimeouts bleiben Fehler ohne Teilcommit.
Größere Importe können deshalb konkurrierende Writer bis zum Timeout verzögern.

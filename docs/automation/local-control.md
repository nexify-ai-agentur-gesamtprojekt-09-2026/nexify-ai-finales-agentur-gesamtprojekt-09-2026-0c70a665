# Lokaler persistenter Steuerungspfad — Delta 2026-10-27

Basis ist ausschließlich PR35-Folgecommit b44e44853f37b9d24063c1e8f24a14b928aa6ea9. PR36 und main sind hier nicht zusammengeführt. AIFly bleibt Steuerungsebene; dieser endliche lokale Runner aktiviert weder eine externe Runtime noch einen Scheduler.

## Ausführbarer Umfang

`tools/local_control.py` importiert eine explizit lokal freigegebene unveränderliche Auftragsrevision. Es validiert höchstens 32 Teilaufträge, getrennte Start- und Abschlussgraphen, Quellenhash, Tenant/Projekt, genaue Zielwurzel und registrierte Operation. Auswahl: Intent → gepinnter Skill → fester Adaptervertrag → passende frische lokale Evidenz. Es lädt nur den ausgewählten Skill als Anleitung; Skilltext wird nicht ausgeführt.

Die drei implementierten Fähigkeiten sind `context.select` (bestehendes `context_executor.build_context`), `source.verify` (gesicherter exakter Read-back) und `brain.preview` (bestehende Redaktion/Chunkbildung, nur Chunkhashes). Die Vorschau führt kein WRITE/INDEX beim externen Brain aus. Unbekannte Operationen, SSH-Ersatz, Hostabweichung, fremde Scopes, fehlende Skills, veränderte Quellen und unvollständige Evidenz blockieren.

Alle Tabellen liegen additiv in der vorhandenen `.local/remediation/queue.sqlite3`. Fehlende Voraussetzungen gehen ausschließlich über `RemediationQueue.register/verify/status` und den nativen Prüfer `local_control_prerequisites`. Keine zweite Fehlerqueue. Keine generische Shell-, MCP-, Zahlungs- oder Legacy-Journey-Ausführung. Die Legacy-Dateien bleiben erhalten, sind aber ausdrücklich nicht als Fähigkeiten registriert.

## Zustands- und Vertragssemantik

`open_awaiting_verification → in_progress_limited → review_pending → verified_complete` gilt ausschließlich für lokale Prüfergebnisse. Fehler führen zu `blocked_not_reviewed`. Importiertes `source_reported_status` ist separat und beendet keinen Auftrag. `implementation_status` bleibt ebenfalls separat. Abschlussaggregation verlangt alle Teilaufträge lokal abgenommen. `dependencies` regelt Abschluss; `start_dependencies` regelt Start. Koordination kann vor Abschluss ihrer Kinder laufen. Beide Graphen müssen einzeln azyklisch sein; die Prüfung besucht jeden Knoten nur einmal pro Graph.

Der lokale SQLite-Writer erzwingt eine exklusive Lease pro Checkoutwurzel und monotone Fencing Tokens. Ein alter Worker kann nach Ablauf weder Ergebnis noch Fehlerzustand noch Leasefreigabe eines Nachfolgers schreiben. Checkpoints werden vor dem lokalen Lesen und beim atomaren Persistieren von Ergebnis/Hash gesetzt. Wiederaufnahme nach Prozessabbruch bewahrt Versuchsgrenzen; doppelte identische Revisionen liefern denselben Auftrag, widersprüchliche Revisionen werden abgelehnt. Keine verteilte Durchsetzung oder globale Atomizität behauptet.

Fehlerwiederaufnahme ist ausdrücklich: frische Evidenz bereitstellen, native Remediation-Verifikation, dann erneuter begrenzter Versuch. Es gibt keine automatische Endlosschleife. `refresh-review` erneuert nach Evidenzablauf ausschließlich einen noch fristgerechten `review_pending`-Job, bei identischem Vertrag, Quelle und erneut exakt verglichenem Ergebnis; es erhält Ergebnis und Versuchszahl. Veränderte Verträge oder abgelaufene Aufträge benötigen eine neue ausdrücklich freigegebene Revision. Fristen wartender Jobs werden auch bei unerfüllten Startbedingungen verbucht.

Abnahme benötigt einen anderen Operatornamen, einen quellenhashgebundenen Receipt und nativen Ergebnisvergleich. **Operatornamen und Tenantparameter sind lokale vertrauenswürdige Labels, keine authentifizierte Identität oder serverseitige Tenant-Sicherheit.** Dieser Pfad darf nicht als öffentliches API exponiert werden. Ein synthetischer zweiter Reviewer im Test ersetzt keine unabhängige fachliche Produktionsfreigabe. Codegegenprüfung und echte Providerabnahme sind getrennt.

Die technischen Grenzen (32 Jobs, maximal 3 Versuche aus vorhandener Queuepolicy, 30 Sekunden Lease, 3600 Sekunden lokale Evidenzgültigkeit) sind begrenzte lokale Implementierungsentscheidungen, keine aus dem Masterauftrag erfundenen Geschäftsbudgets. Externe Sicherheits-/Kostenlimits und Rechte bleiben unbewiesen und ermöglichen hier keine Ausführung.

## Bedienung und Reproduktion

Python-Standardbibliothek, keine neuen Dienste oder Pakete:

```sh
python3 tools/local_control.py --help
python3 tools/local_control.py --tenant synthetic-local --project canonical_agency_project probe source.verify
python3 -m unittest discover -s tests -p test_local_control.py -v
python3 -m unittest discover -s tests -p test_remediation_queue.py -v
make check
make test
make check-arch
make clean-check
```

`submit` liest eine explizite JSON-Datei im erlaubten Quellbereich; das exakte Schema und synthetische Auftragsgeneratoren stehen in `tests/test_local_control.py`. `run-once REQUEST --worker NAME` führt höchstens einen lokalen Job aus. `status`, `resume JOB --health-id ID`, `refresh-review JOB --health-id ID` und `review` sind getrennte Operationen. `review` verlangt Resultathash sowie Pfad und Hash des Receipts. Tests verwenden ausschließlich temporäre synthetische Checkouts, einschließlich Mehrprozesskonkurrenz und Crash/Restart. Kein Test meldet Kundenbetrieb.

## Eine Web-App: Konsolidierungs- und Abnahmematrix

| Stand/Modul | Gegenwärtiger Beleg | Nächste lokale Integration | Fehlende Betriebsabnahme |
| --- | --- | --- | --- |
| main 07833fb3 | Referenzbasis aus Parent-Lesung | Quellendifferenz gegen ausgewählten Integrationsstand prüfen | kein gemeinsamer Release |
| PR35 a19cd503 → b44e448 | getrenntes lokales Selfservice-/SEO-Patchpaket | Domänenlogik als getrenntes Modul hinter gemeinsamer Shell einbinden | echte Rollen, Tenantwechsel, Fundingregeln, Restore |
| PR36 66866298 → 58ea5b3 | getrennt geprüfte lokale Auth-/Standalone-Korrekturen | gemeinsame Workspace-Shell, Navigation, zentrale Tokens und DE/NL/FR erhalten | echter Provider, Sessionwechsel/Logout, direkte Links und Zurück/Vorwärts |
| lokaler Controller auf b44e448 | persistierte lokale Jobs/Ergebnisse; kein neues UI | Statusvertrag später in dieselbe Shell aufnehmen | authentifizierte serverseitige Zuordnung, verteilte Leases und qualifizierte Freigabe |

Agentur, Selfservice und Kundenbereiche bleiben fachlich und mandantenbezogen getrennte Module. Keine neue konkurrierende Web-App, keine gemeinsame ungeschützte Kundendatenbank. Mehrfachklicks/Replay sind lokal im Controller geprüft; echte App-Übergänge, Tenantwechsel, mobile/Tastaturbedienung und Providergrenzen bleiben zusätzliche Integrationstests am späteren gemeinsamen Release. Domains und Veröffentlichungen bleiben unverändert.

## Quellen, Grenzen und Rollback

Technischer Mastervertrag wurde vom Parent mit Nachweisstichtag 2026-10-27T04:14Z übermittelt. Gemeldete Originalhashes: Markdown `d4f995ee0300ed40b49ffb16673c0b0b90d856f11f441c06ab5182a8e0f3f0c6`, Register `91af17977216caf020c10ca9024779398a58bcb344b50d284c23929b8c3416a7`. Vollständige Originaldokumente wurden hier nicht erneut gelesen; dieses spätere Codedelta wird nicht rückdatiert. Es importiert weder vollständiges Geschäftsregister noch private Nebenaufträge.

Parent-gemeldete externe Grenzen sind keine hier reproduzierten Betriebsdiagnosen: Brain-Tenant/Workspace-Mapping offen (OPEN_RISK), unvollständige Pagination, kein WRITE→INDEX→EXACT READ-BACK→CONTENT COMPARE; Sekundärhost nicht schreibverifiziert; Backupfehler benötigt letzten erfolgreichen Stand, Exitprotokoll und Restorebeleg. Kosten, Zugänge und Server bleiben unverändert. Die Suite-Trial/Funding-Fachregel bleibt zur Klärung offen; keine unbezahlten LLM-Aufrufe werden freigeschaltet.

Rollback: Runner anhalten und auf Basis b44e448 zurückwechseln. Bei bereits vorhandener lokaler Queue vor Erstnutzung konsistente SQLite-Backupkopie über die Backup-API anlegen und deren Restore separat testen. Die neuen Tabellen sind additiv; keine automatische Rückmigration oder Löschung von Queue-/Jobdaten. Mit altem Code keine neuen Controllerjobs starten. Reine Patchprüfung benötigt keine Datenmigration. Ein Produktionsrestore ist hier nicht bewiesen.

## Master-Delta 1.1: Abgleich, kein stiller Vollständigkeitsanspruch

Parent-übermittelter Dokumentstand 1.1/schema 1.1.0, Stichtag 2026-10-27T04:40Z:
Markdown `a829a41556fbcc0aef16a1186ab501080c4f6a3662e890e55a0572f5b1044753`,
Register `4d1327cbfe01577a064810b4b26edcdb5c216dafe92ffd741596d1ac9392cb51`.
RQ-023/024 sind in obiger Konsolidierungsmatrix berücksichtigt, nicht als Laufzeit
implementiert markiert. Kanonische Domain, Runtime und Root-Route bleiben
`decision_pending`. RQ-025: lokale Testmethoden und Quellhashes liegen im
Evidenzverzeichnis; keine Lastmessung oder SLA. RQ-026 ist ausschließlich für die
drei lokalen Operationen umgesetzt. Der externe Zustandsautomat
unsupported/unauthorized/target_mismatch/stale/partial/unavailable/uncertain_outcome,
insbesondere die Ablösung älterer Erfolge durch neuere Adapterfehler, bleibt
`required_not_runtime_verified`; es gibt keinen externen Adapter und keinen Fallback.

Die 18 Gesamt-Testfälle des Mastervertrags bleiben `planned_not_executed` am
zusammengeführten Release. Die lokalen Runnerregressionen liefern einen begrenzten
Teilnachweis zu Fall 06/18, das getrennte PR36-Paket Teilnachweise zu 03/07/11/15;
diese Teilnachweise setzen keinen Gesamtfall auf bestanden. WP-09/WP-10-Abschluss
und WP-07/WP-08-Migration/Abnahme bleiben offen. Die hier dokumentierten Planstatus
sind Dokumentstatus, keine zusätzlichen ausführbaren Jobzustände.

## Geschlossener lokaler Kreis — Zusatzweisung 2026-10-27

`status()` führt pro Teilauftrag `follow_up`: Koordinatorrolle D08, zuständige
Ausführungs-/Reviewerrolle, konkrete bekannte Executorzuweisung oder null,
Block-/Verwaisungsursache, nächste zulässige Aktion und benötigte Voraussetzungen.
Eine Rolle allein wird nicht als konkrete Executorzuweisung ausgegeben. Verwaiste
Claims bleiben offen, benötigen frische Fencing-Tokens und bewahren Versuchszahlen.
Frist-/Versuchsüberschreitung verlangt eine neue ausdrückliche Revision, keinen
blinden Retry. Dies startet weder Worker noch Scheduler.

`closed_loop_receipt` verweist auf Ergebnis-/Vertragshash und tatsächlichen
persistierten Reviewreceipt im vorhandenen Register. Ein übergebener oder nur
ausgeführter Auftrag bleibt offen. Aggregation benötigt geschlossene Receipts für
alle Kinder; die bisherige Parent-Join-Prüfung bleibt bestehen. Ergebnis, Review,
Quellenbindung und Events liegen bereits in derselben Remediationdatenbank.
Eine externe Wissensrückführung ist separat ausdrücklich nicht verifiziert.
Alle bisherigen Reviewerfindings sind mit Reproduktion, Korrektur und Nachprüfung
in den versionsgebundenen Paketberichten verfolgt, kein bloßes Wegdelegieren.

Unabhängige Nachprüfung des Statusdeltas reproduzierte zusätzlich einen zu früh
als ausgeschöpft gemeldeten letzten Versuch. Korrigiert: eine noch gültige aktive
Lease bleibt laufend; erst nach Ablauf ohne Ergebnis ist der letzte Versuch
erschöpft. Regression prüft beide Zustände. Reviewfinding ist damit nachgeprüft,
nicht lediglich weitergereicht.

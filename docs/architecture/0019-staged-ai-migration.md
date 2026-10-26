# 0019 · AI-Umstellung erst nach vorbereitetem Ersatz

## 01 · Geltung und Folgen jedes Eingriffs

Die aktuelle Nutzerkorrektur gilt vor jeder Änderung: Zuerst muss die finale Ersatzlösung bereitstehen; erst danach werden laufende AIs, Codex-CLI-Zugänge und Kundenabläufe gezielt umgestellt. Ein neuer Standard darf bestehende Arbeit in der Zwischenzeit nicht pauschal sperren. Dies betrifft nicht nur Migrationen, sondern die grundsätzliche Beurteilung jedes Eingriffs.

Vor einer Änderung sind vorhandene Nutzer, aktive Jobs, direkte und indirekte Abhängigkeiten, der Wirkungsbereich, mögliche Fehlerfolgen, der Zwischenbetrieb und die Rückkehr zum bisherigen Zustand zu prüfen. Dazu gehören konkrete Was-wenn-Fälle: Was geschieht mit einer laufenden Kundenanfrage, wenn der Ersatz fehlt, eine Abhängigkeit ausfällt, ein Kontext wechselt oder eine Aktion bereits ausgeführt wurde? Die Auswertung verwendet zuerst die verfügbaren Quellen und Laufzeitbelege. Allgemeine Rückfragen werden nicht gestellt, wenn diese Tatsachen bereits vorliegen. Fehlt ein notwendiger Nachweis, bleibt die konkrete neue Umstellung aus; die bisherige Arbeit wird dadurch nicht neu blockiert. Die übergreifende Change-Impact-Regel wird separat durch Root geführt; dieses Dokument konkretisiert sie für AI-Übergänge.

Geltung: das eigene Agentur-Repository `nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665`. Jeder Entscheidungszustand bindet Repository, Eigentumszuordnung, Runtime-ID, Tenant, Projekt, Quellversion und Ausführungsumgebung. Kundenprojekte, Affilinet Portal Aachen und die ChatGPT-Hostruntime sind ausgeschlossen. Unbekannte externe Hosts dürfen für Inventar/Shadow beschrieben werden, erhalten aber keine Umstellungsfreigabe. Der Name eines Modells, die Installation einer Bibliothek oder ein gemeinsamer Account reichen für keinen globalen Wechsel aus.

## Entscheidung statt Runtimeeingriff

`config/ai-migration-policy.json` beschreibt den Vertrag. `tools/ai_migration.py` enthält einen deterministischen Vorschlagsreducer und einen prozesslokalen Referenzkoordinator. Sie starten und stoppen keine Prozesse, ändern keine Umgebung, schreiben keine Datenbank, erzeugen keine Credentials und tätigen keine externen Aufrufe. Es gibt keine frei übergebenen Shellbefehle, URLs oder Skripte zur Ausführung.

Der Standard ist Audit/Shadow mit unverändertem bisherigen Runtimebetrieb. Das Ergebnis enthält stets `existing_runtime_unchanged=true` und `runtime_execution_authorized=false`. `existing_work_allowed=true` bedeutet ausschließlich: Dieser Migrationsentscheid führt keine neue Sperre der alten Arbeit ein. Er ist keine zusätzliche Berechtigung und setzt keine bisherigen Authentifizierungs-, Zahlungs-, Budget- oder Sicherheitsregeln außer Kraft.

Die Manifestphasen bezeichnen den geprüften Entscheidungsstand, keine durch das Tool tatsächlich vollzogene Runtimeumstellung. Auch ein aufgezeichneter `cutover` ist hier ein Vorschlag mit Nachweisen, keine Bestätigung umgeleiteter Kundenanfragen. Es wird kein bestehender Kundenpfad an diese neue Entscheidungsfunktion angeschlossen. Neue verwaltete Adapter behalten ihre eigenen schon geltenden Guards; diese werden nicht wegen des Übergangs abgeschaltet.

## Phasen und erforderliche Nachweise

| Übergang | Zweck und erforderliche Nachweise |
| --- | --- |
| `inventory → shadow` | Den eigenen Bestand und den geplanten Übergang dokumentieren. Kein Ersatz erforderlich, keine Umleitung, aktive Jobs dürfen weiterlaufen. |
| `shadow → validated` | Ersatzbereitschaft, direkte/indirekte Abhängigkeiten und eigene Guarddurchsetzung des neuen Adapters nachweisen. Keine produktive Route ändern. |
| `validated → canary` | Zusätzlich getestete Rückkehrmöglichkeit, konkrete Scope-Autorisierung und Routing-Lease nachweisen. Ein realer Canary muss begrenzt und außerhalb dieses Tools umgesetzt werden. |
| `canary → cutover` | Zusätzlich tatsächliches Canary-Readback und vollständigen Drain nachweisen; keine aktiven Kundenjobs im umzustellenden Scope. |
| `cutover → retired` | Eigenständiger Retirementreview, Drain und Scope-Autorisierung. Eine Stilllegung wird hier nicht ausgeführt; Rückkehr-/Aufbewahrungsregeln müssen im tatsächlichen Betrieb erfüllt sein. |

Jeder spätere Übergang prüft die für ihn benannten Nachweise erneut. Ein zwischenzeitlicher Fehler ist kein Freibrief aufgrund eines älteren grünen Checks. Rückkehr von `canary` oder `cutover` zum Entscheidungsstand `validated` benötigt `rollback_readiness`, `rollback_restore_readback` und `scope_authorization`. Das Tool führt auch diese Rückkehr nicht aus.

Die feste Fähigkeitsliste besteht aus `managed_chat`, `byok_chat`, `ci_review` und `codex_cli_provider`. Dies sind zulässige Vertragskategorien, keine Behauptung bereits installierter Adapter oder unterstützter CLI-Funktionen. Freie Namen erlauben keine zusätzlichen Fähigkeiten. Ersatzversion und Fähigkeit bleiben nach der ersten Validierung gebunden. Bei anderem Ersatz ist eine neue, getrennte Validierung erforderlich. Bei geändertem Runtime-/Tenant-/Projekt-/Quellkontext wird neu inventarisiert; alte Belege dürfen nicht automatisch übertragen werden.

## Evidenz- und Vertrauensgrenze

Jeder Beleg enthält exakt:

```text
kind, context, replacement_version, source_sha256, receipt_ref,
outcome, observed_at, expires_at
```

Der Kontext muss vollständig übereinstimmen; die Ersatzversion muss dieselbe sein wie im Antrag. Quellhash und opake Belegreferenz sind Pflicht. Der Ausgang muss `pass` sein. Zeitstempel enthalten eine Zeitzone; zukünftige, abgelaufene oder über eine Stunde alte Beobachtungen werden abgewiesen. Ein fehlgeschlagener Abhängigkeitsbeleg verweigert die Umstellung. Der Bestand bleibt dabei unverändert.

Die lokale Funktion kann die Echtheit externer Belege nicht aus einer JSON-Datei beweisen. Die Prüfeingaben sind deshalb bewusst **Behauptungen innerhalb einer Offline-Simulation**. Für eine echte Umstellung müssen vertrauenswürdige Domainadapter die tatsächliche Bereitschaft, Canary-Ergebnisse, aktive Jobs, Lease, Drain und Rückkehrnachweise liefern und ihre Referenzen/Quellhashes prüfen. Ein selbst gesetztes Clientflag, bloßer Modellname oder frei erfundener Receiptstring ist kein produktiver Nachweis. Es existiert durch dieses Modul kein öffentliches Freigabe-API.

## Wiederholung und Konkurrenz

Jeder Antrag benötigt eine `decision_id` und `expected_revision`. Identische Wiederholung liefert einen Readback, ohne Revision oder Phase erneut zu verändern. Dieselbe ID mit anderem Antrag oder anderen Belegen wird abgewiesen. Ein älterer Replay kann späteren Stand nicht zurücksetzen. Unterschiedliche konkurrierende Entscheidungen müssen gegen die aktuelle Revision vergleichen.

`MigrationCoordinator` schützt diesen Vergleich und die Zuweisung innerhalb eines Prozesses mit einer Sperre. Zwei gleichzeitige identische Anträge erzeugen eine Entscheidung und einen Readback; verschiedene IDs auf derselben alten Revision erzeugen höchstens einen Fortschritt. Das ist keine persistente, prozessübergreifende Routing-Lease. Die reine Funktion `evaluate` gibt einen Vorschlag zurück und kann allein keine Konkurrenz zwischen mehreren Schreibern verhindern. Vor realem Routingwechsel braucht der Betreiber einen bereits autorisierten atomaren Datenspeicher und eine tatsächliche Lease-/Drain-Koordination; dieses Modul richtet beides nicht ein.

## Lokale Was-wenn-Auswertung

Die CLI liest ausschließlich die ausdrücklich benannte lokale `.json`-Szenariodatei. Alle Vorfahren und die Datei werden per Verzeichnisdeskriptor ohne Symlinkfolge geöffnet. FIFO, andere Spezialdateien und Hardlinks werden vor dem Lesen abgewiesen; `O_NONBLOCK` verhindert ein Warten auf einen FIFO-Schreiber. Die 256-KiB-Grenze gilt für Anfangsgröße und tatsächlich gelesene Bytes; Vor-/Nachstat erkennt eine Änderung während des Lesens. Pfadfluchten, versteckte Verzeichnisse und bekannte Secret-/Credential-/Authpfade sind keine zulässigen Szenarioeingaben. Es findet weder eine Dateisuche noch ein pauschaler Quellenimport statt. Sie schreibt ausschließlich eine Zusammenfassung auf stdout. Eingabekontext, Beleginhalte und frei übergebene Strings werden nicht zurückgespiegelt.

```bash
python3 tools/ai_migration.py --scenario /workspace/inputs/ai-migration-what-if.json
```

Die Datei enthält genau `state`, `request`, `evidence`, `now`. Einen Anfangszustand erzeugt die Python-Funktion `initial_state(context)` ausschließlich im Speicher. `now` dient der reproduzierbaren Offline-Auswertung; seine Wahl authentifiziert keine reale Messung. Ein verweigerter Übergang liefert Exitcode 1, ungültige Eingaben 2. Diese Exitcodes dürfen während Audit/Shadow nicht als neuer Kill-Switch vor vorhandene Arbeitswege gesetzt werden.

Zum Antrag gehören `context`, `target_phase`, `expected_revision`, `decision_id`, `replacement_version`, `adapter_capability`, `active_customer_jobs` und optional `action` (`advance` oder `rollback`). Eine Befehlsangabe wie `command` wird abgelehnt. Felder für aktive Jobs und Evidenz können in Szenarien Was-wenn-Fälle abbilden; tatsächlich erhobene Daten werden dadurch nicht behauptet.

## Verifikation und offene Betriebsintegration

Zehn gezielte Tests prüfen Shadow mit aktiven Jobs, fehlenden Ersatz und fehlerhafte Abhängigkeiten, Cutover mit laufendem Kundenjob oder fehlendem Drain, vollständige Folgezustände, die belegpflichtige Rückkehr, Kontext-/Quellversionswechsel, identische und konkurrierende Entscheidungen, unbekannte externe Hosts sowie abgelaufene und falsch zugeordnete Evidenz. Zusätzliche echte CLI-Subprozesse müssen FIFO, Hardlinks, Datei-/Verzeichnissymlinks und Übergröße innerhalb eines festen Timeouts ablehnen; der Leser wird außerdem gegen Wachstum während des tatsächlichen Lesens und sensible Eingabepfade geprüft:

```bash
python3 -m unittest tests/test_ai_migration.py
```

Es fand keine tatsächliche Migration, Runtimeabschaltung oder Neuverdrahtung bestehender Kunden-/CLI-Flows statt. Die tatsächliche Ersatzlösung, ihre unabhängigen Betriebsnachweise und die spätere autorisierte Integration in produktives Routing sind gesonderte Aufgaben. Der AI-Coverage-Guard dient währenddessen als Auditbeobachtung; ein aktuelles Quellinventar allein ersetzt keinen dieser Umstellungsnachweise.

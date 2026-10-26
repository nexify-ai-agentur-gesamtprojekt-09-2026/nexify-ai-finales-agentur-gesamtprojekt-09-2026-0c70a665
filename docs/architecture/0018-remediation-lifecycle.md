# 0018 — Lokaler Lebenszyklus für fehlende Voraussetzungen

Stand: 2026-10-26. Implementiert: `tools/remediation_queue.py`, Richtlinie `config/remediation-policy.json`, Regression `tests/test_remediation_queue.py`. Geltungsbereich ist ausschließlich das kanonische Agenturprojekt. Kundenprojekte, Remotezugänge, Providerbudgets und produktive Freigaben werden nicht durch diese lokale Registrierung autorisiert.

Die Queue beendet keine Prozesse und deaktiviert keine laufenden, noch nicht migrierten Codex-/Kundenabläufe. Migrationsreife ist von Runtimeabschaltung getrennt: audit/shadow/dual-run, dann geprüfter Cutover je Runtime mit Rollback; bestehende echte Auth-/Safety-/Fundinggates gelten weiter. Eine neue lokale Queuepolicy ist keine pauschale Abschaltanweisung.

Eine fehlende Voraussetzung erzeugt unmittelbar einen konkreten Behebungsauftrag mit stabiler Identität, Verantwortlichem, nächster Handlung und Fälligkeit. Die anschließende Arbeit erfolgt innerhalb bestehender Rechte. Erst ein aktueller Nachweis des exakt gebundenen Prädikats kann dessen lokale Sperre aufheben. Ein gespeicherter Block ist kein Ersatz für die Arbeit an seiner Ursache.

## Registrierung, Zustände und Wiederaufnahme

Die reale Datenbank liegt unter `.local/remediation/queue.sqlite3`, ist vom Git-Tracking ausgeschlossen und wird mit Dateimodus 0600 erstellt. Alternative Datenbanken sind ausschließlich innerhalb `.local/remediation/` erlaubt. `status` und `due` öffnen SQLite mit `mode=ro`, erzeugen keine Datenbank und schreiben keine Queuezustände. SQLite/WAL und `BEGIN IMMEDIATE` schützen zusammengehörige Zustandsänderungen, Tickets, Beobachtungen und Idempotenzbelege über parallele Aufrufer und Neustarts hinweg. Es gibt keine Hintergrundausführung und keinen installierten Scheduler.

Die Identität ist SHA-256 über den kanonischen Scope `{project,component,resource,requirement}`. Projekt muss `canonical_agency_project` sein. Ein unveränderter erneuter Fund erzeugt keinen zweiten Auftrag und überschreibt weder den neueren Arbeitsplan noch die Frist. Der Fingerprint bindet Scope, feste Prüferkonfiguration und SHA-256 aller Quellen einschließlich Queue-Richtlinie. Eine geänderte Quelle oder Prüferkonfiguration erzeugt eine neue Generation und öffnet den Auftrag erneut. Bestehende offene Fristen werden dadurch nicht nach hinten verschoben.

| Zustand | Bedeutung und nächste Aktion |
| --- | --- |
| `blocked` | Voraussetzung fehlt oder Prüfung scheitert; Owner behebt die konkrete Ursache. |
| `in_progress` | Owner hat eine konkrete Arbeit aufgenommen oder einen neuen Plan dokumentiert. |
| `awaiting_external` | Benannte autorisierte Identität, Adapter oder echter externer Nachweis fehlt; Owner verfolgt diese Beschaffung. |
| `verify` | Persistentes Prüfticket bindet Generation, Scope und Fingerprint. Ein neueres Ticket ersetzt ältere Tickets. |
| `resolved` | Ausschließlich das exakt gebundene lokale Prädikat hat die aktuelle native Prüfung bestanden. |

`verification_required` ist ein abgeleitetes Ausgabefeld, kein frei setzbarer Abschlussstatus. Die lokale Owner-Kennung dient der Verantwortlichkeit; sie ist keine authentifizierte Kundenidentität und keine Rollenfreigabe. Zugriff durch mehrere nicht vertrauenswürdige Betriebssystemnutzer ist kein unterstütztes Sicherheitsmodell.

## Feste Prüfer und Grenzen

| Prüfer | Aktueller Nachweis | Was er nicht freigibt |
| --- | --- | --- |
| `local_file_sha256` | Aktuelle reguläre lokale Datei entspricht dem zuvor explizit erwarteten Hash. | Fachliche Korrektheit, unabhängige Reviewfreigabe, Ausführung des Inhalts. Die Zieldatei wird automatisch selbst in den Quellenfingerprint aufgenommen. |
| `project_skills_integrity` | Fester nativer `project_skills.verified_sources(root)` prüft die vorhandenen Skillquellen und Manifestbindung. Alle Skillquellen werden in den Fingerprint aufgenommen. | Skill-Review, Remoteinstallation oder Ausführung von Skillanweisungen. |
| `managed_llm_policy` | Fester nativer `check_llm_policy.validate(configs)` prüft die fünf gebundenen Konfigurationsquellen auf den bestehenden Modellvertrag. | Modellaufruf, Geldfreigabe, laufzeitübergreifende Egresskontrolle. |
| `context_reader_regression`, `brain_ingestion_regression`, `seo_atomicity_regression` | Fest verdrahtete Unittestdatei im festen Anwendungscheckout, Code/Test/Runner/Richtlinie an den Fingerprint gebunden. Isolierter Pythonaufruf ohne Shell, mit fester Env-Whitelist, verworfenem Output, 60 Sekunden Timeout und Beendigung der eigenen Prüferprozessgruppe bei Timeout. | Remoteadapter, produktive Gesamtruntime, frei angegebene Befehle oder Tests. |
| `browser_evidence_binding` | Fester Checker bindet den tatsächlich vorhandenen gespeicherten Browserbeleg einschließlich mobiler SDK-Fokus-/Chatprüfung an aktuelle Quellen; alle Quellen werden begrenzt gelesen und gebunden. | Eine erneute Browserausführung oder externe Liveabnahme; die Belegwahrheit bleibt dem durchgeführten Browserreview zugeordnet. |
| `external_readback_required` | Erfasst ausdrücklich den fehlenden echten externen Nachweis; Ergebnis bleibt `awaiting_external`. | Abschluss durch boolesches `success`, Freitextbeleg oder behauptete Remoteprüfung. |

Es gibt keine Shell-, URL-, frei wählbare Import-, Command-, Testpfad- oder Success-Schnittstelle. Die fest erlaubten nativen Module kommen ausschließlich aus dem festen Checkout dieser Anwendung; ein alternativer Datenscope ersetzt keinen Prüfercode. Ausgeführt werden exakt die sicher gelesenen Bytes, ohne erneutes Öffnen des Modulpfads. Sie gehören zur vertrauenswürdigen lokalen Codebasis. Native Importprüfungen sind keine Sandbox für fremden Code. Alle Quellen werden begrenzt gelesen; Dotfiles, Secret-/Credential-Dateinamen, Referenz-/Kundenwurzeln, Symlinks, Hardlinks und nicht reguläre Dateien einschließlich FIFOs werden abgewiesen. Gespeichert werden Quellenpfade und Hashes, keine Quelltexte. Metadaten mit erkannten Tokenmustern oder URL-Zugangsdaten werden verworfen; dies ersetzt keine Secretklassifizierung durch den Aufrufer.

Vor und nach der Prüfung müssen die gebundenen Quellen aktuell sein. Veraltete, ersetzte oder zeitlich vor dem Ticket liegende Beobachtungen können nicht schließen. Gleiche Eventkeys sind bei identischer Nutzlast idempotent; andere Nutzlast mit gleichem Schlüssel wird abgelehnt. Eine historische Wiederholung liefert den aktuellen Zustand und kann eine neue Generation nicht durch einen alten Erfolg entsperren.

Auch `status` prüft bei gespeichertem `resolved` die Quellen und die kleinen lokalen Prädikate erneut. Bei den drei Regressionen bindet die Leseoperation den vorherigen echten Erfolg an die unveränderten Code-/Test-/Runnerhashes und startet keinen Testprozess; eine neue Ausführung erfolgt ausschließlich durch `verify`. Bei Drift meldet die Ausgabe effektiv `blocked`, `stored_state: resolved` und `verification_required: true`; die Leseoperation ändert den gespeicherten Lebenszyklus nicht. Deshalb muss jeder Verbraucher den aktuellen effektiven Zustand lesen und darf einen früheren Erfolgsbeleg nicht als dauerhafte Freigabe zwischenspeichern. Das Gate und der spätere tatsächliche Sideeffect sind noch keine gemeinsame Transaktion: für externe Aktionen bleibt eine eigene atomare Autorisierungs-/Funding-/Ausführungsschicht erforderlich.

## Reale Befunde und konkrete lokale Befehle

Die fünf Einträge aus `config/project-skills.json:known_gaps` werden als echte Aufträge importiert, nicht als behobene Fälle dargestellt. Sie betreffen die vier gemeldeten Server, LightRAG, ungefähr 9000 gemeldete Wissensdateien, aktuelle Auth-/Funding-/Toolbelege und Browserabnahmen. Zusätzlich enthält die lokale Arbeitsdatenbank die aktuellen Reviewbefunde `KNOW-FIFO`, `KNOW-REDACTION`, `CONTEXT-HARDLINK`, `KNOW-SUPERSEDE-TOMBSTONE`, `SEO-SOURCE-ATOMICITY`, `LEGACY-LLM-BYPASSES`, `UI-MOBILE-STREAM-FOCUS` sowie die benannte Abhängigkeit `REMOTE-AI-ADAPTER`. Letztere benötigt D06: einen autorisierten, tenantgebundenen, budgetierten und kontrollierten Remoteadapter; das Sperren alter Aufrufe ist kein Nachweis einer funktionierenden Gesamtruntime. Die fünf lokal lösbaren Reader-/Ingestion-/SEO-Befunde erhalten die jeweils passende feste lokale Regression und schließen erst nach ihrem echten aktuellen Lauf. Der UI-Befund kann ausschließlich durch den aktuellen gespeicherten und quellgebundenen Browserbeleg schließen; die Queue startet dabei keinen Browser. `LEGACY-LLM-BYPASSES` und `REMOTE-AI-ADAPTER` bleiben Migrations-/Adapteraufträge mit audit/shadow und geprüftem Cutover, kein Abschaltauftrag und kein pauschaler Legacy-Sperrerfolg. Die externe Platzhalterprüfung kann diese beiden Fälle nicht schließen.

```sh
python tools/remediation_queue.py import-project-gaps
python tools/remediation_queue.py due
python tools/remediation_queue.py status
python tools/remediation_queue.py sweep
```

`due` liefert jetzt bearbeitbare offene Aufträge unter Berücksichtigung der Wiederholungszeit. `due_at` ist die Frist. Die Richtlinie setzt technische Standardwerte von einer Stunde, drei Versuchen und Wartezeiten 60/300/1800 Sekunden; dies ist kein Kunden-SLA. `sweep` protokolliert fällige Eskalationen an D01, versendet keine Nachrichten und führt keine Arbeit aus. Nach erschöpften Versuchen braucht es einen dokumentierten Owner-Plan; dieser hebt keine Freigabe auf und erzeugt keinen Erfolg.

```sh
python tools/remediation_queue.py start --id SCOPE_SHA --owner D06 --next-action 'Konkreten Adapterzugang prüfen.' --reason 'Autorisierte lokale Arbeit aufgenommen.' --event-key AUFTRAG_START_1
python tools/remediation_queue.py wait --id SCOPE_SHA --owner D06 --next-action 'Benannte autorisierte Gegenstelle mit Read-back beschaffen.' --reason 'Gegenstelle noch nicht verifiziert.' --event-key AUFTRAG_WAIT_1
python tools/remediation_queue.py retry --id SCOPE_SHA --owner D06 --next-action 'Neue konkrete Ursache beheben und erneut prüfen.' --reason 'Neue Untersuchung nach ausgeschöpften Versuchen.' --event-key AUFTRAG_PLAN_2
python tools/remediation_queue.py verify --id SCOPE_SHA --event-key AUFTRAG_CHECK_2
python tools/remediation_queue.py status --id SCOPE_SHA --require-resolved
```

Die Beispielkennungen `SCOPE_SHA` werden durch die tatsächliche ausgegebene ID ersetzt. Für wiederholte Zustellversuche derselben Operation denselben Eventkey verwenden. Eine neue Untersuchung erhält einen neuen Eventkey. `verify` führt ausschließlich den registrierten festen Prüfer aus; Exit 0 bedeutet, dass die Operation ausgeführt wurde, nicht dass ihr fachliches Ergebnis bestanden ist. Das anschließende `status --require-resolved` ist der synchrone fail-closed Check: Exit 0 ausschließlich bei mindestens einem aktuellen bestandenen Prädikat, sonst Exit 2. Unbekannte IDs und leere Datenbanken bestehen nicht. Ohne `--id` müssen sämtliche registrierten Voraussetzungen aktuell bestanden sein; das ist bei noch offenen externen Abhängigkeiten bewusst nicht der Fall.

Ein gezielter echter lokaler Konfigurationsauftrag lässt sich so registrieren und nach Behebung erneut prüfen:

```sh
python tools/remediation_queue.py register --scope '{"project":"canonical_agency_project","component":"managed_llm","resource":"config_binding","requirement":"local_config_integrity"}' --check '{"kind":"managed_llm_policy"}' --source config/llm-policy.json --owner D07 --next-action 'Konfigurationsabweichung reparieren und native Prüfung erneut ausführen.'
```

Die ausgegebene ID an `verify` und danach `status --id … --require-resolved` übergeben. Bei Quelländerungen erst dieselbe Registrierung erneuern, dann neu prüfen. Das ist auch die konkrete CI-/Wiederaufnahme-Schnittstelle; ein automatischer CI-Aufruf oder ein generischer Resolver wurde hier nicht in andere Workflows eingebaut. Die lokale Queue ist kein versioniertes Remote-Evidenzarchiv und wird auf einer neuen Maschine durch Import/erneute aktuelle Prüfung aufgebaut. Offene Reviewbefunde benötigen dort ebenfalls einen erneuten expliziten Import.

## Abnahme und offene Integration

```sh
python -m unittest discover -s tests -p 'test_remediation_queue.py' -v
```

Die Tests benutzen echte temporäre SQLite-Datenbanken und prüfen Wiederholung, Parallelität, Neustart, Ownerplan, Drift, Generation, überholte Tickets, zeitlich ungültige Beobachtungen, fehlende Voraussetzungen, fremde Success-/Command-Felder, externe Nichtfreigabe, Wiederholungsfristen, Eskalation, Pfad-/FIFO-/Alias- und Ressourcenbegrenzungen sowie den festen isolierten Regressionsaufruf, read-only SQLite und das synchrone Gate. Externe Auth-/Funding-/Toolprüfer, aktive Bearbeitungsworker, authentifizierte Multiuser-Bedienung und dauerhafter Scheduler sind noch nicht implementiert. Sie benötigen jeweils eigene begrenzte Verträge und Tests; vorhandene Freigabegates bleiben bestehen.

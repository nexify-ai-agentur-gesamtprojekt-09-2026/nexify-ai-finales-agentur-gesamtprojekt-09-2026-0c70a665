# Unabhängige Prüfung der Kapazitätsplanung

Stand: 2026-10-26T15:25:50.911999+00:00. Geprüft wurde der lokale Offlineplaner mit seiner Policy, Architekturentscheidung 0020 und den gezielten Tests. Keine Plannerquelle wurde durch diese Prüfung geändert. Es wurden keine Lasttests, Remotezugriffe, Modellaufrufe, Prozesssteuerungen oder bezahlten Aktionen ausgeführt.

## Ergebnis

Im nachgeprüften Abschlussstand sind die zwei reproduzierbaren Reviewbefunde behoben. Für den ausdrücklich begrenzten Offline-Auditscope bleiben keine offenen blockierenden Befunde. Das Ergebnis ist keine Platzierungs-, Produktions-, Finanzierungs- oder Lastfreigabe.

### CAP-01 · P2 · geschlossen: untere gemessene Concurrency wurde ignoriert

Im Ausgangsstand führte das unveränderte synthetische Testprofil mit `concurrency_min=10` und berechneter Plan-Concurrency `4` zu `planning_envelope_fits_measured_range` ohne Befund. Nur die Obergrenze wurde geprüft. Damit konnte eine Rechnung außerhalb des deklarierten Messbereichs als passend erscheinen.

Der Owner prüft jetzt vollständig `concurrency_min <= planning_inflight <= concurrency_max`. Die unabhängige Wiederholung des ursprünglichen Gegenbeispiels liefert `not_ready_for_placement` und `outside_measured_concurrency_range`. Die Regressionstests decken außerdem Null-RPS ohne gemessene Idleabdeckung sowie die exakt passende Untergrenze ab. Residenter RAM verschwindet bei Null-RPS nicht.

### CAP-02 · P2 · geschlossen: bekannte Kostenteilsumme wurde als Gesamtobergrenze bezeichnet

Zwei EUR-LLM-Workloads mit je zehn RPS lieferten im Ausgangsstand `external_cost_upper_by_currency.EUR=4320`, obwohl beim zweiten Workload der Outputtarif unbekannt war. Die globale Readiness war bereits korrekt gesperrt; der konkrete Zahlenwert war dennoch nur eine bekannte Teilsumme und keine obere Grenze aller Kosten.

Die unabhängige Wiederholung nach dem Ownerfix liefert `external_cost_known_subtotal_by_currency.EUR=4320`, `external_cost_upper_by_currency.EUR=null` und `external_cost_estimate_complete=false`. Unbekannte Währungen werden zusätzlich kenntlich gemacht und ergeben keine scheinbar vollständige Währungsobergrenze. Es werden keine Wechselkurse erfunden oder unterschiedliche Währungen addiert.

## Nachweise und Einheiten

Der abschließende gezielte Lauf `python3 -m unittest discover -s tests -p test_capacity_planner.py -q` bestand mit **14 Tests**. Zusätzlich wurden die beiden Gegenbeispiele und folgende Dimensionen unabhängig über die reine Planfunktion nachgerechnet:

- CPU: zehn Requests/Sekunde × 0,1 CPU-Sekunden/Request = ein zusätzlicher CPU-Kern.
- RAM: zehn Millionen residente Bytes + vier geplante gleichzeitig laufende Requests × eine Million Bytes = 14 Millionen Bytes.
- Storage: `(100 Millionen residente Bytes + 10 RPS × 100 Bytes × 3600 Sekunden Retention) × zwei Kopien` = 207,2 Millionen Bytes. Der Horizont wird auf die Retention begrenzt; der resident angegebene Bestand bleibt erhalten.
- IOPS: zehn RPS × zwei Operationen/Request = 20 Operationen/Sekunde. Netzwerk: zehn RPS × 2000 Bytes/Request = 20.000 Bytes/Sekunde.
- Alle zugewiesenen Workloads werden vor dem Vergleich pro Host addiert. Baseline und 25-Prozent-Planungsreserve werden getrennt abgezogen. Die Reserve ist keine nachgewiesene Failoverkapazität.
- Externe LLM-Kosten bleiben bedingte Schätzungen anhand expliziter Token-/Requestbounds und Tarife. Vendor-Modellgewichte werden nicht dem lokalen Host-RAM zugeschlagen; lokaler Proxy-/Streamspeicher gehört weiterhin ins Messprofil. Keine Zahl erteilt eine Ausgabenfreigabe.

Fehlende, veraltete, zukünftige oder als Annahme bezeichnete Messungen, unbekannte Bedarfe, RPS-/Concurrency-Extrapolationen, überschrittene Ressourcen und Scope-/Abhängigkeitsfehler verhindern Bereitschaft. Ein fehlendes Workloadprofil wird im finalen Stand nicht als zusätzlicher Nullverbrauch ausgewiesen. Die deklarierte Wahrheit von Messbelegen wird ausdrücklich nicht unabhängig durch diesen Planer attestiert.

## Eingabepfade und Betriebsscope

Die Dateilesung verwendet feste sichere FD-Schritte entlang des ausdrücklich übergebenen JSON-Pfads, `O_NOFOLLOW`, `O_NONBLOCK`, regulären Dateityp, Linkanzahl, Größenobergrenze und Stat-Abgleich. Symlinks, Hardlinks und FIFO wurden im gezielten Testmodul abgewiesen. JSON-Schlüsselduplikate, nicht endliche Zahlen, negative Werte und Booleanzahlen werden abgewiesen. Belegreferenzen werden nicht als Dateipfade, Befehle oder Netzwerkziele ausgeführt. Secretmuster sind eine zusätzliche Schutzschicht, kein vollständiger DLP-Nachweis; autorisierte Messprofile dürfen keine Zugangsdaten enthalten.

`placement_approved`, `existing_workloads_modified` und `measurement_truth_independently_verified` bleiben false. Es gibt im geprüften Tool keine Prozesssteuerung, Deploymentfunktion, Lastgenerierung, Modellwahl oder Provideranmeldung.

Die separate vorhandene Ressourcenbeobachtung beschreibt ausdrücklich den **Codex-Cloud-Workspacecontainer**, nicht Hostinger oder einen produktiven VPS: beobachtetes CPU-Quota vier Kerne und Speicherlimit 32 GiB, ein kurzer lokaler Mittelwert, keine produktive Peakmessung. Die drei gezielten `test_resource_probe.py`-Tests bestanden ebenfalls; die eigentliche Probe wurde durch dieses Review nicht erneut ausgeführt. `config/capacity-inventory.json` enthält weiterhin keine verifizierten Produktionshosts oder Workloadprofile. Das bedeutet fehlende Verifikation und beweist keinen leeren Remote-Serverbestand.

## Gebundener Abschlussstand

| Quelle | SHA-256 |
| --- | --- |
| `config/capacity-policy.json` | `b2624c739f7d3f52200d080eca6572fe54612244b3af7ce08270fb6a4ca5a836` |
| `tools/capacity_planner.py` | `77c6a7a8469a6ce025e7c18cf377d165deb801fecd9d3b80c37caa8d7ea10eb8` |
| `tests/test_capacity_planner.py` | `660b6271ba509e2fa570b5e903457e5de8802f0f50307466f2b48dc7fa85773d` |
| `docs/architecture/0020-capacity-and-cost-planning.md` | `5c50545f3b32353ede8c247d8037ea812c7f77131f2afda2c4a0743322e2b23d` |

# 0020 — Ressourcen und Kosten vorausschauend planen

Stand: 2026-10-26. Implementiert ist ein deterministischer Offlineplaner: `tools/capacity_planner.py`, `config/capacity-policy.json`, `tests/test_capacity_planner.py`. Er beendet keine Prozesse, verändert keine laufenden Workloads, erzeugt keine Last und verteilt keine Dienste. Ergebnisse sind Audit-/Shadowempfehlungen; auch ein passendes Rechenmodell erteilt keine Deployment-, Finanzierungs- oder Betriebsfreigabe. Die vier gemeldeten Remote-Server sind nicht verifiziert und werden hier nicht mit erfundenen Werten vorbelegt.

## Messung und Annahme bleiben getrennt

Der Planer nimmt Messprofile entgegen; er misst selbst keine Hosts und kontaktiert keine Endpunkte. `measurement_truth_independently_verified` bleibt deshalb `false`. Hash und Referenz bezeichnen einen vom Aufrufer bereitgestellten Messbeleg; sie sind keine digitale Attestation oder automatische Prüfung der tatsächlichen Messwerte. Annahmen, fehlende oder veraltete Messungen erzeugen `not_ready_for_placement`, niemals einen Nullverbrauch als Ersatz für Unwissen. Die Standardeinstellung akzeptiert höchstens 30 Tage alte Belege; die Frischeanforderung muss zum tatsächlichen Änderungsrisiko passen.

Hostkapazität muss die effektive Einschränkung wiedergeben. In Containern sind insbesondere `cpu.max`, `memory.max`, Parent-cgroup-Limits und weitere wirkliche Kontingente zu berücksichtigen; physische Hostgesamtwerte sind kein verfügbarer Containerfreiraum. CPU-Throttling, Druck, Storage-/IOPS- und Netzwerkgrenzen gehören zum Messbeleg. Limits sind kein Nachweis von freiem Platz: zusätzlich ist eine getrennte Baseline der gleichzeitig vorhandenen Last erforderlich. Vercel-Autoscalingobergrenzen sind keine gemessene Appkapazität.

Workloadprofile gelten nur für ihren konkreten Codehash, Host, ihre Eingabeklasse, den Cachezustand, Messzeitraum, gemessenen Lastbereich und die Concurrency. Ein lokaler Befund wird nicht auf unbekannte VPS übertragen. Der Planer verlangt diese Metadaten und markiert Szenarien außerhalb des gemessenen RPS- oder Concurrencybereichs als nicht bereit. Sowohl die untere als auch die obere Concurrencygrenze muss aus Messungen stammen; ein Szenario muss einschließlich beider Grenzwerte darin liegen. Auch RPS 0 setzt einen ausdrücklich vermessenen Idlebereich mit Concurrencyuntergrenze 0 voraus, weil residenter Speicher und Persistenz weiterhin geplant werden. Eine niedrigere Last wird nicht stillschweigend als vermessen angenommen. Little's Law liefert ausschließlich den Mittelwert, keinen p95-/p99-Wert und keine Garantie einer Spitzenlast.

Die Richtlinie reserviert zusätzlich 25 Prozent jeder Hostressource. Dieser technische Planungsparameter ist eine Annahme, kein gemessener Redundanznachweis. Ein vollständiger Hostausfall, N+1-Failover, Replikationslatenz und Disaster Recovery brauchen eigene Mess-/Ausfallszenarien und können durch diese Reserve nicht als bestanden erklärt werden.

## JSON-Eingangsvertrag, Version 1

Wurzel ausschließlich: `schema_version: 1`, `hosts`, `workloads`, `scenarios`. Obergrenzen: 256 KiB, 32 Hosts, 128 Workloads und 16 Szenarien. Namen und Scopes sind begrenzte Kennungen; Kundenscope Affilinet ist ausgeschlossen. Unbekannte Felder, Einheiten, doppelte JSON-Schlüssel, negative Werte, Booleanzahlen und nicht endliche Zahlen werden abgelehnt. Fehlende Messdaten in einem vorhandenen Messprofil verhindern Bereitschaft. Die Datei wird ohne Symlink-/Hardlink-/FIFO-Zugriff begrenzt gelesen. Keine Secrets oder Authdaten mitsenden.

Jeder Host enthält exakt:

| Feld | Inhalt |
| --- | --- |
| `id`, `project`, `tenant`, `residency` | Explizite Hostidentität und zulässiger Betriebsscope. |
| `affinities` | Liste ausdrücklich zulässiger Workloadklassen. |
| `capacity_basis` | `effective_cgroup_and_parent_limits` oder bestätigtes `physical_host_no_cgroup`. |
| `capacity` | Effektive Limits mit `cpu_cores`, `ram_bytes`, `disk_bytes`, `disk_iops`, `network_bytes_per_second`. |
| `baseline_peak` | Bereits belegte Ressourcen, mit denselben fünf Einheiten; Diskwert bedeutet bereits belegte Bytes. |
| `measurement` | `kind: measured`, `evidence_ref`, `sha256`, `measured_at` als ISO-8601 mit Zeitzone, `host_id`, `window_seconds`. |

Die Baseline muss alle vorhandenen Lasten enthalten, **ohne** die hier zusätzlich geplanten Workloads doppelt zu zählen. Bei Migration ist sie also host- und phasenbezogen neu zu bestimmen. Der Planer darf bestehenden Diensten keine Ressourcen entziehen.

Jeder Workload enthält exakt `id`, `host_id`, `project`, `tenant`, `residency`, `affinity`, `dependencies` als Workload-IDs, `measurement`, `profile`, `external_api`.

Sein Messbeleg enthält die sechs Hostmessfelder plus `workload_sha256`, `input_class`, `cache_state` (`cold`, `warm`, `mixed`), `concurrency_min`, `concurrency_max`. Das Profil enthält folgende Einheiten:

| Feld | Bedeutung |
| --- | --- |
| `known_rps_min`, `known_rps_max` | Tatsächlich vermessener Ankunftsratenbereich in Requests pro Sekunde. |
| `cpu_seconds_per_request` | Gemessene CPU-Sekunden je Request, einschließlich des relevanten lokalen Verarbeitungsanteils. |
| `mean_latency_seconds` | Gemessene mittlere Verweildauer für Little's Law, kein Perzentil. |
| `peak_inflight_per_rps` | Gemessene konservative Spitzen-Concurrency je RPS für diese Profilklasse. |
| `resident_ram_bytes` | Zusätzlicher dauerhafter Speicher dieses Workloads. |
| `ram_bytes_per_inflight_request` | Zusätzlicher Speicher je gleichzeitigem Request für die gemessene Eingabeklasse. |
| `disk_resident_bytes` | Zusätzlicher dauerhafter Datenbestand. |
| `disk_growth_bytes_per_request` | Persistenter Zuwachs je Request. |
| `retention_seconds`, `backup_copies` | Aufbewahrung des Zuwachses und zusätzliche gleich große Backupkopien; vorhandene Backups gehören bereits in die Baseline. |
| `iops_per_request` | Zusätzliche Storageoperationen je Request. |
| `network_bytes_per_request` | Gesamter relevanter Transfer je Request, einschließlich benötigter Protokoll-/Abhängigkeitsanteile. |

`external_api` ist `null` ohne externe Modellkosten oder ein Objekt mit `kind: vendor_llm`, ISO-Währung `currency`, `rate_evidence`, `input_tokens_per_request_upper`, `output_tokens_per_request_upper`, `input_per_million`, `output_per_million`, `request_fee_upper`, `approved_request_budget`. Der Tarifbeleg enthält genau `kind: documented`, `evidence_ref`, `sha256`, `measured_at`. Ein unbekannter Tarif, unbekannte Gebühren oder fehlende Bounds sind keine kostenlose Nutzung. Die Requestbudgetzahl ist nur ein deklarierter Recheneingang, keine hier ausgestellte Autorisierung. Alle ausgegebenen/Billing-Tokens einschließlich Reasoning, Toolloops, Retries und sonstiger Gebühren müssen in den Bounds und konservativen Raten berücksichtigt werden. Diese Funktion ruft kein Modell auf. Managed-Modell- und Fundinggates gelten unverändert; BYOK bleibt separat.

Jedes Szenario enthält exakt `id`, `horizon_seconds` (höchstens 366 Tage) und `rps_by_workload`, das **alle** Workload-IDs mit expliziten Raten enthält. Fehlende Abhängigkeiten, Zyklen, abweichende Projekt-/Tenant-/Residenzscopes und eine Abhängigkeit ohne geplanten Betrieb bei aktivem Aufrufer verhindern eine passende Empfehlung. Fächerung/Backgroundjobs müssen in den expliziten Lasten mitgerechnet werden; der Planer erfindet keine Verteilungsfaktoren. Ein unbekannter externer Dienst darf nicht als vorhandener interner Workload vorgetäuscht werden.

## Berechnung und Grenzen

Für jeden Workload und jedes Szenario gelten:

- CPU-Kerne = `RPS × CPU-Sekunden je Request`.
- Mittlere gleichzeitige Requests = `RPS × mittlere Latenz`; ausdrücklich kein p95.
- Plan-Concurrency = aufgerundetes Maximum aus diesem Mittelwert und `RPS × gemessenem Spitzenfaktor`. Ein Spitzenfaktor unterhalb des Mittelwertes erzeugt einen Befund.
- RAM = zusätzlicher residenter RAM + Plan-Concurrency × gemessenem RAM je gleichzeitigem Request.
- Zusätzlicher Diskbedarf = `(residenter Bestand + RPS × Zuwachs je Request × min(Zeithorizont, Retention)) × (1 + Backupkopien)`.
- IOPS und Netzwerk = RPS × jeweiligem Requestbedarf.
- Verfügbarer zusätzlicher Bedarf je Hostressource = effektive Kapazität × (1 − Reserve) − Baseline. Alle zugewiesenen Workloads werden vor dem Vergleich summiert.
- Externe Kosten je Währung = aufgerundete Requests im Zeithorizont × `(Inputbound × Inputrate/Million + Outputbound × Outputrate/Million + Requestgebührenbound)`.

Vendor-Modellgewichte werden nicht auf Host-RAM aufgeschlagen. Client-/Proxy-/Streamspeicher gehört dagegen in das gemessene lokale Workloadprofil. Dies ist keine Hostrechnung: Hostmieten, Steuern, vertragliche Rabatte, Datenübertragungsentgelte außerhalb der angegebenen Gebühren, variable Vendornebenkosten und Wechselkurse bleiben ohne Vertrag unbekannt. Der Output kennzeichnet Hostkosten deshalb ausdrücklich als unbekannt. Unterschiedliche Währungen werden nicht addiert. `external_cost_known_subtotal_by_currency` enthält ausschließlich die bekannten Teilsummen. Sobald für einen Workload ein Tarif oder erforderlicher Bound fehlt, wird die betreffende Währungsobergrenze in `external_cost_upper_by_currency` ausdrücklich `null` und `external_cost_estimate_complete` wird `false`. Ist sogar die Währung unbekannt, wird `external_cost_currency_unknown` wahr und keine bekannte Währung als vollständige Obergrenze ausgegeben. Kosten sind bedingte Schätzungen, keine Angebote oder Kundenpreise.

Die Speicher- und Diskgleichungen sind begrenzte Planungsmodelle. Temporäre Scratchdateien, ungleich große/georedundante Backups, reale Warteschlangen, Queueing-Kollaps, Lastverteilung, statistische Sicherheit, Service-SLOs und mandantenfähige Shared-Host-Isolation benötigen zusätzliche passende Profile/Modelle. Es gibt in dieser ersten Version keine automatische Bin-Packing-Optimierung; eine Zuordnung wird gegen die expliziten Scopes und Budgets geprüft.

## Verwendung und Abnahme

```sh
python tools/capacity_planner.py --input /tmp/autorisierte-messprofile.json
python -m unittest discover -s tests -p 'test_capacity_planner.py' -v
```

Exit 0 bedeutet ausgeführter Audit, auch bei `not_ready_for_placement`. Ungültige oder unsicher lesbare Eingaben liefern Exit 2. `planning_envelope_fits_measured_range` bedeutet ausschließlich passende Rechnung innerhalb der deklarierten aktuellen Messprofile. `placement_approved` und `existing_workloads_modified` bleiben immer `false`. Kein Ergebnis blockiert oder stoppt bestehende Arbeit.

Die vierzehn Tests verwenden ausdrücklich synthetische Werte und prüfen Formeln/Einheiten, Aggregation/Reserve, fehlende und veraltete Messungen, Szenarien außerhalb der Messgrenzen, Little's Law gegen Peak-Concurrency, Scopes/Abhängigkeiten, Grenzen für externe Kosten ohne Vendor-RAM, Zahlenvalidierung und sichere begrenzte Dateilesung. Vor einer tatsächlichen Erweiterung folgen autorisierte Messung, Profilversionierung, Shadowvergleich, beobachtete Abweichung, gegebenenfalls Canary und erst danach die bestehende per-Runtime-Cutoverfreigabe mit Rollback. Kein bezahlter Provideraufruf und kein Live-Lasttest gehören zu diesem Planer.

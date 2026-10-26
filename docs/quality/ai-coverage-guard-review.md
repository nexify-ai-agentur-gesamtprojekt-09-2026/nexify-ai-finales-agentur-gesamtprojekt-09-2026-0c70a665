# Unabhängiger Review des AI-Coverage-Guards

Stand: 2026-10-26T14:54:09.596599+00:00. Read-only-Prüfung durch den separaten Agenten `small_business_integration`; Implementierungsowner ist `deep_review`, Inventarowner `business_dependencies`. Keine Änderungen an Guard, Tests, Registry, Freigaben oder Laufzeitkonfiguration.

## Ergebnis und Geltungsbereich

Im geprüften Guard wurden keine materiellen Fehler festgestellt. Die inzwischen 20 zugehörigen Tests wurden unabhängig erneut ausgeführt und bestanden. Zusätzlich wurden acht unabhängige Prüfkonstellationen in einem separaten temporären Quellbaum ausgeführt. Das ist eine Prüfung der begrenzten Quellinventar-Driftschranke, keine Bestätigung sämtlicher AI-Egresspfade, tatsächlicher Modellaufrufe, Produktivfreigaben oder Laufzeit-Policywirkung.

Die echte Registry `config/ai-enforcement-coverage.json` fehlte beim ersten Review. Der echte CLI-Lauf blockierte entsprechend mit `source_inventory_unreadable_or_invalid`. Zu diesem Zeitpunkt waren Eintragsstatus und Hashes der entstehenden Registry sowie eine vollständige reale Kandidatenabdeckung ausdrücklich noch nicht unabhängig prüfbar. Dieser offene Teil wird nach dem Registry-Freeze gesondert ergänzt; ein grüner Fixturetest ersetzt ihn nicht.

## Quellprüfung

- Root- und Dateizugriffe verwenden Verzeichnisdeskriptoren und `O_NOFOLLOW`. Registry-Pfade können den Scan weder erweitern noch durch zusätzliche Ausschlüsse verkleinern. Absolute Pfade, Traversal, ausgeschlossene Verzeichnisse und bekannte sensible Dateinamen sind für registrierte Quellen unzulässig.
- Reguläre Quelldateien müssen genau einen Hardlink besitzen. FIFO und andere Spezialdateien werden ohne blockierendes Lesen abgewiesen. Vor-/Nachstat begrenzt Änderungen während des Lesens.
- Die Grenze beträgt 2 MiB pro Datei, 32 MiB über die Quelltexte, 10000 Quelldateien, 2000 Verzeichnisse und 20000 enumerierte Baumobjekte. Enumeration wird vor unbegrenztem Sortieren begrenzt. Die Registry unterliegt ebenfalls der Dateigrenze.
- Registrierung verlangt eindeutige IDs/Pfade, SHA-256, einen bekannten Status, passende `enforcement.state`, Checks/Gaps, Owner und nächsten Schritt. `source_enforced` braucht nichtleere Checks; `reviewed_false_positive` braucht eine ausdrückliche Nichtinferenzklassifikation. `runtime_deployment_verified` muss false sein.
- Neue lexikalisch erkannte, unregistrierte Kandidaten oder abweichende/missing registrierte Quellen blockieren den Scan. Ausgabe enthält Pfad/Marker/Zeile, keine Quelltexte oder Schlüsselwerte. Der Guard verändert keine Hashes selbst.
- Die Marker sind endlich und lexikalisch. Dynamische Endpunkte, Aliase, Wrapper und bewusst ausgeschlossene Bereiche sind damit nicht vollständig bewiesen. Der Code benennt diese Grenze und gibt `runtime_authorized=false`, `semantic_completeness_verified=false`, `automatic_hash_refresh=false` zurück. Der Status `inventory_review_current` bedeutet ausschließlich aktuelle inventarisierte Quellenprüfung; auch registrierte unbestätigte Legacy-Egresspfade bleiben offene Gaps.

## Unabhängige adversarielle Prüfungen

Alle Fixtures waren synthetisch und lagen ausschließlich in einem temporären Verzeichnis. Kein Netzwerk und keine Provider-/Secretdateien wurden verwendet.

| Fall | Beobachtung |
| --- | --- |
| Korrekt registrierte Fixture | Inventar aktuell, keine Runtimefreigabe |
| Überschrittene Gesamtbytegrenze | Blockiert |
| Überschrittene Dateianzahl | Blockiert |
| Verzeichnissymlink im eigenen Sourcebaum | Blockiert; Zielquelle nachweislich nicht gelesen |
| Symlink statt Registrydatei | Blockiert |
| Neue `generateText`-Quelle ohne Eintrag | Blockiert mit Kandidatenpfad; kein Quellinhalt ausgegeben |
| Registry behauptet `runtime_deployment_verified=true` | Blockiert |
| Falscher registrierter Quellhash | Drift blockiert |

Ausgeführt: `python3 -m unittest tests/test_ai_coverage.py` (20 Tests nach Audit-Ergänzung), separater Fixture-Probe `/tmp/review_ai_coverage_probes.py` und echter `python3 tools/check_ai_coverage.py` bei noch fehlender Registry. Der temporäre Probe ist ein lokaler Reviewnachweis, kein neues ausführbares Projektbestandteil.

## Geprüfter Quellsnapshot

| Datei | SHA-256 |
| --- | --- |
| `tools/check_ai_coverage.py` | `b984532600f26c4c1024db16009b6e023f062f5b0a688ce138c9b840c8a2e3e5` |
| `tests/test_ai_coverage.py` | `2ef4f0e8b7693c93d3e8fb0d1588912a2322f91453a9f09771706c570fa43365` |

## Ergänzender unabhängiger Review des Auditmodus

Die spätere `--audit`-Ergänzung wurde separat gelesen und mit allen nun 20 Tests sowie den acht zusätzlichen adversariellen Fixtures erneut geprüft. Audit verwendet dieselben begrenzten Leser und denselben strikten Beobachtungsbefund. Ein unverfügbares Inventar ergibt `audit_unavailable`, eine unvollständige Quellenprüfung `audit_partial`; `inventory_status` bleibt dabei `blocked`. Exitcode 0 bedeutet ausdrücklich nur ausgeführtes Audit. `enforcement_active=false` und `runtime_authorized=false` bleiben erhalten. Eine echte neue Kandidatenquelle oder Hashdrift wird weder verschwiegen noch automatisch umregistriert. Der strikte Modus bleibt als spätere separate Prüfschranke verfügbar, darf aber durch diese Ergänzung nicht neu vor vorhandene Kunden- oder CLI-Arbeit geschaltet werden.

Der aktuelle echte `--audit`-Lauf ergab bei weiterhin fehlender Registry korrekt `audit_unavailable`, Exitcode 0, `inventory_status=blocked`. Das ist kein bestandener Inventarreview. Der echte Registry-/Status-/Hashteil bleibt bis zum separaten Owner-Freeze offen.

| Audit-Quellsnapshot | SHA-256 |
| --- | --- |
| `tools/check_ai_coverage.py` | `1c79829ec912132d62fdad6f368f0c8fe900716bf1adff8faef2e5f35c165e8b` |
| `tests/test_ai_coverage.py` | `548fa7176a26b4cad24d369ee9519f2768ac258713aad132f07840d0ad893182` |

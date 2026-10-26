# Factory-Verträge aus den Referenzseiten

Diese Dateien sind der neu abgeleitete Zielvertrag. Sie stellen die historisch fehlende OpenAPI-Datei nicht wieder her und behaupten keine aktive gemeinsame Gateway-/SSO-Runtime.

| Datei | Zweck |
|---|---|
| [factory-api-auth.md](factory-api-auth.md) | Entscheidungen, Rollen, Mandanten, Auth-Lebenszyklus und Integrationsmatrix |
| [factory.openapi.json](factory.openapi.json) | OpenAPI 3.1: typisierte Zieloperationen mit Quellen, Seiten, Rechten und Implementierungsstatus |
| [prototype-pages.md](prototype-pages.md) | Lesbare Bestimmung aller 93 HTML-Dateien aus N1 und N2 |
| [prototype-pages.json](prototype-pages.json) | Vollständiger statischer Seitenkatalog, Hashes und beobachtete Signale getrennt von Ableitungen |
| [hero-media.md](hero-media.md) | Runway-/ElevenLabs-Auftrag und genaue Stimmzuordnung |
| [hero-media.json](hero-media.json) | Maschinenlesbare Medien-/Provider-/Identitätsbindungen |
| [hero-production-plan.json](hero-production-plan.json) | Drei noch nicht eingereichte Skript-/Szenenentwürfe; vorhandene Runway-Clips zuerst abgleichen |

## Prüfung

`make contract-check` prüft den gebündelten Vertrag, lokale Quellen, aktuelle HTML-Hashes, die Abdeckung der abgeleiteten Seitenfähigkeiten und negative Zugriffsproben. Die historische N2-Referenz wird bevorzugt aus `reference/handoff-n2` im selben Repository gelesen; ein abweichender Referenzpfad ist mit `--repo-n2 PATH` wählbar. Der Referenzbaum zählt dabei als eigener Quellenbestand statt doppelt als N1. Affilinet ist ein gesondertes pausiertes Kundenprojekt und wird weder benötigt noch vom Prüfer eingelesen. Er überträgt keine Daten und ruft keinen Provider auf.

Die Negativtests laufen zusätzlich mit dem normalen `make test` und benötigen nur einen Checkout und temporäre eigene Git-Fixtures. Sie prüfen unter anderem unerwartet öffentliche Operationen, CSRF, API-Schlüssel außerhalb der Inferenzgrenze, fehlende Policies, falsche Quellen, neue ausgelassene HTML-Dateien, Pfadflucht, verwaiste Referenzen und unzutreffende Abdeckungsbehauptungen. `.harness/arch-rules.json`, ARCH-005, erhält diese Fehlerkategorien als Gegenproben.

Zusätzliche formale OpenAPI-Prüfung mit isoliertem Werkzeug:

```sh
python3 -m venv /tmp/nexify-contract-env
/tmp/nexify-contract-env/bin/pip install -r requirements-contract.txt
/tmp/nexify-contract-env/bin/python -m openapi_spec_validator docs/contracts/factory.openapi.json
```

`requirements-contract.txt` pinnt ausschließlich das Prüfwerkzeug und dessen aufgelöste Abhängigkeiten; es ist keine zusätzliche Anwendungslaufzeit. Installation verwendet die normalen Proxy-/CA-Einstellungen der Umgebung, ohne TLS-Prüfungen abzuschalten. Eine gültige OpenAPI-Datei belegt Schema-Konsistenz, keine Auth-Implementierung oder vollständige fachliche Abnahme.

## Wiederverwendung

`python3 tools/catalog_factory_pages.py` erzeugt den Seitenkatalog erneut. Der Generator liest die gesamten HTML-Dateien und erfasst statische Signale; er führt die Prototypen oder ihre Skripte nicht aus. Die getrackten Referenzen bleiben unverändert. Dokumentationshashes im Katalog sind historische Lesebelege, damit Fortschrittsnotizen keine zirkuläre Katalogregeneration erzwingen. Seitenhashes werden gegen die aktuellen Dateien geprüft.

Bei neuer Seite oder geändertem Referenzverhalten: Katalog erneuern, fachliche Ableitung prüfen, Operationen und Rechte aktualisieren, Negativproben und vollständige Quellenprüfung ausführen. Ein Runtimeadapter muss anschließend dieselben Grenzen in echter HTTP-/DB-Ausführung nachweisen. F-006 bezeichnet ausschließlich diesen überprüfbaren Vertragsschnitt.

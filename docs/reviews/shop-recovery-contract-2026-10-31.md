# TEILEKLAR: Recovery- und Preisfreigabe-Vertrag

Quellenstand: `b06044526a9300663c87ae7e23796267f71afe00`. Dieses Paket ist ein isolierter Review-Beleg; es ändert keine Shopimplementierung und gibt keine Produktionsfreigabe.

## Beobachtung und Sollvertrag

1. Ohne vorhandenes Shop-Einstellungsdokument liefert `pricing.settings` einen 30-Prozent-Aufschlag und null Versandkosten. Ein Verkaufspreis kann damit ohne nachgewiesene Freigabe berechnet werden. Soll: Fehlende freigegebene Preis- oder Versandkonfiguration darf keine verwendbaren Werte für Katalog und Checkout liefern; sie muss geschlossen bleiben, bis die tatsächliche Freigabe vorliegt.
2. `sync_payment` markiert eine Bestellung bezahlt, bevor Warenkorb und Mail-Ereignisse bearbeitet werden. Fällt die Warenkorboperation danach aus, beendet ein erneuter Aufruf wegen des bezahlten Status die Verarbeitung, ohne die Mail einzureihen. Soll: Ein bezahlter Übergang muss auch nach einer Unterbrechung die Mailabsicht zuverlässig genau einmal nachholen; die Versandzustellung selbst ist damit nicht bewiesen.

## Reproduktion

Im Repositorywurzelverzeichnis:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'test_shop_recovery_contract_20261031.py' -v
```

Auf dem genannten Stand schlagen beide Tests erwartungsgemäß als echte Fehler fehl. Sie verwenden nur Python-Standardbibliothek und In-Memory-Fakes. Sie laden die jeweils geprüfte asynchrone Funktion aus dem Originalquelltext per AST, ohne App-Imports, Datenbank, Mail- oder Payment-Provider, Secrets oder Schreibzugriffe. Der erste Test prüft den fehlenden Konfigurationsdatensatz, der zweite injiziert einen Fehler unmittelbar nach dem Bezahlstatus und wiederholt die Synchronisierung.

## Einschränkungen und Übernahme

Die Tests beweisen die beschriebenen Funktionspfade, aber keine End-to-End-Integration, Nebenläufigkeit, Mongo-Transaktionen, Provider-Idempotenz oder tatsächliche Zustellung. Nach einer Backendkorrektur durch den zuständigen Writer müssen sie grün laufen und durch isolierte Integrationstests für Transaktionsgrenzen, Outbox-Wiederaufnahme und explizite Preisfreigabe ergänzt werden. Keine realen Kundendaten, Preise oder Providerzugänge für diese Reproduktion verwenden.

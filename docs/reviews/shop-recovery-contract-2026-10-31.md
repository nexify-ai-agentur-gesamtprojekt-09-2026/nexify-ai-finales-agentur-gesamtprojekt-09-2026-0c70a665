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

## Isolierter Mailer-Fix auf der verfügbaren Basis

Der lokale Fix basiert auf `b060445` und dem Review-Commit `abcd4a396ced738aa50f353b85baacccf1daa372`. Eine Integration mit dem gemeldeten, nicht erreichbaren Emergent-Stand ist nicht nachgewiesen. `checkout_api.py` und Preislogik wurden nicht geändert.

Der Mailer beansprucht zunächst atomar `wird_vorbereitet` mit einer Claim-ID. Eine nach fünf Minuten veraltete Vorbereitung wird wieder auf `wartend` gesetzt; nur der aktuelle Claim-Inhaber kann danach atomar zu `wird_gesendet` wechseln. Ein abgelaufener Sende-Claim, auch ein alter Claim ohne Zeitstempel, wird zu `abgleich_erforderlich`: Es ist unklar, ob der Provider schon angenommen hat. Dasselbe gilt bei Transportfehlern, 5xx sowie 408/409/429. Diese Fälle nicht automatisch erneut senden; Providerbeleg und Outbox von einem berechtigten Menschen abgleichen, bevor eine kontrollierte Wiederaufnahme erfolgt. Auch alte `fehlgeschlagen`-Einträge ohne explizites neues `retry_safe`-Merkmal bleiben zur Prüfung liegen. Bekannte Konfigurationsfehler und eindeutige andere 4xx-Ablehnungen sind begrenzt wiederholbar.

Nach Providererfolg und vor erfolgreicher Speicherung kann ein Prozessabbruch oder Datenbankfehler den Erfolg verdecken. Der später abgelaufene Claim fordert ebenfalls den manuellen Abgleich; ein blindes Retry könnte eine doppelte Mail erzeugen. Der Provider-Idempotenzschlüssel bleibt erhalten, aber seine tatsächliche Gültigkeitsdauer und eine Ende-zu-Ende-Exactly-once-Zustellung sind hier nicht belegt. Dieser Fix kann keine fehlende Outbox-Absicht nach einem Checkout-Abbruch erzeugen und integriert sich nicht automatisch mit einem abweichenden Checkoutstand.

Prüfung mit ausschließlich In-Memory-Fakes:

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=tests python3 -m unittest test_shop_recovery_contract_20261031.MailerLeaseContract -v
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'test_shop_recovery_contract_20261031.py' -v
```

Ergebnis auf dieser Basis: sieben Mailer-Tests bestanden; der Gesamtlauf enthält zusätzlich die zwei oben beschriebenen weiterhin fehlgeschlagenen Preis- und Checkout-Tests. Die Fakes beweisen keine MongoDB-Atomizität im Betrieb, keinen Providervertrag und keine tatsächliche Zustellung. Vor Übernahme sind diese Grenzen mit isolierter echter MongoDB und Provider-Mocks sowie dem tatsächlich aktuellen Quellstand zu prüfen.

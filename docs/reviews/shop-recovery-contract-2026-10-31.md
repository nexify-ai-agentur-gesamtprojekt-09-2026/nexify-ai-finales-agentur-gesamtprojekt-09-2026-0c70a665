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

Der Mailer beansprucht zunächst atomar `wird_vorbereitet` mit einer Claim-ID. Eine nach fünf Minuten veraltete Vorbereitung wird wieder auf `wartend` gesetzt; nur der aktuelle Claim-Inhaber kann danach atomar zu `wird_gesendet` wechseln. Ein abgelaufener Sende-Claim wird zu `abgleich_erforderlich`: Es ist unklar, ob der Provider schon angenommen hat. Fehlende, null, BSON-Datetime- oder nicht kanonische UTC-String-Zeitstempel beider Claim-Zustände gehen vorsorglich ebenfalls in den Abgleich. Transportfehler und sämtliche nicht ausdrücklich als Erfolg behandelten HTTP-Status sind mangels nachgewiesenem Providervertrag nicht automatisch wiederholbar. Auch alte `fehlgeschlagen`-Einträge ohne explizites neues `retry_safe`-Merkmal bleiben zur Prüfung liegen. Ein lokaler Konfigurationsfehler vor Beginn des Provideraufrufs ist begrenzt wiederholbar.

Nach Providererfolg und vor erfolgreicher Speicherung kann ein Prozessabbruch oder Datenbankfehler den Erfolg verdecken. Ein Worker kann außerdem nach der Sendemarkierung länger als die Lease pausieren und seinen Provideraufruf erst nach dem Wechsel in den Abgleichzustand fortsetzen. Vor manuellem Retry muss die alte Workerinstanz beendet oder anderweitig wirksam ausgeschlossen und der Providerbeleg geprüft sein. Der Provider-Idempotenzschlüssel bleibt erhalten, aber seine tatsächliche Gültigkeitsdauer und eine Ende-zu-Ende-Exactly-once-Zustellung sind hier nicht belegt. Dieser Fix kann keine fehlende Outbox-Absicht nach einem Checkout-Abbruch erzeugen und integriert sich nicht automatisch mit einem abweichenden Checkoutstand.

Prüfung mit ausschließlich In-Memory-Fakes:

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=tests python3 -m unittest test_shop_recovery_contract_20261031.MailerLeaseContract -v
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'test_shop_recovery_contract_20261031.py' -v
```

Ergebnis auf dieser Basis: neun Mailer-Tests bestanden; der Gesamtlauf enthält zusätzlich die zwei oben beschriebenen weiterhin fehlgeschlagenen Preis- und Checkout-Tests. Die Fakes simulieren das voreingestellte `ReturnDocument.BEFORE`-Verhalten; MongoDB-Atomizität im Betrieb, BSON-Typfilter, Providervertrag und tatsächliche Zustellung sind damit nicht bewiesen. Vor Übernahme sind diese Grenzen mit isolierter echter MongoDB und Provider-Mocks sowie dem tatsächlich aktuellen Quellstand zu prüfen.

## Übernahme auf den verifizierten Main-Stand

Basis ist nun `66185f1a184d8f0a65c039850cca936d8d5b7177`; `86ed4b28c5230ee0bbb050a212b9f511db473545` ist dessen Vorfahr. Die vorherigen beiden roten Befunde beschreiben den historischen Stand `b060445`, nicht diesen neuen Testlauf. Die Mailer-Commits wurden nachvollziehbar übernommen.

Beim atomaren Übergang zu `bezahlt` wird `paid_mail_recovery_pending` gesetzt. Ein Callback oder der periodische Mailer-Loop kann fehlende Outbox-Absichten erneut erzeugen. Die beiden vorhandenen eindeutigen Ereignisschlüssel verhindern die doppelte Anlage; erst nach bestätigter Anlage beider Absichten wird die Markierung entfernt. Fehlende Mailkonfiguration oder eine Unterbrechung lassen sie stehen. Historische bezahlte Bestellungen ohne diese neue Markierung werden nicht automatisch erneut angeschrieben und bedürfen gegebenenfalls eines gesonderten Abgleichs. Outbox-Anlage bedeutet keine bestätigte Zustellung. Der Warenkorb-Abbruch wird in diesem Paket nicht nachträglich repariert.

Eine bereits angelegte Bestellung mit demselben Owner und Idempotenzschlüssel wird vor der Freigabeprüfung wiedergegeben; für eine neue Bestellung bleibt die Preissperre bestehen. Die neue vorhandene Preisprüfung ist erhalten; ein Test bestätigt nur `price_released == false` bei leerer Konfiguration und die Reihenfolge im Checkout. Ob die Preisfreigabe fachlich auch alle Versand- und Steuerwerte abdeckt, ist damit nicht belegt.

Der vollständige lokale Recovery-Testlauf verwendet ausschließlich Fakes und die Standardbibliothek. Er prüft Zustandswechsel, teilweise Outbox-Anlage, wiederholte und konkurrierende Wiederaufnahme, nicht konfigurierte Empfänger, Preissperre und den Mailer-Lease. Er ersetzt weder echte MongoDB-Transaktionstests noch Providervertrags- oder End-to-End-Abnahme. Der Lauf und seine aktuelle Anzahl werden im Commitbericht angegeben.

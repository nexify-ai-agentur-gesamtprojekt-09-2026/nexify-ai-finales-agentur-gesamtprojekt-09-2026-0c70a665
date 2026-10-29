# Bindung gekaufter Trial-Guthaben

`ss_topup` bleibt die unveränderte Kaufquelle für Händler, Route und Bedingungen.
Managed-Finanzierungswahl, neue Reservierung und Ausführungsclaim vergleichen
sie mit der aktuellen geprüften Managed-Bindung. Änderungen sperren nur neue
Verwendung; sie verschieben vorhandenes Guthaben nicht auf einen neuen Vertrag.

Neue Reservierungen speichern `managed_snapshot` mit Kauf-ID, Account, Tenant,
Händler, Route und Bedingungen. Der Claim vergleicht den Snapshot erneut.
Die additive Migration belässt ältere Reservierungen ohne Snapshot bei NULL;
sie dürfen nicht dispatcht, aber ungenutzt storniert werden. Bereits dispatchte
oder ungeklärte Ausführungen bleiben gegen ihre gespeicherten Daten abrechenbar.
Schema-Prüfung und additive ALTERs laufen nach executescript unter derselben
BEGIN-IMMEDIATE-Schreibtransaktion; parallele Legacy-Starts werden serialisiert.
Kein automatischer Rückbau der Datenbank und kein nachträglich erfundener Consent.

Prüfung: `python3 -m unittest discover -s tests -p test_selfservice_domain.py -q`.
16 isolierte Tests einschließlich Neustart, drei Konfigurationsänderungen,
Alt-Schema-Migration, Storno, Tenantgrenzen und Reconciliation. Alle Attestationen
sind Testfixtures, keine Liveadapter oder echten Zahlungen.

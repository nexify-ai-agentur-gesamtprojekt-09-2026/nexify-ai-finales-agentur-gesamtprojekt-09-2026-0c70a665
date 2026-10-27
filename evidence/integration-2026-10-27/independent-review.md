# Unabhängige lokale Codeprüfung · 27.10.2026

Reviewer: separater Unteragent /root/independent_pr35_review.
Modus: read-only, keine Dateien geändert, keine externen Aktionen.
Gegenstand: Commits 6064c70 und 72cdff1 plus nachgereichte additive
Schema-Migrationskorrektur. Die folgenden Angaben fassen den eigenständigen
Reviewerbericht zusammen; Hashes binden den geprüften lokalen Endstand.

Finding P2: Schema-Prüfung und ALTER für managed_snapshot lagen außerhalb
einer Schreibtransaktion. Kontrollierte zwei parallele Legacy-Starts erzeugten
OperationalError: duplicate column name: managed_snapshot. Keine Datenkorruption
beobachtet. Implementierer reproduzierte den Fehler zusätzlich mit neuem Test.

Korrektur: BEGIN IMMEDIATE nach executescript, vor sämtlichen PRAGMA/ALTERs.
Finding nach eigenständiger Nachprüfung geschlossen. Reviewer prüfte:
- 16 Selfservice- und 10 SEO-Tests grün.
- Kontrolliertes Zwei-Start-Rennen und acht parallele Legacy-Starts bestanden.
- Legacy-Snapshot bleibt NULL; Reservierung und Wallet bleiben unverändert.
- Replay nach Routewechsel ermöglicht keine Ausführung; Storno gibt Hold frei
  und erhält Guthaben.
- SEO-Aktualitätsentscheidung und Schreiboperationen liegen in einer Transaktion.
Keine weitere konkrete Umgehung in diesem geprüften Scope gefunden.

Nicht geprüft: Governance-Vertragsvalidator, PR36, echte Provider/Zahlungen,
Produktions-Restore, Livebetrieb. Keine universelle Fehlerfreiheit oder
Produktionsabnahme. Sämtliche connected/live_tested/accepted-Stufen bleiben false.

Das ursprüngliche Library-Paket libfile_ec50538d15c88191b9c4d74294198be1 enthält
noch den Stand vor dieser zusätzlichen Migrationskorrektur. Wegen der neuen
Weisung 'kein weiterer externer Schreibzugriff' wurde es nicht ersetzt.
Für die Weiterarbeit ist das neue lokale reviewed-Paket maßgeblich.

Geprüfter Dateiinhalt (SHA-256):
- apps/selfservice/domain.py: 0023a14fc8f142b7be728c0797dee8d0f08f767c1e4a2563d4423eee6a78e485
- tests/test_selfservice_domain.py: dcb36a0ae5eb55bfcbd0024c16bb02c740d0365b07235f7e52a74402920b1dbc
- tools/seo_catalog.py: b0f6904d3db1174ffb541e0217e1e99485654cc27edf64332a8f6fdc6d72f5ca
- tests/test_seo_catalog.py: ad57bb4d231c7583831df85df607e354283b33a05b3faf1999f8aa48143b3d97

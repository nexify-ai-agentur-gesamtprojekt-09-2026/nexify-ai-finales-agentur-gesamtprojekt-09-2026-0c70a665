# Lokale Korrektur des Suite-Trialbeginns

Basis245e96e9f468474e41fe4a3a1dc2b5785c2fc3e4. Die vorhandene Policy bleibt
unverändert: verifizierter authentifizierter Kunde, aktivierter eigener Workspace
und ausdrücklicher Start erzeugen einmalig86400Sekunden Suiteberechtigung.
Funding ist dafür keine Voraussetzung. Kein Gratis-Modellguthaben entsteht.

Nur SelfService.start_trial wurde geändert: Fundingprüfung entfernt; vorhandene
Aktivierungsprüfung vor die idempotente Rückgabe gesetzt, damit ein persistiert
inaktiver Workspace auch beim Replay keinen Start bestätigt. Es existiert keine
öffentliche Deaktivierungs-API; der negative Test stellt activated_at=NULL nur in
einer synthetischen lokalen Datenbank her. Keine neue Lifecycle-/Authfunktion
wird behauptet. Ein bereits gespeichertes Trialfenster wird nicht gelöscht oder
verlängert; nach Reaktivierung bleibt es unverändert.

_funding, reserve und claim_execution sind gegenüber der Basis quellenidentisch.
Reservierung und Ausführungsfreigabe verlangen weiterhin gültiges Funding und
aktuelle Berechtigungen. BYOK-Widerruf, veralteter Key, fehlender bestätigter
Managed-Zahlungseingang und fehlende Reservierung blockieren. Keine echte
Identitäts-, Vault-, Payment- oder Modellprovideraktion wurde ausgeführt.

## Regressionen

- Unfundierter Suitebeginn ohne Walletgutschrift; keine Modellreservierung.
- Acht konkurrierende Starts, Wiederöffnung, unveränderter Serverzeitbeginn.
- Exakt86400Sekunden; Ablaufgrenze und späteres Funding setzen nicht zurück.
- Fehlende Aktivierung/deaktivierter persistierter Zustand, fremder Tenant,
  unverifizierte Clientclaims, fremde Attestierungsautorität und Zukunftsnachweis.
- Späteres gültiges BYOK erlaubt lokale Reservierung/Dispatch; Widerruf sperrt
  weitere Reservierung und Dispatch. Dispatch ist kein echter Modellaufruf.
- Managed-Funding wird erst nach synthetischem autoritativem Settlement gewählt;
  keine Gutschrift durch bloßen Suitebeginn oder Checkout-Intent.
- Bestehende Merchant-/Reservierungssnapshot-, Ledger-, Legacy-Start- und
  Restoretests bleiben Teil der Gesamtkette.

Reproduktion: python3 -m unittest discover -s tests -p test_suite_trial.py -v
und python3 -m unittest discover -s tests -p 'test_selfservice*.py' -v;
anschließend make check/test/e2e/check-arch/clean-check. Ein separater Reviewer
prüft Quellstand, Gegenproben und finalen Commit; Belege liegen unter
 evidence/one-app-2026-10-27/suite-trial-*.

MASTER-12-TRIAL-01 wird nur für diese lokale Regel fortgeschrieben. Reale Adapter,
Identity/Tenantdurchsetzung an tatsächlich angeschlossenen APIs und produktive
Release-/Restoreabnahme bleiben offen. Öffentliche UI-Ansehbarkeit ist weiterhin
kein eigener Nachweis einer authentifizierten Kunden-Suiteberechtigung.

Rückweg: neuen isolierten Checkout der Basis245e96e verwenden bzw den begrenzten
Patch dort prüfen. Keine Datenmigration: Datenbankschema unverändert. Eine spätere
Rückkehr zu älterem Verhalten darf bereits korrekt gewährte Trialfenster nicht
löschen oder kostenloses Modellguthaben erzeugen. Kein externer Cutover erfolgte.

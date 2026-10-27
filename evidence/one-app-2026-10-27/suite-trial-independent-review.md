# Unabhängiges Review: Suite-Trial ohne Funding

Basis: **245e96e9f468474e41fe4a3a1dc2b5785c2fc3e4**. Geprüft wurde der folgende lokale Arbeitsbaum; finaler Commit folgt gesondert. Kein Commit oder Appcodeedit durch den Reviewer.

## Ergebnis

Kein bestätigter blockierender Befund im begrenzten Fix. Suitebeginn entspricht nun den bereits dokumentierten Voraussetzungen. Die fachliche Fundingprüfung bleibt vor Modellreservierung und vor Dispatch erhalten. Lokale Übergabe nach finalen Gates und Hashabgleich vertretbar; keine reale Provider-/Produktionsabnahme.

## Quellen und Semantik

Betriebsmodell§5.1, insbesondere Zeile78, erlaubt Suitezeit vor Fundingwahl; policy.starts_when fordert verifizierte E-Mail, aktivierten eigenen Workspace und authentifizierten Start. Der Fix entfernt ausschließlich die zusätzliche Fundingvoraussetzung aus start_trial. BEGIN IMMEDIATE, Eigentümer-/TrustedBoundaryprüfung, einmaliges accountbezogenes Zeitfenster und atomare Speicherung bleiben erhalten. Aktivierungsprüfung liegt nun auch vor Replay: eine persistiert inaktive Workspacezeile kann den Startaufruf nicht wiederholen. Dies ist keine neue Deaktivierungs-API und keine Aussage über alle sonstigen Pfade bei manuell veränderten DB-Zuständen.

AST-Gegenvergleich sämtlicher SelfService-Methoden gegen Basis: nur start_trial verändert. Insbesondere _funding, reserve und claim_execution unverändert. Policydatei unverändert. Suiteberechtigung gibt kein Guthaben, keinen Hold und keinen Provideraufruf frei.

## Unabhängig ausgeführte Prüfungen

- unittest discover -s tests -p test_selfservice*.py:18 bestanden.
- unittest discover -s tests -p test_suite_trial.py:7 bestanden.
- Eigene zusätzliche Gegenprobe: unfundierte Suite starten, danach Reservierungen mit maximum0,1,100000 ablehnen; vollständiger SQLite-Dump bleibt nach jeder Gesamtreihe gleich, Ledger-/Reservierungszeilen jeweils0.
- Quellprüfung der sieben neuen Tests: acht parallele Verbindungen mit festem einmaligem Fenster und Wiederöffnung; exakte86400-Sekunden-Grenze; Replay nach Fundingänderung; fremde/ungeprüfte/future Identität und fremder Tenant; inaktiv/deaktiviert; stale/revoked BYOK; gültige BYOK-Dispatchtransition; Managed-Auswahl erst nach synthetischer bestätigter Zahlung.
- Bestehende Bindungs-/Legacy-/Reconciliation-Tests sind in den18 Selfservicefällen enthalten. Echte Provider oder Kundendaten wurden nicht verwendet.

## Grenzen

Diese Tests verwenden synthetische TrustedBoundary-Attestationen, lokaleSQLite und Threadkonkurrenz mit getrennten Verbindungen. Sie beweisen keine reale E-Mail-/Issuer-/Sessionprüfung, keinen externen Zahlungseingang, keine tatsächliche Modellantwort, keinen Mehrhost-/verteilten Fencingvertrag und keine Produktionsmigration. Direkte DB-NULL-Simulation ist keine angebotene Deaktivierungsfunktion. Historische Charakterisierungsbelege bleiben historisch; neue Tests beschreiben das korrigierte Verhalten. Finale Gesamtgates und finaler Commit werden durch die Auftragssteuerung gesondert gebunden.

## Exakte geprüfte Quellenhashes

- `apps/selfservice/domain.py`: `91bd9a5a90fea6e5f295563492f62eb02bb393c262e4c0b811017f5bde7f6ad6`
- `config/selfservice-policy.json`: `355ccc200852e6e14087aa55a5dc10ed94e42f1a3222d9818086db393bcbf2ab`
- `docs/operating-model/NEXIFY-GESAMTSYSTEM.md`: `c3901e655d147aec9a944bd7a61b9ffddc01be2eed89140828ad4c91402f5ff2`
- `tests/test_selfservice_domain.py`: `25470e0621ac30875606e331c58495172d386cac801537d69128f58460b19509`
- `tests/test_selfservice_decisions.py`: `6a04b03f262198fdb06c2be3e0792edb2f60652947c3d39613f1f3dd1c3a0369`
- `tests/test_suite_trial.py`: `c0206e8c0b245945c7e494496e5587183d5c537844b4b874ad87917b8c8fdd58`

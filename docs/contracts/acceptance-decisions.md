# Entscheidungsliste — offene Abnahmegrenzen

Basis c8c865fc700cd2f0049e50efda19cb3a638fe853 / LibraryVersion3. Nur lokale Analyse und synthetische Regression; keine aktuelle externe Lesung, Mutation oder neue fachliche Regel. Rollen benennen Verantwortungsbereiche, keine verifizierte konkrete Personenzuweisung. Alle Fälle bleiben bis zum jeweiligen Nachweis offen.

Die zwölf bisherigen externen Abnahmeflächen bleiben unbewiesen. Sie sind aber nicht zwölf rein externe Arbeitsstopps: MASTER-12 enthält zusätzlich einen lokal bestätigten Geschäftsregelkonflikt und wird als local_remaining geführt; MASTER-04/10/14/18 benötigen auch konkrete Implementierungs-/Mappingarbeit. MASTER-16 erhielt einen zusätzlichen lokalen Restore-Nachweis. MASTER-09 bleibt lokal/qualifiziert zu prüfen. Abhängige Fälle unten sind Beziehungen, keine pauschalen Startsperren oder ausführbare Queue.

## MASTER-02 — Deployment / Domainentscheidung

**Fehlender Eingang:** Aktueller autoritativer Project-Settings-Read mit Projekt-/Teamidentität, rootDirectory, buildCommand, outputDirectory, productionBranch; bestätigte gewünschte kanonische Domain.

**Geprüfte Quellen:** `config/deployment-topology.json`; `config/one-web-app.json`; `evidence/one-app-2026-10-27/deployment-parent-report.json`.

**Lokal möglich/erledigt:** Historische topology nennt apps/site/dist und ältere Preview409db50; jüngerer Parent-Lesebeleg nennt Preview66866298/Production07833fb3, aber Settingsfelder null. Widerspruch/Alter getrennt; keine fehlenden Felder ergänzt.

**Kleinste nächste Aktion:** Deploymentowner liefert unveränderten aktuellen Settings-/Alias-Lesebeleg und dokumentiert Zielentscheidung; keine Umschaltung.

**Abschlusskriterium:** Projekt, Root, Build, Output, Branch, Aliasziel und Zeitpunkt eindeutig gebunden; Ist/Ziel und Rückweg bestätigt, keine Ableitung aus READY allein.

**Gesamtzielbezug:** MASTER-03, MASTER-15. Kein Handoff schließt diesen Fall.

## MASTER-03 — Identity / Sessionintegration

**Fehlender Eingang:** Passender tatsächlicher Issuer, serverseitige Signatur-/Audienceprüfung, Session-/Widerrufadapter und autorisierte Testidentitäten; Domainbindung.

**Geprüfte Quellen:** `config/clerk-production.json`; `apps/site/src/Auth.tsx`; `tools/app_backend.py`; `config/one-web-app.json`; `apps/site/tests/browser-auth.mjs`; `tests/test_one_app_backend.py`.

**Lokal möglich/erledigt:** Lokale Sessionklasse vertraut ausschließlich dem autorisierten Testaufrufer; kein Browser→Server-Identityadapter. Historische Secret-Metadaten belegen weder Wert noch Issuerpaar. Synthetische UI-/Role-/Expirytests vorhanden.

**Kleinste nächste Aktion:** Identityowner weist exakten Issuer/Origin/Adaptervertrag ohne Secretwerte nach; danach begrenzte reale Mehrtab-/Ablauf-/Logout-/Direktaufrufprüfung autorisieren.

**Abschlusskriterium:** Reale Sign-in/out-, Ablauf-/Widerruf- und Mehrtabfälle plus abgewiesener geschützter Serverdirektaufruf am exakten Release bestanden; Testsession zählt nicht.

**Gesamtzielbezug:** MASTER-04, MASTER-12, MASTER-15. Kein Handoff schließt diesen Fall.

## MASTER-04 — Identity / Tenant- und Datenverantwortung

**Fehlender Eingang:** Autoritative Actor→Tenant→Projekt-/Workspacekette und tatsächlich angeschlossene Objekt-, Suche-, Cache-, Export- und DOI/Einmallinkpfade.

**Geprüfte Quellen:** `apps/selfservice/domain.py`; `tools/app_backend.py`; `tests/test_selfservice_domain.py`; `tests/test_selfservice_decisions.py`; `tests/test_one_app_backend.py`; `docs/contracts/factory-api-auth.md`.

**Lokal möglich/erledigt:** Lokale Owner-/Tenantnegatives und fremder Tenant nach synthetischem Restore prüfbar. Browserclaims aktivieren keine privaten Seiten. Ein API-Zielvertrag ist keine angeschlossene ACL.

**Kleinste nächste Aktion:** Datenowner benennt konkrete Adapter-/Objektflächen und serverseitiges Mapping; fehlende Flächen als Implementierungsaufträge getrennt von Providerzugang führen.

**Abschlusskriterium:** Für jede tatsächlich angebotene Fläche positiver erlaubter und negativer fremder Actor/Tenant-Test, DOI-/Einmallink-Replay und Exportisolation am gebundenen Ziel nachgewiesen.

**Gesamtzielbezug:** MASTER-10, MASTER-12, MASTER-14, MASTER-15. Kein Handoff schließt diesen Fall.

## MASTER-05 — Adapter / fachliche Buchungsautorität

**Fehlender Eingang:** Autorisierter Sandboxvertrag, externer Idempotenzschlüssel und autoritativer Reconciliation-/Readbackpfad für ungewisse Schreibausgänge.

**Geprüfte Quellen:** `apps/selfservice/domain.py`; `tests/test_selfservice_domain.py`; `tests/test_selfservice_decisions.py`; `tools/local_control.py`; `config/local-control.json`.

**Lokal möglich/erledigt:** Lokale Replay-, Hold-, Unknown-outcome- und Snapshotgrenzen geprüft; historischer ledger/kunden-journey bleibt ausdrücklich nicht ausführbare Controllerfähigkeit.

**Kleinste nächste Aktion:** Adapterowner beschreibt einen begrenzten Sandboxfall mit verlorenem Antwortkanal und anschließendem Nachlesen; keine echte Zahlung oder blinde Wiederholung.

**Abschlusskriterium:** Doppelte Zustellung/Timeout/Restart erzeugt genau eine autoritativ belegte Wirkung, unklarer Ausgang bleibt bis Reconciliation offen; Preise/Buchungsrechte separat bestätigt.

**Gesamtzielbezug:** MASTER-12, MASTER-15. Kein Handoff schließt diesen Fall.

## MASTER-06 — Runtime / exklusive Zuständigkeit

**Fehlender Eingang:** Tatsächliche verteilte Ressource mit serverseitig durchgesetztem monotonem Fencing und Identität unabhängiger Abnahmeinstanz.

**Geprüfte Quellen:** `tools/local_control.py`; `tests/test_local_control.py`; `tools/remediation_queue.py`; `config/local-control.json`.

**Lokal möglich/erledigt:** Mehrprozessclaims, Leaseverlust, Restart, Parent-Join und begrenzte Versuche werden lokal durch SQLite erzwungen. Das ist kein verteilter Zielserverbeleg.

**Kleinste nächste Aktion:** Runtimeowner benennt konkrete Ressource und Fencingvertrag; danach veralteten Worker am tatsächlichen Ziel ablehnen und Übergabe testen.

**Abschlusskriterium:** Alter Fence wird serverseitig verworfen, kein zweiter Writer; Checkpoint/Resultat nach Restart exakt gelesen, Parent nur nach allen unabhängigen Receipts geschlossen.

**Gesamtzielbezug:** MASTER-15, MASTER-16. Kein Handoff schließt diesen Fall.

## MASTER-09 — Accessibility-QA / qualifizierte Geräteprüfung

**Fehlender Eingang:** Qualifizierte Screenreader-/Assistenztechnikabnahme und vollständige visuelle Prüfung von Kontrast über Bildern/Gradienten sowie Textverlust/Überlagerungen.

**Geprüfte Quellen:** `config/design-rules.json`; `apps/site/tests/browser-accessibility.mjs`; `apps/site/tests/browser-text-spacing.mjs`; `evidence/one-app-2026-10-27/text-spacing.json`; `evidence/one-app-2026-10-27/resize-review-followup.md`; `apps/site/tests/browser-contrast-scope.mjs`; `evidence/one-app-2026-10-27/decision-accessibility.json`; `evidence/one-app-2026-10-27/decision-screenshot-review.json`.

**Lokal möglich/erledigt:** Drei frische c8-gebundene Homepage-Screenshots390/1280/echtes2x intern gesichtet: DE und N vollständig, keine breite visuelle Kriterienabnahme; Geometrie36Routen/216Breiten/108Spacing-Resizefälle geprüft. Zusätzlich144 DE/NL/Breiten-Snapshots:1396 deckende CSS-Textvorkommen,5Farbpaare,Minimum6.4601 bei Projektschwelle4.5;19126Vorkommen ausgeschlossen (18932Bild/Gradient,194Opacity), keine breite Website-Kontrastabnahme. Orca/NVDA hier nicht verfügbar.

**Kleinste nächste Aktion:** Lokalen deckenden Kontrastbericht und Screenshotbefunde auswerten; qualifizierter QA-Owner übernimmt danach konkrete nicht geprüfte Kriterien mit tatsächlicher Assistenztechnik.

**Abschlusskriterium:** Anwendbare Kriterien einzeln mit Zielbrowser/Assistenztechnik/Version und fachlicher Prüferqualifikation belegt; alle bestätigten Befunde nachgeprüft, keine Zertifizierung aus Heuristik.

**Gesamtzielbezug:** MASTER-15. Kein Handoff schließt diesen Fall.

## MASTER-10 — Backend / versionierte Adapterverträge

**Fehlender Eingang:** Tatsächlich ausführbare versionierte API-/Moduladapter, vollständige Pagination- und Fehlerbelege statt generischer Payloads.

**Geprüfte Quellen:** `tools/app_backend.py`; `config/local-control.json`; `config/one-web-app.json`; `docs/contracts/factory.openapi.json`; `tests/test_local_control.py`.

**Lokal möglich/erledigt:** Drei feste lokale Fähigkeiten und Schemas ausführbar; fremde Felder, falscher Scope/Host, unvollständige Evidenz/Pagination abgewiesen. Weitere Backends sind nicht dadurch implementiert.

**Kleinste nächste Aktion:** Backendowner liefert Operationsinventar mit exakten Ein-/Ausgabeschemas und Zielantworten; lokal fehlende Adapter separat vor externer Prüfung bauen, keine Shellbrücke.

**Abschlusskriterium:** Jede benötigte Operation besitzt Versions-/Schema-/Fehlervertrag und vollständigen realen Antwort-/Paginationbeleg; unbekannte Operation bleibt gesperrt.

**Gesamtzielbezug:** MASTER-12, MASTER-18, MASTER-15. Kein Handoff schließt diesen Fall.

## MASTER-12 — Produkt D06 / Finanzierung D02 / Identity-Vault-Payment-Modell-Usage-Owner

**Fehlender Eingang:** Zusätzlich zu realen Adapterbelegen: explizite Auflösung MASTER-12-TRIAL-01 zwischen dokumentiertem fundingunabhängigem Suitebeginn und aktuellem start_trial-Fundinggate.

**Geprüfte Quellen:** `docs/operating-model/NEXIFY-GESAMTSYSTEM.md`; `config/selfservice-policy.json`; `apps/selfservice/domain.py`; `tests/test_selfservice_domain.py`; `tests/test_selfservice_decisions.py`; `config/local-control.json`.

**Lokal möglich/erledigt:** Neue Charakterisierung: aktivierter unfundierter Workspace kann Trial nicht starten; Fehler explicit_validated_funding_required, Zustand unverändert, kein Hold/LLM-Reservierung. Betriebsmodell§5.1 und policy.starts_when nennen Funding nicht als Suite-Startbedingung. Öffentliche UI-Ansehbarkeit ist keine aktivierte Kunden-Suiteberechtigung. Kein kostenloses LLM-Guthaben daraus abgeleitet.

**Kleinste nächste Aktion:** Produkt-/Finanzierungsowner bestätigt gültigen Suite-Startvertrag und betroffene UI/API-Zustände; dann gezielt fachlich freigegebene Implementierung samt unverändert striktem LLM-Fundingguard. Reale Adapter separat autorisieren.

**Abschlusskriterium:** Quellen-/Codewiderspruch entschieden und freigegeben umgesetzt; Suiteberechtigung und LLM-Kostenfreigabe separat positiv/negativ geprüft; zusätzlich Identity/Vault/Payment/Modell/Usage-Reconciliation mit exaktem Readback.

**Gesamtzielbezug:** MASTER-03, MASTER-04, MASTER-05, MASTER-10, MASTER-15. Kein Handoff schließt diesen Fall.

## MASTER-14 — Brain / Wissens- und Tenantverantwortung

**Fehlender Eingang:** Autoritative Actor/Tenant/Projekt-/Workspacezuordnung, ACL sowie freigegebener neutraler WRITE→INDEX→EXACT READ-BACK→CONTENT COMPARE-Pfad.

**Geprüfte Quellen:** `tools/brain_ingestion.py`; `tests/test_brain_ingestion.py`; `config/local-control.json`; `tests/test_local_control.py`.

**Lokal möglich/erledigt:** Lokales redigiertes Staging mit Version/Chunkhash, Replay und Prozessrestart testbar; remote_brain_write nicht registrierte Ausführungsfähigkeit. Seedname ist keine Tenantautorität.

**Kleinste nächste Aktion:** Brainowner liefert autoritatives Mapping/ACL und Operationsschema; erst danach neutralen freigegebenen Testumfang wählen. Kein Kunden-/Privatimport.

**Abschlusskriterium:** Exakte Inhaltsgleichheit und Indexzuordnung am bestätigten Tenant nach Write/Index/Readback, Fremdtenantnegative und Provenienz-/Lifecyclebeleg bestanden; Toolerfolg allein genügt nicht.

**Gesamtzielbezug:** MASTER-04, MASTER-10, MASTER-18, MASTER-15. Kein Handoff schließt diesen Fall.

## MASTER-15 — Release / Produktionsfreigabe

**Fehlender Eingang:** Genehmigter Zielrelease des gemeinsamen Kandidaten, tatsächlicher Runtime-/Asset-/Routenbeleg und unabhängige Releasefreigabe.

**Geprüfte Quellen:** `config/one-web-app.json`; `docs/contracts/one-web-app-integration.md`; `evidence/one-app-2026-10-27/deployment-parent-report.json`; `apps/site/scripts/build-standalone.mjs`.

**Lokal möglich/erledigt:** Kandidat c8c865f und LibraryVersion3 sind lokal geprüft; neue Entscheidungstests ändern keinen produktiven Release. Root apps/site ist Quellbuild, kein Beweis unbekannter Projectsettings.

**Kleinste nächste Aktion:** Releaseowner sammelt vorgeschaltete Abnahmen und exakten Artefakthash; Deployment erst nach gesonderter Freigabe. Keine jetzige Veröffentlichung.

**Abschlusskriterium:** Exakter Release-/Assethash auf bestätigter Runtime, echte Routen/Session/Provider-E2E, Restore/Rückweg und qualifizierte unabhängige Freigabe vollständig belegt.

**Gesamtzielbezug:** MASTER-02, MASTER-03, MASTER-04, MASTER-05, MASTER-06, MASTER-09, MASTER-10, MASTER-12, MASTER-14, MASTER-16, MASTER-17, MASTER-18. Kein Handoff schließt diesen Fall.

## MASTER-16 — Runtime / Backup und Migration

**Fehlender Eingang:** Letztes erfolgreiches Backup samt Ziel-/Zeit-/Exitbindung, tatsächliche Wiederherstellung und Schreibübergabe/Rückrouting auf freigegebener Zielumgebung.

**Geprüfte Quellen:** `tests/test_selfservice_domain.py`; `tests/test_selfservice_decisions.py`; `tests/test_ai_migration.py`; `config/ai-migration-policy.json`.

**Lokal möglich/erledigt:** NEU: SQLite-Backup/Restore mit synthetischer Reservierung, integrity_check, Zustandsgleichheit, Requestreplay ohne neuen Hold und Fremdtenantnegative bestanden. Keine Dify/VPS-/Providerwiederherstellung und kein Recovery nach externen Seiteneffekten.

**Kleinste nächste Aktion:** Backupowner liefert unverändertes Exitprotokoll/letzten erfolgreichen Stand für srv1941843 und kontrollierten Restoreplan; lokale Punkt-in-Zeit-Prüfung bereits vorbereitet.

**Abschlusskriterium:** Echtes Backup am Ziel lesbar, Restore und Integrität nachgewiesen, RPO/RTO nur gegen genehmigte Vorgaben bewertet, Jobs/Schreibrechte sicher übergeben und Rückrouting ohne doppelte Wirkung geprüft.

**Gesamtzielbezug:** MASTER-06, MASTER-15. Kein Handoff schließt diesen Fall.

## MASTER-17 — Betrieb / Performance und Produktentscheidung

**Fehlender Eingang:** Identitätsgebundene aktuelle Zielmessung mit Einheiten/Zeitraum/Lastprofil und ausdrücklich genehmigte quantitative Akzeptanzgrenzen.

**Geprüfte Quellen:** `config/capacity-policy.json`; `tools/capacity_planner.py`; `tests/test_capacity_planner.py`.

**Lokal möglich/erledigt:** Offlineplaner prüft fehlende/veraltete/Zukunftsmessungen, Last-/Einheiten-/Scopegrenzen.25%Headroom und30Tage sind lokale Planungsannahmen, keine Nutzer-SLAs. Kein VPS-Lasttest durchgeführt.

**Kleinste nächste Aktion:** Betriebsowner liefert passende begrenzte Baseline; Produkt/Betrieb bestätigt messbare Grenzen. Keine Grenzwerte oder fehlende Last als Null erfinden.

**Abschlusskriterium:** Gleiche Methode/Ziel-/Versions-/Lastbindung vor/nach, vollständige Messdimensionen und genehmigte Grenzwerte; Teilmessung bleibt Teilmessung.

**Gesamtzielbezug:** MASTER-15, MASTER-16. Kein Handoff schließt diesen Fall.

## MASTER-18 — Adapter / Security / Skillverträge

**Fehlender Eingang:** Passende typisierte Operationen, lesbare Skillreferenzen/Hashes, reale Scopes/Rechte und frische vollständige Ziel-/Operationsevidenz.

**Geprüfte Quellen:** `config/local-control.json`; `tools/local_control.py`; `tests/test_local_control.py`; `tools/context_executor.py`.

**Lokal möglich/erledigt:** Intent→Skill/Hash→registrierte lokale Operation läuft mit festen Grenzen. Unknown/Host-/Scope-/stale/partial-Negatives und fehlender SSH-Ersatzweg testbar. Reale MCP/SSH-Fähigkeiten nicht dadurch integriert.

**Kleinste nächste Aktion:** Adapterowner liefert exakten Operationsvertrag und aktuellen vollständigen Zielbeleg einschließlich jüngstem Fehler/Unknown-outcome; kein allgemeiner execute_command-Ersatz.

**Abschlusskriterium:** Operation wird nur bei passendem aktuellen vollständigen Nachweis gewählt; falsches Ziel/Rechteverlust/Skillfehler/Partial/ungewisser Ausgang blockieren oder reconciliieren belegt; kein stiller Fallback.

**Gesamtzielbezug:** MASTER-10, MASTER-14, MASTER-15. Kein Handoff schließt diesen Fall.

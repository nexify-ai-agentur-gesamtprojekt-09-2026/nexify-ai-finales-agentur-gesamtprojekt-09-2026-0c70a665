# Begrenzter Integrationsvertrag

Ziel: ein lokaler One-Web-App-Kandidat aus den zwei geprüften Parents,
mit gemeinsamer Workspace-Shell und sicherem lokalen Controllerbackend.
F-007 bleibt einziges bestehendes aktives Feature; kein Status auf passing gesetzt.
Autorisierung: Parentdelegation erlaubt lokalen Merge auf neuem isoliertem Zweig.
Ausgeschlossen: Remote-Schreiben, Deployment, reale Auth-/Tenant-/Zahlungsadapter,
Kundendaten, Credentials, Serveränderungen und pauschale Produktionsabnahme.
Gates: Design/Statik → Unit/Build → lokale kombinierte Browser-/Backend-E2E,
Architektur/Clean-State und separate Gegenprüfung am exakten Commit.
Rote Gates werden korrigiert und erneut ausgeführt, nicht als Erfolg markiert.

Quellen: aktuelle AGENTS.md, nexify-governed-delivery1.0.2,
nexify-platform-integrations1.0.1, Projekt-Skillmanifest (5 Quellen verifiziert),
Master1.1 technisch über Parent übermittelt. Small-Business-Router gelesen;
keine Geschäftsworkflow-Ausführung oder installierter44-Skill-Bestand behauptet.
Lokale .agents-Kopien fehlen in diesem Clone; vorhandene Projekt-Skills wurden
direkt gelesen. Kein Plattformdeploy oder neue API aus Erinnerung implementiert.

Neu reproduzierte Integrationsfehler: fehlende Sessioncapabilities im älteren
Authfixture; fehlendes aktuelles Presenterasset im Standalonefixture; nicht
lokalisierte Fehlerseite und Dokumenttitel. Alle mit passenden Browser-/Node-
Gegenproben korrigiert. Strukturregeln behalten alle bestehenden Grenzen.

Eigenbewertung im begrenzten lokalen Scope: Korrektheit A (kombinierte Flows
und Negatives), Architektur B (lokale Authgrenze, keine Livebehauptung), Tests B
(Provider fehlen ausdrücklich), Evidenz B (Quellhashes/Logs, keine Produktions-
Messungen). Unabhängige Gegenprüfung erfolgt separat, keine Selbstfreigabe.

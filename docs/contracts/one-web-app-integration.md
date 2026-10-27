# One Web App — isolierter Integrationskandidat 2026-10-27

## Herkunft und konkrete Konfliktentscheidungen

Eigenes lokales Repository `/workspace/nexify-one-app`, Zweig
`integration/one-web-app-2026-10-27`, keine Remotes.
Controller-Parent fd01d532e5143bc5282a054048a92d091e213f26 und
PR36-Parent 58ea5b374d3e5c0e12a5ba5f80e8c65ceb03af58 haben gemeinsamen Vorfahren
66866298b3eb4054371b0e2a1e1f618f1bc8ca73. PR35 a19cd503 ist bereits Nachfahre
dieses ursprünglichen PR36-Stands. Deshalb werden keine historischen PR36-Dateien
pauschal über den neueren PR35-Rebuild geschrieben. Alle bisherigen Zweige und
Lieferpakete bleiben unverändert. Lokaler Merge ausdrücklich beauftragt.

Fünf Mergekonflikte wurden fachlich aufgelöst:
- main.tsx: zentrale Token-/Global-CSS-Imports und aktuelle HomeContent-Pages
  erhalten; PublicAuthProvider um die Gesamtapp entfernt; route-lokales optionales
  Authpanel einschließlich Hashmodus übernommen.
- vite.config.ts: aktuelle gezielte API-Proxies erhalten; ausschließlich der
  Standalone-Modus deaktiviert Code-Splitting.
- package.json: vorhandene SDK-Abhängigkeiten erhalten, Node-Untergrenze22.23.4
  übernommen. Keine neue Abhängigkeit oder Änderung am Lockfile.
- Architekturregeln: bestehende18 erhalten, PR36-Regeln eindeutig ARCH019/020;
  kombinierte Controller-/Sessiongrenzen als ARCH021 ergänzt.
- PROGRESS: aktuelle Integrationslage vorangestellt, historische Teilbelege
  erhalten und nicht als neue Gesamtabnahme ausgegeben.

## Gemeinsamer App- und Backendvertrag

`config/one-web-app.json` bindet App-Root `apps/site`, Einstieg main.tsx,
Workspace-Shell aus apps/web, Site-Map, Tokens, Sprachen und Modulgrenzen.
`vercel.json` im Repositoryroot baut `@nexify/site` nach `apps/site/dist` und
schreibt öffentliche Routen auf index.html um; API/.well-known bleiben getrennt.
Das ist der vorgesehene **Quell-/Buildroot**, keine neu abgefragte Livezuordnung.
Historische Vercel-Konfiguration nennt .de als Vorschau und unveränderte .cloud;
kanonische Produktionsdomain und tatsächlich laufender gemeinsamer Release bleiben
unbestätigt. Keine Aliase, Projekte oder Veröffentlichungen wurden verändert.

Eine gemeinsame Workspace-Instanz verwaltet Navigation und Locale. Agency- und
Selfservice-Seiten sind getrennte öffentliche Fachwege. Alle10 privaten Ansichten
bleiben aus öffentlichen Daten ausgeschlossen, auch bei gefälschten Browserclaims.
Authpanel und Failures bleiben lokal; echte Auth ist nicht aktiviert. Ein Provider-
Sign-in ist weder Geschäftsrolle noch Tenantfreigabe. Unbekannte/private Routen
zeigen jetzt auch unter NL/FR eine lokalisierte Fehlerseite und Rücknavigation.

`tools/app_backend.py` führt als reiner lokaler Backendadapter in dieselbe
LocalControl-/Context-/Remediation-Implementierung. Keine zweite Queue, Oberfläche
oder HTTP-Route. Er prüft bei jeder Operation die explizite lokale Session,
Actorlabel, Tenant/Projekt, Rolle, Ablauf und exaktes Payloadschema. Operator darf
prüfen/ausführen/wiederaufnehmen; Reviewer darf lesen/abnehmen, aber nicht ausführen.
Browserclaims können diese Session nicht über ein öffentliches Interface erzeugen.
Die Session wird von vertrauenswürdigem lokalem Code bereitgestellt; das ersetzt
keinen verifizierten serverseitigen Identityadapter. UI→geschäftliches Backend bleibt
bis dahin gesperrt. Keine automatische Anbindung des historischen Journey/Ledgerpfads.

## Neue gemeinsame Prüfungen und Grenzen

Neue Backendtests kombinieren Context-Parent mit Source-Readback und redigierter
Brain-Vorschau, getrennten Start-/Abschlusskanten, erneut geöffneten Adaptern,
Idempotenz, Parent-Join, expliziten Reviewreceipts sowie Crash-/Leasewiederanlauf.
Negativ: fremder Tenant, falsche Rolle, abgelaufene Session, zusätzliche Claimfelder,
Shelloperation und alter Worker. Synthetische lokale Sessions, keine Provider.

Neue Browsertests prüfen Deep Links, Reload, Vor/Zurück, gemeinsame Shell und
Entwurferhalt, DE/NL, lokalisierte Fehler-/Rücknavigation, zentralen Tokenerhalt,
synthetisches Sign-in/out und Logoutfehler, gefälschte Clientrollen/Tenants auf allen
privaten Routen, Lazy-Importfehler und mobile Tastaturbedienung. Externe Requests
sind gesperrt. Ein erster paralleler HMR-Lauf endete mit Exit139; zwei spätere
stabile Läufe reproduzierten dies nicht. Keine Behauptung allgemeiner Fehlerfreiheit.

Die Integration korrigierte zusätzlich zwei veraltete Testfixtures: Sessionmock
braucht den aktuellen achtfeldrigen Capabilityvertrag; Standalonefixture braucht
das im PR35-Rebuild tatsächlich eingebettete hero-trio-Asset. Fehler wurden nicht
durch Aufweichen von Produktgrenzen oder Abschalten der Tests verdeckt.

Gesamtmatrix1.1 bleibt am produktiven Release offen; lokale Prüfzahlen sind keine
vollständige Abnahme der18 Fälle. Echte Identity/Rollen/Tenant-APIs, Sessionwiderruf,
Mehrtab-Providerverhalten, Zahlungen, Modelle, Brain-WRITE/INDEX/READ-BACK, PWA,
Domain-Cutover, Backup/Restore und qualifizierte Produktionsfreigabe fehlen.
Separate Codegegenprüfung erfolgt am exakten Integrationscommit; Bericht wird im
Übergabepaket mit Hash gespeichert. Ein zweiter Agent ist keine zugesicherte andere
Modellgewichtung oder menschliche Produktionsfreigabe.

## Reproduktion und Rückweg

Node22.23.4, Python-Standardbibliothek, Dependencies aus unverändertem pnpm-Lockfile
mit frozen-lockfile und ignore-scripts. In dieser Umgebung braucht pnpm schreibbare
lokale XDG_CACHE_HOME/XDG_DATA_HOME/XDG_STATE_HOME statt des verwalteten Home.
Keine Credentialänderung. `make check`, `make test`, `make e2e`, `make check-arch`,
`make clean-check`; Site-Typecheck, Normal-/Standalonebuild, Node- und Browsertests.
Befehle und Logs liegen im Paket; Browser benötigen vorhandenes Playwright/Chromium.

Rollback des Kandidaten: lokale Runner stoppen und zu einem der unveränderten
Parents wechseln. Keine externe Route wurde umgestellt. Lokale SQLite-Daten behalten;
vor Verwendung einer vorhandenen Queue konsistentes Backup und Restore prüfen.
Keine destruktive Rückmigration. Das Paket liefert Patch gegen a19cd503, sodass
PR35-Korrekturen, Controller, PR36-Folgepatch und Integrationsdelta gemeinsam
reproduzierbar sind. Der historische gemeinsame Vorfahr und beide Mergeparents
sind separat dokumentiert; dies behauptet keinen Merge in main.

## Nachprüfung und aktueller Split der Aliasstände

Unabhängige Gegenprüfung an899c326 reproduzierte einen gecachten Rollenvertrag:
Ein bereits erzeugter lokaler Adapter übersah einen späteren Rechteentzug. Jede
Dispatchoperation vergleicht jetzt zuerst den sicher gelesenen Vertragshash;
Drift blockiert vor dem Claim und verlangt expliziten Neustart mit aktuellem
Vertrag. Regression prüft bestehenden und neu erzeugten Adapter bei Rollenentzug,
Versuchszahl bleibt0. Das ersetzt keine verteilte Auth-/Widerrufsinfrastruktur.

Neue ausschließlich vom Parent übermittelte Vercel-Leseevidenz (nicht hier erneut
abgefragt): nexifyai.de ist branchgebundene verifizierte Vorschau, READY
`dpl_3KcSgJUsdNbsJjiWvR74Xf95SdFA`, Commit66866298 auf
factory/agency-separated-2026-10-26, target=null, Vite. Die normale Production-
Alias desselben Projekts zeigt auf READY `dpl_XXZBR56U9Nwx9Nj6MDR5GER5v4ZG`,
main07833fb3. Domainverifikation beweist weder gleiche Version noch Abnahme.
Auslesezeit wurde in der Mitteilung nicht exakt angegeben und bleibt unbekannt.
Der lokale neue Integrationskandidat ist keiner dieser beiden Deployments.

Cutover bleibt ausgesetzt: zuerst aktuelle App-Root-/Ausgabe-/Domain-/Ownerbindung
lesen, den gewünschten kanonischen Alias ausdrücklich festlegen, exakten gemeinsamen
Release mit realen Providergrenzen abnehmen, Backup/Restore und Rückrouting belegen,
aktive Jobs/Leaseübergabe klären. Erst eine gesondert autorisierte Umstellung darf
Aliases ändern; anschließend jeden Alias separat mit exaktem Release rücklesen.
Keine Umschaltung, Projektlöschung oder Einstellung wurde hier vorgenommen.

## Ergänzter lesender Deployment-Abgleich — kein Konfigurationsnachweis

Der Parent hat den Leseabgleich abgeschlossen. Maschinenlesbare, ausdrücklich
nicht hier unabhängig reproduzierte Quelle:
`evidence/one-app-2026-10-27/deployment-parent-report.json`.
Empfangszeit und unbekannte Auslesezeit werden getrennt gespeichert.

| Quelle | Beleg | Grenze |
| --- | --- | --- |
| Hauptprojekt | Vite, Node22.x | rootDirectory, konfigurierte buildCommand/outputDirectory und productionBranch fehlen in den Projektantworten; bleiben null |
| .de-Deploymentlog | pnpm install --frozen-lockfile --ignore-scripts; node scripts/generate-public-data.mjs && tsc --noEmit && vite build; Vite8.3.5; dist/index.html und Assets | beobachteter Prozess, keine bestätigte RootDirectory oder konfigurierte Projekt-Buildvorgabe |
| nexifyai.de | Preview-Branch auf66866298 | nicht der lokale Integrationscandidate und nicht Standardproduktionsalias |
| Standardproduktionsalias | main07833fb3 | andere Version als .de; keine gemeinsame Releaseabnahme |
| site, site-gjp7, web-2kby | READY aufa19cd503 | READY allein beweist keine fachliche Nutzbarkeit oder Entbehrlichkeit anderer Projekte |
| site-k23m, web | ERROR aufa19cd503, dist fehlt | konkreter Build-/Ausgabeabgleich nötig; keine Grundlage für blinde Löschung oder Aliaswechsel |

Der lokale Quellvertrag nennt weiterhin apps/site und apps/site/dist, weil die
Repositorykonfiguration dies belegt. Diese Zielvorgabe wird nicht als ausgelesene
Plattformeinstellung ausgegeben. Vor Cutover müssen pro betroffenem Projekt exakte
Root-/Build-/Outputwerte und Owner autorisiert ermittelt werden; dann den geplanten
Kandidaten in isolierter Vorschau prüfen und getrennt von Produktionsalias und .de
abnehmen. Bis dahin keine Projekteinstellung, Domain, Runtime oder aktive Jobs ändern.

Der aktuell erreichbare lokale Integrationsumfang ist geliefert. Weitergehende
Livefertigstellung bleibt an die bereits aufgeführten Rechte-/Provider-/Restore-
Nachweise gebunden. Fehlende Voraussetzungen werden nicht durch Routinefragen an
den schlafenden Auftraggeber oder durch erfundene erfolgreiche Integration ersetzt.

## Geschlossener Kreis und offene Zuständigkeiten

Die Zusatzweisung „halte den Kreis geschlossen (alle)“ ist im lokalen
Controllerstatus umgesetzt: Intake-/Lease-/Ergebnis-/Review-/Quellenbelege bleiben
persistiert, Parent-Join verlangt geprüfte Kinder. `follow_up` weist konkrete
bekannte Executorlabels oder ausdrücklich null, Koordinator D08, zuständige Rolle,
Ursache, nächste zulässige Aktion und Voraussetzungen aus. `closed_loop_receipt`
belegt ausschließlich den lokalen Registerrücklauf; externe Brainrückführung
bleibt false. Verwaiste, fehlgeschlagene oder blockierte Arbeit bleibt offen.

Offene externe Schleifen werden nicht als erledigt aggregiert:
- Deployment/Cutover: verantwortliche Rolle autorisierter Deploymentowner,
  konkreter Executor hier nicht belegt. Nächster Schritt: Root/Build/Output und
  gewünschte Aliaszuordnung lesend nachweisen. Voraussetzung: genaue Zielidentität
  und vor einer Mutation gesonderte Rechte-/Abnahmebindung.
- Identity/Tenant/Brain: verantwortliche Rolle autorisierter Identity-/Brainowner,
  konkreter Executor nicht belegt. Nächster Schritt: autoritative Actor→Tenant→
  Project/Workspace-Kette nachweisen. Keine geratenen IDs, Kundendateninjektion
  oder neue Credentials. Dann erst autorisierte exakte Write/Index/Readbackprüfung.
- Restore/Produktionsabnahme: verantwortliche Rolle Runtimeowner plus qualifizierter
  unabhängiger Reviewer, konkrete Zuweisung offen. Nächster Schritt: letzten
  erfolgreichen Backupstand, Exitprotokoll und kontrollierten Restore belegen;
  keine Servermutation im hiesigen Scope.

Diese Angaben sind offene Followups, keine neu autorisierten externen Jobs.
Ungewisse externe Wirkung würde zuerst abgeglichen; hier wurde keine solche
Wirkung versucht. Die Parentkoordination erhält das Ergebnis; keine Routinefrage
oder separate Benachrichtigung an den schlafenden Auftraggeber.

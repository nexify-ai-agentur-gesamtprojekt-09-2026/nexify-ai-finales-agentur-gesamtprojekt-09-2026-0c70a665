# Vollmigration · laufende Revision 04.11.2026

Führender Arbeits-, Gestaltungs- und Migrationsstand ist Pascals ausdrücklich gewählte Site:
https://nexify-ai-factory-20261101.workspace-vo-0220.chatgpt.site/
Projekt `appgprj_6ae7ad63df2081918a843f996caf9422`, Ausgangscommit `0bbce305fb7e11233a7824d5b509e8f9e49e5ea7`.
Diese Entscheidung ändert keine DNS-Zone, bestehende Kundenruntime oder Datenbank.

## Quellen

Aktuelle direkte Nutzerentscheidungen vom 04.11; vorhandene AGENTS-Regeln;
Gesamtplan v3 R2, Library-Version 12 (gezielte aktuelle und Medien-/Designabschnitte gelesen,
18.534 Zeilen insgesamt, keine vollständige semantische Wiedergewinnung aller Historie behauptet);
Masterplan V2.1 und Charakterbibel; Markenrevision 02.11; reale Sites-,
Higgsfield- und Systemmaster-Readbacks. Historische Fassungen bleiben erhalten.

## Regeln

Ein schreibender Owner pro Ziel; `/root` implementiert UI, Medien und Dokumentation. Vier getrennte Prüfidentitäten:
`home_review`, `requirements_audit`, `migration_architecture`, `migration_governance`. `migration_architecture` bearbeitet zusätzlich einen abgegrenzten Cart-Kandidaten; `home_review` prüft ihn unabhängig.
Keine ursprünglichen Bilder, Daten, Repositories oder Laufzeiten löschen.
Aktuelle ausdrückliche Nutzerkorrekturen gehen historischen Plänen vor.
Hero ist ein echtes Video; drei Glasbilder darunter. Keine Montage/Standfigur
als erfüllten Sprecherfilm ausgeben. Keine erfundenen Preise, Rechtsdaten oder Livefähigkeiten.
Vorhandenes Abo-Guthaben ist keine Erlaubnis zu Aufladung, neuen Abos oder unbegrenzten Wiederholungen.

## Ressourcen

| Ressource | Führende Bindung | Aktueller Zustand / Grenze |
|---|---|---|
| Website | oben genannte Site, vorhandener Sites-Quellzweig | Eigentümerzugang gelesen; native Version 29 vor diesem Delta |
| Gemeinsame Anwendung | apps/site + apps/web/components + packages/tokens | 39 öffentliche Seiten; statischer Build |
| Auftrag | config/acceptance-coverage.json → requirements_reconciliation.current_execution | Bestehende 26 Pakete P01–P26 / G01–G30; diese Revision wird dort ergänzt |
| Arbeitsplatz | apps/web/app/intern/workspace + Backendadapter | Implementierung vorhanden; geschützte produktive Sites-Anbindung unbewiesen |
| Shop | apps/shop-api/shop, aktuelle DECISIONS D005–D009 | FastAPI/Mongo; alter Gateway-Fixturevertrag bleibt historisch erhalten |
| Modelle | config/llm-policy.json | Exakter 1017/high-Pin; gesonderte product_enrichment-Ausnahme nicht verallgemeinern |
| Brain/Oracle | bestehende Gateway-/RAG-Verträge | Native Plugins und Health sind keine Tenant-/Index-/Workerabnahme |
| Server | Systemmaster 0.1.8, srv1243952, frischer Readback 04.11 | Zwei MCP-Namen zeigten denselben Host; Backupmetadaten sind kein Restoretest |
| Medien | config/presenter-artwork.json, config/hero-film.json, Higgsfield-Jobreferenzen | Originale unverändert; aktuelle Produktion und Qualitätsprüfung separat |
| Integrationen | vollständige Sites-Eligibility-Abfrage 04.11 | Slack allowed; u. a. GitHub/Drive/Notion/Brain/VPS/PostHog unknown. Keine Deklaration hinzugefügt |

## Ausführungsfolge im bestehenden Register

| Paket | Nächster nutzbarer Schnitt | Owner / Abnahme |
|---|---|---|
| P02/P03/P04 | Hero mit korrekt gesprochenem Text, synchronem Bild, echter Transparenz; gemeinsame Glasgestaltung und vollständige Inhalte | Grafik/Brand + UX; exakter Medienhash, Bild-/Ton-/Browsergegenprobe, Pascal-Designabnahme |
| P23/P24 | Bestehende Fach-APIs an bestätigte Zielruntime anbinden | Infrastruktur/Backend; realer Session→API→Store-Readback, Rückweg |
| P01 | Idempotenter Anfrageweg mit Outbox/Recovery | Backend; Lost-ACK, Replay, Konflikt, Crashfälle |
| P16/P05 | Eigene Auth an Tenant/Membership/Entitlement binden | Backend/Sicherheit; fremder Tenant, Ablauf, Revoke und Trialgrenzen |
| P06/P15/P25/P26 | Pascals echten geschützten Arbeitsplatz, Dateien und Portale liefern | UX/Backend; autorisierte Reads, persistente Version/Originalhash, Tenantnegative |
| P07 | Bestehenden Funding-/Ledgerkern an tatsächlichen Provider anschließen | Backend/Finance; Reservierung/Commit/Refund/Unknown-outcome und harte Limits |
| P08/P09/P10 | Gastcart-Datenverlustpfad beheben, Store-/Katalogbindung kontrolliert herstellen | Shop; Crash-/Parallelitäts-/Recoverytests und vollständiger Katalognachweis |
| P17/P23 | Vorhandene Outbox mit autorisiertem Worker, Lease/Fencing und Rückkanal verbinden | Infrastruktur/Kommunikation; keine ungefragten Nachrichten |
| P19/P21/P24 | Brain-, REA-, Restore- und aktuelle Releasebelege schließen | Wissen/Qualität; WRITE→INDEX→EXACT READ-BACK→CONTENT COMPARE, Fremdtenanttest |

Website und Arbeitsplatz bleiben gleichrangige Lieferziele. Keine Wartung als Ersatz für Fertigstellung.

## Bisherige Verifikation dieses Deltas

Website-Build und 118 Site-Tests bestanden. Referenz-Designaudit 0/0.
CSS-Fenster 320/390/820/1024/1440/1920 ohne horizontalen Überlauf, alle drei Originalfiguren geladen und enthalten;
vier Sprachen bei 320 px sowie Seitenleiste offen/geschlossen geprüft. Dies betrifft den damaligen
Standbild-Layoutdelta, noch keine Abnahme des kommenden Videos. CTA-Text rechnerisch von 1,81:1 auf 9,08:1 verbessert.
Unabhängiger Reviewer fand einen unsichtbaren dekorativen Pfeil; Farbe erbt jetzt den dunklen Buttontext.
Forced-Colors-Fallback im Quellcode ergänzt; keine tatsächliche System-Forced-Colors-Abnahme behauptet.

Gesamtgate bleibt rot: 697 Pythonfälle, 79 Failures / 52 Errors / 14 Skips; Baseline 80/52/14.
Keine zusätzliche FAIL-/ERROR-Kennung, aber nicht vollständig äquivalente Umgebungen und Quellenbindungen.
Daraus folgt keine pauschale Regressionsfreiheit. Fehlendes httpx, unverifiziertes Pillow und historische
Browser-/Reconciliationbindungen sind konkret offen. Keine alten Belege umgehasht.

## Abgegrenzter Cart-Kandidat

`docs/migration-candidates/cart-merge-recovery-20261104.patch` erhält den vollständigen
Kandidaten samt 34 gezielten Offline-Recoverytests. Er ist aus dem aktiven Runtimepfad
herausgenommen; die bisherige Shopimplementierung ist unverändert. Der Kandidat erhält
Gastdaten, schreibt Ziel und Übernahmebeleg transaktional, schützt serverseitige
Snapshots und behandelt Lost ACK sowie Accountwechsel. 34 neue und 14 bestehende
Recoverytests bestanden; die neuen Tests benutzen dokumentierte MVCC-/Treiberfakes.

Unabhängiger Review reproduzierte eine ungelöste Mengenlimitblockade. Eine sichere
Lösung benötigt eine fachlich sichtbare Konfliktentscheidung. Alte Browserwerte haben
keine Clientrevision; der Legacy-Checkout entfernt außerdem nach Produkt-ID statt
bezahlter Menge/Version. Echte FastAPI-/ReplicaSet-/Cookieabnahme fehlt. Deshalb
kein Commerce-Livegang und keine erledigte G02-/P08-Gesamtabnahme.

Die drei geänderten Dokumentationsquellen AGENTS, Deploymenttopologie und gemeinsame
App wurden nach unabhängigem Governance-Readback neu gebunden. Alter Commit und alte
Hashes bleiben im Revisionsbeleg erhalten; historische QA-/Browser-/Runtimebelege
wurden nicht erneuert oder umgehasht.

## Rückweg und Abschluss

Bestehende Version 29 und Originalmedien erhalten; keine produktive Daten-/DNS-/Runtimeumstellung.
Code- und Medienrevision getrennt zurücknehmbar. Vollmigration erst nach tatsächlichen
Kunden-/Tenant-/Worker-/Kosten-/Restore-/Releaseketten und unabhängiger Abnahme schließen.
Dieser Zwischenstand ist keine Gesamtmigration, kein Always-on-Betrieb und keine Normzertifizierung.

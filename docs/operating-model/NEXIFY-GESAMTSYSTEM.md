# NeXify-Gesamtsystem: Verantwortungen, Abläufe und Betrieb

Fassung 26.10.2026. Diese Betriebsdefinition verbindet Produkte, Abteilungen, Rollen, Eingänge, Umsetzung, Tests, Freigaben und Rückkopplung. Maschinenlesbare Entsprechungen: `config/operating-model.json` und die neue verbindliche Nutzerregel `config/selfservice-policy.json`.

Das Ziel ist ein zusammenhängendes Agentursystem mit eigener Suite, Agenturleistung und TEILEKLAR-/Werkstattbereichen. Eine funktional vollständige Definition ist von einer tatsächlich verbundenen und abgenommenen Laufzeit zu unterscheiden. Der jeweilige Ausführungsnachweis steht beim konkreten Release, Test und Vorgang. Diese Definition behauptet weder Zertifizierung noch uneingeschränkten Dauerbetrieb oder bereits aktivierte Geschäftsprozesse.

## 1. Geltung und maßgebliche Quellen

Aktuelle ausdrückliche Nutzerentscheidungen und `AGENTS.md`/`config/source-boundaries.json` haben Vorrang vor historischen Gesamtplänen. Kanonische Umsetzung ist `nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665`. GitHub ist die Schreibquelle; eine bestätigte lokale GitLab-Anbindung ist nachgelagerte CI/Spiegelung mit Fast-forward. Die alten sich widersprechenden Mirror-/Watcher-/Factory-Anweisungen werden nicht wieder aktiviert.

Affilinet Portal Aachen ist ein gesondertes pausiertes Kundenprojekt. Es ist kein Agenturmodul, keine Lieferabhängigkeit und keine Quelle eigener Kunden-, Zahlungs- oder Gesprächsdaten. Komponentenwiederverwendung braucht konkreten Zweck, Quellcommit, Dateien, Lizenzgrundlage, Anpassung und Tests. Gemeinsame Markenähnlichkeit, Oberfläche oder E-Mail-Adresse erzeugt keine gemeinsame Identität oder Datenmigration.

Für diese Definition wurden alle **40** nach dem im Konfigurationsinventar dokumentierten Auswahlkriterium vorhandenen Plan-/Gesamt-/Betriebs-/Runbook-/Organisations-/Auftragsquellen in der kanonischen `docs/`-Quelle vollständig eingelesen und strukturell erfasst. Außerdem wurden alle **94** Einträge des aktuellen Prototypkatalogs, dessen **29** Domänen, **102** API-Zieloperationen, die technischen Vertragsrollen und die **44** installierten Small-Business-Anleitungen als Register abgeglichen. Jeder Katalogdomäne ist ein verantwortlicher Bereich zugeordnet. Die ursprünglichen übergreifenden Factory-Konzept-/Abhängigkeitsdateien wurden als frühere Snapshots aufgenommen und anhand der aktuellen Kundengrenzen gefiltert.

Dieser Quellenabgleich prüft Vollständigkeit und Zuordnung der Definition. Er führt die alten Pläne nicht aus und bestätigt keine früheren Behauptungen wie „getestet“, „zertifizierungsreif“, „Wächter aktiv“ oder „alle Provider angeschlossen“ für die aktuelle Umgebung. Quellen, Hashes, Auswahlgrenzen und vorhandene Lücken sind im maschinenlesbaren Inventar erhalten.

Angewandte Small-Business-Vorgaben: Router, `proposal-builder`, `cash-flow-snapshot` und `content-strategy` wurden aus dem gepinnten Anthropic-Stand geladen. Daraus folgen konkrete Umfänge, nachvollziehbare Preise/Kosten, fehlende Daten als unbekannt, Quellenbindung und getrennte Vorbereitung/Freigabe. Die vorhandene Projektfreigabe wird wiederverwendet; es gibt keine neue pauschale Onboarding- oder Auftragsfrage.

## 2. Was zum System gehört

| Ebene | Inhalt | Verantwortliche Grenze |
|---|---|---|
| Produkte | Agenturentwicklung, Web-/App-Lieferung, eigene Suite/NeX Agentic AIFly, TEILEKLAR, Werkstatt-/Nachbarschafts-/Affiliateleistungen. | Jedes Angebot braucht Umfang, Preis-/Vertragsfassung, tatsächliche Fähigkeit und Zuständigkeit. |
| Anwendungen | Öffentlicher Webauftritt, Selfservice-/Suite-Workspace, Kunden-/Shop-/Partnerflächen, interne Projekt-/Support-/Adminwerkzeuge. | Eine gemeinsame Gestaltung erteilt keine gemeinsamen Rechte. Öffentliche Seiten dürfen keine internen Kontrollen ersetzen. |
| Identitäten | Account, verifizierter Authentifizierungssubject, Tenant, Workspace, Mitgliedschaft und getrennte Leistungsberechtigung. | Identität bleibt bei Trial/Umwandlung erhalten; Rechte werden serverseitig aus aktuellem Zustand abgeleitet. |
| Verantwortung | Funktionale Abteilungen, benannte ausführende und prüfende Rollen, verantwortlicher Entscheider und Vertretung. | Eine Abteilung ist keine behauptete Beschäftigtenzahl oder bereits laufender Agent. |
| Arbeit | Workflowdefinition, konkreter Lauf, Zustand, Deadline, Budget, Lease und Endergebnis. | Ein Prompt, gespeicherter Zeitplan oder gestarteter Webserver ist kein nachgewiesener autonomer Arbeitslauf. |
| Anbieter und Modelle | Anbieteradapter, echte Kontoverbindung, Verarbeitungs-/Preisvertrag, Modellversion und Fundingroute. | Modellzahl, Anbieterzahl, Connectorzahl und Zahl der Werkzeuge sind verschiedene Größen. |
| Werkzeuge und Anleitungen | Getypte MCP/API/SDK-Operationen, REA-Funktionen, eigene Skills und Small-Business-Arbeitsanleitungen. | Katalogeintrag und Annotation sind keine Berechtigung; geladene Anleitung ist kein ausgeführter Workflow. |
| Wissen | Eigene Quellen, genehmigte Projektquellen, Versionen, Datenklassen, Fristen und Belege. | Ein logisches Brain rechtfertigt keinen gemeinsamen privaten Kundenindex und keinen erfundenen Zugriff auf alle ChatGPT-Chats. |
| Geld | Bestätigte Aufladung, Reservierung, tatsächlicher Verbrauch, Ledger, Beleg, Abstimmung und Korrekturfall. | Keine Gratisfinanzierung von LLMs, keine Doppelbuchung, keine Preis-/Steuerentscheidung aus Modelltext. |
| Qualität und Release | Testplan, konkrete Testergebnisse, unabhängiges Review, Freigabe und aktivierter Releasehash. | Umsetzer und unabhängiger Prüfer bleiben getrennt; vorhandene Main-/Jeff-/Produktivgates gelten. |
| Betrieb | Beobachtung, Zustellung, Incident, Sicherung, Restore, Vertretung und Lernen. | Geplante Routine wird erst nach echter Planung und Ausführung als aktiv bezeichnet. |

Der Kontakt Pascal Courbois ist in den Projektquellen benannt. Die tatsächliche B.V.-Betreiber-, Vertretungs-, Steuer- und Merchantidentität braucht weiterhin ihren eigenen Nachweis. Die alten Eenmanszaak-/Registerangaben werden nicht als heutige B.V.-Fakten übernommen.

## 3. Verantwortungsmodell

Die zwölf Bereiche sind funktionale Zuständigkeiten. Aktuelle menschliche Besetzung und Vertretung sind pro Bereich zu binden; die Definition erfindet keine Mitarbeiter oder externen Mandate. Fehlende Besetzung hält die betreffende folgenreiche Aktion, während andere bereits autorisierte Vorbereitung und Entwicklung weiterläuft.

| ID | Bereich / Owner | Verantwortet und liefert | Prüfung und Stop |
|---|---|---|---|
| D01 | Leitung und Strategie | Ziele, Priorisierung, Befugnisse, Produkt-/Releaseentscheidungen und Managementreview. | Kein genereller Freibrief für Geld, Recht, DNS oder fremde Daten. |
| D02 | Produkt und Finanzen | Produktumfang, Kosten-/Preisfassung, Funding, Ledgerabgleich, Rechnungs-/Abschlussunterlagen und Wettbewerbskalkulation. | Tatsächliche Quellen, konkreter Freigabeumfang und unabhängiger Abgleich; keine erfundene Marge oder Liquidität. |
| D03 | Vertrieb und CRM | Anfragequalifizierung, Anforderungsprofil, versionierter Angebotsentwurf und dokumentierte Entscheidung. | Empfänger, Umfang, Preisbasis und Angebotsversion müssen passen. |
| D04 | Marketing, Design und Inhalte | Produktkommunikation, Marken-/Seitenkonsistenz, Skripte, Assets und Veröffentlichungsvorlage. | Belege, Rechte, Budget und genaue Asset-/Zielfassung; keine erfundenen Referenzen oder Umsatzzusagen. |
| D05 | Projektleitung und Lieferung | Arbeitsauftrag, Abhängigkeiten, Termine, Berichte, Abnahme- und Übergabepaket. | Geänderter Umfang oder nicht erfüllte Abnahmebedingung bleibt sichtbar; Nacharbeit ist kein abgeschlossener Auftrag. |
| D06 | Entwicklung, KI und Integrationen | Auth-/Tenant-/API-/DB-Verträge, Modell-/Tooladapter, isolierte Umsetzung, Wissens- und Skillregister. | Keine Root-/Shellbrücke aus Nutzer- oder Modelltext, keine erratenen Provider-/Toolnamen und keine eigenen unabhängigen Abnahmen. |
| D07 | Unabhängige Qualität | Positiv-/Negativ-/Grenz-/Missbrauchsprüfungen, Review, Evidenzabgleich und Wirksamkeitsnachweis. | Prüfer nimmt eigene Änderungen nicht unabhängig ab; fehlgeschlagene Prüfung wird nicht als Gate-Pass gewertet. |
| D08 | Betrieb und technische Sicherheit | Erreichbarkeit, Auth-/Credentialgrenzen, Deployment-/Rollback-/Restorebelege und Incidentsteuerung. | Kundentrennung, unklarer Geld-/Außeneffekt oder fehlende Wiederherstellbarkeit stoppen den betroffenen Pfad. |
| D09 | Kundenservice und Posteingang | Tickets, Antwortentwürfe, Zustell-/Vorgangsstatus, Reklamationen und Übergabe. | Entwurf, Versandabsicht und bestätigte Zustellung getrennt; kein neuer Zahlungsempfänger aus untrusted Text. |
| D10 | TEILEKLAR Katalog und Commerce | Lizenzierter Katalog, Fitment, Bestand, Beschaffung, Auftrag, Versand und Rückkopplung aus Retouren. | Ohne belastbaren Fahrzeug-/Datenkontext kein „passt“; keine Liefer-/Bestandszusage aus Demodaten. |
| D11 | Werkstatt und Partner | Partnerprüfung, Standort-/Termin-/Gutschein-/Affiliateabläufe und belegte Ereignisse zur Abrechnung. | Externe Partnerrollen sehen nur eigene Ressourcen. Partneraufnahme oder Provisionsanspruch entsteht nicht durch bloße Anmeldung. |
| D12 | Recht, Datenschutz und KI-Governance | Zweck, Rechte, Fristen, Einwilligung, Betroffenenanfragen, Holds und fachliche Freigaben. | Keine automatische Rechtstext-/Aufbewahrungs-/Steuer- oder Betreiberentscheidung durch einen Agenten. |

Unterstützende Prozesse sind ebenfalls zugeordnet: Einkauf/Provider/Lizenzen an D02 mit D06/D12; Personal/Kompetenzen/Payrollvorbereitung an D02 mit D12; Dokumentenlenkung an D12/D07; Werkzeug-/Supply-Chain-Prüfung an D06/D08; Vertragsende/Export an D09/D12; Managementreview und Verbesserungen an D01/D07. KI bereitet Personal-/Finanzentscheidungen vor, erhält aber keine eigenständige rechtliche Vertretung oder Zahlungsbefugnis.

## 4. Rollen und Berechtigungen

Außenrollen sind Besucher, registrierter Kunde, verifizierter Trialkunde, bezahlter Kunde, Shopkunde oder eng gebundener Gast, Werkstattpartner, Nachbarschaftskunde und Affiliate. Innenrollen umfassen Projekt-/Support-/Content-/Finanz-/Betriebsverantwortliche sowie getrennte Projekt-/Governanceprüfer. Technische Dienstidentitäten bekommen nur die benötigte Audience, den Tenant, die Operation und den zeitlich begrenzten Scope.

Eine Trial- oder Zahlberechtigung ist keine neue Adminrolle. Selfservice legt ausschließlich eine serverseitig gebundene Kundenmitgliedschaft an. `company_owner`, `tenant_admin`, interne Betriebs-, Finanz- oder Governanceprivilegien können nicht durch Formularfelder, Tokenclaims aus unbestätigter Quelle, Bezahlung oder einen Portalnamen gewählt werden.

Vor jeder Operation gilt die Schnittmenge aus gültiger Identität, aktuellem Account-/Sitzungszustand, Mitgliedschaft, Tenant, Ressourceneigentum, Aktionsscope, Funding/Budget und gegebenenfalls konkret erforderlicher Freigabe. Fehlende oder ungültige mitgelieferte Credentials führen nicht zum Gast-Fallback. Ein Tenantheader wählt Kontext, erteilt aber kein Zugriffsrecht. RLS, eigene Objektkontrolle, Export-/Storage-/Queue-/Suchfilter und Cachebindung müssen dieselbe Grenze erhalten.

Die bereits erteilte Umsetzungsfreigabe deckt beauftragte reversible Entwicklung und Prüfung ab. Bei einer späteren Kundenaktion wird deren bestehender konkreter Umfang verwendet. Es entsteht weder eine pauschale erneute Chat-Freigaberunde noch ein Recht, neue Empfänger, Beträge, Ziele oder Rechtsverhältnisse aus gelesenen Inhalten zu erzeugen.

## 5. Verbindlicher öffentlicher Selfservice

### 5.1 Registrierung und Beginn der kostenlosen Suitezeit

Öffentliche Kundenregistrierung ist erlaubt. Der Kunde erhält **24 Stunden kostenlose Suite-Nutzung**. Kostenpflichtiger LLM-Verbrauch gehört nicht zu diesem Geschenk.

Technische Startregel: Die E-Mail ist serverseitig verifiziert, der eigene Kundenworkspace erfolgreich aktiviert und die Zugangsnutzung vom authentifizierten Kunden ausdrücklich gestartet. Erst wenn diese Bedingungen vorliegen, schreibt eine Transaktion einmalig `started_at` und `expires_at = started_at + 86.400 Sekunden` aus der Serverzeit in UTC. Damit läuft die Zeit nicht schon ab, während eine nicht zugestellte Verifikationsmail oder ein fehlgeschlagener Workspaceaufbau den Zugang verhindert.

Wiederholte Aktivierung, parallele Requests, erneutes Login, Schlüsselwechsel, neuer Checkout und Zeitzonen-/Sommerzeitwechsel verändern das gespeicherte Fenster nicht. Anzeigezeiten werden in Europe/Amsterdam dargestellt; das Intervall bleibt exakt zeitbasiert. Neue Aliase oder zusätzliche Workspaces setzen einen bestehenden initialen Account-Trial nicht zurück.

Ein Clientfeld wie `verified=true`, `trial_expires_at` oder `role=admin` ist niemals der Nachweis. Verifikation und Mitgliedschaft stammen aus dem tatsächlich geprüften Auth-/Serververtrag. Die eigene Suite-Zeit darf genutzt werden, bevor eine Fundingoption gewählt wurde; ohne solche Option wird keine kostenpflichtige LLM-Anfrage gestellt.

### 5.2 LLM-Funding: eigener Anbieter oder bezahlter Test

Es gibt **kein kostenloses, durch NeXify finanziertes LLM-Guthaben**. Vor jeder entsprechenden Anfrage muss eine von zwei eindeutig gewählten und serverseitig geprüften Grundlagen bestehen:

| Weg | Was der Kunde finanziert | Kontrolle |
|---|---|---|
| BYOK | Nutzung des eigenen Kontos beim gewählten Anbieter. | Eigentümer-/Tenantbindung, tatsächlich validierter Anbieter-/Modellvertrag und serverseitig verschlüsselter Schlüsselverweis. Kein heimlicher Wechsel auf den NeXify-Schlüssel bei Fehler, leerem Anbieterkonto oder fehlendem Key. |
| Managed Trial | Die ausdrücklich genehmigte **Testaufladung EUR 5 = 500 Cent** für die vorgesehene NeXify-Kombination. | Nur nach konkreter Kundenentscheidung und autoritativ bestätigtem passenden Zahlungseingang; Kostenreserve vor Ausführung, tatsächlicher Verbrauch genau einmal. |

Provider-Keys gehören verschlüsselt in den serverseitigen Secret-/Vaultbereich. Sie werden nicht in `localStorage`/`sessionStorage`, URLs, Logs oder öffentlichen Antworten gespeichert. Eine Browserangabe „Key gültig“ beweist keine Verbindung. Wechsel und Widerruf erhalten dieselbe Account-/Tenantbindung und erzeugen keine neuen Trialstunden.

Für die Managed-Kombination ist `deepseek/deepseek-v4.1-flash-1017` über OpenRouter mit Reasoning `high` exakt verifiziert. Der zusätzlich vom Nutzer bezeichnete Bestandteil **„JavAI“ ist anhand der aktuellen Quellen nicht eindeutig gebunden**. Der historische `NX_ORAKEL_MODEL`-Default `openrouter/typesafe/jev-1.13` und die ältere Notiz, dass „jev ai“ nicht gefunden wurde, sind kein Nachweis einer Identität oder eines aktuellen Providervertrags. Keine stille Ersetzung. D06 klärt den tatsächlichen Anbieter-/Modellvertrag, D02 prüft Kosten/Leistungsumfang. Bis dahin darf die Kombination nicht als betriebsbereit verkauft oder mit einem geratenen zweiten Modell ausgeführt werden; der BYOK-Pfad und andere autorisierte Arbeit bleiben davon unabhängig.

### 5.3 Die EUR-5-Ausnahme ändert keine normalen Aufladegrenzen

Die neue 500-Cent-Regel ist eine **ausdrückliche Trial-Ausnahme** mit eigenem Zweck und Beleg. `config/api-prepaid.json` bleibt unverändert bei der aktuellen normalen Mindestaufladung **1.000 Cent**. Ältere Dokumente nennen **5.000 Cent**; das ist ein Quellenwiderspruch für D02, keine neue Nutzeranordnung. In dieser Arbeit wird kein allgemeines Mindestguthaben umgestellt.

Ein initialer Trial-Zuschuss wird nicht bei jeder neuen Registrierung, Wiedervorlage oder Rechnung erneut freigeschaltet. Die Ausnahme braucht vorhandenen Trial-/Account-/Tenantbezug und einen eigenen Zahlungszweck. Die Zahlungskontrolle bindet Providerzahlungs-ID, Merchantkonto, Kundenaccount, Tenant, Zweck, Betrag, Währung und maßgeblichen abgeschlossenen Providerzustand. Ein Checkoutredirect, Clientfeld `paid`, bloß autorisiertes Ereignis oder bereits gesehene Event-ID erzeugt keine neue Gutschrift.

Beleg/Deduplizierung, Ledgergutschrift und Vorgangsstatus werden atomar gespeichert. Wiederholte identische Bestätigung hat dieselbe Wirkung; anderer Payload unter gleichem Schlüssel führt zu Konflikt. Ein unklarer externer Ausgang wird abgeglichen, bevor eine weitere Zahlung oder Generierung ausgelöst wird. Eine freigegebene Preis-/Steuer-/Rechnungsfassung und betriebsfähige Route sind Voraussetzungen für ein neues zahlbares Managed-Testangebot. Die Definition führt keine Zahlung aus und erfindet keine Steuerbehandlung.

### 5.4 Ende und Umwandlung erhalten Identität und Einstellungen

Nach Ablauf wird die Trialberechtigung beendet, nicht der Account neu erstellt oder der Tenant gelöscht. Datenrechte und der zulässige Zugriff auf vorhandene Unterlagen bleiben. Bereits gekauftes Testguthaben verschwindet nicht mit dem kostenlosen Suitefenster; weitere Nutzung oder Rückabwicklung folgt dem tatsächlichen Vertrag. Es gibt keinen automatischen Aboabschluss oder Lastschrifteinzug am Trialende.

Die 500-Cent-Aufladung kauft Modellguthaben, nicht automatisch einen bezahlten Suiteplan. Eine Umwandlung benötigt den gewählten freigegebenen Plan und dessen ausdrückliche Annahme. Dabei bleiben Account-ID, Authentifizierungssubject, Tenant-ID, Workspace-ID, Einstellungen, verschlüsselte Keyreferenzen, Dokument-/Historienbezüge und Wallet-/Ledgerreferenzen erhalten. Leistungsberechtigungen können gemäß Vertrag wechseln; daraus entstehen keine Agentur-Adminrechte. Kunden sollen weder ihre Integrationen neu verbinden noch ihre Konfiguration in einen zweiten Tenant kopieren müssen.

### 5.5 Anbieterzahl messen

„70+ eigene Anbieter“ ist das Nutzerziel. Gezählt werden getrennt: installierte unterstützte Provideradapter, konfigurierte Kontoverbindungen, erfolgreich autorisierte/erreichbare Verbindungen und verfügbare Modelle. Drei Modellstufen, 44 Skills, MCP-Werkzeuge oder 35 Business-Connector-Deklarationen sind keine 70 LLM-Anbieter.

Beim eng dokumentierten Repository-Scan enthält das aktuelle Besucher-Gateway `model_chat=false` und keinen nachgewiesenen Suite-BYOK-Provideradapter. Die bestehende `9router`-Konfiguration ist ausdrücklich ungeprüfter Sollstand. Gemessen sind hier deshalb **0 in dieser Quellsicht nachgewiesene Suite-Provideradapter**; separat ist ein OpenRouter-Client für CI-Reviews implementiert. Daraus folgt keine Aussage, dass auf den externen VPS keine Anbieter installiert seien. Scanumfang, Zeit und Quellhashes stehen in der Selfservicepolicy. Nach neuer Adapterinstallation ist die tatsächliche Laufzeitregistry erneut zu messen; ohne diese Prüfung wird keine Zielzahl als erreicht ausgegeben.

## 6. End-to-End-Prozesslandkarte

Jeder der folgenden Abläufe besitzt in `config/operating-model.json` Auslöser, Owner, Zustände, API-Zuordnung, erforderliche neue Fähigkeiten, Testplan, Evidenz, unabhängige Prüfung und Stops. Die API-Zuordnung verwendet den vorhandenen **Zielvertrag**; neue erforderliche Fähigkeiten werden ausdrücklich nicht als vorhandener Endpoint ausgegeben.

| Ablauf | Auslöser → Ergebnis | Owner / Mitprüfung | Entscheidender Test- und Evidenzpunkt |
|---|---|---|---|
| OM-01 Anfrage/CRM | Formular, Chat oder zugeordnete Mail → persistierter und qualifizierter Vorgang mit Antwortentwurf/Übergabe. | D03 mit D09/D12 | Kein ACK vor Persistenz, kein Gast-Fallback bei falscher Identität, keine falsche Zustellbehauptung. |
| OM-02 Selfservice | Kundenregistrierung → Verifikation → aktivierter 24h-Trial → Fundingwahl → Ablauf oder stabile Umwandlung. | D06 mit D02/D07/D12 | Serverclock, Startreplay/Race, fremder Tenant, Admineskalation, EUR-5-Beleg und ID-/Settingskontinuität. |
| OM-03 Angebot/Auftrag | Qualifiziertes Anliegen → abgegrenztes Profil → versioniertes Angebot → dokumentierte Annahme/Ablehnung. | D03 mit D02/D05/D07 | Preisquelle, konkrete Fassung, Annahmeberechtigung, Zustellung und unveränderter Scope. |
| OM-04 Umsetzung/Release | Freigegebener Auftrag → isolierte Änderung → Tests → unabhängiges Review → gebundener Release → Nachprüfung. | D05 mit D06/D07/D08 | Commit-/Artefakthash, Negativfälle, Rollback und tatsächliche Aktivierung; lokales Backup ist kein Livegang. |
| OM-05 Inhalte/Medien | Benannter Produkt-/Seitenbedarf → Skript/Asset → Sichtprüfung → konkrete Veröffentlichung. | D04 mit D02/D07/D12 | Rechte/Quellen, vorhandene Clips zuerst, Stimme, Untertitel, Ausgabehash und freigegebene Zielseite. |
| OM-06 Finanzierte KI | Berechtigter Vorgang → geprüfter BYOK-/Guthabenpfad → Reserve → begrenzte Ausführung → echte Nutzungsabrechnung. | D06 mit D02/D07/D12 | Kein kostenfreier Betreiberfallback, keine fremden Keys, Budget-/Expirygrenze, genau ein Abrechnungseffekt. |
| OM-07 Geld/Monatsabgleich | Aufladung, Providerereignis oder Abschlussperiode → bestätigtes Ledger und Beleg/Abgleich. | D02 mit D07/D12 | Betrag/Währung/Zweck, doppelte Events, Crash vor/nach Buchung, Hold und echte Korrekturfreigabe. |
| OM-08 TEILEKLAR-Commerce | Lizenzierter Feed/Fahrzeugbedarf → belegte Passung → echter Auftrag → Versand/Zustellung. | D10 mit D02/D07/D09/D12 | Unklare Passung bleibt unklar/gesperrt; Bestand, Preis, Zahlung und Lieferbeleg stammen aus realen Quellen. |
| OM-09 Werkstatt/Gutschein | Partnerantrag oder Bedarf → Partnerprüfung → Termin/Gutschein → belegte Durchführung und Abrechnung. | D11 mit D07/D09/D10 | Fremder Standort, Doppelbuchung, einmalige Einlösung, Anfrage versus externe Bestätigung. |
| OM-10 Affiliate | Zugelassene Empfehlung → richtige Attribution → geprüfter Anspruch → genehmigte Auszahlung. | D11 mit D02/D07/D12 | Eigen-/Doppelzuordnung, Storno, echte Zahlung und konkreter Provisionsvertrag. |
| OM-11 Service/Retoure | Ticket/Abweichung/Rückgabewunsch → zugeordneter Fall → freigegebene Lösung → Wirksamkeits-/Zustellnachweis. | D09 mit D02/D07/D10/D12 | Gastrechte ohne erzwungene Kontoanlage; kein Refund an einen unbestätigten neuen Empfänger. |
| OM-12 Wissen/Tools | Autorisierte Quelle oder geprüfter Connector → normalisierte Fassung → Index/Read-back → überprüfte Promotion. | D06 mit D07/D12 | Tenant/ID/Version/Inhalt passen exakt; Quelltext erteilt keine Rechte, Index-200 ist kein Inhaltserfolg. |
| OM-13 Recht/Datenschutz | Anfrage oder Risiko → Identität/Umfang → Bearbeitung/Hold → nachvollziehbarer Abschluss. | D12 mit D07/D08/D09 | Fristen, zulässige Datenbereiche, Finanzaufbewahrung, tatsächlicher Export-/Löschnachweis. |
| OM-14 Betrieb/Incident | Beobachtete Abweichung oder Restorebedarf → Eingrenzung → genehmigte Maßnahme → tatsächlicher Wiederanlauf. | D08 mit D07/D12 | Rechte und Geldzustände nach Restore, tatsächliche Alarmzustellung, keine freie Host-/DNS-Reparatur. |
| OM-15 Produkt/Finanzen | Produktfrage oder neue Marktdaten → belegter Vergleich → Kostenmodell → geprüfte Preis-/Produktentscheidung. | D02 mit D01/D03/D04/D07 | Echte datierte Quellen, vergleichbare Einheiten und klare Unbekannte; kein Kundeneinzug aus einem Vergleich. |

Die unterstützenden Backoffice-Abläufe für Buchhaltungsabschluss, Steuervorbereitung, Recruiting und Payroll verwenden die passenden Small-Business-Anleitungen nur mit tatsächlichen Quellen und Zuständigkeiten. Keine dieser Anleitungen erzeugt durch ihre Installation einen Zahlungsauftrag, eine Personaleinstellung oder einen wiederkehrenden Scheduler.

## 7. Einheitliche Qualitäts- und Evidenzkette

Jede Änderung beginnt mit einem Testplan für den vereinbarten Erfolg und die verbotenen Gegenfälle. Danach folgt isolierte Umsetzung, Syntax-/Typ-/Buildprüfung, Verhalten und Gegenprüfung über Komponenten-/Daten-/Providergrenzen. Mindestens passende fehlende/falsche Identität, fremder Tenant/Owner, Replay/Payloadkonflikt, Konkurrenz, Budget/Deadline, Providerfehler und Rollback beziehungsweise Reconciliation werden aufgenommen.

Ein Evidenzpaket bindet Tenant/Projekt, Workflow-/Run-/Korrelations-ID, konkreten Commit, Eingabe-/Artefakthash, Schema-/Policy-/Preisfassung, Testbefehle und tatsächliche Ergebnisse. Prüferidentität und Unabhängigkeit, Freigabeumfang, aktuelle Berechtigung sowie das exakt zurückgelesene Ergebnis bleiben erhalten. Bei Modellen und Zahlungen kommen tatsächliche Nutzung, Betrag/Währung, Providerreferenz und Abgleichzustand hinzu.

„Unit grün“, „OpenAPI valide“, „Vorschau sichtbar“, „ZIP gebaut“, „Job erzeugt“, „Outbox geschrieben“, „Provider akzeptiert“ und „vom Empfänger erhalten“ sind unterschiedliche Belege. Eine Abnahme darf ihre Aussage nicht über die tatsächlich geprüfte Schicht hinaus erweitern. KI-Review bleibt eine zusätzliche Prüfung; es kann keine Hartsperre, unabhängige Identität oder Betreiberfreigabe überstimmen.

Die vorhandenen `make check`, `make test`, Architektur-/Quellen-/Vertragsprüfungen und die gezielten Runtime-/Browser-/DB-Gegenproben bilden technische Nachweise des jeweiligen Quellstands. Die repositorydefinierte E2E-Kette ist kein automatischer Beweis aller noch fehlenden Geschäftsprozesse. Ein `dirty`-Release kann eine ehrliche lokale Sicherung sein, aber kein stillschweigendes Produktiv-Go für einen ungeprüften Zustand.

## 8. Dauerhafte Ausführung und Betrieb

Ereignisse tragen Quelle, Event-ID, Tenant, Projekt, Workflow/Run, Korrelation, Schema-/Policyversion, Zeit, Inhaltshash, Datenklasse und Frist. Inbox/Outbox und die fachlichen Änderungen werden passend atomar gespeichert; wiederholte Zustellung vervielfacht keinen Effekt. Lange Läufe besitzen einen eindeutigen Leaseinhaber, Checkpoints, begrenztes Budget und Deadline. Sie enden abgeschlossen/fehlgeschlagen/abgebrochen oder warten sichtbar mit benanntem Owner.

Unbekannter externer Ausgang ist ein eigener Reconciliationzustand. Keine unbegrenzten Wiederholungen von Zahlung, Versand oder kostenpflichtiger Modell-/Medienerstellung. Dead Letter und offene Nacharbeiten bleiben im Cockpit sichtbar und bekommen eine Zuständigkeit, statt als Erfolg verschwinden zu dürfen.

Tägliche Kontrolle: Eingänge und Nachtabweichungen, unbestätigte Providerzahlungen/-aktionen, fehlgeschlagene Jobs, Kosten-/Trial-/Rollenwächter und Katalog-/Terminabweichungen. Wöchentliche Kontrolle: Lieferung/Pipeline, Fitment/Retouren, Partnerqualität, Zugriffs-/Quellendrift und geeignete Restore-/Replaygegenproben. Monatliche Kontrolle: Abstimmung/Belege, echte Produktkosten, Preis-/Leistungsentscheidungen, Retention/Verträge und Verbesserungen. Diese Rhythmik ist eine Betriebsanforderung; ein tatsächlicher Zeitplan wird erst nach bestätigter Schedulerbindung und Zustellprobe als aktiv geführt.

Messungen gehören zu einer Definition und einer vollständigen Quelle: D02 führt belegten Deckungsbeitrag/Abgleichfälle, D03 qualifizierte Vorgangsübergänge, D04 nachvollziehbare Inhaltsfreigaben/Kanalzuordnung, D05 Abnahme/Abweichung, D06 Rechte-/Adaptergegenproben, D07 Befundwirksamkeit, D08 echte Erreichbarkeit/Restore, D09 Zustellung/Lösung, D10 Passungs-/Retourengründe und D11 bestätigte Partnerereignisse. Ohne geeignete Daten lautet der Wert unbekannt. Keine fiktiven SLA-, Verfügbarkeits- oder Umsatzerfüllungen.

## 9. Incident, Wiederherstellung und Verbesserung

Tenant-/Credentialleck, unrichtiger Betrag, doppelte Buchung, unklarer Außeneffekt, ausgefallener Widerruf/Fundingguard, sicherheitsrelevanter Fitmentfall und fehlgeschlagener Restore erzeugen einen Incident. D08 korreliert und grenzt den betroffenen Pfad ein; fachlich wirken D02, D07, D09, D10 und D12 nach Fall mit.

Ablauf: erkennen → betroffene Daten/Dienste bestimmen → eng eingrenzen und Evidenz sichern → Wirkung abgleichen → konkrete Maßnahme autorisieren → rücksetzen/wiederherstellen → Identitäten, Guthaben, Daten und tatsächliche Zustellung gegenprüfen → berechtigte Empfänger informieren → Ursache und Regression dokumentieren.

Schattentest und Runbooktext sind keine aktive Selbstheilung. Reboot, Live-DNS, vollständige Firewalländerung, Löschung, Geld und neue Außenwirkung behalten die konkret geltenden Gates. Fehlende RTO/RPO-/Kunden-SLA- oder Rechtsfakten werden dem zuständigen Bereich zugewiesen und vor entsprechender Zusage festgelegt. Historische Planfristen werden nicht als heutiger Vertrag ausgegeben. Nach einer Wiederherstellung müssen auch Widerrufe, Tenanttrennung, Idempotenz und finanzielle Referenzen noch stimmen.

## 10. Auftrag an Produkt-/Finanzteam: zehn relevante Wettbewerber

D02 verantwortet `PF-COMPETITIVE-10`, mit D03/D04/D06 und unabhängiger D07-Prüfung. Zuerst werden Zielkunde, Markt, Stichtag und die Kriterien für „stärkste relevante Wettbewerber“ festgelegt. Dann werden zehn Auswahlentscheidungen anhand tatsächlich gelieferter Überschneidung, nachprüfbarer Pläne/Preise, BYOK-/Modellfinanzierung, Identitäts-/Datenkontinuität, Integrationen, Betrieb und Support begründet.

Jede Preiszeile bindet Primärquelle, Datum, Währung, Steuerdarstellung, Zeitraum/Einheit, Nutzer-/Modell-/Verbrauchsgrenzen und enthaltene Leistung. Listenpreis, Einstiegspreis, Jahresbindung, Modellcredits und BYOK werden nicht als derselbe Preis verglichen. Unsichere Angaben bleiben offen, statt eine fiktive Rangliste oder „billiger als“-Aussage zu erzeugen.

Lieferung: datierte Vergleichsmatrix, belegte Kosten-/Preisinputs und Sensitivitäten, getrennte Lücken, konkreter Produkt-/Preisvorschlag und prüfbare Kundendarstellung. Die Auswahl oder Kalkulation löst keine automatische Tarifänderung oder Abbuchung aus. Diese Definition weist den Auftrag zu; sie behauptet nicht, die zehn Vergleichsergebnisse bereits recherchiert zu haben.

## 11. Kontrolliert offene Punkte und nächster sicherer Schritt

| Kontrollpunkt | Owner | Erforderlicher Nachweis / erlaubte Weiterarbeit |
|---|---|---|
| Tatsächliche B.V.-/Merchant-/Steuer-/Vertragsidentität | D12/D02 | Reale Unterlagen und konkrete Bindung; lokale Umsetzung und Entwürfe laufen weiter. |
| Öffentliche Auth-/Trial-/Funding-/Umwandlungsintegration | D06/D07/D02 | Echte HTTP/Auth/DB/Providergegenproben; Domainkern und Tests sind zulässige Zwischenschritte. |
| JavAI-Vertrag und Managed-Kombination | D06/D02 | Eindeutige Zuordnung, Kosten-/Verarbeitungs- und Fähigkeitsevidenz; kein geratenes Ersatzmodell. |
| 70+-Providerziel | D06 | Installierte Adapter und reale Verbindungen getrennt inventarisieren und messen; nur geprüfte Teilmenge ausweisen. |
| TEILEKLAR-Verkauf und Partnerabrechnung | D10/D11/D02 | Datenrechte, Bestand, Passung, Zahlung, Versand, Gastrechte und tatsächliche Partnerereignisse; UI-/Datenmodelltests bleiben möglich. |
| Nachrichten, Kalender, Medien, Brain und Veröffentlichung | Zuständiger Domainowner/D08 | Konkreter Connector, Auth-/Scope-/Budgetbindung, tatsächliche Lieferung und Read-back; eigene vorbereitete Artefakte bleiben nutzbar. |
| Laufender Betrieb, Vertretung und Restore | D08/D01 | Echte Besetzung, Scheduler-/Incident-/Zustell- und Wiederherstellungsnachweise; keine Dauerbetriebsbehauptung aus einer gespeicherten Zielakte. |

Jeder offene Punkt hat einen begrenzten Aktionsumfang. Die Regel ist gezielte Sperre und benannter Ausweg, nicht Stillstand des gesamten Vorhabens. Die Gesamtfertigstellung wird erst dann gemeldet, wenn die definierten Abläufe über ihre tatsächlichen Rechte-, Daten-, Geld-, Provider- und Betriebsgrenzen hinweg nachgewiesen sind.


## 12. Verbindliche Reihenfolge: Fertigstellung, Vermarktung, SEO und GEO

Nutzerentscheidung vom 26.10.2026: Der Fokus bleibt auf der Fertigstellung des
Gesamtsystems. Marketing einschließlich Mailings und aller eigenen Social-Kanäle
gehört zum Gesamtauftrag, wird aber erst aktiviert, wenn die übrige Lösung steht
und die Betriebsfähigkeit nachgewiesen ist. Diese Vormerkung ist keine jetzige
Versand- oder Veröffentlichungsaktion.

D04 führt mit D03/D08/D12 das Kanalinventar, reale Account-/Connectorbindungen,
Inhalte, Medien, Versand-/Veröffentlichungswege, zulässige Empfänger,
Abmeldung, Zeitplanung und Messung zusammen. Ein Plan oder ein erstellter Entwurf
gilt nicht als laufendes Marketing; entscheidend sind tatsächliche Zustellung,
Veröffentlichung und Betriebsnachweise.

Die umfassenden SEO-Arbeiten sind weiterhin offen. D04/D05/D07 verantworten
Indexierungs-/Canonicalstrategie, Seitenarchitektur und interne Verlinkung,
belastbare Produkt-/Leistungsinhalte, Metadaten und zulässige strukturierte Daten,
Leistung, Zugänglichkeit und Messung. Eine funktionierende Vorschau mit bewusstem
Noindex ist kein fertiger SEO-Betrieb.

GEO (Generative Engine Optimization) baut auf dieser SEO-Grundlage auf und wird
jetzt ausdrücklich nicht vorgezogen. Es folgt erst auf das fertige Gesamtsystem,
die geprüfte SEO-Basis und laufende Vermarktung. Ziel sind korrekte Auffindbarkeit
und passende Empfehlungsmöglichkeiten in ChatGPT und anderen Antwortsystemen.
Eine konkrete Empfehlung oder Rangfolge lässt sich weder erzwingen noch
zusagen. Maschinenlesbare Reihenfolge und Zuständigkeiten stehen unter
`go_to_market_sequence` in `config/operating-model.json`.

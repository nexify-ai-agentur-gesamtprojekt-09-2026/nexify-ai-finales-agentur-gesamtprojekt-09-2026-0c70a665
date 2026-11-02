# NeXify · SOLL-, Abweichungs- und Fertigstellungsbericht

Version 1 · 01.11.2026 · Auftrag GOAL-NEXIFY-COMPLETION-20261101

**Gesamtstatus: offen.** Die neue Site ist ein eigener privater Webclient. Ein erfolgreicher Teilbuild ersetzt weder den produktiven Backendbetrieb noch die Gesamtfreigabe. Dieser Bericht ergänzt dasselbe führende Anforderungenregister; er ist keine zweite Taskqueue.

## Quellenrang und ehrlicher SOLL

Führend ist der bestehende Gesamtplan v3, Revision 2, Library-Version 4. Seine 26 Pflichtpakete bleiben vollständig im Umfang. Der vorhandene Master v2.1 mit City-, Portal-, Finance-, Medien-, Lern- und Normen-Detailverträgen bleibt darunter erhalten. Neue Nutzerentscheidungen gelten im jeweils betroffenen Umfang vor historischen Fassungen. Nicht zugängliche Chats, weitere Providerkonten und nicht geprüfte Laufzeiten sind ausdrücklich keine als gelesen oder funktionsfähig behaupteten Quellen.

Der vollständige übernommene Plan umfasst 2,029,181 Bytes / 18091 Zeilen; SHA-256 `abaae8524fa231265ca16183504da13cb9e78602e9b94ae3ac71dfac030d20ea`. Aktuelle normative Aufbaukarte gelesen, historische Anhänge indexiert und relevante Fachabschnitte gezielt geprüft. Inventur, Inhaltslektüre und Abnahme sind verschiedene Nachweisstufen.

GitHub-main ist frisch auf `ad4bbf69243b7d489594a8c2d20d7cf838dcf14c` gelesen. Der führende Designbranch `conflict_011126_0014@8fc8a3ba5ebeb72c6361a86b0bd9ebc118008859` ist vollständig darin enthalten; main liegt vier Commits weiter. Kein Rücksetzen auf eine ältere Gestaltung. Die aktuelle Vercel-Preview meldet READY an einem anderen, divergierenden Zweig: `conflict_011126_2103@2c3059a83cff3193f81ebbe64afacc49b04e9ac1` (17 voraus, 58 zurück). Keine dieser Zahlen ist eine Funktionsabnahme; diese Quelle wurde nicht blind übernommen.

## Verbindliche Fertigstellungspakete

Die 26 Pakete sind exakt an die Zeilen der führenden Aufbaukarte gebunden. Das ist Paketcoverage, noch kein vollständiger Master-ID-zu-Implementierung-zu-Test-Crosswalk; dieser Detailnachweis bleibt offen.
Fachowner bezeichnen Zuständigkeiten, keine automatisch besetzten Daueragenten. Jeder konkrete Schreibumfang erhält genau einen Writer und einen getrennten Reviewer. Alle Pakete bleiben bis zur echten fachlichen/technischen Abnahme offen. Neue kostenpflichtige Wirkungen, neue Zugänge und öffentliche Umstellungen werden durch diesen Plan nicht zusätzlich freigegeben.

| Paket | SOLL-Ergebnis | Fachowner | Abhängigkeit | Abnahme / Rückweg |
|---|---|---|---|---|
| P01 Auftrag/CRM | Anfrage, Quelle, Kontakt, Tenant, Projekt, Scope, Owner, Termin, Budget, Version und Auftrag verbinden | Backend/Portale | Identität, berechtigte Eingangskanäle | Anfrage → Briefing → Fassung des Angebots → autorisierte Annahme → Projekt; Dedupe/Änderung/Abbruch. Vorzustand/Version erhalten. |
| P02 Design | Gemeinsame semantische Tokens, Originallogos, Figuren, Schriftrollen, Raster, Cards/Sections, Material/Noise, Komponenten und Zustände | Grafik/Brand und UX/Frontend | Führendes Repository-Design conflict_011126_0014 und Assetrechte | Gleiches System über alle Seiten, Dark/Light, 320 px/200 % Text, Tastatur, Reduced Motion; Rückkehr zur vorigen Designversion. |
| P03 Seiten/Redaktion | 49 registrierte Routen plus eigenständige Unteransichten, Nutzerfrage, Struktur, echte CTA, Inhalte/Metadaten/Sprachen | UX/Frontend/Redaktion | Originalprototypen, Inhalt/Fakten | Alle Aktionen haben erreichbares Ziel und Fehlerweg; eigene Kundentexte entstehen aus realer Funktion. Originale/alte Pfade erhalten. |
| P04 Medien | Je Route und relevantem Abschnitt Szenenzweck, Text, Regie, Figur, Sprache, Medienexport, Rechte und Bedienung | Grafik/Brand | Charakterbibel, Originalfiguren, echte Video-/Audiofiles | Sichtbare vollständige Figuren, tatsächliche transparente Einbettung, Untertitel/Transkript/Pause/Ton, Seitenprüfung; Rückweg auf vorherige freigegebene Datei. |
| P05 Suitezugang | Privat/Business, Entitlement, bewusst gestarteter 24-h-Test, 30-Tage-Berechtigung, NeX mit AIFly, Add-ons ohne Doppelgebühr | Backend/Portale | Verifizierte Identität, Produkt-/Preis-/Fundingvertrag | Parallelität, Serverzeit, Ablauf, Wiederholung, Upgrade, fremder Tenant; bezahlte Datenansichten bei fehlendem Modellfunding erhalten. |
| P06 Arbeitsplatz | Navigation, Chat, Oracle-Status, tatsächlicher Browser-/Artefakt-/PDF-Bereich, geschlossener zentrierter Chat | UX/Frontend und Backend/Portale | Session/Projekt, berechtigte Tools | Verlauf erhalten, Datei/Artefakt bearbeiten, Fehler/Cancel/Resume, mobile Tastatur, Resize; keine verdeckten Inhalte. |
| P07 API/Kosten | Schlüssel, Kostenstelle, Entitlement, Schätzung, Reservierung, Usage, Journal, Abrechnung, Refundpfad | Backend/Portale und Finance | Auth/Tenant, Provider- und Preisvertrag | Keine Doppelbuchung oder negativer Saldo bei Parallelität; fehlendes Funding stoppt Kostenaktion. Unklarer Providererfolg wird abgeglichen. |
| P08 Produktdaten | Lieferantenrohstand, SKU/EAN/Variante, Kategorie, Rechte, Bild, Maße, Quelle/Zeit, Produktstatus | Shop | Reale Datenquelle, Nutzungsrecht, Pagination/Quota | Exakte tatsächliche Zeilen/IDs, reproduzierbare Normalisierung, Dedupe/Delta, Quarantäne und Rückkehr zum vorigen Snapshot. |
| P09 Passung/Beratung | Fahrzeugvariante, Achse/Bauzeit/Maße, Quelle, Status, Bedingungen, Zubehör mit Begründung | Shop | Lizenzierter Fitmentbeleg und Produktdaten | Kein Name/Bild als Fitmentbeweis; Mehrdeutigkeit klären, Sicherheitsfälle sperren; kein Kauf aufgrund verlorenen Fahrzeugkontexts. |
| P10 Kauf | Serverseitiger Cart, Varianten/Mengen, Marktpreis, Steuer/Versand/Pfand, Order, Zahlungsstatus | Shop und Finance | P08/P09, freigegebene Kalkulation, Providerrechte | Preis-/Bestandsänderung, Gast/Konto, doppelter Klick, Reload, abgebrochene Zahlung, Webhook/Readback; Bestell-/Zahlungs-/Annahmestatus getrennt. |
| P11 Lieferung/Nachkauf | Beschaffung, Versand/Tracking, Teilsendung, Retoure, Widerruf/Mangel/Fehlpassung, Refund/Beleg | Shop/Betrieb | Supplier-/OMS-/Versand-/Zahlungsadapter | Echte Wiederaufnahme, keine doppelte Order/Erstattung; Sicherheitsrückkopplung in Katalog; Belege nicht überschreiben. |
| P12 Stadt/Werkstatt | Land/Ort/Einzugsgebiet, reale Betriebe, Quellen/Koordinaten/Leistungen, Profile, gegenseitige Links | Shop/Partner und Redaktion | Freigegebene Projektion und tatsächliche Daten | Stadt → Betrieb → Anfrage und zurück; Nulltreffer/fehlende Koordinaten/Duplikate; Metadatum ist kein Adressbestand. |
| P13 Partner | Betriebsnachweise, Vereinbarung, Profilentwurf/Review/Freigabe, Portalrollen und echte Anfragen | Partner/Backend | Qualifikation/Versicherung, Verantwortlicher, Auth | Verzeichnisbetrieb bleibt ohne Vertrag Nichtpartner; suspendiertes Profil, Änderung und Widerruf geprüft. |
| P14 Termin/Gutschein | Coupon/Charge/Einlösung, Terminversion, Gegenseite, Teilnahmebehauptung, Widerspruch, Abrechnungsposition | Partner/Finance | P12/P13, bestätigte Konditionsfassung | No-show/Widerspruch sperren unberechtigte Abrechnung; Fristlaufkonkurrenz, Doppelcode, Änderung/Storno, Kalendereintrag und Empfängerprüfung. |
| P15 Portale | Kundenangebote/Projekt/Abnahme, Bestellungen/Belege, Partner, Nachbarschaft, Affiliate | Backend/Portale | Eigene Rolle/Organisation/Objektbindung | Erlaubter und verbotener Fall je Rolle; PDF/Annahme/Änderung/Download, Attribution/Linkkennzeichnung; keine Veröffentlichung privater Props. |
| P16 Auth | Tatsächlich aktueller Provider, Registrierung/Login/Logout/Reset, Sitzung, Rollen, MFA/Passkeys/Recovery | Backend/Portale/Sicherheit | Unterstützte aktuelle Authkonfiguration | Kein Vertrauen in frei gewählten Client-Tenant; abgelaufen/verbraucht/replayed, fremdes Konto, Revoke und Reload; keine Umstellung aus alten Clerk-Vorlagen. |
| P17 Mail/Inbox | Inbound-Nachweis, Vorgangszuordnung, Entwurf, Empfängerfreigabe, Outbox, Provider-/Zustellstatus, Signaturen/Archiv | Backend/Portale/Kommunikation | Berechtigtes Postfach, persistenter Auftrag, Mail-/Kalenderadapter | Unklarer Sendestatus wird abgeglichen statt blind wiederholt; neue Termine an richtige Gegenseite mit konsistenter Kalender-UID/Sequenz. |
| P18 Belege/Finance | Eingang, Rohbeleg, Extraktion, Dublette, Kontierungsvorschlag, Prüfung, Export/Rechnung/Gutschrift | Finance | Aktuelles kaufmännisches System und bestätigte Fachwerte | Keine Zahlung oder Buchhaltungsfreigabe aus Extraktion; auditierbare Korrektur und Export/Restore. |
| P19 Wissen/Lernen | Quelle/Version/Hash, Tenant, Candidate, Review/Eval/Receipt, Index, Retrieval und Restore | Wissen/Skills | Bestehender Brain-/Skillowner, unabhängige Evaluation | WRITE → INDEX → EXACT READ-BACK → CONTENT COMPARE einzeln; Source-/Policyänderung invalidiert Promotion, begrenzter Rollout/Rollback. |
| P20 Interne Steuerung | Ideen/Abteilung/Nutzen/Aufwand, Vorlagen/Tasks, Bausteinversion/Nutzung/Korrektur, Freigaben | Projektsteuerung | Vorhandene Auftrags- und Regelregister | Ein Übergang erzeugt einen Auftrag, keine Doppelarbeit; Nutzung allein aktiviert keine neue Policy. |
| P21 Skills/Rollen | 44 Originalskills, 44 Enterprise-Rollen, Herkunft/Lizenz/Hash, Eignung und konkrete Bindung | Wissen/Skills | Vorhandene Kataloge, reale Loader-/Kontorechte | Fachzuordnung, Positiv-/Negativfälle je Einsatz, Volumen-/Budgetgrenzen; keine Originaländerung und keine erfundene Ausführung. |
| P22 Marketing/Vertrieb | Segment, Problem, belegtes Angebot, Botschaft, Zielseite, Funnel, Kanal/Redaktion, Betreuung, Messung | Marketing/Vertrieb | Vollständige Seitenaufbau-/Faktenbasis und Skillzuordnung | Konkreter Kalender/Budget/Stop/Evidence, Attribution ohne Doppelzählung; Veröffentlichung/Versand erst im passenden Auftrag. |
| P23 Betrieb | Persistente Queue/Lease/Fencing/Heartbeat/Checkpoint, Kapazität, Backup/Restore, Monitoring/Incident/Support | Infrastruktur/Netz | Reale Host-/Accountbindung, Budget und Verantwortliche | Worker läuft tatsächlich und übergibt sicher; keine zweite Wirkung nach Leaseablauf; erfolgreicher Restore und Rückweg je Runtime. |
| P24 Release/Recht/QS | Quellen-/Releasebindung, zutreffende Normen/Fachprüfung, echte Nutzerwege, Produkt-/Betriebsabnahme | Qualität/Recht | Alle relevanten Pakete und tatsächliche Nachweise | Kein Build/HTTP200 als Gesamtfreigabe. Öffentliche Agentur/Shop/DNS/Altadressen bleiben an spezifische finale Freigabe gebunden. |
| P25 Besucher-Plugins | Konto des Besuchers verbinden, Auswahl/Vorschau, beschränkter Import in Suite/Arbeitsplatz/Kundencenter | Backend/Portale | Aktuelle Sites-Eligibility, gewählter Connector, dynamischer Serverpfad, Besucherzustimmung | Kein Betreiberkonto als Besucherkonto; fremder Tenant/Importziel gesperrt, Reauth/Cancel/Retry/Readback geprüft. |
| P26 Dateien/Projektübergabe | Bilder, Pflichtenhefte, Spezifikationen, Original/Version/Hash/Provenienz/Rechte, Projektzuordnung | Backend/Portale | Gewähltes eigenes Konto oder Direktupload; berechtigtes Projektziel | Größen-/Typprüfung, sichere Vorschau, Duplicate/Versionconflict, Importstatus und nachvollziehbare Bestätigung; kein stilles Überschreiben. |

## Priorisierte Abweichungen

Die Befunde beruhen auf dem benannten Quellstand beziehungsweise einer begrenzten Laufzeitprobe. Ein Quellfehler beweist keinen bereits eingetretenen Produktivschaden. „Lokal korrigiert“ ist kein Liveabschluss.

| ID | Priorität / Abweichung | Paket / Fachowner | Zustand | Nächster Nachweis |
|---|---|---|---|
| G01 | P0: Statisches Sites-Hosting betreibt die Fach-APIs nicht. | P23 / Infrastruktur/Netz | open | Runtime mit Session, Datenbank und konkretem Adapter; echter positiver/negativer E2E-Weg. |
| G02 | P0: Gastwarenkorb wird vor bestätigtem Benutzer-Commit entfernt. | P10 / Shop und Finance | open | Atomarer/claimbasierter Merge mit Crash-/Parallelitäts-/Recoverybeleg; keine Daten verlieren. |
| G03 | P0: Anfragen benötigen idempotente Speicherung und dauerhaften Benachrichtigungsintent. | P01 / Backend/Portale | implemented_local_candidate_not_live | Same-key-Replay, Nutzlastkonflikt, Lost-ACK, unterschiedliche Outbox-IDs und Recovery getrennt prüfen. |
| G04 | P0: Registrierung und Suite-Verifizierung/Entitlement sind nicht dieselbe Funktion. | P16 / Backend/Portale/Sicherheit | open | E-Mail-/Workspaceverifizierung, Rollen-/Tenantbindung und einmaliger Trial mit Negativfällen. |
| G05 | P0: Öffentlicher Betreibertext und offene B.V.-Identitätsquelle widersprechen sich. | P24 / Qualität/Recht | decision_evidence_required | Aktuellen Betreiber-/Register-/Merchantbeleg fachlich prüfen; keine Rechtsform aus einem Namen raten. |
| G06 | P0: Systemmaster meldet LightRAG mit einem Workspace ohne Kundentrennung. | P19 / Wissen/Skills | external_boundary_open | Getrennte Workspace-/ACL-/Retrieval-/Restorebelege; keine Kundendaten-Ingestion bis geklärt. |
| G07 | P1: Home spielt direkte Review-/Loopmedien außerhalb der registrierten Projektion. | P04 / Grafik/Brand | open | Dieselben Asset-/Stimmen-/Skript-/Freigabeverträge für alle Verbraucher; finale Medien einzeln abnehmen. |
| G08 | P1: Ambientloops sind keine nachgewiesene Lippenperformance. | P04 / Grafik/Brand | open | Sprecheridentität und Lip-Sync am Anfang, in der Mitte und am Ende tatsächlich prüfen. |
| G09 | P1: Bewegung darf nicht unabhängig vom steuerbaren Sprachzustand starten. | P04 / Grafik/Brand | implemented_browser_subset_verified | Idle ruhig; Start/Pause, schneller Abbruch, Scroll, Replay und Reduced Motion prüfen. |
| G10 | P1: EN-Erklärtexte wurden von der Projektion verworfen. | P03 / UX/Frontend/Redaktion | implemented_browser_verified | Vier Textsprachen ohne leere Überschriften/Links; keine erfundenen EN-Captions. |
| G11 | P1: Formular-/Shopstatus-Sprachen waren trotz Auswahl nur Deutsch. | P03 / UX/Frontend/Redaktion | implemented_browser_subset_verified | Labels, lokale Validierung, Status und Rechtskontext in DE/NL/FR/EN. |
| G12 | P1: Installationsangebot wurde ohne PWA-Manifest ausgegeben. | P03 / UX/Frontend/Redaktion | implemented_build_verified_hosted_pending | Manifest/Icons/SW im Build und am HTTPS-Ziel; keine privaten Offline-Caches. |
| G13 | P1: Historische Browsernachweise passen nicht zu aktuellen Quellen. | P24 / Qualität/Recht | open | Neue tatsächliche Browserfälle an aktuelle Quellen binden; historische Reports erhalten. |
| G14 | P2: make e2e und Designaudit benannten ihren engeren Prüfumfang nicht ausreichend. | P24 / Qualität/Recht | implemented_scope_label_corrected | Prototypen-/Unit-/Browser-/Live-E2E-Nachweise getrennt ausgeben und ausführen. |
| G15 | P1: Aktuelle 26-Paket-Coverage und ihre Quellenbindung fehlten im Register. | P20 / Projektsteuerung | prepared_in_existing_register_not_functional_acceptance | Bestehendes Register ergänzen, alle Pflichtpakete mit Owner, Abnahme, Budgetgrenze und Rückweg erhalten. |
| G16 | P1: Aktuelle Vercel-Preview stammt aus einer divergierenden parallelen Quelle. | P23 / Infrastruktur/Netz | observed_no_cutover | Repo/Branch/Commit/Projekt/Services/Domain lesend binden; keine blinde Übernahme oder bidirektionale Spiegelung. |
| G17 | P1: Mailtageslimit ist optional und Count-before-send nicht atomar. | P17 / Backend/Portale/Kommunikation | open | Atomare Kosten-/Volumenreservierung, Lease und Unknown-outcome-Abgleich. |
| G18 | P1: Vercel-Services starten keinen belegten dauerhaften Outbox-Recoveryjob. | P17 / Backend/Portale/Kommunikation | open | Vorhandenen freigegebenen Jobpfad mit Lease/Readback anbinden; keinen Seed-Lifespan importieren. |
| G19 | P1: Geschützte Portale sind gesperrt, keine echte Session-/Membershipintegration. | P15 / Backend/Portale | truthful_message_fixed_access_integration_open | Token serverseitig verifizieren, Tenant/Rolle/Objekt prüfen; Text darf Cookiepräsenz nicht als Verifikation ausgeben. |
| G20 | P1: Editionen, Bundle, Addons und 30-Tage-Vertrag sind nicht insgesamt provisioniert. | P05 / Backend/Portale | open | Bestätigte Produkt-/Preis-/Entitlementfassung; kein Gratis-LLM oder doppelte Grundgebühr. |
| G21 | P1: City-/Werkstatt-/Partnerverknüpfung ist nicht als vollständiger Daten-/Nutzerweg belegt. | P12 / Shop/Partner und Redaktion | open | Reale Betriebe/Quellen/Freigaben und beide Navigationsrichtungen mit Nulltreffer-/Tenantnegativen. |
| G22 | P2: Tannet hat keinen bestätigten aktuellen Routen-/Mandantenvertrag. | P15 / Backend/Portale | source_evidence_required | Originalbriefing und richtige Marke/Domain/Owner/Abnahme binden; keine erfundene Route. |
| G23 | P1: Factory-Rollenname ist noch keine ausführende Instanz mit Completionroute. | P23 / Infrastruktur/Netz | open | Agent-ID, Betreiber, Tenant, Version, Operationen, Queue/Lease/Budget und Rückkanal pro Runtime belegen; Cockpit offen. |
| G24 | P1: Besucher-Connectoren und dauerhafte Projektdateiübernahme sind nicht angebunden. | P25 / Backend/Portale | eligibility_read_provider_binding_open | Eigene Besucheridentität, erlaubter Connector, bewusstes Projektziel, dauerhafter Import und exakter Readback. |
| G25 | P1: 44-Skill-Katalog und REA sind hier nicht als laufende Fähigkeiten belegt. | P21 / Wissen/Skills | source_license_probe_blocked_REA_not_exposed | Lizenz-/Quell-/Loader-/Invocationbelege; REA nur mit echtem Tool/Schema/Evidence-Readback behaupten. |
| G26 | P2: Lokale Node-Laufzeit ist 24, Projektvertrag fordert 22. | P24 / Qualität/Recht | open_supported_runtime_retest | Abschließende Prüfungen auf unterstützter gepinnter Runtime oder dokumentierte Kompatibilitätsentscheidung. |
| G27 | P1: GitHub/GitLab-SoT-Richtung ist zwischen Dokumenten und späterem Kontext nicht abschließend belegt. | P20 / Projektsteuerung | decision_evidence_required | Aktuelle zuständige Entscheidung und reale Mirror-/CI-/Writerbindung lesen, keine Altwatcher starten. |
| G28 | P1: Monitoring-/Reviewkonfiguration ersetzt keinen Nachweis des tatsächlich geladenen Releases. | P24 / Qualität/Recht | open | Commit→Review→Deployment→echtes Ereignis/Exception/Source-Map und Incidentowner binden. |
| G29 | P1: 08:00-Bericht und Goal-Fortsetzung sind ohne aktuellen Scheduler-/Completionbeleg kein Dauerbetrieb. | P20 / Projektsteuerung | runtime_evidence_required | Bestehenden Scheduler/Empfänger/Completionquelle prüfen; keinen doppelten Zeitplan oder 24/7-Claim erzeugen. |
| G30 | P1: Produkttext und vorgeschlagene Kauf-/Partnerleistung widersprechen teilweise dem Verfügbarkeitsstand. | P03 / UX/Frontend/Redaktion | open_not_hidden_by_translation | Funktion und autoritative Fakten vervollständigen, danach kundenbezogene Texte pro CTA konsistent prüfen. |

## Tatsächlich umgesetzter erster Slice

- 52 Erklärmodule um vollständige EN-Texte ergänzt. Vorhandene DE/NL/FR-Texte unverändert; drei bedeutungsrelevante Übersetzungsfindings nach unabhängiger Prüfung korrigiert. Vier Textsprachen bleiben von drei tatsächlich gebundenen Captionsprachen getrennt. Keine englische Tonspur erfunden.
- Kontakt-/Partnerformulare und Phasenhinweise lokalisiert. Partnerdaten verweisen auf den TEILEKLAR-Rechtskontext. Erfolg zeigt erst bestätigte Vorgangsnummer und Status; kein behaupteter Mailversand. Fremde oder leere JSON-Erfolgsantworten gelten nicht als Speicherung.
- Wiederholungskennung und Nutzlasthash werden vor einem Kontakt-POST im Sitzungsspeicher geschrieben und exakt zurückgelesen. Ohne sicheren Readback kein POST. Ungewisser Ausgang bleibt bei gleicher Kennung; geänderte Nutzlast wird blockiert. Netzwerkabbruch nach 15 Sekunden löst keine automatische Wiederholung aus. Der Browser speichert dabei keine rohen Formulardaten; ein Hash ist deshalb aber keine Anonymitätsgarantie.
- Serverkandidat: Mongo-`_id` bindet den Wiederholungsschlüssel; Payloadkonflikte werden 409. Anfrage und ausstehende Benachrichtigungsabsicht liegen im selben Dokument. Outboxschlüssel nutzt die eindeutige Anfrage-ID, nicht die Anzeigenummer; Legacy-Fallback bleibt erhalten. Kontakt- und Checkout-Recovery besitzen getrennte Fehlergrenzen.
- PWA-Build erzeugt Manifest und einen Netzwerk-only-Worker ohne private Offlineablage. Einladung erscheint nur mit Manifest. Installationsfähigkeit je Browser und HTTPS-Betrieb bleiben getrennte Prüfungen.
- Szenen starten im Idle ruhig. Benutzerstart, Pause und Fehler stoppen beziehungsweise steuern Audio und Video gemeinsam. Veraltete/abgebrochene Video-Play-Promises aktivieren keinen dauerhaften Fehler; Replay setzt auch das Intro zurück. Das ist weiterhin keine Lip-Sync-Abnahme.
- Falsche Verifikationsbehauptung bei bloßer Cookiepräsenz entfernt. Bestehende Zugriffssperre nicht geöffnet. Prototypen-Audit und lokale Testkette benennen ihren echten Umfang.

## Messung, Review und Best Practices

Die vollständige lokale Pythonkette bleibt rot: 685 Prüfungen, 28 Fehlergebnisse, neun Ausführungsfehler und 14 übersprungene Fälle. Darunter sind veraltete Quell-/Browser-/Abgleichnachweise; erwartete Hashes wurden nicht zum Erzwingen eines grünen Status umgeschrieben. Dies ist ein zusätzlicher Freigabeblocker.
81 Site-Unitprüfungen, acht Offline-Recoveryprüfungen und drei tatsächliche FastAPI-/ASGI-HTTP-Vertragsprüfungen bestanden. HTTP-Tests verwenden einen isolierten In-Memory-Store, keine echte Mongo- oder Providerverbindung. Dependencies stammen aus dem vorhandenen hashgepinnten Requirements-Lock in einer isolierten Testumgebung.
Browserprüfung am optimierten privaten Previewbuild: alle 39 öffentlichen Routen in EN, 50 sichtbare Erklärmodule ohne leere Überschriften/Texte/Linknamen; 52 Module im generierten Datenbestand (Home nutzt eigene Szenen). Vier Formularsprachen mit echter Leerfeldvalidierung, korrekter Partner-Rechtsroute sowie Idle- und schnellem Start/Pause-Medienverhalten geprüft. Keine gültige Anfrage und keine Nachricht versandt. Vollständige Mobil-, Safari-, Zoom-, Screenreader-, Restore- und Providerabnahme fehlen weiterhin.
Unabhängige Prüfidentitäten: `/root/soll_abgleich`, `/root/runtime_pruefung`, `/root/qualitaet_review`, `/root/brand_ux_pruefung`. Sie sind temporäre auf diesen Auftrag begrenzte Prüfer, keine behaupteten externen Daueragenten. Reviews fanden zusätzliche Kollisionen und Fehlerkanten, die in den Slice eingearbeitet wurden. Abschlussreview am endgültigen Diff bleibt gesondert zu binden.
REA ist in dieser Sitzung nicht als aufrufbares Werkzeug exponiert; der bekannte lokale Einstieg ist nicht vorhanden. Keine REA-Evidence erfunden. Verwendet wurden bestehende Verifier, unabhängige Quellprüfungen, GitHub-/Sites-/Vercel-Metadaten, Browser, gepinnte Compiler-/Unit-/HTTP-Tools und offizielle Primärdokumentation.
Systemmaster ist mit Version 0.1.8 auf Host srv1243952 lesend erreichbar. Seine Registry ist historisch datiert; weitere dort genannte Hosts sind dadurch nicht vollständig geprüft. Die Tenantprobe meldet LightRAG ohne Kundentrennung. Der separate Brain-Projektabruf meldet internen Fehler. Kein Kundendatenimport oder Wissenswrite ausgeführt.
Sites-Eligibility vollständig paginiert gelesen: Slack und Vercel unter anderem allowed; GitHub/Drive/Notion unknown. Unknown bedeutet keine bestätigte Erlaubnis und keine behauptete Adminablehnung. Keine Connectorbindung oder Besucherkonto-Aktion aus einem Manifestnamen abgeleitet.

### Primärquellen

- https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide/
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- https://www.mongodb.com/docs/manual/core/write-operations-atomicity/
- https://vercel.com/docs/services
- https://vercel.com/docs/services/routing
- https://developers.cloudflare.com/workers/static-assets/binding/

## Umsetzungspfad, Kosten und Rückkehr

Der vorhandene Next-/FastAPI-Servicepfad ist der bereits vorbereitete Kandidat für vollständige fachliche Runtime. Die offizielle Services-Dokumentation unterstützt mehrere Frontend-/Backenddienste und gemeinsames Routing. Die alternative Worker-/Assetarchitektur ist geprüft, aber kein Ersatz für eine bestätigte Session-, Datenbank-, Queue- und Visitor-Connectorbindung. Keine zusätzliche Datenbank oder pauschale fremde Proxybrücke eingeführt.

Umsetzungspfad: P24 Quellen/Betreiber/Runtime → P01 Anfrageweg → P16 Identität/Tenant → P05 Suiteberechtigung → P07 API-/Kostenfreigaben vor Agentenwirkungen → P06/P15 Arbeitsplatz/Portale mit P25/P26 Besucherconnectoren und dauerhafter Dateiübernahme → P08/P09 Katalog/Passung → P10/P11 Kauf/Nachkauf → P12/P13/P14 City/Partner/Termine → P17/P18 Mail/Finance → P19/P20/P21/P22/P23 Wissen/Steuerung/Skills/Marketing/Betrieb. P02/P03/P04 Design, Seiten und Medien laufen disjunkt parallel zum Arbeitsplatz; beide Lieferziele bleiben gleichrangig.

Neue bezahlte Provideraufrufe und externe Nachrichten in diesem Lauf: keine. Ein tatsächlicher Geldledger oder ein vollständiges Fertigstellungsbudget liegt dadurch nicht vor; weitere Kosten und Endtermin sind unbekannt. Erst nach Runtime-/Zugangs-/Datenbelegen belastbar planen. Historische Termine werden nicht als neue Zusage fortgeschrieben.

Rückweg: bisherige Domains, Datenbanken und Laufzeiten bleiben bestehen. Die Änderungen liegen in einer separaten Sites-Quelle; keine Vercel-/DNS-/Credentialumstellung und kein Main-Merge. Ein Rücknehmen der isolierten Codefassung verändert keine vorhandenen Geschäftsdaten. Serverrollout benötigt koordiniertes Frontend-/API-Release: alte Tabs ohne neuen Header bekommen 400, kein unsicherer automatisch erfundener Ersatzschlüssel.

Verbleibende Kontaktgrenzen: echte Mongo-Atomizität, tatsächlicher Recoveryjob im Vercel-Betrieb, Providerzustellung, atomare Stunden-/Mailbudgets und unveränderliche Empfänger-/Templatefassungen sind nicht abgenommen. Der Gastwarenkorb-Datenverlustpfad bleibt P0 und wird nicht von diesem Slice verdeckt.

## Abschlussregel

Kein Pflichtpaket wird wegen fehlender Umsetzung gestrichen. Gesamtabschluss erst nach echten Nutzerwegen, Daten-/Tenant-/Recovery-/Restore-/Releasebelegen und unabhängiger Abnahme. Offene fremde Zugänge nur als konkrete Abhängigkeit verfolgen.

Ein Goal-Eintrag ist kein Scheduler. Diese Sitzung behauptet weder eine nach Chatende weiterlaufende Ausführung noch einen neuen 08:00-Bericht. Bestehende Laufzeiten und Completionrouten müssen separat zugeordnet werden.

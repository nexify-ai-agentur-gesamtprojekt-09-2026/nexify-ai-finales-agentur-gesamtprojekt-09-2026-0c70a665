# Factory API und Authentifizierung – abgeleiteter Zielvertrag

Stand 26.10.2026 · Version 0.1.0-proposed · **proposed_target_not_runtime**.

Dieser Vertrag verbindet die vollständig katalogisierten N1-/N2-Seiten mit technischen Domänen, Rollen, Mandanten, typisierten Eingaben und Abnahmebedingungen. Er beschreibt einen vorgeschlagenen Zielzustand, keine entdeckte oder bereits implementierte API. Ein gültiges OpenAPI-Dokument beweist weder eine funktionierende Authentifizierung noch einen erreichbaren Endpunkt. Die Bereitstellung, Betreiberbindung und Freigabe bleiben gesonderte Nachweise.

## 1. Herkunft und Geltung

- N1: Repository mit Suffix `0c70a665`; N2: das zweite NeXify-Handoff-Repository. Exakte Git-Stände stehen in `factory.openapi.json` unter `x-source-repositories`; Seitenpfade und SHA256 in `prototype-pages.json`.
- `prototype-pages.json` erfasst sämtliche HTML-Dateien beider ausgewählten NeXify-Repositories, einschließlich Projektseiten, Dokumentvorlagen und Komponenten. Beobachtete DOM-Marker, Methoden und TODOs bleiben getrennt von abgeleiteten Capabilities und diesem vorgeschlagenen Routing. Eine nicht vorhandene API wird durch einen HTML-Marker nicht existent.
- Führende Quellen: die jeweiligen `AGENTS.md`, `config/regelwerk.json`, `config/brain/*.json`, `config/mandanten.json`, `docs/09-final/02-informationsarchitektur-und-journeys.md`, `05-technische-spezifikation.md`, `14-gesamtsystem-und-portale.md` und `15-umsetzungsplan-codex.md`.
- `docs/03-backend/auth-und-rollen.md` ist ausdrücklich die **TEILEKLAR**-Spezifikation. Deren Magic-Link-/Partner-MFA-/Cookie-Ansatz ist eine nachvollziehbare Ausgangsbasis, keine automatisch unternehmensweit aktive Auth-Konfiguration.
- `config/fakten.json` und `config/api-prepaid.json` bleiben Quellen der Zahlen. Widersprüchliche Entwurfs-/Freigabeangaben werden nicht als neue Preise, Steuerregeln, Aufbewahrungsfristen oder Produktionsfreigaben aufgelöst. de/nl/fr aus den aktuellen Vorgaben haben Vorrang vor älteren de-only-/v10-Texten.
- A1 ist das getrennte Affilinet/Nanobooking-Repository. Dessen tatsächliche `/api/auth/*`-, `/api/2fa/*`- und `/api/users/*`-Routen sind kein Beweis für diese `/v1`-Zielplattform. Gleiche Personennamen, E-Mail-Adressen oder ähnlich bezeichnete Rollen begründen keine SSO-/Tenantmigration.

Die Operationen tragen `x-source-refs` mit Repository, Pfad und Quellenart sowie `x-page-ids` mit exakt katalogisierten Seiten-IDs. Neue Pfad-/Methoden-/Schemanamen sind **vorgeschlagene technische Ableitungen**. Der Katalog hält insbesondere den beobachteten Partner-Gutschein-Konflikt `partner/vouchers/order` gegenüber `partner/vouchers/orders` fest; der Zielvertrag verwendet einen eigenen normalisierten Gutscheinbestellpfad. `partner/profile` ist im Ziel als PUT modelliert, passend zum beobachteten TODO; ein abweichender bestehender Backendpfad wird dadurch nicht umgeschrieben.

## 2. Sicherheitsentscheidung vor jedem Zugriff

Erlaubt wird nur die Schnittmenge aus gültiger Identität, aktuellem Account-/Sitzungszustand, aktiver Mitgliedschaft, ausgewähltem Mandanten, serverseitigem Scope, Rolle, Objektbesitz beziehungsweise Zuweisung und Aktionsfreigabe. Fehlende oder unbekannte Operationen, Rollen, Scopes und unsichere Bindungen sind gesperrt. Ein Modell, eine Toolannotation, ein Client-Tenantheader oder ein Name wie „Pascal“ verleiht keine Rechte.

`X-Tenant-ID` ist nur ein Selektor. Der Server prüft ihn gegen aktive Mitgliedschaft beziehungsweise den exakten API-Key-/Gast-Capability-Vertrag. Projekt, Kostenstelle, Order, Datei, Thread, Wissensquelle und Job müssen zum gleichen autorisierten Mandanten gehören. Private Suchfilter, Caches, Object Storage, Queue-Nutzlasten, Exporte und Telemetrie übernehmen diese Bindung. PostgreSQL-RLS und Anwendungskontrolle ergänzen sich; Service-/Migrationsrollen mit Bypassrechten sind keine Anwendungsidentitäten. Mindestens A/B/C-Mandanten sowie fehlender, falscher und widerrufener Kontext gehören zum Negativsatz.

Rollen sind additive Mitgliedschaftsrollen, keine globale Stufenleiter. Vorgeschlagene Rollen:

| Gruppe | Rollen | Grenze |
|---|---|---|
| Endnutzer | customer, api_customer, capability_guest | eigene beziehungsweise exakt freigegebene Ressourcen; keine Fremdmandanten |
| Zusammenarbeit | project_operator, project_reviewer, support_operator, content_editor | nur zugewiesene Projekte/Queues; Reviewer nimmt eigene Änderungen nicht unabhängig ab |
| Partner | workshop_partner, neighborhood_customer, affiliate | verifizierter Partner-/Standort-/Attributionsvertrag; keine pauschale Kundensicht |
| Verwaltung | tenant_admin, finance_operator, operations_operator | Mandanten- und Funktionsgrenzen bleiben auch für Admin bestehen; sensitive Zugriffe mit Grund/Audit |
| Governance | governance_reviewer, company_owner | aktuelle Identität, eigener Freigabeumfang, gebundener Hash; kein Freibrief für DNS/Geld/Livegang |
| Technische Identität | service_principal | nur registrierter Dienst, Audience, Mandant, Scope und Ablauf; kein menschlicher Endabnehmer |

`authenticated` bezeichnet ausschließlich eine validierte Account-Sitzung vor beziehungsweise außerhalb einer konkreten Tenantauswahl. `anonymous` ist ein explizit freigegebener öffentlicher Eingang, keine authentifizierte Rolle. `capability_guest` bezeichnet eine eng gebundene serverseitige Gastberechtigung, keinen frei wählbaren Rollenclaim. A1-Rollen wie `super_admin`, `vendor` und `franchiser` werden nicht automatisch in diese Rollen übertragen. Ein B2B-Status oder Zahlungsziel benötigt den gesonderten bestätigten Unternehmens-/Steuervertrag; es folgt nicht aus einer Rollenbezeichnung.

## 3. Browser, Sitzung und CSRF

Browser nutzen vorgeschlagen einen `HttpOnly; Secure; SameSite`-Sitzungscookie. Cookie-Name, vertrauenswürdige Origins, Domain-/Path-Grenzen und Schlüsselversionen werden mit der tatsächlichen Zielumgebung gebunden. CORS und SameSite ersetzen keine CSRF-Prüfung. Jede zustandsändernde cookie-authentifizierte Operation verlangt **BrowserSession UND X-CSRF-Token**, zusätzlich Prüfung des vertrauenswürdigen Origin beziehungsweise eines gleichwertigen gebundenen Nachweises. Fremde Origins, fehlende/alte/falsche CSRF-Tokens und Cookie/Token einer anderen Sitzung werden vor dem Seiteneffekt abgewiesen.

Vor bestehender Sitzung sichern Origin-/Clientbindung, einmalige gehashte Challenge und Replay-/Ratenbegrenzung die Auth-Eingänge. Credentials, Reset-/Magic-Link-Tokens, Recoverycodes und Capability-Secrets werden nicht in Logs, generischen Idempotenz-Responsecaches oder unkontrollierten Redirect-URLs abgelegt. Einmalige Magic-Link-Tokens werden im vorgeschlagenen Ziel per **POST consume** eingelöst, statt einen schreibenden GET-Callback blind zu kopieren. Weiterleitungsziele sind relative allowgelistete Ziele; Referrer-/Cachingregeln verhindern Tokenweitergabe.

Login und Magic-Link-Einlösung liefern entweder eine voll gültige Sitzung oder eine **begrenzte MFA-Challenge**. Eine Challenge ist kein für Fachoperationen gültiger Access-Token. Konto-/MFA-Verwaltung prüft eine verifizierte initiale Enrollment-Challenge beziehungsweise frischen Step-up. Erstinstallation setzt nicht einen bereits vorhandenen TOTP-Faktor voraus; bis zum erfolgreichen Nachweis entstehen keine privilegierten Rollenrechte. Faktorabschaltung und Recovery benötigen einen eigenen nachvollziehbaren Nachweis und Sitzungswiderruf, keine Admin-Abkürzung über einen Clientclaim.

Die TEILEKLAR-Quelle nennt als technische Basis Magic-Link 10 Minuten, Access-JWT RS256 15 Minuten und opaque rotierendes Refresh-Token 30 Tage. Diese Werte werden hier **nicht zur aktiven Factorykonfiguration erklärt**. Finale TTL, Issuer/Audience, Signierschlüsselrotation, Gerätebindung und Recovery werden versioniert freigegeben. Geschützte Rollen erfordern die dort beschriebene MFA; Endnutzer-MFA und angemessene Verifikation von Betroffenenanfragen werden nicht allein durch diese Rollenmatrix neu gesetzlich festgelegt.

Eine Refresh-Familie wird serverseitig gespeichert; Wiederverwendung eines bereits verbrauchten Tokens widerruft die betroffene Familie. Logout, Passwort-/Faktorwechsel, gesperrter Account, entfernte Mitgliedschaft, kompromittierter API-Key und Terminalwiderruf werden vor dem nächsten geschützten Zugriff wirksam. JWT-Signatur allein genügt nicht: Typ, Issuer, Audience, Ablauf, `jti`, Familie sowie aktueller Account-/Mitgliedschaftszustand sind zu prüfen. Unbekannte Issuer/Algorithmen, Algorithmuswechsel aus dem Tokenheader, abgelaufene beziehungsweise purged Accounts und falscher Tokentyp werden abgewiesen.

## 4. API-Schlüssel, Terminal und Gastgrenzen

API-Keys werden serverseitig einer Kostenstelle, einem Mandanten, aktivem Account, erlaubten Modellrevisionen, Budget und expliziten Inferenz-/Estimate-Scopes zugeordnet. Erzeugung/Widerruf benötigt den berechtigten Benutzer und passenden Step-up; das Secret wird einmal über TLS ausgegeben, nur gehasht gespeichert, niemals geloggt oder gecacht. Der API-Key darf keine Medienjobs, Adminoperationen, Rollenänderungen, Löschungen oder Zahlungsauslösung autorisieren. Usage-/Ledgeransichten sind hier Benutzer-/Sitzungsfunktionen; `usage.read` wird deshalb nicht als nutzloser API-Key-Scope ausgegeben.

Terminalanmeldung ist als **vorgeschlagener eigener Device-Authorization-Vertrag** modelliert: registrierter Client → einmaliger Device-/Usercode → authentifizierte Bestätigung der konkreten Mitgliedschaft/Scopes → begrenztes Polling → gebundener UserBearer. Ein Code ist vor Freigabe kein Token; unbekannte Clients, fremde Sessions, mehrfach verwendete beziehungsweise abgelaufene Codes bleiben gesperrt. Die Existenz von `nexify login` in einer Nutzerreise beweist keine bereits vorhandene OAuth-/Device-Implementierung.

Gastbestellung bleibt möglich. Fehlender Authorization-Header und ein bewusst öffentlicher Einstieg sind etwas anderes als mitgelieferte ungültige, deaktivierte, purged oder unbekannte Bearer-Credentials: Letztere ergeben **401 und niemals Gast-Fallback**. Eine öffentliche Cartanlage gibt nur eine auf genau diesen Cart gebundene Capability aus. Cartänderung und Bestellabgabe prüfen deren Methoden-/Checkoutscope und Server-Tenantbindung. Eine nach Bestellung ausgegebene Order-Capability ist **nur lesend** und objektgebunden; sie erteilt weder Kontozugriff noch ein allgemeines Schreibrecht. Die bereits modellierte Retourenoperation verlangt eine verifizierte Kundensitzung; der Gastpfad ist noch unvollständig. **Gastretouren und Widerruf dürfen keine Kontoerstellung voraussetzen.** Ein eigener zweckgebundener, verifizierter Guest-Return-Vertrag oder ein entsprechend verifizierter manueller Supportablauf ohne Konto ist deshalb ein ausdrücklich offener **Launchblocker vor Gastverkauf**. Die signierte Gastleseberechtigung wird hierfür nicht pauschal zum allgemeinen Schreibrecht erweitert. Die dokumentierte signierte Gastleseberechtigung ist kein finanzwirksames Agententool. Interaktive Kaufbestätigung, Provider-SCA und regelgebundene Agentenfreigaben sind unterschiedliche Nachweise.

Anonyme Cookie-/Marketingpräferenzen müssen ohne Anmeldung bedienbar bleiben: lokale Erstparteipräferenzen starten ohne optionale Tracker, lesen die veröffentlichte Policy und setzen/widerrufen die lokale Auswahl sofort. Die geschützten `/v1/consent/preferences`-Operationen sind die zusätzliche authentifizierte Kontosynchronisation; sie sind **keine Anmeldepflicht für den öffentlichen Cookiebanner**. Eine spätere serverseitige anonyme Consent-Receipt-Funktion braucht einen eigenen eng gebundenen Vertrag und darf keine vorhandenen fremden Kontoeinwilligungen verändern.

## 5. Fachvertrag und Seiteneffekte

- Fehler besitzen `{fehler:{code,text_de,feld?,correlation_id}}`, keine Stacktraces, Tokens oder reflektierten nichtendlichen Geldwerte. Ungültige Authentifizierung ergibt 401; eine fehlende konkrete Berechtigung 403; fremde Objekte 404 ohne Existenzauskunft. Veraltete Fassung, anderer Payload unter gleichem Idempotenzschlüssel, widerrufene Freigabe und erforderliche Reconciliation ergeben 409.
- Fachliche Writes binden `Idempotency-Key` an Akteur, Tenant, Operation und kanonischen Payloadhash. Gleicher Key mit anderem Inhalt ist 409. Finanz-/Domainwrites, Ergebnisbeleg und Outbox müssen atomar zusammenpassen; unklare externe Wirkung wird abgeglichen, nicht blind wiederholt. Auth-Challenges, Refresh-Familien und Providerereignisse haben eigene Replayprotokolle und kopieren keine gecachten Credentials.
- Angebotsannahme bindet die konkrete Fassung, freigegebene Terms und gegebenenfalls zahlungspflichtige Bestätigung. Anpassung braucht Begründung; Ablehnung ändert keinen Preis. Projektabnahme bindet Stufe L1/L2/L3 und Artefakthash. Rechnungen entstehen aus freigegebener Preis-/Steuerfassung, nicht aus HTML-Mustern.
- Beträge des Zielschemas sind autoritative Minor Units, Usage-/Schätzwerte als exakt formatierte Dezimalstrings. Das ist **keine bereits abgeschlossene Migration** des A1-Floatledgers und keine bestätigte Mehrwährungs-/Steuerkorrektheit. Preiswerte, Aufschläge, Mindestsummen und Aufbewahrungsdauern werden nicht neu erfunden.
- Riskoklassen A/B/C aus `config/brain/tools.json` gelten für die jeweilige Agenten-/Toolaktion. Rollenprüfung ersetzt keine menschliche Freigabe für externe Nachrichten, finanzwirksame Aktionen, Löschung oder Live-Eingriffe. Vorhandene explizite Autorisierung wird innerhalb ihres konkreten Umfangs wiederverwendet; es entsteht keine routinemäßige erneute Chat-Rückfrage. Freigabe, Zielhash, Aktionsumfang, aktuelle Identität und erforderlicher Step-up müssen technisch gebunden sein.
- Keine generischen `/execute`, Shell-, Root-, Dashboard- oder beliebigen Provideraction-Endpunkte. Workspaceaufträge referenzieren freigegebene Projekt-/Artefaktscopes; Text, Issue, HTML, Mail, Modellantwort und RAG-Inhalt sind Daten, keine Rechtevergabe. Pfad-/Repoallowlist, Traversal-/Symlinkabwehr und sensible Dateien sind vor jedem Write zu prüfen.
- Datenrechte laufen als eigene Vorgänge mit Identitätsprüfung, Export-/Löschlandkarte, signierten Belegen und sichtbarem Retentionshold. Ein finanzieller Datensatz wird bei ungeklärter Aufbewahrung nicht gelöscht oder fälschlich als vollständig erledigt gemeldet. Dieser Vertrag beschließt keine neue Frist und keine automatische Anonymisierung unveränderlicher Buchungsfelder.
- Die Inferenzpfade sind hier ein **normalisiertes vorgeschlagenes Subset**. Ihre Request-/Responsefelder sind noch kein vollständiger OpenAI-/Anthropic-Wirevertrag. Kompatibilitätsadapter, Streaming-/Toolcall-/Fehlerformate und modellversionsabhängige Grenzen benötigen vor einem entsprechenden Kompatibilitätsversprechen eigene Contracttests. Unbekannte Tools/Modelle werden nicht durchgereicht.

## 6. Medien: Runway, ElevenLabs und Composio

`hero-media.json` und `hero-media.md` sind die konkreten Kontext- und Bindungsquellen. Der Nutzer hat vorhandene Runway-Videos benannt und die Erstellung fehlender Videos autorisiert: **Bestand prüfen, passende vorhandene Assets nutzen, nur fehlende erstellen**. Es wird keine erneute allgemeine Erstellgenehmigung verlangt.

Die drei Bindungen bleiben exakt: Slot `nex` = NeX, `aifly` = AIFly, `user` = anfragender Nutzer. NeX nutzt die explizit genannte ElevenLabs-Voice-ID `Lbm7qDmJUxIxpWx9qhZO`; AIFly und Nutzer verwenden beide ausdrücklich `feTHtWuEJFLTOWyoreyy`. Die gleiche ID ist kein automatisch zu korrigierender Konflikt. Providerverifikation, erreichbare registrierte Toolaktion und passende Account-/Scopebindung werden dadurch nicht behauptet.

Videoverarbeitung/-erstellung liegt bei Runway; ElevenLabs wird über Composio für die dafür verifizierbaren Sprach-/Audiofunktionen gebunden und nicht pauschal zum Videogenerator erklärt. Im aktuellen Tool-/CLI-Bestand ist kein passender ausführbarer Vertrag nachgewiesen. Action-/Modell-/Account-IDs werden nicht erfunden. Bei unaufgelöstem Providervertrag darf ein interner Job als blocked/pending dokumentiert werden; es darf kein gerendertes oder veröffentlichtes Video vorgetäuscht werden.

`HeroMediaInput` verlangt Projekt, Seite, Sprache, Teilnehmer-Slot, Skriptversion, Rechtebelege und Budgetreferenz. Vorhandenes Quellasset und dessen SHA256 treten gemeinsam auf; fehlt es tatsächlich, muss der Inventarbeleg die angeforderte Neuerstellung stützen. Rechte für Stimme/Bild/kommerziellen Gebrauch und konkreten Datentransfer, Providerregion/-Retention, Subprozessoren und AVV/SCC werden vor personenbezogener Ausleitung geprüft. R-06 und die bestehende Composio-Konfiguration werden nicht durch einen Erreichbarkeitsnachweis aufgehoben.

Freigaben/Publikation binden genaue Assetversion und SHA256, Zielseite/-sprache, aktuellen Akteur und Policyrevision. Der öffentliche Player erhält ausschließlich eigene veröffentlichte Rendition-, Poster-, Caption- und Transcriptreferenzen mit Version/Hashes, keine Provider-URLs, Voice-IDs, Account-/Jobsecrets oder private Storage-Links. Reduzierte Bewegung, kontrolliertes Autoplay, Untertitel, Audioalternativen, Mobil und erreichbare Steuerelemente sind Produktabnahme, kein Nebeneffekt eines erfolgreichen Providerjobs.

## 7. A1-Istvertrag und Migrationsgrenze

| Aspekt | N1-/TEILEKLAR-Dokumentationsbasis | A1 beobachteter Quellstand | Ziel-/Migrationspflicht |
|---|---|---|---|
| Credentialformat | Magic Link privat; Passwort für Partner/Verwaltung | `/api/auth/register/login`, Passwort/bcrypt; JWT-Paare im JSON | Keine stillschweigende Übernahme oder Passwort-/Kontozusammenführung |
| Browserstorage | geschützter Cookie vorgeschlagen | `frontend/src/lib/apiClient.js` verwendet LocalStorage | gesonderte Cookie-/CSRF-/XSS-Migration mit Logout-/Recoveryprüfung |
| JWT/Refresh | TEILEKLAR RS256/opaque-Familienrotation | A1 `config.py`: konfigurierbarer JWT-Algorithmus, standard HS256; standard 60 Minuten/14 Tage; Refresh-JTI-Records | Issuer/Audience, Familienrevoke und Schlüsselrollen einzeln nachweisen, Werte nicht als bereits konvertiert melden |
| Rollen/Tenant | additive Factoryrollen und PostgreSQL-RLS-Ziel | A1 UserRole plus objekt-/Vendor-/Franchisebezug, MongoDB | explizites IdP-/Subject-/Tenant-/Rollenmapping; kein globaler Superadmin durch Namensgleichheit |
| MFA | TOTP-Pflicht für bestimmte geschützte Rollen in TEILEKLAR | A1 Login prüft TOTP, wenn `totp_enabled`; separate `/api/2fa/*`-Routen | Pflichtrolle, Bootstrap, Recovery und Widerruf technisch erzwingen und testen |
| Kontolöschung | Datenrechte und Buchhaltungsbestand wahren | lokaler manueller Retentionshold bei bekannten Finanzreferenzen, transaktionale Nichtfinanz-Anonymisierung | keine globale rechtliche Aufbewahrungs-/Purge-Racefreigabe; weitere Writer und externe Daten getrennt migrieren |

N1-Zielverträge ändern keine A1-Routen. Aktuelle A1-Härtungen und Tests sind lokale Nachweise, keine Factory-SSO-/SQL-/Gatewayabnahme. Die weiteren optionalen Auth-Helfer und alle Fachwriter müssen ihren eigenen zustands-/besitzgebundenen Vertrag erhalten; ein Checkout-Fix beweist keine globale Autorisierung.

### Offene Authadapter und öffentlicher Companion

Die öffentlichen Companion-/Startseiten bleiben hinsichtlich Live-KI **statische Demo beziehungsweise gesperrter Livepfad**, bis ein enger öffentlicher BFF-Vertrag geliefert ist. Die API-Key-Inferenz und private Mitgliedschaftssuche sind kein anonymer Browser-Backendvertrag. Betreiberkeys oder Kunden-RAG-Credentials dürfen deshalb nicht an den Browser verteilt werden. Ein späterer BFF darf nur freigegebenes öffentliches Wissen, eigene Rate-/Budget-/Missbrauchsgrenzen und passende Datenrechte nutzen. Die Seiten-Capability-Zuordnung belegt diese Gastfunktion ausdrücklich noch nicht.

Die vorhandene Datenbankgrundlage bindet `current_actor()` an einen administrativ zugeordneten Datenbankprincipal beziehungsweise `session_user`. Ein Shared-Pool mit `nx_app` plus beliebig aus einem JWT gesetzten Actor-/Tenant-GUCs ist dadurch **nicht** als Authbrücke bestätigt. Der Browser-/Bearer-zu-Datenbank-Adapter benötigt eine eigene geprüfte ADR und End-to-End-Negativtests für Poolwiederverwendung, Benutzerwechsel und Transaktionsende. Vorhandene SQL-Rollentests sind kein Browser-JWT-/SSO-Nachweis. Weder RLS-Bypass noch clientbehaupteter Actor/Tenant werden als Abkürzung zugelassen.

## 8. Negative Verträge und Abnahme

Vor Aktivierung je Operation: reale Implementierung und Vertragsversion zuordnen; tatsächliche Quellen-/Lizenz-/Betreiberbindung prüfen; erlaubten Fall und mindestens einen fremden Tenant/Owner sowie fehlenden Scope testen. Fehlende oder kaputte Credentials dürfen keine niedrigere Gast-/Serviceberechtigung erzeugen. Cookie-Writes ohne CSRF und mit fremdem Origin, falsche MFA-/Recovery-Challenge, Refresh-Replay, widerrufene Rollen/Keys, fremde Capability, manipulierte Beträge/Versionen und unregistrierte Provideraktionen müssen ohne Seiteneffekt scheitern.

Privilegierte und wirtschaftliche Aktionen zusätzlich: Konkurrenz, Crash vor/nach Persistenz, Leaseverlust, wiederholte Providerzustellung, falscher Betrag/Währung/Referenz, Refund/Storno, Outbox-/Auditfehler, manuelle Retentionsholds und Restore nach Widerruf/Löschung. Kandidaten-/Policy-/Skillpromotion erfordert aktiven Runtime-Reload, exaktes Read-back und Negativprobe; Merge oder Prompttext allein gilt nicht als Durchsetzung.

Dieser Entwurf ist erst nach unabhängiger Vertragsprüfung, beschlossener Zielarchitektur und versionierten Implementierungs-/Migrationsnachweisen als verbindlicher Runtimevertrag zu aktivieren. Er verleiht weder Rechtsfreigabe noch Produktivzugänge oder ein Gesamt-Go.

## 9. Vollständige Operationszuordnung

Die folgende Tabelle wird aus demselben OpenAPI-Zielvertrag abgeleitet. `x-source-refs`/`x-page-ids` enthalten die Detailrückverweise; statische Seiten ohne abgeleitete Runtimecapability benötigen dadurch keinen erfundenen Backendendpunkt.

| Domain | Methode und Pfad | operationId | Seitencapability | Zustand |
|---|---|---|---|---|
| identity | `POST /v1/auth/register` | `registerAccount` | identity.login, identity.register | vorgeschlagen, nicht runtimebelegt |
| identity | `POST /v1/auth/login` | `loginWithPassword` | identity.login | vorgeschlagen, nicht runtimebelegt |
| identity | `POST /v1/auth/magic-link` | `requestMagicLink` | identity.login | vorgeschlagen, nicht runtimebelegt |
| identity | `POST /v1/auth/magic-link/consume` | `consumeMagicLink` | identity.login | vorgeschlagen, nicht runtimebelegt |
| identity | `POST /v1/auth/mfa/verify` | `verifyLoginMfa` | identity.mfa.verify | vorgeschlagen, nicht runtimebelegt |
| identity | `GET /v1/auth/session` | `readSession` | identity.session.read | vorgeschlagen, nicht runtimebelegt |
| identity | `POST /v1/auth/session/refresh` | `refreshBrowserSession` | identity.session.read | vorgeschlagen, nicht runtimebelegt |
| identity | `POST /v1/auth/logout` | `logoutSession` | identity.logout | vorgeschlagen, nicht runtimebelegt |
| identity | `POST /v1/auth/sessions/revoke-all` | `revokeAllSessions` | identity.logout | vorgeschlagen, nicht runtimebelegt |
| identity | `PATCH /v1/account` | `updateAccount` | identity.account.update | vorgeschlagen, nicht runtimebelegt |
| identity | `GET /v1/account/memberships` | `listMemberships` | identity.session.read | vorgeschlagen, nicht runtimebelegt |
| identity | `POST /v1/auth/session/tenant` | `selectSessionTenant` | identity.session.read | vorgeschlagen, nicht runtimebelegt |
| content | `GET /v1/public/content/{slug}` | `readPublishedContent` | content.pages.read | vorgeschlagen, nicht runtimebelegt |
| consent | `GET /v1/public/legal/{documentKey}` | `readPublishedLegalVersion` | consent.documents.read | vorgeschlagen, nicht runtimebelegt |
| billing | `GET /v1/public/prices` | `readPublishedPriceCatalog` | content.pages.read | vorgeschlagen, nicht runtimebelegt |
| inquiries | `POST /v1/requests` | `createInquiry` | inquiries.create | vorgeschlagen, nicht runtimebelegt |
| consent | `GET /v1/consent/preferences` | `readConsentPreferences` | consent.preferences.read | vorgeschlagen, nicht runtimebelegt |
| consent | `PUT /v1/consent/preferences` | `updateConsentPreferences` | consent.preferences.update | vorgeschlagen, nicht runtimebelegt |
| offers | `GET /v1/offers` | `listOffers` | offers.read | vorgeschlagen, nicht runtimebelegt |
| offers | `POST /v1/offers` | `createOfferDraft` | offers.drafts.create | vorgeschlagen, nicht runtimebelegt |
| offers | `GET /v1/offers/{offerId}` | `readOffer` | offers.read | vorgeschlagen, nicht runtimebelegt |
| offers | `POST /v1/offers/{offerId}/accept` | `acceptOfferVersion` | offers.accept | vorgeschlagen, nicht runtimebelegt |
| offers | `POST /v1/offers/{offerId}/decline` | `declineOfferVersion` | offers.decline | vorgeschlagen, nicht runtimebelegt |
| offers | `POST /v1/offers/{offerId}/change-requests` | `requestOfferChanges` | offers.change-request | vorgeschlagen, nicht runtimebelegt |
| projects | `GET /v1/projects` | `listProjects` | projects.read | vorgeschlagen, nicht runtimebelegt |
| projects | `GET /v1/projects/{projectId}/reports` | `listProjectReports` | projects.read | vorgeschlagen, nicht runtimebelegt |
| projects | `GET /v1/projects/{projectId}/goals` | `listProjectGoals` | projects.goals.read | vorgeschlagen, nicht runtimebelegt |
| projects | `PATCH /v1/projects/{projectId}/goals/{goalId}` | `updateProjectGoal` | projects.goals.update | vorgeschlagen, nicht runtimebelegt |
| acceptance | `POST /v1/acceptance` | `recordProjectAcceptance` | acceptance.record | vorgeschlagen, nicht runtimebelegt |
| documents | `GET /v1/documents/{documentId}` | `readDocumentMetadata` | documents.read | vorgeschlagen, nicht runtimebelegt |
| documents | `GET /v1/documents/{documentId}/pdf` | `downloadDocumentPdf` | documents.read | vorgeschlagen, nicht runtimebelegt |
| documents | `GET /v1/document-templates` | `listApprovedTemplates` | documents.templates.read | vorgeschlagen, nicht runtimebelegt |
| billing | `GET /v1/billing/invoices` | `listInvoices` | billing.invoices.read | vorgeschlagen, nicht runtimebelegt |
| billing | `GET /v1/ledger` | `readLedger` | api-access.usage.read | vorgeschlagen, nicht runtimebelegt |
| billing | `POST /v1/topups` | `createVerifiedProviderTopup` | billing.topups.create | vorgeschlagen, nicht runtimebelegt |
| billing | `POST /v1/payments/revolut/webhook` | `receiveRevolutWebhook` | billing.payment-events.receive | vorgeschlagen, nicht runtimebelegt |
| api-access | `GET /v1/api/cost-centers` | `listCostCenters` | api-access.usage.read | vorgeschlagen, nicht runtimebelegt |
| api-access | `POST /v1/api/keys` | `createCostCenterKey` | api-access.keys.create | vorgeschlagen, nicht runtimebelegt |
| api-access | `DELETE /v1/api/keys/{keyId}` | `revokeCostCenterKey` | api-access.keys.revoke | vorgeschlagen, nicht runtimebelegt |
| api-access | `GET /v1/api/usage` | `readCostCenterUsage` | api-access.usage.read | vorgeschlagen, nicht runtimebelegt |
| model-inference | `POST /v1/chat/completions` | `createChatCompletion` | model-inference.requests.create | vorgeschlagen, nicht runtimebelegt |
| model-inference | `POST /v1/messages` | `createMessageResponse` | model-inference.requests.create | vorgeschlagen, nicht runtimebelegt |
| model-inference | `POST /v1/embeddings` | `createEmbeddings` | model-inference.embeddings.create | vorgeschlagen, nicht runtimebelegt |
| model-inference | `POST /v1/estimate` | `estimateModelRequest` | model-inference.estimates.create | vorgeschlagen, nicht runtimebelegt |
| knowledge | `POST /v1/knowledge/search` | `searchAuthorizedKnowledge` | knowledge.search | vorgeschlagen, nicht runtimebelegt |
| commerce | `GET /v1/shop/products` | `listPublishedProducts` | commerce.catalog.read | vorgeschlagen, nicht runtimebelegt |
| commerce | `GET /v1/shop/products/{productId}` | `readPublishedProduct` | commerce.catalog.read | vorgeschlagen, nicht runtimebelegt |
| commerce | `POST /v1/shop/carts` | `createCart` | commerce.cart.update | vorgeschlagen, nicht runtimebelegt |
| commerce | `GET /v1/shop/carts/{cartId}` | `readCart` | commerce.cart.update | vorgeschlagen, nicht runtimebelegt |
| commerce | `PUT /v1/shop/carts/{cartId}/items` | `changeCartItems` | commerce.cart.update | vorgeschlagen, nicht runtimebelegt |
| commerce | `POST /v1/shop/orders` | `createShopOrder` | commerce.orders.create | vorgeschlagen, nicht runtimebelegt |
| commerce | `GET /v1/shop/orders/{orderId}` | `readOwnedShopOrder` | commerce.orders.read | vorgeschlagen, nicht runtimebelegt |
| commerce | `POST /v1/shop/returns` | `requestReturn` | commerce.returns.create | vorgeschlagen, nicht runtimebelegt |
| fitment | `POST /v1/public/fitment/checks` | `checkCompatibility` | fitment.checks.create | vorgeschlagen, nicht runtimebelegt |
| appointments | `GET /v1/partners/{partnerId}/availability` | `readPublicAppointmentSlots` | appointments.availability.read | vorgeschlagen, nicht runtimebelegt |
| appointments | `GET /v1/appointments` | `listAppointments` | appointments.read | vorgeschlagen, nicht runtimebelegt |
| appointments | `POST /v1/appointments` | `requestAppointment` | appointments.create | vorgeschlagen, nicht runtimebelegt |
| vouchers | `POST /v1/vouchers/orders` | `createVoucherOrder` | vouchers.create, vouchers.orders.create | vorgeschlagen, nicht runtimebelegt |
| vouchers | `POST /v1/vouchers/redeem` | `redeemVoucherOnce` | vouchers.redeem | vorgeschlagen, nicht runtimebelegt |
| partners | `POST /v1/partner-applications` | `applyAsPartner` | partners.applications.create | vorgeschlagen, nicht runtimebelegt |
| partners | `GET /v1/partner/profile` | `readPartnerProfile` | partners.profile.read | vorgeschlagen, nicht runtimebelegt |
| partners | `PUT /v1/partner/profile` | `updatePartnerProfile` | partners.profile.update | vorgeschlagen, nicht runtimebelegt |
| affiliates | `GET /v1/affiliates/attribution` | `readOwnAffiliateAttribution` | affiliates.attribution.read | vorgeschlagen, nicht runtimebelegt |
| affiliates | `GET /v1/affiliates/commissions` | `readOwnAffiliateCommissions` | affiliates.commissions.read | vorgeschlagen, nicht runtimebelegt |
| affiliates | `POST /v1/affiliates/links` | `createApprovedAffiliateLink` | affiliates.links.create | vorgeschlagen, nicht runtimebelegt |
| workspace | `POST /v1/workspace/runs` | `createBoundWorkspaceRun` | workspace.runs.create | vorgeschlagen, nicht runtimebelegt |
| workspace | `GET /v1/workspace/runs/{runId}` | `readWorkspaceRun` | workspace.runs.read | vorgeschlagen, nicht runtimebelegt |
| workspace | `POST /v1/workspace/runs/{runId}/cancel` | `cancelWorkspaceRun` | workspace.runs.cancel | vorgeschlagen, nicht runtimebelegt |
| inbox | `GET /v1/inbox/threads` | `listInboxThreads` | inbox.messages.read | vorgeschlagen, nicht runtimebelegt |
| inbox | `POST /v1/inbox/drafts` | `createInboxDraft` | inbox.drafts.create | vorgeschlagen, nicht runtimebelegt |
| inbox | `POST /v1/inbox/drafts/{draftId}/send` | `sendApprovedDraft` | inbox.messages.send | vorgeschlagen, nicht runtimebelegt |
| decisions | `GET /v1/decisions` | `listAuthorizedDecisions` | decisions.read | vorgeschlagen, nicht runtimebelegt |
| decisions | `POST /v1/decisions/{decisionId}/resolve` | `resolveBoundDecision` | decisions.resolve | vorgeschlagen, nicht runtimebelegt |
| operations | `GET /v1/operations/health` | `readInternalHealthEvidence` | operations.health.read | vorgeschlagen, nicht runtimebelegt |
| administration | `GET /v1/administration/dashboard` | `readTenantAdministration` | administration.dashboard.read | vorgeschlagen, nicht runtimebelegt |
| integrations | `GET /v1/integrations` | `listVerifiedIntegrationBindings` | integrations.registry.read | vorgeschlagen, nicht runtimebelegt |
| learning | `GET /v1/learning/candidates` | `listLearningCandidates` | learning.candidates.read | vorgeschlagen, nicht runtimebelegt |
| learning | `POST /v1/learning/candidates/{candidateId}/promote` | `promoteReviewedCandidate` | learning.candidates.promote | vorgeschlagen, nicht runtimebelegt |
| support | `POST /v1/support/tickets` | `createSupportTicket` | support.tickets.create | vorgeschlagen, nicht runtimebelegt |
| support | `GET /v1/support/tickets` | `listOwnedSupportTickets` | support.tickets.read | vorgeschlagen, nicht runtimebelegt |
| data-rights | `POST /v1/account/data-rights` | `requestDataRight` | data-rights.requests.create | vorgeschlagen, nicht runtimebelegt |
| data-rights | `GET /v1/account/data-rights/{requestId}` | `readDataRightsProgress` | data-rights.requests.read | vorgeschlagen, nicht runtimebelegt |
| media | `GET /v1/public/media/{assetId}` | `readPublishedHeroMedia` | media.assets.read | vorgeschlagen, nicht runtimebelegt |
| media | `GET /v1/media/assets` | `listAuthorizedMediaAssets` | media.assets.read | vorgeschlagen, nicht runtimebelegt |
| media | `POST /v1/media/hero-jobs` | `createHeroMediaJob` | media.hero-jobs.create | vorgeschlagen, nicht runtimebelegt |
| media | `GET /v1/media/hero-jobs/{jobId}` | `readHeroMediaJob` | media.hero-jobs.read | vorgeschlagen, nicht runtimebelegt |
| media | `POST /v1/media/hero-jobs/{jobId}/approve` | `approveHeroAssetVersion` | media.hero-jobs.approve | vorgeschlagen, nicht runtimebelegt |
| media | `POST /v1/media/publications` | `publishApprovedHeroAsset` | media.publications.create | vorgeschlagen, nicht runtimebelegt |
| offers | `GET /v1/offers/{offerId}/pdf` | `downloadOfferVersionPdf` | offers.pdf.read | vorgeschlagen, nicht runtimebelegt |
| billing | `POST /v1/billing/invoices/{invoiceId}/payment-orders` | `createInvoicePaymentOrder` | billing.invoices.pay | vorgeschlagen, nicht runtimebelegt |
| commerce | `POST /v1/shop/cross-sell-orders` | `createAppointmentCrossSellOrder` | commerce.crosssell.orders.create | vorgeschlagen, nicht runtimebelegt |
| appointments | `PATCH /v1/appointments/{appointmentId}/status` | `updateAppointmentStatus` | appointments.status.update | vorgeschlagen, nicht runtimebelegt |
| identity | `POST /v1/auth/password/reset-requests` | `requestPasswordReset` | identity.password.reset | vorgeschlagen, nicht runtimebelegt |
| identity | `POST /v1/auth/password/reset` | `resetPasswordWithBoundToken` | identity.password.reset | vorgeschlagen, nicht runtimebelegt |
| identity | `POST /v1/auth/email/verify` | `verifyAccountEmail` | identity.email.verify | vorgeschlagen, nicht runtimebelegt |
| identity | `POST /v1/auth/device/code` | `startTerminalDeviceAuthorization` | identity.login | vorgeschlagen, nicht runtimebelegt |
| identity | `POST /v1/auth/device/token` | `pollApprovedTerminalAccessToken` | identity.login | vorgeschlagen, nicht runtimebelegt |
| identity | `POST /v1/auth/device/approve` | `approveTerminalDeviceAuthorization` | identity.login | vorgeschlagen, nicht runtimebelegt |
| identity | `GET /v1/account/mfa` | `readMfaStatus` | identity.mfa.verify | vorgeschlagen, nicht runtimebelegt |
| identity | `POST /v1/account/mfa/setup` | `startMfaEnrollment` | identity.mfa.manage | vorgeschlagen, nicht runtimebelegt |
| identity | `POST /v1/account/mfa/enable` | `enableVerifiedMfaEnrollment` | identity.mfa.manage | vorgeschlagen, nicht runtimebelegt |
| identity | `POST /v1/account/mfa/disable` | `disableMfaAfterStepUp` | identity.mfa.manage | vorgeschlagen, nicht runtimebelegt |

Maschinenlesbarer Umfang: 97 Pfade, 102 Operationen und 107 Schemas. Alle 63 deklarierten Seiten-Capabilities sind zugeordnet; dies beweist keine Livefunktion oder Vollständigkeit unbekannter externer Systeme.

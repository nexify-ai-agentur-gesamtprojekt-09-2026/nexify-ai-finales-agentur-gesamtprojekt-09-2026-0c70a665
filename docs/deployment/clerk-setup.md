# Clerk: belegter Integrationsstand und Produktionsvoraussetzungen

Recherche vom **26.10.2026, 08:41–08:43 UTC**. Dies ist eine Integrationsnotiz,
kein Nachweis einer produktiven Anmeldung. Öffentliche HTTP-GETs: zehn Antworten
mit Status 200, zwei veraltete/angenommene Dokumentationspfade mit 404. Exakte
URLs, Redirectziele, Zeitpunkte, SHA-256 und normalisierte Auszüge stehen in
[`clerk-sources.json`](clerk-sources.json). Keine Geheimnisse, authentifizierten
API-Aufrufe, Benutzeranlage oder DNS-Änderung wurden dafür verwendet.

## SDK und App Router

Die offizielle npm-Metadatenantwort nennt **`@clerk/nextjs@7.9.20`** als `latest`.
Die Peer-Bereiche erlauben den vorhandenen Projektstand Next.js `16.4.3` sowie
React/React DOM `19.3.1`; Node muss mindestens `20.9.0` sein. Das ist ein
Kompatibilitätsbeleg aus Metadaten, noch kein Laufzeitnachweis der Integration.

Für Next.js 16 heißt die Middlewaredatei **`proxy.ts`**. Sie verwendet
`clerkMiddleware` aus `@clerk/nextjs/server`. Serveraufrufe von `auth()` sind
asynchron: **`await auth()`**. Der aktuelle Quickstart setzt `ClerkProvider`
innerhalb von `<body>`. Bei aktivem `cacheComponents` müssen requestabhängige
Auth-Komponenten passend mit `Suspense` begrenzt werden. Exakte Paketversion und
Lockfile kontrolliert integrieren; diese Recherche ändert keine Pakete.

Authentifizierte Identität allein ersetzt keine Autorisierung: Die bestehenden
privaten Bereiche benötigen zusätzlich serverseitige Site-/Mandantenmitgliedschaft
und Rollen. Insbesondere darf der erste Clerk-Benutzer dadurch nicht automatisch
Administrator werden. Keine Rolle aus unkontrollierten Clientdaten ableiten.

Für fehlende Konfiguration ist ein eigenes geschlossenes Projektmuster vorgesehen:
öffentliche Inhalte ohne `ClerkProvider` rendern, private Zugriffe verweigern.
Dies behauptet keine produktive Unterstützung eines Providers ohne Schlüssel;
es startet auch keine automatische Keyless-App/Account-Anlage.

## Schlüssel, Domain und DNS

Produktionskonfiguration verwendet `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` mit
`pk_live_` und den zugehörigen **nur serverseitigen** `CLERK_SECRET_KEY` mit
`sk_live_`. Den Secret Key ausschließlich über den vorgesehenen Secret-Speicher
bereitstellen, niemals in Browservariablen, Git, Screenshots oder Chat ausgeben.
Öffentliche Schlüssel beweisen weder Secret-Verfügbarkeit noch Dashboardrechte.

Der bereitgestellte öffentliche Schlüssel kodiert den Frontend-API-Host
`clerk.nexifyai.de`. Die vorhandene IA nennt dagegen `nexifyai.cloud` als
NeXify-Domainkontext. Das ist eine offene Domain-/Deploymententscheidung.
Verschiedene Top-Level-Domains dürfen nicht als automatisch gemeinsame Session
behandelt werden. Nach Festlegung des tatsächlichen Origins die zulässigen
`authorizedParties` gezielt binden; keine Hostnamen aus Requests blind übernehmen.

Die gewünschten DNS-Einträge liefert laut offizieller Produktionsanleitung
**Clerk Dashboard → ausgewählte Produktionsinstanz → Domains**. Dort exakte
Name-/Typ-/Zielpaare übernehmen und vorhandene Mail-/Verifikationsrecords erhalten.
Keine CNAME-Ziele aus dem Publishable Key oder aus Beispielen erraten. Die zwei
öffentlichen Resolver lieferten beim CNAME-GET für `clerk.nexifyai.de` HTTP 200,
aber jeweils DNS-Status **3 / NXDOMAIN**. Ihre Authority-Antwort enthält die
SOA von `nexifyai.de`; das ist keine Antwort aus dem Clerk-Dashboard und verrät
keine gewünschten CNAME-Ziele. DNS kann sich nach diesem Zeitpunkt ändern.

Clerk weist bei Cloudflare auf **DNS only** für den Clerk-CNAME hin. Ob diese
Zone tatsächlich dort verwaltet wird, ist dadurch nicht belegt. Nach den
konkreten Einträgen DNS-Ausbreitung und Dashboardprüfung beobachten, anschließend
die dort angebotene Zertifikatsbereitstellung durchführen und HTTPS prüfen.

## Erster Produktionsbenutzer und Abnahme

Zuerst richtige Produktionsinstanz, endgültigen App-Origin, zugehörige Schlüssel,
Dashboard-DNS und Zertifikate bestätigen. Danach auf der tatsächlich bereitgestellten
Anwendung die angebotene Registrierung interaktiv abschließen. Die offizielle
Benutzerverwaltung nennt alternativ **Users → Create user** im ausgewählten
Dashboard. Hier wurde kein Benutzer erstellt. Entwicklungs- und Produktionsdaten
nicht miteinander verwechseln.

Anschließend getrennt prüfen: öffentlicher Auftritt ohne Anmeldung erreichbar;
Registrierung/Anmeldung/Abmeldung und erlaubte Redirects korrekt; anonyme und
identifizierte Benutzer ohne Mitgliedschaft erhalten keinen privaten Inhalt;
berechtigte Rollen greifen ausschließlich auf ihren Site-/Mandantenbereich zu.
Eine Adminzuweisung ist eine eigenständige autorisierte serverseitige Aktion,
kein Nebeneffekt der ersten Registrierung. A1 bleibt getrenntes Kundensystem
und wird durch diese Clerk-Notiz nicht zu einem Projektmodul oder migriert.

Offizielle Hauptquellen:

- [Next.js Quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart)
- [clerkMiddleware](https://clerk.com/docs/reference/nextjs/clerk-middleware)
- [Produktion und DNS](https://clerk.com/docs/guides/development/deployment/production)
- [Umgebungsvariablen](https://clerk.com/docs/guides/development/clerk-environment-variables)
- [Benutzerverwaltung](https://clerk.com/docs/guides/users/managing)
- [Offizielle npm-Metadaten](https://registry.npmjs.org/@clerk/nextjs/latest)

## Lokaler Implementierungsstand

Implementiert: `@clerk/nextjs@7.9.20`, `@clerk/localizations@4.24.1` mit
`deDE`, bedingter Provider, `/anmelden`, `/registrieren`, Next-16-Proxy und
geschlossene private Routen. Der bereitgestellte öffentliche Schlüssel liegt
in der ignorierten `apps/web/.env.local`; `.env.example` enthält keinen
Secret-Platzhalter. Das vorhandene Seitenverzeichnis umfasst jetzt 45 Routen
(35 öffentlich, 10 geschützt); Registrierung und Rückweg sind explizit verlinkt.

Ohne gültige Konfiguration bleiben öffentliche Seiten erreichbar, private
Routen antworten 503. Mit Konfiguration sind nicht angemeldete Zugriffe 401;
angemeldete Identitäten ohne serverseitige Mitgliedschaft erhalten 403.
Der Mitgliedschaftsmapper ist noch nicht implementiert: Auch berechtigte
Bestandskunden können deshalb noch nicht produktiv ins Portal.
`test:auth` ist im Next-Web-CI-Job ergänzt. Lokale Tests ersetzen keinen
gehosteten Login mit echter Produktionsinstanz.

### Deployment zuerst konkretisieren

Die bestehende Root-`vercel.json` veröffentlicht noch `prototypen`, keine
Next-Anwendung. Die Next-Konfiguration leitet `/api/*` an einen lokalen
Entwicklungsdienst auf Port 3003 weiter. Dieser Dienst erzwingt Loopback und
ist nicht als produktionsfähiger externer Gateway freigegeben. Ein Vercel-Livegang
braucht daher einen geprüften Next-Monorepo-Build samt Tokens/Katalogzugriff und
einen produktionsfähigen API-Dienst mit Transport-, Session- und Origin-Schutz.
Die bestehende statische Bereitstellung wurde nicht ungeprüft umgestellt.

### Cloud-Einrichtung

Der Umgebungskonfigurationsentwurf (Revision 10) wurde gespeichert und erneut
gelesen: öffentlicher Build-Schlüssel als Umgebungsanforderung,
`CLERK_SECRET_KEY` als erforderliches Server-Secret für `api.clerk.com`.
Die Secretbindung ist **nicht vorhanden**. In den Umgebungseinstellungen
Änderungen prüfen und speichern, anschließend die Umgebung veröffentlichen;
Draftspeicherung allein aktiviert nichts und konfiguriert kein Hostingprojekt.
Den echten Secret Key ausschließlich im vorgesehenen sicheren Speicher und
im tatsächlichen Hostingprojekt hinterlegen, niemals im Chat oder Repository.

Produktionsstatus und offene Voraussetzungen stehen maschinenlesbar in
`config/clerk-production.json`. Es wurden keine DNS-Einträge geschrieben,
keine echten Benutzer angelegt und kein Produktionsdeployment ausgeführt.

## Verbindliche Domainaufteilung nach Nutzerklärung

Produktionsziel ist **https://nexifyai.cloud** auf Vercel. Die Schreibweise
`neifyai.cloud` in der Antwort wird im bestehenden Projektkontext als
`nexifyai.cloud` verstanden. **https://nexifyai.de** ist die Vorschau-Domain;
der Nutzer gibt an, sie bereits in Vercel eingebunden zu haben. Diese Remote-
Zuordnung ist hier noch nicht verifiziert. Die aktuelle ChatGPT-Seite auf `.cloud`
bleibt bis zur fertigen, abgenommenen NeXify-Version bestehen. Kein vorzeitiger
DNS-Wechsel und keine automatische Weiterleitung der Vorschau auf die Baustelle.

Beide exakten HTTPS-Origins sind als Clerk `authorizedParties` konfiguriert.
Dies begrenzt zulässige Token-`azp`-Werte; es registriert keine Domain, beweist
keine gültige Session und ist kein Ersatz für Rollen/Mandantenmitgliedschaften.
Keine pauschale Freigabe für `*.vercel.app` oder andere Origins.

Der vorhandene Publishable Key gehört weiterhin zu `clerk.nexifyai.de`.
Zwei verschiedene Top-Level-Domains benötigen eine bestätigte Clerk-Domain-
Topologie (gegebenenfalls Primary/Satellite); Cookies werden nicht automatisch
geteilt. Primary-/Satellite-Flags und weitere Schlüssel werden erst anhand der
konkreten Instanzkonfiguration gesetzt. Die Domainentscheidung allein klärt
weder die Clerk-CNAME-Ziele noch das bestehende Vercel-Projekt.

Der gelieferte PEM-Schlüssel ist als `config/public-keys/clerk-provided.pem`
gesichert und syntaktisch als öffentlicher RSA-2048-Schlüssel geprüft.
SHA-256 des SPKI-DER: `684d4cf51e2d47b75abf4f2f97f7ec58c7333beb597f97ced56913f035faaed8`.
Er ist kein Serversecret. Eine konkrete JWKS-URL wurde in der Nachricht nicht
angegeben. Die Zuordnung zu Issuer/Instanz und aktiven JWKS einschließlich
Rotation ist noch ungeprüft, daher ist der PEM nicht als statischer `jwtKey`
aktiviert. Der bestehende SDK-Prüfweg wird nicht durch bloßes JWT-Decodieren
oder eine unbestätigte Schlüsselkoppelung ersetzt.

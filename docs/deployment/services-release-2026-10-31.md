# Next + Shop-API: lokaler Releasekandidat, nicht veröffentlicht

Kanonische Integrationsbasis66185f1a184d8f0a65c039850cca936d8d5b7177, darin
Snapshot86ed4b28c5230ee0bbb050a212b9f511db473545. Keine alten Frontendpatches
übernommen. Nur Root-vercel.json, neuer Shop-Serviceeinstieg, Pythonmanifest,
isolierte Tests und diese Releaseunterlagen sind Eigentum dieses Teilauftrags.
Checkout/Mailer gehören dem getrennten Backendowner; Frontend Emergent.

## Bestehendes Ziel und Routing

Dasselbe Vercelprojekt prj_Po7jlB7srMP6sxyMvf5zIwzXzNyh im vorhandenen Team.
Repositoryroot bleibt Projektroot, keine neuen Projekte, Domains, DNS oder Keys.
Services ist Beta. Frontendservice apps/web/Next, Shopservice apps/shop-api/FastAPI.
Frühere globale Build-/Output-/Functions-Felder sind servicebezogen; bisherige
Headers einschließlich CSP bleiben byteinhaltlich unverändert. Keine neue
Sicherheitsheader-/Origin-/Autorisierungsfreigabe.

Nur die vollständigen Präfixe /api/shop, /api/auth, /api/admin, /api/workshops und
/api/requests sowie explizite Health-/OpenAPI-/Docswege gehen zum Shopservice.
/api/agent-chat, /api/agent-runtime-status, /api/internal und /api/session bleiben
beim Nextservice. Kein pauschales /api-Proxying, keine Weiterleitung zu localhost.
Fehlende Next-Routen bleiben fehlend; /api/session wird nicht als live erfunden.
Service-rewrite erhält den ursprünglichen Pfad; keine Prefix-Strips.

## Kein produktiver Bootstrapschritt

vercel_app:app importiert weder shop.main noch dessen Lifespan. Router werden
erst bei vorhandener geeigneter Runtimekonfiguration geladen. Es gibt keine
Seeds, create_index-Aufrufe, Workshopimporte, SQLitedateien, Subprozesse oder
Mailbox-Retryschleife. GATEWAY_PORT=0 ist allein eine nicht benutzte Kompatibilität
für den bisherigen config.py-Import, keine laufende Gatewaybindung.

Jeder Routeraufruf, auch GET mit möglichen Schreib-/Providerfolgen, wird vor
Dispatch durch Projekt-, Namespace-, Schema- und Indexprüfung gesperrt. Die
Prüfung verwendet ausschließlich listCollections/index_information, niemals
Businessdokumente oder counts. Sie schreibt nichts und prüft bei jedem Request
neu. Fehlende/fremde/partielle/sparse/falsche TTL-/Schlüsselkonfiguration:503.
Vorhandene Auth-, Admin-, Owner-, Origin-/Webhook- und Preisregeln der Router
werden nicht durch Clientclaims ersetzt. Same-Origin-Verhalten bleibt wie im
bisherigen main.py (inklusive Webhookausnahme); keine neue Originliste.

## Neue Namespaceplanung, kein Bestandsfakt

Geplanter neuer Name: nexify_teileklar_shop_v1. Dieser Namespace ist NICHT als
vorhanden oder leer nachgewiesen. Der vorhandene Atlasstore nexify-atlas-db
(store_jCItPjCAFfPtsE8h) ist laut Parent genau diesem Projekt zugeordnet, aber
das beweist weder ein Shopschema noch Kunden-/Tenantrechte.

Der spätere kontrollierte Operator muss vor jeder Anlage anhand Metadaten
bestätigen, dass dort keine Bestandsdaten liegen. Bei Kollision stoppen;
nichts überschreiben, migrieren oder löschen. Nur neue eigene Collections mit
dem exakten Schema-Projektmarker und den bereits im Routercode verlangten
Indizes anlegen; kein Konto, Produkt, Workshop oder Preis wird geseedet.
Der maschinenlesbare Plan ist services-namespace-plan-2026-10-31.json.
Der Marker bezeichnet die eigene TEILEKLAR-Datenbank, keine Rechte für fremde
Kundenportale. Private Portal-/Membershipsperren bleiben erhalten.

Runtime benötigt VERCEL_PROJECT_ID mit obigem Projekt, den vorhandenen
MONGODB_URI (alternativ bisherigen MONGO_URL), expliziten bestätigten DB_NAME,
PREVIEW_PUBLIC_ORIGIN als exakten HTTPS-Origin und bestätigten SHOP_VAT_PERCENT.
URI-Pfad ist nur akzeptabel, wenn er exakt diesem neuen Plan entspricht; kein
beliebiger vorhandener Name wird übernommen. Widersprüchliche URL-/Namenswerte
sperren. Alias passiert ausschließlich im Backendprozess; nie URI ausgeben,
ins Browserbundle übernehmen oder Credentials kopieren. Fehlende Bindung hält
APIs auf503; Frontendbuild benötigt keine funktionierende Datenbank.

Fehlendes/ungültiges REVOLUT_MODE sperrt alle zustandsändernden Wege sowie
GETs mit möglichen Schreib-/Paymentfolgen vor Routerimport. Nur die explizit
aufgeführten öffentlichen Katalog-/Werkstattlesewege bleiben möglich. Kein
stiller Livefallback. Keine Revolutvariablen aliasen, keinen Zahlungsmodus wechseln, keine Preise
freigeben. Bestehende REVOLUT_API_SECRET_KEY ist nicht automatisch ein passender
Merchantkey. Preise, Versand, Rollen, Provider und reale Produktdaten werden
nicht durch Metadatenbereitschaft abgenommen. Kein eigener Maildaemon; Nachholung
ist Gegenstand des Backend-Recoverypakets und braucht einen tatsächlich
gebundenen ausführenden Pfad vor einer Betriebsbehauptung.

## Reproduzierbare lokale Prüfung

Python3.12, direkte Versionen requirements.in, alle aufgelösten Versionen und
Artefakthashes requirements.txt. Nur offizielle PyPI-Wheels, keine sdist-Builds:

```text
uv venv .local/shop-services-test --python python3.12
uv pip install --python .local/shop-services-test/bin/python --require-hashes --only-binary :all: -r apps/shop-api/requirements.txt
.local/shop-services-test/bin/python -m unittest discover -s apps/shop-api/tests -p test_vercel_adapter.py -v
```

Die Tests verwenden Fakes statt Mongo-/Zahlungs-/Mailzugriff. Direkte Router-
Wiederverwendung und401/403 werden zusätzlich mit Fake-Motor geprüft; keine
Produktionsdatenbank, kein Provider, keine Kunden-/Passwortdaten. Der bisherige
Root-stdlib-Testjob wird nicht still um neue Pflichtabhängigkeiten erweitert;
diese Tests sind ausdrücklich mit dem Service-Lock auszuführen.

Nextbuild: pnpm --filter @nexify/web build ist an diesem unveränderten
Frontend erfolgreich gelaufen (Next16.4.3/Node22.23.4/pnpm12.15.0). VercelCLI65.2.0
validiert die Konfiguration und erkennt beide Services ohne Fehler/Warnungen.
Die explizite runtime-Angabe python3.12 wurde vom CLI-Servicedetektor abgewiesen;
stattdessen erkennt framework=fastapi die Runtime und .python-version pinnt3.12.

vercel dev --local --listen 127.0.0.1:3019 --non-interactive startete beide
Services ohne Projektlink/Auth/ENV-Pull. Lokaler GET: Frontend /200; Shophealth
und Produkte503 project_binding_unverified; /api/auth/me503 payment_mode_unbound;
/api/agent-chat405 vom Nextservice. Kein konfigurierter Checkout-/Providerbeleg.
CLI-Selbstupdate meldete zusätzlich einen npm-dist-tags-Fetchfehler; beide
Services und das gemessene Routing liefen trotzdem. Lokale Prozesse danach beendet.

Der tatsächliche @vercel/python28.0.1-Builder erzeugte ein Python3.12-Function-ZIP
mit984Dateien, ohne absolute oder Elternpfade. Entry, Checkout, Mailer und Helper
sind bytegleich mit den geprüften Quellen. Lokales Builderresultat ersetzt keinen
providerseitigen Plattformbuild oder Team-/Deploycheck.

Der reproduzierbare lokale Buildercheck liegt unter
apps/shop-api/tests/verify_vercel_bundle.cjs. VERCEL_TOOLING_ROOT verweist nur
auf eine isolierte Installation von vercel@65.2.0 aus der offiziellen Registry.
Der Check installiert/authentifiziert/deployt nichts; er erzeugt ausschließlich
.local/vercel-bundle-check/{report.json,files.json,function.zip} und prüft
Archivpfade sowie bytegleiche zentrale Quellen. Runtime-Buildpakete werden
durch den offiziellen Builder aus den gesperrten Anwendungsrequirements installiert.

```text
VERCEL_TOOLING_ROOT=/path/to/isolated/vercel-install node apps/shop-api/tests/verify_vercel_bundle.cjs
```

## Vor tatsächlichem Release und Rollback

1. Finalen Frontend-/Backend-/Konfig-SHA, Eigentümer, Tests und Node22/Python3.12
   abgleichen. Rootprojektdaten und vorhandene Build-/Teamrechte rücklesen.
2. Neues Namespace-/Schema ausschließlich nach obiger Metadatenprüfung im
   freigegebenen Store kontrolliert vorbereiten. Kein Produktionsimport/Seed.
3. Der Shop-Buildcommand python3 prepare_vercel.py prüft den kanonischen
   Helper apps/agent-gateway/bigbuy_get.py auf den gepinnten SHA und kopiert ihn
   ohne Ausführung nach vercel_support/bigbuy_get.py. includeFiles bindet diesen
   Service-internen Pfad ein. Ein Elternpfad in includeFiles war tatsächlich
   nicht ZIP-fähig und ist entfernt. Keine manuelle Codekopie im Git. Der
   Plattformbuild muss den kanonischen Helper als Buildinput verfügbar haben;
   bei fehlendem/geändertem Input scheitert die Vorbereitung sichtbar. Die
   gemeinsame Next-Quellauflösung und tatsächliche Plattformartefakte verifizieren.
4. Gezieltes Routing, TLS/Cookies, Owner-/Role-Negativfälle, Preis-/Provider-
   Sperren, Outbox-Recovery und Entwürfe am exakten bereitgestellten Kandidaten
   prüfen. Keine echte Zahlung/Mail ohne passenden Testauftrag.
5. Erst dann den getesteten Zielstand schalten. Alle bestehenden Aliase vorher
   abgleichen; keine versehentliche Domainpromotion. Vorheriges Deployment als
   Rückweg erhalten. Veränderte Daten/Outbox NICHT mit altem Backup überschreiben.

Rollback nimmt nur Deployment/Routing zurück; neue eigene Namespaceinhalte und
WAL/Outbox bleiben erhalten und werden abgeglichen. Fehlende Provider-/Tenant-
Fähigkeiten bleiben ehrlich gesperrt. Services-/Compute-/Transferkosten sind
nicht als0belegt; in diesem lokalen Auftrag kein Deploy oder kostenpflichtiger
Lauf. Keine neue CLI-/Account-/Security-/Billingkonfiguration.

Offizielle Quellen,31.10.2026 gelesen:
https://vercel.com/docs/services
https://vercel.com/docs/services/config-reference
https://vercel.com/docs/services/routing
https://vercel.com/docs/services/pricing
https://vercel.com/docs/frameworks/backend/fastapi
https://pypi.org/pypi/motor/json
Motor3.7.1 bleibt für bestehende Routerkompatibilität gepinnt; die offizielle
Abkündigung ist bekannt, eine Treibermigration ist nicht Teil dieses Releases.

# Vorhandener TEILEKLAR-Katalog in derselben Headless-App

BigBuy ist ausdrücklich die gewählte Produktquelle. Der vorhandene öffentliche
Lesepfad ist `https://teileklar.shop/api/shop/products`. Die erste20erAntwort
meldete3720Gesamteinträge; zwei gezielt geleseneDatensätze und ihreBildreferenzen
wurden anschließend lokal geprüft. Das ist kein vollständiger Lieferantenimport.
Der Quellstatus ist `catalog`, QuellenlabelBigBuy, stock0 und evidenceleer.
created_at11.10.2026 ist eine Anlagezeit und kein aktueller Lieferantenabruf.
Die Source-of-Truth-/Lizenz-/Passungs-/Preis-/Frischefreigabe wird daraus nicht
abgeleitet. Private Daten oder Zugangswerte wurden nicht übernommen.

## Tatsächlicher Adapter und Anzeige

`apps/agent-gateway/catalog.py` validiert einen unveränderten JSON-Snapshot des
bestehenden Endpunkts. Quelle/Abrufzeit/Raw-SHA sind gebunden; IDs/SKUs eindeutig,
EAN bleibtString einschließlichNullen, stock muss bekannter nichtnegativerInteger
sein (null wird nicht zu0). Quellnamen/Kategorien sind inerteTexte. Titel und
Metaentwurf bleiben an die exakten SupplierFactIDs gebunden; keine LLM-Nutzung,
keine erfundene Passung, Garantie oder Norm. DE-Quelltexte bleiben bei NL/FR
als Deutsch gekennzeichnet; Shellhinweise und Bedienung sind DE/NL/FR.

Preisvalue ist eine Euro-Haupteinheit und muss zum zweistelligen Preisstring mit
€ passen. `7.06` wird rechnerisch706MinorUnits, niemals7Cent. Abweichung,
Floatsonderwerte, Bruchteile einesCents oder Budgetüberschreitung blockieren.
Die Ausgabe heißt `source_price`; sie wird nicht zum serververbindlichen
Warenkorbpreis. Netto/Brutto, Steuer, Versand und kaufmännische Freigabe bleiben
`not_verified`/false. Die UI kennzeichnet die Angabe entsprechend.

Der Adapter hat `cart=None`; vorhandener HTTP-Server und vorhandenes ShopPanel
verwenden ihn im Modus `read_only`. Alle POST-Cart-/Items-/Checkoutaktionen und
Cartleseversuche werden auch mit gültigerSitzung/CSRF/IdempotencyKey mit403
`catalog_read_only` abgewiesen. Keine Auftrag-/Zahlungswirkung. Der getrennte
bereits geprüfte LocalShop-/Warenkorbkern bleibt für ausdrücklich gebundene
verifizierte Testadapter erhalten. Dies ist keine zweite Oberfläche/Queue/DB.

## Abruf, Pagination und Aufbewahrung

`python3 tools/catalog_snapshot.py --output … --maximum-rows … --maximum-bytes …
--timeout-seconds …` macht genau einen GET, ausschließlich auf den festen
bestehendenHost/Endpoint, mit dem beobachteten `limit`-Parameter, ohneCredentials,
Redirects, automatischeRetries, Provider-/Modell-/Bildaufrufe.401/403 stoppen,
429 verlangt gesonderteWarte-/Wiederaufnahmeentscheidung. Die Frist wird vor und
nachReads geprüft; verbleibendeSocketzeit wird gesetzt. DNS-/nativeBlocking-
Grenzen sind kein harter Prozess-/OS-Zeitlimitnachweis. Kein automatischerDaemon.

`page=2` lieferte im unabhängigen Parent-Lesetest dieselbenIDs wiepage1.
Daher wird niemals über einen geratenenPageparameter iteriert. Ausgabe bleibt
`partial_unverified_continuation`, mit reported_total, tatsächlicherSnapshot-
und lokalerTrefferzahl. Suchen/Kategorien betreffen nur diesenAusschnitt.
Es werden weder3720geleseneArtikel noch vollständigePagination oder Löschungen
behauptet. Nachgewiesener Fortsetzungsvertrag und kompletter regulärerSync mit
belegtemTakt sind weiterhin nötig; keine erfundeneTTL/SLA.

Rawbytes und kanonischesManifest werden atomar/contentadressiert gespeichert.
Manifestdateiname bindet seineBytes, Rawname/Hash/Länge sind rückgelesen.
Vorhandene Artefakte werden nicht überschrieben. Elternpfade werden mitNOFOLLOW
abgeschritten; Reads verlangen reguläreDateien/nlink1 und Bytebudget. Hardlinks,
Symlinks und FIFOs sind abgewiesen. Neue temporäreWrites sindexklusiv, feste
Manifestdaten werden nicht zu beliebigenPfaden. GleicheManifest-/Rawbytes sind
idempotent; neuer expliziterAbruf erzeugt einen eigenenZeitbeleg. Der Caller
verwaltet eine begrenzteArtefaktablage; kein unkontrollierter Scheduler oder
automatischeRetention/Löschung wird installiert.

## Expliziter lokaler Start

Der bestehende Gateway-CLI akzeptiert zusätzlich `--catalog-snapshot <Manifest>`
und zwingend explizite `--catalog-tenant`, `--catalog-project`, `--catalog-store`,
`--catalog-max-bytes`, `--catalog-max-rows`, `--catalog-max-text`,
`--catalog-max-price-minor`. Diese Größen sind Caller-Lesegrenzen, keine Preise,
Kundenrechte oder Providerzusagen. OhneSnapshot startet derselbeCLI weiterhin
unverbunden und liefert503; keine Testartikelinstallation/Secret-Suche.

Der tatsächliche lokale Zweierlauf verwendet den ausdrücklich lokalen
Prüfscope local-public-review/public-snapshot-review. Das ist keine bewiesene
produktive Actor→Tenant-Zuordnung und aktiviert keine Kundenrollen. Alle lokalen
Browserrequests bleiben aufLoopback. Der Produktionsstand wird nicht umgestellt.

## Bilder und verbleibende Eingänge

Relative Referenzen sind nur der feste `/api/shop/image?src=…`-Proxy mit HTTPS-
cdnbigbuy.com-Ziel; kein beliebigerHost, Credentials, Port oder weitererQuery.
Bildslots werden inventarisiert, in derUI aber ohne Zuordnungsfreigabe nicht als
Produktbild geladen. Ein EAN-/SKUabweichenderDateiname könnte ein Variantenbild
sein; weder automatischFehler noch richtigeZuordnung. Zwei realeOriginale sind
1200×1200RGB, byteidentisch lokal erhalten und mangelsZuordnungs-/Lizenz-/
Farbraumnachweis quarantiniert; exakterReplay verändert sie nicht. Kein reales
Bildderivat/Freisteller wird behauptet. Der tatsächlich ausführbare Alpha-
Derivat-/Checkpoint-/Rollbackpfad ist separat in
[product-image-batch.md](product-image-batch.md) beschrieben.

Offen: belastbarerOriginalfeed/Readzugang samtTaxonomie-/Daten-/Bildrechten,
Fortsetzung/Sync-/Zeitvertrag, kommerziellePreis-/Steuer-/Versandregeln und
verified/conditional-Passungskonflikt; Modell-/Gewichts-/Konvertierungs-/Lizenzhash
und Ressourcenmessung für RGB-Segmentierung. Zwei echteSKUs von geprüften
Lieferantenfakten über echteDerivate bis zur endgültigenAnzeige sind noch nicht
abgenommen. Bilderstellungs-/Tonfreigabe und realeKunden-/Providergrenzen bleiben
eigene offeneGates. Keine Bestellung oder Zahlung als notwendigerAufbautest.

## Regression und Rückweg

`test_readonly_catalog.py`/`test_readonly_catalog_http.py` prüfen Einheiten,
Null/Bool/Duplicate-/Budgetfehler, Manifestzeitmanipulation, Symlinkeltern,
Hardlinks/FIFOs, Fristüberschreitung amEOF, autorisierte403-Negative und fehlende
Schreibwirkung. `browser-catalog.mjs` läuft mit isolierterFixture oder mit
`CATALOG_SNAPSHOT_MANIFEST` über den tatsächlichen Gateway-CLI. Sourcehashes
werden vor/nachLauf verglichen. Zusätzliche tatsächlicheSourceprobe bleibt
separat von synthetischerCI-Evidenz. CLI-/Routenabnahme ist keine Livefreigabe.

Rückweg: bestehendenCLI ohneSnapshot starten bzw. vorheriges explizites
unveränderlichesSnapshotmanifest wählen. Keine externeDatenmutation oder
Kundenmigration; Originale/ältereManifeste werden nicht gelöscht.

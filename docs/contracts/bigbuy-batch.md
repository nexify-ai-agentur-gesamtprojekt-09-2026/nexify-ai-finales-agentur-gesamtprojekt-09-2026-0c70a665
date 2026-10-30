# BigBuy: lokale Batchvorbereitung

BigBuy ist seit der ausdrücklichen Nutzerentscheidung27.10.2026 die gewählte
Produktquelle. Der vorhandene HTTP-/UI-Weg bleibt
[local-shop-http.md](local-shop-http.md). Diese Vorstufe erzeugt **keinen**
LocalShop-Verkaufskatalog. Der normale Server liefert weiterhin503 ohne explizit
gebundenen freigegebenen Adapter; keine synthetischen Artikel gelangen dorthin.

## Ausführbarer begrenzter Schnitt

`tools.bigbuy_batch.prepare(feeds, tenant=…, project=…, selected_taxonomies=…,
max_bytes=…, max_rows=…, max_text=…, max_images=…)` nimmt fünf JSON-Responsebytes:
products, information, images, stock, taxonomies. Alle Grenzen sind explizite
Callerbudgets; keine behaupteten Provider-SLAs. Taxonomie-IDs müssen ausdrücklich
gewählt und in der gelieferten Taxonomie enthalten sein. Das Produktfeld `taxonomy`
muss ein positiver Integer sein; fehlende oder ungültige Werte blockieren den Batch,
auch wenn `category` vorhanden ist. `category` und der Abrufparameter
`parentTaxonomy` sind kein Ersatz für `taxonomy`; ihre Beziehung und eine
Subbaumzuordnung sind nicht nachgewiesen. Keine Keywordheuristik
beweist Fahrzeugpassung. SKU und DE-Sprache der Beschreibung/Bestände werden
gebunden, EAN bleibt String einschließlich führender Nullen. Unbekannte optionale
Lieferantenfelder bleiben durch den unveränderten Inputhash nachweisbar.

Die Funktion verändert keine Bytes und schreibt keine Dateien. Aufrufer erhalten
Inputhashes, Konfigurationshash, deterministischen Outputhash und pro Produkt
getrennte Text-, Bildinventar- und Stockhashes. Bestehender Controller/Lease/
Remediation bleibt alleinige Ablaufzuständigkeit; hier wird keine zweite Queue
gebaut. Stock-only-Änderungen brauchen keine neue Text- oder Bildverarbeitung.
Wiederholung liefert denselben Output; Restart mit denselben Bytes ebenso.
Persistenz/Checkpoints, Claims und Wiederaufnahme der Batchausführung sind noch
nicht an den bestehenden Controller angeschlossen und werden nicht behauptet.

DE-Titel, Beschreibung, Metaentwurf und Alttext sind mit SupplierFactIDs verbunden.
HTML wird zu Text, aktive Elemente werden verworfen. Aussagen bleiben
unverifizierte Lieferantenaussagen mit verpflichtender Claimprüfung. Suppliertexte
werden nie als Anweisungen ausgeführt. Kein LLM-Aufruf und keine Modellkosten.
Ein Bildinventar erfasst **alle** Slots; es lädt keine URLs. Eine Hashidentität
ist weder Originalbildbytehash noch Lizenz-/Segmentierungs-/Qualitätsnachweis.

## Hartsperren und nächste Eingänge

Alle Ergebnisse sind review_draft/review_required, buyable=false,
publishable=false; deletions bleibt leer. Auch vollständige lokale Arrays sind
kein Beweis vollständiger Remote-Pagination. Fehlende Inputs/Teilfeeds dürfen
keine Produkte löschen. Quellenpreise werden nicht zu autorisierten Preisen
umgedeutet. Fitment, Lieferfenster, Steuer/Versand/Marge und aktuelle Bestände
bleiben unbestätigt. Keine Offers/Bestellungen/Zahlungen/StructuredData-Aktivierung.

Noch erforderlich: autorisierter BigBuy-Lesepfad mit Lizenz, tatsächlicher
versionierter Export und überprüfte Automotive-/Werkstatttaxonomie; danach
Provider-Rate-Limits/Pagination/Retry-After/Authstopp mit kontrolliertem Adapter.
Die aktuelle Implementierung ist offline und behauptet keinen HTTP-Connector.
Für Bilder fehlen konkrete kommerziell zulässige lokale Gewichte samt Code-,
Konvertierungs-, Gewichts- und Lizenzhashes, Originalbytes, Benchmark und QA.
Kein rembg-Default oder trust_remote_code. Originale bleiben unverändert;
Bildverarbeitung ist noch **nicht** implementiert. Veröffentlichung erst über
fertiges freigegebenes Manifest und die bestehende Shopnaht, nicht diesen Draft.

## Quellen, Prüfung und Rückweg

Direkt gelesene öffentliche Primärquelle https://api.bigbuy.eu/rest/doc.json:
ausgewählte fünf GET-Feedparameter und sieben Schemas, Beleg unter
`evidence/bigbuy-batch-2026-10-27/source-contract.json`. Die gesamte API, Zugang,
Taxonomieauswahl und reale Produktdaten sind damit nicht geprüft. Historische
Importercommits4a2cc3a/73f7eb7 und Parentpfade wurden hier nicht gefunden.
DATA-001/ECO-001 sind vom Parent gelesene Vertragsauszüge, keine Livefeeds.
Der bekannte verified/conditional-Kaufkonflikt bleibt offen und wird nicht
permissiv zusammengeführt.

Reproduktion: `python3 -m unittest discover -s tests -p test_bigbuy_batch.py`.
Rückweg: dieses reine Modul nicht aufrufen; bestehende HTTP-/Shopfunktion bleibt
unverändert. Keine Datenmigration oder externe Rücknahme erforderlich.

## Offline-Stagingvertrag /2

`stage_readonly_pages` erstellt ein eigenständiges Format
`nexify.bigbuy.offline-staging/2`, keine der beiden früheren schemaVersion1-
Formen. Es nimmt ausschließlich caller-gelieferte Metadaten und normalisierte
Listen entgegen; kein Netzwerk, kein Shopadapter und keine Veröffentlichung.
Grenzen: höchstens 10.000 Seiten beziehungsweise Zeilen pro Datentyp,
1.000 Bestandsbuckets pro Artikel, 100.000 Buckets insgesamt und 16 MiB
kanonische normalisierte Datensatzbytes; numerische Felder sind ebenfalls begrenzt.
Es erstellt kanonische unveränderliche Manifest-Bytes und deren SHA-256. Die
Quell- und Seitenhashes sind **Callerangaben**: Originalbytes und ihre Ableitung
zu den Listen werden hier nicht überprüft. Das Ergebnis kennzeichnet dies mit
`source_and_page_hashes_caller_asserted=true` und `raw_to_records_verified=false`.
Echte Provenienz benötigt gesondertes Readback und verifizierte Rechte.

Sample und Partial sind getrennt. Ein behauptetes Complete bleibt Partial und
`complete_verified=false`; weder kurze Seiten noch Seitenzahlen belegen eine
vollständige, stabil sortierte Lieferantenaufnahme. 409, 429 und Timeout stoppen
den Lauf. Doppelte Seitenkörper, IDs und SKU sowie verwaiste Varianten werden
abgewiesen. Bestandsbuckets behalten Mengen, Lager und Handlingbereich getrennt;
es wird keine Lieferzeit aus einer Summierung abgeleitet. Altes oder zukünftiges
Snapshotdatum wird gegen die ausdrücklich gelieferte Altersgrenze abgewiesen;
diese technische Grenze ist keine Freigabe oder Lieferanten-SLA. Währung, Steuer,
Rechte und Passung bleiben unbekannt, `saleEnabled=false`, ReleaseIDs leer.

`staging_quota_plan` rechnet mehrere angegebene Jobs sowie begrenzte Versuche
gegen ein caller-geliefertes Restbudget zusammen. Es ist nur eine offline
Planrechnung, keine atomare Reservierung, kein Multi-Prozess-Limiter und kein
Nachweis aktueller Kontingente oder Berechtigungen. Ein echter Abruf benötigt
später eine zentral koordinierte, persistente Quotenbindung und bestätigte
Endpunktgrenzen; keine automatischen Retries aus dieser Funktion. Das Modul
verarbeitet weder Versandquoten noch Bestell- oder Zahlungsschnittstellen.

## Begrenzte Rohdatenprojektion

`stage_raw_streams` nimmt vom Aufrufer bereitgestellte Streams und explizite Seitenmetadaten
entgegen; Lokalität und Laufzeit des Stream-Codes sind durch die Funktion nicht
erzwingbar und liegen beim Aufrufer. Es begrenzt die Summe der Eingabebytes
vor JSON-Parsing auf höchstens 16 MiB, hasht die tatsächlich gelesenen Bytes und
projiziert daraus ausschließlich Produkt-ID/SKU/EAN, Varianten-Parent/SKU/EAN
und getrennte Bestands-/Handling-/Lagerbuckets. Ungültiges JSON, doppelte Keys,
fehlende Felder oder 409/429/andere nicht erfolgreiche Seiten stoppen den Lauf.
Der Modulcode öffnet keine Netzwerkverbindung und startet keine Bestellungen;
ein vom Aufrufer gelieferter Stream kann dennoch externe oder blockierende
Operationen ausführen und muss vor Nutzung vertrauenswürdig geprüft werden. Das Manifest bindet
die Seitenhashes an die aus diesen Bytes erzeugte Projektion; Seitenstatus,
Scope und Abrufzeit bleiben Angaben des Aufrufers. Ein solcher Byte-Hash beweist
weder Lieferantenidentität, Zugangsrechte, aktuelle Daten noch Vollständigkeit.
Die Ausgabefelder für Verkauf und Rechte bleiben unverändert gesperrt/unbekannt.
Nicht projizierte Felder und Originalbytes sind vom Aufrufer unverändert und
sicher aufzubewahren; dieser Prozess archiviert sie nicht selbst.

Die 16-MiB-Grenzprüfung betrifft die serialisierten normalisierten Daten; sie
wird nach der Serialisierung ausgeführt und ist keine gemessene Peak-RAM-Garantie.
Die Quotenrechnung ist und bleibt eine nicht atomare Planung: Zwei getrennte
Caller können beide mit demselben alten Stand `allowed=true` erhalten. Vor realer
Nutzung sind ein gemeinsamer atomarer Limiter und autorisierter Kontingentstand
notwendig. Keine alleinige `allowed`-Antwort erteilt Abruf- oder Kostenfreigabe.

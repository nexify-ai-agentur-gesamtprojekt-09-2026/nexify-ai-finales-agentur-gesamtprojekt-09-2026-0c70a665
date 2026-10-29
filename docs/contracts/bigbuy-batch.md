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
gewählt und in der gelieferten Taxonomie enthalten sein. Keine Keywordheuristik
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

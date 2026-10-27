# Lokaler Shopweg: Browser → HTTP → vorhandener Store → Read-back

Folgeblock auf b08a7fc, keine produktive Handelsfreigabe. `apps/site` bleibt
App-Root mit derselben Shell, Navigation, DE/NL/FR, Tokens und getrenntem
TEILEKLAR-Kontext. config/one-web-app.json führt den neuen lokalen Shop-Vertrag
explizit als Teilmodul mit false für reale Katalog-/Order-/Zahlungsaktivierung. Kein neues Dashboard, Framework, Konto oder DB-System.

## Tatsächlich ausführbar

`apps/web/components/ShopPanel.tsx` ist in bestehenden Such-/Kategorie-/Produkt-/
Warenkorb-/Kassenrouten eingebunden. `useUI().session` verwendet die bereits
verifizierte Antwort des vorhandenen Besuchersitzungs-Endpunkts; kein paralleler
Sitzungsstart, keine Interpretation von Clerk-/LocalStorageclaims als Tenantrechte.
Das ist eine lokale Gastvorbereitung, keine verifizierte Kunden-/SSO-Integration.

Die vorhandene `build_server(..., shop=None)`-HTTP-Schicht nimmt optional einen
explizit gebundenen Shopadapter auf demselben Store an. Der normale CLI startet
weiter ohne Artikelquelle. Er liefert für `/api/shop/catalog` HTTP503
`catalog_not_configured` und keine Testartikel. Synthetischer Bestand wird nur vom
isolierten Fixture unter `apps/site/tests/fixtures/shop-server.py` geladen; keine
öffentliche Konfiguration, Fixtureinstallation oder Providerverbindung erfolgt.

| Lokale Route | Verhalten |
|---|---|
| GET /api/shop/catalog | Explizite Katalogprojektion: Suche, Kategorie, Sprache, begrenzte Ergebnisse mit partial; keine Bestands-/Passungszusage |
| POST /api/shop/cart | Store/Locale prüfen, persistenten Warenkorb erstellen; Gastfähigkeit ausschließlich als HttpOnly/SameSite-Cookie unter /api/shop |
| GET /api/shop/cart | Bestehende Sitzung plus objektgebundene Fähigkeit prüfen, gespeicherten Stand lesen |
| POST /api/shop/cart/items | CSRF, exakte Origin/Host, Cartziel, If-Match, Idempotenz und serverseitigen Katalog prüfen |
| POST /api/shop/cart/checkout-draft | Nur leeres Eingabeobjekt, nicht leerer Warenkorb und exakte Version; atomar gesperrten Checkout-Entwurf speichern |
| GET /api/shop/cart/checkout-draft | Gesperrten Entwurf für dieselbe gespeicherte Warenkorbversion zurücklesen |

Die lokalen `/api/shop`-Routen ersetzen nicht still die vorgeschlagenen
`/v1/shop`-Produktionsoperationen in factory.openapi.json. Deren Live-/Providerstatus
bleibt unbestätigt. Jedes vom Shop kommende `production_accepted` ist fest false;
`order_submitted` und `payment_started` bleiben fest false. Es gibt weder Order-
noch Zahlungsadapter. Keine Bestandsreservierung oder Fundingregel wird ersetzt.

Frontendcode erhält weder Gasttoken noch Signierschlüssel als JSON/Storagewert.
Cookie und Besuchersitzung sind serverseitig erforderlich; Browserrolle, Tenant-
oder Preisfelder erteilen keine Rechte. Die UI ändert Mengen nur nach Bestätigung
und blockiert weitere Mutationen bei unklarem Ausgang. Bewusstes Lesen löst die
Sperre erst nach bestätigt gespeichertem oder leerem Stand. Kein automatischer
Schreibretry. Aktionssperren verhindern parallel überschreibende Reads/Mutationen.
Reload und Backend-Neustart verwenden denselben Store und dieselbe Fähigkeit.
Ein Checkout-Entwurf ist pro Cartversion auch über neue Idempotenzkeys eindeutig.

## Bestehende Datenverträge, kein zweites PIM

Parent hat DATA-001/ECO-001 vom31.08.2026 und das Cent-/B2C-/B2B-Datenblatt vom
29.09. tatsächlich gelesen. Hier liegen nur die ausdrücklich nachgereichten
technischen Auszüge vor, keine vollständige Originallektüre oder Live-Feedprüfung.

- DATA-001: Product/Variant/Fitment/Evidence/Offer/InventorySnapshot mit
  Quellenreferenzen, Status, Gültigkeit, Rohdatenversion und domänenspezifischer
  Freshness. Dokumentquelle: https://drive.google.com/file/d/1_d8SIRCsI1QvkvLbY3H1Ih9dnRfkuI_b/view
- ECO-001: belegte oder sichtbar bedingte Passung, aktuelle Preis-/Steuer-/Versand-/
  Bestandsdaten, Compliance/Rechte, Retourenrollen und nachvollziehbare Kalkulation.
  Keine konkrete Marge oder Einkaufskondition wurde übergeben/freigegeben.
  https://drive.google.com/file/d/1vYLSkEiBVJ88700wF9Zqk5xfQWMTsjJL/view
- `docs/03-backend/backend-und-datenbank.md` beschreibt bereits Product/Fitment,
  Marktpreise mit Gültigkeit und Lieferantenbestand mit Auslesezeit. Die neue
  Katalogprojektion dient nur der lokalen Testadapterstrecke, nicht als alternative
  Lieferanten-Wahrheit. Sie benutzt product_id/name/category und die gebundene
  serverseitige Preisprojektion; Status/Variant/Evidence/Freshness/Inventory-
  Ingestion sind noch nicht als realer Provideradapter implementiert.
- Konflikt: Backenddokument Zeile259 erlaubt nur verified zum Bestellen;
  Betriebslogik Zeile28 beschreibt conditional als Kauf mit Klärhinweis. Dieser
  Konflikt bleibt fachlich offen bei Shop/Produkt. Keine permissive Vereinigung:
  in diesem Schritt wird weder verified noch conditional tatsächlich bestellt.
- BigBuy-Dokumentation/alte generische Demoartikel sind kein heutiger Feed und
  keine Fahrzeugpassungsfreigabe. Pneudata-Schema, Nutzungs-/Fitmentlizenz,
  Frische-TTL, Bestandsreservierung und tatsächlicher Order-/Statusweg sind offen.
  Architekturcachewerte sind keine behaupteten Provider-SLAs.

Realer nächster Eingang: zugelassener Lieferant plus versionierter Originalexport
oder autorisierter dokumentierter Lesezugang, SKU/Variant-/Fitmentprovenienz,
Markt-/B2C-/B2B-Preis/Steuer/Versandkalkulation, Bestandszeit samt freigegebener
Frische-/Lieferregel und read→normalize→fitment→offer→order→status→exception-POC.
Owner: Shop/Produkt/Lieferantenintegration. Ohne diese Eingänge keine echten
Artikel, Passung, Verfügbarkeit, ETA oder Kaufannahme aus Testdaten ableiten.

## Verifikation und Rückweg

Sechs echte HTTP-Tests ergänzen die16 bestehenden Carttests. Neun Playwrightfälle
nutzen die tatsächliche Python-API und SQLite: DE/NL/FR, Filter/Kategorien,
abgebrochene Erstellung, 404-Reconciliation, HttpOnly, Reload, verlorene Antwort
nach Commit, Mengen/Entfernen, eindeutiger gesperrter Checkout, Prozessneustart,
fremder Besucher mit gestohlener Test-Cartcookie, unbekannte Providerverbindung,
Mobiltastatur und Tokenlayout. Keine API-Mocks im erfolgreichen Geschäftsdatenpfad;
gezielte Browserabbrüche und synthetische Nichtverbindungsantworten sind markiert.
Das bleibt eine lokale Fixtureprüfung und keine Kunden-/Provider-/Rechtsabnahme.

Der unabhängige Sol-Befund SHOP-UI-001 (404-Readback entsperrt nicht) ist behoben
und erhält eine Browserregression. `tools/check_browser_evidence.py` bindet den
Shopbeleg an API/UI/Fixture-Hashes und verlangt echte HTTP-/Persistenznachweise;
sein Erfolg ist nur die Integrität gespeicherter Belege, kein neuer Browserlauf.

Reproduktion: `python3 -m unittest discover -s tests -p test_local_shop_http.py -v`
und `node apps/site/tests/browser-shop.mjs` mit Node22/Playwright/Chromium sowie
Python3 aus den bestehenden Werkzeugen. Kein zusätzlicher Service oder Zugang.
Rollback: eigenen Checkout auf b08a7fc beibehalten; keine produktive Migration,
Domain-/Serveränderung oder echte Bestellung/Zahlung wurde durchgeführt.

## Jüngste Designwahl und tatsächliche Differenz

Der Nutzer wählt am27.10.14:39UTC die Produktionsreferenz
https://nexify-ai-finales-agentur-gesamtpro.vercel.app/ . Parent hat sie frisch an
main2a552ed/dpl_4V5wejxZKiij1ZbniFkD5vCwUxLg gebunden. Diese Wahl ersetzt die
frühere a19-Vorschau als visuelle Autorität; keine Funktions-/Medienabnahme.
Die lokale v6-Integration enthält main2a bereits. Sieben von acht verglichenen
Design-/Tokenquellen sind bytegleich; WorkspaceRebuild.css ergänzt ausschließlich
13 bereits geprüfte A11y-/Reflow-Zeilen. HomeContent hat eine generische NL/FR-
Werkstattbeschriftung korrigiert. Diese funktionalen Korrekturen bleiben erhalten.
Der Vergleich in evidence/shop-http-2026-10-27/design-reference-comparison.json
belegt diese begrenzte Sourceaussage, keine vollständige Live-Pixelabnahme.

# Lokale Warenkorbvorbereitung

Begrenzter Folgeblock nach Quellen-/Medienvertrag a66a509. Kein funktionierender
Gesamtshop und keine produktive Gastbestellung werden dadurch behauptet.

## Quellen und bestehender Kern

`docs/contracts/factory.openapi.json` beschreibt CartInput, Cart, CreatedCart,
CartChange sowie createCart/readCart/changeCartItems bereits als Zielvertrag.
`config/operating-model.json` trennt Agentur und TEILEKLAR-Handel;
`docs/contracts/factory-api-auth.md` verlangt servergebundenen Tenant, objektgebundene
Gastfähigkeit, Idempotenz und unveränderte finanzielle Freigabegates.
Master1.2 RQ034 fordert tatsächliche Shopumsetzung; historischer Muster-Shop-Entwurf
ist kein freigegebener Artikelbestand oder heutiger Preisvertrag.

`apps/agent-gateway/cart.py::LocalCart` erhält denselben vorhandenen visitor.Store
und verwendet dessen objects/receipts und SQLite-Transaktion. Keine zusätzliche
Datenbank, Queue, Identitätsquelle oder externe Schnittstelle. Das Modul ist über
seine lokale Python-API ausführbar; es ist noch nicht per HTTP oder UI verdrahtet.
Die bestehenden öffentlichen Fähigkeiten bleiben unverändert.

## Tatsächlich implementiert

- Bestehende nicht abgelaufene Besuchersitzung für jeden Zugriff, zusätzlich
  objektgebundene HMAC-Gastfähigkeit für Lesen/Ändern. Kein Kontozugriff, Checkout
  oder Freigabe aus diesem Token; tatsächlicher Produktions-Identityadapter fehlt.
- Tenant, Store, Währung, Katalogversion und Artikelpreise kommen ausschließlich
  aus expliziten Adaptereingaben. Keine Browserpreis-/Tenantübernahme. Die Tests
  verwenden synthetische IDs und Preise, keine realen Waren oder Kundendaten.
- Der unveränderliche Kataloghash bindet den Warenkorb. Ein geänderter Preis,
  Versionsstand oder Währungsadapter erzwingt expliziten Abgleich; kein stilles
  Repricing und keine implizite Verfügbarkeit/Passung/Steuer-/Versandzusage.
- Explizite positive Laufzeit und Mengenobergrenze ohne Produktdefaults. Ablauf
  und Sitzungsverlust sperren auch Replay; keine Verlängerung durch Wiederholung.
- Erstellung/Änderung und Idempotenzbeleg committen atomar. Gleiche Schlüssel
  mit abweichendem Payload oder Versionsstand scheitern. Erfolgreiche Replays
  liefern ihren ursprünglichen Beleg; Versionsvergleich schützt gegen verlorene
  konkurrierende Änderungen. Menge0 entfernt eine Position.
- Die Datenbankbelege enthalten keine Gasttoken. Die Fähigkeit wird aus einem
  getrennten zufälligen serverinternen Schlüssel und exaktem Ziel abgeleitet. Der
  Schlüssel bleibt im bestehenden privaten Store; der an den Browser ausgegebene
  CSRF-Wert darf ihn nicht ersetzen. Ein fehlender Schlüssel sperrt bestehende
  Warenkörbe und deren Replay. Jeder Warenkorb bindet zusätzlich die Schlüsselgeneration
  per Fingerprint. Auch nach einer neuen Schlüsselanlage für einen neuen Warenkorb
  bleibt der Altwarenkorb gesperrt; kein stilles Rekeying durch Create-Replay.
  Kein Providerzugang wird eingerichtet.

## Beweis und Grenze

`python3 -m unittest discover -s tests -p test_local_shop_cart.py -v`
prüft sechzehn Fälle: persistentes Readback/Restart/exaktes Replay, fremder Besucher,
Tenant/Store/Cart/Token, Ablauf, Sitzungsablauf, geänderter Katalog, manipulierte
Preis-/Tenantfelder und Mengen, Schlüsselkonflikt, Entfernen, konkurrierende
Erstellung/CAS, SQL-Transaktionsabbruch sowie echter Prozessabbruch vor Commit
mit anschließendem Wiederanlauf. Zusätzliche Gegenproben lehnen einen mit
Browser-CSRF selbst berechneten Token und verlorene Signierschlüssel ab. Dies ist eine lokale synthetische Adapterprüfung,
keine reale Provider-, Shop-, Rechts- oder Produktionsabnahme.

Offen mit Owner Shop/Produkt/Identity: autoritativer Shop-/Mandanten-/Katalogstand,
Artikel-/Bestands-/Passungsdaten, Preise/Steuern/Versand, sichere HTTP-/UI-Anbindung,
Rate-/Missbrauchsgrenzen, geeignete Produktionssitzung, Bestellung/Bezahlung/
Reconciliation, Gastwiderruf/Retouren ohne Konto und reale vollständige Abnahme.
Diese Punkte blockieren ihre konkrete Verkaufs-/Livewirkung. Ein lokaler Warenkorb
ersetzt keine Bestandsreservierung, kein Funding und keinen zahlungspflichtigen
Vertrag. Kein tatsächlicher Bestand oder Preis wird aus synthetischen Tests erzeugt.

Nächster zulässiger Schritt: unabhängig geprüften Kern an einen ausdrücklich
gebundenen lokalen Testadapter anschließen, danach eigene UI-Nutzerwege mit
DE/NL und abgesicherten Negativfällen prüfen. Reale Geschäftsdaten erst mit
geklärtem Tenant-/Shopmapping und jeweils betroffenen Freigaben.
Rollback: auf a66a509 getrennt auschecken; keine produktive Schemaänderung,
Datenmigration, Veröffentlichung oder externe Zahlung ist erfolgt.

## Tatsächlich geprüfte Datenverträge

- `docs/03-backend/backend-und-datenbank.md:111` bis Abschnitt3.3 enthält
  product_i18n,vehicle,fitment mit verified/conditional/blocked und Quelle/Datum,
  price je Markt mit valid_from/valid_to sowie stock mit supplier/fetched_at.
  Das sind dokumentierte Tabellenverträge, kein zugänglicher Lieferantenfeed.
- `docs/01-konzept/gesamtprojektplan.md:145` führt Lieferantenvertrag und
  Integrationsklärung offen; P0 verlangt schriftlichen Bestands-/Preis-/Bestellweg.
- `docs/01-konzept/teileklar-shop.md:49` nennt den Lieferantenvertrag für
  Katalog/Bestand/Preise ausstehend. Diese historische Aussage belegt keine
  heutige Vollinventur aller externen Anbieter.
- `apps/web/lib/catalog.ts` selektiert Seiten aus site-map.json. Trotz des Namens
  ist es kein kommerzieller Artikel-, Preis-, Bestands- oder Fitmentadapter.

Konkreter noch fehlender Eingang für echte Handelsdaten: autorisierter Anbieter,
API-/Dateischema und Version, zugelassene Shop-/Tenantbindung, Artikel-/Kategorie-/
Fahrzeugschlüssel, Quellen-/Gültigkeitszeiten, freigegebene Marktpreise/Steuern,
Bestands-/Liefersemantik sowie zulässiger Bestell-/Storno-/Retourenweg. Owner:
Shop/Produkt und Lieferantenintegration; kein geratenes Konto oder neuer Zugang.
Die sichere lokale Vorbereitung mit synthetischen Fixtures läuft davon unabhängig.

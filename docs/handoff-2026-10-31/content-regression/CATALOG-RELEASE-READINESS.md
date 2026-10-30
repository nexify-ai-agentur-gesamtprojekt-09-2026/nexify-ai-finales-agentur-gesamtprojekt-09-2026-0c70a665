# NEX-SHOP-COMPLETION-20261030-07 — Katalog Release-Readiness: exakt fehlende Felder

Quelle der Anforderungen: read-only Contract `apps/agent-gateway/catalog.py` (nur gelesen, reserviert). SOURCE = `https://teileklar.shop/api/shop/products`. Snapshot-Kandidaten liegen lokal unter `.local/bigbuy-snapshot-*` (gitignored, BigBuy-/Backend-Domäne). **Kein Doppelwriter, keine Datengenerierung hier.**

## Ist: Was der read-only Pfad heute liefert (bewusst alles „not_verified")
Pro Produkt setzt der Adapter fix: `buyable:false`, `availability_status:'not_verified'`, `fitment_status:'not_verified'`, `freshness_status:'not_verified'`, `provenance_status:'reported_not_verified'|'missing'`, `supplier_updated_at:null`, `source_price:{tax_basis:'not_verified', shipping:'not_verified', commercial_approval:false}`, `text_facts.claim_review:'required'`. Katalogweit: `checkout_enabled:false`, `production_accepted:false`, `maximum_quantity:0`, `partial:true`, `pagination.status:'partial_unverified_continuation'`.

## Soll: Für Promotion read_only → kaufbar müssen diese Felder VERIFIZIERT geliefert werden

### Feed-/Produktfelder (pro Artikel)
1. **Bestand/Verfügbarkeit** — `availability_status` verifiziert (statt `not_verified`); `stock` mit belegter Aktualität (nicht nur gemeldet).
2. **Fitment** — `fitment_status` verifiziert: belegte Fahrzeug-/Passungszuordnung (Hersteller/Modell/HSN/TSN, Einbaulage, Maße). Heute fehlt die Verifizierung vollständig.
3. **Preis-Einheiten** — `source_price.tax_basis` (Netto/Brutto + Steuersatz), `source_price.shipping` (Versandbasis), `source_price.commercial_approval:true`. Heute alle `not_verified`/`false`.
4. **Herkunft/Rechte** — `provenance_status` verifiziert (statt `reported_not_verified`/`missing`); Nutzungs-/Vertriebsrechte am Quellkatalog belegt.
5. **Bildrechte** — Bild bereits auf approved Referenz (`/api/shop/image`) begrenzt; ausstehend: Bildfreigabe/Zuordnung (`text_facts.claim_review` von `required` → erledigt).
6. **Aktualität/Freshness** — `supplier_updated_at` (echter Lieferanten-Zeitstempel, heute `null`) + `freshness_status` verifiziert (Aktualisierungsrhythmus abgenommen).
7. **Textfakten/Claims** — `text_facts.claim_review` abgeschlossen (Titel/Meta aus belegten Fakten, kein Keyword-Stuffing).

### Katalog-/Freigabefelder (global)
8. **releasedProductIds** — aktuell **leer**: explizit freigegebene Produkt-ID-Menge erforderlich (Whitelist statt Gesamt-Snapshot).
9. **checkout_enabled / production_accepted** — auf `true` erst nach Anbieter-/Liefer-/Zahlungsabnahme.
10. **maximum_quantity** — >0 (heute 0, d. h. keine Warenkorbmenge).
11. **pagination** — vollständige, nicht `partial_unverified_continuation`; `page_parameter` verifiziert (heute `not_verified`).
12. **Snapshot-Manifest** — `freshness_status` darf für Promotion nicht `not_verified` bleiben (Adapter lehnt `snapshot_unsupported_promotion` ab); `source_url==SOURCE`, kanonische Bytes, `raw_file`-Hash bleiben Pflicht.

## Deterministische Import-/Validierungs-/Darstellungslogik — Stand
- **Darstellung:** vorhanden und deterministisch (`ShopPanel.tsx` read-only Mode mit expliziten „ungeprüft"-Labels; keine Beispielartikel, keine Kaufaktion).
- **Validierung beim Laden:** vorhanden und streng im reservierten Adapter (`catalog.py` `require(...)`: EAN-Ziffern, numerischer Preis mit Präzision, Quelle==`BigBuy`/status==`catalog`, Manifest-Hash-Bindung, Zeitzone). **Nicht dupliziert** (keine Doppelwriter).
- **Import/Promotion:** BigBuy-/Backend-Domäne (reserviert). Offene Übergabe: Backendcommit `a4a21f…`.

## Freigabe-Checkliste (für Backend-Übergabe, read-only Sicht)
Erst wenn alle 12 Punkte verifiziert geliefert werden UND `lib/pseo.js` (8/8) für datenabgeleitete Seiten besteht, darf `releasedProductIds` befüllt und `checkout_enabled/production_accepted` aktiviert werden. **Nicht ungeprüft live freigeben.**

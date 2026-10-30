# NEX-SHOP-COMPLETION-20261030-07 — Soll / Ist / Beleg (Shop, Werkstatt, Partner, Stadt)

Status: **`make test` = 583 OK**. Keine Code-Änderung in diesem Auftrag nötig — die Oberflächen sind bereits vorhanden, ehrlich und getestet; die Fertigstellung ist an **Daten/Rechte** gebunden (reservierte Backend-/BigBuy-Domäne). Kein Main-Push/Publish. Keine erfundenen Bestände/Preise/Fitment/Partner.

## Dateigrenzen (reserviert, unverändert)
`api/**`, `apps/agent-gateway/**` inkl. Backend-Tests sowie `tools/bigbuy_batch.py`, `tests/test_bigbuy_batch.py`, `docs/contracts/bigbuy-batch.md`. Nur gelesen zur Vertragsklärung, nicht geschrieben. Keine Doppelwriter zum Backendcommit `a4a21f…`.

## Soll / Ist / Beleg

| Oberfläche (Soll) | Ist | Beleg |
|---|---|---|
| Katalog (read-only Quellenausschnitt) | **vorhanden** — `/api/shop/catalog`, Mode `read_only`, alle Felder `not_verified`, `buyable:false` | `browser-catalog.mjs` PASS (4/4); `test_readonly_catalog(_http)` |
| Suche + Filter (Kategorie) | **vorhanden** in `ShopPanel.tsx` (query/category, scoped auf geladenen Ausschnitt) | `browser-catalog.mjs` „local filtering and reload remain scoped" |
| Produktdarstellung (SKU/EAN/Bestand/Quellpreis, Herkunfts-/Passungs-Hinweis) | **vorhanden** (read-only Produktliste mit expliziten „ungeprüft"-Labels, keine Beispielartikel) | `browser-catalog.mjs` „DE NL FR labels retain explicit German supplier facts" |
| Warenkorb (anlegen/hinzufügen/Menge/entfernen, If-Match-Version, Idempotenz) | **vorhanden** in `ShopPanel.tsx` (`/api/shop/cart`, `/items`) | `browser-shop.mjs` PASS (Idempotenz/410/Readback); `test_local_shop_cart(_http)` |
| Checkout-Entwurf (ohne Bestellung/Zahlung) | **vorhanden** — `blocked_provider_acceptance`, `order_submitted:false`, `payment_started:false` | `browser-shop.mjs`; `test_local_shop_*` |
| Lade-/Leer-/Fehler-/„unconfigured"-Zustände | **vorhanden** (ShopPanel: loading/empty/error/unconfigured/unavailable, DE/NL/FR) | Code + `browser-*` Zustände |
| Werkstattverzeichnis (Stadt-Standorte) | **vorhanden** — `WorkshopDirectory.tsx`, 16 Standorte DE/AT/CH/NL/BE/LU, ehrlicher Leerzustand bis geprüfte Quelle, nie „verifizierte Vertragspartner" | mounted in `PublicExperience` (`tk-workshop`) |
| Partneranfrage (Formular, Idempotenz, Receipt) | **vorhanden** — `PartnerRequestForm.tsx` (Receipt-Vertrag, siehe PARTNER-RETRY-pruefbeleg) | `test_partner_reception`; PARTNER-RETRY-pruefbeleg |
| Stadt-/Fahrzeugseiten (pSEO) | **Regelwerk vorhanden** (`config/pseo.json`, Gate `lib/pseo.js` 8/8), **Seiten nicht veröffentlicht** | siehe Blocker B |

## Verknüpfungen/Formulare
- `tk-*`-Routen mounten die passenden Panels über `PublicExperience` (Shop/Workshop/Partner). Next-Actions/Links zwischen Suche↔Kategorie↔Produkt↔Warenkorb↔Kasse + Kontakt/Chat sind gesetzt (Paket 1). Werkstatt↔Termin↔Partner verlinkt.

## Konkrete externe Blocker (kein Fake-Bau)
- **Blocker A — Katalog-Release:** `releasedProductIds` leer; historischer Kandidat (3.720 Datensätze / BigBuy) in **Quarantäne**. Promotion read_only→kaufbar erfordert verifizierte Felder (siehe `CATALOG-RELEASE-READINESS.md`). Datengenerierung ist BigBuy-/Backend-Domäne (reserviert).
- **Blocker B — pSEO Stadt-/Fahrzeugseiten:** datenabgeleitet (Fitment, Bestand, Einbaulage, Maße). Ohne freigegebenen Katalog nur mit erfundenen Daten baubar → bewusst **nicht** gebaut. Entsperrt sich mit Blocker A + Bestehen von `lib/pseo.js` (8/8).
- **Blocker C — Werkstattverzeichnis-Daten:** 579 Verzeichnis-Datensätze mit **unbelegter Herkunft/Nutzungsrechten** → `/teileklar/workshops.json` bewusst nicht verbunden; ehrlicher Leerzustand bleibt bis geprüfte, rechtefreie Quelle vorliegt.
- **Blocker D — Bestellung/Zahlung:** kein Zahlungs-/Bestellnachweis des Backends → Checkout bleibt Entwurf (`blocked_provider_acceptance`). Vollständiger Launch erst mit echtem Katalog/Auth/Bestellprozess.

## Belegläufe (echt, nicht nur SourceSHA)
- `make test` = **583 OK**.
- `apps/site/tests/browser-catalog.mjs` = **PASS** (echtes Chromium → Loopback-HTTP → immutabler Katalog-Input, keine Order/Bild/Modell-Calls).
- `apps/site/tests/browser-shop.mjs` = **PASS** (echtes Chromium → Loopback → SQLite-Fixture, Idempotenz/410/Readback).
- Python: `test_readonly_catalog(_http)`, `test_local_shop_cart(_http)`, `test_partner_reception`, `test_seo_catalog` (53 Tests OK).

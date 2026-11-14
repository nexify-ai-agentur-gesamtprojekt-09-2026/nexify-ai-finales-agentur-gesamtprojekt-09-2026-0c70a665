# TEILEKLAR-Shop auf der eigenen Supabase-Instanz (PostgreSQL) — Bestandsaufnahme und Umstellungsplan

Stand 14.11.2026 · Branch `claude/shop-supabase` · Grundlage, kein Umbau. Entscheidung
des Inhabers vom 14.11.2026 (D-012 in `DECISIONS.md`): Shop und übrige Datenhaltung
laufen künftig auf der selbst gehosteten Supabase-Instanz.

**Was heute vorliegt:** Zielschema `db/shop/001_shop.sql`, Prüfungen `db/shop/verify.sql`
und `db/shop/test.sh`, dieser Plan. **Was nicht verändert wurde:** kein Dienstcode, kein
Verhalten der Shop-API, keine Projektbindung, keine echte Datenbank. Der Shop antwortet in
der Produktion weiter mit 503, bis die Pakete unten umgesetzt und freigegeben sind.

Angaben sind als **belegt** (aus Code oder Testlauf) oder **Schätzung** gekennzeichnet.

## 1. Bestandsaufnahme (belegt aus dem Code auf `origin/main`, Commit `70b923e`)

### 1.1 Zugriffsschicht

Es gibt **keine** Datenzugriffsschicht. `apps/shop-api/shop/db.py` legt beim Import einen
Motor-Client an und exportiert ein globales `db`. Jedes Modul ruft darauf direkt
Mongo-Operationen auf: **227 Aufrufstellen in 15 Dateien**, davon 139 in den Modulen, die
`vercel_app.py` in Vercel lädt, und 88 in `nexify_api.py` (nur in `shop/main.py`
eingebunden, in Vercel nicht ausgeliefert).

| Datei | Aufrufstellen | Mongo-Besonderheiten, die im Code sichtbar sind |
|---|---:|---|
| `shop/accounts_api.py` | 24 | `DuplicateKeyError`, TTL-Indizes, `find_one_and_update` |
| `shop/checkout_api.py` | 19 | `DuplicateKeyError`, `$inc`/`$pull`/`$unset`, bedingtes `find_one_and_update` |
| `shop/mailer.py` | 17 | `$regex` auf Zeitstempel-Zeichenketten, Zustandsübergänge per Filter |
| `shop/admin_api.py` | 13 | `ReturnDocument`, `$regex` auf `_id` des Postausgangs |
| `shop/bigbuy_import.py` | 13 | Transaktion (`start_session`, Snapshot/Majority), `bulk_write`/`UpdateOne` |
| `shop/cart_api.py` | 10 | Transaktion, `BSON.encode` gegen die 16-MB-Grenze, `DocumentTooLarge` |
| `shop/workshops_api.py` | 9 | `$regex`, Feld-Existenz (`lat`) |
| `shop/catalog_api.py` | 8 | Aggregation (`$unwind`/`$group`), `$regex`-Suche |
| `shop/bigbuy_selection.py` | 8 | Upsert je Produkt ohne Transaktion |
| `shop/requests_api.py` | 7 | `DuplicateKeyError` auf `_id` |
| `shop/fulfillment.py` | 6 | Anspruch per `find_one_and_update` |
| `shop/revolut.py`, `shop/main.py`, `shop/pricing.py` | 5 | `replace_one` mit Upsert, Zählungen |
| `shop/nexify_api.py` | 88 | 17 weitere Collections (Angebote, Rechnungen, Tickets, Projekte …) |

Die vorhandenen Tests sind an diese Form gebunden: 9 Dateien unter `tests/` (2.190 Zeilen)
und 3 unter `apps/shop-api/tests/` ersetzen einzelne Mongo-Aufrufe
(`db.carts.update_one = AsyncMock(...)`). Eine Schicht einzuziehen heißt deshalb auch,
diese Tests auf die neue Grenze umzustellen, ohne eine Aussage zu verlieren.

Folge für Auftragspunkt 5: Der lesende Katalog lässt sich **nicht** an einer bestehenden
Stelle umschalten. Dafür müsste zuerst eine Schicht eingezogen und der Laufzeitschutz in
`vercel_app.py` (der heute ausschließlich Mongo-Metadaten prüft) erweitert werden. Das
ist Paket 1 und 2 und wurde bewusst nicht „auf Verdacht“ begonnen.

### 1.2 Collections, Felder, Indizes, Eindeutigkeit

Quelle der Indizes: `shop/db.py::ensure_indexes`, `shop/accounts_api.py::ensure_auth_indexes`
und die Liste `INDEXES` in `vercel_app.py`. Die 18 Collections sind die Liste `COLLECTIONS`
in `vercel_app.py`.

| Collection | Schlüssel und Eindeutigkeit | Wesentliche Felder | Zieltabelle(n) in `shop` |
|---|---|---|---|
| `products` | `_id` = `bb-<id>`; `bigbuy_id` eindeutig; Indizes `(active, category_ids)`, `ean`, `sku` | `sku`, `ean`, `name`, `description`, `images[]`, `category_id`, `category_ids[]`, `purchase_cents`, `stock`, `details`, `active`, `buyable`, `publishable`, `shipping_cost_cents`, `source`, `source_environment`, `imported_at`, `first_imported_at`, `import_run_id`, `image_source` | `product`, `product_category` |
| `categories` | `_id` = Taxonomie-ID | `name`, `root`, `source` | `category` |
| `imports` | `_id` = Lauf-ID | `status` (`running`, `done`, `failed`, `publication_unknown`), `environment`, `mode`, `partial`, `started_at/by`, `finished_at`, `counts`, `taxonomy_ids`, `manifest`, `error`, `coverage` | `import_run` |
| `source_manifests` | automatisch; dient zusätzlich als „Claim“ des Namespace-Operators | Quellnachweis je Lauf, `run_id` | `source_manifest` |
| `settings` | `_id` = `shop` bzw. `bigbuy_publication` | `markup_percent` (Zeichenkette), `shipping_cents`, `price_release{markup_percent, released_at, released_by}`, `updated_at/by`; `revision` als Sperrzähler der Veröffentlichung | `setting` |
| `price_releases` | automatisch, nur Anfügen | `action`, `markup_percent`, `released_at`, `released_by` | `price_release` |
| `carts` | `owner` eindeutig (`user:<id>` oder `guest:<id>`) | `items[{product_id, name, quantity, price_seen_cents}]`, `revision`, `merge_history[]`, `updated_at` | `cart`, `cart_item`, `cart_merge` |
| `orders` | `_id` = UUID; `(owner, idempotency_key)` eindeutig; Indizes `revolut_order_id`, `user_id` | `number`, `status`, `lines[]`, Beträge in Cent, `vat_percent`, `address`, `request_hash`, `cart_revision`, `paid_transitions`, Zahl-, Versand- und BigBuy-Felder | `customer_order`, `order_line`, `payment` |
| `webhook_events` | `event_key` eindeutig (sha256 des Webhook-Inhalts) | `event`, `order_id`, `received_at` | `payment_event` |
| `revolut_webhooks` | `_id` = Modus (`live`/`sandbox`) | `webhook_id`, `url`, `signing_secret`, `events` | `payment_webhook` |
| `outbox` | `_id` = Ereignisschlüssel (z. B. `order_paid:customer:<id>`) | `to`, `subject`, `html`, `text`, `status` (7 Zustände), `attempts`, `claim_id`, `claimed_at`, `provider_id` | `outbox` |
| `users` | `email` eindeutig, `user_id` eindeutig | `name`, `role` (`customer`/`admin`), `password_hash` (bcrypt), `google_linked` | `account` |
| `sessions` | `token_hash` eindeutig; TTL auf `expires_at` | `user_id`, `created_at` | `account_session` |
| `login_failures` | TTL 900 s auf `at` | `email` | `login_failure` |
| `password_resets` | TTL auf `expires_at` | `token_hash`, `user_id`, `used`, `mail_status` | `password_reset` |
| `workshops` | `_id` = Verzeichnis-ID; Indizes `zip`, `city_key` | Adresse, `lat`, `lon`, `market`, `hours` | `workshop` |
| `workshop_requests` | `_id` = `WA-<zufällig>` | Kontaktdaten, `vehicle`, `message`, `consent`, `status` | `workshop_request` |
| `requests` | `_id` = `request:` + sha256(Idempotency-Key) | Kontaktdaten, `kind`, `payload_hash`, `number`, `status`, `stage`, Benachrichtigungszustand | `contact_request` |

Nicht im Zielschema: die 17 Collections, die nur `nexify_api.py` nutzt (`offers`,
`invoices`, `tickets`, `projects`, `subscriptions`, `api_keys`, `audit`, `documents`,
`oracle_messages`, `privacy_requests`, `team_members`, `agent_configs`, `counters`,
`mail_outbox` …). Sie gehören zum Portal, nicht zum Shop, und brauchen ein eigenes Schema
(siehe Paket 8).

### 1.3 Transaktions- und Idempotenzannahmen

| Stelle | Annahme im Code | Umsetzung im Zielschema |
|---|---|---|
| Warenkorb ändern (`cart_api.replace_cart`) | Vergleichen-und-Setzen über `revision`; `owner` eindeutig | `cart.revision`, `UNIQUE (tenant_id, owner)`; getestet |
| Warenkorb zusammenführen (`cart_api.merge`) | Mongo-Transaktion (Snapshot/Majority), verlangt ein Replica Set; Beleg im Gast-Dokument, weil keine weitere Collection erlaubt ist; Obergrenzen wegen 16 MB | eine PostgreSQL-Transaktion; Beleg in `cart_merge` mit eindeutiger Kennung; die Größenbegrenzung entfällt |
| Bestellung anlegen (`checkout_api.create_order`) | `Idempotency-Key`-Kopf (16–80 Zeichen), `(owner, idempotency_key)` eindeutig, `request_hash` erkennt abweichende Wiederholung | `UNIQUE (tenant_id, owner, idempotency_key)`; getestet |
| Zahlung anlegen (`revolut.create_order`) | Idempotenzschlüssel an Revolut = uuid5 aus der Bestellnummer | `payment.idempotency_key` eindeutig, eine Zahlung je Bestellung, Betrag = Bestellsumme per Fremdschlüssel; getestet |
| Webhook (`checkout_api.revolut_webhook`) | `event_key` = sha256 des Inhalts, doppelt wird verworfen | `payment_event` mit Primärschlüssel `(tenant_id, event_key)`; getestet |
| Übergang nach bezahlt (`checkout_api.sync_payment`) | genau ein atomarer Übergang (`status != bezahlt`, `paid_transitions` +1) | bedingtes `UPDATE`, `CHECK (paid_transitions = …)`; getestet |
| Übergabe an BigBuy (`fulfillment.submit_order`) | Anspruch über `bigbuy_submitting` vor dem Anlegen | gleiche Spalten; als `UPDATE … WHERE … RETURNING` |
| Postausgang (`mailer.enqueue`) | einmal je Ereignisschlüssel | Primärschlüssel `(tenant_id, event_key)`; getestet |
| Kontaktanfrage (`requests_api.create_request`) | `_id` aus dem Idempotenzschlüssel, `payload_hash` | Primärschlüssel und `payload_hash`; getestet |
| Katalog veröffentlichen (`bigbuy_import.run_import`) | eine Mongo-Transaktion; `settings.bigbuy_publication.revision` reiht Veröffentlichungen | eine PostgreSQL-Transaktion; `setting.publication_revision` bzw. Advisory Lock je Mandant |

Belegt, aber leicht zu übersehen: `bigbuy_import.require_publication_contract()` wirft
**immer** (`tenant_publication_contract_unverified`). Der Import ist im Code gesperrt,
unabhängig von der Datenbank. Und der Import setzt `active` nie; ohne `active` ist kein
Produkt öffentlich. Der Katalog ist nach D-008 leer.

### 1.4 Preis- und Steuerregeln (übernommen, nicht verändert)

- Verkaufspreis = Einkauf × (1 + Aufschlag %) × (1 + USt %), kaufmännisch auf den Cent
  gerundet (`shop/pricing.py::sell_cents`). Er wird **nicht** gespeichert, sondern bei
  jeder Abfrage im Dienst berechnet. Das bleibt so; im Schema steht nur `purchase_cents`.
- Aufschlag: 0 bis 500, höchstens zwei Nachkommastellen (`pricing.parse_markup`). Ist
  keiner gesetzt, gilt der Vorgabewert aus `shop/config.py`. Im Schema ist die Spalte
  deshalb leer erlaubt; SQL legt keinen Wert fest.
- Steuersatz: aus `SHOP_VAT_PERCENT` (0 bis 100). Im Schema nur als Momentaufnahme je
  Bestellung, ohne Vorgabewert.
- Preise sind erst nach ausdrücklicher Freigabe sichtbar (`price_release`); die Freigabe
  gilt nur für genau den freigegebenen Aufschlag.
- Menge je Position 1 bis 20, Versandpauschale 0 bis 100.000 Cent, Währung EUR,
  Lieferländer DE/AT/NL/BE/LU. Diese Grenzen stehen als Prüfbedingungen im Schema.

### 1.5 Namespace-Marker, Projektbindung, Namespace-Operator

| Baustein | Was er heute tut (belegt) | Unter PostgreSQL |
|---|---|---|
| `project_binding_verified` (`vercel_app.py`) | Lässt die API nur in einem freigegebenen Vercel-Projekt arbeiten (`VERCEL_PROJECT_ID` gegen `SHOP_ALLOWED_PROJECT_IDS`). Schützt davor, dass ein fremdes Projekt mit kopierten Zugangsdaten die Shop-Daten bedient. | **Bleibt unverändert**, bis der Inhaber den Ersatz freigibt. Empfehlung: auch danach behalten, als zweite, billige Sperre. |
| Namespace-Marker (`SCHEMA_MARKER` als Validator-Beschreibung jeder Collection; `check_metadata` vergleicht exakt 18 Collections und ihre Indizes) | Beweist vor jedem Aufruf, dass die verbundene Datenbank der vorgesehene, von diesem Projekt angelegte Namespace ist. Nötig, weil Mongo Collections stillschweigend anlegt und keine Mandantengrenze kennt. | **Entfällt mit der Umstellung.** Ersatz: (1) eigene Datenbankrolle des Dienstes, als `nx_foundation.actor` eingetragen und nur Mitglied des Mandanten TEILEKLAR; (2) erzwungene RLS auf jeder Tabelle; (3) Startprüfung „`shop.schema_migration` hat die erwartete Version und `shop.authorized_tenant()` liefert den erwarteten Mandanten“. PostgreSQL legt nichts stillschweigend an. |
| Namespace-Operator (`namespace_operator.py`, `preflight`/`init`/`plan`) | Legt den leeren Mongo-Namespace mit Markern und Indizes an; nur Metadaten. | **Entfällt.** Ersatz: der Inhaber wendet die Migration an; `db/shop/test.sh` belegt sie vorher. |
| Diagnosecodes und 503 ohne Details | Keine URI, kein Treibertext in Antworten oder Logs. | **Bleibt**, mit neuen festen Codes (z. B. `database_schema_version_unexpected`, `tenant_access_unverified`). |

Wichtig: Solange Paket 2 nicht freigegeben ist, wird keiner dieser Schutzmechanismen
gelockert oder umgangen.

### 1.6 Was `db/foundation/001_foundation.sql` schon leistet

Belegt: Schema `nx_foundation` mit `tenant`, `actor`, `membership`, `project`; Rollen
`nx_foundation_owner` und `nx_app`; `has_tenant_access(tenant, schreibend)` bindet den
Mandanten an `session_user` (die tatsächlich angemeldete Datenbankrolle) plus die
Transaktionsvariablen `app.actor_id` und `app.mandant_id`; erzwungene RLS; wiederholbar.

Der Shop passt hinein, mit zwei Bedingungen:

1. **Direkte PostgreSQL-Verbindung.** Über PostgREST ist `session_user` immer die Rolle
   `authenticator`; `has_tenant_access` wäre dort nie wahr. Das Zielschema setzt deshalb
   eine direkte Verbindung des Dienstes voraus (siehe Entscheidung in Abschnitt 5).
2. **Endkunden sind keine Datenbankrollen.** Die Foundation kennt nur Akteure mit eigener
   Anmeldung. Für Warenkorb und Bestellung ergänzt das Shop-Schema eine zweite Ebene:
   die Transaktionsvariable `shop.owners`. Sie wird vom Dienst gesetzt. Ehrlich benannt:
   Sie schützt vor vergessenen Filtern und Programmierfehlern im Dienst, nicht vor einem
   übernommenen Dienst. Die Mandantengrenze dagegen hängt an der Anmeldung selbst.

Befund am Rand (belegt im Testlauf): Die Foundation lässt sich auf PostgreSQL 16 nur als
Superuser anwenden (`SET LOCAL ROLE nx_foundation_owner` scheitert sonst mit „must be able
to SET ROLE“). Auf der Supabase-Instanz ist `postgres` kein Superuser; dort braucht es
`supabase_admin`. Die Foundation wurde hier nicht verändert.

## 2. Zielschema

Ort: `db/shop/001_shop.sql`, nicht `apps/shop-api/supabase/migrations/`. Gründe: Die
Migration baut auf `db/foundation` auf und wird in derselben Reihenfolge und mit demselben
Prüfmuster angewendet; und `apps/shop-api` ist die Wurzel des Vercel-Dienstes, dessen
Bündelprüfung (`tests/verify_vercel_bundle.cjs`) alle dort versionierten Dateien einpackt.
SQL-Dateien gehören nicht in die ausgelieferte Funktion.

Aufbau (belegt, Zahlen aus dem Testlauf): 24 Tabellen (23 Fachtabellen und
`schema_migration`), 107 Richtlinien, 54 Indizes, 27 Fremdschlüssel, 83 Prüfbedingungen,
35 Primär- und Eindeutigkeitsschlüssel.

- **Mandant:** jede Fachtabelle trägt `tenant_id`; Schlüssel und Fremdschlüssel sind
  zusammengesetzt, ein Verweis über die Mandantengrenze ist nicht darstellbar.
- **Zwei Rollen ohne Anmeldung:** `shop_storefront` (kundennahe Wege) und `shop_service`
  (Webhook, Admin, Import, Versand, Konten). Der Dienst meldet sich mit einer eigenen
  Rolle an und wählt je Transaktion mit `SET LOCAL ROLE` eine der beiden.
- **Öffentlich lesbar** (für `shop_storefront`): nur Produkte mit `active`, deren
  Kategoriezuordnung, Kategorien, Einstellungen, Werkstattverzeichnis und von
  Import-Läufen nur Status und Zeitpunkt abgeschlossener Läufe.
- **Kundendaten:** Warenkorb, Positionen, Bestellung, Bestellpositionen und Zahlung sind
  nur für den Eigentümer sichtbar; anlegen kann er nur in eigenem Namen.
- **Unveränderlich über Spaltenrechte:** Beträge, Steuer, Adresse, Eigentümer und
  Idempotenzschlüssel einer Bestellung sowie alle Bestellpositionen kann nach dem Anlegen
  niemand ändern, auch `shop_service` nicht. Bestellungen, Zahlungen, Ereignisse und
  Preisfreigaben haben kein Löschrecht.
- **Summen:** Gesamt = Zwischensumme + Versand; Position = Stück × Einzelpreis;
  Zwischensumme = Summe der Positionen (beim Abschluss der Transaktion geprüft);
  Zahlbetrag = Bestellsumme.
- **Supabase-Rollen** `anon`, `authenticated`, `service_role` erhalten keine Rechte; das
  Schema wird für PostgREST nicht freigegeben.

Bewusst nicht im Schema: Verkaufspreise, Aufschlag-Vorgabe, Steuersatz; Volltextsuche
(die heutige Namenssuche ist ein Teilstring-Vergleich; ein Trigramm-Index wäre eine
spätere, messbare Ergänzung); automatisches Löschen abgelaufener Sitzungen (macht der
Dienst oder ein Job, siehe Paket 4).

## 3. Probe gegen echtes PostgreSQL (belegt)

Lokaler Wegwerf-Cluster PostgreSQL 16.15 (aus dem vorhandenen Paket, nur Unix-Socket,
keine Verbindung nach außen). Ablauf `db/shop/test.sh`: Foundation, Shop-Migration,
Shop-Migration erneut, Foundation erneut, dann `verify.sql`.

- Ergebnis: Exit 0, **100 Prüfungen bestanden, 0 fehlgeschlagen**, dazu die
  Aufräumprüfung (Testrollen und Testdaten vollständig zurückgerollt). Ein zweiter
  Durchlauf auf derselben Datenbank ergibt dasselbe.
- Davon negativ (die Anweisung muss scheitern oder null Zeilen treffen): fremder
  Warenkorb unsichtbar, nicht änderbar, nicht löschbar; kein Warenkorb und keine
  Bestellung im Namen eines anderen; fremde Bestellung unsichtbar und nicht änderbar;
  zweite Bestellung mit gleichem Idempotenzschlüssel abgelehnt (23505); zweite Buchung mit
  gleichem Idempotenzschlüssel abgelehnt (23505); zweite Zahlung je Bestellung abgelehnt;
  Zahlbetrag ungleich Bestellsumme abgelehnt (23503); derselbe Webhook nur einmal;
  zweiter Übergang nach bezahlt ohne Wirkung; fremder Mandant sieht und ändert nichts,
  auch nicht mit gleicher Eigentümer-Zeichenkette; Mandant ohne Mitgliedschaft, fremde
  Akteurkennung oder fehlender Kontext öffnen nichts; Nur-Lese-Mitgliedschaft kann nicht
  schreiben.
- Gegenprobe: Acht gezielte Abschwächungen der Migration (Eigentümerregel am Warenkorb
  entfernt, unveröffentlichte Produkte sichtbar, Eindeutigkeit der Idempotenzschlüssel an
  Bestellung, Zahlung und Webhook entfernt, Eigentümerregel an der Bestellung entfernt,
  Mandantenregel entfernt, Änderungsrecht für die Kundenseite) wurden jeweils von
  mindestens einer Prüfung erkannt (8 von 8).

Nicht belegt: Anwendung auf der echten Supabase-Instanz (Version, Erweiterungen,
vorhandene Schemata und Rollen sind hier unbekannt); Anwendung ohne Superuser-Recht (ein
Versuch mit einer Rolle mit `CREATEROLE` scheiterte erwartbar an fehlenden Rechten auf
`nx_foundation`); Verhalten hinter dem Verbindungspooler; der neue CI-Schritt in
`.github/workflows/ci.yml` (hier gibt es kein Docker, er läuft erstmals in GitHub).

## 4. Umstellung in abnahmefähigen Paketen

Größen sind **Schätzungen** in Arbeitstagen einer eingearbeiteten Person, einschließlich
Tests, ohne Wartezeit auf Entscheidungen. Jedes Paket ist für sich abnehmbar und hat einen
Rückweg. Schalter während der Umstellung: `SHOP_STORE` (`mongo` als Vorgabe, `postgres`).

Vorab eine Tatsache, die die Reihenfolge bestimmt: Die Mongo-Datenbank der Produktion
antwortet nicht. Ein Mischbetrieb (ein Teil Mongo, ein Teil PostgreSQL) hilft der
Produktion deshalb nicht; live gehen kann der Shop bereichsweise nur in der Reihenfolge
Katalog → Warenkorb → Konten → Kasse.

| # | Paket | Betroffene Dateien | Tests und Abnahme | Rückweg | Größe |
|---|---|---|---|---|---|
| 0 | **Instanz vorbereiten (Inhaber)**: Entscheidungen aus Abschnitt 5, Migrationen anwenden, Rolle und Mandant anlegen | keine im Repository | `db/shop/test.sh` gegen eine leere Wegwerf-Datenbank **derselben PostgreSQL-Version**; danach Rücklesen von `shop.schema_migration` | Schema `shop` ist neu und leer: `DROP SCHEMA shop CASCADE` und die zwei Rollen entfernen | 0,5 |
| 1 | **Datenzugriffsschicht einziehen**, weiter nur Mongo, Verhalten unverändert: `shop/store/` mit je einer Schnittstelle für Katalog, Einstellungen, Warenkorb, Bestellung, Zahlung, Postausgang, Konten, Import, Werkstätten, Anfragen; die heutigen Abfragen wandern unverändert in die Mongo-Umsetzung | alle 14 Module unter `shop/` außer `nexify_api.py` (139 Aufrufstellen), `shop/db.py`; 12 Testdateien | alle bestehenden Tests grün, keine Aussage gestrichen; OpenAPI-Schema unverändert (CI-Job `openapi-schema`); je Bereich ein eigener Commit | Revert je Commit; keine Daten berührt | 4–6 |
| 2 | **PostgreSQL im Dienst**: Verbindungsmodul (Pool, Transaktion mit Rolle und Kontext), Startprüfung in `vercel_app.py` neben der bestehenden, feste Diagnosecodes; Treiber mit Hash in `requirements.txt` | `shop/pg.py` (neu), `vercel_app.py`, `shop/config.py`, `requirements.in`, `requirements.txt`, `tests/test_vercel_adapter.py` (ergänzen) | neue Adaptertests: ohne Bindung 503, falsche Schema-Version 503, kein Kontext über Transaktionsende hinaus; **Projektbindung bleibt Bedingung** | `SHOP_STORE=mongo` | 1–2 |
| 3 | **Katalog lesen**: Produkte (Suche, Filter, Sortierung, Seiten), Kategorien mit Zählung, Produktdetail, Status, Einstellungen lesen | `shop/store/catalog_pg.py`, `shop/store/settings_pg.py` (neu), `catalog_api.py`, `pricing.py` | dieselben Vertragstests gegen Mongo-Attrappe und gegen lokales PostgreSQL; Preisberechnung unverändert (`tests/test_product_presentation_integrity.py`); Vorschau mit leerem Katalog liefert 200 statt 503 | `SHOP_STORE=mongo`; es wird nur gelesen | 2–3 |
| 4 | **Warenkorb und Konten**: Vergleichen-und-Setzen, Zusammenführung in einer Transaktion mit Zeilensperren, Beleg; Konten, Sitzungen, Sperre nach Fehlversuchen, Passwort-Rücksetzung; Aufräumlauf statt TTL | `cart_api.py`, `accounts_api.py`, `auth.py`, Store-Umsetzungen | `tests/test_cart_stock_integrity.py` und `apps/shop-api/tests/test_cart_merge_replica_contract.py` als PostgreSQL-Fassung (gleichzeitige Schreiber, verlorene Aktualisierung); Anmeldung, Abmeldung, Sperre | `SHOP_STORE=mongo`; neue Warenkörbe in PostgreSQL verfallen | 3–4 |
| 5 | **Kasse und Zahlung**: Bestellung mit Positionen in einer Transaktion, Wiederholung per Idempotenzschlüssel, Zahlung, Webhook, Übergang nach bezahlt, Warenkorb bereinigen, Postausgang, Übergabe an BigBuy | `checkout_api.py`, `revolut.py`, `fulfillment.py`, `mailer.py`, Store-Umsetzungen | `tests/test_shop_recovery_contract_20261031.py`, `tests/test_fulfillment_state_field.py`, Webhook doppelt und außer der Reihe, Abbruch zwischen Anlegen und Zahlungsantwort; **Abnahme mit Revolut erst nach Entscheidung des Inhabers** (es gibt laut D-008 keinen Sandbox-Schlüssel) | `SHOP_STORE=mongo` nur, solange keine echte Bestellung in PostgreSQL liegt; danach kein Rückweg ohne Datenübernahme | 4–6 |
| 6 | **BigBuy-Import**: Veröffentlichung in einer Transaktion, Upsert, Kategoriezuordnung, Läufe und Quellnachweise | `bigbuy_import.py`, `bigbuy_selection.py`, `bigbuy_ftp.py`, Store-Umsetzung | `tests/test_bigbuy_import_integrity.py`, `tests/test_bigbuy_admin_guard.py`; Abbruch mitten im Lauf hinterlässt keinen Teilkatalog. **Die Sperre `require_publication_contract()` bleibt**, bis der Inhaber die Mandantenbindung des Katalogs unter PostgreSQL freigibt | Lauf wiederholen; Katalog ist aus der Quelle neu aufbaubar | 2–3 |
| 7 | **Admin, Werkstätten, Anfragen**: Einstellungen und Preisfreigabe, Bestellübersicht, Statuswechsel, Postausgang-Ansichten; Werkstattsuche und -anfrage; Kontaktanfragen | `admin_api.py`, `workshops_api.py`, `requests_api.py`, Store-Umsetzungen | `tests/test_contact_http.py`, `tests/test_contact_recovery.py`; Preisfreigabe nur durch Admin, nur mit Protokolleintrag | `SHOP_STORE=mongo` | 2–3 |
| 8 | **Abschluss** nach Freigabe: Mongo-Zweig, `motor`, Namespace-Operator und dessen Doku entfernen; `config/environment-contract.json`, `docs/deployment/environment-variables.md` und D-006 nachführen. Getrennt zu entscheiden: `nexify_api.py` (88 Aufrufstellen, 17 Collections, eigenes Schema) | wie genannt | vollständige Prüfkette; Bündelprüfung | Revert | 1 (ohne `nexify_api.py`); `nexify_api.py` zusätzlich 5–8 |

Summe der Schätzung für den in Vercel ausgelieferten Shop: **etwa 19 bis 28 Arbeitstage**.
Sichtbarer Zwischenstand nach Paket 0 bis 3 (etwa 8 bis 12 Tage): Der Shop antwortet
wieder, Katalog und Kategorien sind lesbar, Kaufen ist noch nicht möglich.

## 5. Was der Inhaber an der Instanz und in Vercel tun muss

Diese Schritte kann kein Agent ausführen; Zugangsdaten und Adresse der Instanz sind hier
weder bekannt noch nötig.

1. **Verbindungsweg entscheiden.** Empfehlung: direkte PostgreSQL-Verbindung des Dienstes
   über den Pooler der Instanz (Transaktionsmodus), mit TLS und Zertifikatsprüfung.
   Gründe: Die Mandantenbindung der Foundation hängt an der angemeldeten Datenbankrolle;
   Warenkorb, Kasse und Import brauchen mehrschrittige Transaktionen; das Schema muss
   nicht über PostgREST erreichbar sein. Preis: Der Datenbank-Port muss aus Vercel
   erreichbar sein; Vercel-Funktionen haben ohne Zusatzprodukt keine festen
   Ausgangsadressen, eine Freigabe nach IP ist also nicht ohne Weiteres möglich.
   Alternative PostgREST (wie der Chat in `apps/web/lib/supabase-rest.ts`): leichter
   erreichbar, verlangt aber ein anderes Rechtemodell (Funktionen mit festem Mandanten,
   Service-Role) und damit eine zweite Migration; das vorliegende Schema ist dafür nicht
   ausgelegt.
2. **Bestand der Instanz mitteilen:** PostgreSQL-Version; ob `nx_foundation` oder ein
   Schema `shop` dort schon existiert („das meiste sei dort schon vorhanden“ ist hier
   nicht überprüfbar); ob `supabase_admin` zur Verfügung steht.
3. **Migrationen anwenden**, als Superuser, in dieser Reihenfolge und nach einer
   Datensicherung: `db/foundation/001_foundation.sql`, dann `db/shop/001_shop.sql`. Vorher
   `db/shop/test.sh` gegen eine leere Wegwerf-Datenbank derselben Version.
4. **Rolle, Mandant und Mitgliedschaft anlegen** (Namen sind Vorschläge, das Passwort
   vergibt und verwahrt der Inhaber):

   ```sql
   CREATE ROLE teileklar_shop_api LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '<vom Inhaber>';
   GRANT shop_storefront, shop_service TO teileklar_shop_api;
   INSERT INTO nx_foundation.tenant(name) VALUES ('TEILEKLAR') RETURNING id;            -- ergibt SHOP_TENANT_ID
   INSERT INTO nx_foundation.actor(database_principal) VALUES ('teileklar_shop_api') RETURNING id;  -- ergibt SHOP_ACTOR_ID
   INSERT INTO nx_foundation.membership(tenant_id, actor_id, access_level) VALUES ('<SHOP_TENANT_ID>', '<SHOP_ACTOR_ID>', 'editor');
   ```

   Hinter dem Pooler muss `session_user` genau diese Rolle sein; das ist nach dem ersten
   Verbindungsaufbau zu prüfen (`SELECT session_user`).
5. **Umgebungsvariablen in Vercel setzen** (Projekt `…-ut7r`, Abschnitt 6).
6. **Freigaben erteilen:** Ersatz von Namespace-Marker und Namespace-Operator wie in
   Abschnitt 1.5; Verbleib der Projektbindung; ob eigene Konten bleiben (Empfehlung: ja,
   vorerst) oder Supabase Auth sie ersetzen soll; Abnahme der Zahlung (Sandbox-Schlüssel
   oder ausdrücklich live); Aufhebung der Import-Sperre.
7. **Betrieb der Instanz:** Sicherung und Wiederherstellung (mit Probe), Standort der
   Daten (Vorgabe in `AGENTS.md`: Frankfurt), Überwachung der Verbindungsanzahl.
8. **Altdaten:** klären, ob in der Mongo-Datenbank überhaupt Produktionsdaten liegen und
   übernommen werden sollen (Abschnitt 7).

## 6. Umgebungsvariablen

| Variable | Heute | Nach der Umstellung |
|---|---|---|
| `MONGO_URL` / `MONGODB_URI` | Pflicht, geheim | **entfällt** (mit Paket 8) |
| `DB_NAME` | Pflicht, muss `nexify_teileklar_shop_v1` sein | **entfällt** |
| `SHOP_DATABASE_URL` | – | **neu**, geheim: PostgreSQL-Verbindung der Rolle des Dienstes, TLS mit Prüfung |
| `SHOP_TENANT_ID` | – | **neu**, nicht geheim: Mandant TEILEKLAR (UUID aus Schritt 4) |
| `SHOP_ACTOR_ID` | – | **neu**, nicht geheim: Akteur des Dienstes (UUID aus Schritt 4) |
| `SHOP_STORE` | – | **neu**, nur für die Übergangszeit: `mongo` (Vorgabe) oder `postgres`; entfällt mit Paket 8 |
| `SHOP_ALLOWED_PROJECT_IDS`, `VERCEL_PROJECT_ID` | Projektbindung | **unverändert** |
| `PREVIEW_PUBLIC_ORIGIN`, `SHOP_VAT_PERCENT`, `REVOLUT_*`, `BIGBUY_*`, Versand- und Mail-Variablen | wie bisher | **unverändert** |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | nur vom Chat in `apps/web` genutzt | vom Shop **nicht** verwendet |

Die Namen der neuen Variablen sind Vorschläge und werden mit Paket 2 verbindlich; bis
dahin ist in `docs/deployment/environment-variables.md` nichts zu setzen.

## 7. Übernahme vorhandener Mongo-Daten (nur beschrieben, nichts ausgeführt)

Offen und zuerst zu klären: `vercel_app.py` bezeichnet den Namespace
`nexify_teileklar_shop_v1` ausdrücklich als „neu geplant, keine Aussage, dass er
existiert“, der Katalog ist nach D-008 leer und die Datenbank antwortet nicht. Es ist gut
möglich, dass es **keine** Produktionsdaten gibt. Dann entfällt die Übernahme; Werkstätten
werden aus `prototypen/assets/workshops.json` neu geladen, der Katalog aus BigBuy.

Falls doch Daten vorliegen:

1. Lesender Export je Collection durch den Inhaber (zum Beispiel `mongoexport`), abgelegt
   außerhalb des Repositorys.
2. Umsetzungsskript mit Trockenlauf und Bericht je Collection (gelesen, übernommen,
   abgewiesen mit Grund). Umformungen: Zeitstempel-Zeichenketten zu `timestamptz`;
   `markup_percent` zu `numeric`; `category_ids[]` zu `product_category`; `carts.items[]`
   zu `cart_item`, `merge_history[]` zu `cart_merge`, fehlende `revision` zu 0;
   `orders.lines[]` zu `order_line`, Revolut-Felder zu `payment`; Bestellungen ohne
   `request_hash` bleiben ohne (die Spalte erlaubt das nur dafür).
3. Abweisen statt reparieren: Zeilen, die eine Prüfbedingung verletzen (Summe, Menge,
   Land, verwaiste Produktkennung im Warenkorb), kommen in den Bericht, nicht in die
   Datenbank. Bestellungen werden nie „passend gemacht“.
4. Laden als Administrator in einer Transaktion; danach Abgleich: Anzahl je Tabelle,
   Summe `total_cents` je Status, Anzahl bezahlter Bestellungen, Stichprobe von
   Bestellnummern gegen die Revolut-Übersicht des Inhabers.
5. Sitzungen, Fehlversuche und Rücksetz-Token werden nicht übernommen (Nutzer melden sich
   neu an); bcrypt-Hashes der Konten sind unverändert übertragbar.

## 8. Risiken und offene Punkte

- **Erreichbarkeit der Instanz aus Vercel** ist die größte offene Frage; ohne sie hilft
  kein Paket der Produktion.
- **Verbindungen aus Serverless-Funktionen:** ohne Pooler im Transaktionsmodus erschöpft
  sich die Verbindungszahl; vorbereitete Anweisungen müssen dafür abgeschaltet sein.
- **Kontext je Transaktion:** Rolle und Variablen dürfen nur mit `SET LOCAL` bzw.
  `set_config(…, true)` gesetzt werden, sonst wandern sie mit der gepoolten Verbindung zum
  nächsten Aufruf. Das wird in Paket 2 getestet.
- **`shop.owners` ist dienstseitig gesetzt** (Abschnitt 1.6). Wer stärkere Bindung will,
  braucht signierte Kundenkennungen in der Datenbank; das ist nicht Teil dieses Plans.
- **Signaturgeheimnis des Webhooks** liegt wie heute in der Datenbank (`payment_webhook`),
  nur für `shop_service` lesbar. Eine Ablage außerhalb wäre eine eigene Entscheidung.
- **Rechtstexte, Preise, Steuersatz** sind von diesem Plan nicht berührt.

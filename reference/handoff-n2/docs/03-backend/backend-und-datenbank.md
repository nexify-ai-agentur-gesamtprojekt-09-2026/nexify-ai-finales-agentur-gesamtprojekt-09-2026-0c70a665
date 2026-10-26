# TEILEKLAR — Backend- und Datenbankspezifikation

**Dokument:** Technische Spezifikation für Backend, Datenhaltung, Schnittstellen und Betrieb
**Version:** 1.0 · **Stand:** 31.08.2026
**Repository:** github.com/nexifyai-dev/teileklar (Branch `main`)
**Grundlage:** Pflichtenheft Installation und Betrieb, Gesamtprojektplan v1.1, Rechtstextpaket 1.0.0
**Rechtsmodell:** B2C und B2B mit getrennten Flows · TEILEKLAR ist Verkäufer und Vertragspartner

---

## 1. Architektur

```
Browser (PWA)  ──┬── Storefront-API (REST/JSON, öffentlich, gecacht)
                 └── Session-API (Warenkorb, Checkout, Konto, Einwilligung)

Storefront-API ──┬── Katalogdienst (PIM + Fitment, lesend)
                 ├── Preis-/Steuerdienst (Markt, Kundentyp, Pfand)
                 ├── Bestandsdienst (Lieferantenbestand, Cache 15 min)
                 └── Beratungsdienst (Regelwerk + Sprachmodell, protokolliert)

Session-API ─────┬── Auftragsdienst (OMS)
                 ├── Zahlungsdienst (PSP-Adapter)
                 ├── Versanddienst (Carrier-Adapter)
                 ├── Kontodienst (Identität, Rollen, B2B-Prüfung)
                 └── Einwilligungsdienst (Nachweis, Widerruf)

Hintergrund ─────┬── Lieferantenadapter (Import, Bestellung, Tracking)
                 ├── Feed-Generator (Preisportale je Markt)
                 ├── Werkstattdienst (Verzeichnis, Auftragsübergabe)
                 └── Aufbewahrungs-/Löschdienst (Fristen, Anonymisierung)
```

**Grundsätze:** Ein Datenbestand, viele Projektionen. Jede fachliche Aussage trägt Quelle und Stand. Kein Dienst schreibt in fremde Tabellen; Datenaustausch nur über API oder Ereignis. Alle schreibenden Vorgänge sind idempotent (Idempotenzschlüssel im Header).

## 2. Technologiewahl (Empfehlung mit Begründung)

| Baustein | Empfehlung | Begründung |
|---|---|---|
| Laufzeit | Node.js LTS (TypeScript) | gleiche Sprache wie das Frontend, großes Ökosystem für Commerce-Adapter |
| Datenbank | PostgreSQL 16 | relationale Integrität für Aufträge und Steuern, JSONB für heterogene Artikelmerkmale, Volltext- und Trigram-Suche eingebaut |
| Suche | PostgreSQL FTS zum Start, später OpenSearch | vermeidet einen zweiten Betriebsdienst, bis Trefferqualität es erzwingt |
| Cache | Redis | Bestände, Sitzungen, Ratenbegrenzung |
| Objektspeicher | S3-kompatibel (EU) | Produktbilder, Belege, Exporte |
| Warteschlange | PostgreSQL-basiert (pgboss) oder RabbitMQ | Importe, Bestellweiterleitung, Feeds |
| Deployment | Container, Blue-Green | Rücksprung ohne Datenverlust |

Alternativen bleiben zulässig, wenn sie dieselben Abnahmekriterien erfüllen; die Wahl ist im Betriebshandbuch festzuhalten.

## 3. Datenmodell (PostgreSQL)

### 3.1 Namenskonventionen

Tabellen und Spalten `snake_case`, Primärschlüssel `id UUID DEFAULT gen_random_uuid()`, Zeitstempel `created_at`/`updated_at` als `timestamptz`, Geldbeträge als `numeric(12,2)` **plus** `currency char(3)`, niemals Fließkomma. Mehrsprachige Texte in eigener `*_i18n`-Tabelle mit `locale`.

### 3.2 Kern-Tabellen

```sql
-- Märkte und Sprachen
CREATE TABLE market (
  id            text PRIMARY KEY,              -- 'de-DE', 'nl-BE', ...
  country_code  char(2) NOT NULL,
  locale        text NOT NULL,
  currency      char(3) NOT NULL,
  vat_rate      numeric(5,3) NOT NULL,
  shipping_std  numeric(12,2) NOT NULL,
  shipping_bulk numeric(12,2) NOT NULL,
  free_from     numeric(12,2),
  delivery_text text NOT NULL,
  active        boolean NOT NULL DEFAULT false
);

-- Hersteller
CREATE TABLE brand (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  logo_path   text,
  logo_rights text,                             -- Nutzungsnachweis, Quelle, Freigabestatus
  segment     text NOT NULL                     -- 'tyre' | 'wheel' | 'part' | 'accessory'
);

-- Artikel
CREATE TABLE product (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                text NOT NULL UNIQUE,
  brand_id           uuid NOT NULL REFERENCES brand(id),
  mpn                text,                      -- Herstellernummer
  gtin               text,                      -- Barcode
  oe_numbers         text[] NOT NULL DEFAULT '{}',
  category_id        uuid NOT NULL REFERENCES category(id),
  fit_position       text,                      -- 'VA' | 'HA' | 'Frontscheibe' | ...
  specs              jsonb NOT NULL DEFAULT '{}',   -- Maße, Normen, Freigaben
  included           text[] NOT NULL DEFAULT '{}',
  excluded           text[] NOT NULL DEFAULT '{}',
  condition          text NOT NULL DEFAULT 'neu',
  weight_g           integer,
  hazard_class       text,                      -- Gefahrgut (Öl, Batterie)
  deposit_type       text,                      -- 'battery' | 'none'
  deposit_amount     numeric(12,2),
  eu_responsible     jsonb,                     -- GPSR: Name, Anschrift, Kontakt
  warnings           text[] NOT NULL DEFAULT '{}',
  approval_number    text,                      -- z. B. ECE-R90
  safety_sheet_url   text,
  status             text NOT NULL DEFAULT 'draft',  -- siehe 3.4
  source             text NOT NULL,             -- Herkunft der Angaben
  source_date        date NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_gtin_idx ON product (gtin);
CREATE INDEX product_oe_idx   ON product USING gin (oe_numbers);
CREATE INDEX product_specs_idx ON product USING gin (specs);

CREATE TABLE product_i18n (
  product_id uuid REFERENCES product(id) ON DELETE CASCADE,
  locale     text NOT NULL,
  name       text NOT NULL,
  plain_text text,                              -- Klartextbeschreibung
  checks     text[] NOT NULL DEFAULT '{}',      -- Prüfpunkte
  PRIMARY KEY (product_id, locale)
);

-- Fahrzeuge und Passung
CREATE TABLE vehicle (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hsn          text, tsn text,                  -- DE-Schlüsselnummern
  make         text NOT NULL, model text NOT NULL,
  variant      text, engine_code text,
  power_kw     integer, build_from date, build_to date,
  UNIQUE (hsn, tsn, engine_code)
);

CREATE TABLE fitment (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  vehicle_id  uuid NOT NULL REFERENCES vehicle(id) ON DELETE CASCADE,
  position    text,
  conditions  jsonb NOT NULL DEFAULT '{}',      -- z. B. {"start_stop": true}
  exclusions  text[] NOT NULL DEFAULT '{}',
  state       text NOT NULL,                    -- 'verified' | 'conditional' | 'blocked'
  source      text NOT NULL,
  source_date date NOT NULL,
  checked_by  text,
  UNIQUE (product_id, vehicle_id, position)
);
CREATE INDEX fitment_vehicle_idx ON fitment (vehicle_id, state);

-- Zubehörregeln
CREATE TABLE accessory_rule (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  accessory_id  uuid NOT NULL REFERENCES product(id),
  required      boolean NOT NULL,
  reason        text NOT NULL,                  -- technischer Grund, wird angezeigt
  condition     jsonb NOT NULL DEFAULT '{}',
  UNIQUE (product_id, accessory_id)
);

-- Preise und Bestände
CREATE TABLE price (
  product_id uuid REFERENCES product(id) ON DELETE CASCADE,
  market_id  text REFERENCES market(id),
  net        numeric(12,2) NOT NULL,
  gross      numeric(12,2) NOT NULL,
  currency   char(3) NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to   timestamptz,
  PRIMARY KEY (product_id, market_id, valid_from)
);

CREATE TABLE stock (
  product_id  uuid REFERENCES product(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES supplier(id),
  quantity    integer NOT NULL,
  lead_days   integer,
  fetched_at  timestamptz NOT NULL,
  PRIMARY KEY (product_id, supplier_id)
);
```

### 3.3 Bestellung, Kunde, Einwilligung

```sql
CREATE TABLE customer (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text NOT NULL,                  -- 'private' | 'business'
  email         citext NOT NULL UNIQUE,
  company       text, vat_id text,
  vat_verified  boolean NOT NULL DEFAULT false, -- VIES-Prüfung
  vat_checked_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz                     -- Löschung nach Art. 17
);

CREATE TABLE address (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customer(id) ON DELETE CASCADE,
  kind        text NOT NULL,                    -- 'shipping' | 'billing'
  name        text NOT NULL, street text NOT NULL,
  zip text NOT NULL, city text NOT NULL, country char(2) NOT NULL
);

CREATE TABLE "order" (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number        text NOT NULL UNIQUE,           -- 'TK-10250'
  customer_id   uuid REFERENCES customer(id),
  customer_type text NOT NULL,
  market_id     text NOT NULL REFERENCES market(id),
  vehicle_id    uuid REFERENCES vehicle(id),    -- Fahrzeugkontext der Bestellung
  status        text NOT NULL,                  -- siehe 3.4
  net_total     numeric(12,2) NOT NULL,
  vat_total     numeric(12,2) NOT NULL,
  gross_total   numeric(12,2) NOT NULL,
  currency      char(3) NOT NULL,
  shipping_kind text NOT NULL,
  payment_kind  text NOT NULL,
  terms_version text NOT NULL,                  -- akzeptierte AGB-Fassung
  placed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_line (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  product_id   uuid NOT NULL REFERENCES product(id),
  qty          integer NOT NULL CHECK (qty > 0),
  unit_net     numeric(12,2) NOT NULL,
  unit_gross   numeric(12,2) NOT NULL,
  vat_rate     numeric(5,3) NOT NULL,
  deposit      numeric(12,2) NOT NULL DEFAULT 0,
  fitment_state text NOT NULL,                  -- Zustand zum Bestellzeitpunkt
  fitment_source text NOT NULL,
  accessory_of uuid REFERENCES order_line(id)   -- Zubehör zu welcher Position
);

CREATE TABLE consent (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_key  text NOT NULL,                   -- Konto-ID oder anonymer Gerätehash
  categories   jsonb NOT NULL,                  -- {"stats":true,"comfort":false}
  text_version text NOT NULL,                   -- Fassung des Hinweistexts
  given_at     timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz,
  ip_truncated inet, user_agent text
);

CREATE TABLE data_request (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       text NOT NULL,                     -- 'access' | 'rectify' | 'erase' | 'object' | 'export'
  email      citext NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  due_at     timestamptz NOT NULL,              -- received_at + 1 Monat
  done_at    timestamptz,
  note       text
);
```

### 3.4 Statusautomaten

**Artikel:** `draft → in_review → verified → (conditional | blocked) → retired`
Nur `verified` und `conditional` sind sichtbar; nur `verified` ist bestellbar. Übergang nach `verified` erfordert: Quelle, Stand, Maße, verantwortliche Person, mindestens ein Fitment-Eintrag.

**Bestellung:** `created → paid → forwarded → shipped → delivered → (returned | closed)`
Nebenpfade: `payment_failed`, `cancelled`, `partially_shipped`. Jeder Übergang schreibt einen Eintrag in `order_event` (Zeit, Auslöser, Nutzer/System).

**Werkstattauftrag:** `requested → accepted → scheduled → done → invoiced`; Absage jederzeit mit Grund.

### 3.5 Aufbewahrung und Löschung

| Datenart | Frist | Grundlage |
|---|---|---|
| Bestellungen, Rechnungen | 7 Jahre (NL), 10 Jahre (DE) | Steuerrecht |
| Zahlungsdaten | keine Speicherung | PSP hält Daten |
| Kontodaten ohne Bestellung | 24 Monate Inaktivität | Zweckbindung |
| Beratungsverlauf | 90 Tage, nur mit Komfort-Einwilligung | Art. 6 Abs. 1 a |
| Einwilligungsnachweis | 3 Jahre nach Widerruf | Nachweispflicht |
| Server-Protokolle | 90 Tage | Sicherheit |
| Datenanfragen | 3 Jahre | Rechenschaft |

Der Löschdienst läuft täglich, anonymisiert statt zu löschen, wo Aufbewahrungspflichten entgegenstehen (Kundenname → Pseudonym, Bestellung bleibt buchhalterisch vollständig).

## 4. API-Verträge (Auszug)

```
GET  /v1/{market}/products?vehicle={id}&category=&position=&brand=&onlyFitting=
     → { items[], total, facets }   Cache 5 min, öffentlich

GET  /v1/{market}/products/{sku}?vehicle={id}
     → { product, fitment{state,source,source_date}, accessories[], price, availability }

POST /v1/{market}/cart/items            { sku, qty, vehicleId }
GET  /v1/{market}/cart
POST /v1/{market}/checkout/address      { customerType, address, company?, vatId? }
POST /v1/{market}/checkout/shipping     { kind }
POST /v1/{market}/checkout/payment      { kind }
POST /v1/{market}/checkout/place        { termsVersion, idempotencyKey }
     → { orderNumber, status }

POST /v1/consent                        { categories, textVersion }
GET  /v1/me/export                      → JSON-Datei (Art. 20)
POST /v1/me/erase                       → Löschauftrag (Art. 17)

POST /v1/advisor/message                { sessionId, text, vehicleId? }
     → { reply, actions[], sources[] }
```

**Fehlerformat einheitlich:** `{ "error": { "code", "message", "field?" } }`. Kein Klartext von Systemmeldungen an den Browser. Ratenbegrenzung: 60 Anfragen/Minute je IP für lesende, 10/Minute für schreibende Endpunkte.

## 5. Sicherheit

1. Authentifizierung über kurzlebige Zugriffstoken und rotierende Erneuerungstoken; Sitzungscookie `HttpOnly; Secure; SameSite=Lax`.
2. Rollen: `kunde`, `gewerbekunde`, `redaktion`, `support`, `buchhaltung`, `partner`, `admin`. Rechteprüfung serverseitig je Endpunkt, nie nur in der Oberfläche.
3. Eingabeprüfung mit Schema (zod o. ä.) an jedem Endpunkt; Ausgabe kontextabhängig maskiert.
4. Sicherheitskopfzeilen: CSP ohne `unsafe-inline` für Skripte, HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`.
5. Geheimnisse nur im Geheimnisspeicher, nie im Repository; Rotation halbjährlich.
6. Abhängigkeitsprüfung bei jedem Bau; kritische Lücken blockieren die Auslieferung.

## 6. Was noch zu erstellen ist

Die folgenden Dokumente gehören in das Installationspaket im Repository und sind noch nicht geschrieben:

| Dokument | Zweck | Priorität |
|---|---|---|
| `docs/backend/API-Referenz.md` | vollständige Endpunktbeschreibung mit Beispielen und Fehlercodes | P0 |
| `docs/backend/Datenbank-Migrationen.md` | Migrationsstrategie, Namensschema, Rücksprung | P0 |
| `docs/backend/Lieferantenadapter-Spezifikation.md` | je Lieferant: Felder, Takt, Fehlerbehandlung, Testfälle | P0 |
| `docs/backend/Zahlungs-und-Versandanbindung.md` | PSP- und Carrier-Auswahl je Markt, SCA, Rückzahlungen | P0 |
| `docs/betrieb/Runbooks.md` | acht Störungsfälle mit Handlungsanweisung | P0 |
| `docs/betrieb/Monitoring-und-Alarme.md` | Messgrößen, Schwellen, Eskalation, Bereitschaft | P0 |
| `docs/betrieb/Notfall-und-Wiederanlaufplan.md` | RPO/RTO, Rücksicherung, Kommunikationskette | P0 |
| `docs/betrieb/Testkonzept.md` | Testarten, Abdeckungsziel, Abnahmetestfälle | P1 |
| `docs/betrieb/Datenschutz-Verarbeitungsverzeichnis.md` | Art. 30 DSGVO, je Verarbeitung Zweck, Grundlage, Frist | P0 |
| `docs/betrieb/Loeschkonzept.md` | Fristen je Datenart, Anonymisierungsregeln, Protokoll | P0 |
| `docs/betrieb/Rollen-und-Rechtekonzept.md` | Rollenmatrix, Vier-Augen-Prinzip, Protokollierung | P1 |
| `docs/handbuecher/Administrationshandbuch.md` | Installation, Konfiguration, Auslieferung, Sicherung | P0 |
| `docs/handbuecher/Redaktionshandbuch.md` | Artikelanlage, Statuswechsel, Quellenpflicht, Medien | P0 |
| `docs/handbuecher/Supporthandbuch.md` | Beratung, Eskalation, Retouren, Rechtsanfragen | P0 |
| `docs/handbuecher/Partnerhandbuch.md` | Auftragsannahme, Termine, Abrechnung | P1 |
| `docs/handbuecher/Schulungsplan.md` | je Rolle Inhalte, Dauer, Prüfliste | P1 |
| `docs/plaene/Migrationsplan-Erstbefuellung.md` | Katalogimport, Dublettenprüfung, Freigabeschritte | P0 |
| `docs/plaene/Rollout-und-Marktstartplan.md` | Reihenfolge der Märkte, Voraussetzungen, Rücksprung | P1 |
| `docs/plaene/Lastenheft-Lieferantenanbindung.md` | Anforderungen aus Sicht des Auftraggebers | P0 |

## 7. Struktur des Installationspakets im Repository

```
/                       Shop-Artefakt, Manifest, Service Worker
/assets                 Bilder, Logos, Rechtsdaten, Werkstattverzeichnis
/docs                   Projektplan, Pflichtenheft, Design, Betriebslogik, SEO
/docs/backend           API, Datenbank, Adapter, Zahlung/Versand
/docs/betrieb           Runbooks, Monitoring, Notfall, Datenschutz, Rollen
/docs/handbuecher       Administration, Redaktion, Support, Partner, Schulung
/docs/plaene            Migration, Rollout, Lastenhefte
/db/migrations          nummerierte SQL-Migrationen
/db/seed                Stammdaten (Märkte, Kategorien, Steuersätze)
/uploads                Quellmaterial (Rechtstexte, Logos, Werkstattdaten)
README.md               Einstieg, Aufbau, erste Schritte
LICENSE                 Lizenzbestimmung
.gitignore              Ausschlüsse
```

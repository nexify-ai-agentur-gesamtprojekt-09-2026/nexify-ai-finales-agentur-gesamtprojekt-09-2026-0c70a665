-- TEILEKLAR-Shop auf PostgreSQL (selbst gehostete Supabase-Instanz) · Schema "shop" · Migration 001
-- NUR Migrationsdatei. Weder CI noch ein Agent wendet sie auf eine echte Instanz an;
-- das tut der Inhaber bewusst (siehe docs/deployment/shop-auf-supabase-2026-11-14.md).
-- Voraussetzung: db/foundation/001_foundation.sql (Schema nx_foundation, Rolle nx_app).
-- Als Datenbank-Administrator anwenden (Superuser; auf selbst gehosteter Supabase: supabase_admin).
-- Mit einer Rolle ohne Superuser-Recht ist die Anwendung nicht nachgewiesen.
-- Wiederholbar: ein zweiter Lauf ändert nichts und legt keinen zweiten Versionseintrag an.
--
-- Zugriff: zwei Gruppenrollen ohne Login, beide ohne BYPASSRLS und nicht Eigentümer.
--   shop_storefront  kundennahe Wege; sieht nur veröffentlichten Katalog und eigene Kundendaten
--   shop_service     Webhook, Admin, Import, Versand, Konten; an den Mandanten gebunden
-- Mandant: nx_foundation.has_tenant_access (an session_user gebunden, nicht an eine frei setzbare Variable).
-- Eigentümer: Transaktionsvariable shop.owners ("user:<id>" und/oder "guest:<id>"), vom Shop-Dienst gesetzt.
--   Sie schützt vor vergessenen Filtern im Dienst, nicht vor einem übernommenen Dienst.
-- anon, authenticated und service_role der Supabase-Instanz erhalten hier KEINE Rechte;
-- das Schema muss für PostgREST nicht freigegeben werden.
-- Geld: ganze Cent. Aufschlag, Steuersatz und Preise werden nicht in SQL festgelegt.
BEGIN;
SELECT pg_advisory_xact_lock(78131002);

DO $pre$
BEGIN
  IF to_regnamespace('nx_foundation') IS NULL
     OR to_regprocedure('nx_foundation.has_tenant_access(uuid, boolean)') IS NULL
     OR to_regprocedure('nx_foundation.context_uuid(text)') IS NULL
     OR NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nx_app') THEN
    RAISE EXCEPTION 'db/foundation/001_foundation.sql must be applied first';
  END IF;
END
$pre$;

DO $roles$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['shop_storefront', 'shop_service'] LOOP
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', role_name);
    END IF;
    IF EXISTS (
      SELECT FROM pg_roles WHERE rolname = role_name
        AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)
    ) OR EXISTS (
      SELECT FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member JOIN pg_roles g ON g.oid = m.roleid
      WHERE r.rolname = role_name AND g.rolname <> 'nx_app'
    ) THEN
      RAISE EXCEPTION 'Unsafe existing shop role: %', role_name;
    END IF;
  END LOOP;
END
$roles$;
-- Über nx_app: EXECUTE auf die Foundation-Funktionen und USAGE auf nx_foundation.
GRANT nx_app TO shop_storefront, shop_service;

CREATE SCHEMA IF NOT EXISTS shop;
REVOKE ALL ON SCHEMA shop FROM PUBLIC;
GRANT USAGE ON SCHEMA shop TO shop_storefront, shop_service;

CREATE TABLE IF NOT EXISTS shop.schema_migration (
  version integer PRIMARY KEY,
  description text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- Kontext
-- --------------------------------------------------------------------------
-- Einmal je Abfrage auswertbar (als Unterabfrage in den Richtlinien), statt je Zeile.
CREATE OR REPLACE FUNCTION shop.authorized_tenant(require_write boolean DEFAULT false)
RETURNS uuid LANGUAGE sql STABLE
SET search_path = pg_catalog
AS $function$
  SELECT CASE WHEN nx_foundation.has_tenant_access(nx_foundation.context_uuid('app.mandant_id'), require_write)
              THEN nx_foundation.context_uuid('app.mandant_id') END
$function$;

-- Höchstens zwei Eigentümer (Konto und Gast, für die Zusammenführung des Warenkorbs).
-- Ein einziger fehlerhafter Eintrag ergibt die leere Liste, nie eine Teilmenge.
CREATE OR REPLACE FUNCTION shop.current_owners()
RETURNS text[] LANGUAGE sql STABLE
SET search_path = pg_catalog
AS $function$
  SELECT CASE WHEN count(*) BETWEEN 1 AND 2
                   AND count(*) = count(*) FILTER (WHERE o ~ '^(user|guest):[A-Za-z0-9_-]{1,64}$')
              THEN array_agg(o) ELSE '{}'::text[] END
  FROM unnest(string_to_array(coalesce(current_setting('shop.owners', true), ''), ',')) AS o
$function$;

-- --------------------------------------------------------------------------
-- Einstellungen und Preisfreigabe (Mongo: settings{_id:shop|bigbuy_publication}, price_releases)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop.setting (
  tenant_id uuid PRIMARY KEY REFERENCES nx_foundation.tenant(id),
  -- NULL = nicht gesetzt; dann gilt wie bisher der Vorgabewert aus dem Code (shop/config.py).
  markup_percent numeric(5,2) CHECK (markup_percent BETWEEN 0 AND 500),
  shipping_cents integer NOT NULL DEFAULT 0 CHECK (shipping_cents BETWEEN 0 AND 100000),
  -- Preise gelten als freigegeben, wenn released_at gesetzt ist UND release_markup_percent = markup_percent.
  release_markup_percent numeric(5,2) CHECK (release_markup_percent BETWEEN 0 AND 500),
  released_at timestamptz,
  released_by text,
  publication_revision bigint NOT NULL DEFAULT 0 CHECK (publication_revision >= 0),
  updated_at timestamptz,
  updated_by text,
  CHECK ((released_at IS NULL) = (release_markup_percent IS NULL))
);
CREATE TABLE IF NOT EXISTS shop.price_release (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES nx_foundation.tenant(id),
  action text NOT NULL DEFAULT 'release' CHECK (action = 'release'),
  markup_percent numeric(5,2) NOT NULL CHECK (markup_percent BETWEEN 0 AND 500),
  released_at timestamptz NOT NULL DEFAULT now(),
  released_by text NOT NULL
);
CREATE INDEX IF NOT EXISTS price_release_tenant_idx ON shop.price_release(tenant_id, released_at);

-- --------------------------------------------------------------------------
-- Import-Läufe und Quellnachweise (Mongo: imports, source_manifests)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop.import_run (
  tenant_id uuid NOT NULL REFERENCES nx_foundation.tenant(id),
  id text NOT NULL CHECK (id ~ '^[A-Za-z0-9-]{16,64}$'),
  status text NOT NULL CHECK (status IN ('running', 'done', 'failed', 'publication_unknown')),
  environment text NOT NULL CHECK (environment <> ''),
  mode text,
  partial boolean NOT NULL DEFAULT false,
  source text,
  coverage text,
  started_at timestamptz NOT NULL DEFAULT now(),
  started_by text,
  publication_started_at timestamptz,
  finished_at timestamptz,
  error text,
  counts jsonb,
  taxonomy_ids jsonb,
  manifest jsonb,
  PRIMARY KEY (tenant_id, id),
  CHECK ((status = 'running') = (finished_at IS NULL))
);
CREATE INDEX IF NOT EXISTS import_run_started_idx ON shop.import_run(tenant_id, started_at DESC);
CREATE TABLE IF NOT EXISTS shop.source_manifest (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id uuid NOT NULL,
  run_id text NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, run_id) REFERENCES shop.import_run(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS source_manifest_run_idx ON shop.source_manifest(tenant_id, run_id);

-- --------------------------------------------------------------------------
-- Katalog (Mongo: categories, products; category_ids wird zur Zuordnungstabelle)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop.category (
  tenant_id uuid NOT NULL REFERENCES nx_foundation.tenant(id),
  id integer NOT NULL CHECK (id > 0),
  name text NOT NULL CHECK (name <> ''),
  root boolean NOT NULL DEFAULT false,
  source text,
  PRIMARY KEY (tenant_id, id)
);
CREATE TABLE IF NOT EXISTS shop.product (
  tenant_id uuid NOT NULL REFERENCES nx_foundation.tenant(id),
  id text NOT NULL CHECK (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  bigbuy_id bigint NOT NULL CHECK (bigbuy_id > 0),
  sku text NOT NULL DEFAULT '',
  ean text NOT NULL DEFAULT '',
  name text NOT NULL CHECK (name <> ''),
  description text NOT NULL DEFAULT '',
  images jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(images) = 'array'),
  category_id integer,
  -- Einkaufspreis. Der Verkaufspreis wird nie gespeichert, sondern im Dienst berechnet (shop/pricing.py).
  purchase_cents bigint NOT NULL CHECK (purchase_cents >= 0),
  -- NULL = Bestand unbekannt (im Code ein eigener Zustand, nicht 0).
  stock bigint CHECK (stock BETWEEN 0 AND 9007199254740991),
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  -- Veröffentlichung. Der Import setzt active nie selbst; ohne active ist ein Produkt nicht öffentlich.
  active boolean NOT NULL DEFAULT false,
  buyable boolean NOT NULL DEFAULT false,
  publishable boolean NOT NULL DEFAULT false,
  shipping_cost_cents integer CHECK (shipping_cost_cents >= 0),
  source text NOT NULL DEFAULT 'bigbuy',
  source_environment text,
  source_partial boolean NOT NULL DEFAULT false,
  image_source text,
  images_updated_at timestamptz,
  import_run_id text,
  first_imported_at timestamptz,
  imported_at timestamptz,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, bigbuy_id),
  FOREIGN KEY (tenant_id, category_id) REFERENCES shop.category(tenant_id, id),
  FOREIGN KEY (tenant_id, import_run_id) REFERENCES shop.import_run(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS product_public_idx ON shop.product(tenant_id, stock DESC NULLS LAST, name) WHERE active;
CREATE INDEX IF NOT EXISTS product_ean_idx ON shop.product(tenant_id, ean);
CREATE INDEX IF NOT EXISTS product_sku_idx ON shop.product(tenant_id, lower(sku) text_pattern_ops);
CREATE INDEX IF NOT EXISTS product_run_idx ON shop.product(tenant_id, import_run_id);
CREATE TABLE IF NOT EXISTS shop.product_category (
  tenant_id uuid NOT NULL,
  product_id text NOT NULL,
  category_id integer NOT NULL,
  PRIMARY KEY (tenant_id, product_id, category_id),
  FOREIGN KEY (tenant_id, product_id) REFERENCES shop.product(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, category_id) REFERENCES shop.category(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS product_category_idx ON shop.product_category(tenant_id, category_id, product_id);

-- --------------------------------------------------------------------------
-- Warenkorb (Mongo: carts mit items[] und merge_history[])
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop.cart (
  tenant_id uuid NOT NULL REFERENCES nx_foundation.tenant(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner text NOT NULL CHECK (owner ~ '^(user|guest):[A-Za-z0-9_-]{1,64}$'),
  -- Vergleichen-und-Setzen: jede Änderung erhöht revision; die Bestellung merkt sich den Stand.
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, owner)
);
CREATE TABLE IF NOT EXISTS shop.cart_item (
  tenant_id uuid NOT NULL,
  cart_id uuid NOT NULL,
  product_id text NOT NULL,
  name text,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  price_seen_cents bigint CHECK (price_seen_cents >= 0),
  PRIMARY KEY (tenant_id, cart_id, product_id),
  FOREIGN KEY (tenant_id, cart_id) REFERENCES shop.cart(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, product_id) REFERENCES shop.product(tenant_id, id)
);
-- Beleg einer Zusammenführung Gast -> Konto. id = sha256(Gast-Warenkorb + Stand): doppelt nicht möglich.
CREATE TABLE IF NOT EXISTS shop.cart_merge (
  tenant_id uuid NOT NULL,
  id text NOT NULL CHECK (id ~ '^[0-9a-f]{64}$'),
  guest_cart_id uuid NOT NULL,
  user_owner text NOT NULL CHECK (user_owner ~ '^user:[A-Za-z0-9_-]{1,64}$'),
  guest_revision bigint CHECK (guest_revision >= 0),
  guest_snapshot jsonb NOT NULL CHECK (jsonb_typeof(guest_snapshot) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, guest_cart_id) REFERENCES shop.cart(tenant_id, id)
);

-- --------------------------------------------------------------------------
-- Bestellung (Mongo: orders mit lines[]); Momentaufnahme unveränderlich über Spaltenrechte
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop.customer_order (
  tenant_id uuid NOT NULL REFERENCES nx_foundation.tenant(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  number text NOT NULL CHECK (number <> ''),
  owner text NOT NULL CHECK (owner ~ '^(user|guest):[A-Za-z0-9_-]{1,64}$'),
  user_id text,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 16 AND 80),
  -- NULL nur bei übernommenen Altbestellungen; der Dienst setzt ihn bei jeder neuen Bestellung.
  request_hash text CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'zahlung_offen'
    CHECK (status IN ('zahlung_offen', 'bezahlt', 'zahlung_nicht_abgeschlossen')),
  subtotal_cents bigint NOT NULL CHECK (subtotal_cents >= 0),
  shipping_cents bigint NOT NULL CHECK (shipping_cents >= 0),
  total_cents bigint NOT NULL,
  vat_included_cents bigint NOT NULL,
  -- Steuersatz wie bei Bestellung berechnet (aus SHOP_VAT_PERCENT); hier kein Vorgabewert.
  vat_percent numeric(5,2) NOT NULL CHECK (vat_percent BETWEEN 0 AND 100),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  address jsonb NOT NULL CHECK (jsonb_typeof(address) = 'object'
    AND coalesce(address->>'country', '') IN ('DE', 'AT', 'NL', 'BE', 'LU') AND coalesce(address->>'email', '') <> ''),
  shipping_method text NOT NULL DEFAULT 'standard' CHECK (shipping_method = 'standard'),
  terms_accepted_at timestamptz NOT NULL,
  cart_revision bigint CHECK (cart_revision >= 0),
  revolut_mode text NOT NULL CHECK (revolut_mode IN ('live', 'sandbox')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  -- Genau ein Übergang nach bezahlt.
  paid_transitions integer NOT NULL DEFAULT 0,
  paid_mail_intents_recorded boolean NOT NULL DEFAULT false,
  paid_mail_recovery_pending boolean NOT NULL DEFAULT false,
  fulfilment text CHECK (fulfilment IN ('bezahlt', 'in_bearbeitung', 'versendet', 'zugestellt')),
  processing_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  tracking_number text,
  carrier text,
  status_changed_by text,
  source_environment text,
  bigbuy_order_id text,
  bigbuy_submitting boolean NOT NULL DEFAULT false,
  bigbuy_submit_pending boolean NOT NULL DEFAULT false,
  bigbuy_submitted_at timestamptz,
  bigbuy_carrier text,
  fulfillment_error text,
  fulfillment_checked_at timestamptz,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, number),
  UNIQUE (tenant_id, owner, idempotency_key),
  UNIQUE (tenant_id, id, total_cents),
  CHECK (total_cents = subtotal_cents + shipping_cents),
  CHECK (vat_included_cents BETWEEN 0 AND total_cents),
  CHECK (paid_transitions = CASE WHEN status = 'bezahlt' THEN 1 ELSE 0 END),
  CHECK ((paid_at IS NOT NULL) = (status = 'bezahlt')),
  CHECK (fulfilment IS NULL OR status = 'bezahlt')
);
CREATE INDEX IF NOT EXISTS customer_order_user_idx ON shop.customer_order(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS customer_order_created_idx ON shop.customer_order(tenant_id, created_at DESC);
CREATE TABLE IF NOT EXISTS shop.order_line (
  tenant_id uuid NOT NULL,
  order_id uuid NOT NULL,
  position integer NOT NULL CHECK (position >= 1),
  -- Bewusst ohne Fremdschlüssel auf product: die Momentaufnahme überlebt Katalogänderungen.
  product_id text NOT NULL,
  name text NOT NULL,
  sku text,
  ean text,
  image text,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  unit_cents bigint NOT NULL CHECK (unit_cents >= 0),
  line_cents bigint NOT NULL,
  stock bigint,
  stock_status text NOT NULL DEFAULT 'reported' CHECK (stock_status IN ('reported', 'unknown')),
  PRIMARY KEY (tenant_id, order_id, position),
  UNIQUE (tenant_id, order_id, product_id),
  FOREIGN KEY (tenant_id, order_id) REFERENCES shop.customer_order(tenant_id, id),
  CHECK (line_cents = unit_cents * quantity)
);

-- Zwischensumme = Summe der Positionen, geprüft beim Abschluss der Transaktion.
-- Läuft mit den Rechten des Aufrufers: er sieht genau die Zeilen, die er schreiben durfte.
CREATE OR REPLACE FUNCTION shop.check_order_sum()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
DECLARE
  target uuid := (to_jsonb(NEW) ->> CASE WHEN TG_TABLE_NAME = 'order_line' THEN 'order_id' ELSE 'id' END)::uuid;
  expected bigint;
  actual bigint;
BEGIN
  SELECT o.subtotal_cents INTO expected FROM shop.customer_order o WHERE o.tenant_id = NEW.tenant_id AND o.id = target;
  SELECT coalesce(sum(l.line_cents), 0) INTO actual FROM shop.order_line l WHERE l.tenant_id = NEW.tenant_id AND l.order_id = target;
  IF expected IS DISTINCT FROM actual THEN
    RAISE EXCEPTION 'order subtotal does not match its lines' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END
$function$;
DROP TRIGGER IF EXISTS customer_order_sum ON shop.customer_order;
CREATE CONSTRAINT TRIGGER customer_order_sum AFTER INSERT ON shop.customer_order
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION shop.check_order_sum();
DROP TRIGGER IF EXISTS order_line_sum ON shop.order_line;
CREATE CONSTRAINT TRIGGER order_line_sum AFTER INSERT ON shop.order_line
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION shop.check_order_sum();

-- --------------------------------------------------------------------------
-- Zahlung (Mongo: orders.revolut_order_id/checkout_url/payment_state, webhook_events, revolut_webhooks)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop.payment (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'revolut' CHECK (provider = 'revolut'),
  mode text NOT NULL CHECK (mode IN ('live', 'sandbox')),
  -- Derselbe Schlüssel geht an den Zahlungsanbieter (shop/revolut.py: uuid5 aus der Bestellnummer).
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 16 AND 128),
  provider_order_id text CHECK (provider_order_id <> ''),
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  checkout_url text,
  state text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, order_id),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (tenant_id, provider_order_id),
  -- Der Zahlbetrag ist immer die Bestellsumme.
  FOREIGN KEY (tenant_id, order_id, amount_cents) REFERENCES shop.customer_order(tenant_id, id, total_cents)
);
CREATE TABLE IF NOT EXISTS shop.payment_event (
  tenant_id uuid NOT NULL REFERENCES nx_foundation.tenant(id),
  -- sha256 des unveränderten Webhook-Inhalts: dieselbe Zustellung zählt nur einmal.
  event_key text NOT NULL CHECK (event_key ~ '^[0-9a-f]{64}$'),
  provider text NOT NULL DEFAULT 'revolut' CHECK (provider = 'revolut'),
  event text,
  provider_order_id text,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, event_key)
);
CREATE INDEX IF NOT EXISTS payment_event_order_idx ON shop.payment_event(tenant_id, provider_order_id);
-- Enthält das Signaturgeheimnis des Webhooks; nur shop_service.
CREATE TABLE IF NOT EXISTS shop.payment_webhook (
  tenant_id uuid NOT NULL REFERENCES nx_foundation.tenant(id),
  provider text NOT NULL DEFAULT 'revolut' CHECK (provider = 'revolut'),
  mode text NOT NULL CHECK (mode IN ('live', 'sandbox')),
  webhook_id text NOT NULL,
  url text NOT NULL,
  signing_secret text NOT NULL CHECK (signing_secret <> ''),
  events jsonb,
  stored_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, provider, mode)
);

-- --------------------------------------------------------------------------
-- Postausgang (Mongo: outbox, _id = Ereignisschlüssel)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop.outbox (
  tenant_id uuid NOT NULL REFERENCES nx_foundation.tenant(id),
  event_key text NOT NULL CHECK (length(event_key) BETWEEN 1 AND 300),
  recipient text NOT NULL CHECK (recipient <> ''),
  subject text NOT NULL,
  html text NOT NULL,
  text_body text NOT NULL,
  reply_to text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'wartend' CHECK (status IN (
    'wartend', 'zurückgestellt', 'wird_vorbereitet', 'wird_gesendet', 'gesendet', 'fehlgeschlagen', 'abgleich_erforderlich')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  retry_safe boolean NOT NULL DEFAULT false,
  claim_id text,
  claimed_at timestamptz,
  sent_at timestamptz,
  provider_id text,
  provider_event jsonb,
  last_error text,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  PRIMARY KEY (tenant_id, event_key)
);
CREATE INDEX IF NOT EXISTS outbox_status_idx ON shop.outbox(tenant_id, status, claimed_at);

-- --------------------------------------------------------------------------
-- Konten (Mongo: users, sessions, login_failures, password_resets)
-- Die TTL-Indizes von Mongo gibt es hier nicht: jede Abfrage filtert auf expires_at/at,
-- abgelaufene Zeilen entfernt ein Aufräumlauf des Dienstes.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop.account (
  tenant_id uuid NOT NULL REFERENCES nx_foundation.tenant(id),
  user_id text NOT NULL CHECK (user_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  email text NOT NULL CHECK (email = lower(email) AND email <> ''),
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  password_hash text,
  google_linked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id),
  UNIQUE (tenant_id, email)
);
CREATE TABLE IF NOT EXISTS shop.account_session (
  tenant_id uuid NOT NULL,
  token_hash text NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, token_hash),
  FOREIGN KEY (tenant_id, user_id) REFERENCES shop.account(tenant_id, user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS account_session_expiry_idx ON shop.account_session(tenant_id, expires_at);
CREATE INDEX IF NOT EXISTS account_session_user_idx ON shop.account_session(tenant_id, user_id);
CREATE TABLE IF NOT EXISTS shop.login_failure (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES nx_foundation.tenant(id),
  email text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_failure_idx ON shop.login_failure(tenant_id, email, at);
CREATE TABLE IF NOT EXISTS shop.password_reset (
  tenant_id uuid NOT NULL,
  token_hash text NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  user_id text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  mail_status text,
  PRIMARY KEY (tenant_id, token_hash),
  FOREIGN KEY (tenant_id, user_id) REFERENCES shop.account(tenant_id, user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS password_reset_expiry_idx ON shop.password_reset(tenant_id, expires_at);

-- --------------------------------------------------------------------------
-- Werkstattverzeichnis und Anfragen (Mongo: workshops, workshop_requests, requests)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop.workshop (
  tenant_id uuid NOT NULL REFERENCES nx_foundation.tenant(id),
  id text NOT NULL CHECK (id <> ''),
  name text,
  street text,
  zip text,
  city text,
  city_key text NOT NULL DEFAULT '',
  region text,
  tel text,
  web text,
  hours jsonb,
  lat double precision CHECK (lat BETWEEN -90 AND 90),
  lon double precision CHECK (lon BETWEEN -180 AND 180),
  market text,
  directory_entry boolean NOT NULL DEFAULT true,
  source text,
  PRIMARY KEY (tenant_id, id)
);
CREATE INDEX IF NOT EXISTS workshop_zip_idx ON shop.workshop(tenant_id, zip);
CREATE INDEX IF NOT EXISTS workshop_city_idx ON shop.workshop(tenant_id, city_key text_pattern_ops);
CREATE TABLE IF NOT EXISTS shop.workshop_request (
  tenant_id uuid NOT NULL,
  id text NOT NULL CHECK (id <> ''),
  workshop_id text NOT NULL,
  workshop_name text,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  vehicle text NOT NULL DEFAULT '',
  message text NOT NULL,
  consent boolean NOT NULL CHECK (consent),
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, workshop_id) REFERENCES shop.workshop(tenant_id, id)
);
CREATE TABLE IF NOT EXISTS shop.contact_request (
  tenant_id uuid NOT NULL REFERENCES nx_foundation.tenant(id),
  -- "request:" + sha256(Idempotency-Key): dieselbe Anfrage entsteht nur einmal.
  id text NOT NULL CHECK (id ~ '^request:[0-9a-f]{64}$'),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  number text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  company text NOT NULL DEFAULT '',
  message text NOT NULL,
  page_path text NOT NULL DEFAULT '',
  kind text NOT NULL CHECK (kind IN ('contact', 'partner', 'project', 'demo', 'integration', 'workshop_partner', 'booking')),
  consent boolean NOT NULL CHECK (consent),
  service text NOT NULL DEFAULT '',
  budget text NOT NULL DEFAULT '',
  timeline text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  status text NOT NULL,
  stage text,
  user_id text,
  notify_recovery_pending boolean NOT NULL DEFAULT true,
  notify_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, number)
);
CREATE INDEX IF NOT EXISTS contact_request_email_idx ON shop.contact_request(tenant_id, email, created_at);

-- --------------------------------------------------------------------------
-- Row-Level Security: auf JEDER Tabelle eingeschaltet, auf allen Fachtabellen auch für den Eigentümer erzwungen.
-- shop_service: an den Mandanten gebunden; Lesen mit Mitgliedschaft, Schreiben nur als 'editor'.
-- --------------------------------------------------------------------------
DO $rls$
DECLARE t text;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c WHERE c.relnamespace = 'shop'::regnamespace AND c.relkind = 'r' ORDER BY 1 LOOP
    EXECUTE format('ALTER TABLE shop.%I ENABLE ROW LEVEL SECURITY', t);
    -- schema_migration: nur der Eigentümer schreibt sie; der Dienst liest sie für die Startprüfung der Schemaversion.
    CONTINUE WHEN t = 'schema_migration';
    EXECUTE format('ALTER TABLE shop.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS service_read ON shop.%I', t);
    EXECUTE format('CREATE POLICY service_read ON shop.%I FOR SELECT TO shop_service USING (tenant_id = (SELECT shop.authorized_tenant(false)))', t);
    EXECUTE format('DROP POLICY IF EXISTS service_insert ON shop.%I', t);
    EXECUTE format('CREATE POLICY service_insert ON shop.%I FOR INSERT TO shop_service WITH CHECK (tenant_id = (SELECT shop.authorized_tenant(true)))', t);
    EXECUTE format('DROP POLICY IF EXISTS service_update ON shop.%I', t);
    EXECUTE format('CREATE POLICY service_update ON shop.%I FOR UPDATE TO shop_service USING (tenant_id = (SELECT shop.authorized_tenant(true))) WITH CHECK (tenant_id = (SELECT shop.authorized_tenant(true)))', t);
    EXECUTE format('DROP POLICY IF EXISTS service_delete ON shop.%I', t);
    EXECUTE format('CREATE POLICY service_delete ON shop.%I FOR DELETE TO shop_service USING (tenant_id = (SELECT shop.authorized_tenant(true)))', t);
  END LOOP;
END
$rls$;

-- shop_storefront: öffentlich lesbar ist nur veröffentlichter Katalog des eigenen Mandanten.
DROP POLICY IF EXISTS storefront_read ON shop.product;
CREATE POLICY storefront_read ON shop.product FOR SELECT TO shop_storefront
  USING (active AND tenant_id = (SELECT shop.authorized_tenant(false)));
DROP POLICY IF EXISTS storefront_read ON shop.product_category;
CREATE POLICY storefront_read ON shop.product_category FOR SELECT TO shop_storefront
  USING (tenant_id = (SELECT shop.authorized_tenant(false))
         AND EXISTS (SELECT FROM shop.product p WHERE p.tenant_id = product_category.tenant_id AND p.id = product_category.product_id));
DROP POLICY IF EXISTS storefront_read ON shop.category;
CREATE POLICY storefront_read ON shop.category FOR SELECT TO shop_storefront
  USING (tenant_id = (SELECT shop.authorized_tenant(false)));
DROP POLICY IF EXISTS storefront_read ON shop.setting;
CREATE POLICY storefront_read ON shop.setting FOR SELECT TO shop_storefront
  USING (tenant_id = (SELECT shop.authorized_tenant(false)));
DROP POLICY IF EXISTS storefront_read ON shop.workshop;
CREATE POLICY storefront_read ON shop.workshop FOR SELECT TO shop_storefront
  USING (tenant_id = (SELECT shop.authorized_tenant(false)));
DROP POLICY IF EXISTS storefront_read ON shop.import_run;
CREATE POLICY storefront_read ON shop.import_run FOR SELECT TO shop_storefront
  USING (status = 'done' AND tenant_id = (SELECT shop.authorized_tenant(false)));

-- Kundendaten: nur der Eigentümer. Ohne gültiges shop.owners ist die Liste leer und nichts sichtbar.
DROP POLICY IF EXISTS storefront_own ON shop.cart;
CREATE POLICY storefront_own ON shop.cart FOR ALL TO shop_storefront
  USING (tenant_id = (SELECT shop.authorized_tenant(true)) AND owner = ANY ((SELECT shop.current_owners())::text[]))
  WITH CHECK (tenant_id = (SELECT shop.authorized_tenant(true)) AND owner = ANY ((SELECT shop.current_owners())::text[]));
DROP POLICY IF EXISTS storefront_own ON shop.cart_item;
CREATE POLICY storefront_own ON shop.cart_item FOR ALL TO shop_storefront
  USING (tenant_id = (SELECT shop.authorized_tenant(true))
         AND EXISTS (SELECT FROM shop.cart c WHERE c.tenant_id = cart_item.tenant_id AND c.id = cart_item.cart_id))
  WITH CHECK (tenant_id = (SELECT shop.authorized_tenant(true))
         AND EXISTS (SELECT FROM shop.cart c WHERE c.tenant_id = cart_item.tenant_id AND c.id = cart_item.cart_id));
DROP POLICY IF EXISTS storefront_read ON shop.cart_merge;
CREATE POLICY storefront_read ON shop.cart_merge FOR SELECT TO shop_storefront
  USING (tenant_id = (SELECT shop.authorized_tenant(false)) AND user_owner = ANY ((SELECT shop.current_owners())::text[]));
DROP POLICY IF EXISTS storefront_insert ON shop.cart_merge;
CREATE POLICY storefront_insert ON shop.cart_merge FOR INSERT TO shop_storefront
  WITH CHECK (tenant_id = (SELECT shop.authorized_tenant(true)) AND user_owner = ANY ((SELECT shop.current_owners())::text[])
         AND EXISTS (SELECT FROM shop.cart c WHERE c.tenant_id = cart_merge.tenant_id AND c.id = cart_merge.guest_cart_id));
DROP POLICY IF EXISTS storefront_read ON shop.customer_order;
CREATE POLICY storefront_read ON shop.customer_order FOR SELECT TO shop_storefront
  USING (tenant_id = (SELECT shop.authorized_tenant(false)) AND owner = ANY ((SELECT shop.current_owners())::text[]));
DROP POLICY IF EXISTS storefront_insert ON shop.customer_order;
CREATE POLICY storefront_insert ON shop.customer_order FOR INSERT TO shop_storefront
  WITH CHECK (tenant_id = (SELECT shop.authorized_tenant(true)) AND owner = ANY ((SELECT shop.current_owners())::text[])
         AND status = 'zahlung_offen');
DROP POLICY IF EXISTS storefront_read ON shop.order_line;
CREATE POLICY storefront_read ON shop.order_line FOR SELECT TO shop_storefront
  USING (tenant_id = (SELECT shop.authorized_tenant(false))
         AND EXISTS (SELECT FROM shop.customer_order o WHERE o.tenant_id = order_line.tenant_id AND o.id = order_line.order_id));
DROP POLICY IF EXISTS storefront_insert ON shop.order_line;
CREATE POLICY storefront_insert ON shop.order_line FOR INSERT TO shop_storefront
  WITH CHECK (tenant_id = (SELECT shop.authorized_tenant(true))
         AND EXISTS (SELECT FROM shop.customer_order o WHERE o.tenant_id = order_line.tenant_id AND o.id = order_line.order_id
                     AND o.status = 'zahlung_offen'));
DROP POLICY IF EXISTS storefront_read ON shop.payment;
CREATE POLICY storefront_read ON shop.payment FOR SELECT TO shop_storefront
  USING (tenant_id = (SELECT shop.authorized_tenant(false))
         AND EXISTS (SELECT FROM shop.customer_order o WHERE o.tenant_id = payment.tenant_id AND o.id = payment.order_id));

-- --------------------------------------------------------------------------
-- Objektrechte: kleinste nötige Menge. Was nicht genannt ist, ist verboten.
-- --------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA shop FROM PUBLIC, shop_storefront, shop_service;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA shop FROM PUBLIC;
GRANT EXECUTE ON FUNCTION shop.authorized_tenant(boolean), shop.current_owners() TO shop_storefront, shop_service;

GRANT SELECT ON shop.category, shop.product, shop.product_category, shop.setting, shop.workshop,
  shop.cart, shop.cart_item, shop.cart_merge, shop.customer_order, shop.order_line, shop.payment TO shop_storefront;
GRANT SELECT (tenant_id, id, status, finished_at, partial) ON shop.import_run TO shop_storefront;
GRANT INSERT, DELETE ON shop.cart, shop.cart_item TO shop_storefront;
GRANT UPDATE (revision, updated_at) ON shop.cart TO shop_storefront;
GRANT UPDATE (name, quantity, price_seen_cents) ON shop.cart_item TO shop_storefront;
GRANT INSERT ON shop.cart_merge, shop.order_line TO shop_storefront;
-- Die Kundenseite legt nur die Momentaufnahme an; Zahl- und Versandzustand kann sie nicht setzen.
GRANT INSERT (tenant_id, id, number, owner, user_id, idempotency_key, request_hash, subtotal_cents, shipping_cents,
  total_cents, vat_included_cents, vat_percent, currency, address, shipping_method, terms_accepted_at, cart_revision,
  revolut_mode, created_at) ON shop.customer_order TO shop_storefront;

GRANT SELECT ON ALL TABLES IN SCHEMA shop TO shop_service;
-- schema_migration: Lesen für die Startprüfung (Umstellungsplan, Ersatz des Namespace-Markers); kein Schreibrecht.
DROP POLICY IF EXISTS service_version_read ON shop.schema_migration;
CREATE POLICY service_version_read ON shop.schema_migration FOR SELECT TO shop_service USING (true);
GRANT INSERT ON shop.setting, shop.price_release, shop.import_run, shop.source_manifest, shop.category, shop.product,
  shop.product_category, shop.cart, shop.cart_item, shop.cart_merge, shop.customer_order, shop.order_line, shop.payment,
  shop.payment_event, shop.payment_webhook, shop.outbox, shop.account, shop.account_session, shop.login_failure,
  shop.password_reset, shop.workshop, shop.workshop_request, shop.contact_request TO shop_service;
GRANT UPDATE ON shop.setting, shop.import_run, shop.category, shop.product, shop.cart_item, shop.payment_webhook,
  shop.outbox, shop.account, shop.password_reset, shop.workshop, shop.contact_request TO shop_service;
GRANT UPDATE (revision, updated_at) ON shop.cart TO shop_service;
-- Unveränderlich nach dem Anlegen: Kennung, Eigentümer, Idempotenzschlüssel, Beträge, Steuer, Adresse, Positionen.
GRANT UPDATE (status, paid_at, paid_transitions, paid_mail_intents_recorded, paid_mail_recovery_pending, fulfilment,
  processing_at, shipped_at, delivered_at, tracking_number, carrier, status_changed_by, source_environment,
  bigbuy_order_id, bigbuy_submitting, bigbuy_submit_pending, bigbuy_submitted_at, bigbuy_carrier, fulfillment_error,
  fulfillment_checked_at) ON shop.customer_order TO shop_service;
GRANT UPDATE (provider_order_id, checkout_url, state, error, updated_at) ON shop.payment TO shop_service;
-- Gelöscht wird nur Flüchtiges. Bestellungen, Zahlungen, Ereignisse und Freigaben haben kein DELETE.
GRANT DELETE ON shop.cart_item, shop.product_category, shop.account_session, shop.login_failure, shop.password_reset TO shop_service;

INSERT INTO shop.schema_migration(version, description)
VALUES (1, 'TEILEKLAR shop: catalog, cart, order, payment, import, accounts; forced tenant and owner RLS')
ON CONFLICT (version) DO NOTHING;
COMMIT;

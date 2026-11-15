-- TEILEKLAR.shop · Schema "shop" · Migration 0001 (Tabellen, Schlüssel, Indizes)
-- Vorbereitung nach DECISIONS.md D-013. NUR Migrationsdatei: nicht gegen eine Datenbank mit
-- echten Daten einspielen, bevor der Inhaber die Umstellung freigegeben hat (D-016).
-- Anwenden: psql -X -v ON_ERROR_STOP=1 "$ZIEL" -f 0001_shop_schema.sql  (danach 0002).
--
-- Grundsatz: Jede Zeile trägt das Dokument, wie es der Fachcode geschrieben hat ("doc", Typ json,
-- damit Feldfolge und "Feld fehlt" gegenüber "Feld ist null" erhalten bleiben; nur so bleiben
-- die Antworten der Shop-API bytegleich). Alles, wonach gesucht, sortiert oder was erzwungen
-- wird, ist eine aus "doc" ABGELEITETE Spalte (generated always ... stored): Es gibt je Zeile
-- genau eine Wahrheit, und die Datenbank erzwingt Typen, Eindeutigkeit und ganze Cent.
-- Sitzungen, Fehlversuche, Rücksetz-Token und Zahlungsereignisse haben eine feste Form und
-- sind deshalb vollständig typisierte Tabellen ohne "doc".
--
-- Das Schema "shop" gehört NICHT in PGRST_DB_SCHEMAS: Der Shop wird nur serverseitig über die
-- Shop-API gelesen und geschrieben, nie über PostgREST aus dem Browser.

do $$
begin
  if current_setting('server_version_num')::int < 150000 then
    raise exception 'shop schema needs PostgreSQL 15 or newer (unique nulls not distinct)';
  end if;
  if not exists (select 1 from pg_collation where collname = 'und-x-icu') then
    raise exception 'shop schema needs ICU collations (und-x-icu) for case-insensitive search';
  end if;
end $$;

create schema if not exists shop;

-- --------------------------------------------------------------------------
-- Ableitungen aus dem Dokument. Nur der erwartete JSON-Typ zählt, wie in MongoDB:
-- eine Zahl ist kein Text, "true" ist nicht true.
-- --------------------------------------------------------------------------
create or replace function shop.j_text(d json, k text) returns text
  language sql immutable parallel safe
  as $$ select case when json_typeof(d -> k) = 'string' then d ->> k end $$;

create or replace function shop.j_num(d json, k text) returns numeric
  language sql immutable parallel safe
  as $$ select case when json_typeof(d -> k) = 'number' then (d ->> k)::numeric end $$;

-- Ganze Zahl oder Fehler: Ein Betrag wie 19.95 wird abgewiesen, nicht gerundet.
create or replace function shop.j_int(d json, k text) returns bigint
  language sql immutable parallel safe
  as $$ select case when json_typeof(d -> k) = 'number' then (d ->> k)::bigint end $$;

create or replace function shop.j_true(d json, k text) returns boolean
  language sql immutable parallel safe
  as $$ select coalesce(json_typeof(d -> k) = 'boolean' and (d ->> k) = 'true', false) $$;

create or replace function shop.touch_row() returns trigger
  language plpgsql
  as $$ begin new.row_updated_at := now(); return new; end $$;

-- --------------------------------------------------------------------------
-- Katalog
-- --------------------------------------------------------------------------
create table if not exists shop.products (
  seq            bigint generated always as identity,
  id             text primary key,
  doc            json not null check (json_typeof(doc) = 'object' and (doc -> '_id') is null),
  name           text collate "C" generated always as (shop.j_text(doc, 'name')) stored,
  sku            text collate "C" generated always as (shop.j_text(doc, 'sku')) stored,
  ean            text collate "C" generated always as (shop.j_text(doc, 'ean')) stored,
  active         boolean not null generated always as (shop.j_true(doc, 'active')) stored,
  stock          numeric generated always as (shop.j_num(doc, 'stock')) stored,
  purchase_cents bigint generated always as (shop.j_int(doc, 'purchase_cents')) stored check (purchase_cents >= 0),
  bigbuy_id      bigint generated always as (shop.j_int(doc, 'bigbuy_id')) stored,
  category_ids   jsonb generated always as ((doc -> 'category_ids')::jsonb) stored,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now()
);
create unique index if not exists products_seq_idx on shop.products (seq);
create unique index if not exists products_bigbuy_id_idx on shop.products (bigbuy_id);
create index if not exists products_active_idx on shop.products (active);
create index if not exists products_category_ids_idx on shop.products using gin (category_ids);
create index if not exists products_ean_idx on shop.products (ean);
create index if not exists products_sku_idx on shop.products (sku);

create table if not exists shop.categories (
  seq            bigint generated always as identity,
  id             bigint primary key,
  doc            json not null check (json_typeof(doc) = 'object' and (doc -> '_id') is null),
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now()
);
create unique index if not exists categories_seq_idx on shop.categories (seq);

create table if not exists shop.imports (
  seq            bigint generated always as identity,
  id             text primary key,
  doc            json not null check (json_typeof(doc) = 'object' and (doc -> '_id') is null),
  status         text collate "C" generated always as (shop.j_text(doc, 'status')) stored,
  started_at     text collate "C" generated always as (shop.j_text(doc, 'started_at')) stored,
  finished_at    text collate "C" generated always as (shop.j_text(doc, 'finished_at')) stored,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now()
);
create unique index if not exists imports_seq_idx on shop.imports (seq);
create index if not exists imports_status_finished_idx on shop.imports (status, finished_at);

create table if not exists shop.source_manifests (
  seq            bigint generated always as identity,
  id             text primary key,
  doc            json not null check (json_typeof(doc) = 'object' and (doc -> '_id') is null),
  run_id         text collate "C" generated always as (shop.j_text(doc, 'run_id')) stored,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now()
);
create unique index if not exists source_manifests_seq_idx on shop.source_manifests (seq);
create index if not exists source_manifests_run_idx on shop.source_manifests (run_id);

-- Einstellungen: "shop" (Aufschlag als Text mit zwei Nachkommastellen, Versandpauschale in Cent,
-- Preisfreigabe) und "bigbuy_publication" (Zähler des Importers).
create table if not exists shop.settings (
  seq            bigint generated always as identity,
  id             text primary key,
  doc            json not null check (json_typeof(doc) = 'object' and (doc -> '_id') is null),
  shipping_cents bigint generated always as (shop.j_int(doc, 'shipping_cents')) stored check (shipping_cents >= 0),
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now()
);
create unique index if not exists settings_seq_idx on shop.settings (seq);

-- Freigabeprotokoll: wächst nur (0002 gibt der Dienstrolle weder update noch delete).
create table if not exists shop.price_releases (
  seq            bigint generated always as identity,
  id             text primary key,
  doc            json not null check (json_typeof(doc) = 'object' and (doc -> '_id') is null),
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now()
);
create unique index if not exists price_releases_seq_idx on shop.price_releases (seq);

-- --------------------------------------------------------------------------
-- Warenkorb: eine Zeile je Eigentümer, Vergleichen-und-Setzen über "revision".
-- --------------------------------------------------------------------------
create table if not exists shop.carts (
  seq            bigint generated always as identity,
  id             text primary key,
  doc            json not null check (json_typeof(doc) = 'object' and (doc -> '_id') is null),
  owner          text collate "C" generated always as (shop.j_text(doc, 'owner')) stored,
  revision       bigint generated always as (shop.j_int(doc, 'revision')) stored,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  constraint carts_owner_key unique nulls not distinct (owner)
);
create unique index if not exists carts_seq_idx on shop.carts (seq);

-- --------------------------------------------------------------------------
-- Konten. Hier liegen nur Hashes (Passwort: bcrypt; Token: sha256), nie Klartext.
-- --------------------------------------------------------------------------
create table if not exists shop.users (
  seq            bigint generated always as identity,
  id             text primary key,
  doc            json not null check (json_typeof(doc) = 'object' and (doc -> '_id') is null),
  email          text collate "C" generated always as (shop.j_text(doc, 'email')) stored,
  user_id        text collate "C" generated always as (shop.j_text(doc, 'user_id')) stored,
  role           text collate "C" generated always as (shop.j_text(doc, 'role')) stored,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  constraint users_email_key unique nulls not distinct (email),
  constraint users_user_id_key unique nulls not distinct (user_id)
);
create unique index if not exists users_seq_idx on shop.users (seq);

create table if not exists shop.sessions (
  seq            bigint generated always as identity,
  id             text primary key,
  token_hash     text not null unique,
  user_id        text not null,
  created_at     text,
  expires_at     timestamptz not null,
  row_created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on shop.sessions (user_id);
create index if not exists sessions_expires_idx on shop.sessions (expires_at);

create table if not exists shop.login_failures (
  seq            bigint generated always as identity,
  id             text primary key,
  email          text not null,
  at             timestamptz not null,
  row_created_at timestamptz not null default now()
);
create index if not exists login_failures_email_at_idx on shop.login_failures (email, at);

create table if not exists shop.password_resets (
  seq            bigint generated always as identity,
  id             text primary key,
  token_hash     text not null unique,
  user_id        text not null,
  used           boolean not null default false,
  expires_at     timestamptz not null,
  mail_status    text,
  row_created_at timestamptz not null default now()
);
create index if not exists password_resets_expires_idx on shop.password_resets (expires_at);

-- Schlüssel der Kundenschnittstelle (Portal). Nur der Hash des Schlüssels liegt hier.
create table if not exists shop.api_keys (
  seq            bigint generated always as identity,
  id             text primary key,
  doc            json not null check (json_typeof(doc) = 'object' and (doc -> '_id') is null),
  tenant_id      text collate "C" generated always as (shop.j_text(doc, 'tenant_id')) stored,
  key_id         text collate "C" generated always as (shop.j_text(doc, 'key_id')) stored,
  hash           text collate "C" generated always as (shop.j_text(doc, 'hash')) stored,
  revoked        boolean not null generated always as (json_typeof(doc -> 'revoked_at') is distinct from 'null' and (doc -> 'revoked_at') is not null) stored,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now(),
  constraint api_keys_hash_key unique nulls not distinct (hash)
);
create unique index if not exists api_keys_seq_idx on shop.api_keys (seq);
create index if not exists api_keys_tenant_idx on shop.api_keys (tenant_id);

-- --------------------------------------------------------------------------
-- Bestellungen. Beträge sind ganze Cent; die Datenbank weist anderes ab.
-- Ein Auftrag je Eigentümer und Idempotenzschlüssel.
-- --------------------------------------------------------------------------
create table if not exists shop.orders (
  seq              bigint generated always as identity,
  id               text primary key,
  doc              json not null check (json_typeof(doc) = 'object' and (doc -> '_id') is null),
  owner            text collate "C" generated always as (shop.j_text(doc, 'owner')) stored,
  idempotency_key  text collate "C" generated always as (shop.j_text(doc, 'idempotency_key')) stored,
  user_id          text collate "C" generated always as (shop.j_text(doc, 'user_id')) stored,
  status           text collate "C" generated always as (shop.j_text(doc, 'status')) stored,
  fulfilment       text collate "C" generated always as (shop.j_text(doc, 'fulfilment')) stored,
  revolut_order_id text collate "C" generated always as (shop.j_text(doc, 'revolut_order_id')) stored,
  created_at       text collate "C" generated always as (shop.j_text(doc, 'created_at')) stored,
  subtotal_cents   bigint generated always as (shop.j_int(doc, 'subtotal_cents')) stored check (subtotal_cents >= 0),
  shipping_cents   bigint generated always as (shop.j_int(doc, 'shipping_cents')) stored check (shipping_cents >= 0),
  total_cents      bigint generated always as (shop.j_int(doc, 'total_cents')) stored check (total_cents >= 0),
  paid_transitions bigint generated always as (shop.j_int(doc, 'paid_transitions')) stored check (paid_transitions between 0 and 1),
  paid_mail_recovery_pending boolean not null generated always as (shop.j_true(doc, 'paid_mail_recovery_pending')) stored,
  row_created_at   timestamptz not null default now(),
  row_updated_at   timestamptz not null default now(),
  constraint orders_owner_idempotency_key unique nulls not distinct (owner, idempotency_key)
);
create unique index if not exists orders_seq_idx on shop.orders (seq);
create index if not exists orders_revolut_idx on shop.orders (revolut_order_id);
create index if not exists orders_user_idx on shop.orders (user_id);
create index if not exists orders_owner_created_idx on shop.orders (owner, created_at desc);
create index if not exists orders_created_idx on shop.orders (created_at desc);
create index if not exists orders_pending_mails_idx on shop.orders (seq) where status = 'bezahlt' and paid_mail_recovery_pending;

-- Empfangene Ereignisse des Zahlungsanbieters: einmal je Inhaltsschlüssel, wächst nur.
create table if not exists shop.webhook_events (
  seq            bigint generated always as identity,
  id             text primary key,
  event_key      text not null unique,
  event          text,
  order_id       text,
  received_at    text,
  row_created_at timestamptz not null default now()
);

-- Webhook-Anmeldung je Betriebsart. "doc" enthält das Signaturgeheimnis des Anbieters:
-- nur die Dienstrolle liest diese Tabelle (0002), nichts davon gehört in Protokolle.
create table if not exists shop.revolut_webhooks (
  seq            bigint generated always as identity,
  id             text primary key check (id in ('sandbox', 'live')),
  doc            json not null check (json_typeof(doc) = 'object' and (doc -> '_id') is null),
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- Postausgang: ein Auftrag je Ereignisschlüssel.
-- --------------------------------------------------------------------------
create table if not exists shop.outbox (
  seq            bigint generated always as identity,
  id             text primary key,
  doc            json not null check (json_typeof(doc) = 'object' and (doc -> '_id') is null),
  status         text collate "C" generated always as (shop.j_text(doc, 'status')) stored,
  attempts       numeric generated always as (shop.j_num(doc, 'attempts')) stored,
  retry_safe     boolean not null generated always as (shop.j_true(doc, 'retry_safe')) stored,
  claimed_at     text collate "C" generated always as (shop.j_text(doc, 'claimed_at')) stored,
  has_claimed_at boolean not null generated always as ((doc -> 'claimed_at') is not null) stored,
  sent_at        text collate "C" generated always as (shop.j_text(doc, 'sent_at')) stored,
  created_at     text collate "C" generated always as (shop.j_text(doc, 'created_at')) stored,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now()
);
create unique index if not exists outbox_seq_idx on shop.outbox (seq);
create index if not exists outbox_status_idx on shop.outbox (status);
create index if not exists outbox_created_idx on shop.outbox (created_at desc);

-- --------------------------------------------------------------------------
-- Kontaktanfragen, Werkstattverzeichnis, Werkstattanfragen
-- --------------------------------------------------------------------------
create table if not exists shop.requests (
  seq            bigint generated always as identity,
  id             text primary key,
  doc            json not null check (json_typeof(doc) = 'object' and (doc -> '_id') is null),
  email          text collate "C" generated always as (shop.j_text(doc, 'email')) stored,
  created_at     text collate "C" generated always as (shop.j_text(doc, 'created_at')) stored,
  notify_recovery_pending boolean not null generated always as (shop.j_true(doc, 'notify_recovery_pending')) stored,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now()
);
create unique index if not exists requests_seq_idx on shop.requests (seq);
create index if not exists requests_email_created_idx on shop.requests (email, created_at);
create index if not exists requests_pending_idx on shop.requests (seq) where notify_recovery_pending;

create table if not exists shop.workshops (
  seq            bigint generated always as identity,
  id             text primary key,
  doc            json not null check (json_typeof(doc) = 'object' and (doc -> '_id') is null),
  zip            text collate "C" generated always as (shop.j_text(doc, 'zip')) stored,
  city_key       text collate "C" generated always as (shop.j_text(doc, 'city_key')) stored,
  lat            numeric generated always as (shop.j_num(doc, 'lat')) stored,
  lon            numeric generated always as (shop.j_num(doc, 'lon')) stored,
  has_lat        boolean not null generated always as ((doc -> 'lat') is not null) stored,
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now()
);
create unique index if not exists workshops_seq_idx on shop.workshops (seq);
create index if not exists workshops_zip_idx on shop.workshops (zip);
create index if not exists workshops_city_key_idx on shop.workshops (city_key);
create index if not exists workshops_lat_lon_idx on shop.workshops (lat, lon);

create table if not exists shop.workshop_requests (
  seq            bigint generated always as identity,
  id             text primary key,
  doc            json not null check (json_typeof(doc) = 'object' and (doc -> '_id') is null),
  row_created_at timestamptz not null default now(),
  row_updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- Änderungszeitpunkt je Zeile
-- --------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['products', 'categories', 'imports', 'source_manifests', 'settings', 'price_releases', 'carts',
                           'users', 'api_keys', 'orders', 'revolut_webhooks', 'outbox', 'requests', 'workshops', 'workshop_requests']
  loop
    execute format('drop trigger if exists touch_row on shop.%I', t);
    execute format('create trigger touch_row before update on shop.%I for each row execute function shop.touch_row()', t);
  end loop;
end $$;

-- --------------------------------------------------------------------------
-- Aufräumen abgelaufener Einträge. MongoDB erledigt das über TTL-Indizes; PostgreSQL braucht
-- einen Aufruf (Zeitplan ist NICHT eingerichtet, siehe Umschaltplan). Die Shop-API prüft den
-- Ablauf ohnehin selbst; diese Funktion hält nur die Tabellen klein.
-- --------------------------------------------------------------------------
create or replace function shop.purge_expired(p_now timestamptz, p_lock_window interval) returns bigint
  language plpgsql
  as $$
declare n bigint := 0; c bigint;
begin
  delete from shop.sessions where expires_at <= p_now; get diagnostics c = row_count; n := n + c;
  delete from shop.password_resets where expires_at <= p_now; get diagnostics c = row_count; n := n + c;
  delete from shop.login_failures where at <= p_now - p_lock_window; get diagnostics c = row_count; n := n + c;
  return n;
end $$;

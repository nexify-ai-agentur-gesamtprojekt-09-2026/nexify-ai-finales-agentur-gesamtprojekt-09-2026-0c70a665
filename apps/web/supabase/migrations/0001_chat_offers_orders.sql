-- NeXify Live-Chat · Schema "chat" · Migration 0001
-- Self-hosted Supabase (OSS). NUR Migrationsdatei — NICHT gegen eine Live-DB pushen.
-- Anwenden (Beispiel): psql "$DATABASE_URL" -f 0001_chat_offers_orders.sql
--   oder: supabase migration new + Inhalt + supabase db push (durch Pascal, bewusst).
--
-- PostgREST muss das Schema ausliefern:  PGRST_DB_SCHEMAS="public,chat"
-- Schreibzugriffe erfolgen serverseitig mit Service-Role (umgeht RLS).

create extension if not exists "pgcrypto";

create schema if not exists chat;

-- --------------------------------------------------------------------------
-- Konversationen
-- --------------------------------------------------------------------------
create table if not exists chat.chat_conversations (
  id          uuid primary key default gen_random_uuid(),
  locale      text not null default 'de' check (locale in ('de','nl','fr','en')),
  page_path   text not null default '/',
  status      text not null default 'open' check (status in ('open','closed','archived')),
  visitor_ref text,                       -- optionaler, nicht-personenbezogener Besucherbezug
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- Nachrichten
-- --------------------------------------------------------------------------
create table if not exists chat.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat.chat_conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  content         text not null,
  model           text,
  created_at      timestamptz not null default now()
);
create index if not exists chat_messages_conv_idx on chat.chat_messages(conversation_id, created_at);

-- --------------------------------------------------------------------------
-- Individuelles Angebot (entsteht aus der Konversation)
-- --------------------------------------------------------------------------
create table if not exists chat.chat_offers (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat.chat_conversations(id) on delete cascade,
  status          text not null default 'draft'
                    check (status in ('draft','proposed','accepted','ordered','cancelled')),
  title           text not null,
  summary         text not null default '',
  currency        text not null default 'EUR',
  est_total_cents bigint,                 -- Summe der Richtpreise (netto), null solange offen
  valid_until     date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists chat_offers_conv_idx on chat.chat_offers(conversation_id);

-- Positionen des Angebots
create table if not exists chat.chat_offer_items (
  id          uuid primary key default gen_random_uuid(),
  offer_id    uuid not null references chat.chat_offers(id) on delete cascade,
  position    int  not null,
  description text not null,
  quantity    int  not null default 1 check (quantity > 0),
  unit_cents  bigint,                     -- Richtpreis je Einheit (netto), null = offen
  line_cents  bigint,                     -- quantity * unit_cents, null solange offen
  unique (offer_id, position)
);
create index if not exists chat_offer_items_offer_idx on chat.chat_offer_items(offer_id);

-- --------------------------------------------------------------------------
-- Verbindliche Bestellung (Positionen eingefroren)
-- --------------------------------------------------------------------------
create sequence if not exists chat.order_number_seq;

create or replace function chat.next_order_number()
returns text language sql volatile as $$
  select 'NX-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('chat.order_number_seq')::text, 6, '0');
$$;

create table if not exists chat.chat_orders (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique default chat.next_order_number(),
  offer_id        uuid not null unique references chat.chat_offers(id) on delete restrict,
  conversation_id uuid references chat.chat_conversations(id) on delete set null,
  status          text not null default 'placed'
                    check (status in ('placed','confirmed','dispatched','fulfilled','cancelled')),
  customer        jsonb not null,         -- {name,email,company?,phone?,note?}
  items           jsonb not null,         -- eingefrorener Positions-Snapshot
  total_cents     bigint,
  currency        text not null default 'EUR',
  dispatched      boolean not null default false,
  external_ref    text,                   -- Referenz des externen Fulfilment
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists chat_orders_conv_idx on chat.chat_orders(conversation_id);

-- Bestell-Ereignisse (Audit / Außenversand)
create table if not exists chat.chat_order_events (
  id         bigserial primary key,
  order_id   uuid not null references chat.chat_orders(id) on delete cascade,
  kind       text not null,              -- placed | dispatched | dispatch_failed | confirmed | ...
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists chat_order_events_order_idx on chat.chat_order_events(order_id, created_at);

-- --------------------------------------------------------------------------
-- updated_at-Trigger
-- --------------------------------------------------------------------------
create or replace function chat.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

do $$
declare t text;
begin
  for t in select unnest(array['chat_conversations','chat_offers','chat_orders']) loop
    execute format(
      'drop trigger if exists %I_touch on chat.%I; create trigger %I_touch before update on chat.%I for each row execute function chat.touch_updated_at();',
      t, t, t, t);
  end loop;
end $$;

-- --------------------------------------------------------------------------
-- Row-Level Security: deny-by-default.
-- Keine permissiven Policies für anon/authenticated => Direktzugriff gesperrt.
-- Der Server schreibt/liest mit Service-Role (BYPASSRLS). Wird später ein
-- eingeloggter Self-Service gebraucht, hier gezielt Policies ergänzen.
-- --------------------------------------------------------------------------
alter table chat.chat_conversations enable row level security;
alter table chat.chat_messages      enable row level security;
alter table chat.chat_offers        enable row level security;
alter table chat.chat_offer_items   enable row level security;
alter table chat.chat_orders        enable row level security;
alter table chat.chat_order_events  enable row level security;

-- PostgREST-Rollen Schema-Nutzung erlauben (Objektrechte, nicht RLS-Bypass).
grant usage on schema chat to anon, authenticated, service_role;
grant all on all tables in schema chat to service_role;
grant usage, select on all sequences in schema chat to service_role;

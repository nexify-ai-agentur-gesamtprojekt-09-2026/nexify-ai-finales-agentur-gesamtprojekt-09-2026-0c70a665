-- NeXify Composio-Ablage · Schema "composio" · Migration 0004
-- Self-hosted Supabase (OSS). NUR Migrationsdatei — NICHT automatisch gegen eine Live-DB pushen.
-- Anwenden (durch Pascal, bewusst): psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 0004_composio.sql
-- Unabhängig von den Migrationen 0001 bis 0003 (eigenes Schema, keine Fremdschlüssel in "chat").
--
-- PostgREST muss das Schema ausliefern:  PGRST_DB_SCHEMAS="public,chat,composio"
-- Zugriff nur serverseitig mit Service-Role (apps/web/lib/composio-store.ts über lib/supabase-rest.ts).
--
-- Hält genau das, was das Interface `ComposioStore` hält:
--   connections   Verbindungen (Mandant, Nutzer, Status)
--   triggers      angelegte Trigger je Mandant und Nutzer
--   event_claims  beanspruchte Ereignis-Kennungen (Idempotenz des Webhooks)
--   events        abgelegte Ereignisse, nur Zusammenfassung (Trigger-Slug, Trigger-Kennung)
-- Vom Inhalt eines Ereignisses wird nichts gespeichert: keine Nutzdaten, keine Personendaten, keine Geheimnisse.

create schema if not exists composio;

-- --------------------------------------------------------------------------
-- Verbindungen. Die Kennung vergibt Composio; Mandant und Nutzer setzt allein die Suite.
-- --------------------------------------------------------------------------
create table if not exists composio.connections (
  connected_account_id text primary key check (length(connected_account_id) between 1 and 256),
  tenant_id            text not null check (length(tenant_id) between 1 and 256),
  user_id              text not null check (length(user_id) between 1 and 256),
  auth_config_id       text not null check (length(auth_config_id) <= 256),
  status               text not null check (status in ('pending','verified','active','expired')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists connections_owner_idx on composio.connections(tenant_id, user_id);

-- Eine Verbindung wechselt nie den Mandanten oder Nutzer. Der Speicher schreibt per Upsert; ohne diese Sperre
-- könnte ein Schreibfehler eine fremde Verbindung übernehmen.
create or replace function composio.keep_connection_owner()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if new.tenant_id is distinct from old.tenant_id or new.user_id is distinct from old.user_id then
    raise exception 'connection_owner_immutable' using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists connections_keep_owner on composio.connections;
create trigger connections_keep_owner before update on composio.connections
  for each row execute function composio.keep_connection_owner();

-- --------------------------------------------------------------------------
-- Trigger. Schlüssel = Mandant + Nutzer + Trigger-Kennung (wie im Arbeitsspeicher);
-- der Primärschlüssel dient zugleich als Index über Mandant und Nutzer.
-- --------------------------------------------------------------------------
create table if not exists composio.triggers (
  tenant_id  text not null check (length(tenant_id) between 1 and 256),
  user_id    text not null check (length(user_id) between 1 and 256),
  trigger_id text not null check (length(trigger_id) between 1 and 256),
  slug       text not null check (length(slug) <= 256),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id, trigger_id)
);

-- --------------------------------------------------------------------------
-- Idempotenz: je Ereignis-Kennung (Header webhook-id) genau eine Zeile.
-- claimEvent   = insert ... on conflict (event_id) do nothing returning  -> Zeile zurück = gewonnen
-- releaseEvent = delete                                                   -> Composio darf erneut zustellen
-- Die Kennung wird beansprucht, bevor die Verbindung gelesen ist; Mandant und Nutzer sind hier deshalb
-- noch nicht bekannt. Die Tabelle enthält nur Kennung und Zeitpunkt.
-- --------------------------------------------------------------------------
create table if not exists composio.event_claims (
  event_id   text primary key check (length(event_id) between 1 and 256),
  claimed_at timestamptz not null default now()
);
create index if not exists event_claims_claimed_idx on composio.event_claims(claimed_at);

-- --------------------------------------------------------------------------
-- Abgelegte Ereignisse: nur die Zusammenfassung aus `StoredEvent.summary`.
-- Bewusst zwei feste Spalten statt jsonb, damit kein Ereignisinhalt in die Tabelle gelangen kann.
-- --------------------------------------------------------------------------
create table if not exists composio.events (
  id           bigint generated always as identity primary key,
  event_id     text not null unique check (length(event_id) between 1 and 256),
  type         text not null check (type like 'composio.%' and length(type) <= 256),
  tenant_id    text not null check (length(tenant_id) between 1 and 256),
  user_id      text not null check (length(user_id) between 1 and 256),
  trigger_slug text not null default '' check (length(trigger_slug) <= 256),
  trigger_id   text not null default '' check (length(trigger_id) <= 256),
  received_at  timestamptz not null,
  created_at   timestamptz not null default now()
);
create index if not exists events_owner_idx on composio.events(tenant_id, user_id, received_at desc, id desc);

-- --------------------------------------------------------------------------
-- Row-Level Security: deny-by-default, wie im Schema "chat" (Migration 0001).
-- Keine Richtlinie für anon/authenticated => Direktzugriff gesperrt.
-- Der Server liest und schreibt mit Service-Role (BYPASSRLS).
-- --------------------------------------------------------------------------
alter table composio.connections  enable row level security;
alter table composio.triggers     enable row level security;
alter table composio.event_claims enable row level security;
alter table composio.events       enable row level security;

-- PostgREST-Rollen Schema-Nutzung erlauben (Objektrechte, nicht RLS-Bypass), wie in 0001.
-- Tabellenrechte erhält nur service_role; anon/authenticated ausdrücklich keine.
grant usage on schema composio to anon, authenticated, service_role;
revoke all on all tables in schema composio from public, anon, authenticated;
revoke all on all sequences in schema composio from public, anon, authenticated;
revoke all on function composio.keep_connection_owner() from public, anon, authenticated;
grant all on all tables in schema composio to service_role;
grant usage, select on all sequences in schema composio to service_role;

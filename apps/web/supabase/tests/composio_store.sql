-- Run only against a disposable database called nexify_composio_fixture:
-- psql -X -v ON_ERROR_STOP=1 -d nexify_composio_fixture -f apps/web/supabase/tests/composio_store.sql
-- The cluster must already contain the three Supabase roles; this test never
-- creates cluster-wide roles. All fixture objects and data are rolled back.
-- Prüft Migration 0004: Tabellen und Spalten, RLS ohne Richtlinie, Rechte der Rollen,
-- Pflicht-Mandant, Idempotenz der Ereignis-Kennung und die Besitzersperre der Verbindung.
\set ON_ERROR_STOP on
begin;
do $$
begin
  if current_database() <> 'nexify_composio_fixture' then
    raise exception 'Refusing to run outside nexify_composio_fixture';
  end if;
  if exists (select 1 from pg_namespace where nspname = 'composio') then
    raise exception 'Refusing to run against an existing composio schema';
  end if;
  if (select count(*) from pg_roles where rolname in ('anon','authenticated','service_role')) <> 3 then
    raise exception 'Fixture cluster must already contain Supabase roles';
  end if;
  if not (select rolbypassrls from pg_roles where rolname = 'service_role') then
    raise exception 'Fixture service role is misconfigured';
  end if;
end $$;
\ir ../migrations/0004_composio.sql
-- Zweites Anwenden darf nichts ändern und nicht scheitern.
\ir ../migrations/0004_composio.sql

-- Struktur: genau vier Tabellen, RLS überall an, keine einzige Richtlinie.
do $$
declare t text;
begin
  if (select array_agg(tablename::text order by tablename) from pg_tables where schemaname = 'composio')
     <> array['connections','event_claims','events','triggers'] then
    raise exception 'Unexpected tables in schema composio';
  end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'composio' and c.relkind = 'r' and not c.relrowsecurity) then
    raise exception 'Row-level security is not enabled on every table';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'composio') then
    raise exception 'Unexpected policy: access must stay service-role only';
  end if;
  foreach t in array array['connections','event_claims','events','triggers'] loop
    if has_table_privilege('anon', 'composio.' || t, 'select,insert,update,delete')
       or has_table_privilege('authenticated', 'composio.' || t, 'select,insert,update,delete') then
      raise exception 'Public role holds a table privilege on %', t;
    end if;
    if not has_table_privilege('service_role', 'composio.' || t, 'select')
       or not has_table_privilege('service_role', 'composio.' || t, 'insert')
       or not has_table_privilege('service_role', 'composio.' || t, 'delete') then
      raise exception 'service_role lacks a table privilege on %', t;
    end if;
  end loop;
  -- Mandant und Nutzer sind Pflichtspalten auf jeder Tabelle, die einem Mandanten gehört.
  if (select count(*) from information_schema.columns
      where table_schema = 'composio' and table_name in ('connections','events','triggers')
        and column_name in ('tenant_id','user_id') and is_nullable = 'NO') <> 6 then
    raise exception 'tenant_id/user_id must be NOT NULL on connections, events and triggers';
  end if;
  -- Index über Mandant und Nutzer (bei triggers der Primärschlüssel).
  if not exists (select 1 from pg_indexes where schemaname = 'composio' and indexname = 'connections_owner_idx' and indexdef like '%(tenant_id, user_id)%')
     or not exists (select 1 from pg_indexes where schemaname = 'composio' and indexname = 'events_owner_idx' and indexdef like '%(tenant_id, user_id,%')
     or not exists (select 1 from pg_indexes where schemaname = 'composio' and tablename = 'triggers' and indexdef like '%UNIQUE%(tenant_id, user_id, trigger_id)%') then
    raise exception 'Missing tenant/user index';
  end if;
  -- Eindeutige Schlüssel auf der Ereignis-Kennung.
  if not exists (select 1 from pg_indexes where schemaname = 'composio' and tablename = 'event_claims' and indexdef like '%UNIQUE%(event_id)%')
     or not exists (select 1 from pg_indexes where schemaname = 'composio' and tablename = 'events' and indexdef like '%UNIQUE%(event_id)%') then
    raise exception 'Missing unique key on event_id';
  end if;
  -- Keine Spalte für Ereignisinhalt: genau die Spalten der Zusammenfassung, kein json/jsonb/bytea im Schema.
  if (select array_agg(column_name::text order by column_name) from information_schema.columns
      where table_schema = 'composio' and table_name = 'events')
     <> array['created_at','event_id','id','received_at','tenant_id','trigger_id','trigger_slug','type','user_id'] then
    raise exception 'events must hold the summary columns only';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'composio' and data_type in ('json','jsonb','bytea')) then
    raise exception 'No payload column allowed in schema composio';
  end if;
end $$;

-- anon und authenticated: kein Zugriff, weder lesend noch schreibend.
set local role anon;
do $$
begin
  begin
    perform 1 from composio.connections;
    raise exception 'anon unexpectedly read connections';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into composio.event_claims(event_id) values ('anon_claim');
    raise exception 'anon unexpectedly claimed an event';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role authenticated;
do $$
begin
  begin
    perform 1 from composio.events;
    raise exception 'authenticated unexpectedly read events';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Der Server (service_role) arbeitet so, wie PostgREST es für den Speicher ausführt.
set local role service_role;
do $$
declare n int;
begin
  -- Pflicht-Mandant: null und leer werden abgelehnt.
  begin
    insert into composio.connections(connected_account_id, tenant_id, user_id, auth_config_id, status)
    values ('ca_null', null, 'u1', 'ac_1', 'pending');
    raise exception 'Connection without tenant accepted';
  exception when not_null_violation then null;
  end;
  begin
    insert into composio.connections(connected_account_id, tenant_id, user_id, auth_config_id, status)
    values ('ca_empty', 'konto:u1', '', 'ac_1', 'pending');
    raise exception 'Connection with empty user accepted';
  exception when check_violation then null;
  end;
  begin
    insert into composio.events(event_id, type, tenant_id, user_id, received_at)
    values ('msg_null', 'composio.trigger.message', null, 'u1', now());
    raise exception 'Event without tenant accepted';
  exception when not_null_violation then null;
  end;
  begin
    insert into composio.connections(connected_account_id, tenant_id, user_id, auth_config_id, status)
    values ('ca_status', 'konto:u1', 'u1', 'ac_1', 'unknown');
    raise exception 'Unknown status accepted';
  exception when check_violation then null;
  end;

  -- Verbindung: Upsert ändert den Status, aber nie den Besitzer.
  insert into composio.connections(connected_account_id, tenant_id, user_id, auth_config_id, status)
  values ('ca_1', 'konto:u1', 'u1', 'ac_1', 'pending');
  insert into composio.connections(connected_account_id, tenant_id, user_id, auth_config_id, status)
  values ('ca_1', 'konto:u1', 'u1', 'ac_1', 'active')
  on conflict (connected_account_id) do update
    set tenant_id = excluded.tenant_id, user_id = excluded.user_id, auth_config_id = excluded.auth_config_id, status = excluded.status;
  if (select status from composio.connections where connected_account_id = 'ca_1') <> 'active' then
    raise exception 'Upsert did not update the status';
  end if;
  begin
    insert into composio.connections(connected_account_id, tenant_id, user_id, auth_config_id, status)
    values ('ca_1', 'konto:fremd', 'fremd', 'ac_1', 'active')
    on conflict (connected_account_id) do update
      set tenant_id = excluded.tenant_id, user_id = excluded.user_id, status = excluded.status;
    raise exception 'Connection moved to another tenant';
  exception when check_violation then null;
  end;
  if (select tenant_id from composio.connections where connected_account_id = 'ca_1') <> 'konto:u1' then
    raise exception 'Connection owner changed';
  end if;

  -- Idempotenz: erste Beanspruchung gewinnt (eine Zeile), die zweite nicht (keine Zeile, kein Fehler).
  with claim as (insert into composio.event_claims(event_id) values ('msg_1') on conflict (event_id) do nothing returning event_id)
  select count(*) into n from claim;
  if n <> 1 then raise exception 'First claim did not win'; end if;
  with claim as (insert into composio.event_claims(event_id) values ('msg_1') on conflict (event_id) do nothing returning event_id)
  select count(*) into n from claim;
  if n <> 0 then raise exception 'Second claim of the same event won as well'; end if;
  begin
    insert into composio.event_claims(event_id) values ('msg_1');
    raise exception 'Duplicate claim accepted without conflict handling';
  exception when unique_violation then null;
  end;
  -- Freigabe erlaubt genau eine neue Beanspruchung.
  delete from composio.event_claims where event_id = 'msg_1';
  with claim as (insert into composio.event_claims(event_id) values ('msg_1') on conflict (event_id) do nothing returning event_id)
  select count(*) into n from claim;
  if n <> 1 then raise exception 'Claim after release did not win'; end if;

  -- Ereignisse: dieselbe Kennung legt keine zweite Zeile an; Lesen filtert nach Mandant und Nutzer.
  insert into composio.events(event_id, type, tenant_id, user_id, trigger_slug, trigger_id, received_at)
  values ('msg_1', 'composio.trigger.message', 'konto:u1', 'u1', 'GITHUB_COMMIT_EVENT', 'ti_1', now());
  insert into composio.events(event_id, type, tenant_id, user_id, trigger_slug, trigger_id, received_at)
  values ('msg_1', 'composio.trigger.message', 'konto:u1', 'u1', 'GITHUB_COMMIT_EVENT', 'ti_1', now())
  on conflict (event_id) do nothing;
  insert into composio.events(event_id, type, tenant_id, user_id, received_at)
  values ('msg_2', 'composio.trigger.disabled', 'konto:u2', 'u2', now());
  if (select count(*) from composio.events) <> 2
     or (select count(*) from composio.events where tenant_id = 'konto:u1' and user_id = 'u1') <> 1 then
    raise exception 'Event idempotency or tenant filter broken';
  end if;
  begin
    insert into composio.events(event_id, type, tenant_id, user_id, received_at)
    values ('msg_3', 'fremd.typ', 'konto:u1', 'u1', now());
    raise exception 'Foreign event type accepted';
  exception when check_violation then null;
  end;

  -- Trigger: Schlüssel je Mandant, Nutzer und Trigger-Kennung.
  insert into composio.triggers(tenant_id, user_id, trigger_id, slug) values ('konto:u1', 'u1', 'ti_1', 'GITHUB_COMMIT_EVENT');
  insert into composio.triggers(tenant_id, user_id, trigger_id, slug) values ('konto:u2', 'u2', 'ti_1', 'GITHUB_COMMIT_EVENT');
  insert into composio.triggers(tenant_id, user_id, trigger_id, slug) values ('konto:u1', 'u1', 'ti_1', 'GITHUB_STAR_EVENT')
  on conflict (tenant_id, user_id, trigger_id) do update set slug = excluded.slug;
  if (select count(*) from composio.triggers) <> 2
     or (select slug from composio.triggers where tenant_id = 'konto:u1' and trigger_id = 'ti_1') <> 'GITHUB_STAR_EVENT' then
    raise exception 'Trigger key broken';
  end if;
end $$;
reset role;

-- RLS selbst: Bekäme eine Rolle ohne BYPASSRLS versehentlich Tabellenrechte, sähe sie trotzdem keine Zeile
-- und könnte keine schreiben, weil keine Richtlinie existiert.
grant select, insert on composio.connections to authenticated;
set local role authenticated;
do $$
begin
  if (select count(*) from composio.connections) <> 0 then
    raise exception 'RLS did not hide rows from authenticated';
  end if;
  begin
    insert into composio.connections(connected_account_id, tenant_id, user_id, auth_config_id, status)
    values ('ca_rls', 'konto:u1', 'u1', 'ac_1', 'pending');
    raise exception 'RLS did not block the insert';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'composio_store.sql: ok' as result;
rollback;

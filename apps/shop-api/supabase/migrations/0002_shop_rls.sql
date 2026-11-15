-- TEILEKLAR.shop · Schema "shop" · Migration 0002 (Rollen, Rechte, Row-Level-Security)
-- Standard: alles gesperrt. Freigegeben wird genau eine Rolle, "shop_api", für den Shop-Dienst.
--
-- * anon, authenticated (Supabase-Rollen für Browser-Zugriffe) und PUBLIC bekommen NICHTS:
--   kein Recht am Schema, keine Policy. Der Shop wird nie direkt aus dem Browser gelesen;
--   Einkaufspreise, Konten und das Signaturgeheimnis des Zahlungsanbieters liegen hier.
-- * RLS ist auf jeder Tabelle eingeschaltet UND erzwungen (force): auch der Eigentümer der
--   Tabellen sieht ohne Policy keine Zeile. Wer ein Tabellenrecht bekäme, aber keine Policy
--   hat, liest null Zeilen und schreibt keine.
-- * "shop_api" hat eine Policy je Tabelle und nur die Rechte, die der Dienst braucht:
--   Bestellungen, Postausgang, Konten und Katalog werden nie gelöscht; Zahlungsereignisse und
--   das Freigabeprotokoll wachsen nur (weder update noch delete).
-- * "shop_api" ist eine Gruppenrolle ohne Anmeldung. Die Anmelderolle mit Kennwort legt der
--   Inhaber an und gibt ihr "shop_api" (kein Kennwort in dieser Datei, keins im Repository):
--     create role <name> login password '<nur beim Inhaber>' in role shop_api;
--   (mit Vererbung, also ohne "noinherit": Die Zugriffsschicht wechselt die Rolle nicht selbst.)
--   Der Dienstschlüssel/die Verbindungsadresse steht ausschließlich serverseitig (Vercel-Variable).
-- * Mandanten: Der Shop ist ein Mandant (TEILEKLAR). Die Trennung zu anderen Bereichen ist das
--   eigene Schema; "shop_api" hat keine Rechte außerhalb davon. Welche Bestellung welcher
--   Käufer sehen darf, prüft weiterhin die Shop-API (eigene Sitzungen nach D-007, kein
--   Supabase-Auth), deshalb gibt es keine Policy je Käufer.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'shop_api') then
    create role shop_api nologin;
  end if;
end $$;

revoke all on schema shop from public;
revoke all on all tables in schema shop from public;
revoke all on all sequences in schema shop from public;
revoke all on all functions in schema shop from public;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on schema shop from %I', r);
      execute format('revoke all on all tables in schema shop from %I', r);
      execute format('revoke all on all sequences in schema shop from %I', r);
      execute format('revoke all on all functions in schema shop from %I', r);
    end if;
  end loop;
end $$;

alter default privileges in schema shop revoke all on tables from public;
alter default privileges in schema shop revoke all on functions from public;

grant usage on schema shop to shop_api;
grant execute on function shop.j_text(json, text), shop.j_num(json, text), shop.j_int(json, text), shop.j_whole(json, text), shop.j_true(json, text) to shop_api;
grant execute on function shop.purge_expired(timestamptz, interval) to shop_api;

do $$
declare
  t text;
  rights text;
  spec constant jsonb := '{
    "products": "select, insert, update",
    "categories": "select, insert, update",
    "imports": "select, insert, update",
    "source_manifests": "select, insert",
    "settings": "select, insert, update",
    "price_releases": "select, insert",
    "carts": "select, insert, update",
    "users": "select, insert, update",
    "sessions": "select, insert, delete",
    "login_failures": "select, insert, delete",
    "password_resets": "select, insert, update, delete",
    "api_keys": "select, insert, update",
    "orders": "select, insert, update",
    "webhook_events": "select, insert",
    "revolut_webhooks": "select, insert, update",
    "outbox": "select, insert, update",
    "requests": "select, insert, update",
    "workshops": "select, insert, update",
    "workshop_requests": "select, insert"
  }';
begin
  for t, rights in select key, value from jsonb_each_text(spec) loop
    execute format('alter table shop.%I enable row level security', t);
    execute format('alter table shop.%I force row level security', t);
    execute format('revoke all on shop.%I from shop_api', t);
    execute format('grant %s on shop.%I to shop_api', rights, t);
    execute format('drop policy if exists shop_api_all on shop.%I', t);
    execute format('create policy shop_api_all on shop.%I for all to shop_api using (true) with check (true)', t);
  end loop;
  -- Jede Tabelle des Schemas muss oben stehen; eine vergessene bliebe ohne RLS.
  if exists (select 1 from pg_tables p where p.schemaname = 'shop' and not (spec ? p.tablename)) then
    raise exception 'shop table without access rule: %', (select string_agg(p.tablename, ', ') from pg_tables p where p.schemaname = 'shop' and not (spec ? p.tablename));
  end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'shop' and c.relkind = 'r' and not (c.relrowsecurity and c.relforcerowsecurity)) then
    raise exception 'shop table without forced row level security';
  end if;
end $$;

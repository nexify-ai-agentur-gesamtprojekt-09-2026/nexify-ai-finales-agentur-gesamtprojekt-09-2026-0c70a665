-- Nur in der Wegwerf-Datenbank nexify_chat_entwurf_0004_fixture ausführen.
-- Diese Transaktion MUSS scheitern: Der Entwurf 0004 darf ohne die ausdrücklich
-- gesetzte Freigabe nichts anlegen (erwartete Meldung: entwurf_0004_nicht_freigegeben).
\set ON_ERROR_STOP on
begin;
do $$
begin
  if current_database() <> 'nexify_chat_entwurf_0004_fixture' then
    raise exception 'Refusing to run outside nexify_chat_entwurf_0004_fixture';
  end if;
  if exists (select 1 from pg_namespace where nspname = 'chat') then
    raise exception 'Refusing to run against an existing chat schema';
  end if;
  if (select count(*) from pg_roles where rolname in ('anon','authenticated','service_role')) <> 3 then
    raise exception 'Fixture cluster must already contain Supabase roles';
  end if;
end $$;
\ir ../migrations/0001_chat_offers_orders.sql
\ir ../migrations/0002_conversation_owner_digest.sql
\ir ../migrations/0003_owned_conversation_rpc.sql
\ir ../migrations/0004_entwurf_chat_mandant_einwilligung_loeschfrist.sql
-- Wird diese Zeile erreicht, hat der Schutz versagt.
do $$ begin raise exception 'Entwurf ohne Freigabe angenommen'; end $$;

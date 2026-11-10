-- Run only in a disposable nexify_chat_owner_fixture database. This transaction
-- deliberately fails with PostgreSQL SQLSTATE 42701 (duplicate_column) when the
-- actual versioned migration sees a conflicting pre-existing text column.
\set ON_ERROR_STOP on
\set VERBOSITY verbose
begin;
do $$
begin
  if current_database() <> 'nexify_chat_owner_fixture' then
    raise exception 'Refusing to run outside nexify_chat_owner_fixture';
  end if;
  if exists (select 1 from pg_namespace where nspname = 'chat') then
    raise exception 'Refusing to run against an existing chat schema';
  end if;
  if (select count(*) from pg_roles where rolname in ('anon','authenticated','service_role')) <> 3 then
    raise exception 'Fixture cluster must already contain Supabase roles';
  end if;
end $$;
\ir ../migrations/0001_chat_offers_orders.sql
alter table chat.chat_conversations add column owner_session_digest text;
\ir ../migrations/0002_conversation_owner_digest.sql
-- Reaching this line means that the migration incorrectly accepted drift.
do $$ begin raise exception 'Drift unexpectedly accepted'; end $$;

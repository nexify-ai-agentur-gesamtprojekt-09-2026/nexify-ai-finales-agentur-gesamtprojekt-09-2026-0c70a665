-- Run only against a disposable database called nexify_chat_owner_fixture:
-- psql -X -v ON_ERROR_STOP=1 -d nexify_chat_owner_fixture -f apps/web/supabase/tests/conversation_owner_digest.sql
-- The cluster must already contain the three Supabase roles; this test never
-- creates cluster-wide roles. All fixture objects and data are rolled back.
-- Digest comparisons here test data representation, not route authorization.
\set ON_ERROR_STOP on
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
insert into chat.chat_conversations(id,locale,page_path,status)
values ('00000000-0000-4000-8000-000000000001','de','/','open');
\ir ../migrations/0002_conversation_owner_digest.sql
-- A separate test invokes the real migration against a deliberately drifted column.
do $$
declare legacy chat.chat_conversations%rowtype;
begin
  select * into strict legacy from chat.chat_conversations
    where id = '00000000-0000-4000-8000-000000000001';
  if legacy.owner_session_digest is not null or legacy.locale <> 'de'
     or legacy.page_path <> '/' or legacy.status <> 'open' then
    raise exception 'Migration changed or claimed a legacy conversation';
  end if;
  if not (select relrowsecurity from pg_class where oid='chat.chat_conversations'::regclass) then
    raise exception 'RLS must remain enabled';
  end if;
  if has_column_privilege('anon','chat.chat_conversations','owner_session_digest','SELECT')
     or has_column_privilege('authenticated','chat.chat_conversations','owner_session_digest','SELECT') then
    raise exception 'Public roles must not be granted owner-digest access';
  end if;
  begin
    update chat.chat_conversations set owner_session_digest=decode('00','hex')
      where id='00000000-0000-4000-8000-000000000001';
    raise exception 'Invalid digest was accepted';
  exception when check_violation then null;
  end;
  update chat.chat_conversations set owner_session_digest=decode(repeat('ab',32),'hex')
    where id='00000000-0000-4000-8000-000000000001';
  if (select count(*) from chat.chat_conversations
      where id='00000000-0000-4000-8000-000000000001'
        and owner_session_digest=decode(repeat('cd',32),'hex')) <> 0 then
    raise exception 'Different owner matched';
  end if;
  if (select count(*) from chat.chat_conversations
      where id='00000000-0000-4000-8000-000000000001'
        and owner_session_digest=decode(repeat('ab',32),'hex')) <> 1 then
    raise exception 'Expected owner did not match';
  end if;
end $$;
rollback;

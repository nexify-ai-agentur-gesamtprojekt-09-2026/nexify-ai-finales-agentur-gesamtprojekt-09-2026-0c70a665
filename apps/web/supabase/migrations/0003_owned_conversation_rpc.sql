-- Disabled building block. The caller must authenticate the visitor and provide
-- a server-computed digest. This does not activate an HTTP route or model.
create function chat.create_owned_conversation(p_owner_digest bytea, p_locale text, p_page_path text)
returns uuid language plpgsql security invoker set search_path = pg_catalog, chat as $$
declare result uuid;
begin
  if p_owner_digest is null or octet_length(p_owner_digest) <> 32 then
    raise exception 'invalid_owner_digest' using errcode = '22023';
  end if;
  insert into chat.chat_conversations(owner_session_digest,locale,page_path,status)
  values (p_owner_digest,p_locale,p_page_path,'open') returning id into result;
  return result;
end $$;

create function chat.read_owned_conversation(p_conversation_id uuid, p_owner_digest bytea)
returns table(id uuid, locale text, page_path text, status text)
language sql stable security invoker set search_path = pg_catalog, chat as $$
  select c.id,c.locale,c.page_path,c.status from chat.chat_conversations c
  where c.id=p_conversation_id and octet_length(p_owner_digest)=32
    and c.owner_session_digest=p_owner_digest;
$$;

revoke all on function chat.create_owned_conversation(bytea,text,text) from public, anon, authenticated;
revoke all on function chat.read_owned_conversation(uuid,bytea) from public, anon, authenticated;
grant execute on function chat.create_owned_conversation(bytea,text,text) to service_role;
grant execute on function chat.read_owned_conversation(uuid,bytea) to service_role;

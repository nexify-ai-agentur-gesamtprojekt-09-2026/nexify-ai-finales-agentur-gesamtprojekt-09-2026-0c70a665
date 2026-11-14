-- Prüft den ENTWURF 0004 und seinen Rückweg. Nur gegen eine Wegwerf-Datenbank
-- mit dem Namen nexify_chat_entwurf_0004_fixture ausführen:
--   psql -X -v ON_ERROR_STOP=1 -d nexify_chat_entwurf_0004_fixture \
--        -f apps/web/supabase/tests/entwurf_0004_mandant_einwilligung_loeschfrist.sql
-- Der Cluster muss die drei Supabase-Rollen bereits enthalten. Alle Objekte und
-- Daten werden am Ende zurückgerollt. Alle Inhalte hier sind erfundene Testdaten.
-- Geprüft werden Syntax, Datenregeln und Rechte in PostgreSQL – NICHT die
-- Anbindung an PostgREST, an die Anmeldung oder an eine echte Supabase-Instanz.
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

-- Altbestand vor 0004: ein Gespräch mit zwei Nachrichten.
insert into chat.chat_conversations(id,locale,page_path,status)
values ('00000000-0000-4000-8000-0000000000a0','de','/','open');
insert into chat.chat_messages(conversation_id,role,content) values
  ('00000000-0000-4000-8000-0000000000a0','user','Testdaten Altbestand Frage'),
  ('00000000-0000-4000-8000-0000000000a0','system','Testdaten Altbestand Systemhinweis');

set local nexify.entwurf_0004_freigabe = 'vom-inhaber-freigegeben';
\ir ../migrations/0004_entwurf_chat_mandant_einwilligung_loeschfrist.sql

-- T1 Altbestand unverändert und ohne Mandant; Standardfrist nicht festgelegt.
do $$
declare legacy chat.chat_conversations%rowtype;
begin
  select * into strict legacy from chat.chat_conversations where id='00000000-0000-4000-8000-0000000000a0';
  if legacy.mandant_id is not null or legacy.legal_basis is not null or legacy.delete_after is not null
     or legacy.knowledge_release or legacy.erasure_hold or legacy.content_erased_at is not null
     or legacy.status <> 'open' then
    raise exception 'T1: Migration hat den Altbestand verändert oder zugeordnet';
  end if;
  if (select count(*) from chat.chat_messages where conversation_id=legacy.id) <> 2 then
    raise exception 'T1: Nachrichten des Altbestands verändert';
  end if;
  if (select default_retention_days from chat.chat_privacy_settings) is not null then
    raise exception 'T1: Standardfrist darf im Entwurf nicht festgelegt sein';
  end if;
  if not (select bool_and(relrowsecurity) from pg_class
          where relnamespace='chat'::regnamespace and relkind='r') then
    raise exception 'T1: RLS muss auf allen Tabellen des Schemas an sein';
  end if;
end $$;

-- Testgespräche nach 0004: A1 (Mandant A), B1 (Mandant B).
insert into chat.chat_conversations(id,locale,page_path,status,owner_session_digest) values
  ('00000000-0000-4000-8000-0000000000a1','de','/','open',decode(repeat('a1',32),'hex')),
  ('00000000-0000-4000-8000-0000000000b1','de','/','open',decode(repeat('b1',32),'hex'));
insert into chat.chat_messages(conversation_id,role,content,model) values
  ('00000000-0000-4000-8000-0000000000a1','user','Testdaten A Frage','testmodell'),
  ('00000000-0000-4000-8000-0000000000a1','assistant','Testdaten A Antwort','testmodell'),
  ('00000000-0000-4000-8000-0000000000a1','system','Testdaten A Systemhinweis','testmodell'),
  ('00000000-0000-4000-8000-0000000000b1','user','Testdaten B Frage','testmodell'),
  ('00000000-0000-4000-8000-0000000000b1','system','Testdaten B Systemhinweis','testmodell');
insert into chat.chat_offers(id,conversation_id,title) values
  ('00000000-0000-4000-8000-00000000000f','00000000-0000-4000-8000-0000000000a1','Testangebot');
insert into chat.chat_orders(offer_id,conversation_id,customer,items) values
  ('00000000-0000-4000-8000-00000000000f','00000000-0000-4000-8000-0000000000a1','{"name":"Testperson"}','[]');

-- T2 Ohne festgelegte Standardfrist erhält ein neues Gespräch keine Frist.
do $$
begin
  if (select delete_after from chat.chat_conversations where id='00000000-0000-4000-8000-0000000000a1') is not null then
    raise exception 'T2: Frist ohne festgelegten Standardwert gesetzt';
  end if;
end $$;

-- T4 Mandantenzuordnung: Nachzug einmalig, danach unveränderlich.
do $$
begin
  if not chat.assign_conversation_mandant('00000000-0000-4000-8000-0000000000a1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','test-nachzug') then
    raise exception 'T4: Erstzuordnung nicht ausgeführt';
  end if;
  perform chat.assign_conversation_mandant('00000000-0000-4000-8000-0000000000b1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','test-nachzug');
  if chat.assign_conversation_mandant('00000000-0000-4000-8000-0000000000a1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','test-nachzug') then
    raise exception 'T4: Wiederholung muss wirkungslos sein';
  end if;
  begin
    perform chat.assign_conversation_mandant('00000000-0000-4000-8000-0000000000a1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','test-umzug');
    raise exception 'T4: Umzuordnung über Funktion angenommen';
  exception when check_violation then null;
  end;
  begin
    update chat.chat_conversations set mandant_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      where id='00000000-0000-4000-8000-0000000000a1';
    raise exception 'T4: Umzuordnung per UPDATE angenommen';
  exception when check_violation then null;
  end;
  if (select count(*) from chat.chat_mandant_backfill_log) <> 2 then
    raise exception 'T4: Nachzugsprotokoll unvollständig oder doppelt';
  end if;
end $$;

-- T3 RLS: Mandant A sieht nur Eigenes, ohne Systemnachrichten und Schutzspalten.
set local role authenticated;
set local app.mandant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
begin
  if current_user <> 'authenticated' then raise exception 'T3: falscher Testnutzer'; end if;
  if (select array_agg(id::text order by id) from chat.chat_conversations)
       is distinct from array['00000000-0000-4000-8000-0000000000a1'] then
    raise exception 'T3: Mandant A sieht nicht genau sein eigenes Gespräch';
  end if;
  if (select count(*) from chat.chat_messages) <> 2
     or exists (select 1 from chat.chat_messages where role='system')
     or exists (select 1 from chat.chat_messages where conversation_id <> '00000000-0000-4000-8000-0000000000a1') then
    raise exception 'T3: Mandant A sieht fremde Nachrichten oder Systemnachrichten';
  end if;
  begin perform owner_session_digest from chat.chat_conversations; raise exception 'T3: Digest lesbar';
  exception when insufficient_privilege then null; end;
  begin perform visitor_ref from chat.chat_conversations; raise exception 'T3: Besucherbezug lesbar';
  exception when insufficient_privilege then null; end;
  begin perform model from chat.chat_messages; raise exception 'T3: Modellangabe lesbar';
  exception when insufficient_privilege then null; end;
  begin update chat.chat_conversations set status='closed'; raise exception 'T3: UPDATE erlaubt';
  exception when insufficient_privilege then null; end;
  begin insert into chat.chat_messages(conversation_id,role,content)
          values ('00000000-0000-4000-8000-0000000000a1','user','x'); raise exception 'T3: INSERT erlaubt';
  exception when insufficient_privilege then null; end;
  begin delete from chat.chat_messages; raise exception 'T3: DELETE erlaubt';
  exception when insufficient_privilege then null; end;
  begin perform 1 from chat.chat_consents; raise exception 'T3: Einwilligungen lesbar';
  exception when insufficient_privilege then null; end;
  begin perform 1 from chat.chat_privacy_settings; raise exception 'T3: Einstellungen lesbar';
  exception when insufficient_privilege then null; end;
  begin perform 1 from chat.chat_orders; raise exception 'T3: Bestellungen lesbar';
  exception when insufficient_privilege then null; end;
  begin perform chat.export_mandant_data('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'); raise exception 'T3: Export aufrufbar';
  exception when insufficient_privilege then null; end;
  begin perform chat.run_retention_erasure(false); raise exception 'T3: Löschlauf aufrufbar';
  exception when insufficient_privilege then null; end;
  begin perform chat.assign_conversation_mandant('00000000-0000-4000-8000-0000000000a0','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','x');
        raise exception 'T3: Zuordnung aufrufbar';
  exception when insufficient_privilege then null; end;
end $$;
set local app.mandant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $$
begin
  if (select array_agg(id::text order by id) from chat.chat_conversations)
       is distinct from array['00000000-0000-4000-8000-0000000000b1']
     or (select count(*) from chat.chat_messages) <> 1 then
    raise exception 'T3: Mandant B sieht nicht genau Eigenes';
  end if;
end $$;
set local app.mandant_id = '';
do $$ begin
  if (select count(*) from chat.chat_conversations) <> 0 or (select count(*) from chat.chat_messages) <> 0 then
    raise exception 'T3: Ohne Mandant sind Zeilen sichtbar';
  end if;
end $$;
set local app.mandant_id = 'kein-uuid';
do $$ begin
  if (select count(*) from chat.chat_conversations) <> 0 then
    raise exception 'T3: Ungültiger Mandant sieht Zeilen';
  end if;
end $$;
reset role;
set local role anon;
set local app.mandant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
begin
  begin perform id from chat.chat_conversations; raise exception 'T3: anon kann Gespräche lesen';
  exception when insufficient_privilege then null; end;
  begin perform id from chat.chat_messages; raise exception 'T3: anon kann Nachrichten lesen';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local app.mandant_id = '';

-- T5 Freigabe für den Wissensspeicher: Standard nein, strenge Voraussetzungen.
set local role service_role;
do $$
begin
  if (select count(*) from chat.chat_knowledge_candidates) <> 0 then
    raise exception 'T5: Kandidaten ohne Freigabe vorhanden';
  end if;
  begin perform chat.release_for_knowledge('00000000-0000-4000-8000-0000000000a0','test');
        raise exception 'T5: Freigabe ohne Mandant angenommen';
  exception when check_violation then null; end;
  begin update chat.chat_conversations set knowledge_release=true, knowledge_released_at=now()
          where id='00000000-0000-4000-8000-0000000000a0';
        raise exception 'T5: Freigabe ohne Mandant per UPDATE angenommen';
  exception when check_violation then null; end;
  begin perform chat.release_for_knowledge('00000000-0000-4000-8000-0000000000a1','test');
        raise exception 'T5: Freigabe ohne Rechtsgrundlage angenommen';
  exception when check_violation then null; end;
  begin perform chat.set_legal_basis('00000000-0000-4000-8000-0000000000a1','frei erfunden');
        raise exception 'T5: Unbekannte Rechtsgrundlage angenommen';
  exception when check_violation then null; end;
  perform chat.set_legal_basis('00000000-0000-4000-8000-0000000000a1','art6_1_a_einwilligung');
  begin perform chat.release_for_knowledge('00000000-0000-4000-8000-0000000000a1','test');
        raise exception 'T5: Freigabe ohne Einwilligung angenommen';
  exception when check_violation then null; end;
  insert into chat.chat_consent_texts(id,purpose,locale,version,body,valid_from) values
    ('test-wissen-de-1','wissensspeicher','de','test-1','TESTTEXT, kein freigegebener Wortlaut','2000-01-01'),
    ('test-chat-de-1','chat_verarbeitung','de','test-1','TESTTEXT, kein freigegebener Wortlaut','2000-01-01');
  begin update chat.chat_consent_texts set body='geändert' where id='test-wissen-de-1';
        raise exception 'T5: Textfassung änderbar';
  exception when object_not_in_prerequisite_state then null; end;
  begin perform chat.record_consent('00000000-0000-4000-8000-0000000000a1','wissensspeicher','test-chat-de-1');
        raise exception 'T5: Textfassung für falschen Zweck angenommen';
  exception when invalid_parameter_value then null; end;
  perform chat.record_consent('00000000-0000-4000-8000-0000000000a1','wissensspeicher','test-wissen-de-1');
  perform chat.release_for_knowledge('00000000-0000-4000-8000-0000000000a1','test');
  if (select array_agg(conversation_id::text) from chat.chat_knowledge_candidates)
       is distinct from array['00000000-0000-4000-8000-0000000000a1'] then
    raise exception 'T5: Kandidatensicht zeigt nicht genau das freigegebene Gespräch';
  end if;
  if chat.withdraw_consent('00000000-0000-4000-8000-0000000000a1','wissensspeicher') <> 1 then
    raise exception 'T5: Widerruf nicht genau einmal vermerkt';
  end if;
  if (select knowledge_release from chat.chat_conversations where id='00000000-0000-4000-8000-0000000000a1')
     or (select count(*) from chat.chat_knowledge_candidates) <> 0 then
    raise exception 'T5: Widerruf nimmt die Freigabe nicht zurück';
  end if;
  begin perform chat.release_for_knowledge('00000000-0000-4000-8000-0000000000a1','test');
        raise exception 'T5: Freigabe nach Widerruf angenommen';
  exception when check_violation then null; end;
end $$;

-- T6 Löschlauf: Probelauf zählt nur; echter Lauf löscht Inhalte abgelaufener
-- Gespräche, achtet die Löschsperre, lässt Betriebsdaten und Nachweise stehen.
do $$
declare run chat.chat_retention_runs%rowtype;
begin
  run := chat.run_retention_erasure(false);
  if run.conversations_due <> 0 or run.messages_deleted <> 0 then
    raise exception 'T6: Lauf ohne gesetzte Fristen hat etwas gefunden';
  end if;
  perform chat.set_conversation_retention('00000000-0000-4000-8000-0000000000a1', now() - interval '1 second');
  perform chat.set_conversation_retention('00000000-0000-4000-8000-0000000000b1', now() - interval '1 second');
  update chat.chat_conversations set erasure_hold=true, erasure_hold_reason='Testsperre'
    where id='00000000-0000-4000-8000-0000000000b1';
  run := chat.run_retention_erasure();
  if not run.dry_run or run.conversations_due <> 1 or run.conversations_erased <> 0
     or run.conversations_skipped_hold <> 1 or run.messages_deleted <> 0
     or (select count(*) from chat.chat_messages) <> 7 then
    raise exception 'T6: Probelauf zählt falsch oder verändert Daten';
  end if;
  run := chat.run_retention_erasure(false);
  if run.dry_run or run.conversations_due <> 1 or run.conversations_erased <> 1
     or run.conversations_skipped_hold <> 1 or run.messages_deleted <> 3 then
    raise exception 'T6: Löschlauf zählt falsch';
  end if;
  if (select count(*) from chat.chat_messages where conversation_id='00000000-0000-4000-8000-0000000000a1') <> 0
     or (select count(*) from chat.chat_messages where conversation_id='00000000-0000-4000-8000-0000000000b1') <> 2
     or (select count(*) from chat.chat_messages where conversation_id='00000000-0000-4000-8000-0000000000a0') <> 2 then
    raise exception 'T6: Falsche Nachrichten gelöscht oder stehen gelassen';
  end if;
  if not exists (select 1 from chat.chat_conversations
                 where id='00000000-0000-4000-8000-0000000000a1' and content_erased_at is not null
                   and owner_session_digest is null and visitor_ref is null and status='archived'
                   and archived_at is not null and not knowledge_release
                   and mandant_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then
    raise exception 'T6: Gespräch nach Löschung nicht archiviert/anonymisiert';
  end if;
  if (select count(*) from chat.chat_orders where conversation_id='00000000-0000-4000-8000-0000000000a1') <> 1
     or (select count(*) from chat.chat_offers where conversation_id='00000000-0000-4000-8000-0000000000a1') <> 1
     or (select count(*) from chat.chat_consents where conversation_id='00000000-0000-4000-8000-0000000000a1') <> 1 then
    raise exception 'T6: Betriebsdaten oder Einwilligungsnachweis entfernt';
  end if;
  run := chat.run_retention_erasure(false);
  if run.conversations_due <> 0 or run.messages_deleted <> 0 then
    raise exception 'T6: Wiederholter Lauf nicht wirkungslos';
  end if;
  begin perform chat.release_for_knowledge('00000000-0000-4000-8000-0000000000a1','test');
        raise exception 'T6: Freigabe gelöschter Inhalte angenommen';
  exception when check_violation then null; end;
  begin perform chat.run_retention_erasure(false, 0); raise exception 'T6: Ungültige Grenze angenommen';
  exception when invalid_parameter_value then null; end;
  if (select count(*) from chat.chat_retention_runs) <> 4 then
    raise exception 'T6: Nicht jeder Lauf protokolliert';
  end if;
end $$;
reset role;
-- Das Laufprotokoll kann keine Inhalte aufnehmen: nur Zahlen, Zeiten, Ja/Nein.
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='chat' and table_name='chat_retention_runs'
               and data_type not in ('bigint','boolean','timestamp with time zone')) then
    raise exception 'T6: Laufprotokoll enthält eine Spalte, die Inhalte aufnehmen könnte';
  end if;
end $$;

-- T7 Standardfrist greift erst, wenn sie gesetzt ist (hier: reiner Testwert).
set local role service_role;
do $$
declare created uuid; conv chat.chat_conversations%rowtype;
begin
  update chat.chat_privacy_settings set default_retention_days = 1, updated_by = 'test';
  created := chat.create_owned_conversation(decode(repeat('c1',32),'hex'),'de','/');
  select * into strict conv from chat.chat_conversations where id = created;
  if conv.delete_after is distinct from conv.created_at + interval '1 day' then
    raise exception 'T7: Standardfrist nicht angewandt';
  end if;
  begin update chat.chat_privacy_settings set default_retention_days = 0; raise exception 'T7: Frist 0 angenommen';
  exception when check_violation then null; end;
end $$;

-- T8 Auskunft: nur die eigenen Daten, ohne Digest und ohne Systemnachrichten.
do $$
declare doc jsonb;
begin
  doc := chat.export_visitor_data(decode(repeat('b1',32),'hex'));
  if jsonb_array_length(doc->'conversations') <> 1
     or doc->'conversations'->0->'conversation'->>'id' <> '00000000-0000-4000-8000-0000000000b1'
     or doc->'conversations'->0->'conversation' ? 'owner_session_digest'
     or jsonb_array_length(doc->'conversations'->0->'messages') <> 1
     or (doc->'conversations'->0->>'system_messages_withheld')::int <> 1
     or doc::text like '%Systemhinweis%' or doc::text like '%Testdaten A%' then
    raise exception 'T8: Besucherauskunft unvollständig oder zu weit';
  end if;
  if jsonb_array_length(chat.export_visitor_data(decode(repeat('ee',32),'hex'))->'conversations') <> 0 then
    raise exception 'T8: Unbekannter Besucher erhält Daten';
  end if;
  begin perform chat.export_visitor_data(decode('00','hex')); raise exception 'T8: Ungültiger Digest angenommen';
  exception when invalid_parameter_value then null; end;
  doc := chat.export_mandant_data('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  if jsonb_array_length(doc->'conversations') <> 1
     or doc->'conversations'->0->'conversation'->>'id' <> '00000000-0000-4000-8000-0000000000a1'
     or jsonb_array_length(doc->'conversations'->0->'messages') <> 0
     or jsonb_array_length(doc->'conversations'->0->'orders') <> 1
     or jsonb_array_length(doc->'conversations'->0->'consents') <> 1
     or doc::text like '%Testdaten B%' or doc::text like '%Altbestand%' then
    raise exception 'T8: Mandantenexport unvollständig oder zu weit';
  end if;
end $$;
reset role;

-- T9 Rückweg: verweigert, solange Nachweise vorhanden sind; läuft nach
-- ausdrücklicher Bestätigung sauber durch und lässt 0001–0003 unberührt.
savepoint vor_rueckweg;
\set ON_ERROR_STOP off
\ir ../rollback/0004_entwurf_chat_mandant_einwilligung_loeschfrist.down.sql
\set rueckweg_verweigert :ERROR
\set ON_ERROR_STOP on
rollback to savepoint vor_rueckweg;
\if :rueckweg_verweigert
\else
  do $$ begin raise exception 'T9: Rückweg wurde trotz vorhandener Nachweise nicht verweigert'; end $$;
\endif
do $$ begin
  if not exists (select 1 from information_schema.columns
                 where table_schema='chat' and table_name='chat_conversations' and column_name='mandant_id')
     or (select count(*) from chat.chat_consents) <> 1 then
    raise exception 'T9: Verweigerter Rückweg hat etwas verändert';
  end if;
end $$;
set local nexify.entwurf_0004_rueckweg = 'datenverlust-bestaetigt';
\ir ../rollback/0004_entwurf_chat_mandant_einwilligung_loeschfrist.down.sql
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='chat' and table_name='chat_conversations'
               and column_name in ('mandant_id','legal_basis','delete_after','knowledge_release','content_erased_at'))
     or to_regclass('chat.chat_consents') is not null or to_regclass('chat.chat_retention_runs') is not null
     or to_regclass('chat.chat_knowledge_candidates') is not null
     or to_regprocedure('chat.run_retention_erasure(boolean,integer,timestamptz)') is not null
     or to_regprocedure('chat.aktueller_mandant()') is not null
     or exists (select 1 from pg_policies where schemaname='chat') then
    raise exception 'T9: Rückweg hat Objekte von 0004 stehen gelassen';
  end if;
  if to_regprocedure('chat.create_owned_conversation(bytea,text,text)') is null
     or not exists (select 1 from information_schema.columns
                    where table_schema='chat' and table_name='chat_conversations' and column_name='owner_session_digest')
     or not (select relrowsecurity from pg_class where oid='chat.chat_conversations'::regclass)
     or has_table_privilege('authenticated','chat.chat_conversations','SELECT')
     or has_any_column_privilege('authenticated','chat.chat_conversations','SELECT')
     or has_any_column_privilege('authenticated','chat.chat_messages','SELECT')
     or has_any_column_privilege('anon','chat.chat_conversations','SELECT') then
    raise exception 'T9: Rückweg hat den Stand 0001–0003 nicht wiederhergestellt';
  end if;
  if (select count(*) from chat.chat_conversations) <> 4 then
    raise exception 'T9: Rückweg hat Gespräche entfernt';
  end if;
end $$;
rollback;
\echo ENTWURF_0004_TEST_BESTANDEN

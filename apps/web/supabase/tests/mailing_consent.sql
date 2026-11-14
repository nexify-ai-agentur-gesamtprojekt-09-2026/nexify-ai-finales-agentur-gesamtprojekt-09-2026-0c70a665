-- Run only against a disposable database called nexify_mailing_fixture:
-- psql -X -v ON_ERROR_STOP=1 -d nexify_mailing_fixture -f apps/web/supabase/tests/mailing_consent.sql
-- The cluster must already contain the three Supabase roles; this test never
-- creates cluster-wide roles. All fixture objects and data are rolled back.
-- Prüft Migration 0005: Tabellen, RLS ohne Richtlinie, Rechte der Rollen, Formprüfungen, Zustand nur vorwärts,
-- unveränderlicher Nachweis, Löschen nur unbestätigter Zeilen, Sperrliste und Verlauf nur Anfügen.
\set ON_ERROR_STOP on
begin;
do $$
begin
  if current_database() <> 'nexify_mailing_fixture' then
    raise exception 'Refusing to run outside nexify_mailing_fixture';
  end if;
  if exists (select 1 from pg_namespace where nspname = 'mailing') then
    raise exception 'Refusing to run against an existing mailing schema';
  end if;
  if (select count(*) from pg_roles where rolname in ('anon','authenticated','service_role')) <> 3 then
    raise exception 'Fixture cluster must already contain Supabase roles';
  end if;
  if not (select rolbypassrls from pg_roles where rolname = 'service_role') then
    raise exception 'Fixture service role is misconfigured';
  end if;
end $$;
\ir ../migrations/0005_mailing_consent.sql
-- Zweites Anwenden darf nichts ändern und nicht scheitern.
\ir ../migrations/0005_mailing_consent.sql

-- Struktur: genau drei Tabellen, RLS überall an, keine einzige Richtlinie, keine Spalte für freie Inhalte.
do $$
declare t text;
begin
  if (select array_agg(tablename::text order by tablename) from pg_tables where schemaname = 'mailing')
     <> array['consent_events','subscriptions','suppressions'] then
    raise exception 'Unexpected tables in schema mailing';
  end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'mailing' and c.relkind = 'r' and not c.relrowsecurity) then
    raise exception 'Row-level security is not enabled on every table';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'mailing') then
    raise exception 'Unexpected policy: access must stay service-role only';
  end if;
  foreach t in array array['consent_events','subscriptions','suppressions'] loop
    if has_table_privilege('anon', 'mailing.' || t, 'select,insert,update,delete')
       or has_table_privilege('authenticated', 'mailing.' || t, 'select,insert,update,delete') then
      raise exception 'Public role holds a table privilege on %', t;
    end if;
    if not has_table_privilege('service_role', 'mailing.' || t, 'select')
       or not has_table_privilege('service_role', 'mailing.' || t, 'insert') then
      raise exception 'service_role lacks a table privilege on %', t;
    end if;
  end loop;
  -- Nur die Anmeldungen dürfen geändert und gelöscht werden; Sperrliste und Verlauf sind für den Dienst nur anfügbar.
  if not has_table_privilege('service_role', 'mailing.subscriptions', 'update')
     or not has_table_privilege('service_role', 'mailing.subscriptions', 'delete') then
    raise exception 'service_role must update and delete subscriptions';
  end if;
  if has_table_privilege('service_role', 'mailing.suppressions', 'update,delete,truncate')
     or has_table_privilege('service_role', 'mailing.consent_events', 'update,delete,truncate')
     or has_table_privilege('service_role', 'mailing.subscriptions', 'truncate') then
    raise exception 'Suppressions and consent events must be append-only for service_role';
  end if;
  -- Die Sperrliste speichert nur Prüfsumme, Grund und Zeitpunkt; der Verlauf weder Adresse noch Kennzeichen.
  if (select array_agg(column_name::text order by column_name) from information_schema.columns
      where table_schema = 'mailing' and table_name = 'suppressions') <> array['created_at','email_hash','reason'] then
    raise exception 'suppressions must hold hash, reason and time only';
  end if;
  if (select array_agg(column_name::text order by column_name) from information_schema.columns
      where table_schema = 'mailing' and table_name = 'consent_events')
     <> array['consent_version','created_at','email_hash','id','occurred_at','source','type'] then
    raise exception 'consent_events must not hold address or token columns';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'mailing' and data_type in ('json','jsonb','bytea')) then
    raise exception 'No payload column allowed in schema mailing';
  end if;
  if not exists (select 1 from pg_indexes where schemaname = 'mailing' and tablename = 'subscriptions' and indexdef like '%UNIQUE%(confirm_token_hash)%')
     or not exists (select 1 from pg_indexes where schemaname = 'mailing' and tablename = 'subscriptions' and indexdef like '%UNIQUE%(unsubscribe_token)%') then
    raise exception 'Missing unique key on a token column';
  end if;
end $$;

-- anon und authenticated: kein Zugriff, weder lesend noch schreibend.
set local role anon;
do $$
begin
  begin
    perform 1 from mailing.subscriptions;
    raise exception 'anon unexpectedly read subscriptions';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into mailing.suppressions(email_hash, reason) values (repeat('a', 64), 'manual');
    raise exception 'anon unexpectedly wrote a suppression';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role authenticated;
do $$
begin
  begin
    perform 1 from mailing.consent_events;
    raise exception 'authenticated unexpectedly read consent events';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from mailing.suppressions;
    raise exception 'authenticated unexpectedly read suppressions';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Der Server (service_role) arbeitet so, wie PostgREST es für den Speicher ausführt.
set local role service_role;
do $$
declare
  n int;
  h1 text := repeat('1', 64);
  h2 text := repeat('2', 64);
  h3 text := repeat('3', 64);
  t0 timestamptz := '2026-11-14 12:00:00+00';
begin
  -- Formprüfungen: Prüfsumme, Sprache, Quelle, Kennzeichen.
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_token_hash, confirm_expires_at, unsubscribe_token)
    values ('kein-hash', 'a@b.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, repeat('d', 64), t0 + interval '48 hours', repeat('U', 43));
    raise exception 'Malformed email_hash accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_token_hash, confirm_expires_at, unsubscribe_token)
    values (h1, 'a@b.invalid', 'xx', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, repeat('d', 64), t0 + interval '48 hours', repeat('U', 43));
    raise exception 'Unknown language accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_token_hash, confirm_expires_at, unsubscribe_token)
    values (h1, 'a@b.invalid', 'de', 'pending', 'Quelle mit Leerzeichen', 'v1', repeat('c', 64), t0, repeat('d', 64), t0 + interval '48 hours', repeat('U', 43));
    raise exception 'Malformed source accepted';
  exception when check_violation then null;
  end;
  -- Unbestätigt ohne Kennzeichen und Frist ist kein gültiger Zustand.
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, unsubscribe_token)
    values (h1, 'a@b.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, repeat('U', 43));
    raise exception 'Pending subscription without token accepted';
  exception when check_violation then null;
  end;
  -- Bestätigt ohne Zeitpunkt der Bestätigung ist kein Nachweis.
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, unsubscribe_token)
    values (h1, 'a@b.invalid', 'de', 'confirmed', 'preise/checkliste', 'v1', repeat('c', 64), t0, repeat('U', 43));
    raise exception 'Confirmed subscription without confirmed_at accepted';
  exception when check_violation then null;
  end;

  -- Anlegen wie insertPending: on conflict do nothing, die zweite Anfrage überschreibt nichts.
  insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_token_hash, confirm_expires_at, confirm_mails_sent, unsubscribe_token)
  values (h1, 'a@b.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, repeat('d', 64), t0 + interval '48 hours', 1, repeat('U', 43))
  on conflict (email_hash) do nothing;
  insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_token_hash, confirm_expires_at, confirm_mails_sent, unsubscribe_token)
  values (h1, 'fremd@b.invalid', 'de', 'pending', 'preise/checkliste', 'v9', repeat('e', 64), t0, repeat('f', 64), t0 + interval '48 hours', 1, repeat('V', 43))
  on conflict (email_hash) do nothing;
  get diagnostics n = row_count;
  if n <> 0 or (select email from mailing.subscriptions where email_hash = h1) <> 'a@b.invalid' then
    raise exception 'Second request overwrote the pending subscription';
  end if;

  -- Erneuern wie renewPending: nur mit erwartetem Zustand und Zählerstand.
  update mailing.subscriptions set confirm_token_hash = repeat('9', 64), confirm_mails_sent = 2
   where email_hash = h1 and status = 'pending' and confirm_mails_sent = 7;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Renewal with a stale counter changed the row'; end if;
  update mailing.subscriptions set confirm_token_hash = repeat('9', 64), confirm_mails_sent = 2, consent_version = 'v2'
   where email_hash = h1 and status = 'pending' and confirm_mails_sent = 1;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Renewal of a pending subscription failed'; end if;

  -- Bestätigen wie confirmByTokenHash: altes Kennzeichen und abgelaufene Frist wirken nicht.
  update mailing.subscriptions set status = 'confirmed', confirmed_at = t0 + interval '1 hour', confirm_token_hash = null, confirm_expires_at = null
   where confirm_token_hash = repeat('d', 64) and status = 'pending' and confirm_expires_at > t0 + interval '1 hour';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Replaced token still confirmed the subscription'; end if;
  update mailing.subscriptions set status = 'confirmed', confirmed_at = t0 + interval '50 hours', confirm_token_hash = null, confirm_expires_at = null
   where confirm_token_hash = repeat('9', 64) and status = 'pending' and confirm_expires_at > t0 + interval '50 hours';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Expired token confirmed the subscription'; end if;
  update mailing.subscriptions set status = 'confirmed', confirmed_at = t0 + interval '1 hour', confirm_token_hash = null, confirm_expires_at = null
   where confirm_token_hash = repeat('9', 64) and status = 'pending' and confirm_expires_at > t0 + interval '1 hour';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Valid token did not confirm the subscription'; end if;

  -- Ein bestätigter Nachweis ist unveränderlich, und der Zustand läuft nicht zurück.
  begin
    update mailing.subscriptions set consent_version = 'v3' where email_hash = h1;
    raise exception 'Consent version of a confirmed subscription was rewritten';
  exception when check_violation then null;
  end;
  begin
    update mailing.subscriptions set confirmed_at = t0 + interval '9 hours' where email_hash = h1;
    raise exception 'confirmed_at of a confirmed subscription was rewritten';
  exception when check_violation then null;
  end;
  begin
    update mailing.subscriptions set email = 'andere@b.invalid' where email_hash = h1;
    raise exception 'Address of a confirmed subscription was rewritten';
  exception when check_violation then null;
  end;
  begin
    update mailing.subscriptions set status = 'pending', confirm_token_hash = repeat('8', 64), confirm_expires_at = t0 + interval '99 hours' where email_hash = h1;
    raise exception 'Confirmed subscription went back to pending';
  exception when check_violation then null;
  end;
  begin
    update mailing.subscriptions set unsubscribe_token = repeat('W', 43) where email_hash = h1;
    raise exception 'Unsubscribe token was rewritten';
  exception when check_violation then null;
  end;
  -- Ein Kennzeichen an einer bestätigten Zeile ist kein gültiger Zustand.
  begin
    update mailing.subscriptions set confirm_token_hash = repeat('8', 64) where email_hash = h1;
    raise exception 'Confirmed subscription kept a confirmation token';
  exception when check_violation then null;
  end;
  -- Eine bestätigte Zeile wird nicht gelöscht.
  begin
    delete from mailing.subscriptions where email_hash = h1;
    raise exception 'Confirmed subscription was deleted';
  exception when check_violation then null;
  end;

  -- Abmelden wie unsubscribeByToken: erst die Sperre, dann der Zustand; danach endgültig.
  insert into mailing.suppressions(email_hash, reason) values (h1, 'unsubscribe') on conflict (email_hash) do nothing;
  insert into mailing.suppressions(email_hash, reason) values (h1, 'manual') on conflict (email_hash) do nothing;
  if (select reason from mailing.suppressions where email_hash = h1) <> 'unsubscribe' then
    raise exception 'Second suppression overwrote the first reason';
  end if;
  update mailing.subscriptions set status = 'unsubscribed', unsubscribed_at = t0 + interval '2 hours', confirm_token_hash = null, confirm_expires_at = null
   where email_hash = h1 and status <> 'unsubscribed';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Unsubscribe did not change the row'; end if;
  begin
    update mailing.subscriptions set status = 'confirmed' where email_hash = h1;
    raise exception 'Unsubscribed subscription was reactivated';
  exception when check_violation then null;
  end;
  begin
    delete from mailing.subscriptions where email_hash = h1;
    raise exception 'Unsubscribed subscription was deleted';
  exception when check_violation then null;
  end;

  -- Sperrliste: unbekannter Grund abgelehnt; ändern und löschen sind dem Dienst nicht erlaubt.
  begin
    insert into mailing.suppressions(email_hash, reason) values (h2, 'erfunden');
    raise exception 'Unknown suppression reason accepted';
  exception when check_violation then null;
  end;
  begin
    delete from mailing.suppressions where email_hash = h1;
    raise exception 'service_role deleted a suppression';
  exception when insufficient_privilege then null;
  end;
  begin
    update mailing.suppressions set reason = 'manual' where email_hash = h1;
    raise exception 'service_role rewrote a suppression';
  exception when insufficient_privilege then null;
  end;

  -- Verlauf: anfügen ja, ändern und löschen nein.
  insert into mailing.consent_events(email_hash, type, consent_version, source, occurred_at) values (h1, 'requested', 'v1', 'preise/checkliste', t0);
  begin
    insert into mailing.consent_events(email_hash, type, occurred_at) values (h1, 'erfunden', t0);
    raise exception 'Unknown event type accepted';
  exception when check_violation then null;
  end;
  begin
    delete from mailing.consent_events where email_hash = h1;
    raise exception 'service_role deleted a consent event';
  exception when insufficient_privilege then null;
  end;
  begin
    update mailing.consent_events set type = 'confirmed' where email_hash = h1;
    raise exception 'service_role rewrote a consent event';
  exception when insufficient_privilege then null;
  end;

  -- Verfall wie purgeExpiredPending: löscht nur unbestätigte Zeilen mit abgelaufener Frist.
  insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_token_hash, confirm_expires_at, confirm_mails_sent, unsubscribe_token)
  values (h2, 'alt@b.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, repeat('a', 64), t0 + interval '48 hours', 1, repeat('X', 43)),
         (h3, 'neu@b.invalid', 'fr', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, repeat('b', 64), t0 + interval '200 hours', 1, repeat('Y', 43));
  delete from mailing.subscriptions where status = 'pending' and confirm_expires_at < t0 + interval '49 hours';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Purge removed % rows instead of 1', n; end if;
  if (select array_agg(email_hash order by email_hash) from mailing.subscriptions) <> array[h1, h3] then
    raise exception 'Purge removed the wrong rows';
  end if;
  -- Dasselbe Kennzeichen kann nicht an zwei Anmeldungen hängen.
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_token_hash, confirm_expires_at, unsubscribe_token)
    values (h2, 'doppelt@b.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, repeat('b', 64), t0 + interval '48 hours', repeat('Z', 43));
    raise exception 'Duplicate confirmation token accepted';
  exception when unique_violation then null;
  end;
end $$;
reset role;
rollback;

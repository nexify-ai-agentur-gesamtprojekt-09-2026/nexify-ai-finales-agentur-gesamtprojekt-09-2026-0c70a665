-- Run only against a disposable database called nexify_mailing_fixture:
-- psql -X -v ON_ERROR_STOP=1 -d nexify_mailing_fixture -f apps/web/supabase/tests/mailing_consent.sql
-- The cluster must already contain the three Supabase roles; this test never
-- creates cluster-wide roles. All fixture objects and data are rolled back.
-- The database must be UTF8 (createdb -E UTF8 -T template0 nexify_mailing_fixture).
-- Prüft Migration 0005: Tabellen, RLS ohne Richtlinie, Rechte der Rollen, Formprüfungen, Anlegen nur unbestätigt,
-- Zustand nur vorwärts, unveränderlicher Nachweis in jedem Zustand, Bestätigung nur in der Frist und nie für eine
-- gesperrte Adresse, Löschen nur unbestätigter Zeilen, Sperrliste und Verlauf nur Anfügen, Mailzählung mit Grenzen.
-- Gleichzeitige Aufrufe und der Weg über PostgREST: mailing_consent_postgrest.mjs im selben Ordner.
\set ON_ERROR_STOP on
begin;
do $$
begin
  if current_database() <> 'nexify_mailing_fixture' then
    raise exception 'Refusing to run outside nexify_mailing_fixture';
  end if;
  if current_setting('server_encoding') <> 'UTF8' then
    raise exception 'Fixture database must be UTF8, like every Supabase instance';
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

-- Struktur: genau vier Tabellen, RLS überall an, keine einzige Richtlinie, keine Spalte für freie Inhalte.
do $$
declare t text;
begin
  if (select array_agg(tablename::text order by tablename) from pg_tables where schemaname = 'mailing')
     <> array['confirmation_mails','consent_events','subscriptions','suppressions'] then
    raise exception 'Unexpected tables in schema mailing';
  end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'mailing' and c.relkind = 'r' and not c.relrowsecurity) then
    raise exception 'Row-level security is not enabled on every table';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'mailing') then
    raise exception 'Unexpected policy: access must stay service-role only';
  end if;
  -- Das Schema ist nur für service_role benutzbar; anon und authenticated haben nicht einmal USAGE.
  if has_schema_privilege('anon', 'mailing', 'usage') or has_schema_privilege('authenticated', 'mailing', 'usage')
     or has_schema_privilege('anon', 'mailing', 'create') or has_schema_privilege('authenticated', 'mailing', 'create') then
    raise exception 'Public role holds a privilege on schema mailing';
  end if;
  if not has_schema_privilege('service_role', 'mailing', 'usage') or has_schema_privilege('service_role', 'mailing', 'create') then
    raise exception 'service_role must hold USAGE and nothing else on schema mailing';
  end if;
  foreach t in array array['confirmation_mails','consent_events','subscriptions','suppressions'] loop
    if has_table_privilege('anon', 'mailing.' || t, 'select,insert,update,delete')
       or has_table_privilege('authenticated', 'mailing.' || t, 'select,insert,update,delete') then
      raise exception 'Public role holds a table privilege on %', t;
    end if;
    if not has_table_privilege('service_role', 'mailing.' || t, 'select')
       or not has_table_privilege('service_role', 'mailing.' || t, 'insert') then
      raise exception 'service_role lacks a table privilege on %', t;
    end if;
    if has_table_privilege('service_role', 'mailing.' || t, 'truncate,references,trigger') then
      raise exception 'service_role holds truncate, references or trigger on %', t;
    end if;
  end loop;
  -- Anmeldungen und Mailzählung dürfen geändert und gelöscht werden (jeweils durch Trigger begrenzt);
  -- Sperrliste und Verlauf sind für den Dienst nur anfügbar.
  if not has_table_privilege('service_role', 'mailing.subscriptions', 'update')
     or not has_table_privilege('service_role', 'mailing.subscriptions', 'delete')
     or not has_table_privilege('service_role', 'mailing.confirmation_mails', 'update')
     or not has_table_privilege('service_role', 'mailing.confirmation_mails', 'delete') then
    raise exception 'service_role must update and delete subscriptions and confirmation mails';
  end if;
  if has_table_privilege('service_role', 'mailing.suppressions', 'update,delete')
     or has_table_privilege('service_role', 'mailing.consent_events', 'update,delete') then
    raise exception 'Suppressions and consent events must be append-only for service_role';
  end if;
  -- Die Sperrliste speichert nur Prüfsumme, Grund und Zeitpunkt; Verlauf und Mailzählung weder Adresse noch Kennzeichen.
  if (select array_agg(column_name::text order by column_name) from information_schema.columns
      where table_schema = 'mailing' and table_name = 'suppressions') <> array['created_at','email_hash','reason'] then
    raise exception 'suppressions must hold hash, reason and time only';
  end if;
  if (select array_agg(column_name::text order by column_name) from information_schema.columns
      where table_schema = 'mailing' and table_name = 'consent_events')
     <> array['consent_version','created_at','email_hash','id','occurred_at','source','type'] then
    raise exception 'consent_events must not hold address or token columns';
  end if;
  if (select array_agg(column_name::text order by column_name) from information_schema.columns
      where table_schema = 'mailing' and table_name = 'confirmation_mails')
     <> array['address_limit','address_window_hours','created_at','daily_limit','email_hash','id','reserved_at','state'] then
    raise exception 'confirmation_mails must not hold address or token columns';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'mailing' and data_type in ('json','jsonb','bytea')) then
    raise exception 'No payload column allowed in schema mailing';
  end if;
  if not exists (select 1 from pg_indexes where schemaname = 'mailing' and tablename = 'subscriptions' and indexdef like '%UNIQUE%(unsubscribe_token)%') then
    raise exception 'Missing unique key on the unsubscribe token';
  end if;
  -- Jede Sperre hängt als Trigger an ihrer Tabelle.
  if (select array_agg(tgname::text order by tgname) from pg_trigger g join pg_class c on c.oid = g.tgrelid join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'mailing' and not g.tgisinternal and g.tgenabled = 'O')
     <> array['confirmation_mails_admit','confirmation_mails_guard_delete','confirmation_mails_guard_update',
              'subscriptions_guard_delete','subscriptions_guard_insert','subscriptions_guard_update'] then
    raise exception 'Unexpected or disabled triggers in schema mailing';
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
  begin
    insert into mailing.confirmation_mails(email_hash, reserved_at, address_limit, address_window_hours, daily_limit) values (repeat('a', 64), now(), 3, 168, 50);
    raise exception 'anon unexpectedly reserved a confirmation mail';
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
  begin
    perform 1 from mailing.confirmation_mails;
    raise exception 'authenticated unexpectedly read confirmation mails';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Hilfen nur für diesen Test, in einem eigenen Schema (wird mit zurückgerollt): Prüfsumme einer Adresse und das
-- Anlegen wie insertPending.
create schema mailing_fixture;
create function mailing_fixture.h(address text) returns text language sql immutable as
  $f$ select encode(sha256(convert_to(address, 'UTF8')), 'hex') $f$;
create function mailing_fixture.pending(address text, token text, unsub text, requested timestamptz, expires interval default interval '48 hours') returns integer language plpgsql as $f$
declare n integer;
begin
  insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes, unsubscribe_token)
  values (mailing_fixture.h(address), address, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), requested, requested + expires, array[token], unsub)
  on conflict (email_hash) do nothing;
  get diagnostics n = row_count;
  return n;
end $f$;
grant usage on schema mailing_fixture to service_role;

-- Der Server (service_role) arbeitet so, wie PostgREST es für den Speicher ausführt.
set local role service_role;
do $$
declare
  n int;
  a1 text := 'a@b.invalid';
  h1 text := mailing_fixture.h('a@b.invalid');
  h2 text := mailing_fixture.h('alt@b.invalid');
  h3 text := mailing_fixture.h('neu@b.invalid');
  t0 timestamptz := now() - interval '10 hours';
  before_row mailing.subscriptions;
begin
  -- Formprüfungen: Prüfsumme, Sprache, Quelle, Fassung, Kennzeichen.
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes, unsubscribe_token)
    values ('kein-hash', a1, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)], repeat('U', 43));
    raise exception 'Malformed email_hash accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes, unsubscribe_token)
    values (h1, a1, 'xx', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)], repeat('U', 43));
    raise exception 'Unknown language accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes, unsubscribe_token)
    values (h1, a1, 'de', 'pending', 'Quelle mit Leerzeichen', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)], repeat('U', 43));
    raise exception 'Malformed source accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes, unsubscribe_token)
    values (h1, a1, 'de', 'pending', 'preise/checkliste', 'Fassung mit Leerzeichen', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)], repeat('U', 43));
    raise exception 'Malformed consent version accepted';
  exception when check_violation then null;
  end;
  -- Unbestätigt ohne Kennzeichen ist kein gültiger Zustand; ein Kennzeichen ist eine Hex-Prüfsumme; höchstens acht.
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, unsubscribe_token)
    values (h1, a1, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', repeat('U', 43));
    raise exception 'Pending subscription without token accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes, unsubscribe_token)
    values (h1, a1, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array['klartext-kennzeichen'], repeat('U', 43));
    raise exception 'Malformed confirmation token hash accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes, unsubscribe_token)
    values (h1, a1, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64), null], repeat('U', 43));
    raise exception 'Null confirmation token hash accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes, unsubscribe_token)
    values (h1, a1, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours',
            array[repeat('1',64),repeat('2',64),repeat('3',64),repeat('4',64),repeat('5',64),repeat('6',64),repeat('7',64),repeat('8',64),repeat('9',64)], repeat('U', 43));
    raise exception 'Nine confirmation tokens accepted';
  exception when check_violation then null;
  end;
  -- Frist: nach der Anfrage, höchstens 14 Tage.
  begin
    perform mailing_fixture.pending(a1, repeat('d', 64), repeat('U', 43), t0, interval '15 days');
    raise exception 'Deadline beyond 14 days accepted';
  exception when check_violation then null;
  end;
  begin
    perform mailing_fixture.pending(a1, repeat('d', 64), repeat('U', 43), t0, interval '0 hours');
    raise exception 'Deadline at request time accepted';
  exception when check_violation then null;
  end;

  -- M6 Gegenprobe: Prüfsumme und Adresse gehören zusammen. Eine fremde Adresse unter einer Prüfsumme wird abgelehnt.
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes, unsubscribe_token)
    values (repeat('1', 64), a1, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)], repeat('U', 43));
    raise exception 'Address stored under a hash that is not its own';
  exception when check_violation then null;
  end;
  -- N2 Gegenprobe: Steuerzeichen (C0, DEL, C1) und Rand in der Adresse werden auch von der Datenbank abgelehnt.
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes, unsubscribe_token)
    values (mailing_fixture.h(E'a\u0007b@c.invalid'), E'a\u0007b@c.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)], repeat('U', 43));
    raise exception 'Address with a C0 control character accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes, unsubscribe_token)
    values (mailing_fixture.h(E'a\u0085b@c.invalid'), E'a\u0085b@c.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)], repeat('U', 43));
    raise exception 'Address with a C1 control character accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes, unsubscribe_token)
    values (mailing_fixture.h(' a@b.invalid'), ' a@b.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)], repeat('U', 43));
    raise exception 'Untrimmed address accepted';
  exception when check_violation then null;
  end;

  -- M6 Gegenprobe: Eine Anmeldung entsteht nur unbestätigt. Ein direkt eingefügter "Nachweis" wird abgelehnt.
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirmed_at, unsubscribe_token)
    values (h1, a1, 'de', 'confirmed', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', t0 + interval '1 hour', repeat('U', 43));
    raise exception 'Directly inserted confirmed subscription accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, unsubscribed_at, unsubscribe_token)
    values (h1, a1, 'de', 'unsubscribed', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', t0, repeat('U', 43));
    raise exception 'Directly inserted unsubscribed subscription accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirmed_at, confirm_token_hashes, unsubscribe_token)
    values (h1, a1, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', t0, array[repeat('d', 64)], repeat('U', 43));
    raise exception 'Pending subscription with a confirmation time accepted';
  exception when check_violation then null;
  end;

  -- Anlegen wie insertPending: on conflict do nothing, die zweite Anfrage überschreibt nichts.
  if mailing_fixture.pending(a1, repeat('d', 64), repeat('U', 43), t0) <> 1 then raise exception 'Insert of a pending subscription failed'; end if;
  insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes, unsubscribe_token)
  values (h1, a1, 'fr', 'pending', 'preise/checkliste', 'v9', repeat('e', 64), t0 + interval '1 hour', t0 + interval '49 hours', array[repeat('f', 64)], repeat('V', 43))
  on conflict (email_hash) do nothing;
  get diagnostics n = row_count;
  if n <> 0 or (select consent_version from mailing.subscriptions where email_hash = h1) <> 'v1' then
    raise exception 'Second request overwrote the pending subscription';
  end if;
  select * into before_row from mailing.subscriptions where email_hash = h1;

  -- M5 Gegenprobe: Auch eine offene Anmeldung lässt sich nicht umschreiben. Jede Spalte des Nachweises einzeln.
  begin update mailing.subscriptions set lang = 'fr' where email_hash = h1; raise exception 'Language of a pending subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set source = 'kontakt/formular' where email_hash = h1; raise exception 'Source of a pending subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set consent_version = 'v2' where email_hash = h1; raise exception 'Consent version of a pending subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set consent_text_sha256 = repeat('e', 64) where email_hash = h1; raise exception 'Text hash of a pending subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set requested_at = t0 + interval '1 hour' where email_hash = h1; raise exception 'requested_at of a pending subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set confirm_expires_at = t0 + interval '13 days' where email_hash = h1; raise exception 'Deadline of a pending subscription was extended'; exception when check_violation then null; end;
  begin update mailing.subscriptions set created_at = t0 - interval '1 year' where email_hash = h1; raise exception 'created_at was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set unsubscribe_token = repeat('W', 43) where email_hash = h1; raise exception 'Unsubscribe token was rewritten'; exception when check_violation then null; end;

  -- Weiteres Kennzeichen wie addConfirmToken: nur mit dem gelesenen Stand der Liste im Filter; das erste bleibt gültig.
  update mailing.subscriptions set confirm_token_hashes = array[repeat('d', 64), repeat('9', 64)]
   where email_hash = h1 and status = 'pending' and confirm_expires_at > t0 + interval '1 hour' and confirm_token_hashes = array[repeat('7', 64)];
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Token added against a stale token list'; end if;
  update mailing.subscriptions set confirm_token_hashes = array[repeat('d', 64), repeat('9', 64)], updated_at = t0 + interval '1 hour'
   where email_hash = h1 and status = 'pending' and confirm_expires_at > t0 + interval '1 hour' and confirm_token_hashes = array[repeat('d', 64)];
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Adding a confirmation token failed'; end if;
  if (select (email, lang, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at) from mailing.subscriptions where email_hash = h1)
     is distinct from (before_row.email, before_row.lang, before_row.source, before_row.consent_version, before_row.consent_text_sha256, before_row.requested_at, before_row.confirm_expires_at) then
    raise exception 'Adding a token changed the proof';
  end if;
  -- Dasselbe Kennzeichen kann nicht an zwei Anmeldungen hängen, weder beim Anlegen noch beim Anfügen.
  begin
    perform mailing_fixture.pending('doppelt@b.invalid', repeat('9', 64), repeat('Z', 43), t0);
    raise exception 'Duplicate confirmation token accepted on insert';
  exception when unique_violation then null;
  end;
  if mailing_fixture.pending('zweite@b.invalid', repeat('6', 64), repeat('Q', 43), t0) <> 1 then raise exception 'Second address was not inserted'; end if;
  begin
    update mailing.subscriptions set confirm_token_hashes = array[repeat('6', 64), repeat('d', 64)] where email_hash = mailing_fixture.h('zweite@b.invalid');
    raise exception 'Duplicate confirmation token accepted on update';
  exception when unique_violation then null;
  end;

  -- M6 Gegenprobe: Bestätigen und im selben Schritt Adresse, Fassung oder Zeitpunkt umschreiben geht nicht.
  begin
    update mailing.subscriptions set status = 'confirmed', confirmed_at = t0 + interval '1 hour', confirm_token_hashes = '{}', email = 'fremd@x.invalid' where email_hash = h1;
    raise exception 'Confirmation rewrote the address';
  exception when check_violation then null;
  end;
  begin
    update mailing.subscriptions set status = 'confirmed', confirmed_at = t0 + interval '1 hour', confirm_token_hashes = '{}', consent_version = 'v9' where email_hash = h1;
    raise exception 'Confirmation rewrote the consent version';
  exception when check_violation then null;
  end;
  begin
    update mailing.subscriptions set status = 'confirmed', confirmed_at = t0 + interval '1 hour', confirm_token_hashes = '{}', requested_at = t0 - interval '9 days' where email_hash = h1;
    raise exception 'Confirmation rewrote requested_at';
  exception when check_violation then null;
  end;
  -- Bestätigen wie confirmByTokenHash: fremdes Kennzeichen und abgelaufene Frist wirken nicht.
  update mailing.subscriptions set status = 'confirmed', confirmed_at = t0 + interval '1 hour', confirm_token_hashes = '{}'
   where confirm_token_hashes @> array[repeat('5', 64)] and status = 'pending' and confirm_expires_at > t0 + interval '1 hour';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Unknown token confirmed a subscription'; end if;
  update mailing.subscriptions set status = 'confirmed', confirmed_at = t0 + interval '50 hours', confirm_token_hashes = '{}'
   where confirm_token_hashes @> array[repeat('9', 64)] and status = 'pending' and confirm_expires_at > t0 + interval '50 hours';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Expired token confirmed the subscription'; end if;
  -- Auch ohne den Filter des Dienstes bestätigt die Datenbank nicht außerhalb der Frist und nicht ohne Zeitpunkt.
  begin
    update mailing.subscriptions set status = 'confirmed', confirmed_at = t0 + interval '50 hours', confirm_token_hashes = '{}' where email_hash = h1;
    raise exception 'Confirmation after the deadline accepted';
  exception when check_violation then null;
  end;
  begin
    update mailing.subscriptions set status = 'confirmed', confirmed_at = t0 - interval '1 hour', confirm_token_hashes = '{}' where email_hash = h1;
    raise exception 'Confirmation before the request accepted';
  exception when check_violation then null;
  end;
  begin
    update mailing.subscriptions set status = 'confirmed', confirm_token_hashes = '{}' where email_hash = h1;
    raise exception 'Confirmation without confirmed_at accepted';
  exception when check_violation then null;
  end;
  -- Mit der Bestätigung sind alle Kennzeichen verbraucht: Eine Bestätigung, die eines stehen lässt, wird abgelehnt.
  begin
    update mailing.subscriptions set status = 'confirmed', confirmed_at = t0 + interval '1 hour', confirm_token_hashes = array[repeat('9', 64)] where email_hash = h1;
    raise exception 'Confirmation left a confirmation token in place';
  exception when check_violation then null;
  end;
  -- Ein Zeitpunkt der Abmeldung an einer offenen Zeile ist kein gültiger Zustand.
  begin
    update mailing.subscriptions set unsubscribed_at = t0 + interval '1 hour' where email_hash = h1;
    raise exception 'unsubscribed_at set on a pending subscription';
  exception when check_violation then null;
  end;
  -- M1 Gegenprobe: Eine gesperrte Adresse wird nicht bestätigt, auch mit gültigem Kennzeichen und in der Frist.
  insert into mailing.suppressions(email_hash, reason) values (mailing_fixture.h('zweite@b.invalid'), 'complaint');
  begin
    update mailing.subscriptions set status = 'confirmed', confirmed_at = t0 + interval '1 hour', confirm_token_hashes = '{}'
     where confirm_token_hashes @> array[repeat('6', 64)] and status = 'pending' and confirm_expires_at > t0 + interval '1 hour';
    raise exception 'Suppressed address was confirmed';
  exception when check_violation then null;
  end;
  -- Das zuerst ausgegebene Kennzeichen bestätigt, obwohl inzwischen ein zweites angefügt wurde.
  update mailing.subscriptions set status = 'confirmed', confirmed_at = t0 + interval '1 hour', confirm_token_hashes = '{}', updated_at = t0 + interval '1 hour'
   where confirm_token_hashes @> array[repeat('d', 64)] and status = 'pending' and confirm_expires_at > t0 + interval '1 hour';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'First token did not confirm the subscription'; end if;
  update mailing.subscriptions set status = 'confirmed', confirmed_at = t0 + interval '2 hours', confirm_token_hashes = '{}'
   where confirm_token_hashes @> array[repeat('9', 64)] and status = 'pending';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Second token confirmed again'; end if;

  -- M6 Gegenprobe: Auf einer bestätigten Zeile ändert sich nichts mehr außer durch die Abmeldung.
  begin update mailing.subscriptions set consent_version = 'v3' where email_hash = h1; raise exception 'Consent version of a confirmed subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set confirmed_at = t0 + interval '9 hours' where email_hash = h1; raise exception 'confirmed_at of a confirmed subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set email = 'andere@b.invalid' where email_hash = h1; raise exception 'Address of a confirmed subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set lang = 'fr' where email_hash = h1; raise exception 'Language of a confirmed subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set unsubscribed_at = t0 + interval '3 hours' where email_hash = h1; raise exception 'unsubscribed_at set on a confirmed subscription'; exception when check_violation then null; end;
  begin update mailing.subscriptions set updated_at = t0 + interval '3 hours' where email_hash = h1; raise exception 'Confirmed subscription was touched'; exception when check_violation then null; end;
  begin
    update mailing.subscriptions set status = 'pending', confirmed_at = null, confirm_token_hashes = array[repeat('8', 64)] where email_hash = h1;
    raise exception 'Confirmed subscription went back to pending';
  exception when check_violation then null;
  end;
  -- Ein Kennzeichen an einer bestätigten Zeile ist kein gültiger Zustand.
  begin
    update mailing.subscriptions set confirm_token_hashes = array[repeat('8', 64)] where email_hash = h1;
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
  begin
    update mailing.subscriptions set status = 'unsubscribed' where email_hash = h1;
    raise exception 'Unsubscribe without a time accepted';
  exception when check_violation then null;
  end;
  begin
    update mailing.subscriptions set status = 'unsubscribed', unsubscribed_at = t0 + interval '2 hours', confirmed_at = null where email_hash = h1;
    raise exception 'Unsubscribe erased the confirmation time';
  exception when check_violation then null;
  end;
  update mailing.subscriptions set status = 'unsubscribed', unsubscribed_at = t0 + interval '2 hours', confirm_token_hashes = '{}', updated_at = t0 + interval '2 hours'
   where email_hash = h1 and status <> 'unsubscribed';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Unsubscribe did not change the row'; end if;
  if (select confirmed_at from mailing.subscriptions where email_hash = h1) <> t0 + interval '1 hour' then
    raise exception 'Unsubscribe changed the proof of the earlier consent';
  end if;
  -- M6 Gegenprobe: Eine abgemeldete Zeile ändert sich gar nicht mehr.
  begin update mailing.subscriptions set status = 'confirmed', unsubscribed_at = null where email_hash = h1; raise exception 'Unsubscribed subscription was reactivated'; exception when check_violation then null; end;
  begin update mailing.subscriptions set unsubscribed_at = t0 + interval '9 hours' where email_hash = h1; raise exception 'unsubscribed_at was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set lang = 'en' where email_hash = h1; raise exception 'Language of an unsubscribed subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set updated_at = t0 + interval '9 hours' where email_hash = h1; raise exception 'Unsubscribed subscription was touched'; exception when check_violation then null; end;
  begin
    delete from mailing.subscriptions where email_hash = h1;
    raise exception 'Unsubscribed subscription was deleted';
  exception when check_violation then null;
  end;
  -- H1: Eine offene Anmeldung lässt sich ohne Bestätigung sperren (Sperrlink aus der Mail): pending -> unsubscribed.
  update mailing.subscriptions set status = 'unsubscribed', unsubscribed_at = t0 + interval '2 hours', confirm_token_hashes = '{}'
   where email_hash = mailing_fixture.h('zweite@b.invalid') and status <> 'unsubscribed';
  get diagnostics n = row_count;
  if n <> 1 or (select confirmed_at from mailing.subscriptions where email_hash = mailing_fixture.h('zweite@b.invalid')) is not null then
    raise exception 'Pending subscription could not be blocked without confirmation';
  end if;

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
  perform mailing_fixture.pending('alt@b.invalid', repeat('a', 64), repeat('X', 43), t0);
  perform mailing_fixture.pending('neu@b.invalid', repeat('b', 64), repeat('Y', 43), t0, interval '200 hours');
  delete from mailing.subscriptions where status = 'pending' and confirm_expires_at < t0 + interval '49 hours';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Purge removed % rows instead of 1', n; end if;
  if (select array_agg(email order by email) from mailing.subscriptions) <> array['a@b.invalid', 'neu@b.invalid', 'zweite@b.invalid'] then
    raise exception 'Purge removed the wrong rows';
  end if;
end $$;

-- H2: Mailzählung. Grenze je Adresse im Fenster, Tagesgrenze, Fehlschlag zählt nicht, die Zählung hängt nicht an der Anmeldung.
do $$
declare
  n int;
  ha text := mailing_fixture.h('zaehlung@b.invalid');
  t1 timestamptz := now();
  i int;
begin
  -- Formprüfungen: Grenzwerte außerhalb ihres Bereichs (0, zu groß) entstehen gar nicht erst.
  begin insert into mailing.confirmation_mails(email_hash, reserved_at, address_limit, address_window_hours, daily_limit) values (ha, t1, 0, 168, 50); raise exception 'address_limit 0 accepted'; exception when check_violation then null; end;
  begin insert into mailing.confirmation_mails(email_hash, reserved_at, address_limit, address_window_hours, daily_limit) values (ha, t1, 11, 168, 50); raise exception 'address_limit 11 accepted'; exception when check_violation then null; end;
  begin insert into mailing.confirmation_mails(email_hash, reserved_at, address_limit, address_window_hours, daily_limit) values (ha, t1, 3, 0, 50); raise exception 'window 0 accepted'; exception when check_violation then null; end;
  begin insert into mailing.confirmation_mails(email_hash, reserved_at, address_limit, address_window_hours, daily_limit) values (ha, t1, 3, 168, 0); raise exception 'daily_limit 0 accepted'; exception when check_violation then null; end;
  begin insert into mailing.confirmation_mails(email_hash, reserved_at, address_limit, address_window_hours, daily_limit) values (ha, t1, null, 168, 50); raise exception 'missing address_limit accepted'; exception when not_null_violation then null; end;
  begin insert into mailing.confirmation_mails(email_hash, state, reserved_at, address_limit, address_window_hours, daily_limit) values (ha, 'sent', t1, 3, 168, 50); raise exception 'Entry inserted as already sent'; exception when check_violation then null; end;

  -- Drei Mails je Adresse in 168 Stunden; die vierte entsteht nicht (keine Zeile, kein Fehler).
  for i in 0..2 loop
    insert into mailing.confirmation_mails(email_hash, reserved_at, address_limit, address_window_hours, daily_limit) values (ha, t1 + make_interval(hours => i * 49), 3, 168, 50);
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'Reservation % was refused', i + 1; end if;
  end loop;
  -- Zwischen den Einträgen lagen jeweils 49 Stunden: Die Anmeldung dazu wäre jedes Mal verfallen. Die Zählung nicht.
  insert into mailing.confirmation_mails(email_hash, reserved_at, address_limit, address_window_hours, daily_limit) values (ha, t1 + interval '147 hours', 3, 168, 50);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Fourth confirmation mail within the window was admitted'; end if;
  if (select count(*) from mailing.subscriptions where email_hash = ha) <> 0 then raise exception 'Count depends on a subscription row'; end if;
  -- Nach Ablauf des Fensters der ersten ist wieder ein Platz frei.
  insert into mailing.confirmation_mails(email_hash, reserved_at, address_limit, address_window_hours, daily_limit) values (ha, t1 + interval '168 hours', 3, 168, 50);
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Reservation after the window was refused'; end if;

  -- M3 Gegenprobe: Ein gescheiterter Versand gibt seinen Platz frei; ein Eintrag wird genau einmal abgeschlossen.
  update mailing.confirmation_mails set state = 'failed' where email_hash = ha and reserved_at = t1 + interval '168 hours' and state = 'reserved';
  insert into mailing.confirmation_mails(email_hash, reserved_at, address_limit, address_window_hours, daily_limit) values (ha, t1 + interval '169 hours', 3, 168, 50);
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Failed delivery still consumed a place'; end if;
  update mailing.confirmation_mails set state = 'sent' where email_hash = ha and reserved_at = t1 + interval '169 hours' and state = 'reserved';
  begin update mailing.confirmation_mails set state = 'failed' where email_hash = ha and reserved_at = t1 + interval '169 hours'; raise exception 'Sent entry was turned into failed'; exception when check_violation then null; end;
  begin update mailing.confirmation_mails set state = 'reserved' where email_hash = ha and state = 'failed'; raise exception 'Failed entry was reopened'; exception when check_violation then null; end;
  begin update mailing.confirmation_mails set state = 'sent', reserved_at = t1 - interval '1 year' where email_hash = ha and reserved_at = t1; raise exception 'Entry was moved out of its window'; exception when check_violation then null; end;
  begin update mailing.confirmation_mails set state = 'sent', email_hash = mailing_fixture.h('x@y.invalid') where email_hash = ha and reserved_at = t1; raise exception 'Entry was moved to another address'; exception when check_violation then null; end;
  begin update mailing.confirmation_mails set state = 'sent', address_limit = 10 where email_hash = ha and reserved_at = t1; raise exception 'Limit of an entry was rewritten'; exception when check_violation then null; end;

  -- Tagesgrenze über alle Adressen: fünf in 24 Stunden, die sechste entsteht nicht; einen Tag später wieder.
  for i in 1..5 loop
    insert into mailing.confirmation_mails(email_hash, reserved_at, address_limit, address_window_hours, daily_limit) values (mailing_fixture.h('tag' || i || '@b.invalid'), t1 + interval '400 hours', 3, 168, 5);
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'Daily reservation % was refused', i; end if;
  end loop;
  insert into mailing.confirmation_mails(email_hash, reserved_at, address_limit, address_window_hours, daily_limit) values (mailing_fixture.h('tag6@b.invalid'), t1 + interval '423 hours', 3, 168, 5);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Sixth confirmation mail within 24 hours was admitted'; end if;
  insert into mailing.confirmation_mails(email_hash, reserved_at, address_limit, address_window_hours, daily_limit) values (mailing_fixture.h('tag6@b.invalid'), t1 + interval '424 hours', 3, 168, 5);
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Reservation after 24 hours was refused'; end if;

  -- Aufräumen wie purgeSettledMails: Was nach der Uhr der Datenbank noch zählt, bleibt ohne Fehler stehen.
  insert into mailing.confirmation_mails(email_hash, reserved_at, address_limit, address_window_hours, daily_limit) values (mailing_fixture.h('uralt@b.invalid'), t1 - interval '169 hours', 3, 168, 50);
  insert into mailing.confirmation_mails(email_hash, reserved_at, address_limit, address_window_hours, daily_limit) values (mailing_fixture.h('langes-fenster@b.invalid'), t1 - interval '169 hours', 3, 336, 50);
  select count(*) into i from mailing.confirmation_mails;
  delete from mailing.confirmation_mails where reserved_at < t1 + interval '1000 hours';
  get diagnostics n = row_count;
  if n <> 1 or (select count(*) from mailing.confirmation_mails) <> i - 1 or exists (select 1 from mailing.confirmation_mails where email_hash = mailing_fixture.h('uralt@b.invalid')) then
    raise exception 'Purge of the mail count removed % rows instead of exactly the one expired row', n;
  end if;
end $$;
reset role;
rollback;

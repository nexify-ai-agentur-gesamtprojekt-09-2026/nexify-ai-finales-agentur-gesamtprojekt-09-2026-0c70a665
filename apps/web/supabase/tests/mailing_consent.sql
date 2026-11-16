-- Run only against a disposable database called nexify_mailing_fixture:
-- psql -X -v ON_ERROR_STOP=1 -d nexify_mailing_fixture -f apps/web/supabase/tests/mailing_consent.sql
-- The cluster must already contain the three Supabase roles; this test never
-- creates cluster-wide roles. The database must be UTF8
-- (createdb -E UTF8 -T template0 nexify_mailing_fixture).
-- Die Migration ist selbst eine Transaktion und wird deshalb vor den Prüfungen fest angewendet. Das Schema "mailing"
-- dieser Wegwerf-Datenbank wird dafür zu Beginn ersetzt und am Ende entfernt; alle Prüfdaten werden zurückgerollt.
-- Prüft Migration 0005: Tabellen, RLS ohne Richtlinie, Rechte der Rollen, Formprüfungen, Anlegen nur unbestätigt,
-- Zustand nur vorwärts, unveränderlicher Nachweis in jedem Zustand, Bestätigung nur in der Frist und nie für eine
-- gesperrte Adresse, Zeitpunkte und Obergrenzen aus der Datenbank, Löschen nur unbestätigter Zeilen, Sperrliste,
-- Abmeldekennzeichen und Verlauf nur Anfügen, Mailzählung mit Grenzen für Mails und für Versuche.
-- Gleichzeitige Aufrufe und der Weg über PostgREST: mailing_consent_postgrest.mjs im selben Ordner.
\set ON_ERROR_STOP on
do $$
begin
  if current_database() <> 'nexify_mailing_fixture' then
    raise exception 'Refusing to run outside nexify_mailing_fixture';
  end if;
  if current_setting('server_encoding') <> 'UTF8' then
    raise exception 'Fixture database must be UTF8, like every Supabase instance';
  end if;
  if (select count(*) from pg_roles where rolname in ('anon','authenticated','service_role')) <> 3 then
    raise exception 'Fixture cluster must already contain Supabase roles';
  end if;
  if not (select rolbypassrls from pg_roles where rolname = 'service_role') then
    raise exception 'Fixture service role is misconfigured';
  end if;
end $$;
set client_min_messages = warning;
drop schema if exists mailing cascade;
drop schema if exists mailing_fixture cascade;
\ir ../migrations/0005_mailing_consent.sql
-- Zweites Anwenden darf nichts ändern und nicht scheitern, auch nicht an den Obergrenzen, die schon dastehen.
update mailing.settings set daily_limit = 49;
\ir ../migrations/0005_mailing_consent.sql
do $$
begin
  if (select daily_limit from mailing.settings) <> 49 then
    raise exception 'Re-running the migration overwrote the owner''s settings';
  end if;
end $$;
update mailing.settings set daily_limit = 50;

begin;
-- Struktur: genau sechs Tabellen, RLS überall an, keine einzige Richtlinie, keine Spalte für freie Inhalte.
do $$
declare t text;
begin
  if (select array_agg(tablename::text order by tablename) from pg_tables where schemaname = 'mailing')
     <> array['confirmation_mails','consent_events','settings','subscriptions','suppressions','unsubscribe_tokens'] then
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
  foreach t in array array['confirmation_mails','consent_events','settings','subscriptions','suppressions','unsubscribe_tokens'] loop
    if has_table_privilege('anon', 'mailing.' || t, 'select,insert,update,delete')
       or has_table_privilege('authenticated', 'mailing.' || t, 'select,insert,update,delete') then
      raise exception 'Public role holds a table privilege on %', t;
    end if;
    if not has_table_privilege('service_role', 'mailing.' || t, 'select') then
      raise exception 'service_role cannot read %', t;
    end if;
    if has_table_privilege('service_role', 'mailing.' || t, 'truncate,references,trigger') then
      raise exception 'service_role holds truncate, references or trigger on %', t;
    end if;
  end loop;
  -- Anmeldungen und Mailzählung dürfen geändert und gelöscht werden (jeweils durch Trigger begrenzt); Sperrliste,
  -- Abmeldekennzeichen und Verlauf sind für den Dienst nur anfügbar; die Obergrenzen kann er nur lesen.
  foreach t in array array['subscriptions','confirmation_mails'] loop
    if not (has_table_privilege('service_role', 'mailing.' || t, 'insert') and has_table_privilege('service_role', 'mailing.' || t, 'update')
            and has_table_privilege('service_role', 'mailing.' || t, 'delete')) then
      raise exception 'service_role must insert, update and delete %', t;
    end if;
  end loop;
  foreach t in array array['suppressions','consent_events','unsubscribe_tokens'] loop
    if not has_table_privilege('service_role', 'mailing.' || t, 'insert') or has_table_privilege('service_role', 'mailing.' || t, 'update,delete') then
      raise exception '% must be append-only for service_role', t;
    end if;
  end loop;
  if has_table_privilege('service_role', 'mailing.settings', 'insert,update,delete') then
    raise exception 'settings must be read-only for service_role';
  end if;
  if (select count(*) from mailing.settings) <> 1 then
    raise exception 'settings must hold exactly one row';
  end if;
  -- Nur die Anmeldung trägt eine Adresse. Sperrliste, Abmeldekennzeichen, Verlauf und Mailzählung tragen die Prüfsumme.
  if (select array_agg(column_name::text order by column_name) from information_schema.columns
      where table_schema = 'mailing' and table_name = 'suppressions') <> array['created_at','email_hash','reason'] then
    raise exception 'suppressions must hold hash, reason and time only';
  end if;
  if (select array_agg(column_name::text order by column_name) from information_schema.columns
      where table_schema = 'mailing' and table_name = 'unsubscribe_tokens') <> array['created_at','email_hash','token'] then
    raise exception 'unsubscribe_tokens must hold hash, token and time only';
  end if;
  if (select array_agg(column_name::text order by column_name) from information_schema.columns
      where table_schema = 'mailing' and table_name = 'consent_events')
     <> array['consent_version','created_at','email_hash','id','occurred_at','source','type'] then
    raise exception 'consent_events must not hold address or token columns';
  end if;
  if (select array_agg(column_name::text order by column_name) from information_schema.columns
      where table_schema = 'mailing' and table_name = 'confirmation_mails')
     <> array['address_attempt_limit','address_limit','address_window_hours','created_at','daily_attempt_limit','daily_limit','email_hash','id','reserved_at','state'] then
    raise exception 'confirmation_mails must not hold address or token columns';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'mailing' and column_name = 'email' and table_name <> 'subscriptions') then
    raise exception 'Only subscriptions may hold an address';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'mailing' and table_name = 'subscriptions' and column_name like '%unsubscribe_token%') then
    raise exception 'The unsubscribe token must not depend on the subscription row';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'mailing' and data_type in ('json','jsonb','bytea')) then
    raise exception 'No payload column allowed in schema mailing';
  end if;
  if not exists (select 1 from pg_indexes where schemaname = 'mailing' and tablename = 'unsubscribe_tokens' and indexdef like '%UNIQUE%(token)%') then
    raise exception 'Missing unique key on the unsubscribe token';
  end if;
  -- Jede Sperre hängt als Trigger an ihrer Tabelle.
  if (select array_agg(tgname::text order by tgname) from pg_trigger g join pg_class c on c.oid = g.tgrelid join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'mailing' and not g.tgisinternal and g.tgenabled = 'O')
     <> array['confirmation_mails_admit','confirmation_mails_guard_delete','confirmation_mails_guard_update','consent_events_stamp',
              'subscriptions_guard_delete','subscriptions_guard_insert','subscriptions_guard_update','suppressions_guard_insert','unsubscribe_tokens_stamp'] then
    raise exception 'Unexpected or disabled triggers in schema mailing';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'mailing' and p.prosecdef) then
    raise exception 'No security definer function allowed in schema mailing';
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
    perform 1 from mailing.unsubscribe_tokens;
    raise exception 'anon unexpectedly read unsubscribe tokens';
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
    perform 1 from mailing.settings;
    raise exception 'authenticated unexpectedly read settings';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from mailing.confirmation_mails;
    raise exception 'authenticated unexpectedly read confirmation mails';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Hilfen nur für diesen Test, in einem eigenen Schema (wird mit zurückgerollt).
--   h        Prüfsumme einer Adresse
--   pending  Anlegen wie insertPending
--   age_*    Zeit vergehen lassen: Die Datenbank setzt alle Zeitpunkte selbst, deshalb verschiebt der Test vorhandene
--            Zeilen als Besitzer in die Vergangenheit (an den Triggern vorbei). Der Dienst kann das nicht.
create schema mailing_fixture;
create function mailing_fixture.h(address text) returns text language sql immutable as
  $f$ select encode(sha256(convert_to(address, 'UTF8')), 'hex') $f$;
create function mailing_fixture.pending(address text, token text, expires interval default interval '48 hours') returns integer language plpgsql as $f$
declare n integer;
begin
  insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
  values (mailing_fixture.h(address), address, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), now(), now() + expires, array[token])
  on conflict (email_hash) do nothing;
  get diagnostics n = row_count;
  return n;
end $f$;
create function mailing_fixture.age_subscription(address text, by interval) returns void language sql security definer set session_replication_role = replica as
  $f$ update mailing.subscriptions set requested_at = requested_at - by, confirm_expires_at = confirm_expires_at - by, created_at = created_at - by where email = address $f$;
create function mailing_fixture.age_mails(by interval) returns void language sql security definer set session_replication_role = replica as
  $f$ update mailing.confirmation_mails set reserved_at = reserved_at - by, created_at = created_at - by $f$;
grant usage on schema mailing_fixture to service_role;

-- Der Server (service_role) arbeitet so, wie PostgREST es für den Speicher ausführt.
set local role service_role;
do $$
declare
  n int;
  a1 text := 'a@b.invalid';
  h1 text := mailing_fixture.h('a@b.invalid');
  h2 text := mailing_fixture.h('zweite@b.invalid');
  t0 timestamptz := now();
  before_row mailing.subscriptions;
begin
  -- Formprüfungen: Prüfsumme, Sprache, Quelle, Fassung, Kennzeichen.
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values ('kein-hash', a1, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Malformed email_hash accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (h1, a1, 'xx', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Unknown language accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (h1, a1, 'de', 'pending', 'Quelle mit Leerzeichen', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Malformed source accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (h1, a1, 'de', 'pending', 'preise/checkliste', 'Fassung mit Leerzeichen', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Malformed consent version accepted';
  exception when check_violation then null;
  end;
  -- Unbestätigt ohne Kennzeichen ist kein gültiger Zustand; ein Kennzeichen ist eine Hex-Prüfsumme; höchstens acht.
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (h1, a1, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', '{}');
    raise exception 'Pending subscription without token accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (h1, a1, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array['klartext-kennzeichen']);
    raise exception 'Malformed confirmation token hash accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (h1, a1, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64), null]);
    raise exception 'Null confirmation token hash accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (h1, a1, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('1',64),repeat('2',64),repeat('3',64),repeat('4',64),repeat('5',64),repeat('6',64),repeat('7',64),repeat('8',64),repeat('9',64)]);
    raise exception 'Nine confirmation tokens accepted';
  exception when check_violation then null;
  end;
  -- Frist: nach der Anfrage, höchstens 14 Tage.
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (h1, a1, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '15 days', array[repeat('d', 64)]);
    raise exception 'Deadline beyond 14 days accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (h1, a1, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0, array[repeat('d', 64)]);
    raise exception 'Deadline at request time accepted';
  exception when check_violation then null;
  end;

  -- Prüfsumme und Adresse gehören zusammen. Eine fremde Adresse unter einer Prüfsumme wird abgelehnt.
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (repeat('1', 64), a1, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address stored under a hash that is not its own';
  exception when check_violation then null;
  end;
  -- Steuerzeichen (C0, DEL, C1), Rand, unsichtbare Zeichen und ASCII-Großbuchstaben in der Adresse (B8).
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h(E'a\u0007b@c.invalid'), E'a\u0007b@c.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address with a C0 control character accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h(E'a\u0085b@c.invalid'), E'a\u0085b@c.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address with a C1 control character accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h(' a@b.invalid'), ' a@b.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Untrimmed address accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h(E'a\u200bb@c.invalid'), E'a\u200bb@c.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address with a zero-width space accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h(E'a\u202eb@c.invalid'), E'a\u202eb@c.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address with a bidi override accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h(E'\ufeffa@c.invalid'), E'\ufeffa@c.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address with a byte order mark accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h('A@EXAMPLE.invalid'), 'A@EXAMPLE.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address with upper-case letters accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h('v@example.invalid.'), 'v@example.invalid.', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address with a trailing dot accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h('v@a..xx'), 'v@a..xx', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address with an empty domain label accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h('v@-.xx'), 'v@-.xx', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address with a bare hyphen label accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h('v@example-.invalid'), 'v@example-.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address with a trailing hyphen label accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h('v.@example.invalid'), 'v.@example.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address with a dot before the at sign accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h('.v@example.invalid'), '.v@example.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address with a leading dot accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h('v..w@example.invalid'), 'v..w@example.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address with two dots in the local part accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h('v@@example.invalid'), 'v@@example.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address with two at signs accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h('v@example'), 'v@example', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address without a domain dot accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h(E'v\u3164@example.invalid'), E'v\u3164@example.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address with a Hangul filler accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h(E'v\u115f@example.invalid'), E'v\u115f@example.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address with a Hangul choseong filler accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
    values (mailing_fixture.h(E'v\ufe0f@example.invalid'), E'v\ufe0f@example.invalid', 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)]);
    raise exception 'Address with a variation selector accepted';
  exception when check_violation then null;
  end;

  -- Eine Anmeldung entsteht nur unbestätigt. Ein direkt eingefügter "Nachweis" wird abgelehnt.
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes, confirmed_at)
    values (h1, a1, 'de', 'confirmed', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', '{}', t0);
    raise exception 'Directly inserted confirmed subscription accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes, confirmed_at, unsubscribed_at)
    values (h1, a1, 'de', 'unsubscribed', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', '{}', t0, t0);
    raise exception 'Directly inserted unsubscribed subscription accepted';
  exception when check_violation then null;
  end;
  begin
    insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes, confirmed_at)
    values (h1, a1, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0, t0 + interval '48 hours', array[repeat('d', 64)], t0);
    raise exception 'Pending subscription with a confirmation time accepted';
  exception when check_violation then null;
  end;

  -- B7: Zeitpunkt der Anfrage ist die Uhr der Datenbank. Ein vom Aufrufer rückdatierter Zeitpunkt wird überschrieben;
  -- die Dauer der Frist bleibt, ihr Beginn ist jetzt.
  insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes, created_at)
  values (h1, a1, 'de', 'pending', 'preise/checkliste', 'v1', repeat('c', 64), t0 - interval '300 days', t0 - interval '300 days' + interval '48 hours', array[repeat('d', 64)], t0 - interval '9 years');
  select * into before_row from mailing.subscriptions where email_hash = h1;
  if before_row.requested_at <> now() or before_row.confirm_expires_at <> now() + interval '48 hours' or before_row.created_at <> now() then
    raise exception 'Caller-supplied request time was kept: %', before_row.requested_at;
  end if;
  -- Anlegen wie insertPending: on conflict do nothing, die zweite Anfrage überschreibt nichts.
  insert into mailing.subscriptions(email_hash, email, lang, status, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at, confirm_token_hashes)
  values (h1, a1, 'fr', 'pending', 'preise/checkliste', 'v9', repeat('e', 64), t0, t0 + interval '49 hours', array[repeat('f', 64)])
  on conflict (email_hash) do nothing;
  get diagnostics n = row_count;
  if n <> 0 or (select consent_version from mailing.subscriptions where email_hash = h1) <> 'v1' then
    raise exception 'Second request overwrote the pending subscription';
  end if;

  -- Auch eine offene Anmeldung lässt sich nicht umschreiben. Jede Spalte des Nachweises einzeln.
  begin update mailing.subscriptions set lang = 'fr' where email_hash = h1; raise exception 'Language of a pending subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set source = 'kontakt/formular' where email_hash = h1; raise exception 'Source of a pending subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set consent_version = 'v2' where email_hash = h1; raise exception 'Consent version of a pending subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set consent_text_sha256 = repeat('e', 64) where email_hash = h1; raise exception 'Text hash of a pending subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set requested_at = t0 - interval '1 hour' where email_hash = h1; raise exception 'requested_at of a pending subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set confirm_expires_at = t0 + interval '13 days' where email_hash = h1; raise exception 'Deadline of a pending subscription was extended'; exception when check_violation then null; end;
  begin update mailing.subscriptions set created_at = t0 - interval '1 year' where email_hash = h1; raise exception 'created_at was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set email = 'b@b.invalid', email_hash = mailing_fixture.h('b@b.invalid') where email_hash = h1; raise exception 'Identity of a subscription was rewritten'; exception when check_violation then null; end;

  -- Weiteres Kennzeichen wie addConfirmToken: nur mit dem gelesenen Stand der Liste im Filter; das erste bleibt gültig.
  update mailing.subscriptions set confirm_token_hashes = array[repeat('d', 64), repeat('9', 64)]
   where email_hash = h1 and status = 'pending' and confirm_expires_at > now() and confirm_token_hashes = array[repeat('7', 64)];
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Token added against a stale token list'; end if;
  update mailing.subscriptions set confirm_token_hashes = array[repeat('d', 64), repeat('9', 64)], updated_at = now()
   where email_hash = h1 and status = 'pending' and confirm_expires_at > now() and confirm_token_hashes = array[repeat('d', 64)];
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Adding a confirmation token failed'; end if;
  if (select (email, lang, source, consent_version, consent_text_sha256, requested_at, confirm_expires_at) from mailing.subscriptions where email_hash = h1)
     is distinct from (before_row.email, before_row.lang, before_row.source, before_row.consent_version, before_row.consent_text_sha256, before_row.requested_at, before_row.confirm_expires_at) then
    raise exception 'Adding a token changed the proof';
  end if;
  -- Dasselbe Kennzeichen kann nicht an zwei Anmeldungen hängen, weder beim Anlegen noch beim Anfügen.
  begin
    perform mailing_fixture.pending('doppelt@b.invalid', repeat('9', 64));
    raise exception 'Duplicate confirmation token accepted on insert';
  exception when unique_violation then null;
  end;
  if mailing_fixture.pending('zweite@b.invalid', repeat('6', 64)) <> 1 then raise exception 'Second address was not inserted'; end if;
  begin
    update mailing.subscriptions set confirm_token_hashes = array[repeat('6', 64), repeat('d', 64)] where email_hash = h2;
    raise exception 'Duplicate confirmation token accepted on update';
  exception when unique_violation then null;
  end;

  -- Bestätigen und im selben Schritt Adresse, Fassung oder Zeitpunkt umschreiben geht nicht.
  begin update mailing.subscriptions set status = 'confirmed', confirmed_at = now(), confirm_token_hashes = '{}', email = 'fremd@x.invalid' where email_hash = h1; raise exception 'Confirmation rewrote the address'; exception when check_violation then null; end;
  begin update mailing.subscriptions set status = 'confirmed', confirmed_at = now(), confirm_token_hashes = '{}', consent_version = 'v9' where email_hash = h1; raise exception 'Confirmation rewrote the consent version'; exception when check_violation then null; end;
  begin update mailing.subscriptions set status = 'confirmed', confirmed_at = now(), confirm_token_hashes = '{}', requested_at = t0 - interval '9 days' where email_hash = h1; raise exception 'Confirmation rewrote requested_at'; exception when check_violation then null; end;
  -- Bestätigen wie confirmByTokenHash: Ein fremdes Kennzeichen wirkt nicht.
  update mailing.subscriptions set status = 'confirmed', confirmed_at = now(), confirm_token_hashes = '{}'
   where confirm_token_hashes @> array[repeat('5', 64)] and status = 'pending' and confirm_expires_at > now();
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Unknown token confirmed a subscription'; end if;
  -- Mit der Bestätigung sind alle Kennzeichen verbraucht: Eine Bestätigung, die eines stehen lässt, wird abgelehnt.
  begin update mailing.subscriptions set status = 'confirmed', confirmed_at = now(), confirm_token_hashes = array[repeat('9', 64)] where email_hash = h1; raise exception 'Confirmation left a confirmation token in place'; exception when check_violation then null; end;
  -- Ein Zeitpunkt der Abmeldung an einer offenen Zeile ist kein gültiger Zustand.
  begin update mailing.subscriptions set unsubscribed_at = now() where email_hash = h1; raise exception 'unsubscribed_at set on a pending subscription'; exception when check_violation then null; end;
  -- B3: Eine nie bestätigte Anmeldung wird nicht "abgemeldet" und so samt Adresse aufbewahrt; sie kann nur gelöscht werden.
  begin update mailing.subscriptions set status = 'unsubscribed', unsubscribed_at = now(), confirm_token_hashes = '{}' where email_hash = h1; raise exception 'Never-confirmed subscription was kept as unsubscribed'; exception when check_violation then null; end;

  -- Frist nach der Uhr der Datenbank: Eine Anmeldung, deren Frist abgelaufen ist, bestätigt nicht mehr, auch wenn der
  -- Aufrufer den Filter weglässt und einen Zeitpunkt innerhalb der Frist behauptet (B7).
  if mailing_fixture.pending('alt@b.invalid', repeat('a', 64)) <> 1 then raise exception 'Third address was not inserted'; end if;
  perform mailing_fixture.age_subscription('alt@b.invalid', interval '49 hours');
  -- Die abgelaufene Zeile bleibt ohne Fehler unverändert: Der Aufrufer sieht null geänderte Zeilen und meldet ein
  -- abgelaufenes Kennzeichen statt einer Störung.
  update mailing.subscriptions set status = 'confirmed', confirmed_at = now() - interval '2 hours', confirm_token_hashes = '{}' where email = 'alt@b.invalid';
  if found or (select status || '/' || cardinality(confirm_token_hashes) from mailing.subscriptions where email = 'alt@b.invalid') <> 'pending/1' then
    raise exception 'Confirmation after the deadline accepted';
  end if;
  -- Ebenso bekommt die abgelaufene Anmeldung kein weiteres Kennzeichen (ohne Fehler), auch ohne Fristfilter des Aufrufers.
  update mailing.subscriptions set confirm_token_hashes = confirm_token_hashes || repeat('7', 64) where email = 'alt@b.invalid';
  if found or (select cardinality(confirm_token_hashes) from mailing.subscriptions where email = 'alt@b.invalid') <> 1 then
    raise exception 'Expired subscription accepted another confirmation token';
  end if;
  -- M1: Eine gesperrte Adresse wird nicht bestätigt, auch mit gültigem Kennzeichen und in der Frist.
  insert into mailing.suppressions(email_hash, reason) values (h2, 'complaint');
  begin
    update mailing.subscriptions set status = 'confirmed', confirmed_at = now(), confirm_token_hashes = '{}'
     where confirm_token_hashes @> array[repeat('6', 64)] and status = 'pending' and confirm_expires_at > now();
    raise exception 'Suppressed address was confirmed';
  exception when check_violation then null;
  end;
  -- Das zuerst ausgegebene Kennzeichen bestätigt, obwohl inzwischen ein zweites angefügt wurde. Den Zeitpunkt setzt
  -- die Datenbank: Ein vom Aufrufer rückdatierter Zeitpunkt (30 Minuten) wird überschrieben (B7).
  perform mailing_fixture.age_subscription(a1, interval '3 hours');
  update mailing.subscriptions set status = 'confirmed', confirmed_at = now() - interval '30 minutes', confirm_token_hashes = '{}', updated_at = now()
   where confirm_token_hashes @> array[repeat('d', 64)] and status = 'pending' and confirm_expires_at > now();
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'First token did not confirm the subscription'; end if;
  if (select confirmed_at from mailing.subscriptions where email_hash = h1) <> now() then
    raise exception 'Caller-supplied confirmation time was kept';
  end if;
  update mailing.subscriptions set status = 'confirmed', confirmed_at = now(), confirm_token_hashes = '{}'
   where confirm_token_hashes @> array[repeat('9', 64)] and status = 'pending';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Second token confirmed again'; end if;

  -- Auf einer bestätigten Zeile ändert sich nichts mehr außer durch die Abmeldung.
  begin update mailing.subscriptions set consent_version = 'v3' where email_hash = h1; raise exception 'Consent version of a confirmed subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set confirmed_at = now() - interval '9 hours' where email_hash = h1; raise exception 'confirmed_at of a confirmed subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set lang = 'fr' where email_hash = h1; raise exception 'Language of a confirmed subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set unsubscribed_at = now() where email_hash = h1; raise exception 'unsubscribed_at set on a confirmed subscription'; exception when check_violation then null; end;
  begin update mailing.subscriptions set updated_at = now() + interval '3 hours' where email_hash = h1; raise exception 'Confirmed subscription was touched'; exception when check_violation then null; end;
  begin update mailing.subscriptions set status = 'pending', confirmed_at = null, confirm_token_hashes = array[repeat('8', 64)] where email_hash = h1; raise exception 'Confirmed subscription went back to pending'; exception when check_violation then null; end;
  begin update mailing.subscriptions set confirm_token_hashes = array[repeat('8', 64)] where email_hash = h1; raise exception 'Confirmed subscription kept a confirmation token'; exception when check_violation then null; end;
  begin
    delete from mailing.subscriptions where email_hash = h1;
    raise exception 'Confirmed subscription was deleted';
  exception when check_violation then null;
  end;

  -- Abmeldekennzeichen wie issueUnsubscribeToken: eines je Prüfsumme, nie ersetzt, nicht änderbar, nicht löschbar.
  insert into mailing.unsubscribe_tokens(email_hash, token, created_at) values (h1, repeat('U', 43), now() - interval '9 years') on conflict (email_hash) do nothing;
  insert into mailing.unsubscribe_tokens(email_hash, token) values (h1, repeat('V', 43)) on conflict (email_hash) do nothing;
  get diagnostics n = row_count;
  if n <> 0 or (select token from mailing.unsubscribe_tokens where email_hash = h1) <> repeat('U', 43) then
    raise exception 'Second unsubscribe token replaced the first';
  end if;
  if (select created_at from mailing.unsubscribe_tokens where email_hash = h1) <> now() then raise exception 'Caller-supplied token time was kept'; end if;
  begin insert into mailing.unsubscribe_tokens(email_hash, token) values (h2, repeat('U', 43)); raise exception 'Same unsubscribe token for two addresses accepted'; exception when unique_violation then null; end;
  begin insert into mailing.unsubscribe_tokens(email_hash, token) values (h2, 'kurz'); raise exception 'Malformed unsubscribe token accepted'; exception when check_violation then null; end;
  begin update mailing.unsubscribe_tokens set token = repeat('W', 43) where email_hash = h1; raise exception 'service_role rewrote an unsubscribe token'; exception when insufficient_privilege then null; end;
  begin delete from mailing.unsubscribe_tokens where email_hash = h1; raise exception 'service_role deleted an unsubscribe token'; exception when insufficient_privilege then null; end;

  -- Abmelden wie unsubscribeByToken: erst die Sperre, dann der Zustand; danach endgültig.
  insert into mailing.suppressions(email_hash, reason, created_at) values (h1, 'unsubscribe', now() - interval '9 years') on conflict (email_hash) do nothing;
  insert into mailing.suppressions(email_hash, reason) values (h1, 'manual') on conflict (email_hash) do nothing;
  if (select reason from mailing.suppressions where email_hash = h1) <> 'unsubscribe' then
    raise exception 'Second suppression overwrote the first reason';
  end if;
  if (select created_at from mailing.suppressions where email_hash = h1) <> now() then raise exception 'Caller-supplied suppression time was kept'; end if;
  begin update mailing.subscriptions set status = 'unsubscribed', unsubscribed_at = now(), confirmed_at = null where email_hash = h1; raise exception 'Unsubscribe erased the confirmation time'; exception when check_violation then null; end;
  update mailing.subscriptions set status = 'unsubscribed', unsubscribed_at = now() - interval '5 days', confirm_token_hashes = '{}', updated_at = now()
   where email_hash = h1 and status = 'confirmed';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Unsubscribe did not change the row'; end if;
  select * into before_row from mailing.subscriptions where email_hash = h1;
  if before_row.unsubscribed_at <> now() or before_row.confirmed_at <> now() or before_row.email <> a1 then
    raise exception 'Unsubscribe kept a caller-supplied time or changed the proof of the earlier consent';
  end if;
  -- Eine abgemeldete Zeile ändert sich gar nicht mehr.
  begin update mailing.subscriptions set status = 'confirmed', unsubscribed_at = null where email_hash = h1; raise exception 'Unsubscribed subscription was reactivated'; exception when check_violation then null; end;
  begin update mailing.subscriptions set unsubscribed_at = now() + interval '9 hours' where email_hash = h1; raise exception 'unsubscribed_at was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set lang = 'en' where email_hash = h1; raise exception 'Language of an unsubscribed subscription was rewritten'; exception when check_violation then null; end;
  begin update mailing.subscriptions set updated_at = now() + interval '9 hours' where email_hash = h1; raise exception 'Unsubscribed subscription was touched'; exception when check_violation then null; end;
  begin
    delete from mailing.subscriptions where email_hash = h1;
    raise exception 'Unsubscribed subscription was deleted';
  exception when check_violation then null;
  end;
  -- B3: Die Sperre einer nie bestätigten Adresse löscht die Zeile; auf der Sperrliste bleibt nur die Prüfsumme.
  delete from mailing.subscriptions where email_hash = h2 and status = 'pending';
  get diagnostics n = row_count;
  if n <> 1 or not exists (select 1 from mailing.suppressions where email_hash = h2) then
    raise exception 'Blocking a never-confirmed address did not remove its row';
  end if;

  -- Sperrliste: unbekannter Grund abgelehnt; ändern und löschen sind dem Dienst nicht erlaubt.
  begin
    insert into mailing.suppressions(email_hash, reason) values (repeat('7', 64), 'erfunden');
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

  -- Verlauf: anfügen ja, ändern und löschen nein; der Eingangszeitpunkt ist die Uhr der Datenbank.
  insert into mailing.consent_events(email_hash, type, consent_version, source, occurred_at, created_at) values (h1, 'requested', 'v1', 'preise/checkliste', t0, t0 - interval '9 years');
  if (select created_at from mailing.consent_events where email_hash = h1) <> now() then raise exception 'Caller-supplied event time was kept'; end if;
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
  perform mailing_fixture.pending('neu@b.invalid', repeat('b', 64), interval '200 hours');
  -- N-A2: Ein Dienst mit vorgehender Uhr bietet auch die noch gültige Zeile zum Löschen an. Die Datenbank lässt sie
  -- nach ihrer eigenen Uhr stehen, ohne Fehler, und löscht nur die tatsächlich verfallene.
  delete from mailing.subscriptions where status = 'pending' and email = 'neu@b.invalid' and confirm_expires_at < now() + interval '5000 hours';
  get diagnostics n = row_count;
  if n <> 0 or not exists (select 1 from mailing.subscriptions where email = 'neu@b.invalid') then
    raise exception 'A still valid pending subscription was deleted by a caller with a fast clock';
  end if;
  delete from mailing.subscriptions where status = 'pending' and confirm_expires_at < now() + interval '5000 hours';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Purge removed % rows instead of 1', n; end if;
  if (select array_agg(email order by email) from mailing.subscriptions) <> array['a@b.invalid', 'neu@b.invalid'] then
    raise exception 'Purge removed the wrong rows';
  end if;
  -- B1: Das Abmeldekennzeichen hängt nicht an der Anmeldung. Es bleibt, wenn die Anmeldung verfällt und gelöscht wird.
  insert into mailing.unsubscribe_tokens(email_hash, token) values (mailing_fixture.h('alt@b.invalid'), repeat('X', 43));
  if not exists (select 1 from mailing.unsubscribe_tokens t where t.token = repeat('X', 43))
     or exists (select 1 from mailing.subscriptions where email = 'alt@b.invalid') then
    raise exception 'Unsubscribe token did not survive the purge of its subscription';
  end if;
  -- Die Obergrenzen kann der Dienst nur lesen.
  begin update mailing.settings set daily_limit = 10000; raise exception 'service_role raised the settings'; exception when insufficient_privilege then null; end;
  begin delete from mailing.settings; raise exception 'service_role deleted the settings'; exception when insufficient_privilege then null; end;
end $$;

-- Mailzählung. Grenze je Adresse im Fenster, Tagesgrenze, Grenzen für Versuche; Uhr und Obergrenzen der Datenbank.
do $$
declare
  n int;
  ha text := mailing_fixture.h('zaehlung@b.invalid');
  hb text := mailing_fixture.h('versuche@b.invalid');
  i int;
begin
  -- Formprüfungen: Grenzwerte außerhalb ihres Bereichs (0, zu groß) entstehen gar nicht erst.
  begin insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (ha, 0, 168, 50, 9, 150); raise exception 'address_limit 0 accepted'; exception when check_violation then null; end;
  begin insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (ha, 11, 168, 50, 9, 150); raise exception 'address_limit 11 accepted'; exception when check_violation then null; end;
  begin insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (ha, 3, 0, 50, 9, 150); raise exception 'window 0 accepted'; exception when check_violation then null; end;
  begin insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (ha, 3, 168, 0, 9, 150); raise exception 'daily_limit 0 accepted'; exception when check_violation then null; end;
  begin insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (ha, 3, 168, 50, 0, 150); raise exception 'address_attempt_limit 0 accepted'; exception when check_violation then null; end;
  begin insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (ha, 3, 168, 50, 9, 0); raise exception 'daily_attempt_limit 0 accepted'; exception when check_violation then null; end;
  begin insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (ha, null, 168, 50, 9, 150); raise exception 'missing address_limit accepted'; exception when check_violation then null; end;
  begin insert into mailing.confirmation_mails(email_hash, state, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (ha, 'sent', 3, 168, 50, 9, 150); raise exception 'Entry inserted as already sent'; exception when check_violation then null; end;

  -- Drei Mails je Adresse in 168 Stunden; die vierte entsteht nicht (keine Zeile, kein Fehler). Zwischen den Einträgen
  -- vergehen jeweils 49 Stunden: Die Anmeldung dazu wäre jedes Mal verfallen. Die Zählung nicht.
  for i in 1..3 loop
    insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (ha, 3, 168, 50, 9, 150);
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'Reservation % was refused', i; end if;
    perform mailing_fixture.age_mails(interval '49 hours');
  end loop;
  insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (ha, 3, 168, 50, 9, 150);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Fourth confirmation mail within the window was admitted'; end if;
  if (select count(*) from mailing.subscriptions where email_hash = ha) <> 0 then raise exception 'Count depends on a subscription row'; end if;
  -- B7: Die Zählung vertraut weder der Uhr noch den Grenzwerten des Aufrufers.
  insert into mailing.confirmation_mails(email_hash, reserved_at, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (ha, now() + interval '8 days', 3, 168, 50, 9, 150);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Entry dated 8 days ahead slipped past the window'; end if;
  insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (ha, 10, 168, 50, 9, 150);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Caller raised the address limit to 10'; end if;
  insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (ha, 3, 1, 50, 9, 150);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Caller shortened the window to one hour'; end if;
  -- Nach Ablauf des Fensters der ersten (3 × 49 + 22 = 169 Stunden) ist wieder ein Platz frei; in der Zeile steht, was galt.
  perform mailing_fixture.age_mails(interval '22 hours');
  insert into mailing.confirmation_mails(email_hash, reserved_at, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (ha, now() - interval '300 days', 10, 1, 10000, 100, 100000);
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Reservation after the window was refused'; end if;
  if not exists (select 1 from mailing.confirmation_mails where email_hash = ha and reserved_at = now() and (address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) = (3, 168, 50, 9, 150)) then
    raise exception 'Entry kept the caller''s clock or limits instead of the database''s';
  end if;

  -- M3: Ein gescheiterter Versand zählt nicht als Mail; ein Eintrag wird genau einmal abgeschlossen.
  update mailing.confirmation_mails set state = 'failed' where email_hash = ha and reserved_at = now() and state = 'reserved';
  insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (ha, 3, 168, 50, 9, 150);
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Failed delivery still consumed a place'; end if;
  begin update mailing.confirmation_mails set state = 'sent', reserved_at = now() - interval '1 year' where email_hash = ha and state = 'reserved'; raise exception 'Entry was moved out of its window'; exception when check_violation then null; end;
  begin update mailing.confirmation_mails set state = 'sent', email_hash = mailing_fixture.h('x@y.invalid') where email_hash = ha and state = 'reserved'; raise exception 'Entry was moved to another address'; exception when check_violation then null; end;
  begin update mailing.confirmation_mails set state = 'sent', address_limit = 10 where email_hash = ha and state = 'reserved'; raise exception 'Limit of an entry was rewritten'; exception when check_violation then null; end;
  update mailing.confirmation_mails set state = 'sent' where email_hash = ha and state = 'reserved' and reserved_at = now();
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Settling an entry as sent failed'; end if;
  begin update mailing.confirmation_mails set state = 'failed' where email_hash = ha and state = 'sent' and reserved_at = now(); raise exception 'Sent entry was turned into failed'; exception when check_violation then null; end;
  begin update mailing.confirmation_mails set state = 'reserved' where email_hash = ha and state = 'failed'; raise exception 'Failed entry was reopened'; exception when check_violation then null; end;

  -- B11: Versuche einschließlich der gescheiterten sind begrenzt: neun je Adresse im Fenster, auch wenn keine Mail ging.
  for i in 1..9 loop
    insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (hb, 3, 168, 50, 9, 150);
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'Attempt % was refused', i; end if;
    update mailing.confirmation_mails set state = 'failed' where email_hash = hb and state = 'reserved';
  end loop;
  insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (hb, 3, 168, 50, 9, 150);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Tenth attempt after nine failures was admitted'; end if;
  insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (hb, 3, 168, 50, 100, 150);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Caller raised the attempt limit'; end if;

  -- Tagesgrenze über alle Adressen. Der Aufrufer darf strenger sein als die Obergrenze (5 statt 50): die sechste
  -- entsteht nicht; einen Tag später wieder.
  perform mailing_fixture.age_mails(interval '400 hours');
  for i in 1..5 loop
    insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (mailing_fixture.h('tag' || i || '@b.invalid'), 3, 168, 5, 9, 150);
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'Daily reservation % was refused', i; end if;
  end loop;
  perform mailing_fixture.age_mails(interval '23 hours');
  insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (mailing_fixture.h('tag6@b.invalid'), 3, 168, 5, 9, 150);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Sixth confirmation mail within 24 hours was admitted'; end if;
  perform mailing_fixture.age_mails(interval '61 minutes');
  insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (mailing_fixture.h('tag6@b.invalid'), 3, 168, 5, 9, 150);
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Reservation after 24 hours was refused'; end if;
  -- B7: Die Obergrenze der Datenbank (50 je Tag) gilt, auch wenn der Aufrufer 10000 behauptet.
  perform mailing_fixture.age_mails(interval '25 hours');
  for i in 1..60 loop
    insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (mailing_fixture.h('viele' || i || '@b.invalid'), 3, 168, 10000, 9, 100000);
  end loop;
  if (select count(*) from mailing.confirmation_mails where reserved_at = now()) <> 50 then
    raise exception 'Daily cap of the database was exceeded: %', (select count(*) from mailing.confirmation_mails where reserved_at = now());
  end if;
  -- Versuche je Tag (150 in der Obergrenze): Fehlschläge über viele Adressen enden ebenfalls.
  update mailing.confirmation_mails set state = 'failed' where state = 'reserved' and reserved_at = now();
  for i in 1..120 loop
    insert into mailing.confirmation_mails(email_hash, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit) values (mailing_fixture.h('stoerung' || i || '@b.invalid'), 3, 168, 10000, 9, 100000);
    update mailing.confirmation_mails set state = 'failed' where state = 'reserved' and reserved_at = now();
  end loop;
  if (select count(*) from mailing.confirmation_mails where reserved_at = now()) <> 150 then
    raise exception 'Daily attempt cap was not enforced: %', (select count(*) from mailing.confirmation_mails where reserved_at = now());
  end if;

  -- Aufräumen wie purgeSettledMails: Was nach der Uhr der Datenbank noch zählt, bleibt ohne Fehler stehen, auch wenn
  -- der Dienst mit vorgehender Uhr alles zum Löschen anbietet.
  select count(*) into i from mailing.confirmation_mails where reserved_at > now() - interval '168 hours';
  delete from mailing.confirmation_mails where reserved_at < now() + interval '1000 hours';
  if (select count(*) from mailing.confirmation_mails) <> i or exists (select 1 from mailing.confirmation_mails where reserved_at <= now() - interval '168 hours') then
    raise exception 'Purge of the mail count did not remove exactly the expired rows';
  end if;
end $$;
reset role;
rollback;
drop schema mailing cascade;

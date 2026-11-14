-- NeXify Einwilligungsweg für Werbemails · Schema "mailing" · Migration 0005
-- Self-hosted Supabase (OSS). NUR Migrationsdatei — NICHT automatisch gegen eine Live-DB pushen.
-- Anwenden (durch Pascal, bewusst): psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 0005_mailing_consent.sql
-- Unabhängig von den Migrationen 0001 bis 0004 (eigenes Schema, keine Fremdschlüssel). Darf mehrfach laufen.
-- Die Datei ist EINE Transaktion (begin … commit): Scheitert eine Anweisung, entsteht nichts, auch ohne
-- ON_ERROR_STOP; und ein erneuter Lauf gegen eine Instanz in Betrieb hat kein Fenster ohne Sperren.
--
-- PostgREST muss das Schema ausliefern:  PGRST_DB_SCHEMAS="public,chat,composio,mailing"
-- Zugriff nur serverseitig mit Service-Role (apps/web/mailing/consent-store.ts über lib/supabase-rest.ts).
--
-- Hält genau das, was das Interface `MailingConsentStore` hält:
--   subscriptions       Anmeldungen mit Einwilligungsnachweis (Zeitpunkte, Fassung und Prüfsumme des Wortlauts, Quelle)
--   suppressions        Sperrliste für Werbung, nur Prüfsumme der Adresse und Grund
--   consent_events      Verlauf je Adresse (angefragt, bestätigt, abgemeldet), nur Anfügen
--   unsubscribe_tokens  Abmeldekennzeichen je Adress-Prüfsumme (überlebt den Verfall der Anmeldung, ohne Adresse)
--   confirmation_mails  Zählung der Bestätigungsmails je Adress-Prüfsumme und je Tag (überlebt den Verfall der Anmeldung)
--   settings            Obergrenzen der Zählung, die der Dienst nur lesen kann
-- Zeitpunkte setzt die Datenbank mit ihrer eigenen Uhr; was der Dienst dafür mitschickt, wird überschrieben.
-- Register: OA-003 (Nachweis nach Art. 7 Abs. 1 DSGVO), Voraussetzungen A-5, S-1 bis S-4 in
-- docs/05-marketing/mailing/voraussetzungen-vor-dem-ersten-versand.md.
--
-- Grenze dieser Sperren: Sie binden den Dienst (Rolle service_role). Der Besitzer der Tabellen und ein
-- Superuser können Trigger abschalten und Tabellen leeren (TRUNCATE); das ist Betrieb der Instanz, nicht der Dienst.

begin;

-- Die Prüfungen auf Steuerzeichen und auf den Zusammenhang von Adresse und Prüfsumme setzen UTF8 voraus
-- (Standard jeder Supabase-Instanz). In einer anders kodierten Datenbank wird nichts angelegt.
do $$
begin
  if current_setting('server_encoding') <> 'UTF8' then
    raise exception 'Migration 0005 verlangt eine Datenbank in UTF8, gefunden: %', current_setting('server_encoding');
  end if;
end $$;

create schema if not exists mailing;

-- --------------------------------------------------------------------------
-- Anmeldungen. Schlüssel ist die SHA-256-Prüfsumme der Adresse, wie sie in der Zeile steht (in der Tabelle
-- erzwungen). Die Adresse steht ohne Rand, ohne Steuer- und unsichtbare Zeichen und ohne ASCII-Großbuchstaben da
-- (ebenfalls erzwungen). Weitergehende Kleinschreibung (Umlaute und andere Schriften) leistet nur der Dienst
-- (`toLowerCase`); die Datenbank prüft sie nicht, weil ihr Ergebnis von der Sortierung der Instanz abhinge.
-- pending      = angefragt, Bestätigung steht aus (verfällt zu confirm_expires_at)
-- confirmed    = per Bestätigungsmail bestätigt; nur diese Zeilen sind eine Einwilligung
-- unsubscribed = nach einer Bestätigung abgemeldet; kehrt nie in einen anderen Zustand zurück
-- Eine nie bestätigte Anmeldung wird nicht "abgemeldet", sondern gelöscht: Für die Sperre genügt die Prüfsumme auf
-- der Sperrliste, die Adresse einer Person, die nie eingewilligt hat, bleibt nicht stehen.
--
-- Was beim Anlegen feststeht, steht für immer fest: Adresse, Sprache, Quelle, Fassung und Prüfsumme des Wortlauts,
-- Zeitpunkt der Anfrage und Ablauf der Frist. Eine weitere Anfrage zur selben Adresse (auch durch Dritte) fügt nur
-- ein weiteres Bestätigungskennzeichen an; frühere Kennzeichen bleiben bis zum Ablauf gültig.
-- --------------------------------------------------------------------------
create table if not exists mailing.subscriptions (
  email_hash           text primary key check (email_hash ~ '^[0-9a-f]{64}$'),
  email                text not null check (length(email) between 6 and 254 and email = btrim(email)
                                             and email !~ '[\u0001-\u001f\u007f-\u009f]'
                                             and email !~ '[\u00ad\u061c\u180e\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff9-\ufffb]'
                                             and email !~ '[A-Z]'),
  lang                 text not null check (lang in ('de','nl','fr','en')),
  status               text not null check (status in ('pending','confirmed','unsubscribed')),
  source               text not null check (source ~ '^[a-z0-9/_-]{1,64}$'),
  consent_version      text not null check (consent_version ~ '^[A-Za-z0-9._-]{1,64}$'),
  consent_text_sha256  text not null check (consent_text_sha256 ~ '^[0-9a-f]{64}$'),
  requested_at         timestamptz not null,
  confirm_expires_at   timestamptz not null,
  confirmed_at         timestamptz,
  unsubscribed_at      timestamptz,
  confirm_token_hashes text[] not null default '{}',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint subscriptions_hash_matches_email check (email_hash = encode(sha256(convert_to(email, 'UTF8')), 'hex')),
  constraint subscriptions_deadline_bounded check (confirm_expires_at > requested_at and confirm_expires_at <= requested_at + interval '14 days'),
  constraint subscriptions_pending_has_token check (status <> 'pending' or cardinality(confirm_token_hashes) between 1 and 8),
  constraint subscriptions_token_only_pending check (status = 'pending' or cardinality(confirm_token_hashes) = 0),
  constraint subscriptions_token_form check (
    cardinality(confirm_token_hashes) = 0
    or (array_ndims(confirm_token_hashes) = 1
        and array_position(confirm_token_hashes, null) is null
        and array_to_string(confirm_token_hashes, ',') ~ '^[0-9a-f]{64}(,[0-9a-f]{64})*$')),
  constraint subscriptions_pending_has_no_outcome check (status <> 'pending' or (confirmed_at is null and unsubscribed_at is null)),
  constraint subscriptions_confirmed_has_time check (status <> 'confirmed' or (confirmed_at is not null and unsubscribed_at is null)),
  constraint subscriptions_unsubscribed_has_time check (status <> 'unsubscribed' or (unsubscribed_at is not null and confirmed_at is not null))
);
create index if not exists subscriptions_pending_expiry_idx on mailing.subscriptions(confirm_expires_at) where status = 'pending';
create index if not exists subscriptions_status_idx on mailing.subscriptions(status);
create index if not exists subscriptions_confirm_tokens_idx on mailing.subscriptions using gin (confirm_token_hashes);

-- --------------------------------------------------------------------------
-- Sperrliste für Werbung. Speichert nur, was zum Sperren nötig ist: Prüfsumme und Grund.
-- Der Dienst darf nur lesen und anfügen (Rechte unten); ein Eintrag wird nicht geändert oder gelöscht.
-- --------------------------------------------------------------------------
create table if not exists mailing.suppressions (
  email_hash text primary key check (email_hash ~ '^[0-9a-f]{64}$'),
  reason     text not null check (reason in ('unsubscribe','objection','hard_bounce','complaint','manual')),
  created_at timestamptz not null default now()
);

-- Sperre und Bestätigung derselben Adresse laufen nacheinander: Beide nehmen dieselbe Sperre je Prüfsumme. Eine
-- Sperre, die gerade eingetragen wird, ist damit für eine gleichzeitige Bestätigung sichtbar, bevor diese entscheidet.
create or replace function mailing.guard_suppression_insert()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('mailing.suppression:' || new.email_hash, 0));
  new.created_at := now();
  return new;
end $$;

drop trigger if exists suppressions_guard_insert on mailing.suppressions;
create trigger suppressions_guard_insert before insert on mailing.suppressions
  for each row execute function mailing.guard_suppression_insert();

-- --------------------------------------------------------------------------
-- Abmeldekennzeichen je Adress-Prüfsumme. Steht als Sperrlink in jeder Bestätigungsmail und später in jeder
-- Werbemail. Hängt nicht an der Anmeldung: Wer die Mail erst nach dem Verfall liest, kann seine Adresse weiterhin
-- sperren. Enthält keine Adresse. Der Dienst darf nur lesen und anfügen; ein Kennzeichen wird nie ersetzt.
-- --------------------------------------------------------------------------
create table if not exists mailing.unsubscribe_tokens (
  email_hash text primary key check (email_hash ~ '^[0-9a-f]{64}$'),
  token      text not null unique check (token ~ '^[A-Za-z0-9_-]{43}$'),
  created_at timestamptz not null default now()
);

create or replace function mailing.stamp_created_at()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  new.created_at := now();
  return new;
end $$;

drop trigger if exists unsubscribe_tokens_stamp on mailing.unsubscribe_tokens;
create trigger unsubscribe_tokens_stamp before insert on mailing.unsubscribe_tokens
  for each row execute function mailing.stamp_created_at();

-- Eine Anmeldung entsteht nur unbestätigt. Ein direkt eingefügter "Nachweis" ist keiner.
-- Zeitpunkt der Anfrage ist die Uhr der Datenbank; die Frist muss von dort aus in der Zukunft liegen.
create or replace function mailing.guard_subscription_insert()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if new.status <> 'pending' or new.confirmed_at is not null or new.unsubscribed_at is not null then
    raise exception 'subscription_insert_only_pending' using errcode = '23514';
  end if;
  -- Die Dauer der Frist bestimmt der Dienst (Konfiguration), ihren Beginn die Datenbank.
  new.confirm_expires_at := now() + (new.confirm_expires_at - new.requested_at);
  new.requested_at := now();
  new.created_at := now();
  new.updated_at := now();
  if exists (select 1 from mailing.subscriptions s
             where s.email_hash <> new.email_hash and s.confirm_token_hashes && new.confirm_token_hashes) then
    raise exception 'subscription_confirm_token_in_use' using errcode = '23505';
  end if;
  return new;
end $$;

drop trigger if exists subscriptions_guard_insert on mailing.subscriptions;
create trigger subscriptions_guard_insert before insert on mailing.subscriptions
  for each row execute function mailing.guard_subscription_insert();

-- Der Speicher schreibt per PATCH mit Filter; ohne diese Sperre könnte ein Schreibfehler eine Abmeldung aufheben,
-- einen Nachweis verändern oder im selben Schritt bestätigen und umschreiben.
--   Zustand:  pending -> confirmed -> unsubscribed, sonst nichts. Eine nie bestätigte Zeile wird gelöscht, nicht abgemeldet.
--   Nachweis: in jedem Zustand unveränderlich (siehe Tabelle oben).
--   Bestätigung: nur innerhalb der Frist (Uhr der Datenbank) und nur, wenn die Adresse nicht auf der Sperrliste steht.
--   Zeitpunkte der Bestätigung und der Abmeldung setzt die Datenbank.
--   Bestätigte Zeilen ändern sich nur noch durch die Abmeldung, abgemeldete gar nicht mehr.
create or replace function mailing.guard_subscription_update()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if new.email_hash is distinct from old.email_hash then
    raise exception 'subscription_identity_immutable' using errcode = '23514';
  end if;
  if new.email is distinct from old.email
     or new.lang is distinct from old.lang
     or new.source is distinct from old.source
     or new.consent_version is distinct from old.consent_version
     or new.consent_text_sha256 is distinct from old.consent_text_sha256
     or new.requested_at is distinct from old.requested_at
     or new.confirm_expires_at is distinct from old.confirm_expires_at
     or new.created_at is distinct from old.created_at then
    raise exception 'subscription_proof_immutable' using errcode = '23514';
  end if;
  if old.status = 'unsubscribed' then
    if new is distinct from old then
      raise exception 'subscription_unsubscribe_final' using errcode = '23514';
    end if;
    return new;
  end if;
  -- pending -> unsubscribed schließt die Formprüfung der Tabelle aus (abgemeldet heißt: vorher bestätigt).
  if new.status = 'pending' and old.status <> 'pending' then
    raise exception 'subscription_status_forward_only' using errcode = '23514';
  end if;

  if old.status = 'pending' and new.status = 'confirmed' then
    if now() >= old.confirm_expires_at then
      raise exception 'subscription_confirm_outside_deadline' using errcode = '23514';
    end if;
    -- Erst die Sperre je Prüfsumme, dann der Blick auf die Sperrliste: Eine gleichzeitig eingetragene Sperre ist
    -- dann abgeschlossen und sichtbar.
    perform pg_advisory_xact_lock(hashtextextended('mailing.suppression:' || old.email_hash, 0));
    if exists (select 1 from mailing.suppressions s where s.email_hash = old.email_hash) then
      raise exception 'subscription_confirm_suppressed' using errcode = '23514';
    end if;
    new.confirmed_at := now();
  elsif new.confirmed_at is distinct from old.confirmed_at then
    raise exception 'subscription_proof_immutable' using errcode = '23514';
  end if;

  if old.status = 'confirmed' and new.status = 'unsubscribed' then
    new.unsubscribed_at := now();
  end if;

  if old.status = 'confirmed' and new.status = 'confirmed' and new is distinct from old then
    raise exception 'subscription_proof_immutable' using errcode = '23514';
  end if;

  if new.status = 'pending' and new.confirm_token_hashes is distinct from old.confirm_token_hashes
     and exists (select 1 from mailing.subscriptions s
                 where s.email_hash <> old.email_hash and s.confirm_token_hashes && new.confirm_token_hashes) then
    raise exception 'subscription_confirm_token_in_use' using errcode = '23505';
  end if;
  return new;
end $$;

drop trigger if exists subscriptions_guard_update on mailing.subscriptions;
create trigger subscriptions_guard_update before update on mailing.subscriptions
  for each row execute function mailing.guard_subscription_update();

-- Gelöscht werden dürfen nur unbestätigte Anmeldungen (Verfall nach der Frist). Ein Nachweis und eine
-- Abmeldung bleiben stehen, bis der Inhaber Aufbewahrungsfristen festgelegt hat.
create or replace function mailing.guard_subscription_delete()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if old.status <> 'pending' then
    raise exception 'subscription_delete_only_pending' using errcode = '23514';
  end if;
  return old;
end $$;

drop trigger if exists subscriptions_guard_delete on mailing.subscriptions;
create trigger subscriptions_guard_delete before delete on mailing.subscriptions
  for each row execute function mailing.guard_subscription_delete();

-- --------------------------------------------------------------------------
-- Verlauf je Adresse. Nur Anfügen. Enthält weder Adresse noch Kennzeichen.
-- --------------------------------------------------------------------------
create table if not exists mailing.consent_events (
  id              bigint generated always as identity primary key,
  email_hash      text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  type            text not null check (type in ('requested','confirmation_resent','confirmed','unsubscribed')),
  consent_version text not null default '' check (length(consent_version) <= 64),
  source          text not null default '' check (length(source) <= 64),
  occurred_at     timestamptz not null,
  created_at      timestamptz not null default now()
);
create index if not exists consent_events_hash_idx on mailing.consent_events(email_hash, occurred_at, id);

drop trigger if exists consent_events_stamp on mailing.consent_events;
create trigger consent_events_stamp before insert on mailing.consent_events
  for each row execute function mailing.stamp_created_at();

-- --------------------------------------------------------------------------
-- Obergrenzen der Zählung. Genau eine Zeile. Der Dienst kann sie nur lesen; ändern kann sie, wer die Datenbank
-- besitzt (der Inhaber, bewusst, per SQL). Die Werte hier sind dieselben Vorschläge wie unter `grenzen` in
-- config/integrations/mailing-consent.json. Es gilt je Grenze der strengere der beiden Werte: Ein fehlerhaft
-- konfigurierter oder fehlerhafter Dienst kann die Grenzen so nicht anheben.
-- --------------------------------------------------------------------------
create table if not exists mailing.settings (
  id                    boolean primary key default true check (id),
  address_limit         integer not null check (address_limit between 1 and 10),
  address_window_hours  integer not null check (address_window_hours between 1 and 8760),
  daily_limit           integer not null check (daily_limit between 1 and 10000),
  address_attempt_limit integer not null check (address_attempt_limit between 1 and 100),
  daily_attempt_limit   integer not null check (daily_attempt_limit between 1 and 100000)
);
insert into mailing.settings (id, address_limit, address_window_hours, daily_limit, address_attempt_limit, daily_attempt_limit)
values (true, 3, 168, 50, 9, 150)
on conflict (id) do nothing;

-- --------------------------------------------------------------------------
-- Zählung der Bestätigungsmails. Schützt fremde Postfächer und das gemeinsam genutzte Versandkonto:
--   je Adress-Prüfsumme höchstens `address_limit` Mails in `address_window_hours` Stunden,
--   insgesamt höchstens `daily_limit` Mails in 24 Stunden,
--   und Versuche einschließlich der gescheiterten: `address_attempt_limit` je Adresse im Fenster,
--   `daily_attempt_limit` insgesamt in 24 Stunden (ein gestörter Versanddienst wird nicht endlos bestürmt).
-- Die Zählung hängt nicht an der Anmeldung und überlebt deren Verfall. Der Dienst schickt die Grenzwerte aus seiner
-- Konfiguration mit; die Datenbank nimmt je Grenze den strengeren aus diesem Wert und `mailing.settings`, setzt den
-- Zeitpunkt mit ihrer eigenen Uhr und entscheidet unter einer Sperre, ob die Zeile entsteht. Von gleichzeitigen
-- Aufrufen kommen so nie mehr durch, als die Grenze erlaubt. Eine abgelehnte Zeile entsteht nicht (kein Fehler);
-- der Dienst sendet dann nicht.
--   reserved = vor dem Versand eingetragen     sent = dem Versanddienst übergeben
--   failed   = Versand gescheitert; zählt nicht als Mail, wohl aber als Versuch
-- Enthält weder Adresse noch Kennzeichen.
-- --------------------------------------------------------------------------
create table if not exists mailing.confirmation_mails (
  id                    bigint generated always as identity primary key,
  email_hash            text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  state                 text not null default 'reserved' check (state in ('reserved','sent','failed')),
  reserved_at           timestamptz not null default now(),
  address_limit         integer not null check (address_limit between 1 and 10),
  address_window_hours  integer not null check (address_window_hours between 1 and 8760),
  daily_limit           integer not null check (daily_limit between 1 and 10000),
  address_attempt_limit integer not null check (address_attempt_limit between 1 and 100),
  daily_attempt_limit   integer not null check (daily_attempt_limit between 1 and 100000),
  created_at            timestamptz not null default now()
);
create index if not exists confirmation_mails_hash_idx on mailing.confirmation_mails(email_hash, reserved_at);
create index if not exists confirmation_mails_time_idx on mailing.confirmation_mails(reserved_at);

create or replace function mailing.admit_confirmation_mail()
returns trigger language plpgsql set search_path = pg_catalog as $$
declare
  cap mailing.settings;
  mails integer;
  attempts integer;
begin
  if new.state <> 'reserved' then
    raise exception 'confirmation_mail_insert_only_reserved' using errcode = '23514';
  end if;
  -- Der Trigger läuft vor den Formprüfungen der Tabelle. Ein Grenzwert außerhalb seines Bereichs ist ein Fehler des
  -- Aufrufers und wird als solcher gemeldet, nicht still als "Grenze erreicht" behandelt.
  -- Ein fehlender Wert ist ebenfalls ein Fehler und wird nicht still durch die Obergrenze ersetzt.
  if not coalesce(new.address_limit between 1 and 10 and new.address_window_hours between 1 and 8760 and new.daily_limit between 1 and 10000
                  and new.address_attempt_limit between 1 and 100 and new.daily_attempt_limit between 1 and 100000, false) then
    raise exception 'confirmation_mail_limit_out_of_range' using errcode = '23514';
  end if;
  select * into cap from mailing.settings where id;
  if not found then
    raise exception 'confirmation_mail_settings_missing' using errcode = '23514';
  end if;
  -- Je Grenze der strengere Wert; in der Zeile steht, was tatsächlich galt. Zeitpunkt: die Uhr der Datenbank.
  new.address_limit := least(new.address_limit, cap.address_limit);
  new.address_window_hours := greatest(new.address_window_hours, cap.address_window_hours);
  new.daily_limit := least(new.daily_limit, cap.daily_limit);
  new.address_attempt_limit := least(new.address_attempt_limit, cap.address_attempt_limit);
  new.daily_attempt_limit := least(new.daily_attempt_limit, cap.daily_attempt_limit);
  new.reserved_at := now();
  new.created_at := now();
  -- Eine Sperre für alle Einträge: zählen und eintragen sind zusammen ein Schritt.
  perform pg_advisory_xact_lock(hashtext('mailing.confirmation_mails'));
  select count(*) filter (where m.state <> 'failed'), count(*) into mails, attempts from mailing.confirmation_mails m
   where m.email_hash = new.email_hash
     and m.reserved_at > new.reserved_at - make_interval(hours => new.address_window_hours);
  if mails >= new.address_limit or attempts >= new.address_attempt_limit then
    return null;
  end if;
  select count(*) filter (where m.state <> 'failed'), count(*) into mails, attempts from mailing.confirmation_mails m
   where m.reserved_at > new.reserved_at - interval '24 hours';
  if mails >= new.daily_limit or attempts >= new.daily_attempt_limit then
    return null;
  end if;
  return new;
end $$;

drop trigger if exists confirmation_mails_admit on mailing.confirmation_mails;
create trigger confirmation_mails_admit before insert on mailing.confirmation_mails
  for each row execute function mailing.admit_confirmation_mail();

-- Ein Eintrag wechselt genau einmal von reserved nach sent oder failed; sonst ändert sich nichts an ihm.
create or replace function mailing.guard_confirmation_mail_update()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if old.state <> 'reserved' or new.state not in ('sent','failed')
     or new.id is distinct from old.id
     or new.email_hash is distinct from old.email_hash
     or new.reserved_at is distinct from old.reserved_at
     or new.address_limit is distinct from old.address_limit
     or new.address_window_hours is distinct from old.address_window_hours
     or new.daily_limit is distinct from old.daily_limit
     or new.address_attempt_limit is distinct from old.address_attempt_limit
     or new.daily_attempt_limit is distinct from old.daily_attempt_limit
     or new.created_at is distinct from old.created_at then
    raise exception 'confirmation_mail_settle_once' using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists confirmation_mails_guard_update on mailing.confirmation_mails;
create trigger confirmation_mails_guard_update before update on mailing.confirmation_mails
  for each row execute function mailing.guard_confirmation_mail_update();

-- Gelöscht wird ein Eintrag erst, wenn er für keine Grenze mehr zählt (Uhr der Datenbank, nicht des Dienstes).
-- Ein Eintrag, der noch zählt, bleibt beim Aufräumen einfach stehen (kein Fehler): So kann ein Aufräumlauf mit
-- vorgehender Uhr oder mit inzwischen verkürztem Fenster die Zählung nicht verkürzen und die Anmeldung nicht blockieren.
create or replace function mailing.guard_confirmation_mail_delete()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if old.reserved_at > now() - make_interval(hours => greatest(old.address_window_hours, 24)) then
    return null;
  end if;
  return old;
end $$;

drop trigger if exists confirmation_mails_guard_delete on mailing.confirmation_mails;
create trigger confirmation_mails_guard_delete before delete on mailing.confirmation_mails
  for each row execute function mailing.guard_confirmation_mail_delete();

-- --------------------------------------------------------------------------
-- Row-Level Security: deny-by-default, wie in den Schemas "chat" und "composio".
-- Keine Richtlinie für anon/authenticated => Direktzugriff gesperrt.
-- Das Schema selbst ist nur für service_role benutzbar: PostgREST 12.2.3 liefert es für service_role auch dann
-- aus, wenn anon und authenticated kein USAGE haben (geprüft mit apps/web/supabase/tests/mailing_consent_postgrest.mjs).
-- --------------------------------------------------------------------------
alter table mailing.subscriptions      enable row level security;
alter table mailing.suppressions       enable row level security;
alter table mailing.consent_events     enable row level security;
alter table mailing.confirmation_mails enable row level security;
alter table mailing.unsubscribe_tokens enable row level security;
alter table mailing.settings           enable row level security;

revoke all on schema mailing from public, anon, authenticated;
grant usage on schema mailing to service_role;
revoke all on all tables in schema mailing from public, anon, authenticated, service_role;
revoke all on all sequences in schema mailing from public, anon, authenticated;
revoke all on all functions in schema mailing from public, anon, authenticated;
grant select, insert, update, delete on mailing.subscriptions to service_role;
grant select, insert on mailing.suppressions to service_role;
grant select, insert on mailing.consent_events to service_role;
grant select, insert, update, delete on mailing.confirmation_mails to service_role;
grant select, insert on mailing.unsubscribe_tokens to service_role;
grant select on mailing.settings to service_role;
grant usage, select on all sequences in schema mailing to service_role;

commit;

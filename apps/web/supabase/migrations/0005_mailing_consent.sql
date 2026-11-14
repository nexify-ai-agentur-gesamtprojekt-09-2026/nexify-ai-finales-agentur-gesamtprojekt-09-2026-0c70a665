-- NeXify Einwilligungsweg für Werbemails · Schema "mailing" · Migration 0005
-- Self-hosted Supabase (OSS). NUR Migrationsdatei — NICHT automatisch gegen eine Live-DB pushen.
-- Anwenden (durch Pascal, bewusst): psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 0005_mailing_consent.sql
-- Unabhängig von den Migrationen 0001 bis 0004 (eigenes Schema, keine Fremdschlüssel). Darf mehrfach laufen.
--
-- PostgREST muss das Schema ausliefern:  PGRST_DB_SCHEMAS="public,chat,composio,mailing"
-- Zugriff nur serverseitig mit Service-Role (apps/web/mailing/consent-store.ts über lib/supabase-rest.ts).
--
-- Hält genau das, was das Interface `MailingConsentStore` hält:
--   subscriptions   Anmeldungen mit Einwilligungsnachweis (Zeitpunkte, Fassung und Prüfsumme des Wortlauts, Quelle)
--   suppressions    Sperrliste für Werbung, nur Prüfsumme der Adresse und Grund
--   consent_events  Verlauf je Adresse (angefragt, bestätigt, abgemeldet), nur Anfügen
-- Register: OA-003 (Nachweis nach Art. 7 Abs. 1 DSGVO), Voraussetzungen A-5, S-1 bis S-4 in
-- docs/05-marketing/mailing/voraussetzungen-vor-dem-ersten-versand.md.

create schema if not exists mailing;

-- --------------------------------------------------------------------------
-- Anmeldungen. Schlüssel ist die SHA-256-Prüfsumme der kleingeschriebenen Adresse.
-- pending      = angefragt, Bestätigung steht aus (verfällt nach der Frist)
-- confirmed    = per Bestätigungsmail bestätigt; nur diese Zeilen sind eine Einwilligung
-- unsubscribed = abgemeldet; kehrt nie in einen anderen Zustand zurück
-- --------------------------------------------------------------------------
create table if not exists mailing.subscriptions (
  email_hash          text primary key check (email_hash ~ '^[0-9a-f]{64}$'),
  email               text not null check (length(email) between 3 and 254),
  lang                text not null check (lang in ('de','nl','fr','en')),
  status              text not null check (status in ('pending','confirmed','unsubscribed')),
  source              text not null check (source ~ '^[a-z0-9/_-]{1,64}$'),
  consent_version     text not null check (length(consent_version) between 1 and 64),
  consent_text_sha256 text not null check (consent_text_sha256 ~ '^[0-9a-f]{64}$'),
  requested_at        timestamptz not null,
  confirmed_at        timestamptz,
  unsubscribed_at     timestamptz,
  confirm_token_hash  text unique check (confirm_token_hash ~ '^[0-9a-f]{64}$'),
  confirm_expires_at  timestamptz,
  confirm_mails_sent  integer not null default 0 check (confirm_mails_sent between 0 and 100),
  unsubscribe_token   text not null unique check (unsubscribe_token ~ '^[A-Za-z0-9_-]{43}$'),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint subscriptions_pending_has_token check (status <> 'pending' or (confirm_token_hash is not null and confirm_expires_at is not null)),
  constraint subscriptions_confirmed_has_time check (status <> 'confirmed' or confirmed_at is not null),
  constraint subscriptions_unsubscribed_has_time check (status <> 'unsubscribed' or unsubscribed_at is not null),
  constraint subscriptions_token_only_pending check (status = 'pending' or confirm_token_hash is null)
);
create index if not exists subscriptions_pending_expiry_idx on mailing.subscriptions(confirm_expires_at) where status = 'pending';
create index if not exists subscriptions_status_idx on mailing.subscriptions(status);

-- Der Nachweis darf nach der Bestätigung nicht mehr umgeschrieben werden, und ein Zustand läuft nur vorwärts:
-- pending -> confirmed -> unsubscribed sowie pending -> unsubscribed. Der Speicher schreibt per PATCH mit Filter;
-- ohne diese Sperre könnte ein Schreibfehler eine Abmeldung aufheben oder einen Nachweis verändern.
create or replace function mailing.guard_subscription_update()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if new.email_hash is distinct from old.email_hash or new.unsubscribe_token is distinct from old.unsubscribe_token then
    raise exception 'subscription_identity_immutable' using errcode = '23514';
  end if;
  if old.status = 'unsubscribed' and new.status <> 'unsubscribed' then
    raise exception 'subscription_unsubscribe_final' using errcode = '23514';
  end if;
  if old.status = 'confirmed' and new.status = 'pending' then
    raise exception 'subscription_status_forward_only' using errcode = '23514';
  end if;
  if old.status in ('confirmed','unsubscribed') and (
       new.email is distinct from old.email
    or new.source is distinct from old.source
    or new.consent_version is distinct from old.consent_version
    or new.consent_text_sha256 is distinct from old.consent_text_sha256
    or new.requested_at is distinct from old.requested_at
    or new.confirmed_at is distinct from old.confirmed_at) then
    raise exception 'subscription_proof_immutable' using errcode = '23514';
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
-- Sperrliste für Werbung. Speichert nur, was zum Sperren nötig ist: Prüfsumme und Grund.
-- Der Dienst darf nur lesen und anfügen (Rechte unten); ein Eintrag wird nicht geändert oder gelöscht.
-- --------------------------------------------------------------------------
create table if not exists mailing.suppressions (
  email_hash text primary key check (email_hash ~ '^[0-9a-f]{64}$'),
  reason     text not null check (reason in ('unsubscribe','objection','hard_bounce','complaint','manual')),
  created_at timestamptz not null default now()
);

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

-- --------------------------------------------------------------------------
-- Row-Level Security: deny-by-default, wie in den Schemas "chat" und "composio".
-- Keine Richtlinie für anon/authenticated => Direktzugriff gesperrt.
-- --------------------------------------------------------------------------
alter table mailing.subscriptions  enable row level security;
alter table mailing.suppressions   enable row level security;
alter table mailing.consent_events enable row level security;

grant usage on schema mailing to anon, authenticated, service_role;
revoke all on all tables in schema mailing from public, anon, authenticated, service_role;
revoke all on all sequences in schema mailing from public, anon, authenticated;
revoke all on function mailing.guard_subscription_update() from public, anon, authenticated;
revoke all on function mailing.guard_subscription_delete() from public, anon, authenticated;
grant select, insert, update, delete on mailing.subscriptions to service_role;
grant select, insert on mailing.suppressions to service_role;
grant select, insert on mailing.consent_events to service_role;
grant usage, select on all sequences in schema mailing to service_role;

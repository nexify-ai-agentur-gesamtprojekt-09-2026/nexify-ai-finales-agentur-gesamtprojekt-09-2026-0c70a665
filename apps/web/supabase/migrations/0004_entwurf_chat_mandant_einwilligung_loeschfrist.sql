-- =============================================================================
-- ENTWURF · NICHT EINSPIELEN OHNE FREIGABE
-- NeXify Live-Chat · Schema "chat" · Migration 0004 (Entwurf vom 14.11.2026)
--
-- Zweck: Datenbasis, damit Chat-Inhalte künftig mandantengetrennt, mit
-- Rechtsgrundlage, Löschfrist und ausdrücklicher Freigabe in den zentralen
-- Wissensspeicher aufgenommen werden DÜRFEN. Diese Datei nimmt nichts auf.
--
-- Entscheidung des Inhabers bzw. der Rechtsberatung, NICHT dieser Datei:
--   * welche Rechtsgrundlage für Chat-Verarbeitung und Wissensspeicher gilt,
--   * welche Löschfristen gelten (hier ist bewusst KEINE Zahl festgelegt),
--   * der Wortlaut der Einwilligung und die Anpassung der Datenschutzerklärung.
-- Offene Punkte, Reihenfolge und Pflichttests:
--   docs/04-betrieb/chat-daten-migrationsentwurf-2026-11-14.md
--
-- Schutz gegen versehentliches Einspielen: Die Migration bricht ab, solange
-- die Sitzung die Freigabe nicht ausdrücklich setzt. Ein Werkzeug, das alle
-- Dateien dieses Ordners blind ausführt, scheitert deshalb hier ohne Wirkung.
--   set nexify.entwurf_0004_freigabe = 'vom-inhaber-freigegeben';
-- Anwenden nur in EINER Transaktion (alles oder nichts):
--   psql -X --single-transaction -v ON_ERROR_STOP=1 -f <diese Datei>
-- Rückweg: apps/web/supabase/rollback/0004_entwurf_chat_mandant_einwilligung_loeschfrist.down.sql
-- Voraussetzung: PostgreSQL 15 oder neuer (Sichten mit security_invoker).
--
-- Bestehende Regeln bleiben: RLS bleibt an, anon erhält nichts, Schreiben
-- bleibt beim Server (service_role). Neu ist nur ein eng begrenztes Lesen
-- für angemeldete Nutzer des EIGENEN Mandanten (siehe Abschnitt 8).
-- =============================================================================

do $$
begin
  if coalesce(current_setting('nexify.entwurf_0004_freigabe', true), '') <> 'vom-inhaber-freigegeben' then
    raise exception 'entwurf_0004_nicht_freigegeben'
      using hint = 'Entwurf. Erst nach Freigabe von Rechtsgrundlage, Fristen und Einwilligungstext einspielen.';
  end if;
  if current_setting('server_version_num')::int < 150000 then
    raise exception 'entwurf_0004_braucht_postgresql_15';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1. Einstellungen zum Datenschutz (eine Zeile)
--    default_retention_days ist der konfigurierbare Standardwert der Löschfrist.
--    PLATZHALTER: bleibt NULL = "nicht festgelegt". Solange NULL, erhält kein
--    Gespräch automatisch eine Frist und der Löschlauf findet nichts.
--    Den Wert setzt der Inhaber nach rechtlicher Klärung, nicht diese Migration.
-- -----------------------------------------------------------------------------
create table chat.chat_privacy_settings (
  id                     boolean primary key default true check (id),
  default_retention_days integer check (default_retention_days is null or default_retention_days > 0),
  updated_at             timestamptz not null default now(),
  updated_by             text
);
insert into chat.chat_privacy_settings (id, default_retention_days) values (true, null);

comment on column chat.chat_privacy_settings.default_retention_days is
  'Standard-Löschfrist in Tagen. NULL = nicht festgelegt (Platzhalter). Wert ist Entscheidung des Inhabers/der Rechtsberatung.';

-- -----------------------------------------------------------------------------
-- 2. Textfassungen der Einwilligung (nur anfügen, nie ändern)
--    Der Wortlaut ist offen; diese Migration legt keinen Text an.
-- -----------------------------------------------------------------------------
create table chat.chat_consent_texts (
  id         text primary key check (id ~ '^[a-z0-9][a-z0-9._-]{0,62}$'),
  purpose    text not null check (purpose in ('chat_verarbeitung', 'wissensspeicher')),
  locale     text not null check (locale in ('de', 'nl', 'fr', 'en')),
  version    text not null check (length(btrim(version)) > 0),
  body       text not null check (length(btrim(body)) > 0),
  valid_from timestamptz not null,
  created_at timestamptz not null default now(),
  unique (purpose, locale, version)
);

create function chat.forbid_change()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  raise exception 'append_only_%', tg_table_name using errcode = '55000';
end $$;

create trigger chat_consent_texts_append_only
  before update or delete on chat.chat_consent_texts
  for each row execute function chat.forbid_change();

-- -----------------------------------------------------------------------------
-- 3. Gespräche: Mandant, Rechtsgrundlage, Frist, Freigabe, Archivierung
--    Alle neuen Spalten sind für den Altbestand leer bzw. "nein".
-- -----------------------------------------------------------------------------
alter table chat.chat_conversations
  add column mandant_id                   uuid,
  add column mandant_assigned_at          timestamptz,
  add column legal_basis                  text
    constraint chat_conversations_legal_basis_known check (legal_basis is null or legal_basis in (
      'art6_1_a_einwilligung', 'art6_1_b_vertrag', 'art6_1_c_rechtspflicht',
      'art6_1_d_lebenswichtig', 'art6_1_e_oeffentliche_aufgabe', 'art6_1_f_berechtigtes_interesse')),
  add column legal_basis_recorded_at      timestamptz,
  add column delete_after                 timestamptz,
  add column erasure_hold                 boolean not null default false,
  add column erasure_hold_reason          text,
  add column knowledge_release            boolean not null default false,
  add column knowledge_released_at        timestamptz,
  add column knowledge_released_by        text,
  add column knowledge_release_revoked_at timestamptz,
  add column archived_at                  timestamptz,
  add column content_erased_at            timestamptz,
  add constraint chat_conversations_mandant_stamp
    check ((mandant_id is null) = (mandant_assigned_at is null)),
  add constraint chat_conversations_legal_basis_stamp
    check ((legal_basis is null) = (legal_basis_recorded_at is null)),
  add constraint chat_conversations_hold_reason
    check (not erasure_hold or length(btrim(coalesce(erasure_hold_reason, ''))) > 0),
  -- Wissensspeicher nur mit Pflicht-Mandant, festgestellter Rechtsgrundlage
  -- und vorhandenem Inhalt. Standard bleibt "nein".
  add constraint chat_conversations_knowledge_release_requirements
    check (not knowledge_release or (mandant_id is not null and legal_basis is not null
                                     and content_erased_at is null and knowledge_released_at is not null));

comment on column chat.chat_conversations.mandant_id is
  'Mandant nach ADR-0008 (config/mandanten.json). NULL = Altbestand ohne Zuordnung; nie sichtbar für Mandanten. Kein Fremdschlüssel: die Mandantentabelle liegt nicht in dieser Datenbank (offen).';
comment on column chat.chat_conversations.legal_basis is
  'Technischer Code der festgestellten Rechtsgrundlage (Art. 6 Abs. 1 DSGVO). NULL = nicht festgestellt. Welche gilt, entscheidet Inhaber/Rechtsberatung.';
comment on column chat.chat_conversations.delete_after is
  'Löschfrist je Gespräch. NULL = keine Frist gesetzt; der Löschlauf fasst das Gespräch nicht an.';
comment on column chat.chat_conversations.knowledge_release is
  'Für den Wissensspeicher freigegeben. Standard nein. Setzen nur über chat.release_for_knowledge().';
comment on column chat.chat_conversations.content_erased_at is
  'Zeitpunkt, zu dem die personenbezogenen Chat-Inhalte gelöscht wurden. Die Gesprächszeile bleibt als Betriebsnachweis.';

create index chat_conversations_mandant_idx on chat.chat_conversations (mandant_id) where mandant_id is not null;
create index chat_conversations_delete_after_idx on chat.chat_conversations (delete_after)
  where delete_after is not null and content_erased_at is null;

-- Betriebsdaten (Angebote, Bestellungen) werden archiviert, nicht gelöscht.
alter table chat.chat_offers add column archived_at timestamptz;
alter table chat.chat_orders add column archived_at timestamptz;

-- Ein einmal gesetzter Mandant ist unveränderlich.
create function chat.guard_conversation_mandant()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if old.mandant_id is not null and new.mandant_id is distinct from old.mandant_id then
    raise exception 'mandant_already_assigned' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger chat_conversations_mandant_guard
  before update of mandant_id on chat.chat_conversations
  for each row execute function chat.guard_conversation_mandant();

-- Neue Gespräche erhalten die Standardfrist nur, wenn sie festgelegt ist.
create function chat.apply_default_retention()
returns trigger language plpgsql set search_path = pg_catalog, chat as $$
declare v_days integer;
begin
  if new.delete_after is null then
    select default_retention_days into v_days from chat.chat_privacy_settings where id;
    if v_days is not null then
      new.delete_after := new.created_at + make_interval(days => v_days);
    end if;
  end if;
  return new;
end $$;

create trigger chat_conversations_default_retention
  before insert on chat.chat_conversations
  for each row execute function chat.apply_default_retention();

-- -----------------------------------------------------------------------------
-- 4. Einwilligungen je Gespräch und Zweck (Zeitpunkt + Textfassung)
--    Bleiben nach dem Löschen der Inhalte als Nachweis erhalten.
-- -----------------------------------------------------------------------------
create table chat.chat_consents (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat.chat_conversations(id) on delete cascade,
  purpose         text not null check (purpose in ('chat_verarbeitung', 'wissensspeicher')),
  consent_text_id text not null references chat.chat_consent_texts(id) on delete restrict,
  given_at        timestamptz not null,
  withdrawn_at    timestamptz check (withdrawn_at is null or withdrawn_at >= given_at),
  created_at      timestamptz not null default now(),
  unique (conversation_id, purpose, consent_text_id)
);
create index chat_consents_conversation_idx on chat.chat_consents (conversation_id, purpose);

-- -----------------------------------------------------------------------------
-- 5. Protokolle: nur Zähler und Kennungen, niemals Inhalte
-- -----------------------------------------------------------------------------
create table chat.chat_retention_runs (
  id                         bigserial primary key,
  started_at                 timestamptz not null default clock_timestamp(),
  finished_at                timestamptz,
  cutoff                     timestamptz not null,
  dry_run                    boolean not null,
  conversations_due          bigint not null default 0,
  conversations_erased       bigint not null default 0,
  conversations_skipped_hold bigint not null default 0,
  messages_deleted           bigint not null default 0
);

create table chat.chat_mandant_backfill_log (
  id              bigserial primary key,
  conversation_id uuid not null references chat.chat_conversations(id) on delete cascade,
  mandant_id      uuid not null,
  source          text not null check (length(btrim(source)) > 0),
  assigned_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 6. Funktionen (alle nur für den Server; Rechte in Abschnitt 9)
-- -----------------------------------------------------------------------------

-- Aktueller Mandant nach Projektmodell (Sitzungswert app.mandant_id je
-- Transaktion). Fehlt der Wert oder ist er ungültig: NULL = kein Zugriff.
create function chat.aktueller_mandant()
returns uuid language plpgsql stable security invoker set search_path = pg_catalog as $$
declare v text := nullif(current_setting('app.mandant_id', true), '');
begin
  if v is null then return null; end if;
  return v::uuid;
exception when invalid_text_representation then
  return null;
end $$;

-- Nachzugspfad für den Altbestand: ordnet genau ein Gespräch zu, nie um.
create function chat.assign_conversation_mandant(p_conversation_id uuid, p_mandant_id uuid, p_source text)
returns boolean language plpgsql security invoker set search_path = pg_catalog, chat as $$
declare v_current uuid;
begin
  if p_mandant_id is null or length(btrim(coalesce(p_source, ''))) = 0 then
    raise exception 'invalid_mandant_assignment' using errcode = '22023';
  end if;
  select c.mandant_id into v_current from chat.chat_conversations c where c.id = p_conversation_id for update;
  if not found then raise exception 'conversation_not_found' using errcode = 'P0002'; end if;
  if v_current = p_mandant_id then return false; end if;
  if v_current is not null then raise exception 'mandant_already_assigned' using errcode = '23514'; end if;
  update chat.chat_conversations set mandant_id = p_mandant_id, mandant_assigned_at = now()
    where id = p_conversation_id;
  insert into chat.chat_mandant_backfill_log (conversation_id, mandant_id, source)
    values (p_conversation_id, p_mandant_id, btrim(p_source));
  return true;
end $$;

create function chat.set_legal_basis(p_conversation_id uuid, p_legal_basis text, p_now timestamptz default now())
returns void language plpgsql security invoker set search_path = pg_catalog, chat as $$
begin
  if p_legal_basis is null then raise exception 'invalid_legal_basis' using errcode = '22023'; end if;
  update chat.chat_conversations set legal_basis = p_legal_basis, legal_basis_recorded_at = p_now
    where id = p_conversation_id;
  if not found then raise exception 'conversation_not_found' using errcode = 'P0002'; end if;
end $$;

-- Frist für ein einzelnes Gespräch setzen (auch Altbestand). Kein Massenlauf:
-- ab wann die Frist für Altgespräche läuft, ist eine offene Entscheidung.
create function chat.set_conversation_retention(p_conversation_id uuid, p_delete_after timestamptz)
returns void language plpgsql security invoker set search_path = pg_catalog, chat as $$
begin
  if p_delete_after is null then raise exception 'invalid_delete_after' using errcode = '22023'; end if;
  update chat.chat_conversations set delete_after = p_delete_after where id = p_conversation_id;
  if not found then raise exception 'conversation_not_found' using errcode = 'P0002'; end if;
end $$;

create function chat.record_consent(p_conversation_id uuid, p_purpose text, p_consent_text_id text,
                                    p_given_at timestamptz default now())
returns uuid language plpgsql security invoker set search_path = pg_catalog, chat as $$
declare v_id uuid;
begin
  perform 1 from chat.chat_consent_texts t
    where t.id = p_consent_text_id and t.purpose = p_purpose and t.valid_from <= p_given_at;
  if not found then raise exception 'consent_text_not_valid_for_purpose' using errcode = '22023'; end if;
  insert into chat.chat_consents (conversation_id, purpose, consent_text_id, given_at)
    values (p_conversation_id, p_purpose, p_consent_text_id, p_given_at)
    returning id into v_id;
  return v_id;
end $$;

-- Widerruf: wirkt sofort auf die Freigabe für den Wissensspeicher. Ob der
-- Widerruf zusätzlich die sofortige Löschung auslöst, ist offen (Recht).
create function chat.withdraw_consent(p_conversation_id uuid, p_purpose text, p_now timestamptz default now())
returns integer language plpgsql security invoker set search_path = pg_catalog, chat as $$
declare v_count integer;
begin
  update chat.chat_consents set withdrawn_at = p_now
    where conversation_id = p_conversation_id and purpose = p_purpose and withdrawn_at is null;
  get diagnostics v_count = row_count;
  if p_purpose = 'wissensspeicher' then
    update chat.chat_conversations
      set knowledge_release = false, knowledge_release_revoked_at = p_now
      where id = p_conversation_id and knowledge_release;
  end if;
  return v_count;
end $$;

-- Freigabe für den Wissensspeicher. Streng: Mandant und Rechtsgrundlage sind
-- Pflicht; stützt sich das Gespräch auf Einwilligung, muss eine nicht
-- widerrufene Einwilligung für den Zweck "wissensspeicher" vorliegen.
create function chat.release_for_knowledge(p_conversation_id uuid, p_released_by text, p_now timestamptz default now())
returns void language plpgsql security invoker set search_path = pg_catalog, chat as $$
declare v chat.chat_conversations%rowtype;
begin
  if length(btrim(coalesce(p_released_by, ''))) = 0 then
    raise exception 'invalid_released_by' using errcode = '22023';
  end if;
  select * into v from chat.chat_conversations where id = p_conversation_id for update;
  if not found then raise exception 'conversation_not_found' using errcode = 'P0002'; end if;
  if v.mandant_id is null or v.legal_basis is null or v.content_erased_at is not null or v.erasure_hold then
    raise exception 'knowledge_release_requirements_not_met' using errcode = '23514';
  end if;
  if v.legal_basis = 'art6_1_a_einwilligung' and not exists (
       select 1 from chat.chat_consents k
       where k.conversation_id = p_conversation_id and k.purpose = 'wissensspeicher' and k.withdrawn_at is null) then
    raise exception 'knowledge_release_requires_active_consent' using errcode = '23514';
  end if;
  update chat.chat_conversations
    set knowledge_release = true, knowledge_released_at = p_now, knowledge_released_by = btrim(p_released_by),
        knowledge_release_revoked_at = null
    where id = p_conversation_id;
end $$;

create function chat.revoke_knowledge_release(p_conversation_id uuid, p_now timestamptz default now())
returns boolean language plpgsql security invoker set search_path = pg_catalog, chat as $$
begin
  update chat.chat_conversations set knowledge_release = false, knowledge_release_revoked_at = p_now
    where id = p_conversation_id and knowledge_release;
  return found;
end $$;

-- Löscht die personenbezogenen Chat-Inhalte EINES Gesprächs. Die Zeile des
-- Gesprächs bleibt (archiviert, ohne Besucherbezug), weil Angebote und
-- Bestellungen daran hängen und eigene Aufbewahrungspflichten haben können.
-- Gibt nur die Anzahl gelöschter Nachrichten zurück.
create function chat.erase_conversation_content(p_conversation_id uuid, p_now timestamptz default now())
returns bigint language plpgsql security invoker set search_path = pg_catalog, chat as $$
declare v_deleted bigint;
begin
  perform 1 from chat.chat_conversations where id = p_conversation_id for update;
  if not found then raise exception 'conversation_not_found' using errcode = 'P0002'; end if;
  delete from chat.chat_messages where conversation_id = p_conversation_id;
  get diagnostics v_deleted = row_count;
  update chat.chat_conversations
    set visitor_ref = null,
        owner_session_digest = null,
        knowledge_release_revoked_at = case when knowledge_release then p_now else knowledge_release_revoked_at end,
        knowledge_release = false,
        status = 'archived',
        archived_at = coalesce(archived_at, p_now),
        content_erased_at = coalesce(content_erased_at, p_now)
    where id = p_conversation_id;
  return v_deleted;
end $$;

-- Löschlauf: löscht Inhalte aller Gespräche, deren Frist abgelaufen ist.
-- Standard ist der Probelauf (zählt nur). Protokolliert ausschließlich Zähler.
-- Gespräche ohne Frist und Gespräche mit Löschsperre werden nicht angefasst.
create function chat.run_retention_erasure(p_dry_run boolean default true, p_limit integer default 500,
                                           p_now timestamptz default now())
returns chat.chat_retention_runs language plpgsql security invoker set search_path = pg_catalog, chat as $$
declare
  v_run chat.chat_retention_runs%rowtype;
  v_id uuid;
  v_due bigint := 0;
  v_erased bigint := 0;
  v_hold bigint := 0;
  v_messages bigint := 0;
begin
  if p_dry_run is null or p_limit is null or p_limit < 1 or p_limit > 10000 or p_now is null then
    raise exception 'invalid_retention_run_arguments' using errcode = '22023';
  end if;
  select count(*) into v_hold from chat.chat_conversations c
    where c.delete_after <= p_now and c.content_erased_at is null and c.erasure_hold;
  for v_id in
    select c.id from chat.chat_conversations c
    where c.delete_after <= p_now and c.content_erased_at is null and not c.erasure_hold
    order by c.delete_after, c.id
    limit p_limit
    for update skip locked
  loop
    v_due := v_due + 1;
    if not p_dry_run then
      v_messages := v_messages + chat.erase_conversation_content(v_id, p_now);
      v_erased := v_erased + 1;
    end if;
  end loop;
  insert into chat.chat_retention_runs
    (finished_at, cutoff, dry_run, conversations_due, conversations_erased, conversations_skipped_hold, messages_deleted)
  values (clock_timestamp(), p_now, p_dry_run, v_due, v_erased, v_hold, v_messages)
  returning * into v_run;
  return v_run;
end $$;

-- Auskunft: gemeinsamer Baustein. Systemnachrichten (interne Anweisungen)
-- sind keine Daten der betroffenen Person und werden nicht ausgegeben;
-- ihre Anzahl wird genannt. Der Sitzungs-Digest wird nie ausgegeben.
create function chat.export_conversations(p_ids uuid[])
returns jsonb language sql stable security invoker set search_path = pg_catalog, chat as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'conversation', to_jsonb(c) - 'owner_session_digest',
    'messages', (select coalesce(jsonb_agg(to_jsonb(m) - 'model' order by m.created_at, m.id), '[]'::jsonb)
                 from chat.chat_messages m where m.conversation_id = c.id and m.role in ('user', 'assistant')),
    'system_messages_withheld', (select count(*) from chat.chat_messages m
                                 where m.conversation_id = c.id and m.role = 'system'),
    'consents', (select coalesce(jsonb_agg(to_jsonb(k) order by k.given_at, k.id), '[]'::jsonb)
                 from chat.chat_consents k where k.conversation_id = c.id),
    'offers', (select coalesce(jsonb_agg(to_jsonb(o) || jsonb_build_object('items',
                   (select coalesce(jsonb_agg(to_jsonb(i) order by i.position), '[]'::jsonb)
                    from chat.chat_offer_items i where i.offer_id = o.id)) order by o.created_at, o.id), '[]'::jsonb)
               from chat.chat_offers o where o.conversation_id = c.id),
    'orders', (select coalesce(jsonb_agg(to_jsonb(r) || jsonb_build_object('events',
                   (select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at, e.id), '[]'::jsonb)
                    from chat.chat_order_events e where e.order_id = r.id)) order by r.created_at, r.id), '[]'::jsonb)
               from chat.chat_orders r where r.conversation_id = c.id)
  ) order by c.created_at, c.id), '[]'::jsonb)
  from chat.chat_conversations c where c.id = any(p_ids);
$$;

-- Auskunft für einen Besucher. Der Server muss den Besucher vorher prüfen und
-- den Digest selbst berechnen. Nach dem Löschen der Inhalte ist ein Gespräch
-- keinem Besucher mehr zuzuordnen und erscheint hier nicht mehr.
create function chat.export_visitor_data(p_owner_digest bytea)
returns jsonb language plpgsql stable security invoker set search_path = pg_catalog, chat as $$
begin
  if p_owner_digest is null or octet_length(p_owner_digest) <> 32 then
    raise exception 'invalid_owner_digest' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'subject', 'visitor',
    'exported_at', now(),
    'conversations', chat.export_conversations(array(
      select c.id from chat.chat_conversations c where c.owner_session_digest = p_owner_digest)));
end $$;

-- Auskunft/Export für einen Mandanten: ausschließlich dessen Gespräche.
create function chat.export_mandant_data(p_mandant_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = pg_catalog, chat as $$
begin
  if p_mandant_id is null then raise exception 'invalid_mandant' using errcode = '22023'; end if;
  return jsonb_build_object(
    'subject', 'mandant',
    'mandant_id', p_mandant_id,
    'exported_at', now(),
    'conversations', chat.export_conversations(array(
      select c.id from chat.chat_conversations c where c.mandant_id = p_mandant_id)));
end $$;

-- -----------------------------------------------------------------------------
-- 7. Sichten (laufen mit den Rechten des Aufrufers; RLS gilt weiter)
-- -----------------------------------------------------------------------------
-- Was der Wissensspeicher künftig lesen DARF: freigegeben, Mandant gesetzt,
-- Inhalt vorhanden, keine Löschsperre. Enthält keine Inhalte, nur Kennungen.
create view chat.chat_knowledge_candidates with (security_invoker = true) as
  select c.id as conversation_id, c.mandant_id, c.locale, c.legal_basis,
         c.knowledge_released_at, c.delete_after
  from chat.chat_conversations c
  where c.knowledge_release and c.mandant_id is not null and c.legal_basis is not null
    and c.content_erased_at is null and not c.erasure_hold;

-- Überblick für Betrieb und Datenschutz: nur Zähler.
create view chat.chat_retention_overview with (security_invoker = true) as
  select c.mandant_id,
         count(*)                                                                  as conversations,
         count(*) filter (where c.content_erased_at is not null)                   as content_erased,
         count(*) filter (where c.delete_after is null and c.content_erased_at is null) as without_deadline,
         count(*) filter (where c.delete_after <= now() and c.content_erased_at is null
                                and not c.erasure_hold)                            as due_now,
         count(*) filter (where c.erasure_hold)                                    as on_hold,
         count(*) filter (where c.legal_basis is null)                             as without_legal_basis,
         count(*) filter (where c.knowledge_release)                               as released_for_knowledge
  from chat.chat_conversations c
  group by c.mandant_id;

-- -----------------------------------------------------------------------------
-- 8. Row-Level-Security
--    Bisher: keine Regel für anon/authenticated = kein Direktzugriff. Das bleibt
--    für anon und für alle Schreibzugriffe so. Neu: angemeldete Nutzer dürfen
--    Gespräche und Nachrichten des EIGENEN Mandanten lesen, ohne
--    Sitzungs-Digest, Besucherbezug, Modellangabe und Systemnachrichten.
--    Gespräche ohne Mandant (Altbestand) sieht kein Mandant.
--    Voraussetzung (offen): Nur der Server setzt app.mandant_id aus einer
--    geprüften Anmeldung. Ohne diesen Nachweis Abschnitt 8 nicht freigeben.
-- -----------------------------------------------------------------------------
alter table chat.chat_privacy_settings     enable row level security;
alter table chat.chat_consent_texts        enable row level security;
alter table chat.chat_consents             enable row level security;
alter table chat.chat_retention_runs       enable row level security;
alter table chat.chat_mandant_backfill_log enable row level security;

create policy chat_conversations_mandant_lesen on chat.chat_conversations
  for select to authenticated
  using (mandant_id is not null and mandant_id = chat.aktueller_mandant());

create policy chat_messages_mandant_lesen on chat.chat_messages
  for select to authenticated
  using (role in ('user', 'assistant') and exists (
    select 1 from chat.chat_conversations c
    where c.id = chat_messages.conversation_id
      and c.mandant_id is not null and c.mandant_id = chat.aktueller_mandant()));

-- -----------------------------------------------------------------------------
-- 9. Rechte
-- -----------------------------------------------------------------------------
grant select (id, locale, page_path, status, created_at, updated_at, mandant_id, legal_basis,
              delete_after, knowledge_release, archived_at, content_erased_at)
  on chat.chat_conversations to authenticated;
grant select (id, conversation_id, role, content, created_at) on chat.chat_messages to authenticated;

grant all on chat.chat_privacy_settings, chat.chat_consent_texts, chat.chat_consents,
             chat.chat_retention_runs, chat.chat_mandant_backfill_log to service_role;
grant usage, select on sequence chat.chat_retention_runs_id_seq, chat.chat_mandant_backfill_log_id_seq to service_role;
grant select on chat.chat_knowledge_candidates, chat.chat_retention_overview to service_role;

revoke all on function
  chat.forbid_change(), chat.guard_conversation_mandant(), chat.apply_default_retention(),
  chat.aktueller_mandant(),
  chat.assign_conversation_mandant(uuid, uuid, text),
  chat.set_legal_basis(uuid, text, timestamptz),
  chat.set_conversation_retention(uuid, timestamptz),
  chat.record_consent(uuid, text, text, timestamptz),
  chat.withdraw_consent(uuid, text, timestamptz),
  chat.release_for_knowledge(uuid, text, timestamptz),
  chat.revoke_knowledge_release(uuid, timestamptz),
  chat.erase_conversation_content(uuid, timestamptz),
  chat.run_retention_erasure(boolean, integer, timestamptz),
  chat.export_conversations(uuid[]),
  chat.export_visitor_data(bytea),
  chat.export_mandant_data(uuid)
from public, anon, authenticated;

grant execute on function
  chat.aktueller_mandant(),
  chat.assign_conversation_mandant(uuid, uuid, text),
  chat.set_legal_basis(uuid, text, timestamptz),
  chat.set_conversation_retention(uuid, timestamptz),
  chat.record_consent(uuid, text, text, timestamptz),
  chat.withdraw_consent(uuid, text, timestamptz),
  chat.release_for_knowledge(uuid, text, timestamptz),
  chat.revoke_knowledge_release(uuid, timestamptz),
  chat.erase_conversation_content(uuid, timestamptz),
  chat.run_retention_erasure(boolean, integer, timestamptz),
  chat.export_conversations(uuid[]),
  chat.export_visitor_data(bytea),
  chat.export_mandant_data(uuid)
to service_role;

-- Die Lese-Regeln rufen diese Funktion mit den Rechten des Lesenden auf.
grant execute on function chat.aktueller_mandant() to authenticated;

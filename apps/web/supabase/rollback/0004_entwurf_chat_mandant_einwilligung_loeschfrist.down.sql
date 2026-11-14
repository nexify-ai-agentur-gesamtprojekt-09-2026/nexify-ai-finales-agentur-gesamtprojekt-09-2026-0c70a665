-- =============================================================================
-- ENTWURF · RÜCKWEG zu Migration 0004 · NICHT EINSPIELEN OHNE FREIGABE
--
-- Liegt absichtlich NICHT im Ordner migrations/: Ein Werkzeug, das dort alle
-- Dateien der Reihe nach ausführt, würde sonst 0004 sofort wieder zurücknehmen.
--
-- Der Rückweg entfernt Spalten und Tabellen. Sind dort bereits Nachweise
-- eingetragen (Mandant, Rechtsgrundlage, Einwilligung, Frist, Löschläufe),
-- gingen sie verloren. Deshalb bricht der Rückweg in diesem Fall ab. Erst die
-- Nachweise sichern (z. B. chat.export_mandant_data, pg_dump der Tabellen),
-- dann ausdrücklich bestätigen:
--   set nexify.entwurf_0004_rueckweg = 'datenverlust-bestaetigt';
-- Bereits gelöschte Chat-Inhalte stellt der Rückweg nicht wieder her.
-- Anwenden nur in EINER Transaktion:
--   psql -X --single-transaction -v ON_ERROR_STOP=1 -f <diese Datei>
-- =============================================================================

do $$
declare v_rows bigint;
begin
  select (select count(*) from chat.chat_conversations
          where mandant_id is not null or legal_basis is not null or delete_after is not null
             or erasure_hold or knowledge_release or knowledge_released_at is not null
             or archived_at is not null or content_erased_at is not null)
       + (select count(*) from chat.chat_consents)
       + (select count(*) from chat.chat_consent_texts)
       + (select count(*) from chat.chat_retention_runs)
       + (select count(*) from chat.chat_mandant_backfill_log)
       + (select count(*) from chat.chat_offers where archived_at is not null)
       + (select count(*) from chat.chat_orders where archived_at is not null)
       + (select count(*) from chat.chat_privacy_settings where default_retention_days is not null)
    into v_rows;
  if v_rows > 0
     and coalesce(current_setting('nexify.entwurf_0004_rueckweg', true), '') <> 'datenverlust-bestaetigt' then
    raise exception 'rueckweg_0004_wuerde_nachweise_entfernen'
      using hint = 'Nachweise zuerst sichern, dann nexify.entwurf_0004_rueckweg ausdrücklich setzen.';
  end if;
end $$;

drop policy chat_messages_mandant_lesen on chat.chat_messages;
drop policy chat_conversations_mandant_lesen on chat.chat_conversations;

revoke select (id, conversation_id, role, content, created_at) on chat.chat_messages from authenticated;
revoke select (id, locale, page_path, status, created_at, updated_at, mandant_id, legal_basis,
               delete_after, knowledge_release, archived_at, content_erased_at)
  on chat.chat_conversations from authenticated;

drop view chat.chat_retention_overview;
drop view chat.chat_knowledge_candidates;

drop function chat.export_mandant_data(uuid);
drop function chat.export_visitor_data(bytea);
drop function chat.export_conversations(uuid[]);
drop function chat.run_retention_erasure(boolean, integer, timestamptz);
drop function chat.erase_conversation_content(uuid, timestamptz);
drop function chat.revoke_knowledge_release(uuid, timestamptz);
drop function chat.release_for_knowledge(uuid, text, timestamptz);
drop function chat.withdraw_consent(uuid, text, timestamptz);
drop function chat.record_consent(uuid, text, text, timestamptz);
drop function chat.set_conversation_retention(uuid, timestamptz);
drop function chat.set_legal_basis(uuid, text, timestamptz);
drop function chat.assign_conversation_mandant(uuid, uuid, text);

drop trigger chat_conversations_default_retention on chat.chat_conversations;
drop trigger chat_conversations_mandant_guard on chat.chat_conversations;
drop function chat.apply_default_retention();
drop function chat.guard_conversation_mandant();

drop table chat.chat_mandant_backfill_log;
drop table chat.chat_retention_runs;
drop table chat.chat_consents;
drop table chat.chat_consent_texts;
drop function chat.forbid_change();
drop table chat.chat_privacy_settings;

alter table chat.chat_orders drop column archived_at;
alter table chat.chat_offers drop column archived_at;

drop index chat.chat_conversations_delete_after_idx;
drop index chat.chat_conversations_mandant_idx;

alter table chat.chat_conversations
  drop constraint chat_conversations_knowledge_release_requirements,
  drop constraint chat_conversations_hold_reason,
  drop constraint chat_conversations_legal_basis_stamp,
  drop constraint chat_conversations_mandant_stamp,
  drop column content_erased_at,
  drop column archived_at,
  drop column knowledge_release_revoked_at,
  drop column knowledge_released_by,
  drop column knowledge_released_at,
  drop column knowledge_release,
  drop column erasure_hold_reason,
  drop column erasure_hold,
  drop column delete_after,
  drop column legal_basis_recorded_at,
  drop column legal_basis,
  drop column mandant_assigned_at,
  drop column mandant_id;

drop function chat.aktueller_mandant();

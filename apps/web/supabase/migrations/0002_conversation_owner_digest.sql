-- Additive preparation only: no existing conversation is claimed and no route
-- uses this column yet. Apply only after a separate migration/release review.
-- This versioned migration is intentionally not idempotent: an existing column
-- causes an error instead of silently accepting an unknown type or constraint.
-- The eventual server must generate a high-entropy visitor secret and store
-- only its SHA-256 digest; a client-supplied conversation UUID is not authority.
-- A digest alone does not provide tenant isolation, CSRF protection, budgeting,
-- rate limiting, retry safety, session expiry or account recovery.
alter table chat.chat_conversations
  add column owner_session_digest bytea
    constraint chat_conversations_owner_session_digest_length
    check (owner_session_digest is null or octet_length(owner_session_digest) = 32);

comment on column chat.chat_conversations.owner_session_digest is
  'Nullable server-generated visitor-session SHA-256 digest. Null is unclaimed, never public access. Not yet wired to routes.';

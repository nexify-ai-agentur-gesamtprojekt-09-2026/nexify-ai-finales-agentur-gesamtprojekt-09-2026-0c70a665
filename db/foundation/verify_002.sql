-- Isolation proof for 002_suite_tenancy.sql. All fixtures, helpers and test principals are rolled back.
-- The "application" statements below deliberately carry NO tenant filter or a foreign tenant id: they model
-- faulty application code. Row level security alone must keep organisation A away from B and C.
BEGIN;
CREATE SCHEMA nx_suite_test;
CREATE FUNCTION nx_suite_test.expect(condition boolean, label text)
RETURNS void LANGUAGE plpgsql AS $function$
BEGIN
  IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'PASS: %', label;
END
$function$;
CREATE FUNCTION nx_suite_test.fails(statement text, expected_state text, label text)
RETURNS void LANGUAGE plpgsql AS $function$
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = expected_state THEN
      RAISE NOTICE 'PASS: %', label;
      RETURN;
    END IF;
    RAISE EXCEPTION 'FAIL: % raised % (%), expected %', label, SQLSTATE, SQLERRM, expected_state;
  END;
  RAISE EXCEPTION 'FAIL: statement was not rejected: %', label;
END
$function$;
CREATE FUNCTION nx_suite_test.as_account(account uuid, org uuid)
RETURNS void LANGUAGE sql AS $function$
  SELECT set_config('app.account_id', coalesce(account::text, ''), true), set_config('app.mandant_id', coalesce(org::text, ''), true);
$function$;

CREATE ROLE nx_suite_test_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE nx_suite_test_billing LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT nx_suite_app TO nx_suite_test_app;
GRANT nx_suite_billing TO nx_suite_test_billing;
GRANT USAGE ON SCHEMA nx_suite_test TO nx_suite_test_app, nx_suite_test_billing, nx_suite_owner;

INSERT INTO nx_suite.organisation(id, name) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Fixture A'),
  ('a0000000-0000-0000-0000-000000000002', 'Fixture B'),
  ('a0000000-0000-0000-0000-000000000003', 'Fixture C');
INSERT INTO nx_suite.account(id, external_ref, email_verified_at) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'fixture:a', now()),
  ('b0000000-0000-0000-0000-000000000002', 'fixture:b', now()),
  ('b0000000-0000-0000-0000-000000000003', 'fixture:c-viewer', now()),
  ('b0000000-0000-0000-0000-000000000004', 'fixture:d-two-orgs', now()),
  ('b0000000-0000-0000-0000-000000000005', 'fixture:e-unverified', NULL),
  ('b0000000-0000-0000-0000-000000000006', 'fixture:f-member-a', now());
INSERT INTO nx_suite.membership(organisation_id, account_id, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'owner'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'owner'),
  ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'viewer'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'member'),
  ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', 'owner'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 'member');
INSERT INTO nx_suite.conversation(organisation_id, id, title, created_by) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'A talk', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'B talk', 'b0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'C talk', 'b0000000-0000-0000-0000-000000000004');
INSERT INTO nx_suite.subscription(organisation_id, state) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'none'),
  ('a0000000-0000-0000-0000-000000000002', 'active'),
  ('a0000000-0000-0000-0000-000000000003', 'none');
INSERT INTO nx_suite.entitlement(organisation_id, capability, granted, source_state, subscription_version) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'chat', false, 'none', 0),
  ('a0000000-0000-0000-0000-000000000002', 'chat', true, 'active', 1);
INSERT INTO nx_suite.llm_binding(organisation_id, id, mode, provider_ref, vault_ref, created_by) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'byo', 'fixture_provider',
   'vaultref:00000000000000000000000000000b0b', 'b0000000-0000-0000-0000-000000000002');
INSERT INTO nx_suite.audit_event(organisation_id, actor_account, action) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'fixture.b');

SELECT nx_suite_test.expect(
  (SELECT count(*) = 9 AND bool_and(relrowsecurity AND relforcerowsecurity)
   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'nx_suite' AND c.relkind = 'r'),
  'all nine suite tables have ENABLE plus FORCE RLS');
SELECT nx_suite_test.expect(
  (SELECT count(*) = 1 FROM nx_foundation.schema_migration WHERE version = 2),
  'repeated migration retains one version record');
SELECT nx_suite_test.expect(
  NOT EXISTS (SELECT FROM information_schema.role_table_grants
              WHERE table_schema = 'nx_suite' AND grantee IN ('nx_suite_app', 'nx_suite_billing', 'PUBLIC')
                AND privilege_type IN ('DELETE', 'TRUNCATE')),
  'no application role may delete or truncate suite data');

-- ------------------------------------------------------------ application role, account A
SET SESSION AUTHORIZATION nx_suite_test_app;
SELECT nx_suite_test.expect(
  (SELECT NOT rolsuper AND NOT rolbypassrls FROM pg_roles WHERE rolname = current_user)
  AND NOT pg_has_role(current_user, 'nx_suite_owner', 'MEMBER'),
  'application principal is a nonowner without RLS bypass');
SELECT nx_suite_test.expect(
  (SELECT count(*) FROM nx_suite.conversation) + (SELECT count(*) FROM nx_suite.organisation)
  + (SELECT count(*) FROM nx_suite.subscription) + (SELECT count(*) FROM nx_suite.entitlement)
  + (SELECT count(*) FROM nx_suite.llm_binding) + (SELECT count(*) FROM nx_suite.membership)
  + (SELECT count(*) FROM nx_suite.account) + (SELECT count(*) FROM nx_suite.audit_event) = 0,
  'no context: unfiltered reads return nothing from any table');
SELECT nx_suite_test.as_account(NULL, 'a0000000-0000-0000-0000-000000000001');
SELECT nx_suite_test.expect((SELECT count(*) = 0 FROM nx_suite.conversation), 'organisation id alone is not authorization');
SELECT nx_suite_test.as_account('b0000000-0000-0000-0000-000000000001', NULL);
SELECT nx_suite_test.expect((SELECT count(*) = 0 FROM nx_suite.conversation), 'account alone without organisation context reads nothing');

SELECT nx_suite_test.as_account('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001');
SELECT nx_suite_test.expect((SELECT count(*) = 1 AND min(title) = 'A talk' FROM nx_suite.conversation), 'A: unfiltered conversation read returns only A');
SELECT nx_suite_test.expect((SELECT count(*) = 1 FROM nx_suite.organisation), 'A sees only its organisation');
SELECT nx_suite_test.expect((SELECT count(*) = 1 AND min(state) = 'none' FROM nx_suite.subscription), 'A sees only its subscription');
SELECT nx_suite_test.expect((SELECT count(*) = 1 AND NOT bool_or(granted) FROM nx_suite.entitlement), 'A sees only its entitlement, not the granted one of B');
SELECT nx_suite_test.expect((SELECT count(*) = 0 FROM nx_suite.llm_binding), 'A cannot see the vault reference of B');
SELECT nx_suite_test.expect((SELECT count(*) = 0 FROM nx_suite.audit_event WHERE action = 'fixture.b'), 'A cannot read the audit trail of B');
SELECT nx_suite_test.expect((SELECT count(*) = 1 FROM nx_suite.account), 'A sees only its own account row');
SELECT nx_suite_test.expect((SELECT count(*) = 3 FROM nx_suite.membership), 'owner A lists the memberships of A only');
SELECT nx_suite_test.expect(
  (SELECT count(*) = 0 FROM nx_suite.conversation WHERE organisation_id = 'a0000000-0000-0000-0000-000000000002'),
  'A asking explicitly for B rows gets nothing');
SELECT nx_suite_test.fails('INSERT INTO nx_suite.conversation(organisation_id,title,created_by) VALUES (''a0000000-0000-0000-0000-000000000002'',''x'',''b0000000-0000-0000-0000-000000000001'')', '42501', 'A cannot insert into B');
SELECT nx_suite_test.fails('INSERT INTO nx_suite.conversation(organisation_id,title,created_by) VALUES (''a0000000-0000-0000-0000-000000000001'',''x'',''b0000000-0000-0000-0000-000000000002'')', '42501', 'A cannot forge the author');
SELECT nx_suite_test.fails('UPDATE nx_suite.conversation SET organisation_id=''a0000000-0000-0000-0000-000000000002''', '42501', 'A cannot move a row to B (column not updatable)');
WITH changed AS (UPDATE nx_suite.conversation SET title = 'taken' RETURNING title)
SELECT nx_suite_test.expect((SELECT count(*) = 1 FROM changed), 'A: unfiltered UPDATE touches only the row of A');
SELECT nx_suite_test.fails('DELETE FROM nx_suite.conversation', '42501', 'application cannot delete');
SELECT nx_suite_test.fails('UPDATE nx_suite.subscription SET state=''active''', '42501', 'application cannot grant itself a subscription');
SELECT nx_suite_test.fails('INSERT INTO nx_suite.entitlement(organisation_id,capability,granted,source_state,subscription_version) VALUES (''a0000000-0000-0000-0000-000000000001'',''dashboard'',true,''active'',1)', '42501', 'application cannot write entitlements');
SELECT nx_suite_test.fails('UPDATE nx_suite.entitlement SET granted=true', '42501', 'application cannot flip an entitlement');
SELECT nx_suite_test.fails('SELECT * FROM nx_suite.billing_event', '42501', 'application cannot read the payment event journal');
SELECT nx_suite_test.fails('UPDATE nx_suite.membership SET role=''owner''', '42501', 'application cannot edit memberships directly');
SELECT nx_suite_test.fails('UPDATE nx_suite.account SET status=''active''', '42501', 'application cannot edit accounts directly');
SELECT nx_suite_test.fails('SET ROLE nx_suite_owner', '42501', 'application cannot assume the schema owner');
SELECT nx_suite_test.fails('SET ROLE nx_suite_billing', '42501', 'application cannot assume the billing role');

-- own vault reference: owner may bind, key material is rejected by shape
SAVEPOINT bind;
INSERT INTO nx_suite.llm_binding(organisation_id, mode, provider_ref, vault_ref, created_by) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'byo', 'fixture_provider', 'vaultref:000000000000000000000000000000a1', 'b0000000-0000-0000-0000-000000000001');
SELECT nx_suite_test.expect((SELECT count(*) = 1 FROM nx_suite.llm_binding), 'owner A binds an own vault reference');
SELECT nx_suite_test.fails('INSERT INTO nx_suite.llm_binding(organisation_id,mode,created_by) VALUES (''a0000000-0000-0000-0000-000000000001'',''managed'',''b0000000-0000-0000-0000-000000000001'')', '23505', 'a second active binding is rejected: the choice is explicit');
ROLLBACK TO SAVEPOINT bind;
SELECT nx_suite_test.fails('INSERT INTO nx_suite.llm_binding(organisation_id,mode,provider_ref,vault_ref,created_by) VALUES (''a0000000-0000-0000-0000-000000000001'',''byo'',''fixture_provider'',''sk-fixture-not-a-real-key-000000000000'',''b0000000-0000-0000-0000-000000000001'')', '23514', 'key-shaped text instead of a vault reference is rejected');
SELECT nx_suite_test.fails('INSERT INTO nx_suite.llm_binding(organisation_id,mode,provider_ref,vault_ref,created_by) VALUES (''a0000000-0000-0000-0000-000000000001'',''byo'',''fixture_provider'',''vaultref:00000000000000000000000000000b0b'',''b0000000-0000-0000-0000-000000000001'')', '23505', 'the vault reference of B cannot be bound by A');
SELECT nx_suite_test.fails('INSERT INTO nx_suite.llm_binding(organisation_id,mode,vault_ref,created_by) VALUES (''a0000000-0000-0000-0000-000000000001'',''managed'',''vaultref:000000000000000000000000000000a2'',''b0000000-0000-0000-0000-000000000001'')', '23514', 'managed mode carries no vault reference');

-- A puts a foreign organisation into the context
SELECT nx_suite_test.as_account('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002');
SELECT nx_suite_test.expect(
  (SELECT count(*) FROM nx_suite.conversation) + (SELECT count(*) FROM nx_suite.subscription)
  + (SELECT count(*) FROM nx_suite.entitlement) + (SELECT count(*) FROM nx_suite.llm_binding)
  + (SELECT count(*) FROM nx_suite.organisation) + (SELECT count(*) FROM nx_suite.membership) = 0,
  'A with organisation B in context reads nothing: membership is required');
SELECT nx_suite_test.fails('INSERT INTO nx_suite.conversation(organisation_id,title,created_by) VALUES (''a0000000-0000-0000-0000-000000000002'',''x'',''b0000000-0000-0000-0000-000000000001'')', '42501', 'A with B in context still cannot write to B');
SELECT nx_suite_test.fails('SELECT nx_suite.set_membership(''b0000000-0000-0000-0000-000000000001'', ''owner'')', '42501', 'A cannot make itself owner of B');
SELECT set_config('app.account_id', 'malformed', true), set_config('app.mandant_id', 'a0000000-0000-0000-0000-000000000001', true);
SELECT nx_suite_test.expect((SELECT count(*) = 0 FROM nx_suite.conversation), 'malformed account context fails closed');

-- roles inside one organisation
SELECT nx_suite_test.as_account('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003');
SELECT nx_suite_test.expect((SELECT count(*) = 1 AND min(title) = 'C talk' FROM nx_suite.conversation), 'viewer of C reads C');
SELECT nx_suite_test.fails('INSERT INTO nx_suite.conversation(organisation_id,title,created_by) VALUES (''a0000000-0000-0000-0000-000000000003'',''x'',''b0000000-0000-0000-0000-000000000003'')', '42501', 'viewer cannot write');
WITH changed AS (UPDATE nx_suite.conversation SET title = 'viewer' RETURNING title)
SELECT nx_suite_test.expect((SELECT count(*) = 0 FROM changed), 'viewer update changes nothing');
SELECT nx_suite_test.expect((SELECT count(*) = 1 FROM nx_suite.membership), 'non-owner sees only its own membership');
SELECT nx_suite_test.expect((SELECT count(*) = 0 FROM nx_suite.audit_event), 'non-owner cannot read the audit trail');
SELECT nx_suite_test.as_account('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001');
SELECT nx_suite_test.fails('INSERT INTO nx_suite.llm_binding(organisation_id,mode,created_by) VALUES (''a0000000-0000-0000-0000-000000000001'',''managed'',''b0000000-0000-0000-0000-000000000006'')', '42501', 'member cannot change the model binding');
SELECT nx_suite_test.fails('SELECT nx_suite.set_membership(''b0000000-0000-0000-0000-000000000006'', ''owner'')', '42501', 'member cannot promote itself');

-- one account, two organisations: only the organisation in context is visible
SELECT nx_suite_test.as_account('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001');
SELECT nx_suite_test.expect((SELECT count(*) = 1 AND min(organisation_id::text) = 'a0000000-0000-0000-0000-000000000001' FROM nx_suite.conversation), 'two-organisation account in A sees only A');
SELECT nx_suite_test.as_account('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003');
SELECT nx_suite_test.expect((SELECT count(*) = 1 AND min(organisation_id::text) = 'a0000000-0000-0000-0000-000000000003' FROM nx_suite.conversation), 'the same account in C sees only C');
SELECT nx_suite_test.fails('SELECT nx_suite.set_membership(''b0000000-0000-0000-0000-000000000004'', ''viewer'')', '23514', 'the last active owner cannot be removed');
SELECT nx_suite_test.fails('SELECT nx_suite.set_membership(''b0000000-0000-0000-0000-000000000003'', ''root'')', '23514', 'unknown role is rejected');
SELECT nx_suite.set_membership('b0000000-0000-0000-0000-000000000003', 'member');
SELECT nx_suite_test.expect((SELECT count(*) = 1 FROM nx_suite.audit_event WHERE action = 'membership.set'), 'membership change is audited');

-- provisioning requires a verified address
SELECT nx_suite_test.as_account('b0000000-0000-0000-0000-000000000005', NULL);
SELECT nx_suite_test.fails('SELECT nx_suite.create_organisation(''Unverified'')', '42501', 'unverified account cannot create an organisation');
SELECT nx_suite_test.as_account(nx_suite.ensure_account('fixture:new', true), NULL);
SELECT nx_suite_test.as_account(nx_suite.current_account(), nx_suite.create_organisation('Fresh'));
SELECT nx_suite_test.expect(
  (SELECT count(*) = 1 AND min(state) = 'none' FROM nx_suite.subscription)
  AND (SELECT count(*) = 1 AND min(role) = 'owner' FROM nx_suite.membership)
  AND (SELECT count(*) = 0 FROM nx_suite.entitlement),
  'a new organisation has an owner, an empty subscription and no entitlement');

-- ------------------------------------------------------------ billing role
RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION nx_suite_test_billing;
SELECT nx_suite_test.as_account(NULL, NULL);
SELECT nx_suite_test.expect((SELECT count(*) = 0 FROM nx_suite.subscription), 'billing role without organisation context sees no subscription');
SELECT nx_suite_test.as_account(NULL, 'a0000000-0000-0000-0000-000000000001');
SELECT nx_suite_test.expect((SELECT count(*) = 1 FROM nx_suite.subscription), 'billing role sees the one subscription in context');
WITH changed AS (UPDATE nx_suite.subscription SET state = 'active', version = version + 1 RETURNING organisation_id)
SELECT nx_suite_test.expect((SELECT count(*) = 1 AND min(organisation_id::text) = 'a0000000-0000-0000-0000-000000000001' FROM changed), 'billing: unfiltered UPDATE changes only the organisation in context');
SELECT nx_suite_test.fails('INSERT INTO nx_suite.entitlement(organisation_id,capability,granted,source_state,subscription_version) VALUES (''a0000000-0000-0000-0000-000000000002'',''dashboard'',true,''active'',1)', '42501', 'billing role cannot grant an entitlement to another organisation');
SELECT nx_suite_test.fails('UPDATE nx_suite.subscription SET organisation_id=''a0000000-0000-0000-0000-000000000003''', '42501', 'billing role cannot move a subscription');
SELECT nx_suite_test.fails('SELECT * FROM nx_suite.conversation', '42501', 'billing role cannot read customer conversations');
SELECT nx_suite_test.fails('SELECT * FROM nx_suite.llm_binding', '42501', 'billing role cannot read vault references');
SELECT nx_suite_test.fails('DELETE FROM nx_suite.billing_event', '42501', 'billing role cannot delete journal entries');
INSERT INTO nx_suite.billing_event(provider, event_id, organisation_id, kind, occurred_at, payload_digest)
VALUES ('fixture', 'evt_1', 'a0000000-0000-0000-0000-000000000001', 'payment_succeeded', now(), repeat('0', 64));
SELECT nx_suite_test.fails('INSERT INTO nx_suite.billing_event(provider,event_id,kind,occurred_at,payload_digest) VALUES (''fixture'',''evt_1'',''payment_succeeded'',now(),repeat(''0'',64))', '23505', 'the same provider event id is stored once');
SELECT nx_suite_test.fails('INSERT INTO nx_suite.billing_event(provider,event_id,kind,occurred_at,payload_digest) VALUES (''fixture'',''evt_2'',''payment_succeeded'',now(),''card 4111'')', '23514', 'the journal accepts a digest only, no payload text');

-- ------------------------------------------------------------ revocation and locks (administrator changes)
RESET SESSION AUTHORIZATION;
UPDATE nx_suite.membership SET active = false WHERE account_id = 'b0000000-0000-0000-0000-000000000006';
UPDATE nx_suite.account SET status = 'locked' WHERE id = 'b0000000-0000-0000-0000-000000000002';
UPDATE nx_suite.organisation SET status = 'locked' WHERE id = 'a0000000-0000-0000-0000-000000000001';
SET SESSION AUTHORIZATION nx_suite_test_app;
SELECT nx_suite_test.as_account('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001');
SELECT nx_suite_test.expect((SELECT count(*) = 0 FROM nx_suite.conversation), 'deactivated membership loses access');
SELECT nx_suite_test.as_account('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002');
SELECT nx_suite_test.expect((SELECT count(*) = 0 FROM nx_suite.conversation), 'locked account loses access');
SELECT nx_suite_test.as_account('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001');
SELECT nx_suite_test.expect((SELECT count(*) = 1 FROM nx_suite.conversation), 'locked organisation stays readable for its members');
SELECT nx_suite_test.fails('INSERT INTO nx_suite.conversation(organisation_id,title,created_by) VALUES (''a0000000-0000-0000-0000-000000000001'',''x'',''b0000000-0000-0000-0000-000000000001'')', '42501', 'locked organisation accepts no new work');

RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION nx_suite_owner;
SELECT nx_suite_test.expect(
  (SELECT count(*) FROM nx_suite.conversation) + (SELECT count(*) FROM nx_suite.llm_binding)
  + (SELECT count(*) FROM nx_suite.entitlement) + (SELECT count(*) FROM nx_suite.billing_event) = 0,
  'FORCE RLS also constrains the table owner on resource tables');
RESET SESSION AUTHORIZATION;
ROLLBACK;

DO $cleanup$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname LIKE 'nx_suite_test_%')
     OR to_regnamespace('nx_suite_test') IS NOT NULL
     OR EXISTS (SELECT FROM nx_suite.organisation) OR EXISTS (SELECT FROM nx_suite.account)
     OR EXISTS (SELECT FROM nx_suite.billing_event) THEN
    RAISE EXCEPTION 'FAIL: suite test fixtures were not rolled back';
  END IF;
  RAISE NOTICE 'PASS: suite test roles, helper schema and fixtures were rolled back';
END
$cleanup$;

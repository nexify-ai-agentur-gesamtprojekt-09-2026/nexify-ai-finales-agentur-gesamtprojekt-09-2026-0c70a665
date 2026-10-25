-- All fixture data, helper functions and test principals are rolled back.
-- No external identities, credentials or application tables are used.
BEGIN;
CREATE SCHEMA nx_foundation_test;
GRANT USAGE ON SCHEMA nx_foundation_test TO nx_app, nx_foundation_owner;
CREATE FUNCTION nx_foundation_test.expect(condition boolean, label text)
RETURNS void LANGUAGE plpgsql AS $function$
BEGIN
  IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'PASS: %', label;
END
$function$;
CREATE FUNCTION nx_foundation_test.denied(statement text, label text)
RETURNS void LANGUAGE plpgsql AS $function$
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: %', label;
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: statement was not denied: %', label;
END
$function$;

CREATE ROLE nx_foundation_test_a LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE nx_foundation_test_b LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE nx_foundation_test_c LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT nx_app TO nx_foundation_test_a, nx_foundation_test_b, nx_foundation_test_c;

INSERT INTO nx_foundation.tenant(id, name) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Fixture A'),
  ('10000000-0000-0000-0000-000000000002', 'Fixture B'),
  ('10000000-0000-0000-0000-000000000003', 'Fixture C');
INSERT INTO nx_foundation.actor(id, database_principal) VALUES
  ('20000000-0000-0000-0000-000000000001', 'nx_foundation_test_a'),
  ('20000000-0000-0000-0000-000000000002', 'nx_foundation_test_b'),
  ('20000000-0000-0000-0000-000000000003', 'nx_foundation_test_c');
INSERT INTO nx_foundation.membership(tenant_id, actor_id, access_level) VALUES
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'editor'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'editor'),
  ('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'reader');
INSERT INTO nx_foundation.project(tenant_id, id, name, created_by) VALUES
  ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'A project', '20000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'B project', '20000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'C project', '20000000-0000-0000-0000-000000000003');

SELECT nx_foundation_test.expect(
  (SELECT count(*) = 3 AND bool_and(relrowsecurity AND relforcerowsecurity)
   FROM pg_class WHERE oid IN ('nx_foundation.tenant'::regclass, 'nx_foundation.membership'::regclass, 'nx_foundation.project'::regclass)),
  'tenant, membership and project have ENABLE plus FORCE RLS');
SELECT nx_foundation_test.expect(
  (SELECT count(*) = 1 FROM nx_foundation.schema_migration WHERE version = 1),
  'repeated migration retains one version record');

-- A nonowner principal: no superuser, BYPASSRLS or owner-role membership.
SET SESSION AUTHORIZATION nx_foundation_test_a;
SELECT nx_foundation_test.expect(
  (SELECT NOT rolsuper AND NOT rolbypassrls FROM pg_roles WHERE rolname = current_user)
  AND NOT pg_has_role(current_user, 'nx_foundation_owner', 'MEMBER'),
  'test actor A is a nonowner without RLS bypass');
SELECT nx_foundation_test.expect((SELECT count(*) = 0 FROM nx_foundation.project), 'missing actor and tenant denies reads');
SELECT set_config('app.mandant_id', '10000000-0000-0000-0000-000000000001', true);
SELECT nx_foundation_test.expect((SELECT count(*) = 0 FROM nx_foundation.project), 'tenant alone is not authorization');
SELECT set_config('app.actor_id', '20000000-0000-0000-0000-000000000001', true);
SELECT nx_foundation_test.expect((SELECT count(*) = 1 FROM nx_foundation.project), 'A reads only its project');
SELECT nx_foundation_test.expect((SELECT count(*) = 1 FROM nx_foundation.tenant), 'A sees only its tenant root');
SELECT nx_foundation_test.expect((SELECT count(*) = 0 FROM nx_foundation.project WHERE name IN ('B project', 'C project')), 'A cannot read B or C');
SELECT nx_foundation_test.denied('SELECT * FROM nx_foundation.actor', 'application cannot enumerate or provision identities');
SELECT nx_foundation_test.denied('SELECT * FROM nx_foundation.membership', 'application cannot read private membership table');
SELECT nx_foundation_test.denied('SET ROLE nx_foundation_owner', 'application cannot assume schema owner');
SELECT nx_foundation_test.denied('INSERT INTO nx_foundation.project(tenant_id,name,created_by) VALUES (''10000000-0000-0000-0000-000000000002'',''forbidden'',''20000000-0000-0000-0000-000000000001'')', 'A cannot insert in B');
SELECT nx_foundation_test.denied('UPDATE nx_foundation.project SET tenant_id=''10000000-0000-0000-0000-000000000002'' WHERE name=''A project''', 'WITH CHECK prevents moving A project to B');
SELECT nx_foundation_test.denied('INSERT INTO nx_foundation.project(tenant_id,name,created_by) VALUES (''10000000-0000-0000-0000-000000000001'',''forged creator'',''20000000-0000-0000-0000-000000000002'')', 'A cannot forge project creator');
WITH changed AS (UPDATE nx_foundation.project SET name = 'A changed' WHERE name = 'B project' RETURNING id)
SELECT nx_foundation_test.expect((SELECT count(*) = 0 FROM changed), 'A cannot update hidden B row');
WITH deleted AS (DELETE FROM nx_foundation.project WHERE name = 'C project' RETURNING id)
SELECT nx_foundation_test.expect((SELECT count(*) = 0 FROM deleted), 'A cannot delete hidden C row');
WITH changed AS (UPDATE nx_foundation.project SET name = 'A updated' WHERE name = 'A project' RETURNING id)
SELECT nx_foundation_test.expect((SELECT count(*) = 1 FROM changed), 'A may update own tenant project');

SAVEPOINT own_write;
INSERT INTO nx_foundation.project(tenant_id,name,created_by) VALUES
  ('10000000-0000-0000-0000-000000000001', 'rollback project', '20000000-0000-0000-0000-000000000001');
SELECT nx_foundation_test.expect((SELECT count(*) = 2 FROM nx_foundation.project), 'A may insert own tenant project');
ROLLBACK TO SAVEPOINT own_write;
SELECT nx_foundation_test.expect((SELECT count(*) = 0 FROM nx_foundation.project WHERE name = 'rollback project'), 'rolled back write leaves no project');

SELECT set_config('app.mandant_id', '10000000-0000-0000-0000-000000000002', true);
SELECT nx_foundation_test.expect((SELECT count(*) = 0 FROM nx_foundation.project), 'A switching tenant header to B remains denied');
SELECT set_config('app.actor_id', '20000000-0000-0000-0000-000000000002', true);
SELECT nx_foundation_test.expect((SELECT count(*) = 0 FROM nx_foundation.project), 'forged B actor and B tenant remain denied by session_user binding');
SET ROLE nx_app;
SELECT nx_foundation_test.expect(nx_foundation.current_actor() IS NULL, 'SET ROLE does not change authenticated actor binding');
RESET ROLE;
SELECT set_config('app.actor_id', 'malformed-uuid', true);
SELECT nx_foundation_test.expect((SELECT count(*) = 0 FROM nx_foundation.project), 'malformed actor context fails closed');
SELECT set_config('app.actor_id', '20000000-0000-0000-0000-000000000001', true);
SELECT set_config('app.mandant_id', '', true);
SELECT nx_foundation_test.expect((SELECT count(*) = 0 FROM nx_foundation.project), 'missing tenant with valid actor fails closed');
SELECT nx_foundation_test.denied('INSERT INTO nx_foundation.project(tenant_id,name,created_by) VALUES (''10000000-0000-0000-0000-000000000001'',''no context'',''20000000-0000-0000-0000-000000000001'')', 'missing tenant denies inserts');

RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION nx_foundation_test_b;
SELECT set_config('app.actor_id', '20000000-0000-0000-0000-000000000002', true);
SELECT set_config('app.mandant_id', '10000000-0000-0000-0000-000000000002', true);
SELECT nx_foundation_test.expect((SELECT count(*) = 1 FROM nx_foundation.project WHERE name = 'B project'), 'B reads own project');
SELECT nx_foundation_test.expect((SELECT count(*) = 0 FROM nx_foundation.project WHERE name = 'A updated'), 'B cannot read A');

RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION nx_foundation_test_c;
SELECT set_config('app.actor_id', '20000000-0000-0000-0000-000000000003', true);
SELECT set_config('app.mandant_id', '10000000-0000-0000-0000-000000000003', true);
SELECT nx_foundation_test.expect((SELECT count(*) = 1 FROM nx_foundation.project WHERE name = 'C project'), 'C reader sees only its project');
SELECT nx_foundation_test.denied('INSERT INTO nx_foundation.project(tenant_id,name,created_by) VALUES (''10000000-0000-0000-0000-000000000003'',''reader write'',''20000000-0000-0000-0000-000000000003'')', 'membership reader cannot insert');
WITH changed AS (UPDATE nx_foundation.project SET name = 'reader changed' WHERE name = 'C project' RETURNING id)
SELECT nx_foundation_test.expect((SELECT count(*) = 0 FROM changed), 'membership reader cannot update');

RESET SESSION AUTHORIZATION;
UPDATE nx_foundation.actor SET active = false WHERE database_principal = 'nx_foundation_test_c';
SET SESSION AUTHORIZATION nx_foundation_test_c;
SELECT nx_foundation_test.expect((SELECT count(*) = 0 FROM nx_foundation.project), 'disabled actor loses access');
RESET SESSION AUTHORIZATION;
UPDATE nx_foundation.membership SET active = false WHERE actor_id = '20000000-0000-0000-0000-000000000002';
SET SESSION AUTHORIZATION nx_foundation_test_b;
SELECT set_config('app.actor_id', '20000000-0000-0000-0000-000000000002', true);
SELECT set_config('app.mandant_id', '10000000-0000-0000-0000-000000000002', true);
SELECT nx_foundation_test.expect((SELECT count(*) = 0 FROM nx_foundation.project), 'revoked membership loses access');

RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION nx_foundation_owner;
SELECT nx_foundation_test.expect((SELECT count(*) = 0 FROM nx_foundation.project), 'FORCE RLS also constrains table owner');
RESET SESSION AUTHORIZATION;
ROLLBACK;

-- Reuse this same connection after rollback and commit: local context must not leak.
BEGIN;
SET LOCAL ROLE nx_app;
DO $test$
BEGIN
  IF nullif(current_setting('app.actor_id', true), '') IS NOT NULL
     OR nullif(current_setting('app.mandant_id', true), '') IS NOT NULL
     OR EXISTS (SELECT FROM nx_foundation.project) THEN
    RAISE EXCEPTION 'FAIL: rollback leaked tenant context';
  END IF;
  RAISE NOTICE 'PASS: same connection after rollback has no actor or tenant context';
END
$test$;
SELECT set_config('app.actor_id', '20000000-0000-0000-0000-000000000001', true);
SELECT set_config('app.mandant_id', '10000000-0000-0000-0000-000000000001', true);
COMMIT;
BEGIN;
SET LOCAL ROLE nx_app;
DO $test$
BEGIN
  IF nullif(current_setting('app.actor_id', true), '') IS NOT NULL
     OR nullif(current_setting('app.mandant_id', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: commit leaked tenant context';
  END IF;
  RAISE NOTICE 'PASS: same connection after commit has no actor or tenant context';
END
$test$;
ROLLBACK;

DO $cleanup$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname LIKE 'nx_foundation_test_%')
     OR to_regnamespace('nx_foundation_test') IS NOT NULL
     OR EXISTS (SELECT FROM nx_foundation.tenant WHERE id IN (
       '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003')) THEN
    RAISE EXCEPTION 'FAIL: test fixtures were not rolled back';
  END IF;
  RAISE NOTICE 'PASS: test roles, helper schema and fixture tenants were rolled back';
END
$cleanup$;

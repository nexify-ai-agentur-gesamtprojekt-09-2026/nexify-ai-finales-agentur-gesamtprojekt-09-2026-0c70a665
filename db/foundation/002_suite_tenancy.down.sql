-- Way back for 002_suite_tenancy.sql. Structure only: it REFUSES to run while any suite table holds a row,
-- because dropping data is irreversible and needs an explicit owner decision plus an export first.
-- 001_foundation objects are not touched.
BEGIN;
SELECT pg_advisory_xact_lock(78131002);
DO $guard$
DECLARE table_name text; has_rows boolean;
BEGIN
  IF to_regnamespace('nx_suite') IS NULL THEN
    RAISE NOTICE 'nx_suite is not installed; nothing to revert';
    RETURN;
  END IF;
  FOR table_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'nx_suite' LOOP
    EXECUTE format('SELECT EXISTS (SELECT FROM nx_suite.%I)', table_name) INTO has_rows;
    IF has_rows THEN
      RAISE EXCEPTION 'Refusing to revert: nx_suite.% holds data. Export and decide explicitly first.', table_name;
    END IF;
  END LOOP;
END
$guard$;
DROP SCHEMA IF EXISTS nx_suite CASCADE;
DO $roles$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['nx_suite_app', 'nx_suite_billing', 'nx_suite_owner'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = role_name) THEN
      IF EXISTS (SELECT FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.roleid WHERE r.rolname = role_name) THEN
        RAISE EXCEPTION 'Refusing to revert: role % still has members. Revoke the logins first.', role_name;
      END IF;
      EXECUTE format('REVOKE ALL ON SCHEMA nx_foundation FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA nx_foundation FROM %I', role_name);
      EXECUTE format('DROP ROLE %I', role_name);
    END IF;
  END LOOP;
END
$roles$;
DELETE FROM nx_foundation.schema_migration WHERE version = 2;
COMMIT;

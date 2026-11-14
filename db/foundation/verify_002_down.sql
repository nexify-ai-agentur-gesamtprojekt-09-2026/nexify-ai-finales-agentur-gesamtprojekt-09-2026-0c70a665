-- After 002_suite_tenancy.down.sql: nothing of the suite remains and the foundation is untouched.
DO $check$
BEGIN
  IF to_regnamespace('nx_suite') IS NOT NULL
     OR EXISTS (SELECT FROM pg_roles WHERE rolname IN ('nx_suite_owner', 'nx_suite_app', 'nx_suite_billing'))
     OR EXISTS (SELECT FROM nx_foundation.schema_migration WHERE version = 2) THEN
    RAISE EXCEPTION 'FAIL: way back left suite schema, roles or version record behind';
  END IF;
  IF NOT EXISTS (SELECT FROM nx_foundation.schema_migration WHERE version = 1)
     OR to_regclass('nx_foundation.project') IS NULL THEN
    RAISE EXCEPTION 'FAIL: way back damaged the foundation';
  END IF;
  RAISE NOTICE 'PASS: way back removed suite schema, roles and version record; foundation intact';
END
$check$;

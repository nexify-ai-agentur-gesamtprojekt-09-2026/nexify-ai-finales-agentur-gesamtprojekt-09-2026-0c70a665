-- New local-development foundation, not a recovered historical migration.
-- Apply as the isolated database administrator. Existing business schemas stay untouched.
BEGIN;
SELECT pg_advisory_xact_lock(78131001);

DO $roles$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['nx_foundation_owner', 'nx_app'] LOOP
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', role_name);
    END IF;
    IF EXISTS (
      SELECT FROM pg_roles WHERE rolname = role_name
        AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)
    ) OR EXISTS (
      SELECT FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
      WHERE r.rolname = role_name
    ) THEN
      RAISE EXCEPTION 'Unsafe existing foundation role: %', role_name;
    END IF;
  END LOOP;
END
$roles$;

CREATE SCHEMA IF NOT EXISTS nx_foundation AUTHORIZATION nx_foundation_owner;
DO $schema$
BEGIN
  IF (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname = 'nx_foundation') <> 'nx_foundation_owner' THEN
    RAISE EXCEPTION 'Existing nx_foundation schema has a different owner';
  END IF;
END
$schema$;
SET LOCAL ROLE nx_foundation_owner;
REVOKE ALL ON SCHEMA nx_foundation FROM PUBLIC;
GRANT USAGE ON SCHEMA nx_foundation TO nx_app;

CREATE TABLE IF NOT EXISTS nx_foundation.schema_migration (
  version integer PRIMARY KEY,
  description text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS nx_foundation.tenant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200)
);
-- Provisioned only by an administrator: a caller cannot claim another actor
-- merely by changing a custom setting or SET ROLE. session_user is DB-authenticated.
CREATE TABLE IF NOT EXISTS nx_foundation.actor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  database_principal name NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS nx_foundation.membership (
  tenant_id uuid NOT NULL REFERENCES nx_foundation.tenant(id),
  actor_id uuid NOT NULL REFERENCES nx_foundation.actor(id),
  access_level text NOT NULL CHECK (access_level IN ('reader', 'editor')),
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (tenant_id, actor_id)
);
CREATE TABLE IF NOT EXISTS nx_foundation.project (
  tenant_id uuid NOT NULL REFERENCES nx_foundation.tenant(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  created_by uuid NOT NULL REFERENCES nx_foundation.actor(id),
  PRIMARY KEY (tenant_id, id)
);

CREATE OR REPLACE FUNCTION nx_foundation.context_uuid(setting_name text)
RETURNS uuid LANGUAGE plpgsql STABLE
SET search_path = pg_catalog
AS $function$
BEGIN
  RETURN nullif(current_setting(setting_name, true), '')::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END
$function$;

CREATE OR REPLACE FUNCTION nx_foundation.current_actor()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, nx_foundation
AS $function$
  SELECT a.id FROM nx_foundation.actor a
  WHERE a.database_principal = session_user AND a.active
    AND a.id = nx_foundation.context_uuid('app.actor_id')
$function$;

-- No application privileges on actor/membership tables. The narrow definer
-- function may only answer whether this authenticated principal has access.
CREATE OR REPLACE FUNCTION nx_foundation.has_tenant_access(target_tenant uuid, require_write boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, nx_foundation
AS $function$
  SELECT coalesce(target_tenant = nx_foundation.context_uuid('app.mandant_id'), false)
    AND EXISTS (
      SELECT FROM nx_foundation.membership m
      WHERE m.tenant_id = target_tenant
        AND m.actor_id = nx_foundation.current_actor() AND m.active
        AND (NOT require_write OR m.access_level = 'editor')
    )
$function$;

ALTER TABLE nx_foundation.membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE nx_foundation.membership FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS membership_context ON nx_foundation.membership;
CREATE POLICY membership_context ON nx_foundation.membership
  USING (actor_id = nx_foundation.current_actor()
         AND tenant_id = nx_foundation.context_uuid('app.mandant_id') AND active)
  WITH CHECK (actor_id = nx_foundation.current_actor()
              AND tenant_id = nx_foundation.context_uuid('app.mandant_id') AND active);

ALTER TABLE nx_foundation.tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE nx_foundation.tenant FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_context ON nx_foundation.tenant;
CREATE POLICY tenant_context ON nx_foundation.tenant
  USING (nx_foundation.has_tenant_access(id))
  WITH CHECK (nx_foundation.has_tenant_access(id, true));

ALTER TABLE nx_foundation.project ENABLE ROW LEVEL SECURITY;
ALTER TABLE nx_foundation.project FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_read ON nx_foundation.project;
CREATE POLICY project_read ON nx_foundation.project FOR SELECT
  USING (nx_foundation.has_tenant_access(tenant_id));
DROP POLICY IF EXISTS project_insert ON nx_foundation.project;
CREATE POLICY project_insert ON nx_foundation.project FOR INSERT
  WITH CHECK (nx_foundation.has_tenant_access(tenant_id, true)
              AND created_by = nx_foundation.current_actor());
DROP POLICY IF EXISTS project_update ON nx_foundation.project;
CREATE POLICY project_update ON nx_foundation.project FOR UPDATE
  USING (nx_foundation.has_tenant_access(tenant_id, true))
  WITH CHECK (nx_foundation.has_tenant_access(tenant_id, true));
DROP POLICY IF EXISTS project_delete ON nx_foundation.project;
CREATE POLICY project_delete ON nx_foundation.project FOR DELETE
  USING (nx_foundation.has_tenant_access(tenant_id, true));

REVOKE ALL ON ALL TABLES IN SCHEMA nx_foundation FROM PUBLIC, nx_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA nx_foundation FROM PUBLIC;
GRANT EXECUTE ON FUNCTION nx_foundation.context_uuid(text),
  nx_foundation.current_actor(), nx_foundation.has_tenant_access(uuid, boolean) TO nx_app;
GRANT SELECT ON nx_foundation.tenant TO nx_app;
GRANT SELECT, INSERT, DELETE ON nx_foundation.project TO nx_app;
GRANT UPDATE (tenant_id, name) ON nx_foundation.project TO nx_app;

INSERT INTO nx_foundation.schema_migration(version, description)
VALUES (1, 'Local DB-authenticated identity, membership and forced tenant RLS')
ON CONFLICT (version) DO NOTHING;
COMMIT;

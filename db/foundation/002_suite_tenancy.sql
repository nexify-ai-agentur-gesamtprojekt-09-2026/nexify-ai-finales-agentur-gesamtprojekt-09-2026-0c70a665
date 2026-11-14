-- Suite tenancy on top of 001_foundation: account -> organisation (Mandant) -> membership/role -> resources.
-- Additive and repeatable. Applied by the isolated database administrator; not applied anywhere = no effect.
-- Way back: 002_suite_tenancy.down.sql (refuses while suite tables hold rows).
--
-- Trust model, stated honestly:
--   * Row level security is ENABLED and FORCED on every suite table. A query without any tenant filter,
--     or with another tenant's id, returns/changes nothing outside the organisation in `app.mandant_id`.
--   * The request context (`app.mandant_id`, `app.account_id`) is set per transaction by the server from
--     the authenticated session, never from request fields. RLS additionally requires an ACTIVE membership
--     of that account in that organisation, so a wrong or guessed organisation id alone opens nothing.
--   * RLS does not replace authentication: a server that sets a foreign account id is outside this guard.
--   * No DELETE privilege is granted to any application role. Records are deactivated, revoked or locked.
--   * No e-mail address, name, payment detail or secret is stored here. `external_ref` is the opaque id of
--     the account system; `vault_ref` is an opaque vault handle, never key material.
BEGIN;
SELECT pg_advisory_xact_lock(78131002);

DO $precondition$
BEGIN
  IF to_regprocedure('nx_foundation.context_uuid(text)') IS NULL THEN
    RAISE EXCEPTION '001_foundation.sql must be applied first';
  END IF;
END
$precondition$;

DO $roles$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['nx_suite_owner', 'nx_suite_app', 'nx_suite_billing'] LOOP
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', role_name);
    END IF;
    IF EXISTS (
      SELECT FROM pg_roles WHERE rolname = role_name
        AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)
    ) THEN
      RAISE EXCEPTION 'Unsafe existing suite role: %', role_name;
    END IF;
  END LOOP;
END
$roles$;

GRANT USAGE ON SCHEMA nx_foundation TO nx_suite_owner, nx_suite_app, nx_suite_billing;
GRANT EXECUTE ON FUNCTION nx_foundation.context_uuid(text) TO nx_suite_owner, nx_suite_app, nx_suite_billing;

CREATE SCHEMA IF NOT EXISTS nx_suite AUTHORIZATION nx_suite_owner;
DO $schema$
BEGIN
  IF (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname = 'nx_suite') <> 'nx_suite_owner' THEN
    RAISE EXCEPTION 'Existing nx_suite schema has a different owner';
  END IF;
END
$schema$;
SET LOCAL ROLE nx_suite_owner;
REVOKE ALL ON SCHEMA nx_suite FROM PUBLIC;
GRANT USAGE ON SCHEMA nx_suite TO nx_suite_app, nx_suite_billing;

-- ---------------------------------------------------------------- identity
CREATE TABLE IF NOT EXISTS nx_suite.account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_ref text NOT NULL UNIQUE CHECK (external_ref ~ '^[A-Za-z0-9_:-]{1,128}$'),
  email_verified_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS nx_suite.organisation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS nx_suite.membership (
  organisation_id uuid NOT NULL REFERENCES nx_suite.organisation(id),
  account_id uuid NOT NULL REFERENCES nx_suite.account(id),
  role text NOT NULL CHECK (role IN ('owner', 'member', 'billing', 'viewer')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organisation_id, account_id)
);

-- ---------------------------------------------------------------- tenant resources
CREATE TABLE IF NOT EXISTS nx_suite.conversation (
  organisation_id uuid NOT NULL REFERENCES nx_suite.organisation(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '' CHECK (length(title) <= 200),
  created_by uuid NOT NULL REFERENCES nx_suite.account(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organisation_id, id)
);
-- One subscription per organisation. `plan_ref` is a neutral identifier from configuration; no amount,
-- currency or provider name is stored. Written only by the billing role.
CREATE TABLE IF NOT EXISTS nx_suite.subscription (
  organisation_id uuid PRIMARY KEY REFERENCES nx_suite.organisation(id),
  state text NOT NULL DEFAULT 'none' CHECK (state IN ('none', 'trialing', 'active', 'past_due', 'canceled', 'ended')),
  plan_ref text CHECK (plan_ref ~ '^[a-z0-9_]{1,40}$'),
  period_end timestamptz,
  past_due_since timestamptz,
  trial_used boolean NOT NULL DEFAULT false,
  last_event_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Derived from the subscription in the same transaction; the only source for "may use chat/dashboard/connections".
CREATE TABLE IF NOT EXISTS nx_suite.entitlement (
  organisation_id uuid NOT NULL REFERENCES nx_suite.organisation(id),
  capability text NOT NULL CHECK (capability IN ('chat', 'dashboard', 'connections')),
  granted boolean NOT NULL DEFAULT false,
  valid_until timestamptz,
  source_state text NOT NULL,
  subscription_version integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organisation_id, capability)
);
-- Journal of inbound payment events. Identifiers, state and a digest only: no payload, no personal data.
CREATE TABLE IF NOT EXISTS nx_suite.billing_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider ~ '^[a-z0-9_]{1,40}$'),
  event_id text NOT NULL CHECK (event_id ~ '^[A-Za-z0-9_.:-]{1,128}$'),
  organisation_id uuid REFERENCES nx_suite.organisation(id),
  kind text NOT NULL CHECK (kind ~ '^[a-z_]{1,40}$'),
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'ignored_stale', 'retry', 'dead')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error_code text CHECK (last_error_code ~ '^[a-z0-9_]{1,60}$'),
  payload_digest text NOT NULL CHECK (payload_digest ~ '^[a-f0-9]{64}$'),
  UNIQUE (provider, event_id)
);
-- Customer's own model access: a reference into a vault, never the key. Format equals apps/selfservice/domain.py.
CREATE TABLE IF NOT EXISTS nx_suite.llm_binding (
  organisation_id uuid NOT NULL REFERENCES nx_suite.organisation(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mode text NOT NULL CHECK (mode IN ('managed', 'byo')),
  provider_ref text CHECK (provider_ref ~ '^[a-z0-9_]{1,40}$'),
  vault_ref text CHECK (vault_ref ~ '^vaultref:[a-f0-9]{32}$'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_by uuid NOT NULL REFERENCES nx_suite.account(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  PRIMARY KEY (organisation_id, id),
  CHECK (CASE mode WHEN 'byo' THEN vault_ref IS NOT NULL AND provider_ref IS NOT NULL
                   ELSE vault_ref IS NULL AND provider_ref IS NULL END),
  CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS llm_binding_one_active ON nx_suite.llm_binding (organisation_id) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS llm_binding_vault_ref_once ON nx_suite.llm_binding (vault_ref) WHERE vault_ref IS NOT NULL;
-- Append-only: who did what when in which organisation. No content, no secrets.
CREATE TABLE IF NOT EXISTS nx_suite.audit_event (
  organisation_id uuid NOT NULL REFERENCES nx_suite.organisation(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  at timestamptz NOT NULL DEFAULT now(),
  actor_account uuid REFERENCES nx_suite.account(id),
  action text NOT NULL CHECK (action ~ '^[a-z0-9_.]{1,60}$'),
  target_ref text NOT NULL DEFAULT '' CHECK (target_ref ~ '^[A-Za-z0-9_:.-]{0,128}$'),
  PRIMARY KEY (organisation_id, id)
);

-- ---------------------------------------------------------------- context
CREATE OR REPLACE FUNCTION nx_suite.current_org() RETURNS uuid LANGUAGE sql STABLE
SET search_path = pg_catalog AS $function$ SELECT nx_foundation.context_uuid('app.mandant_id') $function$;
CREATE OR REPLACE FUNCTION nx_suite.current_account() RETURNS uuid LANGUAGE sql STABLE
SET search_path = pg_catalog AS $function$ SELECT nx_foundation.context_uuid('app.account_id') $function$;

-- level: 'read' any active role; 'write' owner/member; 'admin' owner. A locked organisation stays readable
-- (export, invoices) but accepts no new work. A locked account has no access at all.
CREATE OR REPLACE FUNCTION nx_suite.has_access(target_org uuid, level text DEFAULT 'read')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, nx_suite AS $function$
  SELECT coalesce(target_org = nx_suite.current_org(), false)
    AND level IN ('read', 'write', 'admin')
    AND EXISTS (
      SELECT FROM nx_suite.membership m
      JOIN nx_suite.account a ON a.id = m.account_id
      JOIN nx_suite.organisation o ON o.id = m.organisation_id
      WHERE m.organisation_id = target_org AND m.account_id = nx_suite.current_account()
        AND m.active AND a.status = 'active'
        AND (level = 'read' OR o.status = 'active')
        AND (level = 'read' OR (level = 'write' AND m.role IN ('owner', 'member')) OR m.role = 'owner'))
$function$;

-- Server-side provisioning. The account system (not this database) authenticates; these functions only
-- record the result. Organisation creation requires a verified address (config/selfservice-policy.json).
CREATE OR REPLACE FUNCTION nx_suite.ensure_account(ref text, verified boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, nx_suite AS $function$
DECLARE found uuid;
BEGIN
  INSERT INTO nx_suite.account(external_ref, email_verified_at)
  VALUES (ref, CASE WHEN verified THEN now() END)
  ON CONFLICT (external_ref) DO UPDATE
    SET email_verified_at = coalesce(nx_suite.account.email_verified_at, CASE WHEN verified THEN now() END)
  RETURNING id INTO found;
  RETURN found;
END
$function$;

CREATE OR REPLACE FUNCTION nx_suite.create_organisation(org_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, nx_suite AS $function$
DECLARE creator uuid := nx_suite.current_account(); created uuid;
BEGIN
  IF NOT EXISTS (SELECT FROM nx_suite.account WHERE id = creator AND status = 'active' AND email_verified_at IS NOT NULL) THEN
    RAISE EXCEPTION 'verified active account required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO nx_suite.organisation(name) VALUES (org_name) RETURNING id INTO created;
  INSERT INTO nx_suite.membership(organisation_id, account_id, role) VALUES (created, creator, 'owner');
  INSERT INTO nx_suite.subscription(organisation_id) VALUES (created);
  INSERT INTO nx_suite.audit_event(organisation_id, actor_account, action) VALUES (created, creator, 'organisation.created');
  RETURN created;
END
$function$;

-- Only an owner of the organisation in context changes memberships; the last active owner cannot be removed.
CREATE OR REPLACE FUNCTION nx_suite.set_membership(target_account uuid, new_role text, is_active boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, nx_suite AS $function$
DECLARE org uuid := nx_suite.current_org();
BEGIN
  IF NOT nx_suite.has_access(org, 'admin') THEN
    RAISE EXCEPTION 'organisation owner required' USING ERRCODE = '42501';
  END IF;
  -- Serialise membership changes of this organisation: concurrent removals cannot both pass the owner check.
  PERFORM 1 FROM nx_suite.organisation WHERE id = org FOR UPDATE;
  INSERT INTO nx_suite.membership(organisation_id, account_id, role, active) VALUES (org, target_account, new_role, is_active)
  ON CONFLICT (organisation_id, account_id) DO UPDATE SET role = excluded.role, active = excluded.active;
  IF NOT EXISTS (SELECT FROM nx_suite.membership WHERE organisation_id = org AND role = 'owner' AND active) THEN
    RAISE EXCEPTION 'an organisation keeps at least one active owner' USING ERRCODE = '23514';
  END IF;
  INSERT INTO nx_suite.audit_event(organisation_id, actor_account, action, target_ref)
  VALUES (org, nx_suite.current_account(), 'membership.set', target_account::text);
END
$function$;

-- ---------------------------------------------------------------- row level security
DO $rls$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['account', 'organisation', 'membership', 'conversation', 'subscription',
                                    'entitlement', 'billing_event', 'llm_binding', 'audit_event'] LOOP
    EXECUTE format('ALTER TABLE nx_suite.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE nx_suite.%I FORCE ROW LEVEL SECURITY', table_name);
  END LOOP;
END
$rls$;

-- Identity tables: the definer functions above run as the schema owner and need the full identity view.
-- Nothing else does: the owner role cannot log in and no application role is a member of it.
DROP POLICY IF EXISTS account_definer ON nx_suite.account;
CREATE POLICY account_definer ON nx_suite.account TO nx_suite_owner USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS organisation_definer ON nx_suite.organisation;
CREATE POLICY organisation_definer ON nx_suite.organisation TO nx_suite_owner USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS membership_definer ON nx_suite.membership;
CREATE POLICY membership_definer ON nx_suite.membership TO nx_suite_owner USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS subscription_definer ON nx_suite.subscription;
CREATE POLICY subscription_definer ON nx_suite.subscription FOR INSERT TO nx_suite_owner WITH CHECK (state = 'none');
DROP POLICY IF EXISTS audit_definer ON nx_suite.audit_event;
CREATE POLICY audit_definer ON nx_suite.audit_event FOR INSERT TO nx_suite_owner WITH CHECK (true);

DROP POLICY IF EXISTS account_self ON nx_suite.account;
CREATE POLICY account_self ON nx_suite.account FOR SELECT TO nx_suite_app USING (id = nx_suite.current_account());
DROP POLICY IF EXISTS organisation_member ON nx_suite.organisation;
CREATE POLICY organisation_member ON nx_suite.organisation FOR SELECT TO nx_suite_app USING (nx_suite.has_access(id));
DROP POLICY IF EXISTS organisation_billing ON nx_suite.organisation;
CREATE POLICY organisation_billing ON nx_suite.organisation FOR SELECT TO nx_suite_billing USING (id = nx_suite.current_org());
DROP POLICY IF EXISTS membership_visible ON nx_suite.membership;
CREATE POLICY membership_visible ON nx_suite.membership FOR SELECT TO nx_suite_app
  USING (organisation_id = nx_suite.current_org()
         AND (account_id = nx_suite.current_account() AND active OR nx_suite.has_access(organisation_id, 'admin')));

DROP POLICY IF EXISTS conversation_read ON nx_suite.conversation;
CREATE POLICY conversation_read ON nx_suite.conversation FOR SELECT TO nx_suite_app USING (nx_suite.has_access(organisation_id));
DROP POLICY IF EXISTS conversation_insert ON nx_suite.conversation;
CREATE POLICY conversation_insert ON nx_suite.conversation FOR INSERT TO nx_suite_app
  WITH CHECK (nx_suite.has_access(organisation_id, 'write') AND created_by = nx_suite.current_account());
DROP POLICY IF EXISTS conversation_update ON nx_suite.conversation;
CREATE POLICY conversation_update ON nx_suite.conversation FOR UPDATE TO nx_suite_app
  USING (nx_suite.has_access(organisation_id, 'write')) WITH CHECK (nx_suite.has_access(organisation_id, 'write'));

DROP POLICY IF EXISTS llm_binding_read ON nx_suite.llm_binding;
CREATE POLICY llm_binding_read ON nx_suite.llm_binding FOR SELECT TO nx_suite_app USING (nx_suite.has_access(organisation_id));
DROP POLICY IF EXISTS llm_binding_insert ON nx_suite.llm_binding;
CREATE POLICY llm_binding_insert ON nx_suite.llm_binding FOR INSERT TO nx_suite_app
  WITH CHECK (nx_suite.has_access(organisation_id, 'admin') AND created_by = nx_suite.current_account());
DROP POLICY IF EXISTS llm_binding_update ON nx_suite.llm_binding;
CREATE POLICY llm_binding_update ON nx_suite.llm_binding FOR UPDATE TO nx_suite_app
  USING (nx_suite.has_access(organisation_id, 'admin')) WITH CHECK (nx_suite.has_access(organisation_id, 'admin'));

DROP POLICY IF EXISTS audit_read ON nx_suite.audit_event;
CREATE POLICY audit_read ON nx_suite.audit_event FOR SELECT TO nx_suite_app USING (nx_suite.has_access(organisation_id, 'admin'));
DROP POLICY IF EXISTS audit_insert ON nx_suite.audit_event;
CREATE POLICY audit_insert ON nx_suite.audit_event FOR INSERT TO nx_suite_app
  WITH CHECK (nx_suite.has_access(organisation_id) AND actor_account = nx_suite.current_account());
DROP POLICY IF EXISTS audit_billing ON nx_suite.audit_event;
CREATE POLICY audit_billing ON nx_suite.audit_event FOR INSERT TO nx_suite_billing
  WITH CHECK (organisation_id = nx_suite.current_org() AND actor_account IS NULL);

-- Subscription and entitlement: readable by members, written only by the billing role, and even that role
-- only inside the single organisation it put into the transaction context.
DROP POLICY IF EXISTS subscription_read ON nx_suite.subscription;
CREATE POLICY subscription_read ON nx_suite.subscription FOR SELECT TO nx_suite_app USING (nx_suite.has_access(organisation_id));
DROP POLICY IF EXISTS subscription_billing ON nx_suite.subscription;
CREATE POLICY subscription_billing ON nx_suite.subscription TO nx_suite_billing
  USING (organisation_id = nx_suite.current_org()) WITH CHECK (organisation_id = nx_suite.current_org());
DROP POLICY IF EXISTS entitlement_read ON nx_suite.entitlement;
CREATE POLICY entitlement_read ON nx_suite.entitlement FOR SELECT TO nx_suite_app USING (nx_suite.has_access(organisation_id));
DROP POLICY IF EXISTS entitlement_billing ON nx_suite.entitlement;
CREATE POLICY entitlement_billing ON nx_suite.entitlement TO nx_suite_billing
  USING (organisation_id = nx_suite.current_org()) WITH CHECK (organisation_id = nx_suite.current_org());
DROP POLICY IF EXISTS billing_event_service ON nx_suite.billing_event;
CREATE POLICY billing_event_service ON nx_suite.billing_event TO nx_suite_billing USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------- privileges (no DELETE anywhere)
REVOKE ALL ON ALL TABLES IN SCHEMA nx_suite FROM PUBLIC, nx_suite_app, nx_suite_billing;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA nx_suite FROM PUBLIC;
GRANT EXECUTE ON FUNCTION nx_suite.current_org(), nx_suite.current_account(), nx_suite.has_access(uuid, text)
  TO nx_suite_app, nx_suite_billing;
GRANT EXECUTE ON FUNCTION nx_suite.ensure_account(text, boolean), nx_suite.create_organisation(text),
  nx_suite.set_membership(uuid, text, boolean) TO nx_suite_app;
GRANT SELECT ON nx_suite.account, nx_suite.organisation, nx_suite.membership, nx_suite.subscription,
  nx_suite.entitlement TO nx_suite_app;
GRANT SELECT, INSERT ON nx_suite.conversation, nx_suite.llm_binding, nx_suite.audit_event TO nx_suite_app;
GRANT UPDATE (title) ON nx_suite.conversation TO nx_suite_app;
GRANT UPDATE (status, revoked_at) ON nx_suite.llm_binding TO nx_suite_app;
GRANT SELECT ON nx_suite.organisation TO nx_suite_billing;
GRANT SELECT, INSERT, UPDATE ON nx_suite.subscription, nx_suite.entitlement, nx_suite.billing_event TO nx_suite_billing;
GRANT INSERT ON nx_suite.audit_event TO nx_suite_billing;

RESET ROLE;
INSERT INTO nx_foundation.schema_migration(version, description)
VALUES (2, 'Suite tenancy: account, organisation, membership, forced RLS resources, billing journal')
ON CONFLICT (version) DO NOTHING;
COMMIT;

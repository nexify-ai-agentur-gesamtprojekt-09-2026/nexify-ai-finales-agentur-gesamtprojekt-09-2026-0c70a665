-- Prüft db/shop/001_shop.sql gegen ein echtes PostgreSQL: Mandant, Eigentümer, Idempotenz, Geld.
-- Nur in der Wegwerf-Datenbank nx_shop_fixture. Alle Testrollen, Hilfsfunktionen und
-- Testdaten werden zurückgerollt. Keine echten Kennungen, Schlüssel oder Kundendaten.
BEGIN;
DO $guard$
BEGIN
  IF current_database() <> 'nx_shop_fixture' THEN
    RAISE EXCEPTION 'Refusing to run outside nx_shop_fixture';
  END IF;
END
$guard$;
CREATE SCHEMA shop_test;
GRANT USAGE ON SCHEMA shop_test TO shop_storefront, shop_service;
CREATE FUNCTION shop_test.expect(condition boolean, label text)
RETURNS void LANGUAGE plpgsql AS $function$
BEGIN
  IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'PASS: %', label;
END
$function$;
-- Die Anweisung muss mit genau diesem SQLSTATE scheitern (42501 = verweigert, 23505 = doppelt,
-- 23514 = Prüfbedingung, 23503 = Fremdschlüssel). Alles andere, auch Erfolg, ist ein Fehlschlag.
CREATE FUNCTION shop_test.raises(statement text, expected text, label text)
RETURNS void LANGUAGE plpgsql AS $function$
DECLARE state text := 'none';
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    state := SQLSTATE;
  END;
  IF state <> expected THEN RAISE EXCEPTION 'FAIL: % (expected %, got %)', label, expected, state; END IF;
  RAISE NOTICE 'PASS: %', label;
END
$function$;
CREATE FUNCTION shop_test.affected(statement text, expected bigint, label text)
RETURNS void LANGUAGE plpgsql AS $function$
DECLARE n bigint;
BEGIN
  EXECUTE statement;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> expected THEN RAISE EXCEPTION 'FAIL: % (expected % rows, got %)', label, expected, n; END IF;
  RAISE NOTICE 'PASS: %', label;
END
$function$;
CREATE FUNCTION shop_test.ctx(actor text, tenant text, owners text)
RETURNS void LANGUAGE sql AS $function$
  SELECT set_config('app.actor_id', actor, true), set_config('app.mandant_id', tenant, true), set_config('shop.owners', owners, true)
$function$;

CREATE ROLE shop_test_a LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE shop_test_b LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE shop_test_c LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT shop_storefront, shop_service TO shop_test_a, shop_test_b, shop_test_c;

INSERT INTO nx_foundation.tenant(id, name) VALUES
  ('10000000-0000-0000-0000-00000000000a', 'Shop fixture A'),
  ('10000000-0000-0000-0000-00000000000b', 'Shop fixture B');
INSERT INTO nx_foundation.actor(id, database_principal) VALUES
  ('20000000-0000-0000-0000-00000000000a', 'shop_test_a'),
  ('20000000-0000-0000-0000-00000000000b', 'shop_test_b'),
  ('20000000-0000-0000-0000-00000000000c', 'shop_test_c');
INSERT INTO nx_foundation.membership(tenant_id, actor_id, access_level) VALUES
  ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'editor'),
  ('10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000b', 'editor'),
  ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000c', 'reader');

-- Mandant A: ein veröffentlichtes und ein unveröffentlichtes Produkt, zwei Warenkörbe verschiedener Gäste,
-- ein Konto-Warenkorb. Mandant B: ein veröffentlichtes Produkt mit derselben Kennung.
INSERT INTO shop.setting(tenant_id) VALUES ('10000000-0000-0000-0000-00000000000a'), ('10000000-0000-0000-0000-00000000000b');
INSERT INTO shop.import_run(tenant_id, id, status, environment, finished_at, error) VALUES
  ('10000000-0000-0000-0000-00000000000a', 'fixture-run-done-0001', 'done', 'fixture', now(), NULL),
  ('10000000-0000-0000-0000-00000000000a', 'fixture-run-fail-0001', 'failed', 'fixture', now(), 'internal detail');
INSERT INTO shop.category(tenant_id, id, name, root) VALUES
  ('10000000-0000-0000-0000-00000000000a', 1, 'Fixture category', true),
  ('10000000-0000-0000-0000-00000000000b', 1, 'B category', true);
INSERT INTO shop.product(tenant_id, id, bigbuy_id, name, purchase_cents, stock, active) VALUES
  ('10000000-0000-0000-0000-00000000000a', 'fx-1', 1, 'A published', 1000, 5, true),
  ('10000000-0000-0000-0000-00000000000a', 'fx-2', 2, 'A unpublished', 2000, 5, false),
  ('10000000-0000-0000-0000-00000000000b', 'fx-1', 1, 'B published', 3000, 5, true);
INSERT INTO shop.product_category(tenant_id, product_id, category_id) VALUES
  ('10000000-0000-0000-0000-00000000000a', 'fx-1', 1),
  ('10000000-0000-0000-0000-00000000000a', 'fx-2', 1),
  ('10000000-0000-0000-0000-00000000000b', 'fx-1', 1);
INSERT INTO shop.cart(tenant_id, id, owner) VALUES
  ('10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-000000000001', 'guest:' || repeat('a', 32)),
  ('10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-000000000002', 'guest:' || repeat('b', 32)),
  ('10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-000000000003', 'user:user_fixture_a'),
  ('10000000-0000-0000-0000-00000000000b', '40000000-0000-0000-0000-000000000004', 'guest:' || repeat('a', 32));
INSERT INTO shop.cart_item(tenant_id, cart_id, product_id, quantity) VALUES
  ('10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-000000000001', 'fx-1', 1),
  ('10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-000000000002', 'fx-1', 2);
INSERT INTO shop.account(tenant_id, user_id, email) VALUES ('10000000-0000-0000-0000-00000000000a', 'user_fixture_a', 'fixture@example.invalid');
INSERT INTO shop.payment_webhook(tenant_id, mode, webhook_id, url, signing_secret)
VALUES ('10000000-0000-0000-0000-00000000000a', 'sandbox', 'fixture', 'https://example.invalid/hook', 'fixture-not-a-secret');

-- Struktur --------------------------------------------------------------
SELECT shop_test.expect(
  (SELECT count(*) = 24 AND bool_and(relrowsecurity) AND count(*) FILTER (WHERE relforcerowsecurity) = 23
   FROM pg_class WHERE relnamespace = 'shop'::regnamespace AND relkind = 'r'),
  'all 24 shop tables have RLS enabled; all 23 business tables also FORCE it');
SELECT shop_test.expect(
  (SELECT count(DISTINCT tablename) = 23 FROM pg_policies WHERE schemaname = 'shop' AND policyname = 'service_delete'),
  'every business table carries the tenant-bound service policies');
SELECT shop_test.expect(
  NOT EXISTS (SELECT FROM information_schema.table_privileges WHERE table_schema = 'shop'
              AND grantee NOT IN ('shop_storefront', 'shop_service', current_user))
  AND NOT EXISTS (SELECT FROM information_schema.column_privileges WHERE table_schema = 'shop'
              AND grantee NOT IN ('shop_storefront', 'shop_service', current_user)),
  'no table or column privilege for PUBLIC, anon, authenticated, service_role or anyone else');
SELECT shop_test.expect(NOT has_schema_privilege('public', 'shop', 'USAGE'), 'schema shop is not usable by PUBLIC');
SELECT shop_test.expect((SELECT count(*) = 1 FROM shop.schema_migration WHERE version = 1), 'repeated migration retains one version record');

-- Kundenseite, Mandant A ------------------------------------------------
SET SESSION AUTHORIZATION shop_test_a;
SET ROLE shop_storefront;
SELECT shop_test.expect(
  (SELECT NOT rolsuper AND NOT rolbypassrls FROM pg_roles WHERE rolname = current_user)
  AND (SELECT count(*) = 0 FROM pg_class WHERE relnamespace = 'shop'::regnamespace AND pg_get_userbyid(relowner) IN (current_user, session_user)),
  'storefront role is a nonowner without RLS bypass');
SELECT shop_test.expect((SELECT count(*) = 0 FROM shop.product) AND (SELECT count(*) = 0 FROM shop.cart), 'no context: nothing is readable');
SELECT shop_test.ctx('', '10000000-0000-0000-0000-00000000000a', '');
SELECT shop_test.expect((SELECT count(*) = 0 FROM shop.product), 'tenant alone is not authorization');
SELECT shop_test.ctx('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000a', '');
SELECT shop_test.expect((SELECT count(*) = 0 FROM shop.product), 'claiming another principal''s actor id gives nothing');
SELECT shop_test.ctx('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000b', '');
SELECT shop_test.expect((SELECT count(*) = 0 FROM shop.product), 'tenant without membership gives nothing');

SELECT shop_test.ctx('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '');
SELECT shop_test.expect((SELECT count(*) = 1 AND min(name) = 'A published' FROM shop.product), 'public read: only the published product of the own tenant');
SELECT shop_test.expect((SELECT count(*) = 1 FROM shop.product_category), 'category link of the unpublished product is hidden');
SELECT shop_test.expect((SELECT count(*) = 1 FROM shop.category), 'categories of the own tenant only');
SELECT shop_test.expect((SELECT count(*) = 1 AND min(status) = 'done' FROM (SELECT id, status FROM shop.import_run) r), 'only finished import runs are public');
SELECT shop_test.raises('SELECT error FROM shop.import_run', '42501', 'import error detail is not public');
SELECT shop_test.expect((SELECT count(*) = 0 FROM shop.cart) AND (SELECT count(*) = 0 FROM shop.cart_item), 'no owner: no cart is visible');
SELECT shop_test.raises('SELECT 1 FROM shop.outbox', '42501', 'storefront cannot read the mail outbox');
SELECT shop_test.raises('SELECT 1 FROM shop.account', '42501', 'storefront cannot read accounts');
SELECT shop_test.raises('SELECT 1 FROM shop.account_session', '42501', 'storefront cannot read sessions');
SELECT shop_test.raises('SELECT 1 FROM shop.payment_webhook', '42501', 'storefront cannot read the webhook signing secret');
SELECT shop_test.raises('SELECT 1 FROM shop.payment_event', '42501', 'storefront cannot read payment events');
SELECT shop_test.raises('SELECT 1 FROM shop.contact_request', '42501', 'storefront cannot read contact requests');
SELECT shop_test.raises('UPDATE shop.product SET active = true', '42501', 'storefront cannot publish products');
SELECT shop_test.raises('UPDATE shop.setting SET markup_percent = 0', '42501', 'storefront cannot change the markup');
SELECT shop_test.raises($$INSERT INTO shop.price_release(tenant_id, markup_percent, released_by) VALUES ('10000000-0000-0000-0000-00000000000a', 0, 'x')$$, '42501', 'storefront cannot release prices');

-- Warenkorb: Gast a
SELECT shop_test.ctx('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'guest:' || repeat('a', 32));
SELECT shop_test.expect((SELECT count(*) = 1 AND min(id::text) = '40000000-0000-0000-0000-000000000001' FROM shop.cart), 'guest a sees exactly its own cart');
SELECT shop_test.expect((SELECT count(*) = 1 AND min(quantity) = 1 FROM shop.cart_item), 'guest a sees only its own cart items');
SELECT shop_test.expect((SELECT count(*) = 0 FROM shop.cart WHERE id = '40000000-0000-0000-0000-000000000002'), 'foreign cart is invisible');
SELECT shop_test.affected($$UPDATE shop.cart SET revision = revision + 1 WHERE id = '40000000-0000-0000-0000-000000000002'$$, 0, 'foreign cart cannot be updated');
SELECT shop_test.affected($$DELETE FROM shop.cart WHERE id = '40000000-0000-0000-0000-000000000002'$$, 0, 'foreign cart cannot be deleted');
SELECT shop_test.affected($$DELETE FROM shop.cart_item WHERE cart_id = '40000000-0000-0000-0000-000000000002'$$, 0, 'foreign cart items cannot be deleted');
SELECT shop_test.raises($$INSERT INTO shop.cart_item(tenant_id, cart_id, product_id, quantity) VALUES ('10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-000000000002', 'fx-1', 1)$$, '42501', 'cannot add an item to a foreign cart');
SELECT shop_test.raises($$INSERT INTO shop.cart(tenant_id, owner) VALUES ('10000000-0000-0000-0000-00000000000a', 'guest:' || repeat('c', 32))$$, '42501', 'cannot create a cart for another owner');
SELECT shop_test.raises($$INSERT INTO shop.cart(tenant_id, owner) VALUES ('10000000-0000-0000-0000-00000000000b', 'guest:' || repeat('a', 32))$$, '42501', 'cannot create a cart in another tenant');
SELECT shop_test.affected($$UPDATE shop.cart SET revision = revision + 1 WHERE id = '40000000-0000-0000-0000-000000000001' AND revision = 0$$, 1, 'own cart: compare-and-set succeeds once');
SELECT shop_test.affected($$UPDATE shop.cart SET revision = revision + 1 WHERE id = '40000000-0000-0000-0000-000000000001' AND revision = 0$$, 0, 'own cart: stale revision changes nothing');
SELECT shop_test.raises($$UPDATE shop.cart SET owner = 'guest:' || repeat('b', 32)$$, '42501', 'a cart cannot be handed to another owner');
SELECT shop_test.raises($$UPDATE shop.cart_item SET quantity = 21$$, '23514', 'quantity above 20 is rejected');
SELECT shop_test.raises($$UPDATE shop.cart_item SET price_seen_cents = -1$$, '23514', 'negative cents are rejected');
SELECT shop_test.raises($$INSERT INTO shop.cart_item(tenant_id, cart_id, product_id, quantity) VALUES ('10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-000000000001', 'fx-missing', 1)$$, '23503', 'cart item must reference an existing product');
SELECT shop_test.ctx('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'guest:' || repeat('a', 32) || ',not-an-owner');
SELECT shop_test.expect((SELECT count(*) = 0 FROM shop.cart), 'one malformed owner entry voids the whole owner list');
SELECT shop_test.ctx('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'guest:' || repeat('a', 32) || ',guest:' || repeat('b', 32) || ',user:user_fixture_a');
SELECT shop_test.expect((SELECT count(*) = 0 FROM shop.cart), 'more than two owners are never accepted');
SELECT shop_test.ctx('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'user:user_fixture_a,guest:' || repeat('a', 32));
SELECT shop_test.expect((SELECT count(*) = 2 FROM shop.cart), 'account plus own guest cart are both visible for the merge');
SELECT shop_test.raises($$INSERT INTO shop.cart_merge(tenant_id, id, guest_cart_id, user_owner, guest_revision, guest_snapshot) VALUES ('10000000-0000-0000-0000-00000000000a', repeat('1', 64), '40000000-0000-0000-0000-000000000002', 'user:user_fixture_a', 0, '{}')$$, '42501', 'a foreign guest cart cannot be merged');
SELECT shop_test.affected($$INSERT INTO shop.cart_merge(tenant_id, id, guest_cart_id, user_owner, guest_revision, guest_snapshot) VALUES ('10000000-0000-0000-0000-00000000000a', repeat('1', 64), '40000000-0000-0000-0000-000000000001', 'user:user_fixture_a', 1, '{}')$$, 1, 'own guest cart merge receipt is recorded');
SELECT shop_test.raises($$INSERT INTO shop.cart_merge(tenant_id, id, guest_cart_id, user_owner, guest_revision, guest_snapshot) VALUES ('10000000-0000-0000-0000-00000000000a', repeat('1', 64), '40000000-0000-0000-0000-000000000001', 'user:user_fixture_a', 1, '{}')$$, '23505', 'the same merge cannot be recorded twice');

-- Bestellung: Gast a legt an
SELECT shop_test.ctx('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'guest:' || repeat('a', 32));
INSERT INTO shop.customer_order(tenant_id, id, number, owner, idempotency_key, request_hash, subtotal_cents, shipping_cents, total_cents,
  vat_included_cents, vat_percent, address, terms_accepted_at, cart_revision, revolut_mode)
VALUES ('10000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000001', 'TK-FIXTURE-1', 'guest:' || repeat('a', 32),
  'fixture-idempotency-1', repeat('a', 64), 2000, 500, 2500, 0, 0, '{"country":"DE","email":"fixture@example.invalid"}', now(), 1, 'sandbox');
INSERT INTO shop.order_line(tenant_id, order_id, position, product_id, name, quantity, unit_cents, line_cents)
VALUES ('10000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000001', 1, 'fx-1', 'A published', 2, 1000, 2000);
INSERT INTO shop.customer_order(tenant_id, id, number, owner, idempotency_key, request_hash, subtotal_cents, shipping_cents, total_cents,
  vat_included_cents, vat_percent, address, terms_accepted_at, revolut_mode)
VALUES ('10000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000002', 'TK-FIXTURE-2', 'guest:' || repeat('a', 32),
  'fixture-idempotency-2', repeat('b', 64), 1000, 0, 1000, 0, 0, '{"country":"DE","email":"fixture@example.invalid"}', now(), 'sandbox');
INSERT INTO shop.order_line(tenant_id, order_id, position, product_id, name, quantity, unit_cents, line_cents)
VALUES ('10000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000002', 1, 'fx-1', 'A published', 1, 1000, 1000);
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;
SELECT shop_test.expect((SELECT count(*) = 2 FROM shop.customer_order) AND (SELECT count(*) = 2 FROM shop.order_line), 'owner places and reads its own orders; subtotal equals lines');
SELECT shop_test.raises($$INSERT INTO shop.customer_order(tenant_id, number, owner, idempotency_key, request_hash, subtotal_cents, shipping_cents, total_cents, vat_included_cents, vat_percent, address, terms_accepted_at, revolut_mode)
  VALUES ('10000000-0000-0000-0000-00000000000a', 'TK-FIXTURE-3', 'guest:' || repeat('a', 32), 'fixture-idempotency-1', repeat('c', 64), 0, 0, 0, 0, 0, '{"country":"DE","email":"x@example.invalid"}', now(), 'sandbox')$$,
  '23505', 'second order with the same owner and idempotency key is rejected');
SELECT shop_test.raises($$INSERT INTO shop.customer_order(tenant_id, number, owner, idempotency_key, request_hash, subtotal_cents, shipping_cents, total_cents, vat_included_cents, vat_percent, address, terms_accepted_at, revolut_mode)
  VALUES ('10000000-0000-0000-0000-00000000000a', 'TK-FIXTURE-4', 'guest:' || repeat('a', 32), 'fixture-idempotency-4', repeat('c', 64), 1000, 0, 1000, 0, 0, '{"country":"DE","email":"x@example.invalid"}', now(), 'sandbox');
  SET CONSTRAINTS ALL IMMEDIATE$$, '23514', 'order whose subtotal has no matching lines is rejected at commit');
SET CONSTRAINTS ALL DEFERRED;
SELECT shop_test.raises($$INSERT INTO shop.order_line(tenant_id, order_id, position, product_id, name, quantity, unit_cents, line_cents)
  VALUES ('10000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000001', 2, 'fx-2', 'late line', 1, 1, 1); SET CONSTRAINTS ALL IMMEDIATE$$,
  '23514', 'a line added later breaks the subtotal and is rejected');
SET CONSTRAINTS ALL DEFERRED;
SELECT shop_test.raises($$INSERT INTO shop.customer_order(tenant_id, number, owner, idempotency_key, request_hash, subtotal_cents, shipping_cents, total_cents, vat_included_cents, vat_percent, address, terms_accepted_at, revolut_mode)
  VALUES ('10000000-0000-0000-0000-00000000000a', 'TK-FIXTURE-5', 'guest:' || repeat('a', 32), 'fixture-idempotency-5', repeat('c', 64), 1000, 500, 1400, 0, 0, '{"country":"DE","email":"x@example.invalid"}', now(), 'sandbox')$$,
  '23514', 'total must equal subtotal plus shipping');
SELECT shop_test.raises($$INSERT INTO shop.customer_order(tenant_id, number, owner, idempotency_key, request_hash, subtotal_cents, shipping_cents, total_cents, vat_included_cents, vat_percent, address, terms_accepted_at, revolut_mode)
  VALUES ('10000000-0000-0000-0000-00000000000a', 'TK-FIXTURE-6', 'guest:' || repeat('a', 32), 'fixture-idempotency-6', repeat('c', 64), 0, 0, 0, 0, 0, '{"country":"US","email":"x@example.invalid"}', now(), 'sandbox')$$,
  '23514', 'unsupported delivery country is rejected');
SELECT shop_test.raises($$INSERT INTO shop.customer_order(tenant_id, number, owner, idempotency_key, request_hash, status, paid_at, paid_transitions, subtotal_cents, shipping_cents, total_cents, vat_included_cents, vat_percent, address, terms_accepted_at, revolut_mode)
  VALUES ('10000000-0000-0000-0000-00000000000a', 'TK-FIXTURE-7', 'guest:' || repeat('a', 32), 'fixture-idempotency-7', repeat('c', 64), 'bezahlt', now(), 1, 0, 0, 0, 0, 0, '{"country":"DE","email":"x@example.invalid"}', now(), 'sandbox')$$,
  '42501', 'storefront cannot create an order that is already paid');
SELECT shop_test.raises($$UPDATE shop.customer_order SET status = 'bezahlt', paid_at = now(), paid_transitions = 1$$, '42501', 'owner cannot mark its own order paid');
SELECT shop_test.raises($$DELETE FROM shop.customer_order$$, '42501', 'orders cannot be deleted from the storefront');
SELECT shop_test.raises($$UPDATE shop.order_line SET unit_cents = 1, line_cents = 2$$, '42501', 'order lines are immutable for the storefront');

-- Bestellung: Gast b (gleicher Mandant) darf nichts davon
SELECT shop_test.ctx('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'guest:' || repeat('b', 32));
SELECT shop_test.expect((SELECT count(*) = 0 FROM shop.customer_order) AND (SELECT count(*) = 0 FROM shop.order_line), 'foreign orders and their lines are invisible');
SELECT shop_test.raises($$UPDATE shop.customer_order SET tracking_number = 'x' WHERE id = '50000000-0000-0000-0000-000000000001'$$, '42501', 'foreign order cannot be changed');
SELECT shop_test.raises($$INSERT INTO shop.customer_order(tenant_id, number, owner, idempotency_key, request_hash, subtotal_cents, shipping_cents, total_cents, vat_included_cents, vat_percent, address, terms_accepted_at, revolut_mode)
  VALUES ('10000000-0000-0000-0000-00000000000a', 'TK-FIXTURE-8', 'guest:' || repeat('a', 32), 'fixture-idempotency-8', repeat('c', 64), 0, 0, 0, 0, 0, '{"country":"DE","email":"x@example.invalid"}', now(), 'sandbox')$$,
  '42501', 'cannot place an order in another owner''s name');
SELECT shop_test.raises($$INSERT INTO shop.order_line(tenant_id, order_id, position, product_id, name, quantity, unit_cents, line_cents)
  VALUES ('10000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000001', 9, 'fx-1', 'x', 1, 0, 0)$$, '42501', 'cannot add a line to a foreign order');

-- Dienstseite, Mandant A --------------------------------------------------
SET ROLE shop_service;
SELECT shop_test.ctx('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '');
SELECT shop_test.expect((SELECT count(*) = 2 FROM shop.product) AND (SELECT count(*) = 3 FROM shop.cart) AND (SELECT count(*) = 2 FROM shop.customer_order),
  'service sees the whole own tenant, published or not, and nothing of tenant B');
SELECT shop_test.affected($$INSERT INTO shop.payment(tenant_id, order_id, mode, idempotency_key, amount_cents) VALUES ('10000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000001', 'sandbox', 'fixture-payment-key-0001', 2500)$$, 1, 'payment for the order total is booked');
SELECT shop_test.raises($$INSERT INTO shop.payment(tenant_id, order_id, mode, idempotency_key, amount_cents) VALUES ('10000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000002', 'sandbox', 'fixture-payment-key-0001', 1000)$$, '23505', 'second booking with the same idempotency key is rejected');
SELECT shop_test.raises($$INSERT INTO shop.payment(tenant_id, order_id, mode, idempotency_key, amount_cents) VALUES ('10000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000001', 'sandbox', 'fixture-payment-key-0002', 2500)$$, '23505', 'an order cannot have a second payment');
SELECT shop_test.raises($$INSERT INTO shop.payment(tenant_id, order_id, mode, idempotency_key, amount_cents) VALUES ('10000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000002', 'sandbox', 'fixture-payment-key-0003', 999)$$, '23503', 'payment amount must be the order total');
SELECT shop_test.raises($$UPDATE shop.payment SET amount_cents = 1$$, '42501', 'a booked amount cannot be changed');
SELECT shop_test.affected($$INSERT INTO shop.payment_event(tenant_id, event_key, event) VALUES ('10000000-0000-0000-0000-00000000000a', repeat('e', 64), 'ORDER_COMPLETED')$$, 1, 'webhook event is recorded');
SELECT shop_test.raises($$INSERT INTO shop.payment_event(tenant_id, event_key, event) VALUES ('10000000-0000-0000-0000-00000000000a', repeat('e', 64), 'ORDER_COMPLETED')$$, '23505', 'the same webhook delivery is recorded only once');
SELECT shop_test.raises($$DELETE FROM shop.payment_event$$, '42501', 'payment events cannot be deleted');
SELECT shop_test.affected($$INSERT INTO shop.outbox(tenant_id, event_key, recipient, subject, html, text_body) VALUES ('10000000-0000-0000-0000-00000000000a', 'order_paid:customer:fixture', 'fixture@example.invalid', 's', 'h', 't')$$, 1, 'mail intent is queued');
SELECT shop_test.raises($$INSERT INTO shop.outbox(tenant_id, event_key, recipient, subject, html, text_body) VALUES ('10000000-0000-0000-0000-00000000000a', 'order_paid:customer:fixture', 'fixture@example.invalid', 's', 'h', 't')$$, '23505', 'the same mail intent is queued only once');
SELECT shop_test.affected($$UPDATE shop.customer_order SET status = 'bezahlt', paid_at = now(), paid_transitions = paid_transitions + 1 WHERE id = '50000000-0000-0000-0000-000000000001' AND status <> 'bezahlt'$$, 1, 'transition to paid happens once');
SELECT shop_test.affected($$UPDATE shop.customer_order SET status = 'bezahlt', paid_at = now(), paid_transitions = paid_transitions + 1 WHERE id = '50000000-0000-0000-0000-000000000001' AND status <> 'bezahlt'$$, 0, 'a repeated webhook does not pay twice');
SELECT shop_test.raises($$UPDATE shop.customer_order SET paid_transitions = 2 WHERE id = '50000000-0000-0000-0000-000000000001'$$, '23514', 'a second paid transition is impossible');
SELECT shop_test.raises($$UPDATE shop.customer_order SET fulfilment = 'versendet' WHERE id = '50000000-0000-0000-0000-000000000002'$$, '23514', 'an unpaid order cannot be shipped');
SELECT shop_test.raises($$UPDATE shop.customer_order SET total_cents = 1, subtotal_cents = 1$$, '42501', 'order amounts are immutable even for the service');
SELECT shop_test.raises($$UPDATE shop.customer_order SET owner = 'guest:' || repeat('b', 32)$$, '42501', 'an order cannot be reassigned');
SELECT shop_test.raises($$DELETE FROM shop.customer_order$$, '42501', 'the service cannot delete orders');
SELECT shop_test.raises($$UPDATE shop.order_line SET quantity = 1$$, '42501', 'the service cannot change order lines');
SELECT shop_test.raises($$UPDATE shop.price_release SET markup_percent = 0$$, '42501', 'price release history is append-only');
SELECT shop_test.raises($$UPDATE shop.setting SET markup_percent = 500.01$$, '23514', 'markup above the code limit is rejected');
SELECT shop_test.raises($$UPDATE shop.setting SET shipping_cents = 100001$$, '23514', 'shipping above the code limit is rejected');
SELECT shop_test.raises($$INSERT INTO shop.product(tenant_id, id, bigbuy_id, name, purchase_cents) VALUES ('10000000-0000-0000-0000-00000000000a', 'fx-3', 1, 'duplicate supplier id', 1)$$, '23505', 'supplier id is unique per tenant');
SELECT shop_test.raises($$INSERT INTO shop.product(tenant_id, id, bigbuy_id, name, purchase_cents) VALUES ('10000000-0000-0000-0000-00000000000a', 'fx-3', 3, 'negative', -1)$$, '23514', 'negative purchase price is rejected');
SELECT shop_test.raises($$INSERT INTO shop.product(tenant_id, id, bigbuy_id, name, purchase_cents) VALUES ('10000000-0000-0000-0000-00000000000b', 'fx-9', 9, 'foreign tenant', 1)$$, '42501', 'service cannot write into another tenant');
SELECT shop_test.affected($$UPDATE shop.product SET active = false WHERE name = 'B published'$$, 0, 'service cannot change another tenant''s catalog');
SELECT shop_test.affected($$INSERT INTO shop.contact_request(tenant_id, id, payload_hash, number, name, email, message, kind, consent, status) VALUES ('10000000-0000-0000-0000-00000000000a', 'request:' || repeat('f', 64), repeat('f', 64), 'NX-FIXTURE', 'n', 'fixture@example.invalid', 'm', 'contact', true, 'eingegangen')$$, 1, 'contact request is stored');
SELECT shop_test.raises($$INSERT INTO shop.contact_request(tenant_id, id, payload_hash, number, name, email, message, kind, consent, status) VALUES ('10000000-0000-0000-0000-00000000000a', 'request:' || repeat('f', 64), repeat('f', 64), 'NX-FIXTURE-2', 'n', 'fixture@example.invalid', 'm', 'contact', true, 'eingegangen')$$, '23505', 'the same request idempotency key is stored only once');

-- Zahlung ist für den Eigentümer lesbar, für andere nicht
SET ROLE shop_storefront;
SELECT shop_test.ctx('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'guest:' || repeat('a', 32));
SELECT shop_test.expect((SELECT count(*) = 1 FROM shop.payment), 'owner reads the payment of its order');
SELECT shop_test.ctx('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'guest:' || repeat('b', 32));
SELECT shop_test.expect((SELECT count(*) = 0 FROM shop.payment), 'foreign payment is invisible');

-- Nur-Lese-Mitgliedschaft -----------------------------------------------
RESET ROLE;
RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION shop_test_c;
SET ROLE shop_service;
SELECT shop_test.ctx('20000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-00000000000a', '');
SELECT shop_test.expect((SELECT count(*) = 2 FROM shop.product), 'reader membership reads the tenant');
SELECT shop_test.affected($$UPDATE shop.product SET active = true$$, 0, 'reader membership cannot update');
SELECT shop_test.raises($$INSERT INTO shop.category(tenant_id, id, name) VALUES ('10000000-0000-0000-0000-00000000000a', 2, 'x')$$, '42501', 'reader membership cannot insert');
SET ROLE shop_storefront;
SELECT shop_test.ctx('20000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-00000000000a', 'guest:' || repeat('a', 32));
SELECT shop_test.expect((SELECT count(*) = 0 FROM shop.cart), 'reader membership cannot act on carts');

-- Fremder Mandant ---------------------------------------------------------
RESET ROLE;
RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION shop_test_b;
SET ROLE shop_storefront;
SELECT shop_test.ctx('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'guest:' || repeat('a', 32));
SELECT shop_test.expect((SELECT count(*) = 1 AND min(name) = 'B published' FROM shop.product), 'tenant B reads only its own catalog');
SELECT shop_test.expect((SELECT count(*) = 1 AND min(id::text) = '40000000-0000-0000-0000-000000000004' FROM shop.cart), 'the same owner string in tenant B does not open tenant A''s cart');
SELECT shop_test.expect((SELECT count(*) = 0 FROM shop.customer_order), 'tenant B sees no order of tenant A');
SET ROLE shop_service;
SELECT shop_test.expect((SELECT count(*) = 0 FROM shop.customer_order) AND (SELECT count(*) = 0 FROM shop.payment) AND (SELECT count(*) = 0 FROM shop.outbox) AND (SELECT count(*) = 0 FROM shop.account),
  'tenant B service sees no order, payment, mail or account of tenant A');
SELECT shop_test.affected($$UPDATE shop.customer_order SET tracking_number = 'x'$$, 0, 'tenant B service cannot change tenant A''s orders');
SELECT shop_test.ctx('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000a', '');
SELECT shop_test.expect((SELECT count(*) = 0 FROM shop.customer_order) AND (SELECT count(*) = 0 FROM shop.product), 'naming tenant A without membership opens nothing');

RESET ROLE;
RESET SESSION AUTHORIZATION;
ROLLBACK;

DO $cleanup$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname LIKE 'shop_test_%')
     OR to_regnamespace('shop_test') IS NOT NULL
     OR EXISTS (SELECT FROM nx_foundation.tenant WHERE name LIKE 'Shop fixture %')
     OR EXISTS (SELECT FROM shop.product) OR EXISTS (SELECT FROM shop.customer_order) THEN
    RAISE EXCEPTION 'FAIL: test fixtures were not rolled back';
  END IF;
  RAISE NOTICE 'PASS: test roles, helper schema and fixture data were rolled back';
END
$cleanup$;

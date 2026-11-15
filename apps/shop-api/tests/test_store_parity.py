"""Comparison run: one fixed sequence of calls against the MongoDB stores and the PostgreSQL stores.

Every return value and the final state are compared as serialized text, so the same fields have to
come back in the same order (the shop API answers are built from these documents). Generated
identifiers are masked. The MongoDB side runs over the in-memory stand-in of the driver, and over a
real disposable replica set when one is confirmed; the PostgreSQL side needs the disposable local
PostgreSQL (see pg_fixture) and is skipped without it.
"""
import asyncio
from datetime import datetime, timedelta, timezone
import json
import os
import re
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import test_store_contract as contract  # noqa: E402

NOW = datetime(2026, 11, 14, 12, 0, tzinfo=timezone.utc)
T0, T1, T2 = contract.T0, contract.T1, contract.T2
GENERATED = re.compile(r'"_id":"[0-9a-f]{24,32}"')


def text(value):
    def fallback(v):
        if isinstance(v, datetime):
            return (v if v.tzinfo else v.replace(tzinfo=timezone.utc)).isoformat()
        return type(v).__name__
    return GENERATED.sub('"_id":"<generated>"', json.dumps(value, default=fallback, ensure_ascii=False, separators=(',', ':')))


async def scenario(binding):
    """Runs the sequence and returns [(step, serialized result)]. An error is recorded by its class name."""
    store, trace = binding.store, []

    async def step(label, call):
        try:
            result = call()
            result = await result if asyncio.iscoroutine(result) else result
            if hasattr(result, '__aiter__'):
                result = [item async for item in result]
        except Exception as exc:
            result = 'raised ' + type(exc).__name__
        trace.append((label, text(result)))
        return result

    # Katalog
    await binding.seed('products', [contract.product('a', 'Bremsscheibe vorn', sku='BS-100', ean='4000000000017', stock=5, purchase_cents=300, category_ids=[1, 10], images=['i'], imported_at=T0),
                                    contract.product('b', 'Bremsbelag (Satz)', sku='bb-200', stock=0, purchase_cents=100, category_ids=[1], description='nicht in Listen'),
                                    contract.product('c', 'Ölfilter Ä', sku='W.1', stock=None, purchase_cents=200, category_ids=[2]),
                                    contract.product('d', 'Bremsschlauch', stock=9, purchase_cents=50, category_ids=[1], active=False)])
    await binding.seed('categories', [{'_id': 1, 'name': 'Bremse', 'root': True}, {'_id': 2, 'name': 'Sicht'}, {'_id': 10, 'name': 'Scheiben'}])
    await binding.seed('imports', [{'_id': 'r1', 'status': 'done', 'started_at': T0, 'finished_at': T1}, {'_id': 'r2', 'status': 'failed', 'started_at': T2}])
    for sort in ('availability', 'price_asc', 'price_desc', 'name'):
        for search in ({'term': '', 'category': None, 'in_stock': False}, {'term': 'brems', 'category': 1, 'in_stock': False}, {'term': 'ölfilter ä', 'category': None, 'in_stock': False},
                       {'term': 'BS-1', 'category': None, 'in_stock': True}):
            await step(f'page {sort} {search}', lambda: store.catalog.page_search(**search, sort=sort, page=1, page_size=2))
            await step(f'count {sort} {search}', lambda: store.catalog.count_search(**search))
    await step('page 2', lambda: store.catalog.page_search(term='', category=None, in_stock=False, sort='name', page=2, page_size=2))
    await step('published', lambda: store.catalog.published_product('a'))
    await step('unpublished', lambda: store.catalog.published_product('d'))
    await step('by id', lambda: store.catalog.products_by_id(['d', 'a', 'x']))
    await step('categories', lambda: store.catalog.categories())
    await step('category', lambda: store.catalog.category(10))
    await step('counts', lambda: store.catalog.published_counts_by_category())
    await step('imports', lambda: store.catalog.recent_imports(5))
    await step('last import', lambda: store.catalog.last_finished_import())
    await step('count published', lambda: store.catalog.count_published())

    # Einstellungen
    await step('settings empty', lambda: store.catalog.shop_settings())
    await step('release first', lambda: store.settings.set_price_release({'markup_percent': '30', 'released_at': T0, 'released_by': 'user_admin'}))
    await step('pricing', lambda: store.settings.save_pricing('12.50', 495, T1, 'user_admin'))
    await step('settings', lambda: store.catalog.shop_settings())
    await step('log', lambda: store.settings.log_price_release({'_id': 'log-1', 'markup_percent': '30', 'released_at': T0, 'action': 'release'}))

    # Warenkorb
    item, other = contract.ITEM, {**contract.ITEM, 'product_id': 'b'}
    await step('cart missing', lambda: store.carts.get('guest:one'))
    await step('cart create', lambda: store.carts.replace_items('guest:one', None, [item, other], create=True))
    await step('cart', lambda: store.carts.get('guest:one'))
    await step('cart stale', lambda: store.carts.replace_items('guest:one', 7, [], create=False))
    await step('cart twice', lambda: store.carts.replace_items('guest:one', None, [], create=True))

    async def merge(tx):
        guest = await store.carts.get('guest:one', tx=tx)
        await store.carts.replace_items('user:two', None, guest['items'], create=True, tx=tx)
        await store.carts.replace_items('guest:one', guest['revision'], [], create=False, tx=tx, archive_entry={'id': 'm1', 'guest_snapshot': {'items': guest['items']}})
    await step('cart merge', lambda: store.carts.in_transaction(merge))

    async def failing(tx):
        await store.carts.replace_items('user:three', None, [item], create=True, tx=tx)
        await store.carts.replace_items('guest:one', 99, [], create=False, tx=tx)
    await step('cart merge stale', lambda: store.carts.in_transaction(failing))
    await step('cart remove', lambda: store.carts.remove_products('user:two', 1, ['a', 'x']))
    await step('cart remove stale', lambda: store.carts.remove_products('user:two', 1, ['b']))
    for owner in ('guest:one', 'user:two', 'user:three'):
        await step('cart ' + owner, lambda: store.carts.get(owner))

    # Konten
    user = contract.account('user_a', 'a@example.invalid')
    await step('user create', lambda: store.accounts.create_user(user))
    await step('user passed in', lambda: sorted(user))
    await step('user duplicate', lambda: store.accounts.create_user(contract.account('user_b', 'a@example.invalid')))
    await step('user by email', lambda: store.accounts.user_by_email('a@example.invalid'))
    await step('hash', lambda: store.accounts.set_password_hash_verified('user_a', 'new-hash'))
    await step('google', lambda: store.accounts.mark_google_linked('user_a'))
    await step('role', lambda: store.accounts.set_role_and_password_hash('a@example.invalid', 'admin', 'admin-hash'))
    await step('user by id', lambda: store.accounts.user_by_id('user_a'))
    await step('profile', lambda: store.accounts.profile_by_id('user_a'))
    await step('role and hash', lambda: store.accounts.role_and_hash_by_email('a@example.invalid'))
    await step('taken', lambda: store.accounts.email_taken('a@example.invalid'))
    await step('session create', lambda: store.accounts.create_session('1' * 64, 'user_a', T0, NOW + timedelta(days=14, microseconds=123000)))  # whole milliseconds: MongoDB stores no finer instant, the stand-in would keep it
    await step('session', lambda: store.accounts.session('1' * 64))
    await step('session delete', lambda: store.accounts.delete_sessions_of('user_a'))
    await step('session gone', lambda: store.accounts.session('1' * 64))
    for minutes in (20, 15, 1):
        await step('failure', lambda: store.accounts.record_login_failure('a@example.invalid', NOW - timedelta(minutes=minutes)))
    await step('failures', lambda: store.accounts.count_login_failures('a@example.invalid', NOW - timedelta(minutes=15)))
    await step('failures clear', lambda: store.accounts.clear_login_failures('a@example.invalid'))
    await step('failures none', lambda: store.accounts.count_login_failures('a@example.invalid', NOW - timedelta(days=1)))
    await step('reset create', lambda: store.accounts.create_password_reset('a' * 64, 'user_a', NOW + timedelta(minutes=60)))
    await step('reset mail', lambda: store.accounts.set_password_reset_mail_status('a' * 64, 'gesendet'))
    await step('reset late', lambda: store.accounts.consume_password_reset('a' * 64, NOW + timedelta(minutes=60)))
    await step('reset', lambda: store.accounts.consume_password_reset('a' * 64, NOW))
    await step('reset again', lambda: store.accounts.consume_password_reset('a' * 64, NOW))

    # Werkstatt und Kontaktanfragen
    await step('workshops', lambda: store.workshops.add_many([contract.workshop('w1', zip='10115', city_key='berlin', lat=52.53, lon=13.38, phone=None),
                                                              contract.workshop('w2', zip='10117', city_key='berlin', lat=52.52, lon=13.39),
                                                              contract.workshop('w3', zip='10115', city_key='berlin')]))
    for label, call in (('zip', lambda: store.workshops.points_by_zip('10115')), ('city prefix', lambda: store.workshops.points_by_city_prefix('ber', 1)),
                        ('box', lambda: store.workshops.located_in_box(52.52, 52.53, 13.38, 13.39)), ('unlocated', lambda: store.workshops.unlocated_by_zip('10115', 5)),
                        ('one', lambda: store.workshops.get('w1')), ('count', lambda: store.workshops.estimated_count())):
        await step('workshop ' + label, call)
    request = {'_id': 'WA-1', 'workshop_id': 'w1', 'name': 'N', 'consent': True, 'status': 'S', 'created_at': T0}
    await step('workshop request', lambda: store.workshops.add_request(dict(request)))
    await step('workshop request read', lambda: store.workshops.request('WA-1'))
    first = contract.contact('a')
    await step('request', lambda: store.requests.add(dict(first)))
    await step('request twice', lambda: store.requests.add({**first, 'message': 'x'}))
    await step('request pending', lambda: store.requests.pending_notifications(5))
    await step('request recorded', lambda: store.requests.record_notification(first['_id'], 'gesendet'))
    await step('request read', lambda: store.requests.get(first['_id']))
    await step('request rate', lambda: store.requests.count_from_email_since('a@example.invalid', T0))

    # Postausgang
    await step('mail add', lambda: store.outbox.add('order_paid:customer:o1', 'a@example.invalid', 'S', '<p>H</p>', 'T', None, T0))
    await step('mail twice', lambda: store.outbox.add('order_paid:customer:o1', 'b@example.invalid', 'S', 'H', 'T', '', T1))
    await step('mail add 2', lambda: store.outbox.add('order_status:versendet:o1', 'a@example.invalid', 'S2', 'H', 'T', 'r@example.invalid', T1))
    await step('mail keys', lambda: store.outbox.deliverable_keys(5, 10))
    await step('mail claim', lambda: store.outbox.claim('order_paid:customer:o1', 'c1', T1, 5))
    await step('mail claim again', lambda: store.outbox.claim('order_paid:customer:o1', 'c2', T1, 5))
    await step('mail wrong owner', lambda: store.outbox.start_sending('order_paid:customer:o1', 'c2', T1))
    await step('mail sending', lambda: store.outbox.start_sending('order_paid:customer:o1', 'c1', T1))
    await step('mail sent', lambda: store.outbox.mark_sent('order_paid:customer:o1', 'c1', T2, None))
    await step('mail event', lambda: store.outbox.record_provider_event('order_paid:customer:o1', 'delivered', T2))
    await step('mail claim 2', lambda: store.outbox.claim('order_status:versendet:o1', 'c3', T0, 5))
    await step('mail finish', lambda: store.outbox.finish('order_status:versendet:o1', 'c3', 'fehlgeschlagen', 'not_configured', T1, count_attempt=True, retry_safe=True))
    await step('mail claim 3', lambda: store.outbox.claim('order_status:versendet:o1', 'c4', T0, 5))
    await step('mail release', lambda: store.outbox.release_stale_preparations(T1))
    await step('mail quarantine', lambda: store.outbox.quarantine_unverifiable_claims())
    await step('mail stale sending', lambda: store.outbox.quarantine_stale_sendings(T1))
    await step('mail sent count', lambda: store.outbox.count_sent_since('2026-11-14'))
    await step('mail summaries', lambda: store.outbox.recent_summaries(5))
    await step('mail of order', lambda: store.outbox.order_mails('o1'))
    for key in ('order_paid:customer:o1', 'order_status:versendet:o1'):
        await step('mail ' + key, lambda: store.outbox.get(key))
        await step('mail summary ' + key, lambda: store.outbox.summary(key))

    # Bestellung, Zahlung, Lieferant
    order = contract.order('o1', key='key-1')
    await step('order add', lambda: store.orders.add(dict(order)))
    await step('order twice', lambda: store.orders.add(contract.order('o2', key='key-1')))
    await step('order other', lambda: store.orders.add(contract.order('o3', owner='guest:g', created_at=T1)))
    await step('order by key', lambda: store.orders.by_idempotency_key('user:a', 'key-1'))
    await step('order error', lambda: store.orders.record_payment_error('o1', 'revolut_unreachable'))
    await step('order checkout', lambda: store.orders.record_checkout('o1', 'rev-1', 'https://checkout.example.invalid/1', 'pending'))
    await step('order state', lambda: store.orders.record_payment_state('o1', 'processing'))
    await step('order failed', lambda: store.orders.mark_payment_failed('o1'))
    await step('order paid', lambda: store.orders.mark_paid('o1', T1))
    await step('order paid again', lambda: store.orders.mark_paid('o1', T2))
    await step('order pending mails', lambda: store.orders.paid_with_pending_mails())
    await step('order mails recorded', lambda: store.orders.mark_paid_mails_recorded('o1'))
    await step('order claim', lambda: store.orders.claim_supplier_submission('o1', T1))
    await step('order claim again', lambda: store.orders.claim_supplier_submission('o1', T2))
    await step('order supplier failure', lambda: store.orders.record_supplier_failure('o1', 'insufficient_balance', T1))
    await step('order claim retry', lambda: store.orders.claim_supplier_submission('o1', T2))
    await step('order supplier', lambda: store.orders.record_supplier_order('o1', None, 'BB-1', 'SEUR', T2, T2))
    await step('order delivery stale', lambda: store.orders.change_delivery_state('o1', None, {'fulfilment': 'versendet'}))
    await step('order delivery', lambda: store.orders.change_delivery_state('o3', None, {'fulfilment': 'in_bearbeitung', 'processing_at': T1, 'status_changed_by': 'user_admin'}))
    await step('order shipped', lambda: store.orders.mark_shipped('o1', 'TR-1', 'SEUR', T2))
    await step('order shipped again', lambda: store.orders.mark_shipped('o1', 'TR-2', 'GLS', T2))
    await step('order by provider', lambda: store.orders.by_provider_order_id('rev-1'))
    await step('order for owners', lambda: store.orders.get_for_owners('o3', ['user:a', 'guest:g']))
    await step('order foreign', lambda: store.orders.get_for_owners('o3', ['user:a']))
    await step('orders of owner', lambda: store.orders.recent_of_owner('user:a', 5))
    await step('orders overview', lambda: store.orders.recent_without_lines(5))
    registration = {'_id': 'sandbox', 'webhook_id': 'w1', 'url': 'https://example.invalid/hook', 'signing_secret': 'synthetic-one', 'events': ['E'], 'stored_at': T0}
    await step('hook save', lambda: store.payments.save_webhook_registration('sandbox', dict(registration)))
    await step('hook replace', lambda: store.payments.save_webhook_registration('sandbox', {'_id': 'sandbox', 'webhook_id': 'w2', 'signing_secret': 'synthetic-two'}))
    await step('hook', lambda: store.payments.webhook_registration('sandbox'))
    await step('hooks', lambda: store.payments.webhook_registrations())
    await step('event', lambda: store.payments.record_webhook_event('k' * 64, 'ORDER_COMPLETED', 'rev-1', T1))
    await step('event twice', lambda: store.payments.record_webhook_event('k' * 64, 'ORDER_FAILED', 'rev-1', T2))
    await step('events', lambda: binding.events())
    await step('release log', lambda: binding.release_log())
    return trace


class ComparisonRun(unittest.IsolatedAsyncioTestCase):
    maxDiff = None

    async def compare(self, mongo_binding):
        class Mongo(mongo_binding):
            def runTest(self): pass
        class Postgres(contract.DisposablePostgresBinding):
            def runTest(self): pass
        old, new = Mongo('runTest'), Postgres('runTest')
        for binding in (old, new):
            binding.addCleanup, binding.addAsyncCleanup = self.addCleanup, self.addAsyncCleanup
            await binding.asyncSetUp()
        expected, actual = await scenario(old), await scenario(new)
        self.assertEqual([label for label, _ in actual], [label for label, _ in expected])
        different = [(label, was, now) for (label, was), (_, now) in zip(expected, actual) if was != now]
        self.assertEqual(different, [], 'every step returns the same text from both stores')
        self.assertGreater(len(expected), 150)
        return len(expected)

    async def test_postgres_answers_like_the_mongodb_stores_over_the_stand_in(self):
        await self.compare(contract.InMemoryBinding)

    async def test_postgres_answers_like_the_mongodb_stores_over_a_real_replica_set(self):
        await self.compare(contract.DisposableMongoBinding)


if __name__ == '__main__': unittest.main()

"""Actual disposable Mongo budget/lease tests with an inert HTTP provider."""
import asyncio
from datetime import datetime, timedelta, timezone
import secrets
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import uuid

from test_shop_cart_transactions import URI
from test_shop_recovery_contract_20261031 import load_function


@unittest.skipUnless(URI, 'disposable loopback Mongo replica set not selected')
class MailBudget(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        if URI != 'mongodb://127.0.0.1:27028/?replicaSet=nexify_cart_test':
            self.fail('Only the disposable loopback replica set is permitted')
        from motor.motor_asyncio import AsyncIOMotorClient
        from pymongo.errors import DuplicateKeyError
        from pymongo.write_concern import WriteConcern
        self.client = AsyncIOMotorClient(URI, serverSelectionTimeoutMS=5000)
        self.db = self.client['nexify_mail_test_' + uuid.uuid4().hex]
        self.calls, self.cap, self.outcome = [], '3', 200
        subject = self
        class HTTPError(Exception):
            pass
        class Client:
            def __init__(self, **kwargs): pass
            async def __aenter__(self): return self
            async def __aexit__(self, *args): pass
            async def post(self, url, json, headers):
                subject.calls.append(headers['Idempotency-Key'])
                await asyncio.sleep(0)
                if subject.outcome == 'unknown':
                    raise HTTPError('fixture lost ACK')
                return SimpleNamespace(status_code=subject.outcome, json=lambda: {'id': 'fixture'})
        self.ns = {'db': self.db, 'datetime': datetime, 'timedelta': timedelta, 'timezone': timezone,
                   'secrets': secrets, 'MAX_ATTEMPTS': 5, 'CLAIM_LEASE_SECONDS': 300, 'transport': None,
                   'DuplicateKeyError': DuplicateKeyError, 'now_iso': lambda: datetime.now(timezone.utc).isoformat(),
                   'WriteConcern': WriteConcern,
                   'httpx': SimpleNamespace(AsyncClient=Client, HTTPError=HTTPError),
                   'sender': lambda: 'fixture@example.invalid',
                   'setting': lambda name: {'RESEND_API_KEY': 'fixture-not-a-secret', 'MAIL_DAILY_CAP': self.cap}.get(name, '')}
        for name in ('reserve_daily_slot', '_finish', 'deliver', 'retry_pending'):
            load_function('apps/shop-api/shop/mailer.py', name, self.ns)

    async def asyncTearDown(self):
        self.client.close()

    async def queue(self, key):
        await self.db.outbox.insert_one({'_id': key, 'status': 'wartend', 'attempts': 0,
                                        'to': 'fixture@example.invalid', 'subject': 'fixture', 'html': '', 'text': ''})

    async def test_parallel_workers_reserve_at_most_cap(self):
        for i in range(30): await self.queue(str(i))
        await asyncio.gather(*(self.ns['deliver'](str(i)) for i in range(30)))
        self.assertEqual(len(self.calls), 3)
        counter = await self.db.settings.find_one({})
        self.assertEqual(counter['reserved'], 3)

    async def test_missing_invalid_unicode_limits_send_nothing(self):
        for i, cap in enumerate(('', '-1', 'NaN', '1.5', '９', '1000000000')):
            self.cap = cap
            await self.queue(str(i))
            await self.ns['deliver'](str(i))
        self.assertEqual(self.calls, [])
        self.assertEqual(await self.db.settings.count_documents({}), 0)

    async def test_zero_is_explicit_pause(self):
        self.cap = '0'
        await self.queue('a')
        await self.ns['deliver']('a')
        self.assertEqual(self.calls, [])

    async def test_unknown_outcome_consumes_slot_and_is_never_blindly_retried(self):
        self.cap, self.outcome = '1', 'unknown'
        await self.queue('a'); await self.queue('b')
        await self.ns['deliver']('a')
        await self.ns['retry_pending']()
        self.assertEqual(self.calls, ['a'])
        self.assertEqual((await self.db.outbox.find_one({'_id': 'a'}))['status'], 'abgleich_erforderlich')
        self.assertEqual((await self.db.settings.find_one({}))['reserved'], 1)

    async def test_expired_preparation_cannot_send_after_reservation(self):
        self.cap = '1'
        reserve = self.ns['reserve_daily_slot']
        async def expire(today, cap):
            result = await reserve(today, cap)
            await self.db.outbox.update_one({'_id': 'a'}, {'$set': {'claim_id': 'new-worker', 'status': 'wartend'}})
            return result
        self.ns['reserve_daily_slot'] = expire
        await self.queue('a')
        await self.ns['deliver']('a')
        self.assertEqual(self.calls, [])
        self.assertEqual((await self.db.settings.find_one({}))['reserved'], 1)
        self.ns['reserve_daily_slot'] = reserve
        await self.ns['deliver']('a')
        self.assertEqual(self.calls, [])  # conservative lost capacity, no overspend

    async def test_restart_uses_durable_counter(self):
        self.cap = '1'
        await self.queue('a'); await self.queue('b')
        await self.ns['deliver']('a')
        load_function('apps/shop-api/shop/mailer.py', 'reserve_daily_slot', self.ns)
        await self.ns['deliver']('b')
        self.assertEqual(self.calls, ['a'])

    async def test_legacy_success_is_counted_on_first_reservation(self):
        self.cap = '1'
        await self.db.outbox.insert_one({'_id': 'legacy', 'status': 'gesendet', 'sent_at': datetime.now(timezone.utc).isoformat()})
        await self.queue('a'); await self.ns['deliver']('a')
        self.assertEqual(self.calls, [])

    async def test_legacy_unknown_is_reserved_until_reconciled(self):
        self.cap = '1'
        await self.db.outbox.insert_one({'_id': 'legacy', 'status': 'abgleich_erforderlich'})
        await self.queue('a'); await self.ns['deliver']('a')
        self.assertEqual(self.calls, [])

    async def test_reservation_failure_never_reaches_provider(self):
        async def broken(today, cap): raise RuntimeError('injected store failure')
        self.ns['reserve_daily_slot'] = broken
        await self.queue('a')
        with self.assertRaisesRegex(RuntimeError, 'injected store failure'):
            await self.ns['deliver']('a')
        self.assertEqual(self.calls, [])

    async def test_legacy_failed_without_proven_rejection_is_reserved(self):
        self.cap = '1'
        await self.db.outbox.insert_one({'_id': 'legacy', 'status': 'fehlgeschlagen'})
        await self.queue('a'); await self.ns['deliver']('a')
        self.assertEqual(self.calls, [])

    async def test_midnight_defers_without_provider_io_until_new_day_reservation(self):
        reserve = self.ns['reserve_daily_slot']
        tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
        async def cross_midnight(today, cap):
            result = await reserve(today, cap)
            self.ns['datetime'] = SimpleNamespace(now=lambda zone: tomorrow)
            return result
        self.ns['reserve_daily_slot'] = cross_midnight
        await self.queue('a'); await self.ns['deliver']('a')
        self.assertEqual(self.calls, [])
        row = await self.db.outbox.find_one({'_id': 'a'})
        self.assertEqual(row['last_error'], 'daily_budget_day_changed')
        self.ns['reserve_daily_slot'] = reserve
        await self.ns['deliver']('a')
        self.assertEqual(self.calls, ['a'])
        self.assertEqual(await self.db.settings.count_documents({}), 2)


if __name__ == '__main__':
    unittest.main()

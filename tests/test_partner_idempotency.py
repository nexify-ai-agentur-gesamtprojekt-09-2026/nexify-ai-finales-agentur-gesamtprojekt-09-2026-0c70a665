import http.client
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('partner_gateway_test', ROOT / 'apps/agent-gateway/server.py')
gateway = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gateway)

class PartnerHTTPTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = gateway.Store(Path(self.tmp.name) / 'db.sqlite')
        self.server = gateway.build_server(self.store, port=0)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.origin = f'http://127.0.0.1:{self.server.server_port}'
        self.cookie, self.csrf = self.session()
        self.payload = {'tenant':'tenant-a','company':'Fixture','contact':'Test','email':'test@example.invalid','message':'Test','locale':'de'}
    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join(2); self.tmp.cleanup()
    def req(self, method, path, body=None, cookie=None, csrf=None, key='test-key-0001'):
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        headers = {}
        if cookie: headers['Cookie'] = cookie
        if method == 'GET' and '/receipt' in path: headers['Idempotency-Key'] = key
        if method == 'POST':
            headers.update({'Origin':self.origin,'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':key})
        conn.request(method, path, None if body is None else json.dumps(body).encode(), headers)
        r=conn.getresponse(); raw=r.read(); result=(r.status,json.loads(raw),dict(r.getheaders())); conn.close(); return result
    def session(self):
        status, data, headers = self.req('GET','/api/session')
        self.assertEqual(status,200)
        return headers['Set-Cookie'].split(';',1)[0],data['csrf']
    def post(self, body=None, cookie=None, csrf=None, key='test-key-0001'):
        return self.req('POST','/api/partner/requests',body or self.payload,cookie or self.cookie,csrf or self.csrf,key)
    def test_replay_conflict_readback_and_isolation(self):
        status, first, _ = self.post(); self.assertEqual(status,200)
        # Model a lost response: after the first commit, read back and retry with the same key.
        status, readback, _ = self.req('GET','/api/partner/requests/mine',cookie=self.cookie)
        self.assertEqual(status,200); self.assertEqual([x['id'] for x in readback['requests']], [first['id']])
        self.assertEqual(self.post()[1],first)
        status, conflict, _ = self.post({**self.payload,'message':'Different'})
        self.assertEqual((status, conflict['error']),(409,'idempotency_conflict'))
        status, other_tenant, _ = self.post({**self.payload,'tenant':'tenant-b'})
        self.assertEqual(status,200); self.assertNotEqual(other_tenant['id'],first['id'])
        cookie, csrf = self.session()
        status, other_owner, _ = self.post(cookie=cookie,csrf=csrf)
        self.assertEqual(status,200); self.assertNotEqual(other_owner['id'],first['id'])
        read_other=self.req('GET','/api/partner/requests/mine',cookie=cookie)[1]
        self.assertEqual([x['id'] for x in read_other['requests']],[other_owner['id']])
        with self.store.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM partner_requests').fetchone()[0],3)
    def test_exact_receipt_is_scoped_and_not_a_delivery_claim(self):
        receipt_path = '/api/partner/requests/receipt?tenant=tenant-a'
        self.assertEqual(self.req('GET',receipt_path,cookie=self.cookie)[0],404)
        first=self.post()[1]
        status, receipt, headers=self.req('GET',receipt_path,cookie=self.cookie)
        self.assertEqual(status,200); self.assertEqual(receipt,first)
        self.assertEqual(headers['Cache-Control'],'no-store')
        self.assertFalse(receipt['received']); self.assertFalse(receipt['delivered'])
        self.assertEqual(self.req('GET',receipt_path,cookie=self.cookie,key='another-key-001')[0],404)
        self.assertEqual(self.req('GET','/api/partner/requests/receipt?tenant=tenant-b',cookie=self.cookie)[0],404)
        other, _=self.session()
        self.assertEqual(self.req('GET',receipt_path,cookie=other)[0],404)
        self.assertEqual(self.req('GET',receipt_path)[0],401)
        self.assertEqual(self.req('GET',receipt_path,cookie=self.cookie,key='')[0],422)
        self.assertEqual(self.req('GET',receipt_path+'&tenant=tenant-b',cookie=self.cookie)[0],422)

    def test_receipt_storage_error_is_not_reported_as_absence(self):
        with self.store.connect() as db:
            db.execute('DROP TABLE receipts')
        status, body, _ = self.req('GET','/api/partner/requests/receipt?tenant=tenant-a',cookie=self.cookie)
        self.assertEqual((status,body['error']),(503,'storage_unavailable'))

    def test_missing_key_and_parallel_replay(self):
        self.assertEqual(self.post(key='')[0],422)
        with ThreadPoolExecutor(max_workers=4) as pool:
            results=list(pool.map(lambda _:self.post(),range(4)))
        self.assertEqual([r[0] for r in results],[200]*4)
        self.assertEqual(len({r[1]['id'] for r in results}),1)
        with self.store.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM partner_requests').fetchone()[0],1)
    def test_atomic_rollback_on_receipt_failure(self):
        with self.store.connect() as db:
            db.execute("CREATE TRIGGER test_receipt_failure BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT, 'synthetic'); END")
        import sqlite3
        spec = importlib.util.spec_from_file_location('partner_direct_test', ROOT / 'apps/agent-gateway/partner.py')
        mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
        reception = mod.PartnerReception(self.store.connect)
        with self.assertRaises(sqlite3.IntegrityError):
            reception.submit('fixture-owner', 'tenant-a', {k:v for k,v in self.payload.items() if k != 'tenant'}, 'test-key-0001')
        with self.store.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM partner_requests').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT count(*) FROM receipts').fetchone()[0], 0)
    def test_replay_after_server_restart(self):
        status, first, _ = self.post(); self.assertEqual(status, 200)
        self.server.shutdown(); self.server.server_close(); self.thread.join(2)
        self.store = gateway.Store(Path(self.tmp.name) / 'db.sqlite')
        self.server = gateway.build_server(self.store, port=0)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True); self.thread.start()
        self.origin = f'http://127.0.0.1:{self.server.server_port}'
        status, repeated, _ = self.post()
        self.assertEqual(status, 200); self.assertEqual(repeated, first)
    def test_concurrent_divergent_payloads_create_one_request(self):
        payloads = [self.payload, {**self.payload, 'message':'Different'}]
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(self.post, payloads))
        self.assertEqual(sorted(r[0] for r in results), [200,409])
        self.assertEqual(next(r[1]['error'] for r in results if r[0] == 409), 'idempotency_conflict')
        with self.store.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM partner_requests').fetchone()[0],1)
            self.assertEqual(db.execute('SELECT count(*) FROM receipts').fetchone()[0],1)

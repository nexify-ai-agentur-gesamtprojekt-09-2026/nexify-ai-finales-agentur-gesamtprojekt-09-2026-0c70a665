"""Local SQLite + loopback tests; fake supplier transport only."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from email.message import Message
import hashlib
import http.client
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from tools.bigbuy_batch import stage_raw_streams

ROOT=Path(__file__).resolve().parents[1]
def load(name,path):
    spec=importlib.util.spec_from_file_location(name,ROOT/path);module=importlib.util.module_from_spec(spec);sys.modules[name]=module;spec.loader.exec_module(module);return module
local=load('local_bigbuy_test','apps/agent-gateway/bigbuy_local.py')
api=load('bigbuy_api_local_test','apps/agent-gateway/bigbuy_get.py')
gateway=load('bigbuy_gateway_local_test','apps/agent-gateway/server.py')

class Reply(io.BytesIO):
    def __init__(self,url,body):
        super().__init__(body);self.status=200;self.url=url;self.headers=Message();self.headers['Content-Type']='application/json'
    def geturl(self):return self.url

class Tests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix="nexify-bigbuy-isolated-");self.addCleanup(self.temp.cleanup)
        self.store=gateway.Store(Path(self.temp.name)/'db.sqlite')
        self.box=local.LocalBigBuyStore(self.store,account='fixture',environment='sandbox',initialize=True,clock=lambda:1800000000)
    def make_staged(self):
        payload={'products':[{'id':1,'sku':'P','ean13':'000123'}],
                 'variations':[{'id':2,'product':1,'sku':'V','ean13':'000456'}],
                 'stock':[{'sku':'V','stocks':[{'quantity':1,'minHandlingDays':0,'maxHandlingDays':1}]}]}
        receipts=[]
        for resource,data in payload.items():
            raw=json.dumps(data).encode()
            def fake(request,timeout,body=raw):return Reply(request.full_url,body)
            receipts.append(self.box.fetch_page(api.read_page,api.ReadConfig('sandbox','synthetic-key'),resource=resource,page=0,page_size=10,
                max_bytes=4096,timeout_seconds=2,transport=fake,
                now_utc=lambda:datetime(2026,10,30,10,0,tzinfo=timezone.utc)))
        return api.stage_saved(receipts=receipts,store=self.box,stage_raw_streams=stage_raw_streams,scope='fixture',
            now='2026-10-30T10:01:00Z',max_age_seconds=120,max_raw_bytes=12000)
    def test_atomic_quota_shared_and_scoped(self):
        with ThreadPoolExecutor(max_workers=12) as pool:
            result=list(pool.map(lambda _:self.box.claim('sandbox','products'),range(12)))
        self.assertEqual(sum(result),10)
        other=local.LocalBigBuyStore(self.store,account='other',environment='sandbox',clock=lambda:1800000000)
        self.assertTrue(other.claim('sandbox','products'))
        self.assertTrue(self.box.claim('sandbox','stock'))
        with self.assertRaisesRegex(local.LocalBigBuyError,'invalid_scope'):self.box.claim('production','stock')
    def test_artifact_scope_integrity_and_permissions(self):
        raw=b'fixture';sha=hashlib.sha256(raw).hexdigest();self.box.put(sha,raw);self.box.put(sha,raw)
        self.assertEqual(self.box.get(sha,100),raw)
        other=local.LocalBigBuyStore(self.store,account='other',environment='sandbox')
        with self.assertRaisesRegex(local.LocalBigBuyError,'artifact_not_available'):other.get(sha,100)
        with self.store.connect() as db:db.execute("UPDATE bigbuy_raw_local SET body=? WHERE sha256=?",(b'bad',sha))
        with self.assertRaisesRegex(local.LocalBigBuyError,'artifact_hash_mismatch'):self.box.get(sha,100)
        os.chmod(self.store.path,0o644)
        with self.assertRaisesRegex(local.LocalBigBuyError,'store_permissions'):self.box.put(sha,raw)
    def test_local_only_and_storage_limit(self):
        with self.assertRaisesRegex(local.LocalBigBuyError,'local_sandbox_only'):
            local.LocalBigBuyStore(self.store,account='fixture',environment='production',initialize=True)
        with tempfile.TemporaryDirectory() as wrong:
            other=gateway.Store(Path(wrong)/'db.sqlite')
            with self.assertRaisesRegex(local.LocalBigBuyError,'isolated_test_store_required'):
                local.LocalBigBuyStore(other,account='fixture',environment='sandbox',initialize=True)
        for i in range(8):
            raw=bytes([i])*(2*1024*1024);self.box.put(hashlib.sha256(raw).hexdigest(),raw)
        raw=b'extra'
        with self.assertRaisesRegex(local.LocalBigBuyError,'artifact_store_limit'):
            self.box.put(hashlib.sha256(raw).hexdigest(),raw)

    def test_full_mock_read_to_existing_http_router(self):
        staged=self.make_staged();shop=local.LocalStagedCatalog(staged,store_id='fixture',access_token='A'*32)
        with self.assertRaisesRegex(ValueError,'local_staged_catalog_requires_loopback'):
            gateway.build_server(self.store,host='0.0.0.0',shop=shop)
        with self.assertRaisesRegex(ValueError,'local_staged_catalog_requires_loopback'):
            gateway.build_server(self.store,shop=shop,public_origin='https://example.invalid')
        server=gateway.build_server(self.store,port=0,shop=shop)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            conn=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3)
            conn.request('GET','/api/shop/catalog?locale=de');denied=conn.getresponse();denied.read();conn.close();self.assertEqual(denied.status,403)
            conn=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3)
            conn.request('GET','/api/shop/catalog?locale=de',headers={'X-Local-Catalog-Access':'wrong'});denied=conn.getresponse();denied.read();conn.close();self.assertEqual(denied.status,403)
            conn=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3)
            conn.request('GET','/api/shop/catalog?locale=de',headers={'X-Local-Catalog-Access':'A'*32,'Origin':'https://foreign.invalid'});denied=conn.getresponse();denied.read();conn.close();self.assertEqual(denied.status,403)
            conn=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3)
            conn.request('GET','/api/shop/catalog?locale=de',headers={'X-Local-Catalog-Access':'A'*32});response=conn.getresponse();body=json.loads(response.read());conn.close()
            self.assertEqual(response.status,200);self.assertEqual(body['mode'],'read_only')
            self.assertEqual({x['sku'] for x in body['products']},{'P','V'})
            self.assertIsNone(body['currency']);self.assertIsNone(body['products'][0]['stock'])
            self.assertFalse(body['saleEnabled']);self.assertFalse(body['checkout_enabled']);self.assertFalse(body['production_accepted'])
            self.assertTrue(all(not x['buyable'] and x['source_price'] is None for x in body['products']))
            conn=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3)
            conn.request('GET','/api/session');session_resp=conn.getresponse(); session=json.loads(session_resp.read()); cookie=session_resp.getheader('Set-Cookie').split(';',1)[0];conn.close()
            conn=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3)
            conn.request('POST','/api/shop/cart',body=b'{}',headers={'Cookie':cookie,'Origin':f'http://127.0.0.1:{server.server_port}',
                'X-CSRF-Token':session['csrf'],'Content-Type':'application/json','Idempotency-Key':'fixture-key-0001'})
            denied=conn.getresponse();details=json.loads(denied.read());conn.close()
            self.assertEqual((denied.status,details['error']),(403,'catalog_read_only'))
        finally:server.shutdown();server.server_close();thread.join(2)
    def test_tampered_staging_rejected(self):
        stage=self.make_staged();stage['products'][0]['sku']='FAKE'
        with self.assertRaisesRegex(local.LocalBigBuyError,'records_mismatch'):local.LocalStagedCatalog(stage,store_id='fixture',access_token='A'*32)

if __name__=='__main__':unittest.main()

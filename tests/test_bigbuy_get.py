"""Offline fake transport/store only; no supplier or network access."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import unittest
import urllib.error
from email.message import Message
from datetime import datetime, timezone
from tools.bigbuy_batch import stage_raw_streams

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('bigbuy_get',ROOT/'apps/agent-gateway/bigbuy_get.py')
mod=importlib.util.module_from_spec(spec)
import sys
sys.modules[spec.name]=mod
spec.loader.exec_module(mod)

class Store:
    def __init__(self): self.data={}
    def put(self, sha, raw): self.data.setdefault(sha,raw)
    def get(self, sha, limit):
        raw=self.data[sha]
        if len(raw)>limit: raise ValueError('limit')
        return raw

class Reply(io.BytesIO):
    def __init__(self, url, raw, status=200):
        super().__init__(raw); self.url=url; self.status=status
        self.headers=Message(); self.headers['Content-Type']='application/json'
    def geturl(self): return self.url

class Tests(unittest.TestCase):
    def setUp(self):
        self.config=mod.ReadConfig('sandbox','fixture-key'); self.store=Store(); self.calls=[]
    def fetch(self, resource='products', raw=b'[]', transport=None, quota=lambda env,resource:True, **kw):
        def fake(req,timeout):
            self.calls.append((req,timeout))
            return Reply(req.full_url,raw)
        return mod.read_page(self.config, resource=resource, page=0, page_size=20, max_bytes=1024,
            timeout_seconds=2,quota_claim=quota,store=self.store,scope='fixture',
            now_utc=lambda:datetime(2026,10,30,10,0,tzinfo=timezone.utc),transport=transport or fake, **kw)
    def test_only_expected_get_and_redacted_configuration(self):
        receipt=self.fetch(raw=b'[]'); req,timeout=self.calls[0]
        self.assertEqual(req.get_method(),'GET'); self.assertEqual(req.full_url,'https://api.sandbox.bigbuy.eu/rest/catalog/products.json?page=0&pageSize=20')
        self.assertEqual(req.get_header('Authorization'),'Bearer fixture-key')
        self.assertNotIn('fixture-key',repr(self.config)); self.assertNotIn('fixture-key',repr(receipt))
        manifest=json.loads(self.store.data[receipt['manifest_sha256']])
        self.assertEqual(manifest['raw_sha256'],hashlib.sha256(b'[]').hexdigest())
        self.assertFalse(manifest['transport_and_supplier_identity_verified'])
    def test_denied_quota_and_forbidden_endpoint_before_transport(self):
        with self.assertRaisesRegex(mod.BigBuyReadError,'quota_not_reserved'): self.fetch(quota=lambda *_:False)
        with self.assertRaisesRegex(mod.BigBuyReadError,'resource_not_allowed'): self.fetch(resource='order')
        self.assertEqual(self.calls,[])
    def test_http_errors_redirect_and_timeout_no_retry(self):
        for status,code in [(409,'provider_cache_unavailable'),(429,'rate_limited'),(302,'redirect_rejected'),(401,'access_denied')]:
            calls=[]
            def fail(req,timeout):
                calls.append(1);raise urllib.error.HTTPError(req.full_url,status,'ignored',{},None)
            with self.subTest(status=status),self.assertRaisesRegex(mod.BigBuyReadError,code): self.fetch(transport=fail)
            self.assertEqual(len(calls),1)
        def timeout(req,limit): raise TimeoutError('fixture-key')
        with self.assertRaisesRegex(mod.BigBuyReadError,'transport_unavailable') as result:self.fetch(transport=timeout)
        self.assertNotIn('fixture-key',str(result.exception))
    def test_different_response_url_and_oversize_block_store(self):
        def redirected(req,timeout):return Reply('https://other.invalid/',b'[]')
        with self.assertRaisesRegex(mod.BigBuyReadError,'response_url_mismatch'): self.fetch(transport=redirected)
        with self.assertRaisesRegex(mod.BigBuyReadError,'byte_limit'): self.fetch(raw=b'x'*1025)
        self.assertEqual(self.store.data,{})
    def test_readback_corruption_stops(self):
        self.store.get=lambda sha,limit:b'other'
        with self.assertRaisesRegex(mod.BigBuyReadError,'artifact_readback_mismatch'):self.fetch()
    def test_redirect_handler_and_deadline_stop(self):
        handler=mod.NoRedirect()
        with self.assertRaisesRegex(mod.BigBuyReadError,'redirect_rejected'):
            handler.redirect_request(None,None,302,'redirect',{},'https://other.invalid/')
        ticks=iter([0,0,3])
        with self.assertRaisesRegex(mod.BigBuyReadError,'deadline_exceeded'):
            self.fetch(raw=b'[]',clock=lambda:next(ticks))
        self.assertEqual(self.store.data,{})
    def test_unexpected_transport_failure_is_sanitized(self):
        def bad(req,timeout): raise RuntimeError('fixture-key')
        with self.assertRaisesRegex(mod.BigBuyReadError,'transport_failure') as caught:
            self.fetch(transport=bad)
        self.assertNotIn('fixture-key',str(caught.exception))

    def test_manifest_binding_rejects_relabel_and_stale(self):
        receipt=self.fetch(raw=b'[]')
        params=dict(receipts=[receipt],store=self.store,stage_raw_streams=stage_raw_streams,scope='fixture',
                    now='2026-10-30T10:01:00Z',max_age_seconds=120,max_raw_bytes=4096)
        out=mod.stage_saved(**params)
        self.assertEqual(json.loads(out['manifest_bytes'])['acquisition_manifest_sha256'],[receipt['manifest_sha256']])
        params['scope']='other'
        with self.assertRaisesRegex(mod.BigBuyReadError,'invalid_manifest'):mod.stage_saved(**params)
        params['scope']='fixture';params['now']='2026-10-30T10:03:00Z'
        with self.assertRaisesRegex(ValueError,'stale_or_future_snapshot'):mod.stage_saved(**params)
        data=json.loads(self.store.data[receipt['manifest_sha256']]);data['environment']='production'
        self.store.data[receipt['manifest_sha256']]=json.dumps(data).encode()
        params['now']='2026-10-30T10:01:00Z'
        with self.assertRaisesRegex(mod.BigBuyReadError,'manifest_readback_mismatch'):mod.stage_saved(**params)

    def test_every_page_age_rejects_future_even_with_valid_older_page(self):
        first=self.fetch(resource='products',raw=b'[]')
        second=self.fetch(resource='variations',raw=b'[]')
        document=json.loads(self.store.data[second['manifest_sha256']])
        document['observed_at']='2026-10-30T10:02:00+00:00'
        payload=json.dumps(document,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
        sha=hashlib.sha256(payload).hexdigest();self.store.put(sha,payload)
        with self.assertRaisesRegex(mod.BigBuyReadError,'stale_or_future_snapshot'):
            mod.stage_saved(receipts=[first,{'manifest_sha256':sha}],store=self.store,
                stage_raw_streams=stage_raw_streams,scope='fixture',now='2026-10-30T10:01:00Z',
                max_age_seconds=120,max_raw_bytes=4096)

    def test_saved_bytes_replayed_into_existing_staging(self):
        values={'products':[{'id':1,'sku':'P','ean13':'000123'}],
                'variations':[{'id':2,'product':1,'sku':'V','ean13':'000456'}],
                'stock':[{'sku':'V','stocks':[{'quantity':1,'minHandlingDays':0,'maxHandlingDays':1}]}]}
        receipts=[self.fetch(resource=k,raw=json.dumps(v).encode()) for k,v in values.items()]
        out=mod.stage_saved(receipts=receipts,store=self.store,stage_raw_streams=stage_raw_streams,scope='fixture',
            now='2026-10-30T10:01:00Z',max_age_seconds=120,max_raw_bytes=4096)
        self.assertEqual(out['products'][0]['ean'],'000123');self.assertFalse(out['saleEnabled'])
        self.assertFalse(json.loads(out['manifest_bytes'])['transport_and_supplier_identity_verified'])
        manifest=json.loads(self.store.data[receipts[0]['manifest_sha256']])
        self.store.data[manifest['raw_sha256']]=b'corrupt'
        with self.assertRaisesRegex(mod.BigBuyReadError,'artifact_readback_mismatch'):
            mod.stage_saved(receipts=receipts,store=self.store,stage_raw_streams=stage_raw_streams,scope='fixture',
                now='2026-10-30T10:01:00Z',max_age_seconds=120,max_raw_bytes=4096)

if __name__=='__main__': unittest.main()

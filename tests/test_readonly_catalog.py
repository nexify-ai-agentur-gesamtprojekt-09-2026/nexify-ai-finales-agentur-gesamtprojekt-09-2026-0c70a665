"""Isolated supplier-shaped fixtures, never an activated production catalog."""
import copy
import datetime as dt
import email.message
import importlib.util
import json
import hashlib
import os
from unittest.mock import patch
from pathlib import Path
import tempfile
import unittest
import urllib.error
from tools.catalog_snapshot import fetch_snapshot, save_snapshot, SnapshotError
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('readonly_catalog', ROOT/'apps/agent-gateway/catalog.py')
catalog = importlib.util.module_from_spec(spec); spec.loader.exec_module(catalog)


def rows():
    return {'items': [{'id': 'SYNTH-A', 'sku': 'SYNTH-A', 'ean': '0012345678901',
        'name': 'Synthetischer Filter', 'category': 'Synthetisches Zubehör', 'source': 'BigBuy',
        'status': 'catalog', 'stock': 0, 'price': '7.06 €', 'value': 7.06, 'evidence': '',
        'created_at': '2026-10-11T10:00:00Z',
        'image': '/api/shop/image?src=https%3A%2F%2Fcdnbigbuy.com%2Fimages%2FOTHER-SKU.jpg'}], 'total': 2}


def adapter(data=None, **overrides):
    kwargs = dict(tenant='synthetic', project='isolated', store_id='test',
                  observed_at='2026-10-27T01:00:00+00:00', max_bytes=10000, max_rows=2,
                  max_text=1000, max_price_minor=1000000,
                  now=dt.datetime(2026,10,27,2,tzinfo=dt.timezone.utc))
    kwargs.update(overrides)
    return catalog.ReadOnlyCatalog(json.dumps(data or rows()).encode(), **kwargs)


class CatalogTests(unittest.TestCase):
    def test_zero_stock_unit_provenance_and_image_are_not_promoted(self):
        result=adapter().catalog(); row=result['products'][0]
        self.assertIsNone(adapter().cart)
        self.assertEqual(row['stock'],0)
        self.assertFalse(row['buyable']); self.assertFalse(result['checkout_enabled'])
        self.assertFalse(result['production_accepted']); self.assertTrue(result['partial'])
        self.assertEqual(row['source_price']['minor'],706)
        self.assertFalse(row['source_price']['commercial_approval'])
        self.assertEqual(row['source_price']['tax_basis'],'not_verified')
        self.assertEqual(row['ean'],'0012345678901')
        self.assertEqual(row['provenance_status'],'missing')
        self.assertEqual(row['image']['status'],'association_not_verified')
        self.assertEqual(result['pagination']['reported_total'],2)
        self.assertEqual(result['pagination']['snapshot_rows'],1)
        self.assertEqual(row['text_facts']['title'],row['name'])
        self.assertIsNone(result['supplier_updated_at'])

    def test_queries_categories_source_language_and_no_source_mutation(self):
        shop=adapter(); result=shop.catalog(locale='nl')
        self.assertEqual(result['products'][0]['source_locale'],'de')
        self.assertEqual(shop.catalog(query='no match')['products'],[])
        self.assertEqual(len(shop.catalog(category=result['categories'][0]['id'])['products']),1)
        result['products'][0]['stock']=999
        self.assertEqual(shop.catalog()['products'][0]['stock'],0)
        with self.assertRaises(catalog.CatalogRejected):shop.catalog(locale='xx')

    def test_invalid_prices_unknown_stock_bad_identity_and_duplicates_fail_closed(self):
        cases=[('price','7.06'),('price','7.60 €'),('value',True),('value',7.061),
               ('stock',None),('stock',True),('stock',-1),('ean',1234),('source','Other'),
               ('status','verified'),('name','<script>bad</script>'),('sku','')]
        for field,value in cases:
            d=rows();d['items'][0][field]=value
            with self.subTest(field=field,value=value),self.assertRaises(catalog.CatalogRejected):adapter(d)
        d=rows();d['items'].append(copy.deepcopy(d['items'][0]))
        with self.assertRaises(catalog.CatalogRejected):adapter(d)

    def test_byte_row_scope_and_time_limits(self):
        for overrides in [{'max_bytes':1},{'max_rows':False},{'tenant':''},
                          {'observed_at':'2026-10-28T00:00:00+00:00'},
                          {'observed_at':'2026-10-27T01:00:00'}, {'max_price_minor':1}]:
            with self.subTest(overrides=overrides), self.assertRaises(catalog.CatalogRejected):adapter(**overrides)
        d=rows();d['total']=0
        with self.assertRaises(catalog.CatalogRejected):adapter(d)

    def test_proxy_urls_do_not_grant_arbitrary_fetch_or_approval(self):
        for ref in ['https://evil.example/image.png','/api/shop/image?src=http://cdnbigbuy.com/a.png',
                    '/api/shop/image?src=https://evil.example/a.png',
                    '/api/shop/image?src=https://user:pass@cdnbigbuy.com/a.png',
                    '/api/shop/image?src=https://cdnbigbuy.com/a.png&src=https://cdnbigbuy.com/b.png']:
            d=rows();d['items'][0]['image']=ref
            with self.subTest(ref=ref),self.assertRaises((catalog.CatalogRejected,ValueError)):adapter(d)


class Reply:
    status=200
    def __init__(self,raw):
        self.raw=raw;self.headers=email.message.Message();self.headers['Content-Type']='application/json'
    def __enter__(self):return self
    def __exit__(self,*args):pass
    def read(self,count):out=self.raw[:count];self.raw=self.raw[count:];return out


class Opener:
    def __init__(self,raw=None,error=None):self.raw=raw;self.error=error;self.requests=[]
    def open(self,request,timeout):
        self.requests.append((request,timeout))
        if self.error:raise self.error
        return Reply(self.raw)


class SnapshotTests(unittest.TestCase):
    def test_one_attempt_limit_only_partial_and_immutable_restart_readback(self):
        opener=Opener(json.dumps(rows()).encode())
        raw,manifest=fetch_snapshot(maximum_rows=2,maximum_bytes=10000,timeout_seconds=2,opener=opener)
        self.assertEqual(len(opener.requests),1)
        request=opener.requests[0][0]
        self.assertEqual(request.full_url,'https://teileklar.shop/api/shop/products?limit=2')
        self.assertFalse(request.has_header('Authorization'))
        self.assertEqual(manifest['pagination_status'],'partial_unverified_continuation')
        with tempfile.TemporaryDirectory() as folder:
            path=save_snapshot(folder,raw,manifest)
            self.assertEqual(save_snapshot(folder,raw,manifest),path)
            recovered,bound=catalog.load_snapshot(path,maximum_bytes=10000)
            self.assertEqual(recovered,raw)
            raw_path=Path(folder)/bound['raw_file'];raw_path.write_bytes(b'tampered')
            with self.assertRaises(catalog.CatalogRejected):catalog.load_snapshot(path,maximum_bytes=10000)

    def test_access_rate_limit_and_invalid_body_stop_without_retry(self):
        for status in [401,403,429,500]:
            opener=Opener(error=urllib.error.HTTPError('https://invalid.example',status,'synthetic',{},None))
            with self.subTest(status=status),self.assertRaises(SnapshotError):
                fetch_snapshot(maximum_rows=2,maximum_bytes=10000,timeout_seconds=2,opener=opener)
            self.assertEqual(len(opener.requests),1)
        for raw,limit in [(b'not json',10000),(json.dumps(rows()).encode(),1)]:
            with self.assertRaises(SnapshotError):fetch_snapshot(maximum_rows=2,maximum_bytes=limit,timeout_seconds=2,opener=Opener(raw))

    def test_manifest_time_tamper_and_hardlink_or_fifo_are_rejected(self):
        raw,m=fetch_snapshot(maximum_rows=2,maximum_bytes=10000,timeout_seconds=2,opener=Opener(json.dumps(rows()).encode()))
        with tempfile.TemporaryDirectory() as folder:
            path=save_snapshot(folder,raw,m)
            original=path.read_bytes()
            changed=json.loads(original);changed['observed_at']='2026-10-27T00:00:00+00:00'
            path.write_text(json.dumps(changed,sort_keys=True,separators=(',',':')))
            with self.assertRaises(catalog.CatalogRejected):catalog.load_snapshot(path,maximum_bytes=10000)
            path.write_bytes(original)
            source=Path(folder)/m['raw_file'];source.unlink()
            outside=Path(folder)/'outside-source';outside.write_bytes(raw);os.link(outside,source)
            with self.assertRaises(catalog.CatalogRejected):catalog.load_snapshot(path,maximum_bytes=10000)
            self.assertEqual(outside.read_bytes(),raw)
            source.unlink();os.mkfifo(source)
            with self.assertRaises(catalog.CatalogRejected):catalog.load_snapshot(path,maximum_bytes=10000)

    def test_symlinked_ancestor_cannot_write_or_load_outside_snapshot_directory(self):
        raw,m=fetch_snapshot(maximum_rows=2,maximum_bytes=10000,timeout_seconds=2,opener=Opener(json.dumps(rows()).encode()))
        with tempfile.TemporaryDirectory() as folder:
            base=Path(folder);outside=base/'outside';outside.mkdir();alias=base/'alias';alias.symlink_to(outside,target_is_directory=True)
            with self.assertRaises((OSError,ValueError)):save_snapshot(alias/'nested',raw,m)
            self.assertEqual(list(outside.iterdir()),[])
            real=save_snapshot(outside,raw,m)
            with self.assertRaises((OSError,ValueError)):catalog.load_snapshot(alias/real.name,maximum_bytes=10000)

    def test_eof_after_budget_does_not_masquerade_as_success(self):
        with patch('tools.catalog_snapshot.time.monotonic',side_effect=[0,0,0,0.9,0.9,0.9,1.8]):
            with self.assertRaisesRegex(SnapshotError,'deadline'):
                fetch_snapshot(maximum_rows=2,maximum_bytes=10000,timeout_seconds=1,opener=Opener(json.dumps(rows()).encode()))

    def test_manifest_path_and_unsupported_promotion_cannot_escape(self):
        with tempfile.TemporaryDirectory() as folder:
            raw,m=fetch_snapshot(maximum_rows=2,maximum_bytes=10000,timeout_seconds=2,opener=Opener(json.dumps(rows()).encode()))
            path=save_snapshot(folder,raw,m)
            changed=json.loads(path.read_text());changed['raw_file']='../../outside';path.write_text(json.dumps(changed))
            with self.assertRaises(catalog.CatalogRejected):catalog.load_snapshot(path,maximum_bytes=10000)
            changed['raw_file']=m['raw_file'];changed['pagination_status']='complete';path.write_text(json.dumps(changed))
            with self.assertRaises(catalog.CatalogRejected):catalog.load_snapshot(path,maximum_bytes=10000)

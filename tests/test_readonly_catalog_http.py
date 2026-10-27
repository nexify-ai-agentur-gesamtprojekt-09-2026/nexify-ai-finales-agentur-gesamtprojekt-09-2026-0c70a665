"""Real HTTP read-only source binding and forbidden commerce mutations."""
import http.client
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
ROOT=Path(__file__).resolve().parents[1]
def module(name,path):
 s=importlib.util.spec_from_file_location(name,ROOT/path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
fixture=module('readonly_test_fixture','apps/site/tests/fixtures/shop-server.py')
source=module('readonly_test_cases','tests/test_readonly_catalog.py')


class ReadonlyCatalogHTTPTests(unittest.TestCase):
 def setUp(self):
  self.folder=tempfile.TemporaryDirectory();self.addCleanup(self.folder.cleanup)
  self.store=fixture.gateway.Store(Path(self.folder.name)/'visitor.sqlite')
  self.server=fixture.gateway.build_server(self.store,port=0,shop=source.adapter())
  self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
  self.addCleanup(self.close)
 def close(self):
  self.server.shutdown();self.server.server_close();self.thread.join(2)
 def request(self,method,path,headers=None,body=None):
  c=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=3)
  c.request(method,path,body=json.dumps(body).encode() if body is not None else None,headers=headers or {})
  r=c.getresponse();result=(r.status,json.loads(r.read()),dict(r.getheaders()));c.close();return result
 def test_read_catalog_query_and_forbidden_credentials(self):
  status,data,headers=self.request('GET','/api/shop/catalog?locale=nl')
  self.assertEqual(status,200);self.assertEqual(data['mode'],'read_only')
  self.assertEqual(data['products'][0]['stock'],0);self.assertEqual(data['products'][0]['source_price']['minor'],706)
  self.assertEqual(self.request('GET','/api/shop/catalog?tenant=foreign')[0],422)
  self.assertEqual(self.request('GET','/api/shop/catalog?locale=xx')[0],422)
  self.assertEqual(self.request('GET','/api/shop/catalog',{'Authorization':'Bearer synthetic'})[0],401)
 def test_even_valid_session_csrf_and_idempotency_cannot_create_cart_or_checkout(self):
  status,session,headers=self.request('GET','/api/session');self.assertEqual(status,200)
  fields={'Cookie':headers['Set-Cookie'].split(';')[0],'Content-Type':'application/json',
          'Origin':f'http://127.0.0.1:{self.server.server_port}','X-CSRF-Token':session['csrf'],
          'Idempotency-Key':'synthetic-key-0001'}
  for path,body in [('/api/shop/cart',{'store_id':'test','locale':'de'}),
                    ('/api/shop/cart/items',{'product_id':'SYNTH-A','quantity':1}),
                    ('/api/shop/cart/checkout-draft',{})]:
   with self.subTest(path=path):
    status,data,_=self.request('POST',path,fields,body);self.assertEqual(status,403);self.assertEqual(data['error'],'catalog_read_only')
  self.assertEqual(self.request('GET','/api/shop/cart',fields)[0],403)
  with self.store.connect() as db:
   self.assertEqual(db.execute("SELECT count(*) FROM objects WHERE kind IN ('cart','checkout_draft')").fetchone()[0],0)
   self.assertEqual(db.execute('SELECT count(*) FROM outbox').fetchone()[0],0)

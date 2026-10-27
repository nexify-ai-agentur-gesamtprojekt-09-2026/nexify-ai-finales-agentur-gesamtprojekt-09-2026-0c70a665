"""Real loopback HTTP -> existing visitor Store -> persistent cart readback."""
import http.client
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('shop_http_fixture', ROOT / 'apps/site/tests/fixtures/shop-server.py')
fixture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)


class ShopHTTPTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.store = fixture.gateway.Store(Path(self.folder.name) / 'visitor.sqlite')
        self.shop = fixture.fixture(self.store)
        self.server = fixture.gateway.build_server(self.store, port=0, shop=self.shop)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.cookies = {}
        _, self.session, _ = self.request('GET', '/api/session')

    def tearDown(self):
        self.server.shutdown();self.server.server_close();self.thread.join(2);self.folder.cleanup()

    def request(self, method, path, body=None, headers=None):
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=3)
        fields = {'Cookie': '; '.join(k+'='+v for k,v in self.cookies.items())}
        if method == 'POST':
            fields.update({'Content-Type': 'application/json', 'Origin': f'http://127.0.0.1:{self.server.server_port}', 'X-CSRF-Token': self.session['csrf'], 'Idempotency-Key': 'http-request-0001'})
            body = json.dumps(body).encode()
        fields.update(headers or {})
        connection.request(method, path, body=body, headers=fields)
        response = connection.getresponse(); raw=response.read(); pairs=response.getheaders();status=response.status
        for key,value in pairs:
            if key.casefold()=='set-cookie':
                name, val = value.split(';',1)[0].split('=',1); self.cookies[name]=val
        connection.close()
        return status, json.loads(raw), dict(pairs)

    def create(self):
        status, cart, headers = self.request('POST','/api/shop/cart',{'store_id':'synthetic-store','locale':'de'})
        self.assertEqual(status,200)
        self.assertIn('HttpOnly',headers['Set-Cookie']);self.assertIn('Path=/api/shop',headers['Set-Cookie'])
        self.assertNotIn('guest_capability',cart)
        return cart

    def change(self, cart, quantity=2, **headers):
        return self.request('POST','/api/shop/cart/items',{'product_id':'fixture-a','quantity':quantity},headers={'If-Match':cart['version'],'X-Cart-Id':cart['id'],**headers})

    def test_real_catalog_search_category_locales_and_partial(self):
        status, catalog, headers=self.request('GET','/api/shop/catalog?q=lamp&locale=nl&category=lights')
        self.assertEqual(status,200);self.assertEqual(catalog['products'][0]['name'],'Testlamp')
        self.assertFalse(catalog['checkout_enabled']);self.assertEqual(headers['Cache-Control'],'no-store')
        self.assertEqual(catalog['products'][0]['fitment_status'],'not_verified')
        self.assertEqual(self.request('GET','/api/shop/catalog?tenant=other')[0],422)
        self.assertEqual(self.request('GET','/api/shop/catalog?locale=de&locale=nl')[0],422)
        self.shop.maximum=1
        self.assertTrue(self.request('GET','/api/shop/catalog')[1]['partial'])

    def test_cart_draft_reload_and_repeated_draft_never_order_or_payment(self):
        cart=self.create();status, changed,_=self.change(cart)
        self.assertEqual(status,200);self.assertEqual(changed['total_minor'],246)
        self.assertEqual(self.request('GET','/api/shop/cart')[1],changed)
        headers={'If-Match':changed['version'],'X-Cart-Id':changed['id']}
        status,draft,_=self.request('POST','/api/shop/cart/checkout-draft',{},headers=headers)
        self.assertEqual(status,200);self.assertFalse(draft['payment_started']);self.assertFalse(draft['order_submitted'])
        self.assertEqual(draft['state'],'blocked_provider_acceptance')
        again=self.request('POST','/api/shop/cart/checkout-draft',{},headers={**headers,'Idempotency-Key':'different-draft-key'})[1]
        self.assertEqual(again,draft)
        self.assertEqual(self.request('GET','/api/shop/cart/checkout-draft')[1],draft)
        with self.store.connect() as db:
            self.assertEqual(db.execute("SELECT count(*) FROM objects WHERE kind='checkout_draft'").fetchone()[0],1)
            self.assertEqual(db.execute('SELECT count(*) FROM outbox').fetchone()[0],0)

    def test_invalid_credentials_csrf_origin_target_and_client_price_rejected(self):
        cart=self.create()
        self.assertEqual(self.change(cart,Authorization='Bearer invalid')[0],401)
        self.assertEqual(self.change(cart,**{'X-CSRF-Token':'wrong'})[0],403)
        self.assertEqual(self.change(cart,Origin='https://other.invalid')[0],403)
        self.assertEqual(self.change(cart,**{'X-Cart-Id':'another-cart'})[0],409)
        self.assertEqual(self.request('POST','/api/shop/cart/items',{'product_id':'fixture-a','quantity':1,'price_minor':0},headers={'If-Match':'1','X-Cart-Id':cart['id']})[0],422)
        self.assertEqual(self.request('POST','/api/shop/cart',{'store_id':'foreign-store','locale':'de'})[0],422)
        self.assertEqual(self.request('GET','/api/shop/cart')[1]['line_items'],[])

    def test_other_visitor_cart_cookie_and_browser_role_claims_grant_nothing(self):
        cart=self.create();old_cart_cookie=self.cookies['nx_cart']; self.cookies={}
        _, new_session,_=self.request('GET','/api/session');self.session=new_session
        self.cookies['nx_cart']=old_cart_cookie
        self.assertEqual(self.request('GET','/api/shop/cart',headers={'X-Tenant':'synthetic-tenant','X-Role':'admin'})[0],404)
        self.assertEqual(self.request('GET','/api/quotes/'+cart['id']+'/pdf')[0],404)
        self.cookies['nx_cart']='malformed'
        self.assertEqual(self.request('GET','/api/shop/cart')[0],401)

    def test_replay_conflict_version_conflict_and_empty_checkout(self):
        cart=self.create()
        self.assertEqual(self.request('POST','/api/shop/cart/checkout-draft',{},headers={'If-Match':'1','X-Cart-Id':cart['id']})[0],409)
        status,changed,_=self.change(cart)
        self.assertEqual(status,200)
        self.assertEqual(self.change(cart)[1],changed)
        self.assertEqual(self.change(cart,quantity=3)[0],409)
        self.assertEqual(self.change(cart,**{'Idempotency-Key':'another-change-key'})[0],409)

    def test_unconfigured_default_has_no_synthetic_catalog_or_checkout(self):
        server=fixture.gateway.build_server(self.store,port=0)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            conn=http.client.HTTPConnection('127.0.0.1',server.server_port)
            conn.request('GET','/api/shop/catalog');response=conn.getresponse();raw=response.read()
            self.assertEqual(response.status,503);self.assertNotIn(b'fixture-a',raw);conn.close()
        finally:server.shutdown();server.server_close();thread.join(2)

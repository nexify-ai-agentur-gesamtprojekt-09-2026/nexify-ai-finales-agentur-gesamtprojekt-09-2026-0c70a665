"""TEILEKLAR shop API (apps/shop-api): pricing, roles, cart authority, checkout idempotency, Revolut webhook, BigBuy import.

Runs against a separate local MongoDB test database; Revolut and BigBuy are replaced by httpx.MockTransport here only.
"""
import hashlib
import hmac
import json
import os
import socket
import sys
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
os.environ.update({"DB_NAME": "teileklar_shop_unittest", "REVOLUT_MODE": "sandbox", "REVOLUT_MERCHANT_SECRET_KEY_SANDBOX": "sk_unittest_only",
                   "RESEND_API_KEY": "re_unittest", "RESEND_FROM_ADDRESS": "test@example.org", "BIGBUY_API_KEY_SANDBOX": "unittest-bigbuy",
                   "MONGO_URL": os.environ.get("MONGO_URL", "mongodb://localhost:27017"), "PREVIEW_PUBLIC_ORIGIN": "https://shop.preview.emergentagent.com",
                   "SHOP_VAT_PERCENT": "19", "GATEWAY_PORT": "3993", "REVOLUT_API_VERSION": "2026-04-20"})
sys.path[:0] = [str(ROOT / "apps" / "shop-api"), str(ROOT / "apps" / "agent-gateway")]


def mongo_up():
    try:
        with socket.create_connection(("127.0.0.1", 27017), timeout=0.5):
            return True
    except OSError:
        return False


try:
    import httpx
    from fastapi.testclient import TestClient
    from shop import accounts_api, bigbuy_import, pricing, revolut
    from shop.main import app
    from shop.db import db
    DEPS = mongo_up()
except ImportError:
    DEPS = False

SECRET = "whsec_unittest"
BASE = "https://shop.preview.emergentagent.com"


def signed(body, secret=SECRET, ts=None):
    ts = str(ts if ts is not None else int(time.time() * 1000))
    sig = "v1=" + hmac.new(secret.encode(), b"v1." + ts.encode() + b"." + body, hashlib.sha256).hexdigest()
    return {"Revolut-Signature": sig, "Revolut-Request-Timestamp": ts, "Content-Type": "application/json"}


class PureFunctions(unittest.TestCase):
    @unittest.skipUnless(DEPS, "fastapi/motor/mongodb not available")
    def test_price_formula_and_signature(self):
        self.assertEqual(pricing.sell_cents(1000, 30, 19), 1547)
        self.assertEqual(pricing.sell_cents(1000, 40, 19), 1666)
        body = b'{"event":"ORDER_COMPLETED","order_id":"x"}'
        h = signed(body)
        self.assertTrue(revolut.verify_signature(body, h["Revolut-Request-Timestamp"], h["Revolut-Signature"], SECRET))
        self.assertFalse(revolut.verify_signature(body + b" ", h["Revolut-Request-Timestamp"], h["Revolut-Signature"], SECRET))
        old = signed(body, ts=int(time.time() * 1000) - 6 * 60 * 1000)
        self.assertFalse(revolut.verify_signature(body, old["Revolut-Request-Timestamp"], old["Revolut-Signature"], SECRET))
        self.assertTrue(accounts_api.check_password("geheim-12345", accounts_api.hash_password("geheim-12345")))


@unittest.skipUnless(DEPS, "fastapi/motor/mongodb not available")
class ShopFlow(unittest.TestCase):
    def setUp(self):
        self.state = {"order_state": "pending", "reads": 0}
        def handler(request):
            path = request.url.path
            if path == "/api/webhooks" and request.method == "GET":
                return httpx.Response(200, json=[])
            if path == "/api/webhooks":
                return httpx.Response(200, json={"id": "wh_1", "signing_secret": SECRET, "events": revolut.WEBHOOK_EVENTS})
            if path == "/api/orders":
                return httpx.Response(201, json={"id": "rev_%d" % time.time_ns(), "state": "pending", "checkout_url": "https://checkout.example/pay"})
            if path.startswith("/api/orders/"):
                self.state["reads"] += 1
                return httpx.Response(200, json={"id": path.rsplit("/", 1)[1], "state": self.state["order_state"]})
            return httpx.Response(404)
        revolut.transport = httpx.MockTransport(handler)
        self.client = type(self).shared
        self.client.cookies.clear()
        self.call(self.reset)
        self.admin, self.user_a, self.user_b = (self.account(n) for n in ("admin_t", "kunde_a", "kunde_b"))
        self.client.cookies.clear()

    def account(self, name):
        self.client.cookies.clear()
        token = self.client.post("/api/auth/register", json={"email": name + "@example.org", "password": "passwort-1234"}).cookies.get("tk_session")
        if name.startswith("admin"):
            self.call(db.users.update_one, {"email": name + "@example.org"}, {"$set": {"role": "admin"}})
        return {"Authorization": "Bearer " + token}

    def test_accounts_duplicate_short_password_lockout_logout(self):
        self.assertEqual(self.client.post("/api/auth/register", json={"email": "kunde_a@example.org", "password": "passwort-1234"}).json()["detail"]["message"], "Diese E-Mail-Adresse ist bereits registriert")
        self.assertEqual(self.client.post("/api/auth/register", json={"email": "neu@example.org", "password": "kurz"}).json()["detail"]["fields"], {"password": "too_short"})
        for _ in range(5):
            self.assertEqual(self.client.post("/api/auth/login", json={"email": "kunde_b@example.org", "password": "falsch"}).json()["detail"]["message"], "E-Mail oder Passwort ist falsch")
        self.assertEqual(self.client.post("/api/auth/login", json={"email": "kunde_b@example.org", "password": "passwort-1234"}).status_code, 429)
        self.assertEqual(self.client.get("/api/auth/me", headers=self.user_a).json()["email"], "kunde_a@example.org")
        self.client.post("/api/auth/logout", cookies={"tk_session": self.user_a["Authorization"][7:]})
        self.assertEqual(self.client.get("/api/auth/me", headers=self.user_a).status_code, 401)

    @classmethod
    def setUpClass(cls):
        cls.ctx = TestClient(app, base_url=BASE)
        cls.shared = cls.ctx.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.ctx.__exit__(None, None, None)

    def tearDown(self):
        revolut.transport = None

    def call(self, fn, *args):
        return self.client.portal.call(fn, *args)

    async def reset(self):
        for name in ("products", "carts", "orders", "webhook_events", "revolut_webhooks", "settings", "imports", "categories", "users", "sessions", "login_failures"):
            await db[name].delete_many({})
        await db.products.insert_many([
            {"_id": "bb-1", "bigbuy_id": 1, "sku": "S1", "ean": "4000000000001", "name": "Testartikel Eins", "purchase_cents": 1000, "stock": 5, "active": True, "images": [], "category_ids": [9], "category_id": 9, "source": "unittest", "imported_at": "2026-01-01T00:00:00+00:00"},
            {"_id": "bb-2", "bigbuy_id": 2, "sku": "S2", "ean": "4000000000002", "name": "Testartikel Zwei", "purchase_cents": 2000, "stock": 0, "active": True, "images": [], "category_ids": [9], "category_id": 9, "source": "unittest", "imported_at": "2026-01-01T00:00:00+00:00"}])

    def checkout(self, headers, key="key-0000000000000001"):
        quote = self.client.post("/api/shop/checkout/quote", headers=headers).json()
        address = {"first_name": "Erika", "last_name": "Muster", "street": "Hauptstr. 1", "zip": "14547", "city": "Beelitz", "country": "DE", "email": "erika@example.org", "phone": ""}
        return self.client.post("/api/shop/orders", headers={**headers, "Idempotency-Key": key}, json={"address": address, "shipping_method": "standard", "accept_terms": True, "quote_hash": quote["quote_hash"]})

    def test_roles_markup_and_cart_authority(self):
        self.assertEqual(self.client.get("/api/admin/settings").status_code, 401)
        self.assertEqual(self.client.put("/api/admin/settings", headers=self.user_a, json={"markup_percent": "40", "shipping_cents": 0}).status_code, 403)
        self.assertEqual(self.client.post("/api/admin/import", headers=self.user_a, json={}).status_code, 403)
        self.assertEqual(self.client.get("/api/shop/products/bb-1").json()["price_cents"], 1547)
        self.assertEqual(self.client.put("/api/admin/settings", headers=self.admin, json={"markup_percent": "40", "shipping_cents": 0}).status_code, 200)
        self.assertEqual(self.client.get("/api/shop/products/bb-1").json()["price_cents"], 1666)
        cart = self.client.post("/api/shop/cart/items", headers=self.user_a, json={"product_id": "bb-1", "quantity": 2, "price_cents": 1, "unit_cents": 1}).json()
        self.assertEqual(cart["total_cents"], 2 * 1666)
        self.assertEqual(self.client.post("/api/shop/cart/items", headers=self.user_a, json={"product_id": "bb-2", "quantity": 1}).status_code, 409)
        self.assertEqual(self.client.get("/api/shop/products", params={"q": "4000000000002"}).json()["total"], 1)
        self.assertEqual(self.client.get("/api/shop/products", params={"q": "xyzqq"}).json()["total"], 0)

    def test_guest_merge_and_price_change_confirmation(self):
        guest = self.client
        guest.post("/api/shop/cart/items", json={"product_id": "bb-1", "quantity": 1})
        self.assertTrue(guest.cookies.get("tk_guest"))
        self.assertEqual(guest.get("/api/shop/cart", headers=self.user_b).json()["count"], 1)
        self.assertEqual(guest.get("/api/shop/cart").json()["count"], 0)
        guest.cookies.clear()
        self.client.put("/api/admin/settings", headers=self.admin, json={"markup_percent": "50", "shipping_cents": 0})
        self.assertEqual(self.checkout(self.user_b).status_code, 409)
        self.client.post("/api/shop/cart/confirm-changes", headers=self.user_b)
        self.assertEqual(self.checkout(self.user_b, "key-after-confirm-0001").status_code, 200)

    def test_order_idempotency_webhook_and_isolation(self):
        self.client.post("/api/shop/cart/items", headers=self.user_a, json={"product_id": "bb-1", "quantity": 1})
        first, second = self.checkout(self.user_a), self.checkout(self.user_a)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json()["order_id"], second.json()["order_id"])
        order_id = first.json()["order_id"]
        self.assertEqual(self.call(db.orders.count_documents, {"owner": {"$regex": "^user:"}}), 1)
        self.assertEqual(self.client.get("/api/shop/orders/" + order_id, headers=self.user_b).status_code, 404)
        rev_id = self.call(db.orders.find_one, {"_id": order_id})["revolut_order_id"]
        body = json.dumps({"event": "ORDER_COMPLETED", "order_id": rev_id}).encode()
        self.assertEqual(self.client.post("/api/shop/webhooks/revolut", content=body, headers=signed(body, "wrong")).status_code, 401)
        self.assertEqual(self.client.post("/api/shop/webhooks/revolut", content=body, headers={"Content-Type": "application/json"}).status_code, 401)
        self.assertEqual(self.call(db.orders.find_one, {"_id": order_id})["status"], "zahlung_offen")
        self.state["order_state"] = "completed"
        for _ in range(3):
            self.assertEqual(self.client.post("/api/shop/webhooks/revolut", content=body, headers=signed(body)).status_code, 204)
        order = self.call(db.orders.find_one, {"_id": order_id})
        self.assertEqual((order["status"], order["paid_transitions"]), ("bezahlt", 1))
        self.assertGreaterEqual(self.state["reads"], 1)
        self.assertEqual(self.client.get("/api/shop/cart", headers=self.user_a).json()["count"], 0)
        self.assertEqual([o["status"] for o in self.client.get("/api/shop/orders", headers=self.user_a).json()["orders"]], ["bezahlt"])
        self.assertEqual(self.client.get("/api/shop/orders", headers=self.user_b).json()["orders"], [])

    def test_bigbuy_import_paginates_dedupes_and_keeps_catalog_on_failure(self):
        calls = {"fail": False}
        def handler(request):
            if calls["fail"]:
                return httpx.Response(429)
            path, page = request.url.path, int(request.url.params.get("page", 0))
            if path.endswith("taxonomies.json"):
                return httpx.Response(200, json=[{"id": 77, "name": "Auto & Motorrad", "parentTaxonomy": 0}, {"id": 78, "name": "Zubehör", "parentTaxonomy": 77}])
            if path.endswith("products.json"):
                rows = [{"id": 1000 + i + page * 1000, "sku": "BB%d" % i, "ean13": "84%011d" % i, "wholesalePrice": 9.5, "taxonomy": 78} for i in range(1000 if page == 0 else 3)]
                return httpx.Response(200, json=rows + ([rows[0]] if page == 1 else []))
            if path.endswith("productsinformation.json"):
                return httpx.Response(200, json=[{"id": 1000, "name": "Felgenreiniger"}] if page == 0 else [])
            if path.endswith("productsimages.json"):
                return httpx.Response(200, json=[{"id": 1000, "images": [{"url": "https://cdnbigbuy.com/a.jpg", "isCover": True}]}] if page == 0 else [])
            return httpx.Response(200, json=[{"id": 1000, "stocks": [{"quantity": 4}]}] if page == 0 else [])
        bigbuy_import.transport, bigbuy_import.pause_seconds = httpx.MockTransport(handler), 0
        try:
            for attempt in range(2):
                run_id = self.call(bigbuy_import.start_import, db, "sandbox", "admin_t")
                self.call(lambda: bigbuy_import._running["task"])
                for _ in range(100):
                    run = self.call(db.imports.find_one, {"_id": run_id})
                    if run["status"] != "running":
                        break
                    time.sleep(0.05)
                self.assertEqual(run["status"], "done", run.get("error"))
            self.assertEqual(self.call(db.products.count_documents, {"source": "bigbuy", "active": True}), 1003)
            self.assertEqual(run["counts"]["created"], 0)
            calls["fail"] = True
            run_id = self.call(bigbuy_import.start_import, db, "sandbox", "admin_t")
            for _ in range(100):
                run = self.call(db.imports.find_one, {"_id": run_id})
                if run["status"] != "running":
                    break
                time.sleep(0.05)
            self.assertEqual((run["status"], run["error"]), ("failed", "rate_limited"))
            self.assertEqual(self.call(db.products.count_documents, {"source": "bigbuy", "active": True}), 1003)
        finally:
            bigbuy_import.transport, bigbuy_import.pause_seconds = None, 1.0

    def test_bigbuy_ftp_import_manifest_category_filter_and_dedupe(self):
        from shop import bigbuy_ftp
        files = {"/files/categories/csv/category_de.csv": "ID;NAME;PARENTCATEGORY\n77;Auto & Motorrad;0\n78;Felgen;77\n90;Garten;0\n",
                 "/files/products/csv/standard/product_2609_de.csv": "ID;CATEGORY;NAME;PRICE;EAN13;STOCK;IMAGE1\n5001;2609,78;Felgenreiniger;10,00;8400000000001;7;https://cdnbigbuy.com/f.jpg\n5002;90;Gartenschere;4,00;;1;\n5001;78;Felgenreiniger;10,00;;7;\n"}
        class FakeFTP:
            def mlsd(self, path, facts=None):
                names = {p[len(path.rstrip("/")) + 1:].split("/")[0] for p in files if p.startswith(path.rstrip("/") + "/")}
                return [(n, {"type": "file" if path.rstrip("/") + "/" + n in files else "dir"}) for n in sorted(names)]
            def retrbinary(self, cmd, write):
                write(files[cmd[5:]].encode())
            def quit(self):
                pass
        bigbuy_ftp.connect_factory = FakeFTP
        try:
            run_id = self.call(bigbuy_import.start_import, db, "ftp", "admin_t")
            for _ in range(100):
                run = self.call(db.imports.find_one, {"_id": run_id})
                if run["status"] != "running":
                    break
                time.sleep(0.05)
            self.assertEqual(run["status"], "done", run.get("error"))
            self.assertEqual(run["counts"]["stored"], 1)
            self.assertEqual([m["size"] for m in run["manifest"]], [len(f.encode()) for f in files.values()])
            self.assertTrue(all(len(m["sha256"]) == 64 for m in run["manifest"]))
            product = self.call(db.products.find_one, {"_id": "bb-5001"})
            self.assertEqual((product["purchase_cents"], product["category_id"], product["stock"]), (1000, 78, 7))
            self.assertEqual(pricing.sell_cents(product["purchase_cents"], 30, 19), 1547)
            bigbuy_ftp.connect_factory = lambda: (_ for _ in ()).throw(bigbuy_ftp.BigBuyReadError("ftp_login_incorrect"))
            run_id = self.call(bigbuy_import.start_import, db, "ftp", "admin_t")
            for _ in range(100):
                run = self.call(db.imports.find_one, {"_id": run_id})
                if run["status"] != "running":
                    break
                time.sleep(0.05)
            self.assertEqual((run["status"], run["error"]), ("failed", "ftp_login_incorrect"))
            self.assertTrue(self.call(db.products.find_one, {"_id": "bb-5001"})["active"])
        finally:
            bigbuy_ftp.connect_factory = None



if __name__ == "__main__":
    unittest.main()

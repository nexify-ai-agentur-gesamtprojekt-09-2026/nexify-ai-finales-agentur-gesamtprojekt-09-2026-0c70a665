# TEILEKLAR Phase 1 regression: health, auth (register/login/logout/lockout/reset), roles, admin settings/import, cart, workshops
import os
import uuid

import pytest
import requests

BASE_URL = os.environ["PREVIEW_PUBLIC_ORIGIN"].rstrip("/")
ADMIN = {"email": "admin@teileklar.test", "password": "Admin-d9d42034"}
CUSTOMER = {"email": "kunde@teileklar.test", "password": "Kunde-ebecd35a"}


def login(creds):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, r.text
    return s


def detail(r):
    d = r.json()
    return d.get("detail", d)


# Health / OpenAPI
class TestHealth:
    def test_health(self):
        r = requests.get(f"{BASE_URL}/api/health", timeout=20)
        assert r.status_code == 200
        d = r.json()
        print(d)
        assert d.get("products") == 0
        assert d.get("workshops") == 489

    def test_openapi(self):
        assert requests.get(f"{BASE_URL}/api/openapi.json", timeout=20).status_code == 200


# Auth flows
class TestAuth:
    def test_register_login_me_logout(self):
        email = f"qa+{uuid.uuid4().hex[:8]}@example.org"
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": "Testpass-1234", "name": "QA"}, timeout=20)
        assert r.status_code == 201, r.text
        assert r.json()["email"] == email and r.json()["role"] == "customer"
        assert "tk_session" in s.cookies.get_dict()
        me = s.get(f"{BASE_URL}/api/auth/me", timeout=20)
        assert me.status_code == 200 and me.json()["email"] == email
        # duplicate
        dup = requests.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": "Testpass-1234"}, timeout=20)
        assert dup.status_code == 409
        assert detail(dup)["message"] == "Diese E-Mail-Adresse ist bereits registriert"
        # logout invalidates
        token = s.cookies.get("tk_session")
        assert s.post(f"{BASE_URL}/api/auth/logout", timeout=20).status_code == 200
        r2 = requests.get(f"{BASE_URL}/api/auth/me", cookies={"tk_session": token}, timeout=20)
        assert r2.status_code == 401

    def test_register_short_password(self):
        r = requests.post(f"{BASE_URL}/api/auth/register", json={"email": f"qa+{uuid.uuid4().hex[:8]}@example.org", "password": "short"}, timeout=20)
        assert r.status_code == 422
        assert detail(r)["fields"]["password"] == "too_short"

    def test_login_customer_and_wrong_password(self):
        s = login(CUSTOMER)
        assert s.get(f"{BASE_URL}/api/auth/me", timeout=20).json()["role"] == "customer"
        # throwaway email for wrong password check to not lock test accounts
        email = f"qa+{uuid.uuid4().hex[:8]}@example.org"
        requests.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": "Testpass-1234"}, timeout=20)
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "Wrongpass-123"}, timeout=20)
        assert r.status_code == 401
        assert detail(r)["message"] == "E-Mail oder Passwort ist falsch"

    def test_lockout(self):
        email = f"qa+{uuid.uuid4().hex[:8]}@example.org"
        requests.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": "Testpass-1234"}, timeout=20)
        for _ in range(5):
            assert requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "bad-password-x"}, timeout=20).status_code == 401
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "Testpass-1234"}, timeout=20)
        assert r.status_code == 429

    def test_forgot_password_generic(self):
        for e in ("kunde@teileklar.test", "nobody-xyz@example.org"):
            r = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": e}, timeout=20)
            assert r.status_code == 200 and r.json()["ok"] is True

    def test_reset_invalid_token(self):
        r = requests.post(f"{BASE_URL}/api/auth/reset-password", json={"token": "invalid", "password": "Testpass-1234"}, timeout=20)
        assert r.status_code == 400

    def test_google_invalid_session(self):
        r = requests.post(f"{BASE_URL}/api/auth/google/session", json={"session_id": "bogus"}, timeout=20)
        assert r.status_code == 401


# Roles + admin
class TestAdmin:
    def test_anonymous_settings_401(self):
        r = requests.get(f"{BASE_URL}/api/admin/settings", timeout=20)
        assert r.status_code == 401, f"anonymous got {r.status_code}"

    def test_customer_settings_403(self):
        assert login(CUSTOMER).get(f"{BASE_URL}/api/admin/settings", timeout=20).status_code == 403

    def test_admin_settings_roundtrip(self):
        s = login(ADMIN)
        cur = s.get(f"{BASE_URL}/api/admin/settings", timeout=20).json()
        assert cur["markup_percent"] in ("30", "30.0", "30.00")
        assert cur["vat_percent"].startswith("19")
        ship = cur["shipping_cents"]
        r = s.put(f"{BASE_URL}/api/admin/settings", json={"markup_percent": "35", "shipping_cents": ship}, timeout=20)
        assert r.status_code == 200
        assert s.get(f"{BASE_URL}/api/admin/settings", timeout=20).json()["markup_percent"].startswith("35")
        bad = s.put(f"{BASE_URL}/api/admin/settings", json={"markup_percent": "abc", "shipping_cents": ship}, timeout=20)
        assert bad.status_code == 422
        s.put(f"{BASE_URL}/api/admin/settings", json={"markup_percent": "30", "shipping_cents": ship}, timeout=20)
        assert s.get(f"{BASE_URL}/api/admin/settings", timeout=20).json()["markup_percent"].startswith("30")

    def test_admin_import_status(self):
        s = login(ADMIN)
        r = s.get(f"{BASE_URL}/api/admin/import", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["active_products"] == 0
        print([(x.get("environment"), x.get("status"), x.get("error") or x.get("reason")) for x in d["runs"]])

    def test_import_invalid_env(self):
        r = login(ADMIN).post(f"{BASE_URL}/api/admin/import", json={"environment": "xyz"}, timeout=20)
        assert r.status_code == 422


# Cart + catalog
class TestCart:
    def test_guest_cart_empty(self):
        r = requests.get(f"{BASE_URL}/api/shop/cart", timeout=20)
        assert r.status_code == 200 and r.json()["count"] == 0

    def test_add_nonexistent_product(self):
        r = requests.post(f"{BASE_URL}/api/shop/cart/items", json={"product_id": "nope-123", "quantity": 1}, timeout=20)
        assert r.status_code == 404

    def test_qty_out_of_range(self):
        r = requests.post(f"{BASE_URL}/api/shop/cart/items", json={"product_id": "x", "quantity": 99}, timeout=20)
        assert r.status_code == 422


# Workshops
class TestWorkshops:
    def test_search_14547(self):
        r = requests.get(f"{BASE_URL}/api/workshops/search", params={"q": "14547"}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        print("total", d["total"])
        assert d["total"] > 0
        wid = d["results"][0]["id"]
        det = requests.get(f"{BASE_URL}/api/workshops/{wid}", timeout=20)
        assert det.status_code == 200 and det.json()["id"] == wid

    def test_search_zero(self):
        d = requests.get(f"{BASE_URL}/api/workshops/search", params={"q": "00000"}, timeout=20).json()
        assert d["total"] == 0

    def test_detail_404(self):
        assert requests.get(f"{BASE_URL}/api/workshops/does-not-exist", timeout=20).status_code == 404

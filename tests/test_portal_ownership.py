"""Portal API: an object id is never sufficient to read or change an object.

Runs the real router against an in-memory store; the model stream is replaced by a
local generator, so no network and no provider is involved.
"""
import ast
import hashlib
import json
import unittest
from datetime import datetime, timedelta, timezone

from suite_fakes import ROOT, Database, bind_shop_environment

bind_shop_environment()
try:
    import httpx
    from fastapi import FastAPI
    from shop import accounts_api, nexify_api
    HTTP_DEPS = True
except ImportError:
    HTTP_DEPS = False

SOURCE = ROOT / "apps" / "shop-api" / "shop" / "nexify_api.py"


def _calls(node):
    return {n.func.id for n in ast.walk(node) if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)}


class RouteGuards(unittest.TestCase):
    """Static guard: a portal/operator route cannot be added without its identity check."""

    def test_every_portal_and_operator_route_requires_its_identity(self):
        checked = 0
        for node in ast.parse(SOURCE.read_text()).body:
            if not isinstance(node, ast.AsyncFunctionDef):
                continue
            paths = [d.args[0].value for d in node.decorator_list
                     if isinstance(d, ast.Call) and d.args and isinstance(d.args[0], ast.Constant) and isinstance(d.args[0].value, str)]
            for path in paths:
                if path.startswith("/api/portal"):
                    self.assertIn("need_user", _calls(node), path)
                    checked += 1
                elif path.startswith("/api/operator"):
                    self.assertIn("need_admin", _calls(node), path)
                    checked += 1
        self.assertGreater(checked, 30)

    def test_conversation_routes_check_ownership(self):
        handlers = {n.name: n for n in ast.parse(SOURCE.read_text()).body if isinstance(n, ast.AsyncFunctionDef)}
        for name in ("oracle_history", "oracle_chat"):
            self.assertIn("oracle_session_access", _calls(handlers[name]), name)


@unittest.skipUnless(HTTP_DEPS, "pinned FastAPI/httpx dependencies unavailable")
class PortalOwnership(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = Database()
        self._saved = (nexify_api.db, accounts_api.db, nexify_api._stream_ninerouter, nexify_api.providers)
        nexify_api.db = accounts_api.db = self.db
        await self.db.oracle_sessions.create_index("session_id", unique=True)

        async def stream(history, message):
            yield "Antwort"
        nexify_api._stream_ninerouter = stream
        nexify_api.providers = lambda: [{"id": "ninerouter", "label": "Oracle", "model": "fixture", "available": True}]
        app = FastAPI()
        app.include_router(nexify_api.router)
        self.transport = httpx.ASGITransport(app=app)
        self.tokens = {}
        for name, verified in (("a", False), ("b", False), ("verified", True)):
            token = "session-token-" + name
            self.tokens[name] = token
            await self.db.users.insert_one({"user_id": "user_" + name, "email": name + "@example.invalid", "role": "customer", "email_verified": verified})
            await self.db.sessions.insert_one({"token_hash": hashlib.sha256(token.encode()).hexdigest(), "user_id": "user_" + name,
                                               "expires_at": datetime.now(timezone.utc) + timedelta(days=1)})

    async def asyncTearDown(self):
        nexify_api.db, accounts_api.db, nexify_api._stream_ninerouter, nexify_api.providers = self._saved

    def client(self, who=None, cookie=None):
        headers = {"Authorization": "Bearer " + self.tokens[who]} if who else {}
        if cookie:
            headers["Cookie"] = "%s=%s" % (nexify_api.ORACLE_OWNER_COOKIE, cookie)
        return httpx.AsyncClient(transport=self.transport, base_url="https://suite.example.invalid", headers=headers)

    async def chat(self, who=None, cookie=None, session_id=""):
        async with self.client(who, cookie) as client:
            return await client.post("/api/oracle/chat", json={"session_id": session_id, "message": "Vertrauliche Frage"})

    async def history(self, session_id, who=None, cookie=None):
        async with self.client(who, cookie) as client:
            return await client.get("/api/oracle/history/" + session_id)

    @staticmethod
    def session_of(response):
        line = next(l for l in response.text.splitlines() if l.startswith("data:") and "session_id" in l)
        return json.loads(line[5:])["session_id"]

    async def test_account_conversation_is_readable_only_by_its_account(self):
        started = await self.chat("a")
        self.assertEqual(started.status_code, 200)
        self.assertNotIn("set-cookie", started.headers)
        sid = self.session_of(started)
        own = await self.history(sid, "a")
        self.assertEqual(own.status_code, 200)
        self.assertEqual([m["role"] for m in own.json()["messages"]], ["user", "assistant"])
        for who in ("b", None):
            foreign = await self.history(sid, who)
            self.assertEqual(foreign.status_code, 404, who)
            self.assertNotIn("Vertrauliche", foreign.text)
        self.assertEqual((await self.history("doesnotexist")).status_code, 404)

    async def test_foreign_account_cannot_continue_a_conversation(self):
        sid = self.session_of(await self.chat("a"))
        before = len(self.db.oracle_messages.rows)
        for who in ("b", None):
            self.assertEqual((await self.chat(who, session_id=sid)).status_code, 404)
        self.assertEqual(len(self.db.oracle_messages.rows), before)
        self.assertEqual((await self.chat("a", session_id=sid)).status_code, 200)

    async def test_anonymous_conversation_is_bound_to_its_visitor_cookie(self):
        started = await self.chat()
        sid = self.session_of(started)
        cookie_header = started.headers["set-cookie"]
        self.assertIn("HttpOnly", cookie_header)
        self.assertIn("Secure", cookie_header)
        token = cookie_header.split(";")[0].split("=", 1)[1]
        record = await self.db.oracle_sessions.find_one({"session_id": sid})
        self.assertNotIn(token, str(record))
        self.assertEqual(record["owner_hash"], hashlib.sha256(token.encode()).hexdigest())
        self.assertEqual((await self.history(sid, cookie=token)).status_code, 200)
        self.assertEqual((await self.history(sid)).status_code, 404)
        self.assertEqual((await self.history(sid, cookie="x" * 43)).status_code, 404)
        self.assertEqual((await self.history(sid, "a")).status_code, 404)
        again = await self.chat(cookie=token, session_id=sid)
        self.assertEqual(again.status_code, 200)
        self.assertNotIn("set-cookie", again.headers)

    async def test_legacy_conversations_without_owner_record(self):
        await self.db.oracle_messages.insert_one({"session_id": "legacyaccount", "user_id": "user_a", "role": "user", "content": "alt", "at": "2026-01-01"})
        await self.db.oracle_messages.insert_one({"session_id": "legacyanon", "user_id": None, "role": "user", "content": "alt", "at": "2026-01-01"})
        self.assertEqual((await self.history("legacyaccount", "a")).status_code, 200)
        self.assertEqual((await self.history("legacyaccount", "b")).status_code, 404)
        for who in ("a", None):
            self.assertEqual((await self.history("legacyanon", who)).status_code, 404)
            self.assertEqual((await self.chat(who, session_id="legacyanon")).status_code, 404)

    async def test_unverified_address_does_not_expose_requests_of_that_address(self):
        await self.db.requests.insert_one({"number": "NX-1", "email": "a@example.invalid", "user_id": None, "message": "fremd", "created_at": "1"})
        await self.db.requests.insert_one({"number": "NX-2", "email": "verified@example.invalid", "user_id": None, "message": "eigen", "created_at": "1"})
        await self.db.requests.insert_one({"number": "NX-3", "email": "other@example.invalid", "user_id": "user_a", "message": "angemeldet", "created_at": "2"})
        async with self.client("a") as client:
            items = (await client.get("/api/portal/requests")).json()["items"]
            overview = (await client.get("/api/portal/overview")).json()
        self.assertEqual([i["number"] for i in items], ["NX-3"])
        self.assertEqual(overview["counts"]["requests"], 1)
        async with self.client("verified") as client:
            items = (await client.get("/api/portal/requests")).json()["items"]
        self.assertEqual([i["number"] for i in items], ["NX-2"])

    async def test_objects_of_another_tenant_are_not_found(self):
        await self.db.offers.insert_one({"offer_id": "o1", "tenant_id": "user_a", "status": "sent", "number": "ANG-1", "title": "T"})
        await self.db.documents.insert_one({"doc_id": "d1", "tenant_id": "user_a", "title": "Doc", "content": "geheim"})
        await self.db.invoices.insert_one({"invoice_id": "i1", "tenant_id": "user_a", "number": "N-1"})
        await self.db.tickets.insert_one({"ticket_id": "t1", "tenant_id": "user_a", "messages": [], "status": "open"})
        await self.db.api_keys.insert_one({"key_id": "k1", "tenant_id": "user_a", "revoked_at": None})
        async with self.client("b") as client:
            self.assertEqual((await client.post("/api/portal/offers/o1/decision", json={"decision": "accept"})).status_code, 404)
            self.assertEqual((await client.get("/api/portal/documents/d1/download")).status_code, 404)
            self.assertEqual((await client.get("/api/portal/invoices/i1/download")).status_code, 404)
            self.assertEqual((await client.post("/api/portal/tickets/t1/messages", json={"message": "x"})).status_code, 404)
            self.assertEqual((await client.delete("/api/portal/api-keys/k1")).status_code, 404)
            for path in ("offers", "documents", "invoices", "tickets", "api-keys"):
                self.assertEqual((await client.get("/api/portal/" + path)).json()["items"], [], path)
        self.assertEqual((await self.db.offers.find_one({"offer_id": "o1"}))["status"], "sent")
        self.assertEqual((await self.db.tickets.find_one({"ticket_id": "t1"}))["messages"], [])
        self.assertIsNone((await self.db.api_keys.find_one({"key_id": "k1"}))["revoked_at"])
        async with self.client() as client:
            self.assertEqual((await client.get("/api/portal/offers")).status_code, 401)
        async with self.client("a") as client:
            self.assertEqual((await client.post("/api/portal/offers/o1/decision", json={"decision": "accept"})).status_code, 200)
            self.assertEqual((await client.post("/api/portal/offers/o1/decision", json={"decision": "decline"})).status_code, 409)
            self.assertEqual((await client.get("/api/operator/customers")).status_code, 403)
        self.assertEqual((await self.db.offers.find_one({"offer_id": "o1"}))["status"], "accepted")


if __name__ == "__main__":
    unittest.main()

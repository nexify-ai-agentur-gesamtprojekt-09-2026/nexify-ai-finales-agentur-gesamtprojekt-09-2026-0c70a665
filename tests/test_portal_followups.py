"""Portal API follow-ups: operator overview robustness, chat limit per party, team archive instead of delete."""
import hashlib
import json
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock

from suite_fakes import ROOT, Database, bind_shop_environment

bind_shop_environment()
try:
    import httpx
    from fastapi import FastAPI
    from shop import accounts_api, nexify_api
    HTTP_DEPS = True
except ImportError:
    HTTP_DEPS = False


class NoHardDeletes(unittest.TestCase):
    def test_portal_api_contains_no_irreversible_delete(self):
        source = (ROOT / "apps/shop-api/shop/nexify_api.py").read_text()
        for call in ("delete_one(", "delete_many(", ".drop(", "find_one_and_delete("):
            self.assertNotIn(call, source, call)


@unittest.skipUnless(HTTP_DEPS, "pinned FastAPI/httpx dependencies unavailable")
class Base(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = Database()
        await self.db.oracle_sessions.create_index("session_id", unique=True)

        async def stream(history, message):
            yield "Antwort"
        self.provider_list = [{"id": "ninerouter", "label": "Oracle", "model": "fixture", "available": True}]
        for patch in (mock.patch.object(nexify_api, "db", self.db), mock.patch.object(accounts_api, "db", self.db),
                      mock.patch.object(nexify_api, "_stream_ninerouter", stream), mock.patch.object(nexify_api, "providers", lambda: self.provider_list)):
            patch.start()
            self.addCleanup(patch.stop)
        app = FastAPI()
        app.include_router(nexify_api.router)
        self.transport = httpx.ASGITransport(app=app)
        self.tokens = {}
        for name, role in (("a", "customer"), ("b", "customer"), ("admin", "admin")):
            self.tokens[name] = "session-token-" + name
            await self.db.users.insert_one({"user_id": "user_" + name, "email": name + "@example.invalid", "role": role})
            await self.db.sessions.insert_one({"token_hash": hashlib.sha256(self.tokens[name].encode()).hexdigest(), "user_id": "user_" + name,
                                               "expires_at": datetime.now(timezone.utc) + timedelta(days=1)})

    async def call(self, method, path, who=None, cookie=None, **kwargs):
        headers = {"Authorization": "Bearer " + self.tokens[who]} if who else {}
        if cookie:
            headers["Cookie"] = "%s=%s" % (nexify_api.ORACLE_OWNER_COOKIE, cookie)
        async with httpx.AsyncClient(transport=self.transport, base_url="https://suite.example.invalid", headers=headers) as client:
            return await client.request(method, path, **kwargs)


class OperatorOverview(Base):
    async def test_overview_answers_for_any_length_of_the_provider_list(self):
        variants = [(self.provider_list, "ok"), ([], "not_configured"), ([{"id": "ninerouter", "label": "Oracle", "available": False}], "not_configured"),
                    ([{"id": "x", "available": True}, {"id": "y", "available": True}, {"id": "ninerouter", "label": "Oracle", "available": True}], "ok")]
        for providers, expected in variants:
            self.provider_list = providers
            response = await self.call("GET", "/api/operator/overview", "admin")
            self.assertEqual(response.status_code, 200, response.text)
            checks = {c["name"]: c["state"] for c in response.json()["checks"]}
            self.assertEqual(checks["9router"], expected)
        self.assertEqual((await self.call("GET", "/api/operator/overview", "a")).status_code, 403)
        self.assertEqual((await self.call("GET", "/api/operator/overview")).status_code, 401)


class ChatLimitPerParty(Base):
    async def chat(self, who=None, cookie=None, session_id=""):
        return await self.call("POST", "/api/oracle/chat", who, cookie, json={"session_id": session_id, "message": "Frage"})

    async def test_a_new_conversation_does_not_reset_the_account_limit(self):
        with mock.patch.object(nexify_api, "CHAT_DAILY_LIMIT", 3):
            sessions = set()
            for _ in range(3):
                response = await self.chat("a")
                self.assertEqual(response.status_code, 200)
                sessions.add(json.loads(next(l for l in response.text.splitlines() if "session_id" in l)[5:])["session_id"])
            self.assertEqual(len(sessions), 3)
            self.assertEqual((await self.chat("a")).status_code, 429)
            self.assertEqual((await self.chat("a", session_id=sessions.pop())).status_code, 429)
            self.assertEqual((await self.chat("b")).status_code, 200)  # another account is unaffected
            for row in self.db.oracle_messages.rows:  # yesterday's messages no longer count
                row["at"] = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
            self.assertEqual((await self.chat("a")).status_code, 200)

    async def test_anonymous_limit_follows_the_visitor_cookie_and_hash_stays_internal(self):
        with mock.patch.object(nexify_api, "CHAT_DAILY_LIMIT", 2):
            first = await self.chat()
            token = first.headers["set-cookie"].split(";")[0].split("=", 1)[1]
            sid = json.loads(next(l for l in first.text.splitlines() if "session_id" in l)[5:])["session_id"]
            self.assertEqual((await self.chat(cookie=token)).status_code, 200)  # second conversation, same visitor
            self.assertEqual((await self.chat(cookie=token)).status_code, 429)
            self.assertEqual((await self.chat(cookie=token, session_id=sid)).status_code, 429)
            self.assertEqual((await self.chat(cookie="y" * 43)).status_code, 200)  # another visitor
            history = await self.call("GET", "/api/oracle/history/" + sid, cookie=token)
            self.assertEqual(history.status_code, 200)
            self.assertNotIn("owner_hash", history.text)
            self.assertNotIn(token, repr(self.db.oracle_messages.rows))


class TeamArchive(Base):
    async def test_removal_archives_hides_and_can_be_restored(self):
        created = (await self.call("POST", "/api/portal/team", "a", json={"email": "kollegin@example.invalid", "role": "lesen"})).json()
        member_id = created["member_id"]
        self.assertEqual((await self.call("DELETE", "/api/portal/team/" + member_id, "b")).status_code, 404)
        removed = await self.call("DELETE", "/api/portal/team/" + member_id, "a")
        self.assertEqual(removed.json(), {"ok": True, "archived": True})
        row = self.db.team_members.rows[0]
        self.assertEqual((row["email"], row["archived_by"], row["status"]), ("kollegin@example.invalid", "user_a", "archiviert"))
        self.assertTrue(row["archived_at"])
        self.assertEqual((await self.call("GET", "/api/portal/profile", "a")).json()["team"], [])
        self.assertEqual([m["member_id"] for m in (await self.call("GET", "/api/portal/team/archive", "a")).json()["items"]], [member_id])
        self.assertEqual((await self.call("GET", "/api/portal/team/archive", "b")).json()["items"], [])
        self.assertEqual((await self.call("DELETE", "/api/portal/team/" + member_id, "a")).status_code, 404)  # already archived
        self.assertEqual((await self.call("POST", "/api/portal/team/%s/restore" % member_id, "b")).status_code, 404)
        restored = await self.call("POST", "/api/portal/team/%s/restore" % member_id, "a")
        self.assertEqual((restored.status_code, restored.json()["archived_at"], restored.json()["status"]), (200, None, "eingeladen"))
        self.assertEqual(len((await self.call("GET", "/api/portal/profile", "a")).json()["team"]), 1)
        self.assertEqual((await self.call("POST", "/api/portal/team/%s/restore" % member_id, "a")).status_code, 404)
        self.assertEqual([a["action"] for a in self.db.audit.rows], ["team_member_archived", "team_member_restored"])
        self.assertEqual(len(self.db.team_members.rows), 1)


if __name__ == "__main__":
    unittest.main()

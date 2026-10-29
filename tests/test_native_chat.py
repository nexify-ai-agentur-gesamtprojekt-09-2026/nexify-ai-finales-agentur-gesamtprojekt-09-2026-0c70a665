"""Actual local HTTP/SQLite visitor actions and adversarial ownership boundaries."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import http.client
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("native_chat_gateway", ROOT / "apps/agent-gateway/server.py")
gateway = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(gateway)


class NativeChatTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = gateway.Store(Path(self.tmp.name) / "visitor.sqlite")
        self.store.seed_planning_slots()
        self.server = gateway.build_server(self.store, port=0, web_origin="http://127.0.0.1:3004")
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.port = self.server.server_port
        self.origin = f"http://127.0.0.1:{self.port}"
        status, body, headers = self.request("GET", "/api/session")
        self.assertEqual(status, 200)
        self.cookie = headers["Set-Cookie"].split(";", 1)[0]
        self.csrf = body["csrf"]

    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join(2)
        self.tmp.cleanup()

    def request(self, method, path, body=None, cookie=None, csrf=None, headers=None, key="request-key-001"):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=3)
        fields = dict(headers or {})
        if cookie is not None:
            fields["Cookie"] = cookie
        if method == "POST":
            fields.update({"Content-Type": "application/json", "Origin": self.origin, "Idempotency-Key": key})
            if csrf is not None:
                fields["X-CSRF-Token"] = csrf
            fields.update(headers or {})
            body = json.dumps(body).encode() if isinstance(body, dict) else body
        connection.request(method, path, body, fields)
        response = connection.getresponse(); raw = response.read(); result_headers = dict(response.getheaders())
        status = response.status; mime = response.getheader("Content-Type", "")
        connection.close()
        return status, json.loads(raw) if mime.startswith("application/json") else raw, result_headers

    def action(self, path, body, **kwargs):
        return self.request("POST", path, body, cookie=self.cookie, csrf=self.csrf, **kwargs)

    def quote(self):
        status, quote, _ = self.action("/api/quotes", {"title": "Website für die Werkstatt", "details": "Eine erreichbare Website mit Terminabstimmung."})
        self.assertEqual(status, 200)
        return quote

    def test_session_cookie_is_http_only_and_no_unbound_provider_claim(self):
        status, session, headers = self.request("GET", "/api/session")
        self.assertEqual(status, 200)
        self.assertIn("HttpOnly", headers["Set-Cookie"])
        self.assertIn("SameSite=Lax", headers["Set-Cookie"])
        self.assertIs(session["capabilities"]["email_delivery"], False)
        self.assertIs(session["capabilities"]["external_calendar"], False)
        self.assertIs(session["capabilities"]["model_chat"], False)

    def test_cookie_csrf_and_current_origin_required_before_write(self):
        body = {"title": "Vorhaben", "details": "Ein Projekt"}
        for csrf, headers in ((None, {}), ("wrong", {}), (self.csrf, {"Origin": "https://foreign.invalid"})):
            with self.subTest(csrf=csrf, headers=headers):
                status, _, _ = self.request("POST", "/api/quotes", body, cookie=self.cookie, csrf=csrf, headers=headers)
                self.assertEqual(status, 403)
        with self.store.connect() as db:
            self.assertEqual(db.execute("SELECT count(*) FROM objects").fetchone()[0], 0)

    def test_wrong_host_and_invalid_credentials_do_not_fall_back_to_guest(self):
        self.assertEqual(self.request("GET", "/api/session", headers={"Host": "evil.invalid"})[0], 403)
        self.assertEqual(self.request("GET", "/api/session", headers={"Authorization": "Bearer wrong"})[0], 401)
        self.assertEqual(self.request("GET", "/api/session", cookie="nx_visit=invalid")[0], 401)

    def test_quote_replay_and_payload_conflict(self):
        quote = self.quote()
        second = self.quote()
        self.assertEqual(quote, second)
        self.assertEqual(self.action("/api/quotes", {"title": "Changed", "details": "Different"})[0], 409)
        with self.store.connect() as db:
            self.assertEqual(db.execute("SELECT count(*) FROM objects").fetchone()[0], 1)

    def test_real_pdf_has_consistent_xref_and_draft_label(self):
        quote = self.quote()
        status, raw, headers = self.request("GET", quote["download_url"], cookie=self.cookie)
        self.assertEqual(status, 200); self.assertEqual(headers["Content-Type"], "application/pdf")
        self.assertTrue(raw.startswith(b"%PDF-1.4")); self.assertTrue(raw.endswith(b"%%EOF\n"))
        self.assertIn(b"ENTWURF", raw); self.assertIn(b"NICHT VERBINDLICH", raw)
        xref = int(raw.split(b"startxref\n")[1].splitlines()[0])
        self.assertEqual(raw[xref:xref + 4], b"xref")

    def test_foreign_visitor_cannot_read_or_send_quote(self):
        quote = self.quote()
        _, other, headers = self.request("GET", "/api/session")
        cookie = headers["Set-Cookie"].split(";", 1)[0]
        self.assertEqual(self.request("GET", quote["download_url"], cookie=cookie)[0], 404)
        self.assertEqual(self.request("POST", f"/api/quotes/{quote['id']}/send", {"email": "recipient@example.invalid", "confirmed": True}, cookie=cookie, csrf=other["csrf"])[0], 404)
        with self.store.connect() as db:
            self.assertEqual(db.execute("SELECT count(*) FROM outbox").fetchone()[0], 0)

    def test_pending_email_is_never_reported_sent_and_deduplicates(self):
        quote = self.quote(); path = f"/api/quotes/{quote['id']}/send"
        body = {"email": "recipient@example.invalid", "confirmed": True}
        one = self.action(path, body, key="send-request-001")
        two = self.action(path, body, key="send-request-002")
        self.assertEqual(one[0], 200); self.assertEqual(one[1], two[1])
        self.assertEqual(one[1]["state"], "pending_provider"); self.assertIs(one[1]["sent"], False)
        with self.store.connect() as db:
            self.assertEqual(db.execute("SELECT count(*) FROM outbox").fetchone()[0], 1)

    def test_send_requires_concrete_recipient_confirmation(self):
        quote = self.quote()
        status, _, _ = self.action(f"/api/quotes/{quote['id']}/send", {"email": "recipient@example.invalid", "confirmed": False}, key="email-request-001")
        self.assertEqual(status, 422)

    def test_slot_claim_is_atomic_under_competing_visitors(self):
        status, available, _ = self.request("GET", "/api/slots", cookie=self.cookie)
        self.assertEqual(status, 200); self.assertTrue(available["slots"])
        slot = available["slots"][0]["id"]
        people = [self.store.visitor()[0] for _ in range(8)]
        def reserve(item):
            index, person = item
            try:
                return self.store.action(person["id"], "booking", f"booking-key-{index}", {"slot_id": slot, "name": "Fixture", "email": "fixture@example.invalid"})
            except gateway.Rejected as rejected:
                return rejected.status
        with ThreadPoolExecutor(max_workers=8) as executor:
            results = list(executor.map(reserve, enumerate(people)))
        self.assertEqual(sum(isinstance(result, dict) for result in results), 1)
        self.assertEqual(results.count(409), 7)
        successful = next(result for result in results if isinstance(result, dict))
        self.assertEqual(successful["state"], "requested_local_planning"); self.assertIs(successful["confirmed"], False)

    def test_booking_replay_is_one_record(self):
        slots = self.request("GET", "/api/slots", cookie=self.cookie)[1]["slots"]
        body = {"slot_id": slots[0]["id"], "name": "Fixture", "email": "fixture@example.invalid"}
        one = self.action("/api/bookings", body)
        two = self.action("/api/bookings", body)
        self.assertEqual(one[0], two[0])
        self.assertEqual(one[1], two[1])
        with self.store.connect() as db:
            self.assertEqual(db.execute("SELECT count(*) FROM bookings").fetchone()[0], 1)

    def test_session_reload_restores_history_and_quote(self):
        quote = self.quote()
        self.assertEqual(self.action("/api/chat", {"message": "Ich möchte ein Angebot besprechen"}, key="chat-request-001")[0], 200)
        status, session, _ = self.request("GET", "/api/session", cookie=self.cookie)
        self.assertEqual(status, 200); self.assertEqual(len(session["history"]), 2)
        self.assertEqual(session["workspace"]["quotes"][0]["id"], quote["id"])

    def test_session_reload_returns_latest_twenty_quotes_in_chronological_order(self):
        created = []
        for index in range(21):
            status, quote, _ = self.action("/api/quotes", {"title": f"Synthetic quote {index}", "details": "Local reload regression"}, key=f"reload-quote-{index:04}")
            self.assertEqual(status, 200)
            created.append(quote)
        for _ in range(2):
            status, session, _ = self.request("GET", "/api/session", cookie=self.cookie)
            self.assertEqual(status, 200)
            self.assertEqual(session["workspace"]["quotes"], created[-20:])
        latest = session["workspace"]["quotes"][-1]
        self.assertEqual(latest, created[-1])
        self.assertEqual(self.request("GET", latest["download_url"], cookie=self.cookie)[0], 200)
        _, foreign, headers = self.request("GET", "/api/session")
        foreign_cookie = headers["Set-Cookie"].split(";", 1)[0]
        self.assertEqual(foreign["workspace"]["quotes"], [])
        self.assertEqual(self.request("GET", latest["download_url"], cookie=foreign_cookie)[0], 404)
        self.assertEqual(self.request("POST", f"/api/quotes/{latest['id']}/send", {"email": "fixture@example.invalid", "confirmed": True}, cookie=foreign_cookie, csrf=foreign["csrf"])[0], 404)

    def test_marketing_drafts_use_requested_locale_and_preserve_facts_and_replay(self):
        for locale, prefix, audience_prefix in [("de", "Ziel: ", "Zielgruppe: "), ("nl", "Doel: ", "Doelgroep: "), ("fr", "Objectif : ", "Public cible : ")]:
            with self.subTest(locale=locale):
                payload = {"locale": locale, "goal": "Synthetic goal", "audience": "Synthetic audience"}
                status, draft, _ = self.action("/api/marketing", payload, key="locale-marketing-" + locale)
                self.assertEqual(status, 200)
                self.assertEqual(draft["draft"][0], prefix + payload["goal"])
                self.assertEqual(draft["draft"][1], audience_prefix + payload["audience"])
                self.assertEqual(draft["goal"], payload["goal"])
                self.assertEqual(draft["audience"], payload["audience"])
                self.assertFalse(draft["published"])
                self.assertFalse(draft["model_generated"])
                self.assertEqual(self.action("/api/marketing", payload, key="locale-marketing-" + locale)[1], draft)
                self.assertEqual(self.store.object(self.store.visitor(self.cookie.split("=", 1)[1])[0]["id"], draft["id"], "marketing"), draft)
        self.assertEqual(self.action("/api/marketing", {"locale": "xx", "goal": "Synthetic", "audience": "Synthetic"}, key="invalid-locale-0001")[0], 422)

    def test_marketing_is_persistent_draft_without_fake_model_or_publication(self):
        status, result, _ = self.action("/api/marketing", {"goal": "Qualifizierte Anfragen", "audience": "Lokale Werkstätten"})
        self.assertEqual(status, 200); self.assertFalse(result["published"]); self.assertFalse(result["model_generated"])
        self.assertTrue(result["draft"])
        self.assertEqual(self.store.object(gateway.digest(self.cookie.split("=", 1)[1]), result["id"], "marketing")["goal"], "Qualifizierte Anfragen")

    def test_duplicate_keys_nonfinite_and_oversized_json_rejected(self):
        for raw in (b'{"title":"a","title":"b","details":"c"}', b'{"title":"x","details":NaN}', b'{"title":"' + b'a' * 17000 + b'"}', b'{"title":"\\ud800","details":"invalid unicode"}'):
            with self.subTest(length=len(raw)):
                self.assertEqual(self.request("POST", "/api/quotes", raw, cookie=self.cookie, csrf=self.csrf)[0], 422)

    def test_unadvertised_action_fields_and_locale_rejected(self):
        self.assertEqual(self.action("/api/quotes", {"title": "Fixture", "details": "Scope", "owner": "another-visitor"})[0], 422)
        self.assertEqual(self.action("/api/chat", {"message": "Hallo", "locale": "unknown"})[0], 422)

    def test_non_ascii_csrf_returns_error_without_action(self):
        self.assertEqual(self.request("POST", "/api/quotes", {"title": "Fixture", "details": "Scope"}, cookie=self.cookie, csrf="é")[0], 403)

    def test_private_or_encoded_paths_not_served(self):
        for path in ("/.git/config", "/config/automation.json", "/%2e%2e/.env", "/api/quotes/" + "0" * 32 + "/pdf"):
            with self.subTest(path=path):
                self.assertEqual(self.request("GET", path, cookie=self.cookie)[0], 404)

    def test_explicit_next_origin_accepted_but_lookalikes_denied(self):
        body = {"message": "Marketing"}
        self.assertEqual(self.action("/api/chat", body, headers={"Origin": "http://127.0.0.1:3004"})[0], 200)
        self.assertEqual(self.action("/api/chat", body, headers={"Origin": "http://127.0.0.1:3004.evil.invalid"})[0], 403)

    def test_public_route_api_excludes_protected_information(self):
        mapping = json.loads((ROOT / "config/site-map.json").read_text())
        protected = {page["id"] for page in mapping["pages"] if page["access"]["visibility"] != "public" or page["access"]["auth_required"]}
        status, public, _ = self.request("GET", "/api/pages")
        self.assertEqual(status, 200)
        self.assertTrue(public)
        self.assertFalse({page["id"] for page in public} & protected)
        self.assertEqual({page["site_context"] for page in public}, {"nexify", "teileklar"})

    def test_capabilities_describe_actual_local_operations_and_match_session(self):
        status, result, headers = self.request("GET", "/api/capabilities")
        self.assertEqual(status, 200)
        self.assertEqual(result["mode"], "local_development")
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertNotIn("Set-Cookie", headers)
        for name in ("quote_pdf", "pending_outbox", "booking_request", "marketing_template", "local_planning"):
            self.assertIs(result["capabilities"][name], True)
        for name in ("email_delivery", "external_calendar", "model_chat"):
            self.assertIs(result["capabilities"][name], False)
        session = self.request("GET", "/api/session", cookie=self.cookie)[1]
        self.assertEqual(session["capabilities"], result["capabilities"])

    def test_public_allowlist_and_access_guards_both_gate_api_and_store_context(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); (root / "config").mkdir()
            def page(identifier, visibility="public", auth=False):
                return {"id": identifier, "path": "/" + identifier, "title": {"de": identifier},
                        "summary": {"de": "fixture-" + identifier}, "site_context": "nexify",
                        "access": {"visibility": visibility, "auth_required": auth}}
            mapping = {"public_allowlist": ["allowed", "private", "requires-auth"],
                       "pages": [page("allowed"), page("unlisted"), page("private", "private"), page("requires-auth", auth=True)]}
            (root / "config/site-map.json").write_text(json.dumps(mapping))
            with patch.object(gateway, "ROOT", root):
                store = gateway.Store(root / "isolated.sqlite")
                server = gateway.build_server(store, port=0)
                thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
                try:
                    connection = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=3)
                    connection.request("GET", "/api/pages")
                    response = connection.getresponse(); public = json.loads(response.read()); connection.close()
                    self.assertEqual(response.status, 200)
                    self.assertEqual([entry["id"] for entry in public], ["allowed"])
                    self.assertEqual(set(store.page_contexts), {"/allowed"})
                    visitor, _ = store.visitor()
                    for path in ("/unlisted", "/private", "/requires-auth"):
                        with self.subTest(path=path), self.assertRaises(gateway.Rejected) as rejected:
                            store.action(visitor["id"], "chat", "isolated-context-001", {"message": "Hallo", "page_path": path})
                        self.assertEqual(rejected.exception.code, "invalid_page_context")
                    result = store.action(visitor["id"], "chat", "isolated-context-001", {"message": "Hallo", "page_path": "/allowed"})
                    self.assertEqual(result["context"], {"page_id": "allowed", "path": "/allowed"})
                finally:
                    server.shutdown(); server.server_close(); thread.join(2)

    def test_public_chat_context_is_normalized_persisted_and_replayed_once(self):
        page = next(page for page in gateway.public_pages() if page["path"] != "/")
        body = {"message": "Marketing planen", "page_path": " " + page["path"] + "/ "}
        status, result, _ = self.action("/api/chat", body, key="context-replay-001")
        self.assertEqual(status, 200)
        self.assertEqual(result["context"], {"page_id": page["id"], "path": page["path"]})
        body["page_path"] = page["path"]
        replay = self.action("/api/chat", body, key="context-replay-001")
        self.assertEqual(replay[0], 200); self.assertEqual(replay[1], result)
        reloaded = self.request("GET", "/api/session", cookie=self.cookie)[1]
        self.assertEqual(len(reloaded["history"]), 2)
        self.assertEqual(json.loads(reloaded["history"][-1]["body"])["context"], result["context"])

    def test_unknown_and_protected_chat_contexts_are_rejected_without_persistence(self):
        mapping = json.loads((ROOT / "config/site-map.json").read_text())
        private = [page["path"] for page in mapping["pages"] if page["access"]["visibility"] != "public" or page["access"]["auth_required"]]
        self.assertTrue(private)
        for path in ["/not-a-public-page", *private]:
            with self.subTest(path=path):
                status, result, _ = self.action("/api/chat", {"message": "Hallo", "page_path": path})
                self.assertEqual(status, 422); self.assertEqual(result, {"error": "invalid_page_context"})
        with self.store.connect() as db:
            self.assertEqual(db.execute("SELECT count(*) FROM messages").fetchone()[0], 0)
            self.assertEqual(db.execute("SELECT count(*) FROM receipts").fetchone()[0], 0)

    def test_malicious_context_cannot_inject_page_fields_or_bypass_csrf(self):
        for path in ("https://foreign.invalid/", "//foreign.invalid/", "/?role=admin", "/#private", "/%2e%2e/", "/../", "<script>", {"path": "/", "role": "admin"}, 42, None):
            with self.subTest(path=path):
                self.assertEqual(self.action("/api/chat", {"message": "Hallo", "page_path": path})[0], 422)
        body = {"message": "Hallo", "page_path": "/"}
        self.assertEqual(self.request("POST", "/api/chat", body, cookie=self.cookie)[0], 403)
        self.assertEqual(self.action("/api/chat", {**body, "page_title": "Injected private metadata"})[0], 422)
        self.assertEqual(self.request("GET", "/api/session", cookie=self.cookie)[1]["history"], [])

    def test_context_remains_optional_but_changes_conflict_and_receipts_are_owner_scoped(self):
        body = {"message": "Hallo"}
        self.assertIsNone(self.action("/api/chat", body, key="context-optional-001")[1]["context"])
        self.assertEqual(self.action("/api/chat", {**body, "page_path": "/"}, key="context-optional-001")[0], 409)
        _, other, headers = self.request("GET", "/api/session")
        cookie = headers["Set-Cookie"].split(";", 1)[0]
        status, result, _ = self.request("POST", "/api/chat", {**body, "page_path": "/"}, cookie=cookie, csrf=other["csrf"], key="context-optional-001")
        self.assertEqual(status, 200); self.assertEqual(result["context"]["path"], "/")
        original = self.request("GET", "/api/session", cookie=self.cookie)[1]
        self.assertEqual(len(original["history"]), 2)
        self.assertIsNone(json.loads(original["history"][-1]["body"])["context"])


if __name__ == "__main__":
    unittest.main()

"""Resend mail, ElevenLabs read-aloud and ChatGPT test option of the visitor gateway.

All provider traffic uses fake transports/openers: no message is sent, no audio
synthesized and no model called by this suite.
"""
import http.client
import importlib.util
import io
import json
from pathlib import Path
import sqlite3
import tempfile
import threading
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("integration_gateway", ROOT / "apps/agent-gateway/server.py")
gateway = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(gateway)
tools = gateway.integrations()


class FakeTransport:
    def __init__(self, errors=()):
        self.calls, self.errors = [], list(errors)

    def send(self, recipient, subject, html_body, text_body, key):
        self.calls.append({"to": recipient, "subject": subject, "html": html_body, "text": text_body, "key": key})
        if self.errors:
            raise self.errors.pop(0)
        return "re_" + key[-8:]


class FakeReply(io.BytesIO):
    def __init__(self, raw, status=200, content_type="application/json"):
        super().__init__(raw)
        self.status, self.headers = status, {"Content-Type": content_type}

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False


class Clock:
    def __init__(self):
        import time
        self.now = time.time() + 1

    def __call__(self):
        return self.now


class GatewayCase(unittest.TestCase):
    public_origin = None

    def make(self, features=None, policy=None):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.store = gateway.Store(Path(self.tmp.name) / "visitor.sqlite", mail_policy=policy)
        self.store.seed_planning_slots()
        self.server = gateway.build_server(self.store, port=0, web_origin="http://127.0.0.1:3004", features=features, public_origin=self.public_origin)
        thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(lambda: (self.server.shutdown(), self.server.server_close(), thread.join(2)))
        self.host = f"127.0.0.1:{self.server.server_port}"
        self.origin = "http://" + self.host
        status, body, headers = self.request("GET", "/api/session")
        self.assertEqual(status, 200)
        self.set_cookie = headers["Set-Cookie"]
        self.cookie, self.csrf = self.set_cookie.split(";", 1)[0], body["csrf"]
        return body

    def request(self, method, path, body=None, cookie=None, csrf=None, key="integration-key-001", origin=None, host=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        fields = {"Host": host or self.host}
        if cookie:
            fields["Cookie"] = cookie
        raw = None
        if method == "POST":
            fields.update({"Content-Type": "application/json", "Origin": origin or self.origin, "Idempotency-Key": key})
            if csrf:
                fields["X-CSRF-Token"] = csrf
            raw = json.dumps(body).encode()
        connection.request(method, path, raw, fields)
        response = connection.getresponse()
        data, headers = response.read(), dict(response.getheaders())
        connection.close()
        mime = headers.get("Content-Type", "")
        return response.status, json.loads(data) if mime.startswith("application/json") else data, headers

    def action(self, path, body, key="integration-key-001"):
        return self.request("POST", path, body, cookie=self.cookie, csrf=self.csrf, key=key)

    def jobs(self):
        with self.store.connect() as db:
            return [dict(row) for row in db.execute("SELECT * FROM mail_jobs ORDER BY created, kind")]


class SenderAndTemplates(unittest.TestCase):
    def test_sender_uses_display_name_and_only_allowed_agency_domain(self):
        env = {"RESEND_FROM": "NeX Agentic AIFly by NeXify Chat it. Automate it.", "RESEND_FROM_ADDRESS": "angebot@nexifyai.cloud"}
        self.assertEqual(tools.sender_from_env(env), '"NeX Agentic AIFly by NeXify Chat it. Automate it." <angebot@nexifyai.cloud>')
        self.assertIsNone(tools.sender_from_env({**env, "RESEND_FROM_ADDRESS": "info@deinstudienkolleg.de"}))
        self.assertIsNone(tools.sender_from_env({"RESEND_FROM": "Nur ein Name"}))
        self.assertIn("<angebot@nexifyai.cloud>", tools.sender_from_env({"RESEND_FROM": 'X"\r\nBcc: a@b.de <angebot@nexifyai.cloud>'}))
        self.assertNotIn("\n", tools.sender_from_env({"RESEND_FROM": 'X"\r\nBcc: a@b.de <angebot@nexifyai.cloud>'}))

    def test_customer_mail_contains_no_visitor_supplied_content(self):
        for locale in ("de", "nl", "fr"):
            subject, html, text = tools.render("customer_quote", locale, {"ref": "abcdef1234", "title": "<script>x</script>"})
            self.assertIn("ABCDEF12", subject)
            self.assertNotIn("script", html + text)
            self.assertNotIn("<form", html)
            self.assertNotIn("href", html)
        subject, html, _ = tools.render("customer_booking", "de", {"ref": "ff00", "name": "<b>Eva</b>", "starts": "2026-11-02T10:00:00+01:00"})
        self.assertIn("02.11.2026 10:00", subject)
        self.assertIn("&lt;b&gt;Eva&lt;/b&gt;", html)

    def test_internal_notice_escapes_visitor_content(self):
        _, html, text = tools.render("internal_quote", "de", {"ref": "r1", "title": "<img src=x>", "details": "a & b", "recipient": "k@example.com"})
        self.assertIn("&lt;img src=x&gt;", html)
        self.assertNotIn("<img", html)
        self.assertIn("a & b", text)


class ResendTransportWire(unittest.TestCase):
    def test_request_carries_idempotency_key_sender_and_reply_to(self):
        seen = {}

        def opener(req, timeout):
            seen.update(url=req.full_url, headers=dict(req.header_items()), body=json.loads(req.data), timeout=timeout)
            return FakeReply(b'{"id":"re_123"}')
        transport = tools.ResendTransport("re_test", '"NeXify AI" <angebot@nexifyai.cloud>', "mail@nexifyai.cloud", opener=opener)
        self.assertEqual(transport.send("k@example.com", "S", "<p>h</p>", "t", "nx-mail-1"), "re_123")
        self.assertEqual(seen["url"], "https://api.resend.com/emails")
        self.assertEqual(seen["headers"]["Idempotency-key"], "nx-mail-1")
        self.assertEqual(seen["headers"]["Authorization"], "Bearer re_test")
        self.assertEqual(seen["body"]["to"], ["k@example.com"])
        self.assertEqual(seen["body"]["reply_to"], "mail@nexifyai.cloud")

    def test_missing_provider_id_is_unknown_outcome(self):
        transport = tools.ResendTransport("re_test", '"N" <a@nexifyai.cloud>', opener=lambda req, timeout: FakeReply(b"{}"))
        with self.assertRaises(tools.ProviderError) as caught:
            transport.send("k@example.com", "S", "h", "t", "nx-mail-2")
        self.assertTrue(caught.exception.unknown)


class MailFlow(GatewayCase):
    def setUp(self):
        self.clock = Clock()
        self.policy = tools.MailPolicy("mail@nexifyai.cloud", daily_cap=10, per_recipient=3, per_visitor=5)
        session = self.make(SimpleNamespace(mail=self.policy, speech=None, chatgpt=None), self.policy)
        self.assertIs(session["capabilities"]["email_delivery"], True)
        self.transport = FakeTransport()
        self.dispatcher = tools.MailDispatcher(self.store, self.transport, clock=self.clock)

    def quote(self, key="quote-key-0001"):
        status, quote, _ = self.action("/api/quotes", {"title": "Website <Werkstatt>", "details": "Termine & Anfragen"}, key=key)
        self.assertEqual(status, 200)
        return quote

    def test_confirmed_quote_send_queues_customer_and_internal_mail_then_records_provider_acceptance(self):
        quote = self.quote()
        status, result, _ = self.action(f"/api/quotes/{quote['id']}/send", {"email": "kunde@example.com", "confirmed": True, "locale": "nl"}, key="send-key-0001")
        self.assertEqual(status, 200)
        self.assertEqual((result["delivery"], result["sent"]), ("queued", False))
        replay = self.action(f"/api/quotes/{quote['id']}/send", {"email": "kunde@example.com", "confirmed": True, "locale": "nl"}, key="send-key-0001")[1]
        self.assertEqual(replay, result)
        self.assertEqual(len(self.jobs()), 2)
        while self.dispatcher.run_once():
            pass
        self.assertEqual({call["to"] for call in self.transport.calls}, {"kunde@example.com", "mail@nexifyai.cloud"})
        customer = next(call for call in self.transport.calls if call["to"] == "kunde@example.com")
        self.assertIn("offerteconcept", customer["subject"])
        self.assertNotIn("Werkstatt", customer["html"])
        internal = next(call for call in self.transport.calls if call["to"] == "mail@nexifyai.cloud")
        self.assertIn("Website &lt;Werkstatt&gt;", internal["html"])
        self.assertTrue(all(job["state"] == "sent" and job["provider_id"] for job in self.jobs()))
        with self.store.connect() as db:
            self.assertEqual(db.execute("SELECT state FROM outbox").fetchone()[0], "provider_accepted")
        deliveries = self.request("GET", "/api/deliveries", cookie=self.cookie)[1]["deliveries"]
        self.assertEqual([(d["kind"], d["state"]) for d in deliveries], [("customer_quote", "sent")])
        self.assertFalse(self.dispatcher.run_once())

    def test_booking_and_marketing_notify_internally(self):
        slots = self.request("GET", "/api/slots", cookie=self.cookie)[1]["slots"]
        status, booking, _ = self.action("/api/bookings", {"slot_id": slots[0]["id"], "name": "Eva", "email": "eva@example.com"}, key="book-key-0001")
        self.assertEqual((status, booking["delivery"]), (200, "queued"))
        self.action("/api/marketing", {"goal": "Mehr Anfragen", "audience": "Werkstätten"}, key="market-key-01")
        self.assertEqual(sorted(job["kind"] for job in self.jobs()), ["customer_booking", "internal_booking", "internal_marketing"])

    def test_recipient_limit_blocks_without_sending(self):
        for index in range(4):
            quote = self.quote(key=f"quote-key-{index:04d}")
            result = self.action(f"/api/quotes/{quote['id']}/send", {"email": "Ziel@Example.com" if index % 2 else "ziel@example.com", "confirmed": True}, key=f"send-key-{index:04d}")[1]
        self.assertEqual(result["delivery"], "blocked_limit")
        while self.dispatcher.run_once():
            pass
        self.assertEqual(sum(call["to"].lower() == "ziel@example.com" for call in self.transport.calls), 3)

    def test_unknown_outcome_retries_with_same_key_and_expires_to_review(self):
        self.transport.errors = [tools.ProviderError("provider_unreachable", retryable=True, unknown=True)]
        self.action("/api/marketing", {"goal": "Ziel", "audience": "Alle"}, key="market-key-02")
        self.assertTrue(self.dispatcher.run_once())
        job = self.jobs()[0]
        self.assertEqual((job["state"], job["last_error"]), ("retry_wait", "provider_unreachable"))
        self.clock.now += 60
        self.assertTrue(self.dispatcher.run_once())
        self.assertEqual(self.transport.calls[0]["key"], self.transport.calls[1]["key"])
        self.assertEqual(self.jobs()[0]["state"], "sent")

    def test_lapsed_lease_and_expired_idempotency_window_never_resend_blindly(self):
        self.action("/api/marketing", {"goal": "Ziel", "audience": "Alle"}, key="market-key-03")
        self.assertIsNotNone(self.dispatcher._claim())  # simulated crash after claim
        self.clock.now += 24 * 3600
        self.assertFalse(self.dispatcher.run_once())
        self.assertEqual(self.jobs()[0]["state"], "unknown_outcome_review")
        self.assertEqual(self.transport.calls, [])

    def test_permanent_provider_error_is_not_retried(self):
        self.transport.errors = [tools.ProviderError("provider_http_422")]
        self.action("/api/marketing", {"goal": "Ziel", "audience": "Alle"}, key="market-key-04")
        self.dispatcher.run_once()
        self.clock.now += 3600
        self.assertFalse(self.dispatcher.run_once())
        self.assertEqual((self.jobs()[0]["state"], len(self.transport.calls)), ("failed_permanent", 1))


class DisabledByDefault(GatewayCase):
    def test_without_adapters_nothing_is_queued_and_endpoints_stay_closed(self):
        session = self.make()
        for name in ("email_delivery", "speech_readout", "chatgpt_option"):
            self.assertIs(session["capabilities"][name], False)
        quote = self.action("/api/quotes", {"title": "T", "details": "D"})[1]
        result = self.action(f"/api/quotes/{quote['id']}/send", {"email": "k@example.com", "confirmed": True}, key="send-key-0009")[1]
        self.assertEqual((result["state"], result["sent"]), ("pending_provider", False))
        self.assertNotIn("delivery", result)
        self.assertEqual(self.jobs(), [])
        self.assertEqual(self.request("GET", "/api/speech/welcome", cookie=self.cookie)[0], 503)
        self.assertEqual(self.action("/api/assistant/chatgpt", {"message": "Hallo"}, key="chat-key-0001")[0], 503)


class Speech(GatewayCase):
    def test_fixed_texts_cover_all_locales_and_audio_is_cached(self):
        texts = tools.speech_texts()
        self.assertEqual(len(texts), 15)
        calls = []

        def opener(req, timeout):
            calls.append(json.loads(req.data)["text"])
            return FakeReply(b"ID3" + b"\0" * 1024, content_type="audio/mpeg")
        speech = tools.SpeechService("xi_test", "FTNCalFNG5bRnkkaP5Ug", Path(tempfile.mkdtemp()), texts=texts, opener=opener, daily_cap=2)
        self.make(SimpleNamespace(mail=None, speech=speech, chatgpt=None))
        status, audio, headers = self.request("GET", "/api/speech/quoteReply?locale=fr", cookie=self.cookie)
        self.assertEqual((status, headers["Content-Type"]), (200, "audio/mpeg"))
        self.assertEqual(self.request("GET", "/api/speech/quoteReply?locale=fr", cookie=self.cookie)[2]["Content-Type"], "audio/mpeg")
        self.assertEqual(calls, [texts[("quoteReply", "fr")]])
        self.assertEqual(self.request("GET", "/api/speech/details?locale=de", cookie=self.cookie)[0], 404)
        self.assertEqual(self.request("GET", "/api/speech/welcome")[0], 401)
        self.request("GET", "/api/speech/welcome?locale=de", cookie=self.cookie)
        self.assertEqual(self.request("GET", "/api/speech/choose?locale=de", cookie=self.cookie)[1]["error"], "speech_daily_cap_reached")


class ChatGPT(GatewayCase):
    def setUp(self):
        self.prompts = []

        def complete(messages):
            self.prompts.append(messages)
            return "Antwort"
        option = tools.ChatGPTOption(complete, "gpt-5.4", "fake", per_visitor=2, daily_cap=5)
        self.option = option
        session = self.make(SimpleNamespace(mail=None, speech=None, chatgpt=option))
        self.assertIs(session["capabilities"]["chatgpt_option"], True)

    def test_labelled_reply_limits_and_csrf(self):
        status, reply, _ = self.action("/api/assistant/chatgpt", {"message": "Was macht NeXify?", "locale": "de"}, key="chat-key-0001")
        self.assertEqual((status, reply["text"], reply["ai_generated"]), (200, "Antwort", True))
        self.assertIn("nicht das NeXify-Standardmodell", reply["label"])
        self.assertIn("Nenne keine Preise", self.prompts[0][0]["content"])
        self.action("/api/assistant/chatgpt", {"message": "Und weiter?"}, key="chat-key-0002")
        self.assertEqual([m["role"] for m in self.prompts[1]], ["system", "user", "assistant", "user"])
        self.assertEqual(self.action("/api/assistant/chatgpt", {"message": "Drei"}, key="chat-key-0003")[0], 429)
        self.assertEqual(self.request("POST", "/api/assistant/chatgpt", {"message": "x"}, cookie=self.cookie, key="chat-key-0004")[0], 403)
        self.assertEqual(self.action("/api/assistant/chatgpt", {"message": "x", "model": "other"}, key="chat-key-0005")[0], 422)
        history = self.request("GET", "/api/session", cookie=self.cookie)[1]["history"]
        self.assertEqual(history, [])  # ChatGPT turns stay separate from the NeXify structured history

    def test_replay_is_cached_and_different_payload_conflicts_before_provider(self):
        body = {"message": "Was macht NeXify?", "locale": "de"}
        first = self.action("/api/assistant/chatgpt", body, key="chat-replay-0001")
        replay = self.action("/api/assistant/chatgpt", body, key="chat-replay-0001")
        self.assertEqual(first[:2], replay[:2])
        self.assertEqual(first[0], 200)
        self.assertEqual(len(self.prompts), 1)
        with self.store.connect() as db:
            receipt = db.execute("SELECT owner,payload_hash,response FROM receipts WHERE operation=? AND key=?",
                                 ("provider_chatgpt", "chat-replay-0001")).fetchone()
        self.assertNotIn(first[1]["text"], receipt["response"])
        self.assertEqual(set(json.loads(receipt["response"])), {"message_id", "message_sha256", "model", "route"})
        reopened = gateway.Store(self.store.path)
        after_restart = self.option.reply(reopened, receipt["owner"], body["message"], "de", "chat-replay-0001", receipt["payload_hash"])
        self.assertEqual(after_restart, first[1])
        self.assertEqual(len(self.prompts), 1)
        conflict = self.action("/api/assistant/chatgpt", {"message": "Andere Frage", "locale": "de"}, key="chat-replay-0001")
        self.assertEqual((conflict[0], conflict[1]["error"]), (409, "idempotency_conflict"))
        self.assertEqual(len(self.prompts), 1)
        self.assertEqual(self.action("/api/assistant/chatgpt", body, key="short")[0], 422)

    def test_concurrent_duplicate_is_not_dispatched_twice(self):
        started, release = threading.Event(), threading.Event()
        def slow(messages):
            self.prompts.append(messages)
            started.set()
            if not release.wait(3): raise RuntimeError("fixture timeout")
            return "Antwort"
        self.option.complete = slow
        body = {"message": "Gleichzeitige Anfrage"}
        first = []
        thread = threading.Thread(target=lambda: first.append(self.action("/api/assistant/chatgpt", body, key="chat-concurrent-01")))
        thread.start()
        try:
            self.assertTrue(started.wait(3))
            duplicate = self.action("/api/assistant/chatgpt", body, key="chat-concurrent-01")
            self.assertEqual((duplicate[0], duplicate[1]["error"]), (409, "chatgpt_request_pending_or_unknown"))
            conflict = self.action("/api/assistant/chatgpt", {"message": "Andere Anfrage"}, key="chat-concurrent-01")
            self.assertEqual((conflict[0], conflict[1]["error"]), (409, "idempotency_conflict"))
        finally:
            release.set(); thread.join(4)
        self.assertFalse(thread.is_alive())
        self.assertEqual(first[0][0], 200)
        self.assertEqual(len(self.prompts), 1)

    def test_provider_failure_keeps_unknown_receipt_and_does_not_retry(self):
        calls = []
        def fail(messages):
            calls.append(messages)
            raise tools.ProviderError("fixture_failed", unknown=True)
        self.option.complete = fail
        body = {"message": "Fehlerfall"}
        self.assertEqual(self.action("/api/assistant/chatgpt", body, key="chat-unknown-0001")[0], 502)
        replay = self.action("/api/assistant/chatgpt", body, key="chat-unknown-0001")
        self.assertEqual((replay[0], replay[1]["error"]), (409, "chatgpt_request_pending_or_unknown"))
        with self.store.connect() as db:
            receipt = db.execute("SELECT owner,payload_hash FROM receipts WHERE operation=? AND key=?",
                                 ("provider_chatgpt", "chat-unknown-0001")).fetchone()
        reopened = gateway.Store(self.store.path)
        with self.assertRaisesRegex(tools.ProviderError, "chatgpt_request_pending_or_unknown"):
            self.option.reply(reopened, receipt["owner"], body["message"], "de", "chat-unknown-0001", receipt["payload_hash"])
        self.assertEqual(len(calls), 1)

    def test_same_key_in_separate_sessions_does_not_replay_another_visitor(self):
        body = {"message": "Projekt"}
        self.assertEqual(self.action("/api/assistant/chatgpt", body, key="chat-per-owner-01")[0], 200)
        _, session, headers = self.request("GET", "/api/session")
        cookie = headers["Set-Cookie"].split(";", 1)[0]
        second = self.request("POST", "/api/assistant/chatgpt", body, cookie=cookie, csrf=session["csrf"], key="chat-per-owner-01")
        self.assertEqual(second[0], 200)
        self.assertEqual(len(self.prompts), 2)
        self.assertEqual([m["role"] for m in self.prompts[1]], ["system", "user"])
        # Even a corrupted reference to another owner's message is rejected.
        with self.store.connect() as db:
            rows = db.execute("SELECT owner,response FROM receipts WHERE operation=? AND key=? ORDER BY rowid",
                              ("provider_chatgpt", "chat-per-owner-01")).fetchall()
            first_receipt, second_receipt = json.loads(rows[0]["response"]), json.loads(rows[1]["response"])
            first_receipt["message_id"] = second_receipt["message_id"]
            db.execute("UPDATE receipts SET response=? WHERE owner=? AND operation=? AND key=?",
                       (json.dumps(first_receipt), rows[0]["owner"], "provider_chatgpt", "chat-per-owner-01"))
        replay = self.action("/api/assistant/chatgpt", body, key="chat-per-owner-01")
        self.assertEqual((replay[0], replay[1]["error"]), (409, "chatgpt_request_pending_or_unknown"))
        self.assertEqual(len(self.prompts), 2)

    def test_missing_assistant_message_fails_closed_without_provider_retry(self):
        body = {"message": "Meine Frage"}
        self.assertEqual(self.action("/api/assistant/chatgpt", body, key="chat-missing-0001")[0], 200)
        with self.store.connect() as db:
            receipt = db.execute("SELECT owner,response FROM receipts WHERE operation=? AND key=?",
                                 ("provider_chatgpt", "chat-missing-0001")).fetchone()
            message_id = json.loads(receipt["response"])["message_id"]
            db.execute("DELETE FROM chatgpt_messages WHERE id=? AND owner=?", (message_id, receipt["owner"]))
        replay = self.action("/api/assistant/chatgpt", body, key="chat-missing-0001")
        self.assertEqual((replay[0], replay[1]["error"]), (409, "chatgpt_request_pending_or_unknown"))
        self.assertEqual(len(self.prompts), 1)

    def test_replaced_same_owner_message_fails_closed_without_provider_retry(self):
        body = {"message": "Meine Frage"}
        self.assertEqual(self.action("/api/assistant/chatgpt", body, key="chat-replaced-0001")[0], 200)
        with self.store.connect() as db:
            receipt = db.execute("SELECT owner,response FROM receipts WHERE operation=? AND key=?",
                                 ("provider_chatgpt", "chat-replaced-0001")).fetchone()
            message_id = json.loads(receipt["response"])["message_id"]
            db.execute("UPDATE chatgpt_messages SET body=? WHERE id=? AND owner=?", ("Anderer Inhalt", message_id, receipt["owner"]))
        replay = self.action("/api/assistant/chatgpt", body, key="chat-replaced-0001")
        self.assertEqual((replay[0], replay[1]["error"]), (409, "chatgpt_request_pending_or_unknown"))
        self.assertEqual(len(self.prompts), 1)


class ProviderPages(GatewayCase):
    def test_paid_options_only_on_listed_pages(self):
        option = tools.ChatGPTOption(lambda messages: "Antwort", "gpt-5.4", "fake")
        speech = tools.SpeechService("xi_test", "FTNCalFNG5bRnkkaP5Ug", Path(tempfile.mkdtemp()),
                                     texts={("welcome", "de"): "Hallo"}, opener=lambda req, timeout: FakeReply(b"ID3" + b"\0" * 1024, content_type="audio/mpeg"))
        self.make(SimpleNamespace(mail=None, speech=speech, chatgpt=option, provider_pages={"/"}))
        self.assertEqual(self.action("/api/assistant/chatgpt", {"message": "Hi", "page_path": "/leistungen"}, key="chat-key-0101")[0], 403)
        self.assertEqual(self.action("/api/assistant/chatgpt", {"message": "Hi", "page_path": "/"}, key="chat-key-0102")[0], 200)
        self.assertEqual(self.request("GET", "/api/speech/welcome?locale=de&page=/kontakt", cookie=self.cookie)[0], 403)
        self.assertEqual(self.request("GET", "/api/speech/welcome?locale=de&page=/", cookie=self.cookie)[0], 200)


class PublicOrigin(GatewayCase):
    public_origin = "https://preview.example.com"

    def test_explicit_https_origin_sets_secure_cookie_and_accepts_only_that_origin(self):
        self.make()
        self.assertIn("Secure", self.set_cookie)
        ok = self.request("POST", "/api/quotes", {"title": "T", "details": "D"}, cookie=self.cookie, csrf=self.csrf,
                          origin="https://preview.example.com", host="preview.example.com")
        self.assertEqual(ok[0], 200)
        bad = self.request("POST", "/api/quotes", {"title": "T", "details": "D"}, cookie=self.cookie, csrf=self.csrf,
                           origin="https://evil.example.com", host="preview.example.com", key="integration-key-002")
        self.assertEqual(bad[0], 403)
        self.assertEqual(self.request("GET", "/api/session", host="evil.example.com")[0], 403)
        for invalid in ("http://preview.example.com", "https://preview.example.com/path", "https://u@preview.example.com"):
            with self.assertRaises(ValueError):
                gateway.build_server(self.store, port=0, public_origin=invalid)


if __name__ == "__main__":
    unittest.main()

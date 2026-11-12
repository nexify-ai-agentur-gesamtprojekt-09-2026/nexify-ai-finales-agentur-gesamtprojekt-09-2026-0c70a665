import datetime as dt
import http.client
import io
import json
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

from tools import workspace_agent_relay as relay


TENANT = "nexifyai-platform"
EVENT = "ORACLE-RELAY-E2E-20261112-01"
TOKEN = "test-token-never-persist"


class FakeResponse(io.BytesIO):
    def __init__(self, status, payload):
        super().__init__(json.dumps(payload).encode())
        self.status = status
    def __enter__(self): return self
    def __exit__(self, *args): self.close()


class FakeOpener:
    def __init__(self, responses): self.responses = list(responses); self.requests = []
    def open(self, request, timeout):
        self.requests.append((request, timeout))
        value = self.responses.pop(0)
        if isinstance(value, BaseException): raise value
        return value


class RelayTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "transport.json"
        self.journal = relay.Journal(self.path)
        future = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=1)).isoformat()
        self.spec = relay.EventSpec(EVENT, TENANT, "harmloser Korrelationstest", relay.EXPECTED_AGENT_ID,
            relay.EXPECTED_TRIGGER_ID, "aifly-relay", "lease-20261112-001", future,
            "authorised-chat-readback", "oracle-relay-20261112", f"Bestaetige {EVENT}; keine Apps oder Aenderungen.")
    def tearDown(self): self.tmp.cleanup()
    def prepare(self, spec=None): return relay.prepare(self.journal, spec or self.spec, allowed_tenant=TENANT)
    def accepted(self):
        self.prepare()
        opener = FakeOpener([FakeResponse(202, {"conversation_url":"https://chatgpt.com/c/test", "agent_trigger_run_id":"apirun_test"})])
        return relay.send(self.journal, EVENT, allowed_tenant=TENANT, writer=self.spec.writer,
            writer_lease=self.spec.writer_lease, env={relay.TOKEN_ENV:TOKEN}, opener=opener), opener

    def test_prepare_records_required_contract_and_mode_600(self):
        event = self.prepare()
        self.assertEqual(event["state"], "prepared")
        self.assertEqual(event["idempotency_key"], EVENT)
        self.assertEqual(self.path.stat().st_mode & 0o777, 0o600)
        self.assertNotIn(TOKEN, self.path.read_text())

    def test_duplicate_same_event_is_idempotent_across_restart(self):
        first = self.prepare()
        second = relay.prepare(relay.Journal(self.path), self.spec, allowed_tenant=TENANT)
        self.assertEqual(first["created_at"], second["created_at"])
        self.assertEqual(len(second["history"]), 1)

    def test_duplicate_changed_content_is_rejected(self):
        self.prepare()
        changed = relay.EventSpec(**{**self.spec.__dict__, "purpose":"anderer Zweck"})
        with self.assertRaises(relay.StateConflict): relay.prepare(self.journal, changed, allowed_tenant=TENANT)

    def test_wrong_tenant_agent_and_channel_are_rejected(self):
        for field, value in (("tenant","other"), ("target_agent_id","agt_wrong"), ("trigger_id","agtch_wrong")):
            spec = relay.EventSpec(**{**self.spec.__dict__, field:value})
            with self.subTest(field=field), self.assertRaises(relay.ValidationError):
                relay.prepare(relay.Journal(Path(self.tmp.name)/field), spec, allowed_tenant=TENANT)

    def test_input_without_event_id_is_rejected(self):
        spec = relay.EventSpec(**{**self.spec.__dict__, "input_text":"keine Korrelation"})
        with self.assertRaises(relay.ValidationError):
            relay.prepare(self.journal, spec, allowed_tenant=TENANT)

    def test_missing_token_rejected_without_state_change(self):
        self.prepare()
        with self.assertRaises(relay.ValidationError): relay.send(self.journal, EVENT, allowed_tenant=TENANT,
            writer=self.spec.writer, writer_lease=self.spec.writer_lease, env={})
        self.assertEqual(relay.event_view(self.journal, EVENT)["state"], "prepared")

    def test_send_has_fixed_host_headers_and_beta_run_id(self):
        event, opener = self.accepted()
        request, timeout = opener.requests[0]
        self.assertEqual(request.full_url, f"https://api.chatgpt.com/v1/workspace_agents/{relay.EXPECTED_TRIGGER_ID}/trigger")
        self.assertEqual(request.get_header("Idempotency-key"), EVENT)
        self.assertEqual(request.get_header("Openai-beta"), "workspace_agent_runs=v1")
        self.assertEqual(event["state"], "accepted")
        self.assertEqual(event["run_id"], "apirun_test")
        self.assertNotIn(TOKEN, self.path.read_text())

    def test_bad_conversation_host_makes_outcome_unclear(self):
        self.prepare()
        opener = FakeOpener([FakeResponse(202, {"conversation_url":"https://evil.example/c/x", "agent_trigger_run_id":"apirun_x"})])
        with self.assertRaises(relay.ValidationError): relay.send(self.journal, EVENT, allowed_tenant=TENANT,
            writer=self.spec.writer, writer_lease=self.spec.writer_lease, env={relay.TOKEN_ENV:TOKEN}, opener=opener)
        self.assertEqual(relay.event_view(self.journal, EVENT)["state"], "unclear")

    def test_timeout_is_unclear_and_not_automatically_retried(self):
        self.prepare()
        opener = FakeOpener([urllib.error.URLError(TimeoutError())])
        with self.assertRaises(relay.TransportError): relay.send(self.journal, EVENT, allowed_tenant=TENANT,
            writer=self.spec.writer, writer_lease=self.spec.writer_lease, env={relay.TOKEN_ENV:TOKEN}, opener=opener)
        self.assertEqual(relay.event_view(self.journal, EVENT)["state"], "unclear")
        with self.assertRaises(relay.StateConflict): relay.send(self.journal, EVENT, allowed_tenant=TENANT,
            writer=self.spec.writer, writer_lease=self.spec.writer_lease, env={relay.TOKEN_ENV:TOKEN}, opener=FakeOpener([]))

    def test_incomplete_or_reset_response_is_unclear(self):
        for error in (http.client.IncompleteRead(b"partial"), ConnectionResetError("reset")):
            path = Path(self.tmp.name) / f"transport-{type(error).__name__}.json"
            journal = relay.Journal(path)
            relay.prepare(journal, self.spec, allowed_tenant=TENANT)
            with self.subTest(error=type(error).__name__), self.assertRaises(relay.TransportError):
                relay.send(journal, EVENT, allowed_tenant=TENANT, writer=self.spec.writer,
                    writer_lease=self.spec.writer_lease, env={relay.TOKEN_ENV:TOKEN}, opener=FakeOpener([error]))
            self.assertEqual(relay.event_view(journal, EVENT)["state"], "unclear")

    def test_expected_http_failures_are_failed(self):
        for status in (401, 403, 404, 409):
            path = Path(self.tmp.name) / f"j{status}.json"; journal = relay.Journal(path)
            relay.prepare(journal, self.spec, allowed_tenant=TENANT)
            error = urllib.error.HTTPError("https://api.chatgpt.com", status, "x", {}, None)
            with self.subTest(status=status), self.assertRaises(relay.TransportError):
                relay.send(journal, EVENT, allowed_tenant=TENANT, writer=self.spec.writer,
                    writer_lease=self.spec.writer_lease, env={relay.TOKEN_ENV:TOKEN}, opener=FakeOpener([error]))
            self.assertEqual(relay.event_view(journal, EVENT)["state"], "failed")

    def test_poll_binds_agent_channel_run_and_states(self):
        event, _ = self.accepted()
        for remote, local in (("in_progress","running"),("suspended","running"),("completed","completed")):
            payload={"id":"apirun_test","agent_id":relay.EXPECTED_AGENT_ID,"api_trigger_id":relay.EXPECTED_TRIGGER_ID,"status":remote,"error":None}
            event=relay.poll(self.journal, EVENT, env={relay.TOKEN_ENV:TOKEN}, opener=FakeOpener([FakeResponse(200,payload)]))
            self.assertEqual(event["state"], local)
            self.assertEqual(event["remote_status"], remote)

    def test_poll_rejects_wrong_agent_channel_or_run(self):
        self.accepted()
        base={"id":"apirun_test","agent_id":relay.EXPECTED_AGENT_ID,"api_trigger_id":relay.EXPECTED_TRIGGER_ID,"status":"completed"}
        for key,value in (("id","apirun_other"),("agent_id","agt_other"),("api_trigger_id","agtch_other")):
            with self.subTest(key=key), self.assertRaises(relay.TransportError):
                relay.poll(self.journal, EVENT, env={relay.TOKEN_ENV:TOKEN}, opener=FakeOpener([FakeResponse(200,{**base,key:value})]))

    def test_completed_without_result_is_not_done(self):
        self.accepted()
        payload={"id":"apirun_test","agent_id":relay.EXPECTED_AGENT_ID,"api_trigger_id":relay.EXPECTED_TRIGGER_ID,"status":"completed"}
        event=relay.poll(self.journal, EVENT, env={relay.TOKEN_ENV:TOKEN}, opener=FakeOpener([FakeResponse(200,payload)]))
        self.assertEqual(event["state"], "completed")
        self.assertIsNone(event["result"])

    def test_wrong_result_remains_unverified_and_correct_result_verifies(self):
        self.accepted()
        self.journal.mutate(EVENT, lambda event: relay._transition(event, "completed", remote_status="completed"))
        event=relay.verify_result(self.journal, EVENT, b"andere Antwort", expected_test_id=EVENT)
        self.assertEqual(event["state"], "result_received")
        event=relay.verify_result(self.journal, EVENT, f"ACK {EVENT}".encode(), expected_test_id=EVENT)
        self.assertEqual(event["state"], "result_verified")
        self.assertTrue(event["result"]["matched"])
        self.assertNotIn("ACK", self.path.read_text())

    def test_poll_completed_preserves_verified_result(self):
        self.accepted()
        self.journal.mutate(EVENT, lambda event: relay._transition(event, "completed", remote_status="completed"))
        relay.verify_result(self.journal, EVENT, f"ACK {EVENT}".encode(), expected_test_id=EVENT)
        payload={"id":"apirun_test","agent_id":relay.EXPECTED_AGENT_ID,
            "api_trigger_id":relay.EXPECTED_TRIGGER_ID,"status":"completed","error":None}
        event=relay.poll(self.journal, EVENT, env={relay.TOKEN_ENV:TOKEN}, opener=FakeOpener([FakeResponse(200,payload)]))
        self.assertEqual(event["state"], "result_verified")
        self.assertTrue(event["result"]["matched"])

    def test_result_before_completed_is_rejected(self):
        self.prepare()
        with self.assertRaises(relay.StateConflict): relay.verify_result(self.journal, EVENT, EVENT.encode(), expected_test_id=EVENT)

    def test_response_and_result_size_limits(self):
        self.prepare()
        huge = b"{" + b"x" * (relay.MAX_RESPONSE_BYTES + 1)
        response = FakeResponse(202, {}); response.write(huge); response.seek(0)
        with self.assertRaises(relay.TransportError): relay.send(self.journal, EVENT, allowed_tenant=TENANT,
            writer=self.spec.writer, writer_lease=self.spec.writer_lease, env={relay.TOKEN_ENV:TOKEN}, opener=FakeOpener([response]))
        self.journal.mutate(EVENT, lambda event: relay._transition(event, "completed"))
        with self.assertRaises(relay.ValidationError): relay.verify_result(self.journal, EVENT, b"x"*(relay.MAX_RESPONSE_BYTES+1), expected_test_id=EVENT)

    def test_redirect_handler_rejects_redirect(self):
        with self.assertRaises(relay.TransportError): relay.NoRedirect().redirect_request(None,None,302,"x",{},"https://evil.example")

    def test_url_validation_rejects_userinfo_port_and_wrong_path(self):
        for url in ("https://x@api.chatgpt.com/p", "https://api.chatgpt.com:444/p", "http://api.chatgpt.com/p", "https://api.chatgpt.com/other"):
            with self.subTest(url=url), self.assertRaises(relay.ValidationError): relay.validate_https_url(url, host=relay.API_HOST, path="/p")

    def test_no_secret_in_error_or_journal(self):
        self.prepare()
        error = urllib.error.URLError(f"network failed {TOKEN}")
        with self.assertRaises(relay.TransportError) as caught: relay.send(self.journal, EVENT, allowed_tenant=TENANT,
            writer=self.spec.writer, writer_lease=self.spec.writer_lease, env={relay.TOKEN_ENV:TOKEN}, opener=FakeOpener([error]))
        self.assertNotIn(TOKEN, str(caught.exception))
        self.assertNotIn(TOKEN, self.path.read_text())

    def test_active_writer_lease_mismatch_rejected_before_network(self):
        self.prepare()
        opener = FakeOpener([])
        with self.assertRaises(relay.StateConflict):
            relay.send(self.journal, EVENT, allowed_tenant=TENANT, writer="other-writer",
                writer_lease=self.spec.writer_lease, env={relay.TOKEN_ENV:TOKEN}, opener=opener)
        self.assertEqual(opener.requests, [])
        self.assertEqual(relay.event_view(self.journal, EVENT)["state"], "prepared")


if __name__ == "__main__": unittest.main()

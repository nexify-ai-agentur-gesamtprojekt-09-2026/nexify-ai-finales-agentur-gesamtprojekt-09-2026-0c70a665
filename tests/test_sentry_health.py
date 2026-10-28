"""Offline response fixtures; no real token, Sentry event or network request."""
import importlib.util
import io
import json
import unittest
from contextlib import redirect_stdout
from email.message import Message
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError

SPEC = importlib.util.spec_from_file_location(
    "sentry_health", Path(__file__).resolve().parents[1] / "scripts/sentry_health.py")
health = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(health)
PROJECT = health.PROJECTS[0]


def issue(**overrides):
    return {"id": "42", "status": "unresolved",
            "project": {"slug": PROJECT.split("/")[1]}, **overrides}


class Response(io.BytesIO):
    status = 200

    def __init__(self, body, headers=None):
        super().__init__(body)
        self.headers = Message()
        self.headers["Content-Type"] = "application/json"
        for key, value in (headers or {}).items():
            self.headers[key] = value


class Opener:
    def __init__(self, response):
        self.response = response
        self.calls = []

    def open(self, request, timeout):
        self.calls.append((request, timeout))
        if isinstance(self.response, Exception):
            raise self.response
        return self.response


class SentrySampleTests(unittest.TestCase):
    def collect(self, value, headers=None):
        return health.collect(PROJECT, "synthetic-fixture", Opener(Response(
            json.dumps(value).encode(), headers)))

    def test_empty_does_not_prove_absence_or_browser_capture(self):
        result = self.collect([])
        self.assertEqual(result["status"], "partial")
        self.assertEqual(result["unresolved_lower_bound"], 0)
        self.assertIsNone(result["total"])
        self.assertFalse(result["complete"])
        self.assertEqual(result["response_project_identity"], "request_only")
        self.assertEqual(result["browser_exception_capture"], "not_evaluated")

    def test_single_and_multiple_pages_are_only_a_lower_bound(self):
        for pagination in (None, '<https://example.invalid/next>; rel="next"; results="true"',
                           '<https://example.invalid/next>; rel="next"; results="false"'):
            opener = Opener(Response(json.dumps([issue()]).encode(), {"Link": pagination} if pagination else {}))
            result = health.collect(PROJECT, "synthetic-fixture", opener)
            self.assertEqual(len(opener.calls), 1)  # Never follow untrusted Link URLs.
            self.assertEqual(result["sample_size"], 1)
            self.assertEqual(result["unresolved_lower_bound"], 1)
            self.assertIsNone(result["total"])
            self.assertFalse(result["complete"])

    def test_unexpected_multi_item_page_is_not_a_total(self):
        result = self.collect([issue(), issue(id="43")])
        self.assertEqual(result["reason"], "invalid_sample_shape")
        self.assertIsNone(result["unresolved_lower_bound"])

    def test_source_time_and_query_are_explicit_not_event_window(self):
        result = self.collect([issue()])
        self.assertEqual(result["requested_project"], PROJECT)
        self.assertTrue(result["source"].startswith(health.BASE + "/" + PROJECT + "/issues/?"))
        self.assertEqual(result["query"], {"query": "is:unresolved", "statsPeriod": "24h", "limit": "1"})
        self.assertEqual(result["issue_time_window"], "not_filtered_by_statsPeriod")
        self.assertTrue(result["observed_at"].endswith("+00:00"))

    def test_non_identifying_foreign_and_wrong_status_fail_closed(self):
        for value in ({}, [None], [{"id": "42"}], [issue(project={"slug": "foreign"})],
                      [issue(id=None)], [issue(id=42)], [issue(status="resolved")]):
            with self.subTest(value=value):
                result = self.collect(value)
                self.assertEqual(result["status"], "unavailable")
                self.assertIsNone(result["total"])
                self.assertIsNone(result["unresolved_lower_bound"])

    def test_malformed_cutoff_oversized_and_encoding(self):
        for body, headers in ((b'[{', {}), (b'\xff', {}),
                              (b'[]', {"Content-Length": "50"}),
                              (b'[]', {"Content-Length": "unknown"}),
                              (b'[]', {"Content-Length": str(health.MAX_BYTES + 1)}),
                              (b' ' * (health.MAX_BYTES + 1), {}),
                              (b'[]', {"Content-Encoding": "gzip"})):
            result = health.collect(PROJECT, "synthetic-fixture", Opener(Response(body, headers)))
            self.assertEqual(result["status"], "unavailable")
            self.assertIsNone(result["unresolved_lower_bound"])

    def test_errors_do_not_log_raw_bodies_or_token_and_have_no_retry(self):
        for error in (HTTPError("https://example.invalid", 403, "private body", {}, io.BytesIO(b"private body")),
                      URLError("private body"), TimeoutError("private body")):
            opener = Opener(error)
            result = health.collect(PROJECT, "synthetic-fixture", opener)
            self.assertEqual(len(opener.calls), 1)
            self.assertEqual(result["status"], "unavailable")
            self.assertNotIn("private body", json.dumps(result))
            self.assertNotIn("synthetic-fixture", json.dumps(result))

    def test_synthetic_health_issue_is_not_browser_acceptance_and_pii_is_omitted(self):
        result = self.collect([issue(title="AIFLY operational probe", user={"email": "fixture@example.invalid"},
                                     release="synthetic-health", metadata={"value": "private body"})])
        self.assertEqual(result["synthetic_vs_real_events"], "not_evaluated")
        for forbidden in ("fixture@", "private body", "operational probe", "synthetic-health"):
            self.assertNotIn(forbidden, json.dumps(result))

    def test_unknown_project_and_redirect_are_not_followed(self):
        with self.assertRaises(ValueError):
            health.collect("other/project", "synthetic-fixture", Opener(Response(b'[]')))
        self.assertIsNone(health.NoRedirect().redirect_request(None, None, 302, "", {}, "https://example.invalid"))

    def test_cli_missing_token_fails_and_sample_success_is_not_a_health_claim(self):
        with patch.dict(health.os.environ, {}, clear=True), redirect_stdout(io.StringIO()) as out:
            self.assertEqual(health.main(), 1)
        self.assertNotIn("OK", out.getvalue())
        self.assertFalse(json.loads(out.getvalue())["complete"])
        self.assertIsNone(json.loads(out.getvalue())["total"])
        self.assertIsNone(json.loads(out.getvalue())["unresolved_lower_bound"])
        with patch.dict(health.os.environ, {"SENTRY_AUTH_TOKEN": "synthetic\nfixture"}, clear=True), \
                patch.object(health, "collect") as collect, redirect_stdout(io.StringIO()) as out:
            self.assertEqual(health.main(), 1)
            collect.assert_not_called()
        self.assertFalse(json.loads(out.getvalue())["complete"])
        with patch.dict(health.os.environ, {"SENTRY_AUTH_TOKEN": "synthetic-fixture"}, clear=True), \
                patch.object(health, "collect", side_effect=lambda project, token: {"status": "partial", "complete": False}) as collect, \
                redirect_stdout(io.StringIO()) as out:
            self.assertEqual(health.main(), 0)
        self.assertEqual(collect.call_count, 2)
        self.assertTrue(all(not json.loads(line)["complete"] for line in out.getvalue().splitlines()))


if __name__ == "__main__":
    unittest.main()

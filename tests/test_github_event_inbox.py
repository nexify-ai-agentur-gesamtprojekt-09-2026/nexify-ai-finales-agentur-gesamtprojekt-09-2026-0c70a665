import hashlib
import hmac
import json
import sqlite3
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
import importlib.util

SPEC = importlib.util.spec_from_file_location(
    "inbox", Path(__file__).resolve().parents[1] / "tools/github_event_inbox.py")
inbox = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(inbox)
REPO = "nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026"
SECRET = "s" * 32
URL = "https://hooks.slack.com/services/TEST/TEST/TEST"
NOW = datetime(2026, 9, 30, tzinfo=timezone.utc).timestamp()


def event(delivery, updated="2026-09-30T00:00:00Z", action="opened", kind="issues",
          repository=REPO):
    raw = json.dumps({
        "action": action, "repository": {"full_name": repository},
        "issue" if kind == "issues" else "pull_request":
            {"number": 42, "updated_at": updated, "title": "untrusted @here"},
    }).encode()
    return ({
        "X-GitHub-Delivery": delivery,
        "X-GitHub-Event": kind,
        "X-Hub-Signature-256": "sha256=" + hmac.new(
            SECRET.encode(), raw, hashlib.sha256).hexdigest(),
    }, raw)


def gitlab_event(delivery, updated="2026-09-30T00:00:00Z", action="open", kind="issues"):
    raw = json.dumps({
        "object_kind": "issue" if kind == "issues" else "merge_request",
        "project": {"path_with_namespace": REPO},
        "object_attributes": {"iid": 42, "updated_at": updated, "action": action},
    }).encode()
    return ({
        "X-Gitlab-Event": "Issue Hook" if kind == "issues" else "Merge Request Hook",
        "X-Gitlab-Event-UUID": delivery,
        "X-Gitlab-Token": SECRET,
    }, raw)


class InboxTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = str(Path(self.directory.name) / "inbox.db")
        self.db = inbox.connect(self.path)
        self.addCleanup(self.db.close)

    def receive(self, delivery, **kwargs):
        return inbox.receive(self.db, *event(delivery, **kwargs), SECRET, REPO, NOW)

    def test_invalid_signature_does_not_write(self):
        headers, raw = event("00000000-0000-0000-0000-000000000001")
        headers["X-Hub-Signature-256"] = "sha256=" + "0" * 64
        self.assertEqual(inbox.receive(self.db, headers, raw, SECRET, REPO, NOW)[0], 401)
        self.assertEqual(self.db.execute("SELECT count(*) FROM deliveries").fetchone()[0], 0)

    def test_duplicate_delivery_and_reopen_persist_across_connections(self):
        ident = "00000000-0000-0000-0000-000000000001"
        self.assertEqual(self.receive(ident)[0], 202)
        with inbox.connect(self.path) as other:
            self.assertEqual(inbox.receive(other, *event(ident), SECRET, REPO, NOW),
                             (200, "duplicate"))
        self.assertEqual(self.db.execute("SELECT count(*) FROM outbox").fetchone()[0], 1)

    def test_out_of_order_and_superseded_slack(self):
        self.assertEqual(self.receive("00000000-0000-0000-0000-000000000001")[0], 202)
        self.assertEqual(self.receive("00000000-0000-0000-0000-000000000002",
                                      updated="2026-09-29T00:00:00Z"), (200, "stale"))
        self.assertEqual(self.receive("00000000-0000-0000-0000-000000000003",
                                      updated="2026-09-30T00:01:00Z", action="closed")[0], 202)
        sent = []
        self.assertEqual(inbox.dispatch_one(self.db, URL, lambda u, t: sent.append(t), NOW),
                         "superseded")
        self.assertEqual(inbox.dispatch_one(self.db, URL, lambda u, t: sent.append(t), NOW),
                         "sent")
        self.assertEqual(len(sent), 1)
        self.assertIn("closed", sent[0])
        self.assertNotIn("@here", sent[0])

    def test_resources_are_isolated_by_repository(self):
        first, raw = event("00000000-0000-0000-0000-000000000010",
                           updated="2026-09-30T00:02:00Z")
        self.assertEqual(inbox.receive(self.db, first, raw, SECRET, REPO, NOW),
                         (202, "queued"))
        other_repo = "another-owner/another-repo"
        second, raw = event("00000000-0000-0000-0000-000000000011",
                            repository=other_repo)
        self.assertEqual(inbox.receive(self.db, second, raw, SECRET, other_repo, NOW),
                         (202, "queued"))
        self.assertEqual(self.db.execute("SELECT count(*) FROM resources").fetchone()[0], 2)
        self.assertEqual(self.db.execute("SELECT count(*) FROM outbox").fetchone()[0], 2)
        sent = []
        self.assertEqual(
            inbox.dispatch_one(self.db, URL, lambda _url, text: sent.append(text), NOW),
            "sent")
        self.assertEqual(
            inbox.dispatch_one(self.db, URL, lambda _url, text: sent.append(text), NOW + 1),
            "sent")
        self.assertEqual(len(sent), 2)

    def test_legacy_database_migrates_and_preserves_queued_delivery(self):
        legacy_path = str(Path(self.directory.name) / "legacy.db")
        legacy = sqlite3.connect(legacy_path)
        legacy.executescript("""
            CREATE TABLE resources (
                kind TEXT NOT NULL, number INTEGER NOT NULL, updated_at TEXT NOT NULL,
                PRIMARY KEY (kind, number));
            CREATE TABLE outbox (
                id TEXT PRIMARY KEY, kind TEXT NOT NULL, number INTEGER NOT NULL,
                updated_at TEXT NOT NULL, text TEXT NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0, due REAL NOT NULL, state TEXT NOT NULL);
            INSERT INTO resources VALUES
                ('issues',42,'2026-09-30T00:00:00+00:00');
            INSERT INTO outbox VALUES
                ('legacy-delivery','issues',42,'2026-09-30T00:00:00+00:00',
                 'legacy message',0,1790726400,'pending');
        """)
        legacy.close()
        migrated = inbox.connect(legacy_path)
        self.addCleanup(migrated.close)
        self.assertEqual(
            inbox.dispatch_one(migrated, URL, lambda *_: None, NOW), "sent")
        self.assertEqual(
            migrated.execute("SELECT repository,state FROM outbox").fetchone(),
            ("", "sent"))

    def test_slack_failure_retry_rate_limit_and_dead_letter(self):
        self.receive("00000000-0000-0000-0000-000000000001")
        def fail(url, text):
            raise OSError("offline")
        self.assertEqual(inbox.dispatch_one(self.db, URL, fail, NOW), "retry")
        self.assertEqual(inbox.dispatch_one(self.db, URL, fail, NOW), "rate-limited")
        for attempt in range(2, 6):
            result = inbox.dispatch_one(self.db, URL, fail, NOW + 2**attempt + 100 * attempt)
        self.assertEqual(result, "dead")
        self.assertEqual(self.db.execute("SELECT attempts FROM outbox").fetchone()[0], 5)
        self.assertEqual(inbox.dispatch_one(self.db, URL, fail, NOW + 10000), "empty")

    def test_crashed_worker_lease_recovery(self):
        self.receive("00000000-0000-0000-0000-000000000001")
        self.db.execute("UPDATE outbox SET state='leased', due=?", (NOW - 1,))
        self.assertEqual(inbox.dispatch_one(self.db, URL, lambda *_: None, NOW), "sent")
        self.assertEqual(self.db.execute("SELECT attempts FROM outbox").fetchone()[0], 1)

    def test_reject_wrong_repo_future_and_slack_url(self):
        headers, raw = event("00000000-0000-0000-0000-000000000001",
                             updated="2026-10-01T00:00:00Z")
        self.assertEqual(inbox.receive(self.db, headers, raw, SECRET, REPO, NOW)[0], 400)
        self.assertEqual(self.receive("00000000-0000-0000-0000-000000000002",
                                      kind="pull_request")[0], 202)
        for url in ("http://hooks.slack.com/services/a", "https://evil.com/services/a",
                    "https://hooks.slack.com.evil.com/services/a",
                    "https://hooks.slack.com/services/a/b/c/extra"):
            with self.assertRaises(ValueError):
                inbox.dispatch_one(self.db, url, lambda *_: None, NOW)
        self.assertIsNone(inbox.NoRedirect().redirect_request(
            None, None, 302, "redirect", {}, "https://example.org/"))

    def test_gitlab_invalid_token_and_queued(self):
        headers, raw = gitlab_event("00000000-0000-0000-0000-000000000001")
        headers["X-Gitlab-Token"] = "wrong"
        self.assertEqual(inbox.receive_gitlab(self.db, headers, raw, SECRET, REPO, NOW)[0], 401)
        self.assertEqual(
            inbox.receive_gitlab(self.db, *gitlab_event(
                "00000000-0000-0000-0000-000000000006"), "short", REPO, NOW)[0],
            401)
        headers, raw = gitlab_event("00000000-0000-0000-0000-000000000001")
        self.assertEqual(inbox.receive_gitlab(self.db, headers, raw, SECRET, REPO, NOW)[0], 202)
        self.assertEqual(inbox.receive_gitlab(self.db, headers, raw, SECRET, REPO, NOW),
                         (200, "duplicate"))

    def test_gitlab_rejects_wrong_project_event_future(self):
        headers, raw = gitlab_event("00000000-0000-0000-0000-000000000002")
        headers["X-Gitlab-Event"] = "Pipeline Hook"
        self.assertEqual(inbox.receive_gitlab(self.db, headers, raw, SECRET, REPO, NOW)[0], 400)
        headers, raw = gitlab_event("00000000-0000-0000-0000-000000000003",
                                    updated="2026-10-01T00:00:00Z")
        self.assertEqual(inbox.receive_gitlab(self.db, headers, raw, SECRET, REPO, NOW)[0], 400)

    def test_gitlab_event_header_must_match_payload_kind(self):
        headers, raw = gitlab_event("00000000-0000-0000-0000-000000000005")
        headers["X-Gitlab-Event"] = "Merge Request Hook"
        self.assertEqual(
            inbox.receive_gitlab(self.db, headers, raw, SECRET, REPO, NOW),
            (400, "invalid payload"))
        self.assertEqual(self.db.execute("SELECT count(*) FROM outbox").fetchone()[0], 0)

    def test_composio_dispatch_skips_webhook_url_validation(self):
        self.receive("00000000-0000-0000-0000-000000000004")
        sent = []
        self.assertEqual(inbox.dispatch_one(
            self.db, "C0AS1UGT3FA", lambda c, text: sent.append((c, text)), NOW,
            slack_mode="composio"), "sent")
        self.assertEqual(sent[0][0], "C0AS1UGT3FA")

    def test_composio_channel_validation(self):
        with self.assertRaises(ValueError):
            inbox.post_slack_composio("not-a-channel", "test")


if __name__ == "__main__":
    unittest.main()

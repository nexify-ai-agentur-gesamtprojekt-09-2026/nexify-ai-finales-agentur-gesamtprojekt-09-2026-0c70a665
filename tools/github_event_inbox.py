#!/usr/bin/env python3
"""Opt-in, local GitHub issue/PR webhook inbox and Slack outbox (stdlib only)."""
import argparse
from contextlib import closing
import hashlib
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import re
import sqlite3
import subprocess
import time
from datetime import datetime, timezone
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

MAX_BODY = 256 * 1024
DELIVERY = re.compile(r"^[a-fA-F0-9-]{36}$")
ACTIONS = {"opened", "edited", "reopened", "closed"}
GITLAB_EVENTS = {"Issue Hook": "issues", "Merge Request Hook": "pull_request"}
GITLAB_ACTIONS = {"open", "update", "close", "reopen", "merge"}
SLACK_CHANNEL = re.compile(r"^[A-Z][A-Z0-9]{8,}$")


def connect(path):
    db = sqlite3.connect(path, timeout=10, isolation_level=None)
    db.execute("PRAGMA journal_mode=WAL")
    db.executescript("""
        CREATE TABLE IF NOT EXISTS deliveries (id TEXT PRIMARY KEY, received_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS resources (
            kind TEXT NOT NULL, number INTEGER NOT NULL, updated_at TEXT NOT NULL,
            PRIMARY KEY (kind, number));
        CREATE TABLE IF NOT EXISTS outbox (
            id TEXT PRIMARY KEY, kind TEXT NOT NULL, number INTEGER NOT NULL,
            updated_at TEXT NOT NULL, text TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0, due REAL NOT NULL, state TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS limits (id INTEGER PRIMARY KEY CHECK(id=1), next_send REAL NOT NULL);
    """)
    return db


def receive(db, headers, raw, secret, repository, now=None):
    now = time.time() if now is None else now
    signature = headers.get("X-Hub-Signature-256", "")
    expected = "sha256=" + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    if len(raw) > MAX_BODY or not hmac.compare_digest(signature, expected):
        return 401, "invalid signature"
    delivery = headers.get("X-GitHub-Delivery", "")
    if not DELIVERY.fullmatch(delivery):
        return 400, "invalid delivery"
    event = headers.get("X-GitHub-Event")
    if event not in ("issues", "pull_request"):
        return 400, "unsupported event"
    try:
        payload = json.loads(raw)
        item = payload["issue" if event == "issues" else "pull_request"]
        action = payload["action"]
        number = item["number"]
        updated = item["updated_at"]
        if (payload["repository"]["full_name"] != repository
                or action not in ACTIONS or type(number) is not int or not 0 < number < 2**31
                or not isinstance(updated, str)):
            raise ValueError()
        timestamp = datetime.fromisoformat(updated.replace("Z", "+00:00"))
        if timestamp.tzinfo is None or timestamp.timestamp() > now + 300:
            raise ValueError()
        timestamp = timestamp.astimezone(timezone.utc)
        # Only use fixed, constructed Slack text, never untrusted issue content.
        text = f"GitHub {repository} {event} #{number}: {action} (Review erforderlich)"
    except (ValueError, TypeError, KeyError, AttributeError, OverflowError):
        return 400, "invalid payload"
    db.execute("BEGIN IMMEDIATE")
    try:
        if db.execute("SELECT 1 FROM deliveries WHERE id=?", (delivery,)).fetchone():
            db.execute("COMMIT")
            return 200, "duplicate"
        db.execute("INSERT INTO deliveries VALUES (?,?)", (delivery, now))
        previous = db.execute(
            "SELECT updated_at FROM resources WHERE kind=? AND number=?", (event, number)
        ).fetchone()
        if previous and previous[0] >= timestamp.isoformat():
            db.execute("COMMIT")
            return 200, "stale"
        db.execute("""INSERT INTO resources VALUES (?,?,?)
            ON CONFLICT(kind,number) DO UPDATE SET updated_at=excluded.updated_at""",
                   (event, number, timestamp.isoformat()))
        db.execute("INSERT INTO outbox (id,kind,number,updated_at,text,due,state) VALUES (?,?,?,?,?,?,'pending')",
                   (delivery, event, number, timestamp.isoformat(), text, now))
        db.execute("COMMIT")
        return 202, "queued"
    except BaseException:
        db.execute("ROLLBACK")
        raise


def receive_gitlab(db, headers, raw, secret, repository, now=None):
    """Signierter GitLab-Issue/MR-Webhook, gleiche Outbox wie GitHub."""
    now = time.time() if now is None else now
    token = headers.get("X-Gitlab-Token", "")
    if len(raw) > MAX_BODY or not token or not hmac.compare_digest(token, secret):
        return 401, "invalid token"
    delivery = headers.get("X-Gitlab-Event-UUID") or headers.get("X-Gitlab-Delivery", "")
    if not DELIVERY.fullmatch(delivery):
        return 400, "invalid delivery"
    event = headers.get("X-Gitlab-Event")
    kind = GITLAB_EVENTS.get(event)
    if kind is None:
        return 400, "unsupported event"
    try:
        payload = json.loads(raw)
        if payload.get("object_kind") not in ("issue", "merge_request"):
            raise ValueError()
        obj = payload["object_attributes"]
        action = obj.get("action") or payload.get("action", "")
        number = obj["iid"]
        updated = obj["updated_at"]
        if (payload["project"]["path_with_namespace"] != repository
                or action not in GITLAB_ACTIONS or type(number) is not int
                or not 0 < number < 2**31 or not isinstance(updated, str)):
            raise ValueError()
        timestamp = datetime.fromisoformat(updated.replace("Z", "+00:00"))
        if timestamp.tzinfo is None or timestamp.timestamp() > now + 300:
            raise ValueError()
        timestamp = timestamp.astimezone(timezone.utc)
        text = f"GitLab {repository} {kind} #{number}: {action} (Review erforderlich)"
    except (ValueError, TypeError, KeyError, AttributeError, OverflowError):
        return 400, "invalid payload"
    db.execute("BEGIN IMMEDIATE")
    try:
        if db.execute("SELECT 1 FROM deliveries WHERE id=?", (delivery,)).fetchone():
            db.execute("COMMIT")
            return 200, "duplicate"
        db.execute("INSERT INTO deliveries VALUES (?,?)", (delivery, now))
        previous = db.execute(
            "SELECT updated_at FROM resources WHERE kind=? AND number=?", (kind, number)
        ).fetchone()
        if previous and previous[0] >= timestamp.isoformat():
            db.execute("COMMIT")
            return 200, "stale"
        db.execute("""INSERT INTO resources VALUES (?,?,?)
            ON CONFLICT(kind,number) DO UPDATE SET updated_at=excluded.updated_at""",
                   (kind, number, timestamp.isoformat()))
        db.execute("INSERT INTO outbox (id,kind,number,updated_at,text,due,state) VALUES (?,?,?,?,?,?,'pending')",
                   (delivery, kind, number, timestamp.isoformat(), text, now))
        db.execute("COMMIT")
        return 202, "queued"
    except BaseException:
        db.execute("ROLLBACK")
        raise


def slack_url(value):
    parsed = urlparse(value)
    if (parsed.scheme != "https" or parsed.hostname != "hooks.slack.com"
            or parsed.port not in (None, 443) or parsed.username or parsed.password
            or parsed.query or parsed.fragment
            or not re.fullmatch(r"/services/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+",
                                parsed.path)):
        raise ValueError("Slack URL must be an HTTPS hooks.slack.com/services/ URL")
    return value


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


def post_slack(url, text):
    request = Request(slack_url(url), data=json.dumps({"text": text}).encode(),
                      headers={"Content-Type": "application/json"}, method="POST")
    with build_opener(NoRedirect).open(request, timeout=8) as response:
        if response.status != 200 or response.read(32).strip() != b"ok":
            raise RuntimeError("Slack rejected notification")


def post_slack_composio(channel, text):
    """Sendet eine Slack-Nachricht über die aktive Composio-Slack-Verbindung."""
    if not SLACK_CHANNEL.fullmatch(channel):
        raise ValueError("Slack channel must be a channel ID like C0AS1UGT3FA")
    payload = json.dumps({"channel": channel, "text": text})
    proc = subprocess.run(
        ["composio", "proxy", "https://slack.com/api/chat.postMessage",
         "--toolkit", "slack", "-X", "POST", "-d", payload],
        capture_output=True, text=True, timeout=30,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or "composio slack failed")
    try:
        if not json.loads(proc.stdout).get("ok"):
            raise RuntimeError("Slack rejected notification")
    except (ValueError, AttributeError):
        raise RuntimeError("unexpected composio output")


def dispatch_one(db, url, send=post_slack, now=None, slack_mode="webhook"):
    """Claim one due job; at least once delivery if process dies after sending."""
    if slack_mode == "webhook":
        slack_url(url)
    now = time.time() if now is None else now
    db.execute("BEGIN IMMEDIATE")
    try:
        # A crashed worker must not strand a leased message indefinitely.
        db.execute("""UPDATE outbox SET state=CASE WHEN attempts>=4 THEN 'dead' ELSE 'pending' END,
            attempts=attempts+1 WHERE state='leased' AND due<=?""", (now,))
        limit = db.execute("SELECT next_send FROM limits WHERE id=1").fetchone()
        if limit and limit[0] > now:
            db.execute("COMMIT")
            return "rate-limited"
        row = db.execute("""SELECT id,kind,number,updated_at,text,attempts FROM outbox
            WHERE state='pending' AND due<=? ORDER BY due,id LIMIT 1""", (now,)).fetchone()
        if not row:
            db.execute("COMMIT")
            return "empty"
        ident, kind, number, updated, text, attempts = row
        current = db.execute(
            "SELECT updated_at FROM resources WHERE kind=? AND number=?", (kind, number)
        ).fetchone()
        if current[0] != updated:
            db.execute("UPDATE outbox SET state='superseded' WHERE id=?", (ident,))
            db.execute("COMMIT")
            return "superseded"
        db.execute("UPDATE outbox SET state='leased', due=? WHERE id=?", (now + 30, ident))
        db.execute("""INSERT INTO limits VALUES (1,?) ON CONFLICT(id) DO UPDATE SET next_send=excluded.next_send""",
                   (now + 1,))
        db.execute("COMMIT")
    except BaseException:
        db.execute("ROLLBACK")
        raise
    try:
        send(url, text)
    except Exception:
        attempts += 1
        db.execute("UPDATE outbox SET state=?, attempts=?, due=? WHERE id=?",
                   ("dead" if attempts >= 5 else "pending", attempts,
                    now + min(3600, 2 ** attempts), ident))
        return "dead" if attempts >= 5 else "retry"
    db.execute("UPDATE outbox SET state='sent' WHERE id=?", (ident,))
    return "sent"


def run_server(path, gh_secret, gl_secret, gh_repository, gl_repository):
    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path == "/github":
                secret = gh_secret
                process = receive
                repository = gh_repository
            elif self.path == "/gitlab":
                if not gl_secret:
                    self.send_error(503, "GitLab webhook not configured")
                    return
                secret = gl_secret
                process = receive_gitlab
                repository = gl_repository
            else:
                self.send_error(404)
                return
            length = self.headers.get("Content-Length", "")
            if not length.isdigit() or int(length) > MAX_BODY:
                self.send_error(413)
                return
            with closing(connect(path)) as db:
                status, message = process(db, self.headers, self.rfile.read(int(length)), secret, repository)
            self.send_response(status)
            self.end_headers()
            self.wfile.write(message.encode())

    # Standardmaessig nur loopback; NX_WEBHOOK_BIND setzt die Bind-Adresse.
    bind = os.environ.get("NX_WEBHOOK_BIND", "127.0.0.1")
    ThreadingHTTPServer((bind, 8787), Handler).serve_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("serve", "dispatch"))
    parser.add_argument("--db", required=True, help="private persistent SQLite path (not inside repository)")
    args = parser.parse_args()
    gh_repo = os.environ.get("NX_GITHUB_REPOSITORY", "")
    gl_repo = os.environ.get("NX_GITLAB_REPOSITORY", gh_repo)
    gh_secret = os.environ.get("NX_GITHUB_WEBHOOK_SECRET", "")
    gl_secret = os.environ.get("NX_GITLAB_WEBHOOK_SECRET", "")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", gh_repo) or len(gh_secret) < 32:
        parser.error("NX_GITHUB_REPOSITORY and a webhook secret of at least 32 characters required")
    if args.mode == "serve":
        run_server(args.db, gh_secret, gl_secret, gh_repo, gl_repo)
    else:
        provider = os.environ.get("NX_SLACK_PROVIDER", "webhook")
        if provider == "composio":
            channel = os.environ.get("NX_SLACK_CHANNEL", "")
            if not SLACK_CHANNEL.fullmatch(channel):
                parser.error("NX_SLACK_CHANNEL is required for NX_SLACK_PROVIDER=composio")
            print(dispatch_one(connect(args.db), channel,
                               lambda c, text: post_slack_composio(c, text),
                               slack_mode="composio"))
        else:
            url = os.environ.get("NX_SLACK_WEBHOOK_URL", "")
            print(dispatch_one(connect(args.db), slack_url(url)))

#!/usr/bin/env python3
"""Bounded Workspace Agent trigger client with restart-safe correlation evidence."""

from __future__ import annotations

import argparse
import contextlib
import dataclasses
import datetime as dt
import fcntl
import hashlib
import http.client
import json
import os
import re
import ssl
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Callable


API_HOST = "api.chatgpt.com"
CHAT_HOST = "chatgpt.com"
EXPECTED_AGENT_ID = "agt_6af33958f2308191bfa2b8d8f682fe0e"
EXPECTED_TRIGGER_ID = "agtch_6af34278a84081919442f7c92455b232"
TOKEN_ENV = "WORKSPACE_AGENT_ACCESS_TOKEN"
MAX_INPUT_BYTES = 64 * 1024
MAX_RESPONSE_BYTES = 64 * 1024
ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$")
REMOTE_TERMINAL = {"completed", "failed"}
LOCAL_STATES = {
    "prepared",
    "sent",
    "accepted",
    "running",
    "completed",
    "result_received",
    "result_verified",
    "failed",
    "unclear",
}


class RelayError(RuntimeError):
    pass


class ValidationError(RelayError):
    pass


class StateConflict(RelayError):
    pass


class TransportError(RelayError):
    def __init__(self, message: str, *, http_status: int | None = None):
        super().__init__(message)
        self.http_status = http_status


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        raise TransportError("redirect rejected")


@dataclasses.dataclass(frozen=True)
class EventSpec:
    event_id: str
    tenant: str
    purpose: str
    target_agent_id: str
    trigger_id: str
    writer: str
    writer_lease: str
    deadline: str
    expected_result_location: str
    conversation_key: str
    input_text: str

    def validate(self, *, allowed_tenant: str) -> None:
        for label, value in (("event_id", self.event_id), ("conversation_key", self.conversation_key),
                             ("writer", self.writer), ("writer_lease", self.writer_lease)):
            if not ID_RE.fullmatch(value):
                raise ValidationError(f"invalid {label}")
        if self.tenant != allowed_tenant:
            raise ValidationError("tenant rejected")
        if self.target_agent_id != EXPECTED_AGENT_ID:
            raise ValidationError("target agent rejected")
        if self.trigger_id != EXPECTED_TRIGGER_ID:
            raise ValidationError("trigger channel rejected")
        if not self.purpose.strip() or len(self.purpose) > 500:
            raise ValidationError("purpose rejected")
        if not self.expected_result_location.strip():
            raise ValidationError("expected result location required")
        if not self.input_text.strip() or len(self.input_text.encode("utf-8")) > MAX_INPUT_BYTES:
            raise ValidationError("input rejected")
        if self.event_id not in self.input_text:
            raise ValidationError("input must include event id")
        deadline = parse_time(self.deadline)
        if deadline <= now_utc():
            raise ValidationError("deadline must be in the future")


def now_utc() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def iso_now() -> str:
    return now_utc().isoformat(timespec="seconds")


def parse_time(value: str) -> dt.datetime:
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValidationError("invalid timestamp") from exc
    if parsed.tzinfo is None:
        raise ValidationError("timestamp requires timezone")
    return parsed.astimezone(dt.timezone.utc)


def validate_https_url(url: str, *, host: str, path: str | None = None) -> None:
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname != host or parsed.port not in (None, 443):
        raise ValidationError("URL host rejected")
    if parsed.username or parsed.password or parsed.fragment:
        raise ValidationError("URL authority rejected")
    if path is not None and parsed.path != path:
        raise ValidationError("URL path rejected")


class Journal:
    """Transport evidence only; never a task queue or business register."""

    def __init__(self, path: Path):
        self.path = path
        self.lock_path = path.with_suffix(path.suffix + ".lock")

    @contextlib.contextmanager
    def locked(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.lock_path.open("a+", encoding="utf-8") as lock:
            os.chmod(self.lock_path, 0o600)
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
            yield

    def load(self) -> dict[str, Any]:
        if not self.path.exists():
            return {"version": 1, "kind": "workspace_agent_transport_evidence", "events": {}}
        with self.path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        if data.get("version") != 1 or data.get("kind") != "workspace_agent_transport_evidence" or not isinstance(data.get("events"), dict):
            raise ValidationError("journal schema rejected")
        return data

    def save(self, data: dict[str, Any]) -> None:
        payload = json.dumps(data, ensure_ascii=True, indent=2, sort_keys=True) + "\n"
        fd, temp_name = tempfile.mkstemp(prefix=self.path.name + ".", dir=self.path.parent)
        try:
            os.fchmod(fd, 0o600)
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(payload)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temp_name, self.path)
        finally:
            with contextlib.suppress(FileNotFoundError):
                os.unlink(temp_name)

    def mutate(self, event_id: str, change: Callable[[dict[str, Any]], None]) -> dict[str, Any]:
        with self.locked():
            data = self.load()
            event = data["events"].get(event_id)
            if event is None:
                raise StateConflict("unknown event")
            change(event)
            event["updated_at"] = iso_now()
            self.save(data)
            return dict(event)


def prepare(journal: Journal, spec: EventSpec, *, allowed_tenant: str) -> dict[str, Any]:
    spec.validate(allowed_tenant=allowed_tenant)
    immutable = dataclasses.asdict(spec)
    with journal.locked():
        data = journal.load()
        existing = data["events"].get(spec.event_id)
        if existing:
            if existing.get("spec") != immutable:
                raise StateConflict("event id already bound to different content")
            return dict(existing)
        timestamp = iso_now()
        event = {
            "spec": immutable,
            "idempotency_key": spec.event_id,
            "state": "prepared",
            "remote_status": None,
            "conversation_url": None,
            "run_id": None,
            "result": None,
            "created_at": timestamp,
            "updated_at": timestamp,
            "history": [{"at": timestamp, "state": "prepared"}],
        }
        data["events"][spec.event_id] = event
        journal.save(data)
        return dict(event)


def _transition(event: dict[str, Any], state: str, **extra: Any) -> None:
    if state not in LOCAL_STATES:
        raise ValidationError("invalid local state")
    event["state"] = state
    event.update(extra)
    event.setdefault("history", []).append({"at": iso_now(), "state": state})


def _token(env: dict[str, str]) -> str:
    token = env.get(TOKEN_ENV, "")
    if not token or token.strip() != token or any(ch.isspace() for ch in token):
        raise ValidationError(f"missing {TOKEN_ENV}")
    return token


def _opener() -> urllib.request.OpenerDirector:
    return urllib.request.build_opener(NoRedirect(), urllib.request.HTTPSHandler(context=ssl.create_default_context()))


def _read_json(response) -> dict[str, Any]:  # noqa: ANN001
    raw = response.read(MAX_RESPONSE_BYTES + 1)
    if len(raw) > MAX_RESPONSE_BYTES:
        raise TransportError("response too large")
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise TransportError("invalid JSON response") from exc
    if not isinstance(value, dict):
        raise TransportError("invalid response object")
    return value


def _http_json(request: urllib.request.Request, *, timeout: float, opener=None) -> tuple[int, dict[str, Any]]:
    try:
        response = (opener or _opener()).open(request, timeout=timeout)
        with response:
            return int(response.status), _read_json(response)
    except urllib.error.HTTPError as exc:
        status = int(exc.code)
        if status in {401, 403, 404, 409}:
            raise TransportError(f"workspace agent API returned HTTP {status}", http_status=status) from None
        raise TransportError("workspace agent API request failed", http_status=status) from None
    except (TimeoutError, urllib.error.URLError) as exc:
        raise TransportError(f"transport outcome unclear: {type(exc).__name__}") from None
    except (http.client.IncompleteRead, ConnectionError, OSError) as exc:
        raise TransportError(f"transport outcome unclear: {type(exc).__name__}") from None


def send(journal: Journal, event_id: str, *, allowed_tenant: str, writer: str, writer_lease: str,
         env=None, timeout: float = 15.0, opener=None) -> dict[str, Any]:
    if not 1 <= timeout <= 60:
        raise ValidationError("timeout outside allowed range")
    token = _token(dict(os.environ if env is None else env))

    def mark_sent(event):
        if event["state"] != "prepared":
            raise StateConflict("event is not sendable; reconcile unclear outcomes before retry")
        spec = EventSpec(**event["spec"])
        spec.validate(allowed_tenant=allowed_tenant)
        if writer != spec.writer or writer_lease != spec.writer_lease:
            raise StateConflict("active writer lease rejected")
        if parse_time(spec.deadline) <= now_utc():
            raise StateConflict("event deadline expired")
        _transition(event, "sent")
    event = journal.mutate(event_id, mark_sent)
    spec = EventSpec(**event["spec"])
    path = f"/v1/workspace_agents/{spec.trigger_id}/trigger"
    url = f"https://{API_HOST}{path}"
    validate_https_url(url, host=API_HOST, path=path)
    body = json.dumps({"conversation_key": spec.conversation_key, "input": spec.input_text}).encode("utf-8")
    request = urllib.request.Request(url, data=body, method="POST", headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Idempotency-Key": event["idempotency_key"],
        "OpenAI-Beta": "workspace_agent_runs=v1",
    })
    try:
        status, payload = _http_json(request, timeout=timeout, opener=opener)
        if status != 202:
            raise TransportError(f"unexpected HTTP {status}", http_status=status)
        conversation_url = payload.get("conversation_url")
        run_id = payload.get("agent_trigger_run_id")
        if not isinstance(conversation_url, str) or not isinstance(run_id, str) or not run_id.startswith("apirun_"):
            raise TransportError("accepted response missing correlation fields")
        validate_https_url(conversation_url, host=CHAT_HOST)
        return journal.mutate(event_id, lambda value: _transition(value, "accepted", remote_status="queued", conversation_url=conversation_url, run_id=run_id))
    except (TransportError, ValidationError) as exc:
        status = exc.http_status if isinstance(exc, TransportError) else None
        state = "failed" if status in {401, 403, 404, 409} else "unclear"
        journal.mutate(event_id, lambda value: _transition(value, state, error={"kind": "http" if status else "transport", "status": status}))
        raise


def poll(journal: Journal, event_id: str, *, env=None, timeout: float = 15.0, opener=None) -> dict[str, Any]:
    token = _token(dict(os.environ if env is None else env))
    with journal.locked():
        event = journal.load()["events"].get(event_id)
    if not event or not event.get("run_id"):
        raise StateConflict("run id unavailable")
    spec = EventSpec(**event["spec"])
    path = f"/v1/workspace_agents/{spec.trigger_id}/runs/{event['run_id']}"
    url = f"https://{API_HOST}{path}"
    validate_https_url(url, host=API_HOST, path=path)
    request = urllib.request.Request(url, method="GET", headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})
    try:
        status, payload = _http_json(request, timeout=timeout, opener=opener)
        if status != 200 or payload.get("agent_id") != spec.target_agent_id or payload.get("api_trigger_id") != spec.trigger_id or payload.get("id") != event["run_id"]:
            raise TransportError("run correlation rejected")
        remote = payload.get("status")
        if remote not in {"queued", "in_progress", "suspended", "completed", "failed"}:
            raise TransportError("unknown run status")
        local = {"queued": "accepted", "in_progress": "running", "suspended": "running", "completed": "completed", "failed": "failed"}[remote]

        def apply_status(value):
            if remote == "completed" and value["state"] in {"result_received", "result_verified"}:
                value["remote_status"] = remote
                value["error"] = None
                return
            _transition(value, local, remote_status=remote, error=payload.get("error") if remote == "failed" else None)

        return journal.mutate(event_id, apply_status)
    except TransportError as exc:
        if exc.http_status in {401, 403, 404, 409}:
            journal.mutate(event_id, lambda value: _transition(value, "failed", error={"kind": "http", "status": exc.http_status}))
        raise


def verify_result(journal: Journal, event_id: str, result: bytes, *, expected_test_id: str) -> dict[str, Any]:
    if len(result) > MAX_RESPONSE_BYTES:
        raise ValidationError("result too large")
    text = result.decode("utf-8", errors="strict")
    digest = hashlib.sha256(result).hexdigest()

    def change(event):
        if event["state"] not in {"completed", "result_received"}:
            raise StateConflict("remote run is not completed")
        matched = expected_test_id in text and event_id in text
        _transition(event, "result_verified" if matched else "result_received", result={"sha256": digest, "bytes": len(result), "matched": matched})
    return journal.mutate(event_id, change)


def event_view(journal: Journal, event_id: str) -> dict[str, Any]:
    with journal.locked():
        event = journal.load()["events"].get(event_id)
    if not event:
        raise StateConflict("unknown event")
    return event


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--journal", required=True, type=Path)
    parser.add_argument("--allowed-tenant", required=True)
    sub = parser.add_subparsers(dest="command", required=True)
    prepare_cmd = sub.add_parser("prepare")
    for flag in ("event-id", "purpose", "writer", "writer-lease", "deadline", "expected-result-location", "conversation-key", "input"):
        prepare_cmd.add_argument(f"--{flag}", required=True)
    prepare_cmd.add_argument("--tenant", required=True)
    prepare_cmd.add_argument("--target-agent-id", default=EXPECTED_AGENT_ID)
    prepare_cmd.add_argument("--trigger-id", default=EXPECTED_TRIGGER_ID)
    send_cmd = sub.add_parser("send")
    send_cmd.add_argument("--event-id", required=True)
    send_cmd.add_argument("--writer", required=True)
    send_cmd.add_argument("--writer-lease", required=True)
    send_cmd.add_argument("--timeout", type=float, default=15.0)
    poll_cmd = sub.add_parser("poll")
    poll_cmd.add_argument("--event-id", required=True)
    poll_cmd.add_argument("--timeout", type=float, default=15.0)
    result_cmd = sub.add_parser("verify-result")
    result_cmd.add_argument("--event-id", required=True)
    result_cmd.add_argument("--expected-test-id", required=True)
    result_cmd.add_argument("--result-file", required=True, type=Path)
    show_cmd = sub.add_parser("show")
    show_cmd.add_argument("--event-id", required=True)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    journal = Journal(args.journal)
    try:
        if args.command == "prepare":
            event = prepare(journal, EventSpec(args.event_id, args.tenant, args.purpose, args.target_agent_id, args.trigger_id,
                args.writer, args.writer_lease, args.deadline, args.expected_result_location, args.conversation_key, args.input),
                allowed_tenant=args.allowed_tenant)
        elif args.command == "send":
            event = send(journal, args.event_id, allowed_tenant=args.allowed_tenant, writer=args.writer,
                         writer_lease=args.writer_lease, timeout=args.timeout)
        elif args.command == "poll":
            event = poll(journal, args.event_id, timeout=args.timeout)
        elif args.command == "verify-result":
            event = verify_result(journal, args.event_id, args.result_file.read_bytes(), expected_test_id=args.expected_test_id)
        else:
            event = event_view(journal, args.event_id)
        print(json.dumps({"event_id": args.event_id, "state": event["state"], "remote_status": event.get("remote_status"),
                          "run_id": event.get("run_id"), "conversation_url": event.get("conversation_url"), "result": event.get("result")}, sort_keys=True))
        return 0
    except RelayError as exc:
        print(json.dumps({"error": type(exc).__name__, "message": str(exc)}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

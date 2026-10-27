#!/usr/bin/env python3
"""Bounded, read-only Streamable HTTP MCP capability and latency discovery."""
import argparse
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import threading
import time
import urllib.error
import urllib.parse
import urllib.request


class ProbeError(Exception):
    pass


def strict_json_loads(raw):
    def unique_object(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError("duplicate JSON key")
            result[key] = value
        return result

    def reject_constant(_value):
        raise ValueError("non-finite JSON number")

    return json.loads(raw, object_pairs_hook=unique_object, parse_constant=reject_constant)


@contextmanager
def hard_deadline(seconds):
    if (threading.current_thread() is not threading.main_thread() or not hasattr(signal, "setitimer")
            or signal.getitimer(signal.ITIMER_REAL) != (0.0, 0.0)):
        raise ProbeError("hard_deadline_unavailable")
    previous = signal.getsignal(signal.SIGALRM)
    def expired(_number, _frame):
        raise TimeoutError()
    signal.signal(signal.SIGALRM, expired)
    signal.setitimer(signal.ITIMER_REAL, seconds)
    try:
        yield
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ProbeError("redirect_refused")


def endpoint(value):
    parsed = urllib.parse.urlsplit(value)
    if (parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password
            or parsed.query or parsed.fragment or any(ord(c) < 33 for c in value)):
        raise ProbeError("invalid_endpoint")
    if parsed.scheme == "http" and parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        raise ProbeError("tls_required")
    try:
        parsed.port
    except ValueError:
        raise ProbeError("invalid_endpoint") from None
    return value


class Client:
    def __init__(self, url, token, config):
        self.url = endpoint(url)
        self.token = token
        self.config = config
        for key, maximum in (("timeout_seconds", 60), ("max_pages", 100), ("max_response_bytes", 4194304)):
            if type(config.get(key)) is not int or not 1 <= config[key] <= maximum:
                raise ProbeError("invalid_probe_limits")
        total = config.get("max_total_seconds", 60)
        if type(total) is not int or not 1 <= total <= 300:
            raise ProbeError("invalid_probe_limits")
        self.deadline = time.monotonic() + total
        self.session = None
        self.version = None
        self.counter = 0
        self.metrics = []
        self.opener = urllib.request.build_opener(NoRedirect())

    def request(self, method, params=None, notification=False):
        self.counter += 1
        message = {"jsonrpc": "2.0", "method": method}
        if not notification:
            message["id"] = self.counter
        if params is not None:
            message["params"] = params
        headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}
        if self.token:
            if any(ord(c) < 33 or ord(c) > 126 for c in self.token):
                raise ProbeError("invalid_credential_binding")
            headers["Authorization"] = "Bearer " + self.token
        if self.session:
            headers["Mcp-Session-Id"] = self.session
        if self.version:
            headers["MCP-Protocol-Version"] = self.version
        request = urllib.request.Request(self.url, json.dumps(message).encode(), headers, method="POST")
        started = time.monotonic()
        try:
            remaining = self.deadline - started
            if remaining <= 0:
                raise ProbeError("total_time_limit")
            with hard_deadline(min(self.config["timeout_seconds"], remaining)), self.opener.open(request, timeout=min(self.config["timeout_seconds"], remaining)) as response:
                chunks, size = [], 0
                while True:
                    remaining = self.deadline - time.monotonic()
                    if remaining <= 0:
                        raise ProbeError("total_time_limit")
                    sock = getattr(getattr(response.fp, "raw", None), "_sock", None)
                    if sock is not None:
                        sock.settimeout(min(self.config["timeout_seconds"], remaining))
                    chunk = response.read1(min(65536, self.config["max_response_bytes"] + 1 - size))
                    if not chunk:
                        break
                    chunks.append(chunk)
                    size += len(chunk)
                    if size > self.config["max_response_bytes"]:
                        raise ProbeError("response_limit")
                raw = b"".join(chunks)
                session = response.headers.get("Mcp-Session-Id")
                if session:
                    if len(session) > 256 or any(ord(c) < 33 or ord(c) > 126 for c in session):
                        raise ProbeError("invalid_session_id")
                    if self.session and self.session != session:
                        raise ProbeError("session_changed")
                    self.session = session
                content_type = response.headers.get("Content-Type", "").split(";", 1)[0].strip()
                if notification:
                    if response.status not in {200, 202, 204}:
                        raise ProbeError("notification_rejected")
                    return None
                if content_type == "text/event-stream":
                    # Only finite POST response streams are supported. Read size
                    # and timeout bound the stream; no background SSE listener.
                    candidates = []
                    for frame in raw.decode().replace("\r\n", "\n").split("\n\n"):
                        data = "\n".join(line[5:].lstrip() for line in frame.splitlines() if line.startswith("data:"))
                        if data:
                            candidates.append(strict_json_loads(data))
                    matches = [item for item in candidates if isinstance(item, dict) and item.get("id") == self.counter]
                    if len(matches) != 1:
                        raise ProbeError("sse_response_ambiguous")
                    result = matches[0]
                elif content_type == "application/json":
                    result = strict_json_loads(raw)
                else:
                    raise ProbeError("unsupported_response_type")
                if (not isinstance(result, dict) or result.get("jsonrpc") != "2.0"
                        or type(result.get("id")) is not int or result.get("id") != self.counter):
                    raise ProbeError("rpc_binding_mismatch")
                if "error" in result or not isinstance(result.get("result"), dict):
                    raise ProbeError("rpc_error_or_invalid_result")
                return result["result"]
        except urllib.error.HTTPError as error:
            raise ProbeError(f"http_{error.code}") from None
        except TimeoutError:
            raise ProbeError("deadline_exceeded") from None
        except (urllib.error.URLError, OSError):
            raise ProbeError("transport_unavailable") from None
        except (ValueError, UnicodeError):
            raise ProbeError("invalid_response") from None
        finally:
            self.metrics.append({"method": method, "latency_ms": round((time.monotonic() - started) * 1000, 3)})

    def pages(self, method, key):
        rows, seen, cursor = [], set(), None
        for _ in range(self.config["max_pages"]):
            result = self.request(method, {"cursor": cursor} if cursor is not None else {})
            items = result.get(key)
            if not isinstance(items, list) or any(not isinstance(item, dict) for item in items):
                raise ProbeError("invalid_list")
            rows.extend(items)
            cursor = result.get("nextCursor")
            if cursor is None:
                return rows
            if not isinstance(cursor, str) or not cursor or len(cursor) > 4096 or cursor in seen:
                raise ProbeError("cursor_cycle_or_invalid")
            seen.add(cursor)
        raise ProbeError("pagination_incomplete")


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def probe(config, server, environ=None):
    environ = os.environ if environ is None else environ
    report = {"schema_version": 1, "server": server["id"], "status": "unconfigured", "complete": False,
              "tools_executed": 0, "latency_scope": "protocol_and_discovery_only", "metrics": []}
    url = environ.get(server["url_env"])
    if not url:
        report["blocker"] = "endpoint_not_bound"
        return report
    client = None
    try:
        client = Client(url, environ.get(server.get("token_env", ""), ""), config)
        versions = config["protocol_versions"]
        if not versions:
            raise ProbeError("no_supported_protocol")
        initialized = client.request("initialize", {"protocolVersion": versions[0], "capabilities": {},
                                    "clientInfo": {"name": "nexify-readonly-probe", "version": "1.0.0"}})
        version = initialized.get("protocolVersion")
        if version not in versions:
            raise ProbeError("unsupported_negotiated_protocol")
        client.version = version
        capabilities = initialized.get("capabilities")
        if not isinstance(capabilities, dict):
            raise ProbeError("invalid_capabilities")
        client.request("notifications/initialized", notification=True)
        inventory = {}
        report["partial_inventory"] = inventory
        for capability, method, key in (("tools", "tools/list", "tools"), ("resources", "resources/list", "resources"),
                                         ("resources", "resources/templates/list", "resourceTemplates"),
                                         ("prompts", "prompts/list", "prompts")):
            if capability in capabilities:
                if not isinstance(capabilities[capability], dict):
                    raise ProbeError("invalid_capabilities")
                items = client.pages(method, key)
                # No descriptions, default argument values, resource URIs or
                # arbitrary response content enter the persisted report.
                inventory[key] = [{"definition_sha256": fingerprint(item),
                                   "name": item.get("name") if isinstance(item.get("name"), str) and re.fullmatch(r"[A-Za-z0-9_.:/-]{1,128}", item["name"]) else None,
                                   "input_schema_sha256": fingerprint(item.get("inputSchema", {}))}
                                  for item in items]
        report.update(status="discovered", complete=True, protocol_version=version, inventory=inventory,
                      endpoint_sha256=fingerprint(url), capabilities_sha256=fingerprint(capabilities))
    except ProbeError as error:
        report.update(status="blocked", blocker=str(error))
    finally:
        if client:
            report["metrics"] = client.metrics
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=Path("config/automation.json"))
    parser.add_argument("--server", default="rea-vps")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    config = json.loads(args.config.read_text())["mcp"]
    server = next((s for s in config["servers"] if s["id"] == args.server), None)
    if server is None:
        raise SystemExit("Unknown configured server")
    report = probe(config, server)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"server": args.server, "status": report["status"], "complete": report["complete"],
                      "tools_executed": 0, "blocker": report.get("blocker")}))
    return 0 if report["complete"] else 3


if __name__ == "__main__":
    raise SystemExit(main())

"""Manual Sentry issue sample. No raw issue data is logged or persisted."""
from __future__ import annotations

import json
import os
import re
import socket
import sys
from http.client import HTTPException
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener

BASE = "https://de.sentry.io/api/0/projects"
PROJECTS = ("nex2fly/sentry-bistre-cable", "nexify-chat-it-automate-it/javascript-nextjs")
MAX_BYTES = 65536
TIMEOUT_SECONDS = 15
QUERY = {"query": "is:unresolved", "statsPeriod": "24h", "limit": "1"}


class SampleError(Exception):
    """A fixed diagnostic code, never a provider message or response body."""


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def sample(body: bytes, project: str) -> dict:
    """Validate one requested page, returning only aggregate metadata.

    Even [] is incomplete: no cursor traversal, total or absence proof exists.
    statsPeriod selects timeline statistics, not a last-24h issue search filter.
    Synthetic probes, server health issues and browser exceptions are not
    classified by this helper, and must not be inferred from issue presence.
    """
    if len(body) > MAX_BYTES:
        raise SampleError("response_too_large")
    try:
        items = json.loads(body)
    except (ValueError, UnicodeError, RecursionError):
        raise SampleError("invalid_json") from None
    if not isinstance(items, list) or len(items) > 1:
        raise SampleError("invalid_sample_shape")
    slug = project.split("/", 1)[1]
    for issue in items:
        if not isinstance(issue, dict):
            raise SampleError("invalid_issue")
        identity = issue.get("project")
        if not isinstance(identity, dict) or identity.get("slug") != slug:
            raise SampleError("project_identity_unverified")
        ident = issue.get("id")
        if not isinstance(ident, str) or not re.fullmatch(r"[0-9]{1,128}", ident):
            raise SampleError("issue_identity_unverified")
        if issue.get("status") != "unresolved":
            raise SampleError("query_result_mismatch")
    return {
        "status": "partial",
        "metric_kind": "bounded_issue_sample",
        "sample_size": len(items),
        "unresolved_lower_bound": len(items),
        "total": None,
        "complete": False,
        "response_project_identity": "matched_slug" if items else "request_only",
        "browser_exception_capture": "not_evaluated",
        "synthetic_vs_real_events": "not_evaluated",
    }


def collect(project: str, token: str, opener=None) -> dict:
    if project not in PROJECTS:
        raise ValueError("unknown_project")
    url = f"{BASE}/{project}/issues/?{urlencode(QUERY)}"
    record = {
        "source": url,
        "requested_project": project,
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "query": QUERY.copy(),
        "issue_time_window": "not_filtered_by_statsPeriod",
        "max_pages": 1,
        "status": "unavailable",
        "complete": False,
        "total": None,
        "unresolved_lower_bound": None,
        "browser_exception_capture": "not_evaluated",
        "synthetic_vs_real_events": "not_evaluated",
    }
    try:
        request = Request(url, headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})
        with (opener or build_opener(NoRedirect())).open(request, timeout=TIMEOUT_SECONDS) as response:
            if response.status != 200:
                raise SampleError("unexpected_http_status")
            if response.headers.get_content_type() != "application/json":
                raise SampleError("unexpected_content_type")
            if response.headers.get("Content-Encoding", "identity").lower() != "identity":
                raise SampleError("unexpected_content_encoding")
            declared = response.headers.get("Content-Length")
            if declared is not None:
                if not re.fullmatch(r"[0-9]{1,10}", declared) or int(declared) > MAX_BYTES:
                    raise SampleError("invalid_content_length")
            body = response.read(MAX_BYTES + 1)
            if declared is not None and len(body) != int(declared):
                raise SampleError("truncated_response")
        record.update(sample(body, project))
    except SampleError as error:
        record["reason"] = str(error)
    except HTTPError as error:
        record["reason"] = "http_error"
        record["http_status"] = error.code
        error.close()
    except (URLError, OSError, socket.timeout, ValueError, HTTPException):
        record["reason"] = "transport_error"
    return record


def main() -> int:
    token = os.environ.get("SENTRY_AUTH_TOKEN", "")
    if not token or "\r" in token or "\n" in token:
        print(json.dumps({"status": "unavailable", "reason": "missing_or_invalid_token",
                          "complete": False, "total": None, "unresolved_lower_bound": None}))
        return 1
    failed = False
    for project in PROJECTS:
        record = collect(project, token)
        print(json.dumps(record, sort_keys=True))
        failed |= record["status"] == "unavailable"
    return int(failed)


if __name__ == "__main__":
    sys.exit(main())

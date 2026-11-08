"""Higgsfield Seedance 2.5 — text-to-video example.

Official SDK: https://docs.higgsfield.ai/docs/how-to/sdk
Model reference: bytedance/seedance-2.5/text-to-video

What this does:
  * Loads the Higgsfield credential (HF_KEY, "key-id:key-secret") from the
    server environment only. The key is never printed, logged or committed.
  * Submits a generation using the official SDK ``subscribe`` method with the
    exact parameters requested: prompt "A cinematic scene at sunset",
    duration 5, resolution 720p, aspect ratio 16:9.
  * Waits for the request to reach a terminal state and prints the generated
    video URL on success.
  * Treats ``failed``, ``canceled`` and ``nsfw`` (moderated) as failures and
    exits with a non-zero status WITHOUT claiming success.

Run (server-side, with the key available in the environment):
    HF_KEY='key-id:key-secret' python examples/seedance_text_to_video.py

NOTE: Every successful submission is a BILLABLE generation request.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

# --- Credential loading (server-side only) -------------------------------
# Priority: process environment (managed secrets) -> .env.local -> backend/.env.
# We never read/print the value itself; we only confirm it is present.
try:
    from dotenv import load_dotenv

    # A local, git-ignored override next to this app, if the operator uses one.
    load_dotenv(Path(__file__).resolve().parents[1] / ".env.local", override=False)
    # The platform injects managed backend secrets into this tmpfs file at runtime.
    load_dotenv(Path("/dev/shm/emergent/app.env"), override=False)
    # The platform may also persist managed backend secrets here.
    load_dotenv(Path("/app/backend/.env"), override=False)
except Exception:  # dotenv is optional; managed env may already be present.
    pass

from higgsfield_client import (  # noqa: E402
    Cancelled,
    Completed,
    Failed,
    NSFW,
    Status,
    subscribe,
)
from higgsfield_client.exceptions import (  # noqa: E402
    CredentialsMissedError,
    HiggsfieldClientError,
)

MODEL = "bytedance/seedance-2.5/text-to-video"
ARGUMENTS: dict[str, Any] = {
    "prompt": "A cinematic scene at sunset",
    "duration": 5,
    "resolution": "720p",
    "aspect_ratio": "16:9",
    "output_format": "mp4",
    "generate_audio": True,
}


def _find_video_url(result: Any) -> str | None:
    """Defensively extract a video URL from the completed response payload.

    The documented shape is ``{"video": {"url": ...}}`` but we also accept a
    few common variants so a minor schema change does not break detection.
    """
    if not isinstance(result, dict):
        return None

    video = result.get("video")
    if isinstance(video, dict) and isinstance(video.get("url"), str):
        return video["url"]

    videos = result.get("videos")
    if isinstance(videos, list) and videos:
        first = videos[0]
        if isinstance(first, dict) and isinstance(first.get("url"), str):
            return first["url"]
        if isinstance(first, str):
            return first

    # Last resort: recursively look for the first mp4/mov URL in the payload.
    def walk(node: Any) -> str | None:
        if isinstance(node, str) and node.startswith("http") and (
            ".mp4" in node or ".mov" in node
        ):
            return node
        if isinstance(node, dict):
            for value in node.values():
                found = walk(value)
                if found:
                    return found
        if isinstance(node, list):
            for value in node:
                found = walk(value)
                if found:
                    return found
        return None

    return walk(result)


def main() -> int:
    if not os.getenv("HF_KEY") and not (
        os.getenv("HF_API_KEY") and os.getenv("HF_API_SECRET")
    ):
        print(
            "BLOCKER: Higgsfield credential is not configured. "
            "Set HF_KEY ('key-id:key-secret') in the server environment.",
            file=sys.stderr,
        )
        return 2

    last_status: dict[str, Status | None] = {"value": None}

    def on_queue_update(status: Status) -> None:
        last_status["value"] = status
        print(f"  status: {type(status).__name__}")

    print(f"Submitting Seedance 2.5 generation: {ARGUMENTS['prompt']!r} ...")

    try:
        result = subscribe(MODEL, arguments=ARGUMENTS, on_queue_update=on_queue_update)
    except CredentialsMissedError:
        print("BLOCKER: Higgsfield credentials missing or invalid.", file=sys.stderr)
        return 2
    except HiggsfieldClientError as exc:
        message = str(exc).lower()
        if "not_enough_credits" in message or "credit" in message:
            print(
                "BLOCKER: Higgsfield account has insufficient credits to run this "
                "generation (API returned 'not_enough_credits'). Authentication "
                "succeeded; top up credits in the Higgsfield console and re-run.",
                file=sys.stderr,
            )
            return 3
        status = last_status["value"]
        if isinstance(status, NSFW):
            print("REJECTED: Request was flagged by content moderation (nsfw).", file=sys.stderr)
            return 1
        if isinstance(status, Cancelled):
            print("CANCELED: Request was canceled before processing.", file=sys.stderr)
            return 1
        if isinstance(status, Failed):
            print("FAILED: Generation failed.", file=sys.stderr)
            return 1
        print(f"ERROR: Higgsfield request failed: {exc!r}", file=sys.stderr)
        return 1
    except Exception as exc:  # network / terminal non-completed fetch, etc.
        status = last_status["value"]
        if isinstance(status, NSFW):
            print("REJECTED: Request was flagged by content moderation (nsfw).", file=sys.stderr)
            return 1
        if isinstance(status, Cancelled):
            print("CANCELED: Request was canceled before processing.", file=sys.stderr)
            return 1
        if isinstance(status, Failed):
            print("FAILED: Generation failed.", file=sys.stderr)
            return 1
        print(f"ERROR: Higgsfield request failed: {exc!r}", file=sys.stderr)
        return 1

    status = last_status["value"]

    # Explicitly handle every terminal state. Never treat non-completion as success.
    if isinstance(status, NSFW):
        print("REJECTED: Request was flagged by content moderation (nsfw).", file=sys.stderr)
        return 1
    if isinstance(status, Cancelled):
        print("CANCELED: Request was canceled before processing.", file=sys.stderr)
        return 1
    if isinstance(status, Failed):
        print("FAILED: Generation failed.", file=sys.stderr)
        return 1

    # Reaching here the SDK returned the completed response payload.
    if status is not None and not isinstance(status, Completed):
        print(f"ERROR: Unexpected terminal status: {type(status).__name__}", file=sys.stderr)
        return 1

    video_url = _find_video_url(result)
    if not video_url:
        print("ERROR: Completed response contained no video URL.", file=sys.stderr)
        print(f"  raw keys: {list(result) if isinstance(result, dict) else type(result)}", file=sys.stderr)
        return 1

    print("SUCCESS: generation completed.")
    print(f"VIDEO_URL: {video_url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""ElevenLabs voice drafts for videos (MED-02). Paid step: requires --confirm-cost and a character cap.

Outputs one MP3 per script segment plus a manifest (hashes, voices, characters, estimated duration).
Drafts are never approvals: every manifest carries status entwurf_stimme_nicht_freigegeben.
Usage:
  python3 tools/voice_production.py voices
  python3 tools/voice_production.py synthesize --script docs/production/begruessungsfilm-sprechtext.json \
      --out .local/voice-drafts --confirm-cost --max-chars 1500
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config/integrations/elevenlabs.json"


def _integrations():
    spec = importlib.util.spec_from_file_location("voice_gateway_integrations", ROOT / "apps/agent-gateway/integrations.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def synthesize(script_path, out_dir, api_key, max_chars, opener=urllib.request.urlopen, config_path=CONFIG, slug=None):
    tools = _integrations()
    config = json.loads(Path(config_path).read_text(encoding="utf-8"))
    script = json.loads(Path(script_path).read_text(encoding="utf-8"))
    voices = config["video_voices"]
    segments = script["segments"]
    total = sum(len(segment["text"]) for segment in segments)
    if total > max_chars:
        raise SystemExit(f"character_cap_exceeded: {total} > {max_chars}")
    unknown = {segment["speaker"] for segment in segments} - set(voices)
    if unknown:
        raise SystemExit(f"voice_mapping_missing: {sorted(unknown)}")
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True, mode=0o700)
    slug = slug or script["id"].lower()
    files = []
    for segment in segments:
        voice = voices[segment["speaker"]]
        service = tools.SpeechService(api_key, voice["voice_id"], out / ".cache", model_id=config["model_id"], daily_cap=len(segments),
                                      texts={("segment", "de"): segment["text"]}, opener=opener)
        audio = service.audio("segment", "de")
        name = f"{slug}-{segment['id']}.mp3"
        (out / name).write_bytes(audio)
        files.append({"file": name, "segment": segment["id"], "speaker": segment["speaker"], "voice_id": voice["voice_id"],
                      "voice_name": voice["voice_name"], "characters": len(segment["text"]), "bytes": len(audio),
                      "sha256": hashlib.sha256(audio).hexdigest(),
                      "estimated_seconds_cbr128": round(len(audio) * 8 / 128000, 1)})
    manifest = {"schema_version": 1, "script": str(script_path), "script_sha256": hashlib.sha256(Path(script_path).read_bytes()).hexdigest(),
                "model_id": config["model_id"], "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "characters_billed_estimate": total, "status": "entwurf_stimme_nicht_freigegeben",
                "estimated_total_seconds": round(sum(item["estimated_seconds_cbr128"] for item in files), 1),
                "target_seconds": script.get("target_seconds"), "files": files,
                "not_claimed": ["voice approval", "final mix", "video export", "lip sync"]}
    (out / f"{slug}-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("voices")
    run = sub.add_parser("synthesize")
    run.add_argument("--script", type=Path, required=True)
    run.add_argument("--out", type=Path, default=ROOT / ".local/voice-drafts")
    run.add_argument("--max-chars", type=int, required=True)
    run.add_argument("--confirm-cost", action="store_true")
    args = parser.parse_args(argv)
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise SystemExit("ELEVENLABS_API_KEY missing")
    if args.command == "voices":
        tools = _integrations()
        _, raw, _ = tools.request("GET", "https://api.elevenlabs.io/v2/voices?page_size=100", {"xi-api-key": api_key})
        for voice in json.loads(raw)["voices"]:
            labels = voice.get("labels") or {}
            print(voice["voice_id"], voice["name"], labels.get("language", ""), labels.get("gender", ""), sep=" | ")
        return 0
    if not args.confirm_cost:
        raise SystemExit("paid_step_requires --confirm-cost")
    manifest = synthesize(args.script, args.out, api_key, args.max_chars)
    print(json.dumps({"status": manifest["status"], "files": [item["file"] for item in manifest["files"]],
                      "estimated_total_seconds": manifest["estimated_total_seconds"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())

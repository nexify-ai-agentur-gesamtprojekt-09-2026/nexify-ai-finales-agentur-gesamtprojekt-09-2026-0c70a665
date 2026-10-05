#!/usr/bin/env python3
"""Erzeugt das Release-Nachweisgeruest aus den Anforderungen.

Alle 42 Anforderungs-IDs werden angelegt; status bleibt offen, damit der
Validator einen unvollstaendigen Nachweis ablehnt statt ihn zu bestehen.

usage: make-evidence.py <commit_sha> <artifact_pfad> <ausgabe.json>
"""

import datetime
import hashlib
import json
import pathlib
import sys


def main() -> int:
    commit, artifact_path, output = sys.argv[1], sys.argv[2], sys.argv[3]
    root = pathlib.Path(__file__).resolve().parent.parent
    requirements = json.loads((root / "ci" / "requirements.json").read_text())
    artifact = (root / artifact_path).resolve()
    digest = hashlib.sha256(artifact.read_bytes()).hexdigest() if artifact.is_file() else ""

    evidence = {
        "commit_sha": commit,
        "tested_at": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
        "artifact": {"path": artifact_path, "sha256": digest},
        "open_blockers": [],
        "requirements": [
            {"id": row["id"], "status": "open", "owner": "", "evidence_paths": []}
            for row in requirements["requirements"]
        ],
        "approvals": [
            {"role": role, "reviewer": "", "commit_sha": commit, "evidence_path": ""}
            for role in ("technical", "domain", "privacy_legal", "operations")
        ],
    }
    pathlib.Path(output).write_text(json.dumps(evidence, indent=2, ensure_ascii=False) + "\n")
    print(f"Nachweisgeruest geschrieben: {output} ({len(evidence['requirements'])} Anforderungen)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

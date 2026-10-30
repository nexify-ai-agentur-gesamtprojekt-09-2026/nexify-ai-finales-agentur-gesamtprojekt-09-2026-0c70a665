"""Surgically update drifted sha256 values in config/acceptance-coverage.json
via exact string replacement (no global reformat / no \\u re-escaping)."""
import json
import hashlib
from pathlib import Path

REG = Path("config/acceptance-coverage.json")
raw = REG.read_text(encoding="utf-8")
d = json.loads(raw)
sh = d["source_sha256"]

changes = []
for key, recorded in sh.items():
    p = Path(key)
    if not p.is_file():
        continue
    actual = hashlib.sha256(p.read_bytes()).hexdigest()
    if actual != recorded:
        changes.append((key, recorded, actual))

for key, old, new in changes:
    if old in raw:
        raw = raw.replace(old, new)
        print(f"updated {key}: {old[:12]} -> {new[:12]}")
    else:
        print(f"already-updated (shared-content hash) {key}: expecting {new[:12]}")

REG.write_text(raw, encoding="utf-8")

# verify round-trip parses and no drift remains
d2 = json.loads(REG.read_text(encoding="utf-8"))
remaining = []
for key, recorded in d2["source_sha256"].items():
    p = Path(key)
    if p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest() != recorded:
        remaining.append(key)
print("changes:", len(changes), "remaining drift:", remaining)

#!/usr/bin/env python3
"""Fasst mehrere JSON-Ausgaben von tools/page_quality_audit.py zu einem Bericht zusammen."""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

findings, pages = [], 0
for name in sys.argv[1:]:
    data = json.loads(Path(name).read_text(encoding="utf-8"))
    findings += data["findings"]
    pages += len(data["pages"])
by = Counter((f["level"], f["group"]) for f in findings)
print(f"{pages} Seitenläufe, {len(findings)} Befunde")
for (lvl, grp), n in sorted(by.items()):
    print(f"  {lvl:8} {grp:5} {n}")
agg = defaultdict(list)
for f in findings:
    key = (f["level"], f["group"], re.sub(r"[0-9]+(\.[0-9]+)?", "#", f["text"])[:140])
    agg[key].append(f["id"] + ("/m" if f["viewport"] == "mobil" else ""))
order = {"FEHLER": 0, "WARNUNG": 1, "HINWEIS": 2}
for (lvl, grp, txt), ids in sorted(agg.items(), key=lambda kv: (order[kv[0][0]], -len(kv[1]))):
    print(f"- [{lvl}/{grp}] {txt}  ← {len(ids)}× ({', '.join(sorted(set(ids))[:8])}{'…' if len(set(ids)) > 8 else ''})")
sys.exit(1 if any(f["level"] == "FEHLER" for f in findings) else 0)

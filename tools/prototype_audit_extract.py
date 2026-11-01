#!/usr/bin/env python3
"""Read-only: extract on-page instructions (TODO(BACKEND), data-api-endpoint, forms, validations, states, calculations, handoff text) from prototypen/*.dc.html."""
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HANDOFF = re.compile(r"handoff|backend|todo|endpoint|api[ -]|idempot|validier|pflicht|muss |soll |zustand|state|leer(zustand)?|fehlerfall|erfolg|berechn|formel|platzhalter|mock|demo|nicht live|später|phase", re.I)
STATE = re.compile(r"\b(loading|empty|error|success|disabled|leer|lädt|fehler|erfolgreich|gesendet|gespeichert|bestätigt|keine treffer|nicht verfügbar)\b", re.I)


class Extract(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.texts, self.fields, self.buttons, self.endpoints, self.forms = [], [], [], [], [], 0
        self.in_script = self.in_style = False
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "script":
            self.in_script = True
        if tag == "style":
            self.in_style = True
        if tag == "form":
            self.forms += 1
        if a.get("data-api-endpoint"):
            self.endpoints.append({"endpoint": a["data-api-endpoint"], "tag": tag, "label": a.get("aria-label") or a.get("data-testid") or ""})
        if tag in ("input", "select", "textarea"):
            rules = {k: a[k] for k in ("required", "pattern", "min", "max", "minlength", "maxlength", "type", "inputmode", "autocomplete") if k in a}
            self.fields.append({"name": a.get("name") or a.get("id") or a.get("placeholder") or a.get("aria-label") or tag, "rules": rules})
        self.stack.append((tag, a))

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_script = False
        if tag == "style":
            self.in_style = False
        while self.stack:
            t, _ = self.stack.pop()
            if t == tag:
                break

    def handle_data(self, data):
        text = " ".join(data.split())
        if self.in_script:
            self.scripts.append(data)
            return
        if self.in_style or not text:
            return
        tag = self.stack[-1][0] if self.stack else ""
        if tag in ("button", "a") and 1 < len(text) < 60:
            self.buttons.append(text)
        self.texts.append(text)

    def handle_comment(self, data):
        if "TODO" in data:
            self.texts.append("<!-- " + " ".join(data.split()) + " -->")


def extract(path):
    raw = path.read_text(encoding="utf-8", errors="replace")
    parser = Extract()
    parser.feed(raw)
    script = "\n".join(parser.scripts)
    dc = "\n".join(re.findall(r'<script type="text/x-dc"[^>]*>(.*?)</script>', raw, re.S))
    skip = {"if", "for", "while", "switch", "catch", "function", "return", "componentDidMount", "componentWillUnmount", "componentDidUpdate", "renderVals", "t", "applyLang", "setLang", "applyLocale"}
    logic = [n for n in dict.fromkeys(re.findall(r"^\s*(?:async\s+)?([a-zA-Z_]\w*)\s*\([^)]*\)\s*\{", dc, re.M)) if n not in skip]
    todos = sorted({" ".join(m.split())[:240] for m in re.findall(r"TODO\(BACKEND\)[^\n<]*", raw)})
    js_calls = sorted(set(re.findall(r"\bfunction\s+([A-Za-z_]\w*)", script)) | set(re.findall(r"\b(?:const|let)\s+([A-Za-z_]\w*)\s*=\s*\([^)]*\)\s*=>", script)))
    calc = sorted({n for n in js_calls if re.search(r"calc|berech|price|preis|total|sum|tax|mwst|vat|score|match|fit|size|load|index|rate|cost", n, re.I)})
    validations = sorted({n for n in js_calls if re.search(r"valid|check|pruef|verify|sanit", n, re.I)})
    handoff = []
    for t in parser.texts:
        if len(t) > 25 and HANDOFF.search(t) and t not in handoff:
            handoff.append(t[:300])
    states = sorted({m.group(0).lower() for t in parser.texts for m in STATE.finditer(t)})
    title = re.search(r"<title>(.*?)</title>", raw, re.S)
    return {"file": "prototypen/" + path.name, "title": html.unescape(title.group(1).strip()) if title else path.name,
            "todo_backend": todos, "api_endpoints": parser.endpoints, "forms": parser.forms,
            "fields": parser.fields[:60], "actions": sorted(set(parser.buttons))[:80], "states": states,
            "calculations": calc[:40], "logic_methods": logic[:60], "validations": validations[:40], "handoff_texts": handoff[:40]}


if __name__ == "__main__":
    files = sorted(p for p in (ROOT / "prototypen").glob("*.html") if p.name != "index.html")
    out = [extract(p) for p in files]
    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)

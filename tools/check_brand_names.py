#!/usr/bin/env python3
"""Meldet alte und verbotene Schreibweisen der Marken- und Produktnamen.

Nur lesend, kein Gate: Das Werkzeug durchsucht ``config/`` und ``apps/web``
nach den Mustern aus ``config/brand-names.json`` und gibt jede Fundstelle als
``Datei:Zeile`` aus. Es ändert keine Datei und endet auch bei Fundstellen mit
Exit-Code 0. Exit-Code 2 gibt es nur, wenn die Regeldatei selbst fehlt oder
nicht lesbar ist – dann wurde nichts geprüft.

Grenzen, die man kennen muss:

* Geprüft wird zeilenweise. Ein Name, der im Quelltext über zwei Zeilen
  gesetzt ist, wird nicht als Ganzes erkannt.
* Die Muster beachten Groß- und Kleinschreibung. Technische Kennungen in
  Kleinschreibung (``nex2fly``, ``teileklar``, ``oracle``) werden nicht gemeldet.
* Eine Fundstelle ist ein Hinweis, kein Urteil: In ``config/fakten.json`` und
  in Quellenangaben stehen alte Namen zum Teil zu Recht.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator

ROOT = Path(__file__).resolve().parents[1]
RULES = "config/brand-names.json"
DEFAULT_PATHS = ("config", "apps/web")
SKIP_DIRS = {
    "node_modules", ".next", ".git", ".turbo", ".vercel", "dist", "build",
    "out", "coverage", "__pycache__", ".cache",
}
TEXT_SUFFIXES = {
    ".json", ".jsonc", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css",
    ".md", ".mdx", ".html", ".txt", ".yml", ".yaml", ".toml", ".py", ".sql",
    ".svg", ".xml", ".webmanifest",
}
MAX_BYTES = 4 * 1024 * 1024
EXCERPT = 120


class RulesError(Exception):
    """Die Regeldatei fehlt oder ist unbrauchbar."""


@dataclass(frozen=True)
class Rule:
    rule_id: str
    spelling: str
    canonical: str
    grade: str
    pattern: re.Pattern[str]


@dataclass(frozen=True)
class Finding:
    path: str
    line: int
    rule: Rule
    match: str
    excerpt: str


def load_rules(rules_path: Path) -> list[Rule]:
    try:
        data = json.loads(rules_path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise RulesError(f"{rules_path}: {error}") from error
    rules: list[Rule] = []
    seen: set[str] = set()

    def add(entry: dict, canonical: str, grade: str) -> None:
        rule_id = entry.get("id")
        raw = entry.get("muster")
        if not rule_id or not raw:
            raise RulesError(f"{rules_path}: Eintrag ohne id oder muster: {entry!r}")
        if rule_id in seen:
            raise RulesError(f"{rules_path}: doppelte id {rule_id}")
        seen.add(rule_id)
        try:
            pattern = re.compile(raw)
        except re.error as error:
            raise RulesError(f"{rules_path}: Muster {rule_id} ungültig: {error}") from error
        rules.append(Rule(rule_id, entry.get("schreibweise", raw), canonical, grade, pattern))

    for name in data.get("names", []):
        for entry in name.get("verbotene_schreibweisen", []):
            add(entry, name.get("kanonisch", ""), entry.get("einstufung", "alt"))
    for entry in data.get("kundentext_jargon", {}).get("gemeldet", []):
        add(entry, "", "jargon")
    if not rules:
        raise RulesError(f"{rules_path}: keine Muster gefunden")
    return rules


def iter_files(root: Path, paths: Iterable[str], rules_path: Path) -> Iterator[Path]:
    for relative in paths:
        base = (root / relative).resolve()
        if base.is_file():
            candidates: Iterable[Path] = [base]
        elif base.is_dir():
            candidates = sorted(base.rglob("*"))
        else:
            continue
        for path in candidates:
            if not path.is_file() or path.is_symlink():
                continue
            if SKIP_DIRS.intersection(path.relative_to(root).parts[:-1]):
                continue
            if path.suffix.lower() not in TEXT_SUFFIXES:
                continue
            if path.resolve() == rules_path.resolve():
                continue
            try:
                if path.stat().st_size > MAX_BYTES:
                    continue
            except OSError:
                continue
            yield path


def scan(root: Path, paths: Iterable[str], rules: list[Rule], rules_path: Path) -> list[Finding]:
    findings: list[Finding] = []
    for path in iter_files(root, paths, rules_path):
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        shown = path.relative_to(root).as_posix()
        for number, line in enumerate(text.splitlines(), start=1):
            for rule in rules:
                for hit in rule.pattern.finditer(line):
                    start = max(0, hit.start() - EXCERPT // 2)
                    excerpt = line[start:start + EXCERPT].strip()
                    findings.append(Finding(shown, number, rule, hit.group(0), excerpt))
    return findings


def summarize(findings: list[Finding], rules: list[Rule]) -> list[dict]:
    hits = Counter(finding.rule.rule_id for finding in findings)
    files: dict[str, set[str]] = {}
    for finding in findings:
        files.setdefault(finding.rule.rule_id, set()).add(finding.path)
    return [
        {
            "id": rule.rule_id,
            "schreibweise": rule.spelling,
            "kanonisch": rule.canonical,
            "einstufung": rule.grade,
            "treffer": hits.get(rule.rule_id, 0),
            "dateien": len(files.get(rule.rule_id, ())),
        }
        for rule in rules
    ]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", default=str(ROOT), help="Wurzel des Repositorys")
    parser.add_argument("--rules", default=None, help=f"Regeldatei (Standard: {RULES})")
    parser.add_argument("--paths", nargs="+", default=list(DEFAULT_PATHS), help="Suchbereiche relativ zur Wurzel")
    parser.add_argument("--summary", action="store_true", help="nur die Zählung je Schreibweise ausgeben")
    parser.add_argument("--json", action="store_true", help="Ergebnis als JSON ausgeben")
    args = parser.parse_args(argv)

    root = Path(args.root).resolve()
    rules_path = Path(args.rules).resolve() if args.rules else root / RULES
    try:
        rules = load_rules(rules_path)
    except RulesError as error:
        print(f"Regeldatei unbrauchbar, nichts geprüft: {error}", file=sys.stderr)
        return 2

    findings = scan(root, args.paths, rules, rules_path)
    summary = summarize(findings, rules)

    if args.json:
        payload = {
            "gate": False,
            "geaendert": False,
            "suchbereiche": list(args.paths),
            "treffer_gesamt": len(findings),
            "zaehlung": summary,
            "fundstellen": [] if args.summary else [
                {"datei": f.path, "zeile": f.line, "id": f.rule.rule_id, "einstufung": f.rule.grade, "treffer": f.match, "auszug": f.excerpt}
                for f in findings
            ],
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    if not args.summary:
        for f in findings:
            print(f"{f.path}:{f.line}: [{f.rule.grade}] {f.rule.rule_id} „{f.match}“ – {f.excerpt}")
        if findings:
            print()
    print(f"Namensprüfung (nur Meldung, kein Gate) – Suchbereiche: {', '.join(args.paths)}")
    print(f"{'Treffer':>8} {'Dateien':>8}  {'Einstufung':<11} Schreibweise  →  kanonisch")
    for row in summary:
        target = f"  →  {row['kanonisch']}" if row["kanonisch"] else ""
        print(f"{row['treffer']:>8} {row['dateien']:>8}  {row['einstufung']:<11} {row['schreibweise']}{target}")
    print(f"{len(findings):>8} Treffer gesamt. Es wurde nichts geändert.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

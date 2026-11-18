#!/usr/bin/env python3
"""Prueft das Register der Selbstkonfiguration gegen seine Quellen.

Das Register behauptet, woraus Agenten ihre Vorgaben ableiten. Der Pruefer
stellt sicher, dass jede genannte Quelle existiert, dass jede Ableitung eine
bekannte Quelle nennt, dass jede Grenze auf eine Entscheidung zeigt und dass
die Goal-Automatik nicht mehr darf als die Grenzen erlauben.
"""
from __future__ import annotations

import json
import re
import shlex
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTER = "config/selbstkonfiguration.json"
DECISION_ENTRY = re.compile(r"^## (D-\d{3}) ", re.M)
SECRET_PATTERNS = [
    re.compile(r"(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{16,}"),
    re.compile(r"cm_pro_[A-Za-z0-9_-]{16,}"),
    re.compile(r"pcp_board_[A-Za-z0-9_-]{16,}"),
    re.compile(r"Bearer\s+[A-Za-z0-9._~-]{20,}"),
    re.compile(r"BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY"),
]
TOP_LEVEL = ("schema_version", "id", "status", "authority", "scope", "sources",
             "derivation_rules", "limits", "gates", "goal_automation")


def _unique_ids(items, label, errors):
    ids = [item.get("id") for item in items if isinstance(item, dict)]
    if any(not isinstance(i, str) or not i for i in ids):
        errors.append(f"{label}: jede Zeile braucht eine id")
    if len(set(ids)) != len(ids):
        errors.append(f"{label}: ids sind nicht eindeutig")


def _gate_exists(command, root):
    try:
        tokens = shlex.split(command)
    except ValueError:
        return False
    if not tokens:
        return False
    if tokens[0] == "python3" and len(tokens) > 1:
        if tokens[1] == "-m":
            if len(tokens) < 3:
                return False
            if tokens[2] == "unittest":
                if "-p" not in tokens:
                    return False
                pattern = tokens[tokens.index("-p") + 1]
                return any((root / "tests").glob(pattern))
            module = tokens[2].replace(".", "/")
            return (root / f"{module}.py").is_file() or (root / module / "__init__.py").is_file()
        return (root / tokens[1]).is_file()
    if tokens[0] == "make" and len(tokens) > 1:
        makefile = root / "Makefile"
        if not makefile.is_file():
            return False
        return re.search(rf"^{re.escape(tokens[1])}:", makefile.read_text(), re.M) is not None
    return (root / tokens[0]).exists()


def validate(register, root=ROOT):
    errors = []
    if not isinstance(register, dict):
        return ["Register muss ein Objekt sein"]
    for key in TOP_LEVEL:
        if key not in register:
            errors.append(f"Pflichtfeld fehlt: {key}")
    if errors:
        return errors

    decisions_path = root / "DECISIONS.md"
    decisions = decisions_path.read_text(encoding="utf-8") if decisions_path.is_file() else ""
    decision_ids = set(DECISION_ENTRY.findall(decisions))

    authority = register.get("authority") or {}
    if not isinstance(authority, dict):
        errors.append("authority muss ein Objekt sein")
        authority = {}
    for key in ("decision", "owner", "date", "interaction"):
        if not authority.get(key):
            errors.append(f"authority.{key} fehlt")
    decision_ref = str(authority.get("decision", "")).split("#")[-1]
    if decision_ref and decision_ref not in decision_ids:
        errors.append(f"authority.decision zeigt auf {decision_ref}, das in DECISIONS.md fehlt")
    interaction = str(authority.get("interaction", ""))
    if interaction and interaction not in decisions:
        errors.append("authority.interaction ist in DECISIONS.md nicht belegt")

    scope = register.get("scope") or {}
    if not isinstance(scope, dict) or not scope.get("applies_to"):
        errors.append("scope.applies_to ist leer")

    sources = register.get("sources")
    if not isinstance(sources, list) or not sources:
        return errors + ["sources muss eine nichtleere Liste sein"]
    _unique_ids(sources, "sources", errors)
    source_ids = {s.get("id") for s in sources if isinstance(s, dict)}
    for source in sources:
        if not isinstance(source, dict) or not source.get("path") or not source.get("role"):
            errors.append("Quelle braucht path und role")
            continue
        if not (root / source["path"]).is_file():
            errors.append(f"Quelle fehlt im Baum: {source['path']}")
    if not {s.get("id") for s in sources if isinstance(s, dict) and s.get("required")} >= {"S1", "S2"}:
        errors.append("AGENTS.md und DECISIONS.md muessen als Pflichtquellen gefuehrt sein")

    rules = register.get("derivation_rules")
    if not isinstance(rules, list) or not rules:
        errors.append("derivation_rules muss eine nichtleere Liste sein")
        rules = []
    _unique_ids(rules, "derivation_rules", errors)
    for rule in rules:
        if not isinstance(rule, dict) or not rule.get("rule"):
            errors.append("Ableitungsregel braucht rule")
            continue
        refs = rule.get("from")
        if not isinstance(refs, list) or not refs:
            errors.append(f"Ableitungsregel {rule.get('id')} nennt keine Quelle")
        elif any(ref not in source_ids for ref in refs):
            errors.append(f"Ableitungsregel {rule.get('id')} nennt eine unbekannte Quelle")

    limits = register.get("limits")
    if not isinstance(limits, list) or not limits:
        errors.append("limits muss eine nichtleere Liste sein")
        limits = []
    _unique_ids(limits, "limits", errors)
    for limit in limits:
        if not isinstance(limit, dict) or not limit.get("rule"):
            errors.append("Grenze braucht rule")
            continue
        ref = str(limit.get("from", "")).split("#")[-1]
        if not ref:
            errors.append(f"Grenze {limit.get('id')} nennt keine Entscheidung")
        elif ref not in decision_ids:
            errors.append(f"Grenze {limit.get('id')} zeigt auf {ref}, das in DECISIONS.md fehlt")

    gates = register.get("gates")
    if not isinstance(gates, list) or not gates:
        errors.append("gates muss eine nichtleere Liste sein")
        gates = []
    _unique_ids(gates, "gates", errors)
    for gate in gates:
        if not isinstance(gate, dict) or not gate.get("command"):
            errors.append("Gate braucht command")
            continue
        if not _gate_exists(gate["command"], root):
            errors.append(f"Gate {gate.get('id')} verweist auf ein fehlendes Werkzeug: {gate['command']}")

    automation = register.get("goal_automation")
    if not isinstance(automation, dict):
        errors.append("goal_automation muss ein Objekt sein")
    else:
        if not automation.get("trigger"):
            errors.append("goal_automation.trigger fehlt")
        steps = automation.get("steps")
        if not isinstance(steps, list) or len(steps) < 5:
            errors.append("goal_automation braucht mindestens fuenf Schritte")
        stops = automation.get("stop_conditions")
        if not isinstance(stops, list) or len(stops) < 2:
            errors.append("goal_automation braucht mindestens zwei Haltebedingungen")
        if automation.get("automatic_main_merge") is not False:
            errors.append("goal_automation darf keinen automatischen Merge nach main erlauben")
        if automation.get("automatic_production_deployment") is not False:
            errors.append("goal_automation darf keine automatische Produktivauslieferung erlauben")

    text = json.dumps(register, ensure_ascii=False)
    for pattern in SECRET_PATTERNS:
        if pattern.search(text):
            errors.append("Register enthaelt ein Secret-Muster")
            break
    return errors


def main() -> int:
    path = ROOT / REGISTER
    if not path.is_file():
        print(f"FAIL: Register fehlt: {REGISTER}")
        return 1
    errors = validate(json.loads(path.read_text(encoding="utf-8")))
    for error in errors:
        print("FAIL:", error)
    if not errors:
        print("Selbstkonfiguration OK: Quellen, Ableitungen, Grenzen und Goal-Automatik sind gebunden.")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())

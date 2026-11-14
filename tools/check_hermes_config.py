#!/usr/bin/env python3
"""Prüft, dass ops/hermes/home/config.yaml nicht von config/llm-policy.json abweicht.

Nur lesend und offline: kein Modellaufruf, kein Schlüssel, keine Aussage über den
Server. Geprüft werden Modellkennung, Reasoning, Anbieter, das Fehlen jeder
Ausweichkette und jedes eingetragenen Geheimnisses sowie die Bindung an den
Hermes-Commit des Team-Runtime-Kandidaten. Übereinstimmung der Dateien ist
keine Laufzeitabnahme.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = "ops/hermes/home/config.yaml"
ENV_EXAMPLE = "ops/hermes/home/.env.example"
POLICY = "config/llm-policy.json"
CANDIDATE = "config/integrations/nexify-team-runtime-candidate.json"
PROVIDERS = {"OpenRouter": "openrouter"}
SECRET_KEYS = {"api_key", "key_cmd", "token", "password", "secret", "extra_headers"}
ENV_REF = re.compile(r"^\$\{(env:)?[A-Z][A-Z0-9_]*\}(/[\w./-]*)?$")
SECRET_VALUE = re.compile(r"sk-[A-Za-z0-9_-]{8,}|Bearer\s+\S{8,}", re.I)


class ConfigError(ValueError):
    pass


def _scalar(text: str):
    text = text.strip()
    if text in ("[]", "{}"):
        return [] if text == "[]" else {}
    if len(text) >= 2 and text[0] == text[-1] and text[0] in "'\"":
        return text[1:-1]
    low = text.lower()
    if low in ("true", "false"):
        return low == "true"
    if low in ("null", "~", ""):
        return None
    if re.fullmatch(r"-?\d+", text):
        return int(text)
    if text[0] in "[{&*!|>%@`":
        raise ConfigError(f"nicht unterstützte YAML-Form: {text}")
    return text


def parse_yaml(text: str):
    """Kleine YAML-Teilmenge: verschachtelte Zuordnungen, Listen aus Skalaren, Skalare.

    Bewusst eng, damit die Prüfung ohne Fremdpaket läuft; alles andere ist ein Fehler.
    """
    rows = []
    for number, raw in enumerate(text.splitlines(), 1):
        if "\t" in raw:
            raise ConfigError(f"Zeile {number}: Tabulator")
        line = raw.rstrip()
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        stripped = line.lstrip()
        if not (len(stripped) > 1 and stripped[0] in "'\"" and stripped[-1] == stripped[0]):
            line = re.sub(r"\s+#.*$", "", line)
        rows.append((len(line) - len(line.lstrip()), line.strip(), number))

    def block(index: int, indent: int):
        if rows[index][1].startswith("- "):
            items = []
            while index < len(rows) and rows[index][0] == indent and rows[index][1].startswith("- "):
                items.append(_scalar(rows[index][1][2:]))
                index += 1
            return items, index
        mapping = {}
        while index < len(rows) and rows[index][0] == indent:
            _, content, number = rows[index]
            match = re.fullmatch(r"([A-Za-z_][\w.-]*):(?:\s+(.*))?", content)
            if not match:
                raise ConfigError(f"Zeile {number}: keine Zuordnung")
            key, value = match.group(1), match.group(2)
            if key in mapping:
                raise ConfigError(f"Zeile {number}: doppelter Schlüssel {key}")
            index += 1
            if value is None:
                if index < len(rows) and rows[index][0] > indent:
                    mapping[key], index = block(index, rows[index][0])
                else:
                    mapping[key] = None
            else:
                mapping[key] = _scalar(value)
        if index < len(rows) and rows[index][0] > indent:
            raise ConfigError(f"Zeile {rows[index][2]}: unerwartete Einrückung")
        return mapping, index

    if not rows:
        return {}
    result, end = block(0, rows[0][0])
    if end != len(rows) or rows[0][0] != 0:
        raise ConfigError("Einrückung nicht auflösbar")
    return result


def _walk(node, path=()):
    if isinstance(node, dict):
        for key, value in node.items():
            yield from _walk(value, path + (key,))
    elif isinstance(node, list):
        for index, value in enumerate(node):
            yield from _walk(value, path + (str(index),))
    else:
        yield path, node


def validate(config: dict, policy: dict, candidate: dict, env_example: str) -> list[str]:
    """Liste der Abweichungen; leer heißt: Dateien stimmen mit der Vorgabe überein."""
    errors = []
    model = policy["model"]
    want_id, want_effort = model["id"], model["reasoning_effort"]
    want_provider = PROVIDERS.get(model["primary_provider"])
    if not want_id.endswith(model["required_suffix"]):
        errors.append("policy_suffix")
    if want_provider is None:
        errors.append("policy_provider_unbekannt")

    cfg_model = config.get("model") or {}
    if not isinstance(cfg_model, dict):
        return errors + ["model_form"]
    if cfg_model.get("default") != want_id or "model" in cfg_model:
        errors.append("model_id")
    if cfg_model.get("provider") != want_provider:
        errors.append("model_provider")
    if cfg_model.get("base_url") not in (None, ""):
        errors.append("model_base_url")

    agent = config.get("agent") or {}
    if agent.get("reasoning_effort") != want_effort:
        errors.append("reasoning_effort")
    if agent.get("reasoning_overrides"):
        errors.append("reasoning_overrides")

    routing = policy["routing"]
    if routing["silent_model_fallback"] is False:
        if config.get("fallback_providers") != [] or "fallback_model" in config:
            errors.append("fallback_providers")
        if "fallback" in config or "providers" in config or "custom_providers" in config:
            errors.append("zusatzroute")
        delegation = config.get("delegation") or {}
        if delegation.get("fallback_providers") != []:
            errors.append("delegation_fallback")
        if any(delegation.get(key) for key in ("model", "provider", "base_url", "backend", "backends", "request_overrides")):
            errors.append("delegation_route")
        for name, task in (config.get("auxiliary") or {}).items():
            task = task or {}
            if any(task.get(key) for key in ("model", "base_url", "fallback_chain", "extra_body")) or task.get("provider") not in (None, "auto"):
                errors.append(f"auxiliary_route:{name}")
        cron = config.get("cron") or {}
        if cron.get("model") or cron.get("model_provider"):
            errors.append("cron_route")
    if routing["silent_reasoning_downgrade"] is False:
        for name, task in (config.get("auxiliary") or {}).items():
            if "reasoning_effort" in (task or {}) and task["reasoning_effort"] != want_effort:
                errors.append(f"auxiliary_reasoning:{name}")
        if (config.get("provider_routing") or {}).get("require_parameters") is not True:
            errors.append("require_parameters")

    for path, value in _walk(config):
        if any(part.lower() in SECRET_KEYS for part in path):
            errors.append("geheimnis_feld:" + ".".join(path))
        if isinstance(value, str) and (SECRET_VALUE.search(value) or ("${" in value and not ENV_REF.match(value))):
            errors.append("geheimnis_wert:" + ".".join(path))

    names = []
    for line in env_example.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        name, separator, value = line.partition("=")
        if not separator or not re.fullmatch(r"[A-Z][A-Z0-9_]*", name) or value.strip():
            errors.append("env_example_wert:" + name.strip())
        names.append(name)
    if "OPENROUTER_API_KEY" not in names:
        errors.append("env_example_schluesselname")
    referenced = {m.group(2) for _, v in _walk(config) if isinstance(v, str) for m in re.finditer(r"\$\{(env:)?([A-Z][A-Z0-9_]*)\}", v)}
    if not referenced <= set(names):
        errors.append("env_example_unvollstaendig")

    hermes = next((r for r in candidate["runtime_candidates"] if r["id"] == "hermes-candidate"), None)
    if candidate.get("status") != "candidate_not_runtime_activation" or hermes is None or hermes.get("connected") is not False:
        errors.append("kandidat_status")
    if candidate.get("model_policy_ref") != POLICY:
        errors.append("kandidat_policy_ref")
    return errors


def check(root: Path = ROOT) -> dict:
    config = parse_yaml((root / CONFIG).read_text(encoding="utf-8"))
    policy = json.loads((root / POLICY).read_text(encoding="utf-8"))
    candidate = json.loads((root / CANDIDATE).read_text(encoding="utf-8"))
    errors = validate(config, policy, candidate, (root / ENV_EXAMPLE).read_text(encoding="utf-8"))
    return {
        "status": "hermes_config_matches_policy_not_runtime_proof" if not errors else "hermes_config_deviates",
        "errors": errors,
        "model": (config.get("model") or {}).get("default"),
        "reasoning_effort": (config.get("agent") or {}).get("reasoning_effort"),
        "provider_calls": 0,
    }


def main() -> int:
    try:
        result = check()
    except (ConfigError, KeyError, TypeError, OSError, json.JSONDecodeError) as error:
        result = {"status": "hermes_config_invalid", "errors": [str(error)], "provider_calls": 0}
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0 if result["status"].startswith("hermes_config_matches") else 2


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Enforce explicit agency/customer ownership and source-provenance boundaries."""
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def validate(policy, root, ancestors):
    errors = []
    if not isinstance(policy, dict):
        return ["Source policy must be an object"]
    raw_sources = policy.get("sources")
    if not isinstance(raw_sources, list) or not raw_sources or any(not isinstance(s, dict) for s in raw_sources):
        return ["Explicit source classifications are required"]
    source_ids = [s.get("id") for s in raw_sources]
    if any(not isinstance(s, str) or not s for s in source_ids) or len(set(source_ids)) != len(source_ids):
        return ["Source identities must be explicit and unique"]
    paths = policy.get("forbidden_agency_paths")
    if (not isinstance(paths, list) or not paths or any(not isinstance(p, str) or not p
            or Path(p).is_absolute() or ".." in Path(p).parts or "\\" in p for p in paths)):
        return ["A nonempty repository-relative customer-path exclusion list is required"]
    heads = policy.get("excluded_customer_history_heads")
    if (not isinstance(heads, list) or not heads or any(not isinstance(h, str)
            or re.fullmatch(r"[a-f0-9]{40}", h) is None for h in heads)):
        return ["A nonempty list of full customer commit identities is required"]
    adopted = policy.get("adopted_customer_components")
    if not isinstance(adopted, list):
        return ["Component adoption records must be an explicit list"]
    sources = {source["id"]: source for source in raw_sources}
    customer = sources.get("A1", {})
    if customer.get("classification") != "external_customer_project" or customer.get("status") != "paused":
        errors.append("Affilinet must remain an external paused customer project")
    for key in ("agency_runtime_membership", "agency_delivery_dependency", "whole_project_import_allowed"):
        if customer.get(key) is not False:
            errors.append("Customer project must not become an agency dependency")
    if sources.get("N2", {}).get("runtime_membership") is not False:
        errors.append("A historical source snapshot is not an active application")
    for path in paths:
        if (root / path).exists():
            errors.append("A whole customer application is present in the agency tree")
    if set(heads) & set(ancestors):
        errors.append("Customer commit history is part of the agency branch")
    for component in adopted:
        required = ("source_repository", "source_commit", "source_paths", "purpose", "target_paths",
                    "license_evidence", "adaptations", "tests")
        if not isinstance(component, dict) or any(not component.get(key) for key in required):
            errors.append("Component adoption needs explicit provenance, adaptation and tests")
        if not isinstance(component, dict) or component.get("contains_customer_data_or_configuration") is not False:
            errors.append("Customer data or configuration cannot be adopted")
    return errors


def main():
    policy = json.loads((ROOT / "config/source-boundaries.json").read_text())
    ancestors = subprocess.check_output(["git", "-C", str(ROOT), "rev-list", "HEAD"], text=True).splitlines()
    errors = validate(policy, ROOT, ancestors)
    contract = json.loads((ROOT / "docs/contracts/factory.openapi.json").read_text())
    if any(source.get("name") == "A1" for source in contract.get("x-source-repositories", [])):
        errors.append("Customer project is declared as an agency API source")
    for item in contract.get("paths", {}).values():
        for method, operation in item.items():
            if method in {"get", "post", "put", "patch", "delete"}:
                if any(ref.get("repository") == "A1" for ref in operation.get("x-source-refs", [])):
                    errors.append("Agency API operation depends on the customer project")
    for error in errors:
        print("FAIL:", error)
    if not errors:
        print("Source boundaries OK: customer tree/history excluded; selective reuse requires provenance.")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())

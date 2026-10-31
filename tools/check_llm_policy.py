#!/usr/bin/env python3
"""Read-only managed-model configuration guard, not runtime/provider verification.

The literal model/effort below encode the current explicit user instruction.
Agreement between editable files alone cannot authorize a different model.
Only fixed repository config files are read; references inside them are inert.
Customer-selected BYOK remains a separate product exception, not managed routing.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys


MODEL = "deepseek/deepseek-v4.1-flash-1017"
EFFORT = "high"
SOURCES = (
    "config/llm-policy.json",
    "config/automation.json",
    "config/selfservice-policy.json",
    "config/brain/agents.json",
    "config/llm-verbindungen.json",
)
PRODUCT_ENRICHMENT = {"id": "ds/deepseek-v4-pro", "reasoning_effort": "high", "provider": "own_router_9router", "base_url_env": "ROUTER_URL", "api_key_env": "ROUTER_KEY"}
REQUIRED_SCOPES = frozenset(("website_live_chat", "managed_customer_suite", "internal_agent_orchestration",
                            "research_and_summaries", "tool_loops", "ci_ai_review", "managed_text_generation"))


class PolicyError(Exception):
    pass


def _require(condition, code):
    if not condition:
        raise PolicyError(code)


def _at(config, *path):
    for key in path:
        _require(isinstance(config, dict) and key in config, "required_managed_policy_field_missing")
        config = config[key]
    return config


def _exact_keys(value, keys, code):
    _require(isinstance(value, dict) and set(value) == set(keys), code)


def _model(identifier, effort, code):
    _require(identifier == MODEL and effort == EFFORT, code)


def validate(configs):
    """Validate an in-memory dictionary keyed by the five fixed source paths.

    No path, environment variable, credential or callable from these values is
    resolved. Success proves only config agreement with the literal instruction.
    """
    _exact_keys(configs, SOURCES, "exact_five_config_sources_required")
    policy, automation, service, brain, connections = (configs[source] for source in SOURCES)
    _require(all(isinstance(value, dict) for value in configs.values()), "config_objects_required")
    _require(type(_at(policy, "schema_version")) is int and _at(policy, "schema_version") == 1 and _at(policy, "id") == "NEXIFY-MANAGED-LLM-1017-HIGH", "literal_user_policy_identity_mismatch")
    _require(_at(policy, "authority") == "explicit_current_user_instruction_2026-10-26", "explicit_user_authority_required")
    _require(_at(policy, "status") == "mandatory_for_repository_controlled_managed_llm_calls", "managed_policy_must_be_mandatory")
    _model(_at(policy, "model", "id"), _at(policy, "model", "reasoning_effort"), "literal_user_model_or_effort_mismatch")
    _require(_at(policy, "model", "required_suffix") == "1017" and _at(policy, "model", "primary_provider") == "OpenRouter", "literal_user_provider_or_suffix_mismatch")
    scopes = _at(policy, "applies_to")
    _require(isinstance(scopes, list) and all(isinstance(item, str) for item in scopes) and REQUIRED_SCOPES.issubset(scopes), "mandatory_managed_scope_missing")
    for key in ("silent_model_fallback", "silent_reasoning_downgrade", "automatic_tier_escalation_or_substitution"):
        _require(_at(policy, "routing", key) is False, "managed_fallback_or_downgrade_forbidden")
    _require(_at(policy, "routing", "unsupported_capability") == "deny_instead_of_substituting_a_model", "unsupported_capability_must_deny")
    for key in ("final_serialized_provider_request_must_match_policy", "provider_route_changes_require_explicit_server_configuration"):
        _require(_at(policy, "routing", key) is True, "final_provider_binding_required")
    for key in ("live_model_is_required_final_behavior", "deterministic_orientation_is_only_an_explicitly_labelled_interim_mode", "interim_mode_is_not_live_ai_acceptance"):
        _require(_at(policy, "website_chat", key) is True, "website_live_chat_requirement_missing")
    for key in ("model_selection_does_not_authorize_spend_or_business_actions", "credentials_server_only", "request_limits_and_authorized_funding_required", "sdk_step_limits_are_not_financial_budgets", "unresolved_provider_result_is_not_zero_cost"):
        _require(_at(policy, "cost_and_access", key) is True, "funding_and_access_boundary_required")
    _require(_at(policy, "cost_and_access", "customer_trial_financing_policy") == SOURCES[2], "fixed_financing_reference_required")
    for key in ("separate_explicit_customer_provider_selection_preserved", "no_silent_fallback_to_company_paid_credits"):
        _require(_at(policy, "customer_byok", key) is True, "explicit_customer_byok_exception_required")
    # User decision 2026-10-31 (DECISIONS D-009): separate product_enrichment use case, no silent fallback.
    enrichment = _at(policy, "use_cases", "product_enrichment")
    _require(_at(enrichment, "model") == PRODUCT_ENRICHMENT and _at(enrichment, "authority") == "explicit_current_user_instruction_2026-10-31", "product_enrichment_model_mismatch")
    _require(_at(enrichment, "silent_model_fallback") is False and _at(enrichment, "unavailable_model") == "fail_run_with_error", "product_enrichment_fallback_forbidden")
    _require(_at(connections, "anwendungsfaelle", "product_enrichment", "modell") == PRODUCT_ENRICHMENT["id"] and
             _at(connections, "anwendungsfaelle", "product_enrichment", "bei_nicht_verfuegbar") == "geschlossen_mit_Fehler_ohne_Modellersatz", "product_enrichment_router_binding_mismatch")

    review = _at(automation, "ai_review")
    _exact_keys(review, ("enabled", "provider", "requested_model", "exact_model_id", "reasoning_effort", "api_key_env", "limits"), "unreviewed_ci_model_binding")
    _model(_at(review, "exact_model_id"), _at(review, "reasoning_effort"), "ci_model_or_effort_drift")
    _require(_at(review, "provider") == "openrouter", "ci_provider_drift")
    _require(type(_at(automation, "autonomy", "max_attempts_per_explicit_run")) is int and _at(automation, "autonomy", "max_attempts_per_explicit_run") == 1 and
             _at(automation, "autonomy", "unknown_outcome") == "reconcile_before_retry", "ci_blind_retry_forbidden")

    managed = _at(service, "llm", "managed_route")
    _model(_at(managed, "deepseek_model_id"), _at(managed, "deepseek_reasoning_effort"), "suite_model_or_effort_drift")
    _require(_at(managed, "deepseek_provider") == "OpenRouter", "suite_provider_drift")
    _require(_at(managed, "second_component_model_id") is None, "unresolved_second_component_must_not_be_substituted")
    for key in ("price_version_required", "reserve_maximum_cost_before_request", "settle_only_actual_usage_once", "no_automatic_external_retry_when_outcome_unknown", "must_be_operational_before_new_managed_topup_offer"):
        _require(_at(managed, key) is True, "suite_funding_or_retry_guard_missing")
    _require(_at(managed, "negative_balance_or_operator_free_credit_fallback") is False and
             _at(service, "llm", "byok", "platform_fallback_on_missing_invalid_or_exhausted_key") is False,
             "company_credit_fallback_forbidden")
    _require(type(_at(service, "llm", "free_credit_cent")) is int and _at(service, "llm", "free_credit_cent") == 0, "managed_free_credit_forbidden")

    models = _at(brain, "modelle")
    _exact_keys(models, ("policy", "managed", "ersatz", "pruefungsrelevant", "legacy_tiers_status"), "legacy_or_unreviewed_brain_model_tier")
    _require(_at(models, "policy") == SOURCES[0], "fixed_brain_policy_reference_required")
    _exact_keys(_at(models, "managed"), ("id", "provider", "reasoning_effort"), "unreviewed_brain_managed_binding")
    _model(_at(models, "managed", "id"), _at(models, "managed", "reasoning_effort"), "brain_model_or_effort_drift")
    _require(_at(models, "managed", "provider") == "OpenRouter" and _at(models, "ersatz") == {} and
             _at(models, "pruefungsrelevant") == "managed" and
             _at(models, "legacy_tiers_status") == "retired_by_current_user_instruction_2026-10-26", "brain_substitution_or_legacy_tier_forbidden")

    _require(_at(connections, "policy") == SOURCES[0], "fixed_router_policy_reference_required")
    tiers = _at(connections, "stufen")
    _require(isinstance(tiers, list) and len(tiers) == 3, "exact_three_managed_router_tiers_required")
    ids = set()
    for tier in tiers:
        _exact_keys(tier, ("id", "name", "modell", "reasoning_effort", "preisquelle", "aktiv"), "unreviewed_or_free_managed_tier")
        _require(type(tier["id"]) is int and tier["id"] in (0, 1, 2) and tier["id"] not in ids, "invalid_or_duplicate_managed_tier")
        ids.add(tier["id"])
        _model(tier["modell"], tier["reasoning_effort"], "router_tier_model_or_effort_drift")
        _require(tier["preisquelle"] == "serverseitig_verifiziert_vor_abrechnung" and type(tier["aktiv"]) is bool, "unverified_or_free_managed_tier_forbidden")
    _model(_at(connections, "kontext", "verdichtenMit"), _at(connections, "kontext", "reasoning_effort"), "summary_model_or_effort_drift")
    _require(_at(connections, "hochstufen", "aktiv") is False and _at(connections, "hochstufen", "modellwechsel_erlaubt") is False and
             _at(connections, "hochstufen", "bei_nicht_verfuegbar") == "geschlossen_mit_Fehler_ohne_Modellersatz", "automatic_tier_substitution_forbidden")
    _require(type(_at(connections, "wiederholung", "versucheJeSchritt")) is int and _at(connections, "wiederholung", "versucheJeSchritt") == 1 and _at(connections, "wiederholung", "automatische_modellwiederholung") is False and
             _at(connections, "wiederholung", "unklarer_ausgang") == "zuerst_abgleichen_keine_blinde_neue_Ausfuehrung", "automatic_or_unknown_outcome_retry_forbidden")
    return {"status": "passed", "scope": "managed_config_binding_only_not_live_verification", "model": MODEL,
            "reasoning_effort": EFFORT, "sources": len(SOURCES), "customer_byok": "separate_explicit_selection_preserved"}


def load_configs(root):
    root = Path(root).resolve()
    configs = {}
    def unique(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError("duplicate key")
            result[key] = value
        return result
    def constant(_):
        raise ValueError("nonfinite number")
    for relative in SOURCES:
        try:
            source = root / relative
            _require(source.resolve().is_relative_to(root), "config_source_escapes_repository")
            configs[relative] = json.loads(source.read_bytes(), object_pairs_hook=unique, parse_constant=constant)
        except (OSError, ValueError, RuntimeError, RecursionError):
            raise PolicyError("fixed_config_missing_or_invalid: " + relative) from None
    return configs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        result = validate(load_configs(args.root))
    except PolicyError as error:
        print("Managed LLM policy check failed: " + str(error), file=sys.stderr)
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

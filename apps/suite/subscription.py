"""Subscription state machine and the entitlements derived from it.

    none --trial_started--> trialing --payment_succeeded--> active
    none --payment_succeeded--> active
    active --payment_failed--> past_due --payment_succeeded--> active
    trialing|active|past_due --cancellation_requested--> canceled   (access until period end)
    trialing|active|past_due|canceled --period_ended--> ended
    active|past_due|canceled --payment_reversed--> ended
    ended --payment_succeeded--> active

Pure functions: no clock, no I/O. `derive_entitlements` is the ONLY place that answers
"may this organisation use chat / dashboard / connections". Unknown input fails closed.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Mapping

STATES = ("none", "trialing", "active", "past_due", "canceled", "ended")
KINDS = ("trial_started", "payment_succeeded", "payment_failed", "cancellation_requested", "period_ended", "payment_reversed")
CAPABILITIES = ("chat", "dashboard", "connections")
_MONEY_KEYS = ("price", "preis", "amount", "betrag", "eur", "cent", "currency", "waehrung", "währung")
DEFAULT_CONFIG = Path(__file__).resolve().parents[2] / "config" / "suite-plans.json"


class TransitionError(Exception):
    """A fixed code, never event content."""
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


@dataclass(frozen=True)
class Subscription:
    organisation_id: str
    state: str = "none"
    plan_ref: str | None = None
    period_end: int | None = None
    past_due_since: int | None = None
    trial_used: bool = False
    last_event_at: int | None = None
    version: int = 0


@dataclass(frozen=True)
class Event:
    provider: str
    event_id: str
    kind: str
    organisation_id: str
    occurred_at: int
    plan_ref: str | None = None
    period_end: int | None = None


@dataclass(frozen=True)
class Grant:
    granted: bool
    valid_until: int | None
    reason: str


@dataclass(frozen=True)
class PlanConfig:
    plans: Mapping[str, tuple]          # plan_ref -> released capabilities; unreleased plans are absent
    known_plans: frozenset
    trial_capabilities: tuple | None    # None: trial not released
    grace_seconds: int | None           # None: no grace period decided
    after_end_capabilities: tuple


def _no_money(node, path="config"):
    if isinstance(node, dict):
        for key, value in node.items():
            if any(word in str(key).lower() for word in _MONEY_KEYS):
                raise ValueError("amounts_do_not_belong_in_suite_plan_config:" + path + "." + str(key))
            _no_money(value, path + "." + str(key))
    elif isinstance(node, list):
        for item in node:
            _no_money(item, path)


def _capabilities(values):
    values = tuple(values)
    if any(value not in CAPABILITIES for value in values):
        raise ValueError("unknown_capability")
    return values


def load_plan_config(source=None) -> PlanConfig:
    raw = source if isinstance(source, dict) else json.loads(Path(source or DEFAULT_CONFIG).read_text(encoding="utf-8"))
    _no_money(raw)
    plans = {}
    for ref, plan in raw["plans"].items():
        caps = _capabilities(plan["capabilities"])
        if plan.get("released") is True:
            plans[ref] = caps
    trial = raw.get("trial", {})
    grace = raw.get("past_due", {}).get("grace_period_seconds")
    if grace is not None and (type(grace) is not int or grace < 0):
        raise ValueError("invalid_grace_period")
    return PlanConfig(plans=plans, known_plans=frozenset(raw["plans"]),
                      trial_capabilities=_capabilities(trial.get("capabilities", ())) if trial.get("released") is True else None,
                      grace_seconds=grace, after_end_capabilities=_capabilities(raw.get("after_end", {}).get("capabilities", ())))


def _period(event: Event) -> int:
    if type(event.period_end) is not int or event.period_end <= event.occurred_at:
        raise TransitionError("period_end_required_after_event_time")
    return event.period_end


def transition(sub: Subscription, event: Event, config: PlanConfig) -> Subscription:
    """Returns the next subscription or raises TransitionError. Never mutates, never guesses."""
    if event.organisation_id != sub.organisation_id:
        raise TransitionError("organisation_mismatch")
    if sub.state not in STATES or event.kind not in KINDS:
        raise TransitionError("unknown_state_or_event")
    state, kind = sub.state, event.kind
    stamped = replace(sub, last_event_at=event.occurred_at, version=sub.version + 1)

    if kind == "trial_started":
        if state != "none" or sub.trial_used:
            raise TransitionError("trial_not_available")
        if config.trial_capabilities is None:
            raise TransitionError("trial_not_released")
        return replace(stamped, state="trialing", period_end=_period(event), trial_used=True, plan_ref=None)

    if kind == "payment_succeeded":
        if event.plan_ref not in config.known_plans:
            raise TransitionError("unknown_plan")
        if event.plan_ref not in config.plans:
            raise TransitionError("plan_not_released")
        if state == "canceled":
            # A charge after a recorded cancellation is an anomaly for a human, not a silent reactivation.
            raise TransitionError("payment_after_cancellation_needs_review")
        if state in ("active", "past_due") and sub.plan_ref not in (None, event.plan_ref):
            raise TransitionError("plan_change_needs_explicit_flow")
        return replace(stamped, state="active", plan_ref=event.plan_ref, period_end=_period(event), past_due_since=None)

    if kind == "payment_failed":
        if state == "active":
            return replace(stamped, state="past_due", past_due_since=event.occurred_at)
        if state in ("past_due", "canceled", "ended"):
            return stamped  # recorded, no further effect
        raise TransitionError("payment_failed_without_paid_subscription")

    if kind == "cancellation_requested":
        if state in ("trialing", "active", "past_due"):
            return replace(stamped, state="canceled")
        if state in ("canceled", "ended"):
            return stamped
        raise TransitionError("nothing_to_cancel")

    if kind == "period_ended":
        if state in ("trialing", "active", "past_due", "canceled"):
            if sub.period_end is not None and event.occurred_at < sub.period_end:
                raise TransitionError("period_has_not_ended")
            return replace(stamped, state="ended", past_due_since=None)
        if state == "ended":
            return stamped
        raise TransitionError("no_period_to_end")

    # payment_reversed: refund or chargeback ends access at once and goes to the operator.
    if state in ("active", "past_due", "canceled"):
        return replace(stamped, state="ended", period_end=event.occurred_at, past_due_since=None)
    if state == "ended":
        return stamped
    raise TransitionError("nothing_to_reverse")


def derive_entitlements(sub: Subscription | None, config: PlanConfig, now: int) -> dict:
    """Capability -> Grant for every known capability. Missing subscription, unknown state, unreleased plan
    or an elapsed period all mean: not granted."""
    def grants(capabilities, valid_until, reason):
        return {cap: Grant(cap in capabilities, valid_until if cap in capabilities else None,
                           reason if cap in capabilities else "not_included") for cap in CAPABILITIES}

    def denied(reason):
        return {cap: Grant(False, None, reason) for cap in CAPABILITIES}

    if sub is None or sub.state not in STATES or type(now) is not int:
        return denied("no_subscription")
    if sub.state == "none":
        return denied("no_subscription")
    if sub.state == "ended":
        return grants(config.after_end_capabilities, None, "ended_read_only") if config.after_end_capabilities else denied("ended")
    if sub.state == "trialing":
        caps = config.trial_capabilities
    else:
        caps = config.plans.get(sub.plan_ref)
    if caps is None:
        return denied("plan_or_trial_not_released")
    if sub.period_end is None or now >= sub.period_end:
        # The period is over although no closing event arrived: fail closed until reconciliation.
        return grants(config.after_end_capabilities, None, "period_elapsed_pending_reconciliation") if config.after_end_capabilities else denied("period_elapsed_pending_reconciliation")
    if sub.state == "past_due":
        grace = config.grace_seconds
        if grace is None or sub.past_due_since is None or now >= sub.past_due_since + grace:
            return grants(config.after_end_capabilities, None, "past_due_read_only") if config.after_end_capabilities else denied("past_due")
        return grants(caps, min(sub.period_end, sub.past_due_since + grace), "past_due_within_grace")
    return grants(caps, sub.period_end, sub.state)


def may(entitlements: Mapping[str, Grant] | None, capability: str, now: int) -> bool:
    grant = (entitlements or {}).get(capability)
    if not isinstance(grant, Grant) or grant.granted is not True:
        return False
    return grant.valid_until is None or now < grant.valid_until

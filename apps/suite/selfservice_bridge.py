"""Connects the billing core to the existing self-service domain (apps/selfservice/domain.py) instead of
duplicating it. The domain stays the owner of registration, the one-time trial clock and the conversion
receipt; billing owns paid periods. Duck-typed on purpose: this module imports nothing from the domain.
"""
from __future__ import annotations

from .subscription import Event, Subscription


def trial_event_from_view(view: dict, organisation_id: str) -> Event | None:
    """Trial start as recorded by the domain -> neutral event for the subscription journal.
    The domain grants the trial once per verified account; replaying this event is idempotent by its id."""
    if view.get("trial_started_at") is None:
        return None
    return Event(provider="selfservice", event_id="trial:" + str(view["account_id"]), kind="trial_started",
                 organisation_id=organisation_id, occurred_at=int(view["trial_started_at"]), period_end=int(view["trial_expires_at"]))


def subscription_from_view(view: dict, organisation_id: str) -> Subscription:
    """Snapshot for an organisation that has no billing history yet."""
    state = view.get("entitlement")
    if state == "not_started":
        return Subscription(organisation_id)
    if state in ("trial_active", "trial_expired"):
        return Subscription(organisation_id, state="trialing" if state == "trial_active" else "ended", trial_used=True,
                            period_end=int(view["trial_expires_at"]), last_event_at=int(view["trial_started_at"]), version=1)
    # "paid" carries no period in the domain; a paid period exists only through a confirmed payment event.
    raise ValueError("paid_state_is_owned_by_billing")


class SelfServiceActivation:
    """ActivationSink: a confirmed first payment becomes the domain's conversion (same account, tenant,
    workspace; no new identity, no trial reset). `resolve(organisation_id)` is supplied by the server and
    returns principal attestation, tenant_id, account_id, workspace_id and the accepted terms_ref."""

    def __init__(self, service, boundary, resolve):
        self.service, self.boundary, self.resolve = service, boundary, resolve

    def activated(self, organisation_id, plan_ref, evidence_ref):
        binding = self.resolve(organisation_id)
        approval = self.boundary.approved_conversion(
            account_id=binding["account_id"], tenant_id=binding["tenant_id"], workspace_id=binding["workspace_id"],
            plan_ref=plan_ref, terms_ref=binding["terms_ref"], billing_evidence_ref=evidence_ref)
        self.service.convert(binding["principal"], binding["tenant_id"], approval)

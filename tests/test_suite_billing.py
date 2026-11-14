"""Suite billing core against stand-ins: no provider, no network, no price.

Plans here are fixtures ("fixture_plan"); the shipped config releases nothing.
"""
import itertools
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "apps") not in sys.path:
    sys.path.insert(0, str(ROOT / "apps"))

from suite import billing, flags, selfservice_bridge, subscription as sm  # noqa: E402
from suite.testing import FixtureProvider, FixtureSignature  # noqa: E402

T0 = 1_800_000_000
DAY = 86_400
FIXTURE = {"plans": {"fixture_plan": {"released": True, "capabilities": ["chat", "dashboard", "connections"]},
                     "fixture_small": {"released": True, "capabilities": ["chat", "dashboard"]},
                     "fixture_unreleased": {"released": False, "capabilities": ["chat"]}},
           "trial": {"released": True, "capabilities": ["chat", "dashboard"]},
           "past_due": {"grace_period_seconds": None}, "after_end": {"capabilities": ["dashboard"]}}
CONFIG = sm.load_plan_config(FIXTURE)
ORG = "org-a"


def event(kind, at, plan=None, period_end=None, org=ORG, event_id=None):
    return sm.Event("fixture", event_id or "%s-%d" % (kind, at), kind, org, at, plan, period_end)


def walk(*events, sub=None):
    sub = sub or sm.Subscription(ORG)
    for item in events:
        sub = sm.transition(sub, item, CONFIG)
    return sub


class ShippedConfiguration(unittest.TestCase):
    def test_shipped_config_releases_nothing_and_holds_no_amounts(self):
        raw = json.loads((ROOT / "config" / "suite-plans.json").read_text())
        config = sm.load_plan_config()
        self.assertEqual(config.plans, {})
        self.assertIsNone(config.trial_capabilities)
        self.assertIsNone(config.grace_seconds)
        for ref in raw["plans"]:
            self.assertRegex(ref, r"^plan_[a-z]$")
        text = json.dumps(raw).lower()
        for word in ("€", "eur", "starter", "business", "enterprise", "onePlus".lower()):
            self.assertNotIn(word, text)
        active = sm.Subscription(ORG, state="active", plan_ref="plan_a", period_end=T0 + DAY)
        self.assertFalse(any(g.granted for g in sm.derive_entitlements(active, config, T0).values()))
        with self.assertRaises(sm.TransitionError) as caught:
            sm.transition(sm.Subscription(ORG), event("payment_succeeded", T0, "plan_a", T0 + DAY), config)
        self.assertEqual(caught.exception.code, "plan_not_released")

    def test_amounts_in_plan_config_are_refused(self):
        for key in ("price", "preis_eur", "amount_cent", "currency"):
            bad = json.loads(json.dumps(FIXTURE))
            bad["plans"]["fixture_plan"][key] = 1
            with self.assertRaises(ValueError):
                sm.load_plan_config(bad)

    def test_switches_default_off(self):
        self.assertFalse(flags.suite_enabled({}))
        for value in ("", "1", "true", "ON", "yes", " on"):
            self.assertFalse(flags.suite_enabled({"NEXIFY_SUITE": value}), value)
        self.assertTrue(flags.suite_enabled({"NEXIFY_SUITE": "on"}))
        self.assertFalse(flags.feature_enabled("BILLING", {"NEXIFY_SUITE_BILLING": "on"}))
        self.assertFalse(flags.feature_enabled("BILLING", {"NEXIFY_SUITE": "on"}))
        self.assertTrue(flags.feature_enabled("BILLING", {"NEXIFY_SUITE": "on", "NEXIFY_SUITE_BILLING": "on"}))
        with self.assertRaises(ValueError):
            flags.feature_enabled("UNKNOWN", {})


class StateMachine(unittest.TestCase):
    PAY = staticmethod(lambda at: event("payment_succeeded", at, "fixture_plan", at + 30 * DAY))

    def test_documented_path_none_trial_active_past_due_canceled_ended(self):
        sub = walk(event("trial_started", T0, period_end=T0 + DAY))
        self.assertEqual((sub.state, sub.trial_used, sub.period_end, sub.version), ("trialing", True, T0 + DAY, 1))
        sub = walk(self.PAY(T0 + 100), sub=sub)
        self.assertEqual((sub.state, sub.plan_ref), ("active", "fixture_plan"))
        sub = walk(event("payment_failed", T0 + 200), sub=sub)
        self.assertEqual((sub.state, sub.past_due_since), ("past_due", T0 + 200))
        sub = walk(self.PAY(T0 + 300), sub=sub)
        self.assertEqual((sub.state, sub.past_due_since), ("active", None))
        sub = walk(event("cancellation_requested", T0 + 400), sub=sub)
        self.assertEqual(sub.state, "canceled")
        self.assertEqual(sub.period_end, T0 + 300 + 30 * DAY)
        sub = walk(event("period_ended", sub.period_end), sub=sub)
        self.assertEqual((sub.state, sub.version), ("ended", 6))
        self.assertEqual(walk(self.PAY(T0 + 90 * DAY), sub=sub).state, "active")

    def test_every_state_event_pair_is_decided(self):
        allowed = {
            ("none", "trial_started"): "trialing", ("none", "payment_succeeded"): "active",
            ("trialing", "payment_succeeded"): "active", ("trialing", "cancellation_requested"): "canceled", ("trialing", "period_ended"): "ended",
            ("active", "payment_succeeded"): "active", ("active", "payment_failed"): "past_due", ("active", "cancellation_requested"): "canceled",
            ("active", "period_ended"): "ended", ("active", "payment_reversed"): "ended",
            ("past_due", "payment_succeeded"): "active", ("past_due", "payment_failed"): "past_due", ("past_due", "cancellation_requested"): "canceled",
            ("past_due", "period_ended"): "ended", ("past_due", "payment_reversed"): "ended",
            ("canceled", "payment_failed"): "canceled", ("canceled", "cancellation_requested"): "canceled", ("canceled", "period_ended"): "ended",
            ("canceled", "payment_reversed"): "ended",
            ("ended", "payment_succeeded"): "active", ("ended", "payment_failed"): "ended", ("ended", "cancellation_requested"): "ended",
            ("ended", "period_ended"): "ended", ("ended", "payment_reversed"): "ended",
        }
        for state, kind in itertools.product(sm.STATES, sm.KINDS):
            start = sm.Subscription(ORG, state=state, plan_ref=None if state in ("none", "trialing") else "fixture_plan",
                                    period_end=None if state == "none" else T0, trial_used=state != "none", version=3)
            item = event(kind, T0 + 10, "fixture_plan" if kind == "payment_succeeded" else None,
                         T0 + DAY if kind in ("payment_succeeded", "trial_started") else None)
            if (state, kind) in allowed:
                result = sm.transition(start, item, CONFIG)
                self.assertEqual(result.state, allowed[(state, kind)], (state, kind))
                self.assertEqual((result.version, result.last_event_at), (4, T0 + 10))
            else:
                with self.assertRaises(sm.TransitionError, msg=(state, kind)):
                    sm.transition(start, item, CONFIG)
        self.assertEqual(start.state, "ended")  # inputs are never mutated

    def test_edge_cases(self):
        cases = [
            ("trial_not_available", sm.Subscription(ORG, trial_used=True), event("trial_started", T0, period_end=T0 + DAY)),
            ("period_end_required_after_event_time", sm.Subscription(ORG), event("trial_started", T0, period_end=T0)),
            ("period_end_required_after_event_time", sm.Subscription(ORG), event("payment_succeeded", T0, "fixture_plan")),
            ("unknown_plan", sm.Subscription(ORG), event("payment_succeeded", T0, "invented", T0 + DAY)),
            ("plan_not_released", sm.Subscription(ORG), event("payment_succeeded", T0, "fixture_unreleased", T0 + DAY)),
            ("organisation_mismatch", sm.Subscription("org-b"), event("payment_succeeded", T0, "fixture_plan", T0 + DAY)),
            ("payment_after_cancellation_needs_review", sm.Subscription(ORG, state="canceled", plan_ref="fixture_plan", period_end=T0 + DAY), self.PAY(T0)),
            ("plan_change_needs_explicit_flow", sm.Subscription(ORG, state="active", plan_ref="fixture_small", period_end=T0 + DAY), self.PAY(T0)),
            ("period_has_not_ended", sm.Subscription(ORG, state="active", plan_ref="fixture_plan", period_end=T0 + DAY), event("period_ended", T0)),
            ("unknown_state_or_event", sm.Subscription(ORG, state="vip"), self.PAY(T0)),
            ("unknown_state_or_event", sm.Subscription(ORG), event("free_upgrade", T0)),
        ]
        for code, start, item in cases:
            with self.assertRaises(sm.TransitionError) as caught:
                sm.transition(start, item, CONFIG)
            self.assertEqual(caught.exception.code, code)
        no_trial = sm.load_plan_config({**FIXTURE, "trial": {"released": False, "capabilities": ["chat"]}})
        with self.assertRaises(sm.TransitionError) as caught:
            sm.transition(sm.Subscription(ORG), event("trial_started", T0, period_end=T0 + DAY), no_trial)
        self.assertEqual(caught.exception.code, "trial_not_released")
        reversed_sub = walk(self.PAY(T0), event("payment_reversed", T0 + 50))
        self.assertEqual((reversed_sub.state, reversed_sub.period_end), ("ended", T0 + 50))


class Entitlements(unittest.TestCase):
    def granted(self, sub, now, config=CONFIG):
        grants = sm.derive_entitlements(sub, config, now)
        self.assertEqual(set(grants), set(sm.CAPABILITIES))
        return {cap for cap in sm.CAPABILITIES if sm.may(grants, cap, now)}

    def test_entitlements_follow_state_plan_and_time(self):
        everything, reading = set(sm.CAPABILITIES), {"dashboard"}
        self.assertEqual(self.granted(None, T0), set())
        self.assertEqual(self.granted(sm.Subscription(ORG), T0), set())
        trial = sm.Subscription(ORG, state="trialing", period_end=T0 + DAY, trial_used=True)
        self.assertEqual(self.granted(trial, T0), {"chat", "dashboard"})
        self.assertEqual(self.granted(trial, T0 + DAY), reading)
        active = sm.Subscription(ORG, state="active", plan_ref="fixture_plan", period_end=T0 + DAY)
        self.assertEqual(self.granted(active, T0 + DAY - 1), everything)
        self.assertEqual(self.granted(active, T0 + DAY), reading)  # no closing event arrived: fail closed
        small = sm.Subscription(ORG, state="active", plan_ref="fixture_small", period_end=T0 + DAY)
        self.assertEqual(self.granted(small, T0), {"chat", "dashboard"})
        canceled = sm.Subscription(ORG, state="canceled", plan_ref="fixture_plan", period_end=T0 + DAY)
        self.assertEqual(self.granted(canceled, T0), everything)
        self.assertEqual(self.granted(canceled, T0 + DAY), reading)
        self.assertEqual(self.granted(sm.Subscription(ORG, state="ended", plan_ref="fixture_plan", period_end=T0), T0), reading)
        for broken in (sm.Subscription(ORG, state="active", plan_ref="fixture_plan"), sm.Subscription(ORG, state="active", plan_ref="invented", period_end=T0 + DAY),
                       sm.Subscription(ORG, state="active", plan_ref="fixture_unreleased", period_end=T0 + DAY), sm.Subscription(ORG, state="vip", period_end=T0 + DAY)):
            self.assertLessEqual(self.granted(broken, T0), reading, broken)

    def test_past_due_without_decided_grace_is_read_only_and_with_grace_is_bounded(self):
        past_due = sm.Subscription(ORG, state="past_due", plan_ref="fixture_plan", period_end=T0 + 30 * DAY, past_due_since=T0)
        self.assertEqual(self.granted(past_due, T0 + 1), {"dashboard"})
        graced = sm.load_plan_config({**FIXTURE, "past_due": {"grace_period_seconds": 1000}})
        self.assertEqual(self.granted(past_due, T0 + 999, graced), set(sm.CAPABILITIES))
        self.assertEqual(self.granted(past_due, T0 + 1000, graced), {"dashboard"})
        self.assertEqual(sm.derive_entitlements(past_due, graced, T0)["chat"].valid_until, T0 + 1000)

    def test_may_fails_closed(self):
        self.assertFalse(sm.may(None, "chat", T0))
        self.assertFalse(sm.may({}, "chat", T0))
        self.assertFalse(sm.may({"chat": {"granted": True}}, "chat", T0))
        self.assertFalse(sm.may({"chat": sm.Grant(1, None, "x")}, "chat", T0))
        self.assertFalse(sm.may({"chat": sm.Grant(True, T0, "x")}, "chat", T0))
        self.assertTrue(sm.may({"chat": sm.Grant(True, T0 + 1, "x")}, "chat", T0))


class Harness(unittest.TestCase):
    def setUp(self):
        self.clock = T0
        self.logs = []
        self.store = billing.SqliteBillingStore()
        self.addCleanup(self.store.close)
        self.store.add_organisation(ORG)
        self.store.add_organisation("org-b")
        self.provider = FixtureProvider()
        self.signature = FixtureSignature(b"fixture-signing-material-not-a-secret", lambda: self.clock)
        self.processor = billing.EventProcessor(store=self.store, provider=self.provider, verifier=self.signature, config=CONFIG,
                                                now=lambda: self.clock, log=self.logs.append)

    def deliver(self, event_id, kind, at, plan=None, period_end=None, org=ORG, confirm=True, headers=None, **extra):
        body = FixtureProvider.body(event_id, kind, org, at, plan, period_end, **extra)
        if confirm:
            self.provider.authoritative.add(event_id)
        return billing.handle_webhook(self.processor, body, self.signature.sign(body) if headers is None else headers)

    def pay(self, event_id="evt_pay", at=T0, **kwargs):
        return self.deliver(event_id, "payment_succeeded", at, "fixture_plan", at + 30 * DAY, **kwargs)

    def state(self, org=ORG):
        return self.store.subscription_get(org)

    def may(self, capability, org=ORG):
        row = self.store.entitlements_get(org).get(capability)
        return bool(row and row["granted"] and (row["valid_until"] is None or self.clock < row["valid_until"]))


class EventProcessing(Harness):
    def test_confirmed_payment_activates_subscription_and_entitlements_together(self):
        self.assertFalse(self.may("chat"))
        self.assertEqual(self.pay(), (200, {"status": "processed"}))
        self.assertEqual((self.state().state, self.state().version), ("active", 1))
        self.assertTrue(all(self.may(cap) for cap in sm.CAPABILITIES))
        self.assertEqual({row["subscription_version"] for row in self.store.entitlements_get(ORG).values()}, {1})
        self.assertFalse(self.may("chat", "org-b"))
        self.assertEqual(self.state("org-b").state, "none")

    def test_repeated_delivery_has_one_effect(self):
        for _ in range(4):
            self.assertEqual(self.pay()[0], 200)
        self.assertEqual(self.state().version, 1)
        self.assertEqual(self.store.db.execute("SELECT count(*) FROM billing_event").fetchone()[0], 1)
        self.assertEqual(self.store.db.execute("SELECT count(*) FROM audit_event").fetchone()[0], 1)
        self.assertEqual(self.provider.confirm_calls, 1)
        self.assertEqual([r["outcome"] for r in self.logs], ["processed", "duplicate", "duplicate", "duplicate"])

    def test_same_event_id_with_other_content_is_refused(self):
        self.pay()
        status, body = self.deliver("evt_pay", "payment_succeeded", T0, "fixture_plan", T0 + 999 * DAY)
        self.assertEqual((status, body), (409, {"error": "event_id_reused_with_other_content"}))
        self.assertEqual(self.state().period_end, T0 + 30 * DAY)

    def test_invalid_signature_stale_timestamp_and_garbage_store_nothing(self):
        body = FixtureProvider.body("evt_x", "payment_succeeded", ORG, T0, "fixture_plan", T0 + DAY)
        self.provider.authoritative.add("evt_x")
        good = self.signature.sign(body)
        attempts = [({}, 401), ({**good, "x-fixture-signature": "0" * 64}, 401), (self.signature.sign(body, T0 - 301), 401),
                    (self.signature.sign(body + b" "), 401), (FixtureSignature(b"other", lambda: self.clock).sign(body), 401)]
        for headers, expected in attempts:
            self.assertEqual(billing.handle_webhook(self.processor, body, headers)[0], expected)
        for garbage in (b"not json", b"{}", json.dumps({"id": "e", "type": "free_upgrade", "organisation": ORG, "occurred_at": T0}).encode(),
                        json.dumps({"id": "e", "type": "payment_succeeded", "organisation": ORG, "occurred_at": "now"}).encode()):
            self.assertEqual(billing.handle_webhook(self.processor, garbage, self.signature.sign(garbage))[0], 400)
        big = b"x" * (billing.MAX_BODY_BYTES + 1)
        self.assertEqual(billing.handle_webhook(self.processor, big, self.signature.sign(big))[0], 413)
        self.assertEqual(self.store.db.execute("SELECT count(*) FROM billing_event").fetchone()[0], 0)
        self.assertEqual(self.state().state, "none")
        self.assertEqual(self.provider.confirm_calls, 0)
        self.assertEqual({r["outcome"] for r in self.logs}, {"rejected"})

    def test_out_of_order_delivery_does_not_overwrite_newer_state(self):
        self.pay("evt_new", at=T0 + 500)
        self.assertEqual(self.deliver("evt_old_fail", "payment_failed", T0 + 100), (200, {"status": "ignored_stale"}))
        self.assertEqual(self.deliver("evt_old_cancel", "cancellation_requested", T0 + 200)[1]["status"], "ignored_stale")
        self.assertEqual((self.state().state, self.state().version), ("active", 1))
        self.assertTrue(self.may("chat"))
        self.assertEqual(self.deliver("evt_old_fail", "payment_failed", T0 + 100)[1]["status"], "ignored_stale")
        self.assertEqual(self.deliver("evt_fail", "payment_failed", T0 + 600)[1]["status"], "processed")
        self.assertEqual(self.state().state, "past_due")
        self.assertFalse(self.may("chat"))
        self.assertTrue(self.may("dashboard"))

    def test_content_alone_is_not_trusted_and_unconfirmed_events_end_in_dead_letter(self):
        self.assertEqual(self.pay(confirm=False), (503, {"status": "retry"}))
        self.assertEqual(self.state().state, "none")
        self.assertFalse(self.may("chat"))
        for _ in range(billing.MAX_ATTEMPTS + 3):
            self.processor.process_open()
        row = self.store.journal_get("fixture", "evt_pay")
        self.assertEqual((row["status"], row["attempts"], row["last_error_code"]), ("dead", billing.MAX_ATTEMPTS, "confirmation_pending"))
        self.assertEqual(self.provider.confirm_calls, billing.MAX_ATTEMPTS)
        self.assertEqual(self.store.journal_open(), [])
        self.assertEqual(self.pay(confirm=True), (200, {"status": "dead"}))  # redelivery does not revive it
        self.assertEqual(self.state().state, "none")

    def test_provider_outage_is_retried_and_then_applied_once(self):
        self.provider.unavailable = True
        self.assertEqual(self.pay()[0], 503)
        self.assertEqual(self.processor.process_open()[0]["code"], "provider_unavailable")
        self.provider.unavailable = False
        self.assertEqual([r["status"] for r in self.processor.process_open()], ["processed"])
        self.assertEqual(self.processor.process_open(), [])
        self.assertEqual((self.state().state, self.state().version), ("active", 1))
        self.assertEqual(self.store.journal_get("fixture", "evt_pay")["attempts"], 3)

    def test_failure_after_subscription_write_leaves_no_half_state(self):
        original = self.store.entitlements_put
        self.store.entitlements_put = lambda *a, **k: (_ for _ in ()).throw(RuntimeError("disk full: customer@example.invalid"))
        self.assertEqual(self.pay()[0], 503)
        self.assertEqual((self.state().state, self.state().version), ("none", 0))
        self.assertEqual(self.store.entitlements_get(ORG), {})
        self.assertEqual(self.store.db.execute("SELECT count(*) FROM audit_event").fetchone()[0], 0)
        self.assertEqual(self.store.journal_get("fixture", "evt_pay")["status"], "retry")
        self.assertNotIn("customer@example.invalid", json.dumps(self.logs))
        self.store.entitlements_put = original
        self.assertEqual(self.pay(), (200, {"status": "processed"}))
        self.assertEqual((self.state().state, self.state().version), ("active", 1))
        self.assertTrue(self.may("chat"))

    def test_unprocessable_events_go_to_dead_letter_without_effect(self):
        cases = [("evt_unreleased", "payment_succeeded", "fixture_unreleased", T0 + DAY, "plan_not_released"),
                 ("evt_invented", "payment_succeeded", "invented", T0 + DAY, "unknown_plan"),
                 ("evt_noperiod", "payment_succeeded", "fixture_plan", None, "period_end_required_after_event_time"),
                 ("evt_cancel", "cancellation_requested", None, None, "nothing_to_cancel")]
        for event_id, kind, plan, period_end, code in cases:
            self.assertEqual(self.deliver(event_id, kind, T0, plan, period_end), (200, {"status": "dead"}))
            self.assertEqual(self.store.journal_get("fixture", event_id)["last_error_code"], code)
        self.assertEqual(self.state().state, "none")
        self.assertEqual(self.deliver("evt_ghost", "payment_succeeded", T0, "fixture_plan", T0 + DAY, org="org-unknown")[0], 503)
        for _ in range(billing.MAX_ATTEMPTS):
            self.processor.process_open()
        self.assertEqual(self.store.journal_get("fixture", "evt_ghost")["status"], "dead")

    def test_event_for_one_organisation_never_touches_another(self):
        self.pay("evt_a", org=ORG)
        self.deliver("evt_b_fail", "payment_failed", T0 + 10, org="org-b")
        self.assertEqual(self.state("org-b").state, "none")
        self.assertEqual(self.state(ORG).state, "active")

    def test_logs_and_journal_hold_no_personal_data_or_secrets(self):
        private = {"customer_email": "kundin@example.invalid", "card": "4111111111111111", "api_key": "sk-fixture-000-not-real", "name": "Erika Musterfrau"}
        self.pay(**private)
        self.pay("evt_dead", confirm=False, **private)
        self.deliver("evt_bad", "payment_succeeded", T0, "invented", T0 + DAY, **private)
        dump = json.dumps(self.logs) + json.dumps([dict(r) for r in self.store.db.execute("SELECT * FROM billing_event")]) \
            + json.dumps([dict(r) for r in self.store.db.execute("SELECT * FROM audit_event")])
        for value in private.values():
            self.assertNotIn(value, dump)
        self.assertNotIn("fixture-signing-material", dump)
        for record in self.logs:
            self.assertLessEqual(set(record), {"component", "provider", "outcome", "event_id", "kind", "organisation_id", "code"})

    def test_reconciliation_closes_a_missing_webhook_and_unknown_stays_unknown(self):
        self.pay()
        self.clock = T0 + 30 * DAY
        self.assertFalse(self.may("chat"))  # period elapsed, nothing arrived: closed, not guessed
        self.assertEqual(self.processor.reconcile(ORG), {"status": "unchanged", "code": "nothing_to_reconcile"})
        self.provider.unavailable = True
        self.assertEqual(self.processor.reconcile(ORG)["code"], "provider_unavailable")
        self.provider.unavailable = False
        renewal = sm.Event("fixture", "evt_renewal", "payment_succeeded", ORG, T0 + 30 * DAY, "fixture_plan", T0 + 60 * DAY)
        self.provider.snapshots[ORG] = renewal
        self.provider.authoritative.add("evt_renewal")
        self.assertEqual(self.processor.reconcile(ORG)["status"], "processed")
        self.assertEqual(self.processor.reconcile(ORG)["code"], "duplicate")
        self.assertEqual((self.state().period_end, self.state().version), (T0 + 60 * DAY, 2))
        self.assertTrue(self.may("chat"))
        body = FixtureProvider.body("evt_renewal", "payment_succeeded", ORG, T0 + 30 * DAY, "fixture_plan", T0 + 60 * DAY)
        self.assertEqual(billing.handle_webhook(self.processor, body, self.signature.sign(body)), (200, {"status": "processed"}))  # late webhook: duplicate
        self.assertEqual(self.state().version, 2)


class SelfServiceConnection(Harness):
    """The existing domain keeps trial and conversion; billing only supplies the confirmed payment."""

    def setUp(self):
        super().setUp()
        import test_selfservice_domain as baseline
        self.fixture = baseline.SelfServiceTests()
        self.fixture.setUp()
        self.addCleanup(self.fixture.tearDown)
        self.fixture.clock = T0
        self.core = self.fixture.reopen(approved_plan_refs=("fixture_plan",))
        self.principal = self.fixture.principal()
        self.view = self.core.register(self.principal)
        self.tenant = self.view["tenant_id"]

    def test_trial_of_the_domain_becomes_the_subscription_trial(self):
        self.assertIsNone(selfservice_bridge.trial_event_from_view(self.view, ORG))
        self.assertEqual(selfservice_bridge.subscription_from_view(self.view, ORG), sm.Subscription(ORG))
        self.core.activate_workspace(self.principal, self.tenant)
        view = self.core.start_trial(self.principal, self.tenant)
        started = selfservice_bridge.trial_event_from_view(view, ORG)
        policy = json.loads((ROOT / "config" / "selfservice-policy.json").read_text())
        self.assertEqual(started.period_end - started.occurred_at, policy["trial"]["duration_seconds"])
        sub = sm.transition(sm.Subscription(ORG), started, CONFIG)
        self.assertEqual((sub.state, sub.period_end), ("trialing", view["trial_expires_at"]))
        self.assertEqual(selfservice_bridge.subscription_from_view(view, ORG).state, "trialing")
        with self.assertRaises(sm.TransitionError):
            sm.transition(sub, started, CONFIG)  # the one-time trial cannot be granted twice
        self.fixture.clock = view["trial_expires_at"]
        expired = selfservice_bridge.subscription_from_view(self.core.read(self.principal, self.tenant), ORG)
        self.assertEqual((expired.state, expired.trial_used), ("ended", True))

    def test_confirmed_payment_converts_the_same_account_exactly_once(self):
        binding = {"principal": self.principal, "tenant_id": self.tenant, "account_id": self.view["account_id"],
                   "workspace_id": self.view["workspace_id"], "terms_ref": "fixture-terms-v1"}
        self.processor.sink = selfservice_bridge.SelfServiceActivation(self.core, self.fixture.boundary, lambda org: binding)
        self.assertEqual(self.pay(), (200, {"status": "processed"}))
        self.pay()
        view = self.core.read(self.principal, self.tenant)
        self.assertEqual((view["entitlement"], view["paid_plan_ref"]), ("paid", "fixture_plan"))
        self.assertEqual(view["conversion_receipt"]["billing_evidence_ref"], "fixture:evt_pay")
        self.assertEqual((view["account_id"], view["tenant_id"]), (self.view["account_id"], self.tenant))
        with self.assertRaises(ValueError):
            selfservice_bridge.subscription_from_view(view, ORG)

    def test_domain_refusal_rolls_the_payment_effect_back(self):
        binding = {"principal": self.principal, "tenant_id": self.tenant, "account_id": "someone-else",
                   "workspace_id": self.view["workspace_id"], "terms_ref": "fixture-terms-v1"}
        self.processor.sink = selfservice_bridge.SelfServiceActivation(self.core, self.fixture.boundary, lambda org: binding)
        self.assertEqual(self.pay()[0], 503)
        self.assertEqual(self.state().state, "none")
        self.assertFalse(self.may("chat"))
        self.assertIsNone(self.core.read(self.principal, self.tenant)["paid_plan_ref"])
        self.assertEqual(self.store.journal_get("fixture", "evt_pay")["last_error_code"], "activation_sink_unavailable")


if __name__ == "__main__":
    unittest.main()

"""Real isolated SQLite state; adapter attestations are local fixtures, never live proofs."""
from concurrent.futures import ThreadPoolExecutor
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import sqlite3
import threading
from unittest import mock
import unittest

ROOT = Path(__file__).resolve().parents[1]
FILE = ROOT / "apps/selfservice/domain.py"
SPEC = importlib.util.spec_from_file_location("selfservice_domain_under_test", FILE)
domain = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = domain
SPEC.loader.exec_module(domain)


class SelfServiceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.database = Path(self.temp.name) / "selfservice.sqlite"
        self.clock = 1_800_000_000
        self.boundary = domain.TrustedBoundary()
        self.model = json.loads((ROOT / "config/selfservice-policy.json").read_text())["llm"]["managed_route"]["deepseek_model_id"]
        self.binding = self.boundary.approved_managed_binding(merchant_account="fixture-merchant", route_contract_ref="fixture-reviewed-route",
                                                            terms_ref="fixture-reviewed-terms", allowed_models=[self.model])
        self.core = self.reopen()

    def tearDown(self):
        self.temp.cleanup()

    def reopen(self, **kwargs):
        args = {"boundary": self.boundary, "now": lambda: self.clock, "managed_binding": self.binding,
                "approved_price_versions": ("fixture-price-v1",), "approved_plan_refs": ("fixture-suite-plan",)}
        args.update(kwargs)
        return domain.SelfService(self.database, **args)

    def principal(self, subject="alice", **kwargs):
        fields = {"issuer": "fixture-idp", "subject": subject, "email": subject + "@example.invalid", "verified_at": self.clock - 10, "evidence_ref": "fixture-verified-email"}
        fields.update(kwargs)
        return self.boundary.verified_principal(**fields)

    def register(self, subject="alice"):
        principal = self.principal(subject)
        return principal, self.core.register(principal)

    def key(self, principal, view, identifier="1", **kwargs):
        fields = {"account_id": view["account_id"], "tenant_id": view["tenant_id"], "reference": "vaultref:" + identifier * 32,
                  "provider": "fixture-customer-provider", "models": [self.model], "valid_until": self.clock + 100_000, "evidence_ref": "fixture-vault-validation"}
        fields.update(kwargs)
        return self.boundary.validated_vault_reference(**fields)

    def payment(self, intent, **kwargs):
        fields = {"provider": "fixture-payments", "payment_id": "fixture-payment-1", "merchant_account": intent["merchant_account"],
                  "merchant_reference": intent["merchant_reference"], "account_id": intent["account"], "tenant_id": intent["tenant"],
                  "amount_cent": 500, "currency": "EUR", "purpose": "trial_topup", "settled_at": self.clock, "evidence_ref": "fixture-authoritative-settlement"}
        fields.update(kwargs)
        return self.boundary.settled_payment(**fields)

    def managed(self, subject="alice", start=True):
        principal, view = self.register(subject)
        self.core.activate_workspace(principal, view["tenant_id"])
        intent = self.core.begin_trial_topup(principal, view["tenant_id"])
        self.core.confirm_trial_topup(self.payment(intent))
        self.core.select_managed_funding(principal, view["tenant_id"])
        if start:
            view = self.core.start_trial(principal, view["tenant_id"])
        return principal, view, intent

    def usage(self, row, actual, **kwargs):
        fields = {"reservation_id": row["id"], "tenant_id": row["tenant"], "actual_cost_micro_eur": actual,
                  "price_version": row["price_version"], "model_id": row["model_id"],
                  "provider_request_ref": "fixture-provider-request:" + row["id"], "evidence_ref": "fixture-usage-readback"}
        fields.update(kwargs)
        return self.boundary.verified_usage(**fields)

    def reserve(self, principal, tenant, key, maximum=1000, **kwargs):
        fields = {"request_key": key, "maximum_micro_eur": maximum, "model_id": self.model, "price_version": "fixture-price-v1"}
        fields.update(kwargs)
        return self.core.reserve(principal, tenant, **fields)

    def blocked(self, code, action):
        with self.assertRaises(domain.DomainError) as raised:
            action()
        self.assertEqual(raised.exception.code, code)

    def test_managed_purchase_and_reservation_cannot_follow_reconfigured_binding(self):
        principal, view, intent = self.managed()
        tenant = view["tenant_id"]
        row = self.reserve(principal, tenant, "before-config-change")
        original = dict(self.binding.data)
        for field in ("merchant_account", "route_contract_ref", "terms_ref"):
            with self.subTest(field=field):
                changed = self.reopen(managed_binding=self.boundary.approved_managed_binding(
                    **{**original, field: "fixture-replaced"}))
                self.blocked("managed_purchase_binding_changed", lambda: changed.select_managed_funding(principal, tenant))
                self.blocked("managed_purchase_binding_changed", lambda: changed.reserve(principal, tenant,
                    request_key="after-change", maximum_micro_eur=1000, model_id=self.model, price_version="fixture-price-v1"))
                self.blocked("managed_purchase_binding_changed", lambda: changed.claim_execution(principal, tenant,
                    row["id"], attempt_ref="changed-route"))
        reopened = self.reopen()
        self.assertEqual(reopened.claim_execution(principal, tenant, row["id"], attempt_ref="original-route")["state"], "dispatched")
        # An already dispatched outcome can still reconcile against its persisted reservation.
        changed.settle(self.usage(row, 100))

    def test_legacy_managed_reservation_without_snapshot_cannot_dispatch_but_can_cancel(self):
        principal, view, _ = self.managed()
        tenant = view["tenant_id"]
        row = self.reserve(principal, tenant, "legacy-binding")
        with self.core._db() as db:
            db.execute("ALTER TABLE ss_reservation DROP COLUMN managed_snapshot")
        self.blocked("reservation_managed_binding_changed", lambda: self.reopen().claim_execution(
            principal, tenant, row["id"], attempt_ref="legacy"))
        self.assertEqual(self.core.cancel_reserved(principal, tenant, row["id"])["state"], "cancelled")

    def test_parallel_legacy_starts_serialize_snapshot_schema_migration(self):
        principal, view, _ = self.managed()
        row = self.reserve(principal, view["tenant_id"], "legacy-parallel")
        with self.core._db() as db:
            db.execute("ALTER TABLE ss_reservation DROP COLUMN managed_snapshot")
        readers = threading.Barrier(2)
        start = threading.Barrier(2)
        real_connect = sqlite3.connect

        class RacingConnection(sqlite3.Connection):
            def execute(inner, sql, parameters=()):
                cursor = super().execute(sql, parameters)
                if sql == "PRAGMA table_info(ss_reservation)" and not inner.in_transaction:
                    rows = cursor.fetchall()
                    readers.wait(timeout=5)
                    return rows
                return cursor

        def connect(*args, **kwargs):
            return real_connect(*args, **kwargs, factory=RacingConnection)

        def reopen(_):
            start.wait(timeout=5)
            try:
                self.reopen()
                return "started"
            except sqlite3.OperationalError as exc:
                return str(exc)

        with mock.patch.object(domain.sqlite3, "connect", side_effect=connect):
            with ThreadPoolExecutor(max_workers=2) as workers:
                results = list(workers.map(reopen, range(2)))
        self.assertEqual(results, ["started", "started"])
        self.blocked("reservation_managed_binding_changed", lambda: self.reopen().claim_execution(
            principal, view["tenant_id"], row["id"], attempt_ref="legacy-parallel"))
        self.assertEqual(self.core.cancel_reserved(principal, view["tenant_id"], row["id"])["state"], "cancelled")

    def test_verified_registration_deduplicates_and_never_grants_admin_or_free_credit(self):
        principal, one = self.register()
        two = self.core.register(principal)
        self.assertEqual(one, two)
        self.assertEqual(one["role"], "customer")
        self.assertEqual(one["wallet"], {"balance_micro_eur": 0, "held_micro_eur": 0})
        self.assertIsNone(one["trial_started_at"])
        self.blocked("identity_link_required_no_duplicate_trial", lambda: self.core.register(self.principal("other-subject", email="ALICE@example.invalid")))
        self.blocked("settings_scope_invalid", lambda: self.core.update_settings(principal, one["tenant_id"], {"role": "admin"}))

    def test_client_claims_foreign_authority_and_raw_provider_keys_are_rejected(self):
        self.blocked("trusted_principal_required", lambda: self.core.register({"email_verified": True, "subject": "alice"}))
        other = domain.TrustedBoundary().verified_principal(issuer="fixture-idp", subject="x", email="x@example.invalid", verified_at=self.clock, evidence_ref="fixture")
        self.blocked("trusted_principal_required", lambda: self.core.register(other))
        principal, view = self.register()
        self.blocked("opaque_vault_reference_required", lambda: self.key(principal, view, reference="sk-not-a-vault-reference"))

    def test_trial_starts_only_after_activation_funding_and_explicit_start_then_never_resets(self):
        principal, view = self.register(); tenant = view["tenant_id"]
        self.blocked("workspace_activation_required", lambda: self.core.start_trial(principal, tenant))
        self.core.activate_workspace(principal, tenant)
        self.blocked("explicit_validated_funding_required", lambda: self.core.start_trial(principal, tenant))
        self.core.bind_byok(principal, tenant, self.key(principal, view))
        started = self.core.start_trial(principal, tenant)
        self.assertEqual(started["trial_expires_at"] - started["trial_started_at"], 86400)
        self.clock += 86401
        self.core.bind_byok(principal, tenant, self.key(principal, view, "2"))
        again = self.core.start_trial(principal, tenant)
        self.assertEqual(again["trial_started_at"], started["trial_started_at"])
        self.assertEqual(self.core.register(principal)["trial_expires_at"], started["trial_expires_at"])
        self.assertEqual(again["entitlement"], "trial_expired")
        self.blocked("suite_entitlement_required", lambda: self.reserve(principal, tenant, "after-expiry", 0))

    def test_receipt_checks_amount_currency_merchant_purpose_owner_reference_and_replay_atomically(self):
        principal, view = self.register(); tenant = view["tenant_id"]
        self.core.activate_workspace(principal, tenant); intent = self.core.begin_trial_topup(principal, tenant)
        for wrong in ({"amount_cent": 499}, {"currency": "USD"}, {"merchant_account": "wrong"}, {"purpose": "normal_prepaid"},
                      {"tenant_id": "other"}, {"account_id": "other"}, {"merchant_reference": "unknown"}):
            with self.subTest(wrong=wrong), self.assertRaises(domain.DomainError):
                self.core.confirm_trial_topup(self.payment(intent, **wrong))
        self.assertEqual(self.core.read(principal, tenant)["wallet"]["balance_micro_eur"], 0)
        receipt = self.payment(intent)
        self.core.confirm_trial_topup(receipt)
        self.assertTrue(self.core.confirm_trial_topup(self.payment(intent, evidence_ref="fixture-refreshed-proof"))["replayed"])
        self.assertEqual(self.core.read(principal, tenant)["wallet"]["balance_micro_eur"], 5_000_000)
        self.assertEqual(self.core.read(principal, tenant)["entitlement"], "not_started")
        self.blocked("initial_trial_topup_already_used", lambda: self.core.begin_trial_topup(principal, tenant))
        with self.core._db() as db:
            self.assertEqual(db.execute("SELECT count(*) FROM ss_ledger").fetchone()[0], 1)

    def test_default_route_and_price_versions_are_closed_without_fixture_approvals(self):
        principal, view = self.register(); tenant = view["tenant_id"]
        self.core.activate_workspace(principal, tenant)
        default = self.reopen(managed_binding=None, approved_price_versions=(), approved_plan_refs=())
        self.blocked("approved_operational_managed_route_required", lambda: default.begin_trial_topup(principal, tenant))
        intent = self.core.begin_trial_topup(principal, tenant); self.core.confirm_trial_topup(self.payment(intent)); self.core.select_managed_funding(principal, tenant); self.core.start_trial(principal, tenant)
        no_rates = self.reopen(approved_price_versions=())
        self.blocked("approved_price_version_required", lambda: no_rates.reserve(principal, tenant, request_key="no-pricing", maximum_micro_eur=1, model_id=self.model, price_version="fixture-price-v1"))
        self.blocked("managed_model_not_approved", lambda: self.reserve(principal, tenant, "unknown-model", model_id="unapproved/model"))
        reserved = self.reserve(principal, tenant, "approved-then-withdrawn")
        self.blocked("approved_price_version_required", lambda: no_rates.claim_execution(principal, tenant, reserved["id"], attempt_ref="withdrawn-price"))
        self.core.cancel_reserved(principal, tenant, reserved["id"])
        self.core.cancel_reserved(principal, tenant, reserved["id"])
        self.assertEqual(self.core.read(principal, tenant)["wallet"]["held_micro_eur"], 0)

    def test_parallel_reservations_cannot_overdraw_and_actual_usage_is_settled_once(self):
        principal, view, _ = self.managed(); tenant = view["tenant_id"]
        def reserve(index):
            try:
                return self.reserve(principal, tenant, "parallel-" + str(index), 2_000_000)
            except domain.DomainError as error:
                return error.code
        with ThreadPoolExecutor(max_workers=8) as executor:
            results = list(executor.map(reserve, range(8)))
        successful = [result for result in results if isinstance(result, dict)]
        self.assertEqual(len(successful), 2); self.assertEqual(results.count("insufficient_funded_balance"), 6)
        for row in successful:
            self.core.claim_execution(principal, tenant, row["id"], attempt_ref="fixture-once")
            self.core.settle(self.usage(row, 1_000_000)); self.core.settle(self.usage(row, 1_000_000, evidence_ref="new-proof-same-usage"))
        self.assertEqual(self.core.read(principal, tenant)["wallet"], {"balance_micro_eur": 3_000_000, "held_micro_eur": 0})

    def test_tenant_and_vault_ownership_cannot_be_selected_by_a_caller(self):
        alice, av = self.register("alice"); bob, bv = self.register("bob")
        self.blocked("own_customer_workspace_required", lambda: self.core.read(bob, av["tenant_id"]))
        self.blocked("own_customer_workspace_required", lambda: self.core.activate_workspace(bob, av["tenant_id"]))
        self.blocked("vault_ownership_or_validity_mismatch", lambda: self.core.bind_byok(bob, bv["tenant_id"], self.key(alice, av)))

    def test_byok_revocation_never_falls_back_to_company_balance(self):
        principal, view, _ = self.managed(); tenant = view["tenant_id"]
        bound = self.core.bind_byok(principal, tenant, self.key(principal, view))
        key_id = bound["key_references"][0]["id"]
        row = self.reserve(principal, tenant, "byok-one", 0)
        self.assertEqual(row["mode"], "byok")
        self.blocked("byok_cannot_reserve_company_money", lambda: self.reserve(principal, tenant, "byok-cost", 1))
        self.core.revoke_byok(principal, tenant, key_id)
        self.blocked("validated_byok_unavailable_no_platform_fallback", lambda: self.reserve(principal, tenant, "after-revoke", 0))
        self.assertEqual(self.core.read(principal, tenant)["wallet"]["balance_micro_eur"], 5_000_000)

    def test_unknown_external_outcome_keeps_hold_and_no_new_claim_after_expiry(self):
        principal, view, _ = self.managed(); tenant = view["tenant_id"]
        row = self.reserve(principal, tenant, "unknown-once", 1000)
        self.assertEqual(self.reserve(principal, tenant, "unknown-once", 1000)["id"], row["id"])
        self.core.claim_execution(principal, tenant, row["id"], attempt_ref="fixture-call")
        self.core.mark_outcome_unknown(principal, tenant, row["id"])
        self.blocked("undispatched_reservation_required", lambda: self.core.cancel_reserved(principal, tenant, row["id"]))
        self.blocked("execution_already_claimed_or_unavailable", lambda: self.core.claim_execution(principal, tenant, row["id"], attempt_ref="blind-retry"))
        self.clock += 86401
        self.assertEqual(self.core.read(principal, tenant)["wallet"]["held_micro_eur"], 1000)
        self.core.settle(self.usage(row, 400))
        self.assertEqual(self.core.read(principal, tenant)["wallet"], {"balance_micro_eur": 4_999_600, "held_micro_eur": 0})
        self.blocked("suite_entitlement_required", lambda: self.reserve(principal, tenant, "new-expired"))

    def test_same_vault_reference_revalidation_cannot_retarget_reserved_execution(self):
        principal, view, _ = self.managed(); tenant = view["tenant_id"]
        self.core.bind_byok(principal, tenant, self.key(principal, view))
        replay = self.reserve(principal, tenant, "pure-key-replay", 0)
        self.core.bind_byok(principal, tenant, self.key(principal, view, evidence_ref="refreshed-same-binding-proof"))
        self.core.claim_execution(principal, tenant, replay["id"], attempt_ref="same-binding-valid")
        for index, changed in enumerate(({"provider": "different-validated-provider"}, {"models": [self.model, "another-approved-model"]}, {"valid_until": self.clock + 200_000})):
            self.core.bind_byok(principal, tenant, self.key(principal, view))
            reserved = self.reserve(principal, tenant, "before-revalidation-" + str(index), 0)
            self.core.bind_byok(principal, tenant, self.key(principal, view, **changed))
            self.blocked("reservation_credential_binding_changed", lambda: self.reopen().claim_execution(principal, tenant, reserved["id"], attempt_ref="changed-key-denied"))
            self.core.bind_byok(principal, tenant, self.key(principal, view))
            self.blocked("reservation_credential_binding_changed", lambda: self.core.claim_execution(principal, tenant, reserved["id"], attempt_ref="reverted-version-denied"))
        with self.core._db() as db:
            self.assertGreaterEqual(db.execute("SELECT count(*) FROM ss_key_version").fetchone()[0], 7)

    def test_provider_usage_cannot_be_charged_twice_and_oversettlement_is_closed(self):
        principal, view, _ = self.managed(); tenant = view["tenant_id"]
        one = self.reserve(principal, tenant, "usage-one"); two = self.reserve(principal, tenant, "usage-two")
        for row in (one, two): self.core.claim_execution(principal, tenant, row["id"], attempt_ref="fixture-call")
        self.blocked("bounded_dispatched_usage_required", lambda: self.core.settle(self.usage(one, 1001)))
        self.core.settle(self.usage(one, 500, provider_request_ref="fixture-single-provider-event"))
        self.blocked("provider_usage_already_bound", lambda: self.core.settle(self.usage(two, 500, provider_request_ref="fixture-single-provider-event")))
        self.assertEqual(self.core.read(principal, tenant)["wallet"], {"balance_micro_eur": 4_999_500, "held_micro_eur": 1000})

    def test_conversion_preserves_identity_deadline_settings_keys_and_wallet(self):
        principal, view, _ = self.managed(); tenant = view["tenant_id"]
        self.core.update_settings(principal, tenant, {"locale": "de", "workspace_name": "Fixture workspace"})
        before = self.core.bind_byok(principal, tenant, self.key(principal, view))
        approval = self.boundary.approved_conversion(account_id=view["account_id"], tenant_id=tenant, workspace_id=view["workspace_id"], plan_ref="fixture-suite-plan", terms_ref="fixture-accepted-plan-terms", billing_evidence_ref="fixture-authoritative-paid-plan")
        converted = self.core.convert(principal, tenant, approval)
        repeated = self.core.convert(principal, tenant, approval)
        for key in ("account_id", "tenant_id", "workspace_id", "settings", "key_references", "wallet", "trial_started_at", "trial_expires_at"):
            self.assertEqual(converted[key], before[key]); self.assertEqual(repeated[key], before[key])
        self.assertEqual(converted["entitlement"], "paid")
        expected_receipt = converted["conversion_receipt"]
        self.assertEqual(expected_receipt["terms_ref"], "fixture-accepted-plan-terms")
        self.assertEqual(expected_receipt["billing_evidence_ref"], "fixture-authoritative-paid-plan")
        restarted = self.reopen()
        self.assertEqual(restarted.convert(principal, tenant, approval)["conversion_receipt"], expected_receipt)
        for changes in ({"terms_ref": "different-terms"}, {"billing_evidence_ref": "different-billing"}):
            fields = dict(approval.data); fields.update(changes)
            changed_approval = self.boundary.approved_conversion(**fields)
            self.blocked("separate_conversion_terms_or_billing_change_required", lambda: restarted.convert(principal, tenant, changed_approval))
        self.assertEqual(restarted.read(principal, tenant)["conversion_receipt"], expected_receipt)
        self.clock += 86401
        self.assertEqual(self.core.read(principal, tenant)["entitlement"], "paid")

    def test_real_process_restart_reads_same_persistent_account_workspace_and_credit(self):
        principal, view, _ = self.managed()
        approval_fields = dict(account_id=view["account_id"], tenant_id=view["tenant_id"], workspace_id=view["workspace_id"], plan_ref="fixture-suite-plan", terms_ref="fixture-accepted-plan-terms", billing_evidence_ref="fixture-authoritative-paid-plan")
        view = self.core.convert(principal, view["tenant_id"], self.boundary.approved_conversion(**approval_fields))
        script = '''import importlib.util,json,sys
spec=importlib.util.spec_from_file_location("restarted_domain",sys.argv[1]);module=importlib.util.module_from_spec(spec);sys.modules[spec.name]=module;spec.loader.exec_module(module)
boundary=module.TrustedBoundary();core=module.SelfService(sys.argv[2],boundary=boundary,policy_path=sys.argv[3],now=lambda:int(sys.argv[4]),approved_plan_refs=["fixture-suite-plan"])
principal=boundary.verified_principal(issuer="fixture-idp",subject="alice",email="alice@example.invalid",verified_at=int(sys.argv[4])-10,evidence_ref="fixture-reverified-after-restart")
registered=core.register(principal)
print(json.dumps(core.convert(principal,registered["tenant_id"],boundary.approved_conversion(**json.loads(sys.argv[5])))))'''
        result = subprocess.run([sys.executable, "-c", script, str(FILE), str(self.database), str(ROOT / "config/selfservice-policy.json"), str(self.clock), json.dumps(approval_fields)], capture_output=True, text=True, check=True)
        restarted = json.loads(result.stdout)
        for key in ("account_id", "tenant_id", "workspace_id", "trial_started_at", "trial_expires_at", "wallet", "conversion_receipt"):
            self.assertEqual(restarted[key], view[key] if key != "wallet" else self.core.read(principal, view["tenant_id"])[key])


if __name__ == "__main__":
    unittest.main()

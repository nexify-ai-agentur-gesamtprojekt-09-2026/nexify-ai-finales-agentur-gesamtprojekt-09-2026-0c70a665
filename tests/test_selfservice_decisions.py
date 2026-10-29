"""Decision regressions using existing synthetic domain fixtures.

Suite start follows the documented contract; no unfunded model execution.
"""
import sqlite3
from pathlib import Path
import unittest
import test_selfservice_domain as baseline

domain = baseline.domain

class SelfserviceDecisionTests(unittest.TestCase):
    def setUp(self):
        self.fixture = baseline.SelfServiceTests()
        self.fixture.setUp()
        self.addCleanup(self.fixture.tearDown)

    def test_unfunded_suite_trial_does_not_create_model_reservation_or_credit(self):
        """A suite grant cannot itself authorize model execution or credit."""
        principal, view = self.fixture.register(); tenant = view["tenant_id"]
        self.fixture.core.activate_workspace(principal, tenant)
        started = self.fixture.core.start_trial(principal, tenant)
        with sqlite3.connect(self.fixture.database) as db:
            before = list(db.iterdump())
        # The public/UI trial promise cannot itself authorize model execution.
        self.fixture.blocked("explicit_validated_funding_required", lambda: self.fixture.reserve(principal, tenant, "unfunded", 0))
        with sqlite3.connect(self.fixture.database) as db:
            self.assertEqual(list(db.iterdump()), before)
        observed = self.fixture.core.register(principal)
        self.assertEqual(observed["trial_started_at"], started["trial_started_at"])
        self.assertEqual(observed["entitlement"], "trial_active")
        self.assertEqual(observed["wallet"], {"balance_micro_eur": 0, "held_micro_eur": 0})

    def test_local_sqlite_backup_restore_preserves_reserved_request_and_tenant_boundary(self):
        """Synthetic point-in-time restore only; no production or provider recovery proof."""
        principal, view, intent = self.fixture.managed(); tenant = view["tenant_id"]
        reservation = self.fixture.reserve(principal, tenant, "restore-idempotency", 1000)
        snapshot = Path(self.fixture.temp.name) / "snapshot.sqlite"
        with sqlite3.connect(self.fixture.database) as source, sqlite3.connect(snapshot) as target:
            source.backup(target)
        restored = domain.SelfService(snapshot, boundary=self.fixture.boundary, now=lambda:self.fixture.clock,
            managed_binding=self.fixture.binding, approved_price_versions=("fixture-price-v1",),
            approved_plan_refs=("fixture-suite-plan",))
        with sqlite3.connect(snapshot) as db:
            self.assertEqual(db.execute("PRAGMA integrity_check").fetchone()[0], "ok")
        self.assertEqual(restored.register(principal), self.fixture.core.register(principal))
        repeated = restored.reserve(principal, tenant, request_key="restore-idempotency",
            maximum_micro_eur=1000, model_id=self.fixture.model, price_version="fixture-price-v1")
        self.assertEqual(repeated["id"], reservation["id"])
        self.assertEqual(restored.register(principal)["wallet"], self.fixture.core.register(principal)["wallet"])
        other = self.fixture.principal("bob"); restored.register(other)
        self.fixture.blocked("own_customer_workspace_required", lambda: restored.reserve(other, tenant,
            request_key="wrong-tenant", maximum_micro_eur=1000, model_id=self.fixture.model, price_version="fixture-price-v1"))

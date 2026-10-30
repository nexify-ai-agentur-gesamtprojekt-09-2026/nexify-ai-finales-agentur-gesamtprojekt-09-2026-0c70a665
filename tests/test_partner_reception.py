"""Isolated role/tenant fixtures for partner request storage vs fail-closed reception."""
import importlib.util
import sqlite3
import unittest
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("partner", ROOT / "apps/agent-gateway/partner.py")
partner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(partner)


class PartnerReceptionTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row

        @contextmanager
        def connect():
            yield self.db
        self.reception = partner.PartnerReception(connect)
        # Separate synthetic test data (no real personal data).
        self.a1 = self.reception.submit("visitor-a1", "tenant-nord", {"company": "Muster Kfz Nord", "contact": "Test Person", "email": "test-nord@example.invalid", "message": "Synthetischer Testantrag A1", "locale": "de"})
        self.a2 = self.reception.submit("visitor-a2", "tenant-nord", {"company": "Muster Kfz Nord 2", "contact": "Test Person 2", "email": "test-nord2@example.invalid", "message": "Synthetischer Testantrag A2", "locale": "de"})
        self.b1 = self.reception.submit("visitor-b1", "tenant-sued", {"company": "Muster Kfz Süd", "contact": "Test Person 3", "email": "test-sued@example.invalid", "message": "Synthetischer Testantrag B1", "locale": "de"})

    def test_submit_stores_pending_review_without_delivery_claim(self):
        self.assertEqual(self.a1["status"], "pending_review")
        self.assertTrue(self.a1["stored"])
        self.assertFalse(self.a1["received"])
        self.assertFalse(self.a1["approved"])
        self.assertFalse(self.a1["delivered"])

    def test_authorised_recipient_sees_only_own_tenant(self):
        nord = partner.Actor(role="partner", tenant="tenant-nord", mfa=False)
        sued = partner.Actor(role="staff", tenant="tenant-sued", mfa=False)
        self.assertEqual({r["id"] for r in self.reception.inbox(nord, "tenant-nord")}, {self.a1["id"], self.a2["id"]})
        self.assertEqual({r["id"] for r in self.reception.inbox(sued, "tenant-sued")}, {self.b1["id"]})

    def test_reception_is_fail_closed_without_role(self):
        no_role = partner.Actor(role=None, tenant="tenant-nord")
        with self.assertRaises(partner.PartnerError) as ctx:
            self.reception.inbox(no_role, "tenant-nord")
        self.assertEqual(ctx.exception.code, "recipient_role_required")

    def test_reception_rejects_cross_tenant_read(self):
        nord = partner.Actor(role="partner", tenant="tenant-nord")
        with self.assertRaises(partner.PartnerError) as ctx:
            self.reception.inbox(nord, "tenant-sued")
        self.assertEqual(ctx.exception.code, "recipient_tenant_mismatch")

    def test_submitter_is_not_automatically_a_recipient(self):
        # A visitor id is not an authorised partner/staff actor; storage != reception.
        visitor_actor = partner.Actor(role=None, tenant="tenant-nord")
        with self.assertRaises(partner.PartnerError):
            self.reception.inbox(visitor_actor, "tenant-nord")

    def test_status_write_requires_mfa_and_same_tenant(self):
        nord_no_mfa = partner.Actor(role="partner", tenant="tenant-nord", mfa=False)
        with self.assertRaises(partner.PartnerError) as ctx:
            self.reception.set_status(nord_no_mfa, "tenant-nord", self.a1["id"], "accepted")
        self.assertEqual(ctx.exception.code, "mfa_required_for_writes")
        nord_mfa = partner.Actor(role="partner", tenant="tenant-nord", mfa=True)
        self.assertEqual(self.reception.set_status(nord_mfa, "tenant-nord", self.a1["id"], "accepted")["status"], "accepted")
        # cross-tenant write is rejected even with MFA
        sued_mfa = partner.Actor(role="staff", tenant="tenant-sued", mfa=True)
        with self.assertRaises(partner.PartnerError) as ctx:
            self.reception.set_status(sued_mfa, "tenant-sued", self.a2["id"], "accepted")
        self.assertEqual(ctx.exception.code, "recipient_tenant_mismatch")

    def test_submit_rejects_unexpected_field_and_invalid_tenant(self):
        with self.assertRaises(partner.PartnerError):
            self.reception.submit("visitor-x", "tenant-nord", {"company": "X", "contact": "Y", "email": "z@example.invalid", "message": "m", "locale": "de", "role": "admin"})
        with self.assertRaises(partner.PartnerError):
            self.reception.submit("visitor-x", "bad tenant!", {"company": "X", "contact": "Y", "email": "z@example.invalid", "message": "m", "locale": "de"})
        with self.assertRaises(partner.PartnerError):
            self.reception.submit("", "tenant-nord", {"company": "X", "contact": "Y", "email": "z@example.invalid", "message": "m", "locale": "de"})


if __name__ == "__main__":
    unittest.main()

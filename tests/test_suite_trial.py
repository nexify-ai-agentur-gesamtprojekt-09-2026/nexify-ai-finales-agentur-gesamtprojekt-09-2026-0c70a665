"""Synthetic local suite lifecycle; no real provider, identity or payment calls."""
from concurrent.futures import ThreadPoolExecutor
import sqlite3
import unittest
import test_selfservice_domain as baseline

class SuiteTrialTests(unittest.TestCase):
    def setUp(self):
        self.f = baseline.SelfServiceTests()
        self.f.setUp()
        self.addCleanup(self.f.tearDown)
        self.principal, self.view = self.f.register()
        self.tenant = self.view['tenant_id']

    def activate(self):
        self.f.core.activate_workspace(self.principal, self.tenant)

    def start(self):
        return self.f.core.start_trial(self.principal, self.tenant)

    def test_unverified_client_foreign_authority_future_identity_and_foreign_tenant(self):
        self.activate()
        for principal in [None, {'subject':'alice','email_verified':False}, {'subject':'alice','email_verified':True},
            baseline.domain.TrustedBoundary().verified_principal(issuer='fixture-idp',subject='alice',email='alice@example.invalid',verified_at=self.f.clock,evidence_ref='fixture')]:
            self.f.blocked('trusted_principal_required',lambda:self.f.core.start_trial(principal,self.tenant))
        future=self.f.principal(verified_at=self.f.clock+1)
        self.f.blocked('future_identity_verification',lambda:self.f.core.start_trial(future,self.tenant))
        other, other_view=self.f.register('bob')
        self.f.blocked('own_customer_workspace_required',lambda:self.f.core.start_trial(other,self.tenant))
        self.assertIsNone(self.f.core.read(self.principal,self.tenant)['trial_started_at'])
        self.assertIsNone(other_view['trial_started_at'])

    def test_inactive_and_deactivated_workspace_cannot_start_or_replay_grant(self):
        self.f.blocked('workspace_activation_required',self.start)
        self.activate();started=self.start()
        # No public deactivate API exists. Simulate persisted inactive state only.
        with sqlite3.connect(self.f.database) as db:
            db.execute('UPDATE ss_workspace SET activated_at=NULL WHERE tenant=?',(self.tenant,))
        self.f.blocked('workspace_activation_required',self.start)
        self.activate();self.f.clock+=60
        self.assertEqual(self.start()['trial_expires_at'],started['trial_expires_at'])

    def test_parallel_start_and_restart_write_one_fixed_server_window_without_funding(self):
        self.activate()
        with ThreadPoolExecutor(max_workers=8) as pool:
            results=list(pool.map(lambda _:self.f.reopen().start_trial(self.principal,self.tenant),range(8)))
        self.assertEqual({r['trial_started_at'] for r in results},{self.f.clock})
        self.assertEqual({r['trial_expires_at'] for r in results},{self.f.clock+86400})
        self.f.clock+=10
        self.assertEqual(self.f.reopen().start_trial(self.principal,self.tenant)['trial_started_at'],results[0]['trial_started_at'])
        self.assertEqual(results[0]['wallet'],{'balance_micro_eur':0,'held_micro_eur':0})
        self.assertIsNone(results[0]['funding_mode'])

    def test_expiry_exact_boundary_and_later_funding_never_extend_trial(self):
        self.activate();started=self.start()
        self.f.clock=started['trial_expires_at']-1
        self.assertEqual(self.start()['entitlement'],'trial_active')
        self.f.clock+=1
        self.assertEqual(self.start()['entitlement'],'trial_expired')
        self.f.core.bind_byok(self.principal,self.tenant,self.f.key(self.principal,self.view))
        self.f.blocked('suite_entitlement_required',lambda:self.f.reserve(self.principal,self.tenant,'expired',0))
        again=self.start()
        self.assertEqual((again['trial_started_at'],again['trial_expires_at']),(started['trial_started_at'],started['trial_expires_at']))

    def test_valid_byok_transition_and_revocation_keep_execution_funding_guard(self):
        self.activate();started=self.start()
        self.f.blocked('explicit_validated_funding_required',lambda:self.f.reserve(self.principal,self.tenant,'before',0))
        self.f.blocked('execution_already_claimed_or_unavailable',lambda:self.f.core.claim_execution(self.principal,self.tenant,'missing',attempt_ref='fixture'))
        self.f.core.bind_byok(self.principal,self.tenant,self.f.key(self.principal,self.view))
        authorized=self.f.reserve(self.principal,self.tenant,'authorized-execution',0)
        execution=self.f.core.claim_execution(self.principal,self.tenant,authorized['id'],attempt_ref='authorized')
        self.assertEqual(execution['state'],'dispatched')
        row=self.f.reserve(self.principal,self.tenant,'after',0)
        self.assertEqual(self.start()['trial_expires_at'],started['trial_expires_at'])
        self.f.core.revoke_byok(self.principal,self.tenant,row['key_id'])
        self.f.blocked('validated_byok_unavailable_no_platform_fallback',lambda:self.f.core.claim_execution(self.principal,self.tenant,row['id'],attempt_ref='revoked'))
        self.f.blocked('validated_byok_unavailable_no_platform_fallback',lambda:self.f.reserve(self.principal,self.tenant,'revoked-new',0))
        self.assertEqual(self.f.core.read(self.principal,self.tenant)['wallet'],{'balance_micro_eur':0,'held_micro_eur':0})

    def test_managed_funding_requires_settlement_after_suite_start(self):
        self.activate();started=self.start()
        self.f.blocked('confirmed_trial_purchase_required',lambda:self.f.core.select_managed_funding(self.principal,self.tenant))
        intent=self.f.core.begin_trial_topup(self.principal,self.tenant)
        self.f.blocked('confirmed_trial_purchase_required',lambda:self.f.core.select_managed_funding(self.principal,self.tenant))
        self.f.core.confirm_trial_topup(self.f.payment(intent))
        self.f.core.select_managed_funding(self.principal,self.tenant)
        row=self.f.reserve(self.principal,self.tenant,'managed-after',1000)
        self.assertEqual(row['state'],'reserved')
        self.assertEqual(self.start()['trial_started_at'],started['trial_started_at'])
        self.assertEqual(self.start()['trial_expires_at'],started['trial_expires_at'])

    def test_stale_funding_does_not_block_suite_but_still_blocks_model_reservation(self):
        self.activate()
        self.f.core.bind_byok(self.principal,self.tenant,self.f.key(self.principal,self.view))
        self.f.clock+=100001
        started=self.start()
        self.assertEqual(started['entitlement'],'trial_active')
        self.f.blocked('validated_byok_unavailable_no_platform_fallback',lambda:self.f.reserve(self.principal,self.tenant,'stale',0))
        self.assertEqual(started['wallet'],{'balance_micro_eur':0,'held_micro_eur':0})

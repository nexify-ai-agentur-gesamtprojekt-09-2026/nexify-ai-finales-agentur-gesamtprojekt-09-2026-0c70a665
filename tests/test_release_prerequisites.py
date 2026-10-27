"""Prevent historical setup evidence from silently removing current release gates."""
import json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
class ReleasePrerequisiteTests(unittest.TestCase):
    def test_project_setup_does_not_substitute_for_production_domain_binding(self):
        policy=json.loads((ROOT/'config/clerk-production.json').read_text())
        if not policy['domain_decision']['remote_binding_verified']:
            self.assertIn('verify_production_domain_binding_to_exact_project_before_release',policy['open_prerequisites'])
        self.assertFalse(policy['domain_decision']['switch_cloud_dns_before_final_acceptance'])
    def test_historically_linked_project_requires_verification_not_duplicate_setup(self):
        topology=json.loads((ROOT/'config/deployment-topology.json').read_text())
        self.assertEqual(topology['connection_history']['status'],'historically_linked_no_reconnect_requested')
        self.assertNotIn('connect_vercel_project',topology['open_prerequisites'])
        self.assertIn('verify_current_project_root_build_output_and_domain_bindings',topology['open_prerequisites'])
        current=json.loads((ROOT/topology['connection_history']['current_settings_evidence']).read_text())
        self.assertTrue(all(current['project'][key] is None for key in ('rootDirectory','buildCommand','outputDirectory','productionBranch')))
        self.assertFalse(topology['connection_history']['current_root_build_output_production_branch_verified'])

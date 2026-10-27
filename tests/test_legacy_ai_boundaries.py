"""Offline legacy boundary tests: no oracle, provider, secret file or remote brain."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('retired_jeff_gate', ROOT / 'tools/legacy_oracle_candidate.py')
GATE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GATE)


class NoCredentialEnvironment(dict):
    def get(self, key, default=None):
        if 'KEY' in key or 'TOKEN' in key or 'SECRET' in key:
            raise AssertionError('credential read is forbidden in this retired path')
        return super().get(key, default)


class LegacyAIBoundaries(unittest.TestCase):
    def policy(self):
        return json.loads((ROOT / 'config/llm-policy.json').read_text())

    def node(self, source):
        result = subprocess.run(['node', '--input-type=module', '-e', source], cwd=ROOT,
                                capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result

    def test_oracle_plan_pins_model_high_and_endpoint_without_credentials(self):
        body = GATE.request_plan('change', 'risk', 'rollback',
                                 environment=NoCredentialEnvironment(), policy=self.policy())
        self.assertEqual(body['model'], 'deepseek/deepseek-v4.1-flash-1017')
        self.assertEqual(body['reasoning'], {'effort': 'high'})
        self.assertEqual(body['provider'], {'require_parameters': True, 'allow_fallbacks': False})
        for endpoint in ['https://evil.invalid/query', GATE.ENDPOINT + '?redirect=evil',
                         'http://openrouter.ai/api/v1/chat/completions',
                         'https://openrouter.ai@evil.invalid/api/v1/chat/completions']:
            with self.subTest(endpoint=endpoint), self.assertRaises(GATE.GateBlocked):
                GATE.request_plan('change', 'risk', 'rollback', policy=self.policy(),
                                  environment=NoCredentialEnvironment(NX_ORAKEL_ENDPOINT=endpoint))
        with self.assertRaises(GATE.GateBlocked):
            GATE.request_plan('change', 'risk', 'rollback', policy=self.policy(),
                              environment=NoCredentialEnvironment(NX_ORAKEL_MODEL='other/model'))

    def test_opt_in_python_candidate_never_returns_go_or_launches(self):
        output = io.StringIO()
        with mock.patch.object(GATE.os, 'environ', NoCredentialEnvironment()), contextlib.redirect_stdout(output):
            self.assertEqual(GATE.main(['--was', 'change', '--risiko', 'low', '--rollback', 'undo']), 3)
        value = json.loads(output.getvalue())
        self.assertFalse(value['verfuegbar'])
        self.assertFalse(value['runtime_launched'])
        self.assertEqual(value['entscheidung'], 'rueckfrage')
        self.assertNotIn('go', value.values())

    def test_opt_in_node_candidate_is_not_wired_into_running_legacy(self):
        self.node(r"""
          import assert from 'node:assert/strict';
          import {blockedLegacyOracleRuntime,blockedLegacyBrainRuntime} from './tools/legacy-oracle-boundary.mjs';
          assert.throws(()=>blockedLegacyOracleRuntime(['health']),/runtime_unverified_not_launched/);
          assert.throws(()=>blockedLegacyBrainRuntime(),/legacy_brain_runtime_scope_and_funding_unverified/);
        """)
        for name in ['jeff-kontext','lernschleife','wissen-abfrage','wissen-speisen']:
            text=(ROOT / f'tools/{name}.mjs').read_text()
            self.assertNotIn("from './legacy-oracle-boundary.mjs'",text)

    def test_running_legacy_sources_are_unmigrated_not_silently_disabled(self):
        import re
        direct = re.compile(r"(?:execFileSync|spawnSync|execSync|spawn)\s*\(\s*['\"]nx-jeff['\"]")
        matches=[]
        for folder in ['tools','hooks']:
            for path in (ROOT/folder).glob('*.mjs'):
                if direct.search(path.read_text()):matches.append(path)
        self.assertGreaterEqual(len(matches),13)
        for path in matches:
            self.assertNotIn('blockedLegacyOracleRuntime',path.read_text())
        backup=(ROOT/'tools/jeff-backup.mjs').read_text()
        self.assertIn("execFileSync('bash'",backup)
        self.assertIn("j.answers?.verdict?.choice || 'ok'",backup)  # Existing legacy gap, not an endorsed success claim.

    def test_search_only_import_has_no_side_effect_and_fakefetch_never_gets_credentials(self):
        self.node(r"""
          import assert from 'node:assert/strict';
          let calls=0;
          globalThis.fetch=()=>{calls++;throw new Error('implicit network forbidden');};
          const {recherche}=await import('./tools/recherche.mjs');
          assert.equal(calls,0);
          const result=await recherche('fixture',5,{fetch:async(url,options)=>{
            calls++;assert.ok(url.startsWith('http://127.0.0.1:8888/search?'));
            assert.equal(options,undefined);
            return {ok:true,json:async()=>({results:[{title:'source',url:'https://example.invalid/doc',content:'data'}]})};
          }});
          assert.equal(calls,1);assert.equal(result.model_invoked,false);assert.equal(result.quellenGeprueft,false);
        """)


if __name__ == '__main__':
    unittest.main()

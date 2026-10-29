"""Controlled command transcripts only: no GitHub/GitLab writes or network."""
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit
from tools import reviewed_delivery as delivery

HEAD, BASE = 'a' * 40, 'b' * 40
BRANCH = 'integration/synthetic-reviewed-delivery'


class CommandsDouble:
    def __init__(self):
        self.calls, self.writes = [], []
        self.remote = None
        self.main = BASE
        self.pr = None
        self.dirty, self.origin = False, True
        self.overlap = False
        self.push_unknown, self.pr_unknown = False, False
        self.apply_push, self.apply_pr = True, True
        self.ci_status = 'success'
        self.ci_unavailable, self.wrong_ci_sha = False, False
        self.optional_duplicates, self.required_duplicates = False, False
        self.after_ci, self.ci_observed = None, False
        self.workflow = {'id': 7, 'name': 'CI', 'path': '.github/workflows/ci.yml', 'state': 'active'}
        self.runs, self.jobs = None, None
        self.run_override, self.attempt_override = None, None
        self.jobs_total_delta, self.runs_total_delta = 0, 0
        self.after_jobs_attempt, self.after_jobs_new_run = False, False
        self.after_jobs_status = None
        self.jobs_observed = False
        self.short_pages, self.foreign_prs = True, []
        self.actor, self.origin_url = delivery.OWNER, delivery.ORIGIN
        self.head, self.branch = HEAD, BRANCH
        self.rewrites, self.transport_override, self.ancestor = False, False, True

    def pr_row(self):
        return {'number': 42, 'state': 'open', 'merged_at': None, 'draft': True,
                'base': {'ref': 'main', 'repo': {'full_name': delivery.REPO}},
                'head': {'ref': BRANCH, 'sha': HEAD, 'repo': {'full_name': delivery.REPO}},
                'user': {'login': delivery.OWNER}}

    def run_row(self, **changes):
        return {'id': 40558440811, 'workflow_id': 7, 'name': 'CI', 'path': '.github/workflows/ci.yml',
                'event': 'push', 'head_sha': BASE if self.wrong_ci_sha else HEAD,
                'head_branch': BRANCH, 'run_number': 147, 'run_attempt': 1,
                'status': 'completed', 'conclusion': self.ci_status, **changes}

    def job_rows(self, run):
        return [{'id': 900, 'name': 'ci', 'run_id': run['id'], 'run_attempt': run['run_attempt'],
                 'head_sha': HEAD, 'status': 'completed', 'conclusion': self.ci_status}]

    def reply(self, raw=b'', rc=0, unknown=False):
        return {'returncode': rc, 'stdout': raw if isinstance(raw, bytes) else delivery.canonical(raw), 'unknown': unknown}

    def run(self, argv, *, cwd, timeout):
        self.calls.append(argv)
        assert isinstance(argv, list) and all(isinstance(v, str) for v in argv)
        if argv[0] == 'git':
            candidates = ['status', 'rev-parse', 'symbolic-ref', 'check-ref-format', 'merge-base',
                          'config', 'remote', 'ls-remote', 'diff', 'cat-file', 'push']
            command = next(c for c in argv if c in candidates)
            args = argv[argv.index(command) + 1:]
            if command == 'status': return self.reply(b' M source.py\n' if self.dirty else b'')
            if command == 'rev-parse': return self.reply((self.head + '\n').encode())
            if command == 'symbolic-ref': return self.reply((self.branch + '\n').encode())
            if command == 'check-ref-format': return self.reply()
            if command == 'merge-base': return self.reply(rc=0 if self.ancestor else 1)
            if command == 'cat-file': return self.reply()
            if command == 'config':
                unsafe = self.rewrites if args[-1].startswith('^url') else self.transport_override
                return self.reply(b'configured\n' if unsafe else b'', rc=0 if unsafe else 1)
            if command == 'remote':
                if not args: return self.reply(b'origin\n' if self.origin else b'')
                return self.reply((self.origin_url + '\n').encode())
            if command == 'ls-remote':
                ref = args[-1]
                value = self.main if ref.endswith('/main') else self.remote
                return self.reply((value + '\t' + ref + '\n').encode() if value else b'')
            if command == 'diff': return self.reply(b'tools/synthetic.py\x00')
            if command == 'push':
                self.writes.append(('push', argv))
                if self.apply_push:
                    self.remote = HEAD
                    if self.pr is not None: self.pr['head']['sha'] = HEAD
                return self.reply(rc=None if self.push_unknown else 0, unknown=self.push_unknown)
        assert argv[0] == 'gh'
        method = argv[argv.index('--method') + 1]
        endpoint = next(v for v in argv if v == 'user' or v.startswith('repos/'))
        path, query = urlsplit(endpoint).path, parse_qs(urlsplit(endpoint).query)
        if method == 'POST':
            self.writes.append(('pr', argv))
            payload = json.loads(Path(argv[argv.index('--input') + 1]).read_bytes())
            assert payload['draft'] is True and payload['base'] == 'main' and payload['head'] == BRANCH
            if self.apply_pr: self.pr = self.pr_row()
            return self.reply(rc=None if self.pr_unknown else 0, unknown=self.pr_unknown)
        if path == 'user': return self.reply({'login': self.actor})
        if path == 'repos/' + delivery.REPO:
            return self.reply({'full_name': delivery.REPO, 'default_branch': 'main', 'permissions': {'push': True}})
        if path.endswith('/pulls'):
            if query.get('state') == ['all']:
                if self.ci_observed and self.after_ci == 'pr_read_failure':
                    return self.reply(rc=1)
                return self.reply([self.pr] if self.pr else [])
            rows = copy.deepcopy(self.foreign_prs)
            if self.overlap: rows.append({'number': 99})
            if not self.short_pages: return self.reply([{'number': i + 100} for i in range(100)])
            return self.reply(rows)
        if path.endswith('/files'):
            return self.reply([{'filename': 'tools/synthetic.py' if self.overlap else 'other-file.py'}])
        if path.endswith('/actions/workflows/ci.yml'):
            if self.ci_unavailable: return self.reply(rc=1)
            return self.reply(self.workflow)
        if path.endswith('/actions/workflows/ci.yml/runs'):
            assert query.get('event') == ['push'] and query.get('head_sha') == [HEAD]
            assert query.get('branch') == [BRANCH] and 'status' not in query
            rows = copy.deepcopy(self.runs) if self.runs is not None else [self.run_row()]
            if self.jobs_observed and self.after_jobs_new_run:
                rows.append(self.run_row(id=40558440812, run_number=148, conclusion='failure'))
            start = (int(query['page'][0]) - 1) * 100
            return self.reply({'total_count': len(rows) + self.runs_total_delta, 'workflow_runs': rows[start:start + 100]})
        if '/actions/runs/' in path:
            run = max(self.runs, key=lambda row: row['run_number']) if self.runs is not None else self.run_row()
            if path.endswith('/jobs'):
                assert '/attempts/' + str(run['run_attempt']) + '/jobs' in path
                rows = copy.deepcopy(self.jobs) if self.jobs is not None else self.job_rows(run)
                if self.required_duplicates:
                    rows.append({**rows[0], 'id': 901, 'conclusion': 'failure'})
                self.jobs_observed = self.ci_observed = True
                if self.after_ci == 'main': self.main = 'c' * 40
                if self.after_ci == 'branch': self.remote = 'c' * 40
                if self.after_ci == 'pr_changed' and self.pr is not None: self.pr['number'] = 43
                start = (int(query['page'][0]) - 1) * 100
                return self.reply({'total_count': len(rows) + self.jobs_total_delta, 'jobs': rows[start:start + 100]})
            if '/attempts/' in path:
                return self.reply(self.attempt_override if self.attempt_override is not None else run)
            current = copy.deepcopy(self.run_override) if self.run_override is not None else copy.deepcopy(run)
            if self.jobs_observed and self.after_jobs_attempt:
                current['run_attempt'] += 1
            if self.jobs_observed and self.after_jobs_status is not None:
                current['status'], current['conclusion'] = self.after_jobs_status
            return self.reply(current)
        if path.endswith('/check-runs'):
            return self.reply({'total_count': 2, 'check_runs': [
                {'name': 'ci', 'head_sha': HEAD, 'status': 'completed', 'conclusion': state}
                for state in ['success', 'failure']]})
        if path.endswith('/status'):
            return self.reply({'sha': HEAD, 'total_count': 2, 'statuses': [
                {'context': 'Paperclip Review', 'state': state} for state in ['success', 'failure']]})
        raise AssertionError('unexpected controlled command')


class ReviewedDeliveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.commands = CommandsDouble()
        self.request = {'schema_version': 1, 'branch': BRANCH, 'head': HEAD, 'base_sha': BASE,
            'title': 'Synthetic reviewed draft', 'body': 'Synthetic only. No real delivery.',
            'review': {'head': HEAD, 'base_sha': BASE, 'status': 'passed',
                       'reviewer': 'synthetic-independent-review', 'artifact_sha256': 'c' * 64},
            'gates': [{'name': name, 'head': HEAD, 'status': 'passed', 'artifact_sha256': 'd' * 64}
                      for name in sorted(delivery.GATES)], 'required_ci': ['ci']}
        folder = self.root / '.local/reviewed-delivery-evidence'
        folder.mkdir(parents=True)
        for evidence in [self.request['review'], *self.request['gates']]:
            kind = 'gate' if 'name' in evidence else 'review'
            name = evidence.get('name', 'review')
            payload = {'schema_version': 1, 'kind': kind, 'head': HEAD, 'base_sha': BASE, 'status': 'passed',
                       'name' if kind == 'gate' else 'reviewer': evidence.get('name', evidence.get('reviewer'))}
            raw = delivery.canonical(payload)
            path = folder / (name + '.json')
            path.write_bytes(raw)
            evidence['artifact_path'] = path.relative_to(self.root).as_posix()
            evidence['artifact_sha256'] = hashlib.sha256(raw).hexdigest()

    def run_flow(self, *, execute=True, retry=False):
        return delivery.deliver(self.request, workspace=self.root,
            state_directory=self.root / 'state', commands=self.commands,
            execute=execute, retry_reconciled=retry)

    def assert_blocked(self, reason, **kwargs):
        result = self.run_flow(**kwargs)
        self.assertEqual(result['state'], 'blocked', result)
        self.assertEqual(result['reason'], reason)
        return result

    def test_default_plan_never_writes_and_reports_exact_head_ci(self):
        result = self.run_flow(execute=False)
        self.assertEqual(result['state'], 'plan_ready')
        self.assertEqual(result['actions'], ['push_exact_branch', 'create_draft_pr'])
        self.assertEqual(self.commands.writes, [])
        self.assertEqual(result['ci']['head'], HEAD)
        self.assertEqual(result['ci']['status'], 'passed')
        self.assertEqual(result['ci']['checks'], {'ci': 'passed'})
        self.assertEqual(result['ci']['run_id'], 40558440811)
        self.assertEqual(result['ci']['event'], 'push')
        self.assertEqual(result['gitlab'], {'status': 'unbound', 'mirror_performed': False, 'mr_created': False})

    def test_normal_push_and_draft_then_exact_restart_has_no_duplicate_writes(self):
        result = self.run_flow()
        self.assertEqual(result['state'], 'draft_verified')
        self.assertTrue(result['final_readback_verified'])
        self.assertEqual([kind for kind, _ in self.commands.writes], ['push', 'pr'])
        self.assertTrue(result['pushed'])
        self.assertTrue(result['branch_verified'])
        self.assertFalse(result['merged'])
        again = self.run_flow()
        self.assertEqual(again['state'], 'draft_verified')
        self.assertEqual(again['pr'], result['pr'])
        self.assertFalse(again['push_attempted'])
        self.assertFalse(again['pr_create_attempted'])
        self.assertEqual(len(self.commands.writes), 2)
        for kind, argv in self.commands.writes:
            self.assertNotIn('--force', argv)
            self.assertNotIn('--mirror', argv)
            self.assertNotIn('merge', argv)
            if kind == 'push': self.assertEqual(argv[-1], HEAD + ':refs/heads/' + BRANCH)

    def test_dirty_wrong_head_branch_actor_remote_or_base_blocks_before_write(self):
        for name, value, reason in [('dirty', True, 'worktree_not_clean'),
                ('head', BASE, 'local_head_changed'), ('branch', 'main', 'local_branch_changed'),
                ('actor', 'somebody-else', 'github_actor_not_bound'),
                ('origin', False, 'github_origin_unbound'),
                ('origin_url', 'https://github.com/other/project.git', 'github_origin_identity_mismatch'),
                ('main', HEAD, 'remote_main_changed'),
                ('rewrites', True, 'url_rewrite_not_allowed'),
                ('transport_override', True, 'remote_transport_override_not_allowed')]:
            with self.subTest(name=name):
                self.commands = CommandsDouble(); setattr(self.commands, name, value)
                self.assert_blocked(reason)
                self.assertEqual(self.commands.writes, [])

    def test_nonintegration_ref_and_unbound_gate_review_inputs_block_without_commands(self):
        mutations = [('branch', 'main'), ('branch', 'integration/../main'),
                     ('head', 'short'), ('review', {**self.request['review'], 'head': BASE}),
                     ('review', {**self.request['review'], 'status': 'unavailable'}),
                     ('gates', []), ('required_ci', [])]
        original = copy.deepcopy(self.request)
        for field, value in mutations:
            with self.subTest(field=field, value=value):
                self.request = copy.deepcopy(original); self.request[field] = value
                self.assertEqual(self.run_flow()['state'], 'blocked')
                self.assertEqual(self.commands.calls, [])

    def test_foreign_overlap_and_incomplete_pagination_never_push(self):
        self.commands.overlap = True
        self.assert_blocked('foreign_pr_file_overlap')
        self.assertEqual(self.commands.writes, [])
        self.commands.overlap, self.commands.short_pages = False, False
        self.assert_blocked('pagination_budget')
        self.assertEqual(self.commands.writes, [])

    def test_merged_all_states_lookup_is_terminal_no_duplicate_pr_or_push(self):
        self.commands.pr = self.commands.pr_row()
        self.commands.pr.update(state='closed', merged_at='2026-10-27T00:00:00Z', draft=False)
        result = self.run_flow()
        self.assertEqual(result['state'], 'already_merged')
        self.assertEqual(self.commands.writes, [])
        lookups = [argv for argv in self.commands.calls if any('state=all' in s for s in argv)]
        self.assertTrue(lookups)

    def test_closed_unmerged_or_existing_nondraft_wrong_head_never_recreated(self):
        for field, value, reason in [('state', 'closed', 'branch_pr_closed_do_not_recreate'),
                                     ('draft', False, 'existing_pr_not_exact_draft')]:
            self.commands = CommandsDouble(); self.commands.pr = self.commands.pr_row()
            self.commands.pr[field] = value
            self.assert_blocked(reason)
            self.assertEqual(self.commands.writes, [])
        self.commands.pr = self.commands.pr_row()
        self.commands.pr['head']['sha'] = BASE
        self.assert_blocked('existing_pr_head_not_remote_branch')

    def test_followup_fast_forward_updates_existing_own_draft_without_new_pr(self):
        self.commands.pr = self.commands.pr_row()
        self.commands.pr['head']['sha'] = BASE
        self.commands.remote = BASE
        result = self.run_flow()
        self.assertEqual(result['state'], 'draft_verified')
        self.assertEqual(result['pr'], 42)
        self.assertEqual([kind for kind, _ in self.commands.writes], ['push'])
        self.assertEqual(self.commands.pr['head']['sha'], HEAD)

    def test_unknown_push_that_applied_reconciles_without_retry(self):
        self.commands.push_unknown = True
        self.assertEqual(self.run_flow()['state'], 'draft_verified')
        self.assertEqual([x[0] for x in self.commands.writes], ['push', 'pr'])

    def test_unknown_push_not_observed_requires_reconciliation_and_explicit_retry(self):
        self.commands.push_unknown, self.commands.apply_push = True, False
        first = self.assert_blocked('push_outcome_unconfirmed')
        self.assertIsNone(first['pushed'])
        self.assertTrue(first['push_attempted'])
        self.assert_blocked('push_unknown_reconciled_retry_required')
        self.assertEqual(len(self.commands.writes), 1)
        self.commands.push_unknown, self.commands.apply_push = False, True
        self.assertEqual(self.run_flow(retry=True)['state'], 'draft_verified')
        self.assertEqual([x[0] for x in self.commands.writes], ['push', 'push', 'pr'])

    def test_unknown_pr_that_applied_is_observed_without_duplicate(self):
        self.commands.pr_unknown = True
        self.assertEqual(self.run_flow()['state'], 'draft_verified')
        self.assertEqual(self.run_flow()['state'], 'draft_verified')
        self.assertEqual([x[0] for x in self.commands.writes], ['push', 'pr'])

    def test_unknown_pr_absence_needs_explicit_reconciled_retry(self):
        self.commands.pr_unknown, self.commands.apply_pr = True, False
        self.assert_blocked('pr_outcome_unconfirmed')
        self.assert_blocked('pr_unknown_reconciled_retry_required')
        self.assertEqual(len(self.commands.writes), 2)
        self.commands.pr_unknown, self.commands.apply_pr = False, True
        self.assertEqual(self.run_flow(retry=True)['state'], 'draft_verified')
        self.assertEqual([x[0] for x in self.commands.writes], ['push', 'pr', 'pr'])

    def test_ci_unavailable_skipped_neutral_wrong_sha_never_means_passed(self):
        for conclusion in ('skipped', 'neutral', None, 'failure'):
            with self.subTest(conclusion=conclusion):
                self.commands.ci_status = conclusion
                report = self.run_flow(execute=False)
                self.assertNotEqual(report['ci']['status'], 'passed')
        self.commands.ci_status = 'success'; self.commands.ci_unavailable = True
        self.assertEqual(self.run_flow(execute=False)['ci']['status'], 'unavailable')
        self.commands.ci_unavailable, self.commands.wrong_ci_sha = False, True
        self.assertEqual(self.run_flow(execute=False)['ci']['status'], 'unavailable')
        self.assertEqual(self.commands.writes, [])

    def test_corrupt_or_hardlinked_checkpoint_blocks_without_commands(self):
        self.assertEqual(self.run_flow()['state'], 'draft_verified')
        path = next((self.root / 'state').glob('delivery-*.json'))
        path.write_bytes(b'{"not":"checkpoint"}')
        self.commands.calls.clear(); self.commands.writes.clear()
        self.assert_blocked('checkpoint_binding')
        self.assertEqual(self.commands.calls, [])

    def test_hardlinked_checkpoint_preserves_external_sentinel_and_blocks(self):
        self.assertEqual(self.run_flow()['state'], 'draft_verified')
        path = next((self.root / 'state').glob('delivery-*.json'))
        raw = path.read_bytes()
        external = self.root / 'outside-sentinel'
        external.write_bytes(raw)
        path.unlink()
        os.link(external, path)
        self.commands.calls.clear(); self.commands.writes.clear()
        self.assert_blocked('unsafe_checkpoint')
        self.assertEqual(self.commands.calls, [])
        self.assertEqual(external.read_bytes(), raw)

    def test_command_runner_output_and_deadline_are_bounded_without_network(self):
        runner = delivery.Commands()
        result = runner.run([sys.executable, '-c', 'print("x"*1100000)'], cwd=self.root, timeout=3)
        self.assertTrue(result['unknown'])
        self.assertLessEqual(len(result['stdout']), delivery.MAX_OUTPUT)
        result = runner.run([sys.executable, '-c', 'import time; time.sleep(2)'], cwd=self.root, timeout=0.1)
        self.assertTrue(result['unknown'])

    def test_actual_evidence_bytes_scope_links_and_traversal_are_verified(self):
        proof = self.request['review']
        path = self.root / proof['artifact_path']
        before = path.read_bytes()
        path.write_bytes(b'changed')
        self.assert_blocked('evidence_hash_mismatch')
        self.assertEqual(self.commands.calls, [])
        wrong = json.loads(before); wrong['head'] = BASE
        raw = delivery.canonical(wrong)
        path.write_bytes(raw); proof['artifact_sha256'] = hashlib.sha256(raw).hexdigest()
        self.assert_blocked('evidence_scope_or_status_mismatch')
        path.write_bytes(before); proof['artifact_sha256'] = hashlib.sha256(before).hexdigest()
        outside = self.root / 'external-proof'; outside.write_bytes(before)
        path.unlink(); os.link(outside, path)
        self.assert_blocked('unsafe_evidence_file')
        self.assertEqual(outside.read_bytes(), before)
        path.unlink(); path.symlink_to(outside)
        self.assert_blocked('local_or_command_io_unavailable')
        proof['artifact_path'] = '../outside'
        self.assert_blocked('unsafe_evidence_path')
        self.assertEqual(self.commands.calls, [])

    def test_optional_duplicate_ci_contexts_do_not_hide_core_results(self):
        self.commands.optional_duplicates = True
        self.assertEqual(self.run_flow(execute=False)['ci']['status'], 'passed')
        self.commands.required_duplicates = True
        self.assertEqual(self.run_flow(execute=False)['ci']['status'], 'unavailable')
        self.assertEqual(self.commands.writes, [])

    def test_normal_git_hooks_and_signed_push_configuration_are_not_disabled(self):
        self.assertEqual(self.run_flow()['state'], 'draft_verified')
        for argv in self.commands.calls:
            self.assertNotIn('--no-verify', argv)
            self.assertFalse(any('hooksPath=' in arg or 'gpgSign=' in arg for arg in argv))

    def test_final_readback_failures_block_api_and_cli_without_losing_confirmed_facts(self):
        input_path = self.root / 'request.json'
        input_path.write_bytes(delivery.canonical(self.request))
        for failure, reason in [('main', 'remote_main_changed'), ('branch', 'remote_branch_changed'),
                                ('pr_read_failure', 'read_command_unavailable'),
                                ('pr_changed', 'pr_readback_changed')]:
            with self.subTest(failure=failure):
                self.commands = CommandsDouble()
                self.commands.after_ci = failure
                result = self.assert_blocked(reason)
                self.assertFalse(result['final_readback_verified'])
                self.assertTrue(result['pushed'])
                self.assertTrue(result['push_attempted'])
                self.assertTrue(result['pr_create_attempted'])
                self.assertEqual(result['pr'], 42)
                self.assertEqual([kind for kind, _ in self.commands.writes], ['push', 'pr'])
                self.commands = CommandsDouble()
                self.commands.after_ci = failure
                with patch.object(delivery, 'Commands', return_value=self.commands), \
                     patch('sys.stdout', new=io.StringIO()) as output:
                    code = delivery.main(['--input', str(input_path), '--workspace', str(self.root),
                        '--state-directory', str(self.root / 'state'), '--execute'])
                self.assertEqual(code, 2)
                cli = json.loads(output.getvalue())
                self.assertEqual(cli['state'], 'blocked')
                self.assertEqual(cli['reason'], reason)
                self.assertFalse(cli['final_readback_verified'])
                self.assertTrue(cli['pushed'])
                self.assertEqual(cli['pr'], 42)

    def ci_snapshot(self):
        return delivery.Flow(self.root, self.commands).ci(self.request)

    def test_real_shaped_push_jobs_are_independent_of_duplicate_pr_core_checks(self):
        # Root-observed run IDs are shape fixtures; no live GitHub request occurs.
        self.request['required_ci'] = ['repository', 'postgres-isolation', 'openapi-schema', 'next-web', 'react-site']
        run = self.commands.run_row(id=40558440811)
        self.commands.jobs = [{**self.commands.job_rows(run)[0], 'id': 900 + index, 'name': name}
                              for index, name in enumerate(self.request['required_ci'])]
        self.commands.optional_duplicates = True
        report = self.ci_snapshot()
        self.assertEqual(report['status'], 'passed')
        self.assertEqual(report['run_id'], 40558440811)
        self.assertEqual(report['run_attempt'], 1)
        self.assertEqual(report['checks'], {name: 'passed' for name in self.request['required_ci']})
        self.assertEqual(report['external_checks'], {'status': 'not_evaluated', 'affects_core': False})
        self.assertFalse(any('/check-runs' in arg or '/status?' in arg for argv in self.commands.calls for arg in argv))
        self.assertTrue(any('/attempts/1/jobs?' in arg for argv in self.commands.calls for arg in argv))
        self.assertEqual(self.commands.writes, [])

    def test_wrong_workflow_run_sha_event_path_branch_name_or_attempt_never_passes(self):
        for field, value in [('head_sha', BASE), ('event', 'pull_request'),
                ('path', '.github/workflows/other.yml'), ('name', 'Other CI'),
                ('workflow_id', 8), ('head_branch', 'main'), ('id', -1), ('run_attempt', 0)]:
            with self.subTest(field=field):
                self.commands = CommandsDouble()
                self.commands.runs = [self.commands.run_row(**{field: value})]
                self.assertEqual(self.ci_snapshot()['status'], 'unavailable')
        for field, value in [('name', 'Other CI'), ('path', 'ci.yml'), ('state', 'disabled_manually')]:
            with self.subTest(workflow_field=field):
                self.commands = CommandsDouble(); self.commands.workflow[field] = value
                self.assertEqual(self.ci_snapshot()['status'], 'unavailable')

    def test_latest_failed_push_run_and_current_attempt_supersede_earlier_green(self):
        old = self.commands.run_row(id=40558440000, run_number=146, conclusion='success')
        latest = self.commands.run_row(id=40558440811, run_number=147, run_attempt=2, conclusion='failure')
        self.commands.runs = [old, latest]
        report = self.ci_snapshot()
        self.assertEqual(report['status'], 'failed')
        self.assertEqual(report['run_id'], latest['id'])
        self.assertEqual(report['run_attempt'], 2)
        self.assertTrue(any('/attempts/2/jobs?' in arg for argv in self.commands.calls for arg in argv))
        latest.update(status='in_progress', conclusion=None)
        self.assertEqual(self.ci_snapshot()['status'], 'pending')
        latest.update(status='completed', conclusion='success')
        self.commands.jobs = [{**self.commands.job_rows(latest)[0], 'run_attempt': 1}]
        self.assertEqual(self.ci_snapshot()['status'], 'unavailable')
        self.commands.jobs = None
        self.commands.attempt_override = {**latest, 'run_attempt': 1}
        self.assertEqual(self.ci_snapshot()['status'], 'unavailable')

    def test_required_jobs_missing_duplicate_skipped_neutral_wrong_binding_never_pass(self):
        run = self.commands.run_row()
        base_job = self.commands.job_rows(run)[0]
        variants = [[], [base_job, {**base_job, 'id': 901}],
                    [{**base_job, 'conclusion': 'skipped'}], [{**base_job, 'conclusion': 'neutral'}],
                    [{**base_job, 'head_sha': BASE}], [{**base_job, 'run_id': run['id'] + 1}],
                    [{**base_job, 'run_attempt': 2}], [{**base_job, 'workflow_name': 'Other'}]]
        for jobs in variants:
            with self.subTest(jobs=jobs):
                self.commands = CommandsDouble(); self.commands.jobs = jobs
                self.assertEqual(self.ci_snapshot()['status'], 'unavailable')

    def test_actions_run_and_jobs_pagination_is_complete_and_bounded(self):
        self.commands.runs = [self.commands.run_row(id=1000 + n, run_number=n + 1) for n in range(101)]
        report = self.ci_snapshot()
        self.assertEqual(report['status'], 'passed')
        self.assertEqual(report['run_id'], 1100)
        self.assertTrue(any('page=2' in arg for argv in self.commands.calls for arg in argv))
        self.commands.runs_total_delta = 1
        self.assertEqual(self.ci_snapshot()['status'], 'unavailable')
        self.commands = CommandsDouble(); self.commands.jobs_total_delta = 1
        self.assertEqual(self.ci_snapshot()['status'], 'unavailable')
        self.commands = CommandsDouble()
        self.commands.runs = [self.commands.run_row(id=1000 + n, run_number=n + 1) for n in range(401)]
        self.assertEqual(self.ci_snapshot()['status'], 'unavailable')
        self.assertEqual(self.commands.writes, [])

    def test_ci_rerun_status_change_or_newer_run_after_jobs_cannot_return_passed(self):
        for kind in ['attempt', 'new_run', 'status']:
            with self.subTest(kind=kind):
                self.commands = CommandsDouble()
                if kind == 'attempt': self.commands.after_jobs_attempt = True
                if kind == 'new_run': self.commands.after_jobs_new_run = True
                if kind == 'status': self.commands.after_jobs_status = ('completed', 'failure')
                report = self.ci_snapshot()
                self.assertEqual(report['status'], 'unavailable')
                self.assertIn(report['reason'], ['ci_run_changed_after_jobs', 'ci_latest_run_changed_after_jobs'])
                self.assertEqual(self.commands.writes, [])

    def test_json_duplicate_nonfinite_and_byte_limits(self):
        for raw in (b'{"a":1,"a":2}', b'{"n":NaN}', b'x' * (delivery.MAX_OUTPUT + 1)):
            with self.assertRaises(delivery.DeliveryRejected): delivery.parse(raw)


if __name__ == '__main__':
    unittest.main()

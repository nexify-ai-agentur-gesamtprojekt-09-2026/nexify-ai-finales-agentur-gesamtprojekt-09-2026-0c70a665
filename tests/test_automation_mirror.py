"""Real local Git object/ref tests; no external GitHub or GitLab requests."""
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('mirror', ROOT / 'tools/automation/mirror.py')
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)
TARGET = 'https://gitlab.example.invalid/group/downstream.git'


class FixtureGit(m.Git):
    def __init__(self, sources, race=None):
        super().__init__()
        self.sources = sources
        self.race = race
        self.target_reads = 0
        self.pushes = 0
        self.env.update({'GIT_CONFIG_GLOBAL': '/dev/null'})

    def run(self, *args, cwd=None, acceptable=(0,)):
        if args[0] == 'push':
            self.pushes += 1
        mapped = [str(self.sources.get(a, a)) for a in args]
        # Only this test transport permits file URLs; production denies them.
        return super().run('-c', 'protocol.file.allow=always', *mapped, cwd=cwd, acceptable=acceptable)

    def head(self, url):
        if url == TARGET:
            self.target_reads += 1
            if self.target_reads == 2 and self.race:
                self.race()
        return super().head(url)


class MirrorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='mirror-test-')
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.work = self.base / 'work'
        self.source = self.base / 'source.git'
        self.target = self.base / 'target.git'
        self.env = {'PATH': '/usr/bin:/bin', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_CONFIG_NOSYSTEM': '1',
                    'GIT_AUTHOR_NAME': 'Fixture', 'GIT_AUTHOR_EMAIL': 'fixture@example.invalid',
                    'GIT_COMMITTER_NAME': 'Fixture', 'GIT_COMMITTER_EMAIL': 'fixture@example.invalid'}
        self.git('init', '--initial-branch=main', str(self.work))
        self.git('init', '--bare', str(self.source))
        self.git('init', '--bare', str(self.target))
        self.git('remote', 'add', 'origin', m.SOURCE, cwd=self.work)
        self.a = self.commit('a')
        self.git('push', str(self.source), 'HEAD:refs/heads/main', cwd=self.work)
        self.git('push', str(self.target), 'HEAD:refs/heads/main', cwd=self.work)
        self.transport = FixtureGit({m.SOURCE: self.source, TARGET: self.target})

    def git(self, *args, cwd=None):
        return subprocess.check_output(['/usr/bin/git', '-c', 'core.hooksPath=/dev/null', *args],
                                       cwd=cwd, env=self.env, stderr=subprocess.DEVNULL, text=True).strip()

    def commit(self, content):
        (self.work / 'fixture.txt').write_text(content)
        self.git('add', 'fixture.txt', cwd=self.work)
        self.git('commit', '-m', 'fixture', cwd=self.work)
        return self.git('rev-parse', 'HEAD', cwd=self.work)

    def advance_source(self):
        sha = self.commit('b')
        self.git('push', str(self.source), 'HEAD:refs/heads/main', cwd=self.work)
        return sha

    def test_idempotent_and_uncommitted_local_work_not_pushed(self):
        (self.work / 'fixture.txt').write_text('untrusted input $(touch sentinel)')
        report = m.mirror(self.work, TARGET, apply=True, git=self.transport)
        self.assertEqual(report['state'], 'already_current')
        self.assertEqual(self.transport.pushes, 0)

    def test_default_dry_run_then_exact_fast_forward(self):
        sha = self.advance_source()
        dry = m.mirror(self.work, TARGET, git=self.transport)
        self.assertEqual(dry['state'], 'dry_run_fast_forward')
        self.assertEqual(self.git('rev-parse', m.REF, cwd=self.target), self.a)
        applied = m.mirror(self.work, TARGET, apply=True, git=self.transport)
        self.assertEqual(applied['state'], 'applied_verified')
        self.assertEqual(self.git('rev-parse', m.REF, cwd=self.target), sha)

    def test_divergence_preserved(self):
        self.advance_source()
        self.git('checkout', '--detach', self.a, cwd=self.work)
        divergent = self.commit('downstream only')
        self.git('push', str(self.target), 'HEAD:refs/heads/main', cwd=self.work)
        with self.assertRaisesRegex(m.Blocked, 'diverged'):
            m.mirror(self.work, TARGET, apply=True, git=self.transport)
        self.assertEqual(self.git('rev-parse', m.REF, cwd=self.target), divergent)
        self.assertEqual(self.transport.pushes, 0)

    def test_target_changed_after_capture_blocks_without_push(self):
        self.advance_source()
        self.git('checkout', '--detach', self.a, cwd=self.work)
        changed = self.commit('concurrent writer')
        def race():
            self.git('push', str(self.target), f'{changed}:{m.REF}', cwd=self.work)
        transport = FixtureGit({m.SOURCE: self.source, TARGET: self.target}, race)
        with self.assertRaisesRegex(m.Blocked, 'changed'):
            m.mirror(self.work, TARGET, apply=True, git=transport)
        self.assertEqual(transport.pushes, 0)
        self.assertEqual(self.git('rev-parse', m.REF, cwd=self.target), changed)

    def test_missing_binding_and_wrong_source_closed(self):
        with self.assertRaises(m.Blocked):
            m.mirror(self.work, None, apply=True, git=self.transport)
        self.git('remote', 'set-url', 'origin', 'https://github.com/wrong/repo.git', cwd=self.work)
        with self.assertRaisesRegex(m.Blocked, 'canonical'):
            m.mirror(self.work, TARGET, apply=True, git=self.transport)
        self.assertEqual(self.transport.pushes, 0)

    def test_credentials_url_and_transport_rejected(self):
        for target in ('https://user:secret@gitlab.example.invalid/group/repo.git',
                       'http://gitlab.example.invalid/group/repo.git',
                       'file:///tmp/repo.git', TARGET+'?token=secret', m.SOURCE):
            with self.subTest(target=target), self.assertRaises(m.Blocked):
                m.binding(target)
        local = 'http://127.0.0.1:8922/group/repo.git'
        with self.assertRaises(m.Blocked):
            m.binding(local)
        self.assertEqual(m.binding(local, True), local)

    def test_new_branch_creation_keeps_other_refs(self):
        self.git('update-ref', '-d', m.REF, cwd=self.target)
        self.git('update-ref', 'refs/heads/preserve', self.a, cwd=self.target)
        report = m.mirror(self.work, TARGET, apply=True, git=self.transport)
        self.assertEqual(report['state'], 'applied_verified')
        self.assertEqual(self.git('rev-parse', 'refs/heads/preserve', cwd=self.target), self.a)

    def test_url_rewriting_is_rejected(self):
        self.git('config', 'url.https://evil.example/.insteadOf', 'https://github.com/', cwd=self.work)
        with self.assertRaisesRegex(m.Blocked, 'rewriting'):
            m.mirror(self.work, TARGET, apply=True, git=self.transport)

    def test_race_after_final_read_normal_push_rejects_divergence(self):
        self.advance_source()
        self.git('checkout', '--detach', self.a, cwd=self.work)
        changed = self.commit('late downstream writer')
        previous = self.transport.run
        def racing_run(*args, **kwargs):
            if args[0] == 'push':
                self.git('push', str(self.target), f'{changed}:{m.REF}', cwd=self.work)
            return previous(*args, **kwargs)
        self.transport.run = racing_run
        with self.assertRaises(m.Blocked):
            m.mirror(self.work, TARGET, apply=True, git=self.transport)
        self.assertEqual(self.git('rev-parse', m.REF, cwd=self.target), changed)


if __name__ == '__main__':
    unittest.main()

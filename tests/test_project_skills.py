"""Owned-skill integrity and installation boundaries, entirely in isolated fixtures."""
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

REPO = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('owned_project_skills', REPO / 'tools/project_skills.py')
SKILLS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SKILLS)


def snapshot(root):
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob('*') if p.is_file()}


class ProjectSkillsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'project'
        self.root.mkdir()
        self.manifest = json.loads((REPO / SKILLS.MANIFEST).read_text())
        for item in self.manifest['skills']:
            p = self.root / item['source_path']
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes((REPO / item['source_path']).read_bytes())
        references = {self.manifest['workflow']}
        references.update(ref for item in self.manifest['skills'] for ref in item['source_refs'])
        for name in references:
            p = self.root / name
            if not p.exists():
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text('{}\n' if p.suffix == '.json' else '# Isolated reference fixture\n')
        self.write_manifest()
        self.names = sorted(SKILLS.NAMES)

    def write_manifest(self):
        p = self.root / SKILLS.MANIFEST
        p.parent.mkdir(exist_ok=True)
        p.write_text(json.dumps(self.manifest))

    def foreign_skill(self, name='vercel-react-best-practices'):
        p = self.root / '.agents/skills' / name / 'SKILL.md'
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text('Third-party fixture: must remain byte-identical.\n')
        return p

    def test_default_cli_verify_is_readonly_and_does_not_install(self):
        before = snapshot(self.root)
        out = io.StringIO()
        with mock.patch.object(SKILLS, 'ROOT', self.root), contextlib.redirect_stdout(out):
            self.assertEqual(SKILLS.main([]), 0)
        self.assertEqual(json.loads(out.getvalue())['skills'], 5)
        self.assertEqual(snapshot(self.root), before)
        self.assertFalse((self.root / '.agents').exists())

    def test_scoped_copy_exact_readback_and_idempotence_preserve_other_skills(self):
        foreign = self.foreign_skill()
        foreign_bytes = foreign.read_bytes()
        result = SKILLS.install(self.root, [self.names[0]])
        item = next(x for x in self.manifest['skills'] if x['name'] == self.names[0])
        self.assertEqual((self.root / item['install_path']).read_bytes(),
                         (self.root / item['source_path']).read_bytes())
        self.assertEqual(result['skills'][0]['status'], 'copied_and_exactly_read_back')
        self.assertEqual(foreign.read_bytes(), foreign_bytes)
        self.assertTrue(all(not (self.root / '.agents/skills' / name).exists()
                            for name in self.names[1:]))
        before = snapshot(self.root)
        again = SKILLS.install(self.root, [self.names[0]])
        self.assertEqual(again['skills'][0]['status'], 'identical_unchanged')
        self.assertEqual(snapshot(self.root), before)

    def test_hash_drift_requires_review_and_never_refreshes_manifest(self):
        item = self.manifest['skills'][0]
        (self.root / item['source_path']).write_text('changed content\n')
        before = (self.root / SKILLS.MANIFEST).read_bytes()
        with self.assertRaisesRegex(SKILLS.SkillError, 'hash_drift_requires_review_and_version'):
            SKILLS.install(self.root, [item['name']])
        self.assertEqual((self.root / SKILLS.MANIFEST).read_bytes(), before)
        self.assertFalse((self.root / '.agents').exists())

    def test_manifest_path_escape_is_rejected(self):
        outside = self.root.parent / 'outside.md'
        outside.write_text('Outside source must not be adopted.\n')
        self.manifest['skills'][0]['source_path'] = '../outside.md'
        self.write_manifest()
        with self.assertRaisesRegex(SKILLS.SkillError, 'unsafe_path'):
            SKILLS.verify(self.root)
        self.assertFalse((self.root / '.agents').exists())

    def test_existing_third_party_destination_is_refused_before_any_copy(self):
        foreign = self.foreign_skill(self.names[1])
        before = snapshot(self.root)
        with self.assertRaisesRegex(SKILLS.SkillError, 'existing_destination_requires_review'):
            SKILLS.install(self.root, self.names[:2])
        self.assertEqual(snapshot(self.root), before)
        self.assertFalse((self.root / '.agents/skills' / self.names[0]).exists())
        self.assertIn('Third-party fixture', foreign.read_text())

    def test_symlink_source_and_nonowned_install_are_rejected(self):
        item = self.manifest['skills'][0]
        original = self.root / item['source_path']
        outside = self.root.parent / 'linked.md'
        outside.write_bytes(original.read_bytes())
        original.unlink()
        original.symlink_to(outside)
        with self.assertRaises(OSError):
            SKILLS.verify(self.root)
        with self.assertRaisesRegex(SKILLS.SkillError, 'install_name_not_owned'):
            SKILLS.install(self.root, ['vercel-react-best-practices'])
        self.assertFalse((self.root / '.agents').exists())

    def test_missing_source_cli_reports_review_instead_of_success(self):
        (self.root / self.manifest['skills'][0]['source_path']).unlink()
        out = io.StringIO()
        with mock.patch.object(SKILLS, 'ROOT', self.root), contextlib.redirect_stdout(out):
            self.assertEqual(SKILLS.main(['verify']), 2)
        self.assertEqual(json.loads(out.getvalue())['status'], 'review_required')
        self.assertFalse((self.root / '.agents').exists())

    def test_partial_copy_failure_rolls_back_only_new_owned_files(self):
        foreign = self.foreign_skill()
        before = snapshot(self.root)
        original_open = SKILLS.os.open
        writes = 0

        def opening(path, flags, *args, **kwargs):
            nonlocal writes
            if flags & SKILLS.os.O_WRONLY:
                writes += 1
                if writes == 2:
                    raise OSError('injected isolated write failure')
            return original_open(path, flags, *args, **kwargs)

        with mock.patch.object(SKILLS.os, 'open', side_effect=opening):
            with self.assertRaises(OSError):
                SKILLS.install(self.root, self.names[:2])
        self.assertEqual(snapshot(self.root), before)
        self.assertTrue(foreign.is_file())
        self.assertTrue(all(not (self.root / '.agents/skills' / name).exists()
                            for name in self.names[:2]))


if __name__ == '__main__':
    unittest.main()

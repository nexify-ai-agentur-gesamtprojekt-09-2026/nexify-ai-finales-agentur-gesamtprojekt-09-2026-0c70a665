"""Isolated synthetic fixtures, never evidence of real product segmentation.

Pillow is required, deliberately no skip: missing image CI dependencies fail.
"""
import copy
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image
from tools import product_image_batch as batch


def synthetic_png(*, mode='RGBA', icc=None, orientation=None, transparent=True):
    color = (12, 70, 193, 255) if mode == 'RGBA' else (12, 70, 193)
    image = Image.new(mode, (6, 4), color)
    if mode == 'RGBA' and transparent:
        image.putpixel((0, 0), (91, 82, 73, 0))
        image.putpixel((1, 0), (10, 20, 30, 128))
    args = {}
    if icc:
        args['icc_profile'] = icc
    if orientation:
        exif = Image.Exif()
        exif[274] = orientation
        args['exif'] = exif
    out = io.BytesIO()
    image.save(out, 'PNG', **args)
    return out.getvalue()


class ProductImageBatchTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.store = self.root / 'store'
        self.policy = {
            'tenant': 'synthetic-tenant', 'project': 'isolated-tests',
            'max_images': 4, 'max_input_bytes': 10000, 'max_total_input_bytes': 40000,
            'max_pixels': 1000, 'max_total_pixels': 4000, 'max_artifact_bytes': 20000,
            'max_total_artifact_bytes': 100000, 'max_working_bytes': 100000,
            'max_store_bytes': 1000000, 'max_wall_seconds': 10,
            'external_budget_minor': 0, 'segmenter': 'none_verified',
            'ci_colors': ['#1250a0'], 'allowed_ci_colors': ['#1250a0', '#204060']}
        self.item = self.make_item('SYNTHETIC-1', synthetic_png())

    def make_item(self, identifier, raw):
        return {'id': identifier, 'original': raw, 'approval': {
            'tenant': 'synthetic-tenant', 'project': 'isolated-tests',
            'product_id': identifier, 'slot_id': 'test-slot-1',
            'source_reference_sha256': batch.sha(b'synthetic-only-not-real-source'),
            'original_sha256': batch.sha(raw), 'association': 'approved',
            'association_evidence': 'synthetic-test-association-only',
            'license': 'approved', 'license_evidence': 'synthetic-test-fixture-only',
            'color_space': 'srgb'}}

    def run_batch(self, *, items=None, expected=None):
        return batch.run_batch(items or [self.item], policy=self.policy,
                               store=self.store, expected_current=expected)

    def stage(self, result, index=0):
        path = self.store / 'stages' / result['stages'][index]['stage_key']
        return path, json.loads((path / 'manifest.json').read_bytes())

    def assert_rejected(self, reason, function):
        with self.assertRaisesRegex(batch.ImageBatchRejected, '^' + reason + '$'):
            function()

    def test_exact_original_rgba_pixels_and_deterministic_backgrounds(self):
        original_before = self.item['original']
        out = self.run_batch()
        directory, manifest = self.stage(out)
        self.assertEqual((directory / 'original.bin').read_bytes(), original_before)
        with Image.open(directory / 'rgba.png') as rgba, Image.open(io.BytesIO(original_before)) as source:
            self.assertEqual(rgba.tobytes(), source.tobytes())
            self.assertFalse(rgba.info.get('exif'))
            self.assertFalse(rgba.info.get('icc_profile'))
        with Image.open(directory / 'white.png') as white:
            self.assertEqual(white.mode, 'RGB')
            self.assertEqual(white.getpixel((0, 0)), (255, 255, 255))
            self.assertEqual(white.getpixel((2, 0)), (12, 70, 193))
            self.assertEqual(white.getpixel((1, 0)), (132, 137, 142))
        with Image.open(directory / 'ci-1250a0.png') as ci:
            self.assertEqual(ci.getpixel((0, 0)), (18, 80, 160))
            self.assertEqual(ci.getpixel((2, 0)), (12, 70, 193))
        self.assertFalse(out['publishable'])
        self.assertFalse(manifest['segmentation_performed'])
        self.assertEqual(manifest['status'], 'review_required')
        self.assertEqual(out['external_spend_minor'], 0)
        self.assertEqual(self.item['original'], original_before)

    def test_exact_restart_replays_artifacts_without_rendering(self):
        first = self.run_batch()
        files = {str(p.relative_to(self.store)): p.read_bytes() for p in self.store.rglob('*') if p.is_file()}
        with patch.object(batch, '_render', side_effect=AssertionError('must not render')):
            second = self.run_batch()
        self.assertEqual(first, second)
        self.assertEqual(files, {str(p.relative_to(self.store)): p.read_bytes() for p in self.store.rglob('*') if p.is_file()})

    def test_deterministic_artifact_bytes_in_separate_stores(self):
        a = self.run_batch()
        b = batch.run_batch([self.item], policy=self.policy, store=self.root / 'other', expected_current=None)
        self.assertEqual(a, b)
        for name in self.stage(a)[1]['artifacts']:
            key = a['stages'][0]['stage_key']
            self.assertEqual((self.store / 'stages' / key / name).read_bytes(),
                             (self.root / 'other' / 'stages' / key / name).read_bytes())

    def test_opaque_rgb_and_opaque_rgba_are_quarantined_no_fake_mask(self):
        for index, raw in enumerate((synthetic_png(mode='RGB'), synthetic_png(transparent=False))):
            with self.subTest(index=index):
                item = self.make_item('OPAQUE-' + str(index), raw)
                out = self.run_batch(items=[item], expected=batch.current_token(self.store))
                directory, manifest = self.stage(out)
                self.assertEqual(set(manifest['artifacts']), {'original.bin'})
                self.assertIn('opaque_source_requires_verified_segmentation_adapter', manifest['blocking_reasons'])
                self.assertEqual((directory / 'original.bin').read_bytes(), raw)
                self.assertFalse(manifest['segmentation_performed'])

    def test_missing_association_license_scope_or_byte_binding_quarantines(self):
        for field, value, reason in (
            ('association', 'unknown', 'product_image_association_not_approved'),
            ('license', 'unknown', 'source_license_not_approved'),
            ('tenant', 'other', 'approval_scope_mismatch'),
            ('original_sha256', '0' * 64, 'source_byte_binding_mismatch'),
            ('color_space', 'unknown', 'declared_srgb_required'),
        ):
            with self.subTest(field=field):
                item = copy.deepcopy(self.item)
                item['id'] = 'SYNTHETIC-' + field
                item['approval'][field] = value
                with patch.object(batch, '_decode', side_effect=AssertionError('unapproved decode')):
                    out = self.run_batch(items=[item], expected=batch.current_token(self.store))
                _, manifest = self.stage(out)
                self.assertIn(reason, manifest['blocking_reasons'])
                self.assertEqual(set(manifest['artifacts']), {'original.bin'})

    def test_untrusted_model_command_path_and_paid_budget_fail_closed(self):
        for field, value, reason in (
            ('segmenter', 'bria-rmbg', 'no_verified_segmentation_adapter'),
            ('segmenter', {'command': 'anything'}, 'no_verified_segmentation_adapter'),
            ('external_budget_minor', 1, 'offline_zero_external_budget_required'),
            ('external_budget_minor', False, 'offline_zero_external_budget_required'),
        ):
            with self.subTest(field=field, value=value):
                old = self.policy[field]
                self.policy[field] = value
                self.assert_rejected(reason, self.run_batch)
                self.policy[field] = old
        self.assertFalse(self.store.exists())

    def test_ci_must_be_explicit_caller_allowlist(self):
        self.policy['ci_colors'] = ['#ffffff']
        self.assert_rejected('ci_color_not_allowed', self.run_batch)
        self.policy['ci_colors'] = ['red']
        self.assert_rejected('explicit_ci_color_set_required', self.run_batch)

    def test_embedded_icc_invalid_codec_and_empty_alpha_quarantine(self):
        empty = Image.new('RGBA', (6, 4), (1, 2, 3, 0))
        buffer = io.BytesIO()
        empty.save(buffer, 'PNG')
        for index, (raw, reason) in enumerate((
            (synthetic_png(icc=b'synthetic-unknown-profile'), 'icc_conversion_not_verified'),
            (b'not-an-image', 'image_decode_failed'),
            (buffer.getvalue(), 'empty_alpha_foreground'),
        )):
            with self.subTest(reason=reason):
                out = self.run_batch(items=[self.make_item('BAD-' + str(index), raw)],
                                     expected=batch.current_token(self.store))
                self.assertIn(reason, self.stage(out)[1]['blocking_reasons'])
                self.assertEqual(set(self.stage(out)[1]['artifacts']), {'original.bin'})

    def test_exif_orientation_applied_once_without_crop_or_resize(self):
        self.item = self.make_item('ORIENTED', synthetic_png(orientation=6))
        out = self.run_batch()
        directory, report = self.stage(out)
        with Image.open(directory / 'rgba.png') as image:
            self.assertEqual(image.size, (4, 6))
            self.assertEqual(image.getpixel((3, 0)), (91, 82, 73, 0))
            self.assertFalse(image.getexif())
        self.assertEqual(report['qa']['exif_orientation_applied'], 6)
        self.assertEqual((directory / 'original.bin').read_bytes(), self.item['original'])

    def test_hard_input_count_pixel_total_and_memory_budgets_before_store(self):
        for field, value, reason in (
            ('max_input_bytes', 1, 'input_byte_limit'),
            ('max_total_input_bytes', 1, 'total_input_byte_limit'),
            ('max_pixels', 1, 'pixel_limit'),
            ('max_total_pixels', 1, 'total_pixel_limit'),
            ('max_working_bytes', 1, 'working_memory_estimate_limit'),
        ):
            with self.subTest(field=field):
                old = self.policy[field]
                self.policy[field] = value
                self.assert_rejected(reason, self.run_batch)
                self.policy[field] = old
        items = [self.make_item('COUNT-' + str(i), synthetic_png()) for i in range(5)]
        self.assert_rejected('image_count_limit', lambda: self.run_batch(items=items))
        self.assertFalse(self.store.exists())

    def test_total_pixels_counts_opaque_sources_too(self):
        self.policy['max_total_pixels'] = 30
        items = [self.make_item('OPAQUE-1', synthetic_png(mode='RGB')),
                 self.make_item('OPAQUE-2', synthetic_png(mode='RGB'))]
        self.assert_rejected('total_pixel_limit', lambda: self.run_batch(items=items))
        self.assertFalse(self.store.exists())

    def test_artifact_and_store_limits_do_not_select_partial_batches(self):
        self.policy['max_total_artifact_bytes'] = len(self.item['original'])
        self.assert_rejected('total_artifact_byte_limit', self.run_batch)
        self.assertIsNone(batch.current_token(self.store))
        self.policy['max_total_artifact_bytes'] = 100000
        self.policy['max_store_bytes'] = 200
        self.assert_rejected('store_byte_limit', self.run_batch)
        self.assertIsNone(batch.current_token(self.store))

    def test_policy_limit_types_and_absolute_ceilings(self):
        for name, ceiling in batch.LIMITS.items():
            old = self.policy[name]
            for value in (0, False, 1.5, ceiling + 1):
                with self.subTest(name=name, value=value):
                    self.policy[name] = value
                    self.assert_rejected('invalid_' + name, self.run_batch)
            self.policy[name] = old

    def test_corrupt_committed_artifact_is_never_repaired_or_overwritten(self):
        out = self.run_batch()
        directory, _ = self.stage(out)
        original = directory / 'original.bin'
        original.write_bytes(b'changed')
        self.assert_rejected('artifact_hash_mismatch', self.run_batch)
        self.assertEqual(original.read_bytes(), b'changed')

    def test_corrupt_manifest_changed_file_set_and_symlink_replay_rejected(self):
        out = self.run_batch()
        directory, _ = self.stage(out)
        extra = directory / 'unexpected'
        extra.write_bytes(b'test')
        self.assert_rejected('stage_directory_changed', self.run_batch)
        extra.unlink()
        rgba = directory / 'rgba.png'
        raw = rgba.read_bytes()
        rgba.unlink()
        external = self.root / 'external.png'
        external.write_bytes(raw)
        rgba.symlink_to(external)
        self.assert_rejected('symlink_not_allowed', self.run_batch)

    def test_crash_after_stage_rename_restarts_from_committed_artifact(self):
        real_write = batch._write
        def crash_checkpoint(root, path, raw, limit):
            if path.name == 'checkpoint.json':
                raise OSError('synthetic crash')
            return real_write(root, path, raw, limit)
        with patch.object(batch, '_write', side_effect=crash_checkpoint):
            with self.assertRaises(OSError):
                self.run_batch()
        self.assertIsNone(batch.current_token(self.store))
        with patch.object(batch, '_render', side_effect=AssertionError('no rerender')):
            out = self.run_batch()
        self.assertEqual(out['status'], 'review_required')

    def test_crash_before_stage_rename_retains_original_and_resumes(self):
        real_rename = os.rename
        with patch.object(batch.os, 'rename', side_effect=OSError('synthetic rename failure')):
            with self.assertRaises(OSError):
                self.run_batch()
        pending = list((self.store / 'stages').glob('.pending-*'))
        self.assertEqual(len(pending), 1)
        self.assertEqual((pending[0] / 'original.bin').read_bytes(), self.item['original'])
        with patch.object(batch.os, 'rename', wraps=real_rename):
            out = self.run_batch()
        self.assertEqual(out['status'], 'review_required')
        self.assertFalse(pending[0].exists())

    def test_crash_final_pointer_keeps_old_selection_then_reuses_stages(self):
        first = self.run_batch()
        self.item = self.make_item('SYNTHETIC-2', synthetic_png(orientation=6))
        real_write = batch._write
        def crash_pointer(root, path, raw, limit):
            if path.name == 'current.json':
                raise OSError('synthetic pointer failure')
            return real_write(root, path, raw, limit)
        with patch.object(batch, '_write', side_effect=crash_pointer):
            with self.assertRaises(OSError):
                self.run_batch(expected=first['current_token'])
        self.assertEqual(batch.current_token(self.store), first['current_token'])
        with patch.object(batch, '_render', side_effect=AssertionError('no rerender')):
            second = self.run_batch(expected=first['current_token'])
        self.assertNotEqual(second['batch_key'], first['batch_key'])

    def test_concurrent_process_lock_and_stale_cas_block(self):
        out = self.run_batch()
        with batch._locked(self.store):
            process = subprocess.run([sys.executable, '-m', 'tools.product_image_batch', 'current',
                                      '--store', str(self.store)], capture_output=True, text=True)
        self.assertEqual(process.returncode, 2)
        self.assertIn('store_busy', process.stderr)
        self.item = self.make_item('SYNTHETIC-2', synthetic_png())
        self.assert_rejected('current_conflict', self.run_batch)
        self.assertEqual(batch.current_token(self.store), out['current_token'])

    def test_rollback_cas_restores_previous_and_retains_all_originals(self):
        first = self.run_batch()
        self.item = self.make_item('SYNTHETIC-2', synthetic_png(orientation=6))
        second = self.run_batch(expected=first['current_token'])
        self.assert_rejected('current_conflict', lambda: batch.rollback(self.store, expected_current=first['current_token']))
        receipt = batch.rollback(self.store, expected_current=second['current_token'])
        self.assertEqual(receipt['current_token'], first['current_token'])
        self.assertEqual(receipt['restored_batch_key'], first['batch_key'])
        for result in (first, second):
            self.assertTrue((self.stage(result)[0] / 'original.bin').is_file())
        batch.rollback(self.store, expected_current=first['current_token'])
        self.assertIsNone(batch.current_token(self.store))
        self.assertTrue((self.stage(first)[0] / 'original.bin').is_file())

    def test_transform_version_and_approval_changes_invalidate_stages(self):
        first = self.run_batch()
        with patch.object(batch, 'VERSION', 'synthetic-transform-version-2'):
            second = self.run_batch(expected=first['current_token'])
            self.assertNotEqual(first['stages'][0]['stage_key'], second['stages'][0]['stage_key'])
        self.item['approval']['association_evidence'] += '-updated'
        third = self.run_batch(expected=second['current_token'])
        self.assertNotEqual(third['batch_key'], first['batch_key'])

    def test_cli_round_trip_and_unsafe_input_paths(self):
        input_root = self.root / 'inputs'
        input_root.mkdir()
        (input_root / 'synthetic.png').write_bytes(self.item['original'])
        manifest = {'schema_version': 1, 'policy': self.policy, 'items': [{
            'id': self.item['id'], 'relative_path': 'synthetic.png', 'approval': self.item['approval']}]}
        path = self.root / 'manifest.json'
        path.write_bytes(batch.canonical(manifest))
        args = ['run', '--store', str(self.store), '--manifest', str(path), '--input-root', str(input_root)]
        with patch('sys.stdout', new=io.StringIO()) as stdout:
            self.assertEqual(batch.main(args), 0)
            out = json.loads(stdout.getvalue())
        self.assertEqual(out['status'], 'review_required')
        for unsafe in ('../outside.png', '/outside.png', 'https://invalid.example/image', 'a\\b.png', 'a/./b.png'):
            with self.subTest(unsafe=unsafe):
                manifest['items'][0]['relative_path'] = unsafe
                self.assert_rejected('unsafe_input_path', lambda: batch._cli_inputs(manifest, input_root, self.policy))
        (input_root / 'alias.png').symlink_to(input_root / 'synthetic.png')
        manifest['items'][0]['relative_path'] = 'alias.png'
        self.assert_rejected('artifact_missing_or_unsafe', lambda: batch._cli_inputs(manifest, input_root, self.policy))

    def test_deadline_stops_before_commit_no_current_selection(self):
        real = batch.time.monotonic
        calls = 0
        def clock():
            nonlocal calls
            calls += 1
            return real() + (1000 if calls > 1 else 0)
        with patch.object(batch.time, 'monotonic', side_effect=clock):
            self.assert_rejected('wall_time_budget_exceeded', self.run_batch)
        self.assertIsNone(batch.current_token(self.store))


    def test_hardlinked_write_lock_and_artifact_cannot_change_external_bytes(self):
        self.store.mkdir()
        external = self.root / 'external-sentinel'
        external.write_bytes(b'never-change-these-external-bytes')
        for name in ('current.json.write', '.lock'):
            with self.subTest(name=name):
                target = self.store / name
                if target.exists():
                    target.unlink()
                os.link(external, target)
                self.assert_rejected('hardlink_not_allowed', self.run_batch)
                self.assertEqual(external.read_bytes(), b'never-change-these-external-bytes')
                target.unlink()
        out = self.run_batch()
        original = self.stage(out)[0] / 'original.bin'
        original.unlink()
        os.link(external, original)
        self.assert_rejected('hardlink_not_allowed', self.run_batch)
        self.assertEqual(external.read_bytes(), b'never-change-these-external-bytes')

    def test_exclusive_write_rejects_hardlink_created_after_inventory(self):
        self.store.mkdir()
        external = self.root / 'external-sentinel'
        external.write_bytes(b'unchanged')
        target = self.store / 'current.json'
        real_open = batch.os.open
        def create_hardlink_then_open(path, flags, *args):
            if Path(path).name == 'current.json.write':
                os.link(external, path)
            return real_open(path, flags, *args)
        with patch.object(batch.os, 'open', side_effect=create_hardlink_then_open):
            with self.assertRaises(FileExistsError):
                batch._write(self.store, target, b'replacement', 100000)
        self.assertEqual(external.read_bytes(), b'unchanged')

    def test_encoder_limit_and_animated_input_quarantine(self):
        self.assert_rejected('artifact_byte_limit', lambda: batch._png(Image.new('RGB', (10, 10)), 1))
        images = [Image.new('RGBA', (6, 4), (1, 2, 3, 128)),
                  Image.new('RGBA', (6, 4), (4, 5, 6, 128))]
        buffer = io.BytesIO()
        images[0].save(buffer, 'PNG', save_all=True, append_images=images[1:], duration=10, loop=0)
        self.item = self.make_item('ANIMATED-SYNTHETIC', buffer.getvalue())
        result = self.run_batch()
        self.assertIn('animated_image_not_supported', self.stage(result)[1]['blocking_reasons'])

    def test_checkpoint_binding_corruption_blocks_restart(self):
        real_write = batch._write
        def crash_result(root, path, raw, limit):
            if path.name == 'result.json':
                raise OSError('synthetic crash')
            return real_write(root, path, raw, limit)
        with patch.object(batch, '_write', side_effect=crash_result):
            with self.assertRaises(OSError):
                self.run_batch()
        checkpoint = next((self.store / 'batches').glob('*/checkpoint.json'))
        record = json.loads(checkpoint.read_bytes())
        record['completed'][0]['manifest_sha256'] = '0' * 64
        checkpoint.write_bytes(batch.canonical(record))
        self.assert_rejected('checkpoint_stage_mismatch', self.run_batch)
        self.assertIsNone(batch.current_token(self.store))


    def test_consistently_rehashed_result_cannot_promote_effect_or_status(self):
        out = self.run_batch()
        result_path = self.store / 'batches' / out['batch_key'] / 'result.json'
        pointer_path = self.store / 'current.json'
        result_before = result_path.read_bytes()
        pointer_before = pointer_path.read_bytes()
        for field, value, reason in (
            ('publishable', True, 'result_effect_flags_invalid'),
            ('network_calls', 1, 'result_effect_flags_invalid'),
            ('model_calls', 1, 'result_effect_flags_invalid'),
            ('external_spend_minor', 1, 'result_effect_flags_invalid'),
            ('status', 'approved', 'result_status_invalid'),
        ):
            with self.subTest(field=field):
                result = json.loads(result_before)
                result[field] = value
                raw = batch.canonical(result)
                result_path.write_bytes(raw)
                pointer = json.loads(pointer_before)
                pointer['result_sha256'] = batch.sha(raw)
                pointer_path.write_bytes(batch.canonical(pointer))
                self.assert_rejected(reason, self.run_batch)
        result_path.write_bytes(result_before)
        pointer_path.write_bytes(pointer_before)
        self.assertEqual(self.run_batch(), out)

    def test_consistently_rehashed_stage_cannot_promote_or_replace_original(self):
        out = self.run_batch()
        directory, stage_before = self.stage(out)
        manifest_path = directory / 'manifest.json'
        result_path = self.store / 'batches' / out['batch_key'] / 'result.json'
        result_before = json.loads(result_path.read_bytes())
        pointer_path = self.store / 'current.json'
        pointer_before = json.loads(pointer_path.read_bytes())
        def rehash(record):
            manifest_path.write_bytes(batch.canonical(record))
            result = copy.deepcopy(result_before)
            result['stages'][0]['manifest_sha256'] = batch.digest(record)
            result_path.write_bytes(batch.canonical(result))
            pointer = copy.deepcopy(pointer_before)
            pointer['result_sha256'] = batch.digest(result)
            pointer_path.write_bytes(batch.canonical(pointer))
        for field, value, reason in (
            ('publishable', True, 'stage_effect_flags_invalid'),
            ('segmentation_performed', True, 'stage_effect_flags_invalid'),
            ('generative_changes', True, 'stage_effect_flags_invalid'),
            ('status', 'approved', 'stage_review_invalid'),
            ('manual_review_required', [], 'stage_effect_flags_invalid'),
        ):
            with self.subTest(field=field):
                record = copy.deepcopy(stage_before)
                record[field] = value
                rehash(record)
                self.assert_rejected(reason, self.run_batch)
        altered_original = synthetic_png(orientation=6)
        (directory / 'original.bin').write_bytes(altered_original)
        record = copy.deepcopy(stage_before)
        record['artifacts']['original.bin'] = {'sha256': batch.sha(altered_original), 'bytes': len(altered_original)}
        rehash(record)
        self.assert_rejected('original_anchor_mismatch', self.run_batch)

    def test_duplicate_json_keys_and_nonfinite_values_are_rejected(self):
        for raw in (b'{"a":1,"a":2}', b'{"a":NaN}'):
            self.assert_rejected('invalid_json', lambda: batch._json(raw))


if __name__ == '__main__':
    unittest.main()

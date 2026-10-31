"""Controlled worker failures and config checks, not native model evidence."""
import copy
import os
import subprocess
import unittest
from unittest.mock import patch, MagicMock
from PIL import Image
from tools import birefnet_rembg_batch as adapter
from tools import product_image_batch as batch


class GeneralBatchTest(unittest.TestCase):
    def setUp(self):
        self.config = {'adapter': adapter.ADAPTER, 'artifact_root': '/tmp/synthetic',
                       'max_session_working_bytes': 12 * 1024**3,
                       'max_tensor_working_bytes': 128 * 1024**2,
                       'max_input_pixels': 10000, 'max_inference_seconds': 5}
        self.image = Image.new('RGBA', (6, 4), (2, 9, 30, 255))

    def test_selection_is_explicit_and_binding_fixed(self):
        self.assertEqual(batch._declared_segmenter_binding(self.config)['model_sha256'], adapter.pilot.MODEL_SHA256)
        altered = copy.deepcopy(self.config); altered['expected_model_sha256'] = '0' * 64
        with self.assertRaises(adapter.SegmentationRejected): adapter.validate_config(altered)
        altered = copy.deepcopy(self.config); altered['max_session_working_bytes'] = 1024
        with self.assertRaises(adapter.SegmentationRejected): adapter.validate_config(altered)

    def test_timeout_is_failed_one_attempt_without_retry(self):
        model = adapter.BiRefNetOnnx(self.config)
        child = MagicMock()
        child.communicate.side_effect = [subprocess.TimeoutExpired('worker', 5), (b'', b'')]
        def start(*args, **kwargs):
            os.write(kwargs['pass_fds'][0], b'1')
            return child
        with patch.object(adapter.subprocess, 'Popen', side_effect=start) as run:
            with self.assertRaisesRegex(adapter.SegmentationRejected, 'segmenter_inference_deadline'):
                model.apply(self.image)
        self.assertEqual(run.call_count, 1)
        self.assertEqual(model.local_model_calls, 1)

    def test_unsafe_input_and_orientation_rejected_before_worker(self):
        model = adapter.BiRefNetOnnx(self.config)
        image = self.image.copy(); image.getexif()[274] = 6
        with patch.object(adapter.subprocess, 'Popen') as run:
            with self.assertRaisesRegex(adapter.SegmentationRejected, 'orientation'):
                model.apply(image)
            with self.assertRaisesRegex(adapter.SegmentationRejected, 'admission'):
                model.apply(Image.new('RGBA', (101, 100)))
            profiled = self.image.copy(); profiled.info['icc_profile'] = b'unverified'
            with self.assertRaisesRegex(adapter.SegmentationRejected, 'color_encoding'):
                model.apply(profiled)
        run.assert_not_called()
        self.assertEqual(model.local_model_calls, 0)

    def test_worker_errors_remain_fail_closed(self):
        model = adapter.BiRefNetOnnx(self.config)
        child = MagicMock(returncode=2)
        child.communicate.return_value = (b'{"error":"model_hash_mismatch"}', b'')
        with patch.object(adapter.subprocess, 'Popen', return_value=child):
            with self.assertRaisesRegex(adapter.SegmentationRejected, 'model_hash_mismatch'):
                model.apply(self.image)
        self.assertEqual(model.local_model_calls, 0)


if __name__ == '__main__':
    unittest.main()

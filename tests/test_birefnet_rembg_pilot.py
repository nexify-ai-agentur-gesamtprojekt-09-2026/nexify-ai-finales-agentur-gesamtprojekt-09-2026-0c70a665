"""Synthetic arithmetic checks; not a model or quality acceptance."""
import unittest

import numpy as np
from PIL import Image
from tools import birefnet_rembg_pilot as pilot


class RembgPilotTest(unittest.TestCase):
    def test_preprocessing_uses_image_maximum(self):
        image = Image.new('RGB', (3, 2), (25, 50, 100))
        result = pilot.normalize(image)
        self.assertEqual(result.shape, (1, 3, 1024, 1024))
        self.assertEqual(result.dtype, np.float32)
        self.assertAlmostEqual(float(result[0, 0, 0, 0]), (0.25 - .485) / .229, places=6)
        self.assertAlmostEqual(float(result[0, 2, 0, 0]), (1 - .406) / .225, places=6)

    def test_invalid_or_uniform_logits_are_rejected(self):
        for logits in (np.zeros((1,), np.float32), np.zeros((1, 1, 1024, 1024), np.float32),
                       np.full((1, 1, 1024, 1024), np.nan, np.float32)):
            with self.assertRaises(ValueError):
                pilot.mask_from_logits(logits, (4, 4))

    def test_mask_matches_reference_for_extreme_finite_logits(self):
        logits = np.linspace(-100, 100, 1024 * 1024, dtype=np.float32).reshape(1, 1, 1024, 1024)
        mask = pilot.mask_from_logits(logits, (1024, 1024))
        with np.errstate(over='ignore'):
            pred = 1 / (1 + np.exp(-logits[:, 0, :, :]))
        pred = (pred - np.min(pred)) / (np.max(pred) - np.min(pred))
        expected = (np.squeeze(pred) * 255).astype(np.uint8)
        self.assertLessEqual(np.abs(np.asarray(mask, dtype=np.int16) - expected.astype(np.int16)).max(), 1)


if __name__ == '__main__':
    unittest.main()

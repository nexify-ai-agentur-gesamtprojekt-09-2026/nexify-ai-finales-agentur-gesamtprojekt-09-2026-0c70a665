"""Synthetic comparison tests, not proof of model or exporter parity."""
import unittest
import tempfile
from pathlib import Path

import numpy as np
from tools import birefnet_parity as parity


class ParityTest(unittest.TestCase):
    def setUp(self):
        self.reference = np.zeros(parity.SHAPE, dtype=np.float32)

    def test_identical_and_small_absolute_delta_pass(self):
        candidate = self.reference.copy()
        candidate[0, 0, 0, 0] = 0.00005
        result = parity.compare(self.reference, candidate)
        self.assertTrue(result['passed'])
        self.assertEqual(result['outside_tolerance'], 0)

    def test_one_pixel_outside_tolerance_fails(self):
        candidate = self.reference.copy()
        candidate[0, 0, 0, 0] = 0.01
        result = parity.compare(self.reference, candidate)
        self.assertFalse(result['passed'])
        self.assertEqual(result['outside_tolerance'], 1)

    def test_shape_dtype_and_nonfinite_rejected(self):
        for candidate in (np.zeros((1,), dtype=np.float32),
                          self.reference.astype(np.float64),
                          np.full(parity.SHAPE, np.nan, dtype=np.float32)):
            with self.subTest(shape=candidate.shape, dtype=candidate.dtype):
                with self.assertRaises(ValueError):
                    parity.compare(self.reference, candidate)

    def test_file_read_is_bounded_and_hashes_exact_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'logits.npy'
            np.save(path, self.reference, allow_pickle=False)
            loaded, digest = parity.read_array(path)
            self.assertEqual(digest, parity.hashlib.sha256(path.read_bytes()).hexdigest())
            self.assertTrue(parity.compare(self.reference, loaded)['passed'])
            path.write_bytes(b'x' * (parity.MAX_FILE_BYTES + 1))
            with self.assertRaisesRegex(ValueError, 'logit_file_size_limit'):
                parity.read_array(path)


if __name__ == '__main__':
    unittest.main()

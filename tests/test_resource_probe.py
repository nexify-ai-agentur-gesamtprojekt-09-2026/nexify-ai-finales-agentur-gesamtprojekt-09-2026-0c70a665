import importlib.util
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location('resource_probe', Path(__file__).resolve().parents[1] / 'tools/resource_probe.py')
probe = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(probe)


class ResourceProbeTests(unittest.TestCase):
    def test_cgroup_quota_instead_of_host_cpu_count(self):
        self.assertEqual(probe.cpu_quota('400000 100000'), 4)
        self.assertEqual(probe.cpu_quota('50000 100000'), .5)
        for value in ('max 100000', '2 0', '-1 100000', '', 'invalid', None):
            self.assertIsNone(probe.cpu_quota(value))

    def test_unknown_unlimited_and_bad_memory_values_remain_unknown(self):
        for value in ('max', None, '-1', 'unknown'):
            self.assertIsNone(probe.positive(value))
        self.assertEqual(probe.positive('0'), 0)

    def test_counter_deltas_are_cores_and_reset_is_not_negative_load(self):
        self.assertEqual(probe.usage_cores(1_000_000, 3_000_000, 2), 1)
        for before, after, elapsed in [(2, 1, 1), (None, 1, 1), (1, 2, 0), (1, 2, float('nan'))]:
            self.assertIsNone(probe.usage_cores(before, after, elapsed))
        self.assertEqual(probe.counter('usage_usec 123\nuser_usec 100\n', 'usage_usec'), 123)
        self.assertIsNone(probe.counter('usage_usec invalid', 'usage_usec'))

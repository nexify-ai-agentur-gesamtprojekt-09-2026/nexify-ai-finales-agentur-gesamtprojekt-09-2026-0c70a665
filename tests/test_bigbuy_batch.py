import copy
import json
import unittest
from tools.bigbuy_batch import prepare, BatchRejected


class BigBuyBatchTest(unittest.TestCase):
    def setUp(self):
        self.rows = {
            'products': [{'id': 1, 'sku': 'SYNTHETIC-1', 'ean13': '0012345678901', 'taxonomy': 7,
                          'wholesalePrice': '1.00', 'retailPrice': '2.00'}],
            'information': [{'id': 1, 'sku': 'SYNTHETIC-1', 'isoCode': 'de', 'name': 'Testteil',
                             'description': '<p>Nur <b>synthetischer</b> Text.</p><script>evil()</script>'}],
            'images': [{'id': 1, 'images': [{'id': 10, 'url': 'https://invalid.example/1.png'},
                                          {'id': 11, 'url': 'https://invalid.example/2.png'}]}],
            'stock': [{'id': 1, 'sku': 'SYNTHETIC-1', 'stocks': [{'quantity': 3}]}],
            'taxonomies': [{'id': 7, 'name': 'Synthetisch'}]}
        self.policy = dict(tenant='synthetic', project='isolated', selected_taxonomies=[7],
                           max_bytes=10000, max_rows=10, max_text=1000, max_images=5)

    def run_batch(self):
        return prepare({k: json.dumps(v).encode() for k, v in self.rows.items()}, **self.policy)

    def test_deterministic_bound_draft_and_all_slots(self):
        before = copy.deepcopy(self.rows)
        out = self.run_batch()
        self.assertEqual(out, self.run_batch())
        self.assertEqual(self.rows, before)
        row = out['products'][0]
        self.assertEqual(row['ean13'], '0012345678901')
        self.assertEqual(len(row['image_slots']), 2)
        self.assertEqual(row['content']['description']['text'], 'Nur synthetischer Text.')
        self.assertFalse(out['publishable'])
        self.assertFalse(row['buyable'])
        self.assertNotIn('price_minor', row)
        self.assertEqual(row['content']['title']['fact_ids'], ['supplier_name'])

    def test_stock_change_keeps_content_and_image_stage_identity(self):
        a = self.run_batch()
        self.rows['stock'][0]['stocks'][0]['quantity'] = 9
        self.rows['products'][0]['dateUpdStock'] = '2026-10-27'
        b = self.run_batch()
        for stage in ('text', 'image_inventory'):
            self.assertEqual(a['products'][0]['stages'][stage], b['products'][0]['stages'][stage])
        self.assertNotEqual(a['output_sha256'], b['output_sha256'])
        self.assertNotEqual(a['products'][0]['stages']['stock'], b['products'][0]['stages']['stock'])

    def test_missing_data_never_deletes_or_publishes(self):
        self.rows['stock'] = []
        self.rows['images'] = []
        row = self.run_batch()['products'][0]
        self.assertIn('stock_missing', row['blocking_reasons'])
        self.assertIn('images_missing', row['blocking_reasons'])
        self.rows['products'] = []
        out = self.run_batch()
        self.assertEqual(out['deletions'], [])
        self.assertFalse(out['publishable'])

    def test_filter_requires_explicit_present_taxonomy(self):
        self.policy['selected_taxonomies'] = []
        with self.assertRaises(BatchRejected): self.run_batch()
        self.policy['selected_taxonomies'] = [8]
        with self.assertRaises(BatchRejected): self.run_batch()
        self.rows['taxonomies'].append({'id': 8})
        self.assertEqual(self.run_batch()['products'], [])

    def test_duplicate_and_cross_product_binding_rejected(self):
        for feed in self.rows:
            with self.subTest(feed=feed):
                self.rows[feed].append(copy.deepcopy(self.rows[feed][0]))
                with self.assertRaises(BatchRejected): self.run_batch()
                self.rows[feed].pop()
        for feed in ('information', 'stock'):
            old = self.rows[feed][0]['sku']
            self.rows[feed][0]['sku'] = 'OTHER'
            with self.assertRaises(BatchRejected): self.run_batch()
            self.rows[feed][0]['sku'] = old

    def test_limits_and_types_fail_closed(self):
        for field in ('max_bytes', 'max_rows', 'max_text', 'max_images'):
            old = self.policy[field]
            self.policy[field] = False
            with self.assertRaises(BatchRejected): self.run_batch()
            self.policy[field] = old
        self.policy['max_bytes'] = 1
        with self.assertRaises(BatchRejected): self.run_batch()
        self.policy['max_bytes'] = 10000
        self.policy['max_images'] = 1
        with self.assertRaises(BatchRejected): self.run_batch()
        self.policy['max_images'] = 5
        self.rows['products'][0]['ean13'] = 1234
        with self.assertRaises(BatchRejected): self.run_batch()

    def test_wrong_language_and_nonstring_content_rejected(self):
        self.rows['information'][0]['isoCode'] = 'en'
        with self.assertRaises(BatchRejected): self.run_batch()
        self.rows['information'][0]['isoCode'] = 'de'
        for value in (None, 42, {}, [], True):
            self.rows['information'][0]['name'] = value
            with self.assertRaises(BatchRejected): self.run_batch()

    def test_json_duplicates_and_nonfinite_rejected(self):
        feeds = {k: json.dumps(v).encode() for k, v in self.rows.items()}
        for raw in (b'[{"id":1,"id":2}]', b'[{"id":1,"x":NaN}]', b'{}'):
            feeds['products'] = raw
            with self.assertRaises(BatchRejected): prepare(feeds, **self.policy)

    def test_scope_changes_fingerprint(self):
        a = self.run_batch()
        self.policy['tenant'] = 'other-synthetic'
        b = self.run_batch()
        self.assertNotEqual(a['config_sha256'], b['config_sha256'])
        for stage in ('text', 'image_inventory', 'stock'):
            self.assertNotEqual(a['products'][0]['stages'][stage]['config_sha256'],
                                b['products'][0]['stages'][stage]['config_sha256'])


if __name__ == '__main__': unittest.main()

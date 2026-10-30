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

    def test_taxonomy_is_required_and_category_is_not_a_fallback(self):
        product = self.rows['products'][0]
        product['category'] = 7
        for value in (None, True, False, 0, -1, '7', [], {}):
            with self.subTest(taxonomy=value):
                product['taxonomy'] = value
                with self.assertRaisesRegex(BatchRejected, 'invalid_taxonomy'):
                    self.run_batch()
        del product['taxonomy']
        with self.assertRaisesRegex(BatchRejected, 'invalid_taxonomy'):
            self.run_batch()
        product['taxonomy'] = 7
        product['category'] = 8
        self.assertEqual(len(self.run_batch()['products']), 1)
        product['taxonomy'] = 8
        product['category'] = 7
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


class StagingContractTest(unittest.TestCase):
    def setUp(self):
        from tools.bigbuy_batch import stage_readonly_pages, staging_quota_plan
        self.stage_fn, self.quota = stage_readonly_pages, staging_quota_plan
        self.args = dict(source={'supplier':'BigBuy','scope':'synthetic','source_sha256':'a'*64},
            observed_at='2026-10-30T10:00:00Z', now='2026-10-30T10:01:00Z', max_age_seconds=120,
            requested_coverage='partial', pages=[{'resource':'products','page':0,'page_size':50,
              'status':200,'body_sha256':'b'*64,'row_count':1},
              {'resource':'variations','page':0,'page_size':50,'status':200,'body_sha256':'c'*64,'row_count':1},
              {'resource':'stock','page':0,'page_size':50,'status':200,'body_sha256':'d'*64,'row_count':1}],
            products=[{'id':1,'sku':'PRODUCT-1','ean':'0012345678901'}],
            variants=[{'id':2,'product_id':1,'sku':'VARIANT-2','ean':'0001234567890'}],
            stocks=[{'sku':'VARIANT-2','buckets':[{'quantity':3,'min_days':0,'max_days':1,'warehouse':1},
              {'quantity':5,'min_days':4,'max_days':6,'warehouse':2}]}])

    def stage(self): return self.stage_fn(**self.args)

    def test_staging_manifest_and_unknowns(self):
        import hashlib
        out=self.stage()
        self.assertEqual(out['schema'],'nexify.bigbuy.offline-staging/2')
        self.assertEqual(hashlib.sha256(out['manifest_bytes']).hexdigest(),out['manifest_sha256'])
        self.assertEqual(out['products'][0]['ean'],'0012345678901')
        self.assertEqual(out['stock_buckets'][0]['buckets'][1]['min_days'],4)
        manifest=json.loads(out['manifest_bytes'])
        self.assertTrue(manifest['source_and_page_hashes_caller_asserted'])
        self.assertFalse(manifest['raw_to_records_verified'])
        self.assertFalse(out['saleEnabled']); self.assertEqual(out['releasedProductIds'],[])
        for key in ('currency','tax','rights','fitment'): self.assertIsNone(out[key])
        self.assertEqual(out,self.stage())

    def test_short_page_never_proves_complete(self):
        for requested, expected in [('sample','sample'),('partial','partial'),('complete','partial')]:
            self.args['requested_coverage']=requested
            out=self.stage(); self.assertEqual(out['coverage'],expected); self.assertFalse(out['complete_verified'])

    def test_duplicate_skus_and_orphan_variants_rejected(self):
        self.args['variants'][0]['sku']='PRODUCT-1'
        with self.assertRaisesRegex(BatchRejected,'duplicate_or_invalid_sku'): self.stage()
        self.args['variants'][0]['sku']='VARIANT-2'; self.args['variants'][0]['product_id']=9
        with self.assertRaisesRegex(BatchRejected,'orphan_variant'): self.stage()

    def test_repeated_page_and_response_failures(self):
        page=self.args['pages'][0]; self.args['pages'].append({**page,'page':1})
        with self.assertRaisesRegex(BatchRejected,'repeated_page_body'): self.stage()
        self.args['pages'].pop()
        for status in (409,429,'timeout'):
            page['status']=status
            with self.subTest(status=status), self.assertRaisesRegex(BatchRejected,'page_run_stopped'): self.stage()

    def test_stale_and_schema_errors(self):
        self.args['now']='2026-10-30T10:03:00Z'
        with self.assertRaisesRegex(BatchRejected,'stale_or_future_snapshot'): self.stage()
        self.args['now']='2026-10-30T10:01:00Z'; self.args['products'][0]['ean']=123
        with self.assertRaisesRegex(BatchRejected,'invalid_ean'): self.stage()
        self.args['products'][0]['ean']=None; self.args['stocks'][0]['buckets'][0]['min_days']=9
        with self.assertRaisesRegex(BatchRejected,'invalid_bucket'): self.stage()
        self.args['stocks'][0]['buckets'][0]['min_days']=0; self.args['products'][0]['unexpected']=True
        with self.assertRaisesRegex(BatchRejected,'invalid_product'): self.stage()

    def test_missing_page_and_inconsistent_count_rejected(self):
        self.args['pages'].pop()
        with self.assertRaisesRegex(BatchRejected,'page_record_count_mismatch'): self.stage()

    def test_manifest_is_snapshot_and_bucket_budget_is_enforced(self):
        import hashlib
        before = self.stage()
        original_manifest = before['manifest_bytes']
        self.args['products'][0]['sku'] = 'CHANGED'
        self.assertEqual(before['products'][0]['sku'], 'PRODUCT-1')
        self.assertEqual(hashlib.sha256(original_manifest).hexdigest(), before['manifest_sha256'])
        self.args['products'][0]['sku'] = 'PRODUCT-1'
        self.args['stocks'][0]['buckets'] *= 501
        with self.assertRaisesRegex(BatchRejected, 'invalid_stock_buckets'): self.stage()

    def test_stock_bucket_limits_and_numeric_boundaries(self):
        bucket = self.args['stocks'][0]['buckets'][0]
        self.args['stocks'][0]['buckets'] = [dict(bucket) for _ in range(1000)]
        self.assertEqual(len(self.stage()['stock_buckets'][0]['buckets']), 1000)
        self.args['stocks'][0]['buckets'].append(dict(bucket))
        with self.assertRaisesRegex(BatchRejected, 'invalid_stock_buckets'): self.stage()
        self.args['stocks'][0]['buckets'] = [dict(bucket, quantity=10**9)]
        self.assertEqual(self.stage()['stock_buckets'][0]['buckets'][0]['quantity'], 10**9)
        self.args['stocks'][0]['buckets'][0]['quantity'] = 10**9 + 1
        with self.assertRaisesRegex(BatchRejected, 'invalid_bucket'): self.stage()

    def test_quota_across_jobs_and_bounded_retries(self):
        args=dict(resource='products',already_used=2,jobs=[{'id':'a','requests':2},{'id':'b','requests':2}],limit=10,max_attempts=2)
        plan=self.quota(**args); self.assertTrue(plan['allowed']); self.assertFalse(plan['reservation'])
        args['already_used']=3; self.assertFalse(self.quota(**args)['allowed'])
        args['max_attempts']=4
        with self.assertRaisesRegex(BatchRejected,'invalid_attempt_limit'): self.quota(**args)
        args['max_attempts']=1; args['jobs'][1]['id']='a'
        with self.assertRaisesRegex(BatchRejected,'duplicate_job'): self.quota(**args)


class RawStagingTest(unittest.TestCase):
    def fixtures(self):
        import io
        from tools.bigbuy_batch import stage_raw_streams
        records = [
            ('products',[{'id':1,'sku':'P','ean13':'00123'}]),
            ('variations',[{'id':2,'product':1,'sku':'V','ean13':'00045'}]),
            ('stock',[{'sku':'V','stocks':[{'quantity':3,'minHandlingDays':1,'maxHandlingDays':2,'warehouse':1}]}])]
        pages=[{'resource':r,'page':0,'page_size':50,'status':200,'stream':io.BytesIO(json.dumps(data).encode())} for r,data in records]
        args=dict(scope='fixture',observed_at='2026-10-30T10:00:00Z',now='2026-10-30T10:01:00Z',max_age_seconds=120,
                  requested_coverage='sample',raw_pages=pages,max_raw_bytes=10000)
        return stage_raw_streams,args

    def test_bytes_are_hashed_and_projection_is_bound(self):
        import hashlib
        fn,args=self.fixtures()
        first=args['raw_pages'][0]['stream'].getvalue()
        out=fn(**args); manifest=json.loads(out['manifest_bytes'])
        self.assertEqual(manifest['pages'][0]['body_sha256'],hashlib.sha256(first).hexdigest())
        self.assertTrue(manifest['raw_to_records_verified'])
        self.assertFalse(manifest['transport_and_supplier_identity_verified'])
        self.assertEqual(out['products'][0]['ean'],'00123')
        self.assertEqual(out['stock_buckets'][0]['buckets'][0]['min_days'],1)
        self.assertFalse(out['saleEnabled'])

    def test_raw_budget_and_schema_rejection(self):
        import io
        fn,args=self.fixtures(); args['max_raw_bytes']=1
        with self.assertRaisesRegex(BatchRejected,'raw_byte_limit'): fn(**args)
        fn,args=self.fixtures(); args['raw_pages'][0]['stream']=io.BytesIO(b'[{"id":1,"id":2}]')
        with self.assertRaises(BatchRejected): fn(**args)
        fn,args=self.fixtures(); args['raw_pages'][0]['stream']=io.BytesIO(b'{}')
        with self.assertRaisesRegex(BatchRejected,'invalid_raw_rows'): fn(**args)
        fn,args=self.fixtures(); args['raw_pages'][0]['status']=429
        with self.assertRaisesRegex(BatchRejected,'page_run_stopped'): fn(**args)

    def test_byte_limit_and_concurrent_quota_are_not_runtime_guarantees(self):
        from tools.bigbuy_batch import _bounded_record_bytes, staging_quota_plan
        self.assertEqual(len(_bounded_record_bytes(b'x'*(16*1024*1024))),16*1024*1024)
        with self.assertRaisesRegex(BatchRejected,'record_byte_limit'):
            _bounded_record_bytes(b'x'*(16*1024*1024+1))
        plan=lambda: staging_quota_plan(resource='products',already_used=9,jobs=[{'id':'job','requests':1}],limit=10,max_attempts=1)
        a,b=plan(),plan()
        self.assertTrue(a['allowed'] and b['allowed'])
        self.assertFalse(a['reservation'] or b['runtime_enforcement'])
        self.assertGreater(9+a['planned_attempts']+b['planned_attempts'],10)

    def test_raw_stream_16mib_boundary_before_parse(self):
        import io
        fn,args=self.fixtures()
        maximum=16*1024*1024
        page={'resource':'products','page':0,'page_size':50,'status':200,
              'stream':io.BytesIO(b'[]'+b' '*(maximum-2))}
        args.update(raw_pages=[page],max_raw_bytes=maximum)
        result=fn(**args)
        self.assertEqual(json.loads(result['manifest_bytes'])['raw_bytes'],maximum)
        page['stream']=io.BytesIO(b'[]'+b' '*(maximum-1))
        with self.assertRaisesRegex(BatchRejected,'raw_byte_limit'): fn(**args)

    def test_total_stock_bucket_boundary(self):
        from tools.bigbuy_batch import stage_readonly_pages
        bucket={'quantity':1,'min_days':1,'max_days':2,'warehouse':1}
        products=[{'id':i+1,'sku':f'P{i}','ean':None} for i in range(100)]
        stocks=[{'sku':f'P{i}','buckets':[bucket]*1000} for i in range(100)]
        pages=[{'resource':'products','page':0,'page_size':100,'status':200,'body_sha256':'b'*64,'row_count':100},
               {'resource':'stock','page':0,'page_size':100,'status':200,'body_sha256':'c'*64,'row_count':100}]
        args=dict(source={'supplier':'BigBuy','scope':'fixture','source_sha256':'a'*64}, observed_at='2026-10-30T10:00:00Z',
            now='2026-10-30T10:01:00Z',max_age_seconds=120,requested_coverage='sample',pages=pages,
            products=products,variants=[],stocks=stocks)
        out=stage_readonly_pages(**args)
        self.assertEqual(sum(len(x['buckets']) for x in out['stock_buckets']),100000)
        stocks[0]['buckets'].append(bucket)
        with self.assertRaisesRegex(BatchRejected,'stock_bucket_budget'): stage_readonly_pages(**args)


if __name__ == '__main__': unittest.main()

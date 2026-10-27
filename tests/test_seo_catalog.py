"""Research staging invariants; all fixtures are synthetic and never business evidence."""
import csv
import concurrent.futures
import threading
import importlib.util
import sqlite3
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('seo_catalog', Path(__file__).parents[1] / 'tools/seo_catalog.py')
seo = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(seo)


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.db_path = self.root / 'stage.sqlite3'
        self.db = sqlite3.connect(self.db_path)
        self.db.row_factory = sqlite3.Row
        self.db.execute('PRAGMA foreign_keys=ON')
        self.db.executescript(seo.SCHEMA)

    def tearDown(self):
        self.db.close()
        self.tmp.cleanup()

    def cities(self, rows):
        p = self.root / 'cities.tsv'
        with p.open('w', newline='') as f:
            writer = csv.writer(f, delimiter='\t')
            for uid, name, code, lat, country in rows:
                writer.writerow([uid, name, name, 'Alias', lat, '6.1', 'P', code, country, '', '', '', '', '', '1', '', '', 'Europe/Berlin', '2026-10-01'])
        return p

    def keywords(self, qualities=None):
        rows = []
        for i in range(10):
            rows.append(dict(keyword=f'synthetic topic {i}', country='DE', language='de', period='2026-09', monthly_volume=str(i), source='https://example.invalid/metrics?api_key=neverpersist', source_observed_at='2026-10-01T00:00:00Z', metric_quality='measured_estimate', cluster='synthetic', keyword_role='main', intent='commercial'))
        if qualities:
            for i, values in qualities.items():rows[i].update(values)
        p = self.root / 'keywords.csv'
        with p.open('w', newline='') as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
        return p

    def plan(self):
        return seo.plan(self.db, 'tenant-a', 'project', 'DE', 'de', '2026-09', 'https://example.invalid/metrics')

    def test_city_replay_restart_collisions_stay_private_drafts(self):
        p = self.cities([('1','Same City','PPL','50','DE'),('2','Same City','PPLA','51','DE'),('3','Old City','PPLH','50','DE'),('4','Elsewhere','PPL','50','AT')])
        for _ in range(2):seo.import_cities(self.db,p,'DE','GeoNames synthetic fixture','CC BY 4.0','v1')
        self.db.close();self.db=sqlite3.connect(self.db_path);self.db.row_factory=sqlite3.Row
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM city').fetchone()[0],2)
        self.assertEqual(len({r[0] for r in self.db.execute('SELECT canonical_slug FROM city')}),2)
        self.assertEqual([tuple(r) for r in self.db.execute('SELECT status,robots,published,service_coverage_verified,office_address FROM landing_page_draft')],[('draft','noindex,nofollow',0,0,None)]*2)
        self.assertTrue(all('unverified' in r[0] or 'not_verified' in r[0] for r in self.db.execute('SELECT city_type_status FROM city')))

    def test_geo_atomic_bounds_source_version_and_safe_paths(self):
        p=self.cities([('1','Okay','PPL','50','DE'),('2','Invalid','PPL','91','DE')])
        with self.assertRaises(ValueError):seo.import_cities(self.db,p,'DE','fixture','CC BY 4.0','v1')
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM city').fetchone()[0],0)
        p=self.cities([('1','Okay','PPL','50','DE')]);seo.import_cities(self.db,p,'DE','fixture','CC BY 4.0','v1')
        p=self.cities([('1','Changed','PPL','50','DE')])
        with self.assertRaises(ValueError):seo.import_cities(self.db,p,'DE','fixture','CC BY 4.0','v1')
        link=self.root/'linked.tsv';link.symlink_to(p)
        with self.assertRaises(ValueError):seo.local_input(link,'.tsv')
        with self.assertRaises(ValueError):seo.connect('.local/../outside-seo.sqlite3')


    def test_geographic_conflicting_concurrent_imports_have_one_atomic_winner(self):
        first=self.cities([('1','First Name','PPL','50','DE')])
        a=self.root/'first.tsv';a.write_bytes(first.read_bytes())
        second=self.cities([('1','Second Name','PPL','51','DE')])
        b=self.root/'second.tsv';b.write_bytes(second.read_bytes())
        start=threading.Barrier(2)
        unprotected_reads=threading.Barrier(2)

        class RacingConnection(sqlite3.Connection):
            def execute(inner, sql, parameters=()):
                cursor=super().execute(sql,parameters)
                # Reproduce the prior check/insert race if the lookup lacks a write transaction.
                # Properly locked imports serialize and never enter this barrier.
                if sql.startswith('SELECT sha256,license FROM geo_source') and not inner.in_transaction:
                    result=cursor.fetchall()
                    unprotected_reads.wait(timeout=5)
                    return iter_cursor(result)
                return cursor

        class iter_cursor:
            def __init__(inner,rows):inner.rows=rows
            def fetchone(inner):return inner.rows[0] if inner.rows else None

        def writer(path):
            connection=sqlite3.connect(self.db_path,timeout=10,factory=RacingConnection)
            connection.row_factory=sqlite3.Row
            connection.execute('PRAGMA foreign_keys=ON')
            try:
                start.wait(timeout=5)
                return ('accepted',seo.import_cities(connection,path,'DE','fixture','CC BY 4.0','v1'))
            except ValueError:
                return ('rejected',None)
            finally:connection.close()

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as workers:
            outcomes=list(workers.map(writer,[a,b]))
        self.assertEqual(sorted(x[0] for x in outcomes),['accepted','rejected'])
        winner=next(x[1] for x in outcomes if x[0]=='accepted')
        city=self.db.execute('SELECT name,latitude FROM city').fetchone()
        expected=('First Name',50.0) if winner['sha256']==seo.local_input(a,'.tsv')[1] else ('Second Name',51.0)
        self.assertEqual(tuple(city),expected)
        self.assertEqual(self.db.execute('SELECT sha256 FROM geo_source').fetchone()[0],winner['sha256'])
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM city_source').fetchone()[0],1)

    def test_old_source_replay_cannot_rollback_new_city_state(self):
        p=self.cities([('1','Original Name','PPL','50','DE')])
        original=self.root/'original.tsv';original.write_bytes(p.read_bytes())
        seo.import_cities(self.db,original,'DE','fixture','CC BY 4.0','v1')
        original_slug=self.db.execute('SELECT canonical_slug FROM city').fetchone()[0]
        p=self.cities([('1','Current Name','PPLA','51','DE')])
        seo.import_cities(self.db,p,'DE','fixture','CC BY 4.0','v2')
        before=[tuple(r) for r in self.db.execute('SELECT * FROM city')]
        replay=seo.import_cities(self.db,original,'DE','fixture','CC BY 4.0','v1')
        self.assertEqual(replay['status'],'source_already_imported_readback')
        self.assertEqual([tuple(r) for r in self.db.execute('SELECT * FROM city')],before)
        self.assertEqual(self.db.execute('SELECT name FROM city').fetchone()[0],'Current Name')
        self.assertEqual(self.db.execute('SELECT canonical_slug FROM city').fetchone()[0],original_slug)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM geo_source').fetchone()[0],2)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM city_source').fetchone()[0],2)

    def test_keyword_scope_replay_restart_and_credentials_redacted(self):
        p=self.keywords()
        for tenant in ['tenant-a','tenant-b']:
            for _ in range(2):seo.import_keywords(self.db,p,tenant,'project')
        self.db.close();self.db=sqlite3.connect(self.db_path);self.db.row_factory=sqlite3.Row
        self.assertEqual(len(seo.report(self.db,'tenant-a','project')['keyword_measurements']),10)
        self.assertEqual(len(seo.report(self.db,'tenant-a','other')['keyword_measurements']),0)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM keyword_measurement').fetchone()[0],20)
        self.assertNotIn('neverpersist',str(seo.report(self.db,'tenant-a','project')))
        self.assertEqual(seo.clean_reference('https://user:password@example.invalid/data?token=secret#x'),'https://example.invalid/data')

    def test_null_is_unknown_zero_is_valid_and_quality_blocks_ranking(self):
        p=self.keywords({1:dict(monthly_volume='',metric_quality='unavailable')})
        seo.import_keywords(self.db,p,'tenant-a','project')
        rows=seo.report(self.db,'tenant-a','project')['keyword_measurements']
        self.assertEqual(next(r for r in rows if r['keyword'].endswith('0'))['monthly_volume'],0)
        self.assertIsNone(next(r for r in rows if r['keyword'].endswith('1'))['monthly_volume'])
        self.assertEqual(self.plan()['top_ten'],[])
        self.db.execute('DELETE FROM keyword_measurement');self.db.commit()
        seo.import_keywords(self.db,self.keywords({1:dict(monthly_volume='10-100',metric_quality='range')}),'tenant-a','project')
        self.assertEqual(self.plan()['status'],'research_incomplete')

    def test_comparable_top_ten_estimates_only_no_copy_or_publish_grant(self):
        seo.import_keywords(self.db,self.keywords(),'tenant-a','project')
        result=self.plan()
        self.assertEqual(result['status'],'measurement_ready_for_strategy_review')
        self.assertEqual(len(result['top_ten']),10)
        self.assertEqual(result['top_ten'][0]['monthly_volume'],9)
        self.assertFalse(result['copy_generation_authorized']);self.assertFalse(result['publication_authorized'])
        other=seo.plan(self.db,'tenant-a','project','AT','de','2026-09','https://example.invalid/metrics')
        self.assertEqual(other['top_ten'],[])

    def test_conflicting_observation_and_unresolved_secondary_block(self):
        seo.import_keywords(self.db,self.keywords(),'tenant-a','project')
        with self.assertRaises(ValueError):
            seo.import_keywords(self.db,self.keywords({0:dict(monthly_volume='99')}),'tenant-a','project')
        self.assertEqual(self.plan()['top_ten'][-1]['monthly_volume'],0)
        self.db.execute("UPDATE keyword_measurement SET keyword_role='secondary',main_keyword='missing-main' WHERE keyword_key='synthetic topic 0'");self.db.commit()
        self.assertEqual(self.plan()['top_ten'],[])
        self.assertTrue(any('relation' in s for s in self.plan()['blockers']))


if __name__ == '__main__':unittest.main()

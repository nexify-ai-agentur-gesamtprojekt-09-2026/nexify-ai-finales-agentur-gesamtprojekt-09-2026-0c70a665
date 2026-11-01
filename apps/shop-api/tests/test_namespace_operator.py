"""Operator tests use metadata/DDL fakes only; no real URI, database or documents."""
import asyncio
import contextlib
import copy
import io
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT/'apps/shop-api'))
import namespace_operator as OP
from test_vercel_adapter import Database, Collection, Cursor, ENV


class NewCollection(Collection):
    async def create_index(self, keys, **options):
        if self.name not in self.database.claimed:
            raise AssertionError('Unclaimed collection index')
        self.database.ddl.append(('index', self.name))
        self.database.indexes[self.name][options['name']] = {'key': keys, **{k:v for k,v in options.items() if k!='name'}}


class EmptyDatabase(Database):
    def __init__(self):
        super().__init__()
        self.metadata, self.indexes, self.ddl, self.claimed = [], {}, [], set()
        self.fail_on = None
    def __getitem__(self, name): return NewCollection(self, name)
    async def create_collection(self, name, *, check_exists, **options):
        await asyncio.sleep(0)
        if name == self.fail_on: raise RuntimeError('mongodb://DO_NOT_PRINT')
        existing = next((row for row in self.metadata if row['name']==name),None)
        if existing is not None:
            if existing['options']==options: return self[name]  # Actual Mongo same-options no-op semantics.
            raise RuntimeError('NamespaceExistsDifferentOptions')
        self.assertion = check_exists is False
        self.metadata.append({'name': name, 'type':'collection', 'options':copy.deepcopy(options)})
        self.indexes[name] = {'_id_':{'key':[('_id',1)]}}
        self.claimed.add(name);self.ddl.append(('collection',name))
        return self[name]


class OperatorTests(unittest.IsolatedAsyncioTestCase):
    async def test_default_and_preflight_are_read_only_and_target_fixed_namespace(self):
        self.assertEqual(OP.arguments([]).operation, 'preflight')
        db = EmptyDatabase()
        result = await OP.preflight(db)
        self.assertEqual(result['state'], 'empty_namespace_metadata')
        self.assertFalse(result['writes'])
        self.assertEqual(db.ddl, [])
        self.assertEqual(db.document_reads, 0)
        self.assertEqual(OP.connection_uri({**ENV,'MONGODB_URI':'mongodb://isolated.invalid/unrelated-default'}), 'mongodb://isolated.invalid/unrelated-default')
        db.name = 'foreign'
        with self.assertRaises(OP.OperatorError): await OP.preflight(db)
        self.assertEqual(db.ddl, [])

    async def test_plan_matches_declared_schema_and_index_contract(self):
        documented = json.loads((ROOT/'docs/deployment/services-namespace-plan-2026-10-31.json').read_text())
        self.assertEqual(set(OP.plan()['creation_order']),set(documented['collections']))
        self.assertEqual(OP.plan()['indexes'],documented['indexes'])
        self.assertEqual(OP.plan()['collection_options']['validator'],documented['collection_options']['validator'])
        self.assertEqual(OP.plan()['claim_protocol'],documented['claim_protocol'])
        self.assertEqual(OP.plan()['project_id'],documented['project_id'])
        self.assertEqual(OP.plan()['planned_namespace'],documented['planned_namespace'])

    async def test_explicit_confirmed_empty_initialization_only_creates_new_schema(self):
        db = EmptyDatabase()
        result = await OP.initialize(db, confirmed_plan_sha256=OP.plan_digest())
        self.assertEqual(result['state'],'new_schema_initialized')
        self.assertEqual(result['created_collections'],18)
        self.assertEqual(result['created_indexes'],17)
        self.assertEqual(db.ddl[0],('collection','source_manifests'))
        self.assertEqual(db.document_reads,0)
        self.assertEqual(db.writes,[])
        self.assertIsNone(await OP.check_metadata(db))
        prior = list(db.ddl)
        with self.assertRaisesRegex(OP.OperatorError,'namespace_not_empty'):
            await OP.initialize(db,confirmed_plan_sha256=OP.plan_digest())
        self.assertEqual(db.ddl,prior)
        self.assertEqual((await OP.preflight(db))['state'],'existing_schema_matches_read_only')

    async def test_missing_confirmation_foreign_and_partial_namespaces_never_mutate(self):
        db=EmptyDatabase()
        with self.assertRaises(OP.OperatorError):await OP.initialize(db,confirmed_plan_sha256=None)
        self.assertEqual(db.metadata_reads,0)
        for rows in ([{'name':'foreign','type':'collection'}], [{'name':'products','type':'collection','options':OP.COLLECTION_OPTIONS}]):
            db=EmptyDatabase();db.metadata=copy.deepcopy(rows)
            with self.assertRaisesRegex(OP.OperatorError,'namespace_not_empty'):
                await OP.initialize(db,confirmed_plan_sha256=OP.plan_digest())
            self.assertEqual(db.ddl,[]);self.assertEqual(db.document_reads,0)

    async def test_interrupted_initialization_requires_readback_and_no_retry_or_rollback(self):
        db=EmptyDatabase();db.fail_on=OP.CREATION_ORDER[2]
        result=await OP.initialize(db,confirmed_plan_sha256=OP.plan_digest())
        self.assertEqual(result['state'],'incomplete_readback_required')
        self.assertFalse(result['automatic_retry']);self.assertFalse(result['automatic_rollback'])
        self.assertEqual(result['acknowledged_collections'],2)
        previous=list(db.ddl)
        with self.assertRaises(OP.OperatorError):await OP.initialize(db,confirmed_plan_sha256=OP.plan_digest())
        self.assertEqual(db.ddl,previous);self.assertEqual(db.writes,[])

    async def test_mongo_identical_create_is_noop_but_claims_have_different_options(self):
        db=EmptyDatabase()
        one=OP.collection_options(OP.CLAIM_COLLECTION,'1'*32)
        two=OP.collection_options(OP.CLAIM_COLLECTION,'2'*32)
        await db.create_collection(OP.CLAIM_COLLECTION,check_exists=False,**one)
        before=list(db.ddl)
        await db.create_collection(OP.CLAIM_COLLECTION,check_exists=False,**one)
        self.assertEqual(db.ddl,before)
        with self.assertRaisesRegex(RuntimeError,'DifferentOptions'):
            await db.create_collection(OP.CLAIM_COLLECTION,check_exists=False,**two)
        with self.assertRaisesRegex(OP.OperatorError,'metadata_changed'):
            OP.validate_created(db.metadata,[OP.CLAIM_COLLECTION],'2'*32)

    async def test_two_initializers_cannot_both_claim_the_namespace(self):
        db=EmptyDatabase()
        results=await asyncio.gather(*(OP.initialize(db,confirmed_plan_sha256=OP.plan_digest()) for _ in range(2)),return_exceptions=True)
        self.assertEqual(sum(isinstance(r,dict) and r['state']=='new_schema_initialized' for r in results),1)
        self.assertEqual(sum(item==('collection','source_manifests') for item in db.ddl),1)
        self.assertEqual(db.document_reads,0)

    async def test_metadata_bound_and_changed_created_collection_stop(self):
        db=EmptyDatabase();db.metadata=[{'name':str(n)} for n in range(102)]
        with self.assertRaisesRegex(OP.OperatorError,'metadata_limit'):await OP.preflight(db)
        with self.assertRaisesRegex(OP.OperatorError,'concurrent_namespace_change'):
            OP.validate_created([{'name':'foreign'}],[],'0'*32)
        with self.assertRaisesRegex(OP.OperatorError,'metadata_changed'):
            OP.validate_created([{'name':'products','type':'collection','options':{}}],['products'],'0'*32)

    async def test_existing_runtime_environment_used_without_uri_argument_or_default_db(self):
        db=EmptyDatabase();seen=[]
        class Client:
            def get_database(self,name,**kwargs):seen.append(name);return db
            def close(self):seen.append('closed')
        def client(uri,**kwargs):seen.append('factory');return Client()
        result=await OP.operate(ENV,OP.arguments([]),client_factory=client)
        self.assertEqual(result['state'],'empty_namespace_metadata')
        self.assertEqual(seen,['factory',OP.PLANNED_NAMESPACE,'closed'])
        seen.clear()
        with self.assertRaises(OP.OperatorError):await OP.operate(ENV,OP.arguments(['init']),client_factory=client)
        self.assertEqual(seen,[])


class OutputTests(unittest.TestCase):
    def test_plan_render_has_no_environment_or_database_access(self):
        with patch.object(OP,'operate',side_effect=AssertionError('must not connect')),contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(OP.main(['plan']),0)
        self.assertEqual(json.loads(output.getvalue())['plan_sha256'],OP.plan_digest())

    def test_cli_never_echoes_uri_driver_exception_or_unknown_arguments(self):
        async def fail(*a,**kw):raise RuntimeError('mongodb://SECRET_SENTINEL')
        for args in (['--uri','mongodb://SECRET_SENTINEL'],['preflight']):
            with patch.object(OP,'operate',fail),contextlib.redirect_stdout(io.StringIO()) as output:
                self.assertEqual(OP.main(args),1)
            self.assertNotIn('SECRET_SENTINEL',output.getvalue())
            self.assertNotIn('mongodb',output.getvalue())
            self.assertIn(json.loads(output.getvalue())['state'],('blocked','unconfirmed_readback_required'))

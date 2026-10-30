"""Explicit local-only quota/storage and read-only staging projection.

Not a production identity, supplier authority, commercial release or migration.
"""
import hashlib
import hmac
import tempfile
import json
import os
import re
import stat
import time

class LocalBigBuyError(ValueError): pass

def check(ok, code):
    if not ok: raise LocalBigBuyError(code)

def ident(value):
    check(isinstance(value, str) and re.fullmatch(r'[A-Za-z0-9_-]{1,100}',value), 'invalid_scope')
    return value

class LocalBigBuyStore:
    """Opt-in local SQLite tables in existing Store; never initialized automatically."""
    def __init__(self, store, *, account, environment, initialize=False, clock=time.time):
        self.store, self.account, self.environment, self.clock = store, ident(account), environment, clock
        check(environment == 'sandbox' and callable(clock), 'local_sandbox_only')
        self._private_path()
        if initialize is True:
            with store.connect() as db:
                db.executescript('''CREATE TABLE IF NOT EXISTS bigbuy_quota_local(account TEXT NOT NULL,environment TEXT NOT NULL,resource TEXT NOT NULL,claimed_at INTEGER NOT NULL);
                  CREATE INDEX IF NOT EXISTS bigbuy_quota_local_lookup ON bigbuy_quota_local(account,environment,resource,claimed_at);
                  CREATE TABLE IF NOT EXISTS bigbuy_raw_local(account TEXT NOT NULL,environment TEXT NOT NULL,sha256 TEXT NOT NULL,body BLOB NOT NULL,PRIMARY KEY(account,environment,sha256));''')
        else: check(initialize is False, 'invalid_initialization')
    def _private_path(self):
        path=os.path.abspath(self.store.path); parent=os.path.dirname(path)
        check(os.path.dirname(parent)==os.path.realpath(tempfile.gettempdir())
              and os.path.basename(parent).startswith('nexify-bigbuy-isolated-'), 'isolated_test_store_required')
        check(os.path.realpath(path)==path and os.path.realpath(parent)==parent, 'unsafe_store_path')
        for candidate, expected in ((path,stat.S_ISREG),(parent,stat.S_ISDIR)):
            info=os.stat(candidate,follow_symlinks=False)
            check(expected(info.st_mode) and info.st_uid==os.geteuid() and not info.st_mode & 0o077
                  and (candidate != path or info.st_nlink==1), 'store_permissions')
    def claim(self, environment, resource):
        check(environment==self.environment and resource in ('products','variations','stock'), 'invalid_scope')
        now=self.clock();check(type(now) in (int,float) and 0<=now<2**53, 'invalid_clock');now=int(now)
        self._private_path()
        with self.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            last=db.execute('SELECT MAX(claimed_at) FROM bigbuy_quota_local WHERE account=? AND environment=? AND resource=?',(self.account,environment,resource)).fetchone()[0]
            check(last is None or now>=last, 'clock_moved_backwards')
            count=db.execute('SELECT COUNT(*) FROM bigbuy_quota_local WHERE account=? AND environment=? AND resource=? AND claimed_at>?',(self.account,environment,resource,now-3600)).fetchone()[0]
            # Conservative 10/hour cap, never wider than selected public resource limits.
            if count>=10:return False
            check(db.execute('SELECT COUNT(*) FROM bigbuy_quota_local').fetchone()[0]<100000, 'quota_storage_limit')
            db.execute('INSERT INTO bigbuy_quota_local VALUES (?,?,?,?)',(self.account,environment,resource,now))
            return True
    def fetch_page(self, read_page, config, *, resource, page, page_size, max_bytes, timeout_seconds, transport, now_utc):
        """Bind the same explicit local account/environment to quota, store and manifest."""
        check(callable(read_page) and getattr(config,'environment',None)==self.environment, 'invalid_scope')
        return read_page(config, resource=resource, page=page, page_size=page_size, max_bytes=max_bytes,
                         timeout_seconds=timeout_seconds, quota_claim=self.claim, store=self, scope=self.account,
                         transport=transport, now_utc=now_utc)

    def put(self, sha, raw):
        self._private_path()
        check(isinstance(sha,str) and re.fullmatch(r'[a-f0-9]{64}',sha) and type(raw) is bytes
              and len(raw)<=2*1024*1024 and hashlib.sha256(raw).hexdigest()==sha,'invalid_artifact')
        with self.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row=db.execute('SELECT body FROM bigbuy_raw_local WHERE account=? AND environment=? AND sha256=?',(self.account,self.environment,sha)).fetchone()
            if row is not None:
                check(bytes(row[0])==raw, 'immutable_artifact_conflict');return
            count, total=db.execute('SELECT COUNT(*),COALESCE(SUM(LENGTH(body)),0) FROM bigbuy_raw_local').fetchone()
            check(count<1000 and total+len(raw)<=16*1024*1024, 'artifact_store_limit')
            db.execute('INSERT INTO bigbuy_raw_local VALUES (?,?,?,?)',(self.account,self.environment,sha,raw))
    def get(self,sha,limit):
        self._private_path()
        check(isinstance(sha,str) and re.fullmatch(r'[a-f0-9]{64}',sha) and type(limit) is int and limit>0,'invalid_artifact')
        with self.store.connect() as db:
            row=db.execute('SELECT body FROM bigbuy_raw_local WHERE account=? AND environment=? AND sha256=?',(self.account,self.environment,sha)).fetchone()
        check(row is not None and len(row[0])<=limit,'artifact_not_available')
        raw=bytes(row[0]);check(hashlib.sha256(raw).hexdigest()==sha,'artifact_hash_mismatch');return raw

class LocalStagedCatalog:
    """Only local, rights-unknown SKU projection; no sale or inferred product facts."""
    cart=None
    local_private=True
    def __init__(self, staged, *, store_id, access_token):
        self.store_id=ident(store_id)
        check(isinstance(access_token,str) and re.fullmatch(r'[A-Za-z0-9_-]{32,128}',access_token), 'invalid_access_token')
        self.__access_token=access_token
        check(isinstance(staged,dict) and staged.get('schema')=='nexify.bigbuy.offline-staging/2'
              and staged.get('saleEnabled') is False and staged.get('releasedProductIds')==[]
              and all(staged.get(k) is None for k in ('currency','tax','rights','fitment'))
              and staged.get('freshness_approved') is False, 'unsupported_staging')
        raw=staged.get('manifest_bytes'); check(type(raw) is bytes and hashlib.sha256(raw).hexdigest()==staged.get('manifest_sha256'),'manifest_mismatch')
        try: manifest=json.loads(raw)
        except (ValueError,UnicodeError): raise LocalBigBuyError('invalid_manifest') from None
        check(manifest.get('schema')==staged['schema'] and manifest.get('raw_to_records_verified') is True
              and manifest.get('complete_verified') is False, 'unverified_staging')
        records={'products':staged['products'],'variants':staged['variants'],'stocks':staged['stock_buckets']}
        encoded=json.dumps(records,sort_keys=True,ensure_ascii=False,separators=(',', ':'),allow_nan=False).encode()
        check(hashlib.sha256(encoded).hexdigest()==manifest.get('records_sha256'),'records_mismatch')
        self.hash=staged['manifest_sha256'];self.observed_at=manifest['observed_at']
        self.rows=[]
        for row in records['products']+records['variants']:
            check(isinstance(row,dict) and isinstance(row.get('sku'),str) and re.fullmatch(r'[A-Za-z0-9_-]{1,128}',row['sku']), 'invalid_sku')
            # SKU is a source identifier, not a description, fitment, stock or offer.
            self.rows.append({'product_id':row['sku'],'sku':row['sku'],'name':row['sku'],'ean':row['ean'],
                              'category_id':'','stock':None,'source_price':None,'buyable':False,
                              'availability_status':'not_verified','fitment_status':'not_verified','freshness_status':'not_verified'})
    def authorize(self, token):
        return isinstance(token,str) and token.isascii() and hmac.compare_digest(token,self.__access_token)
    def catalog(self, *, query='', category='', locale='de'):
        check(locale in ('de','nl','fr') and isinstance(query,str) and len(query)<=128 and isinstance(category,str) and len(category)<=128,'invalid_query')
        rows=[r for r in self.rows if not category and (not query or query.casefold() in r['sku'].casefold())]
        return {'available':True,'mode':'read_only','store_id':self.store_id,'currency':None,'maximum_quantity':0,
                'checkout_enabled':False,'production_accepted':False,'saleEnabled':False,'releasedProductIds':[],
                'rights':None,'tax':None,'fitment':None,'freshness_approved':False,'source_reference':'Quelle nicht unabhängig bestätigt (lokaler Prüfausschnitt)',
                'source_sha256':self.hash,'observed_at':self.observed_at,'freshness_status':'not_verified','partial':True,
                'pagination':{'status':'partial_unverified_continuation','reported_total':None,'snapshot_rows':len(self.rows),
                              'matching_snapshot_rows':len(rows)},'categories':[],'products':json.loads(json.dumps(rows))}

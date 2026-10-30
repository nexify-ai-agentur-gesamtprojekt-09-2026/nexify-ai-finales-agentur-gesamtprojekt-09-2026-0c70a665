"""Bounded, explicitly invoked BigBuy GET preparation; no route or scheduler.

No implicit configuration, downloads, retries, order, shipping or payment calls.
Caller must provide an atomic quota claim, immutable store with readback and the
existing stage_raw_streams callable. Fake transport/store supported for offline tests.
"""
import hashlib
import io
import json
from datetime import datetime, timezone
import math
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field

HOSTS = {'sandbox': 'https://api.sandbox.bigbuy.eu', 'production': 'https://api.bigbuy.eu'}
PATHS = {'products': '/rest/catalog/products.json',
         'variations': '/rest/catalog/productsvariations.json',
         'stock': '/rest/catalog/productsstockbyhandlingdays.json'}

class BigBuyReadError(ValueError):
    pass

def check(condition, code):
    if not condition: raise BigBuyReadError(code)

@dataclass(frozen=True)
class ReadConfig:
    environment: str
    api_key: str = field(repr=False)
    def __post_init__(self):
        check(self.environment in HOSTS, 'invalid_environment')
        check(isinstance(self.api_key, str) and 1 <= len(self.api_key) <= 4096
              and not any(ord(ch) <= 32 or ord(ch) == 127 for ch in self.api_key), 'invalid_server_key')

def config_from_env(env):
    """Only explicit server-side mapping; never log or return the key as text."""
    return ReadConfig(environment=env.get('BIGBUY_API_ENV'), api_key=env.get('BIGBUY_API_KEY'))

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise BigBuyReadError('redirect_rejected')

def default_transport(request, timeout):
    return urllib.request.build_opener(NoRedirect()).open(request, timeout=timeout)

def read_page(config, *, resource, page, page_size, max_bytes, timeout_seconds,
              quota_claim, store, scope, transport=default_transport, clock=time.monotonic, now_utc=None):
    """One request only; caller's quota_claim must atomically reserve a shared slot.

    store.put(sha256, bytes) and store.get(sha256, max_bytes) must persist the
    bytes immutably and safely. Exact readback is required; a fake store only
    demonstrates this interface. No assertion of actual provider permissions.
    """
    check(isinstance(config, ReadConfig), 'config_required')
    check(resource in PATHS, 'resource_not_allowed')
    check(type(page) is int and 0 <= page <= 10000 and type(page_size) is int and 1 <= page_size <= 1000, 'invalid_page')
    check(type(max_bytes) is int and 1 <= max_bytes <= 2 * 1024 * 1024, 'invalid_byte_limit')
    check(type(timeout_seconds) in (int, float) and math.isfinite(timeout_seconds) and 0 < timeout_seconds <= 30, 'invalid_timeout')
    check(callable(quota_claim) and callable(getattr(store, 'put', None)) and callable(getattr(store, 'get', None)), 'explicit_dependencies_required')
    check(callable(transport) and callable(clock), 'invalid_dependency')
    check(isinstance(scope, str) and 0 < len(scope) <= 128, 'invalid_scope')
    # Claim is required to be shared and atomic; this module cannot verify its implementation.
    try: allowed = quota_claim(config.environment, resource)
    except Exception: raise BigBuyReadError('quota_claim_unavailable') from None
    check(allowed is True, 'quota_not_reserved')
    url = HOSTS[config.environment] + PATHS[resource] + '?' + urllib.parse.urlencode({'page': page, 'pageSize': page_size})
    request = urllib.request.Request(url, method='GET', headers={'Authorization':'Bearer ' + config.api_key, 'Accept':'application/json'})
    started = clock()
    try:
        with transport(request, timeout_seconds) as response:
            check(response.geturl() == url, 'response_url_mismatch')
            check(response.status == 200, 'unexpected_http_status')
            check(response.headers.get_content_type() == 'application/json', 'unexpected_content_type')
            chunks, total = [], 0
            while True:
                remaining = timeout_seconds - (clock() - started)
                check(remaining > 0, 'deadline_exceeded')
                sock = getattr(getattr(getattr(response, 'fp', None), 'raw', None), '_sock', None)
                if isinstance(sock, socket.socket): sock.settimeout(remaining)
                chunk = getattr(response, 'read1', response.read)(min(65536, max_bytes + 1 - total))
                check(clock() - started <= timeout_seconds, 'deadline_exceeded')
                check(type(chunk) is bytes, 'invalid_response_body')
                if not chunk: break
                total += len(chunk)
                check(total <= max_bytes, 'byte_limit')
                chunks.append(chunk)
    except urllib.error.HTTPError as error:
        if error.code in (401, 403): raise BigBuyReadError('access_denied') from None
        if error.code == 409: raise BigBuyReadError('provider_cache_unavailable') from None
        if error.code == 429: raise BigBuyReadError('rate_limited') from None
        if 300 <= error.code < 400: raise BigBuyReadError('redirect_rejected') from None
        raise BigBuyReadError('provider_http_error') from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise BigBuyReadError('transport_unavailable') from None
    except BigBuyReadError:
        raise
    except Exception:
        raise BigBuyReadError('transport_failure') from None
    raw = b''.join(chunks)
    sha = hashlib.sha256(raw).hexdigest()
    try:
        store.put(sha, raw)
        recovered = store.get(sha, max_bytes)
    except Exception: raise BigBuyReadError('artifact_store_unavailable') from None
    check(type(recovered) is bytes and recovered == raw and hashlib.sha256(recovered).hexdigest() == sha, 'artifact_readback_mismatch')
    observed = (now_utc or (lambda: datetime.now(timezone.utc)))()
    check(isinstance(observed, datetime) and observed.tzinfo is not None and observed.utcoffset() is not None, 'invalid_observation_time')
    manifest = {'schema':'nexify.bigbuy.acquisition/1', 'resource':resource, 'page':page, 'page_size':page_size,
                'status':200, 'raw_sha256':sha, 'bytes':len(raw), 'environment':config.environment,
                'scope':scope, 'observed_at':observed.isoformat(), 'transport_and_supplier_identity_verified':False}
    payload = json.dumps(manifest, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
    manifest_sha = hashlib.sha256(payload).hexdigest()
    try:
        store.put(manifest_sha, payload)
        check(store.get(manifest_sha, len(payload)) == payload, 'manifest_readback_mismatch')
    except BigBuyReadError: raise
    except Exception: raise BigBuyReadError('artifact_store_unavailable') from None
    return {'manifest_sha256':manifest_sha}

def stage_saved(*, receipts, store, stage_raw_streams, scope, now, max_age_seconds, max_raw_bytes):
    """Read persisted acquisition manifests and bytes; derive timestamps and metadata from them."""
    check(isinstance(receipts, list) and 0 < len(receipts) <= 3, 'invalid_receipts')
    check(callable(stage_raw_streams) and callable(getattr(store, 'get', None)), 'explicit_dependencies_required')
    check(type(max_raw_bytes) is int and 1 <= max_raw_bytes <= 6 * 1024 * 1024, 'invalid_byte_limit')
    check(isinstance(scope, str) and 0 < len(scope) <= 128, 'invalid_scope')
    check(type(max_age_seconds) is int and max_age_seconds > 0, 'invalid_age_limit')
    try:
        now_dt = datetime.fromisoformat(now.replace('Z', '+00:00'))
        check(now_dt.tzinfo is not None and now_dt.utcoffset() is not None, 'invalid_observation_time')
    except (AttributeError, TypeError, ValueError): raise BigBuyReadError('invalid_observation_time') from None
    pages, remaining, environment, timestamps = [], max_raw_bytes, None, []
    for receipt in receipts:
        check(isinstance(receipt, dict) and set(receipt) == {'manifest_sha256'}, 'invalid_receipt')
        manifest_sha = receipt['manifest_sha256']
        check(isinstance(manifest_sha, str) and len(manifest_sha) == 64 and all(c in '0123456789abcdef' for c in manifest_sha), 'invalid_receipt')
        try: payload = store.get(manifest_sha, 4096)
        except Exception: raise BigBuyReadError('artifact_store_unavailable') from None
        check(type(payload) is bytes and len(payload) <= 4096 and hashlib.sha256(payload).hexdigest() == manifest_sha, 'manifest_readback_mismatch')
        try: manifest = json.loads(payload)
        except (ValueError, UnicodeError, RecursionError): raise BigBuyReadError('invalid_manifest') from None
        check(isinstance(manifest, dict) and set(manifest) == {'schema','resource','page','page_size','status','raw_sha256','bytes','environment','scope','observed_at','transport_and_supplier_identity_verified'}, 'invalid_manifest')
        check(manifest['schema']=='nexify.bigbuy.acquisition/1' and manifest['resource'] in PATHS and manifest['environment'] in HOSTS
              and manifest['status']==200 and manifest['scope']==scope and manifest['transport_and_supplier_identity_verified'] is False, 'invalid_manifest')
        if environment is None: environment = manifest['environment']
        check(manifest['environment'] == environment, 'mixed_environments')
        try:
            observed = datetime.fromisoformat(manifest['observed_at'])
            check(observed.tzinfo is not None and observed.utcoffset() is not None, 'invalid_observation_time')
            age = (now_dt - observed).total_seconds()
            check(0 <= age <= max_age_seconds, 'stale_or_future_snapshot')
            timestamps.append(observed)
        except BigBuyReadError: raise
        except (TypeError, ValueError): raise BigBuyReadError('invalid_observation_time') from None
        sha, size = manifest['raw_sha256'], manifest['bytes']
        check(isinstance(sha, str) and len(sha) == 64 and all(c in '0123456789abcdef' for c in sha)
              and type(size) is int and 0 <= size <= remaining, 'invalid_manifest')
        try: raw = store.get(sha, remaining)
        except Exception: raise BigBuyReadError('artifact_store_unavailable') from None
        check(type(raw) is bytes and len(raw) == size and hashlib.sha256(raw).hexdigest() == sha, 'artifact_readback_mismatch')
        remaining -= len(raw)
        pages.append({'resource': manifest['resource'], 'page': manifest['page'], 'page_size': manifest['page_size'],
                      'status':200, 'stream':io.BytesIO(raw)})
    staged = stage_raw_streams(scope=scope, observed_at=min(timestamps).isoformat(), now=now, max_age_seconds=max_age_seconds,
        requested_coverage='sample', raw_pages=pages, max_raw_bytes=max_raw_bytes)
    manifest = json.loads(staged['manifest_bytes'])
    manifest['acquisition_manifest_sha256'] = [r['manifest_sha256'] for r in receipts]
    manifest['acquisition_environment'] = environment
    manifest['transport_and_supplier_identity_verified'] = False
    staged['manifest_bytes'] = json.dumps(manifest, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
    staged['manifest_sha256'] = hashlib.sha256(staged['manifest_bytes']).hexdigest()
    return staged

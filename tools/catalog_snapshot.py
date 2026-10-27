"""One bounded credential-free GET from the existing public catalog; no sync loop."""
import argparse
import datetime as dt
import hashlib
import json
import math
import os
import secrets
import socket
import importlib.util
from pathlib import Path
import time
import urllib.error
import urllib.request

SOURCE = 'https://teileklar.shop/api/shop/products'


class SnapshotError(ValueError):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise SnapshotError('catalog_redirect_rejected')


def fetch_snapshot(*, maximum_rows, maximum_bytes, timeout_seconds, opener=None):
    if (type(maximum_rows) is not int or maximum_rows <= 0 or type(maximum_bytes) is not int
            or maximum_bytes <= 0 or type(timeout_seconds) not in (int, float)
            or not math.isfinite(timeout_seconds) or timeout_seconds <= 0):
        raise SnapshotError('explicit_fetch_budgets_required')
    request = urllib.request.Request(SOURCE + '?limit=' + str(maximum_rows),
        headers={'Accept': 'application/json', 'User-Agent': 'NeXify-scoped-read-only-catalog'})
    opener = opener or urllib.request.build_opener(NoRedirect())
    began = time.monotonic()
    try:
        with opener.open(request, timeout=timeout_seconds) as response:
            if response.status != 200 or response.headers.get_content_type() != 'application/json':
                raise SnapshotError('unexpected_catalog_response')
            body = bytearray()
            while True:
                if time.monotonic() - began > timeout_seconds:
                    raise SnapshotError('catalog_read_deadline')
                remaining = timeout_seconds - (time.monotonic() - began)
                if remaining <= 0: raise SnapshotError('catalog_read_deadline')
                sock = getattr(getattr(getattr(response, 'fp', None), 'raw', None), '_sock', None)
                if isinstance(sock, socket.socket): sock.settimeout(remaining)
                chunk = getattr(response, 'read1', response.read)(min(65536, maximum_bytes + 1 - len(body)))
                if time.monotonic() - began > timeout_seconds: raise SnapshotError('catalog_read_deadline')
                if not chunk:
                    break
                body.extend(chunk)
                if len(body) > maximum_bytes:
                    raise SnapshotError('catalog_read_byte_limit')
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403):
            raise SnapshotError('catalog_access_denied_stop') from None
        if exc.code == 429:
            raise SnapshotError('catalog_rate_limited_no_automatic_retry') from None
        raise SnapshotError('catalog_http_failure_no_automatic_retry') from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise SnapshotError('catalog_unavailable_no_automatic_retry') from None
    raw = bytes(body)
    # Shape/full product validation is mandatory in the bound adapter before serving.
    try:
        value = json.loads(raw)
    except (ValueError, UnicodeError, RecursionError):
        raise SnapshotError('catalog_invalid_response_json') from None
    if (not isinstance(value, dict) or set(value) != {'items','total'}
            or not isinstance(value['items'], list) or len(value['items']) > maximum_rows
            or type(value['total']) is not int or value['total'] < len(value['items'])):
        raise SnapshotError('catalog_response_bounds_or_schema')
    sha = hashlib.sha256(raw).hexdigest()
    manifest = {'schema_version': 1, 'source_url': SOURCE,
                'observed_at': dt.datetime.now(dt.timezone.utc).isoformat(),
                'raw_sha256': sha, 'raw_file': 'raw-'+sha+'.json', 'bytes': len(raw),
                'requested_limit': maximum_rows, 'returned_rows': len(value['items']),
                'reported_total': value['total'], 'pagination_status': 'partial_unverified_continuation',
                'supplier_updated_at': None, 'freshness_status': 'not_verified',
                'network_attempts': 1, 'orders_started': False, 'payments_started': False}
    return raw, manifest


def save_snapshot(directory, raw, manifest):
    """Reuse the adapter's no-follow directory/regular-file boundary."""
    module_path = Path(__file__).resolve().parents[1] / 'apps/agent-gateway/catalog.py'
    spec = importlib.util.spec_from_file_location('_nexify_catalog_artifacts', module_path)
    catalog = importlib.util.module_from_spec(spec); spec.loader.exec_module(catalog)
    expected = hashlib.sha256(raw).hexdigest()
    if manifest.get('raw_sha256') != expected or manifest.get('raw_file') != 'raw-'+expected+'.json':
        raise SnapshotError('snapshot_manifest_binding')
    payload = json.dumps(manifest, sort_keys=True, separators=(',', ':')).encode()
    name = 'snapshot-' + hashlib.sha256(payload).hexdigest() + '.json'
    fd = catalog.artifact_directory_fd(directory, create=True)
    try:
        def put(filename, content):
            try:
                existing = catalog.read_artifact(fd, filename, len(content))
            except FileNotFoundError:
                existing = None
            if existing is not None:
                if existing != content: raise SnapshotError('immutable_snapshot_conflict')
                return
            tmp = '.snapshot-'+secrets.token_hex(16)
            file_fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=fd)
            try:
                with os.fdopen(file_fd, 'wb') as stream:
                    stream.write(content); stream.flush(); os.fsync(stream.fileno())
                try:
                    os.link(tmp, filename, src_dir_fd=fd, dst_dir_fd=fd, follow_symlinks=False)
                except FileExistsError:
                    if catalog.read_artifact(fd, filename, len(content)) != content:
                        raise SnapshotError('immutable_snapshot_conflict') from None
            finally:
                os.unlink(tmp, dir_fd=fd)
            os.fsync(fd)
        put(manifest['raw_file'], raw)
        put(name, payload)
    finally:
        os.close(fd)
    return Path(directory) / name


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--maximum-rows', type=int, required=True)
    parser.add_argument('--maximum-bytes', type=int, required=True)
    parser.add_argument('--timeout-seconds', type=float, required=True)
    args = parser.parse_args()
    raw, manifest = fetch_snapshot(maximum_rows=args.maximum_rows, maximum_bytes=args.maximum_bytes,
                                   timeout_seconds=args.timeout_seconds)
    path = save_snapshot(args.output, raw, manifest)
    print(json.dumps({'manifest': str(path), 'sha256': manifest['raw_sha256'],
                      'rows': manifest['returned_rows'], 'partial': True, 'commercial_accepted': False}))


if __name__ == '__main__':
    main()

"""Explicit read-only snapshot adapter for the existing public TEILEKLAR API.

No cart, seller-price authority, supplier-auth or full-sync claim is created.
"""
import datetime as dt
from decimal import Decimal, InvalidOperation
import hashlib
import json
import os
import stat
import re
from urllib.parse import urlsplit, parse_qs

SOURCE = 'https://teileklar.shop/api/shop/products'


class CatalogRejected(ValueError):
    def __init__(self, code):
        self.status, self.code = 422, code
        super().__init__(code)


def require(condition, code):
    if not condition:
        raise CatalogRejected(code)


def clean(value, maximum, optional=False):
    require(isinstance(value, str) and len(value) <= maximum, 'invalid_catalog_text')
    require(not any(ord(c) < 32 for c in value), 'catalog_control_character')
    require(optional or value.strip(), 'empty_catalog_text')
    return value.strip()


def image_reference(value, maximum):
    """Inventory only. Proxy references never become an approved product image."""
    if not value:
        return {'status': 'missing', 'source_url': None}
    value = clean(value, maximum)
    parsed = urlsplit(value)
    require(not parsed.scheme and not parsed.netloc and not parsed.fragment
            and parsed.path == '/api/shop/image', 'unapproved_image_reference')
    args = parse_qs(parsed.query, strict_parsing=True)
    require(set(args) == {'src'} and len(args['src']) == 1, 'unapproved_image_reference')
    source = urlsplit(args['src'][0])
    require(source.scheme == 'https' and source.hostname == 'cdnbigbuy.com'
            and not source.username and not source.password and not source.port
            and not source.query and not source.fragment, 'unapproved_image_origin')
    return {'status': 'association_not_verified', 'source_url': args['src'][0]}


class ReadOnlyCatalog:
    cart = None

    def __init__(self, raw, *, tenant, project, store_id, observed_at,
                 max_bytes, max_rows, max_text, max_price_minor, now=None):
        for value in (tenant, project, store_id):
            require(isinstance(value, str) and re.fullmatch(r'[A-Za-z0-9_-]{1,100}', value), 'explicit_catalog_scope_required')
        require(all(type(v) is int and v > 0 for v in (max_bytes, max_rows, max_text, max_price_minor)), 'explicit_catalog_limits_required')
        require(isinstance(raw, bytes) and len(raw) <= max_bytes, 'catalog_byte_limit')
        require(isinstance(observed_at, str), 'catalog_observed_at_required')
        try:
            observed = dt.datetime.fromisoformat(observed_at)
            require(observed.tzinfo is not None and observed.utcoffset() is not None, 'catalog_time_zone_required')
            current = now or dt.datetime.now(dt.timezone.utc)
            require(observed <= current, 'catalog_future_observation')
        except (ValueError, TypeError):
            raise CatalogRejected('invalid_catalog_observation_time') from None

        def unique(pairs):
            out = {}
            for key, value in pairs:
                require(key not in out, 'duplicate_catalog_json_key')
                out[key] = value
            return out
        try:
            data = json.loads(raw, object_pairs_hook=unique, parse_float=Decimal,
                              parse_constant=lambda _: require(False, 'nonfinite_catalog_value'))
        except (ValueError, UnicodeError, RecursionError):
            raise CatalogRejected('invalid_catalog_json') from None
        require(isinstance(data, dict) and set(data) == {'items', 'total'}, 'catalog_response_schema')
        require(type(data['total']) is int and data['total'] >= 0, 'catalog_total_type')
        require(isinstance(data['items'], list) and len(data['items']) <= max_rows
                and len(data['items']) <= data['total'], 'catalog_row_limit_or_total')
        self.tenant, self.project, self.store_id = tenant, project, store_id
        self.observed_at, self.maximum = observed.isoformat(), max_rows
        self.sha256 = hashlib.sha256(raw).hexdigest()
        self.reported_total = data['total']
        self.rows, ids, skus = [], set(), set()
        for row in data['items']:
            require(isinstance(row, dict), 'catalog_product_object_required')
            identifier, sku = clean(row.get('id'), 128), clean(row.get('sku'), 128)
            require(identifier not in ids and sku not in skus, 'duplicate_catalog_identity')
            ids.add(identifier); skus.add(sku)
            ean = row.get('ean')
            require(isinstance(ean, str) and ean.isascii() and ean.isdigit() and 1 <= len(ean) <= 14, 'catalog_ean_string_required')
            require(type(row.get('stock')) is int and row['stock'] >= 0, 'catalog_stock_unknown_or_invalid')
            name, category = clean(row.get('name'), max_text), clean(row.get('category'), max_text)
            source = clean(row.get('source'), max_text)
            require(source == 'BigBuy' and row.get('status') == 'catalog', 'unreviewed_catalog_source_or_status')
            price = clean(row.get('price'), 80)
            match = re.fullmatch(r'([0-9]+[.,][0-9]{2})\s*€', price)
            require(match is not None, 'ambiguous_catalog_price_unit')
            try:
                value = row.get('value')
                require(type(value) in (int, Decimal), 'catalog_numeric_price_required')
                major = Decimal(value)
                require(major.is_finite() and major >= 0 and major * 100 == (major * 100).to_integral_value(), 'catalog_price_precision')
                require(major == Decimal(match[1].replace(',', '.')), 'catalog_price_value_mismatch')
                minor = int(major * 100)
                require(minor <= max_price_minor, 'catalog_price_limit')
            except (InvalidOperation, OverflowError, ValueError):
                raise CatalogRejected('catalog_price_invalid') from None
            evidence = clean(row.get('evidence'), max_text, optional=True)
            created = clean(row.get('created_at'), max_text)
            image = image_reference(row.get('image'), max_bytes)
            # Supplier prose remains inert text; no HTML, prompt or executable import.
            require('<' not in name + category, 'catalog_html_not_allowed')
            category_id = hashlib.sha256(category.encode()).hexdigest()[:16]
            self.rows.append({'product_id': identifier, 'sku': sku, 'ean': ean, 'name': name,
                              'category_id': category_id, 'category_name': category,
                              'stock': row['stock'], 'availability_status': 'not_verified',
                              'fitment_status': 'not_verified', 'buyable': False,
                              'source_price': {'minor': minor, 'currency': 'EUR', 'tax_basis': 'not_verified',
                                               'shipping': 'not_verified', 'commercial_approval': False},
                              'image': image, 'source_locale': 'de', 'source_label': source,
                              'provenance_status': 'reported_not_verified' if evidence else 'missing',
                              'source_created_at': created, 'supplier_updated_at': None,
                              'freshness_status': 'not_verified',
                              'text_facts': {'title': name, 'meta_draft': name,
                                             'fact_ids': [self.sha256 + ':' + identifier + ':name'],
                                             'claim_review': 'required'}})

    def catalog(self, *, query='', category='', locale='de'):
        require(locale in {'de', 'nl', 'fr'}, 'invalid_catalog_locale')
        clean(query, 128, optional=True); clean(category, 128, optional=True)
        selected = [r for r in self.rows if (not category or category == r['category_id'])
                    and (not query or query.casefold() in (r['name']+' '+r['sku']+' '+r['ean']).casefold())]
        categories = {r['category_id']: r['category_name'] for r in self.rows}
        return {'available': True, 'mode': 'read_only', 'store_id': self.store_id,
                'currency': 'EUR', 'maximum_quantity': 0, 'checkout_enabled': False,
                'production_accepted': False, 'source_reference': SOURCE,
                'source_sha256': self.sha256, 'observed_at': self.observed_at,
                'supplier_updated_at': None, 'freshness_status': 'not_verified',
                'partial': True, 'pagination': {'status': 'partial_unverified_continuation',
                    'reported_total': self.reported_total, 'snapshot_rows': len(self.rows),
                    'matching_snapshot_rows': len(selected), 'page_parameter': 'not_verified'},
                'categories': [{'id': k, 'name': v} for k,v in sorted(categories.items())],
                'products': json.loads(json.dumps(selected))}


def artifact_directory_fd(path, *, create=False):
    """Walk every ancestor without following links; caller closes the returned fd."""
    from pathlib import Path
    path = Path(path).absolute()
    require(path != Path('/') and '..' not in path.parts, 'unsafe_artifact_directory')
    fd = os.open('/', os.O_RDONLY | os.O_DIRECTORY)
    try:
        for part in path.parts[1:]:
            if create:
                try: os.mkdir(part, mode=0o700, dir_fd=fd)
                except FileExistsError: pass
            next_fd = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd); fd = next_fd
        return fd
    except BaseException:
        os.close(fd)
        raise


def read_artifact(fd, filename, maximum_bytes):
    require(isinstance(filename, str) and '/' not in filename and filename not in ('', '.', '..'), 'unsafe_artifact_filename')
    file_fd = os.open(filename, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
    with os.fdopen(file_fd, 'rb') as stream:
        info = os.fstat(stream.fileno())
        require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1 and info.st_size <= maximum_bytes,
                'artifact_type_link_or_byte_limit')
        raw = stream.read(maximum_bytes + 1)
        require(len(raw) <= maximum_bytes, 'artifact_read_byte_limit')
        return raw


def load_snapshot(path, *, maximum_bytes):
    from pathlib import Path
    path = Path(path)
    require(type(maximum_bytes) is int and maximum_bytes > 0, 'snapshot_byte_budget')
    fd = artifact_directory_fd(path.parent)
    try:
        payload = read_artifact(fd, path.name, maximum_bytes)
        require(path.name == 'snapshot-'+hashlib.sha256(payload).hexdigest()+'.json', 'snapshot_manifest_name_hash')
        manifest = json.loads(payload)
        require(isinstance(manifest, dict) and manifest.get('schema_version') == 1
                and manifest.get('source_url') == SOURCE, 'snapshot_source_binding')
        canonical = json.dumps(manifest, sort_keys=True, separators=(',', ':')).encode()
        require(canonical == payload, 'snapshot_manifest_canonical_bytes')
        sha = manifest.get('raw_sha256')
        require(isinstance(sha, str) and re.fullmatch('[a-f0-9]{64}', sha)
                and manifest.get('raw_file') == 'raw-'+sha+'.json', 'snapshot_path_binding')
        raw = read_artifact(fd, manifest['raw_file'], maximum_bytes)
        require(hashlib.sha256(raw).hexdigest() == sha and len(raw) == manifest.get('bytes'), 'snapshot_raw_hash_mismatch')
        require(manifest.get('pagination_status') == 'partial_unverified_continuation'
                and manifest.get('freshness_status') == 'not_verified', 'snapshot_unsupported_promotion')
        return raw, manifest
    finally:
        os.close(fd)

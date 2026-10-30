"""Bounded offline BigBuy preparation; no network, model, publish or queue.

The caller supplies immutable feed bytes and an explicit reviewed taxonomy set.
Results are review drafts, never an executable LocalShop price catalog.
"""
import hashlib
import json
import re
from html.parser import HTMLParser


class BatchRejected(ValueError):
    pass


def require(value, code):
    if not value:
        raise BatchRejected(code)


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode()


def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.hidden = [], []

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'iframe', 'object', 'template'):
            self.hidden.append(tag)
        elif not self.hidden:
            self.parts.append(' ')

    def handle_endtag(self, tag):
        if self.hidden:
            if tag == self.hidden[-1]:
                self.hidden.pop()
        else:
            self.parts.append(' ')

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def text(value, limit):
    require(isinstance(value, str) and len(value) <= limit, 'invalid_supplier_text')
    parser = PlainText()
    parser.feed(value)
    parser.close()
    return ' '.join(''.join(parser.parts).split())


FEEDS = ('products', 'information', 'images', 'stock', 'taxonomies')


def prepare(feeds, *, tenant, project, selected_taxonomies, max_bytes, max_rows,
            max_text, max_images):
    """Pure transformation; original bytes remain caller-owned and unchanged.

    Every input is a full local response body, not a completeness assertion about
    the remote feed. No deletion/publish decision is made, even for empty inputs.
    Budgets are explicit caller limits, not claimed supplier SLAs.
    """
    require(all(isinstance(v, str) and 0 < len(v) <= 128 for v in (tenant, project)), 'scope_required')
    require(all(type(v) is int and v > 0 for v in (max_bytes, max_rows, max_text, max_images)), 'limits_required')
    require(isinstance(selected_taxonomies, (list, tuple)) and selected_taxonomies
            and all(type(v) is int and v > 0 for v in selected_taxonomies)
            and len(set(selected_taxonomies)) == len(selected_taxonomies), 'explicit_taxonomy_selection_required')
    require(isinstance(feeds, dict) and set(feeds) == set(FEEDS), 'feed_set_required')
    require(all(isinstance(v, bytes) for v in feeds.values())
            and sum(map(len, feeds.values())) <= max_bytes, 'input_byte_limit')

    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, 'duplicate_json_key')
            result[key] = value
        return result

    parsed, hashes = {}, {}
    for name, raw in feeds.items():
        try:
            rows = json.loads(raw, object_pairs_hook=unique,
                              parse_constant=lambda _: require(False, 'nonfinite_json'))
        except (ValueError, UnicodeError, RecursionError) as exc:
            raise BatchRejected('invalid_feed_json') from exc
        require(isinstance(rows, list) and len(rows) <= max_rows, 'feed_row_limit')
        indexed = {}
        for row in rows:
            require(isinstance(row, dict) and type(row.get('id')) is int and row['id'] > 0, 'invalid_feed_row')
            require(row['id'] not in indexed, 'duplicate_product_or_taxonomy_id')
            indexed[row['id']] = row
        parsed[name], hashes[name] = indexed, hashlib.sha256(raw).hexdigest()
    require(set(selected_taxonomies) <= set(parsed['taxonomies']), 'taxonomy_not_in_source')
    policy = {'tenant': tenant, 'project': project, 'selected_taxonomies': sorted(selected_taxonomies),
              'max_bytes': max_bytes, 'max_rows': max_rows, 'max_text': max_text, 'max_images': max_images,
              'transform_version': 1}
    result = []
    for identifier, product in sorted(parsed['products'].items()):
        taxonomy = product.get('taxonomy')
        require(type(taxonomy) is int and taxonomy > 0, 'invalid_taxonomy')
        if taxonomy not in selected_taxonomies:
            continue
        info = parsed['information'].get(identifier)
        image_row = parsed['images'].get(identifier)
        stock = parsed['stock'].get(identifier)
        reasons = ['commercial_price_tax_shipping_not_approved', 'fitment_not_verified', 'publication_not_approved']
        facts, content, slots = {}, None, []
        sku, ean = product.get('sku'), product.get('ean13')
        require(isinstance(sku, str) and 0 < len(sku) <= max_text, 'invalid_sku')
        require(ean is None or (isinstance(ean, str) and ean.isascii() and ean.isdigit() and len(ean) <= 14), 'invalid_ean_string')
        if info is None:
            reasons.append('description_missing')
        else:
            require(info.get('sku') == sku and info.get('isoCode') == 'de', 'description_binding_mismatch')
            title, description = text(info.get('name'), max_text), text(info.get('description'), max_text)
            require(title and description, 'empty_description')
            # Supplier statements remain unverified source statements, not certified claims.
            facts = {'supplier_name': title, 'supplier_description': description, 'sku': sku, 'ean13': ean}
            content = {'locale': 'de', 'title': {'text': title, 'fact_ids': ['supplier_name']},
                       'description': {'text': description, 'fact_ids': ['supplier_description']},
                       'meta_description': {'text': description[:160], 'fact_ids': ['supplier_description']},
                       'alt': {'text': title, 'fact_ids': ['supplier_name']}, 'claim_review': 'required'}
        if image_row is None:
            reasons.append('images_missing')
        else:
            images = image_row.get('images')
            require(isinstance(images, list) and len(images) <= max_images, 'image_slot_limit')
            seen = set()
            for slot in images:
                require(isinstance(slot, dict) and type(slot.get('id')) is int and slot['id'] > 0
                        and slot['id'] not in seen, 'invalid_or_duplicate_image_slot')
                seen.add(slot['id'])
                url = slot.get('url')
                require(isinstance(url, str) and len(url) <= max_text, 'invalid_image_reference')
                # Reference only; no URL fetching or source-controlled filesystem path.
                slots.append({'id': slot['id'], 'source_reference': url,
                              'input_sha256': digest(slot), 'status': 'awaiting_verified_model_and_original_bytes'})
            reasons.append('image_qa_pending')
        if stock is None:
            reasons.append('stock_missing')
        else:
            require(stock.get('sku') == sku, 'stock_binding_mismatch')
            reasons.append('stock_freshness_policy_not_approved')
        text_hash = digest({'sku': sku, 'ean13': ean, 'information': info})
        image_hash = digest(image_row)
        row = {'product_id': identifier, 'sku': sku, 'ean13': ean, 'taxonomy': product['taxonomy'],
               'status': 'review_required', 'buyable': False, 'facts': facts, 'content': content,
               'image_slots': slots, 'blocking_reasons': reasons,
               'stages': {'text': {'input_sha256': text_hash, 'config_sha256': digest(policy), 'output_sha256': digest(content)},
                          'image_inventory': {'input_sha256': image_hash, 'config_sha256': digest(policy), 'output_sha256': digest(slots)},
                          'stock': {'input_sha256': digest(stock), 'config_sha256': digest(policy), 'status': 'unverified_supplier_data'}},
               'source_row_sha256': digest(product)}
        result.append(row)
    output = {'schema_version': 1, 'scope': {'tenant': tenant, 'project': project},
              'config_sha256': digest(policy), 'input_sha256': hashes, 'products': result,
              'status': 'review_draft', 'publishable': False, 'deletions': [],
              'network_calls': 0, 'model_calls': 0}
    output['output_sha256'] = digest(output)
    return output

# Offline-only staging contract. It cannot fetch, publish, release, or reserve quota.
STAGING_SCHEMA = 'nexify.bigbuy.offline-staging/2'


def staging_quota_plan(*, resource, already_used, jobs, limit, max_attempts):
    """Calculate one window's combined planned attempts; caller must coordinate atomically."""
    require(isinstance(resource, str) and resource, 'resource_required')
    require(type(already_used) is int and already_used >= 0 and type(limit) is int and limit > 0,
            'invalid_quota')
    require(type(max_attempts) is int and 1 <= max_attempts <= 3, 'invalid_attempt_limit')
    require(isinstance(jobs, list) and jobs, 'jobs_required')
    ids = set()
    attempts = 0
    for job in jobs:
        require(isinstance(job, dict) and set(job) == {'id', 'requests'}, 'invalid_job')
        require(isinstance(job['id'], str) and job['id'] and job['id'] not in ids, 'duplicate_job')
        require(type(job['requests']) is int and job['requests'] >= 0, 'invalid_job_requests')
        ids.add(job['id'])
        attempts += job['requests'] * max_attempts
    return {'resource': resource, 'planned_attempts': attempts, 'already_used': already_used,
            'limit': limit, 'allowed': already_used + attempts <= limit,
            'reservation': False, 'runtime_enforcement': False}


def _bounded_record_bytes(raw):
    require(type(raw) is bytes and len(raw) <= 16 * 1024 * 1024, 'record_byte_limit')
    return raw


def stage_readonly_pages(*, source, observed_at, now, max_age_seconds, requested_coverage,
                         pages, products, variants, stocks):
    """Validate synthetic or caller-owned records; never perform HTTP or assert remote completeness.

    pages contain resource/page/page_size/status/body_sha256/row_count observations;
    status is 200, 409, 429 or 'timeout'. 409/429/timeout stop a run without retry.
    Product, variant and stock records are supplied explicitly, not fetched here.
    """
    from datetime import datetime
    def timestamp(value):
        try:
            dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
            require(dt.tzinfo is not None and dt.utcoffset() is not None, 'timezone_required')
            return dt
        except (AttributeError, TypeError, ValueError):
            raise BatchRejected('invalid_timestamp') from None
    require(isinstance(source, dict) and set(source) == {'supplier', 'scope', 'source_sha256'}, 'invalid_source')
    require(source['supplier'] == 'BigBuy' and isinstance(source['scope'], str)
            and 0 < len(source['scope']) <= 128, 'invalid_source')
    require(isinstance(source['source_sha256'], str) and re.fullmatch(r'[a-f0-9]{64}', source['source_sha256']), 'invalid_source_hash')
    require(type(max_age_seconds) is int and max_age_seconds > 0, 'invalid_age_limit')
    age = (timestamp(now) - timestamp(observed_at)).total_seconds()
    require(0 <= age <= max_age_seconds, 'stale_or_future_snapshot')
    require(requested_coverage in ('sample', 'partial', 'complete'), 'invalid_coverage')
    require(isinstance(pages, list) and pages and len(pages) <= 10000, 'invalid_pages')
    seen_pages, seen_bodies, page_manifest = set(), set(), []
    for page in pages:
        require(isinstance(page, dict) and set(page) == {'resource', 'page', 'page_size', 'status', 'body_sha256', 'row_count'}, 'invalid_page')
        resource, number, size, status = page['resource'], page['page'], page['page_size'], page['status']
        require(isinstance(resource, str) and resource in {'products', 'variations', 'stock'}, 'invalid_resource')
        require(type(number) is int and number >= 0 and type(size) is int and 1 <= size <= 10000, 'invalid_pagination')
        require(status in (200, 409, 429, 'timeout') and type(status) in (int, str), 'invalid_status')
        require(status == 200, 'page_run_stopped')
        require(type(page['row_count']) is int and 0 <= page['row_count'] <= size, 'invalid_page_count')
        h = page['body_sha256']
        require(isinstance(h, str) and re.fullmatch(r'[a-f0-9]{64}', h), 'invalid_page_hash')
        require((resource, number) not in seen_pages, 'duplicate_page')
        require((resource, h) not in seen_bodies, 'repeated_page_body')
        seen_pages.add((resource, number)); seen_bodies.add((resource, h)); page_manifest.append(dict(page))
    require(all(isinstance(rows, list) and len(rows) <= 10000 for rows in (products, variants, stocks)), 'invalid_records')
    for resource, rows in (('products', products), ('variations', variants), ('stock', stocks)):
        counts = [p['row_count'] for p in page_manifest if p['resource'] == resource]
        require((not rows or counts) and sum(counts) == len(rows), 'page_record_count_mismatch')
    ids, skus, parent_by_variant = set(), set(), {}
    for item in products:
        require(isinstance(item, dict) and set(item) == {'id', 'sku', 'ean'}, 'invalid_product')
        require(type(item['id']) is int and 0 < item['id'] <= 10**12 and item['id'] not in ids, 'duplicate_or_invalid_product')
        require(isinstance(item['sku'], str) and 0 < len(item['sku']) <= 128 and item['sku'] not in skus, 'duplicate_or_invalid_sku')
        require(item['ean'] is None or (isinstance(item['ean'], str) and item['ean'].isascii() and item['ean'].isdigit() and len(item['ean']) <= 14), 'invalid_ean')
        ids.add(item['id']); skus.add(item['sku'])
    for item in variants:
        require(isinstance(item, dict) and set(item) == {'id', 'product_id', 'sku', 'ean'}, 'invalid_variant')
        require(type(item['id']) is int and 0 < item['id'] <= 10**12 and item['id'] not in parent_by_variant, 'duplicate_or_invalid_variant')
        require(type(item['product_id']) is int and item['product_id'] in ids, 'orphan_variant')
        require(isinstance(item['sku'], str) and 0 < len(item['sku']) <= 128 and item['sku'] not in skus, 'duplicate_or_invalid_sku')
        require(item['ean'] is None or (isinstance(item['ean'], str) and item['ean'].isascii() and item['ean'].isdigit() and len(item['ean']) <= 14), 'invalid_ean')
        parent_by_variant[item['id']] = item['product_id']; skus.add(item['sku'])
    require(all(isinstance(item, dict) and isinstance(item.get('buckets'), list) for item in stocks)
            and sum(len(item['buckets']) for item in stocks) <= 100000, 'stock_bucket_budget')
    stock_ids = set()
    for item in stocks:
        require(isinstance(item, dict) and set(item) == {'sku', 'buckets'}, 'invalid_stock')
        require(isinstance(item['sku'], str) and item['sku'] in skus and item['sku'] not in stock_ids, 'orphan_or_duplicate_stock')
        require(isinstance(item['buckets'], list) and len(item['buckets']) <= 1000, 'invalid_stock_buckets')
        for bucket in item['buckets']:
            require(isinstance(bucket, dict) and set(bucket) == {'quantity', 'min_days', 'max_days', 'warehouse'}, 'invalid_bucket')
            require(all(type(bucket[k]) is int and 0 <= bucket[k] <= 10**9 for k in ('quantity', 'min_days', 'max_days'))
                    and bucket['min_days'] <= bucket['max_days'], 'invalid_bucket')
            require(bucket['warehouse'] is None or (type(bucket['warehouse']) is int and 0 < bucket['warehouse'] <= 10**9), 'invalid_warehouse')
        stock_ids.add(item['sku'])
    record_bytes = _bounded_record_bytes(canonical({'products': products, 'variants': variants, 'stocks': stocks}))
    records_copy = json.loads(record_bytes)
    # Claiming complete cannot establish stable pagination or provider snapshot isolation.
    coverage = 'sample' if requested_coverage == 'sample' else 'partial'
    manifest = {'schema': STAGING_SCHEMA, 'source': dict(source), 'observed_at': observed_at,
                'pages': page_manifest, 'records_sha256': hashlib.sha256(record_bytes).hexdigest(),
                'coverage': coverage, 'requested_coverage': requested_coverage,
                'complete_verified': False, 'source_and_page_hashes_caller_asserted': True,
                'raw_to_records_verified': False}
    raw_manifest = canonical(manifest)
    return {'schema': STAGING_SCHEMA, 'manifest_bytes': raw_manifest, 'manifest_sha256': hashlib.sha256(raw_manifest).hexdigest(),
            'coverage': coverage, 'complete_verified': False, 'saleEnabled': False, 'releasedProductIds': [],
            'currency': None, 'tax': None, 'rights': None, 'fitment': None, 'freshness_approved': False,
            'products': records_copy['products'], 'variants': records_copy['variants'],
            'stock_buckets': records_copy['stocks']}


def stage_raw_streams(*, scope, observed_at, now, max_age_seconds, requested_coverage,
                      raw_pages, max_raw_bytes):
    """Read caller-owned streams with a hard byte budget; parse and project offline.

    Page status/identity and supplier scope are caller assertions, not authenticated
    transport. Projection covers only product, variation and stock fields.
    """
    require(type(max_raw_bytes) is int and 0 < max_raw_bytes <= 16 * 1024 * 1024, 'invalid_raw_budget')
    require(isinstance(raw_pages, list) and 0 < len(raw_pages) <= 10000, 'invalid_pages')
    remaining = max_raw_bytes
    pages, products, variants, stocks = [], [], [], []
    for item in raw_pages:
        require(isinstance(item, dict) and set(item) == {'resource', 'page', 'page_size', 'status', 'stream'}, 'invalid_raw_page')
        require(type(item['status']) is int and item['status'] == 200, 'page_run_stopped')
        require(item['resource'] in ('products', 'variations', 'stock'), 'invalid_resource')
        stream = item['stream']
        require(callable(getattr(stream, 'read', None)), 'stream_required')
        chunks, count = [], 0
        while True:
            size = min(65536, remaining + 1)
            block = stream.read(size)
            require(type(block) is bytes and len(block) <= size, 'invalid_stream')
            if not block: break
            count += len(block); remaining -= len(block)
            require(remaining >= 0, 'raw_byte_limit')
            chunks.append(block)
        raw = b''.join(chunks)
        def unique(pairs):
            result = {}
            for key, value in pairs:
                require(key not in result, 'duplicate_json_key')
                result[key] = value
            return result
        try:
            rows = json.loads(raw, object_pairs_hook=unique,
                              parse_constant=lambda _: require(False, 'nonfinite_json'))
        except (ValueError, UnicodeError, RecursionError):
            raise BatchRejected('invalid_raw_json') from None
        require(isinstance(rows, list) and len(rows) <= 10000, 'invalid_raw_rows')
        resource = item['resource']
        pages.append({'resource': resource, 'page': item['page'], 'page_size': item['page_size'],
                      'status': 200, 'body_sha256': hashlib.sha256(raw).hexdigest(), 'row_count': len(rows)})
        for row in rows:
            require(isinstance(row, dict), 'invalid_raw_row')
            if resource == 'products':
                require({'id', 'sku', 'ean13'} <= set(row), 'invalid_raw_product')
                products.append({'id': row['id'], 'sku': row['sku'], 'ean': row['ean13']})
            elif resource == 'variations':
                require({'id', 'product', 'sku', 'ean13'} <= set(row), 'invalid_raw_variant')
                variants.append({'id': row['id'], 'product_id': row['product'], 'sku': row['sku'], 'ean': row['ean13']})
            else:
                require({'sku', 'stocks'} <= set(row) and isinstance(row['stocks'], list), 'invalid_raw_stock')
                buckets = []
                for bucket in row['stocks']:
                    require(isinstance(bucket, dict) and {'quantity', 'minHandlingDays', 'maxHandlingDays'} <= set(bucket), 'invalid_raw_bucket')
                    buckets.append({'quantity': bucket['quantity'], 'min_days': bucket['minHandlingDays'],
                                    'max_days': bucket['maxHandlingDays'], 'warehouse': bucket.get('warehouse')})
                stocks.append({'sku': row['sku'], 'buckets': buckets})
    # Digest of the page-identity/hash list, not a claim of supplier authentication.
    source_hash = digest(pages)
    out = stage_readonly_pages(source={'supplier':'BigBuy', 'scope':scope, 'source_sha256':source_hash},
        observed_at=observed_at, now=now, max_age_seconds=max_age_seconds, requested_coverage=requested_coverage,
        pages=pages, products=products, variants=variants, stocks=stocks)
    manifest = json.loads(out['manifest_bytes'])
    manifest.update({'raw_to_records_verified':True, 'source_and_page_hashes_caller_asserted':False,
                     'transport_and_supplier_identity_verified':False, 'raw_bytes':max_raw_bytes-remaining})
    out['manifest_bytes'] = canonical(manifest)
    out['manifest_sha256'] = hashlib.sha256(out['manifest_bytes']).hexdigest()
    return out

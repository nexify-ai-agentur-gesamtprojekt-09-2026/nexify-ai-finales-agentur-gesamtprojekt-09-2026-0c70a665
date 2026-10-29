"""Bounded offline BigBuy preparation; no network, model, publish or queue.

The caller supplies immutable feed bytes and an explicit reviewed taxonomy set.
Results are review drafts, never an executable LocalShop price catalog.
"""
import hashlib
import json
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
        if product.get('taxonomy') not in selected_taxonomies:
            continue
        require(type(product.get('taxonomy')) is int, 'invalid_taxonomy')
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

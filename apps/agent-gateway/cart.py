"""Local cart preparation on the existing visitor Store; no checkout or charge.

Server binding and quantitative limits are required inputs, never browser claims.
No HTTP registration, production catalog or identity adapter is enabled here.
"""
import hashlib
import hmac
import json
import re
import secrets
import time
import uuid
from types import MappingProxyType


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False)


class CartRejected(Exception):
    def __init__(self, status, code):
        self.status, self.code = status, code
        super().__init__(code)


class LocalCart:
    def __init__(self, store, *, tenant, store_id, currency, catalog_version,
                 products, lifetime_seconds, maximum_quantity, now=time.time):
        # All values must come from a trusted adapter. Tests use synthetic fixtures.
        for value in (tenant, store_id, catalog_version):
            if not isinstance(value, str) or not 1 <= len(value) <= 128:
                raise ValueError('explicit server binding required')
        if not isinstance(currency, str) or re.fullmatch('[A-Z]{3}', currency) is None:
            raise ValueError('explicit catalog currency required')
        if any(type(v) is not int or v <= 0 for v in (lifetime_seconds, maximum_quantity)):
            raise ValueError('explicit positive limits required')
        if not isinstance(products, dict) or not products:
            raise ValueError('explicit catalog required')
        for product, minor in products.items():
            if (not isinstance(product, str) or not 1 <= len(product) <= 128
                    or type(minor) is not int or minor < 0):
                raise ValueError('catalog must contain IDs and integer minor-unit prices')
        self.store, self.now = store, now
        self.tenant, self.store_id, self.currency = tenant, store_id, currency
        self.products = MappingProxyType(dict(products))
        self.lifetime, self.maximum = lifetime_seconds, maximum_quantity
        self.binding = hashlib.sha256(canonical([tenant, store_id, currency, catalog_version, dict(self.products)]).encode()).hexdigest()

    def _visitor(self, db, owner):
        row = db.execute('SELECT 1 FROM visitors WHERE id=? AND expires>?', (owner, int(self.now()))).fetchone()
        if row is None:
            raise CartRejected(401, 'session_invalid')
        return None

    def _server_secret(self, db, create=False):
        identifier = 'cart_key:' + hashlib.sha256(canonical([self.tenant, self.store_id]).encode()).hexdigest()
        row = db.execute("SELECT payload FROM objects WHERE id=? AND owner='_local_cart_system' AND kind='cart_signing_key'", (identifier,)).fetchone()
        if row is None:
            if not create:
                raise CartRejected(409, 'cart_signing_key_missing')
            key = secrets.token_hex(32)
            db.execute('INSERT INTO objects VALUES (?,?,?,?)', (identifier, '_local_cart_system', 'cart_signing_key', canonical(key)))
            return key
        key = json.loads(row[0])
        if not isinstance(key, str) or re.fullmatch('[a-f0-9]{64}', key) is None:
            raise CartRejected(409, 'cart_signing_key_invalid')
        return key

    def _owner(self, owner):
        return 'cart:' + hashlib.sha256(canonical([self.tenant, self.store_id, owner]).encode()).hexdigest()

    def _capability(self, secret, owner, identifier):
        return hmac.new(secret.encode(), canonical([self.tenant, self.store_id, owner, identifier]).encode(), hashlib.sha256).hexdigest()

    def _load(self, db, owner, identifier, capability):
        self._visitor(db, owner)
        row = db.execute("SELECT payload FROM objects WHERE id=? AND owner=? AND kind='cart'", (identifier, self._owner(owner))).fetchone()
        if row is None:
            raise CartRejected(404, 'cart_not_found')
        secret = self._server_secret(db)
        expected = self._capability(secret, owner, identifier)
        if (not isinstance(capability, str) or not capability.isascii()
                or not hmac.compare_digest(capability, expected)):
            raise CartRejected(404, 'cart_not_found')
        cart = json.loads(row[0])
        if cart.get('signing_key_id') != hashlib.sha256(secret.encode()).hexdigest():
            raise CartRejected(409, 'cart_signing_key_changed')
        if cart['expires'] <= int(self.now()):
            raise CartRejected(410, 'cart_expired')
        if cart['binding'] != self.binding:
            raise CartRejected(409, 'catalog_binding_changed')
        return cart

    def _public(self, cart):
        items = cart['items']
        return {'id': cart['id'], 'store_id': self.store_id, 'version': str(cart['version']),
                'line_items': [{'product_id': product, 'quantity': items[product]} for product in sorted(items)],
                'currency': self.currency, 'total_minor': sum(self.products[p] * q for p, q in items.items())}

    def _receipt(self, db, owner, operation, key, payload):
        if not isinstance(key, str) or re.fullmatch('[A-Za-z0-9_-]{8,100}', key) is None:
            raise CartRejected(422, 'idempotency_key_required')
        hashed = hashlib.sha256(canonical(payload).encode()).hexdigest()
        row = db.execute('SELECT payload_hash,response FROM receipts WHERE owner=? AND operation=? AND key=?',
                         (self._owner(owner), operation, key)).fetchone()
        if row and row[0] != hashed:
            raise CartRejected(409, 'idempotency_conflict')
        return hashed, json.loads(row[1]) if row else None

    def create(self, owner, key, body):
        if (not isinstance(body, dict) or set(body) != {'store_id', 'locale'}
                or body['store_id'] != self.store_id or body['locale'] not in ('de', 'nl', 'fr')):
            raise CartRejected(422, 'invalid_cart_input')
        with self.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            self._visitor(db, owner)
            operation = 'shop_cart_create'
            hashed, receipt = self._receipt(db, owner, operation, key, body)
            if receipt:
                # Replays neither renew expiry nor revive an expired capability.
                secret = self._server_secret(db)
                cart = self._load(db, owner, receipt['id'], self._capability(secret, owner, receipt['id']))
            else:
                secret = self._server_secret(db, create=True)
                cart = {'id': uuid.uuid4().hex, 'version': 1, 'items': {}, 'binding': self.binding,
                        'expires': int(self.now()) + self.lifetime,
                        'signing_key_id': hashlib.sha256(secret.encode()).hexdigest()}
                db.execute('INSERT INTO objects VALUES (?,?,?,?)', (cart['id'], self._owner(owner), 'cart', canonical(cart)))
                # Receipt contains no bearer secret. Only the server derives the capability, never a browser CSRF value.
                db.execute('INSERT INTO receipts VALUES (?,?,?,?,?)',
                           (self._owner(owner), operation, key, hashed, canonical({'id': cart['id'], 'cart': self._public(cart)})))
            return {'cart': receipt['cart'] if receipt else self._public(cart),
                    'guest_capability': self._capability(secret, owner, cart['id'])}

    def read(self, owner, identifier, capability):
        with self.store.connect() as db:
            return self._public(self._load(db, owner, identifier, capability))

    def change(self, owner, identifier, capability, key, version, body):
        if (not isinstance(body, dict) or set(body) != {'product_id', 'quantity'}
                or not isinstance(body['product_id'], str) or body['product_id'] not in self.products
                or type(body['quantity']) is not int or not 0 <= body['quantity'] <= self.maximum):
            raise CartRejected(422, 'invalid_cart_change')
        if not isinstance(version, str):
            raise CartRejected(422, 'version_required')
        with self.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            cart = self._load(db, owner, identifier, capability)
            operation = 'shop_cart_change:' + identifier
            hashed, receipt = self._receipt(db, owner, operation, key, {'version': version, 'body': body})
            if receipt is not None:
                return receipt
            if version != str(cart['version']):
                raise CartRejected(409, 'cart_version_conflict')
            product, quantity = body['product_id'], body['quantity']
            if quantity:
                cart['items'][product] = quantity
            else:
                cart['items'].pop(product, None)
            cart['version'] += 1
            result = self._public(cart)
            db.execute("UPDATE objects SET payload=? WHERE id=? AND owner=? AND kind='cart'",
                       (canonical(cart), identifier, self._owner(owner)))
            db.execute('INSERT INTO receipts VALUES (?,?,?,?,?)',
                       (self._owner(owner), operation, key, hashed, canonical(result)))
            return result

    def read_checkout(self, owner, identifier, capability):
        with self.store.connect() as db:
            cart = self._load(db, owner, identifier, capability)
            draft_id = hashlib.sha256(canonical([self._owner(owner), identifier, str(cart['version']), 'checkout_draft']).encode()).hexdigest()[:32]
            row = db.execute("SELECT payload FROM objects WHERE id=? AND owner=? AND kind='checkout_draft'", (draft_id, self._owner(owner))).fetchone()
            if row is None:
                raise CartRejected(404, 'checkout_draft_not_found')
            return json.loads(row[0])

    def prepare_checkout(self, owner, identifier, capability, key, version):
        """Persist a blocked checkout draft, never an order or payment instruction."""
        if not isinstance(version, str):
            raise CartRejected(422, 'version_required')
        with self.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            cart = self._load(db, owner, identifier, capability)
            operation = 'shop_checkout_draft:' + identifier
            hashed, receipt = self._receipt(db, owner, operation, key, {'version': version})
            if receipt is not None:
                return receipt
            if version != str(cart['version']):
                raise CartRejected(409, 'cart_version_conflict')
            if not cart['items']:
                raise CartRejected(409, 'cart_empty')
            draft_id = hashlib.sha256(canonical([self._owner(owner), identifier, version, 'checkout_draft']).encode()).hexdigest()[:32]
            prior = db.execute("SELECT payload FROM objects WHERE id=? AND owner=? AND kind='checkout_draft'", (draft_id, self._owner(owner))).fetchone()
            result = json.loads(prior[0]) if prior else {'id': draft_id, 'state': 'blocked_provider_acceptance',
                      'cart': self._public(cart), 'order_submitted': False, 'payment_started': False}
            if prior is None:
                db.execute('INSERT INTO objects VALUES (?,?,?,?)',
                           (result['id'], self._owner(owner), 'checkout_draft', canonical(result)))
            db.execute('INSERT INTO receipts VALUES (?,?,?,?,?)',
                       (self._owner(owner), operation, key, hashed, canonical(result)))
            return result


class LocalShop:
    """Explicit trusted catalog input; no automatic supplier or fixture discovery."""
    def __init__(self, cart, *, records, source_reference, maximum_results):
        if not isinstance(source_reference, str) or not source_reference.strip():
            raise ValueError('catalog provenance required')
        if type(maximum_results) is not int or maximum_results <= 0:
            raise ValueError('explicit result bound required')
        if not isinstance(records, list) or len(records) != len(cart.products):
            raise ValueError('catalog records must match the bound price snapshot')
        self.cart, self.source_reference, self.maximum = cart, source_reference, maximum_results
        self.records = json.loads(canonical(records))
        ids = set()
        for row in self.records:
            if not isinstance(row, dict) or set(row) != {'product_id', 'name', 'category_id', 'category'}:
                raise ValueError('unexpected catalog record')
            identifier = row['product_id']
            if not isinstance(identifier, str) or identifier in ids or identifier not in cart.products:
                raise ValueError('duplicate or unpriced catalog record')
            ids.add(identifier)
            if not isinstance(row['category_id'], str) or not 1 <= len(row['category_id']) <= 128:
                raise ValueError('category ID required')
            for field in ('name', 'category'):
                translations = row[field]
                if (not isinstance(translations, dict) or set(translations) != {'de', 'nl', 'fr'}
                        or any(not isinstance(value, str) or not 1 <= len(value.strip()) <= 240 for value in translations.values())):
                    raise ValueError('localized catalog text required')
        categories = {}
        for row in self.records:
            if row['category_id'] in categories and categories[row['category_id']] != row['category']:
                raise ValueError('conflicting category labels')
            categories[row['category_id']] = row['category']
        self.categories = categories

    def catalog(self, *, query='', category='', locale='de'):
        if (locale not in ('de', 'nl', 'fr') or not isinstance(query, str) or len(query) > 128
                or not isinstance(category, str) or len(category) > 128):
            raise CartRejected(422, 'invalid_catalog_query')
        rows = [row for row in self.records if (not category or row['category_id'] == category)
                and (not query or query.casefold() in row['name'][locale].casefold() or query.casefold() in row['product_id'].casefold())]
        return {'available': True, 'store_id': self.cart.store_id, 'currency': self.cart.currency,
                'source_reference': self.source_reference, 'maximum_quantity': self.cart.maximum,
                'checkout_enabled': False, 'production_accepted': False, 'partial': len(rows) > self.maximum,
                'categories': [{'id': identifier, 'name': text[locale]} for identifier, text in sorted(self.categories.items())],
                'products': [{'product_id': row['product_id'], 'name': row['name'][locale], 'category_id': row['category_id'],
                              'price_minor': self.cart.products[row['product_id']], 'fitment_status': 'not_verified',
                              'availability_status': 'not_verified'} for row in rows[:self.maximum]]}

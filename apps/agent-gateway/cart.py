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

"""In-memory stand-in for the few Motor calls the portal/account routers use.

Test fixture only: no network, no MongoDB. It implements exactly the operators the
tested handlers need and raises on anything else, so a test cannot pass by accident
on an operator the fake silently ignores.
"""
import copy
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


try:  # the handlers catch the driver's own exception type
    from pymongo.errors import DuplicateKeyError as Duplicate
except ImportError:  # driver absent: the HTTP tests are skipped anyway
    class Duplicate(Exception):
        pass


def bind_shop_environment():
    """Inert, non-secret settings so `shop.config` imports without a real service."""
    for key, value in (("MONGO_URL", "mongodb://localhost:27017"), ("DB_NAME", "nexify_suite_unittest"),
                       ("PREVIEW_PUBLIC_ORIGIN", "https://suite.example.invalid"), ("SHOP_VAT_PERCENT", "19")):
        os.environ.setdefault(key, value)
    for path in (ROOT / "apps" / "shop-api", ROOT / "apps" / "agent-gateway", ROOT / "apps"):
        if str(path) not in sys.path:
            sys.path.insert(0, str(path))


def _get(doc, key):
    return doc.get(key)


def _match_value(actual, expected):
    if isinstance(expected, dict) and any(k.startswith("$") for k in expected):
        for op, arg in expected.items():
            if op == "$ne":
                if actual == arg:
                    return False
            elif op == "$in":
                if actual not in arg:
                    return False
            elif op == "$nin":
                if actual in arg:
                    return False
            elif op == "$regex":
                if not isinstance(actual, str) or not re.search(arg, actual):
                    return False
            elif op == "$not":
                if _match_value(actual, arg):
                    return False
            elif op == "$gte":
                if actual is None or actual < arg:
                    return False
            elif op == "$gt":
                if actual is None or actual <= arg:
                    return False
            elif op == "$lt":
                if actual is None or actual >= arg:
                    return False
            elif op == "$exists":
                raise NotImplementedError("$exists needs the document; use matches()")
            else:
                raise NotImplementedError(op)
        return True
    return actual == expected


def matches(doc, query):
    for key, expected in (query or {}).items():
        if key == "$or":
            if not any(matches(doc, branch) for branch in expected):
                return False
        elif key == "$and":
            if not all(matches(doc, branch) for branch in expected):
                return False
        elif isinstance(expected, dict) and "$exists" in expected:
            if (key in doc) is not bool(expected["$exists"]):
                return False
        elif not _match_value(_get(doc, key), expected):
            return False
    return True


class Cursor:
    def __init__(self, rows):
        self.rows = rows

    def sort(self, key, direction=1):
        self.rows.sort(key=lambda d: (d.get(key) is None, d.get(key) or ""), reverse=direction < 0)
        return self

    def limit(self, n):
        self.rows = self.rows[:n]
        return self

    async def to_list(self, length=None):
        return self.rows[:length] if length else self.rows


class UpdateResult:
    def __init__(self, matched):
        self.matched_count = matched
        self.modified_count = matched


class Collection:
    def __init__(self, unique=()):
        self.rows = []
        self.unique = tuple(unique)

    def _project(self, doc, projection):
        doc = copy.deepcopy(doc)
        for key, keep in (projection or {}).items():
            if not keep:
                doc.pop(key, None)
        return doc

    async def create_index(self, keys, unique=False, **_):
        if unique and isinstance(keys, str) and keys not in self.unique:
            self.unique += (keys,)

    async def insert_one(self, doc):
        for key in self.unique:
            if doc.get(key) is not None and any(r.get(key) == doc.get(key) for r in self.rows):
                raise Duplicate(key)
        self.rows.append(copy.deepcopy(doc))
        doc.setdefault("_id", len(self.rows))

    async def find_one(self, query=None, projection=None, sort=None):
        rows = [r for r in self.rows if matches(r, query)]
        if sort:
            for key, direction in reversed(sort):
                rows.sort(key=lambda d: d.get(key) or "", reverse=direction < 0)
        return self._project(rows[0], projection) if rows else None

    def find(self, query=None, projection=None):
        return Cursor([self._project(r, projection) for r in self.rows if matches(r, query)])

    async def estimated_document_count(self):
        return len(self.rows)

    async def count_documents(self, query=None):
        return sum(1 for r in self.rows if matches(r, query))

    async def distinct(self, key, query=None):
        seen = []
        for row in self.rows:
            if matches(row, query) and row.get(key) not in seen:
                seen.append(row.get(key))
        return seen

    def _apply(self, row, update):
        for op, values in update.items():
            if op == "$set":
                row.update(copy.deepcopy(values))
            elif op == "$inc":
                for key, amount in values.items():
                    row[key] = row.get(key, 0) + amount
            elif op == "$push":
                for key, value in values.items():
                    row.setdefault(key, []).append(copy.deepcopy(value))
            elif op == "$unset":
                for key in values:
                    row.pop(key, None)
            elif op != "$setOnInsert":
                raise NotImplementedError(op)

    async def update_one(self, query, update, upsert=False):
        for row in self.rows:
            if matches(row, query):
                self._apply(row, update)
                return UpdateResult(1)
        if upsert:
            row = {k: v for k, v in query.items() if not k.startswith("$") and not isinstance(v, dict)}
            row.update(copy.deepcopy(update.get("$setOnInsert", {})))
            self._apply(row, update)
            self.rows.append(row)
        return UpdateResult(0)

    async def update_many(self, query, update):
        hit = [row for row in self.rows if matches(row, query)]
        for row in hit:
            self._apply(row, update)
        return UpdateResult(len(hit))

    async def find_one_and_update(self, query, update, upsert=False, return_document=None):
        for row in self.rows:
            if matches(row, query):
                before = copy.deepcopy(row)
                self._apply(row, update)
                return copy.deepcopy(row) if return_document else before
        if upsert:
            await self.update_one(query, update, upsert=True)
            return copy.deepcopy(self.rows[-1])
        return None

    async def delete_one(self, query):
        for index, row in enumerate(self.rows):
            if matches(row, query):
                del self.rows[index]
                return

    async def delete_many(self, query):
        self.rows = [row for row in self.rows if not matches(row, query)]


class Database:
    """Attribute access creates collections on demand, like Motor."""
    def __init__(self):
        self._collections = {}

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self._collections.setdefault(name, Collection())

    def __getitem__(self, name):
        return getattr(self, name)

    async def command(self, name):
        return {"ok": 1}

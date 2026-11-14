"""Tidying the workshop directory: find duplicates and mark them. Never deletes, never runs by itself.

Modelled on `brands.backfill`: an operator calls `dedupe(db)` deliberately. Default is a dry run that only
reports; `apply=True` adds `duplicate_of` (plus `duplicate_rule`, `duplicate_marked_at`) to the copies and
changes nothing else. A repeated run changes nothing. `unmark` takes a mark back. Nothing in the shop's
startup or request paths calls this module.

Two records are duplicates when, in the same market, the normalised name and street are equal and the
postcodes are equal (or one of them is missing and the cities are equal). Same name and postcode with a
different or missing street is only *reported* as a possible duplicate: chains have several branches.
"""
import re
import unicodedata
from datetime import datetime, timezone

MIN_NAME_CHARS = 3
MAX_DETAILS = 100
RULE = "name+strasse+plz"
LEGAL_FORMS = {"gmbh", "mbh", "kg", "ohg", "ug", "ag", "bv", "nv", "vof", "gbr", "ek", "co", "inh"}
COMPLETENESS_FIELDS = ("name", "street", "zip", "city", "region", "tel", "web", "hours", "lat", "lon")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def fold(text):
    """Lowercase, umlauts as ae/oe/ue, accents dropped, '&' as 'und', everything else that is not a letter or digit as a space."""
    text = str(text or "").casefold()
    for source, target in (("ä", "ae"), ("ö", "oe"), ("ü", "ue")):
        text = text.replace(source, target)
    text = "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", text.replace("&", " und ")).strip()


def normalize_name(value):
    text = re.sub(r"\b(e k|b v|n v|v o f|g b r)\b", " ", fold(value))  # "e.K.", "B.V." ... fold to separate letters
    return " ".join(token for token in text.split() if token not in LEGAL_FORMS)


def normalize_street(value):
    text = re.sub(r"(strasse|straat|str)\b", "str", fold(value))
    return re.sub(r"\s+", " ", re.sub(r"\s+str\b", "str", text)).strip()


def normalize_zip(value):
    return re.sub(r"[\s-]+", "", str(value or "")).upper()


def completeness(doc):
    return sum(1 for field in COMPLETENESS_FIELDS if doc.get(field) not in (None, ""))


def is_partner(doc):
    return doc.get("partner_kind") not in (None, "", "verzeichnisbetrieb")


def same_place(a, b):
    za, zb = normalize_zip(a.get("zip")), normalize_zip(b.get("zip"))
    if za and zb:
        return za == zb
    city_a, city_b = fold(a.get("city")), fold(b.get("city"))
    return bool(city_a) and city_a == city_b


def groups(docs):
    """(high-confidence groups, possible groups); a group is a list of at least two documents."""
    parent = {d["_id"]: d["_id"] for d in docs}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    buckets, by_zip = {}, {}
    for doc in docs:
        name = normalize_name(doc.get("name"))
        if len(name) < MIN_NAME_CHARS:
            continue
        market = doc.get("market") or ""
        street = normalize_street(doc.get("street"))
        if street:
            buckets.setdefault((market, name, street), []).append(doc)
        if normalize_zip(doc.get("zip")):
            by_zip.setdefault((market, name, normalize_zip(doc.get("zip"))), []).append(doc)
    for members in buckets.values():
        for i, a in enumerate(members):
            for b in members[i + 1:]:
                if same_place(a, b):
                    parent[find(a["_id"])] = find(b["_id"])
    found = {}
    for doc in docs:
        found.setdefault(find(doc["_id"]), []).append(doc)
    high = [sorted(g, key=lambda d: d["_id"]) for g in found.values() if len(g) > 1]
    root = {d["_id"]: find(d["_id"]) for d in docs}
    possible = []
    for members in by_zip.values():
        if len({root[d["_id"]] for d in members}) > 1:
            possible.append(sorted(members, key=lambda d: d["_id"]))
    return sorted(high, key=lambda g: g[0]["_id"]), sorted(possible, key=lambda g: g[0]["_id"])


def keep_first(members):
    """The record that stays: a partner, then the more complete, then the one with a position, then the lowest id."""
    return sorted(members, key=lambda d: (not is_partner(d), -completeness(d), d.get("lat") is None, d["_id"]))[0]


async def dedupe(database, *, apply=False, limit=5000):
    """Report duplicates in the directory; with apply=True mark the copies. Returns counts and a bounded list of groups.

    Records that already carry `duplicate_of` are left alone and do not take part. Groups holding more than one
    partner are not marked (`needs_review`): a person decides.
    """
    docs = await database.workshops.find({"duplicate_of": {"$exists": False}}).sort("_id", 1).to_list(limit)
    high, possible = groups(docs)
    result = {"examined": len(docs), "groups": 0, "would_mark": 0, "marked": 0, "needs_review": 0, "possible_groups": len(possible),
              "applied": bool(apply), "remaining_possible": len(docs) >= limit, "details": [], "possible_details": []}
    stamp = now_iso()
    for members in high:
        if sum(1 for d in members if is_partner(d)) > 1:
            result["needs_review"] += 1
            continue
        keep = keep_first(members)
        copies = [d for d in members if d["_id"] != keep["_id"]]
        result["groups"] += 1
        result["would_mark"] += len(copies)
        if len(result["details"]) < MAX_DETAILS:
            result["details"].append({"keep": keep["_id"], "duplicates": [d["_id"] for d in copies], "rule": RULE, "name": keep.get("name")})
        if apply:
            for copy in copies:
                done = await database.workshops.update_one({"_id": copy["_id"], "duplicate_of": {"$exists": False}},
                                                           {"$set": {"duplicate_of": keep["_id"], "duplicate_rule": RULE, "duplicate_marked_at": stamp}})
                result["marked"] += done.matched_count
    for members in possible[:MAX_DETAILS]:
        result["possible_details"].append({"ids": [d["_id"] for d in members], "name": members[0].get("name"), "rule": "name+plz"})
    return result


async def unmark(database, workshop_id, *, apply=False):
    """Take a duplicate mark back. Dry run by default; the record itself is not touched otherwise."""
    done = {"workshop_id": workshop_id, "applied": bool(apply), "unmarked": 0}
    doc = await database.workshops.find_one({"_id": workshop_id, "duplicate_of": {"$exists": True}})
    if doc is None:
        return done
    if apply:
        await database.workshops.update_one({"_id": workshop_id}, {"$unset": {"duplicate_of": "", "duplicate_rule": "", "duplicate_marked_at": ""},
                                                                  "$set": {"duplicate_unmarked_at": now_iso()}})
        done["unmarked"] = 1
    return done

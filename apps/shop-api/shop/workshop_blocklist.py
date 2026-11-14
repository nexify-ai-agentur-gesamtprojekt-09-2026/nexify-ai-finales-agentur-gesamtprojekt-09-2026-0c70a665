"""Opt-out list: workshops that asked not to be shown. Configuration in `workshop_blocklist.json`, validated strictly.

An entry names a workshop either by `id` or by `name` plus `zip` (spelling does not matter, so a re-imported
record with a new id is still caught), with a `grund` and a `datum`. The shop hides a listed workshop in search,
detail and requests. The record stays in the database. An unreadable or invalid list is an error: the callers
close the directory rather than show someone who asked not to be shown.
"""
import json
import re
from pathlib import Path

from .workshop_directory import normalize_name, normalize_zip

DEFAULT_FILE = Path(__file__).with_name("workshop_blocklist.json")
MAX_ENTRIES = 5000
MAX_FILE_BYTES = 1_000_000
ID = re.compile(r"[A-Za-z0-9_-]{1,64}")
_cache = {}


class BlocklistError(Exception):
    pass


class Blocklist:
    def __init__(self, entries):
        self.entries = entries
        self.ids = {e["id"] for e in entries if "id" in e}
        self.keys = {(normalize_name(e["name"]), normalize_zip(e["zip"])) for e in entries if "name" in e}

    def blocks(self, doc):
        return doc.get("_id") in self.ids or (normalize_name(doc.get("name")), normalize_zip(doc.get("zip"))) in self.keys


def check_entry(entry):
    if not isinstance(entry, dict) or not set(entry) <= {"id", "name", "zip", "grund", "datum"}:
        raise BlocklistError("entry_shape")
    by_id, by_name = "id" in entry, "name" in entry or "zip" in entry
    if by_id == by_name:
        raise BlocklistError("entry_needs_id_or_name_and_zip")
    if by_id and not (isinstance(entry["id"], str) and ID.fullmatch(entry["id"])):
        raise BlocklistError("entry_id_invalid")
    if by_name and not (isinstance(entry.get("name"), str) and len(normalize_name(entry["name"])) >= 3
                        and isinstance(entry.get("zip"), str) and normalize_zip(entry["zip"])):
        raise BlocklistError("entry_name_and_zip_required")
    for key in ("grund", "datum"):
        if not isinstance(entry.get(key), str) or not entry[key].strip() or len(entry[key]) > 500:
            raise BlocklistError("entry_%s_required" % key)


def load(path=None):
    """Read and validate the list; cached per file version, so an edit applies on the next request without a restart."""
    path = Path(path) if path is not None else DEFAULT_FILE
    try:
        stat = path.stat()
        if stat.st_size > MAX_FILE_BYTES:
            raise BlocklistError("file_too_large")
        token = (str(path), stat.st_mtime_ns, stat.st_size)
        if token in _cache:
            return _cache[token]
        data = json.loads(path.read_text(encoding="utf-8"))
    except OSError:
        raise BlocklistError("file_unreadable") from None
    except ValueError:
        raise BlocklistError("file_not_json") from None
    entries = data.get("eintraege") if isinstance(data, dict) else None
    if not isinstance(data, dict) or data.get("version") != 1 or not isinstance(entries, list) or len(entries) > MAX_ENTRIES:
        raise BlocklistError("file_shape")
    for entry in entries:
        check_entry(entry)
    loaded = Blocklist(entries)
    _cache.clear()
    _cache[token] = loaded
    return loaded

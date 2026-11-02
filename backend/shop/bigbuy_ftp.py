"""BigBuy FTP catalog source: read-only listing, download with manifest (name, size, SHA256, time), CSV parse."""
import asyncio
import csv
import ftplib
import hashlib
import io
import os
import re
import ssl
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path

from bigbuy_get import BigBuyReadError

from .db import now_iso

CACHE = Path(__file__).resolve().parents[1] / "data" / "ftp"
ROOT_PATTERN = re.compile(r"^\s*auto\s*(?:und|&)\s*motorrad\s*$", re.I)
MAX_DEPTH = 5
MAX_FILE_BYTES = 64 * 1024 * 1024
MAX_FILE_ROWS = 600000
connect_factory = None  # tests inject a fake FTP object factory
csv.field_size_limit(10_000_000)


def connect():
    if connect_factory:
        return connect_factory()
    host, user, password = (os.environ.get(k, "") for k in ("BIGBUY_FTP_HOST", "BIGBUY_FTP_USER", "BIGBUY_FTP_PASSWORD"))
    if not (host and user and password):
        raise BigBuyReadError("ftp_credentials_missing")
    host = re.sub(r"^\w+://", "", host).strip("/")
    ftp = None
    try:
        ftp = ftplib.FTP_TLS(host, timeout=60, context=ssl.create_default_context())
        ftp.auth()
        ftp.login(user, password)
        ftp.prot_p()
        return ftp
    except ftplib.error_perm as error:
        if ftp is not None:
            ftp.close()
        raise BigBuyReadError("ftp_login_incorrect" if str(error).startswith("530") else "ftp_permission_error") from None
    except (OSError, EOFError, ftplib.Error):
        if ftp is not None:
            ftp.close()
        raise BigBuyReadError("ftps_unavailable_no_plaintext_fallback") from None


def walk(ftp, path="/", depth=0):
    files = []
    try:
        entries = list(ftp.mlsd(path, facts=["type", "size"]))
    except ftplib.error_perm:
        entries = [(name, {"type": "file"}) for name in ftp.nlst(path)]
    for name, facts in entries:
        if name in (".", ".."):
            continue
        full = path.rstrip("/") + "/" + name.split("/")[-1]
        if facts.get("type") == "dir" and depth < MAX_DEPTH:
            files.extend(walk(ftp, full, depth + 1))
        elif facts.get("type") == "file":
            files.append(full)
    return files


def pick(files, kind):
    """kind: 'categor' or 'product'; DE + CSV files only, override via BIGBUY_FTP_<KIND>_FILES."""
    override = [f.strip() for f in os.environ.get("BIGBUY_FTP_%s_FILES" % ("CATEGORY" if kind == "categor" else "PRODUCT"), "").split(",") if f.strip()]
    if override:
        return override
    return [f for f in files if f.lower().endswith(".csv") and kind in f.lower() and re.search(r"(^|[_\-/.])de([_\-/.]|$)", f.lower())]


def download(ftp, remote):
    buffer = io.BytesIO()
    if not isinstance(remote, str) or not remote.startswith("/") or any(ord(c) < 32 for c in remote) or ".." in remote.split("/"):
        raise BigBuyReadError("ftp_file_path_invalid")
    def append(chunk):
        if buffer.tell() + len(chunk) > MAX_FILE_BYTES:
            raise BigBuyReadError("ftp_file_byte_limit")
        buffer.write(chunk)
    ftp.retrbinary("RETR " + remote, append)
    raw = buffer.getvalue()
    CACHE.mkdir(parents=True, exist_ok=True)
    (CACHE / remote.strip("/").replace("/", "__")).write_bytes(raw)
    return raw, {"file": remote, "size": len(raw), "sha256": hashlib.sha256(raw).hexdigest(), "fetched_at": now_iso()}


def rows(raw):
    try:
        text = raw.decode("utf-8-sig", errors="strict")
    except UnicodeDecodeError:
        raise BigBuyReadError("ftp_csv_encoding") from None
    delimiter = ";" if text[:2000].count(";") >= text[:2000].count(",") else ","
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter, strict=True)
    result = []
    try:
        fields = reader.fieldnames
        if not fields or len({f.strip().upper() for f in fields}) != len(fields) or any(not f.strip() for f in fields):
            raise BigBuyReadError("ftp_csv_columns")
        for row in reader:
            if len(result) >= MAX_FILE_ROWS:
                raise BigBuyReadError("ftp_csv_row_limit")
            if None in row or any(v is None for v in row.values()):
                raise BigBuyReadError("ftp_csv_columns")
            result.append({k.strip().upper(): v.strip() for k, v in row.items()})
    except csv.Error:
        raise BigBuyReadError("ftp_csv_malformed") from None
    return result


def auto_categories(category_rows):
    names, parents = {}, {}
    for r in category_rows:
        key = r.get("ID", "")
        name = r.get("NAME") or r.get("NOMBRE") or ""
        parent = r.get("PARENTCATEGORY") or r.get("PARENT_ID") or r.get("PARENT") or ""
        if not key.isascii() or not key.isdigit() or int(key) <= 0 or int(key) in names or not name.strip() or (parent and not parent.isdigit()):
            raise BigBuyReadError("ftp_category_invalid")
        names[int(key)] = name
        parents[int(key)] = int(parent) if parent else 0
    if not names or any(p and p not in names for p in parents.values()):
        raise BigBuyReadError("ftp_category_invalid")
    raw_override = os.environ.get("BIGBUY_TAXONOMY_IDS", "").strip()
    if raw_override and any(not x.strip().isascii() or not x.strip().isdigit() or int(x) <= 0 for x in raw_override.split(",")):
        raise BigBuyReadError("category_override_invalid")
    override = [int(x) for x in raw_override.split(",")] if raw_override else []
    roots = override or [c for c, n in names.items() if ROOT_PATTERN.search(n) and not ROOT_PATTERN.search(names.get(parents.get(c), ""))]
    if not roots or not set(roots) <= names.keys():
        raise BigBuyReadError("category_auto_motorrad_not_found")
    wanted = set(roots)
    changed = True
    while changed:
        fresh = {c for c, p in parents.items() if p in wanted and c not in wanted}
        wanted |= fresh
        changed = bool(fresh)
    return roots, names, wanted


def to_cents(value):
    try:
        if not isinstance(value, str) or len(value) > 80:
            raise ValueError()
        price = Decimal(value.replace(",", "."))
        if not price.is_finite() or price < 0 or price > Decimal(2**63 - 1) / 100:
            raise ValueError()
        return int((price * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    except (ValueError, InvalidOperation, OverflowError):
        raise BigBuyReadError("invalid_wholesale_price") from None


def stock_quantity(value):
    """CSV has text cells: accept only an explicit canonical ASCII integer cell.

    This syntax is not a claim of a currently verified BigBuy CSV field contract.
    Missing/ambiguous cells reject the acquisition, rather than inventing zero.
    """
    if not isinstance(value, str) or not re.fullmatch(r"0|[1-9][0-9]{0,18}", value):
        raise BigBuyReadError("catalog_stock_invalid")
    quantity = int(value)
    if quantity > 2**63 - 1:
        raise BigBuyReadError("catalog_stock_invalid")
    return quantity


def build(row, wanted, roots, names, stamp, run_id):
    raw_cats = re.split(r"[,|]", row.get("CATEGORY", ""))
    if not roots or not wanted or any(not c.strip().isascii() or not c.strip().isdigit() or int(c) not in names for c in raw_cats):
        raise BigBuyReadError("product_category_invalid")
    cats = [int(c) for c in raw_cats]
    hits = [c for c in cats if c in wanted]
    if not hits:
        return None
    category_id = hits[-1]
    root_hits = [r for r in roots if r in hits]
    if len(roots) > 1 and len(root_hits) != 1:
        raise BigBuyReadError("category_root_ambiguous")
    root_id = root_hits[0] if root_hits else roots[0]
    images = [row[k] for k in sorted(row) if k.startswith("IMAGE") and row[k].startswith("https://")]
    details = {k.lower(): row[k] for k in ("BRAND", "WEIGHT", "HEIGHT", "WIDTH", "DEPTH", "DATE_UPD") if row.get(k)}
    stock = stock_quantity(row.get("STOCK"))
    return {"_id": "bb-%s" % row["ID"], "bigbuy_id": int(row["ID"]), "sku": row.get("SKU") or row.get("REFERENCE") or row["ID"],
            "ean": row.get("EAN13") or row.get("EAN") or "", "name": row.get("NAME") or row["ID"], "description": row.get("DESCRIPTION", ""),
            "images": images[:12], "category_ids": sorted({category_id, root_id}), "category_id": category_id,
            "purchase_cents": to_cents(row.get("PRICE") or row.get("WHOLESALE_PRICE")), "stock": stock,
            "details": details, "active": True, "source": "bigbuy", "source_environment": "ftp", "imported_at": stamp, "import_run_id": run_id}


def fetch_sync(stamp, run_id):
    ftp = connect()
    try:
        files = walk(ftp)
        category_files, product_files = pick(files, "categor"), pick(files, "product")
        if not product_files:
            raise BigBuyReadError("ftp_product_files_not_found")
        if len(category_files) != 1:
            raise BigBuyReadError("ftp_category_file_missing_or_ambiguous")
        manifest, roots, names, wanted = [], [], {}, set()
        for remote in category_files[:1]:
            raw, entry = download(ftp, remote)
            manifest.append(entry)
            roots, names, wanted = auto_categories(rows(raw))
        if not roots:
            raise BigBuyReadError("category_auto_motorrad_not_found")
        products = {}
        for remote in product_files:
            raw, entry = download(ftp, remote)
            manifest.append(entry)
            for row in rows(raw):
                if not str(row.get("ID", "")).isascii() or not str(row.get("ID", "")).isdigit() or int(row["ID"]) <= 0:
                    raise BigBuyReadError("catalog_row_identity")
                identity = int(row["ID"])
                product = build(row, wanted, roots, names, stamp, run_id)
                if product:
                    if identity in products:
                        raise BigBuyReadError("catalog_duplicate_page_identity")
                    products[identity] = product
        if not products:
            raise BigBuyReadError("no_products_returned")
        return roots, names, list(products.values()), manifest
    finally:
        try:
            ftp.quit()
        except Exception:
            pass


async def fetch(stamp, run_id):
    return await asyncio.to_thread(fetch_sync, stamp, run_id)

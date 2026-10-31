"""BigBuy FTP catalog source: read-only listing, download with manifest (name, size, SHA256, time), CSV parse."""
import asyncio
import csv
import ftplib
import hashlib
import io
import os
import re
from pathlib import Path

from bigbuy_get import BigBuyReadError

from .db import now_iso

CACHE = Path(__file__).resolve().parents[1] / "data" / "ftp"
ROOT_PATTERN = re.compile(r"auto|motorrad", re.I)
MAX_DEPTH = 5
connect_factory = None  # tests inject a fake FTP object factory
csv.field_size_limit(10_000_000)


def connect():
    if connect_factory:
        return connect_factory()
    host, user, password = (os.environ.get(k, "") for k in ("BIGBUY_FTP_HOST", "BIGBUY_FTP_USER", "BIGBUY_FTP_PASSWORD"))
    if not (host and user and password):
        raise BigBuyReadError("ftp_credentials_missing")
    host = re.sub(r"^\w+://", "", host).strip("/")
    try:
        ftp = ftplib.FTP_TLS(host, timeout=60)
        ftp.auth()
        ftp.login(user, password)
        ftp.prot_p()
        return ftp
    except ftplib.error_perm as error:
        if str(error).startswith("530 Login"):
            raise BigBuyReadError("ftp_login_incorrect") from None
    except (OSError, EOFError):
        pass
    try:
        ftp = ftplib.FTP(host, timeout=60)
        ftp.login(user, password)
        return ftp
    except ftplib.error_perm as error:
        raise BigBuyReadError("ftp_login_incorrect" if str(error).startswith("530") else "ftp_permission_error") from None
    except (OSError, EOFError):
        raise BigBuyReadError("ftp_unreachable") from None


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
    ftp.retrbinary("RETR " + remote, buffer.write)
    raw = buffer.getvalue()
    CACHE.mkdir(parents=True, exist_ok=True)
    (CACHE / remote.strip("/").replace("/", "__")).write_bytes(raw)
    return raw, {"file": remote, "size": len(raw), "sha256": hashlib.sha256(raw).hexdigest(), "fetched_at": now_iso()}


def rows(raw):
    text = raw.decode("utf-8-sig", errors="replace")
    delimiter = ";" if text[:2000].count(";") >= text[:2000].count(",") else ","
    return [{(k or "").strip().upper(): (v or "").strip() for k, v in row.items()} for row in csv.DictReader(io.StringIO(text), delimiter=delimiter)]


def auto_categories(category_rows):
    names, parents = {}, {}
    for r in category_rows:
        if str(r.get("ID", "")).isdigit():
            names[int(r["ID"])] = r.get("NAME") or r.get("NOMBRE") or ""
            parent = r.get("PARENTCATEGORY") or r.get("PARENT_ID") or r.get("PARENT") or ""
            parents[int(r["ID"])] = int(parent) if parent.isdigit() else 0
    override = [int(x) for x in os.environ.get("BIGBUY_TAXONOMY_IDS", "").split(",") if x.strip().isdigit()]
    roots = override or [c for c, n in names.items() if ROOT_PATTERN.search(n) and not ROOT_PATTERN.search(names.get(parents.get(c), ""))]
    wanted = set(roots)
    changed = True
    while changed:
        fresh = {c for c, p in parents.items() if p in wanted and c not in wanted}
        wanted |= fresh
        changed = bool(fresh)
    return roots, names, wanted


def to_cents(value):
    value = (value or "").replace(",", ".")
    try:
        return int(round(float(value) * 100))
    except ValueError:
        return None


def build(row, wanted, roots, names, stamp, run_id):
    cats = [int(c) for c in re.split(r"[,|]", row.get("CATEGORY", "")) if c.strip().isdigit()]
    hits = [c for c in cats if c in wanted]
    if wanted and cats and not hits:
        return None
    category_id = hits[-1] if hits else (roots[0] if roots else 0)
    root_id = next((r for r in roots if r in hits), roots[0] if roots else category_id)
    images = [row[k] for k in sorted(row) if k.startswith("IMAGE") and row[k].startswith("https://")]
    details = {k.lower(): row[k] for k in ("BRAND", "WEIGHT", "HEIGHT", "WIDTH", "DEPTH", "DATE_UPD") if row.get(k)}
    stock = row.get("STOCK", "0")
    return {"_id": "bb-%s" % row["ID"], "bigbuy_id": int(row["ID"]), "sku": row.get("SKU") or row.get("REFERENCE") or row["ID"],
            "ean": row.get("EAN13") or row.get("EAN") or "", "name": row.get("NAME") or row["ID"], "description": row.get("DESCRIPTION", ""),
            "images": images[:12], "category_ids": sorted({category_id, root_id}), "category_id": category_id,
            "purchase_cents": to_cents(row.get("PRICE") or row.get("WHOLESALE_PRICE")), "stock": int(stock) if stock.isdigit() else 0,
            "details": details, "active": True, "source": "bigbuy", "source_environment": "ftp", "imported_at": stamp, "import_run_id": run_id}


def fetch_sync(stamp, run_id):
    ftp = connect()
    try:
        files = walk(ftp)
        category_files, product_files = pick(files, "categor"), pick(files, "product")
        if not product_files:
            raise BigBuyReadError("ftp_product_files_not_found")
        manifest, roots, names, wanted = [], [], {}, set()
        for remote in category_files[:1]:
            raw, entry = download(ftp, remote)
            manifest.append(entry)
            roots, names, wanted = auto_categories(rows(raw))
        if category_files and not roots:
            raise BigBuyReadError("category_auto_motorrad_not_found")
        products = {}
        for remote in product_files:
            raw, entry = download(ftp, remote)
            manifest.append(entry)
            for row in rows(raw):
                if str(row.get("ID", "")).isdigit() and row["ID"] not in products:
                    product = build(row, wanted, roots, names, stamp, run_id)
                    if product:
                        products[row["ID"]] = product
        return roots, names, list(products.values()), manifest
    finally:
        try:
            ftp.quit()
        except Exception:
            pass


async def fetch(stamp, run_id):
    return await asyncio.to_thread(fetch_sync, stamp, run_id)

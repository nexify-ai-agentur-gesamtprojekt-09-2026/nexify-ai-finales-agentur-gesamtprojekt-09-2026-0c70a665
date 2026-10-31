"""Stage one unchanged canonical helper inside the deployable service archive.

Build time only: no module execution, network, credentials, database or data seed.
"""
from hashlib import sha256
from pathlib import Path

HELPER_SHA256 = "1709bdf3ae328e7e338f21b1f3b7703725d62ed3263da9d575716e73ee906591"


def prepare(service_root: Path) -> Path:
    source = service_root.parent / "agent-gateway" / "bigbuy_get.py"
    if source.is_symlink() or not source.is_file():
        raise RuntimeError("Canonical helper source missing or unsuitable")
    data = source.read_bytes()
    if sha256(data).hexdigest() != HELPER_SHA256:
        raise RuntimeError("Canonical helper source changed; review and re-pin before build")
    target = service_root / "vercel_support" / "bigbuy_get.py"
    if target.parent.is_symlink() or target.is_symlink():
        raise RuntimeError("Helper build destination is unsuitable")
    target.parent.mkdir(exist_ok=True)
    target.write_bytes(data)
    return target


if __name__ == "__main__":
    prepare(Path(__file__).resolve().parent)

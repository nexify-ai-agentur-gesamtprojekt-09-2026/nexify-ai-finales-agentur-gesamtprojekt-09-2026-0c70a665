"""Freisteller (``*cutout*``) muessen einen Alpha-Kanal behalten.

Regression zu e882959: Die Verdichtung der Markenbilder hat bei ``hf-17-cutout`` den
Alpha-Kanal verworfen (RGBA -> RGB). Auf /portale erschien der Freisteller dadurch mit
schwarzem Hintergrund und Streifen. Der Test liest nur die WebP-Header und braucht
keine Bildbibliothek.
"""
import struct
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "apps" / "web" / "public" / "media"


def webp_has_alpha(data: bytes) -> bool:
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError("kein WebP")
    pos = 12
    while pos + 8 <= len(data):
        tag = data[pos:pos + 4]
        size = struct.unpack("<I", data[pos + 4:pos + 8])[0]
        body = data[pos + 8:pos + 8 + size]
        if tag == b"VP8X":
            return bool(body[0] & 0x10)
        if tag == b"VP8L":
            return bool((struct.unpack("<I", body[1:5])[0] >> 28) & 1)
        if tag == b"VP8 ":
            return False
        pos += 8 + size + (size & 1)
    return False


class CutoutAlphaTests(unittest.TestCase):
    def test_cutout_webp_files_keep_alpha_channel(self):
        files = sorted(MEDIA.rglob("*cutout*.webp"))
        self.assertTrue(files, "keine Freisteller-WebP gefunden")
        for path in files:
            with self.subTest(path=str(path.relative_to(ROOT))):
                self.assertTrue(webp_has_alpha(path.read_bytes()), "Alpha-Kanal fehlt")


if __name__ == "__main__":
    unittest.main()

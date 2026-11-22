"""Werkstätten Deutschland (OSM/ODbL) → Verzeichnis: Umrechnung, Dedupe, Datenschutz, idempotenter Import."""
import asyncio
import importlib.util
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("sheet", ROOT / "tools/import_werkstaetten_sheet.py")
sheet = importlib.util.module_from_spec(spec); spec.loader.exec_module(sheet)
OUT = ROOT / "prototypen/assets/workshops-osm-de.json"


def row(**kw):
    base = {"#REF!": "osm-node-1", "Name": "Auto Test", "Kategorie": "Kfz-Werkstatt", "Marken": "Ford", "Leistungen": "Reparatur, Bremsen, Lackieru...",
            "Straße": "Hauptstraße", "Hausnr.": "1", "PLZ": "80331", "Ort": "München", "Bundesland": "Bayern", "Breitengrad": "481.279.492",
            "Längengrad": "115.352.123", "Telefon (E.164)": "498912345", "E-Mail": "info@test.de", "E-Mail-Status": "mx_geprueft",
            "Website": "https://test.de", "Öffnungszeiten": "Mo-Fr 08:00-17:00", "Quell-Link": "https://www.openstreetmap.org/node/1",
            "Lizenz": "ODbL-1.0", "Datenstand": "2026-11-17", "Segment": "Markenvertretung (Hinweis)"}
    base.update(kw); return base


class Convert(unittest.TestCase):
    def test_coordinates_restored_within_germany(self):
        self.assertEqual(sheet.latitude("481.279.492"), 48.1279492)
        self.assertEqual(sheet.longitude("115.352.123"), 11.5352123)
        self.assertEqual(sheet.longitude("79.457.329"), 7.9457329)
        self.assertEqual(sheet.latitude("4.957.734"), 49.57734)
        self.assertIsNone(sheet.latitude("12"))

    def test_phone_email_and_truncated_lists(self):
        self.assertEqual(sheet.phone("498912345"), "+498912345")
        self.assertIsNone(sheet.phone("#ERROR!"))
        # Befund cubic (PR #219): führendes "+" erlaubt, führende 0 ist kein E.164
        self.assertEqual(sheet.phone("+498912345"), "+498912345")
        self.assertIsNone(sheet.phone("0898912345"))
        self.assertIsNone(sheet.phone("+0898912345"))
        self.assertIsNone(sheet.phone("++498912345"))
        # Befund cubic (PR #219): keine unbelegte Einordnung als freie Werkstatt
        self.assertNotIn("kind", sheet.convert([row()], set())[0][0])
        self.assertEqual(sheet.email("%5c%22info-verl@schroeder-team.de"), "info-verl@schroeder-team.de")
        self.assertIsNone(sheet.email("kein mail"))
        self.assertEqual(sheet.split_list("Reparatur, Bremsen, Lackieru..."), ["Reparatur", "Bremsen"])

    def test_no_guesses_and_attribution_kept(self):
        shops, stats = sheet.convert([row()])
        s = shops[0]
        self.assertNotIn("segment", s)
        self.assertEqual((s["source"], s["license"], s["data_as_of"]), ("OpenStreetMap", "ODbL-1.0", "2026-11-17"))
        self.assertEqual(s["id"], "OSM-DE-node-1")
        self.assertNotIn("contact_email", s)  # Kontaktadressen nie in die eingecheckte Datei
        self.assertEqual(stats["email_in_sheet"], 1)
        self.assertEqual(sheet.convert([row()], with_contact=True)[0][0]["contact_email"], "info@test.de")

    def test_dedupe_against_directory(self):
        shops, stats = sheet.convert([row()], {sheet.key("Auto Test", "80331")})
        self.assertEqual((shops, stats["duplicate_of_directory"]), ([], 1))


class Dataset(unittest.TestCase):
    def test_generated_file_is_complete_and_inside_germany(self):
        pack = json.loads(OUT.read_text(encoding="utf-8"))["de-DE"]
        shops = pack["shops"]
        self.assertEqual(pack["total"], len(shops))
        self.assertEqual(len(shops), 1157)  # Stand Tabelle „Werkstaetten Deutschland“ beim Import
        self.assertEqual(len({s["id"] for s in shops}), len(shops))
        for s in shops:
            self.assertEqual(s["license"], "ODbL-1.0")
            self.assertNotIn("contact_email", s)
            self.assertNotIn("kind", s)
            if "lat" in s:
                self.assertTrue(47.2 <= s["lat"] <= 55.1 and 5.8 <= s["lon"] <= 15.1, s["id"])


class FakeCursor:
    def __init__(self, docs): self.docs = docs
    def __aiter__(self):
        self._i = iter(self.docs); return self
    async def __anext__(self):
        try: return next(self._i)
        except StopIteration: raise StopAsyncIteration


class FakeCollection:
    def __init__(self): self.docs = {}
    def find(self, *a, **k): return FakeCursor([{"_id": i} for i in self.docs])
    async def insert_many(self, docs, ordered=True):
        for d in docs: self.docs[d["_id"]] = d


class FakeDb:
    def __init__(self): self.workshops = FakeCollection()


class Import(unittest.TestCase):
    def setUp(self):
        import os
        os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:1/test")  # Attrappe: die Tests nutzen FakeDb, keine Verbindung
        for name, value in {"DB_NAME": "test", "PREVIEW_PUBLIC_ORIGIN": "http://127.0.0.1", "SHOP_VAT_PERCENT": "19",
                            "NINEROUTER_BASE_URL": "http://127.0.0.1:1", "NINEROUTER_API_KEY": "test-attrappe"}.items():
            os.environ.setdefault(name, value)
        sys.path.insert(0, str(ROOT / "apps/shop-api"))
        try:
            from shop import workshops_api
        except ImportError as error:  # nur fehlende Pakete überspringen; echte Fehler der API bleiben rot
            self.skipTest(f"shop-api nicht importierbar: {error}")
        self.api = workshops_api

    def test_import_is_idempotent_and_adds_osm_entries(self):
        fake = FakeDb()
        first = asyncio.run(self.api.import_workshops(fake))
        second = asyncio.run(self.api.import_workshops(fake))
        self.assertGreater(first, 1000)
        self.assertEqual(second, 0)
        self.assertTrue(any(i.startswith("OSM-DE-") for i in fake.workshops.docs))

    def test_public_view_never_contains_email(self):
        doc = {"_id": "OSM-DE-node-1", "id": "OSM-DE-node-1", "name": "X", "contact_email": "a@b.de", "contact_email_status": "mx_geprueft",
               "source": "OpenStreetMap", "license": "ODbL-1.0", "services": ["Reparatur"]}
        pub = self.api.public(doc)
        self.assertNotIn("contact_email", pub)
        self.assertNotIn("contact_email_status", pub)
        self.assertEqual(pub["license"], "ODbL-1.0")
        self.assertEqual(self.api.public({"id": "T", "name": "Y", "source": "prototypen/assets/workshops.json"}).get("source"), None)


class ContactExportGuard(unittest.TestCase):
    """Befund Codex Review (PR #219): mit --mit-kontakt darf nichts innerhalb des Repositorys geschrieben werden."""
    def test_every_path_inside_repository_is_rejected(self):
        import tempfile
        src = Path(tempfile.mkdtemp()) / "in.csv"
        src.write_text("Werkstatt-ID,Name,PLZ,E-Mail\nosm-node-1,A,80331,a@b.de\n", encoding="utf-8")
        for target in [ROOT / "prototypen/assets/contacts.json", ROOT / "prototypen/assets/workshops.json", ROOT / "x.json"]:
            before = target.read_bytes() if target.exists() else None
            self.assertEqual(sheet.main(["tool", str(src), str(target), "--mit-kontakt"]), 2, target)
            self.assertEqual(target.read_bytes() if target.exists() else None, before, target)
        outside = Path(tempfile.mkdtemp()) / "contacts.json"
        self.assertEqual(sheet.main(["tool", str(src), str(outside), "--mit-kontakt"]), 0)
        self.assertIn("a@b.de", outside.read_text(encoding="utf-8"))


class SeedCommand(Import):
    """Befund Codex Review (PR #219): Vercel führt den lifespan-Import nicht aus; es braucht einen ausdrücklichen Weg."""
    def test_seed_command_imports_idempotently(self):
        from shop import seed_workshops
        fake = FakeDb()
        first = asyncio.run(seed_workshops.run(fake))
        second = asyncio.run(seed_workshops.run(fake))
        self.assertGreater(first["added"], 1000)
        self.assertEqual(second["added"], 0)

    def test_parallel_duplicate_inserts_are_tolerated(self):
        class Dup(Exception):
            details = {"writeErrors": [{"code": 11000}], "nInserted": 3}
        class Racing(FakeCollection):
            async def insert_many(self, docs, ordered=True):
                raise Dup()
        fake = FakeDb(); fake.workshops = Racing()
        self.assertEqual(asyncio.run(self.api.import_workshops(fake)), 3)

    def test_other_bulk_write_failures_are_reported(self):
        """Befund Vercel/cubic (PR #219): ohne writeErrors oder mit writeConcernErrors ist nichts belegt gespeichert."""
        for details in ({"writeErrors": [], "nInserted": 0, "writeConcernErrors": [{"code": 64}]},
                        {"writeErrors": [{"code": 11000}], "nInserted": 3, "writeConcernErrors": [{"code": 64}]},
                        {"nInserted": 0}, {"writeErrors": [{"code": 11000}, {"code": 121}], "nInserted": 1}):
            class Failure(Exception):
                pass
            Failure.details = details
            class Broken(FakeCollection):
                async def insert_many(self, docs, ordered=True):
                    raise Failure()
            fake = FakeDb(); fake.workshops = Broken()
            with self.assertRaises(Failure, msg=details):
                asyncio.run(self.api.import_workshops(fake))

    def test_seed_doc_names_every_required_variable(self):
        """Befund cubic (PR #219): der dokumentierte Aufruf muss alle Pflichtvariablen nennen."""
        import re
        from shop import seed_workshops
        required = set(re.findall(r'os\.environ\["([A-Z_]+)"\]', (ROOT / "apps/shop-api/shop/config.py").read_text()))
        self.assertTrue(required)
        for name in required:
            self.assertIn(name + "=", seed_workshops.__doc__, name)


if __name__ == "__main__":
    unittest.main()

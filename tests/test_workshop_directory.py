"""TK-16: duplicate detection (dry run by default, marks only) and the opt-out list for the workshop directory.

No network, no MongoDB. Nothing here deletes a record or runs by itself.
"""
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from suite_fakes import ROOT, Database, bind_shop_environment

bind_shop_environment()
from shop import workshop_blocklist, workshop_directory

try:
    import httpx
    from fastapi import FastAPI
    from shop import workshops_api
    HTTP_DEPS = True
except ImportError:
    HTTP_DEPS = False


def shop(ident, name, street="Hauptstrasse 5", zip="52062", city="Aachen", **extra):
    doc = {"_id": ident, "id": ident, "name": name, "street": street, "zip": zip, "city": city, "market": "de-DE", "lat": 50.77, "lon": 6.08,
           "directory_entry": True, "city_key": city.casefold()}
    doc.update(extra)
    return {k: v for k, v in doc.items() if v is not None}


class Normalizing(unittest.TestCase):
    def test_names_ignore_case_accents_punctuation_and_legal_form(self):
        n = workshop_directory.normalize_name
        self.assertEqual(n("Müller & Söhne KFZ-Service GmbH"), n("MUELLER und SOEHNE Kfz Service"))
        self.assertEqual(n("Auto Meyer e.K."), n("auto  meyer"))
        self.assertEqual(n("Garage Dupré B.V."), n("garage dupre"))
        self.assertNotEqual(n("Auto Meyer"), n("Auto Meier"))

    def test_streets_ignore_the_many_ways_to_write_strasse(self):
        s = workshop_directory.normalize_street
        self.assertEqual(s("Hauptstraße 5"), s("Hauptstr. 5"))
        self.assertEqual(s("Hauptstrasse 5"), s("Haupt Str 5"))
        self.assertEqual(s("Kerkstraat 12"), s("Kerkstr. 12"))
        self.assertNotEqual(s("Hauptstraße 5"), s("Hauptstraße 50"))

    def test_zip_ignores_spaces_dashes_and_case(self):
        self.assertEqual(workshop_directory.normalize_zip("1234 ab"), "1234AB")
        self.assertEqual(workshop_directory.normalize_zip(" 52062 "), "52062")
        self.assertEqual(workshop_directory.normalize_zip(None), "")


class Detection(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = Database()

    async def put(self, *docs):
        for doc in docs:
            await self.db.workshops.insert_one(doc)

    def snapshot(self):
        return [dict(r) for r in self.db.workshops.rows]

    async def test_dry_run_is_the_default_and_writes_nothing(self):
        await self.put(shop("TKW-1", "Auto Meyer GmbH"), shop("TKW-2", "auto meyer", street="Hauptstr. 5"))
        before = self.snapshot()
        result = await workshop_directory.dedupe(self.db)
        self.assertFalse(result["applied"])
        self.assertEqual((result["groups"], result["would_mark"], result["marked"]), (1, 1, 0))
        self.assertEqual(self.snapshot(), before)

    async def test_apply_marks_only_the_duplicate_and_deletes_nothing(self):
        await self.put(shop("TKW-1", "Auto Meyer GmbH"), shop("TKW-2", "auto meyer", street="Hauptstr. 5"), shop("TKW-3", "Ganz Anders"))
        result = await workshop_directory.dedupe(self.db, apply=True)
        self.assertEqual(result["marked"], 1)
        rows = {r["_id"]: r for r in self.db.workshops.rows}
        self.assertEqual(len(rows), 3)
        self.assertNotIn("duplicate_of", rows["TKW-1"])
        self.assertNotIn("duplicate_of", rows["TKW-3"])
        self.assertEqual(rows["TKW-2"]["duplicate_of"], "TKW-1")
        self.assertEqual(rows["TKW-2"]["duplicate_rule"], "name+strasse+plz")
        self.assertTrue(rows["TKW-2"]["duplicate_marked_at"])
        self.assertEqual(rows["TKW-2"]["name"], "auto meyer")  # no field of the record changes

    async def test_a_second_run_changes_nothing(self):
        await self.put(shop("TKW-1", "Auto Meyer"), shop("TKW-2", "Auto Meyer"))
        await workshop_directory.dedupe(self.db, apply=True)
        after_first = self.snapshot()
        again = await workshop_directory.dedupe(self.db, apply=True)
        self.assertEqual((again["marked"], again["groups"]), (0, 0))
        self.assertEqual(self.snapshot(), after_first)

    async def test_a_new_copy_of_a_kept_record_is_marked_against_it(self):
        await self.put(shop("TKW-1", "Auto Meyer"), shop("TKW-2", "Auto Meyer"))
        await workshop_directory.dedupe(self.db, apply=True)
        await self.put(shop("TKW-9", "Auto Meyer"))
        await workshop_directory.dedupe(self.db, apply=True)
        self.assertEqual({r["_id"]: r.get("duplicate_of") for r in self.db.workshops.rows}, {"TKW-1": None, "TKW-2": "TKW-1", "TKW-9": "TKW-1"})

    async def test_chain_branches_on_different_streets_are_not_duplicates(self):
        await self.put(shop("TKW-1", "Auto Meyer", street="Hauptstrasse 5"), shop("TKW-2", "Auto Meyer", street="Bahnhofstrasse 9"))
        result = await workshop_directory.dedupe(self.db, apply=True)
        self.assertEqual((result["groups"], result["marked"]), (0, 0))
        self.assertEqual(result["possible_groups"], 1)  # same name and postcode: worth a look, never marked
        self.assertFalse(any("duplicate_of" in r for r in self.db.workshops.rows))

    async def test_without_a_street_only_a_possible_match_is_reported(self):
        await self.put(shop("TKW-1", "Auto Meyer"), shop("TKW-2", "Auto Meyer", street=None))
        result = await workshop_directory.dedupe(self.db, apply=True)
        self.assertEqual((result["groups"], result["marked"], result["possible_groups"]), (0, 0, 1))

    async def test_same_name_street_in_another_market_or_postcode_is_not_a_duplicate(self):
        await self.put(shop("TKW-1", "Auto Meyer"), shop("TKW-2", "Auto Meyer", zip="52064", city="Aachen"),
                       shop("TKW-3", "Auto Meyer", market="at-AT"))
        result = await workshop_directory.dedupe(self.db)
        self.assertEqual(result["groups"], 0)

    async def test_missing_postcode_falls_back_to_the_city(self):
        await self.put(shop("TKW-1", "Auto Meyer"), shop("TKW-2", "Auto Meyer", zip=None))
        self.assertEqual((await workshop_directory.dedupe(self.db))["would_mark"], 1)

    async def test_blank_or_tiny_names_never_match(self):
        await self.put(shop("TKW-1", ""), shop("TKW-2", ""), shop("TKW-3", "ab"), shop("TKW-4", "AB"))
        self.assertEqual((await workshop_directory.dedupe(self.db))["groups"], 0)

    async def test_the_kept_record_is_the_partner_then_the_more_complete_then_the_lowest_id(self):
        await self.put(shop("TKW-1", "Auto Meyer"), shop("TKW-2", "Auto Meyer", partner_kind="partner"))
        await workshop_directory.dedupe(self.db, apply=True)
        self.assertEqual({r["_id"]: r.get("duplicate_of") for r in self.db.workshops.rows}, {"TKW-1": "TKW-2", "TKW-2": None})
        self.db = Database()
        await self.put(shop("TKW-1", "Auto Meyer"), shop("TKW-2", "Auto Meyer", tel="+49241123456", web="https://example.invalid"))
        await workshop_directory.dedupe(self.db, apply=True)
        self.assertEqual({r["_id"]: r.get("duplicate_of") for r in self.db.workshops.rows}, {"TKW-1": "TKW-2", "TKW-2": None})
        self.db = Database()
        await self.put(shop("TKW-7", "Auto Meyer"), shop("TKW-3", "Auto Meyer"), shop("TKW-5", "Auto Meyer"))
        await workshop_directory.dedupe(self.db, apply=True)
        self.assertEqual({r["_id"]: r.get("duplicate_of") for r in self.db.workshops.rows}, {"TKW-7": "TKW-3", "TKW-3": None, "TKW-5": "TKW-3"})

    async def test_two_partners_in_one_group_are_left_for_a_person(self):
        await self.put(shop("TKW-1", "Auto Meyer", partner_kind="partner"), shop("TKW-2", "Auto Meyer", partner_kind="partner"))
        result = await workshop_directory.dedupe(self.db, apply=True)
        self.assertEqual((result["marked"], result["needs_review"]), (0, 1))
        self.assertFalse(any("duplicate_of" in r for r in self.db.workshops.rows))

    async def test_the_answer_lists_groups_for_review_and_is_bounded(self):
        await self.put(shop("TKW-1", "Auto Meyer"), shop("TKW-2", "Auto Meyer"))
        result = await workshop_directory.dedupe(self.db)
        self.assertEqual(result["details"], [{"keep": "TKW-1", "duplicates": ["TKW-2"], "rule": "name+strasse+plz", "name": "Auto Meyer"}])
        for n in range(10, 10 + workshop_directory.MAX_DETAILS + 20):
            await self.put(shop("TKW-%d" % n, "Betrieb %d" % n), shop("TKW-X%d" % n, "Betrieb %d" % n))
        result = await workshop_directory.dedupe(self.db)
        self.assertEqual(len(result["details"]), workshop_directory.MAX_DETAILS)
        self.assertEqual(result["groups"], workshop_directory.MAX_DETAILS + 21)

    async def test_the_limit_is_reported_when_the_directory_is_larger(self):
        await self.put(*(shop("TKW-%d" % n, "Betrieb %d" % n) for n in range(5)))
        self.assertTrue((await workshop_directory.dedupe(self.db, limit=5))["remaining_possible"])
        self.assertFalse((await workshop_directory.dedupe(self.db, limit=6))["remaining_possible"])

    async def test_unmark_restores_the_record_and_is_a_dry_run_by_default(self):
        await self.put(shop("TKW-1", "Auto Meyer"), shop("TKW-2", "Auto Meyer"))
        await workshop_directory.dedupe(self.db, apply=True)
        dry = await workshop_directory.unmark(self.db, "TKW-2")
        self.assertEqual((dry["applied"], dry["unmarked"]), (False, 0))
        self.assertEqual(self.db.workshops.rows[1]["duplicate_of"], "TKW-1")
        done = await workshop_directory.unmark(self.db, "TKW-2", apply=True)
        self.assertEqual(done["unmarked"], 1)
        self.assertNotIn("duplicate_of", self.db.workshops.rows[1])
        self.assertTrue(self.db.workshops.rows[1]["duplicate_unmarked_at"])
        self.assertEqual((await workshop_directory.unmark(self.db, "TKW-1", apply=True))["unmarked"], 0)

    async def test_the_tool_is_not_wired_into_any_automatic_path(self):
        for name in ("main.py", "workshops_api.py", "db.py", "admin_api.py"):
            self.assertNotIn("workshop_directory", (ROOT / "apps/shop-api/shop" / name).read_text(), name)


class Blocklist(unittest.TestCase):
    def write(self, content):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        path = Path(directory.name) / "blocklist.json"
        path.write_text(content if isinstance(content, str) else json.dumps(content), encoding="utf-8")
        return path

    def entry(self, **fields):
        return {"grund": "Wunsch des Betriebs", "datum": "2026-11-14", **fields}

    def test_the_shipped_list_is_valid_and_has_no_invented_entry(self):
        loaded = workshop_blocklist.load()
        self.assertEqual(loaded.entries, [])

    def test_blocks_by_id_and_by_normalized_name_and_postcode(self):
        path = self.write({"version": 1, "eintraege": [self.entry(id="TKW-9"), self.entry(name="Auto Meyer GmbH", zip="52 062")]})
        blocked = workshop_blocklist.load(path)
        self.assertTrue(blocked.blocks({"_id": "TKW-9", "name": "egal", "zip": "1"}))
        self.assertTrue(blocked.blocks({"_id": "TKW-77", "name": "auto MEYER", "zip": "52062"}))
        self.assertFalse(blocked.blocks({"_id": "TKW-77", "name": "auto MEYER", "zip": "52064"}))
        self.assertFalse(blocked.blocks({"_id": "TKW-10", "name": "Auto Meyer", "zip": ""}))

    def test_invalid_lists_are_refused_instead_of_ignored(self):
        bad = [
            "{nicht json", [], {"version": 2, "eintraege": []}, {"version": 1}, {"version": 1, "eintraege": "x"},
            {"version": 1, "eintraege": [self.entry()]},                                       # neither id nor name+zip
            {"version": 1, "eintraege": [self.entry(id="a b")]},                               # id not a plain identifier
            {"version": 1, "eintraege": [{"id": "TKW-1"}]},                                    # no reason
            {"version": 1, "eintraege": [self.entry(id="TKW-1", extra=1)]},                    # unknown key
            {"version": 1, "eintraege": [self.entry(name="Nur Name")]},                        # name without postcode
            {"version": 1, "eintraege": [self.entry(id="TKW-1")] * (workshop_blocklist.MAX_ENTRIES + 1)},
        ]
        for content in bad:
            with self.subTest(content=str(content)[:60]):
                with self.assertRaises(workshop_blocklist.BlocklistError):
                    workshop_blocklist.load(self.write(content))

    def test_a_missing_file_is_an_error_not_an_empty_list(self):
        with self.assertRaises(workshop_blocklist.BlocklistError):
            workshop_blocklist.load(Path("/nonexistent/blocklist.json"))


@unittest.skipUnless(HTTP_DEPS, "pinned dependencies unavailable")
class Directory(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = Database()
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        self.list_path = Path(self.dir.name) / "blocklist.json"
        self.block([])
        for patch in (mock.patch.object(workshops_api, "db", self.db), mock.patch.object(workshops_api, "BLOCKLIST_FILE", self.list_path)):
            patch.start()
            self.addCleanup(patch.stop)
        app = FastAPI()
        app.include_router(workshops_api.router)
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://suite.example.invalid")
        self.addAsyncCleanup(self.client.aclose)
        for doc in (shop("TKW-1", "Auto Meyer"), shop("TKW-2", "Auto Meyer", duplicate_of="TKW-1"), shop("TKW-3", "Garage Frei", street="Ring 1"),
                    shop("TKW-4", "Garage Gesperrt", street="Ring 2")):
            await self.db.workshops.insert_one(doc)

    def block(self, entries):
        self.list_path.write_text(json.dumps({"version": 1, "eintraege": entries}), encoding="utf-8")

    async def names(self, q="52062"):
        body = (await self.client.get("/api/workshops/search", params={"q": q})).json()
        return sorted(r["id"] for r in body["results"]), body

    async def test_search_hides_marked_duplicates_but_the_marked_record_stays_stored(self):
        ids, body = await self.names()
        self.assertEqual(ids, ["TKW-1", "TKW-3", "TKW-4"])
        self.assertEqual(body["total"], 3)
        self.assertEqual(len(self.db.workshops.rows), 4)

    async def test_blocked_workshops_vanish_from_search_detail_and_requests(self):
        self.block([{"id": "TKW-4", "grund": "Wunsch des Betriebs", "datum": "2026-11-14"}])
        ids, body = await self.names()
        self.assertEqual(ids, ["TKW-1", "TKW-3"])
        self.assertEqual(body["total"], 2)
        self.assertEqual((await self.client.get("/api/workshops/TKW-4")).status_code, 404)
        self.assertEqual((await self.client.get("/api/workshops/TKW-3")).status_code, 200)
        request = await self.client.post("/api/workshops/TKW-4/requests", json={"name": "Erika Muster", "email": "e@example.invalid", "message": "Bitte um Rueckmeldung", "consent": True})
        self.assertEqual(request.status_code, 404)
        self.assertEqual(self.db.workshop_requests.rows, [])

    async def test_a_blocked_workshop_is_not_found_by_name_and_postcode_after_a_reimport_either(self):
        self.block([{"name": "Garage Gesperrt", "zip": "52062", "grund": "Wunsch des Betriebs", "datum": "2026-11-14"}])
        await self.db.workshops.insert_one(shop("TKW-NEU", "garage gesperrt GmbH", street="Ring 2"))
        ids, _ = await self.names()
        self.assertNotIn("TKW-4", ids)
        self.assertNotIn("TKW-NEU", ids)
        self.assertEqual((await self.client.get("/api/workshops/TKW-NEU")).status_code, 404)

    async def test_blocked_entries_are_also_left_out_of_the_unlocated_list(self):
        await self.db.workshops.insert_one(shop("TKW-5", "Ohne Ort", street="Ring 3", lat=None, lon=None))
        await self.db.workshops.insert_one(shop("TKW-6", "Ohne Ort Gesperrt", street="Ring 4", lat=None, lon=None))
        self.block([{"id": "TKW-6", "grund": "Wunsch des Betriebs", "datum": "2026-11-14"}])
        _, body = await self.names()
        self.assertEqual([u["id"] for u in body["unlocated"]], ["TKW-5"])

    async def test_detail_of_a_marked_duplicate_points_to_the_kept_record(self):
        body = (await self.client.get("/api/workshops/TKW-2")).json()
        self.assertEqual(body["duplicate_of"], "TKW-1")
        self.assertNotIn("duplicate_of", (await self.client.get("/api/workshops/TKW-1")).json())

    async def test_a_broken_blocklist_closes_the_directory_instead_of_showing_everyone(self):
        self.list_path.write_text("{kaputt", encoding="utf-8")
        for url in ("/api/workshops/search?q=52062", "/api/workshops/TKW-1"):
            response = await self.client.get(url)
            self.assertEqual((response.status_code, response.json()["detail"]["error"]), (503, "workshop_blocklist_unavailable"), url)
        self.list_path.unlink()
        self.assertEqual((await self.client.get("/api/workshops/TKW-1")).status_code, 503)

    async def test_a_change_of_the_list_applies_without_a_restart(self):
        self.assertEqual((await self.client.get("/api/workshops/TKW-4")).status_code, 200)
        self.block([{"id": "TKW-4", "grund": "Wunsch des Betriebs", "datum": "2026-11-14"}])
        self.assertEqual((await self.client.get("/api/workshops/TKW-4")).status_code, 404)

    async def test_an_empty_list_changes_nothing_for_visitors(self):
        response = await self.client.get("/api/workshops/TKW-3")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["kind_label"], "Verzeichnisbetrieb")


if __name__ == "__main__":
    unittest.main()

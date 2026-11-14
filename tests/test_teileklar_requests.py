"""Honest workshop request and brand separation of enquiries.

Real routers against the in-memory store; the outbox is replaced by a capture. No network, no MongoDB.
"""
import hashlib
import os
import re
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock

from suite_fakes import ROOT, Database, bind_shop_environment

bind_shop_environment()
try:
    import httpx
    from fastapi import FastAPI
    from shop import accounts_api, brands, mail_templates, mail_templates_teileklar, mailer, nexify_api, requests_api, teileklar_admin_api, workshops_api
    HTTP_DEPS = True
except ImportError:
    HTTP_DEPS = False

INTERNAL = "betrieb-intern@example.invalid"
# Words that would announce something the code does not do, or state terms nobody released.
FORBIDDEN = re.compile(r"kostenfrei|kostenlos|gratis|€|EUR\b|Gebühr|Provision|Werktag|innerhalb von|garantier|verbindlich|"
                       r"wird (sich )?(bei Ihnen )?melden|Werkstatt (ihn )?bestätigt|weitergeleitet|leiten .* weiter", re.I)


class Outbox:
    def __init__(self, internal=INTERNAL):
        self.mails, self.settings = [], {"MAIL_INTERNAL_TO": internal}

    def setting(self, name):
        return self.settings.get(name, "")

    async def enqueue(self, event_key, to, subject, html, text, reply_to="", sender=""):
        if not to:
            return None
        self.mails.append({"key": event_key, "to": to, "subject": subject, "html": html, "text": text, "reply_to": reply_to, "sender": sender})
        return {"status": "wartend"}


class Wording(unittest.TestCase):
    @unittest.skipUnless(HTTP_DEPS, "pinned dependencies unavailable")
    def test_no_text_promises_an_action_or_names_terms(self):
        texts = list(mail_templates_teileklar.WORKSHOP_REQUEST_TEXT.values()) + list(mail_templates_teileklar.WORKSHOP_REQUEST_STATUS.values()) \
            + list(mail_templates_teileklar.APPLICATION_TEXT.values()) + [mail_templates_teileklar.NOT_PARTNER_TEXT]
        for text in texts:
            self.assertIsNone(FORBIDDEN.search(text), text)
        self.assertEqual(set(mail_templates_teileklar.WORKSHOP_REQUEST_TEXT), set(mail_templates_teileklar.WORKSHOP_REQUEST_STATUS))

    def test_former_promise_is_gone_from_the_api_sources(self):
        for name in ("workshops_api.py", "mail_templates.py", "mail_templates_teileklar.py"):
            source = (ROOT / "apps/shop-api/shop" / name).read_text()
            self.assertNotIn("wenn die Werkstatt ihn bestätigt", source, name)
            self.assertNotIn("Anfrage gesendet", source, name)


@unittest.skipUnless(HTTP_DEPS, "pinned dependencies unavailable")
class Base(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db, self.outbox = Database(), Outbox()
        await self.db.workshops.insert_one({"_id": "TKW-1", "name": "Fixture Werkstatt", "zip": "52062", "city": "Aachen", "directory_entry": True})
        await self.db.users.insert_one({"user_id": "admin-1", "email": "admin@example.invalid", "role": "admin"})
        await self.db.users.insert_one({"user_id": "kunde-1", "email": "kunde@example.invalid", "role": "customer", "email_verified": True})
        for token, user in (("admin-token", "admin-1"), ("kunde-token", "kunde-1")):
            await self.db.sessions.insert_one({"token_hash": hashlib.sha256(token.encode()).hexdigest(), "user_id": user,
                                               "expires_at": datetime.now(timezone.utc) + timedelta(hours=1)})
        modules = (accounts_api, workshops_api, requests_api, teileklar_admin_api, nexify_api)
        patches = [mock.patch.object(module, "db", self.db) for module in modules]
        patches += [mock.patch.object(mailer, "enqueue", self.outbox.enqueue), mock.patch.object(mailer, "setting", self.outbox.setting)]
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)
        os.environ.pop(workshops_api.NONPARTNER_SWITCH, None)
        os.environ.pop(teileklar_admin_api.SWITCH, None)
        app = FastAPI()
        for module in (accounts_api, workshops_api, requests_api, teileklar_admin_api, nexify_api):
            app.include_router(module.router)
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://suite.example.invalid")
        self.addAsyncCleanup(self.client.aclose)
        self.admin = {"Authorization": "Bearer admin-token"}
        self.customer = {"Authorization": "Bearer kunde-token"}

    def env(self, **values):
        patch = mock.patch.dict(os.environ, values)
        patch.start()
        self.addCleanup(patch.stop)

    async def ask(self, **change):
        body = {"name": "Erika Muster", "email": "erika@example.invalid", "phone": "", "vehicle": "Golf", "message": "Bremsen prüfen bitte.", "consent": True, **change}
        return await self.client.post("/api/workshops/TKW-1/requests", json=body)

    async def enquiry(self, key, **change):
        body = {"name": "Max Muster", "email": "max@example.invalid", "message": "Bitte um Rückmeldung zum Thema.", "consent": True, **change}
        return await self.client.post("/api/requests", json=body, headers={"Idempotency-Key": key})


class HonestWorkshopRequest(Base):
    async def test_default_stores_tells_the_truth_and_informs_the_operator(self):
        response = await self.ask()
        self.assertEqual(response.status_code, 201, response.text)
        body = response.json()
        self.assertEqual((body["state"], body["workshop_notified"], body["workshop_partner"], body["appointment"]), ("eingegangen_bei_teileklar", False, False, False))
        self.assertEqual(body["message"], mail_templates_teileklar.WORKSHOP_REQUEST_TEXT["eingegangen_bei_teileklar"])
        self.assertIn("nicht benachrichtigt", body["message"])
        stored = await self.db.workshop_requests.find_one({"_id": body["id"]})
        self.assertEqual((stored["brand"], stored["state"], stored["workshop_notified"], stored["operator_notification"]), ("teileklar", body["state"], False, "wartend"))
        receipt, internal = self.outbox.mails
        self.assertEqual((receipt["to"], receipt["sender"]), ("erika@example.invalid", ""))  # default sender = TEILEKLAR
        self.assertIn(body["message"], receipt["text"])
        self.assertIsNone(FORBIDDEN.search(receipt["text"].split("AGB:")[0]), receipt["text"])
        self.assertEqual((internal["to"], internal["reply_to"], internal["key"]), (INTERNAL, "erika@example.invalid", "workshop_request:internal:" + body["id"]))
        self.assertIn("Der Betrieb wurde nicht benachrichtigt", internal["text"])
        # No mail goes to the workshop: it has no address in the directory and no code path sends one.
        self.assertEqual({m["to"] for m in self.outbox.mails}, {"erika@example.invalid", INTERNAL})

    async def test_without_internal_recipient_the_request_is_still_stored_and_marked(self):
        self.outbox.settings["MAIL_INTERNAL_TO"] = ""
        body = (await self.ask()).json()
        self.assertEqual((await self.db.workshop_requests.find_one({"_id": body["id"]}))["operator_notification"], "not_configured")
        self.assertEqual(len(self.outbox.mails), 1)

    async def test_operator_notice_failure_does_not_fail_the_request(self):
        original = self.outbox.enqueue

        async def flaky(event_key, *args, **kwargs):
            if "internal" in event_key:
                raise RuntimeError("fixture")
            return await original(event_key, *args, **kwargs)
        with mock.patch.object(mailer, "enqueue", flaky):
            response = await self.ask()
        self.assertEqual(response.status_code, 201)
        self.assertEqual((await self.db.workshop_requests.find_one({"_id": response.json()["id"]}))["operator_notification"], "unbekannt")

    async def test_switch_reject_stores_nothing_and_points_to_the_workshop(self):
        self.env(**{workshops_api.NONPARTNER_SWITCH: "abweisen"})
        response = await self.ask()
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["detail"], {"error": "workshop_not_partner", "state": "nicht_angenommen", "workshop_notified": False,
                                                     "message": mail_templates_teileklar.NOT_PARTNER_TEXT})
        self.assertEqual((await self.db.workshop_requests.count_documents({}), self.outbox.mails), (0, []))

    async def test_switch_addressed_to_teileklar(self):
        self.env(**{workshops_api.NONPARTNER_SWITCH: "an_teileklar"})
        body = (await self.ask()).json()
        self.assertEqual((body["state"], body["workshop_notified"]), ("einbauwunsch_eingegangen", False))
        self.assertEqual((await self.db.workshop_requests.find_one({"_id": body["id"]}))["addressed_to"], "teileklar")
        self.assertIn("nicht an den Betrieb", body["message"])

    async def test_unknown_switch_value_keeps_the_default(self):
        self.env(**{workshops_api.NONPARTNER_SWITCH: "ABWEISEN"})
        self.assertEqual((await self.ask()).json()["state"], "eingegangen_bei_teileklar")

    async def test_released_partner_is_still_not_reported_as_notified(self):
        await self.db.workshops.update_one({"_id": "TKW-1"}, {"$set": {"partner_kind": "direktpartner"}})
        self.env(**{workshops_api.NONPARTNER_SWITCH: "abweisen"})
        body = (await self.ask()).json()
        self.assertEqual((body["state"], body["workshop_partner"], body["workshop_notified"]), ("eingegangen_partner_nicht_zugestellt", True, False))
        # The public directory view is unchanged: a release is not a publication.
        self.assertEqual((await self.client.get("/api/workshops/TKW-1")).json()["partner"], False)

    async def test_validation_and_unknown_workshop_unchanged(self):
        self.assertEqual((await self.ask(consent=False, message="kurz")).json()["detail"]["fields"], {"message": "too_short", "consent": "required"})
        self.assertEqual((await self.client.post("/api/workshops/unknown/requests", json={})).status_code, 404)

    async def test_legacy_template_entry_no_longer_carries_the_promise(self):
        subject, html, text = mail_templates.workshop_receipt({"_id": "WA-1", "workshop_name": "X"})
        self.assertNotIn("Werkstatt ihn bestätigt", text + html)
        self.assertIn("nicht benachrichtigt", text)


class BrandSeparation(Base):
    def test_derivation_rule(self):
        cases = {("contact", "/kontakt"): "nexify", ("project", ""): "nexify", ("demo", "/teileklarheit"): "nexify", ("contact", None): "nexify",
                 ("partner", "/kontakt"): "teileklar", ("workshop_partner", ""): "teileklar", ("contact", "/teileklar/termine"): "teileklar", ("booking", "/teileklar"): "teileklar"}
        for (kind, path), brand in cases.items():
            self.assertEqual(requests_api.derive_brand(kind, path), brand, (kind, path))

    async def test_new_requests_carry_brand_number_and_brand_mail(self):
        self.outbox.settings["NEXIFY_MAIL_FROM"] = "NeXify AI <post@nexify.example.invalid>"
        nexify = (await self.enquiry("brand-key-nexify-0001", page_path="/kontakt")).json()
        teileklar = (await self.enquiry("brand-key-teileklar-01", kind="partner", company="Fixture GmbH", page_path="/teileklar/partner-werden")).json()
        self.assertEqual((nexify["brand"], nexify["number"][:3], teileklar["brand"], teileklar["number"][:3]), ("nexify", "NX-", "teileklar", "TK-"))
        by_number = {m["subject"].split()[-1]: m for m in self.outbox.mails}
        self.assertEqual(by_number[nexify["number"]]["sender"], "NeXify AI <post@nexify.example.invalid>")
        self.assertIn("NeXify AI", by_number[nexify["number"]]["html"])
        self.assertEqual(by_number[teileklar["number"]]["sender"], "")  # shop default sender: TEILEKLAR
        self.assertIn("TEILEKLAR-Anfrage", by_number[teileklar["number"]]["subject"])
        self.assertNotIn("NeXify AI</td>", by_number[teileklar["number"]]["html"])

    async def test_replay_of_a_request_stored_before_the_brand_existed_still_matches(self):
        first = await self.enquiry("brand-key-replay-0001", page_path="/kontakt")
        await self.db.requests.update_one({"number": first.json()["number"]}, {"$unset": {"brand": ""}})
        again = await self.enquiry("brand-key-replay-0001", page_path="/kontakt")
        self.assertEqual((again.status_code, again.json()["number"], again.json()["brand"]), (201, first.json()["number"], "nexify"))

    async def seed(self):
        await self.enquiry("brand-key-nexify-0002", page_path="/kontakt", email="kunde@example.invalid")
        await self.enquiry("brand-key-teileklar-02", kind="partner", company="Fixture GmbH", page_path="/teileklar/partner-werden", email="kunde@example.invalid")
        # Legacy records without the field, one per brand.
        await self.db.requests.insert_one({"_id": "legacy-nx", "number": "NX-LEGACY-1", "kind": "contact", "page_path": "/kontakt", "email": "kunde@example.invalid",
                                           "name": "A", "message": "m", "status": "eingegangen", "created_at": "2026-10-01T00:00:00+00:00"})
        await self.db.requests.insert_one({"_id": "legacy-tk", "number": "NX-LEGACY-2", "kind": "partner", "page_path": "/teileklar/partner-werden", "email": "kunde@example.invalid",
                                           "name": "B", "message": "m", "status": "eingegangen", "created_at": "2026-10-02T00:00:00+00:00"})
        await self.db.requests.insert_one({"_id": "legacy-old", "number": "NX-LEGACY-3", "email": "kunde@example.invalid", "name": "C", "message": "m",
                                           "status": "eingegangen", "created_at": "2026-09-01T00:00:00+00:00"})

    async def test_read_paths_never_cross_the_brand(self):
        await self.seed()
        self.env(**{teileklar_admin_api.SWITCH: "on"})
        operator = (await self.client.get("/api/operator/requests", headers=self.admin)).json()["items"]
        portal = (await self.client.get("/api/portal/requests", headers=self.customer)).json()["items"]
        inbox = (await self.client.get("/api/admin/teileklar/requests", headers=self.admin)).json()["items"]
        nexify_numbers = {r["number"] for r in operator}
        teileklar_numbers = {r["number"] for r in inbox}
        self.assertEqual(len(nexify_numbers), 3)
        self.assertEqual(len(teileklar_numbers), 2)
        self.assertEqual(nexify_numbers & teileklar_numbers, set())
        self.assertEqual({r["number"] for r in portal}, nexify_numbers)
        self.assertEqual({"NX-LEGACY-1", "NX-LEGACY-3"} - nexify_numbers, set())
        self.assertIn("NX-LEGACY-2", teileklar_numbers)
        self.assertEqual((await self.client.get("/api/portal/overview", headers=self.customer)).json()["counts"]["requests"], 3)
        # The NeXify operator cannot move a TEILEKLAR record through the NeXify pipeline.
        tk = next(n for n in teileklar_numbers if n.startswith("TK-"))
        for number in (tk, "NX-LEGACY-2"):
            self.assertEqual((await self.client.patch("/api/operator/requests/" + number, headers=self.admin, json={"stage": nexify_api.STAGES[1]})).status_code, 404)
        self.assertEqual((await self.client.patch("/api/operator/requests/NX-LEGACY-1", headers=self.admin, json={"stage": nexify_api.STAGES[1]})).status_code, 200)

    async def test_scope_cannot_be_widened_by_the_query(self):
        await self.seed()
        self.assertEqual(await self.db.requests.count_documents(brands.scoped("nexify", {"kind": "partner"})), 0)
        self.assertEqual(await self.db.requests.count_documents(brands.scoped("teileklar", {"kind": "contact"})), 0)
        with self.assertRaises(ValueError):
            brands.scope("anderes")

    async def test_backfill_dry_run_then_apply_adds_fields_and_deletes_nothing(self):
        await self.seed()
        await self.db.workshop_requests.insert_one({"_id": "WA-OLD", "workshop_id": "TKW-1", "status": "Anfrage gesendet – noch kein Termin"})
        before = [dict(row) for row in self.db.requests.rows]
        dry = await brands.backfill(self.db)
        self.assertEqual((dry["applied"], dry["requests"], dry["workshop_requests"]), (False, {"nexify": 2, "teileklar": 1}, {"teileklar": 1}))
        self.assertEqual([dict(row) for row in self.db.requests.rows], before)
        done = await brands.backfill(self.db, apply=True)
        self.assertEqual((done["applied"], done["requests"]), (True, {"nexify": 2, "teileklar": 1}))
        self.assertEqual(len(self.db.requests.rows), len(before))
        for old, new in zip(before, self.db.requests.rows):
            self.assertEqual({k: v for k, v in new.items() if k not in ("brand", "brand_backfilled_at")}, {k: v for k, v in old.items() if k != "brand"})
            self.assertIn(new["brand"], brands.BRANDS)
        self.assertEqual({r["_id"]: r["brand"] for r in self.db.requests.rows if r["_id"].startswith("legacy")},
                         {"legacy-nx": "nexify", "legacy-tk": "teileklar", "legacy-old": "nexify"})
        self.assertEqual((await self.db.workshop_requests.find_one({"_id": "WA-OLD"}))["brand"], "teileklar")
        again = await brands.backfill(self.db, apply=True)
        self.assertEqual((again["requests"], again["workshop_requests"]), ({"nexify": 0, "teileklar": 0}, {"teileklar": 0}))

    def test_backfill_is_not_wired_into_any_startup_or_route(self):
        for path in (ROOT / "apps/shop-api").rglob("*.py"):
            if path.name not in ("brands.py",) and "tests" not in path.parts:
                self.assertNotIn("backfill(", path.read_text(), path.name)


class OperatorInbox(Base):
    async def test_switch_role_and_content(self):
        await self.ask()
        for path in ("/api/admin/teileklar/workshop-requests", "/api/admin/teileklar/requests"):
            self.assertEqual((await self.client.get(path, headers=self.admin)).status_code, 404)  # switch off
        self.env(**{teileklar_admin_api.SWITCH: "on"})
        for path in ("/api/admin/teileklar/workshop-requests", "/api/admin/teileklar/requests"):
            self.assertEqual((await self.client.get(path)).status_code, 401)
            self.assertEqual((await self.client.get(path, headers=self.customer)).status_code, 403)
        items = (await self.client.get("/api/admin/teileklar/workshop-requests", headers=self.admin)).json()["items"]
        self.assertEqual([(i["state"], i["workshop_notified"], i["operator_notification"]) for i in items], [("eingegangen_bei_teileklar", False, "wartend")])


if __name__ == "__main__":
    unittest.main()

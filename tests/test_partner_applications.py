"""Partner application: switch, status model, review log, assignment, release conditions, notices.

Real router against the in-memory store; the notifier port is replaced by a capture. No network.
"""
import ast
import copy
import hashlib
import json
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
    from shop import accounts_api, mail_templates_teileklar, partners_api
    HTTP_DEPS = True
except ImportError:
    HTTP_DEPS = False

SHOP = ROOT / "apps/shop-api/shop"
POLICY = json.loads((SHOP / "partner_policy.json").read_text(encoding="utf-8"))
MONEY = re.compile(r"€|\bEUR\b|eur\b|preis|gebuehr|gebühr|kostenfrei|kostenlos|provision|netto|brutto|frist|werktag", re.I)


class Capture:
    def __init__(self):
        self.applicant_mails, self.operator_mails, self.fail = [], [], False

    async def applicant(self, application, note):
        if self.fail:
            raise RuntimeError("fixture")
        self.applicant_mails.append((application["status"], note, mail_templates_teileklar.application_status(application, note)[2]))
        return "wartend"

    async def operator(self, application):
        self.operator_mails.append(application["number"])
        return "wartend"


class ShippedPolicy(unittest.TestCase):
    def test_shipped_configuration_releases_nothing_and_names_no_terms(self):
        self.assertIs(POLICY["freigabe_inhaber"], False)
        self.assertEqual(POLICY["pilot"]["direktpartner_max"], 25)
        self.assertEqual([k["id"] for k in POLICY["partnerstufen"]], ["verzeichnisbetrieb", "direktpartner"])
        directory, direct = POLICY["partnerstufen"]
        self.assertEqual((directory["anfrageformular"], directory["kennzeichen"], directory["vertrag"], directory["durch_antrag_erreichbar"]), (False, False, False, False))
        self.assertEqual((direct["vertrag"], direct["durch_antrag_erreichbar"]), (True, True))
        self.assertEqual(len(POLICY["freischaltkriterien"]), 8)
        body = {k: v for k, v in POLICY.items() if not k.startswith("_")}
        self.assertIsNone(MONEY.search(json.dumps(body, ensure_ascii=False)))

    @unittest.skipUnless(HTTP_DEPS, "pinned dependencies unavailable")
    def test_policy_validation_rejects_inconsistent_configuration(self):
        partners_api.validate_policy(copy.deepcopy(POLICY))
        def broken(change):
            data = copy.deepcopy(POLICY)
            change(data)
            with self.assertRaises((ValueError, KeyError, TypeError)):
                partners_api.validate_policy(data)
        broken(lambda d: d["partnerantrag"]["uebergaenge"]["eingegangen"].append("unbekannt"))
        broken(lambda d: d["partnerantrag"]["statuswerte"].append("neu_ohne_text"))
        broken(lambda d: d["partnerantrag"]["uebergaenge"]["freigegeben"].append("abgelehnt"))
        broken(lambda d: d.update(freigabe_inhaber="ja"))
        broken(lambda d: d.pop("pilot"))
        broken(lambda d: d["freischaltkriterien"].append(dict(d["freischaltkriterien"][0])))

    def test_module_holds_no_definitions_or_terms(self):
        source = (SHOP / "partners_api.py").read_text()
        for word in ('"direktpartner"', '"verzeichnisbetrieb"', "K1_", "K8_"):
            self.assertNotIn(word, source.split('"""', 2)[2], word)
        code = "\n".join(line for line in source.split('"""', 2)[2].splitlines() if not line.strip().startswith("#"))
        self.assertIsNone(re.search(r"€|kostenfrei|kostenlos|Gebühr|Provision", code))

    def test_every_operator_route_requires_the_operator_role_and_the_switch(self):
        checked = 0
        for name in ("partners_api.py", "teileklar_admin_api.py"):
            tree = ast.parse((SHOP / name).read_text())
            prefix = next((kw.value.value for node in ast.walk(tree) if isinstance(node, ast.Call) and getattr(node.func, "id", "") == "APIRouter"
                           for kw in node.keywords if kw.arg == "prefix"), "")
            for node in tree.body:
                if not isinstance(node, ast.AsyncFunctionDef):
                    continue
                paths = [prefix + d.args[0].value for d in node.decorator_list if isinstance(d, ast.Call) and d.args and isinstance(d.args[0], ast.Constant)]
                if not paths:
                    continue
                calls = {n.func.id for n in ast.walk(node) if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)}
                self.assertIn("require_enabled", calls, node.name)
                if any(path.startswith("/api/admin") for path in paths):
                    self.assertIn("require_admin", ast.dump(node.args), node.name)
                    checked += 1
        self.assertGreaterEqual(checked, 10)

    def test_no_deletion_in_the_partner_modules(self):
        for name in ("partners_api.py", "teileklar_admin_api.py", "brands.py"):
            self.assertIsNone(re.search(r"\.(delete_one|delete_many|drop)\(", (SHOP / name).read_text()), name)


@unittest.skipUnless(HTTP_DEPS, "pinned dependencies unavailable")
class Flow(unittest.IsolatedAsyncioTestCase):
    RELEASED = True
    LIMIT = 25

    async def asyncSetUp(self):
        self.db, self.capture = Database(), Capture()
        await self.db.partner_applications.create_index("number", unique=True)
        await self.db.partner_applications.create_index("open_key", unique=True)
        for wid in ("TKW-1", "TKW-2"):
            await self.db.workshops.insert_one({"_id": wid, "name": "Fixture " + wid, "directory_entry": True})
        for user, role in (("admin-1", "admin"), ("admin-2", "admin"), ("kunde-1", "customer")):
            await self.db.users.insert_one({"user_id": user, "email": user + "@example.invalid", "role": role})
            await self.db.sessions.insert_one({"token_hash": hashlib.sha256((user + "-token").encode()).hexdigest(), "user_id": user,
                                               "expires_at": datetime.now(timezone.utc) + timedelta(hours=1)})
        policy = copy.deepcopy(POLICY)
        policy["freigabe_inhaber"], policy["pilot"]["direktpartner_max"] = self.RELEASED, self.LIMIT
        patches = [mock.patch.object(partners_api, "db", self.db), mock.patch.object(accounts_api, "db", self.db),
                   mock.patch.object(partners_api, "notifier", self.capture), mock.patch.object(partners_api, "_policy", policy),
                   mock.patch.dict(os.environ, {partners_api.SWITCH: "on"})]
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)
        app = FastAPI()
        app.include_router(partners_api.router)
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://suite.example.invalid")
        self.addAsyncCleanup(self.client.aclose)
        self.admin, self.admin2, self.customer = ({"Authorization": "Bearer %s-token" % u} for u in ("admin-1", "admin-2", "kunde-1"))
        self.keys = 0

    async def submit(self, key=None, **change):
        self.keys += 1
        body = {"company": "Fixture Kfz GmbH", "contact_name": "Erika Muster", "email": "werkstatt%d@example.invalid" % self.keys,
                "message": "Wir möchten Partner werden.", "consent": True, **change}
        return await self.client.post("/api/partner-applications", json=body, headers={"Idempotency-Key": key or "partner-key-%012d" % self.keys})

    async def decide(self, number, status, headers=None, **body):
        return await self.client.post("/api/admin/partner-applications/%s/status" % number, headers=headers or self.admin, json={"status": status, **body})

    async def fulfil(self, number, skip=()):
        for criterion in POLICY["freischaltkriterien"]:
            if criterion["id"] not in skip:
                result = await self.client.post("/api/admin/partner-applications/%s/criteria" % number, headers=self.admin,
                                                json={"criterion": criterion["id"], "result": "erfuellt", "note": "Nachweis gesehen"})
                self.assertEqual(result.status_code, 200, result.text)

    async def ready_for_release(self, workshop="TKW-1"):
        number = (await self.submit()).json()["number"]
        self.assertEqual((await self.decide(number, "in_pruefung")).status_code, 200)
        self.assertEqual((await self.client.post("/api/admin/partner-applications/%s/workshop" % number, headers=self.admin, json={"workshop_id": workshop})).status_code, 200)
        await self.fulfil(number)
        return number

    async def test_switch_off_means_the_feature_does_not_exist(self):
        number = (await self.submit()).json()["number"]
        for value in ("", "ON", "true", "1"):
            with mock.patch.dict(os.environ, {partners_api.SWITCH: value}):
                self.assertEqual((await self.submit()).status_code, 404)
                self.assertEqual((await self.client.get("/api/partner-applications/" + number)).status_code, 404)
                self.assertEqual((await self.client.get("/api/admin/partner-applications", headers=self.admin)).status_code, 404)
                self.assertEqual((await self.decide(number, "in_pruefung")).status_code, 404)
        self.assertEqual(len(self.db.partner_applications.rows), 1)

    async def test_submit_validation_receipt_and_notices(self):
        bad = await self.submit(company="", email="x", consent=False, claimed_workshop_id="unknown", herkunft="gekauft")
        self.assertEqual((bad.status_code, bad.json()["detail"]["fields"]),
                         (422, {"company": "required", "email": "invalid", "herkunft": "invalid", "consent": "required", "claimed_workshop_id": "unknown"}))
        self.assertEqual((await self.client.post("/api/partner-applications", json={"company": "Fixture", "contact_name": "Erika", "email": "a@example.invalid", "consent": True})).status_code, 400)
        ok = await self.submit(claimed_workshop_id="TKW-1", herkunft="direkt")
        self.assertEqual(ok.status_code, 201, ok.text)
        body = ok.json()
        self.assertEqual((body["status"], body["status_label"]), ("eingegangen", "Eingegangen"))
        self.assertRegex(body["number"], r"^TKP-\d{8}-[0-9A-F]{12}$")
        self.assertIn("nicht zugesagt", body["message"])
        self.assertNotIn("review_log", body)
        stored = self.db.partner_applications.rows[0]
        self.assertEqual((stored["brand"], stored["claimed_workshop_id"], stored["workshop_id"], stored["partner_kind"]), ("teileklar", "TKW-1", None, None))
        self.assertNotIn(body["access_token"], json.dumps(stored))  # only a digest is kept
        self.assertEqual(([m[0] for m in self.capture.applicant_mails], self.capture.operator_mails), (["eingegangen"], [body["number"]]))

    async def test_idempotent_replay_conflict_duplicate_and_rate_limit(self):
        first = await self.submit(key="partner-key-replay-0001", email="same@example.invalid")
        again = await self.client.post("/api/partner-applications", headers={"Idempotency-Key": "partner-key-replay-0001"},
                                       json={"company": "Fixture Kfz GmbH", "contact_name": "Erika Muster", "email": "same@example.invalid", "message": "Wir möchten Partner werden.", "consent": True})
        self.assertEqual((again.status_code, again.json()["number"], again.json()["access_token"]), (201, first.json()["number"], None))
        changed = await self.submit(key="partner-key-replay-0001", email="same@example.invalid", company="Andere GmbH")
        self.assertEqual((changed.status_code, changed.json()["detail"]["error"]), (409, "idempotency_conflict"))
        duplicate = await self.submit(email="SAME@example.invalid")
        self.assertEqual((duplicate.status_code, duplicate.json()["detail"]["error"]), (409, "application_already_open"))
        self.assertEqual((len(self.db.partner_applications.rows), len(self.capture.operator_mails)), (1, 1))
        # After the first one is closed the address may apply again; five per hour at most.
        self.assertEqual((await self.client.post("/api/partner-applications/%s/withdraw" % first.json()["number"], headers={"X-Application-Token": first.json()["access_token"]})).status_code, 200)
        for _ in range(4):
            response = await self.submit(email="same@example.invalid")
            self.assertEqual(response.status_code, 201, response.text)
            await self.client.post("/api/partner-applications/%s/withdraw" % response.json()["number"], headers={"X-Application-Token": response.json()["access_token"]})
        self.assertEqual((await self.submit(email="same@example.invalid")).status_code, 429)

    async def test_applicant_sees_only_the_own_application_and_never_the_review_log(self):
        mine, other = (await self.submit()).json(), (await self.submit()).json()
        await self.decide(mine["number"], "in_pruefung")
        await self.decide(mine["number"], "abgelehnt", reason="Interner Grund, nicht für den Antragsteller")
        view = await self.client.get("/api/partner-applications/" + mine["number"], headers={"X-Application-Token": mine["access_token"]})
        self.assertEqual((view.status_code, view.json()["status"]), (200, "abgelehnt"))
        self.assertEqual(set(view.json()), {"number", "status", "status_label", "company", "created_at", "updated_at", "message"})
        self.assertNotIn("Interner Grund", view.text)
        for number, token in ((mine["number"], other["access_token"]), (mine["number"], None), (other["number"], mine["access_token"]),
                              ("TKP-20260101-000000000000", mine["access_token"]), ("x", mine["access_token"])):
            headers = {"X-Application-Token": token} if token else {}
            self.assertEqual((await self.client.get("/api/partner-applications/" + number, headers=headers)).status_code, 404)
            self.assertEqual((await self.client.post("/api/partner-applications/%s/withdraw" % number, headers=headers)).status_code, 404)

    async def test_operator_routes_need_the_operator_role(self):
        number = (await self.submit()).json()["number"]
        base = "/api/admin/partner-applications"
        calls = [("get", base, None), ("get", base + "/policy", None), ("get", base + "/" + number, None), ("post", base + "/%s/status" % number, {"status": "in_pruefung"}),
                 ("post", base + "/%s/workshop" % number, {"workshop_id": "TKW-1"}), ("post", base + "/%s/criteria" % number, {"criterion": "K4_rueckruf", "result": "erfuellt"}),
                 ("post", base + "/%s/archive" % number, None), ("post", base + "/%s/restore" % number, None)]
        for method, path, body in calls:
            kwargs = {"json": body} if body else {}
            self.assertEqual((await getattr(self.client, method)(path, **kwargs)).status_code, 401, path)
            self.assertEqual((await getattr(self.client, method)(path, headers=self.customer, **kwargs)).status_code, 403, path)
        self.assertEqual(self.db.partner_applications.rows[0]["status"], "eingegangen")

    async def test_every_transition_is_decided_by_the_configuration(self):
        flow = POLICY["partnerantrag"]
        paths = {"eingegangen": [], "in_pruefung": ["in_pruefung"], "rueckfrage": ["in_pruefung", "rueckfrage"], "abgelehnt": ["in_pruefung", "abgelehnt"],
                 "verfallen": ["in_pruefung", "rueckfrage", "verfallen"], "zurueckgezogen": ["zurueckgezogen"]}
        for start, route in paths.items():
            for target in flow["statuswerte"]:
                if target == "freigegeben":
                    continue  # release has its own conditions, tested separately
                with self.subTest(start=start, target=target):
                    number = (await self.submit()).json()["number"]
                    for step in route:
                        self.assertEqual((await self.decide(number, step, reason="Fixture-Begründung", message_to_applicant="Bitte Nachweis senden")).status_code, 200)
                    response = await self.decide(number, target, reason="Fixture-Begründung", message_to_applicant="Hinweis")
                    allowed = target in flow["uebergaenge"][start]
                    self.assertEqual(response.status_code, 200 if allowed else 409, response.text)
                    stored = next(r for r in self.db.partner_applications.rows if r["number"] == number)
                    self.assertEqual(stored["status"], target if allowed else start)
                    if not allowed:
                        self.assertEqual(response.json()["detail"], {"error": "transition_not_allowed", "from": start, "to": target})
                    # close it so the next sub-test may use a fresh address without piling up open ones
        self.assertEqual((await self.decide((await self.submit()).json()["number"], "unbekannt")).status_code, 422)

    async def test_reason_is_required_where_the_configuration_says_so_and_stays_internal(self):
        submitted = (await self.submit()).json()
        number = submitted["number"]
        await self.decide(number, "in_pruefung")
        missing = await self.decide(number, "rueckfrage")
        self.assertEqual((missing.status_code, missing.json()["detail"]["error"]), (422, "reason_required"))
        ok = await self.decide(number, "rueckfrage", reason="Gewerbenachweis fehlt (intern)", message_to_applicant="Bitte senden Sie uns den Gewerbenachweis.")
        self.assertEqual(ok.status_code, 200)
        status, note, text = self.capture.applicant_mails[-1]
        self.assertEqual((status, note), ("rueckfrage", "Bitte senden Sie uns den Gewerbenachweis."))
        self.assertIn("Bitte senden Sie uns den Gewerbenachweis.", text)
        self.assertNotIn("(intern)", text)
        log = ok.json()["review_log"]
        self.assertEqual([(e["action"], e.get("from"), e.get("to"), e["actor"]) for e in log],
                         [("status", None, "eingegangen", "antragsteller"), ("status", "eingegangen", "in_pruefung", "admin-1"), ("status", "in_pruefung", "rueckfrage", "admin-1")])
        self.assertEqual(log[-1]["reason"], "Gewerbenachweis fehlt (intern)")
        self.assertTrue(all(e["at"] for e in log))
        self.assertEqual([m[0] for m in self.capture.applicant_mails], ["eingegangen", "in_pruefung", "rueckfrage"])

    async def test_applicant_may_only_withdraw(self):
        submitted = (await self.submit()).json()
        token = {"X-Application-Token": submitted["access_token"]}
        withdrawn = await self.client.post("/api/partner-applications/%s/withdraw" % submitted["number"], headers=token)
        self.assertEqual((withdrawn.status_code, withdrawn.json()["status"]), (200, "zurueckgezogen"))
        self.assertEqual((await self.client.post("/api/partner-applications/%s/withdraw" % submitted["number"], headers=token)).status_code, 409)
        stored = self.db.partner_applications.rows[0]
        self.assertEqual((stored["review_log"][-1]["actor"], stored["open_key"]), ("antragsteller", "closed:" + stored["_id"]))

    async def test_assignment_to_an_existing_directory_entry(self):
        first, second = (await self.submit()).json()["number"], (await self.submit()).json()["number"]
        assign = lambda number, wid: self.client.post("/api/admin/partner-applications/%s/workshop" % number, headers=self.admin, json={"workshop_id": wid})
        self.assertEqual((await assign(first, "unknown")).status_code, 422)
        self.assertEqual((await assign(first, "TKW-1")).json()["workshop_id"], "TKW-1")
        self.assertEqual((await assign(second, "TKW-1")).json()["detail"]["error"], "workshop_already_assigned")
        self.assertEqual((await assign(first, "TKW-2")).json()["workshop_id"], "TKW-2")  # correction is logged, not overwritten silently
        log = self.db.partner_applications.rows[0]["review_log"]
        self.assertEqual([(e["action"], e.get("workshop_id"), e.get("previous")) for e in log if e["action"] == "workshop"], [("workshop", "TKW-1", None), ("workshop", "TKW-2", "TKW-1")])
        self.assertEqual((await assign(second, "TKW-1")).status_code, 200)  # free again
        await self.decide(second, "zurueckgezogen")
        self.assertEqual((await assign(second, "TKW-2")).json()["detail"]["error"], "application_closed")
        # The directory entry itself is untouched by an assignment.
        self.assertEqual(await self.db.workshops.find_one({"_id": "TKW-2"}), {"_id": "TKW-2", "name": "Fixture TKW-2", "directory_entry": True})

    async def test_release_needs_assignment_and_every_criterion(self):
        number = (await self.submit()).json()["number"]
        await self.decide(number, "in_pruefung")
        blocked = await self.decide(number, "freigegeben")
        self.assertEqual(blocked.status_code, 409)
        self.assertEqual(blocked.json()["detail"]["open"], ["workshop_assignment_required"] + ["criterion:" + c["id"] for c in POLICY["freischaltkriterien"]])
        await self.client.post("/api/admin/partner-applications/%s/workshop" % number, headers=self.admin, json={"workshop_id": "TKW-1"})
        await self.fulfil(number, skip=("K5_ust_id_falls_vorhanden", "K7_vereinbarung_bestaetigt"))
        criteria = lambda **body: self.client.post("/api/admin/partner-applications/%s/criteria" % number, headers=self.admin2, json=body)
        self.assertEqual((await criteria(criterion="K7_vereinbarung_bestaetigt", result="nicht_anwendbar")).status_code, 422)
        self.assertEqual((await criteria(criterion="K9_erfunden", result="erfuellt")).status_code, 422)
        self.assertEqual((await criteria(criterion="K5_ust_id_falls_vorhanden", result="vielleicht")).status_code, 422)
        self.assertEqual((await criteria(criterion="K5_ust_id_falls_vorhanden", result="nicht_anwendbar")).json()["criteria_open"], ["K7_vereinbarung_bestaetigt"])
        self.assertEqual((await criteria(criterion="K7_vereinbarung_bestaetigt", result="nicht_erfuellt")).json()["criteria_open"], ["K7_vereinbarung_bestaetigt"])
        self.assertEqual((await self.decide(number, "freigegeben")).json()["detail"]["open"], ["criterion:K7_vereinbarung_bestaetigt"])
        self.assertEqual((await criteria(criterion="K7_vereinbarung_bestaetigt", result="erfuellt", note="Fassung gesehen")).json()["criteria_open"], [])
        released = await self.decide(number, "freigegeben")
        self.assertEqual((released.status_code, released.json()["status"], released.json()["partner_kind"]), (200, "freigegeben", "direktpartner"))
        workshop = await self.db.workshops.find_one({"_id": "TKW-1"})
        self.assertEqual((workshop["partner_kind"], workshop["partner_application"]), ("direktpartner", number))
        self.assertIsNone((await self.db.workshops.find_one({"_id": "TKW-2"})).get("partner_kind"))
        entries = [e for e in released.json()["review_log"] if e["action"] == "criterion" and e["criterion"] == "K7_vereinbarung_bestaetigt"]
        self.assertEqual([(e["result"], e["actor"]) for e in entries], [("nicht_erfuellt", "admin-2"), ("erfuellt", "admin-2")])  # history kept
        self.assertIn("noch keine Veröffentlichung", self.capture.applicant_mails[-1][2])
        self.assertEqual((await self.decide(number, "abgelehnt", reason="zu spät")).status_code, 409)
        self.assertEqual((await criteria(criterion="K4_rueckruf", result="nicht_erfuellt")).status_code, 409)

    async def test_notice_failure_does_not_undo_the_decision(self):
        number = (await self.submit()).json()["number"]
        self.capture.fail = True
        self.assertEqual((await self.decide(number, "in_pruefung")).json()["notification_status"], "unbekannt")
        self.assertEqual(self.db.partner_applications.rows[0]["status"], "in_pruefung")

    async def test_concurrent_decision_on_a_changed_application_is_refused(self):
        number = (await self.submit()).json()["number"]
        stale = await partners_api.by_number(number)
        await self.decide(number, "in_pruefung")
        with self.assertRaises(Exception) as caught:
            await partners_api.change_status(stale, "zurueckgezogen", actor="admin-2")
        self.assertEqual(caught.exception.detail, {"error": "application_changed"})
        self.assertEqual(self.db.partner_applications.rows[0]["status"], "in_pruefung")

    async def test_archive_and_restore_keep_the_record(self):
        number = (await self.submit()).json()["number"]
        archive = lambda action: self.client.post("/api/admin/partner-applications/%s/%s" % (number, action), headers=self.admin)
        self.assertEqual((await archive("archive")).json()["detail"], {"error": "not_archivable", "status": "eingegangen"})
        await self.decide(number, "zurueckgezogen")
        archived = await archive("archive")
        self.assertEqual((archived.status_code, archived.json()["archived_by"], bool(archived.json()["archived_at"])), (200, "admin-1", True))
        self.assertEqual((await archive("archive")).status_code, 409)
        listing = lambda **params: self.client.get("/api/admin/partner-applications", headers=self.admin, params=params)
        self.assertEqual((await listing()).json()["items"], [])
        self.assertEqual([i["number"] for i in (await listing(archived="true")).json()["items"]], [number])
        self.assertEqual((await archive("restore")).json()["archived_at"], None)
        self.assertEqual((await archive("restore")).status_code, 409)
        self.assertEqual([i["number"] for i in (await listing(status="zurueckgezogen")).json()["items"]], [number])
        self.assertEqual((await listing(status="erfunden")).status_code, 422)
        row = self.db.partner_applications.rows[0]
        self.assertEqual((len(self.db.partner_applications.rows), row["status"], [e["action"] for e in row["review_log"]][-2:]), (1, "zurueckgezogen", ["archive", "restore"]))

    async def test_operator_view_and_policy_route(self):
        number = (await self.submit()).json()["number"]
        view = (await self.client.get("/api/admin/partner-applications/" + number, headers=self.admin)).json()
        self.assertEqual((view["allowed_transitions"], len(view["criteria_open"])), (["in_pruefung", "zurueckgezogen"], 8))
        for hidden in ("access_token_hash", "open_key", "payload_hash"):
            self.assertNotIn(hidden, view)
        policy = (await self.client.get("/api/admin/partner-applications/policy", headers=self.admin)).json()
        self.assertEqual((policy["release_possible"], policy["released_applications"], policy["policy"]["pilot"]), (True, 0, {"direktpartner_max": self.LIMIT}))


@unittest.skipUnless(HTTP_DEPS, "pinned dependencies unavailable")
class NotReleasedPolicy(Flow):
    """The shipped state: reviewable, but no release."""
    RELEASED = False

    async def test_release_is_blocked_until_the_owner_released_the_policy(self):
        number = await self.ready_for_release()
        blocked = await self.decide(number, "freigegeben")
        self.assertEqual((blocked.status_code, blocked.json()["detail"]), (409, {"error": "release_not_possible", "open": ["partner_policy_not_released"]}))
        self.assertEqual(self.db.partner_applications.rows[-1]["status"], "in_pruefung")
        self.assertIsNone((await self.db.workshops.find_one({"_id": "TKW-1"})).get("partner_kind"))
        self.assertNotIn("freigegeben", [m[0] for m in self.capture.applicant_mails])

    async def test_release_needs_assignment_and_every_criterion(self):
        self.skipTest("covered with a released policy")

    async def test_operator_view_and_policy_route(self):
        policy = (await self.client.get("/api/admin/partner-applications/policy", headers=self.admin)).json()
        self.assertIs(policy["release_possible"], False)


@unittest.skipUnless(HTTP_DEPS, "pinned dependencies unavailable")
class PilotLimit(Flow):
    LIMIT = 1

    async def test_pilot_limit_stops_further_releases(self):
        first, second = await self.ready_for_release("TKW-1"), await self.ready_for_release("TKW-2")
        self.assertEqual((await self.decide(first, "freigegeben")).status_code, 200)
        blocked = await self.decide(second, "freigegeben")
        self.assertEqual((blocked.status_code, blocked.json()["detail"]["open"]), (409, ["pilot_limit_reached"]))
        self.assertIsNone((await self.db.workshops.find_one({"_id": "TKW-2"})).get("partner_kind"))

    async def test_release_needs_assignment_and_every_criterion(self):
        self.skipTest("covered with the default limit")


@unittest.skipUnless(HTTP_DEPS, "pinned dependencies unavailable")
class MissingPolicy(unittest.IsolatedAsyncioTestCase):
    async def test_unreadable_policy_makes_the_feature_unavailable_instead_of_inventing_defaults(self):
        app = FastAPI()
        app.include_router(partners_api.router)
        with mock.patch.object(partners_api, "_policy", None), mock.patch.object(partners_api, "POLICY_FILE", SHOP / "missing.json"), \
                mock.patch.dict(os.environ, {partners_api.SWITCH: "on"}), mock.patch.object(partners_api, "db", Database()):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://suite.example.invalid") as client:
                response = await client.post("/api/partner-applications", json={}, headers={"Idempotency-Key": "partner-key-000000000001"})
                self.assertEqual((response.status_code, response.json()["detail"]), (503, {"error": "partner_policy_unavailable"}))


if __name__ == "__main__":
    unittest.main()

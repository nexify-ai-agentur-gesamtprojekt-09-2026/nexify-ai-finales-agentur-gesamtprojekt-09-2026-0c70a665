"""Prüft das Lösungs- und Zugangsregister und sein Prüfwerkzeug.

Offline, ohne Netz und ohne Schlüssel. Die Beispielwerte für die Geheimnis-Erkennung
werden zur Laufzeit zusammengesetzt, damit diese Datei selbst keine Zeichenfolge
enthält, die wie ein Schlüssel aussieht.
"""
import copy
import importlib.util
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("check_loesungsregister", ROOT / "tools/check_loesungsregister.py")
clr = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(clr)

KONTO_ID = "a112f895c19e0d65f6f64b3e89f747f8"
PFLICHT = {
    "vercel", "cloudflare-konto", "cloudflare-workers", "cloudflare-r2", "cloudflare-ai-gateway",
    "cloudflare-mcp-portal", "cloudflare-access", "cloudflare-dns", "hostinger-srv1941843",
    "hostinger-srv1243952", "traefik", "hermes", "hermes-webui", "paperclip", "9router",
    "openrouter-deepseek", "cognee-server", "cognee-plugin-lokal", "lightrag", "agentmemory",
    "graphify", "mem", "notion", "kb-gateway", "librechat", "aionui", "dify", "lobehub", "supabase",
    "mongodb", "composio-for-you", "composio-platform", "resend", "revolut", "bigbuy", "hubspot",
    "sentry", "posthog", "github", "github-actions", "gitlab", "n8n", "upstash", "convex", "openbao",
    "searxng", "bookstack", "bisheng", "gowa", "clerk", "emergent", "linear", "slack", "google-workspace",
}


def register():
    return json.loads((ROOT / clr.REGISTER).read_text(encoding="utf-8"))


def beispiele():
    """Zeichenfolgen in der Form gängiger Schlüssel, zur Laufzeit zusammengesetzt."""
    lang = "Ab3" * 14
    return {
        "sk-": "sk" + "-" + lang,
        "sk_": "sk" + "_live_" + lang,
        "ghp_": "gh" + "p_" + lang,
        "github_pat_": "github" + "_pat_" + lang,
        "cfat_": "cf" + "at_" + lang,
        "cfut_": "cf" + "ut_" + lang,
        "cfast_": "cf" + "ast_" + lang,
        "re_": "re" + "_" + lang,
        "ck_": "ck" + "_" + lang,
        "xoxb-": "xo" + "xb-" + "1234567890-abcdefghij",
        "JWT": ".".join(["ey" + "J" + "hbGciOiJIUzI1NiJ9", "ey" + "J" + "zdWIiOiIxMjM0NTY3ODkwIn0", "c2lnbmF0dXJl" * 2]),
        "hex32": "0123456789abcdef" * 2,
        "hex64": "fedcba9876543210" * 4,
        "zufall": "Qw7" + "eRt9YuI2oP4aSd6FgH8jK1lZx3CvB5nM",
        "privat": "-----BEGIN " + "RSA PRIVATE KEY-----",
        "bearer": "Bearer " + "abcdefghijklmnopqrstuvwx",
        "adresse": "postgres" + "://benutzer:" + "kennwort" + "@db.example.org/x",
        "AKIA": "AK" + "IA" + "ABCDEFGHIJKLMNOP",
    }


class Schema(unittest.TestCase):
    def test_register_is_valid(self):
        self.assertEqual(clr.validate(register()), [])

    def test_ids_are_unique_and_cover_the_required_solutions(self):
        ids = [x["id"] for x in register()["loesungen"]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(PFLICHT - set(ids), set())

    def test_every_solution_has_tags_and_wann_nutzen(self):
        for item in register()["loesungen"]:
            with self.subTest(item["id"]):
                self.assertGreaterEqual(len(item["tags"]), 2)
                for tag in item["tags"]:
                    self.assertEqual(tag, tag.lower())
                    self.assertNotIn(" ", tag)
                self.assertGreaterEqual(len(item["wann_nutzen"]), 10)
                self.assertIn(item["zustand"]["status"], clr.ZUSTAENDE)
                self.assertIn(item["rolle_im_plan"]["art"], clr.ROLLEN)

    def test_storage_is_found_by_its_tags(self):
        """Der Auftrag des Inhabers: unser S3 erscheint bei der Suche sofort als Lösung."""
        treffer = [x["id"] for x in register()["loesungen"] if {"s3", "speicher", "objektspeicher"} <= set(x["tags"])]
        self.assertEqual(treffer, ["cloudflare-r2"])
        for tag, kennung in (("llm-router", "9router"), ("gedaechtnis", "lightrag"), ("gedaechtnis", "agentmemory"),
                             ("gedaechtnis", "cognee-server"), ("orchestrierung", "hermes"), ("mail", "resend"),
                             ("zahlung", "revolut"), ("crm", "hubspot"), ("hosting", "vercel")):
            with self.subTest(tag=tag, kennung=kennung):
                self.assertIn(kennung, [x["id"] for x in register()["loesungen"] if tag in x["tags"]])

    def test_disclosed_access_is_marked_for_renewal(self):
        offen = [(x["id"], z["bezeichnung"]) for x in register()["loesungen"] for z in x["zugaenge"] if z["offengelegt"]]
        namen = {name for _, name in offen}
        for erwartet in ("tiny-shadow-c5a6", "jolly-wildflower-3e52", "NeXify AI CF Auth. Token", "Access-Dienst-Token"):
            self.assertIn(erwartet, namen)
        for item in register()["loesungen"]:
            for zugang in item["zugaenge"]:
                if zugang["offengelegt"]:
                    self.assertTrue(zugang["erneuerung_faellig"], zugang["bezeichnung"])

    def test_validation_rejects_broken_registers(self):
        base = register()

        def mutate(change):
            data = copy.deepcopy(base)
            change(data)
            return clr.validate(data)

        def doppelt(d):
            d["loesungen"].append(copy.deepcopy(d["loesungen"][0]))

        def ohne_tags(d):
            d["loesungen"][0]["tags"] = []

        def ohne_wann(d):
            d["loesungen"][0]["wann_nutzen"] = ""

        def falscher_zustand(d):
            d["loesungen"][0]["zustand"]["status"] = "läuft"

        def wertfeld(d):
            d["loesungen"][1]["zugaenge"][0]["wert"] = "x"

        def grosses_tag(d):
            d["loesungen"][0]["tags"].append("Speicher")

        def kundenname(d):
            d["loesungen"][0]["tags"].append("kunde:Muster GmbH")

        def unklar_ohne_frage(d):
            d["loesungen"][0]["rolle_im_plan"] = {"art": "unklar"}

        def doppelt_ohne_bleibt(d):
            d["loesungen"][0]["rolle_im_plan"] = {"art": "doppelt"}

        def offen_ohne_erneuerung(d):
            d["loesungen"][1]["zugaenge"][0]["erneuerung_faellig"] = False

        def fehlende_belegdatei(d):
            d["loesungen"][0]["zustand"]["beleg"] = "siehe `docs/gibt-es-nicht.md:3`"

        def fremde_abhaengigkeit(d):
            d["loesungen"][0]["abhaengigkeiten"] = ["gibt-es-nicht"]

        def zusatzfeld(d):
            d["loesungen"][0]["geheimnis"] = "x"

        for change in (doppelt, ohne_tags, ohne_wann, falscher_zustand, wertfeld, grosses_tag, kundenname,
                       unklar_ohne_frage, doppelt_ohne_bleibt, offen_ohne_erneuerung, fehlende_belegdatei,
                       fremde_abhaengigkeit, zusatzfeld):
            with self.subTest(change.__name__):
                self.assertTrue(mutate(change))


class LesbareFassung(unittest.TestCase):
    def test_markdown_matches_json(self):
        text = (ROOT / clr.MARKDOWN).read_text(encoding="utf-8")
        self.assertEqual(text, clr.render_markdown(register()))

    def test_markdown_names_every_solution_and_every_access(self):
        text = (ROOT / clr.MARKDOWN).read_text(encoding="utf-8")
        for item in register()["loesungen"]:
            self.assertIn(f"`{item['id']}`", text)
            for zugang in item["zugaenge"]:
                self.assertIn(zugang["bezeichnung"].replace("|", "\\|"), text)

    def test_changed_json_is_detected(self):
        data = register()
        data["loesungen"][0]["zweck"] += " Geändert."
        self.assertNotEqual((ROOT / clr.MARKDOWN).read_text(encoding="utf-8"), clr.render_markdown(data))


class KeineGeheimnisse(unittest.TestCase):
    def test_scanned_files_are_clean(self):
        for name in clr.SCANNED:
            with self.subTest(name):
                self.assertEqual(clr.find_secrets((ROOT / name).read_text(encoding="utf-8")), [])

    def test_every_pattern_is_detected(self):
        for name, wert in beispiele().items():
            with self.subTest(name):
                hits = clr.find_secrets(f"Text davor {wert} Text danach")
                self.assertTrue(hits, name)
                for hit in hits:
                    self.assertNotIn(wert, hit)

    def test_detection_inside_json_and_markdown_table(self):
        wert = beispiele()["cfat_"]
        self.assertTrue(clr.find_secrets(json.dumps({"zugaenge": [{"bezeichnung": wert}]})))
        self.assertTrue(clr.find_secrets(f"| x | `{wert}` | y |"))

    def test_account_id_is_the_only_hex_exception(self):
        self.assertEqual(clr.find_secrets(f"Konto-ID `{KONTO_ID}`"), [])
        self.assertEqual(clr.find_secrets(f"https://{KONTO_ID}.r2.cloudflarestorage.com"), [])
        anders = KONTO_ID[:-1] + ("0" if KONTO_ID[-1] != "0" else "1")
        self.assertTrue(clr.find_secrets(f"Konto-ID `{anders}`"))
        self.assertIn(KONTO_ID, clr.ERLAUBTE_KENNUNGEN)
        self.assertEqual(len(clr.ERLAUBTE_KENNUNGEN), 2)

    def test_account_id_stands_in_exactly_one_place(self):
        """Die Konto-ID ist kein Geheimnis, steht aber nur im Eintrag cloudflare-konto."""
        raw = (ROOT / clr.REGISTER).read_text(encoding="utf-8")
        self.assertEqual(raw.count(KONTO_ID), 1)
        konto = next(x for x in register()["loesungen"] if x["id"] == "cloudflare-konto")
        self.assertIn(KONTO_ID, konto["ort"])
        self.assertEqual((ROOT / clr.MARKDOWN).read_text(encoding="utf-8").count(KONTO_ID), 1)

    def test_no_amounts_for_cloudflare_subscriptions(self):
        # Der Kontoeintrag nennt Tarif und Abonnements, aber keine Beträge.
        for item in register()["loesungen"]:
            if item["id"] == "cloudflare-konto":
                self.assertIn("Workers Paid", item["zustand"]["beleg"])
                self.assertIsNone(re.search(r"\d+[,.]?\d*\s*(USD|EUR|\$|€)", json.dumps(item, ensure_ascii=False)), item["id"])

    def test_ordinary_text_is_not_flagged(self):
        harmlos = (
            "nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665-ut7r, "
            "`docs/04-betrieb/aufraeumplan-2026-11-14.md:53`, COMPOSIO_WEBHOOK_SECRET, "
            "3f471602-2707-8131-a937-f2ab26c6e0b4, tiny-shadow-c5a6, store_konfiguration, "
            "https://gateway.nexifyai.cloud/compat/chat/completions, angebot@nexifyai.cloud"
        )
        self.assertEqual(clr.find_secrets(harmlos), [])

    def test_check_fails_when_a_secret_is_added(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in clr.SCANNED:
                (root / name).parent.mkdir(parents=True, exist_ok=True)
                (root / name).write_text((ROOT / name).read_text(encoding="utf-8"), encoding="utf-8")
            data = register()
            data["loesungen"][0]["ort"] += " " + beispiele()["ghp_"]
            (root / clr.REGISTER).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            errors = clr.check(root)
            self.assertTrue(any("möglicher Geheimniswert" in e for e in errors))
            self.assertFalse(any(beispiele()["ghp_"] in e for e in errors))


class Einbindung(unittest.TestCase):
    def test_cli_is_green_and_part_of_governance_check(self):
        result = subprocess.run([sys.executable, "tools/check_loesungsregister.py"], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        makefile = (ROOT / "Makefile").read_text(encoding="utf-8")
        block = makefile.split("governance-check:\n", 1)[1].split("\n\n", 1)[0]
        self.assertIn("python3 tools/check_loesungsregister.py", block)

    def test_skill_states_the_rule_and_the_places(self):
        skill = (ROOT / ".claude/skills/nexify-loesungsregister/SKILL.md").read_text(encoding="utf-8")
        for needle in ("config/loesungsregister.json", "nie ein Geheimniswert", "DECISIONS.md", "PROGRESS.md",
                       "sichere Formular", "nexify-stand-halten", "tools/check_loesungsregister.py"):
            self.assertIn(needle, skill)
        index = (ROOT / ".claude/skills/README.md").read_text(encoding="utf-8")
        self.assertEqual(len(re.findall(r"\]\(nexify-loesungsregister/SKILL\.md\)", index)), 1)
        soul = (ROOT / "ops/hermes/home/SOUL.md").read_text(encoding="utf-8")
        self.assertIn("nexify-loesungsregister", soul)
        self.assertIn("config/loesungsregister.json", soul)

    def test_cleanup_plan_starts_with_the_volume_warning(self):
        plan = (ROOT / "docs/04-betrieb/aufraeumplan-2026-11-14.md").read_text(encoding="utf-8")
        kopf = plan[: plan.index("## 1. Kurzantwort")]
        for needle in ("SPERRVERMERK", "cognee-x532_cognee-data", "cognee-x532_cognee-system", "ungenutzt", "kein Volume-Prune"):
            self.assertIn(needle, kopf)
        befund = (ROOT / "docs/04-betrieb/server-befund-2026-11-14.md").read_text(encoding="utf-8")
        zeile = next(i for i, line in enumerate(befund.splitlines()) if line.startswith("- **Schritt 2c:**"))
        self.assertIn("GESPERRT", befund.splitlines()[zeile + 1])
        self.assertIn("**zehn** beendete Mess-Projekte", befund)


if __name__ == "__main__":
    unittest.main()

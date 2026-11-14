"""Customer's own model access: repository rules as tests. Stand-in vault only, no provider call."""
import io
import json
import logging
import pickle
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "apps") not in sys.path:
    sys.path.insert(0, str(ROOT / "apps"))

from suite import byo  # noqa: E402
from suite.testing import FixtureVault  # noqa: E402

KEY = "sk-fixture-0000-not-a-real-key-ABCDEFGH"
OTHER = "sk-fixture-1111-not-a-real-key-ZYXWVUTS"


class PolicyBinding(unittest.TestCase):
    def test_code_rules_are_the_rules_of_the_repository_policy(self):
        policy = json.loads((ROOT / "config/selfservice-policy.json").read_text())["llm"]
        rules = policy["byok"]
        self.assertEqual(rules["secret_storage"], "server_side_encrypted_vault_reference")
        self.assertIs(rules["plaintext_secret_in_browser_storage_allowed"], False)
        self.assertIs(rules["plaintext_in_logs_urls_or_responses_allowed"], False)
        self.assertIs(rules["platform_fallback_on_missing_invalid_or_exhausted_key"], False)
        self.assertIsNone(policy["default_funding_mode"])
        domain_source = (ROOT / "apps/selfservice/domain.py").read_text()
        migration = (ROOT / "db/foundation/002_suite_tenancy.sql").read_text()
        self.assertIn(byo.VAULT_REF.pattern, domain_source)
        self.assertIn("^" + byo.VAULT_REF.pattern + "$", migration)


class Bindings(unittest.TestCase):
    def setUp(self):
        self.vault = FixtureVault()
        self.bindings = byo.LlmBindings(self.vault, allowed_providers=("fixture_provider",), managed_route_available=True)

    def code(self, call):
        with self.assertRaises(byo.LlmUnavailable) as caught:
            call()
        self.assertNotIn(KEY, repr(caught.exception) + str(caught.exception.__dict__))
        return caught.exception.code

    def test_only_an_opaque_reference_is_kept(self):
        binding = self.bindings.bind_byo("org-a", "fixture_provider", byo.SecretValue(KEY))
        self.assertRegex(binding.vault_ref, r"^vaultref:[a-f0-9]{32}$")
        dump = repr(self.bindings.records()) + repr(binding) + repr(vars(self.bindings)["_active"])
        self.assertNotIn(KEY, dump)
        self.assertNotIn(KEY[-4:], dump)  # not even a recognisable tail
        route = self.bindings.route("org-a")
        self.assertEqual((route.mode, route.provider_ref), ("byo", "fixture_provider"))
        self.assertNotIn(KEY, repr(route))
        self.assertEqual(route.credential.reveal(), KEY)

    def test_secret_carrier_is_opaque(self):
        secret = byo.SecretValue(KEY)
        rendered = [repr(secret), str(secret), "%s" % secret, "{}".format(secret), f"{secret!r:>60}", repr([secret]), repr({"k": secret})]
        for text in rendered:
            self.assertNotIn(KEY, text)
        with self.assertRaises(TypeError):
            json.dumps({"key": secret})
        with self.assertRaises(TypeError):
            pickle.dumps(secret)
        with self.assertRaises(TypeError):
            hash(secret)
        self.assertFalse(hasattr(secret, "__dict__"))
        for bad in ("", "short", "with space inside the key", "line\nbreak-key-000000", 12345678, None, "x" * 5000):
            self.assertEqual(self.code(lambda: byo.SecretValue(bad)), "byo_key_malformed")

    def test_plain_text_key_and_unreleased_provider_never_reach_the_vault(self):
        self.assertEqual(self.code(lambda: self.bindings.bind_byo("org-a", "fixture_provider", KEY)), "byo_key_must_arrive_as_secret_value")
        for provider in ("other_provider", "Fixture_Provider", "", None, "https://example.invalid/v1"):
            self.assertEqual(self.code(lambda: self.bindings.bind_byo("org-a", provider, byo.SecretValue(KEY))), "byo_provider_not_released")
        nothing_released = byo.LlmBindings(self.vault)
        self.assertEqual(self.code(lambda: nothing_released.bind_byo("org-a", "fixture_provider", byo.SecretValue(KEY))), "byo_provider_not_released")
        self.assertEqual(self.vault._material, {})

    def test_no_silent_fallback_to_the_managed_route(self):
        self.assertTrue(self.bindings.managed_route_available)
        self.assertEqual(self.code(lambda: self.bindings.route("org-a")), "llm_choice_required")  # no default route
        binding = self.bindings.bind_byo("org-a", "fixture_provider", byo.SecretValue(KEY))
        self.vault.unavailable = True
        self.assertEqual(self.code(lambda: self.bindings.route("org-a")), "byo_key_unavailable")
        self.vault.unavailable = False
        self.vault.revoke(organisation_id="org-a", reference=binding.vault_ref)  # key gone in the vault
        self.assertEqual(self.code(lambda: self.bindings.route("org-a")), "byo_key_unavailable")
        for status, code in ((401, "byo_key_rejected_by_provider"), (403, "byo_key_rejected_by_provider"), (402, "byo_provider_quota_exhausted"),
                             (429, "byo_provider_quota_exhausted"), (500, "byo_provider_error")):
            self.assertEqual(byo.LlmBindings.provider_rejected(status).code, code)
        self.assertEqual(self.code(lambda: self.bindings.route("org-a")), "byo_key_unavailable")  # still not managed
        source = (ROOT / "apps/suite/byo.py").read_text()
        route_body = source[source.index("    def route("):source.index("    @staticmethod")]
        self.assertEqual(route_body.count('Route("managed"'), 1)
        self.assertLess(route_body.index('Route("managed"'), route_body.index("self.vault.resolve"))

    def test_managed_route_only_by_explicit_choice_and_only_when_available(self):
        self.bindings.choose_managed("org-a")
        self.assertEqual(self.bindings.route("org-a"), byo.Route("managed", None, None))
        unavailable = byo.LlmBindings(self.vault, allowed_providers=("fixture_provider",))
        unavailable.choose_managed("org-a")
        self.assertEqual(self.code(lambda: unavailable.route("org-a")), "managed_route_not_available")

    def test_revocation_is_immediate_and_replacement_retires_the_old_key(self):
        first = self.bindings.bind_byo("org-a", "fixture_provider", byo.SecretValue(KEY))
        second = self.bindings.bind_byo("org-a", "fixture_provider", byo.SecretValue(OTHER))
        self.assertNotEqual(first.vault_ref, second.vault_ref)
        self.assertIsNone(self.vault.resolve(organisation_id="org-a", reference=first.vault_ref))
        self.assertEqual(self.bindings.route("org-a").credential.reveal(), OTHER)
        self.bindings.revoke("org-a")
        self.assertEqual(self.code(lambda: self.bindings.route("org-a")), "llm_choice_required")
        self.assertEqual(self.vault._material, {})
        self.assertEqual([r.status for r in self.bindings.records()], ["revoked", "revoked"])

    def test_one_organisation_cannot_use_the_reference_of_another(self):
        binding = self.bindings.bind_byo("org-a", "fixture_provider", byo.SecretValue(KEY))
        self.assertIsNone(self.vault.resolve(organisation_id="org-b", reference=binding.vault_ref))
        self.assertEqual(self.code(lambda: self.bindings.route("org-b")), "llm_choice_required")
        self.bindings._active["org-b"] = byo.Binding("org-b", "byo", "fixture_provider", binding.vault_ref)  # faulty application code
        self.assertEqual(self.code(lambda: self.bindings.route("org-b")), "byo_key_unavailable")

    def test_vault_failure_or_non_opaque_answer_is_refused(self):
        class Leaky(FixtureVault):
            def store(self, **kwargs):
                return kwargs["secret"]

        class Broken(FixtureVault):
            def store(self, **kwargs):
                raise RuntimeError("vault said: " + kwargs["secret"])
        for vault, code in ((Leaky(), "vault_returned_no_opaque_reference"), (Broken(), "vault_unavailable")):
            bindings = byo.LlmBindings(vault, allowed_providers=("fixture_provider",))
            self.assertEqual(self.code(lambda: bindings.bind_byo("org-a", "fixture_provider", byo.SecretValue(KEY))), code)
            self.assertEqual(bindings.records(), [])


class LogRedaction(unittest.TestCase):
    def test_log_filter_scrubs_credentials_but_keeps_references(self):
        stream = io.StringIO()
        handler = logging.StreamHandler(stream)
        handler.addFilter(byo.RedactingFilter())
        logger = logging.getLogger("suite.byo.fixture")
        logger.addHandler(handler)
        logger.propagate = False
        self.addCleanup(logger.removeHandler, handler)
        reference = "vaultref:" + "0a" * 16
        logger.warning("provider answered 401 for key %s via %s", KEY, reference)
        logger.error("Authorization: Bearer %s", "abcDEF123456.token-part")
        try:
            raise RuntimeError("upstream echoed " + KEY)
        except RuntimeError:
            logger.exception("call failed")
        output = stream.getvalue()
        self.assertNotIn(KEY, output)
        self.assertNotIn("abcDEF123456", output)
        self.assertIn(reference, output)
        self.assertIn("provider answered 401", output)
        self.assertEqual(byo.redact("x " + OTHER + " y", known=[OTHER]), "x [redacted] y")


if __name__ == "__main__":
    unittest.main()

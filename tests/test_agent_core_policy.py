"""Policy-Prüfer: nur das Modell aus config/llm-policy.json, kein stiller Ersatz. Kein Modellaufruf."""
import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
for paket in ("packages/knowledge", "packages/agent_core"):
    sys.path.insert(0, str(ROOT / paket))

import nexify_agent_core as kern  # noqa: E402
import nexify_knowledge as nk  # noqa: E402
from nexify_agent_core import Abschluss, Grenzen, Modellantwort, Modellbindung, Rechte  # noqa: E402

DATEI = ROOT / "config/llm-policy.json"
ROH = json.loads(DATEI.read_text(encoding="utf-8"))
SOLL, STUFE = ROH["model"]["id"], ROH["model"]["reasoning_effort"]
POLICY = kern.ModellPolicy.aus_datei(DATEI)
A = nk.Mandant("mandant-a")


class RouterPort:
    """Attrappe eines echten Ports: meldet eine Bindung und das bedienende Modell. Kein Netz."""

    def __init__(self, kennung=SOLL, stufe=STUFE, *, ersatz=False, bedient_von="wie_gebunden", route="eigener_router"):
        self.gebunden = Modellbindung(kennung, stufe, route, ersatz)
        self.bedient_von = kennung if bedient_von == "wie_gebunden" else bedient_von
        self.aufrufe = 0

    def bindung(self):
        return self.gebunden

    def entscheiden(self, sicht):
        self.aufrufe += 1
        return Modellantwort(Abschluss("ok"), 3, self.bedient_von)


def lauf_mit(port, **kw):
    laufzeit = kern.Laufzeit(modell=POLICY.zulassen(port, **kw), werkzeuge=[],
                             wiederholung=kern.Wiederholungsregel(1, 2, 10))
    lauf = laufzeit.anlegen(A, "Auftrag", grenzen=Grenzen(3, 100, 0, 0),
                            rechte=Rechte(frozenset(), frozenset(), False), idempotenzschluessel="auftrag-0001")
    return laufzeit.fortsetzen(A, lauf.kennung)


class Zulassung(unittest.TestCase):
    def test_vorgabe_kommt_aus_der_policy_datei_und_das_modul_enthaelt_keine_kennung(self):
        self.assertEqual(POLICY.vorgabe(), kern.Modellvorgabe(SOLL, STUFE))
        self.assertTrue(SOLL.endswith(ROH["model"]["required_suffix"]))
        for datei in (ROOT / "packages/agent_core/nexify_agent_core").glob("*.py"):
            text = datei.read_text(encoding="utf-8")
            self.assertNotIn(SOLL, text)
            self.assertNotIn(SOLL.split("/")[0] + "/", text)

    def test_port_mit_policy_modell_wird_zugelassen_und_laeuft(self):
        port = RouterPort()
        lauf = lauf_mit(port)
        self.assertEqual((lauf.status, lauf.kosten, port.aufrufe), (kern.Laufstatus.ABGESCHLOSSEN, 3, 1))

    def test_jede_abweichung_in_kennung_oder_parametern_wird_verweigert(self):
        abweichungen = {
            "andere_endung": RouterPort(SOLL[:-1] + ("8" if SOLL[-1] != "8" else "9")),
            "ohne_endung": RouterPort(SOLL.rsplit("-", 1)[0]),
            "gross_geschrieben": RouterPort(SOLL.upper()),
            "mit_leerzeichen": RouterPort(SOLL + " "),
            "anderer_praefix": RouterPort("openrouter/" + SOLL.split("/", 1)[1]),
            "anderes_modell": RouterPort("anderer-anbieter/anderes-modell"),
            "leer": RouterPort(""),
            "keine_zeichenkette": RouterPort(None),
            "niedrigere_denkstufe": RouterPort(stufe="medium"),
            "keine_denkstufe": RouterPort(stufe=None),
            "stiller_ersatz": RouterPort(ersatz=True),
            "ersatz_unklar": RouterPort(ersatz=None),
            "ohne_route": RouterPort(route=""),
        }
        for name, port in abweichungen.items():
            with self.subTest(fall=name), self.assertRaises(kern.PolicyFehler):
                POLICY.zulassen(port)
            self.assertEqual(port.aufrufe, 0)

    def test_was_kein_gepruefter_port_ist_kommt_nicht_in_die_laufzeit(self):
        class OhneBindung:
            def entscheiden(self, sicht):
                return Modellantwort(Abschluss("ok"), 0)

        class FalscheBindung(OhneBindung):
            def bindung(self):
                return {"kennung": SOLL, "reasoning_effort": STUFE}

        for port in (OhneBindung(), FalscheBindung(), None, "modell", POLICY.zulassen(RouterPort())):
            with self.subTest(port=type(port).__name__), self.assertRaises(kern.PolicyFehler):
                POLICY.zulassen(port)
        regel = kern.Wiederholungsregel(1, 2, 10)
        for roh in (RouterPort(), kern.SkriptModell({}), OhneBindung(), None):
            with self.subTest(roh=type(roh).__name__), self.assertRaises(kern.KernFehler) as fehler:
                kern.Laufzeit(modell=roh, werkzeuge=[], wiederholung=regel)
            self.assertEqual(str(fehler.exception), "modell_port_nicht_gegen_policy_geprueft")
        with self.assertRaises(kern.PolicyFehler):  # die Zulassung lässt sich nicht selbst ausstellen
            kern.ZugelassenerModellPort(object(), RouterPort(), RouterPort().bindung())

    def test_stellvertreter_nur_ausdruecklich_und_nie_als_policy_modell(self):
        skript = kern.SkriptModell({"haupt": [Abschluss("ok")]})
        with self.assertRaises(kern.PolicyFehler) as fehler:
            POLICY.zulassen(skript)
        self.assertEqual(str(fehler.exception), "stellvertreter_nicht_zugelassen")
        for wert in (1, "ja", None):
            with self.assertRaises(kern.PolicyFehler):
                POLICY.zulassen(skript, stellvertreter_erlaubt=wert)
        self.assertEqual(lauf_mit(skript, stellvertreter_erlaubt=True).status, kern.Laufstatus.ABGESCHLOSSEN)
        self.assertNotEqual(skript.bindung().kennung, SOLL)
        # ein echter Port wird durch den Schalter nicht lockerer geprüft
        with self.assertRaises(kern.PolicyFehler):
            POLICY.zulassen(RouterPort("anderer-anbieter/anderes-modell"), stellvertreter_erlaubt=True)

    def test_kein_stiller_ersatz_waehrend_des_laufs(self):
        tauscht = RouterPort()
        zugelassen = POLICY.zulassen(tauscht)
        tauscht.gebunden = Modellbindung("anderer-anbieter/anderes-modell", STUFE, "eigener_router", False)
        with self.assertRaises(kern.PolicyFehler):
            zugelassen.entscheiden(None)
        self.assertEqual(tauscht.aufrufe, 0)
        self.assertEqual(zugelassen.bindung().kennung, SOLL)
        for name, port in {"anbieter_bediente_anderes_modell": RouterPort(bedient_von="anderer-anbieter/ersatz"),
                           "bedienendes_modell_unbekannt": RouterPort(bedient_von=None)}.items():
            with self.subTest(fall=name):
                lauf = lauf_mit(port)
                self.assertEqual((lauf.status, lauf.ende_code, lauf.kosten, lauf.ergebnis),
                                 (kern.Laufstatus.FEHLGESCHLAGEN, "modell_policy_verletzt", 0, None))
                self.assertEqual(port.aufrufe, 1)  # kein zweiter Versuch mit irgendeinem Modell


class PolicyDatei(unittest.TestCase):
    def test_gelockerte_oder_unbekannte_policy_wird_nicht_unterstuetzt(self):
        aenderungen = (
            lambda p: p["routing"].update(silent_model_fallback=True),
            lambda p: p["routing"].update(silent_reasoning_downgrade=True),
            lambda p: p["routing"].update(automatic_tier_escalation_or_substitution=True),
            lambda p: p["routing"].update(unsupported_capability="substitute"),
            lambda p: p["routing"].update(final_serialized_provider_request_must_match_policy=False),
            lambda p: p["routing"].pop("silent_model_fallback"),
            lambda p: p.pop("routing"),
            lambda p: p.pop("model"),
            lambda p: p["model"].update(id=""),
            lambda p: p["model"].update(id=SOLL + "x"),          # passt nicht mehr zur Pflichtendung
            lambda p: p["model"].pop("required_suffix"),
            lambda p: p["model"].pop("reasoning_effort"),
            lambda p: p.update(schema_version=2),
            lambda p: p["use_cases"]["product_enrichment"].update(silent_model_fallback=True),
        )
        for nr, aendern in enumerate(aenderungen):
            daten = copy.deepcopy(ROH)
            aendern(daten)
            with self.subTest(nr=nr), self.assertRaises(kern.PolicyFehler):
                kern.ModellPolicy(daten)
        for roh in (None, [], "text"):
            with self.assertRaises(kern.PolicyFehler):
                kern.ModellPolicy(roh)
        with self.assertRaises(kern.PolicyFehler):
            kern.ModellPolicy.aus_datei(ROOT / "config/gibt-es-nicht.json")

    def test_benannter_anwendungsfall_gilt_nur_fuer_sich(self):
        fall = ROH["use_cases"]["product_enrichment"]["model"]
        port = RouterPort(fall["id"], fall["reasoning_effort"])
        POLICY.zulassen(port, anwendungsfall="product_enrichment")
        with self.assertRaises(kern.PolicyFehler):
            POLICY.zulassen(port)  # außerhalb des benannten Falls ist es ein fremdes Modell
        with self.assertRaises(kern.PolicyFehler):
            POLICY.zulassen(RouterPort(), anwendungsfall="product_enrichment")
        with self.assertRaises(kern.PolicyFehler):
            POLICY.zulassen(RouterPort(), anwendungsfall="erfundener_fall")


class FertigeAnfrage(unittest.TestCase):
    GUT = {"model": SOLL, "messages": [{"role": "user", "content": "x"}], "reasoning": {"effort": STUFE},
           "provider": {"allow_fallbacks": False, "require_parameters": True}, "max_tokens": 512}

    def test_konforme_anfrage_besteht(self):
        POLICY.pruefe_anfrage(self.GUT)
        ohne_anbieter = {k: v for k, v in self.GUT.items() if k not in ("provider", "reasoning")}
        POLICY.pruefe_anfrage({**ohne_anbieter, "reasoning_effort": STUFE})

    def test_abweichende_anfrage_wird_verweigert(self):
        faelle = {
            "anderes_modell": {"model": SOLL + "-fast"},
            "modell_fehlt": {"model": None},
            "modellliste": {"models": [SOLL, "anderer-anbieter/ersatz"]},
            "fallbacks": {"fallbacks": ["anderer-anbieter/ersatz"]},
            "route_fallback": {"route": "fallback"},
            "ohne_denkstufe": {"reasoning": None},
            "niedrigere_denkstufe": {"reasoning": {"effort": "low"}},
            "denkstufe_mit_zusatz": {"reasoning": {"effort": STUFE, "exclude": True}},
            "zwei_widerspruechliche_stufen": {"reasoning_effort": "low"},
            "anbieter_ersatz_erlaubt": {"provider": {"allow_fallbacks": True}},
            "anbieter_ersatz_offen": {"provider": {}},
            "anbieter_mit_ersatzliste": {"provider": {"allow_fallbacks": False, "fallbacks": ["x"]}},
        }
        for name, aenderung in faelle.items():
            anfrage = {**self.GUT, **aenderung}
            if aenderung.get("reasoning", 0) is None:
                anfrage.pop("reasoning")
            with self.subTest(fall=name), self.assertRaises(kern.PolicyFehler):
                POLICY.pruefe_anfrage(anfrage)
        for roh in (None, "text", [self.GUT]):
            with self.assertRaises(kern.PolicyFehler):
                POLICY.pruefe_anfrage(roh)


if __name__ == "__main__":
    unittest.main()

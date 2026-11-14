"""Schnittstellenvertrag /agent/runs: nur Vertrag, kein Server. Abgleich mit dem Laufzeitkern."""
import json
from pathlib import Path
import re
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
for paket in ("packages/knowledge", "packages/agent_core"):
    sys.path.insert(0, str(ROOT / paket))

import nexify_agent_core as kern  # noqa: E402
from nexify_agent_core import laufzeit, typen  # noqa: E402

VERTRAG = json.loads((ROOT / "docs/contracts/agent-runs.openapi.json").read_text(encoding="utf-8"))
SCHEMAS = VERTRAG["components"]["schemas"]
MANDANTENFELD = re.compile(r"mandant|tenant|kunde_id|org", re.IGNORECASE)


def operationen():
    for pfad, eintrag in VERTRAG["paths"].items():
        for methode, operation in eintrag.items():
            yield pfad, methode, operation


def aufloesen(knoten):
    while isinstance(knoten, dict) and "$ref" in knoten:
        ziel = VERTRAG
        for teil in knoten["$ref"].removeprefix("#/").split("/"):
            ziel = ziel[teil]
        knoten = ziel
    return knoten


def eigenschaftsnamen(schema, gesehen=None):
    """Alle Eigenschaftsnamen eines (Anfrage-)Schemas, rekursiv über $ref und oneOf."""
    gesehen = gesehen if gesehen is not None else set()
    schema = aufloesen(schema)
    if not isinstance(schema, dict) or id(schema) in gesehen:
        return set()
    gesehen.add(id(schema))
    namen = set(schema.get("properties", {}))
    for teil in (*schema.get("properties", {}).values(), *schema.get("oneOf", ()), schema.get("items")):
        if teil:
            namen |= eigenschaftsnamen(teil, gesehen)
    return namen


class AgentRunsVertrag(unittest.TestCase):
    def test_vertrag_ist_als_nicht_umgesetzt_gekennzeichnet_und_hat_keinen_server(self):
        self.assertEqual(VERTRAG["openapi"], "3.1.0")
        self.assertEqual(VERTRAG["info"]["x-implementation-status"], "proposed_not_implemented")
        self.assertNotIn("servers", VERTRAG)
        self.assertIn("kein Server", VERTRAG["info"]["description"])

    def test_genau_die_vier_operationen(self):
        self.assertEqual({(p, m, o["operationId"]) for p, m, o in operationen()}, {
            ("/agent/runs", "post", "laufAnlegen"),
            ("/agent/runs/{lauf}", "get", "laufStatus"),
            ("/agent/runs/{lauf}/freigabe", "post", "laufFreigabeEntscheiden"),
            ("/agent/runs/{lauf}/abbruch", "post", "laufAbbrechen"),
        })

    def test_alle_verweise_loesen_auf(self):
        def laufen(knoten):
            if isinstance(knoten, dict):
                if "$ref" in knoten:
                    self.assertIsNotNone(aufloesen(knoten))
                for wert in knoten.values():
                    laufen(wert)
            elif isinstance(knoten, list):
                for wert in knoten:
                    laufen(wert)

        laufen(VERTRAG)

    def test_mandant_kommt_nie_aus_der_anfrage(self):
        self.assertEqual(VERTRAG["info"]["x-mandant-quelle"], "sitzung_und_mitgliedschaft_niemals_anfrage")
        for pfad, methode, operation in operationen():
            with self.subTest(operation=operation["operationId"]):
                self.assertIsNone(MANDANTENFELD.search(pfad))
                for parameter in map(aufloesen, operation.get("parameters", ())):
                    self.assertIsNone(MANDANTENFELD.search(parameter["name"]))
                if "requestBody" in operation:
                    schema = operation["requestBody"]["content"]["application/json"]["schema"]
                    for name in eigenschaftsnamen(schema):
                        self.assertIsNone(MANDANTENFELD.search(name), name)
        # auch die Antwort nennt keinen Mandanten
        self.assertFalse([n for n in eigenschaftsnamen(SCHEMAS["Lauf"]) if MANDANTENFELD.search(n)])

    def test_jede_operation_verlangt_eine_sitzung_und_fremde_laeufe_sind_404(self):
        self.assertEqual(VERTRAG["security"], [{"sitzung": []}])
        for pfad, methode, operation in operationen():
            with self.subTest(operation=operation["operationId"]):
                self.assertNotIn("security", operation)  # keine Operation hebt die Sitzungspflicht auf
                self.assertIn("401", operation["responses"])
                if "{lauf}" in pfad:
                    self.assertIn("404", operation["responses"])
                    self.assertIn("anderen Mandanten", aufloesen(operation["responses"]["404"])["description"])

    def test_anfragen_sind_geschlossen_und_anlegen_ist_idempotent(self):
        for name in ("LaufAnlegen", "GrenzenWunsch", "FreigabeErteilen", "FreigabeAblehnen"):
            self.assertIs(SCHEMAS[name]["additionalProperties"], False, name)
        anlegen = VERTRAG["paths"]["/agent/runs"]["post"]
        kopf = aufloesen(anlegen["parameters"][0])
        self.assertEqual((kopf["name"], kopf["in"], kopf["required"]), ("Idempotency-Key", "header", True))
        self.assertEqual(kopf["schema"]["pattern"], "^" + laufzeit._SCHLUESSEL.pattern + "$")
        self.assertIn("409", anlegen["responses"])
        # der Aufrufer kann Grenzen nur wünschen; Tiefe und Wiederholungen gar nicht
        self.assertEqual(set(SCHEMAS["GrenzenWunsch"]["properties"]), {"max_schritte", "max_kosten"})
        self.assertNotIn("grenzen", SCHEMAS["LaufAnlegen"]["properties"])
        self.assertNotIn("rechte", SCHEMAS["LaufAnlegen"]["properties"])

    def test_aufzaehlungen_und_muster_stimmen_mit_dem_kern_ueberein(self):
        self.assertEqual(SCHEMAS["Laufstatus"]["enum"], [s.value for s in kern.Laufstatus])
        self.assertEqual(SCHEMAS["FreigabepflichtigeAktionsklasse"]["enum"],
                         [k.value for k in kern.Aktionsklasse if k.freigabepflichtig])
        self.assertEqual(SCHEMAS["Code"]["pattern"], "^" + typen.CODE.pattern + "$")
        self.assertEqual(SCHEMAS["Name"]["pattern"], "^" + typen.NAME.pattern + "$")
        self.assertEqual(SCHEMAS["Kennung"]["pattern"], "^" + laufzeit._KENNUNG.pattern + "$")
        self.assertEqual(set(SCHEMAS["Grenzen"]["required"]), set(kern.Grenzen.__dataclass_fields__))
        auskunft = set(kern.Laufauskunft.__dataclass_fields__)
        self.assertLessEqual(set(SCHEMAS["Lauf"]["properties"]), auskunft)
        self.assertEqual(auskunft - set(SCHEMAS["Lauf"]["properties"]), {"mandant", "rechte", "freigaben"})
        self.assertEqual(set(SCHEMAS["Freigabeanfrage"]["required"]), set(kern.Freigabeanfrage.__dataclass_fields__))

    def test_freigabe_ist_menschlich_gebunden_und_nicht_abschaltbar(self):
        freigabe = VERTRAG["paths"]["/agent/runs/{lauf}/freigabe"]["post"]
        self.assertEqual((freigabe["x-freigeber"], freigabe["x-nicht_abschaltbar"]), ("angemeldeter_mensch", True))
        varianten = [aufloesen(v) for v in freigabe["requestBody"]["content"]["application/json"]["schema"]["oneOf"]]
        self.assertEqual([v["properties"]["entscheidung"]["const"] for v in varianten], ["erteilen", "ablehnen"])
        erteilen, ablehnen = varianten
        self.assertIn("bestaetigter_hash", erteilen["required"])
        self.assertEqual(aufloesen(erteilen["properties"]["bestaetigter_hash"])["pattern"], "^[0-9a-f]{64}$")
        self.assertIn("grund", ablehnen["required"])
        self.assertEqual(aufloesen(ablehnen["properties"]["grund"]), SCHEMAS["Code"])  # kein Freitext
        for code in ("403", "409", "422"):
            self.assertIn(code, freigabe["responses"])
        roh = json.dumps(VERTRAG).lower()
        for schalter in ("auto_approve", "skip_approval", "ohne_freigabe", "freigabe_aus"):
            self.assertNotIn(schalter, roh)

    def test_fehlerantworten_tragen_nur_feste_codes(self):
        self.assertEqual(SCHEMAS["Fehler"]["required"], ["code"])
        self.assertEqual(set(SCHEMAS["Fehler"]["properties"]), {"code"})
        self.assertIs(SCHEMAS["Fehler"]["additionalProperties"], False)


if __name__ == "__main__":
    unittest.main()

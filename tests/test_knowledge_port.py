"""Wissensport: Vertragstests je Implementierung plus Grenzfälle. Kein Netz, kein Modell."""
from datetime import datetime, timedelta, timezone
import inspect
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages/knowledge"))

import nexify_knowledge as nk  # noqa: E402
from nexify_knowledge.arbeitsspeicher import woerter  # noqa: E402
from nexify_knowledge.vertrag import T0, WissensPortVertrag, chat, dokument  # noqa: E402

PAKET = ROOT / "packages/knowledge/nexify_knowledge"


class AttrappenTransport:
    """Speicher-Attrappe hinter der Naht CogneeTransport; merkt sich jeden Datensatznamen."""

    def __init__(self, **zustand):
        self.daten = {}
        self.gesehen = set()
        self._zustand = {"zugriffskontrolle_an": True, "sprachmodell_anbieter": None,
                         "einbettung_anbieter": "lokal", **zustand}

    def zustand(self):
        return dict(self._zustand)

    def _fach(self, datensatz):
        self.gesehen.add(datensatz)
        return self.daten.setdefault(datensatz, {})

    def schreiben(self, datensatz, kennung, text, vektor, metadaten):
        assert vektor == [float(len(text))]
        self._fach(datensatz)[kennung] = {"text": text, "metadaten": dict(metadaten)}

    def lesen(self, datensatz, kennung):
        return self._fach(datensatz).get(kennung)

    def suchen(self, datensatz, frage, vektor):
        gesucht = woerter(frage)
        funde = [(k, len(gesucht & woerter(v["text"])) / len(gesucht)) for k, v in self._fach(datensatz).items()]
        return [f for f in funde if f[1] > 0]

    def auflisten(self, datensatz):
        return list(self._fach(datensatz))

    def entfernen(self, datensatz, kennungen):
        for kennung in kennungen:
            self._fach(datensatz).pop(kennung, None)


class LokalEinbetter:
    lokal = True
    anbieter = "lokal"
    modell = "attrappe-laenge-1d"

    def einbetten(self, texte):
        return [[float(len(t))] for t in texte]


class Router:
    route = "eigener_router"

    def aufrufen(self, anfrage):  # pragma: no cover - wird in keinem Standardpfad gerufen
        raise AssertionError("kein Modellaufruf in Tests")


def konfiguration(**kw):
    werte = {"transport": AttrappenTransport(), "einbetter": LokalEinbetter(),
             "sprachmodell": nk.OHNE_SPRACHMODELL, "zugriffskontrolle_erzwungen": True}
    werte.update(kw)
    return nk.CogneeKonfiguration(**werte)


class ArbeitsspeicherVertrag(WissensPortVertrag, unittest.TestCase):
    def neuer_port(self, uhr):
        return nk.ArbeitsspeicherWissen(uhr=uhr)


class CogneeAdapterVertrag(WissensPortVertrag, unittest.TestCase):
    """Derselbe Vertrag gegen das Adapter-Gerüst mit Attrappen-Transport (kein echter Cognee-Betrieb)."""

    def neuer_port(self, uhr):
        self.transport = AttrappenTransport()
        return nk.CogneeAdapter(konfiguration(transport=self.transport), uhr=uhr)

    def test_jeder_zugriff_bleibt_in_datensaetzen_des_anfragenden_mandanten(self):
        self.port.speichern(self.A, dokument("Alpha Text"))
        self.port.speichern(self.B, chat("Beta Text"))
        self.assertEqual(set(self.transport.daten["t-mandant-a--dokument"]),
                         {nk.eintrag_kennung(self.A, dokument("Alpha Text"))})
        self.transport.gesehen.clear()
        self.port.abrufen(self.C, "Alpha Beta")
        self.port.exportieren(self.C)
        self.port.loeschen(self.C, nk.Loeschauswahl.mandant_vollstaendig())
        self.assertEqual(self.transport.gesehen,
                         {"t-mandant-c--dokument", "t-mandant-c--chat", "t-mandant-c--notiz"})

    def test_metadaten_tragen_einbettungsmodell_und_pflichtfelder(self):
        self.port.speichern(self.A, chat("Nachricht"))
        (roh,) = self.transport.daten["t-mandant-a--chat"].values()
        m = roh["metadaten"]
        self.assertEqual((m["mandant"], m["art"], m["rechtsgrundlage"], m["einbettungsmodell"]),
                         ("mandant-a", "chat", "einwilligung", "attrappe-laenge-1d"))
        self.assertTrue(m["loeschen_ab"] and m["einwilligung_ref"] and m["zeitpunkt"])

    def test_vom_speicher_untergeschobener_fremder_satz_wird_verworfen(self):
        self.port.speichern(self.A, dokument("Alpha Text"))
        self.transport.daten["t-mandant-b--dokument"] = dict(self.transport.daten["t-mandant-a--dokument"])
        for aufruf in (lambda: self.port.abrufen(self.B, "Alpha"), lambda: self.port.exportieren(self.B),
                       lambda: self.port.loeschen(self.B, nk.Loeschauswahl.mandant_vollstaendig())):
            with self.assertRaises(nk.Mandantenverletzung):
                aufruf()


class CogneeVerweigerung(unittest.TestCase):
    def test_ohne_konfiguration_klare_verweigerung(self):
        for falsch in (None, {}, "cognee", object()):
            with self.subTest(wert=repr(falsch)), self.assertRaises(nk.AdapterNichtKonfiguriert) as fehler:
                nk.CogneeAdapter(falsch)
            self.assertIn("nicht konfiguriert", str(fehler.exception))
            self.assertIn("keine Standardwerte", str(fehler.exception))
        with self.assertRaises(TypeError):
            nk.CogneeAdapter()
        with self.assertRaises(TypeError):
            nk.CogneeKonfiguration()

    def test_konfiguration_hat_keinen_einzigen_standardwert(self):
        parameter = inspect.signature(nk.CogneeKonfiguration).parameters
        self.assertEqual(set(parameter), {"transport", "einbetter", "sprachmodell", "zugriffskontrolle_erzwungen"})
        self.assertTrue(all(p.default is inspect.Parameter.empty for p in parameter.values()))

    def test_fremdanbieter_und_unsichere_einstellungen_werden_verweigert(self):
        class FremdEinbetter(LokalEinbetter):
            anbieter = "openai"

        class NichtLokal(LokalEinbetter):
            lokal = False

        class FremdRouter(Router):
            route = "https://api.openai.com/v1"

        faelle = {
            "einbetter_fremd": {"einbetter": FremdEinbetter()},
            "einbetter_nicht_lokal": {"einbetter": NichtLokal()},
            "einbetter_fehlt": {"einbetter": None},
            "sprachmodell_fehlt": {"sprachmodell": None},
            "sprachmodell_fremd": {"sprachmodell": FremdRouter(),
                                   "transport": AttrappenTransport(sprachmodell_anbieter="eigener_router")},
            "zugriffskontrolle_nicht_erzwungen": {"zugriffskontrolle_erzwungen": False},
            "zugriffskontrolle_wahrheitswert_statt_true": {"zugriffskontrolle_erzwungen": 1},
            "speicher_ohne_zugriffskontrolle": {"transport": AttrappenTransport(zugriffskontrolle_an=False)},
            "speicher_einbettung_openai": {"transport": AttrappenTransport(einbettung_anbieter="openai")},
            "speicher_sprachmodell_openai": {"transport": AttrappenTransport(sprachmodell_anbieter="openai")},
            "speicher_hat_modell_obwohl_ohne": {"transport": AttrappenTransport(sprachmodell_anbieter="eigener_router")},
            "transport_fehlt": {"transport": None},
        }
        for name, kw in faelle.items():
            with self.subTest(fall=name), self.assertRaises(nk.AdapterNichtKonfiguriert):
                nk.CogneeAdapter(konfiguration(**kw))

    def test_eigener_router_ist_zulaessig_und_wird_gemeldet(self):
        port = nk.CogneeAdapter(konfiguration(
            sprachmodell=Router(), transport=AttrappenTransport(sprachmodell_anbieter="eigener_router")))
        zustand = port.zustand()
        self.assertEqual((zustand.sprachmodell_route, zustand.einbettungsmodell),
                         ("eigener_router", "attrappe-laenge-1d"))

    def test_spaetere_fehlkonfiguration_des_speichers_faellt_bei_zustand_auf(self):
        transport = AttrappenTransport()
        port = nk.CogneeAdapter(konfiguration(transport=transport))
        transport._zustand["zugriffskontrolle_an"] = False
        with self.assertRaises(nk.AdapterNichtKonfiguriert):
            port.zustand()


class Grundregeln(unittest.TestCase):
    def test_mandantenkennung_ist_eng_und_ohne_platzhalter(self):
        for gut in ("a", "mandant-a", "t1", "x" * 63):
            nk.Mandant(gut)
        for falsch in ("", "*", "A", "a b", "a--b", "-a", "a-", "a/b", "a\n", "x" * 64, None, 7):
            with self.subTest(wert=repr(falsch)), self.assertRaises(nk.MandantErforderlich):
                nk.Mandant(falsch)

    def test_chat_inhalte_brauchen_rechtsgrundlage_einwilligungsverweis_und_loeschfrist(self):
        herkunft = nk.Herkunft("chat/g-1", T0, nk.Inhaltsart.CHAT)
        frist = T0 + timedelta(days=30)
        faelle = {
            "chat_braucht_rechtsgrundlage": {"loeschen_ab": frist},
            "chat_braucht_loeschfrist": {"rechtsgrundlage": nk.Rechtsgrundlage.VERTRAG},
            "einwilligung_braucht_verweis": {"rechtsgrundlage": nk.Rechtsgrundlage.EINWILLIGUNG, "loeschen_ab": frist},
            "loeschfrist_vor_entstehung": {"rechtsgrundlage": nk.Rechtsgrundlage.VERTRAG, "loeschen_ab": T0},
            "loeschen_ab_braucht_zeitzone": {"rechtsgrundlage": nk.Rechtsgrundlage.VERTRAG,
                                             "loeschen_ab": datetime(2027, 1, 1)},
            "rechtsgrundlage_ungueltig": {"rechtsgrundlage": "einwilligung", "loeschen_ab": frist},
        }
        for code, kw in faelle.items():
            with self.subTest(code=code), self.assertRaises(nk.MetadatenFehler) as fehler:
                nk.Wissenseintrag("Hallo", herkunft, **kw)
            self.assertEqual(str(fehler.exception), code)
        nk.Wissenseintrag("Hallo", herkunft, rechtsgrundlage=nk.Rechtsgrundlage.VERTRAG, loeschen_ab=frist)

    def test_herkunft_ist_pflicht_und_geprueft(self):
        with self.assertRaises(nk.MetadatenFehler):
            nk.Herkunft("quelle", datetime(2026, 1, 1), nk.Inhaltsart.NOTIZ)  # ohne Zeitzone
        with self.assertRaises(nk.MetadatenFehler):
            nk.Herkunft("quelle", T0, "notiz")
        with self.assertRaises(nk.MetadatenFehler):
            nk.Herkunft("", T0, nk.Inhaltsart.NOTIZ)
        with self.assertRaises(nk.MetadatenFehler):
            nk.Wissenseintrag("Text", None)
        with self.assertRaises(nk.MetadatenFehler):
            nk.Wissenseintrag("   ", nk.Herkunft("q", T0, nk.Inhaltsart.NOTIZ))

    def test_oeffentliche_operationen_sind_nicht_ueberschreibbar(self):
        with self.assertRaises(TypeError):
            class Umgehung(nk.ArbeitsspeicherWissen):
                def abrufen(self, *a, **kw):
                    return "alles"

    def test_undichte_implementierung_wird_von_der_basisklasse_abgefangen(self):
        a, b = nk.Mandant("mandant-a"), nk.Mandant("mandant-b")

        class Undicht(nk.ArbeitsspeicherWissen):
            """Liefert absichtlich alles aus dem Fach von A – egal, wer fragt."""

            def _suchen(self, mandant, frage, art):
                return super()._suchen(a, frage, art)

            def _alle(self, mandant):
                return super()._alle(a)

        port = Undicht(uhr=lambda: T0)
        port.speichern(a, dokument("Alpha vertraulich"))
        for aufruf in (lambda: port.abrufen(b, "Alpha"), lambda: port.exportieren(b),
                       lambda: port.loeschen(b, nk.Loeschauswahl.mandant_vollstaendig())):
            with self.assertRaises(nk.Mandantenverletzung):
                aufruf()
        self.assertEqual(len(port.exportieren(a).eintraege), 1)

    def test_rucklesen_mit_abweichendem_inhalt_schlaegt_fehl(self):
        class Verfaelscht(nk.ArbeitsspeicherWissen):
            def _lesen(self, mandant, kennung):
                satz = super()._lesen(mandant, kennung)
                if satz is None:
                    return None
                return nk.Datensatz(satz.kennung, satz.mandant, dokument("anderer Inhalt"), satz.gespeichert_am)

        with self.assertRaises(nk.RuecklesenFehlgeschlagen):
            Verfaelscht(uhr=lambda: T0).speichern(nk.Mandant("mandant-a"), dokument("Original"))

    def test_fehlermeldungen_enthalten_keine_inhalte(self):
        port = nk.ArbeitsspeicherWissen()
        geheim = "Kontonummer-4711-streng-vertraulich"
        for aufruf in (lambda: port.speichern("mandant-a", dokument(geheim)),
                       lambda: port.abrufen(nk.Mandant("mandant-a"), geheim, limit=0),
                       lambda: nk.Mandant(geheim)):
            with self.assertRaises(nk.WissensFehler) as fehler:
                aufruf()
            self.assertNotIn("4711", str(fehler.exception))

    def test_paket_hat_keine_netz_prozess_oder_fremdanbieter_standardwege(self):
        verboten = ("import socket", "urllib", "http.client", "requests", "httpx", "subprocess",
                    "os.environ", "getenv", "api.openai", "openai.com", "LLM_API_KEY", "docker")
        for datei in sorted(PAKET.glob("*.py")):
            text = datei.read_text(encoding="utf-8")
            for muster in verboten:
                with self.subTest(datei=datei.name, muster=muster):
                    self.assertNotIn(muster, text)

    def test_standarduhr_liefert_zeit_mit_zeitzone(self):
        port = nk.ArbeitsspeicherWissen()
        port.speichern(nk.Mandant("mandant-a"), dokument("Uhrprobe"))
        (eintrag,) = port.exportieren(nk.Mandant("mandant-a")).eintraege
        self.assertEqual(eintrag.gespeichert_am.utcoffset(), timezone.utc.utcoffset(None))


if __name__ == "__main__":
    unittest.main()

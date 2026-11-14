"""Terminlogik des Werkstattservice, Stufe 1: Zustandsmaschine ohne Datenbank und ohne Uhr.

Testfälle aus docs/03-backend/werkstatt-terminlogik.md, Abschnitt 10; die Nummer steht im Namen.
Fristen sind hier gesetzte Beispielwerte, keine Vorgaben für den Betrieb.
"""
import copy
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "shop-api"))

from shop import appointment_mails as M  # noqa: E402
from shop import appointments as A  # noqa: E402

UTC = timezone.utc
JETZT = datetime(2027, 3, 1, 9, 0, tzinfo=UTC)
BEISPIELWERTE = {
    "TEILEKLAR_APPOINTMENTS_F1_MINUTES": "2880",
    "TEILEKLAR_APPOINTMENTS_F2_MINUTES": "1440",
    "TEILEKLAR_APPOINTMENTS_F3_MINUTES": "1440",
    "TEILEKLAR_APPOINTMENTS_F4_MINUTES": "86400",
    "TEILEKLAR_APPOINTMENTS_F5_MINUTES": "1440",
    "TEILEKLAR_APPOINTMENTS_F11_ROUNDS": "3",
}
FRISTEN = A.fristen_aus(BEISPIELWERTE)
WERKSTATT = {"id": "P", "name": "Beispielwerkstatt P", "anschrift": "Musterweg 1, 52062 Aachen", "zeitzone": "Europe/Berlin"}
EINGABE = {"name": "Erika Beispiel", "email": "Erika@Example.invalid", "telefon": "", "fahrzeug": "Beispielwagen 1.6",
           "anliegen": "Bremsen vorne prüfen.", "einwilligung": True, "einwilligung_fassung": "entwurf-0",
           "wunsch_von": "2027-03-10T09:00", "wunsch_bis": "2027-03-10T17:00", "seite": "/teileklar/termine", "sprache": "de"}
K, W, I = A.KUNDE, A.WERKSTATT, A.INHABER


def wunsch(jetzt=JETZT, **eingabe):
    termin, nachrichten = A.neuer_wunsch({**EINGABE, **eingabe}, WERKSTATT, jetzt, FRISTEN, kennung="t" * 64,
                                         schluessel_pruefsumme="s0", nutzlast_pruefsumme="n0", zugriff_pruefsumme="z0", kunde_user_id=None)
    return termin


def schritt(termin, aktion, rolle, jetzt=JETZT, schluessel=None, **eingabe):
    eingabe.setdefault("version", termin["version"])
    aenderung = A.uebergang(termin, aktion, rolle, eingabe, jetzt, FRISTEN,
                            schluessel_pruefsumme=schluessel or "s%d" % termin["version"], nutzlast_pruefsumme="n")
    return A.anwenden(termin, aenderung), aenderung


def bestaetigt():
    return schritt(wunsch(), "confirm", W, termin_am="2027-03-10T10:00")[0]


def verschoben_von_werkstatt():
    return schritt(wunsch(), "propose", W, vorschlag_am="2027-03-12T10:00")[0]


def verschoben_von_kunde():
    return schritt(bestaetigt(), "propose", K, vorschlag_am="2027-03-15T10:00")[0]


class Maschine(unittest.TestCase):
    def abgewiesen(self, status, code, termin, aktion, rolle, jetzt=JETZT, **eingabe):
        vorher = copy.deepcopy(termin)
        eingabe.setdefault("version", termin["version"])
        with self.assertRaises(A.Abweisung) as fehler:
            A.uebergang(termin, aktion, rolle, eingabe, jetzt, FRISTEN, schluessel_pruefsumme="sx", nutzlast_pruefsumme="n")
        self.assertEqual((fehler.exception.status, fehler.exception.code), (status, code))
        self.assertEqual(termin, vorher, "ein abgewiesener Aufruf darf den Termin nicht anfassen")
        return fehler.exception

    # ---- Tabelle als Daten ----
    def test_tabelle_hat_dreizehn_uebergaenge_und_sieben_zustaende(self):
        self.assertEqual([u["nr"] for u in A.UEBERGAENGE], ["U%d" % n for n in range(1, 14)])
        self.assertEqual(len(A.ZUSTAENDE), 7)
        self.assertEqual(set(A.ENDZUSTAENDE), {"abgelehnt", "abgesagt", "erledigt", "verfallen"})
        paare = [(u["von"], u["aktion"]) for u in A.UEBERGAENGE]
        self.assertEqual(len(paare), len(set(paare)), "Zustand und Aufruf bestimmen den Übergang eindeutig")
        for u in A.UEBERGAENGE:
            self.assertNotIn(u["von"], A.ENDZUSTAENDE)
            if A.SYSTEM in u["ausloeser"]:
                self.assertEqual((u["aktion"], u["nach"]), ("expire", "verfallen"), "das System löst nur den Fristablauf aus")

    def test_fristen_sind_pflicht_ohne_vorgabe(self):
        self.assertIsNotNone(FRISTEN)
        for name in A.FRIST_NAMEN:
            werte = dict(BEISPIELWERTE)
            del werte[name]
            self.assertIsNone(A.fristen_aus(werte), name)
            for unsinn in ("", "abc", "-1", "1.5"):
                self.assertIsNone(A.fristen_aus({**BEISPIELWERTE, name: unsinn}), (name, unsinn))
        self.assertIsNone(A.fristen_aus({}))
        self.assertIsNone(A.fristen_aus({**BEISPIELWERTE, "TEILEKLAR_APPOINTMENTS_F3_MINUTES": "86400"}), "Mindestvorlauf muss unter dem Höchstvorlauf liegen")

    # ---- Anlegen (U1) ----
    def test_01_wunsch_entsteht_mit_version_1_und_frist_f1(self):
        termin, nachrichten = A.neuer_wunsch(EINGABE, WERKSTATT, JETZT, FRISTEN, kennung="t" * 64, schluessel_pruefsumme="s0",
                                             nutzlast_pruefsumme="n0", zugriff_pruefsumme="z0", kunde_user_id=None)
        self.assertEqual((termin["zustand"], termin["version"]), ("wunsch", 1))
        self.assertEqual(termin["antwort_bis"], A.utc_text(JETZT + timedelta(minutes=2880)))
        self.assertEqual(sorted(nachrichten), [("N1", K), ("N2", W)])
        self.assertEqual(termin["kunde_email"], "erika@example.invalid")
        self.assertEqual(termin["verlauf"][0]["nr"], "U1")
        self.assertEqual(termin["marke"], "teileklar")

    def test_08_feldfehler_beim_wunsch(self):
        for eingabe, feld, code in (({"name": ""}, "name", "required"), ({"email": "keine-adresse"}, "email", "invalid"),
                                    ({"email": ""}, "email", "required"), ({"anliegen": "9 Zeichen"}, "anliegen", "too_short"),
                                    ({"anliegen": ""}, "anliegen", "required"), ({"einwilligung": False}, "einwilligung", "required"),
                                    ({"einwilligung": "ja"}, "einwilligung", "required"), ({"einwilligung_fassung": ""}, "einwilligung_fassung", "required"),
                                    ({"wunsch_von": ""}, "wunsch_von", "required"), ({"wunsch_bis": "morgen"}, "wunsch_bis", "invalid"),
                                    ({"name": "x" * 101}, "name", "invalid"), ({"anliegen": "x" * 2001}, "anliegen", "invalid")):
            with self.assertRaises(A.Abweisung) as fehler:
                wunsch(**eingabe)
            self.assertEqual((fehler.exception.status, fehler.exception.code), (422, "appointment_invalid"), eingabe)
            self.assertEqual(fehler.exception.extra["fields"].get(feld), code, eingabe)

    def test_09_vorlauf_und_fenster(self):
        # F3 = 1 Tag, F4 = 60 Tage (Beispielwerte); jetzt = 01.03.2027 09:00 UTC = 10:00 Ortszeit.
        for eingabe, feld, code in (({"wunsch_von": "2027-03-02T09:59", "wunsch_bis": "2027-03-02T17:00"}, "wunsch_von", "too_early"),
                                    ({"wunsch_von": "2027-04-30T11:01", "wunsch_bis": "2027-04-30T17:00"}, "wunsch_von", "too_late"),
                                    ({"wunsch_von": "2027-03-10T09:00", "wunsch_bis": "2027-03-10T08:00"}, "wunsch_bis", "window_invalid"),
                                    ({"wunsch_von": "2027-03-10T09:00", "wunsch_bis": "2027-03-10T09:00"}, "wunsch_bis", "window_invalid"),
                                    ({"wunsch_von": "2027-04-29T09:00", "wunsch_bis": "2027-05-02T09:00"}, "wunsch_bis", "too_late")):
            with self.assertRaises(A.Abweisung) as fehler:
                wunsch(**eingabe)
            self.assertEqual(fehler.exception.extra["fields"].get(feld), code, eingabe)
        self.assertEqual(wunsch(wunsch_von="2027-03-02T10:00", wunsch_bis="2027-03-02T12:00")["zustand"], "wunsch", "genau am Mindestvorlauf ist erlaubt")
        self.assertEqual(wunsch(wunsch_von="2027-04-30T10:00", wunsch_bis="2027-04-30T11:00")["zustand"], "wunsch", "Fenster endet genau am Höchstvorlauf")

    # ---- Aus wunsch ----
    def test_15_werkstatt_bestaetigt_im_wunschfenster(self):
        termin, aenderung = schritt(wunsch(), "confirm", W, termin_am="2027-03-10T10:00", dauer_minuten=90)
        self.assertEqual((termin["zustand"], termin["version"], termin["termin_am"]), ("bestaetigt", 2, "2027-03-10T09:00:00+00:00"))
        self.assertEqual((termin["antwort_bis"], termin["dauer_minuten"]), (None, 90))
        self.assertEqual((aenderung.nr, aenderung.nachrichten), ("U2", [("N3", K)]))

    def test_16_bestaetigung_in_der_vergangenheit(self):
        termin = wunsch()
        spaeter = JETZT + timedelta(days=1)
        fehler = self.abgewiesen(422, "appointment_invalid", termin, "confirm", W, jetzt=spaeter, termin_am="2027-03-01T10:00")
        self.assertEqual(fehler.extra["fields"], {"termin_am": "in_past"})

    def test_17_bestaetigung_ausserhalb_des_fensters_verweist_auf_propose(self):
        fehler = self.abgewiesen(422, "appointment_invalid", wunsch(), "confirm", W, termin_am="2027-03-11T10:00")
        self.assertEqual((fehler.extra["fields"], fehler.extra["hinweis"]), ({"termin_am": "window_invalid"}, "propose"))
        for rand in ("2027-03-10T09:00", "2027-03-10T17:00"):
            self.assertEqual(schritt(wunsch(), "confirm", W, termin_am=rand)[0]["zustand"], "bestaetigt", rand)

    def test_18_werkstatt_lehnt_ab_nur_mit_grund_aus_der_liste(self):
        termin, aenderung = schritt(wunsch(), "decline", W, grund_code="keine_kapazitaet")
        self.assertEqual((termin["zustand"], termin["grund_code"], aenderung.nr, aenderung.nachrichten), ("abgelehnt", "keine_kapazitaet", "U3", [("N4", K)]))
        self.assertEqual(self.abgewiesen(422, "appointment_invalid", wunsch(), "decline", W).extra["fields"], {"grund_code": "reason_required"})
        self.assertEqual(self.abgewiesen(422, "appointment_invalid", wunsch(), "decline", W, grund_code="frei erfunden").extra["fields"], {"grund_code": "invalid"})

    def test_19_werkstatt_schlaegt_anderen_zeitpunkt_vor(self):
        termin, aenderung = schritt(wunsch(), "propose", W, vorschlag_am="2027-03-12T10:00")
        self.assertEqual((termin["zustand"], termin["vorschlag_von"], termin["vorschlag_runde"]), ("verschoben", W, 1))
        self.assertEqual(termin["antwort_bis"], A.utc_text(JETZT + timedelta(minutes=1440)))
        self.assertEqual((aenderung.nr, aenderung.nachrichten), ("U4", [("N5", K)]))
        fehler = self.abgewiesen(422, "appointment_invalid", wunsch(), "propose", W, vorschlag_am="2027-03-10T10:00")
        self.assertEqual((fehler.extra["fields"], fehler.extra["hinweis"]), ({"vorschlag_am": "window_invalid"}, "confirm"))

    def test_20_kunde_zieht_wunsch_zurueck(self):
        termin, aenderung = schritt(wunsch(), "cancel", K)
        self.assertEqual((termin["zustand"], termin["abgesagt_von"], aenderung.nr, aenderung.nachrichten), ("abgesagt", K, "U5", [("N6", W)]))

    def test_21_inhaber_sagt_wunsch_ab_nur_mit_grund(self):
        termin, aenderung = schritt(wunsch(), "cancel", I, grund_code="betrieblich", grund_text="Beispielgrund")
        self.assertEqual((termin["zustand"], termin["abgesagt_von"], aenderung.nr), ("abgesagt", I, "U5"))
        self.assertEqual(sorted(aenderung.nachrichten), [("N6", K), ("N6", W)])
        self.assertEqual(termin["verlauf"][-1]["grund_code"], "betrieblich")
        self.assertEqual(self.abgewiesen(422, "appointment_invalid", wunsch(), "cancel", I).extra["fields"], {"grund_code": "reason_required"})

    def test_22_fristablauf_macht_den_wunsch_verfallen(self):
        termin = wunsch()
        frist = A.aus_text(termin["antwort_bis"])
        self.assertIsNone(A.verfall(termin, frist - timedelta(seconds=1)))
        aenderung = A.verfall(termin, frist + timedelta(seconds=1))
        neu = A.anwenden(termin, aenderung)
        self.assertEqual((neu["zustand"], neu["version"], aenderung.nr, aenderung.nachrichten), ("verfallen", 2, "U6", [("N7", K)]))
        self.assertEqual(neu["verlauf"][-1]["ausloeser"], A.SYSTEM)
        self.assertIsNone(A.verfall(neu, frist + timedelta(days=9)), "ein Endzustand verfällt nicht noch einmal")

    def test_23_verspaetete_bestaetigung_ist_abgelaufen(self):
        termin = wunsch()
        frist = A.aus_text(termin["antwort_bis"])
        self.abgewiesen(409, "appointment_expired", termin, "confirm", W, jetzt=frist + timedelta(seconds=1), termin_am="2027-03-10T10:00")
        self.abgewiesen(409, "appointment_expired", termin, "confirm", W, jetzt=frist, termin_am="2027-03-10T10:00")
        gerade_noch, _ = schritt(termin, "confirm", W, jetzt=frist - timedelta(seconds=1), termin_am="2027-03-10T10:00")
        self.assertEqual(gerade_noch["zustand"], "bestaetigt")

    def test_24_antwortfrist_endet_spaetestens_mit_dem_wunschfenster(self):
        termin = wunsch(wunsch_von="2027-03-02T10:00", wunsch_bis="2027-03-02T12:00")
        self.assertEqual(termin["antwort_bis"], termin["wunsch_bis"])
        self.assertEqual(termin["wunsch_bis"], "2027-03-02T11:00:00+00:00")

    def test_25_verboten_aus_wunsch(self):
        for aktion, rolle, eingabe in (("confirm", K, {"termin_am": "2027-03-10T10:00"}), ("decline", K, {"grund_code": "sonstiges"}),
                                       ("accept", K, {}), ("accept", W, {}), ("complete", W, {}), ("cancel", W, {"grund_code": "sonstiges"}),
                                       ("confirm", I, {"termin_am": "2027-03-10T10:00"}), ("decline", I, {"grund_code": "sonstiges"}),
                                       ("propose", K, {"vorschlag_am": "2027-03-12T10:00"}), ("propose", I, {"vorschlag_am": "2027-03-12T10:00"}),
                                       ("confirm", A.SYSTEM, {"termin_am": "2027-03-10T10:00"}), ("expire", W, {}), ("expire", K, {})):
            fehler = self.abgewiesen(409, "appointment_transition_forbidden", wunsch(), aktion, rolle, **eingabe)
            self.assertEqual((fehler.extra["zustand"], fehler.extra["version"]), ("wunsch", 1), (aktion, rolle))

    # ---- Aus bestaetigt ----
    def test_26_werkstatt_meldet_durchfuehrung_nach_dem_termin(self):
        termin, aenderung = schritt(bestaetigt(), "complete", W, jetzt=datetime(2027, 3, 10, 9, 0, 1, tzinfo=UTC))
        self.assertEqual((termin["zustand"], aenderung.nr, aenderung.nachrichten), ("erledigt", "U9", []))

    def test_27_durchfuehrung_vor_dem_termin_ist_verboten(self):
        self.abgewiesen(409, "appointment_transition_forbidden", bestaetigt(), "complete", W, jetzt=datetime(2027, 3, 10, 8, 59, 59, tzinfo=UTC))

    def test_28_kunde_bittet_um_verlegung(self):
        termin, aenderung = schritt(bestaetigt(), "propose", K, vorschlag_am="2027-03-15T10:00")
        self.assertEqual((termin["zustand"], termin["vorschlag_von"], termin["vorschlag_runde"]), ("verschoben", K, 1))
        self.assertIsNone(termin["termin_am"], "der bisherige Zeitpunkt ist nicht mehr zugesagt (ANNAHME zu U7)")
        self.assertEqual((aenderung.nr, aenderung.nachrichten), ("U7", [("N5", W)]))
        self.assertEqual(termin["verlauf"][-1]["termin_am_zuvor"], "2027-03-10T09:00:00+00:00")

    def test_29_werkstatt_bittet_um_verlegung(self):
        termin, aenderung = schritt(bestaetigt(), "propose", W, vorschlag_am="2027-03-15T10:00")
        self.assertEqual((termin["zustand"], termin["vorschlag_von"], aenderung.nachrichten), ("verschoben", W, [("N5", K)]))

    def test_30_kunde_sagt_bestaetigten_termin_ab(self):
        termin, aenderung = schritt(bestaetigt(), "cancel", K)
        self.assertEqual((termin["zustand"], termin["abgesagt_von"], aenderung.nr, aenderung.nachrichten), ("abgesagt", K, "U8", [("N6", W)]))
        self.assertEqual(termin["verlauf"][-1]["termin_am_zuvor"], "2027-03-10T09:00:00+00:00", "N6 nennt den abgesagten Zeitpunkt")

    def test_31_werkstatt_sagt_ab_nur_mit_grund(self):
        termin, aenderung = schritt(bestaetigt(), "cancel", W, grund_code="verhindert")
        self.assertEqual((termin["zustand"], termin["abgesagt_von"], aenderung.nachrichten), ("abgesagt", W, [("N6", K)]))
        self.assertEqual(self.abgewiesen(422, "appointment_invalid", bestaetigt(), "cancel", W).extra["fields"], {"grund_code": "reason_required"})
        self.assertEqual(sorted(schritt(bestaetigt(), "cancel", I, grund_code="betrieblich")[1].nachrichten), [("N6", K), ("N6", W)])

    @unittest.skip("Testfall 32: Verhalten nach der Grenze F5 ist Entscheidung E-04 des Inhabers (offen); nicht bestanden, nicht gebaut")
    def test_32_absage_oder_verlegung_nach_f5(self):
        pass

    def test_u7_bedingung_verlegung_noch_zulaessig_nach_tabelle_2_2(self):
        # Gebaut ist nur die Tabellenbedingung zu U7 ("Verlegung noch zulässig (F5)"); was sonst nach F5 gilt, bleibt E-04.
        termin = bestaetigt()  # Termin 10.03.2027 09:00 UTC, F5 = 1 Tag (Beispielwert)
        grenze = datetime(2027, 3, 9, 9, 0, tzinfo=UTC)
        for rolle in (K, W):
            self.abgewiesen(409, "appointment_transition_forbidden", termin, "propose", rolle, jetzt=grenze + timedelta(seconds=1), vorschlag_am="2027-03-15T10:00")
            self.assertEqual(schritt(termin, "propose", rolle, jetzt=grenze, vorschlag_am="2027-03-15T10:00")[0]["zustand"], "verschoben")
        self.assertEqual(schritt(termin, "cancel", K, jetzt=grenze + timedelta(hours=5))[0]["zustand"], "abgesagt", "U8 trägt in 2.2 keine Bedingung")

    def test_33_verboten_aus_bestaetigt(self):
        nach_termin = datetime(2027, 3, 11, 9, 0, tzinfo=UTC)
        for rolle in (K, W, I):
            for aktion, eingabe in (("confirm", {"termin_am": "2027-03-20T10:00"}), ("decline", {"grund_code": "sonstiges"}), ("accept", {})):
                self.abgewiesen(409, "appointment_transition_forbidden", bestaetigt(), aktion, rolle, **eingabe)
        for rolle in (K, I):
            self.abgewiesen(409, "appointment_transition_forbidden", bestaetigt(), "complete", rolle, jetzt=nach_termin)
        self.abgewiesen(409, "appointment_transition_forbidden", bestaetigt(), "propose", I, vorschlag_am="2027-03-15T10:00")

    def test_34_bestaetigter_termin_verfaellt_nie(self):
        termin = bestaetigt()
        self.assertIsNone(A.verfall(termin, JETZT + timedelta(days=400)))
        self.assertFalse(A.ist_faellig(termin, JETZT + timedelta(days=400)))

    # ---- Aus verschoben ----
    def test_35_kunde_nimmt_vorschlag_der_werkstatt_an(self):
        termin, aenderung = schritt(verschoben_von_werkstatt(), "accept", K)
        self.assertEqual((termin["zustand"], termin["termin_am"], termin["vorschlag_am"]), ("bestaetigt", "2027-03-12T09:00:00+00:00", None))
        self.assertEqual((aenderung.nr, sorted(aenderung.nachrichten)), ("U10", [("N3", K), ("N3", W)]))

    def test_36_wer_vorschlaegt_kann_nicht_selbst_annehmen(self):
        self.abgewiesen(409, "appointment_transition_forbidden", verschoben_von_werkstatt(), "accept", W)
        self.abgewiesen(409, "appointment_transition_forbidden", verschoben_von_kunde(), "accept", K)
        self.abgewiesen(409, "appointment_transition_forbidden", verschoben_von_kunde(), "accept", I)

    def test_37_werkstatt_nimmt_vorschlag_des_kunden_an(self):
        termin, aenderung = schritt(verschoben_von_kunde(), "accept", W)
        self.assertEqual((termin["zustand"], termin["termin_am"], aenderung.nachrichten), ("bestaetigt", "2027-03-15T09:00:00+00:00", [("N3", K)]))

    def test_38_gegenvorschlag_des_kunden(self):
        spaeter = JETZT + timedelta(hours=3)
        termin, aenderung = schritt(verschoben_von_werkstatt(), "propose", K, jetzt=spaeter, vorschlag_am="2027-03-13T10:00")
        self.assertEqual((termin["zustand"], termin["vorschlag_von"], termin["vorschlag_runde"]), ("verschoben", K, 2))
        self.assertEqual(termin["antwort_bis"], A.utc_text(spaeter + timedelta(minutes=1440)))
        self.assertEqual((aenderung.nr, aenderung.nachrichten), ("U11", [("N5", W)]))

    def test_39_kein_zweiter_vorschlag_derselben_seite(self):
        self.abgewiesen(409, "appointment_transition_forbidden", verschoben_von_werkstatt(), "propose", W, vorschlag_am="2027-03-13T10:00")
        self.abgewiesen(409, "appointment_transition_forbidden", verschoben_von_kunde(), "propose", K, vorschlag_am="2027-03-16T10:00")

    def test_40_rundengrenze_f11(self):
        termin = verschoben_von_werkstatt()                                        # Runde 1
        termin, _ = schritt(termin, "propose", K, vorschlag_am="2027-03-13T10:00")  # Runde 2
        termin, _ = schritt(termin, "propose", W, vorschlag_am="2027-03-14T10:00")  # Runde 3 = F11 (Beispielwert)
        self.assertEqual(termin["vorschlag_runde"], 3)
        self.abgewiesen(409, "appointment_transition_forbidden", termin, "propose", K, vorschlag_am="2027-03-16T10:00")
        self.assertEqual(schritt(termin, "accept", K)[0]["zustand"], "bestaetigt")
        self.assertEqual(schritt(termin, "cancel", K)[0]["zustand"], "abgesagt")
        self.assertNotIn("propose", A.erlaubte_aktionen(termin, K, JETZT, FRISTEN))

    def test_41_absage_aus_verschoben(self):
        termin, aenderung = schritt(verschoben_von_werkstatt(), "cancel", K)
        self.assertEqual((termin["zustand"], termin["abgesagt_von"], aenderung.nr, aenderung.nachrichten), ("abgesagt", K, "U12", [("N6", W)]))
        termin, aenderung = schritt(verschoben_von_werkstatt(), "cancel", W, grund_code="verhindert")
        self.assertEqual((termin["abgesagt_von"], aenderung.nachrichten), (W, [("N6", K)]))
        # 2.2 nennt bei U12 keinen Grund, 5.2 verlangt ihn für Werkstatt und Inhaber: gebaut ist die engere Fassung.
        self.abgewiesen(422, "appointment_invalid", verschoben_von_werkstatt(), "cancel", W)
        self.abgewiesen(422, "appointment_invalid", verschoben_von_werkstatt(), "cancel", I)

    def test_42_vorschlag_ohne_antwort_verfaellt(self):
        termin = verschoben_von_werkstatt()
        aenderung = A.verfall(termin, A.aus_text(termin["antwort_bis"]) + timedelta(seconds=1))
        self.assertEqual((aenderung.nr, sorted(aenderung.nachrichten)), ("U13", [("N7", K), ("N7", W)]))
        self.assertEqual(A.anwenden(termin, aenderung)["zustand"], "verfallen")

    def test_43_annahme_nach_dem_vorgeschlagenen_zeitpunkt(self):
        termin = schritt(wunsch(), "propose", W, vorschlag_am="2027-03-02T08:00", jetzt=JETZT + timedelta(hours=1))[0]
        self.assertEqual(termin["antwort_bis"], termin["vorschlag_am"], "die Antwortfrist endet spätestens mit dem vorgeschlagenen Zeitpunkt")
        self.abgewiesen(409, "appointment_expired", termin, "accept", K, jetzt=datetime(2027, 3, 2, 7, 0, 1, tzinfo=UTC))
        self.assertEqual(schritt(termin, "accept", K, jetzt=datetime(2027, 3, 2, 6, 59, 59, tzinfo=UTC))[0]["zustand"], "bestaetigt")

    def test_44_verboten_aus_verschoben(self):
        for termin in (verschoben_von_werkstatt(), verschoben_von_kunde()):
            for rolle in (K, W, I):
                for aktion, eingabe in (("confirm", {"termin_am": "2027-03-20T10:00"}), ("decline", {"grund_code": "sonstiges"}), ("complete", {})):
                    self.abgewiesen(409, "appointment_transition_forbidden", termin, aktion, rolle, **eingabe)

    # ---- Endzustände ----
    def test_45_aus_endzustaenden_fuehrt_nichts_heraus(self):
        enden = {
            "abgelehnt": schritt(wunsch(), "decline", W, grund_code="sonstiges")[0],
            "abgesagt": schritt(wunsch(), "cancel", K)[0],
            "erledigt": schritt(bestaetigt(), "complete", W, jetzt=datetime(2027, 3, 11, 9, 0, tzinfo=UTC))[0],
            "verfallen": A.anwenden(wunsch(), A.verfall(wunsch(), JETZT + timedelta(days=30))),
        }
        eingaben = {"confirm": {"termin_am": "2027-05-10T10:00"}, "decline": {"grund_code": "sonstiges"}, "propose": {"vorschlag_am": "2027-05-12T10:00"},
                    "accept": {}, "cancel": {"grund_code": "sonstiges"}, "complete": {}}
        self.assertEqual(set(enden), set(A.ENDZUSTAENDE))
        for zustand, termin in enden.items():
            self.assertEqual(termin["zustand"], zustand)
            for aktion in A.AKTIONEN:
                for rolle in (K, W, I):
                    fehler = self.abgewiesen(409, "appointment_transition_forbidden", termin, aktion, rolle, jetzt=JETZT + timedelta(days=40), **eingaben[aktion])
                    self.assertEqual(fehler.extra["zustand"], zustand)
                self.assertEqual(A.erlaubte_aktionen(termin, K, JETZT, FRISTEN), [])
            self.assertIsNone(A.verfall(termin, JETZT + timedelta(days=400)))

    # ---- Idempotenz und Version ----
    def test_47_derselbe_schluessel_ist_eine_wiederholung(self):
        termin, _ = schritt(wunsch(), "confirm", W, schluessel="sA", termin_am="2027-03-10T10:00")
        self.assertTrue(A.wiederholung(termin, "sA", "confirm", W, "n"))
        self.assertFalse(A.wiederholung(termin, "sB", "confirm", W, "n"))
        self.assertFalse(A.wiederholung(termin, None, "confirm", W, "n"))
        for aktion, rolle, nutzlast in (("confirm", W, "andere"), ("cancel", W, "n"), ("confirm", K, "n")):
            with self.assertRaises(A.Abweisung) as fehler:
                A.wiederholung(termin, "sA", aktion, rolle, nutzlast)
            self.assertEqual((fehler.exception.status, fehler.exception.code), (409, "idempotency_conflict"))

    def test_48_zweite_bestaetigung_mit_neuem_schluessel(self):
        self.abgewiesen(409, "appointment_transition_forbidden", bestaetigt(), "confirm", W, termin_am="2027-03-10T10:00")

    def test_49_veraltete_version(self):
        # confirm ist nur aus wunsch erlaubt, und wunsch hat immer Version 1: der wörtliche Fall endet nach der
        # Prüfreihenfolge aus Abschnitt 9 (Übergang vor Version) als verbotener Übergang.
        self.abgewiesen(409, "appointment_transition_forbidden", bestaetigt(), "confirm", W, termin_am="2027-03-10T10:00", version=1)
        # Erreichbarer Fall derselben Regel: ein erlaubter Aufruf mit veralteter Version.
        fehler = self.abgewiesen(409, "appointment_version_conflict", bestaetigt(), "cancel", K, version=1)
        self.assertEqual((fehler.extra["zustand"], fehler.extra["version"]), ("bestaetigt", 2))
        self.abgewiesen(409, "appointment_version_conflict", wunsch(), "confirm", W, termin_am="2027-03-10T10:00", version=2)

    def test_50_uebergang_ohne_version(self):
        for version in (None, "1", True, 1.0):
            fehler = self.abgewiesen(422, "appointment_invalid", wunsch(), "cancel", K, version=version)
            self.assertEqual(fehler.extra["fields"], {"version": "version_required" if version is None else "invalid"})

    # ---- Sichten ----
    def test_59_sicht_der_werkstatt_gegen_feste_feldliste(self):
        erlaubt = {"id", "nummer", "werkstatt_id", "werkstatt_name", "werkstatt_anschrift", "zustand", "version", "wunsch_von", "wunsch_bis",
                   "zeitzone", "termin_am", "dauer_minuten", "vorschlag_am", "vorschlag_von", "vorschlag_runde", "antwort_bis", "kunde_name",
                   "fahrzeug", "anliegen", "grund_code", "grund_text", "abgesagt_von", "verlauf", "vorgaenger_id", "erstellt_am", "geaendert_am"}
        sicht = A.sicht(bestaetigt(), W)
        self.assertEqual(set(sicht), erlaubt)
        for verboten in ("kunde_email", "kunde_telefon", "kunde_user_id", "einwilligung", "zugriff_kunde", "nutzlast_pruefsumme",
                         "benachrichtigungen", "ortszeit_eingabe", "seite", "sprache", "marke"):
            self.assertNotIn(verboten, sicht)
        self.assertEqual(set(sicht["verlauf"][0]), {"nr", "von", "nach", "ausloeser", "zeit", "version", "grund_code"})

    def test_60_sicht_des_kunden(self):
        termin = bestaetigt()
        termin["verlauf"].append({"art": "zugriff", "ausloeser": I, "zeit": A.utc_text(JETZT)})
        sicht = A.sicht(termin, K)
        for verboten in ("zugriff_kunde", "nutzlast_pruefsumme", "benachrichtigungen", "kunde_user_id", "kunde_name", "kunde_email", "anliegen", "einwilligung"):
            self.assertNotIn(verboten, sicht)
        self.assertEqual([e["nr"] for e in sicht["verlauf"]], ["U1", "U2"], "interne Einträge bleiben draußen")
        self.assertNotIn("schluessel_pruefsumme", sicht["verlauf"][0])
        inhaber = A.sicht(termin, I)
        self.assertNotIn("zugriff_kunde", inhaber)
        self.assertEqual(len(inhaber["verlauf"]), 3)
        self.assertIn("kunde_email", inhaber)
        with self.assertRaises(ValueError):
            A.sicht(termin, A.SYSTEM)

    def test_61_felder_der_anfrage_aendern_den_ausloeser_nicht(self):
        fremd = {"version": 1, "rolle": I, "abgesagt_von": W, "werkstatt_id": "P2", "ausloeser": W, "zustand": "bestaetigt"}
        termin = A.anwenden(wunsch(), A.uebergang(wunsch(), "cancel", K, fremd, JETZT, FRISTEN, schluessel_pruefsumme="s1", nutzlast_pruefsumme="n"))
        self.assertEqual((termin["abgesagt_von"], termin["werkstatt_id"], termin["zustand"], termin["verlauf"][-1]["ausloeser"]), (K, "P", "abgesagt", K))
        with self.assertRaises(A.Abweisung) as fehler:
            A.uebergang(wunsch(), "confirm", K, {"version": 1, "rolle": W, "ausloeser": W, "termin_am": "2027-03-10T10:00"}, JETZT, FRISTEN,
                        schluessel_pruefsumme="s1", nutzlast_pruefsumme="n")
        self.assertEqual(fehler.exception.code, "appointment_transition_forbidden")

    def test_erlaubte_aktionen_je_rolle(self):
        self.assertEqual(A.erlaubte_aktionen(wunsch(), W, JETZT, FRISTEN), ["confirm", "decline", "propose"])
        self.assertEqual(A.erlaubte_aktionen(wunsch(), K, JETZT, FRISTEN), ["cancel"])
        self.assertEqual(A.erlaubte_aktionen(wunsch(), I, JETZT, FRISTEN), ["cancel"])
        self.assertEqual(A.erlaubte_aktionen(bestaetigt(), W, JETZT, FRISTEN), ["propose", "cancel"])
        self.assertEqual(A.erlaubte_aktionen(bestaetigt(), W, JETZT + timedelta(days=20), FRISTEN), ["cancel", "complete"])
        self.assertEqual(A.erlaubte_aktionen(verschoben_von_werkstatt(), K, JETZT, FRISTEN), ["propose", "accept", "cancel"])
        self.assertEqual(A.erlaubte_aktionen(verschoben_von_werkstatt(), W, JETZT, FRISTEN), ["cancel"])
        self.assertEqual(A.erlaubte_aktionen(wunsch(), W, JETZT + timedelta(days=30), FRISTEN), [], "fällig heißt: nichts mehr erlaubt")


class Zeit(unittest.TestCase):
    def test_63_sommerzeit_wird_als_utc_mit_versatz_plus_zwei_gespeichert(self):
        self.assertEqual(A.utc_text(A.lies_zeitpunkt("2027-03-30T10:00", "Europe/Berlin")), "2027-03-30T08:00:00+00:00")
        termin = wunsch(wunsch_von="2027-03-30T10:00", wunsch_bis="2027-03-30T12:00")
        self.assertEqual((termin["wunsch_von"], termin["zeitzone"]), ("2027-03-30T08:00:00+00:00", "Europe/Berlin"))
        self.assertEqual(termin["ortszeit_eingabe"], {"wunsch_von": "2027-03-30T10:00", "wunsch_bis": "2027-03-30T12:00"})
        anzeige = A.ortszeit_text(termin["wunsch_von"], termin["zeitzone"])
        for teil in ("30.03.2027", "10:00", "Europe/Berlin", "+02:00"):
            self.assertIn(teil, anzeige)
        betreff, html, text = M.nachricht("N1", termin, K)
        for teil in ("30.03.2027", "10:00", "Europe/Berlin"):
            self.assertIn(teil, text)
            self.assertIn(teil, html)

    def test_64_winterzeit_versatz_plus_eins(self):
        jetzt = datetime(2027, 10, 20, 9, 0, tzinfo=UTC)
        termin = wunsch(jetzt=jetzt, wunsch_von="2027-11-10T10:00", wunsch_bis="2027-11-10T12:00")
        self.assertEqual(termin["wunsch_von"], "2027-11-10T09:00:00+00:00")
        self.assertIn("+01:00", A.ortszeit_text(termin["wunsch_von"], "Europe/Berlin"))

    def test_65_ausgelassene_stunde_wird_abgewiesen(self):
        with self.assertRaises(A.Feldfehler) as fehler:
            A.lies_zeitpunkt("2027-03-28T02:30", "Europe/Berlin")
        self.assertEqual(fehler.exception.code, "time_not_existent")
        with self.assertRaises(A.Abweisung) as abweisung:
            wunsch(wunsch_von="2027-03-28T02:30", wunsch_bis="2027-03-28T09:00")
        self.assertEqual(abweisung.exception.extra["fields"], {"wunsch_von": "time_not_existent"})
        with self.assertRaises(A.Feldfehler) as fehler:
            A.lies_zeitpunkt("2027-03-28T02:30+01:00", "Europe/Berlin")
        self.assertEqual(fehler.exception.code, "time_not_existent")

    def test_66_doppelte_stunde_nur_mit_versatz(self):
        with self.assertRaises(A.Feldfehler) as fehler:
            A.lies_zeitpunkt("2027-10-31T02:30", "Europe/Berlin")
        self.assertEqual(fehler.exception.code, "time_ambiguous")
        self.assertEqual(A.utc_text(A.lies_zeitpunkt("2027-10-31T02:30+02:00", "Europe/Berlin")), "2027-10-31T00:30:00+00:00")
        self.assertEqual(A.utc_text(A.lies_zeitpunkt("2027-10-31T02:30+01:00", "Europe/Berlin")), "2027-10-31T01:30:00+00:00")
        jetzt = datetime(2027, 10, 20, 9, 0, tzinfo=UTC)
        with self.assertRaises(A.Abweisung) as abweisung:
            wunsch(jetzt=jetzt, wunsch_von="2027-10-31T02:30", wunsch_bis="2027-10-31T09:00")
        self.assertEqual(abweisung.exception.extra["fields"], {"wunsch_von": "time_ambiguous"})
        self.assertEqual(wunsch(jetzt=jetzt, wunsch_von="2027-10-31T02:30+01:00", wunsch_bis="2027-10-31T09:00")["wunsch_von"], "2027-10-31T01:30:00+00:00")

    def test_67_erinnerung_am_vortag_rechnet_in_ortszeit(self):
        def abstand(termin_ortszeit):
            termin = A.lies_zeitpunkt(termin_ortszeit, "Europe/Berlin")
            return termin - A.aus_text(A.erinnerung_am_vortag(A.utc_text(termin), "Europe/Berlin"))
        self.assertEqual(abstand("2027-03-28T10:00"), timedelta(hours=23))
        self.assertEqual(abstand("2027-10-31T10:00"), timedelta(hours=25))
        self.assertEqual(abstand("2027-06-15T10:00"), timedelta(hours=24))

    def test_68_massgeblich_ist_die_zeitzone_der_werkstatt(self):
        mit_geraet = wunsch(zeitzone="America/New_York", geraet_zeitzone="Asia/Tokyo")
        self.assertEqual((mit_geraet["wunsch_von"], mit_geraet["zeitzone"]), (wunsch()["wunsch_von"], "Europe/Berlin"))
        with self.assertRaises(A.Feldfehler) as fehler:
            A.lies_zeitpunkt("2027-03-10T09:00-05:00", "Europe/Berlin")
        self.assertEqual(fehler.exception.code, "invalid", "ein Versatz, den es am Ort der Werkstatt nicht gibt, wird nicht umgerechnet")
        self.assertEqual(A.utc_text(A.lies_zeitpunkt("2027-03-10T09:00+01:00", "Europe/Berlin")), "2027-03-10T08:00:00+00:00")

    def test_69_alle_gespeicherten_zeitpunkte_enden_auf_plus_null(self):
        termine = [wunsch(), bestaetigt(), verschoben_von_werkstatt(), verschoben_von_kunde(), schritt(wunsch(), "cancel", K)[0],
                   A.anwenden(wunsch(), A.verfall(wunsch(), JETZT + timedelta(days=30)))]
        muster = r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$"
        for termin in termine:
            for feld in ("wunsch_von", "wunsch_bis", "termin_am", "vorschlag_am", "antwort_bis", "erstellt_am", "geaendert_am"):
                if termin[feld] is not None:
                    self.assertRegex(termin[feld], muster, feld)
            for eintrag in termin["verlauf"]:
                self.assertRegex(eintrag["zeit"], muster)
            self.assertRegex(termin["einwilligung"]["zeit"], muster)

    def test_zeitpunkt_formen(self):
        for unsinn in ("", "10.03.2027 09:00", "2027-03-10", "2027-03-10T25:00", "2027-13-10T09:00", "2027-03-10 09:00", 5, None):
            with self.assertRaises(A.Feldfehler) as fehler:
                A.lies_zeitpunkt(unsinn, "Europe/Berlin")
            self.assertEqual(fehler.exception.code, "invalid" if unsinn else "required", unsinn)
        with self.assertRaises(A.UnbekannteZeitzone):
            A.lies_zeitpunkt("2027-03-10T09:00", "Mars/Olympus")
        self.assertEqual({A.zeitzone_fuer_markt(m) for m in ("de-DE", "de-AT", "nl-NL", "de-CH", "nl-BE", "fr-LU", "fr-BE")},
                         {"Europe/Berlin", "Europe/Vienna", "Europe/Amsterdam", "Europe/Zurich", "Europe/Brussels", "Europe/Luxembourg"})
        self.assertIsNone(A.zeitzone_fuer_markt("en-US"))
        self.assertIsNone(A.zeitzone_fuer_markt(None))


class Vorlagen(unittest.TestCase):
    SPERRWORTE = ("angebot", "gutschein", "rabatt", "bewert", "empfehl", "andere werkst", "anderen werkst", "andere betrieb", "anderen betrieb",
                  "partner werden", "newsletter", "aktion", "sonderpreis", "jetzt kaufen", "teile bestellen", "weitere werkst")

    def faelle(self):
        w, b, v = wunsch(), bestaetigt(), verschoben_von_werkstatt()
        abgelehnt = schritt(w, "decline", W, grund_code="keine_kapazitaet")[0]
        abgesagt = schritt(b, "cancel", K)[0]
        verfallen = A.anwenden(w, A.verfall(w, JETZT + timedelta(days=30)))
        return [("N1", w, K), ("N2", w, W), ("N3", b, K), ("N3", b, W), ("N4", abgelehnt, K), ("N5", v, K), ("N5", verschoben_von_kunde(), W),
                ("N6", abgesagt, W), ("N6", abgesagt, K), ("N7", verfallen, K), ("N7", A.anwenden(v, A.verfall(v, JETZT + timedelta(days=30))), W)]

    def test_75_vorlagen_nennen_nur_den_sachstand(self):
        self.assertEqual(set(M.VORLAGEN), {"N1", "N2", "N3", "N4", "N5", "N6", "N7"})
        for code, termin, empfaenger in self.faelle():
            betreff, html, text = M.nachricht(code, termin, empfaenger)
            for inhalt in (text, html):
                self.assertIn(termin["nummer"], inhalt, code)
                self.assertIn(M.ZUSTAND_TEXT[termin["zustand"]], M.klartext(inhalt), code)
                klein = M.klartext(inhalt).casefold()
                for wort in self.SPERRWORTE:
                    self.assertNotIn(wort, klein, (code, wort))
            self.assertIn(termin["nummer"], betreff)
            self.assertNotIn("<", text)
        betreff, html, text = M.nachricht("N3", bestaetigt(), K)
        for teil in ("10.03.2027", "10:00", "Europe/Berlin", "Musterweg 1, 52062 Aachen"):
            self.assertIn(teil, text)
            self.assertIn(teil, html)

    def test_kopf_kennzeichnet_die_texte_als_entwurf(self):
        kopf = (ROOT / "apps/shop-api/shop/appointment_mails.py").read_text(encoding="utf-8")[:1200]
        self.assertIn("ENTWURF", kopf)
        self.assertIn("Freigabe des Inhabers", kopf)
        self.assertFalse(M.VOM_INHABER_FREIGEGEBEN)

    def test_n1_behauptet_keine_benachrichtigung_der_werkstatt(self):
        ohne = M.nachricht("N1", wunsch(), K)[2]
        mit = M.nachricht("N1", wunsch(), K, werkstatt_benachrichtigt=True)[2]
        self.assertNotIn("benachrichtigt", ohne)
        self.assertNotIn("informiert", ohne)
        self.assertIn("benachrichtigt", mit)
        for text in (ohne, mit):
            self.assertIn("noch kein Termin", text)

    def test_nachrichten_an_die_werkstatt_tragen_keine_kontaktdaten_des_kunden(self):
        for code, termin, empfaenger in self.faelle():
            if empfaenger == W:
                betreff, html, text = M.nachricht(code, termin, empfaenger)
                for geheim in (termin["kunde_email"], termin["anliegen"], termin["kunde_name"]):
                    self.assertNotIn(geheim, text + html + betreff, code)

    def test_verwaltungslink_und_eingaben_werden_maskiert(self):
        termin = wunsch()
        termin["werkstatt_name"] = "<script>alert(1)</script>"
        betreff, html, text = M.nachricht("N1", termin, K, verwaltungslink="https://beispiel.invalid/teileklar/termine?id=1#zugriff=abc")
        self.assertNotIn("<script>", html)
        self.assertIn("https://beispiel.invalid/teileklar/termine?id=1#zugriff=abc", text)
        with self.assertRaises(KeyError):
            M.nachricht("N8", termin, K)


class Nacharbeit(unittest.TestCase):
    """Befunde der unabhängigen Prüfung von PR 195 und dort unentdeckte Veränderungen, soweit sie die Zustandsmaschine betreffen."""

    def test_m03_durchfuehrung_genau_zum_terminbeginn_ist_noch_verboten(self):
        termin = bestaetigt()
        beginn = A.aus_text(termin["termin_am"])
        with self.assertRaises(A.Abweisung) as fehler:
            schritt(termin, "complete", W, jetzt=beginn)
        self.assertEqual(fehler.exception.code, "appointment_transition_forbidden")
        self.assertNotIn("complete", A.erlaubte_aktionen(termin, W, beginn, FRISTEN))
        self.assertEqual(schritt(termin, "complete", W, jetzt=beginn + timedelta(seconds=1))[0]["zustand"], "erledigt")

    def test_m31_fristen_von_null_sind_keine_fristen(self):
        for name in ("TEILEKLAR_APPOINTMENTS_F1_MINUTES", "TEILEKLAR_APPOINTMENTS_F2_MINUTES", "TEILEKLAR_APPOINTMENTS_F4_MINUTES", "TEILEKLAR_APPOINTMENTS_F11_ROUNDS"):
            self.assertIsNone(A.fristen_aus({**BEISPIELWERTE, name: "0"}), name)
        for name in ("TEILEKLAR_APPOINTMENTS_F3_MINUTES", "TEILEKLAR_APPOINTMENTS_F5_MINUTES"):
            self.assertIsNotNone(A.fristen_aus({**BEISPIELWERTE, name: "0"}), name)
        for unsinn in (None, 5, 5.0, " ", "+5", "5 ", "0x10", "١٢"):
            werte = {**BEISPIELWERTE, "TEILEKLAR_APPOINTMENTS_F1_MINUTES": unsinn}
            ergebnis = A.fristen_aus(werte)
            self.assertTrue(ergebnis is None or ergebnis.f1 == timedelta(minutes=5), unsinn)

    def test_m20_b15_vorschlag_in_der_vergangenheit_oder_zu_weit_voraus(self):
        for termin, rolle in ((wunsch(), W), (bestaetigt(), K), (bestaetigt(), W), (verschoben_von_werkstatt(), K)):
            for wert, code in (("2027-03-01T09:59", "in_past"), ("2027-03-01T10:00", "in_past"), ("2027-04-30T11:01", "too_late"), ("2999-01-01T10:00", "invalid")):
                with self.assertRaises(A.Abweisung) as fehler:
                    schritt(termin, "propose", rolle, vorschlag_am=wert)
                self.assertEqual((fehler.exception.status, fehler.exception.extra["fields"]), (422, {"vorschlag_am": code}), (termin["zustand"], wert))
        self.assertEqual(schritt(bestaetigt(), "propose", K, vorschlag_am="2027-04-30T11:00")[0]["zustand"], "verschoben", "genau am Höchstvorlauf")
        with self.assertRaises(A.Abweisung) as fehler:
            schritt(wunsch(), "confirm", W, jetzt=JETZT + timedelta(days=1), termin_am="2027-03-02T10:00")
        self.assertEqual(fehler.exception.extra["fields"], {"termin_am": "in_past"})

    def test_b2_zeitpunkte_ausserhalb_des_bereichs_sind_feldfehler(self):
        for wert in ("0001-01-01T00:00", "9999-12-31T23:59", "0001-01-01T00:00+14:00", "9999-12-31T23:59-14:00", "1999-12-31T23:59", "2200-01-01T00:00"):
            for zone in ("Europe/Berlin", "Europe/Amsterdam"):
                with self.assertRaises(A.Feldfehler) as fehler:
                    A.lies_zeitpunkt(wert, zone)
                self.assertEqual(fehler.exception.code, "invalid", wert)
        self.assertEqual(len(A.pruefsumme({"name": "\ud800"})), 64, "auch ein einzelnes Surrogat bringt die Prüfsumme nicht zu Fall")

    def test_m27_m28_laengengrenzen(self):
        for eingabe, feld in (({"telefon": "0" * 41}, "telefon"), ({"fahrzeug": "x" * 161}, "fahrzeug"), ({"email": "a@" + "b" * 160 + ".invalid"}, "email")):
            with self.assertRaises(A.Abweisung) as fehler:
                wunsch(**eingabe)
            self.assertEqual(fehler.exception.extra["fields"], {feld: "invalid"})
        self.assertEqual(wunsch(telefon="0" * 40)["kunde_telefon"], "0" * 40)
        for aktion, rolle, termin, mehr in (("decline", W, wunsch(), {"grund_code": "sonstiges"}), ("cancel", K, wunsch(), {}), ("cancel", W, bestaetigt(), {"grund_code": "verhindert"})):
            with self.assertRaises(A.Abweisung) as fehler:
                schritt(termin, aktion, rolle, grund_text="x" * 201, **mehr)
            self.assertEqual(fehler.exception.extra["fields"], {"grund_text": "invalid"})
            with self.assertRaises(A.Abweisung):
                schritt(termin, aktion, rolle, grund_text=["kein", "text"], **mehr)
            self.assertEqual(schritt(termin, aktion, rolle, grund_text=" " + "x" * 200 + " ", **mehr)[0]["grund_text"], "x" * 200)

    def test_m25_absage_nimmt_zeitpunkt_und_vorschlag_weg(self):
        for termin, rolle, mehr in ((bestaetigt(), K, {}), (bestaetigt(), W, {"grund_code": "verhindert"}), (verschoben_von_werkstatt(), K, {}), (verschoben_von_kunde(), I, {"grund_code": "betrieblich"})):
            neu, _ = schritt(termin, "cancel", rolle, **mehr)
            self.assertEqual((neu["termin_am"], neu["vorschlag_am"], neu["antwort_bis"]), (None, None, None))
            self.assertEqual((neu["verlauf"][-1]["termin_am_zuvor"], neu["verlauf"][-1]["vorschlag_am_zuvor"]), (termin["termin_am"], termin["vorschlag_am"]))

    def test_b13_ergebnis_eines_frueheren_aufrufs(self):
        erster, _ = schritt(wunsch(), "confirm", W, schluessel="sA", termin_am="2027-03-10T10:00")
        erster["benachrichtigungen"] = [{"version": 1, "ereignis": "N1"}, {"version": 2, "ereignis": "N3"}]
        erster["verlauf"].append({"art": "zugriff", "ausloeser": I, "zeit": A.utc_text(JETZT)})
        spaeter, _ = schritt(erster, "cancel", K, schluessel="sB")
        spaeter["benachrichtigungen"].append({"version": 3, "ereignis": "N6"})
        damals = A.ergebnis_von(spaeter, "sA")
        self.assertEqual((damals["zustand"], damals["version"], damals["termin_am"], damals["abgesagt_von"]), ("bestaetigt", 2, "2027-03-10T09:00:00+00:00", None))
        self.assertEqual(([e.get("nr") for e in damals["verlauf"]], [a["ereignis"] for a in damals["benachrichtigungen"]]), (["U1", "U2"], ["N1", "N3"]))
        self.assertEqual({k: v for k, v in damals.items() if k not in ("verlauf", "benachrichtigungen")},
                         {k: v for k, v in erster.items() if k not in ("verlauf", "benachrichtigungen")})
        anfang = A.ergebnis_von(spaeter, "s0")
        self.assertEqual((anfang["zustand"], anfang["version"], anfang["termin_am"], len(anfang["verlauf"])), ("wunsch", 1, None, 1))
        self.assertEqual((spaeter["zustand"], spaeter["version"]), ("abgesagt", 3), "der Termin selbst bleibt unberührt")
        self.assertIsNone(A.ergebnis_von(spaeter, "unbekannt"))
        self.assertIsNone(A.ergebnis_von(spaeter, None))
        self.assertNotIn("stand", A.sicht(spaeter, K)["verlauf"][0])
        self.assertNotIn("stand", A.sicht(spaeter, W)["verlauf"][0])

    def test_b16_erinnerung_am_vortag_verschiebt_keine_uhrzeit(self):
        for termin_ortszeit, code in (("2027-03-29T02:30", "time_not_existent"), ("2027-11-01T02:30", "time_ambiguous")):
            termin = A.utc_text(A.lies_zeitpunkt(termin_ortszeit, "Europe/Berlin"))
            with self.assertRaises(A.Feldfehler) as fehler:
                A.erinnerung_am_vortag(termin, "Europe/Berlin")
            self.assertEqual(fehler.exception.code, code)

    def test_b8_b9_m34_wortlaut_der_nachrichten(self):
        angaben = {"telefon": "+49 241 5550123", "fahrzeug": "Beispielwagen 1.6 Kombi"}
        w = wunsch(**angaben)
        verfallen = A.anwenden(w, A.verfall(w, JETZT + timedelta(days=30)))
        v = schritt(w, "propose", W, vorschlag_am="2027-03-12T10:00")[0]
        vorschlag_verfallen = A.anwenden(v, A.verfall(v, JETZT + timedelta(days=30)))
        for termin, empfaenger in ((verfallen, K), (vorschlag_verfallen, K), (vorschlag_verfallen, W)):
            betreff, html, text = M.nachricht("N7", termin, empfaenger)
            for behauptung in ("nicht geantwortet", "Werkstatt hat", "Kunde hat", "nicht reagiert"):
                self.assertNotIn(behauptung, text + html)
            self.assertIn("Es besteht kein Termin", text)
        # Der Wortlaut von N7 ist als Ganzes festgehalten: jede Umformulierung muss hier bewusst nachgezogen werden.
        kopf = "Frist abgelaufen\n\n%s\n\nVorgang: " + w["nummer"] + "\nStand: Frist abgelaufen – kein Termin\nWerkstatt: Beispielwerkstatt P"
        wunsch_satz = "Der Terminwunsch wurde bis zum Ablauf der Frist nicht bestätigt. Es besteht kein Termin."
        vorschlag_satz = "Der Vorschlag für einen anderen Zeitpunkt wurde bis zum Ablauf der Frist nicht angenommen. Es besteht kein Termin."
        hinweis = "\n\nDen Link zur Verwaltung dieses Vorgangs finden Sie in der ersten Nachricht zu diesem Vorgang."
        self.assertEqual(M.nachricht("N7", verfallen, K), ("Frist abgelaufen " + w["nummer"], M.nachricht("N7", verfallen, K)[1], kopf % (wunsch_satz + hinweis)))
        self.assertEqual(M.nachricht("N7", vorschlag_verfallen, K)[2], kopf % (vorschlag_satz + hinweis))
        self.assertEqual(M.nachricht("N7", vorschlag_verfallen, W)[2], kopf % vorschlag_satz)
        for termin, empfaenger, satz in ((verfallen, K, wunsch_satz), (vorschlag_verfallen, W, vorschlag_satz)):
            html = M.nachricht("N7", termin, empfaenger)[1]
            self.assertEqual(M.klartext(html).count(satz), 1)
            self.assertEqual(html.count("<p>"), 2 if empfaenger == K else 1, "kein weiterer Absatz")
        abgesagt = schritt(schritt(w, "confirm", W, termin_am="2027-03-10T10:00")[0], "cancel", K)[0]
        for code, termin in (("N2", w), ("N5", schritt(schritt(w, "confirm", W, termin_am="2027-03-10T10:00")[0], "propose", K, vorschlag_am="2027-03-15T10:00")[0]),
                             ("N6", abgesagt), ("N7", vorschlag_verfallen), ("N3", schritt(v, "accept", K)[0])):
            betreff, html, text = M.nachricht(code, termin, W, verwaltungslink="https://beispiel.invalid/x#zugriff=geheim")
            ganz = betreff + html + text
            for angabe in (w["kunde_name"], w["kunde_email"], w["kunde_telefon"], w["fahrzeug"], w["anliegen"], "geheim", "Partnerbereich", "Partnerportal", "angemeldet"):
                self.assertNotIn(angabe, ganz, (code, angabe))
        self.assertIn("geheim", M.nachricht("N1", w, K, verwaltungslink="https://beispiel.invalid/x#zugriff=geheim")[2])


if __name__ == "__main__":
    unittest.main()

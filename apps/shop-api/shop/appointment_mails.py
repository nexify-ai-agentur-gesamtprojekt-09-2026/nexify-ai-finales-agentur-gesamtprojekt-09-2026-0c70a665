"""Terminnachrichten N1 bis N7 des Werkstattservice (docs/03-backend/werkstatt-terminlogik.md, Abschnitt 4).

ENTWURF. Diese Texte sind nicht freigegeben. Vor dem ersten Versand brauchen sie die Freigabe des Inhabers
(Wortlaut, Absender, Sprachen: E-12; Umfang der Angaben an die Werkstatt: E-09). Bis dahin bleibt
VOM_INHABER_FREIGEGEBEN auf False, und solange es False ist, versendet die Schnittstelle NICHTS, auch nicht bei
gesetztem Umgebungsschalter. Die Freigabe ist damit eine Änderung dieser Datei (ein eigener, sichtbarer Commit),
der Umgebungsschalter appointments_api.SCHALTER_NACHRICHTEN (Standard aus) kommt zusätzlich hinzu.

Regeln: nur Sachstand, Vorgangsnummer und Verwaltungsweg; keine Werbung, kein Preis, keine Rechtsaussage,
kein Einwilligungstext. Nachrichten an die Werkstatt tragen keine Angaben des Kunden. Zeitangaben stehen in
Ortszeit der Werkstatt mit Nennung der Zeitzone. Deutsch, Sie-Form. Die Pflichtangaben des Absenders stehen
nicht hier: Sie kommen beim Einbinden (B5) aus dem bestehenden Rahmen des Shop-Dienstes (fuss_html, fuss_text).

Dieses Modul sendet nichts und importiert nur die Standardbibliothek und die Terminlogik.
"""
import html as _html
import re

from . import appointments as termine

VOM_INHABER_FREIGEGEBEN = False

ZUSTAND_TEXT = {
    "wunsch": "Terminwunsch gesendet – noch kein Termin",
    "bestaetigt": "Termin bestätigt",
    "verschoben": "Anderer Zeitpunkt vorgeschlagen – noch kein Termin",
    "abgelehnt": "Terminwunsch abgelehnt – kein Termin",
    "abgesagt": "Abgesagt – kein Termin",
    "erledigt": "Termin durchgeführt",
    "verfallen": "Frist abgelaufen – kein Termin",
}
SEITE_TEXT = {termine.KUNDE: "der Kunde", termine.WERKSTATT: "die Werkstatt", termine.INHABER: "TEILEKLAR"}
GRUND_TEXT = {
    "keine_kapazitaet": "Im gewünschten Zeitraum ist kein Platz frei.",
    "leistung_nicht_moeglich": "Die gewünschte Leistung ist dort nicht möglich.",
    "zeitraum_nicht_moeglich": "Der Zeitraum ist nicht möglich.",
    "verhindert": "Der Zeitpunkt kann nicht eingehalten werden.",
    "betrieblich": "Betrieblicher Grund.",
    "sonstiges": "Ohne nähere Angabe.",
}


def klartext(inhalt):
    """Text ohne Auszeichnung; für Prüfungen des Wortlauts."""
    return _html.unescape(re.sub(r"<[^>]+>", " ", inhalt))


def _zeit(termin, wert):
    return termine.ortszeit_text(wert, termin["zeitzone"]) if wert else ""


def _letzter(termin):
    return termin["verlauf"][-1] if termin.get("verlauf") else {}


def _zeilen(termin, *weitere):
    return [("Vorgang", termin["nummer"]), ("Stand", ZUSTAND_TEXT[termin["zustand"]]), ("Werkstatt", termin["werkstatt_name"])] + [z for z in weitere if z and z[1]]


def _fenster(termin):
    return ("Wunschzeitraum", "%s bis %s" % (_zeit(termin, termin["wunsch_von"]), _zeit(termin, termin["wunsch_bis"])))


def n1(termin, empfaenger, kontext):
    absaetze = ["Ihr Terminwunsch ist gespeichert. Es besteht noch kein Termin: Ein Termin entsteht erst, wenn die Werkstatt ihn bestätigt."]
    if kontext.get("werkstatt_benachrichtigt"):
        absaetze.append("Die Werkstatt wurde per E-Mail über Ihren Terminwunsch benachrichtigt.")
    return "Ihr Terminwunsch %s" % termin["nummer"], "Terminwunsch gesendet", absaetze, _zeilen(termin, _fenster(termin), ("Antwort der Werkstatt bis", _zeit(termin, termin["antwort_bis"])))


def n2(termin, empfaenger, kontext):
    absaetze = ["Für Ihren Betrieb liegt ein neuer Terminwunsch vor. Es besteht noch kein Termin.",
                "Ohne Antwort bis zum genannten Zeitpunkt verfällt der Wunsch."]
    # Der Weg zum Antworten (Partneranmeldung, W7, E-08) existiert noch nicht und wird deshalb nicht genannt.
    return "Neuer Terminwunsch %s" % termin["nummer"], "Neuer Terminwunsch", absaetze, _zeilen(termin, _fenster(termin), ("Antwort bis", _zeit(termin, termin["antwort_bis"])))


def n3(termin, empfaenger, kontext):
    absaetze = ["Der Termin ist bestätigt."]
    return "Termin bestätigt %s" % termin["nummer"], "Termin bestätigt", absaetze, _zeilen(termin, ("Termin", _zeit(termin, termin["termin_am"])), ("Anschrift", termin["werkstatt_anschrift"]))


def n4(termin, empfaenger, kontext):
    absaetze = ["Die Werkstatt hat Ihren Terminwunsch abgelehnt. Es besteht kein Termin."]
    return "Terminwunsch abgelehnt %s" % termin["nummer"], "Terminwunsch abgelehnt", absaetze, _zeilen(termin, ("Angabe der Werkstatt", GRUND_TEXT.get(termin.get("grund_code"), "")))


def n5(termin, empfaenger, kontext):
    wer = "Die Werkstatt schlägt" if termin.get("vorschlag_von") == termine.WERKSTATT else "Der Kunde schlägt"
    absaetze = ["%s einen anderen Zeitpunkt vor. Es besteht noch kein Termin: Der Vorschlag gilt erst, wenn Sie ihn annehmen." % wer,
                "Ohne Antwort bis zum genannten Zeitpunkt verfällt der Vorschlag."]
    return "Vorschlag für einen anderen Zeitpunkt %s" % termin["nummer"], "Anderer Zeitpunkt vorgeschlagen", absaetze, _zeilen(termin, ("Vorgeschlagener Zeitpunkt", _zeit(termin, termin["vorschlag_am"])), ("Antwort bis", _zeit(termin, termin["antwort_bis"])))


def n6(termin, empfaenger, kontext):
    seite = SEITE_TEXT.get(termin.get("abgesagt_von"), "eine Seite")
    eintrag = _letzter(termin)
    absaetze = ["Der Vorgang wurde abgesagt (%s). Es besteht kein Termin." % seite]
    return "Absage %s" % termin["nummer"], "Abgesagt", absaetze, _zeilen(termin, ("Abgesagter Termin", _zeit(termin, eintrag.get("termin_am_zuvor"))), ("Angabe", GRUND_TEXT.get(termin.get("grund_code"), "")))


def n7(termin, empfaenger, kontext):
    # Nur was der Code festgestellt hat: Die Frist ist abgelaufen. Ob die Werkstatt den Wunsch je erhalten hat, weiß er nicht.
    if _letzter(termin).get("nr") == "U6":
        satz = "Der Terminwunsch wurde bis zum Ablauf der Frist nicht bestätigt. Es besteht kein Termin."
    else:
        satz = "Der Vorschlag für einen anderen Zeitpunkt wurde bis zum Ablauf der Frist nicht angenommen. Es besteht kein Termin."
    return "Frist abgelaufen %s" % termin["nummer"], "Frist abgelaufen", [satz], _zeilen(termin)


VORLAGEN = {"N1": n1, "N2": n2, "N3": n3, "N4": n4, "N5": n5, "N6": n6, "N7": n7}


def nachricht(code, termin, empfaenger, verwaltungslink="", werkstatt_benachrichtigt=False, fuss_html="", fuss_text=""):
    """(Betreff, HTML, Text) der Nachricht `code` an die Rolle `empfaenger`. Sendet nichts."""
    betreff, titel, absaetze, zeilen = VORLAGEN[code](termin, empfaenger, {"werkstatt_benachrichtigt": werkstatt_benachrichtigt})
    if empfaenger == termine.KUNDE:
        if verwaltungslink:
            absaetze = absaetze + ["Über den folgenden Link sehen und verwalten Sie diesen Vorgang. Das Öffnen des Links ändert nichts."]
            zeilen = zeilen + [("Verwaltung", verwaltungslink)]
        elif code != "N1":
            absaetze = absaetze + ["Den Link zur Verwaltung dieses Vorgangs finden Sie in der ersten Nachricht zu diesem Vorgang."]
    esc = _html.escape
    html = "<!DOCTYPE html><html lang=\"de\"><head><meta charset=\"utf-8\"><title>%s</title></head><body><h1>%s</h1>%s<table>%s</table>%s</body></html>" % (
        esc(betreff), esc(titel), "".join("<p>%s</p>" % esc(a) for a in absaetze),
        "".join("<tr><th align=\"left\">%s</th><td>%s</td></tr>" % (esc(k), esc(str(v))) for k, v in zeilen), fuss_html)
    text = "%s\n\n%s\n\n%s%s" % (titel, "\n\n".join(absaetze), "\n".join("%s: %s" % (k, v) for k, v in zeilen), fuss_text)
    return betreff, html, text

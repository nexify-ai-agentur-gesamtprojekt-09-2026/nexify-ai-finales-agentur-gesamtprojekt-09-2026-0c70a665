"""Laufzeit: treibt Läufe Schritt für Schritt – ohne Modell, ohne Netz.

Modell und Werkzeuge kommen als Ports herein; das Modell nur als von der
Policy zugelassener Port (policy.ModellPolicy.zulassen). Jede öffentliche Operation
verlangt den Mandanten; ein Lauf eines anderen Mandanten ist „unbekannt".

Feste Regeln (nicht konfigurierbar):
- Freigabepflichtige Aktionsklassen halten den Lauf an. Es gibt keinen
  Parameter, der das abschaltet; nur `freigabe_erteilen` mit einem Menschen
  und dem bestätigten Argument-Hash lässt genau diesen einen Aufruf zu.
- Der Mandant eines Werkzeugaufrufs ist der Mandant des Laufs.
- Sub-Agenten erben Mandant, Rechte und Grenzen und können sie nur einengen;
  ihr Verbrauch zählt gegen das Budget des Auftraggebers.
- Modellaufrufe werden nie wiederholt. Werkzeuge nur, wenn sie sich selbst
  als wiederholbar (ohne Außenwirkung) ausweisen, begrenzt und mit Wartezeit.
- Unbekannter Ausgang wird nie blind wiederholt, sondern abgelegt.
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import hmac
import json
import re
import secrets
import time
from types import MappingProxyType
from typing import Callable, Iterable
import uuid

from nexify_knowledge import Mandant

from .journal import Ereignis, Journal, Journaleintrag
from .lauf import (
    Aufgabenentwurf, Fehlerfall, Freigabe, Freigabeanfrage, Grenzen, Laufauskunft, Rechte,
    Wiederholungsregel,
)
from .ports import (
    MAX_AUFTRAG_ZEICHEN, Abschluss, Aufgabenvorschlag, ErgebnisseImArbeitsspeicher,
    Ergebnisspeicher, Laufsicht, Modellantwort, SkillAnfordern, UnbekannterAusgang,
    Unterauftrag, Verlaufseintrag, VoruebergehenderFehler, WerkzeugAufruf, WerkzeugPort,
    Werkzeugergebnis, werkzeug_pruefen,
)
from .policy import PolicyFehler, ZugelassenerModellPort
from .skills import SkillFehler, SkillRegister
from .typen import (
    NAME, FreigabeUngueltig, GrenzenFehler, IdempotenzKonflikt, KernFehler, LaufNichtWartend,
    LaufUnbekannt, Laufstatus, Mensch, RechteErweiterung, code_pruefen, kanonisch, sha256_hex,
    Aktionsklasse,
)

_SCHLUESSEL = re.compile(r"[A-Za-z0-9][A-Za-z0-9._:-]{7,127}")
_KENNUNG = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}")
MAX_TEXT = 20000


def _jetzt_utc() -> datetime:
    return datetime.now(timezone.utc)


def _neue_kennung() -> str:
    return uuid.uuid4().hex


def _form(entscheidung: object) -> object:
    """Serialisierbare Form einer Entscheidung, nur zum Hashen."""
    try:
        if type(entscheidung) is WerkzeugAufruf:
            return ["werkzeug", entscheidung.werkzeug, dict(entscheidung.argumente)]
        if type(entscheidung) is SkillAnfordern:
            return ["skill", entscheidung.name]
        if type(entscheidung) is Unterauftrag:
            return ["unterauftrag", entscheidung.rolle, entscheidung.auftrag, sorted(entscheidung.werkzeuge),
                    sorted(entscheidung.skills), entscheidung.max_schritte, entscheidung.max_kosten]
        return ["abschluss", entscheidung.ergebnis, [[a.titel, a.beschreibung] for a in entscheidung.aufgaben]]
    except Exception:
        return object()  # nicht hashbar; die Laufzeit lehnt die Entscheidung im Folgeschritt ab


class _Lauf:
    """Veränderlicher Zustand eines Laufs. Nur die Laufzeit fasst ihn an."""

    def __init__(self, *, kennung: str, mandant: Mandant, auftrag: str, rolle: str, tiefe: int,
                 grenzen: Grenzen, rechte: Rechte, wurzel: str) -> None:
        self.kennung, self.mandant, self.auftrag, self.rolle = kennung, mandant, auftrag, rolle
        self.tiefe, self.grenzen, self.rechte, self.wurzel = tiefe, grenzen, rechte, wurzel
        self.status = Laufstatus.ANGELEGT
        self.schritte = 0
        self.kosten = 0
        self.verlauf: list[Verlaufseintrag] = []
        self.offene_freigabe: Freigabeanfrage | None = None
        self.freigegeben: Freigabeanfrage | None = None
        self.freigaben: list[Freigabe] = []
        self.unterlauf: _Lauf | None = None
        self.ergebnis: str | None = None
        self.aufgaben: list[Aufgabenentwurf] = []
        self.ende_code: str | None = None

    def auskunft(self) -> Laufauskunft:
        return Laufauskunft(
            self.kennung, self.mandant.kennung, self.rolle, self.tiefe, self.status, self.schritte,
            self.kosten, self.grenzen, self.rechte, self.wartend_auf(), self.ergebnis,
            tuple(self.aufgaben), self.ende_code, tuple(self.freigaben),
            None if self.unterlauf is None else self.unterlauf.auskunft())

    def kette(self) -> list["_Lauf"]:
        glieder, aktuell = [self], self.unterlauf
        while aktuell is not None:
            glieder.append(aktuell)
            aktuell = aktuell.unterlauf
        return glieder

    def wartend_auf(self) -> Freigabeanfrage | None:
        for glied in self.kette():
            if glied.offene_freigabe is not None:
                return glied.offene_freigabe
        return None


class Laufzeit:
    def __init__(self, *, modell: ZugelassenerModellPort, werkzeuge: Iterable[WerkzeugPort],
                 wiederholung: Wiederholungsregel, skills: SkillRegister | None = None,
                 ergebnisse: Ergebnisspeicher | None = None,
                 uhr: Callable[[], datetime] = _jetzt_utc,
                 schlaf: Callable[[float], None] = time.sleep,
                 kennungen: Callable[[], str] = _neue_kennung,
                 journal_salz: bytes | None = None) -> None:
        if type(modell) is not ZugelassenerModellPort:
            raise KernFehler("modell_port_nicht_gegen_policy_geprueft")
        if type(wiederholung) is not Wiederholungsregel:
            raise GrenzenFehler("wiederholungsregel_ist_pflicht")
        if skills is not None and type(skills) is not SkillRegister:
            raise KernFehler("skill_register_ungueltig")
        # Name, Aktionsklasse und Wiederholbarkeit werden bei der Anmeldung festgehalten;
        # ein Werkzeug kann sich später nicht selbst in eine harmlosere Klasse umstufen.
        register: dict[str, tuple[WerkzeugPort, Aktionsklasse, bool]] = {}
        for werkzeug in werkzeuge:
            werkzeug_pruefen(werkzeug)
            if werkzeug.name in register:
                raise KernFehler("werkzeugname_doppelt")
            register[werkzeug.name] = (werkzeug, werkzeug.aktionsklasse, werkzeug.wiederholbar)
        self.__modell = modell
        self.__werkzeuge = MappingProxyType(register)
        self.__regel = wiederholung
        self.__skills = skills
        self.__ergebnisse = ergebnisse if ergebnisse is not None else ErgebnisseImArbeitsspeicher()
        if not isinstance(self.__ergebnisse, Ergebnisspeicher):
            raise KernFehler("ergebnisspeicher_ungueltig")
        self.__uhr, self.__schlaf, self.__kennungen = uhr, schlaf, kennungen
        self.__journal = Journal(journal_salz if journal_salz is not None else secrets.token_bytes(32), uhr)
        self.__laeufe: dict[tuple[str, str], _Lauf] = {}
        self.__nach_schluessel: dict[tuple[str, str], tuple[str, str]] = {}
        self.__fehler: list[Fehlerfall] = []

    # ---- öffentliche Operationen (Mandant immer zuerst) ------------------------------

    def anlegen(self, mandant: Mandant, auftrag: str, *, grenzen: Grenzen, rechte: Rechte,
                idempotenzschluessel: str) -> Laufauskunft:
        """Legt einen Lauf an, führt ihn aber nicht aus. Gleicher Schlüssel = derselbe Lauf."""
        mandant = self.__mandant(mandant)
        if type(auftrag) is not str or not auftrag.strip() or len(auftrag) > MAX_AUFTRAG_ZEICHEN:
            raise KernFehler("auftrag_ungueltig")
        if type(grenzen) is not Grenzen:
            raise GrenzenFehler("grenzen_sind_pflicht")
        if type(rechte) is not Rechte:
            raise KernFehler("rechte_sind_pflicht")
        if type(idempotenzschluessel) is not str or _SCHLUESSEL.fullmatch(idempotenzschluessel) is None:
            raise KernFehler("idempotenzschluessel_ungueltig")
        if not rechte.werkzeuge <= set(self.__werkzeuge):
            raise KernFehler("recht_auf_unbekanntes_werkzeug")
        bekannte_skills = set(self.__skills.namen()) if self.__skills is not None else set()
        if not rechte.skills <= bekannte_skills:
            raise KernFehler("recht_auf_unbekannten_skill")
        abdruck = sha256_hex([auftrag, [grenzen.max_schritte, grenzen.max_kosten, grenzen.max_tiefe,
                                        grenzen.max_wiederholungen],
                              sorted(rechte.werkzeuge), sorted(rechte.skills), rechte.aufgaben_vorschlagen])
        ort = (mandant.kennung, idempotenzschluessel)
        if ort in self.__nach_schluessel:
            kennung, bekannt = self.__nach_schluessel[ort]
            if bekannt != abdruck:
                raise IdempotenzKonflikt("idempotenzschluessel_mit_anderem_auftrag")
            return self.__laeufe[(mandant.kennung, kennung)].auskunft()
        lauf = _Lauf(kennung=self.__neue_kennung(), mandant=mandant, auftrag=auftrag, rolle="haupt",
                     tiefe=0, grenzen=grenzen, rechte=rechte, wurzel=idempotenzschluessel)
        self.__laeufe[(mandant.kennung, lauf.kennung)] = lauf
        self.__nach_schluessel[ort] = (lauf.kennung, abdruck)
        self.__notiere(lauf, Ereignis.LAUF_ANGELEGT, "angelegt", eingabe_hash=self.__journal.hash(auftrag))
        return lauf.auskunft()

    def fortsetzen(self, mandant: Mandant, lauf: str) -> Laufauskunft:
        """Treibt den Lauf bis zum Ende, zur nächsten Freigabe oder zu einer Grenze."""
        ziel = self.__finden(mandant, lauf)
        if not ziel.status.beendet and ziel.status is not Laufstatus.WARTET_AUF_FREIGABE:
            self.__treiben(ziel)
        return ziel.auskunft()

    def status(self, mandant: Mandant, lauf: str) -> Laufauskunft:
        return self.__finden(mandant, lauf).auskunft()

    def freigabe_erteilen(self, mandant: Mandant, lauf: str, anfrage: str, *, freigeber: Mensch,
                          bestaetigter_hash: str) -> Laufauskunft:
        """Ausdrückliche menschliche Freigabe genau einer wartenden Aktion."""
        ziel, wartender, offen = self.__wartender(mandant, lauf, anfrage, freigeber)
        if type(bestaetigter_hash) is not str or not hmac.compare_digest(
                bestaetigter_hash.encode("utf-8", "replace"), offen.argumente_hash.encode()):
            raise FreigabeUngueltig("bestaetigter_hash_passt_nicht")
        wartender.offene_freigabe, wartender.freigegeben = None, offen
        wartender.freigaben.append(Freigabe(offen.kennung, freigeber, True, self.__uhr().isoformat(), None))
        self.__weiter(ziel)
        self.__notiere(wartender, Ereignis.FREIGABE_ERTEILT, offen.aktionsklasse.value, bezug=offen.kennung,
                       akteur_hash=self.__journal.hash(freigeber.kennung))
        return ziel.auskunft()

    def freigabe_ablehnen(self, mandant: Mandant, lauf: str, anfrage: str, *, freigeber: Mensch,
                          grund: str) -> Laufauskunft:
        """Ablehnung: die Aktion wird nicht ausgeführt; der Lauf erfährt nur den Grundcode."""
        ziel, wartender, offen = self.__wartender(mandant, lauf, anfrage, freigeber)
        grund = code_pruefen(grund)
        wartender.offene_freigabe = None
        wartender.freigaben.append(Freigabe(offen.kennung, freigeber, False, self.__uhr().isoformat(), grund))
        wartender.verlauf.append(Verlaufseintrag("freigabe_abgelehnt", offen.werkzeug, {"grund": grund}))
        self.__weiter(ziel)
        self.__notiere(wartender, Ereignis.FREIGABE_ABGELEHNT, grund, bezug=offen.kennung,
                       akteur_hash=self.__journal.hash(freigeber.kennung))
        return ziel.auskunft()

    def abbrechen(self, mandant: Mandant, lauf: str, *, akteur: Mensch) -> Laufauskunft:
        ziel = self.__finden(mandant, lauf)
        if type(akteur) is not Mensch:
            raise KernFehler("akteur_muss_mensch_sein")
        if not ziel.status.beendet:
            for glied in ziel.kette():
                if not glied.status.beendet:
                    glied.status, glied.ende_code = Laufstatus.ABGEBROCHEN, "abgebrochen"
                    glied.offene_freigabe = glied.freigegeben = None
                    self.__notiere(glied, Ereignis.LAUF_ABGEBROCHEN, "abgebrochen",
                                   akteur_hash=self.__journal.hash(akteur.kennung))
        return ziel.auskunft()

    def journal(self, mandant: Mandant, lauf: str | None = None) -> tuple[Journaleintrag, ...]:
        return self.__journal.eintraege(self.__mandant(mandant), lauf)

    def journal_unveraendert(self) -> bool:
        return self.__journal.kette_pruefen()

    def fehlerablage(self, mandant: Mandant) -> tuple[Fehlerfall, ...]:
        mandant = self.__mandant(mandant)
        return tuple(f for f in self.__fehler if f.mandant == mandant.kennung)

    # ---- Hilfen --------------------------------------------------------------------

    @staticmethod
    def __mandant(mandant: object) -> Mandant:
        if type(mandant) is not Mandant:
            raise KernFehler("mandant_ist_pflichtargument")
        return mandant

    def __finden(self, mandant: object, lauf: object) -> _Lauf:
        mandant = self.__mandant(mandant)
        gefunden = self.__laeufe.get((mandant.kennung, lauf)) if type(lauf) is str else None
        if gefunden is None:
            raise LaufUnbekannt("lauf_unbekannt")
        return gefunden

    def __wartender(self, mandant: object, lauf: object, anfrage: object,
                    freigeber: object) -> tuple[_Lauf, _Lauf, Freigabeanfrage]:
        ziel = self.__finden(mandant, lauf)
        if type(freigeber) is not Mensch:
            raise FreigabeUngueltig("freigeber_muss_mensch_sein")
        for glied in ziel.kette():
            offen = glied.offene_freigabe
            if offen is not None and glied.status is Laufstatus.WARTET_AUF_FREIGABE:
                if offen.kennung != anfrage:
                    break
                return ziel, glied, offen
        raise LaufNichtWartend("keine_passende_freigabe_offen")

    @staticmethod
    def __weiter(ziel: _Lauf) -> None:
        for glied in ziel.kette():
            if glied.status is Laufstatus.WARTET_AUF_FREIGABE:
                glied.status = Laufstatus.LAEUFT

    def __neue_kennung(self) -> str:
        kennung = self.__kennungen()
        if type(kennung) is not str or _KENNUNG.fullmatch(kennung) is None:
            raise KernFehler("kennung_ungueltig")
        return kennung

    def __notiere(self, lauf: _Lauf, ereignis: Ereignis, code: str, **felder) -> None:
        self.__journal.eintragen(mandant=lauf.mandant, lauf=lauf.kennung, schritt=lauf.schritte,
                                 ereignis=ereignis, code=code, **felder)

    def __ablegen(self, lauf: _Lauf, code: str, *, bezug: str | None = None,
                  eingabe_hash: str | None = None, versuche: int = 1) -> bool:
        """Nicht verarbeitbarer Schritt → Fehlerablage; der Lauf endet geschlossen."""
        if bezug is not None and (type(bezug) is not str or NAME.fullmatch(bezug) is None or len(bezug) > 64):
            bezug = None  # ein vom Modell erfundener Name kommt nicht ins Protokoll
        self.__fehler.append(Fehlerfall(lauf.mandant.kennung, lauf.kennung, lauf.schritte, bezug, code,
                                        versuche, eingabe_hash, self.__uhr().isoformat()))
        lauf.status, lauf.ende_code = Laufstatus.FEHLGESCHLAGEN, code
        self.__notiere(lauf, Ereignis.FEHLERABLAGE, code, bezug=bezug, eingabe_hash=eingabe_hash)
        return False

    def __hash_oder_nichts(self, wert: object) -> str | None:
        try:
            return self.__journal.hash(wert)
        except KernFehler:
            return None  # nicht serialisierbar; der Folgeschritt lehnt die Entscheidung ab

    def __grenze(self, lauf: _Lauf, code: str) -> None:
        lauf.status, lauf.ende_code = Laufstatus.GRENZE_ERREICHT, code
        self.__notiere(lauf, Ereignis.GRENZE_ERREICHT, code)

    def __sicht(self, lauf: _Lauf) -> Laufsicht:
        return Laufsicht(lauf.kennung, lauf.rolle, lauf.tiefe, lauf.auftrag, tuple(lauf.verlauf),
                         tuple(sorted(lauf.rechte.werkzeuge)), tuple(sorted(lauf.rechte.skills)),
                         lauf.grenzen.max_schritte - lauf.schritte, lauf.grenzen.max_kosten - lauf.kosten)

    # ---- Schrittfolge ----------------------------------------------------------------

    def __treiben(self, lauf: _Lauf) -> None:
        lauf.status = Laufstatus.LAEUFT
        while True:
            if lauf.unterlauf is not None:
                kind = lauf.unterlauf
                if not kind.status.beendet and kind.status is not Laufstatus.WARTET_AUF_FREIGABE:
                    self.__treiben(kind)
                if kind.status is Laufstatus.WARTET_AUF_FREIGABE:
                    lauf.status = Laufstatus.WARTET_AUF_FREIGABE
                    return
                self.__einsammeln(lauf, kind)
                continue
            if lauf.freigegeben is not None:
                freigabe, lauf.freigegeben = lauf.freigegeben, None
                if not self.__werkzeug(lauf, WerkzeugAufruf(freigabe.werkzeug, freigabe.argumente), freigabe):
                    return
                continue
            if lauf.schritte >= lauf.grenzen.max_schritte:
                return self.__grenze(lauf, "schrittgrenze")
            if lauf.kosten >= lauf.grenzen.max_kosten:
                return self.__grenze(lauf, "kostengrenze")
            sicht = self.__sicht(lauf)
            try:
                antwort = self.__modell.entscheiden(sicht)
            except PolicyFehler:  # anderes Modell als zugelassen: Ergebnis verwerfen
                self.__ablegen(lauf, "modell_policy_verletzt")
                return
            except Exception:  # Ausgang und Kosten unbekannt: nicht wiederholen
                self.__ablegen(lauf, "modell_ausgang_unbekannt")
                return
            if (type(antwort) is not Modellantwort or type(antwort.kosten) is not int or antwort.kosten < 0
                    or type(antwort.entscheidung) not in (WerkzeugAufruf, SkillAnfordern, Unterauftrag, Abschluss)):
                self.__ablegen(lauf, "modell_antwort_ungueltig")
                return
            entscheidung = antwort.entscheidung
            lauf.schritte += 1
            lauf.kosten += antwort.kosten
            self.__notiere(lauf, Ereignis.MODELL_ENTSCHEIDUNG, type(entscheidung).__name__.lower(),
                           eingabe_hash=self.__hash_oder_nichts(
                               [lauf.auftrag, [[v.art, v.bezug, v.inhalt] for v in lauf.verlauf]]),
                           ausgabe_hash=self.__hash_oder_nichts(_form(entscheidung)), kosten=antwort.kosten)
            if type(entscheidung) is Abschluss:
                self.__abschliessen(lauf, entscheidung)
                return
            schritt = {WerkzeugAufruf: self.__werkzeug, SkillAnfordern: self.__skill,
                       Unterauftrag: self.__unterlauf}[type(entscheidung)]
            if not schritt(lauf, entscheidung):
                return

    def __werkzeug(self, lauf: _Lauf, aufruf: WerkzeugAufruf, freigabe: Freigabeanfrage | None = None) -> bool:
        name = aufruf.werkzeug
        if type(name) is not str or name not in self.__werkzeuge or name not in lauf.rechte.werkzeuge:
            return self.__ablegen(lauf, "werkzeug_nicht_erlaubt", bezug=name if type(name) is str else None)
        werkzeug, klasse, wiederholbar = self.__werkzeuge[name]
        try:
            roh = kanonisch(dict(aufruf.argumente))
        except (KernFehler, TypeError, ValueError):
            return self.__ablegen(lauf, "argumente_ungueltig", bezug=name)
        argumente = json.loads(roh)  # eigene, unveränderte Kopie aus reinen JSON-Werten
        argumente_hash = hashlib.sha256(roh).hexdigest()
        eingabe = self.__journal.hash(argumente)
        schluessel = sha256_hex([lauf.mandant.kennung, lauf.wurzel, lauf.schritte, name, argumente_hash])
        gemerkt = self.__ergebnisse.holen(lauf.mandant, schluessel)
        if gemerkt is not None:  # schon ausgeführt: Ergebnis liefern, Werkzeug nicht erneut rufen
            lauf.verlauf.append(Verlaufseintrag("werkzeug_ergebnis", name, gemerkt.ausgabe))
            self.__notiere(lauf, Ereignis.IDEMPOTENZ_TREFFER, "gespeichertes_ergebnis", bezug=name,
                           eingabe_hash=eingabe, ausgabe_hash=self.__journal.hash(gemerkt.ausgabe))
            return True
        if klasse.freigabepflichtig:
            if freigabe is None:
                lauf.offene_freigabe = Freigabeanfrage(
                    self.__neue_kennung(), lauf.kennung, lauf.schritte, name, klasse,
                    argumente_hash, MappingProxyType(argumente))
                lauf.status = Laufstatus.WARTET_AUF_FREIGABE
                self.__notiere(lauf, Ereignis.FREIGABE_ANGEFORDERT, klasse.value,
                               bezug=name, eingabe_hash=eingabe)
                return False
            if (freigabe.werkzeug != name or freigabe.argumente_hash != argumente_hash
                    or freigabe.schritt != lauf.schritte or freigabe.lauf != lauf.kennung):
                return self.__ablegen(lauf, "freigabe_passt_nicht_zum_aufruf", bezug=name, eingabe_hash=eingabe)
        versuche = 1 + (lauf.grenzen.max_wiederholungen if wiederholbar else 0)
        for versuch in range(1, versuche + 1):
            try:
                ergebnis = werkzeug.ausfuehren(lauf.mandant, MappingProxyType(argumente), schluessel)
                break
            except VoruebergehenderFehler:
                if versuch == versuche:
                    code = "wiederholungen_erschoepft" if wiederholbar else "fehler_nicht_wiederholbar"
                    return self.__ablegen(lauf, code, bezug=name, eingabe_hash=eingabe, versuche=versuch)
                self.__notiere(lauf, Ereignis.WERKZEUG_WIEDERHOLUNG, "warte_vor_wiederholung", bezug=name,
                               eingabe_hash=eingabe)
                self.__schlaf(self.__regel.wartezeit(versuch))
            except UnbekannterAusgang:
                return self.__ablegen(lauf, "unbekannter_ausgang_abgleich_noetig", bezug=name,
                                      eingabe_hash=eingabe, versuche=versuch)
            except Exception:
                return self.__ablegen(lauf, "werkzeug_fehler", bezug=name, eingabe_hash=eingabe,
                                      versuche=versuch)
        if type(ergebnis) is not Werkzeugergebnis or type(ergebnis.kosten) is not int or ergebnis.kosten < 0:
            return self.__ablegen(lauf, "kosten_unbekannt", bezug=name, eingabe_hash=eingabe)
        try:
            ausgabe_hash = self.__journal.hash(ergebnis.ausgabe)
        except KernFehler:
            return self.__ablegen(lauf, "ausgabe_ungueltig", bezug=name, eingabe_hash=eingabe)
        self.__ergebnisse.ablegen(lauf.mandant, schluessel, ergebnis)
        lauf.kosten += ergebnis.kosten
        lauf.verlauf.append(Verlaufseintrag("werkzeug_ergebnis", name, ergebnis.ausgabe))
        self.__notiere(lauf, Ereignis.WERKZEUG_AUFRUF, "ok_nach_freigabe" if freigabe else "ok", bezug=name,
                       eingabe_hash=eingabe, ausgabe_hash=ausgabe_hash, kosten=ergebnis.kosten)
        return True

    def __skill(self, lauf: _Lauf, anfrage: SkillAnfordern) -> bool:
        name = anfrage.name
        if self.__skills is None or type(name) is not str or name not in lauf.rechte.skills:
            return self.__ablegen(lauf, "skill_nicht_erlaubt", bezug=name if type(name) is str else None)
        try:
            skill = self.__skills.laden(name)
        except SkillFehler:
            return self.__ablegen(lauf, "skill_gesperrt", bezug=name)
        lauf.verlauf.append(Verlaufseintrag("skill", name, skill.text, rolle="skill"))
        self.__notiere(lauf, Ereignis.SKILL_GELADEN, "hash_geprueft", bezug=name, ausgabe_hash=skill.sha256)
        return True

    def __unterlauf(self, lauf: _Lauf, bitte: Unterauftrag) -> bool:
        if (type(bitte.rolle) is not str or NAME.fullmatch(bitte.rolle) is None or len(bitte.rolle) > 64
                or type(bitte.auftrag) is not str or not bitte.auftrag.strip()
                or len(bitte.auftrag) > MAX_AUFTRAG_ZEICHEN
                or type(bitte.max_schritte) is not int or bitte.max_schritte < 1
                or type(bitte.max_kosten) is not int or bitte.max_kosten < 1):
            return self.__ablegen(lauf, "modell_antwort_ungueltig")
        if lauf.tiefe + 1 > lauf.grenzen.max_tiefe:
            return self.__ablegen(lauf, "tiefe_ueberschritten", bezug=bitte.rolle)
        try:
            rechte = lauf.rechte.eingeengt(bitte.werkzeuge, bitte.skills)
        except RechteErweiterung:
            return self.__ablegen(lauf, "rechte_erweiterung_verweigert", bezug=bitte.rolle)
        except KernFehler:
            return self.__ablegen(lauf, "modell_antwort_ungueltig")
        rest_schritte = lauf.grenzen.max_schritte - lauf.schritte
        rest_kosten = lauf.grenzen.max_kosten - lauf.kosten
        if rest_schritte < 1:
            self.__grenze(lauf, "schrittgrenze")
            return False
        if rest_kosten < 1:
            self.__grenze(lauf, "kostengrenze")
            return False
        grenzen = Grenzen(min(bitte.max_schritte, rest_schritte), min(bitte.max_kosten, rest_kosten),
                          lauf.grenzen.max_tiefe, lauf.grenzen.max_wiederholungen)
        kind = _Lauf(kennung=self.__neue_kennung(), mandant=lauf.mandant, auftrag=bitte.auftrag,
                     rolle=bitte.rolle, tiefe=lauf.tiefe + 1, grenzen=grenzen, rechte=rechte,
                     wurzel=f"{lauf.wurzel}/{lauf.schritte}")
        lauf.unterlauf = kind
        self.__notiere(lauf, Ereignis.UNTERLAUF_GESTARTET, "gestartet", bezug=kind.kennung,
                       eingabe_hash=self.__journal.hash(bitte.auftrag))
        return True

    def __einsammeln(self, lauf: _Lauf, kind: _Lauf) -> None:
        lauf.unterlauf = None
        lauf.schritte += kind.schritte
        lauf.kosten += kind.kosten
        lauf.aufgaben.extend(kind.aufgaben)
        lauf.freigaben.extend(kind.freigaben)
        lauf.verlauf.append(Verlaufseintrag("unterlauf_ergebnis", kind.rolle, {
            "status": kind.status.value, "ergebnis": kind.ergebnis, "ende_code": kind.ende_code}))
        self.__notiere(lauf, Ereignis.UNTERLAUF_BEENDET, kind.status.value, bezug=kind.kennung,
                       kosten=kind.kosten)

    def __abschliessen(self, lauf: _Lauf, abschluss: Abschluss) -> None:
        aufgaben = abschluss.aufgaben
        if (type(abschluss.ergebnis) is not str or len(abschluss.ergebnis) > MAX_TEXT
                or type(aufgaben) is not tuple
                or any(type(a) is not Aufgabenvorschlag or type(a.titel) is not str or not a.titel.strip()
                       or len(a.titel) > 200 or type(a.beschreibung) is not str
                       or len(a.beschreibung) > MAX_TEXT for a in aufgaben)):
            self.__ablegen(lauf, "modell_antwort_ungueltig")
            return
        if aufgaben and lauf.rechte.aufgaben_vorschlagen:
            lauf.aufgaben.extend(Aufgabenentwurf(lauf.mandant.kennung, lauf.kennung, a.titel, a.beschreibung)
                                 for a in aufgaben)
            self.__notiere(lauf, Ereignis.AUFGABEN_VORGESCHLAGEN, "entwuerfe_im_ergebnis",
                           ausgabe_hash=self.__journal.hash(len(aufgaben)))
        elif aufgaben:
            self.__notiere(lauf, Ereignis.AUFGABEN_VERWORFEN, "aufgaben_nicht_freigeschaltet")
        lauf.ergebnis, lauf.status, lauf.ende_code = abschluss.ergebnis, Laufstatus.ABGESCHLOSSEN, "abgeschlossen"
        self.__notiere(lauf, Ereignis.LAUF_ABGESCHLOSSEN, "abgeschlossen",
                       ausgabe_hash=self.__journal.hash(abschluss.ergebnis))

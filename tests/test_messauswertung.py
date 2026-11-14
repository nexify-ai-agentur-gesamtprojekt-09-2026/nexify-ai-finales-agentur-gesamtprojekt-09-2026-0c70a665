"""Tests für tools/messauswertung.py.

ALLE Daten in dieser Datei sind SYNTHETISCH: erfundene Läufe, erfundene
Token-Zahlen und erfundene Preise, nur um die Rechenwege zu prüfen. Nichts
davon ist ein Messergebnis. Kein Test ruft ein Modell oder einen Dienst auf.
"""
import contextlib
import copy
import io
import json
import tempfile
import unittest
from pathlib import Path

from tools import messauswertung as m

ROOT = Path(__file__).resolve().parents[1]
PLAN = json.loads((ROOT / 'config' / 'messplan-werbeaussagen.json').read_text(encoding='utf-8'))
KLASSE = 'zuordnung_leistungen'  # zwei Pflichtkriterien: K1, K2


def kleiner_plan(mindest_faelle=20):
    """Echter Messplan, nur mit kleinerer Fallzahl und weniger Ziehungen, damit die Tests schnell bleiben."""
    plan = copy.deepcopy(PLAN)
    plan['methodenfestlegung'].update(mindest_faelle_je_klasse=mindest_faelle, bootstrap_ziehungen=300)
    return plan


def preisliste(synthetisch=True, datum='2026-01-10'):
    return {'quelle': 'SYNTHETISCH – erfundene Beispielpreise', 'abgerufen_am': datum, 'waehrung': 'EUR',
            'synthetisch': synthetisch,
            'preise': {'beispiel-klein': {'eingabe_je_mio_tokens': 1.0, 'ausgabe_je_mio_tokens': 2.0},
                       'beispiel-gross': {'eingabe_je_mio_tokens': 10.0, 'ausgabe_je_mio_tokens': 20.0}}}


def lauf(konfiguration, fall, erfuellt=True, schluessel='beispiel-klein', synthetisch=True, **abweichung):
    eintrag = {'lauf_id': f'{konfiguration}-{fall}-1', 'datum': '2026-01-12', 'aufgabenklasse': KLASSE,
               'fall_id': f'F{fall:03d}', 'konfiguration': konfiguration, 'wiederholung': 1,
               'aufrufe': [{'preis_schluessel': schluessel, 'eingabe_tokens': 1000, 'ausgabe_tokens': 500}],
               'latenz_ms': 800 + fall, 'fehler': False, 'kriterien': {'K1': erfuellt, 'K2': True},
               'bewertung': {'art': 'automatisch', 'verblindet': False}, 'synthetisch': synthetisch}
    eintrag.update(abweichung)
    return eintrag


def beispiel(faelle=30, eigene_fehlschlaege=3, vergleich_fehlschlaege=3, synthetisch=True, vergleich_schluessel='beispiel-gross'):
    """Eigene Kette mit kleinem, Vergleich mit großem Beispielpreis; gleiche Fälle."""
    return ([lauf('eigene-kette', n, n >= eigene_fehlschlaege, synthetisch=synthetisch) for n in range(faelle)]
            + [lauf('vergleich-x', n, n >= vergleich_fehlschlaege, vergleich_schluessel, synthetisch=synthetisch)
               for n in range(faelle)])


class Messauswertung(unittest.TestCase):
    def setUp(self):
        self.ordner = tempfile.TemporaryDirectory()
        self.addCleanup(self.ordner.cleanup)

    def datei(self, name, inhalt):
        pfad = Path(self.ordner.name) / name
        pfad.write_text(inhalt, encoding='utf-8')
        return str(pfad)

    def werte_aus(self, laeufe, preise=None, plan=None):
        plan = plan or kleiner_plan()
        pfad = self.datei('laeufe.jsonl', '\n'.join(json.dumps(x) for x in laeufe) + '\n')
        return m.auswerten(plan, m.lies_laeufe([pfad], m.pruefe_plan(plan)), preise or preisliste())

    def test_messplan_ist_gueltig_und_enthaelt_keinen_preis(self):
        klassen = m.pruefe_plan(PLAN)
        self.assertEqual(set(klassen), {'orientierungschat', 'briefing_erstellung', 'zuordnung_leistungen', 'zusammenfassung'})
        text = json.dumps(PLAN, ensure_ascii=False)
        for verboten in ('je_mio_tokens": ', '€', 'USD ', '$ '):
            self.assertNotIn(verboten, text)
        self.assertEqual(PLAN['status'], 'entwurf_keine_messung_durchgefuehrt')

    def test_kosten_aus_tokens_mal_preisliste(self):
        ergebnis = self.werte_aus(beispiel())
        zeilen = {z['konfiguration']: z for z in ergebnis['tabelle']}
        # 1000 × 1,0/1 Mio + 500 × 2,0/1 Mio = 0,002; Vergleich mit zehnfachem Beispielpreis = 0,02.
        self.assertAlmostEqual(zeilen['eigene-kette']['kosten_je_auftrag_median'], 0.002)
        self.assertAlmostEqual(zeilen['vergleich-x']['kosten_je_auftrag_median'], 0.02)
        # 30 Aufträge, 27 erfüllt: Gesamtkosten geteilt durch erfüllte Aufträge.
        self.assertAlmostEqual(zeilen['eigene-kette']['kosten_je_erfuelltem_auftrag'], 30 * 0.002 / 27)
        self.assertAlmostEqual(zeilen['eigene-kette']['erfuellungsquote'], 0.9)
        self.assertEqual(zeilen['eigene-kette']['faelle'], 30)
        unten, oben = zeilen['eigene-kette']['erfuellungsquote_bereich']
        self.assertTrue(0.6 < unten <= 0.9 <= oben <= 1.0)

    def test_fehlender_preis_wird_nie_als_null_gerechnet(self):
        laeufe = beispiel()
        laeufe[0]['aufrufe'][0]['preis_schluessel'] = 'unbekannt'
        with self.assertRaisesRegex(m.Eingabefehler, 'fehlt in der Preisliste'):
            self.werte_aus(laeufe)

    def test_synthetische_daten_sind_nie_ein_beleg(self):
        ergebnis = self.werte_aus(beispiel())
        self.assertTrue(ergebnis['synthetisch'])
        self.assertFalse(ergebnis['als_messergebnis_verwendbar'])
        vergleich = ergebnis['vergleiche'][0]
        # Rechnerisch wäre die eigene Kette hier gleichwertig und günstiger …
        self.assertTrue(vergleich['gleichwertig'] and vergleich['guenstiger_je_erfuelltem_auftrag'])
        # … trotzdem: nicht belegt, keine Aussage, deutlicher Hinweis.
        self.assertFalse(vergleich['kosteneffizient_belegt'])
        self.assertFalse(vergleich['bessere_ergebnisse_belegt'])
        self.assertEqual(vergleich['aussagen'], [])
        self.assertIn('synthetische Daten', vergleich['maengel'])
        text = m.als_text(ergebnis)
        self.assertTrue(text.startswith(f'**{m.SYNTHETISCH_HINWEIS}**'))
        self.assertTrue(text.rstrip().endswith(f'**{m.SYNTHETISCH_HINWEIS}**'))
        self.assertNotIn('belegt für diese Aufgabenklasse', text)
        self.assertNotIn('Mögliche Aussage', text)

    def test_synthetische_preisliste_macht_alles_synthetisch(self):
        ergebnis = self.werte_aus(beispiel(synthetisch=False), preisliste(synthetisch=True))
        self.assertTrue(ergebnis['synthetisch'])
        self.assertFalse(ergebnis['vergleiche'][0]['kosteneffizient_belegt'])

    def test_echte_und_synthetische_laeufe_nicht_mischbar(self):
        laeufe = beispiel()
        laeufe[0]['synthetisch'] = False
        with self.assertRaisesRegex(m.Eingabefehler, 'nicht gemischt'):
            self.werte_aus(laeufe)

    def test_entscheidungsregel_greift_nur_bei_erfuellten_voraussetzungen(self):
        # Die Kennzeichnung »nicht synthetisch« dient hier allein dazu, die Entscheidungsregel
        # zu prüfen. Die Zahlen bleiben erfunden und sind kein Messergebnis.
        ergebnis = self.werte_aus(beispiel(synthetisch=False), preisliste(synthetisch=False))
        vergleich = ergebnis['vergleiche'][0]
        self.assertEqual(vergleich['maengel'], [])
        self.assertTrue(vergleich['kosteneffizient_belegt'])
        self.assertFalse(vergleich['bessere_ergebnisse_belegt'])  # gleiche Quote ist nicht »besser«
        self.assertAlmostEqual(vergleich['kostenverhaeltnis'], 0.1)
        self.assertEqual(len(vergleich['aussagen']), 1)
        satz = vergleich['aussagen'][0]
        for pflichtangabe in ('2026-01-12', '30 Prüffällen', 'Zuordnung zu Leistungen', 'vergleich-x', '90,0 %',
                              'Stand 2026-01-10'):
            self.assertIn(pflichtangabe, satz)
        text = m.als_text(ergebnis)
        self.assertIn('erst nach Freigabe durch Inhaber und Rechtsprüfung', text)
        self.assertIn('Spitzenstellungen', text)

    def test_zu_wenig_faelle_ist_nicht_belegt(self):
        ergebnis = self.werte_aus(beispiel(faelle=10, eigene_fehlschlaege=1, vergleich_fehlschlaege=1, synthetisch=False),
                                  preisliste(synthetisch=False))
        vergleich = ergebnis['vergleiche'][0]
        self.assertIn('weniger als 20 Fälle', vergleich['maengel'])
        self.assertFalse(vergleich['kosteneffizient_belegt'])
        self.assertIn('(zu wenig)', m.als_text(ergebnis))

    def test_schlechtere_qualitaet_ist_nicht_kosteneffizient(self):
        ergebnis = self.werte_aus(beispiel(eigene_fehlschlaege=15, vergleich_fehlschlaege=0, synthetisch=False),
                                  preisliste(synthetisch=False))
        vergleich = ergebnis['vergleiche'][0]
        self.assertAlmostEqual(vergleich['unterschied_erfuellung'], -0.5)
        self.assertFalse(vergleich['gleichwertig'])
        self.assertFalse(vergleich['kosteneffizient_belegt'])

    def test_bessere_ergebnisse_brauchen_klaren_vorsprung(self):
        ergebnis = self.werte_aus(beispiel(eigene_fehlschlaege=0, vergleich_fehlschlaege=15, synthetisch=False),
                                  preisliste(synthetisch=False))
        vergleich = ergebnis['vergleiche'][0]
        self.assertTrue(vergleich['bessere_ergebnisse_belegt'])
        self.assertTrue(any('erfüllte unsere KI-Kette 100,0 %' in satz for satz in vergleich['aussagen']))

    def test_teurer_ist_nicht_kosteneffizient(self):
        laeufe = beispiel(synthetisch=False, vergleich_schluessel='beispiel-klein')
        for eintrag in laeufe:
            if eintrag['konfiguration'] == 'eigene-kette':
                eintrag['aufrufe'][0]['preis_schluessel'] = 'beispiel-gross'
        vergleich = self.werte_aus(laeufe, preisliste(synthetisch=False))['vergleiche'][0]
        self.assertAlmostEqual(vergleich['kostenverhaeltnis'], 10.0)
        self.assertFalse(vergleich['kosteneffizient_belegt'])

    def test_ungleiche_faelle_unverblindet_und_alte_preisliste(self):
        laeufe = beispiel(synthetisch=False)
        laeufe = [x for x in laeufe if not (x['konfiguration'] == 'vergleich-x' and x['fall_id'] == 'F029')]
        laeufe.append(lauf('vergleich-x', 99, synthetisch=False, schluessel='beispiel-gross'))
        laeufe[1]['bewertung'] = {'art': 'mensch', 'verblindet': False}
        vergleich = self.werte_aus(laeufe, preisliste(synthetisch=False, datum='2025-06-01'))['vergleiche'][0]
        for mangel in ('nicht dieselben Fälle', 'unverblindete menschliche Bewertung',
                       'Preisliste zu weit vom Messzeitraum entfernt'):
            self.assertIn(mangel, vergleich['maengel'])
        self.assertFalse(vergleich['kosteneffizient_belegt'])

    def test_technischer_fehler_zaehlt_als_nicht_erfuellt(self):
        laeufe = beispiel(eigene_fehlschlaege=0)
        laeufe[0].update(fehler=True, aufrufe=[])
        zeile = next(z for z in self.werte_aus(laeufe)['tabelle'] if z['konfiguration'] == 'eigene-kette')
        self.assertEqual(zeile['technische_fehler'], 1)
        self.assertAlmostEqual(zeile['erfuellungsquote'], 29 / 30)

    def test_wiederholungen_werden_je_fall_gemittelt(self):
        laeufe = beispiel(faelle=20, eigene_fehlschlaege=0, vergleich_fehlschlaege=0)
        laeufe.append(lauf('eigene-kette', 0, False, lauf_id='eigene-kette-0-2', wiederholung=2))
        ergebnis = self.werte_aus(laeufe)
        zeile = next(z for z in ergebnis['tabelle'] if z['konfiguration'] == 'eigene-kette')
        self.assertEqual((zeile['faelle'], zeile['laeufe']), (20, 21))
        self.assertAlmostEqual(zeile['erfuellungsquote'], 19.5 / 20)
        self.assertIn('Wiederholungen ungleich', ergebnis['vergleiche'][0]['maengel'])

    def test_ohne_vergleich_keine_aussage(self):
        laeufe = [x for x in beispiel(synthetisch=False) if x['konfiguration'] == 'eigene-kette']
        ergebnis = self.werte_aus(laeufe, preisliste(synthetisch=False))
        self.assertEqual(ergebnis['vergleiche'], [])
        self.assertIn('Ohne Vergleich ist keine der Aussagen belegt', m.als_text(ergebnis))

    def test_auswertung_ist_wiederholbar(self):
        self.assertEqual(self.werte_aus(beispiel()), self.werte_aus(beispiel()))

    def test_formatfehler_brechen_ab(self):
        faelle = {
            'Felder weichen': lambda x: x.pop('bewertung'),
            'unbekannte Aufgabenklasse': lambda x: x.update(aufgabenklasse='erfunden'),
            'Kriterien entsprechen nicht': lambda x: x.update(kriterien={'K1': True}),
            'Kriterien entsprechen nicht dem': lambda x: x.update(kriterien={'K1': 'ja', 'K2': True}),
            'Aufruf ungültig': lambda x: x['aufrufe'][0].update(eingabe_tokens=-1),
            'Datum nicht im Format': lambda x: x.update(datum='12.01.2026'),
            'latenz_ms ungültig': lambda x: x.update(latenz_ms=None),
            'aufrufe fehlen': lambda x: x.update(aufrufe=[]),
        }
        for erwartet, veraendere in faelle.items():
            laeufe = beispiel()
            veraendere(laeufe[0])
            with self.subTest(erwartet), self.assertRaisesRegex(m.Eingabefehler, erwartet):
                self.werte_aus(laeufe)
        doppelt = beispiel()
        doppelt.append(dict(doppelt[0], lauf_id='andere-kennung'))
        with self.assertRaisesRegex(m.Eingabefehler, 'Lauf doppelt'):
            self.werte_aus(doppelt)
        for feld, wert, erwartet in (('quelle', ' ', 'Quelle fehlt'), ('abgerufen_am', 'gestern', 'Datum'),
                                     ('preise', {}, 'keine Preise')):
            with self.subTest(feld), self.assertRaisesRegex(m.Eingabefehler, erwartet):
                self.werte_aus(beispiel(), dict(preisliste(), **{feld: wert}))

    def test_kommandozeile_schreibt_tabelle_und_ueberschreibt_nichts(self):
        laeufe = self.datei('laeufe.jsonl', '\n'.join(json.dumps(x) for x in beispiel(faelle=5)) + '\n')
        preise = self.datei('preise.json', json.dumps(preisliste()))
        plan = self.datei('plan.json', json.dumps(kleiner_plan()))
        ziel = str(Path(self.ordner.name) / 'ergebnis.json')
        ausgabe, fehler = io.StringIO(), io.StringIO()
        argumente = ['--plan', plan, '--laeufe', laeufe, '--preisliste', preise, '--ausgabe-json', ziel]
        with contextlib.redirect_stdout(ausgabe):
            self.assertEqual(m.main(argumente), 0)
        self.assertIn('| Zuordnung zu Leistungen | eigene-kette | 5 (zu wenig) |', ausgabe.getvalue())
        self.assertIn(m.SYNTHETISCH_HINWEIS, ausgabe.getvalue())
        gespeichert = json.loads(Path(ziel).read_text(encoding='utf-8'))
        self.assertTrue(gespeichert['synthetisch'])
        self.assertFalse(gespeichert['als_messergebnis_verwendbar'])
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(fehler):
            self.assertEqual(m.main(argumente), 2)
        self.assertIn('wird nicht überschrieben', fehler.getvalue())
        with contextlib.redirect_stderr(fehler):
            self.assertEqual(m.main(['--laeufe', str(Path(self.ordner.name) / 'fehlt.jsonl'), '--preisliste', preise]), 2)

    def test_skript_ruft_kein_modell_und_kein_netz_auf(self):
        quelle = (ROOT / 'tools' / 'messauswertung.py').read_text(encoding='utf-8')
        for verboten in ('import urllib', 'import http', 'import socket', 'import subprocess', 'import requests',
                         'os.environ', 'openrouter', 'api_key'):
            self.assertNotIn(verboten, quelle.lower() if verboten.islower() else quelle)


if __name__ == '__main__':
    unittest.main()

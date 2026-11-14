#!/usr/bin/env python3
"""Wertet vorhandene Lauf-Protokolle nach config/messplan-werbeaussagen.json aus.

Liest nur Dateien: Messplan, Lauf-Protokolle (JSON Lines) und eine Preisliste,
die als Eingabe mit Quelle und Abrufdatum übergeben wird. Ruft kein Modell und
keinen Dienst auf, kennt keinen Preis und verändert keine Eingabedatei.
Synthetische Beispieldaten werden ausgewertet, aber nie als Messergebnis oder
als Beleg ausgegeben. Nur Standardbibliothek.

Aufruf:
  python3 tools/messauswertung.py --laeufe laeufe.jsonl --preisliste preise.json \
      [--plan config/messplan-werbeaussagen.json] [--ausgabe-json ergebnis.json]
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import random
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STANDARD_PLAN = ROOT / 'config' / 'messplan-werbeaussagen.json'
SYNTHETISCH_HINWEIS = 'SYNTHETISCHE BEISPIELDATEN – KEIN MESSERGEBNIS, KEIN BELEG, NICHT VERÖFFENTLICHEN'
LAUF_FELDER = frozenset({'lauf_id', 'datum', 'aufgabenklasse', 'fall_id', 'konfiguration', 'wiederholung',
                         'aufrufe', 'latenz_ms', 'fehler', 'kriterien', 'bewertung', 'synthetisch'})
AUFRUF_FELDER = frozenset({'preis_schluessel', 'eingabe_tokens', 'ausgabe_tokens'})
PREISLISTE_FELDER = frozenset({'quelle', 'abgerufen_am', 'waehrung', 'synthetisch', 'preise'})
PREIS_FELDER = frozenset({'eingabe_je_mio_tokens', 'ausgabe_je_mio_tokens'})


class Eingabefehler(Exception):
    """Eingabe verletzt das Protokollformat; die Auswertung bricht ab statt zu raten."""


def verlange(bedingung, meldung):
    if not bedingung:
        raise Eingabefehler(meldung)


def _zahl(wert):
    return isinstance(wert, (int, float)) and not isinstance(wert, bool) and math.isfinite(wert)


def _ganzzahl(wert):
    return isinstance(wert, int) and not isinstance(wert, bool)


def _text(wert):
    return isinstance(wert, str) and bool(wert.strip())


def _datum(wert, ort):
    verlange(isinstance(wert, str), f'{ort}: Datum fehlt')
    try:
        return dt.date.fromisoformat(wert)
    except ValueError:
        raise Eingabefehler(f'{ort}: Datum nicht im Format JJJJ-MM-TT') from None


def lade_json(pfad):
    try:
        return json.loads(Path(pfad).read_text(encoding='utf-8'))
    except (OSError, UnicodeError, ValueError) as fehler:
        raise Eingabefehler(f'{pfad}: nicht lesbar oder kein gültiges JSON ({type(fehler).__name__})') from None


def pruefe_plan(plan):
    verlange(isinstance(plan, dict) and plan.get('schema_version') == 1, 'Messplan: unbekannte Fassung')
    methode = plan.get('methodenfestlegung')
    verlange(isinstance(methode, dict), 'Messplan: methodenfestlegung fehlt')
    verlange(_ganzzahl(methode.get('mindest_faelle_je_klasse')) and methode['mindest_faelle_je_klasse'] >= 1,
             'Messplan: mindest_faelle_je_klasse ungültig')
    verlange(_zahl(methode.get('konfidenzniveau')) and 0.5 < methode['konfidenzniveau'] < 1,
             'Messplan: konfidenzniveau ungültig')
    verlange(_zahl(methode.get('gleichwertigkeit_toleranz_prozentpunkte'))
             and 0 <= methode['gleichwertigkeit_toleranz_prozentpunkte'] <= 100, 'Messplan: Toleranz ungültig')
    verlange(_ganzzahl(methode.get('max_abstand_preisliste_tage')) and methode['max_abstand_preisliste_tage'] >= 0,
             'Messplan: max_abstand_preisliste_tage ungültig')
    verlange(_ganzzahl(methode.get('bootstrap_ziehungen')) and 100 <= methode['bootstrap_ziehungen'] <= 100000,
             'Messplan: bootstrap_ziehungen ungültig')
    verlange(_ganzzahl(methode.get('bootstrap_startwert')), 'Messplan: bootstrap_startwert ungültig')
    verlange(_text(plan.get('eigene_konfiguration')), 'Messplan: eigene_konfiguration fehlt')
    klassen = {}
    verlange(isinstance(plan.get('aufgabenklassen'), list) and plan['aufgabenklassen'], 'Messplan: aufgabenklassen fehlen')
    for klasse in plan['aufgabenklassen']:
        verlange(isinstance(klasse, dict) and _text(klasse.get('id')) and _text(klasse.get('name'))
                 and klasse['id'] not in klassen, 'Messplan: Aufgabenklasse ungültig oder doppelt')
        kriterien = klasse.get('kriterien')
        verlange(isinstance(kriterien, list) and kriterien, f"Messplan: {klasse['id']} ohne Kriterien")
        ids = [k.get('id') for k in kriterien if isinstance(k, dict)]
        verlange(len(ids) == len(kriterien) and all(_text(i) for i in ids) and len(set(ids)) == len(ids)
                 and all(isinstance(k.get('pflicht'), bool) and _text(k.get('text')) for k in kriterien),
                 f"Messplan: Kriterien von {klasse['id']} ungültig")
        verlange(any(k['pflicht'] for k in kriterien), f"Messplan: {klasse['id']} ohne Pflichtkriterium")
        klassen[klasse['id']] = {'name': klasse['name'], 'alle': ids,
                                 'pflicht': [k['id'] for k in kriterien if k['pflicht']]}
    return klassen


def pruefe_preisliste(preisliste):
    verlange(isinstance(preisliste, dict) and set(preisliste) == PREISLISTE_FELDER,
             'Preisliste: genau die Felder quelle, abgerufen_am, waehrung, synthetisch, preise erwartet')
    verlange(_text(preisliste['quelle']), 'Preisliste: Quelle fehlt')
    verlange(_text(preisliste['waehrung']), 'Preisliste: Währung fehlt')
    verlange(isinstance(preisliste['synthetisch'], bool), 'Preisliste: synthetisch muss true oder false sein')
    _datum(preisliste['abgerufen_am'], 'Preisliste')
    verlange(isinstance(preisliste['preise'], dict) and preisliste['preise'], 'Preisliste: keine Preise')
    for schluessel, preis in preisliste['preise'].items():
        verlange(_text(schluessel) and isinstance(preis, dict) and set(preis) == PREIS_FELDER
                 and all(_zahl(preis[f]) and preis[f] >= 0 for f in PREIS_FELDER),
                 f'Preisliste: Eintrag {schluessel!r} ungültig')
    return preisliste


def lies_laeufe(pfade, klassen):
    laeufe, gesehen = [], set()
    for pfad in pfade:
        try:
            zeilen = Path(pfad).read_text(encoding='utf-8').splitlines()
        except (OSError, UnicodeError) as fehler:
            raise Eingabefehler(f'{pfad}: nicht lesbar ({type(fehler).__name__})') from None
        for nummer, zeile in enumerate(zeilen, 1):
            if not zeile.strip():
                continue
            ort = f'{pfad}:{nummer}'
            try:
                lauf = json.loads(zeile)
            except ValueError:
                raise Eingabefehler(f'{ort}: kein gültiges JSON') from None
            verlange(isinstance(lauf, dict) and set(lauf) == LAUF_FELDER, f'{ort}: Felder weichen vom Protokollformat ab')
            verlange(all(_text(lauf[f]) for f in ('lauf_id', 'fall_id', 'konfiguration')), f'{ort}: Kennung fehlt')
            verlange(lauf['aufgabenklasse'] in klassen, f'{ort}: unbekannte Aufgabenklasse')
            lauf['_datum'] = _datum(lauf['datum'], ort)
            verlange(_ganzzahl(lauf['wiederholung']) and lauf['wiederholung'] >= 1, f'{ort}: wiederholung ungültig')
            verlange(_zahl(lauf['latenz_ms']) and lauf['latenz_ms'] >= 0, f'{ort}: latenz_ms ungültig')
            verlange(isinstance(lauf['fehler'], bool) and isinstance(lauf['synthetisch'], bool),
                     f'{ort}: fehler/synthetisch müssen true oder false sein')
            bewertung = lauf['bewertung']
            verlange(isinstance(bewertung, dict) and set(bewertung) == {'art', 'verblindet'}
                     and bewertung['art'] in ('automatisch', 'mensch') and isinstance(bewertung['verblindet'], bool),
                     f'{ort}: bewertung ungültig')
            kriterien = lauf['kriterien']
            verlange(isinstance(kriterien, dict) and set(kriterien) == set(klassen[lauf['aufgabenklasse']]['alle'])
                     and all(isinstance(v, bool) for v in kriterien.values()),
                     f'{ort}: Kriterien entsprechen nicht dem Messplan')
            aufrufe = lauf['aufrufe']
            verlange(isinstance(aufrufe, list) and (aufrufe or lauf['fehler']), f'{ort}: aufrufe fehlen')
            for aufruf in aufrufe:
                verlange(isinstance(aufruf, dict) and set(aufruf) == AUFRUF_FELDER and _text(aufruf['preis_schluessel'])
                         and all(_ganzzahl(aufruf[f]) and aufruf[f] >= 0 for f in ('eingabe_tokens', 'ausgabe_tokens')),
                         f'{ort}: Aufruf ungültig')
            schluessel = (lauf['konfiguration'], lauf['aufgabenklasse'], lauf['fall_id'], lauf['wiederholung'])
            verlange(schluessel not in gesehen, f'{ort}: Lauf doppelt (Konfiguration, Fall, Wiederholung)')
            gesehen.add(schluessel)
            laeufe.append(lauf)
    verlange(laeufe, 'Keine Läufe in den Protokollen')
    kennungen = [lauf['lauf_id'] for lauf in laeufe]
    verlange(len(set(kennungen)) == len(kennungen), 'lauf_id ist nicht eindeutig')
    return laeufe


def kosten(lauf, preise):
    summe = 0.0
    for aufruf in lauf['aufrufe']:
        preis = preise.get(aufruf['preis_schluessel'])
        # Ein fehlender Preis wird nie als 0 gerechnet.
        verlange(preis is not None, f"Preis für {aufruf['preis_schluessel']!r} fehlt in der Preisliste (Lauf {lauf['lauf_id']})")
        summe += (aufruf['eingabe_tokens'] * preis['eingabe_je_mio_tokens']
                  + aufruf['ausgabe_tokens'] * preis['ausgabe_je_mio_tokens']) / 1_000_000
    return summe


def perzentil(werte, anteil):
    geordnet = sorted(werte)
    if len(geordnet) == 1:
        return geordnet[0]
    stelle = anteil * (len(geordnet) - 1)
    unten = math.floor(stelle)
    oben = min(unten + 1, len(geordnet) - 1)
    return geordnet[unten] + (geordnet[oben] - geordnet[unten]) * (stelle - unten)


def bereich(werte, konfidenz):
    rand = (1 - konfidenz) / 2
    return perzentil(werte, rand), perzentil(werte, 1 - rand)


def je_fall(laeufe, klasse, konfiguration, pflicht, alle, preise):
    """Mittelt Wiederholungen je Fall: erfüllt, Kriterienanteil, Kosten."""
    faelle = {}
    for lauf in laeufe:
        if lauf['aufgabenklasse'] != klasse or lauf['konfiguration'] != konfiguration:
            continue
        erfuellt = (not lauf['fehler']) and all(lauf['kriterien'][k] for k in pflicht)
        anteil = 0.0 if lauf['fehler'] else sum(lauf['kriterien'][k] for k in alle) / len(alle)
        faelle.setdefault(lauf['fall_id'], []).append((float(erfuellt), anteil, kosten(lauf, preise)))
    return {fall: tuple(statistics.fmean(spalte) for spalte in zip(*werte)) for fall, werte in faelle.items()}


def kosten_je_erfuelltem(faelle, auswahl):
    erfuellt = sum(faelle[f][0] for f in auswahl)
    return sum(faelle[f][2] for f in auswahl) / erfuellt if erfuellt > 0 else math.inf


def vergleiche(eigene, vergleich, methode, zufall):
    """Gepaarter Vergleich über dieselben Fälle mit Bootstrap über die Fälle."""
    gemeinsam = sorted(set(eigene) & set(vergleich))
    gleiche_faelle = set(eigene) == set(vergleich)
    ergebnis = {'gleiche_faelle': gleiche_faelle, 'gemeinsame_faelle': len(gemeinsam)}
    if not gemeinsam:
        return ergebnis
    anzahl = len(gemeinsam)
    unterschied = statistics.fmean(eigene[f][0] - vergleich[f][0] for f in gemeinsam)
    eigene_kosten = kosten_je_erfuelltem(eigene, gemeinsam)
    vergleich_kosten = kosten_je_erfuelltem(vergleich, gemeinsam)
    unterschiede, verhaeltnisse = [], []
    for _ in range(methode['bootstrap_ziehungen']):
        ziehung = [gemeinsam[zufall.randrange(anzahl)] for _ in range(anzahl)]
        unterschiede.append(statistics.fmean(eigene[f][0] - vergleich[f][0] for f in ziehung))
        zaehler, nenner = kosten_je_erfuelltem(eigene, ziehung), kosten_je_erfuelltem(vergleich, ziehung)
        # Erfüllt eine Seite in der Ziehung nichts, zählt das gegen die eigene Kette.
        verhaeltnisse.append(zaehler / nenner if math.isfinite(zaehler) and math.isfinite(nenner) and nenner > 0
                             else math.inf)
    unten, oben = bereich(unterschiede, methode['konfidenzniveau'])
    kosten_unten, kosten_oben = bereich(verhaeltnisse, methode['konfidenzniveau'])
    bestimmbar = math.isfinite(eigene_kosten) and math.isfinite(vergleich_kosten) and vergleich_kosten > 0
    toleranz = methode['gleichwertigkeit_toleranz_prozentpunkte'] / 100
    ergebnis.update({
        'unterschied_erfuellung': unterschied, 'unterschied_bereich': [unten, oben],
        'kostenverhaeltnis': eigene_kosten / vergleich_kosten if bestimmbar else None,
        'kostenverhaeltnis_bereich': [kosten_unten, kosten_oben] if math.isfinite(kosten_oben) else None,
        'gleichwertig': unten >= -toleranz,
        'guenstiger_je_erfuelltem_auftrag': bestimmbar and math.isfinite(kosten_oben) and kosten_oben < 1,
        'besser': unten > 0,
    })
    return ergebnis


def auswerten(plan, laeufe, preisliste):
    klassen = pruefe_plan(plan)
    pruefe_preisliste(preisliste)
    methode = plan['methodenfestlegung']
    eigene_name = plan['eigene_konfiguration']
    synthetisch_laeufe = {lauf['synthetisch'] for lauf in laeufe}
    verlange(len(synthetisch_laeufe) == 1, 'Echte und synthetische Läufe dürfen nicht gemischt werden')
    synthetisch = synthetisch_laeufe.pop() or preisliste['synthetisch']
    preise = preisliste['preise']
    preisdatum = dt.date.fromisoformat(preisliste['abgerufen_am'])
    daten = [lauf['_datum'] for lauf in laeufe]
    abstand = max(abs((tag - preisdatum).days) for tag in daten)
    konfigurationen = sorted({lauf['konfiguration'] for lauf in laeufe})
    zufall = random.Random(methode['bootstrap_startwert'])
    ergebnis = {
        'synthetisch': synthetisch,
        'als_messergebnis_verwendbar': not synthetisch,
        'hinweis': SYNTHETISCH_HINWEIS if synthetisch else None,
        'messplan': {'id': plan.get('id'), 'version': plan.get('version')},
        'messzeitraum': [min(daten).isoformat(), max(daten).isoformat()],
        'preisliste': {'quelle': preisliste['quelle'], 'abgerufen_am': preisliste['abgerufen_am'],
                       'waehrung': preisliste['waehrung'], 'abstand_tage': abstand,
                       'abstand_zulaessig': abstand <= methode['max_abstand_preisliste_tage']},
        'eigene_konfiguration': eigene_name,
        'eigene_konfiguration_vorhanden': eigene_name in konfigurationen,
        'tabelle': [], 'vergleiche': [],
    }
    je_klasse = {}
    for klasse, kriterien in klassen.items():
        for konfiguration in konfigurationen:
            gewaehlt = [l for l in laeufe if l['aufgabenklasse'] == klasse and l['konfiguration'] == konfiguration]
            if not gewaehlt:
                continue
            faelle = je_fall(laeufe, klasse, konfiguration, kriterien['pflicht'], kriterien['alle'], preise)
            je_klasse[(klasse, konfiguration)] = faelle
            namen = sorted(faelle)
            quoten = [statistics.fmean(faelle[namen[zufall.randrange(len(namen))]][0] for _ in namen)
                      for _ in range(methode['bootstrap_ziehungen'])]
            wiederholungen = {}
            for lauf in gewaehlt:
                wiederholungen[lauf['fall_id']] = wiederholungen.get(lauf['fall_id'], 0) + 1
            je_erfuelltem = kosten_je_erfuelltem(faelle, namen)
            latenzen = [lauf['latenz_ms'] for lauf in gewaehlt]
            ergebnis['tabelle'].append({
                'aufgabenklasse': klasse, 'name': kriterien['name'], 'konfiguration': konfiguration,
                'faelle': len(namen), 'laeufe': len(gewaehlt),
                'genug_faelle': len(namen) >= methode['mindest_faelle_je_klasse'],
                'wiederholungen_einheitlich': len(set(wiederholungen.values())) == 1,
                'technische_fehler': sum(lauf['fehler'] for lauf in gewaehlt),
                'unverblindete_bewertungen': sum(lauf['bewertung']['art'] == 'mensch'
                                                 and not lauf['bewertung']['verblindet'] for lauf in gewaehlt),
                'erfuellungsquote': statistics.fmean(faelle[f][0] for f in namen),
                'erfuellungsquote_bereich': list(bereich(quoten, methode['konfidenzniveau'])),
                'kriterienanteil': statistics.fmean(faelle[f][1] for f in namen),
                'kosten_je_auftrag_median': statistics.median(faelle[f][2] for f in namen),
                'kosten_je_auftrag_mittel': statistics.fmean(faelle[f][2] for f in namen),
                'kosten_je_erfuelltem_auftrag': je_erfuelltem if math.isfinite(je_erfuelltem) else None,
                'latenz_ms_median': statistics.median(latenzen),
                'latenz_ms_p95': perzentil(latenzen, 0.95),
            })
    zeilen = {(z['aufgabenklasse'], z['konfiguration']): z for z in ergebnis['tabelle']}
    for klasse, kriterien in klassen.items():
        eigene = je_klasse.get((klasse, eigene_name))
        for konfiguration in konfigurationen:
            andere = je_klasse.get((klasse, konfiguration))
            if konfiguration == eigene_name or eigene is None or andere is None:
                continue
            eintrag = {'aufgabenklasse': klasse, 'name': kriterien['name'], 'vergleich': konfiguration}
            eintrag.update(vergleiche(eigene, andere, methode, zufall))
            beide = (zeilen[(klasse, eigene_name)], zeilen[(klasse, konfiguration)])
            maengel = []
            if synthetisch:
                maengel.append('synthetische Daten')
            if not all(z['genug_faelle'] for z in beide):
                maengel.append(f"weniger als {methode['mindest_faelle_je_klasse']} Fälle")
            if not eintrag['gleiche_faelle']:
                maengel.append('nicht dieselben Fälle')
            if not all(z['wiederholungen_einheitlich'] for z in beide) or beide[0]['laeufe'] != beide[1]['laeufe']:
                maengel.append('Wiederholungen ungleich')
            if any(z['unverblindete_bewertungen'] for z in beide):
                maengel.append('unverblindete menschliche Bewertung')
            if not ergebnis['preisliste']['abstand_zulaessig']:
                maengel.append('Preisliste zu weit vom Messzeitraum entfernt')
            eintrag['maengel'] = maengel
            voraussetzungen = not maengel
            eintrag['voraussetzungen_erfuellt'] = voraussetzungen
            eintrag['kosteneffizient_belegt'] = bool(voraussetzungen and eintrag.get('gleichwertig')
                                                     and eintrag.get('guenstiger_je_erfuelltem_auftrag'))
            eintrag['bessere_ergebnisse_belegt'] = bool(voraussetzungen and eintrag.get('besser'))
            eintrag['aussagen'] = aussagen(plan, eintrag, beide, ergebnis)
            ergebnis['vergleiche'].append(eintrag)
    return ergebnis


def aussagen(plan, eintrag, zeilen, ergebnis):
    """Füllt die Vorlagen des Messplans nur, wenn die Aussage belegt ist."""
    vorlagen = plan.get('erlaubte_aussagen_nach_beleg', {})
    werte = {
        'messdatum': ' bis '.join(dict.fromkeys(ergebnis['messzeitraum'])),
        'faelle': eintrag['gemeinsame_faelle'], 'aufgabenklasse': eintrag['name'], 'vergleich': eintrag['vergleich'],
        'preisquelle': ergebnis['preisliste']['quelle'], 'preisdatum': ergebnis['preisliste']['abgerufen_am'],
        'quote_eigene': prozent(zeilen[0]['erfuellungsquote']), 'quote_vergleich': prozent(zeilen[1]['erfuellungsquote']),
    }
    saetze = []
    if eintrag['kosteneffizient_belegt'] and 'kosteneffizient' in vorlagen:
        werte['ersparnis_prozent'] = prozent(1 - eintrag['kostenverhaeltnis'])
        saetze.append(vorlagen['kosteneffizient'].format(**werte))
    if eintrag['bessere_ergebnisse_belegt'] and 'bessere_ergebnisse' in vorlagen:
        saetze.append(vorlagen['bessere_ergebnisse'].format(**werte))
    return saetze


def prozent(anteil):
    return f'{anteil * 100:.1f}'.replace('.', ',')


def geld(wert):
    return '–' if wert is None else f'{wert:.6f}'.replace('.', ',')


def als_text(ergebnis):
    zeilen = []
    if ergebnis['synthetisch']:
        zeilen += [f'**{SYNTHETISCH_HINWEIS}**', '']
    zeilen += ['# Auswertung nach Messplan', '',
               f"Messzeitraum: {ergebnis['messzeitraum'][0]} bis {ergebnis['messzeitraum'][1]} · "
               f"Preisliste: {ergebnis['preisliste']['quelle']}, Stand {ergebnis['preisliste']['abgerufen_am']} "
               f"({ergebnis['preisliste']['waehrung']})", '']
    if not ergebnis['eigene_konfiguration_vorhanden']:
        zeilen += [f"Hinweis: Für »{ergebnis['eigene_konfiguration']}« liegen keine Läufe vor. Kein Vergleich möglich.", '']
    zeilen += ['| Aufgabenklasse | Konfiguration | Fälle | Erfüllt % | Bereich % | Kriterien % | Kosten je Auftrag (Median) | '
               'Kosten je erfülltem Auftrag | Latenz Median ms | Latenz P95 ms | Fehler |',
               '|---|---|---:|---:|---|---:|---:|---:|---:|---:|---:|']
    for z in ergebnis['tabelle']:
        zeilen.append(
            f"| {z['name']} | {z['konfiguration']} | {z['faelle']}{'' if z['genug_faelle'] else ' (zu wenig)'} | "
            f"{prozent(z['erfuellungsquote'])} | {prozent(z['erfuellungsquote_bereich'][0])}–"
            f"{prozent(z['erfuellungsquote_bereich'][1])} | {prozent(z['kriterienanteil'])} | "
            f"{geld(z['kosten_je_auftrag_median'])} | {geld(z['kosten_je_erfuelltem_auftrag'])} | "
            f"{z['latenz_ms_median']:.0f} | {z['latenz_ms_p95']:.0f} | {z['technische_fehler']} |")
    zeilen += ['', '## Vergleich mit der eigenen Kette', '']
    if not ergebnis['vergleiche']:
        zeilen.append('Kein Vergleich vorhanden. Ohne Vergleich ist keine der Aussagen belegt.')
    for v in ergebnis['vergleiche']:
        zeilen.append(f"### {v['name']} · gegen {v['vergleich']}")
        if 'unterschied_erfuellung' in v:
            verhaeltnis = '–' if v['kostenverhaeltnis'] is None else f"{v['kostenverhaeltnis']:.3f}".replace('.', ',')
            zeilen.append(f"- Unterschied im Erfüllungsgrad (eigene minus Vergleich): {prozent(v['unterschied_erfuellung'])} "
                          f"Prozentpunkte, Bereich {prozent(v['unterschied_bereich'][0])} bis {prozent(v['unterschied_bereich'][1])}")
            zeilen.append(f'- Kosten je erfülltem Auftrag, eigene Kette im Verhältnis zum Vergleich: {verhaeltnis}')
        if v['maengel']:
            zeilen.append('- Voraussetzungen nicht erfüllt: ' + '; '.join(v['maengel']))
        for name, schluessel in (('»kosteneffizient«', 'kosteneffizient_belegt'),
                                 ('»bessere Ergebnisse«', 'bessere_ergebnisse_belegt')):
            zeilen.append(f"- {name}: {'belegt für diese Aufgabenklasse' if v[schluessel] else 'NICHT belegt'}")
        for satz in v['aussagen']:
            zeilen.append(f'- Mögliche Aussage (erst nach Freigabe durch Inhaber und Rechtsprüfung): „{satz}“')
        zeilen.append('')
    zeilen += ['Spitzenstellungen wie »überragend« oder »beste« belegt diese Auswertung in keinem Fall.']
    if ergebnis['synthetisch']:
        zeilen += ['', f'**{SYNTHETISCH_HINWEIS}**']
    return '\n'.join(zeilen) + '\n'


def main(argv=None):
    parser = argparse.ArgumentParser(description='Wertet vorhandene Lauf-Protokolle nach dem Messplan aus. Ruft kein Modell auf.')
    parser.add_argument('--plan', default=str(STANDARD_PLAN))
    parser.add_argument('--laeufe', action='append', required=True, help='JSON-Lines-Datei, mehrfach möglich')
    parser.add_argument('--preisliste', required=True, help='JSON-Datei mit Quelle und Abrufdatum')
    parser.add_argument('--ausgabe-json', help='zusätzlich als JSON in diese neue Datei schreiben')
    args = parser.parse_args(argv)
    try:
        plan = lade_json(args.plan)
        klassen = pruefe_plan(plan)
        ergebnis = auswerten(plan, lies_laeufe(args.laeufe, klassen), lade_json(args.preisliste))
        if args.ausgabe_json:
            with open(args.ausgabe_json, 'x', encoding='utf-8') as datei:
                json.dump(ergebnis, datei, ensure_ascii=False, indent=2)
                datei.write('\n')
    except Eingabefehler as fehler:
        print(f'Abbruch: {fehler}', file=sys.stderr)
        return 2
    except FileExistsError:
        print('Abbruch: Ausgabedatei existiert bereits und wird nicht überschrieben.', file=sys.stderr)
        return 2
    sys.stdout.write(als_text(ergebnis))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

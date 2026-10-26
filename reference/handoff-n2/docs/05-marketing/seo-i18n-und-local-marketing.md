# TEILEKLAR — SEO-, i18n- und Local-Marketing-Playbook D/A/CH + Benelux

**Dokument-ID:** SEO-001
**Stand:** 31.08.2026
**Bezug:** DK-001 (Gesamtkonzept), DESIGN-001 (Design), OPS-DESIGN-001 (Betriebslogik)
**Gültig für:** 7 Marktversionen in 3 Sprachen

---

## 1. Marktmatrix

| Markt | Sprache | hreflang | Pfad | Währung | Steuer | Versand | Schwer | Frei ab | Lieferzeit |
|---|---|---|---|---|---|---|---|---|---|
| Deutschland | de | de-DE | /de/ | EUR | 19 % MwSt. | 4,95 € | 8,90 € | 79 € | 1–2 Werktage |
| Österreich | de | de-AT | /at/ | EUR | 20 % USt. | 6,90 € | 12,90 € | 99 € | 2–3 Werktage |
| Schweiz | de | de-CH | /ch/ | CHF | 8,1 % MWST | CHF 12.90 | CHF 24.90 | CHF 150 | 3–5 Werktage |
| Niederlande | nl | nl-NL | /nl/ | EUR | 21 % btw | 5,95 € | 11,90 € | 89 € | 2–3 werkdagen |
| Belgien (NL) | nl | nl-BE | /be-nl/ | EUR | 21 % btw | 6,50 € | 12,50 € | 99 € | 2–3 werkdagen |
| Belgien (FR) | fr | fr-BE | /be-fr/ | EUR | 21 % TVA | 6,50 € | 12,50 € | 99 € | 2–3 jours |
| Luxemburg | fr (+de) | fr-LU | /lu/ | EUR | 17 % TVA | 7,90 € | 14,90 € | 99 € | 2–4 jours |

Preise für die Schweiz werden mit Marktfaktor gerechnet und in CHF ausgegeben; Zoll- und MWST-Abwicklung ist im Preis eingeschlossen und wird ausgewiesen.

## 2. Technische i18n-Umsetzung (im Shop vorhanden)

- **Marktumschalter** im Header: Land, Währung, Steuersatz sichtbar; Auswahl schaltet Sprache, Preisformat, Währung, Versandkosten, Lieferzeit, Zahlarten, Rechtstexte und den Lokal-Bereich.
- **Drei Sprachpakete** (de/nl/fr) für die kaufentscheidenden Oberflächen: Navigation, Hero, Suchfeld, Statushinweise, Schritte, Versprechen, Lokal-Bereich, Kontextleiste.
- **Preisformatierung** über die jeweilige Locale (`de-CH` → CHF 62.30, `nl-NL` → € 64,90, `fr-BE` → 64,90 €).
- **hreflang-Verweise** für alle sieben Versionen plus `x-default` auf /de/.
- **Statushinweise lokalisiert:** „Passt zu deinem Auto" / „Past bij jouw auto" / „Compatible avec votre voiture"; „Eine Frage offen" / „Eén vraag open" / „Une question ouverte".

### Übersetzungsabdeckung (Stand dieses Artefakts)

| Bereich | de | nl | fr |
|---|---|---|---|
| Navigation, Menü, Kontextleiste, Länderumschalter | ✅ | ✅ | ✅ |
| Startseite: Hero, „So einfach geht's", Versprechen, Legende, Lokal-Bereich | ✅ | ✅ | ✅ |
| Teilesuche: Suchfeld, Filter, Sortierung, Leerzustand, Aktionen | ✅ | ✅ | ✅ |
| Produktseite: alle Abschnittstitel, Kaufbox, Zusagen, Zubehörblock | ✅ | ✅ | ✅ |
| Warenkorb: Leerzustand, Mengen, Summe, Vertrauensleiste | ✅ | ✅ | ✅ |
| Nach der Anmeldung: Garage, Konto, Werkstatt, Partnerfläche | ✅ | ✅ | ✅ |
| Kontakt: Anliegen, Formular, Erreichbarkeit | ✅ | ✅ | ✅ |
| Berater: Rahmen, Begrüßung, Menüs, Symptome, Zubehörlogik, Bestellfluss, Konto, Rückfallantwort | ✅ | ✅ | ✅ |
| Lange Fachtexte: Produktbeschreibungen, Prüfpunkte, Ratgeber-Volltexte, Kundenstimmen | ✅ | ⏳ | ⏳ |

Für die noch nicht übersetzten Fachtexte zeigt der Shop in NL/FR einen sichtbaren Hinweis („Uitgebreide technische teksten staan nu nog in het Duits" / „Les textes techniques détaillés sont encore en allemand"), statt sie unkommentiert deutsch zu zeigen. Maßangaben, Normen und Freigaben werden nur mit Fachprüfung übersetzt.

### Verbindliche URL-Struktur

```
teileklar.shop/<markt>/<kategorie>/<fahrzeug>/<artikel>
/de/bremsen/vw-golf-7-1-6-tdi/bremsscheiben-vorn-288mm
/nl/remmen/vw-golf-7-1-6-tdi/remschijven-voor-288mm
/be-fr/freins/vw-golf-7-1-6-tdi/disques-avant-288mm
```

Regeln: ein Pfad je Markt, keine Parameter für Sprache, keine automatische Weiterleitung nach IP (nur Hinweisbanner mit Wahl), Kanonical je Marktversion auf sich selbst, hreflang wechselseitig vollständig.

## 3. Keyword-Strategie je Sprache

**Muster:** `[Teil] + [Fahrzeug] + [Merkmal]` für Produktseiten, `[Frage]` für Ratgeber, `[Teil] + [Stadt/Land]` für lokale Seiten.

| Sprache | Kaufabsicht (Beispiele) | Informationsabsicht | Lokal |
|---|---|---|---|
| de | bremsscheiben golf 7 1.6 tdi, starterbatterie 70ah efb, motoröl 5w30 507 00 | welche bremsscheibe passt, efb oder agm, wie viel öl golf 7 | autoteile wien, autoteile zürich, werkstatt bremsen hamburg |
| nl | remschijven golf 7, startaccu 70ah efb, motorolie 5w30 507 00 | welke remschijf past, efb of agm accu, hoeveel olie golf 7 | auto onderdelen amsterdam, garage remmen antwerpen |
| fr | disques de frein golf 7, batterie 70ah efb, huile moteur 5w30 507 00 | quel disque de frein, batterie efb ou agm, combien d'huile golf 7 | pièces auto bruxelles, garage freins liège, pièces auto luxembourg |

Priorität: erst Fahrzeug-Teil-Kombinationen (hohe Kaufabsicht, geringer Wettbewerb im Long Tail), dann Ratgeber als Zubringer, dann lokale Seiten für Werkstattvermittlung.

## 4. Content-Plan je Markt

1. **Fahrzeug-Teil-Seiten** (automatisch aus Katalog + Passungsdaten, je Markt in Landessprache, kein maschineller Rohtext ohne Redaktionsfreigabe).
2. **Ratgeber**: 6 Kernartikel je Sprache — Bremsen, Batterie, Öl, Wischer, Schlüsselnummern, „Eine Frage offen". Übersetzung mit Fachprüfung, nicht per Maschine allein; Maßangaben und Normen bleiben unverändert.
3. **Lokalseiten**: je Land 4–8 Städte, Inhalt = Werkstattpartner, Lieferzeit vor Ort, Zahlarten, Rücknahmeweg. Keine Duplikate mit ausgetauschtem Stadtnamen — jede Seite braucht eigene Partner- und Serviceangaben.
4. **Rechtsseiten** je Markt (siehe Abschnitt 6), verlinkt im Footer jeder Marktversion.

## 5. Local Marketing je Land

| Markt | Zahlarten (Pflicht) | Preisportale | Lokale Hebel |
|---|---|---|---|
| DE | Rechnung, SEPA, Karte, PayPal | Google Shopping, idealo, billiger.de | Werkstattnetz-Kooperationen, KBA-Fokus in Inhalten |
| AT | EPS, Rechnung, Karte, PayPal | Google Shopping, geizhals.at, idealo.at | §57a-Begutachtung („Pickerl") als Inhaltsanlass |
| CH | TWINT, Karte, Rechnung | Google Shopping, toppreise.ch, comparis | Zoll/MWST inklusive kommunizieren, MFK-Prüfung als Anlass |
| NL | iDEAL, Rekening, Karte | beslist.nl, Kieskeurig, Google Shopping | APK-Termin als Inhaltsanlass, kenteken-Suche |
| BE-NL | Bancontact, iDEAL, Karte | beslist.be, Vergelijk.be | Autokeuring als Anlass, zweisprachige Regionen beachten |
| BE-FR | Bancontact, Karte, Facture | Comparer.be, Vergelijk.be | Contrôle technique als Anlass |
| LU | Karte, Virement | Luxauto, Comparer.be | Grenzpendler-Thema, zweisprachiger Support |

Kampagnenlogik: Suchanzeigen nur auf Fahrzeug-Teil-Kombinationen mit belegter Passung; keine Anzeige auf Artikel im Status „Eine Frage offen". Lokale Anzeigen (Werkstattvermittlung) nur in Regionen mit aktivem Partner.

## 6. Recht und Rücknahme je Markt

| Markt | Widerruf | Batterien | Verpackung | Besonderheit |
|---|---|---|---|---|
| DE | 14 Tage (§ 355 BGB) | BattG, Pfand auf Starterbatterien | VerpackG, LUCID | Preisangabenverordnung |
| AT | 14 Tage (FAGG) | Batterienverordnung | Altstoff Recycling Austria | Gewährleistung 2 Jahre |
| CH | kein gesetzliches Widerrufsrecht → freiwillig 14 Tage, klar als freiwillig gekennzeichnet | VeVA/Rücknahmepflicht | VOC/Chemikalienrecht | Zoll- und MWST-Abwicklung ausweisen |
| NL | 14 dagen herroeping | Batterijenbesluit | UPV verpakkingen | Prijsvermelding incl. btw |
| BE | 14 dagen/jours | Bebat-Beitrag | Fost Plus | Zweisprachige Pflichtangaben |
| LU | 14 jours | Règlement piles | SDK Emballages | Zweisprachigkeit FR/DE |

Regel: Kein Markt geht live, bevor Widerruf, Rücknahme, Steuer und Pflichtangaben in Landessprache juristisch geprüft sind.

## 7. Feed- und Marktplatzstrategie

- **Ein Katalog, sieben Projektionen**: je Markt eigener Feed mit Sprache, Preis, Währung, Steuer, Versandkosten und Lieferzeit; identische Artikelidentität (EAN/OE) über alle Märkte.
- **Reihenfolge**: Google Shopping/SEO zuerst (eigener Datenbestand), dann Preisportale je Land, dann Marktplätze (eBay, Kaufland, bol.com für NL/BE) nach Nachweis von Bestand-, Order- und Rücksende-Synchronisierung.
- **Feed-Titel je Sprache** mit demselben Schema: Teiletyp + Maß/Spezifikation + Position + Marke, max. 150 Zeichen.
- **Ausschlussregel**: Artikel im Status „Eine Frage offen" oder gesperrt gehen nicht in Feeds.

## 8. Messung je Markt

Sichtbarkeit (Rankings der Fahrzeug-Teil-Muster), organischer Anteil am Umsatz, Klickrate der lokalisierten Titel, Anteil richtiger Sprachversion in der Suche (hreflang-Fehler = 0), Retourenquote je Markt, Deckungsbeitrag je Markt und Kanal, Anteil Beratungen in Landessprache. Keine Zahl wird veröffentlicht, bevor sie über einen definierten Zeitraum gemessen wurde.

## 9. Rollout-Reihenfolge (Empfehlung)

1. **DE** vollständig (Katalog, Recht, Zahlung, Feed) — Referenzmarkt.
2. **AT** (gleiche Sprache, abweichende Steuer/Recht/Versand) — schnellster Zweitmarkt.
3. **NL** (neue Sprache, iDEAL, hohe Online-Affinität).
4. **BE-NL + BE-FR** gemeinsam (zwei Sprachversionen, Bebat/Fost Plus).
5. **CH** (Zoll, Währung, TWINT — höchster Aufwand, gute Marge).
6. **LU** als Anhang zu BE-FR.

## 10. Offene Punkte

- Übersetzung der Langinhalte (Ratgeber, Produktbeschreibungen, Kundenstimmen) mit Fachprüfung je Sprache.
- Lokale Werkstattpartner in AT, CH, NL, BE, LU.
- Zahlungsdienstleister-Verträge je Markt (TWINT, iDEAL, Bancontact, EPS).
- Steuer-Registrierungen und Rücknahmesysteme je Land.
- Juristische Endprüfung aller Rechtstexte in Landessprache.
- Domainstrategie: Unterordner (aktuell) gegen Länderdomains — Entscheidung mit SEO- und Rechtsberatung.

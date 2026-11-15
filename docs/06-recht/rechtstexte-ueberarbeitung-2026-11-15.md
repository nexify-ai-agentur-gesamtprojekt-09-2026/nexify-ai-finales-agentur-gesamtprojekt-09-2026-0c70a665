# Rechtstexte NeXify AI und TEILEKLAR: Überarbeitung für Deutschland und die Niederlande

Stand 15.11.2026 · Status: **Entwurf zur Abnahme durch den Inhaber** · Zweig `claude/rechtstexte-de-nl`

Auftrag des Inhabers vom 15.11.2026: Alle Rechtstexte vollständig auf das Unternehmen, seine Leistungen und das Recht
Deutschlands und der Niederlande abstimmen und ausweiten. Die Projektregel „keine Rechtstextänderung“ (D-017) ist für
diesen Auftrag aufgehoben, aber nur für Entwürfe: Nichts geht ohne Abnahme des Inhabers live.

**Keine Rechtsberatung.** Die Entwürfe sind anhand aktueller Primärquellen recherchiert (Abruf 15.11.2026, Fundstellen
in `quellen/`). Vor Veröffentlichung ist eine anwaltliche Prüfung nach deutschem und niederländischem Recht empfohlen;
Abschnitt 6 nennt die Stellen, die sie besonders brauchen.

## Inhalt dieses Ordners

| Datei | Inhalt |
|---|---|
| `rechtstexte-ueberarbeitung-2026-11-15.md` | dieses Dokument: Kurzfassung, Bestandsaufnahme, Anforderungsmatrix, Änderungsübersicht, Offene Punkte, Einbau |
| `tatsachen-steckbrief-2026-11-15.md` | belegte Tatsachen zu Leistungen, Shop, Diensten, Widersprüchen (Grundlage der Texte) |
| `quellen/quellenregister-de.md`, `-nl.md`, `-eu.md` | Rechtsquellen mit Fundstelle, Abrufdatum und Status „abgerufen / nicht abgerufen“ |
| `entwuerfe/ENTWURFSREGELN.md` | Status, Platzhalter, Rechtsform-Varianten, gemeinsame Festlegungen |
| `entwuerfe/de/`, `entwuerfe/nl/` | 16 Rechtstexte je Sprache, eigenständige Fassungen |
| `entwuerfe/fr/`, `entwuerfe/en/` | Übersetzungen, **nicht muttersprachlich geprüft** |

## 1. Kurzfassung

1. **Der Bestand ist lückenhaft und in Teilen überholt.** Die sieben Kurzseiten (`/impressum` bis `/teileklar/rechtliches`)
   sind Hinweise mit zwei bis drei Absätzen und sagen selbst, dass die vollständigen Texte ausstehen. Eine
   Datenschutzerklärung nach Art. 13 DSGVO, eine Cookie-Information mit den tatsächlich gesetzten Einträgen, eine
   Erklärung zur Barrierefreiheit, Partnerbedingungen für Werkstätten und Einwilligungstexte fehlen. AGB, AVV und
   Widerruf der Agentur gibt es nur auf Deutsch (Stand August 2026), die Shop-Texte ebenfalls nur auf Deutsch.
2. **Vier Widersprüche tragen ein echtes Risiko:**
   - Rechtsform: Impressum „Eenmanszaak“, Code an anderer Stelle „B.V.“; der öffentliche Registerstand ließ sich am
     15.11.2026 nicht belegen (Abschnitt 5, OP-01). Alle Entwürfe führen beide Fassungen.
   - Die Agentur-AGB und `/widerruf` sagen „keine Verbraucherverträge“, der Shop verkauft an Verbraucher.
   - `/ki-hinweise` sagt „ohne Live-KI-Modell“, der Chat läuft seit D-010 mit einem Sprachmodell.
   - Die Shop-AGB nennen die Schweiz, Batteriepfand und Zahlungsarten „je Markt“; die Kasse liefert nach DE, AT, NL, BE,
     LU, kennt kein Pfand und nur Revolut.
3. **Seit 2025 hat sich die Rechtslage an mehreren Stellen geändert, die der Bestand nicht kennt:** elektronische
   Widerrufsfunktion (DE seit 19.06.2026, NL seit 25.06.2026), harmonisierte Mitteilung zur gesetzlichen Gewährleistung
   (seit 27.09.2026), Kennzeichnungspflichten nach Art. 50 KI-Verordnung (seit 02.08.2026), Ende der
   EU-Streitbeilegungsplattform (20.07.2025), neues Batterie- und Verpackungsrecht, Data Act für Software-Dienste,
   neues Produkthaftungsrecht für Software ab 09.12.2026. Einzelheiten in der Matrix (Abschnitt 3).
4. **Geliefert sind 16 Rechtstexte je Sprache** (Deutsch und Niederländisch eigenständig, Französisch und Englisch als
   Übersetzung), jeweils mit Änderungsübersicht, Platzhaltern und Prüfstellen.
5. **Nicht eingebaut.** Die Texte liegen als Dokumente vor, nicht in den Seiten. Grund: Die drei Quelldateien der
   heutigen Rechtstexte sind hash-gebunden, Pins für Rechtstexte dürfen ohne Abnahme des Inhabers nicht nachgezogen
   werden, und die Kurzseiten können die langen Texte ohne Änderung an Bausteinen nicht aufnehmen (Design-Sperre).
   Der Einbau ist als nächster Schritt beschrieben (Abschnitt 7).
6. **Mehrere Texte beschreiben Funktionen, die es noch nicht gibt** (Widerrufsfunktion, Gewährleistungs-Mitteilung,
   Batteriepfand, Herstellerangaben, Einwilligungsverwaltung, Footer-Kennzeichnung in der neuen Form). Diese Texte
   dürfen erst live gehen, wenn die Funktion gebaut ist (Abschnitt 5, Teil C).

## 2. Bestandsaufnahme

Quelle der Seiten: `config/site-map.json` (Kurzseiten, je Feld `de`, `nl`, `fr`, `en`), `apps/web/lib/legal/*.json`
(lange Texte, nur `de`), `config/teileklar-legal.json` (Shop, nur `de`). Stand `main` 9c9c806.

| Text | Adresse | Sprachen | Was drinsteht | Was fehlt | Widerspruch / veraltet |
|---|---|---|---|---|---|
| Impressum | `/impressum` | de, nl, fr, en | Anbieter, Anschrift, Kontakt, KvK-Nummer, USt-IdNr., Inhaber | Geltungsbereich (Shop, weitere Domains), Vertretung bei B.V., Streitbeilegungshinweis, Verantwortlicher für Inhalte | Rechtsform ungeklärt (Eenmanszaak vs. B.V.); Titel im Meta „NeXify AI FACTORY“, im Text „NeXify AI by NeXify“; Kontaktadresse weicht von anderen Stellen ab |
| Datenschutz | `/datenschutz` | de, nl, fr, en | zwei Absätze Hinweis; „vollständige Erklärung in Prüfung“ | alles nach Art. 13/14 DSGVO: Verantwortlicher, Zwecke, Rechtsgrundlagen, Empfänger, Drittland, Fristen, Rechte, Aufsicht | erfüllt die Informationspflicht nicht; Chat, Konten, Shop, Werkstatt, Mail nicht erwähnt |
| Cookies | `/cookies` | de, nl, fr, en | allgemeiner Hinweis auf Einstellungen | Liste der Cookies und Speichereinträge, Zweck, Dauer, Rechtsgrundlage | spricht von „Einstellungsbereich“ und „optionaler Messung“; tatsächlich gibt es nur die Fehlerdiagnose-Einstellung, deren Wahl nicht gespeichert wird |
| AGB (B2B) | `/agb` | de | 12 Paragraphen, Tagesabrechnung, Haftung, NL-Recht, Venlo | Suite, API/Prepaid, BYOK, Care, KI-Agenten, Datenexport/Wechsel, höhere Gewalt, AGB-Änderung | deutsche BGB-Paragraphen trotz gewähltem NL-Recht; sehr kurze Fristen (24 Stunden Genehmigungsfiktion, Fälligkeit 09:00 Uhr Folgetag); Verzugszins „über Basiszins“ auch für NL; Gericht „Venlo“ (zuständig ist rechtbank Limburg, Sitzungsort Roermond); „keine Verbraucherverträge“ |
| AVV | `/avv` | de | 7 Paragraphen | Anlagen (Verarbeitungen, TOM, Liste mit Sitz und Garantie), Drittland, Haftung, Audit-Verfahren | Liste der Unterauftragsverarbeiter passt nicht zum Lösungsregister (Vercel, PostHog, Emergent, Revolut fehlen; Nscale und „Supabase Inc.“ stehen drin, Supabase ist selbst betrieben) |
| Widerruf (Agentur) | `/widerruf` | de | B2B-Hinweis, Ausnahmefall Verbraucher, Kulanz-Storno | Verweis auf Shop-Widerruf | „Verbrauchern wird kein Vertrag angeboten“ stimmt für das Unternehmen nicht (Shop); frei formulierte Verbraucherbelehrung statt Muster; § 357 Abs. 8 BGB ist nicht mehr die Wertersatznorm |
| Vertragsgrundlagen | `/vertragsgrundlagen` | de, nl, fr, en | zwei Absätze | Übersicht, welche Bedingungen wofür gelten, Rangfolge | „Vertragsunterlagen bleiben Entwürfe“ |
| KI-Hinweise | `/ki-hinweise` | de, nl, fr, en | Chat, Bildwelt | Art. 50 KI-VO, Kennzeichnung, Modellanbieter, Grenzen, Meldeweg | „ohne Live-KI-Modell“ ist seit D-010 falsch |
| Barrierefreiheit | `/barrierefreiheit` | de, nl, fr, en | Anspruch, Feedbackweg | Stand der Prüfung, Rechtsrahmen, zuständige Stelle | erklärt keine Konformität (richtig), nennt aber keinen Prüfstand |
| TEILEKLAR Rechtliches | `/teileklar/rechtliches` | de, nl, fr, en (Kurztext); AGB und Widerruf nur de | Hinweis „Freigabe steht aus“, darunter AGB §§ 1–9 und Widerruf | Verkäuferangaben, Vertragsschluss passend zur Kasse, Mängelrechte je Land, Streitbeilegung, Versand/Zahlung, Batterie/Altöl/Verpackung, Produktsicherheit | Seite sagt „keine geltenden Kaufbedingungen“ und zeigt zugleich AGB, die die Kasse als akzeptiert abfragt; Schweiz, Pfand, Zahlungsarten „je Markt“; Widerruf ohne Baustein zur Widerrufsfunktion; Ausnahme „Hygiene-Versiegelung“ passt nicht zum Sortiment; Rücksendekosten unklar („sofern nicht anders angegeben“) |
| Werkstatt-Partner | – | – | – | Bedingungen fehlen ganz | – |
| Terminbuchung | – | – | – | Bedingungen fehlen ganz (Funktion liegt auf einem Zweig) | – |
| Einwilligungstexte | Formulare | de (teils nl/fr/en) | kurze Einwilligungssätze an Kontakt- und Werkstattformular | Newsletter (Double-Opt-in), Banner, Kasse | Kasse verlangt „Akzeptieren“ der Widerrufsbelehrung |

Sprachen: Die Kurzseiten liegen in allen vier Sprachen mit gleichem Schlüsselsatz vor. Alle langen Texte (AGB, AVV,
Widerruf, Shop-AGB, Shop-Widerruf) gibt es nur auf Deutsch; niederländische Kunden und Verbraucher bekommen heute
keinen Vertragstext in ihrer Sprache.

Weitere Fundorte ohne Wirkung auf die Seiten: `prototypen/API-Rechtliches.dc.html` (API- und Prepaid-Bedingungen,
Entwurf vom 28.09.2026), `docs/09-final/08-recht-und-compliance.md` (Textmatrix und offene Entscheidungen E1–E12),
`docs/06-auftraege/rechtstexte.md` (früherer Auftrag für TEILEKLAR mit sieben Marktversionen).

## 3. Anforderungsmatrix

Lesehilfe: „Gilt“ = gilt für uns ja / nein / unklar. „Heute“ = der heutige Text deckt es ab ja / teilweise / nein.
Fundstellen: „DE n“, „NL n“, „EU n“ verweisen auf den Abschnitt n im jeweiligen Quellenregister unter `quellen/`
(dort Norm, Kernaussage, Adresse, Abruf 15.11.2026 und der Vermerk, ob die Quelle abgerufen werden konnte).
B2B = Agentur, Software, Suite, API, Care. B2C = Shop TEILEKLAR.

### 3.1 Anbieterkennzeichnung

| Thema | Land / Rolle | Gilt | Rechtsgrundlage (Fundstelle) | Heute | Entwurf |
|---|---|---|---|---|---|
| Pflichtangaben des Diensteanbieters | NL, B2B und B2C | ja | art. 3:15d BW; Handelsregisterwet 2007 art. 27 (NL 1) | teilweise | 01 |
| Angaben nach § 5 DDG für das an Deutschland gerichtete Angebot | DE | unklar (Herkunftslandprinzip § 3 DDG; Einordnung, nicht geklärt) | § 5, § 3 DDG; § 18 Abs. 2 MStV (DE 1; EU 21) | teilweise | 01 |
| Identität und Anschrift des Unternehmers gegenüber Verbrauchern | DE, NL, B2C | ja | Art. 246a § 1 Abs. 1 Nr. 2–4 EGBGB (DE 3); art. 6:230m BW (NL 2) | teilweise | 01, 10, 11 |
| Rechtsform, Vertretung, Registerangaben | beide | ja; Inhalt hängt an der Rechtsform | NL 1; DE 1 | unklar (Widerspruch) | 01 Varianten A/B |

### 3.2 Datenschutz

| Thema | Land / Rolle | Gilt | Rechtsgrundlage (Fundstelle) | Heute | Entwurf |
|---|---|---|---|---|---|
| Information der Betroffenen | EU, alle | ja | Art. 12–14 DSGVO (EU 1) | nein | 02 |
| Rechtsgrundlagen, Einwilligung, Widerruf | EU, alle | ja | Art. 6, 7 DSGVO (EU 1) | nein | 02, 16 |
| Betroffenenrechte, Widerspruch | EU, alle | ja | Art. 15–22 DSGVO (EU 1) | nein | 02 |
| Auftragsverarbeitung für Kunden (Suite, API, Projekte, Care) | EU, B2B | ja | Art. 28 Abs. 3 DSGVO (EU 1) | teilweise | 05 |
| Eigene Auftragsverarbeiter und Empfänger | EU, alle | ja | Art. 13 Abs. 1 lit. e, Art. 28 DSGVO (EU 1) | nein | 02, 05 Anlage 3 |
| Drittlandübermittlung USA | EU, alle | ja | Art. 44–46 DSGVO; Angemessenheitsbeschluss (EU) 2023/1795, gültig, Rechtsmittel anhängig; Standardvertragsklauseln (EU) 2021/914 (EU 2) | nein | 02, 05 |
| Drittlandbezug China beim Sprachmodell | EU, alle | ja; kein Angemessenheitsbeschluss | Art. 46 DSGVO, Empfehlungen 01/2020 des EDSA (EU 2) | nein | 02, 05, 08 (als Risiko geführt, OP-13) |
| Verzeichnis, Sicherheit, Meldung von Verletzungen | EU, alle | ja | Art. 30, 32, 33, 34 DSGVO (EU 1) | intern, nicht belegt | 05; OP-14 |
| Federführende Aufsicht und Beschwerde | NL (Sitz), DE (Wohnort) | ja | Art. 56, 77 DSGVO (EU 1); UAVG, Autoriteit Persoonsgegevens (NL 10) | nein | 02 |
| Nationale Ergänzungen | DE | teilweise (bei NL-Sitz vor allem über Marktort und Werbung) | BDSG (DE 11) | nein | 02 Länderabschnitt |
| Nationale Ergänzungen | NL | ja | UAVG, u. a. Altersgrenze 16 (NL 10) | nein | 02 Länderabschnitt |
| Datenschutzbeauftragter | beide | unklar (hängt von Umfang und Art der Verarbeitung ab) | Art. 37 DSGVO (EU 1); § 38 BDSG (DE 11) | nein | 02; OP-15 |

### 3.3 Cookies und Endgerätezugriff

| Thema | Land / Rolle | Gilt | Rechtsgrundlage (Fundstelle) | Heute | Entwurf |
|---|---|---|---|---|---|
| Einwilligung für nicht notwendige Speicherung und Zugriff | DE | ja (bei NL-Sitz nicht abschließend geklärt, inhaltlich gleichlaufend) | § 25 TDDDG (DE 2); Art. 5 Abs. 3 RL 2002/58/EG (EU 3) | teilweise | 03, 16 |
| Einwilligung, Ausnahme für funktionale Einträge | NL | ja | art. 11.7a Telecommunicatiewet; Aufsicht ACM (NL 8) | teilweise | 03, 16 |
| Vollständige Liste der Einträge mit Zweck und Dauer | beide | ja (Transparenz, Art. 13 DSGVO) | EU 1; DE 2; NL 8 | nein | 03 |
| Anerkannte Einwilligungsdienste | DE | freiwillig | EinwV (DE 2) | – | – |

### 3.4 Verbraucherrecht im Fernabsatz (Shop)

| Thema | Land / Rolle | Gilt | Rechtsgrundlage (Fundstelle) | Heute | Entwurf |
|---|---|---|---|---|---|
| Vorvertragliche Informationen | DE, B2C | ja | § 312d BGB, Art. 246a § 1 EGBGB (DE 3) | teilweise | 10–13 |
| Vorvertragliche Informationen | NL, B2C | ja | art. 6:230m BW (NL 2) | nein (kein nl-Text) | 10–13 |
| Bestellablauf, Schaltfläche, Angaben unmittelbar vor der Bestellung | DE | ja | § 312i, § 312j BGB (DE 3) | teilweise (Schaltfläche richtig; Angaben nach neuer Verweisung prüfen) | 11, 16 |
| Bestellablauf, Schaltfläche | NL | ja | art. 6:230v BW; art. 6:227b BW (NL 2) | nein (kein nl-Wortlaut belegt) | 11, 16 |
| Widerrufsrecht, Frist, Folgen, Ausnahmen | DE | ja | §§ 312g, 355–357a BGB; Anlage 1 und 2 zu Art. 246a EGBGB (DE 3) | teilweise (frei formuliert, Ausnahmen unpassend) | 12 |
| Herroepingsrecht | NL | ja | art. 6:230o–6:230s BW; Anhang I RL 2011/83/EU (NL 2, Anhang A/B) | nein | 12 |
| Elektronische Widerrufsfunktion | DE | ja, seit 19.06.2026 | § 356a BGB (DE 4); Art. 11a RL 2011/83/EU (EU 5) | nein (Funktion fehlt im Shop) | 12; OP-20 |
| Herroepingsfunctie | NL | ja, seit 25.06.2026 | art. 6:230oa BW (NL 3) | nein | 12; OP-20 |
| Harmonisierte Mitteilung zur gesetzlichen Gewährleistung, Garantielabel | DE, NL | ja, seit 27.09.2026 (NL: Pflichtinformationen seit 16.07.2026) | Art. 246a § 1 Abs. 1 Nr. 10 ff. EGBGB (DE 3); DVO (EU) 2025/1960 (EU 5); NL 2 | nein | 11; OP-21 |
| Gesetzliche Mängelrechte | DE | ja | §§ 434 ff., 474–479 BGB: zwei Jahre, Beweislastumkehr ein Jahr (DE 6) | teilweise („gesetzliche Gewährleistung“) | 11 |
| Conformiteit | NL | ja | art. 7:17, 7:18a, 7:21–7:23 BW; keine feste Frist (NL 4) | nein | 11 |
| Verlängerung der Haftung nach Nachbesserung | EU | ja, seit 31.07.2026 | RL (EU) 2024/1799 (EU 6) | nein | 11 |
| Lieferfrist, Gefahrübergang, Vorauszahlung | DE, NL | ja | DE 6; art. 7:9, 7:11, 7:26 BW – 50-%-Grenze für Vorauszahlung laut ACM auch online (NL 4) | teilweise | 11; OP-22 |
| Preisangaben, Gesamtpreis, Grundpreis, Versandkosten, Pfand | DE | ja | PAngV §§ 3, 4, 6, 7, 11 (DE 8) | teilweise | 13 |
| Preisangaben, Preisermäßigung | NL | ja | Besluit prijsaanduiding producten art. 5a (NL 7) | nein | 13 |
| Verbraucherstreitbeilegung | DE | ja (Erklärung) | §§ 36, 37 VSBG (DE 9) | nein | 10, 11 |
| Geschillenbeslechting | NL | ja (Information) | NL 11 | nein | 10, 11 |
| EU-Streitbeilegungsplattform | EU | nein, eingestellt 20.07.2025 | VO (EU) 2024/3228 (EU 7; DE 9) | – (kein Link vorhanden) | – |
| Kein Ausschluss nach Wohnsitz in der EU | EU | ja | VO (EU) 2018/302 (EU 8) | teilweise | 11, 13 |
| Rechtswahl gegenüber Verbrauchern | EU | ja | Art. 6 Rom-I-VO; Art. 17–19 Brüssel-Ia-VO; EuGH C-191/15 (EU 9; DE 19) | teilweise | 11 |
| Österreich, Belgien, Luxemburg | B2C | ja (Lieferländer) | zwingendes Verbraucherrecht des Wohnsitzstaats (EU 9) | nein | 11 (Hinweis); OP-23 |
| Kündigungsschaltfläche für Dauerverträge mit Verbrauchern | DE | nein (keine Verbraucher-Abos) | § 312k BGB (DE 5) | – | – |

### 3.5 AGB B2B

| Thema | Land / Rolle | Gilt | Rechtsgrundlage (Fundstelle) | Heute | Entwurf |
|---|---|---|---|---|---|
| Einbeziehung und Inhaltskontrolle | NL | ja | art. 6:231–6:247 BW; Zur-Verfügung-Stellen 6:233, 6:234 (NL 5) | teilweise | 04 |
| Inhaltskontrolle bei deutschen Kunden | DE | unklar (bei wirksamer Wahl niederländischen Rechts gilt NL-Recht; Maßstab der §§ 305–310 BGB als Vorsicht) | DE 7; EU 9 | teilweise | 04 Länderabschnitt |
| Leistungsbeschreibung, Mitwirkung, Änderungen | beide | ja | Vertragsfreiheit; opdracht art. 7:400 ff., aanneming art. 7:750 ff. BW (NL 6) | teilweise | 04 A, B1 |
| Abnahme, Abnahmefiktion | beide | ja | § 640 Abs. 2 BGB (DE 7); art. 7:758 BW (NL 6) | teilweise | 04 |
| Verzug, Zinsen, Pauschale, Zahlungsfristen | DE | ja | §§ 286, 288, 271a BGB (DE 7) | teilweise | 04 |
| Verzuim, handelsrente (10,4 % seit 01.07.2026), incassokosten, Zahlungsfrist | NL | ja | art. 6:81 ff., 6:119a, 6:96 BW (NL 6); RL 2011/7/EU (EU 18) | teilweise (falsche Bezugsgröße) | 04 |
| Haftungsbegrenzung | beide | ja | DE 7 (§§ 307, 309 Nr. 7 BGB als Maßstab); NL 6 (Grenze bei Vorsatz und bewusster Leichtfertigkeit) | teilweise | 04; OP-30 |
| Produkthaftung für Software | DE, NL | ja, ab 09.12.2026 | RL (EU) 2024/2853 (EU 13); neues ProdHaftG (DE 16); NL-Umsetzung angenommen, noch nicht in Kraft (NL 14) | nein | 04 |
| Nutzungsrechte, Open Source, KI-erzeugte Bestandteile | beide | ja | Vertragsrecht | teilweise | 04 |
| Laufzeit, Kündigung, Care | beide | ja | NL 6 (opzegging art. 7:408 BW) | nein | 04 A, B5 |
| Wechsel und Datenexport bei Software-Diensten | EU | ja (Suite, API) | Data Act, Art. 23–31 VO (EU) 2023/2854; Kündigungsfrist für den Wechsel höchstens zwei Monate (EU 17) | nein | 04 B2, B3 |
| Prepaid-Guthaben | NL, DE | ja; Einordnung als E-Geld ungeprüft | Aufsichtsrecht, nicht recherchiert | nein (nur Prototyp) | 04 B3; OP-32 |
| KI-spezifische Klauseln | EU | ja | Art. 4, 5, 50 VO (EU) 2024/1689 (EU 4) | teilweise (§ 6) | 04 B6 |
| Umsatzsteuer, Reverse Charge, Rechnungsangaben | NL, DE | ja | Wet OB 1968 art. 35a (NL 16); Art. 44, 196 MwStSystRL (EU 19); DE 20 | teilweise | 04 |
| Anwendbares Recht, Gerichtsstand | NL, DE | ja | Art. 3 Rom-I-VO, Art. 25 Brüssel-Ia-VO (EU 9); rechtbank Limburg, Sitzungsort Roermond (NL 17) | teilweise („Venlo“) | 04; OP-31 |

### 3.6 KI-Transparenz

| Thema | Land / Rolle | Gilt | Rechtsgrundlage (Fundstelle) | Heute | Entwurf |
|---|---|---|---|---|---|
| Hinweis bei Interaktion mit einem KI-System (Chat) | EU | ja, seit 02.08.2026 | Art. 50 Abs. 1, 5 VO (EU) 2024/1689 (EU 4) | teilweise (Hinweis im Chat vorhanden, `/ki-hinweise` falsch) | 08 |
| Maschinenlesbare Kennzeichnung synthetischer Inhalte | EU | unklar (Pflicht des Anbieters des erzeugenden Systems; Übergang bis 02.12.2026 für Altsysteme) | Art. 50 Abs. 2, Art. 111 Abs. 4 n. F. (EU 4) | nein | 08 |
| Offenlegung bei Deepfakes und bei Texten von öffentlichem Interesse | EU | unklar (Bildwelt zeigt keine realen Personen als Täuschung; Einordnung prüfen) | Art. 50 Abs. 4 (EU 4) | teilweise | 08 |
| Sichtbare Kennzeichnung immer, im Footer | – | ja, Vorgabe des Inhabers vom 15.11.2026 (geht über das Gesetz hinaus) | Inhaberentscheidung | teilweise (Footer nennt nur „Markeninszenierung · KI-generiert“) | 08, 16; OP-24 |
| KI-Kompetenz der Beschäftigten | EU | ja (abgeschwächt zur Förderpflicht) | Art. 4 n. F. (EU 4) | nicht belegt | 04 B6 |
| Verbotene Praktiken | EU | ja | Art. 5 (EU 4) | teilweise | 04 B6, 08 |
| Zuständige Behörde | DE / NL | – | Bundesnetzagentur, KI-MIG (DE 17); NL: Gesetz noch Entwurf (NL 15) | nein | 08 |

### 3.7 Barrierefreiheit

| Thema | Land / Rolle | Gilt | Rechtsgrundlage (Fundstelle) | Heute | Entwurf |
|---|---|---|---|---|---|
| Barrierefreier Online-Handel mit Verbrauchern | DE | unklar (Ausnahme für Kleinstunternehmen bei Dienstleistungen: unter 10 Beschäftigte und höchstens 2 Mio. € Umsatz oder Bilanzsumme) | BFSG § 1 Abs. 3 Nr. 5, § 3 Abs. 3, § 14 mit Anlage 3 (DE 12); RL (EU) 2019/882 (EU 14) | teilweise | 09; OP-25 |
| Dasselbe | NL | unklar (gleiche Ausnahme) | Umsetzungsgesetz, Aufsicht ACM (NL 12) | teilweise | 09 |
| B2B-Agenturseite | beide | nein (kein Verbraucherdienst), freiwillig | – | teilweise | 09 |

### 3.8 Digitale Dienste und Plattformpflichten

| Thema | Land / Rolle | Gilt | Rechtsgrundlage (Fundstelle) | Heute | Entwurf |
|---|---|---|---|---|---|
| Kontaktstelle, AGB-Transparenz für Vermittlungsdienste | EU | unklar (Werkstattverzeichnis und Terminvermittlung: Einordnung als Vermittlungs- oder Hostingdienst prüfen; Ausnahmen für Kleinst- und Kleinunternehmen) | Art. 11, 12, 14, 16, 19 VO (EU) 2022/2065 (EU 15); DE 18; NL 15 | nein | 14 (Prüfpunkt) |
| Bedingungen gegenüber gewerblichen Nutzern einer Vermittlungsplattform | EU | unklar (trifft zu, wenn Werkstätten über die Plattform Verbrauchern Leistungen anbieten; Aufhebung der Verordnung ist vorgeschlagen, nicht beschlossen) | Art. 3–5, 11 VO (EU) 2019/1150 (EU 16; NL 18) | nein | 14 |
| Kundenbewertungen | EU | nein (keine Bewertungen im Shop) | EU 20 | – | – |

### 3.9 Waren des Shops: Batterien, Altöl, Verpackung, Produktsicherheit

| Thema | Land / Rolle | Gilt | Rechtsgrundlage (Fundstelle) | Heute | Entwurf |
|---|---|---|---|---|---|
| Pfand 7,50 € auf Starterbatterien, Rücknahme, Hinweise | DE | ja | BattDG §§ 18, 19, 24 (DE 13); VO (EU) 2023/1542 (EU 11) | teilweise (Pfand im Text, nicht in der Kasse) | 13; OP-26 |
| Herstellerpflichten, Registrierung, Bevollmächtigter je Lieferland | DE, NL, weitere | unklar (hängt davon ab, wer Hersteller im Sinne der Verordnung ist; Direktversand durch den Lieferanten) | EU 11; DE 13 (§ 40 Abs. 2 BattDG); NL 13 | nein | 13; OP-27 |
| Batterien | NL | ja; keine Pfandregel gefunden | Uitvoeringsbesluit zur EU-Batterieverordnung (NL 13) | nein | 13 |
| Altöl: Rücknahme- und Hinweispflicht beim Verkauf von Motoröl | DE | ja | § 8 AltölV (DE 14) | nein | 13; OP-28 |
| Altöl | NL | unklar (aktuelle Rechtslage nicht abgerufen) | NL 13 | nein | 13 |
| Verpackungen: Registrierung, Systembeteiligung, Bevollmächtigter | DE | ja, soweit wir Hersteller sind; für ausländische Direktversender Bevollmächtigter Pflicht | VO (EU) 2025/40, VerpackDG §§ 5–7 (DE 15; EU 12) | nein | 13; OP-27 |
| Verpackungen | NL | unklar (Schwelle, Verpact) | Besluit beheer verpakkingen 2014 (NL 13) | nein | 13 |
| Angaben im Fernabsatz: Hersteller, verantwortliche Person, Warnhinweise | EU | ja | Art. 19 VO (EU) 2023/988 (EU 10); DE 16; NL 14 | nein (Hersteller wird nicht angezeigt) | 13; OP-29 |
| Gefahrstoffhinweise bei Öl im Fernabsatz | EU | ja (alte Fassung; neue Regeln ab 01.01.2028) | Art. 48 CLP-VO (EU 22, teils nicht abgerufen) | nein | 13 |
| Genehmigungszeichen bei Bremsteilen | EU | ja | UNECE-R90 (EU 22, nicht abgerufen) | nein | 13 |

### 3.10 Werkstatt-Partner, Terminbuchung, Newsletter

| Thema | Land / Rolle | Gilt | Rechtsgrundlage (Fundstelle) | Heute | Entwurf |
|---|---|---|---|---|---|
| Bedingungen für Partnerwerkstätten | beide, B2B | ja | Vertragsrecht; EU 16 | nein | 14 |
| Weitergabe von Kundendaten an die Werkstatt | EU | ja | Art. 6, 13 DSGVO (EU 1) | teilweise (Einwilligungssatz am Formular) | 02, 15, 16 |
| Terminvermittlung gegenüber Verbrauchern, Absage, Nichterscheinen | DE, NL | ja; keine Leitlinie zu Ausfallgebühren gefunden | NL 19; Verbraucherrecht allgemein | nein | 15; OP-33 |
| E-Mail-Werbung nur mit Einwilligung, Ausnahme Bestandskunden | DE | ja | § 7 Abs. 2 Nr. 2, Abs. 3 UWG (DE 10) | nein | 16 |
| E-Mail-Werbung | NL | ja (auch gegenüber Unternehmen) | art. 11.7 Telecommunicatiewet (NL 9) | nein | 16 |
| Nachweis der Einwilligung (Double-Opt-in) | beide | ja | Art. 7 Abs. 1 DSGVO (EU 1); Rechtsprechung nicht im Original abgerufen (DE 10) | nein | 16 |

## 4. Änderungsübersicht

Jeder Entwurf trägt am Ende seiner deutschen Fassung eine eigene Tabelle „bisher → neu → Grund“. Zusammenfassung:

| Nr. | Dokument | Wesentliche Änderung gegenüber dem bisherigen Text |
|---|---|---|
| 01 | Impressum | Zwei vollständige Fassungen (Eenmanszaak / B.V.); Geltung für Agenturseite und Shop; Streitbeilegungshinweis; Verweis auf KI-Hinweise |
| 02 | Datenschutz | Aus zwei Hinweisabsätzen wird eine vollständige Erklärung nach Art. 13/14 DSGVO für Website, Chat, Konten, Shop, Werkstatt, Newsletter, Fehlerdiagnose; Empfänger- und Drittlandtabelle; Länderabschnitte |
| 03 | Cookies | Tatsächliche Liste aller Cookies und Speichereinträge mit Zweck und Dauer; richtige Beschreibung der Einstellungen |
| 04 | AGB B2B | Allgemeiner Teil neu gegliedert und um fehlende Regeln ergänzt; Besondere Bedingungen für Projekte, Suite, API/Prepaid, BYOK, Care, KI; Preise unverändert; harte Fristen als Wahl zwischen bisheriger und entschärfter Fassung; Zinsen und Gericht berichtigt |
| 05 | AVV | Alle Pflichtinhalte nach Art. 28 Abs. 3 DSGVO; Anlagen für Verarbeitungen, Maßnahmen und Unterauftragsverarbeiter; Liste an das Lösungsregister angeglichen |
| 06 | Widerruf Agentur | Klarstellung B2B; Verweis auf den Shop; gesetzliche Belehrung statt frei formulierter |
| 07 | Vertragsgrundlagen | Übersicht „welche Bedingungen gelten wofür“ mit Rangfolge |
| 08 | KI-Hinweise | Berichtigung „ohne Live-KI-Modell“; Art. 50 KI-VO; Kennzeichnung im Footer, im Chat und an Medien; Grenzen und Meldeweg |
| 09 | Barrierefreiheit | Rechtsrahmen, ehrlicher Prüfstand, Feedback- und Durchsetzungsweg |
| 10 | TEILEKLAR Rechtliches | Verkäuferangaben, Lieferländer, Liste der geltenden Dokumente; der Satz „keine geltenden Kaufbedingungen“ entfällt mit Freigabe |
| 11 | TEILEKLAR AGB | Vertragsschluss passend zur Kasse; Mängelrechte je Land; keine Schweiz; Streitbeilegung; verbrauchertaugliche Haftung und Rechtswahl |
| 12 | TEILEKLAR Widerruf | Gesetzliches Muster je Land mit dem Baustein zur elektronischen Widerrufsfunktion; unpassende Ausnahmen gestrichen; Rücksendekosten als Entscheidung |
| 13 | Versand, Zahlung, Umwelt | neu: Versand, Zahlung, Batterien, Altöl, Verpackung, Produktsicherheit |
| 14 | Werkstatt-Partner | neu |
| 15 | Terminbuchung | neu |
| 16 | Einwilligungstexte | neu: Newsletter, Formulare, Fehlerdiagnose, Kasse, Footer-Kennzeichnung |

## 5. Offene Punkte für den Inhaber

Die Liste wird nach Eingang aller Entwürfe abgeschlossen (siehe unten, Teile A bis C).

OFFENE-PUNKTE-PLATZHALTER

## 6. Stellen für die anwaltliche Prüfung

ANWALT-PLATZHALTER

## 7. Einbau: warum heute nicht, und wie als nächster Schritt

EINBAU-PLATZHALTER

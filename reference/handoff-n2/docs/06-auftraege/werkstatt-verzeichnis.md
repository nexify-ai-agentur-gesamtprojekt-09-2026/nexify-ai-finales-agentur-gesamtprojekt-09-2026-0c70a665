# Auftrag: Werkstatt-Verzeichnis D/A/CH + Benelux beschaffen und aufbereiten

**Auftraggeber:** TEILEKLAR (Projekt Werkstattvermittlung)
**Ziel:** Ein geprüftes, importfähiges Verzeichnis freier und markengebundener Kfz-Werkstätten in DE, AT, CH, NL, BE und LU — als **eine** Download-Datei (ZIP mit CSV + Belegdatei).
**Stand:** 31.08.2026

---

## 1. Auftragsumfang

| Markt | Zielmenge Stufe 1 | Priorität | Regionale Abdeckung |
|---|---|---|---|
| Deutschland | 4.000 | 1 | alle Bundesländer, Schwerpunkt Städte > 100.000 Einwohner |
| Österreich | 800 | 2 | Wien, Linz, Graz, Salzburg, Innsbruck + Landbezirke |
| Niederlande | 900 | 3 | Randstad zuerst, dann Provinzen |
| Belgien | 700 | 4 | getrennt nach NL-/FR-sprachigem Gebiet |
| Schweiz | 600 | 5 | Zürich, Bern, Basel, St. Gallen, Genf, Lausanne |
| Luxemburg | 120 | 6 | landesweit |

Stufe 1 = Grunddaten (Abschnitt 3, Pflichtfelder). Stufe 2 = Anreicherung (Abschnitt 4) nur für Datensätze, die Stufe 1 vollständig bestanden haben.

**In Scope:** freie Werkstätten, Werkstattketten, markengebundene Betriebe mit Servicegeschäft, Spezialisten (Bremsen, Elektrik, Klima, Reifen), Prüforganisationen nur als Zusatzinfo.
**Out of Scope:** Autohäuser ohne Werkstatt, Waschanlagen, Teilehändler, Abschleppdienste, Autoverwertung, mobile Anbieter ohne feste Adresse.

## 2. Arbeitsweise (verbindliche Reihenfolge)

1. **Quellenraster je Land aufbauen** (Abschnitt 5). Mindestens **drei unabhängige Quellen** je Markt, davon mindestens eine amtliche oder verbandsnahe.
2. **Rasterhafte Suche statt Zufallsstichprobe:** je Land nach Postleitzahlgebiet bzw. Gemeinde durchgehen (DE: 2-stellige PLZ-Zonen, NL: 4-stellige Zone, CH: Kanton, AT: Bezirk, BE: Postcode, LU: Kanton). Suchbegriffe je Sprache:
   - de: „Kfz-Werkstatt", „Autowerkstatt", „Meisterwerkstatt", „Bremsendienst", „Kfz-Meisterbetrieb"
   - nl: „autogarage", „autobedrijf", „APK garage", „remmen specialist"
   - fr: „garage automobile", „réparation automobile", „garage freins", „contrôle technique partenaire"
3. **Rohdatensatz anlegen** — eine Zeile je gefundener Betrieb, mit Quelle und Abrufdatum, noch ohne Bereinigung.
4. **Dublettenerkennung** (Abschnitt 6) und Zusammenführung mehrerer Quellen zu einem Datensatz.
5. **Lückenschluss durch Kreuzrecherche** (Abschnitt 7) — fehlende Felder aus weiteren Quellen ergänzen, jede Ergänzung mit eigener Quellenangabe.
6. **Plausibilitätsprüfung** (Abschnitt 8) — technische und logische Validierung.
7. **Bewertung und Klassifizierung** (Abschnitt 9) — Vollständigkeit, Vertrauensgrad, Ansprechpriorität.
8. **Export** (Abschnitt 10) plus Belegdatei mit Methodik und Quellenprotokoll.

Grundregel: **Kein Feld wird geraten.** Unbekannt bleibt leer und wird im Feld `luecken` benannt. Eine begründete Ableitung ist erlaubt, muss aber als `abgeleitet` markiert und mit Begründung versehen werden.

## 3. Pflichtfelder (Stufe 1)

| Feld | Format / Regel |
|---|---|
| `id` | `TKW-<Land>-<laufend>`, z. B. TKW-DE-000123 |
| `land` | ISO-Code: DE, AT, CH, NL, BE, LU |
| `sprache_betrieb` | de / nl / fr (bei BE/LU ggf. mehrere, komma-getrennt) |
| `firmenname` | wie im Handelsregister bzw. auf der eigenen Website, ohne Werbezusätze |
| `rechtsform` | GmbH, e.K., BV, SPRL/BVBA, AG, Sàrl … (leer wenn unbekannt) |
| `strasse`, `hausnummer` | getrennt |
| `plz`, `ort` | landesspezifisches Format, PLZ als Text (führende Nullen erhalten) |
| `region` | Bundesland / Provinz / Kanton / Gewest |
| `lat`, `lon` | Dezimalgrad, 6 Stellen, WGS84 |
| `telefon` | E.164, z. B. +4940123456 |
| `email` | nur betriebliche Adresse; keine Privatadressen |
| `website` | vollständige URL mit Schema |
| `betriebsart` | frei / markengebunden / Kette / Spezialist |
| `quelle_primaer` | URL der Hauptquelle |
| `quelle_weitere` | weitere URLs, pipe-getrennt |
| `abrufdatum` | ISO 8601 |
| `datenstand_quelle` | falls die Quelle selbst ein Stand-Datum nennt |

## 4. Anreicherungsfelder (Stufe 2)

| Feld | Zweck für TEILEKLAR |
|---|---|
| `leistungen` | Bremsen, Öl-/Inspektionsservice, Elektrik, Klima, Reifen, Achsvermessung, HU/AU-Vorbereitung — normiert auf feste Werteliste |
| `marken_schwerpunkt` | VW/Audi/Skoda/Seat, Opel, Ford, Stellantis, Asiaten, Sonstige |
| `annahme_kundenteile` | ja / nein / unbekannt — **wichtigstes Feld für unser Modell** (Einbau von kundenseitig gekauften Teilen) |
| `stundenverrechnungssatz` | Betrag + Währung + Quelle, nur wenn öffentlich genannt |
| `oeffnungszeiten` | strukturiert je Wochentag (`Mo 08:00-17:30`), pipe-getrennt |
| `terminbuchung` | Telefon / Formular / Online-Kalender / E-Mail |
| `bewertung_schnitt`, `bewertung_anzahl`, `bewertung_quelle` | nur mit Plattformnennung, kein Mischwert aus mehreren Plattformen |
| `mitarbeiterzahl_klasse` | 1–3 / 4–10 / 11–25 / > 25 |
| `hebebuehnen_klasse` | falls ermittelbar |
| `zertifikate` | Meisterbetrieb, ZDK, ATU-/Bosch-Service-Partner, Innungsmitglied, ISO |
| `pruefstelle_partner` | TÜV/DEKRA/GTÜ (DE), §57a (AT), MFK (CH), APK (NL), Autokeuring/Contrôle technique (BE/LU) |
| `sprachen_service` | Sprachen der Kundenkommunikation |
| `barrierefrei_hinweis` | falls angegeben |
| `flotten_gewerbe` | bedient Gewerbekunden ja/nein |
| `letzte_aktivitaet` | Datum des letzten erkennbaren Lebenszeichens (Website-Update, Bewertung, Post) |

## 5. Quellenraster je Land

**Immer zuerst: die eigene Website des Betriebs** (Impressum/Colofon/Mentions légales) — sie ist die belastbarste Quelle für Name, Adresse, Rechtsform, Kontakt.

| Land | Verzeichnisse / Karten | Amtlich / verbandsnah | Zusatz |
|---|---|---|---|
| DE | Gelbe Seiten, Das Telefonbuch, Google Maps/Places, Bing Places, Werkstattportale (z. B. Ketten-Standortfinder) | Handelsregister/Unternehmensregister, Handwerkskammer-Verzeichnisse, Kfz-Innungen, ZDK | HU-Partnerlisten der Prüforganisationen |
| AT | Herold, Google Maps, firmenabc | Firmenbuch, WKO-Firmen A–Z (Fachverband Fahrzeugtechnik) | §57a-Begutachtungsstellen-Listen |
| CH | local.ch, search.ch, Google Maps | Zefix (Handelsregister), AGVS/UPSA-Mitgliederverzeichnis | MFK-/Prüfstellen der Kantone |
| NL | Telefoonboek/DeTelefoongids, Google Maps, autobedrijf-portalen | KVK Handelsregister, BOVAG-Ledenlijst | RDW APK-erkende bedrijven (amtlich, sehr wertvoll) |
| BE | Gouden Gids/Pages d'Or, Google Maps | KBO/BCE Unternehmensdatenbank, Federauto/Traxio | Autokeuring-Stationen als Umfeldinfo |
| LU | Editus, Google Maps | RCS Luxembourg, Fédération des Garagistes | SNCT-Umfeld |

Regeln: Nutzungsbedingungen und Robots jeder Quelle prüfen und im Protokoll festhalten; Plattform-Inhalte (Bewertungen, Fotos, Beschreibungstexte) **nicht** übernehmen — nur Faktenfelder plus Kennzahl mit Plattformnennung. Wo eine API oder ein amtlicher Datensatz existiert, hat dieser Vorrang vor Abruf von Webseiten.

## 6. Dublettenerkennung und Zusammenführung

**Schlüsselkandidaten in dieser Reihenfolge:**
1. Handelsregister-/KVK-/KBO-/Zefix-Nummer (stärkster Schlüssel)
2. Telefonnummer in E.164
3. Domain der Website (ohne www, ohne Pfad)
4. Normalisierte Adresse + Umkreis 75 m (Geo-Abgleich)
5. Fuzzy-Vergleich des Firmennamens (Levenshtein ≥ 0,9 nach Normalisierung: Kleinschreibung, Rechtsform entfernt, „Kfz/Auto/Garage" als Stoppwörter)

**Zusammenführungsregeln:**
- Feldweise Priorität: eigene Website > amtliches Register > Verband > Verzeichnis > Karten-Dienst.
- Widersprüche werden **nicht** stillschweigend gemittelt: der bestpriorisierte Wert gewinnt, der abweichende Wert wandert nach `konflikt_feld` und `konflikt_wert`.
- Filialen einer Kette bleiben getrennte Datensätze, verknüpft über `kette_id`.
- Umgezogene Betriebe: alte Adresse in `historie` vermerken, nicht als zweiter Datensatz führen.

## 7. Lückenschluss — erlaubte Ableitungen

| Fehlendes Feld | Zulässige Ableitung | Kennzeichnung |
|---|---|---|
| `region` | aus PLZ/Ort über amtliche Gebietszuordnung | abgeleitet, sicher |
| `lat`/`lon` | Geokodierung der validierten Adresse | abgeleitet, sicher |
| `sprache_betrieb` | aus Gemeinde (BE: Sprachgebiet; LU: FR/DE) | abgeleitet, sicher |
| `betriebsart` | aus Firmenname/Markenlogo-Nennung im Impressum | abgeleitet, prüfen |
| `leistungen` | aus Leistungsseite der eigenen Website, normiert | abgeleitet, prüfen |
| `annahme_kundenteile` | nur wenn ausdrücklich genannt; sonst leer | niemals raten |
| `stundenverrechnungssatz` | nur wenn öffentlich genannt | niemals schätzen |
| `oeffnungszeiten` | aus eigener Website; Karten-Dienst nur als Zweitquelle | abgeleitet, prüfen |
| `letzte_aktivitaet` | jüngstes Datum aus Website-Änderung, Bewertung, Social Post | abgeleitet, prüfen |

Jede Ableitung erhält einen Eintrag in `abgeleitete_felder` (Feldname + Methode + Quelle).

## 8. Plausibilitätsprüfung (Ausschluss- und Warnregeln)

**Harte Ausschlüsse** (Datensatz nach `/ausschluss/`):
- Adresse nicht geokodierbar oder außerhalb des Ziellandes
- Telefonnummer formal ungültig oder erkennbar Faxnummer
- Website nicht erreichbar **und** keine zweite Quelle vorhanden
- Betrieb erkennbar geschlossen (Registerlöschung, „dauerhaft geschlossen", Insolvenzvermerk)
- Branche passt nicht (siehe Out of Scope)

**Warnungen** (Datensatz bleibt, `warnung` gesetzt):
- Nur eine Quelle
- Letzte erkennbare Aktivität älter als 24 Monate
- Adresse ist Wohngebiet ohne Gewerbehinweis
- Mehrere Betriebe mit identischer Telefonnummer
- Bewertungsanzahl unter 5 (nicht aussagekräftig)

**Stichprobe:** 2 % je Land manuell gegenprüfen (Anruf oder Website-Sichtprüfung) und Ergebnis in der Belegdatei dokumentieren.

## 9. Bewertung und Priorisierung

`vollstaendigkeit` = Anteil gefüllter Pflicht- und Anreicherungsfelder (0–100).
`vertrauensgrad` = A (amtlich + eigene Website bestätigt), B (zwei unabhängige Quellen), C (eine Quelle), D (nur Karten-Dienst).
`ansprechprioritaet` = 1–3, berechnet aus: Annahme von Kundenteilen (stärkster Faktor), Leistungsschwerpunkt Bremsen/Elektrik/Wartung, Erreichbarkeit per Formular oder Kalender, Region mit hoher Nachfrage, Aktivität in den letzten 12 Monaten.

## 10. Lieferformat — eine Datei

`teileklar-werkstaetten.zip`

```
werkstaetten.csv            alle Datensätze, UTF-8 mit BOM, Semikolon, RFC-4180-Quoting
werkstaetten_ausschluss.csv aussortierte Datensätze mit Ausschlussgrund
quellenprotokoll.csv        je Quelle: URL, Typ, Nutzungsbedingung, Abrufdatum, Trefferzahl
METHODIK.md                 Vorgehen, Suchraster, Ableitungsregeln, Stichprobenergebnis, offene Punkte
```

**Spaltenreihenfolge in `werkstaetten.csv`:**

`id;land;sprache_betrieb;firmenname;rechtsform;register_nr;strasse;hausnummer;plz;ort;region;lat;lon;telefon;email;website;betriebsart;kette_id;leistungen;marken_schwerpunkt;annahme_kundenteile;stundenverrechnungssatz;waehrung;oeffnungszeiten;terminbuchung;bewertung_schnitt;bewertung_anzahl;bewertung_quelle;mitarbeiterzahl_klasse;zertifikate;pruefstelle_partner;sprachen_service;flotten_gewerbe;letzte_aktivitaet;quelle_primaer;quelle_weitere;abrufdatum;datenstand_quelle;abgeleitete_felder;konflikt_feld;konflikt_wert;luecken;warnung;vollstaendigkeit;vertrauensgrad;ansprechprioritaet`

Formatregeln: Datumsangaben ISO 8601; Dezimaltrennzeichen Punkt; Mehrfachwerte pipe-getrennt (`|`); keine Zeilenumbrüche in Feldern; leere Felder wirklich leer (nicht „n/a"); Kopfzeile genau wie oben.

## 11. Recht und Datenschutz (verbindlich)

- Nur **betriebliche** Kontaktdaten. Namen einzelner Mitarbeiter, private Mobilnummern oder Privatadressen werden nicht erfasst; Inhabername nur, wenn er Teil der Firmierung ist.
- Nutzungsbedingungen jeder Quelle einhalten; keine Umgehung technischer Schutzmaßnahmen; API vor Seitenabruf.
- Keine Übernahme fremder Texte, Fotos oder Bewertungsinhalte — nur Faktenfelder und aggregierte Kennzahlen mit Plattformnennung.
- Zweckbindung dokumentieren (Aufbau eines Werkstattnetzes für Teilevermittlung), Rechtsgrundlage der Ansprache je Land beachten (B2B-Ansprache: DE/AT/CH strenger als vielfach angenommen — Formular- und Telefonkontakt bevorzugen).
- Löschkonzept: Datensätze ohne Reaktion nach zwei Ansprachen werden nach 12 Monaten entfernt; Widerspruch wird sofort umgesetzt und in `sperrliste.csv` geführt.

## 12. Abnahmekriterien

1. Zielmengen je Land erreicht oder Unterschreitung mit Begründung dokumentiert.
2. Mindestens 70 % der Datensätze mit Vertrauensgrad A oder B.
3. Pflichtfelder zu 100 % gefüllt oder in `luecken` ausgewiesen; kein geratener Wert.
4. Dublettenquote nach Zusammenführung unter 1 % (Prüfung über Telefonnummer und Geo-Cluster).
5. `annahme_kundenteile` bei mindestens 30 % der Datensätze belegt gefüllt.
6. Quellenprotokoll vollständig, jede Quelle mit Nutzungsbedingung.
7. Stichprobe 2 % je Land durchgeführt und dokumentiert.
8. CSV lädt ohne Fehler in einen Standard-Import (Kopfzeile, Trennzeichen, Quoting geprüft).

## 13. Ergänzungen, die wir zusätzlich brauchen (proaktiv)

- **Regionale Abdeckungskarte** je Land: Trefferdichte pro PLZ-Zone, damit weiße Flecken sichtbar werden (als `abdeckung.csv`: Land, PLZ-Zone, Betriebe, Einwohner, Betriebe je 10.000 Einwohner).
- **Kettenübersicht** (`ketten.csv`): Kettenname, Land, Filialanzahl, zentrale Ansprechstelle — Ketten sind mit einem Vertrag statt hundert erreichbar.
- **Nachfrageabgleich**: je Region grobe Fahrzeugbestandszahl (amtliche Statistik) neben der Werkstattdichte, um Regionen mit Unterversorgung zu erkennen.
- **Priorisierte Ansprechliste** (`erstansprache.csv`): Top 200 je Land nach `ansprechprioritaet`, mit vorgeschlagenem Kanal und Sprache.
- **Aktualisierungsplan**: Vorschlag für einen Nachlauf (Delta-Prüfung) je Quartal mit Aufwandsschätzung.
- **Feldabdeckungsbericht** in METHODIK.md: je Feld Füllquote, damit sichtbar ist, wo Nacharbeit lohnt.

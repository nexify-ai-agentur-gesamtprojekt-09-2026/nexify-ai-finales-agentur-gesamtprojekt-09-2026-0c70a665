# TEILEKLAR — Betriebslogik, Prozesse und Statusautomaten

**Dokument-ID:** OPS-DESIGN-001
**Stand:** 31.08.2026
**Bezug:** DK-001 (Gesamtkonzept), DESIGN-001 (Design- und Lösungsdokumentation)
**Zweck:** Die im Shop sichtbaren Zustände auf betriebliche Regeln zurückführen — wer entscheidet, woraus, mit welchem Ergebnis und welcher Frist. Alles hier Beschriebene ist abgeleitete Zielbetriebslogik, kein laufender Betrieb.

---

## 1. Grundsatz der Betriebslogik

Die Oberfläche darf nur zeigen, was ihr Status erlaubt. Jeder sichtbare Zustand ist damit die Ausgabe einer betrieblichen Entscheidung — nicht eine Formulierung. Vier Regeln gelten übergreifend:

1. **Datenlage bestimmt Sichtbarkeit.** Fehlt ein Merkmal, wird nicht geschätzt, sondern der Status herabgesetzt.
2. **Jede Aussage hat einen Owner.** Ohne benannten Verantwortlichen darf keine Aussage prominent erscheinen.
3. **Jede Sperre hat einen Ausweg.** Ein Stop nennt immer die fehlende Angabe und den nächsten Schritt.
4. **Jede Änderung ist nachvollziehbar.** Statuswechsel werden mit Zeit, Auslöser und Quelle protokolliert.

---

## 2. Produktstatus-Automat

Zustände: `draft` → `verified` / `conditional` → `blocked` → `retired`.

| Von | Nach | Auslöser | Prüfende Rolle | Sichtbarkeit im Shop |
|---|---|---|---|---|
| draft | verified | Fitment-Datensatz vollständig, Maße und Achse geprüft, Quelle mit Stand vorhanden | Katalog & Fitment | Chip „Passung belegt", Kauf frei |
| draft | conditional | Ein Merkmal offen (z. B. Motorcode, Einbaumaß, Ausstattungsabhängigkeit) | Katalog & Fitment | Chip „Prüfung erforderlich", Kauf mit Klärhinweis |
| verified | conditional | Katalogimport ändert ein passungsrelevantes Merkmal | automatisiert + Sichtprüfung | Chip wechselt, Nachweis-Text nennt das offene Merkmal |
| verified/conditional | blocked | Sicherheitsmeldung, Rückruf, Rechtsproblem, Lieferantensperre | Quality / Security & Privacy | Artikel nicht kaufbar, Hinweis mit Grund |
| blocked | verified | Ursache behoben, CAPA dokumentiert | Quality + Katalog | Rückkehr in den Verkauf mit neuem Stand |
| beliebig | retired | Auslauf, Nachfolger vorhanden | Katalog | Artikel unsichtbar, URL bleibt mit Nachfolgerverweis |

**Ohne Fahrzeugkontext** wird jeder Status neutralisiert: Anzeige „Passung unbestätigt" (grau). Das ist kein Datenzustand, sondern ein Kontextzustand — er entsteht in der Sitzung, nicht im Katalog.

---

## 3. Fahrzeug- und Passungslogik

**Eingang:** HSN/TSN, Modell + Motor oder Fahrgestellnummer.
**Ableitung:** Fahrzeugvariante → Bauzeitraum → passungsrelevante Merkmale (Maß, Achse, Ausführung, Ausstattung).
**Ausgabe:** Status + Begründung + Quelle + Stand.

Regeln:
- Ein Artikelname ist niemals ein Passungsnachweis.
- Mehrdeutigkeit (zwei Motorvarianten im gleichen Baujahr) führt zwingend zu `conditional`, nie zu einer Auswahl „auf Verdacht".
- Sicherheitsrelevante Teile (Bremse, Fahrwerk, Airbag, Reifen) erfordern zusätzlich die Compliance-Karte; fehlt sie, gilt `blocked`.
- Kontextverlust (Fahrzeug entfernt) darf keine gespeicherte Passungsaussage in einen Kauf überführen.

---

## 4. Zubehör- und Abhängigkeitslogik (Kern der Beratung)

Jeder Artikel trägt eine Liste abhängiger Positionen mit drei Feldern: **Notwendigkeit**, **Begründung**, **Auslösebedingung**.

| Auslöser | Abhängige Position | Notwendigkeit | Begründung im UI |
|---|---|---|---|
| Bremsscheibe vorn | Bremsbeläge vorn | notwendig | Alter Belag trägt neue Scheibe ungleich ab |
| Bremsscheibe (jede) | Halte-/Führungsschrauben | notwendig | Einwegteile mit Drehwinkelanzug |
| Bremsscheibe vorn | Verschleiß-Sensor | bedingt (Ausstattung) | Nur bei vorhandener Verschleißanzeige |
| Starterbatterie | Bodenleiste / Halter | notwendig | Fahrzeugseitiges Bauteil, liegt keiner Batterie bei |
| Starterbatterie | Polklemmen | bedingt (Zustand) | Nur bei angefressenen Klemmen |
| Starterbatterie AGM / Kapazitätswechsel | Codierung Energiemanagement | bedingt (Fahrzeug) | Sonst falsches Ladeverhalten |
| Motoröl | Ölfilter mit Dichtring | notwendig | Wechsel ohne Filter ist unvollständig |
| Motoröl | Ablassschraube/Dichtung | bedingt (Historie) | Nach mehrfacher Verwendung undicht |

Betriebsregel: Eine notwendige Abhängigkeit darf **nie** stillschweigend im Hauptartikel unterstellt werden. Sie erscheint als eigene Position mit Preis und Begründung — im Berater, auf der Produktseite und im Warenkorb.

---

## 5. Beratungslogik (Berater „KLARA")

**Ablaufkette:** Kontext → Bedarf → Prüfung → Abhängigkeiten → Entscheidung → Abwicklung.

1. **Kontext:** Fahrzeug vorhanden? Wenn nein, zuerst setzen. Ohne Kontext keine Passungsaussage.
2. **Bedarf:** entweder Nummer (OE/EAN/SKU), Teilebegriff oder Symptom. Symptom löst genau eine Rückfrage aus, die ein Meister auch stellen würde.
3. **Prüfung:** Status des Kandidaten, offene Merkmale, Varianten-Unterscheidung mit erkennbarem Merkmal.
4. **Abhängigkeiten:** notwendige und optionale Positionen mit Begründung.
5. **Entscheidung:** Einzelposition, Bündel „alles Notwendige" oder Alternative.
6. **Abwicklung:** Übersicht → Zahlart → Konto oder Gast → Abschluss.

**Eskalations- und Ehrlichkeitsregeln:**
- Nicht zuordenbare Eingabe → offen benennen, drei Einstiege anbieten, nicht raten.
- Status `conditional` → kein Kaufdruck, sondern die fehlende Angabe erklären.
- Sicherheitsthema ohne Datenlage → Weiterleitung an Serviceteam bzw. Werkstatt.
- Preis-, Versand- und Rückgabeaussagen nur als geplante Konditionen mit Kennzeichnung.

---

## 6. Bestell- und Auftragsprozess

**Bestellstatus:** `entwurf` → `bestätigt` → `in Kommissionierung` → `versandt` (Teilsendung möglich) → `zugestellt` → `abgeschlossen`; Nebenzweige `storniert`, `retourniert`, `reklamiert`.

Regeln:
- Teilsendungen werden vor dem Kauf angekündigt, nicht nachträglich erklärt.
- Lieferfenster wird mit Zeitstempel und Quelle geführt; bei Ablauf erfolgt Neuberechnung oder Stop, keine stillschweigende Verlängerung.
- Reklamation zu einem sicherheitsrelevanten Teil erzeugt automatisch eine Prüfaufgabe im Katalog (Rückkopplung in den Produktstatus).
- Retourengrund ist Pflichtfeld und speist die Fitment-Qualität (Kennzahl „First-time-right").

## 7. Werkstattprozess

**Leadstatus:** `Anfrage` → `Angebot` → `Termin bestätigt` → `Arbeit ausgeführt` → `abgerechnet` → `bewertet`.

Übergabepaket an die Werkstatt: Fahrzeugvariante, Passungsstatus mit Quelle, Artikelnummern, Zubehörliste, Einbauhinweise, gewünschter Zeitraum, Kontaktweg. Werkstatt und Kunde sehen denselben Stand; Änderungen sind für beide Seiten protokolliert. Partneraufnahme erfordert Nachweis von Betriebshaftpflicht, Qualifikation und Reaktionszeit.

---

## 8. Wissens- und Redaktionsprozess

`Entwurf` → `Fachprüfung` → `veröffentlicht` → `Review fällig` → `überarbeitet` / `zurückgezogen`.

- Jeder Ratgeber trägt Thema, Verantwortliche, Stand, Lesezeit und Reviewintervall (halbjährlich).
- Sicherheitsrelevante Anleitungen enthalten Anzugsmomente, Reihenfolgen und Ausschlüsse.
- Widerspricht ein Ratgeber einem Katalogdatensatz, gilt der Katalog; der Ratgeber geht in `Review fällig`.
- Kundenfragen aus dem Berater, die dreimal ohne Antwort bleiben, erzeugen einen Redaktionsauftrag.

---

## 9. Rollen, Verantwortung, Fristen (Zielbild)

| Rolle | Entscheidet über | Reaktionsziel |
|---|---|---|
| Katalog & Fitment | Produktstatus, Fitment, Maße, Sperren | Passungsmeldung < 1 Werktag |
| Supplier & Order | Bestände, Preise, Bestellwege, Lieferfenster | Feed-/Orderfehler < 4 Stunden |
| Support & Returns | Reklamation, Retoure, Kulanz | Kundenantwort < 1 Werktag |
| Knowledge & Claims | Ratgeber, Aussagen, Werbeversprechen | Freigabe < 3 Werktage |
| Partner & CRM | Werkstattaufnahme, Leadqualität | Leadbearbeitung < 1 Werktag |
| Quality | CAPA, Rückruf, Sperrentscheidung | Sicherheitsmeldung sofort |
| Security & Privacy | Zugriffe, Consent, Vorfälle | Vorfall sofort, Meldung nach Frist |

Jede Rolle hat eine benannte Stellvertretung. Ohne besetzte Stellvertretung darf die zugehörige Statusänderung nicht automatisiert erfolgen.

---

## 10. Tagesroutinen und Kontrollpunkte

**Täglich:** Katalogimport-Report, Feed-Fehlerliste, offene Bestellungen ohne Statuswechsel, überschrittene Lieferfenster, Sicherheitsmeldungen, Berater-Gespräche mit „nicht zuordenbar".
**Wöchentlich:** Retourengründe, Passungsfehler nach Kategorie, Suchanfragen ohne Treffer, Warenkorbabbrüche nach Statusart.
**Monatlich:** Quellenaktualität, Reviewfälligkeiten, Claims, Preis- und Margenprüfung je Kanal, Partnerqualität, Rechteprüfung für Marken- und Bildmaterial.

Abbruchkriterien: Ein Signal, das Sicherheit, Recht oder Datenqualität betrifft, kann SKU, Kategorie, Kanal oder den gesamten Bestellfluss stoppen. Die Entscheidung liegt bei Quality bzw. Security & Privacy und wird protokolliert.

---

## 11. Kennzahlen mit Definition

| Kennzahl | Definition | Zweck |
|---|---|---|
| First-time-right | Anteil Bestellungen ohne passungsbedingte Retoure | Qualität der Fitment-Daten |
| Fitment coverage | Anteil Artikel mit vollständigem Fitment-Datensatz | Katalogreife |
| Evidence freshness | Anteil Aussagen innerhalb des Reviewintervalls | Vertrauenswürdigkeit |
| Lieferfenster-Treue | Anteil Sendungen im zugesagten Fenster | Versprechensqualität |
| Klärquote | Anteil `conditional`-Fälle, die zur belegten Passung geführt werden | Wirksamkeit des Klärwegs |
| Beratungsabschluss | Anteil Beratungen mit Entscheidung (Kauf oder bewusste Ablehnung) | Nutzen des Beraters |
| Lead-to-appointment | Anteil Werkstattanfragen mit bestätigtem Termin | Partnerprozess |
| DB je SKU/Kanal | Preis − Einkauf − Handling − Versand − Gebühren − Retouren − Support − Marketing | Wirtschaftlichkeit |

Keine dieser Kennzahlen wird veröffentlicht, bevor eine reale Messung über einen definierten Zeitraum vorliegt.

---

## 12. Sichtbare Zustände je Screen (Zustandskatalog)

| Screen | Erfolg | Leer | Unklar | Gesperrt | Fehler |
|---|---|---|---|---|---|
| Startseite | Treffer mit Status | keine Treffer für Fahrzeug | Fahrzeug fehlt → „unbestätigt" | Artikel ausgeblendet | Katalog nicht erreichbar → Hinweis statt leerer Fläche |
| Teilesuche | Trefferliste | Filterkombination leer (umgesetzt) | Status gemischt | gesperrte Artikel fehlen mit Hinweis | Filter nicht anwendbar |
| Produktseite | vollständige Daten | — | offenes Merkmal benannt | Kauf deaktiviert mit Grund | Datenstand veraltet → Warnung |
| Berater | Entscheidung erreicht | keine Eingabe | Eingabe nicht zuordenbar (umgesetzt) | Sicherheitsstop | Verbindungsverlust |
| Warenkorb | Positionen mit Summe | leer (umgesetzt) | Position mit offener Prüfung | gesperrte Position blockiert Kauf | Preisänderung seit Vormerkung |
| Werkstatt | Partner mit Terminen | kein Partner in Reichweite | Terminlage unklar | Partner suspendiert | Kartendienst nicht verfügbar |
| Kontakt | Anfrage aufgenommen | — | Anliegen unklar → Rückfrage | — | Versand fehlgeschlagen |

---

## 13. Datenschutz- und Rechtelogik

- Fahrzeugkontext ist zunächst sitzungsgebunden; dauerhafte Speicherung erst mit Konto und Einwilligung.
- Kein Tracking ohne Einwilligung; Berater-Verläufe werden nur mit Zustimmung dem Konto zugeordnet.
- Marken- und Bildrechte werden je Quelle dokumentiert (Herstellerportal, Nutzungsbedingung, Freigabestatus) — ohne Nachweis kein Einsatz.
- Bewertungen erst mit Kaufnachweis; ohne Verifikation keine Sterne-Auszeichnung und keine Rich Snippets.

---

## 14. Abhängigkeiten zu den Stage Gates

| Gate | Betriebslogik, die vorher stehen muss |
|---|---|
| N1 Supplier | Katalogimport, Feed-Fehlerprozess, Bestellweg, Statusrückmeldung |
| N2 Product/Data | Produktstatus-Automat, Fitment-Regeln, Compliance-Karten, Sperrmechanik |
| N3 UX | Zustandskatalog je Screen, Tastatur/Screenreader/Zoom, Klärwege |
| N4 Commerce | Bestellstatus, Zahlungs- und Versandprozess, Retourenlogik |
| N5 Channels | Feed-Mapping, Preis-/Bestandsaktualität, Rücksende-Sync |
| N6 Operations | Rollen, Fristen, Eskalation, Auditspur, CAPA |
| N7 Pilot | zehn reale End-to-End-Bestellungen mit Nachweisen |

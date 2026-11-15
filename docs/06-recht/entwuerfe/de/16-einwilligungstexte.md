# Einwilligungs- und Hinweistexte (Wortlaute für Formulare, Kasse und Footer)
Status: ENTWURF zur Abnahme · Fassung 1.0-entwurf · Stand 15.11.2026 · Sprache: de
Gilt für: Formulare und Oberflächen der Agenturseite (nexifyai.de) und des Shops TEILEKLAR (künftig teileklar.shop): Newsletter, Kontakt, Werkstattanfrage/Terminwunsch, Fehlerdiagnose, Endgerätespeicher, Kasse, Footer; Unternehmer und Verbraucher; DE, AT, NL, BE, LU
Führende Fassung: de für Nutzer in DE/AT, nl für Nutzer in NL/BE (Vorschlag, `[[OFFEN]]`, siehe Dokument 07); fr/en: Übersetzung, nicht muttersprachlich geprüft
Hinweis: Keine Rechtsberatung. Anwaltliche Prüfung (DE und NL) vor Veröffentlichung empfohlen.

---

## So ist dieses Dokument zu lesen

Jeder Abschnitt enthält zuerst den **Wortlaut**, wie er in der Oberfläche stehen soll (eingerückt), danach kurz die **Einordnung**: Einwilligung oder bloßer Hinweis, Rechtsgrundlage, Bedingungen für den Einsatz. Texte, die einen Zustand beschreiben, den es im Code noch nicht gibt, sind als **Sollzustand** gekennzeichnet und dürfen erst mit der Funktion live gehen. Die niederländischen Wortlaute stehen in `nl/16-einwilligungstexte.md`.

Gemeinsame Regeln für alle Einwilligungen: Kästchen nie vorbelegt; Einwilligung nie mit einer anderen Erklärung (Bestellung, AGB, Anfrage) gekoppelt; Widerruf so einfach wie die Erteilung; Wortlaut wird mit Fassungsnummer gespeichert.

---

## (a) Newsletter-Anmeldung mit Double-Opt-in  — Sollzustand (Schalter derzeit aus)

### a.1 Text am Anmeldeformular

Feld: E-Mail-Adresse (Pflicht). Kein weiteres Pflichtfeld.

> ☐ Ja, ich möchte den Newsletter von `[[NeXify AI | TEILEKLAR]]` per E-Mail erhalten. Er enthält `[[OFFEN: Inhalte, z. B. „Neuigkeiten zu unseren Leistungen und Angeboten“ / „Angebote und Hinweise rund um Kfz-Teile“]]` und erscheint `[[OFFEN: Häufigkeit, z. B. „höchstens zweimal im Monat“]]`.
>
> Die Anmeldung wird erst wirksam, wenn Sie den Link in unserer Bestätigungsmail anklicken. Sie können den Newsletter jederzeit abbestellen – über den Abmeldelink in jeder Ausgabe oder per E-Mail an `[[Kontaktadresse laut Impressum]]`. Informationen zur Verarbeitung Ihrer Daten: Datenschutzerklärung.

Schaltfläche: **Newsletter anmelden**

Meldung nach dem Absenden:

> Fast geschafft: Wir haben Ihnen eine E-Mail geschickt. Bitte klicken Sie auf den Link darin, um Ihre Anmeldung zu bestätigen. Ohne Bestätigung erhalten Sie keinen Newsletter.

### a.2 Bestätigungsmail (Kerntext; ohne Werbung, ohne Bilder, ohne Angebote)

> **Betreff:** Bitte bestätigen Sie Ihre Newsletter-Anmeldung
>
> Guten Tag,
>
> für diese E-Mail-Adresse wurde der Newsletter von `[[NeXify AI | TEILEKLAR]]` angefordert. Bitte bestätigen Sie die Anmeldung:
>
> **[Anmeldung bestätigen]**
>
> Mit der Bestätigung willigen Sie ein, dass wir Ihnen den Newsletter per E-Mail senden (`[[Inhalte und Häufigkeit wie im Formular]]`). Sie können jederzeit über den Abmeldelink in jeder Ausgabe abbestellen.
>
> Sie haben den Newsletter nicht angefordert? Dann müssen Sie nichts tun. Ohne Bestätigung senden wir Ihnen keinen Newsletter und löschen die Anmeldung nach `[[OFFEN: Frist für nie bestätigte Anmeldungen]]`.
>
> Sie möchten an diese Adresse gar keine Anmeldebestätigungen mehr erhalten? **[Diese Adresse sperren]**
>
> `[[Anbieter laut Impressum: Name, Anschrift, E-Mail]]` · Datenschutzerklärung: `[[Link]]`

Meldung nach Klick auf den Bestätigungslink:

> Vielen Dank. Ihre Anmeldung ist bestätigt.

### a.3 Abmeldehinweis in jeder Ausgabe (Fußzeile)

> Sie erhalten diese E-Mail, weil Sie den Newsletter von `[[NeXify AI | TEILEKLAR]]` am `[[Datum der Bestätigung]]` bestellt haben. **[Newsletter abbestellen]** – ein Klick genügt, eine Anmeldung ist nicht nötig.
> `[[Anbieter laut Impressum: Name, Anschrift, E-Mail]]`

Meldung nach der Abmeldung:

> Sie sind abgemeldet. Wir senden Ihnen keinen Newsletter mehr.

### a.4 Einordnung

- **Einwilligung** für E-Mail-Werbung: § 7 Abs. 2 Nr. 2 UWG (gilt auch gegenüber Unternehmern und bei Sitz in NL für Empfänger in Deutschland), art. 11.7 lid 1 Telecommunicatiewet; datenschutzrechtlich Art. 6 Abs. 1 lit. a, Art. 7 DSGVO. Die Bestandskundenausnahme (§ 7 Abs. 3 UWG, art. 11.7 lid 4 Tw) wird nicht genutzt.
- **Double-Opt-in** dient dem Nachweis, dass der Inhaber der Adresse eingewilligt hat. Die Bestätigungsmail bleibt frei von Werbung.
- **Nachweis – was protokolliert wird:** E-Mail-Adresse, Sprache, Quelle der Anmeldung (Formular/Seite), Fassung und SHA-256-Prüfsumme des angezeigten Einwilligungswortlauts, Zeitpunkte von Anmeldung, Bestätigung und Abmeldung. **Nicht** protokolliert werden IP-Adresse und Browserkennung. Nie bestätigte Anmeldungen werden gelöscht. Die Sperrliste enthält nur die SHA-256-Prüfsumme der Adresse.
- **Abmeldung:** Link in jeder Ausgabe, zusätzlich Ein-Klick-Abmeldung über die Kopfzeile der E-Mail (RFC 8058); jede Ausgabe nennt den tatsächlichen Absender und eine gültige Adresse (art. 11.7 lid 7 Tw).
- **Aufbewahrung des Nachweises:** `[[OFFEN: Frist. Anhaltspunkt: Die ACM nennt den Nachweis der Einwilligung „bis 5 Jahre nach Versand“.]]`
- **Alter:** Der Newsletter richtet sich nicht an Personen unter 16 Jahren (art. 5 UAVG).

---

## (b) Kontakt- und Anfrageformular – Hinweis statt Einwilligung

### b.1 Hinweistext unter dem Formular (kein Kästchen)

> Wir verwenden Ihre Angaben (Name, E-Mail-Adresse, Unternehmen, Anliegen), um Ihre Anfrage zu beantworten und – wenn Sie das wünschen – ein Angebot vorzubereiten. Bitte geben Sie keine Passwörter, Zahlungsdaten oder vertraulichen Unterlagen ein. Wie lange wir Anfragen speichern und welche Rechte Sie haben, steht in der Datenschutzerklärung.

Schaltfläche: **Anfrage senden**

Meldung nach dem Absenden:

> Vielen Dank. Ihre Anfrage ist bei uns eingegangen. Diese Bestätigung ist noch kein Angebot und keine Auftragsannahme.

### b.2 Einordnung und Begründung

- **Keine Einwilligung.** Die Verarbeitung ist erforderlich, um auf Anfrage der Person vorvertragliche Schritte zu unternehmen (Art. 6 Abs. 1 lit. b DSGVO), bei allgemeinen Anfragen ohne Vertragsbezug zur Wahrung des berechtigten Interesses an der Beantwortung (Art. 6 Abs. 1 lit. f DSGVO). Eine zusätzlich abgefragte „Einwilligung“ wäre die falsche Grundlage: Sie müsste frei widerruflich sein, obwohl die Anfrage ohne die Daten nicht bearbeitet werden kann, und sie würde die Informationspflicht nach Art. 13 DSGVO nicht ersetzen. Nötig ist deshalb ein **Hinweis** mit Verweis auf die Datenschutzerklärung.
- **Änderung gegenüber heute:** Das Formular hat ein Pflichtfeld „Einwilligung“ (Steckbrief Nr. 7). Vorschlag: Kästchen entfernen, Hinweistext einsetzen.
- **Keine Werbung aus der Anfrage:** Die Adresse aus dem Kontaktformular wird nicht für den Newsletter verwendet. Wer den Newsletter möchte, meldet sich gesondert nach (a) an.

---

## (c) Werkstattanfrage und Terminwunsch – Weitergabe an die gewählte Werkstatt  — Sollzustand (Benachrichtigung der Werkstatt fehlt heute)

### c.1 Text am Formular

> **So läuft Ihre Anfrage:** Wir leiten Ihre Angaben an **`[[Name der gewählten Werkstatt, Ort]]`** weiter, damit die Werkstatt Ihnen antworten kann. Weitergegeben werden: Name, E-Mail-Adresse, Telefonnummer (falls angegeben), Angaben zum Fahrzeug (falls angegeben), Ihr Anliegen `[[beim Terminwunsch zusätzlich: „und Ihr Wunschzeitraum“]]`.
>
> Die Werkstatt ist ein selbständiger Betrieb und für den Umgang mit Ihren Daten selbst verantwortlich. TEILEKLAR ist nicht Vertragspartner der Werkstattleistung; Termin, Umfang und Preis sagt allein die Werkstatt zu. `[[beim Terminwunsch zusätzlich: „Ihr Terminwunsch ist noch kein bestätigter Termin. Antwortet die Werkstatt nicht, ist das keine Zusage.“]]`
>
> ☐ Ich möchte, dass meine Angaben zu diesem Zweck an die genannte Werkstatt weitergegeben werden. (Pflichtfeld)
>
> Informationen zur Verarbeitung Ihrer Daten: Datenschutzerklärung.

Schaltfläche: **Anfrage an die Werkstatt senden** / **Terminwunsch senden**

Meldung nach dem Absenden:

> Ihre Anfrage wurde an `[[Werkstatt]]` weitergeleitet. Sie erhalten eine Bestätigung per E-Mail. Die Werkstatt meldet sich direkt bei Ihnen.

### c.2 Einordnung

- Die Weitergabe an die gewählte Werkstatt ist der Kern dessen, was der Nutzer verlangt. Rechtsgrundlage ist deshalb in erster Linie Art. 6 Abs. 1 lit. b DSGVO (Schritte auf Anfrage der betroffenen Person vor einem Vertrag mit der Werkstatt). Das Kästchen ist eine **ausdrückliche Bestätigung des Auftrags zur Weitergabe**; es macht die Weitergabe transparent und nachweisbar. Ob es zusätzlich als Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO geführt wird, ist offen (siehe „Für die anwaltliche Prüfung“). In beiden Fällen wird die Fassung des Wortlauts gespeichert.
- Nicht weitergegeben wird an andere Werkstätten. Keine Nutzung für Werbung.
- Die Werkstatt ist eigener Verantwortlicher; die Pflichten der Werkstatt regeln die Partnerbedingungen (Dokument 14).
- **Voraussetzung:** Die Werkstatt wird tatsächlich benachrichtigt. Heute geschieht das nicht (Steckbrief Nr. 4); solange darf der Text nicht live gehen.

---

## (d) Fehlerdiagnose (PostHog, EU) – nur nach Einwilligung

### d.1 Text im Dialog „Fehlerdiagnose-Einstellungen“

> **Fehlerberichte senden?**
> Wenn Sie zustimmen, sendet diese Website bei einem technischen Fehler einen Fehlerbericht an unseren Dienstleister PostHog (Server in der EU). Der Bericht enthält `[[OFFEN: Datenfelder bestätigen, z. B. Fehlermeldung, betroffene Seite, Zeitpunkt, Browser- und Gerätetyp]]`. Es gibt keine Aufzeichnung Ihrer Sitzung, und es wird dafür nichts dauerhaft in Ihrem Browser gespeichert.
> Ihre Wahl gilt, bis Sie die Seite neu laden oder schließen. Sie können sie vorher jederzeit hier ändern. Ohne Zustimmung werden keine Fehlerberichte gesendet; die Website funktioniert genauso.
> Mehr dazu: Datenschutzerklärung.

Schaltflächen (gleich gestaltet): **Fehlerberichte erlauben** · **Nicht erlauben**

Link im Footer: **Fehlerdiagnose-Einstellungen**

### d.2 Einordnung

- **Einwilligung:** Art. 6 Abs. 1 lit. a DSGVO für die Übermittlung; soweit dabei Informationen aus dem Endgerät ausgelesen werden, § 25 Abs. 1 TDDDG beziehungsweise art. 11.7a lid 1 Telecommunicatiewet.
- Der Text beschreibt den Ist-Zustand laut Steckbrief Nr. 8: nur Fehlerberichte, nur nach Einwilligung, Host `eu.i.posthog.com`, keine Persistenz, keine Sitzungsaufzeichnung, Wahl gilt bis zum Neuladen.
- Ablehnen muss so leicht sein wie Zustimmen; keine Voreinstellung.

---

## (e) Einwilligung für nicht notwendigen Endgerätespeicher (Banner)  — Sollzustand, derzeit nicht einsetzen

Heute gibt es kein Banner, weil nur notwendige Speicherung stattfindet (Anmeldung, Gast-Warenkorb, Darstellung, Chatfenster). Der folgende Text ist **nur** einzusetzen, sobald erstmals nicht notwendige Speicherung oder Auslesung eingeführt wird (zum Beispiel Reichweitenmessung oder Marketing).

### e.1 Banner-Kurztext

> **Ihre Auswahl für dieses Gerät**
> Wir speichern auf Ihrem Gerät, was für den Betrieb der Website nötig ist (zum Beispiel Anmeldung, Warenkorb, Darstellung). Dafür brauchen wir keine Einwilligung. Für `[[OFFEN: Zwecke konkret nennen, z. B. „Reichweitenmessung“]]` möchten wir zusätzlich Informationen auf Ihrem Gerät speichern oder auslesen – nur wenn Sie zustimmen. Sie können Ihre Auswahl jederzeit über „Cookie-Einstellungen“ im Footer ändern. Einzelheiten: Cookies und Endgerätespeicher.

Schaltflächen (gleich gestaltet, gleiche Ebene): **Nur Notwendiges** · **Auswahl treffen** · **Alle erlauben**

### e.2 Hinweis vor dem Laden der Werkstattkarte (Vorschlag, solange Karte von Dritten geladen wird)

> **Karte laden?** Die Karte wird von OpenStreetMap geladen, die Kartensoftware von unpkg.com. Dabei wird Ihre IP-Adresse an diese Anbieter übertragen. Ohne Karte sehen Sie die Werkstätten als Liste.
> **Karte laden** · **Liste anzeigen**

### e.3 Einordnung

- § 25 Abs. 1, 2 TDDDG; art. 11.7a lid 1, 3 Telecommunicatiewet; Art. 5 Abs. 3 RL 2002/58/EG. Notwendige Speicherung braucht keine Einwilligung, wird aber in Dokument 03 erklärt.
- Die Einbindung eines anerkannten Dienstes zur Einwilligungsverwaltung ist freiwillig (§ 18 EinwV).
- e.2 betrifft keine Speicherung auf dem Endgerät, sondern den Abruf von Drittinhalten; der Hinweis entfällt, wenn Karte und Bibliothek selbst gehostet werden. `[[OFFEN: Entscheidung – selbst hosten oder Zwei-Klick-Hinweis]]`

---

## (f) Kasse: Pflichtangaben neben dem Bestellbutton

### f.1 Zu Beginn des Bestellvorgangs (Warenkorb oder erster Kassenschritt)

> Wir liefern nach Deutschland, Österreich, in die Niederlande, nach Belgien und Luxemburg. Zahlung: Karte oder Revolut Pay (über Revolut).

### f.2 Letzter Schritt „Prüfen“ – unmittelbar über dem Button

Zuerst, hervorgehoben: Bestellübersicht mit wesentlichen Eigenschaften jedes Artikels, Menge, Einzelpreis, Versandkosten, **Gesamtpreis einschließlich Umsatzsteuer**, gegebenenfalls gesondert ausgewiesenem Pfand, Lieferland. Dann:

> Es gelten unsere **AGB** [Link]. Als Verbraucher haben Sie ein 14-tägiges Widerrufsrecht; die Einzelheiten stehen in der **Widerrufsbelehrung** [Link], dort finden Sie auch das Muster-Widerrufsformular. Informationen zur Verarbeitung Ihrer Daten: **Datenschutzerklärung** [Link].

Button: **Zahlungspflichtig bestellen**

Unter dem Button:

> Nach dem Klick werden Sie zur Zahlung an Revolut weitergeleitet. Die Bestellbestätigung mit AGB und Widerrufsbelehrung erhalten Sie per E-Mail.

### f.3 Einordnung der bestehenden Checkbox – Änderungsvorschlag

**Heute:** eine nicht vorbelegte Pflicht-Checkbox „Ich habe die AGB und die Widerrufsbelehrung gelesen und akzeptiere sie.“; gespeichert wird `terms_accepted_at`.

**Einordnung:**

1. **AGB:** Für die Einbeziehung genügen ein ausdrücklicher Hinweis bei Vertragsschluss, die zumutbare Möglichkeit der Kenntnisnahme (abrufbar, speicherbar) und das Einverständnis, das der Kunde mit der Bestellung erklärt. Eine Checkbox ist nicht vorgeschrieben, aber zulässig.
2. **Widerrufsbelehrung:** Sie ist eine gesetzliche Information des Verkäufers, kein Vertragsangebot. Der Kunde muss sie erhalten, nicht „akzeptieren“. Die Formulierung „akzeptiere sie“ ist unüblich und kann den falschen Eindruck erwecken, das Widerrufsrecht hänge von einer Zustimmung ab oder werde durch sie verändert.
3. **„gelesen“:** Eine vorformulierte Bestätigung, etwas gelesen zu haben, belegt die Kenntnisnahme nicht und hat keinen eigenen rechtlichen Wert.

**Vorschlag (Änderung):** Checkbox entfernen und den Hinweistext f.2 unmittelbar über dem Button verwenden. Statt `terms_accepted_at` werden Zeitpunkt der Bestellung und die Fassungen von AGB und Widerrufsbelehrung gespeichert, die angezeigt wurden.

**Alternative, falls die Checkbox bleiben soll** (Pflicht, nicht vorbelegt):

> ☐ Ich bin mit den **AGB** [Link] einverstanden.
>
> Hinweis zum Widerrufsrecht: **Widerrufsbelehrung** [Link].

### f.4 Einordnung Button und Pflichtangaben

- Button-Wortlaut „Zahlungspflichtig bestellen“ entspricht § 312j Abs. 3 BGB; in der niederländischen Oberfläche „Bestelling met betalingsverplichting“ (art. 6:230v lid 3 BW). Auf dem Button steht nichts anderes.
- Unmittelbar vor der Bestellung hervorgehoben: wesentliche Eigenschaften, Gesamtpreis, Versandkosten, gegebenenfalls Hersteller-Haltbarkeitsgarantie mit EU-Kennzeichnung (§ 312j Abs. 2 BGB; art. 6:230v lid 2 BW).
- Lieferbeschränkungen und Zahlungsmittel spätestens zu Beginn des Bestellvorgangs (§ 312j Abs. 1 BGB; art. 6:230v lid 4 BW).
- Die harmonisierte Mitteilung zum gesetzlichen Gewährleistungsrecht ist eine unveränderliche Grafik der EU und wird als Bild eingebunden, nicht nachformuliert (Dokument 11).

---

## (g) Footer-Zeile zur KI-Kennzeichnung

Auf jeder Seite der Agenturseite und des Shops, sichtbar im Footer (Hauptfassung in Dokument 08):

> Diese Website enthält KI-erzeugte Inhalte und einen KI-Assistenten. Mehr dazu: KI-Hinweise.

„KI-Hinweise“ ist ein Link auf `/ki-hinweise`. Niederländische Fassung: „Deze website bevat door AI gegenereerde inhoud en een AI-assistent. Meer informatie: AI-informatie.“

Einordnung: Hinweis, keine Einwilligung. Er ersetzt nicht den Hinweis im Chat spätestens bei der ersten Interaktion und nicht die Kennzeichnung an KI-erzeugten Medien (Art. 50 Abs. 1, 2, 5 KI-VO; Dokument 08).

---

# Arbeitsabschnitte (nicht Teil der Oberflächentexte)

## Änderungsübersicht gegenüber dem bisherigen Text

| Bisher (Kurz) | Neu | Grund (Norm/Fundstelle laut Register) |
|---|---|---|
| Newsletter: Einwilligungstext, Bestätigungsmail, Frist „noch leer“ (`mailing-consent.json`) | Wortlaute a.1–a.3, Nachweisbeschreibung | § 7 Abs. 2 Nr. 2 UWG (DE 10.1), § 3 Abs. 4 Nr. 3 DDG (DE 10.4); art. 11.7 lid 1, 7 Tw (NL 9.1, 9.4); Art. 6, 7 DSGVO (EU 1.1); Art. 13 RL 2002/58/EG (EU 3.2); ACM „Spam voorkomen“ (NL 9.6); Double-Opt-in (DE 10.5, nur Sekundärquelle) |
| Kontaktformular: Pflichtfeld „Einwilligung“ | Hinweistext ohne Kästchen | Art. 6 Abs. 1 lit. b, f, Art. 13 DSGVO (EU 1.1, 1.2); Art. 7 Abs. 3 DSGVO (Widerruflichkeit, EU 1.1) |
| Werkstattanfrage: „Einwilligung“ ohne Nennung, was an wen geht; Werkstatt wird nicht benachrichtigt | Text mit Empfänger, Datenarten, Rollen; ausdrückliche Bestätigung der Weitergabe | Art. 13 Abs. 1 lit. e DSGVO – Empfänger (EU 1.2); Aufteilung Plattform/Dritter: art. 6:230m lid 3 BW (NL 18.2); Steckbrief Nr. 4 |
| Fehlerdiagnose: Dialog vorhanden, Wortlaut nicht als Rechtstext geführt | Wortlaut d.1 mit Dienstleister, Ort, Dauer der Wahl | § 25 Abs. 1 TDDDG (DE 2.1); art. 11.7a lid 1 Tw (NL 8.1); Art. 7 DSGVO (EU 1.1); Steckbrief Nr. 8 |
| Kein Banner | Banner-Kurztext als Sollzustand; Karten-Hinweis als Vorschlag | § 25 Abs. 1, 2 TDDDG (DE 2.1, 2.2); art. 11.7a lid 1, 3 Tw (NL 8.1, 8.2); Art. 5 Abs. 3 RL 2002/58/EG (EU 3.1); § 18 EinwV (DE 2.4) |
| Kasse: Pflicht-Checkbox „Ich habe die AGB und die Widerrufsbelehrung gelesen und akzeptiere sie.“ | Hinweistext über dem Button, Checkbox entfällt (Alternative: Checkbox nur für AGB) | § 305 Abs. 2 BGB (DE 7.1); art. 6:233 sub b, 6:234 BW (NL 5.3, 5.4); Widerrufsbelehrung als Informationspflicht: Art. 246a § 1 Abs. 2 EGBGB (DE 3.11, 4.5), art. 6:230m lid 1 sub h, 6:230n BW (NL 2.2, 2.3) |
| Button „Zahlungspflichtig bestellen“ | Unverändert (de); nl „Bestelling met betalingsverplichting“ | § 312j Abs. 3 BGB (DE 3.5); art. 6:230v lid 3 BW (NL 2.10); Art. 8 RL 2011/83/EU (EU 5.1) |
| Keine Angabe zu Lieferländern/Zahlungsmitteln am Beginn der Kasse belegt | Text f.1 | § 312j Abs. 1 BGB (DE 3.5); art. 6:230v lid 4 BW (NL 2.11) |
| Footer: Link „Markeninszenierung · KI-generiert“ | „Diese Website enthält KI-erzeugte Inhalte und einen KI-Assistenten. Mehr dazu: KI-Hinweise.“ | Art. 50 Abs. 1, 2, 5 KI-VO (EU 4.5, 4.6, 4.8); Festlegung 9 |

## Offene Punkte / Platzhalter

1. **Newsletter:** Inhalte und Häufigkeit je Marke; Löschfrist für nie bestätigte Anmeldungen; Aufbewahrungsfrist des Nachweises; Absenderadresse; ob Öffnungs- und Klickmessung stattfindet (wenn ja, gehört das in den Einwilligungstext – derzeit nicht belegt, deshalb nicht erwähnt). Einschalten erst nach Freigabe der Texte (`config/integrations/mailing-consent.json`).
2. **Kontaktformular:** Pflicht-Kästchen „Einwilligung“ entfernen – **Codeänderung vor Veröffentlichung**. Speicherdauer der Anfragen in Dok. 02 festlegen.
3. **Werkstattanfrage/Termin:** Benachrichtigung der Werkstatt – **vor Veröffentlichung umzusetzen**; Entscheidung „Bestätigung des Auftrags“ oder „Einwilligung“ (c.2).
4. **Fehlerdiagnose:** genaue Datenfelder des Fehlerberichts bestätigen; Vertragsstand mit PostHog (AVV, Sitz) offen (Festlegung 12).
5. **Banner:** nur bei Einführung nicht notwendiger Speicherung; Zwecke dann konkret benennen. Footer-Link „Cookie-Einstellungen“ erst dann.
6. **Werkstattkarte:** selbst hosten oder Zwei-Klick-Hinweis; die Karte ist derzeit von der CSP nicht erlaubt (Steckbrief Nr. 8).
7. **Kasse:** Entscheidung Checkbox entfernen oder Alternative; Speicherung der angezeigten Fassungen statt `terms_accepted_at` – **Codeänderung**. Pfandzeile (DE, Starterbatterien) und Gewährleistungsgrafik sind noch nicht umgesetzt (Dok. 11, 13).
8. **Kasse NL – Vorauszahlung:** höchstens 50 % Vorauszahlung gegenüber Verbrauchern in den Niederlanden (NL 4.9, 4.10); der Text f.1 nennt nur Revolut. Entscheidung vor Verkauf an NL-Verbraucher.
9. **Footer-Zeile:** Einbau auf jeder Seite; ersetzt den bisherigen Link. Hinweis im Chat und Kennzeichnung der Medien sind Voraussetzung (Dok. 08).
10. **Fassungsführung:** Jeder Wortlaut erhält eine Fassungsnummer; Änderungen am Wortlaut erzeugen eine neue Fassung (für a und c wird die Fassung beim Nutzer gespeichert).

## Für die anwaltliche Prüfung

- **Double-Opt-in und Nachweis ohne IP-Adresse:** BGH I ZR 164/09 und DSK-Orientierungshilfe sind NICHT ABGERUFEN (DE 10.5, nur Sekundärquelle). Prüfen, ob der Nachweis (Zeitpunkte, Wortlaut-Prüfsumme, Bestätigungsklick) ohne IP genügt und ob der „Sperrlink“ in der Bestätigungsmail unbedenklich ist.
- **Aufbewahrung des Einwilligungsnachweises:** § 7a UWG (fünf Jahre) betrifft nach dem Register Telefonwerbung (DE 10.3); für E-Mail nennt nur die ACM „bis 5 Jahre nach Versand“ (NL 9.6). Frist festlegen.
- **Kontaktformular – Rechtsgrundlage lit. b/lit. f** und Verzicht auf das Kästchen.
- **Werkstattweitergabe – lit. b oder lit. a;** Rollen (getrennte Verantwortliche oder gemeinsame Verantwortung nach Art. 26 DSGVO, EU 1.5).
- **Fehlerdiagnose:** ob bei fehlender Persistenz überhaupt ein Endgerätezugriff im Sinn von § 25 TDDDG / art. 11.7a Tw vorliegt; welches der beiden nationalen Regime gilt, ist nicht abschließend geklärt (DE 11.4, Unsicherheit Nr. 2). Cookie-Aufsicht in NL: ACM nach geltendem art. 15.1 Tw; Verlagerung zur AP nur als Suchtreffer (NL 8.4, 8.5). AP-Leitlinien NICHT ABGERUFEN (NL-Unsicherheiten).
- **Kasse – Checkbox:** Die Einordnung von „gelesen“-Bestätigungen (Tatsachenbestätigung in AGB) ist im Register nicht mit Norm belegt; die Bewertung in f.3 Nr. 3 ist eine Einschätzung. ACM-Seite „Algemene voorwaarden aanbieden“ NICHT ABGERUFEN (NL 5.10).
- **§ 312j Abs. 2 BGB n. F.** (Verweis auf Nr. 8 und 11a seit 27.9.2026, DE 3.5) und art. 6:230v lid 2 BW (lit. a, e, o, p, v; NL 2.10): Vollständigkeit der Bestellübersicht prüfen. Einzelne neue Informationspunkte der RL (EU) 2024/825 im EU-Register nicht im Wortlaut geprüft (EU 5.9).
- **KI-Footer:** Reicht die Footer-Zeile neben Chat-Hinweis und Medienkennzeichnung; Rolle Anbieter/Betreiber (EU 4.2, Unsicherheit Nr. 6); Leitlinien und Praxisleitfaden zu Art. 50 nur als Seiten gelesen (EU 4.11, 4.12).
- **Digital Omnibus (COM(2025) 837):** würde Cookie-Regeln ändern; nicht verabschiedet (EU 1.15, 3.4).

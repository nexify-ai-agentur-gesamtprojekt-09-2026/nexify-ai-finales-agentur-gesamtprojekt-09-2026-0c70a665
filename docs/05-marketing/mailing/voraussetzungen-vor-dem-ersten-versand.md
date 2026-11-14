# Voraussetzungen vor dem ersten Werbeversand · 14.11.2026

Status: Arbeitsfassung zur Entscheidung durch den Inhaber. **Keine Rechtsberatung.** Die Liste benennt, was vor einem Versand geklärt und belegt sein muss; die rechtliche Bewertung im Einzelfall gehört zur Rechtsberatung (Register OA-001, OA-007, OA-012).

Geltung: Werbemails von NeXify AI über das Resend-Konto. Transaktionsmails (Anfragebestätigung, Terminanfrage, Kontobestätigung) sind nicht Gegenstand; sie laufen unverändert weiter.

Lesart der Spalte „Zustand“: **belegt vorhanden** heißt, es gibt eine Fundstelle im Repository oder eine Messung vom 14.11.2026. **fehlt** heißt, es gibt keinen Beleg. Eine mündliche Annahme zählt nicht als Beleg.

Zugehörige Dokumente: `entscheidungsvorlage-inhaber.md` (Wege für „ab morgen“), `aufwaermplan.md` (Mengen), `vorlagen/` (Entwürfe), `docs/04-betrieb/mailversand-zustand-2026-11-14.md` (Messung).

---

## 0. Ergebnis in vier Sätzen

1. Heute ist **kein** Punkt der Rechtsgrundlage belegt: keine Einwilligung mit Nachweis, kein nach § 7 Abs. 3 UWG geprüfter Bestandskunde.
2. Der früheste saubere Versand an eine Liste ist die **erste Mail an Empfänger, die sich selbst angemeldet und per Bestätigungsmail bestätigt haben**. Diese Liste beginnt bei null und wächst mit der Anmeldung.
3. Vorher möglich sind nur **einzelne Mails an Bestandskunden**, die der Inhaber Person für Person nach § 7 Abs. 3 UWG geprüft hat. Fehlt der Beleg für den Hinweis bei der Erhebung, entfällt auch das.
4. Für alle übrigen Adressen gilt: **kein Versand**. Das verlangt das Gesetz, und unabhängig davon die Richtlinie von Resend.

---

## 1. Rechtsgrundlage je Empfängergruppe

### 1.1 Gruppe A: Empfänger mit Einwilligung (Anmeldung mit Bestätigungsmail)

Maßstab: § 7 Abs. 2 Nr. 2 UWG verlangt für Werbung per elektronischer Post die vorherige ausdrückliche Einwilligung; die Vorschrift unterscheidet dabei nicht zwischen Verbrauchern und Unternehmen. Art. 7 Abs. 1 DSGVO verlangt, dass der Verantwortliche die Einwilligung nachweisen kann; nach Abs. 3 muss der Widerruf so einfach sein wie die Erteilung, und darüber ist vor der Erteilung zu informieren.

| Nr. | Voraussetzung | Zustand | Fundstelle |
|---|---|---|---|
| A-1 | Anmeldeformular mit eigenem, nicht vorangekreuztem Einwilligungstext, getrennt von anderen Erklärungen | **fehlt** | Kein Anmeldeweg in `apps/` (Messprotokoll, Abschnitt 4). Das Kontaktformular ist eine Anfrage, keine Newsletter-Einwilligung. |
| A-2 | Einwilligungstext nennt Absender, Inhalt der Mails und das Widerrufsrecht; Wortlaut vom Inhaber freigegeben | **fehlt** | Kein freigegebener Text. Rechtstexte ändert kein Agent (`DECISIONS.md`, D-017). |
| A-3 | Bestätigungsmail (Double-Opt-in): Der Kontakt wird erst nach dem Klick aktiv | **fehlt** (Entwurf: `vorlagen/a-double-opt-in-bestaetigung.md`) | Kein Code. Zielbild in `config/versand.json`, Abschnitt „werbung“. |
| A-4 | Die Bestätigungsmail enthält selbst keine Werbung | Entwurf erfüllt es; Versandweg **fehlt** | `vorlagen/a-double-opt-in-bestaetigung.md` |
| A-5 | Nachweis je Empfänger gespeichert: Zeitpunkt der Anmeldung, Zeitpunkt der Bestätigung, Wortlaut und Fassung des Einwilligungstexts, Quelle (Seite/Formular) | **fehlt** | Keine Nachweistabelle. Speicherort hängt an der Supabase-Instanz (Register OA-003, OA-029). |
| A-6 | Unbestätigte Anmeldungen verfallen nach einer festgelegten Frist und werden gelöscht | **fehlt** (Frist ist Inhaberentscheidung) | – |
| A-7 | Abmeldung wirkt sofort und ohne Anmeldung am Konto | **fehlt** im eigenen Code; bei Kampagnen über Resend stellt Resend den Abmeldeweg | Messprotokoll, Abschnitt 4 und 5 |
| A-8 | Positiv- und Negativtest belegt (bestätigt erhält Mail; unbestätigt und abgemeldet erhält keine) | **fehlt** | – |

Hinweis zu A-3/A-4: Ob und unter welchen Bedingungen die Bestätigungsmail selbst zulässig ist, ist eine Rechtsfrage, die hier nicht aus einer abgerufenen Quelle belegt ist. Der Entwurf hält sie deshalb frei von jeder Werbung. Bitte anwaltlich bestätigen lassen.

### 1.2 Gruppe B: Bestandskunden nach § 7 Abs. 3 UWG

Die Ausnahme greift nur, wenn **alle vier** Voraussetzungen zugleich vorliegen. Geprüft wird je Person, nicht je Liste.

| Nr. | Voraussetzung nach § 7 Abs. 3 UWG | Was als Beleg zählt | Zustand |
|---|---|---|---|
| B-1 | Nr. 1: Der Unternehmer hat die Adresse **im Zusammenhang mit dem Verkauf einer Ware oder Dienstleistung vom Kunden** erhalten. | Auftrag oder Rechnung mit Datum; Herkunft der Adresse (vom Kunden selbst angegeben, nicht recherchiert, nicht von Dritten) | **fehlt** – keine Liste. Resend: 1 Kontakt ohne Nachweis; HubSpot laut Register: 2 Beispielkontakte, 0 Abschlüsse. |
| B-2 | Nr. 2: Verwendung zur Direktwerbung **für eigene ähnliche** Waren oder Dienstleistungen. | Zuordnung: gekaufte Leistung → beworbene Leistung, je Kunde. Fremde Angebote und unähnliche eigene Angebote scheiden aus. | **fehlt** |
| B-3 | Nr. 3: Der Kunde hat der Verwendung **nicht widersprochen**. | Sperrliste, gegen die vor jedem Versand geprüft wird | **fehlt** – es gibt keine Sperrliste (Abschnitt 5) |
| B-4 | Nr. 4: Der Kunde wurde **bei der Erhebung der Adresse und bei jeder Verwendung** klar und deutlich darauf hingewiesen, dass er jederzeit widersprechen kann, ohne dass andere als die Übermittlungskosten nach den Basistarifen entstehen. | Wortlaut des Hinweises im damaligen Formular, Angebot oder Vertrag **mit Datum**; dazu der Hinweis in jeder Mail | **fehlt** – ein Hinweis bei der Erhebung ist nirgends belegt (Register OA-002). In der Vorlage `vorlagen/d-bestandskunden.md` ist der Hinweis für die Verwendung enthalten. |

Folge: Ein Bestandskunde ohne Beleg zu B-4 steht nicht auf der Versandliste. Der Hinweis lässt sich nicht nachholen; für diese Kunden bleibt nur der Weg über die Einwilligung (Gruppe A). Ab sofort kann der Hinweis in neue Angebote und Formulare aufgenommen werden, damit die Ausnahme für **künftige** Kunden trägt – Wortlaut durch Inhaber und Rechtsberatung.

Offen und nur anwaltlich zu klären: was im Einzelfall als „ähnlich“ gilt, und ob ein Angebot ohne Auftrag („Interessent“) unter „Verkauf“ fällt. Bis zur Klärung zählen nur Kunden mit abgeschlossenem Auftrag.

### 1.3 Gruppe C: alle übrigen Adressen

Recherchierte Adressen, Adressen aus Verzeichnissen und Impressen, gekaufte oder gemietete Listen, Visitenkarten ohne Einwilligung, Besucher ohne Anmeldung, Kontakte aus Anfragen ohne Newsletter-Einwilligung.

| Nr. | Regel | Zustand | Fundstelle |
|---|---|---|---|
| C-1 | **Kein Werbeversand per E-Mail.** | Regel im älteren Konzept belegt; als aktuelle schriftliche Inhaberentscheidung **fehlt** sie (Register OA-005) | § 7 Abs. 2 Nr. 2 UWG; `docs/01-konzept/NeXify-Marketingkonzept.md`, Zeile 91: „keine E-Mail- oder Telefon-Kaltakquise ohne Einwilligung“ |
| C-2 | Solche Adressen werden nicht in das Resend-Konto geladen. | Zustand heute eingehalten (1 Kontakt); schriftliche Regel **fehlt** | Resend-Richtlinie: alle Mails nur an Empfänger mit ausdrücklicher Anmeldung; unverlangte Nachrichten sind untersagt, ausdrücklich genannt sind Kaltansprache, gekaufte Listen und gesammelte Kontaktdaten |
| C-3 | Wer solche Daten überhaupt sammelt, braucht eine Rechtsgrundlage, die Information nach Art. 14 DSGVO samt Quelle und eine Sperrliste. | **fehlt** | Register OA-006 |

Erlaubte Wege, diese Gruppe ohne E-Mail-Erstansprache zu erreichen: `entscheidungsvorlage-inhaber.md`, Abschnitt 4.

### 1.4 Welches Recht gilt

| Nr. | Frage | Zustand |
|---|---|---|
| R-1 | Der Anbieter sitzt laut Impressum in Venlo (Niederlande). Welche Regeln gelten für Empfänger in Deutschland, den Niederlanden, Belgien, Luxemburg und Österreich? Diese Liste prüft nur deutsches Recht (UWG, DDG) und die DSGVO. Die niederländischen Regeln für elektronische Werbung wurden **nicht** abgerufen und nicht geprüft. | **fehlt** – kurze schriftliche Einordnung je Zielland durch Rechtsberatung (Register OA-007) |
| R-2 | Rechtsform und Anbieterangaben widerspruchsfrei: `config/site-map.json` (Seite `imprint`) nennt eine Eenmanszaak, `apps/site/src/Auth.tsx` nennt „B.V.“; ein Registerauszug liegt im Repository nicht vor. | **fehlt** (Register OA-009) |

---

## 2. Pflichtangaben in jeder Werbemail

| Nr. | Angabe | Maßstab | Zustand | Fundstelle |
|---|---|---|---|---|
| P-1 | **Absender nicht verschleiert**: Anzeigename und Adresse lassen NeXify AI erkennen | § 7 Abs. 2 Nr. 3 Buchst. a UWG; § 6 Abs. 2 DDG (Kopf- und Betreffzeile dürfen Absender und kommerziellen Charakter nicht verschleiern) | Für Transaktionsmails belegt (`"NeXify AI" <…@nexifyai.cloud>`); für Kampagnen **fehlt** die Festlegung der Absenderadresse | `apps/agent-gateway/integrations.py`, `config/integrations/resend.json` |
| P-2 | **Werbung als Werbung erkennbar**, Auftraggeber klar identifizierbar | § 6 Abs. 1 Nr. 1 und 2 DDG | In den Entwürfen berücksichtigt; Freigabe **fehlt** | `vorlagen/` |
| P-3 | **Betreff ohne Täuschung** über Absender oder Werbezweck | § 6 Abs. 2 DDG | In den Entwürfen berücksichtigt; Freigabe **fehlt** | `vorlagen/` |
| P-4 | **Anbieterangaben (Impressum)** im Fuß: Name und Anschrift, Rechtsform soweit einschlägig, schnelle elektronische Kontaktmöglichkeit einschließlich E-Mail-Adresse, Register und Registernummer, Umsatzsteuer-Identifikationsnummer | § 5 Abs. 1 DDG; § 7 Abs. 2 Nr. 3 Buchst. b UWG | Angaben im Impressum vorhanden; **widerspruchsfrei belegt sind sie nicht** (R-2). In den Entwürfen stehen Platzhalter mit Verweis auf die Quelle, keine Werte. | `config/site-map.json`, Seite `imprint` (`/impressum`) |
| P-5 | **Gültige Adresse für die Abmeldung**, ohne andere Kosten als die Übermittlung nach Basistarifen | § 7 Abs. 2 Nr. 3 Buchst. c UWG | **fehlt** – kein Abmeldeweg im Code, kein eingerichtetes Thema | Messprotokoll, Abschnitt 4 |
| P-6 | **Sichtbarer Abmeldelink** im Text jeder Mail, dazu die Kopfzeilen `List-Unsubscribe` und `List-Unsubscribe-Post` (ein Klick) | Resend-Richtlinie (reibungslose Abmeldung, Umsetzung binnen 7 Tagen); Resend-Dokumentation (RFC 8058; Wirkung binnen 48 Stunden) | **fehlt** | Messprotokoll, Abschnitt 4 |
| P-7 | Bei Bestandskunden zusätzlich: **Widerspruchshinweis in jeder Mail** | § 7 Abs. 3 Nr. 4 UWG | Im Entwurf enthalten; Freigabe **fehlt** | `vorlagen/d-bestandskunden.md` |
| P-8 | Antwortadresse, die gelesen wird (kein „no-reply“) | Resend-Dokumentation „Deliverability Insights“ | Festlegung **fehlt** | – |

Unstimmigkeit, die vor dem ersten Versand aufzulösen ist: Als Kontaktadresse nennt das Impressum eine andere Adresse als `AGENTS.md` (Abschnitt „Kontakt“) und als die Absenderadresse der Transaktionsmails. Welche Adresse im Mailfuß steht und welche Antworten empfängt, entscheidet der Inhaber (Frage F-3 der Entscheidungsvorlage).

---

## 3. Informationspflichten (Art. 13 und 14 DSGVO)

| Nr. | Pflicht | Zustand | Fundstelle |
|---|---|---|---|
| I-1 | **Art. 13 (Daten bei der Person erhoben, also Anmeldung):** bei der Erhebung Verantwortlicher mit Kontaktdaten, Zweck und Rechtsgrundlage, Empfänger (hier: Resend als Dienstleister), Übermittlung in ein Drittland samt Garantien, Speicherdauer, Betroffenenrechte, Widerrufsrecht, Beschwerderecht | **fehlt** – die Seite `/datenschutz` sagt selbst: „Die vollständige Datenschutzerklärung ist noch in Prüfung.“ Ein Abschnitt zu Newsletter und Direktwerbung existiert nicht. | `config/site-map.json`, Seite `privacy` |
| I-2 | Hinweis auf die Datenschutzinformation direkt am Anmeldeformular | **fehlt** (kein Formular) | – |
| I-3 | **Art. 14 (Daten nicht bei der Person erhoben):** zusätzlich die **Quelle** der Daten; Information spätestens bei der ersten Mitteilung an die Person, sonst binnen eines Monats | **fehlt** – betrifft nur Gruppe C; da dort kein E-Mail-Versand stattfindet, wird die Pflicht über den jeweiligen anderen Kanal fällig (Register OA-006) | – |
| I-4 | Auftragsverarbeitung mit Resend dokumentiert (Vertrag zwischen NeXify AI und Resend), einschließlich Messung von Öffnungen und Klicks | **fehlt** als Beleg im Repository. `apps/web/lib/legal/avv.json` ist der Mustervertrag von NeXify gegenüber eigenen Kunden und nennt Resend dort nur als Unterauftragsverarbeiter; das ist nicht der Vertrag mit Resend. | `apps/web/lib/legal/avv.json`, § 3 |
| I-5 | Öffnungs- und Klickmessung: Für `nexifyai.cloud` ist beides bei Resend eingeschaltet. Ob dafür eine eigene Einwilligung nötig ist und wie sie eingeholt wird, ist offen. | **fehlt** – Entscheidung Inhaber mit Rechtsberatung; bis dahin Messung für die Marketing-Subdomain ausgeschaltet lassen | Messprotokoll, Abschnitt 2 |

---

## 4. Widerspruch gegen Direktwerbung (Art. 21 DSGVO)

| Nr. | Pflicht | Zustand |
|---|---|---|
| W-1 | Abs. 2: Widerspruch gegen Direktwerbung ist jederzeit möglich. | Weg **fehlt** |
| W-2 | Abs. 3: Nach dem Widerspruch werden die Daten für diesen Zweck nicht mehr verarbeitet – der Empfänger kommt auf die Sperrliste, nicht bloß aus der Liste. | **fehlt** |
| W-3 | Abs. 4: Hinweis auf das Widerspruchsrecht spätestens bei der ersten Kommunikation, verständlich und **getrennt von anderen Informationen**. | In den Entwürfen als eigener Absatz enthalten; freigegebener Wortlaut **fehlt** |
| W-4 | Widerspruch auf jedem Weg wird beachtet: Abmeldelink, Antwort auf die Mail, Anruf, Brief. Zuständigkeit und Frist für die Bearbeitung von Hand sind festgelegt. | **fehlt** |

---

## 5. Sperrliste

| Nr. | Anforderung | Zustand |
|---|---|---|
| S-1 | Eine einzige Sperrliste für Werbung, außerhalb von Resend geführt, damit sie einen Anbieterwechsel übersteht | **fehlt** |
| S-2 | Einträge entstehen automatisch bei Abmeldung, Widerspruch, hartem Rückläufer und Beschwerde | **fehlt** – kein Empfang der Resend-Ereignisse im Code (`config/versand.json` beschreibt das Ziel) |
| S-3 | Vor **jedem** Versand wird die Empfängerliste gegen die Sperrliste geprüft; das gilt auch für Bestandskunden und für spätere neue Listen | **fehlt** |
| S-4 | Die Sperrliste speichert nur, was zum Sperren nötig ist, und wird nicht für andere Zwecke genutzt | **fehlt** (Festlegung) |
| S-5 | Resend führt abgemeldete Kontakte und eine eigene Unterdrückungsliste und sendet an diese keine Kampagnen, auch wenn sie in einem Segment stehen | **belegt vorhanden** als Funktion des Anbieters; ersetzt S-1 nicht | 

Fundstelle zu S-5: Resend-Dokumentation „Segments“ und „Handle unsubscribes“ (Abschnitt 8).

---

## 6. Nachweisführung

| Nr. | Nachweis | Zustand |
|---|---|---|
| N-1 | Je Empfänger: Rechtsgrundlage (A oder B) mit Beleg nach A-5 oder B-1 bis B-4 | **fehlt** |
| N-2 | Je Versand: Datum, Vorlage mit Fassung, Empfängerzahl, Segment/Thema, Ergebnis der Sperrlistenprüfung | **fehlt** |
| N-3 | Je Versand: Rückläufer- und Beschwerdequote gegen die Grenzwerte | **fehlt** (Grenzwerte in `aufwaermplan.md`) |
| N-4 | Freigabe des Inhabers je Text vor dem ersten Einsatz | **fehlt** |
| N-5 | Aufbewahrungs- und Löschfristen für Einwilligungsnachweise und Sperrliste festgelegt | **fehlt** (Inhaber mit Rechtsberatung) |
| N-6 | Schriftliche Regel: keine gesammelten oder gekauften Adressen im Resend-Konto | **fehlt** (Register OA-005) |

---

## 7. Technische Voraussetzungen (Kurzfassung)

Einzelheiten und Messwerte: `docs/04-betrieb/mailversand-zustand-2026-11-14.md`.

| Nr. | Voraussetzung | Zustand |
|---|---|---|
| T-1 | Eigene, verifizierte Absender-Subdomain nur für Marketing | **fehlt** |
| T-2 | SPF, DKIM und DMARC für diese Subdomain per DNS-Abfrage belegt | **fehlt**; für `nexifyai.cloud` teils belegt, Rücklaufpfad ungeklärt; `nexifyai.de` bei Resend „failed“ |
| T-3 | Mindestens ein Abmeldethema bei Resend | **fehlt** (0 Themen) |
| T-4 | Kampagnenweg getrennt vom Transaktionsweg, mit eigener Tagesgrenze | **fehlt** |
| T-5 | Testmail an eine **eigene** Adresse trägt beide Abmelde-Kopfzeilen; Abmeldung führt belegt zur Sperre | **fehlt** |
| T-6 | Aufwärmplan mit Tagesmengen und Abbruchkriterien | **belegt vorhanden** als Plan: `aufwaermplan.md` |
| T-7 | Kontogrenze beachtet: höchstens 1.000 Kontakte | **belegt vorhanden** als Messwert (1 von 1.000) |

---

## 8. Quellen

Abruf aller Quellen: 14.11.2026, zwischen 18:39 und 18:46 UTC.

### Gesetze

Die amtliche Seite `gesetze-im-internet.de` war nicht erreichbar: drei Versuche (`uwg_2004/__7.html`, `ddg/__5.html`, `ddg/__6.html`) endeten mit HTTP 503 beziehungsweise Verbindungsabbruch. Deshalb wurde auf die folgenden nichtamtlichen Seiten ausgewichen. **Vor einer Verwendung nach außen den Wortlaut an der amtlichen Fassung gegenprüfen.**

| Vorschrift | Gelesen über | Fassung laut Seite |
|---|---|---|
| § 7 UWG (Abs. 1 bis 3) | <https://dejure.org/gesetze/UWG/7.html> | gültig seit 14.05.2024 (Gesetz vom 06.05.2024, BGBl. I Nr. 149) |
| § 5 DDG (Allgemeine Informationspflichten) | <https://www.buzer.de/s1.htm?a=5&g=DDG&dorg=1> – dejure.org leitet für das DDG dorthin weiter | Fassung nach Gesetz vom 03.02.2026 (BGBl. 2026 I Nr. 29), in Kraft seit 19.02.2026 |
| § 6 DDG (Besondere Pflichten bei kommerziellen Kommunikationen) | <https://www.buzer.de/s1.htm?a=6&g=DDG&dorg=1> | zuletzt geändert durch Gesetz vom 12.05.2026 (BGBl. 2026 I Nr. 138) |
| Art. 7 DSGVO | <https://dsgvo-gesetz.de/art-7-dsgvo/> | – |
| Art. 13 DSGVO | <https://dsgvo-gesetz.de/art-13-dsgvo/> | – |
| Art. 14 DSGVO | <https://dsgvo-gesetz.de/art-14-dsgvo/> | – |
| Art. 21 DSGVO | <https://dsgvo-gesetz.de/art-21-dsgvo/> | – |

Für die DSGVO wurde EUR-Lex nicht ausgelesen (die Seite antwortete mit einem Zwischenstatus ohne Inhalt); `dsgvo-gesetz.de` ist nichtamtlich.

Die Vorschriften sind in dieser Datei sinngemäß wiedergegeben, nicht wörtlich zitiert. Maßgeblich ist der amtliche Wortlaut.

### Resend

| Thema | Quelle | Kernaussage |
|---|---|---|
| Richtlinie zur zulässigen Nutzung | <https://resend.com/legal/acceptable-use> (Stand laut Seite: 13.10.2026) | Nur an Empfänger mit ausdrücklicher Anmeldung; unverlangte Nachrichten untersagt, genannt sind Kaltansprache, gekaufte Listen, gesammelte Kontaktdaten; reibungslose Abmeldung, Umsetzung binnen 7 Tagen; Beschwerden unter 0,08 %, Rückläufer unter 4 %; bei Überschreitung kann das Konto ohne Vorwarnung geschlossen werden |
| Abmelde-Kopfzeilen | <https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails> | `List-Unsubscribe` über das Feld `headers`; für Massenmails zusätzlich `List-Unsubscribe-Post: List-Unsubscribe=One-Click` und Annahme eines `POST` (RFC 8058); Wirkung binnen 48 Stunden; Gmail und Yahoo verlangen das von Absendern mit mehr als 5.000 Mails je Tag an ihre Domains |
| Themen (Topics) | <https://resend.com/docs/dashboard/topics/introduction> | Empfänger wählen je Thema; Standard „Opt-in“ oder „Opt-out“ wird beim Anlegen gewählt und ist danach nicht änderbar; Sichtbarkeit öffentlich oder privat |
| Segmente | <https://resend.com/docs/dashboard/segments/introduction> | Interne Gruppen für Kampagnen; abgemeldete und unterdrückte Kontakte erhalten keine Mail, auch wenn sie im Segment stehen |
| Abmeldungen | <https://resend.com/docs/dashboard/audiences/managing-unsubscribe-list> | Abgemeldete Kontakte erhalten keine Kampagnen und keine automatisierten Mails; Transaktionsmails über die Schnittstelle werden weiter zugestellt |
| Domains | <https://resend.com/docs/dashboard/domains/introduction> | Empfehlung, von Subdomains zu senden: Absicht des Absenders, getrennte Reputation, getrennte Einstellungen |
| Rücklaufpfad | <https://resend.com/docs/dashboard/domains/custom-return-path> | Standard ist die Subdomain `send`; nach dem Anlegen nicht änderbar |
| DMARC | <https://resend.com/docs/dashboard/domains/dmarc> | Stufen `p=none` → `quarantine` → `reject`; Berichtsadresse muss Mail empfangen können |
| Zustellhinweise | <https://resend.com/docs/dashboard/emails/deliverability-insights> | Subdomain verwenden; eigene Messdomain; kein „no-reply“; Gmail und Yahoo verlangen seit 2024 von Massenversendern einen DMARC-Eintrag |
| Aufwärmen | <https://resend.com/docs/knowledge-base/warming-up> | Tagesmengen für neue Domains (150 bis 2.000 in sieben Tagen); Rückläufer unter 4 %, Beschwerden unter 0,08 % |
| Kontingente | <https://resend.com/docs/knowledge-base/account-quotas-and-limits> | Mailkontingent und Kontaktkontingent sind getrennte Größen |

Die Resend-Seiten wurden über ein Abrufwerkzeug gelesen, das Inhalte zusammenfasst. Zahlen und Grenzwerte sind daraus übernommen; längere Passagen sind sinngemäß wiedergegeben.

### Repository und Konto

- Resend-Konto, Abruf 14.11.2026 (nur Zählung und Zustände): `docs/04-betrieb/mailversand-zustand-2026-11-14.md`.
- `docs/05-marketing/gesamtkonzept-2026-11-14.md`; `docs/01-konzept/NeXify-Marketingkonzept.md` (älter, Zeile 91).
- `config/site-map.json` (Seiten `imprint`, `privacy`), `config/integrations/resend.json`, `config/versand.json`.
- Register der offenen Arbeiten vom 14.11.2026, Einträge OA-001 bis OA-012 und OA-104 bis OA-106.

## 9. Nicht geprüft

- Niederländisches, belgisches, luxemburgisches und österreichisches Recht für Werbemails.
- Rechtsprechung zu § 7 UWG (etwa zur Bestätigungsmail, zum Begriff „ähnlich“, zur mutmaßlichen Einwilligung bei Anrufen).
- Ob ein Auftragsverarbeitungsvertrag mit Resend geschlossen ist und ob er den Marketingversand abdeckt.
- Inhalt der sechs bei Resend gespeicherten Vorlagen und Herkunft des einen Kontakts.
- Bestände in HubSpot und anderen Systemen (nur die Zählung aus dem Register übernommen).

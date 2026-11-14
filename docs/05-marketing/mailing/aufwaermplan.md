# Aufwärm- und Mengenplan für Kundenmailings · 14.11.2026

Status: Plan zur Entscheidung durch den Inhaber. Es ist nichts eingerichtet und nichts versendet. DNS-Einträge und die Anlage einer Domain bei Resend nimmt nur der Inhaber vor.

Der Plan setzt voraus, dass die Punkte aus `voraussetzungen-vor-dem-ersten-versand.md` erfüllt sind. **Aufwärmen ersetzt keine Einwilligung.** Jede Zahl unten ist eine Obergrenze für Mails an Empfänger mit belegter Rechtsgrundlage, kein Mengenziel.

---

## 1. Eigene Subdomain nur für Marketing

Vorschlag: eine neue Subdomain ausschließlich für Werbemails, zum Beispiel `news.nexifyai.de`. Der Name ist ein Platzhalter; Domain und Name entscheidet der Inhaber (Entscheidungsvorlage, Frage F-5).

Begründung:

1. **Getrennte Reputation.** Resend empfiehlt, von Subdomains statt von der Hauptdomain zu senden, und nennt als Grund die getrennte Reputation: Ein Problem bei Werbemails schlägt weniger auf Transaktionsmails einer anderen Subdomain durch. Heute laufen Anfrage- und Terminbestätigungen der Website über `nexifyai.cloud`. Diese Mails müssen ankommen, auch wenn eine Kampagne Beschwerden auslöst.
2. **Getrennte Einstellungen.** Öffnungs- und Klickmessung lassen sich je Domain schalten. Für `nexifyai.cloud` ist beides eingeschaltet. Für die Marketing-Subdomain bleibt die Messung ausgeschaltet, bis die Einwilligungsfrage dazu geklärt ist (Voraussetzungen, I-5).
3. **Klare Absicht.** Postfachanbieter und Empfänger sehen an der Absenderdomain, um welche Art Mail es sich handelt.
4. **Saubere Ausgangslage.** `nexifyai.de` steht bei Resend auf „failed“, und der Rücklaufpfad von `nexifyai.cloud` ist ungeklärt (Messprotokoll, Befunde B-1 und B-2). Eine neue Subdomain wird einmal vollständig eingerichtet und gemessen, statt einen unklaren Zustand zu erben.

Grenze der Trennung: Die Subdomain schützt die Zustellung der Transaktionsmails, **nicht das Konto**. Die Richtlinie von Resend gilt für das ganze Konto. Wird es wegen eines Mailings geschlossen, fallen auch die Transaktionsmails der Website und die Domains des Kundenprojekts aus. Dagegen hilft nur, die Grenzwerte einzuhalten – oder ein eigenes Konto für Marketing (Frage F-6).

Einrichtung, sobald entschieden (Reihenfolge):

| Schritt | Wer | Beleg |
|---|---|---|
| Subdomain bei Resend anlegen, Messung aus | Inhaber | Status bei Resend |
| DKIM, Rücklaufpfad (MX und SPF) und die von Resend genannten weiteren Einträge im DNS setzen | Inhaber | DNS-Abfrage bei zwei Auflösern |
| DMARC für die Subdomain: Start mit `p=none` **mit** Berichtsadresse an ein eigenes Postfach; verschärfen erst nach sauberen Berichten | Inhaber | DNS-Abfrage; eingegangener Bericht |
| Abmeldethema bei Resend anlegen (Standard beim Anlegen wählen: er ist danach nicht änderbar) | Inhaber oder Agent nach Freigabe | `list-topics` |
| Testmail an eine **eigene** Adresse: Kopfzeilen `List-Unsubscribe` und `List-Unsubscribe-Post` vorhanden, SPF/DKIM/DMARC „pass“ | Agent nach Freigabe | Kopfzeilen der empfangenen Mail |
| Abmeldung aus der Testmail führt zur Sperre | Agent nach Freigabe | Zustand des Kontakts, Sperrliste |

## 2. Warum 50.000 Mails am ersten Tag nicht gehen

| Nr. | Grund | Beleg |
|---|---|---|
| 1 | **Es gibt keine Empfänger mit Rechtsgrundlage.** Belegte Einwilligungen: 0. Geprüfte Bestandskunden: 0. | Voraussetzungen, Abschnitt 1 |
| 2 | **Das Konto fasst 1.000 Kontakte.** Kampagnen gehen an Kontakte. „50.000“ ist das Monatskontingent an Mails, nicht die Zahl der Empfänger einer Kampagne. | `get-usage`, 14.11.2026: Kontakte 1 von 1.000 |
| 3 | **Die Richtlinie verbietet den Weg, auf dem 50.000 Adressen zusammenkämen.** Kaltansprache, gekaufte und gesammelte Listen sind untersagt. | Resend-Richtlinie, Stand 13.10.2026 |
| 4 | **Die Beschwerdegrenze ist rechnerisch nicht zu halten.** Erlaubt sind unter 0,08 % Beschwerden: bei 50.000 Mails höchstens 39 Klicks auf „Spam“. Unverlangte Mails überschreiten das sofort. | Rechnung: 50.000 × 0,0008 = 40 |
| 5 | **Die Rückläufergrenze ebenso.** Erlaubt sind unter 4 % Rückläufer: bei 50.000 Mails weniger als 2.000 unzustellbare Adressen. Gesammelte Listen ohne Bestätigung liegen erfahrungsgemäß darüber; gemessen ist das hier nicht. | Rechnung: 50.000 × 0,04 = 2.000 |
| 6 | **Eine neue Absenderdomain hat keine Reputation.** Resend nennt für neue Domains am ersten Tag bis zu 150 Mails, am siebten bis zu 2.000. | Resend, „Warming up“ |
| 7 | **Massenversand hat eigene Pflichten.** Ab 5.000 Mails je Tag an Gmail- oder Yahoo-Postfächer verlangen diese Anbieter die Abmeldung mit einem Klick und einen DMARC-Eintrag. Beides fehlt heute. | Resend-Dokumentation; Messprotokoll |
| 8 | **Der Schaden träfe Unbeteiligte.** Bei Überschreitung kann das Konto ohne Vorwarnung geschlossen werden. Im selben Konto liegen die Transaktionsmails der Website und zwei Domains eines Kundenprojekts. | Resend-Richtlinie; Messprotokoll, Abschnitt 2 |

## 3. Tagesmengen über die ersten vier Wochen

Zwei Grenzen gelten gleichzeitig, die kleinere zählt:

- **Grenze 1 – Empfänger:** die Zahl der Empfänger mit belegter Rechtsgrundlage, die nicht auf der Sperrliste stehen. Heute: 0.
- **Grenze 2 – Aufwärmen:** die Obergrenze der Tabelle.

Die Obergrenzen der ersten Woche folgen der Tabelle von Resend für neue Domains. Die Wochen 2 bis 4 sind ein **eigener, vorsichtiger Vorschlag**: Resend veröffentlicht nur sieben Tage und weist darauf hin, dass jeder Absender einen eigenen Plan braucht. Die Zahlen bleiben bewusst unter der Kontogrenze von 1.000 Kontakten.

| Tag | Obergrenze Mails je Tag | Obergrenze je Stunde | Herkunft |
|---|---|---|---|
| 1 | 150 | 25 (eigener Vorschlag) | Resend, neue Domain |
| 2 | 250 | 40 (eigener Vorschlag) | Resend |
| 3 | 400 | 50 (eigener Vorschlag) | Resend |
| 4 | 700 | 50 | Resend |
| 5 | 1.000 | 75 | Resend |
| 6 und 7 | kein Versand (Wochenende, B2B) | – | eigener Vorschlag |
| 8 bis 14 (Woche 2) | 1.000 an höchstens drei Werktagen | 100 | eigener Vorschlag; begrenzt durch 1.000 Kontakte |
| 15 bis 21 (Woche 3) | 1.000 an höchstens drei Werktagen | 150 | eigener Vorschlag |
| 22 bis 28 (Woche 4) | 1.000 an höchstens drei Werktagen | 150 | eigener Vorschlag |

### Was davon realistisch eintritt

Die Liste entsteht erst durch Anmeldungen. Wie schnell sie wächst, ist nicht gemessen und wird hier nicht geschätzt. Die realistische Erwartung für die ersten vier Wochen ist deshalb:

| Woche | Was tatsächlich versendet wird | Menge |
|---|---|---|
| 1 | Bestätigungsmails und Willkommensmails an neue Anmeldungen (Einzelversand, je Anmeldung eine) | so viele, wie sich anmelden |
| 2 | wie Woche 1; erste Informationsmail (Vorlage c) an alle bis dahin Bestätigten | Zahl der Bestätigten, voraussichtlich weit unter der Obergrenze |
| 3 | wie Woche 1; keine weitere Kampagne, Auswertung der ersten | – |
| 4 | zweite Informationsmail an alle Bestätigten | Zahl der Bestätigten |

Bei so kleinen Mengen ist das Aufwärmen kein Engpass. Der Engpass ist der Aufbau der Liste. Das Aufwärmen wird erst zur Frage, wenn die Liste über einige hundert bestätigte Empfänger wächst oder an die Kontogrenze stößt; dann ist zuerst der Tarif zu klären (Frage F-7).

Regeln für den Versand:

1. Eine Kampagne je Woche als Obergrenze, bis der Inhaber einen Rhythmus festgelegt hat. Der Rhythmus steht dann auch im Einwilligungstext.
2. Versand an Werktagen, verteilt über mehrere Stunden, nicht in einem Stoß.
3. Die nächste Stufe gilt nur, wenn die vorige ohne Abbruchkriterium geblieben ist. Nach einer Pause von mehr als zwei Wochen beginnt die Staffel eine Stufe tiefer.
4. Kein Zukauf von „Aufwärmdiensten“, die Öffnungen künstlich erzeugen; Resend rät davon ab.
5. Jede Kampagne wird mit Datum, Vorlage, Empfängerzahl und Quoten festgehalten (Voraussetzungen, N-2 und N-3).

## 4. Abbruchkriterien

Grenzwerte des Anbieters, bezogen auf das Konto (Resend-Richtlinie, Stand 13.10.2026; gleichlautend in „Warming up“ und „Account Quotas and Limits“):

| Kennzahl | Grenze des Anbieters | Folge laut Anbieter |
|---|---|---|
| Beschwerdequote (Empfänger meldet die Mail als Spam) | muss **unter 0,08 %** liegen | Versandpause möglich; das Konto kann ohne Vorwarnung geschlossen werden |
| Rückläuferquote (unzustellbar) | muss **unter 4 %** liegen | wie oben |
| Abmeldung | reibungslos; Umsetzung binnen 7 Tagen (Richtlinie), Wirkung binnen 48 Stunden (Dokumentation zu den Kopfzeilen) | – |

Eigene Schwellen, bewusst strenger, weil bei kleinen Mengen eine einzige Beschwerde die Quote sprengt (eine Beschwerde auf 150 Mails sind 0,67 %; die Grenze von 0,08 % entspricht einer Beschwerde auf 1.250 Mails):

| Ereignis | Sofortmaßnahme | Weiter erst, wenn |
|---|---|---|
| **Jede einzelne Beschwerde**, solange insgesamt weniger als 5.000 Mails versendet sind | Kampagnenversand anhalten; Empfänger auf die Sperrliste | Herkunft der Adresse und Einwilligungsbeleg geprüft; Ursache benannt; Inhaber gibt frei |
| Beschwerdequote einer Kampagne ab 0,05 % | anhalten | wie oben |
| Rückläuferquote einer Kampagne ab 2 % | anhalten; harte Rückläufer auf die Sperrliste | Ursache benannt (Tippfehler bei der Anmeldung, veraltete Adressen); die Bestätigungsmail filtert Tippfehler vorab |
| Rückläuferquote ab 4 % oder Beschwerdequote ab 0,08 % | **Stopp aller Kampagnen**, Meldung an den Inhaber am selben Tag | schriftliche Freigabe des Inhabers nach Ursachenklärung |
| Hinweis oder Warnung von Resend zum Konto | Stopp aller Kampagnen | Klärung mit Resend |
| Abmeldung oder Widerspruch wurde nicht binnen eines Werktags wirksam | anhalten | Abmeldeweg repariert und mit Test belegt |
| SPF, DKIM oder DMARC der Marketing-Subdomain schlägt in einer Testmail fehl | kein Versand | DNS berichtigt und gemessen |
| Eine Adresse ohne Beleg der Rechtsgrundlage steht in der Empfängerliste | kein Versand an diese Liste | Liste bereinigt, Ursache benannt |

Transaktionsmails laufen bei einem Kampagnenstopp weiter.

## 5. Abgleich mit dem vorhandenen Zielbild

`config/versand.json` (Stand 28.09.2026) nennt eine Aufwärmstaffel von 50 bis 5.000 Mails je Tag und als Grenzen 0,3 % Beschwerden und 5 % Rückläufer. Diese Grenzen sind lockerer als die des Anbieters (0,08 % und 4 %). Maßgeblich ist der strengere Wert. Die Datei wurde nicht geändert; sie nachzuführen ist eine eigene Aufgabe für den Zweig, der den Kampagnenweg baut (Register OA-106).

## 6. Quellen

Abruf: 14.11.2026.

- Resend, „Warming up“: <https://resend.com/docs/knowledge-base/warming-up> (Tagesmengen für neue und bestehende Domains; Rückläufer unter 4 %, Beschwerden unter 0,08 %; bei steigenden Quoten verlangsamen und Ursache klären; kein künstliches Aufwärmen).
- Resend, Richtlinie zur zulässigen Nutzung: <https://resend.com/legal/acceptable-use> (Stand laut Seite 13.10.2026).
- Resend, „Account Quotas and Limits“: <https://resend.com/docs/knowledge-base/account-quotas-and-limits>.
- Resend, „Domains“: <https://resend.com/docs/dashboard/domains/introduction> (Subdomains, getrennte Reputation).
- Resend, Abmelde-Kopfzeilen: <https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails>.
- Resend, „Deliverability Insights“: <https://resend.com/docs/dashboard/emails/deliverability-insights>.
- Messung des eigenen Kontos und der DNS-Einträge: `docs/04-betrieb/mailversand-zustand-2026-11-14.md`.

Nicht belegt: Wie Postfachanbieter die Domains heute einstufen (dafür gibt es keinen Messzugang), und wie schnell die Liste wächst.

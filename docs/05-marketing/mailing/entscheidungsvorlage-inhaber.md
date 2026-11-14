# Entscheidungsvorlage: Kundenmailings über Resend „ab morgen“ · 14.11.2026

Für: Pascal Courbois. Von: Arbeitspaket E (Register der offenen Arbeiten). **Keine Rechtsberatung.** Die Vorlage benennt, was möglich ist, was es voraussetzt und was es riskiert. Es wurde nichts versendet und im Resend-Konto nichts angelegt oder geändert.

Belege: `voraussetzungen-vor-dem-ersten-versand.md` (Prüfliste mit Quellen), `docs/04-betrieb/mailversand-zustand-2026-11-14.md` (Messung), `aufwaermplan.md` (Mengen), `vorlagen/` (Entwürfe).

---

## 1. Die Antwort vorweg

**Ein Mailing an eine Liste ist morgen nicht sauber möglich.** Nicht wegen der Technik, sondern weil es keinen einzigen Empfänger mit belegter Rechtsgrundlage gibt.

**Der früheste saubere Versand ist die erste Mail an Menschen, die sich selbst angemeldet und per Bestätigungsmail bestätigt haben.** Morgen kann der Aufbau dafür beginnen. Wann die erste Kampagne hinausgeht, hängt an Ihren Entscheidungen unten (Abschnitt 5) und daran, wie schnell der Anmeldeweg gebaut und geprüft ist – nicht an Resend.

**Was „50K“ wirklich heißt:** Das Konto erlaubt 50.000 Mails im Monat. Für Kampagnen fasst es aber höchstens **1.000 Kontakte** (gemessen: 1 von 1.000). 50.000 verschiedene Empfänger sind mit diesem Konto nicht adressierbar, unabhängig von jeder Rechtsfrage.

## 2. Der Stand in sieben Zahlen

| Was | Stand am 14.11.2026 |
|---|---|
| Empfänger mit belegter Einwilligung | 0 |
| Bestandskunden, nach § 7 Abs. 3 UWG einzeln geprüft | 0 |
| Kontakte im Resend-Konto | 1 (ohne Nachweis), Grenze 1.000 |
| Versendete Kampagnen | 0 |
| Abmeldethemen | 0 |
| Verifizierte eigene Absenderdomain | 1 (`nexifyai.cloud`, trägt die Transaktionsmails); `nexifyai.de` steht auf „failed“ |
| Anmeldeweg, Einwilligungsnachweis, Sperrliste, Abmeldeweg im eigenen Code | keiner |

## 3. Die drei Wege für „ab morgen“

### Weg (i): Nichts versenden, Einwilligungsweg live schalten, Liste aufbauen

**Was morgen beginnt:** Anmeldeformular auf der Website mit eigenem Einwilligungstext, Bestätigungsmail, Speicherung des Nachweises, Abmeldung mit einem Klick, eigene Marketing-Subdomain, ein Abmeldethema. Danach die Willkommensmail und die erste Informationsmail an die Bestätigten.

| | |
|---|---|
| Rechtliches Risiko | **niedrig**, wenn die Punkte der Prüfliste erfüllt und die Texte freigegeben sind |
| Risiko für das Resend-Konto | **niedrig** – entspricht genau dem, was die Richtlinie verlangt |
| Wirkung morgen | keine Mail an Interessenten; sichtbar wird ein Anmeldefeld |
| Wirkung danach | eine Liste, die Ihnen gehört, mit Nachweis je Empfänger; wächst mit dem Besuch der Seite |
| Was es braucht | Ihre Antworten auf F-1 bis F-7; Freigabe der Texte; DNS-Einträge durch Sie; Bau und Test des Anmeldewegs (Register OA-003, OA-104, OA-106) |
| Offene Abhängigkeit | Speicherort des Nachweises: Zielbild ist die eigene Supabase-Instanz (Register OA-029). Bis sie steht, braucht es eine Übergangslösung oder der Anmeldeweg wartet. |
| Ehrliche Grenze | Die Seiten sind auf „noindex“ gestellt. Ohne Besucher keine Anmeldungen. Der Listenaufbau braucht Reichweite aus Abschnitt 4. |

**Empfehlung: diesen Weg wählen.** Er ist der einzige, der zu einem wiederholbaren Mailing führt.

### Weg (ii): Einzelne Mails an von Ihnen geprüfte Bestandskunden (§ 7 Abs. 3 UWG)

**Was es ist:** Sie gehen Ihre Kunden einzeln durch. Nur wer alle vier Voraussetzungen erfüllt, erhält eine Einzelmail zu einer ähnlichen eigenen Leistung (Entwurf: `vorlagen/d-bestandskunden.md`).

Die vier Voraussetzungen, alle zugleich:

1. Sie haben die Adresse **vom Kunden selbst im Zusammenhang mit einem Auftrag** erhalten.
2. Sie bewerben **eigene, ähnliche** Leistungen.
3. Der Kunde hat **nicht widersprochen**.
4. Der Kunde wurde **schon bei der Erhebung der Adresse** und wird **bei jeder Mail** klar auf sein Widerspruchsrecht hingewiesen.

| | |
|---|---|
| Rechtliches Risiko | **mittel bis hoch, je nach Beleg zu Punkt 4.** Im Repository ist für keinen Kunden belegt, dass der Hinweis bei der Erhebung erfolgte. Ohne diesen Beleg trägt die Ausnahme nicht, und er lässt sich nicht nachholen. |
| Risiko für das Resend-Konto | **niedrig bei wenigen Einzelmails**, aber: Die Richtlinie von Resend verlangt für alle Mails eine ausdrückliche Anmeldung. Die gesetzliche Ausnahme für Bestandskunden ist dort nicht erwähnt. Ob Resend solche Mails als zulässig ansieht, ist nicht belegt. Vorsichtiger ist der Versand aus Ihrem eigenen Postfach. |
| Wirkung morgen | möglich – aber nur für Kunden, für die **Sie** alle vier Punkte belegen können. Nach heutiger Beleglage ist das möglicherweise niemand. |
| Was es braucht | Ihre Liste mit Auftrag, Datum, Herkunft der Adresse und Beleg des Hinweises (F-2); geklärte Anbieterangaben (F-1); einen Weg, Widersprüche festzuhalten |
| Ehrliche Grenze | Das ist kein Mailing, sondern Kundenpflege in kleiner Zahl. |

Davon zu unterscheiden und weiter möglich: die gewöhnliche Antwort an einen Kunden im laufenden Auftrag oder auf dessen Anfrage. Das ist keine Werbung im Sinn dieser Vorlage, solange sie nicht zum Werbeträger umgebaut wird.

**Empfehlung:** nur ergänzend zu Weg (i), nur nach Ihrer Einzelprüfung und nach anwaltlicher Bestätigung von Punkt 2 und 4. Für die Zukunft den Widerspruchshinweis in Angebote und Formulare aufnehmen, damit neue Kunden unter die Ausnahme fallen können.

### Weg (iii): Kaltansprache per E-Mail an gesammelte Adressen

> **Unzulässig und kontogefährdend. Nicht umsetzen.**

| | |
|---|---|
| Gesetz | § 7 Abs. 2 Nr. 2 UWG: Werbung per elektronischer Post ohne vorherige ausdrückliche Einwilligung gilt stets als unzumutbare Belästigung. Das gilt auch gegenüber Unternehmen. |
| Datenschutz | Für gesammelte Adressen fehlen Rechtsgrundlage, Information nach Art. 14 DSGVO samt Quelle und Sperrliste (Register OA-006). |
| Resend | Die Richtlinie untersagt unverlangte Nachrichten und nennt ausdrücklich Kaltansprache, gekaufte Listen und gesammelte Kontaktdaten. Grenzen: Beschwerden unter 0,08 %, Rückläufer unter 4 %. Bei Überschreitung kann das Konto ohne Vorwarnung geschlossen werden. |
| Was dann ausfällt | Die Anfrage- und Terminbestätigungen der Website und der Mailversand über zwei Domains eines Kundenprojekts liegen im selben Konto. |
| Rechnung | 0,08 % entspricht einer Beschwerde auf 1.250 Mails. Ein Kaltmailing überschreitet das mit den ersten Empfängern. |
| Eigene Regel | Das ältere Marketingkonzept schließt es aus: „keine E-Mail- oder Telefon-Kaltakquise ohne Einwilligung“ (`docs/01-konzept/NeXify-Marketingkonzept.md`, Zeile 91). Das Vorgängerprojekt hat die Kaltakquise im August 2026 aus diesem Grund gestoppt (Register OA-006). |
| Mögliche Folgen | Abmahnung und Unterlassungsanspruch durch Empfänger, Mitbewerber oder Verbände; Beschwerde bei der Aufsichtsbehörde; Verlust des Versandkontos. Höhe und Wahrscheinlichkeit sind hier nicht bewertet – das ist Sache der Rechtsberatung. |

Der Wechsel zu einem anderen Versanddienst ändert daran nichts: Die gesetzliche Regel gilt unabhängig vom Anbieter.

## 4. Wie Sie neue Kunden ohne E-Mail-Erstansprache erreichen

Was die eigenen Konzepte vorsehen (`docs/01-konzept/NeXify-Marketingkonzept.md`, Abschnitt 6; `docs/05-marketing/gesamtkonzept-2026-11-14.md`, Abschnitt 7):

| Kanal | Im Konzept | Zulässigkeit, soweit hier geprüft | Vorbehalt |
|---|---|---|---|
| **Website mit Anmeldeformular und Kontaktweg** | Hauptkanal; jede Seite führt zu „Vorhaben schildern“ | Die Anmeldung ist der Einwilligungsweg aus Weg (i). | Indexierung ist aus; Anmeldeweg fehlt. |
| **Inhalte (Wissensbereich)** mit Anmeldemöglichkeit | „Wissenshub“ im älteren Konzept; Seiten `/wissen` und `/wissen/projekt-vorbereiten` bestehen | wie oben | Reichweite entsteht erst mit Indexierung oder Verbreitung über andere Kanäle. |
| **LinkedIn, von Ihnen persönlich** | im älteren Konzept als Kanal für Vertrauen vorgesehen | Beiträge im eigenen Profil sind keine elektronische Post. **Direktnachrichten an Unbekannte mit Werbung** sind hier nicht geprüft; sie können unter dieselbe Regel wie E-Mail fallen. | Beiträge ja; Massen-Direktnachrichten nein, bis anwaltlich geklärt. Keine erfundenen Kennzahlen oder Referenzen. |
| **Partnernetz** (Werkstätten bei TEILEKLAR, Agenturen) | im älteren Konzept vorgesehen | Ansprache über bestehende persönliche Kontakte | Auch hier keine Werbemail ohne Einwilligung. |
| **Anzeigen** (Suche, soziale Netze) | Das neue Konzept führt „Wachstum & Kampagnen“ als Leistung; das ältere sagt für die eigene Werbung: „Kein bezahlter Kanal, bevor Angebotsquote und Zeit bis zum Start gemessen sind.“ | Anzeigen sind keine elektronische Post; § 7 Abs. 2 Nr. 2 UWG betrifft sie nicht. | Budgetentscheidung liegt bei Ihnen; die ältere Regel müsste ausdrücklich aufgehoben werden. Zielseite braucht den Anmelde- oder Kontaktweg. |
| **Briefpost** | in keinem der beiden Konzepte; im Register (OA-006) als Kandidat genannt | Fällt nicht unter § 7 Abs. 2 Nr. 2 UWG (dort: Anrufmaschinen, Fax, elektronische Post). Werbung gegen den erkennbaren Willen des Empfängers bleibt nach § 7 Abs. 1 unzulässig. | Für die Adressen braucht es trotzdem eine Rechtsgrundlage nach der DSGVO, die Information nach Art. 14 mit Quelle und die Beachtung von Widersprüchen. Nicht abschließend geprüft. |
| **Anruf bei Unternehmen** | **vom älteren Konzept ausgeschlossen** („keine E-Mail- oder Telefon-Kaltakquise ohne Einwilligung“) | § 7 Abs. 2 Nr. 1 UWG lässt Werbeanrufe gegenüber sonstigen Marktteilnehmern (also nicht Verbrauchern) bei „zumindest mutmaßlicher Einwilligung“ zu (gelesen über dejure.org, 14.11.2026). | **Nur mit anwaltlicher Klärung.** Wann eine mutmaßliche Einwilligung vorliegt, ist eine Frage des Einzelfalls und der Rechtsprechung; die wurde hier nicht geprüft. Ein allgemeines Interesse an der Leistung reicht nicht ohne Weiteres. Für Empfänger außerhalb Deutschlands gilt möglicherweise strengeres Recht. Bei Einzelunternehmern ist die Abgrenzung zum Verbraucher heikel. Die eigene Konzeptregel müsste ausdrücklich geändert werden. |
| **Kontaktformular eines fremden Betriebs** | im Register (OA-006) als Kandidat genannt | nicht geprüft; eine Werbenachricht über ein fremdes Formular kann wie elektronische Post behandelt werden | nicht nutzen, bis anwaltlich geklärt |
| **WhatsApp Business** | im älteren Konzept „nach Meta-Verifizierung, nur geschäftlich“ für Rückfragen | Erstansprache mit Werbung ist elektronische Post im weiten Sinn | nur für Rückfragen bestehender Kontakte |

Kurz: Sicher sind die Kanäle, bei denen der Interessent den ersten Schritt macht oder die Werbung öffentlich sieht. Unsicher ist alles, was einer unbekannten Person eine Nachricht zustellt.

## 5. Fragen, die nur Sie beantworten können

| Nr. | Frage | Warum sie sperrt | Nächster Schritt |
|---|---|---|---|
| **F-1** | **Rechtsform und Anbieterangaben:** Welche Rechtsform gilt – die im Impressum genannte Eenmanszaak oder die „B.V.“ aus `apps/site/src/Auth.tsx`? Liegt ein aktueller Registerauszug vor? | Jede Werbemail braucht die Anbieterangaben; falsche Angaben machen sie angreifbar (Register OA-008, OA-009). Solange offen, wird keine Vorlage verwendet. | Registerauszug bereitstellen; eine Angabe für Impressum, Anmeldung, Mailfuß und Rechnung festlegen. |
| **F-2** | **Bestandskunden mit Nachweis:** Welche Kunden gibt es, mit welchem Auftrag und Datum? Woher stammt je die Adresse? Wo und wann wurde der Hinweis auf das Widerspruchsrecht gegeben? Hat jemand der Werbung widersprochen? | Ohne diese Liste gibt es Weg (ii) nicht (Register OA-002). | Liste führen; Kunden ohne Beleg streichen. |
| **F-3** | **Absender- und Antwortadresse:** Von welcher Adresse kommen Mailings, wohin gehen Antworten und Widersprüche, und wer liest das Postfach? Das Impressum, `AGENTS.md` und die Transaktionsmails nennen drei verschiedene Adressen. | Absenderkennung und gültige Abmeldeadresse sind Pflicht; Widersprüche per Antwort müssen ankommen. | Eine Kontaktadresse festlegen. |
| **F-4** | **Anwaltliche Prüfung:** Beauftragen Sie die Prüfung von Einwilligungstext, Datenschutzabschnitt zu Direktwerbung, Mailfuß und Bestandskunden-Mail – und die Einordnung, welches Recht für Empfänger in DE, NL, BE, LU und AT gilt (Sitz in Venlo)? | Rechtstexte ändert kein Agent (D-017). Das Recht der Empfängerländer außer Deutschland ist nicht geprüft (Register OA-001, OA-004, OA-007, OA-012). | Auftrag an die Rechtsberatung mit den vier Entwürfen aus `vorlagen/` und der Prüfliste. |
| **F-5** | **Absenderdomain:** Welche Domain trägt die Mailings – eine Subdomain von `nexifyai.de` oder von `nexifyai.cloud`? Setzen Sie die DNS-Einträge, und klären Sie die zwei Befunde der Messung (Rücklaufpfad von `nexifyai.cloud` nicht auffindbar; `nexifyai.de` bei Resend „failed“)? | Ohne verifizierte Domain kein Versand; DNS setzt nur der Inhaber. | Entscheidung, dann Einrichtung nach `aufwaermplan.md`, Abschnitt 1. |
| **F-6** | **Ein Konto oder zwei:** Bleiben Mailings im selben Resend-Konto wie die Transaktionsmails der Website und die Domains des Kundenprojekts, oder bekommt Marketing ein eigenes Konto? | Eine Sperre trifft sonst Unbeteiligte. Ein zweites Konto kostet gegebenenfalls zusätzlich. | Entscheidung; Kosten beim Anbieter erfragen. |
| **F-7** | **Erwartung an die Menge:** Was genau deckt Ihr Vertrag ab – das Mailkontingent (50.000 je Monat, gemessen) oder auch mehr als 1.000 Kontakte für Kampagnen? Welche Listengröße erwarten Sie in drei Monaten? | Das Konto zeigt eine Grenze von 1.000 Kontakten. Vertragsunterlagen liegen im Repository nicht vor. | Tarif im Resend-Konto prüfen. |
| **F-8** | **Inhalt und Rhythmus:** Wie oft schreiben Sie, zu welchen Themen? Geben Sie die vier Entwürfe frei oder ändern Sie sie? | Der Rhythmus gehört in den Einwilligungstext; jeder Text braucht Ihre Freigabe. | Entwürfe lesen, Änderungen nennen. |
| **F-9** | **Messung von Öffnungen und Klicks:** Soll sie für Mailings eingeschaltet werden? | Sie kann eine eigene Einwilligung erfordern; bis zur Klärung bleibt sie aus. | Mit F-4 klären. |
| **F-10** | **Regel gegen gesammelte Adressen:** Bestätigen Sie schriftlich, dass keine gekauften oder gesammelten Adressen in das Resend-Konto geladen werden? | Schützt das Konto und bindet alle Agenten (Register OA-005). | Ein Satz in `DECISIONS.md`, nach Ihrer Entscheidung von der koordinierenden Sitzung eingetragen. |
| **F-11** | **Altbestand im Konto:** Woher stammt der eine vorhandene Kontakt? Sollen die fünf Segmente und sechs Vorlagen vom August 2026 bleiben? | Der Kontakt hat keinen Nachweis; die Vorlagen sind ungeprüft und älter als das aktuelle Konzept. | Sichtung durch Sie; bis dahin nichts davon verwenden. |

## 6. Reihenfolge, wenn Sie Weg (i) wählen

| Schritt | Wer | Hängt ab von |
|---|---|---|
| 1. F-1 und F-3 beantworten, Registerauszug bereitstellen | Inhaber | – |
| 2. Texte an die Rechtsberatung geben | Inhaber | F-4 |
| 3. Domain entscheiden, bei Resend anlegen, DNS setzen | Inhaber | F-5, F-6 |
| 4. Anmeldeweg mit Bestätigungsmail, Nachweis, Sperrliste und Abmeldung bauen und testen | Agent, in eigenem Zweig | Schritt 1; Speicherort (OA-029) |
| 5. Datenschutzabschnitt und Einwilligungstext einsetzen | Agent, nach Freigabe | Schritt 2 |
| 6. Testmail an eigene Adresse: Kopfzeilen, SPF/DKIM/DMARC, Abmeldung führt zur Sperre | Agent, nach Freigabe | Schritte 3 bis 5 |
| 7. Anmeldung live; Willkommensmail aktiv | Agent nach Ihrer Freigabe | Schritt 6 |
| 8. Erste Informationsmail an alle Bestätigten | Inhaber gibt frei, Agent löst aus | Schritt 7; mindestens ein bestätigter Empfänger |

Ein Datum steht hier bewusst nicht: Es hängt an den Schritten 1 bis 3, die bei Ihnen liegen, und an der Rückmeldung der Rechtsberatung.

## 7. Was diese Vorlage nicht leistet

- Sie ersetzt keine anwaltliche Prüfung.
- Geprüft wurden deutsches Recht (UWG, DDG) und die DSGVO anhand nichtamtlicher Gesetzessammlungen, weil die amtliche Seite am 14.11.2026 nicht erreichbar war. Rechtsprechung wurde nicht ausgewertet.
- Das Recht der Niederlande und der übrigen Zielländer wurde nicht geprüft.
- Vertragsunterlagen zum Resend-Tarif lagen nicht vor; ausgewertet wurde nur, was das Konto selbst anzeigt.

# Lücken der Textvorlage 14.11.2026

Hier stehen alle Bausteine, die mangels Beleg nicht oder nur unter Vorbehalt geschrieben wurden – mit der Entscheidung, die sie möglich macht. Nichts davon wurde gefüllt, um eine Seite voll aussehen zu lassen.

Die Kürzel EV-01 bis EV-20 verweisen auf die Entscheidungsvorlagen in `docs/konzept/2026-11-14/00-gesamtkonzept.md`, Abschnitt 6. „B01 4.1“ meint die Liste in `docs/konzept/2026-11-14/01-marke-marketing.md`, Abschnitt 4.1. Wer entscheidet, ist in jeder Zeile der Inhaber, sofern nichts anderes dasteht.

Drei Arten:

- **nicht geschrieben** – der Baustein fehlt.
- **unter Vorbehalt geschrieben** – der Text liegt vor, darf aber erst nach der Entscheidung verwendet werden.
- **Platzhalter** – der Text liegt vor, eine Angabe darin fehlt.

---

## Übersicht

| Nr. | Baustein | Art | Was fehlt | Nötige Entscheidung |
|---|---|---|---|---|
| L-01 | `home.hero.body`, `film.hero`: „höchste Qualität zu einem fairen Preis“ | unter Vorbehalt geschrieben | Ein Beleg für den Superlativ und für „fair“ (Vergleich, Preis). Im Repository gibt es keinen. Der Satz steht als Anspruch des Inhabers; die Ausweichfassung `home.hero.body.belegt` kommt ohne ihn aus. | EV-18: Soll der Anspruch als geschriebene Aussage stehen? Der Filmtext ist vom Inhaber festgelegt. |
| L-02 | `home.budget.rate`; jede Preisangabe auf Startseite, „Kosten & Ablauf“, Produktseiten | nicht geschrieben | Ein freigegebener Betrag. `config/fakten.json` führt einen Tagessatz, der für die neue Preisseite nicht freigegeben ist. | EV-11: Welche Preise dürfen öffentlich stehen? |
| L-03 | Kürzungsregel für den vollen Namen: Seitentitel, Schaltflächen, Alt-Texte, Sprecherzeile im Chat (`home.gallery.*.alt`, `chat.speaker.system`) | unter Vorbehalt geschrieben | Eine festgelegte Zweitform oder die ausdrückliche Entscheidung, dass es keine gibt. Die Vorlage setzt überall den vollen Namen; an engen Stellen wird das lang. | EV-04: Endform des Namens und Kürzungsregel. EV-19: Markenrecherche. |
| L-04 | `home.footer.legal.notice`; Signatur mit Pflichtangaben in allen Mails (`account.*.mail`, `tk.request.mail`, `mail.intro`); Impressum | nicht geschrieben | Bestätigter Rechtsträger, Anschrift, Register, vertretungsberechtigte Person. Die Vorlage nennt nur „NeXify AI FACTORY“ und die Kontaktadresse. | EV-05: Rechtsträger. EV-07: Rechtstexte. |
| L-05 | `chat.ai.notice`, `chat.ai.data`, `chat.ai.self`, Selbstbezeichnung in `chat.greeting` | unter Vorbehalt geschrieben | Die Entscheidung, ob und wo die KI-Kennzeichnung im öffentlichen Chat sichtbar ist. D-010 hat sie entfernt, `AGENTS.md` verlangt sie. | EV-08: KI-Kennzeichnung je Kanal, nach rechtlicher Prüfung. |
| L-06 | `chat.ai.data`: `{{datenempfaenger}}` | Platzhalter | Der tatsächliche, rechtlich geprüfte Empfänger der Chat-Nachrichten. Der Bestand nennt einen Empfänger, der dem Datenweg nicht entspricht. | EV-07, EV-09: Datenweg, Auftragsverarbeitung, Datenschutztext. Rechtlich zu prüfen. |
| L-07 | `product.suite.features`, `product.agentic.availability`, `account.stage.functions`; Satz „was davon heute bereitsteht“ in `home.products.body` | nicht geschrieben | Eine verbindliche Liste dessen, was je Produkt heute nutzbar ist. Ohne sie kein „Das bekommen Sie“. | B01 4.1 Nr. 11: Was ist tatsächlich nutzbar? Dazu EV-11, EV-17. |
| L-08 | Name und Test der Suite (`product.suite.*`, `account.stage.point.3`) | unter Vorbehalt geschrieben | Die Bestätigung, dass „NeX & AIFly ORACLE Suite“ die bisherige „NeX2fly Suite“ ersetzt, und dass der Test über 24 Stunden bleibt. Aussagen zu Testguthaben und Abbuchung fehlen ganz. | EV-20: Produktnamen. EV-11: Abo-Stufen, Test, Preise. |
| L-09 | `product.intelligence.long` | nicht geschrieben | Was „NeXify AI Intelligence“ umfasst. Im Repository steht der Begriff nur im vollen Namen. | EV-14: Bedeutung in einem Satz. EV-18: Aussagen zur Leistung nur mit Beleg. |
| L-10 | `product.api.pricing`, `product.api.docs`; Name „NeXify API“ gegenüber „NeXify AI API“ in `config/fakten.json` | nicht geschrieben | Preis, Aufschlag, Steuerbehandlung, Funktionsliste, Entwicklerdokumentation; welche Namensform gilt. | E1, E4 (`config/fakten.json`, `offen`); Abgleich des Namens mit der Faktenquelle. |
| L-11 | `product.teileklar.seller`; Lieferländer, Versand, Rückgabe, Slogan | nicht geschrieben | Wer verkauft; ob der Verkauf aktiv ist; ob der Slogan und der Name des Lieferanten erscheinen. | EV-05, EV-20; B01 4.1 Nr. 13. |
| L-12 | `account.stage.terms`: Zustimmungszeile bei der Registrierung; Felder für Firmenangaben | nicht geschrieben | Die Texte, denen zugestimmt wird, und der Kundenkreis (nur Unternehmen oder auch Verbraucher). | EV-07: Vertragsgrundlagen, Datenschutz. EV-10: Kundenkreis. |
| L-13 | `tk.partner.cost`, `tk.partner.faq.cost`: Kostenaussage für Werkstätten | nicht geschrieben | Was für Werkstätten kostenfrei ist, ob es eine Gebühr gibt, was ein Direktpartner ist. Keine Quelle trägt eine Aussage. | EV-13. Danach Fakt in `config/fakten.json`. |
| L-14 | `tk.partner.faq.criteria`; Fristen und feste Ablehnungsgründe im Status des Partnerantrags (`{{grund}}`) | nicht geschrieben · Platzhalter | Prüfkriterien, Zuständigkeit, Bearbeitungszeit. | EV-13 (Kriterien, wer aufnimmt). |
| L-15 | Seitentitel und Beschreibung der Startseite für Suchmaschinen | nicht geschrieben | Ob die regionale Aussage „Venlo, Limburg und NRW“ ein festes Merkmal ist; ob der Claim im Titel steht. | B01 4.1 Nr. 17 und 18. |
| L-16 | `account.verify.mail`: `{{gueltigkeit}}` | Platzhalter | Die Dauer, für die der Bestätigungslink gilt. Der Baustein wird gerade gebaut. | Technische Festlegung im Suite-Fundament; keine Inhaberentscheidung nötig. |
| L-17 | `account.signup.google` | unter Vorbehalt geschrieben | Ob die Anmeldung über Google bleibt. Sie hängt an einem fremden Dienst. | R-19 im Gesamtkonzept. |
| L-18 | Gesprochene Filmfassungen in NL, FR, EN; Ausspracheblatt; Verbleib der Begrüßung zu dritt | nicht geschrieben | Aussprache der Namen; Freigabe je Stimme und Person; ob NeX und das KI-System weiter eine eigene Begrüßung haben. | EV-20 (Sprachen); Charakterbibel §7 (Stimme nur mit Freigabe). |
| L-19 | Redaktionsplan, Profiltexte, Newsletter; Abmeldehinweis in `mail.intro` | nicht geschrieben | Welche Profile es gibt, wer sie bespielt, auf welcher Rechtsgrundlage werblich versendet wird. | B01 4.1 Nr. 16; `AGENTS.md` (Werbeversand nur mit Rechtsgrundlage, Abmeldung, Sperrliste). |
| L-20 | Unternehmens- und Inhaberprofil; Referenzen, Kundenstimmen, Zahlen | nicht geschrieben | Jeder Beleg. Es gibt keine freigegebenen Referenzen, Zahlen oder Angaben zur Person. | B01 4.1 Nr. 12. |
| L-21 | Zusage einer Rückmeldung oder Antwortzeit (Chat-Rückfall, Kontakt, Partneranfrage); `tk.partner.sent.followup`, `tk.request.sent.forwarded` | unter Vorbehalt geschrieben | Ein eingerichteter und geprüfter Weg, auf dem Anfragen bei einem Menschen ankommen, und eine Antwortzeit, die Pascal zusagen will. Die Vorlage sagt bis dahin nirgends „wir melden uns“. | Pakete W1-09 und W1-11 (Technik); Antwortzeit: Inhaber. |
| L-22 | Alle Chat-Texte: Voraussetzung „der Chat antwortet mit einem Modell“ | unter Vorbehalt geschrieben | Der Nachweis, dass der öffentliche Chat in der Produktion so läuft. Läuft er nicht, passen Begrüßung und Einleitung nicht; dann gilt nur der Rückfall (`chat.fallback.*`). | EV-06 (Produktionsfundament); B01 4.1 Nr. 4. |

Anzahl: 22 Lücken. Davon 12 nicht geschrieben, 7 unter Vorbehalt geschrieben, 2 Platzhalter, 1 gemischt (L-14).

---

## Was die Lücken gemeinsam haben

Fünf Entscheidungen lösen den größten Teil auf:

1. **EV-11 – Preise.** Solange kein Betrag freigegeben ist, bleibt jede Seite zu Kosten ein Text über den Weg zum Angebot (L-02, L-08, L-10).
2. **B01 4.1 Nr. 11 – Was ist heute nutzbar?** Ohne diese Liste beschreiben die Produkttexte Aufgabe und Vorgehen, nicht den Nutzen im Alltag (L-07, L-22).
3. **EV-05 und EV-07 – Rechtsträger und Rechtstexte.** Davon hängen Fuß, Signaturen, Zustimmungszeilen und der Datenhinweis im Chat ab (L-04, L-06, L-11, L-12).
4. **EV-13 – Werkstätten.** Die Partnerseite hat ohne Kostenaussage und ohne Kriterien ihren stärksten Satz nicht (L-13, L-14).
5. **EV-04 und EV-14 – Name.** Die Kürzungsregel und die Bedeutung von „NeXify AI Intelligence“ (L-03, L-09).

---

## Nicht Teil dieser Vorlage

Diese Bereiche waren nicht beauftragt und sind deshalb keine Lücken im obigen Sinn:

- Chat-Variante für TEILEKLAR.
- Leistungsseiten, Leistungsumfang, Kontakt, Unternehmen, Wissen.
- Shop-Oberfläche von TEILEKLAR und Transaktionsmails des Shops.
- Rechtstexte jeder Art.
- Erklärmodule je Seite (`config/page-explainers.json`).

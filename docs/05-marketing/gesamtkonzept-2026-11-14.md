# Marketing-Gesamtkonzept NeXify AI · 14.11.2026

Status: Arbeitsfassung zur Entscheidung durch den Inhaber Pascal Courbois. Grundlage der Seitentexte in `config/site-map.json` (Stand dieses Zweigs).

Anlass: Die Texte der öffentlichen Seiten waren Dokumentation und Platzhalter, keine Vermarktung. Sie beschrieben, was wohin gehört, und sicherten jede Aussage ab. Dieses Konzept legt fest, wem die Seiten was sagen, womit sie es belegen und wohin sie führen. Die Seitentexte sind daraus abgeleitet.

Aufgebaut auf: `docs/09-final/01-produkt-und-marke.md`, `docs/05-marketing/marketing-psychologie-pruefung.md`, `DECISIONS.md` (D-010, D-011), Entwurfs-PR 119 (Markenarchitektur, Tonalität, Wortliste, Textvorlage, Lückenliste) und Entwurfs-PR 120 (Messplan für Werbeaussagen). Was übernommen wurde und was nicht, steht in Abschnitt 9.

Grundsatz: Es steht nur da, was das Repository belegt. Keine Referenzen, Kundennamen, Zahlen, Auszeichnungen oder Bewertungen, die es nicht gibt.

---

## 1. Zielkunden

| Wer | Lage | Auslöser | Problem in eigenen Worten |
|---|---|---|---|
| **Inhaber und Geschäftsführung kleiner und mittlerer Betriebe** (Dienstleistung, Handwerk, Fertigung, Handel) in NRW, Limburg und den Benelux-Ländern. Keine eigene IT, kein eigenes Marketing. | Der Betrieb läuft, der Auftritt und die Abläufe sind mitgewachsen, nicht geplant. | Neugründung oder Relaunch · Anfragen bleiben aus oder bleiben liegen · ein Vorgang kostet jeden Tag Zeit · eine Kampagne steht an. | „Unsere Website sagt nicht, was wir können.“ · „Das mache ich jeden Tag von Hand.“ · „Ich will nicht drei Dienstleister koordinieren.“ |
| **Betriebe mit Bedarf an Shop, Portal oder App** | Kunden, Partner oder Mitarbeitende arbeiten über E-Mail, Telefon und Listen. | Ein Vorgang wird zu groß für das Postfach. | „Jeder fragt nach dem Stand, und keiner weiß, wo er steht.“ |
| **Technische Ansprechpersonen** (eigene Anwendung, eigenes Team) | Sie wollen KI einbinden, ohne ein Abo je Platz und ohne Blackbox. | Ein konkreter Anwendungsfall im eigenen Produkt. | „Ich brauche eine Schnittstelle und klare Kosten je Nutzung.“ |
| **TEILEKLAR: Fahrerinnen und Fahrer von Auto und Motorrad** (Endkunden; Lieferländer laut `config/fakten.json`: Deutschland, Österreich, Niederlande, Belgien, Luxemburg) | Sie brauchen Zubehör oder ein Teil und wollen keinen Fehlkauf. | Wartung, Defekt, Saisonwechsel. | „Passt das wirklich zu meinem Fahrzeug?“ |
| **TEILEKLAR: Werkstätten** | Kunden bringen Teile mit, Angaben fehlen, Rückfragen kosten Zeit. | Auslastung, neue Kunden aus der Umgebung. | „Ich will Aufträge, bei denen Fahrzeug und Teil schon klar sind.“ |

Hauptmarkt ist Deutschland (`config/site-map.json`, `audience`: Geschäftsziel, keine gemessene Zahl). Niederländisch, Französisch und Englisch tragen dieselben Aussagen.

### Die drei stärksten Einwände

| Einwand | Antwort der Marke | Wo sie steht |
|---|---|---|
| **„Was kostet das, und bleibt es dabei?“** | Vor dem Start gibt es ein Angebot mit abgegrenztem Umfang. Entwicklung, Betreuung danach und externe Kosten stehen getrennt. | Startseite (Kosten und Umfang), `/preise-ablauf`, `/leistungsumfang` |
| **„KI im Betrieb – wer behält die Kontrolle?“** | Wir beginnen mit einem Ablauf. Entscheidungen, Versand und Zahlungen bleiben bei Menschen. Ein Entwurf ist kein Versand. Die KI ist als KI erkennbar. | `/leistungen/agenten-automatisierung`, Produktseiten, `/ki-hinweise` |
| **„Ein Inhaber mit KI-Agenten – wer ist mein Gegenüber, und wo sind die Referenzen?“** | Pascal Courbois ist der Ansprechpartner vom ersten Gespräch bis zur Übergabe. Als Arbeitsprobe dienen der eigene Auftritt und die eigene Marke TEILEKLAR. Kundenreferenzen nennen wir erst, wenn es freigegebene gibt. | `/unternehmen`, Startseite (Zusammenarbeit), `/teileklar` |

---

## 2. Positionierung

**In einem Satz:** NeXify AI ist die Agentur von Pascal Courbois in Venlo, die für Unternehmen in Deutschland, den Niederlanden und im französischsprachigen Raum Websites, Shops, Portale und KI-Abläufe aus einer Hand baut – persönlich geführt, von den eigenen KI-Agenten ausgearbeitet und am eigenen Auftritt vorgeführt.

**Nutzenversprechen:** Sie schildern Ihr Vorhaben in einem Gespräch. Sie bekommen ein Angebot, dessen Umfang Sie vor dem Start kennen. Sie haben einen Ansprechpartner statt mehrerer Dienstleister.

**Betriebsmodell AI FACTORY** (D-011): Pascal gibt Idee, Gestaltung und Richtung vor. Die Agenten NeX und AIFly ORACLE arbeiten aus. Für den Kunden heißt das: ein Mensch, der zuhört und verantwortet, und ein Agententeam, das die Ausarbeitung trägt. Wir sagen nicht, dass das schneller oder günstiger ist als bei anderen – das ist nicht gemessen (Abschnitt 3).

### Abgrenzung

- Kein Baukasten und kein Abo-Zwang: Das Projekt hat einen vereinbarten Umfang und eine Übergabe.
- Kein „Autopilot“: KI übernimmt benannte Schritte, Menschen entscheiden.
- Keine Agentur mit anonymem Team: Der Ansprechpartner hat einen Namen.

---

## 3. Beweisführung

### Was NeXify AI heute belegen kann (aus dem Repository)

| Beleg | Fundstelle | Einsatz |
|---|---|---|
| Der eigene Auftritt: 43 öffentliche Seiten in vier Sprachen, aus einem Bausteinsystem, mit geprüfter Bedienbarkeit bei 360 px | `config/site-map.json`, `tools/live-check.mjs`, `tools/gleichmacher.mjs` | „Was Sie hier sehen, bauen wir auch für Sie.“ Als Arbeitsprobe, nicht als Kundenreferenz. |
| Die eigene Shop-Marke TEILEKLAR mit Katalog, Suche, Warenkorb, Kasse und Werkstattverzeichnis | `apps/web/components/shop/`, `apps/shop-api/` | Arbeitsprobe für Shops und Portale. Einschränkung: Der Shop-Dienst antwortet in der Produktion zurzeit nicht (`AGENTS.md`, 13.11.2026). |
| Der Chat mit AIFly ORACLE auf jeder Seite | `apps/web/components/PublicOrientationChat.tsx`, D-010 | Das eigene Produkt im Einsatz. |
| Ein benannter Inhaber und Ansprechpartner | `config/site-map.json` (Seiten `company`, `imprint`) | Vertrauen durch Person. |
| Die Arbeitsweise: Angebot vor dem Start, drei getrennte Kostenarten, Übergabe, Betreuung als eigener Baustein (NeXify Care) | `config/home-concept-copy.json`, Seiten `pricing`, `scope` | Antwort auf den Kosteneinwand. |
| Die NeX AIFly Suite mit einmaligem Test über 24 Stunden, der erst auf eigene Wahl beginnt | Seite `signup`, `config/selfservice-policy.json` | Geringes Risiko beim Kennenlernen. |
| Tagessatz Entwicklung 449 € netto; API-Aufladung ab 10 € | `config/fakten.json`, `config/api-prepaid.json` | **Nicht öffentlich verwendet**, solange die Preise nicht für die Seiten freigegeben sind (Abschnitt 8, O-1). |

### Was nicht belegt ist und deshalb nicht behauptet wird

| Aussage | Warum nicht |
|---|---|
| Kundenreferenzen, Kundennamen, Logos, Zitate, Bewertungen | Es gibt keine freigegebenen (`AGENTS.md`, „Ehrlich bleiben“). |
| Erfahrungszahlen („80+ Websites“, „15+ Shops“ aus `docs/09-final/01`) | Aggregiert, ohne Nachweis. |
| „Höchste Qualität“, „fairer Preis“, „beste“, „führend“ | Superlativ ohne Vergleich. Im Film sagt Pascal den Satz als seinen Anspruch; im geschriebenen Text steht er nicht mehr als Sachaussage (O-3). |
| Kosteneffizienz oder bessere Ergebnisse der eigenen KI-Kette | Laut Messplan aus PR 120 gibt es keine Messung. |
| Zeit- oder Kostenersparnis beim Kunden, Kennzahlen vorher/nachher | Kein gemessener Fall. Das Beispiel „26 Std. → 4 Min.“ bleibt aus den Seiten heraus. |
| Antwortzeiten, Lieferzeiten, Projektdauer | Keine Zusage des Inhabers, kein geprüfter Zustellweg (PR 119, Lücke L-21). |
| Ranking, Reichweite, Anfragen, Umsatz durch Kampagnen | Nicht zusagbar. |
| Geprüfte Fahrzeugpassung bei TEILEKLAR | Es gibt keine automatische Prüfung gegen einen Fahrzeugkatalog (`FitmentChecklist.tsx`). |
| Online-Terminbuchung, Gutscheine, Batterie-Berater bei TEILEKLAR | Noch nicht verfügbar (`PhaseNotice.tsx`). |
| Konformität mit WCAG oder einer Norm, Zertifikate | Keine Erklärung, kein Zertifikat. |
| Eine Rechtsform des Unternehmens | Ungeklärt (O-4). |

---

## 4. Botschaften

**Leitbotschaft:** Ein Gespräch. Ein Projekt, das passt.
Ausgeschrieben: Sie schildern Ihr Vorhaben, und NeXify AI baut daraus Website, Shop, Portal oder KI-Ablauf – mit einem Umfang, den Sie vor dem Start kennen, und mit Pascal als persönlichem Ansprechpartner.

| Nr. | Stützbotschaft | Beleg |
|---|---|---|
| 1 | **Wir beginnen bei Ihrer Aufgabe.** Nicht bei einer Technik und nicht bei einem Paket von der Stange: bei der Stelle, an der es hakt. | Drei Leistungsfelder, drei Projektpakete, „Wir beginnen bewusst mit einem Ablauf“. |
| 2 | **Pascal begleitet Sie persönlich.** Ein Ansprechpartner vom ersten Gespräch bis zur Übergabe; das Agententeam arbeitet aus. | Seite `company`, D-011. |
| 3 | **Sie wissen vor dem Start, was enthalten ist.** Entwicklung, Betreuung danach und externe Kosten stehen getrennt im Angebot. | Seiten `pricing`, `scope`. |

### Kernaussage je Produkt

| Produkt | Kernaussage | Stand, wie er genannt wird |
|---|---|---|
| NeX AIFly Suite | Ihr eigener Arbeitsbereich, in dem Gespräche, Aufgaben, Dokumente und Projektwissen zusammenbleiben. | Einmaliger Test über 24 Stunden; welche Werkzeuge bereitstehen, zeigt der Arbeitsbereich nach der Aktivierung. |
| NeX Agentic AIFly | Der Agent, der klar umrissene Aufgaben ausführt – mit den Werkzeugen, die Sie zulassen. | Einsatz je Auftrag, im Angebot benannt. |
| AIFly ORACLE | Ordnet Aufgaben, bevor gehandelt wird, und antwortet im Chat dieser Website. | Im Chat erlebbar; Koordination in Kundenprojekten je Auftrag. |
| NeX & AIFly ORACLE (Seite `/produkte/one`) | Zwei Agenten, eine klare Aufgabe: einer ordnet, einer führt aus. | Einsatz je Auftrag. |
| NeXify API | KI-Funktionen von NeXify in Ihrer eigenen Anwendung, abgerechnet nach Nutzung. | Zugang und Tarife zur Freigabe; Einrichtung je Projekt. |
| Skills und MCP | Ihre Arbeitsweisen als wiederverwendbare Bausteine, Ihre Systeme als angebundene Werkzeuge. | Je Projekt geprüft und eingerichtet. |
| Portale | Ein eigener, geschützter Bereich je Nutzergruppe. | Zugang nach Einrichtung. |
| NeXify Care | Betreuung nach der Übergabe als eigener, vereinbarter Baustein. | Preis nicht öffentlich. |
| TEILEKLAR | Zubehör und Teile für Auto und Motorrad, mit klaren Angaben statt Rätselraten. | Eigene Marke; siehe Abschnitt 6. |

---

## 5. Tonalität und Wortwahl

Übernommen aus PR 119 (`docs/marke/markenarchitektur-2026-11-14.md`, Abschnitte 3 und 5) und hier verbindlich für die Seitentexte:

1. **Sie-Form** (nl „u“, fr „vous“, en neutral).
2. **Ein Gedanke je Satz.** Kurze Hauptsätze, das Verb früh.
3. **Konkret statt allgemein.** Die Website, der Vorgang, das Teil – ein Beispiel ersetzt das Adjektiv.
4. **Nutzen zuerst.** Jede Seite beginnt mit dem, was der Leser davon hat.
5. **Eine Bedingung steht einmal, an der richtigen Stelle.** Nicht in jedem Absatz. Auf Seiten mit Fragenblock ist das die Frage „Welche Voraussetzungen und Grenzen gelten?“.
6. **Was es noch nicht gibt, heißt „noch nicht“** – ein Satz, dann der Schritt, der heute möglich ist.
7. **Nichts versprechen, was nicht belegt ist.** Kein Superlativ, keine Zahl ohne Quelle, keine Garantie.
8. **Ein Mensch spricht.** Pascal ist genannt, wo er handelt; „wir“ für die Arbeit.
9. **Ruhig bleiben.** Keine Ausrufezeichen, kein Werbejargon.

### Wörter, die die Marke meidet

| Meiden | Stattdessen |
|---|---|
| Freischaltung, Betriebsstand, Zielbild, vorgesehen, konzipiert, „wird geklärt“, „wird geprüft“ als Dauerformel | sagen, was heute geht, und was im Angebot steht |
| Leistungshaus, Baustein (für Leistungen), Factory als Absender im Fließtext | Leistungen, Pakete, „wir“, NeXify AI |
| Lösungen, innovativ, ganzheitlich, maßgeschneidert, nahtlos | die Sache nennen |
| beste, führend, höchste, einzigartig | weglassen |
| garantiert, sofort, immer, in wenigen Tagen | beschreiben, was vereinbart wird |
| kostenlos, gratis, günstiger als | weglassen, bis der Inhaber es definiert |
| Autopilot, vollautomatisch | sagen, welcher Schritt übernommen wird |
| Expertenteam | Pascal; das Agententeam |
| Workflow, Use Case, Onboarding, Landingpage (im Fließtext) | Ablauf, Anwendungsfall, Einstieg, Zielseite |
| Kunden vertrauen uns, bewährt | weglassen |

### Ein Wortlaut je Schritt (aus PR 119)

| Schritt | DE | NL | FR | EN |
|---|---|---|---|---|
| Erster Schritt | Vorhaben schildern | Uw plan beschrijven | Décrire votre projet | Describe your project |
| Kontakt | Pascal schreiben | Pascal schrijven | Écrire à Pascal | Write to Pascal |
| Überblick | Leistungen ansehen | Diensten bekijken | Voir les prestations | View services |
| Konto | Konto erstellen · Anmelden | Account aanmaken · Inloggen | Créer un compte · Se connecter | Create account · Sign in |

### Eigene Stimme für TEILEKLAR

TEILEKLAR spricht mit Endkunden, nicht mit Unternehmen. Ebenfalls „Sie“, aber kürzer, alltagsnah und ohne Agentursprache: „Passt das Teil? So prüfen Sie es.“ Jede Seite beantwortet eine Frage aus dem Kauf: Was ist es, passt es, was kostet es, wie kommt es zu mir. Ehrlichkeit ist hier das Verkaufsargument: Preise inklusive Mehrwertsteuer, Versandkosten vor dem Abschluss, Originalfotos des Lieferanten, und der klare Satz, dass ein Foto keine Passung belegt.

---

## 6. Rolle jeder Seite

Spalte „Weg“: A = Aufmerksamkeit, V = Verständnis, T = Vertrauen, F = Anfrage. Seitenliste aus `config/site-map.json`: 43 öffentliche Seiten. Der Gleichmacher misst 44, weil er jede verlinkte Adresse lädt, auch solche ohne eigenen Eintrag in der Seitenliste.

### NeXify AI

| Seite | Weg | Ziel | Wichtigste Aussage | Beweis | Handlungsaufforderung |
|---|---|---|---|---|---|
| `/` Startseite | A | In einem Blick zeigen, für wen und wofür | Ein Gespräch. Ein Projekt, das passt. | Pascal im Film, der Auftritt selbst | Vorhaben schildern |
| `/leistungen` | V | Drei Felder ordnen, den passenden Einstieg zeigen | Website, System, Kampagne – ein Ansprechpartner | Drei Pakete mit benanntem Inhalt | Vorhaben schildern · Pakete vergleichen |
| `/leistungen/websites` | V | Bedarf „Website“ in ein Projekt übersetzen | Eine Website, die Ihr Angebot erklärt | Dieser Auftritt als Arbeitsprobe | Vorhaben schildern |
| `/leistungen/agenten-automatisierung` | V | KI greifbar und beherrschbar machen | Routine abgeben. Kontrolle behalten. | Vorgehen „ein Ablauf zuerst“, Chat als Beispiel | Vorhaben schildern |
| `/leistungen/apps-portale` | V | Portal/App als Antwort auf einen Vorgang zeigen | Ein Ort für den Vorgang statt Postfach und Listen | TEILEKLAR und Portale als Arbeitsprobe | Vorhaben schildern |
| `/leistungsumfang` | V/T | Pakete vergleichbar machen | Drei Pakete, ein klarer Umfang | Inhalt je Paket, Optionen einzeln | Vorhaben schildern |
| `/loesungen` (Wachstum & Kampagnen) | V | Kampagne an Angebot und Zielseite binden | Kampagne und Zielseite aus einem Guss | Getrennte Budgets, kein Erfolgsversprechen | Vorhaben schildern |
| `/preise-ablauf` | T | Kosteneinwand beantworten | Sie kennen die Kosten vor dem Start | Drei Kostenarten, Angebot vor Auftrag | Vorhaben schildern |
| `/wissen` | T | Arbeitsweise nachvollziehbar machen | So arbeiten wir: vom Ziel zur Übergabe | Schritte und Übergabeumfang | Briefing vorbereiten |
| `/wissen/projekt-vorbereiten` | F | Die Anfrage leicht machen | Ihr Briefing in fünf Fragen | Die fünf Fragen selbst | Vorhaben schildern |
| `/unternehmen` | T | Person und Arbeitsmodell zeigen | Ein Ansprechpartner. Ein Agententeam. | Pascal Courbois, Venlo; AI FACTORY | Vorhaben schildern |
| `/kontakt` | F | Anfrage auslösen | Schildern Sie Ihr Vorhaben | Formular mit Eingangsbestätigung, E-Mail-Adresse | Formular absenden |
| `/produkte/nex2fly` | V | Suite verständlich machen | NeX AIFly Suite: Ihr KI-Arbeitsbereich | Test über 24 Stunden | Konto erstellen · Vorhaben schildern |
| `/produkte/one` | V | Die zwei Agenten einordnen | Zwei Agenten. Eine klare Aufgabe. | Chat als erlebbares Beispiel | Vorhaben schildern |
| `/produkte/api` | V | Technischen Lesern den Weg zeigen | NeXify API: KI in Ihrer Anwendung | Schnittstellenbeschreibung je Projekt, Nutzung nach Verbrauch | Vorhaben schildern |
| `/produkte/aifly-oracle` | V/T | Rolle und Grenzen von AIFly ORACLE zeigen | Erst ordnen, dann handeln | Der Chat auf dieser Seite | Chat öffnen · KI-Hinweise lesen |
| `/produkte/nex-agentic-aifly` | V | Ausführenden Agenten erklären | Der Agent, der ausführt | Freigaben bleiben beim Menschen | Vorhaben schildern |
| `/produkte/skills-mcp` | V | Fachbegriffe in Nutzen übersetzen | Ihre Arbeitsweisen und Werkzeuge, angebunden | Ein Satz Erklärung je Begriff | Vorhaben schildern |
| `/portale` | V | Den richtigen Zugang finden | Ihr Zugang, Ihr Bereich | Getrennte Bereiche je Nutzergruppe | Anmelden · Zugang anfragen |
| `/anmelden` | F | Bestehende Nutzer hineinführen | Anmelden und weiterarbeiten | – | Anmelden |
| `/registrieren` | F | Suite-Test starten | NeX AIFly Suite in Ruhe testen | Test beginnt erst auf eigene Wahl, keine automatische Abbuchung | Konto erstellen |
| `/impressum`, `/datenschutz`, `/vertragsgrundlagen`, `/ki-hinweise`, `/barrierefreiheit`, `/cookies` | T | Pflichtangaben, Rechte, Einstellungen | – | Rechtstexte | **nicht geändert** |

### TEILEKLAR

| Seite | Weg | Ziel | Wichtigste Aussage | Beweis | Handlungsaufforderung |
|---|---|---|---|---|---|
| `/teileklar` | A | Sortiment zeigen, Vertrauen in die Angaben | Für Auto und Motorrad. Klar gefunden. | Originalfotos, Preise inkl. MwSt. | Sortiment entdecken |
| `/teileklar/shop` | V | Alle Artikel zugänglich machen | Auto & Motorrad. Klar ausgewählt. | Datenstand des Katalogs | Teile suchen |
| `/teileklar/suche` | V | Zum Artikel führen | Suchen Sie nach Teil, Marke oder Nummer | Die Nummer als sicherster Weg | Passung prüfen |
| `/teileklar/kategorien` | V | Stöbern ermöglichen | Alle Kategorien auf einen Blick | Artikelzahl je Kategorie | Teile suchen |
| `/teileklar/kategorie` | V | Ähnliche Teile unterscheiden | Ähnliche Teile sicher unterscheiden | Herstellerangaben statt Titel | Artikel ansehen |
| `/teileklar/produkt` | V/T | Kaufentscheidung absichern | Alles zum Artikel. Vor dem Kauf. | Daten, Lieferumfang, Preis | Passung prüfen · Zum Warenkorb |
| `/teileklar/fahrzeug-und-passung` | T | Fehlkauf vermeiden | Passt das Teil? So prüfen Sie es. | Checkliste und Reifenrechner | Teile suchen |
| `/teileklar/reifenrechner` | T | Reifengrößen einordnen | Reifengrößen vergleichen | Rechner auf der Passungsseite | Passung prüfen |
| `/teileklar/batterie-berater` | T | Batteriewahl erklären | Die passende Batterie finden | Checkliste; Berater noch nicht verfügbar | Passung prüfen |
| `/teileklar/warenkorb` | F | Auswahl prüfen lassen | Ihr Warenkorb. Alles im Blick. | Summe und Versand vor dem Abschluss | Zur Kasse |
| `/teileklar/kasse` | F | Kauf abschließen | Zur Kasse. Schritt für Schritt. | Übersicht vor dem verbindlichen Abschluss; Pflichtangaben unverändert | (Kasse) |
| `/teileklar/werkstatt` | V | Betrieb in der Nähe finden | Eine Werkstatt in Ihrer Nähe | Verzeichnis, sortiert nach Entfernung | Termin anfragen |
| `/teileklar/termine` | F | Terminwunsch aufnehmen | Termin? Direkt bei der Werkstatt. | Online-Buchung noch nicht verfügbar – klar gesagt | Werkstatt finden |
| `/teileklar/gutscheine` | V | Erwartung klären | Gutscheine gibt es noch nicht | Klarer Stand | Zu TEILEKLAR |
| `/teileklar/partner-werden` | F | Werkstätten gewinnen | Werkstatt? Werden Sie Partner. | Ablauf in drei Schritten, Partnerportal | Anfrage senden |
| `/teileklar/rechtliches` | T | Pflichtangaben | – | Rechtstexte | **nicht geändert** |

---

## 7. Weg zur Anfrage

1. **Auslöser auf jeder Seite:** ein Schalter „Vorhaben schildern“. Er führt zum Kontaktformular (`/kontakt`) oder öffnet den Chat mit AIFly ORACLE. Daneben höchstens ein zweiter Schalter mit dem nächsten sinnvollen Lesestück.
2. **Formular:** ein paar Sätze genügen – Angebot, Zielgruppe, was sich ändern soll. Nach dem Absenden bestätigt das Formular den Eingang. Wer lieber schreibt: mail@nexifyai.cloud.
3. **Chat:** AIFly ORACLE ordnet das Vorhaben und bereitet die Anfrage vor. Der Chat schließt keine Verträge, bucht keine Termine und löst keine Zahlungen aus.
4. **Gespräch mit Pascal:** Ziel, Ausgangslage und Umfang werden geklärt.
5. **Angebot:** Ergebnisse, Mitwirkung, Termine und Kosten, getrennt nach Entwicklung, Betreuung danach und externen Kosten. Erst die Annahme des Angebots ist ein Auftrag.
6. **Umsetzung, Prüfung, Übergabe.** Betreuung danach (NeXify Care) ist ein eigener Baustein.

Für die Suite gilt ein eigener Weg: Konto erstellen → Arbeitsbereich aktivieren → Test selbst starten (24 Stunden) → Tarif wählen oder beenden.

Für TEILEKLAR: Artikel finden → Angaben und Passung prüfen → Warenkorb → Kasse mit vollständiger Übersicht → Bestellung. Werkstätten: Anfrage über das Partnerformular.

**Nicht zugesagt** wird eine Antwortzeit. Die Reihenfolge der Schalter je Seite wurde nicht geändert (Struktur bleibt); auf einigen Seiten ist der erste Schalter noch nicht „Vorhaben schildern“ (O-7).

---

## 8. Offene Entscheidungen des Inhabers

| Nr. | Entscheidung | Folge für die Texte |
|---|---|---|
| O-1 | **Preise öffentlich?** `config/fakten.json` führt den Tagessatz 449 € netto; `config/api-prepaid.json` Mindestaufladung 10 €, Abo-Stufen 9,99 € und 19,99 € im Entwurfsstatus. `config/site-map.json` verbietet eingebettete Preise (`numeric_prices_embedded: false`). | Solange offen, bleiben `/preise-ablauf` und die Produktseiten ohne Betrag. Ein freigegebener Betrag wäre der stärkste fehlende Beleg. |
| O-2 | **Referenzen.** Gibt es Projekte, die mit Freigabe genannt werden dürfen? | Bis dahin dienen der eigene Auftritt und TEILEKLAR als Arbeitsprobe. |
| O-3 | **„Höchste Qualität zu einem fairen Preis“** als geschriebene Aussage im Hero und im Abschnitt Kosten. | In diesem Zweig durch die belegte Fassung aus PR 119 ersetzt; im Film unverändert. Rückweg: ein Satz in `IdentityHero.tsx` und `home-concept-copy.json`. |
| O-4 | **Rechtsform und Anbieterangaben** (Impressum unbestätigt, `AGENTS.md` 13.11.2026). | Texte nennen „NeXify AI“ und Pascal Courbois, keine Rechtsform. |
| O-5 | **Produktnamen.** Auf `main` gilt „NeX AIFly Suite“ (D-011); PR 119 schlägt „NeX & AIFly ORACLE Suite“, „NeX Agentic“ und einen vollen Namen für das KI-System vor. Die Seiten führen heute „NeX Agentic AI“ und „NeX Agentic AIFly“ nebeneinander. | Texte folgen D-011 und den Namen auf `main`. |
| O-6 | **Was ist in der Suite und bei den Agenten heute nutzbar?** Eine verbindliche Liste fehlt (PR 119, Lücke L-07). | Produkttexte beschreiben Aufgabe und Weg, keine Funktionsliste. |
| O-7 | **Reihenfolge der Schalter** je Seite (erster Schalter überall „Vorhaben schildern“?). | Strukturänderung, deshalb hier nicht vorgenommen. |
| O-8 | **Antwortzeit** auf Anfragen und der geprüfte Zustellweg. | Keine Zusage in den Texten. |
| O-9 | **TEILEKLAR:** Ist der Verkauf aktiv, wer ist Verkäufer, wird der Lieferant genannt, gilt eine Kostenaussage für Werkstätten? | Texte beschreiben den Weg, keine Kostenaussage für Partner. |
| O-10 | **Chat-Aussage auf `/ki-hinweise`** („ohne Live-KI-Modell“) widerspricht D-010. | Rechtstext, nicht angefasst; die Produktseite zu AIFly ORACLE sagt nur, dass im Chat ein KI-System antwortet. |
| O-11 | **Regionale Aussage** „Venlo, Limburg und NRW“ in der Seitenbeschreibung der Startseite. | Beibehalten und in nl, fr, en nachgezogen; festes Merkmal? |
| O-12 | **Muttersprachliche Prüfung** von nl, fr und en. | Übertragen, nicht muttersprachlich geprüft. |

---

## 9. Verhältnis zu PR 119 und PR 120

**Übernommen aus PR 119:** Kernsatz „Ein Gespräch. Ein Projekt, das passt.“ als Leitbotschaft; die drei Stützsätze; Tonalitätsregeln und Wortliste; „ein Wortlaut je Schritt“ für die Schalter; die belegte Fassung des Hero-Textes; die Kurzbeschreibungen der Produkte als Ausgangspunkt; die Lückenliste als Quelle der offenen Entscheidungen; die Regel, keine Antwortzeit und keine Kostenaussage zu machen.

**Nicht übernommen aus PR 119:** die Produktnamen „NeX & AIFly ORACLE Suite“ und „NeX Agentic“ sowie der volle Name „AIFly ORACLE with NeXify AI Intelligence by NeXify“ – auf `main` gilt D-011, die Namen in PR 119 sind unbestätigt; die Prüfdatei `config/brand-names.json` und ihr Werkzeug (liegen nur in PR 119); der Satz „Online bestellen können Sie bei TEILEKLAR zurzeit nicht“ – der Shop ist gebaut, sein Betrieb ist eine Laufzeitfrage (O-9); die Chat-, Konto-, Film- und Mailtexte (anderer Umfang).

**Übernommen aus PR 120:** die Liste „nicht behaupten“ des Messplans als Grenze für jede Aussage zur eigenen KI. Kein Text dieses Zweigs sagt etwas über Kosten, Qualität oder Geschwindigkeit der KI-Kette. Der Messplan selbst und das Auswertewerkzeug bleiben in PR 120.

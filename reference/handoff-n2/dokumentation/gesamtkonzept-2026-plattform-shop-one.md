# NeXify AI · Gesamtkonzept 2026 „Eine Unternehmens-KI, ein Baukasten, ein Konto“

**Stand 29.09.2026 · Entwurf zur Freigabe durch Pascal Courbois** · baut auf `startseite-v12-gesamtkonzept.md` (Charakter, Story), `NeXify-Marketingkonzept.md` (MKT-002), `SOLL-Beschreibung.md`, `nexifyai-api-abrechnungskonzept.md`, Blaupause 04.09. · Gestaltung: bestehendes NeXify-Template · Marke unverändert.

> Ziel dieses Dokuments: Die Idee „NeXify AI ist die Unternehmens-KI, die ihre eigenen Produkte vorführt“ vollständig durchdenken – Produkte, Muster-Shop, Bestellstrecken, Demos, Recht, Vorlagen, Marketing, SEO – Lücken benennen und schließen. Danach wird gebaut, nicht mehr entschieden.

---

## 0. Die Idee in fünf Sätzen

1. **NeXify AI** ist eine Unternehmens-KI („Chat it. Automate it.“): eine Instanz, die auf Website, im Portal, im Shop, per API und in der Kommandozeile dieselbe ist – und auf genau die Leistungen trainiert ist, die NeXify verkauft.
2. Sie gibt es in zwei Ausbaustufen: **NeXify AI one** (Antworten, Entwürfe, Beratung) und **NeXify AI one+** (Werkzeuge: baut, prüft, orchestriert, arbeitet in Ihren Systemen). Beide sind per Web, API und CLI nutzbar, Prepaid, ohne Abo-Zwang.
3. Alles, was NeXify verkauft, **führt NeXify AI selbst vor**: Der **NeXify Muster-Shop** ist die Onlineshop-Fertiglösung in Betrieb; die Live-Demos zeigen Agenten bei echter Arbeit; die Website ist die Local-SEO- und Companion-Lösung in Betrieb.
4. Ein **Konto** trägt alles: Interessent, Kunde, Shop-Kunde, API-Kunde, Partner, Affiliate – gleiche Anmeldung, gleiche Rechnungen, gleiche Datenhaltung (Frankfurt, RLS).
5. Der Beweis ist nie eine Behauptung: **Kennzahl vor und nach dem Go-Live**, Preise offen, Rechtstexte offen, Demos ohne Anmeldung.

---

## 1. Produktarchitektur

### 1.1 Produktlandkarte

```
NeXify AI (Unternehmens-KI)
├── NeXify AI one .......... Antworten, Entwürfe, Beratung · Web · API · CLI
├── NeXify AI one+ ......... + Werkzeuge (Browsing, Bauen, Prüfen, Orchestrieren, Dateien, Ihre Systeme)
│   ├── Zugang Web ......... Workspace (nexifyai.cloud/app) – für Kunden freigeschaltet
│   ├── Zugang API ......... api.nexifyai.cloud/v1 (Prepaid, OpenAPI 1.1)
│   └── Zugang CLI ......... `nx` – Terminalwerkzeug für Entwickler und Betriebe (wie ein Coding-Agent, mit NeXify-Wissen)
├── Agenten (Fertiglösungen, unter Kundenmarke)
│   ├── Chat-Agent · Terminbuchung · E-Mail-Triage · Angebots-Generator
│   ├── Wissens-Agent · Local-SEO-Generator · Shop-Berater
│   └── alle laufen auf one/one+ – dasselbe Modell, dieselbe Kennzeichnung
├── Fertiglösung Onlineshop ... vorgeführt als NeXify Muster-Shop (shop.nexifyai.cloud)
├── Fertiglösung Kundenportal . vorgeführt als eigenes Kundenportal
├── Individuallösungen ....... Tagessatz 449 €, Pilot 2.245 €
└── NeXify Care .............. Betrieb, optional, ab 249 €/Monat
```

### 1.2 NeXify AI one und one+ – Definition

| | **one** | **one+** |
|---|---|---|
| Wofür | Fragen beantworten, Texte und Angebote entwerfen, Kunden beraten, Wissen aus Dokumenten mit Quelle | alles aus one **plus** Handeln: Websites bauen, Code schreiben und prüfen, Daten aus Systemen lesen/schreiben, mehrstufige Aufträge orchestrieren |
| Modellbasis | NeXify-Modellstufe 1 (`nexify-guenstig`, EU-betrieben) + NeXify-Wissensschicht (RAG über Leistungen, Preise, Abläufe, Rechtstexte) | NeXify-Modellstufe 2 (`nexify-stark`) + Werkzeugschicht (MCP-Server: Dateien, Git, Browser, Ihre Integrationen) + eigene Feinabstimmung (LoRA ≤ 14 Mrd., ADR-0005) auf NeXify-Aufträge |
| Trainiert auf | NeXify-Leistungskatalog, Auftragsvorlagen, Prüfkataloge, Design-Norm, deutsche Geschäfts- und Rechtssprache (DIN 5008, § 14 UStG, DSGVO-Hinweise) | zusätzlich: Codebasis-Muster (Next.js, PocketBase/Postgres, OpenAPI), Test-zuerst-Disziplin, Freigabe-Gate, Regelwerk R-01…R-21 |
| Zugang | Web-Chat, API, CLI (Chat-Modus) | Web-Workspace mit Seitenfeld (Ablauf, Quellen, Läufe), API mit Tool-Calls, CLI mit Agent-Modus (`nx run`) |
| Grenzen | keine Aktionen in Fremdsystemen, keine Dateiänderungen | Hartsperren bleiben (Reboot, DNS, Firewall nie ohne Freigabe); jede folgenreiche Aktion mit Bestätigung; alles im Journal |
| Preis | Prepaid, Verbrauch je Token, EK + Aufschlag (E1: 45 % API) – **Einstiegspreis-Vorschlag zur Freigabe**: Guthaben ab 50 € | Prepaid, höherer Tokenpreis (Stufe 2) + Werkzeugminuten – **Vorschlag zur Freigabe** |
| Kennzeichnung | jede Antwort „NeXify AI · KI-Antwort“ | zusätzlich Aktionsprotokoll je Lauf |

**Was „um ein Vielfaches günstiger“ heißen darf (Ehrlichkeitsregel R-08 / § 5 UWG):** Kein Preisvergleich mit Anbietern, deren Listenpreise wir nicht datiert belegen. Erlaubt: „Prepaid statt Abo – Sie zahlen nur Verbrauch“, „kein Sitzpreis je Nutzer“, und – nach Freigabe echter Preise – ein datierter Vergleich pro 1 Mio. Token auf der Preisseite mit Quelle. Bis dahin: **Zielwert**, gekennzeichnet.

**Was „speziell trainiert“ heißen darf:** Die Wissensschicht (RAG) ist ab Tag 1 real. Die Feinabstimmung (LoRA) ist Ausbaustufe 2; bis sie live ist, heißt es „auf NeXify-Leistungen eingerichtet“, nicht „trainiert“.

### 1.3 Die CLI `nx` – Konzept

- Installation: `npm i -g @nexify/nx` (oder Binärpaket). Anmeldung mit API-Schlüssel je Kostenstelle.
- Befehle: `nx chat` (one), `nx run "Landingpage für Bremsen-Check bauen"` (one+, Agent-Modus mit Plan → Ausführung → Prüfung), `nx review` (Code-Review nach Prüfkatalog), `nx audit` (Prozessaufnahme per Fragebogen), `nx cost` (Verbrauch, Budget), `nx keys`.
- Sicherheitsmodell: Arbeitet nur im aktuellen Projektordner; jede Datei- oder Shell-Aktion wird angezeigt und bestätigt (Modi: *Fragen · Überwacht · Autopilot mit Grenzen*); Geheimnisse nie im Verlauf; Journal lokal + Langfuse-Trace.
- Positionierung: „Der Kollege im Terminal, der Ihre Regeln kennt.“ Kein Anspruch, jede fremde Codebasis zu beherrschen – stark bei dem, was NeXify baut (Websites, Shops, Portale, Agenten, Automatisierungen).

### 1.4 Weitere Lösungen (neu ausformuliert)

| Lösung | Was sie tut | Für wen | Einstieg |
|---|---|---|---|
| **Shop-Berater** | Fragt Bedarf ab, findet Produkt, erklärt Unterschiede, prüft Passung/Kompatibilität, füllt Warenkorb | Shop-Betreiber | Fertiglösung, im Muster-Shop live |
| **Companion-Widget** | NeXify AI unter Kundenmarke auf jeder Website; Übergabe an Mensch; Kennzeichnung | jede Website | ab 449 € Einrichtung |
| **Angebots-Portal** | Angebot aus Gespräch → E-Mail mit Einladung → Annahme per Button-Lösung → Projektverfolgung | Dienstleister, Handwerk | 2.694–3.592 € |
| **Betriebsleitstand (Care-Kunden)** | Kennzahlen, Selbstheilung, Nachtlauf, Freigaben – der eigene Leitstand als Kundenansicht | Care-Kunden | in Care enthalten |
| **Wissens-Agent** | Antworten aus Dokumenten mit Fundstelle; „weiß ich nicht“ statt erfinden | Bildung, Verwaltung, Handel | ab 898 € |
| **Lokale Sichtbarkeit** | Stadt-/Branchenseiten + Wissenshub-Artikel, laufend gepflegt | Betriebe mit Einzugsgebiet | 449 € + 99 €/Monat |

---

## 2. NeXify Muster-Shop – die Onlineshop-Fertiglösung in Betrieb

### 2.1 Zweck und Regeln

- **Zweck:** Zeigen, was die Shop-Fertiglösung kann – nicht Autoteile verkaufen. Ein vollständiger Multi-Kategorie-Shop mit Waren aller Art, echter Suche, Warenkorb, Kasse, Konto, Bestellverfolgung, Shop-Berater (NeXify AI), Rechtstexten und E-Mail-Vorlagen.
- **Ehrlichkeit:** Der Shop trägt sichtbar „Muster-Shop · Demo – keine echte Lieferung, keine Zahlung“. Kasse endet in einer Demo-Bestellbestätigung mit Vorgangsnummer; Zahlung läuft gegen die Revolut-Sandbox oder wird simuliert. Produkte, Marken und Bewertungen sind **erkennbar fiktiv** (eigene Handelsmarken, keine realen Hersteller), damit kein Verbraucher getäuscht wird und kein Markenrecht berührt ist.
- **Abgrenzung TEILEKLAR:** TEILEKLAR bleibt der reale Shop mit eigener Marke. Der Muster-Shop läuft unter NeXify-Marke (Template, Lime, Graphit) und heißt **„NeXify Shop“** mit Zusatz „Muster-Shop“. Beide nutzen dieselbe Katalog- und Bestell-Logik (`db/migrations/002_catalog.sql`, `003_orders.sql`) – der Muster-Shop beweist, dass sie generisch ist.
- **Doppelter Nutzen:** Der Muster-Shop ist zugleich das **White-Label-Template**: Ein Kunde wählt Kategorien, lädt Produkte (CSV), setzt Marke – und bekommt genau diesen Shop unter seinem Namen.

### 2.2 Sortiment (fiktiv, aber vollständig)

Zehn Hauptkategorien, je 3–5 Unterkategorien, insgesamt ~180 Artikel mit Varianten, Attributen, Bildplatzhaltern (Image-Slots für echte Produktfotos), Preisen inkl. USt., Lieferzeit, Bestand:

| Kategorie | Unterkategorien | Besonderheit im Demo |
|---|---|---|
| Büro & Arbeitsplatz | Schreibtische, Stühle, Beleuchtung, Zubehör | Varianten (Größe/Farbe), Staffelpreise B2B |
| Elektronik | Audio, Smart Home, Kabel & Adapter, Speicher | Kompatibilitätsprüfung (Shop-Berater), ElektroG-Hinweise |
| Haushalt & Küche | Kochen, Aufbewahrung, Reinigung, Kleingeräte | Bundles, „Passt dazu“ |
| Werkzeug & Werkstatt | Handwerkzeug, Elektrowerkzeug, Messen, Sicherheit | Gefahrgut-/Batteriehinweise (BattG) |
| Garten & Balkon | Pflanzen, Bewässerung, Möbel, Saatgut | Saisonlogik, Lieferzeit-Hinweis |
| Sport & Freizeit | Fitness, Outdoor, Rad-Zubehör | Größentabellen |
| Bekleidung & Textil | Arbeitskleidung, Basics, Accessoires | Größen/Farben-Matrix, Rücksendequote-Hinweis |
| Gesundheit & Pflege | Erste Hilfe, Ergonomie, Hygiene | Pflichtangaben je Produktart |
| Lebensmittel & Getränke | Kaffee, Tee, Snacks, Vorrat | LMIV-Pflichtangaben, Grundpreis (PAngV) |
| Papier & Verpackung | Kartons, Klebeband, Etiketten, Füllmaterial | Mengenstaffel, VerpackG-Hinweis |

Handelsmarken (fiktiv, konsistent): **Norden** (Büro/Möbel), **Kabelwerk Nova** (Elektronik), **Hauskern** (Haushalt), **Ferrum** (Werkzeug), **Grünzeit** (Garten), **Laufform** (Sport), **Stoffgrund** (Textil), **Careo** (Pflege), **Röstwerk Elf** (Kaffee), **Packbar** (Verpackung).

### 2.3 Funktionen (alle im Prototyp bedienbar)

Startseite mit Kategorien-Kacheln und Berater-Einstieg · Kategorie-/Unterkategorieseiten mit Filtern (Preis, Marke, Attribute, Verfügbarkeit), Sortierung, Seitenwechsel · Produktdetail (Varianten, Galerie-Slots, Attribute, Pflichtangaben, Lieferzeit, Staffelpreis, „Passt dazu“, Bewertungen als *Beispiel* gekennzeichnet) · Suche mit Vorschlägen und Tippfehler-Toleranz · Vergleich (bis 4) · Merkliste · Warenkorb (Mengen, Gutscheincode, Versandkosten-Vorschau, USt. je Markt) · Kasse in 4 Schritten (Adresse → Versand → Zahlung → Prüfen & Bestellen mit Button-Lösung § 312j BGB) · Gast oder Konto · Bestellbestätigung + E-Mail-Vorschau · Konto (Bestellungen, Rücksendung anmelden, Adressen, Einwilligungen, Rechnungen) · B2B-Schalter (Netto-Anzeige, USt-IdNr.-Prüfung, Reverse Charge) · Shop-Berater als NeXify AI (Bedarfsfragen → Vorschläge → in den Warenkorb) · Markt/Sprache DE · NL · FR (Rahmen), Währung EUR.

Zustände je Fläche: Laden, Leer (Warenkorb leer, keine Treffer mit Vorschlägen), Fehler (Gutschein ungültig, Zahlung abgelehnt in der Demo wählbar), Erfolg.

### 2.4 Bestellstrecke Shop (Logik)

```
Produkt → Warenkorb → [Gast | Anmelden | Registrieren (F4)]
→ Adresse (Liefer-/Rechnungsadresse, Firma optional → B2B-Modus)
→ Versand (Standard 3–5 Tage · Express · Abholung; Kosten aus Markt-Tabelle; ab 79 € frei)
→ Zahlung (Karte · Revolut Pay · Rechnung nur B2B mit geprüfter USt-IdNr. · Vorkasse)
→ Prüfen: Positionen, Summen netto/USt/brutto in Cent, Widerrufsbelehrung, AGB-Haken (nicht vorbelegt), Button „Zahlungspflichtig bestellen“
→ Bestellung angelegt (Status: eingegangen) → Zahlung bestätigt (Webhook) → in Bearbeitung → versendet (Sendungsnummer) → zugestellt
→ Rücksendung: aus dem Konto, 14 Tage Widerruf B2C, Etikett als PDF, Erstattung binnen 14 Tagen
```

Regeln: Beträge in Cent; USt. nach Lieferland (OSS-Verfahren, weil Verkäufer NL, Käufer EU); Bestand wird bei Bestellung reserviert, bei Zahlung gebucht; Idempotency-Key je Bestellung; jede Statusänderung löst eine E-Mail-Vorlage aus (Abschnitt 6).

### 2.5 Shop-Berater (NeXify AI im Shop)

Einstieg oben rechts („Fragen Sie NeXify AI“) und auf jeder Kategorieseite. Ablauf: 2–3 Bedarfsfragen (Wofür? Wie viele? Budget?) → drei Vorschläge mit Begründung und Unterschieden → Kompatibilitäts-/Größenprüfung → „In den Warenkorb“ → Übergabe an Mensch („Rückruf vom Shop-Team“) bei Reklamation oder Unsicherheit. Jede Antwort gekennzeichnet; keine Preise erfunden – nur Katalogwerte.

---

## 3. Bestellstrecken der übrigen Produkte

| Produkt | Weg | Zahlung | Ergebnis |
|---|---|---|---|
| **one / one+ (API, CLI, Web)** | API-Seite → Konto anlegen (F4, Rolle Kunde) → Onboarding Rechnungsdaten (USt-IdNr.-Prüfung VIES) → Konsole: Guthaben aufladen (50–5.000 €) → Schlüssel je Kostenstelle → Budget → Nutzung → Journal → Warnschwelle → optional Auto-Aufladung (max. 2/Tag) | Revolut Pay / Karte, Anzahlungsrechnung je Aufladung, monatlicher Verbrauchsnachweis | Guthaben aktiv, Schlüssel einmal sichtbar, `nx login` möglich |
| **Fertiglösungen (Agenten)** | Website/Portal → „Einrichten lassen“ → Kurzformular (Marke, Kanal, Regeln) → Angebot automatisch (Angebots-Generator) → Annahme F2 → Einrichtungstermin → Go-Live → optional Care | Rechnung nach Einrichtung; Care monatlich | Agent unter Kundenmarke live |
| **Individuallösung** | Erstgespräch (F1) → Audit 449 € → Pilot-Angebot → Annahme F2 → Onboarding F3 → Entwicklungstage mit Tagesbericht → Freigabe-Gate → Übergabe | Rechnung je Tagesblock oder Guthaben (D3) | Code, Daten, Zugänge beim Kunden |
| **Shop-Fertiglösung** | Muster-Shop ansehen → „Diesen Shop unter meiner Marke“ → Konfigurator (Kategorien wählen, CSV-Import-Muster, Marke) → Angebot → F2 → Einrichtung 6–8 Tage | wie Fertiglösung | eigener Shop auf gleicher Logik |
| **Care** | aus Portal buchbar, monatlich kündbar | monatliche Rechnung | Leitstand-Kundenansicht frei |

Gemeinsam: ein Konto, Rollen additiv; alle Rechnungen im Kundenportal; alle Einwilligungen getrennt, nicht vorbelegt; jede folgenreiche Aktion idempotent und protokolliert.

---

## 4. Live-Demos – Angst nehmen durch Ausprobieren

**Prinzip:** Ohne Anmeldung, ohne E-Mail, in unter 60 Sekunden ein echtes Ergebnis sehen. Jede Demo läuft in einem **„Arbeitsplatz“-Fenster** (Fensterrahmen wie ein Rechner, mit Titelleiste, Tabs, Terminal), das sich auf der Seite öffnet – NeXify AI one+ arbeitet sichtbar: Plan → Schritte → Ergebnis → Prüfung. Der Besucher kann Eingaben ändern und die Demo erneut laufen lassen.

| Demo | Eingabe des Besuchers | Was sichtbar passiert | Ergebnis |
|---|---|---|---|
| **D1 Anfrage → Antwort** | wählt Branche und tippt eine Kundenanfrage | Posteingang zeigt Mail; Protokoll läuft; Antwort erscheint mit Kennzeichnung; Kalendereintrag | Antwortzeit-Zähler „21:14 → 21:15“ |
| **D2 one+ baut eine Landingpage** | Betrieb, Leistung, Stadt | Fenster öffnet: Terminal `nx run …`, Plan mit 5 Schritten, Dateien entstehen, Vorschau rechts rendert die Seite live, Prüfliste (Kontrast, Zielgrößen, Impressum-Link) wird grün | fertige Vorschau, herunterladbar als HTML |
| **D3 Shop-Berater** | „Ich brauche …“ | Berater fragt 2× nach, zeigt 3 Produkte aus dem Muster-Shop, legt eins in den Warenkorb | Warenkorb im Muster-Shop |
| **D4 E-Mail-Triage** | Besucher zieht 6 Beispielmails in Reihenfolge | Agent sortiert, taggt, entwirft 2 Antworten, markiert 1 als „Ihre Entscheidung“ | Ordnerstruktur + Entwürfe |
| **D5 Angebot aus Gespräch** | 3 Sätze Gesprächsnotiz | Angebot nach DIN 5008 entsteht Position für Position, Summe in Cent, Einladungsmail | PDF-Vorschau |
| **D6 Wissens-Agent** | wählt Beispiel-Dokument, stellt Frage | Antwort mit Fundstelle, Seite leuchtet; zweite Frage ohne Antwort → „weiß ich nicht“ | Vertrauen durch ehrliche Grenze |
| **D7 API in 3 Zeilen** | wählt Sprache (curl/JS/Python) | Codeblock, Antwort-JSON, Kostenzeile in Cent | „Konto anlegen“ |

Technik: skriptgesteuerte, deterministische Abläufe (keine echten Modellaufrufe im Prototyp; jede Stelle `data-api-endpoint`), Fensterrahmen aus dem Starter `macos_window`/`browser_window`, Terminal-Ausgabe zeilenweise, Vorschau als echtes gerendertes HTML. Jede Demo trägt: „Demo · vorbereiteter Ablauf · im Betrieb: NeXify AI one+ live“. `prefers-reduced-motion` → Schritte ohne Tipp-Effekt.

Später (Phase 3): D2 und D7 mit echtem one+ hinter Rate-Limit und Tages-Budget; Ergebnisse 24 h abrufbar per Link.

---

## 5. Rechtstexte – je Produkt, verbindlich abgestimmt

Alle Texte: Entwurf durch NeXify, **anwaltliche Prüfung vor Live** (E12/E2). Fassung + Datum sichtbar, Änderungsprotokoll, offen einsehbar ohne Tracking. Verkäufer: NeXify AI, Venlo (NL) – Anschrift zu ergänzen (offen).

| Fläche | Pflichttexte | Besonderheiten |
|---|---|---|
| **Agentur-Website** | Impressum (NL: KvK-Nr., btw-Nr.; DE-Kunden: § 5 DDG sinngemäß), Datenschutz (DSGVO, TDDDG § 25, Hosting Frankfurt, Auftragsverarbeiter-Liste), AGB B2B (Tagessatz, Abnahme, Nutzungsrechte → Kunde, KI-Aufschlag § 4, Referenznennung § 11), KI-Hinweis (Art. 50), Barrierefreiheitserklärung (EN 301 549), Cookie-Einstellungen (nur technisch notwendige) | Kontaktkanäle mit Zweck (WhatsApp nur Nachrichten) |
| **one / one+ · API · CLI** | Nutzungsbedingungen (Prepaid: Aufladung 50–5.000 €, kein Verfall, Rückzahlung bei Vertragsende), Preisliste mit Datum, AVV Art. 28 + TOMs, Zulässige Nutzung (keine verbotenen Praktiken Art. 5 KI-VO, keine Hochrisiko-Nutzung ohne Vertrag), Verfügbarkeit (Zielwert, kein SLA-Versprechen ohne Beleg), Kennzeichnungspflicht des Kunden (Art. 50 Abs. 4), Unterauftragsverarbeiter (Modellanbieter, Revolut Bank UAB), Export/Löschung | CLI: Lizenz (proprietär oder Quelle offen – Entscheidung), Telemetrie nur mit Zustimmung |
| **Muster-Shop** | AGB B2C + B2B, Widerrufsbelehrung + Muster-Widerrufsformular, Versand & Zahlung, Preisangaben (PAngV: Gesamtpreis, Grundpreis), Lieferzeit, Gewährleistung, Streitbeilegung (ODR/VSBG-Hinweis), Produktspezifisch: ElektroG (Rücknahme), BattG, VerpackG (LUCID-Registrierung), LMIV bei Lebensmitteln, Textilkennzeichnung; **BFSG** (Barrierefreiheit im B2C-Onlinehandel seit 28.06.2025) | **Demo-Hinweis** in Kopf, Kasse, Bestätigung: „Muster-Shop – keine echte Lieferung“; Rechtstexte trotzdem vollständig, weil Vorlage für Kundenshops |
| **Portale** | Nutzungsbedingungen Konto (eine Person, mehrere Rollen), 2. Faktor, Einwilligungen widerrufbar, Datenexport | Angebotsannahme: Button-Lösung, Unternehmerhaken, Fassung |
| **E-Mails** | Pflichtangaben im Fuß (Firma, Anschrift, Vertretung, Register), Abmeldelink nur Marketing, KI-Kennzeichnung bei automatischen Antworten | Transaktional ohne Werbung |
| **Dokumente** | Angebot (DIN 5008, Gültigkeit, netto/brutto), Rechnung § 14 UStG (Nummernkreis `NX-…`, Leistungsdatum, USt-IdNr., Reverse-Charge-Hinweis), Gutschrift, Lieferschein | GoBD-Archiv 10 Jahre (offen: Werkzeug) |

Vorhandene Quelle: `uploads/teileklar-rechtstexte/` (7 Märkte, Prüflisten, Pflichtangaben je Produktkategorie) wird für den Muster-Shop **generisch neu gefasst** – Struktur übernehmen, Autoteile-Bezug entfernen.

---

## 6. Vorlagen (HTML / Dokumente)

**E-Mail (tabellenbasiert, Inline-CSS, Dunkelkopf mit Signet, Fuß mit Pflichtangaben):**
Konto: Bestätigung, Einladung aus Angebot, Passwort zurücksetzen, 2. Faktor · Shop: Bestellbestätigung, Zahlung eingegangen, Versand mit Sendungsnummer, Rücksendung bestätigt, Erstattung · API/one: Guthaben gutgeschrieben (+ Beleg), Warnschwelle, Auto-Aufladung ausgeführt, Schlüssel angelegt · Agentur: Anfrage eingegangen, Angebot bereit, Tagesbericht, Abnahme, Rechnung · Marketing: Newsletter (nur nach Entscheidung E-MKT-2).

**Dokumente (NEXIFYAI-CD-2026, A4, Cover dunkel):** Angebot FA · Auftragsbestätigung AB · Rechnung RE · Gutschrift GS · Lieferschein · Tagesbericht · Abnahmeprotokoll QA · Übergabe UE · AVV.

**Broschüren & Präsentationen:** Agentur-Broschüre (Kennzahl statt Versprechen) · one/one+-Datenblatt (2 Seiten: Was, Zugang, Preise, Grenzen, Sicherheit) · Shop-Fertiglösung (Muster-Shop als Beweis, Konfigurator, Preise) · Partner-Broschüre · Investoren-Präsentation (aktualisiert um one/one+ und Muster-Shop) · Visitenkarte.

**Web-Bausteine:** NX-Header (Nav ergänzt: *NeXify AI one · Shop · Demos*), NX-Footer (Shop-Rechtslinks), Demo-Fenster, Berater-Panel, Kennzahl-Karte, Beleg-Chip, Preis-Karte, Bestellschritte, Produktkarte, Filterleiste, Warenkorb-Zeile.

---

## 7. Marketing, Kommunikation, SEO

### 7.1 Botschaftshaus (erweitert MKT-002)

| Dach | **Chat it. Automate it.** – die Unternehmens-KI, die ihre eigenen Produkte vorführt. |
|---|---|
| Messbar | Kennzahl vor/nach Go-Live; Demo statt Versprechen |
| Ein Konto | Website, Shop, API, CLI, Portal – eine Anmeldung, eine Rechnung |
| Prepaid statt Abo | one/one+: nur Verbrauch, kein Sitzpreis, Guthaben verfällt nicht |
| Eigene Medizin | Muster-Shop, Website, Portal, Leitstand – alles läuft bei NeXify selbst |
| Eigentum | Code, Daten, Zugänge beim Kunden; Modell austauschbar |

### 7.2 Tonalität (verbindlich, ergänzt CI-Schema § 9)

Siezen; erste Person für NeXify AI; kurze Hauptsätze; Zahl statt Adjektiv; kein Superlativ ohne Beleg; jede Fachaussage mit einem Satz Erklärung („Reverse Charge – die Steuer schulden Sie in Ihrem Land, unsere Rechnung ist netto“); Einwand zuerst nennen, dann antworten; Humor sparsam, nie auf Kosten des Lesers; keine Angst-Rhetorik („bevor die Konkurrenz…“); Angst nehmen durch **Ausprobieren, Grenzen nennen, Ausstieg zeigen** („monatlich kündbar“, „weiß ich nicht“).

Textbausteine, die überall gleich lauten: „Als KI-Antwort gekennzeichnet“ · „Preise netto, für Unternehmer“ · „Danach gehört der Agent Ihnen“ · „Kein Festpreis ohne Audit – und der hält“ · „Muster-Shop: keine echte Lieferung“.

### 7.3 SEO / GEO

- **Keyword-Cluster je Produkt:** *KI-Agent für Handwerksbetrieb*, *Angebote automatisch erstellen*, *E-Mail Triage KI*, *Terminbuchung KI*, *Onlineshop Fertiglösung*, *KI API Prepaid*, *KI CLI Terminal Agent*, *Local SEO Stadtseiten* – je Cluster eine Leistungsseite + 2 Wissenshub-Artikel („Was kostet…“, „Wie lange dauert…“, „Wann lohnt sich…“).
- **GEO (KI-Suche):** Faktenblöcke mit Zahl, Datum, Quelle am Seitenanfang; FAQ als strukturierte Daten (`FAQPage`), Produkte (`Product`, `Offer`), Organisation, Breadcrumbs; Preise zitierfähig in einem Satz.
- **Muster-Shop:** `noindex` für Produktseiten (Demo, keine echten Angebote – vermeidet Irreführung im Index), Startseite und Erklärseite „So funktioniert die Shop-Fertiglösung“ indexierbar.
- **pSEO:** 8 Stadtseiten (bestehend) + Branchenseiten nach Keyword-Freigabe; `lib/pseo.js` prüft echte lokale Angaben.
- **Messung ohne Cookies:** serverseitig (Entscheidung E-MKT-5); Kennzahlen aus MKT-002 § 10 + neu: Demo-Starts/Sitzung ≥ 15 %, Demo→Konto ≥ 3 %.

### 7.4 Kanäle und Formate

LinkedIn (Pascal): Demo-Clips 30 s aus D1–D7 · Wissenshub 2/Monat · Newsletter erst nach E-MKT-2 · Partnernetz (Agenturen White-Label: Shop und Agenten unter Partner-Marke, Provision über Affiliate-Portal) · WhatsApp nur Rückfragen.

---

## 8. Informationsarchitektur (SOLL, ergänzt)

```
Öffentlich · nexifyai.cloud
├── Start (v12, Story mit Signalfeld) ............ NeXifyAI Cloud v12.dc.html
├── NeXify AI one / one+ ......................... NeXify AI one.dc.html  (#one #oneplus #cli #preise #sicherheit)
│   └── API & Konsole ............................ NeXify API.dc.html (bestehend, ergänzt)
├── Demos ........................................ NeXify Demos.dc.html  (D1–D7, je Fenster)
├── Leistungen & Bausteine ....................... Start #leistungen + Leistungsseiten je Cluster
├── Shop-Fertiglösung ............................ Shop-Loesung.dc.html (Erklärseite, Konfigurator, Preise)
│   └── NeXify Muster-Shop ....................... NeXify Shop.dc.html (+ Kategorie, Produkt, Warenkorb, Kasse, Konto)
├── Preise & Förderung · Ablauf · Wissenshub · Vor Ort · Partner werden
├── Rechtliches (erweitert um Shop- und one-Texte)
└── Companion (eingebettet, überall)

Konto (gemeinsam): Anmeldung · Kundenwege (reg | ang | ob) · Rollen: Kunde · Shop-Kunde · API · Partner · Affiliate · intern
Portale: Kundenportal (+ Care-Leitstand, Bestellungen aus Shop, Guthaben) · Partnerportal · Affiliate · API-Konsole
Intern: Workspace (one+ mit Seitenfeld) · Posteingang · Leitstand · myADMIN · Auftrag anlegen (Task-Automate) · Katalogpflege Muster-Shop
```

Navigation Kopf: **Leistungen · NeXify AI one · Demos · Shop · Preise · Wissen** · Anmelden · CTA. Fuß: + Muster-Shop-Rechtslinks, Statusseite.

---

## 9. Gefundene Lücken – und wie sie geschlossen werden

| # | Lücke | Schließung |
|---|---|---|
| L1 | „Um ein Vielfaches günstiger“ ist ohne datierten Beleg ein UWG-Risiko | Vergleichstabelle je 1 Mio. Token mit Quelle+Datum erst nach Preisfreigabe; bis dahin Prepaid-Argument |
| L2 | „Speziell trainiert“ vs. tatsächlicher Stand (RAG ja, LoRA offen) | Wortwahl „eingerichtet auf“ bis LoRA live; Roadmap sichtbar |
| L3 | Muster-Shop könnte als echter Shop missverstanden werden | Demo-Banner, `noindex` Produkte, fiktive Marken, Kasse ohne Zahlung, Bestätigung „Demo“ |
| L4 | B2C-Verkauf aus NL in EU: USt. je Lieferland | OSS-Verfahren, Steuertabelle je Markt in `config/`; Rechenkern `steuer()` erweitern |
| L5 | BFSG gilt für B2C-Shops seit 06/2025 | Barrierefreiheitserklärung + Prüfplan Band 11 für Shop; Kontrast, Tastatur, Fokus |
| L6 | CLI öffnet Angriffsfläche (Shell, Dateien) | Modi Fragen/Überwacht/Autopilot mit Grenzen; Projektordner-Sandbox; Bestätigung je Aktion; kein Geheimnis im Verlauf |
| L7 | one+ könnte Hartsperren umgehen | Regelwerk R-01…R-21 als Schranke im Gateway, nicht nur im Prompt; Hartsperren technisch, nicht nur textlich |
| L8 | Ein Konto, viele Rollen – Rechteexplosion | Rollen additiv, RLS je Mandant, Rollenwechsler im Kopf; Prüffälle „Rolle A sieht nichts von B“ |
| L9 | Demos ohne Anmeldung = Missbrauch möglich (Phase 3, echte Modelle) | Rate-Limit je IP, Tagesbudget, Captcha-frei durch Proof-of-Work, Ergebnis-Links 24 h |
| L10 | GoBD-Archiv für automatische Rechnungen offen | Entscheidung E-GoBD; bis dahin PDF + Hash + unveränderlicher Speicher (Objektspeicher mit Versionierung) |
| L11 | Kennzahl-Beispiel 26 Std. → 4 Min. ohne Messwert | als „Beispiel“ gekennzeichnet; erster Pilot liefert echten Wert (GL-06) |
| L12 | Zwei Shops (TEILEKLAR, Muster-Shop) – Verwechslung | klare Markentrennung; TEILEKLAR nie im NeXify-Template; Muster-Shop nie mit Autoteilen |
| L13 | Newsletter-/Marketing-Einwilligung unklar | getrennte Einwilligung, Double-Opt-in, nur nach E-MKT-2 |
| L14 | Physische Anschrift fehlt in allen Rechtstexten | sichtbarer Platzhalter, Hartsperre bis Pascal liefert |
| L15 | Preise one/one+ nicht freigegeben | Preisseite mit Struktur, Werte „zur Freigabe“ markiert, `config/api-prepaid.json` führt |

---

## 10. Umsetzungsplan (Phasen, Prototyp ohne Backend)

| Phase | Umfang | Ergebnis |
|---|---|---|
| **P1 · Bühne & Story** | Signalfeld-Charakter, Startseite v12 (8 Akte), Demo-Fenster-Baustein, D1 + D2 | Startseite präsentierbar |
| **P2 · one / one+** | Produktseite one/one+ (Web·API·CLI, Preise zur Freigabe, Sicherheit, Grenzen), CLI-Konzeptseite mit Terminal-Demo, API-Seite ergänzt, D7 | Produkt erklärbar und bestellbar (Konto → Guthaben) |
| **P3 · Muster-Shop** | Katalog (10 Kategorien, ~180 Artikel, Daten als JSON), Start, Kategorie, Produkt, Suche, Vergleich, Merkliste, Warenkorb, Kasse, Bestätigung, Konto, Shop-Berater (D3), Rechtstexte Shop, E-Mails Shop | Shop-Fertiglösung in Betrieb erlebbar |
| **P4 · Demos & Lösungen** | Demos-Seite D1–D7 komplett, Leistungsseiten je Cluster, Shop-Lösungs-Erklärseite mit Konfigurator | Angst nehmen durch Ausprobieren |
| **P5 · Recht & Vorlagen** | Rechtstexte je Produkt (Entwurf), E-Mail-Vorlagen (alle Ereignisse), Dokumente, one/one+-Datenblatt, Shop-Broschüre, Investoren-Update | Vollständiger Unterlagensatz |
| **P6 · Portale & Konto** | Kundenportal um Shop-Bestellungen, Guthaben, Care-Leitstand ergänzt; Rollenwechsler; Kundenwege für Shop-Kunde | ein Konto, alle Rollen |
| **P7 · Prüfung** | Normlauf (WCAG/BFSG, DIN 5008), Inhaltsabgleich `fakten.json`, Verweisprüfung, Runtime, 320/768/1440, Nutzerpfade E2E, Prüfbericht, Backend-Roadmap | Abnahmefähig |

Backend-Roadmap (nur konzeptionell, nach Prototyp): Gateway `POST /v1/requests` · Katalog/Bestellung (Migration 002/003 generisch) · OSS-Steuer · Revolut Webhooks · Guthaben/Journal · Modell-Router (Stufe 1/2) + Werkzeugschicht (MCP) · CLI-Auth · RAG-Wissensschicht · Langfuse · Selbstheilung/Nachtlauf · OpenBao · GoBD-Archiv.

---

## 11. Entscheidungen (Pascal) – bevor P2/P3 beginnen

| ID | Frage | Vorschlag |
|---|---|---|
| E-G1 | Name des Muster-Shops | „NeXify Shop · Muster-Shop“ |
| E-G2 | Fiktive Handelsmarken wie in 2.2 | ja – keine realen Hersteller |
| E-G3 | one/one+ Preisstruktur (Token-Aufschlag, Werkzeugminuten) | Struktur bauen, Werte „zur Freigabe“ |
| E-G4 | CLI-Name `nx` und Lizenzmodell | `nx`, proprietär, Quelle später offen |
| E-G5 | Demos Phase 3 mit echtem Modell | ja, mit Budget/Rate-Limit |
| E-G6 | Kennzahl-Beispiel zeigen | ja, als „Beispiel“ |
| E-G7 | Navigation Kopf: *NeXify AI one · Demos · Shop* aufnehmen | ja |
| E-G8 | Wortlaut „trainiert“ erst nach LoRA | ja |

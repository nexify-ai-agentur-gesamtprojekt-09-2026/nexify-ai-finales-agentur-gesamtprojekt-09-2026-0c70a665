# TEILEKLAR auf nexifyai.de · Onlineshop-Gesamtkonzept

Stand 04.11.2026 · Fassung 1.0 · Konzept, keine Freigabe. Rechtstexte sind Entwurf und keine
Rechtsberatung; Preise, Versandkosten und Schwellen kommen ausschließlich aus der Konfiguration
(`apps/shop-api` → `pricing.settings`, `config/fakten.json`) und bleiben „zur Freigabe“, bis
Pascal Courbois sie bestätigt.

Arbeitsweise: Das Konzept wurde ohne Rückgriff auf ältere Projektentscheidungen zu Inhalt oder
Bildsprache entwickelt. Grundlage sind deutsche E-Commerce-Best-Practices, Kaufpsychologie und eine
Auswertung dessen, was die Plattform heute tatsächlich enthält:

- Seiten in `config/site-map.json`, Routen in `apps/web/app/teileklar/*`
- Komponenten in `apps/web/components/shop/*` und `shop.css`
- Tokens in `config/design-tokens.json`
- BigBuy-Import in `apps/shop-api/shop/bigbuy_import.py`, Checkout in `checkout_api.py`

---

## 0 · Kurzfazit und strategische Grundentscheidung

**Befund mit der größten Wirkung:** Der BigBuy-Import ist technisch auf den Teilbaum
**„Auto & Motorrad“** begrenzt (`find_roots` → `category_auto_motorrad_not_found`). BigBuy ist ein
Dropshipping-Großhändler. Er liefert in diesem Teilbaum **Universalzubehör**, also Pflege, Innenraum,
Elektronik, Sicherheit, Werkzeug und Motorradausrüstung. **Fahrzeugspezifische OE-Ersatzteile mit
Typschlüssel-Passung liefert er nicht.**

Mehrere heutige Seitentitel versprechen Ersatzteilpräzision („Teilesuche mit Präzision“,
„Passung vor Kauf“). Die BigBuy-Ware kann das nicht einlösen. Das ist für deutsche Käufer ein
Vertrauensbruch und erhöht die Retourenquote.

**Positionierung (Empfehlung):**

> **TEILEKLAR – Auto- & Motorradzubehör, geprüft und klar beschrieben.**
> Alles, was Ihr Fahrzeug sicherer, sauberer und alltagstauglicher macht: mit ehrlichen Angaben,
> deutschem Ansprechpartner und Werkstattsuche, wenn es mehr als Zubehör braucht.

Das Leistungsversprechen ruht auf drei Säulen, die auf jeder Seite wiederkehren:

1. **Klarheit**: vollständige Produktangaben, Endpreis inkl. MwSt., Versand vorab sichtbar, keine Überraschungen.
2. **Eignung statt Pseudo-Passung**: „Universell“, „Für 12-V-Bordnetz“, „Für Helmgröße M–L“ und Ähnliches, sauber gekennzeichnet. Echte Fahrzeugpassung nur dort, wo der Datensatz sie belegt.
3. **Weg zur Werkstatt**: Die Werkstattsuche (`/teileklar/werkstatt`; ein bestätigtes Partnernetz besteht noch nicht) ist das Alleinstellungsmerkmal gegenüber reinen Dropshipping-Shops. Es lädt jedes Produkt mit Service auf.

---

## 1 · Gesamtkonzept und Seitenstruktur

### 1.1 Seitenarchitektur (Zielbild)

Bestehende Routen bleiben erhalten. Neu sind nur Inhaltsseiten, die der deutsche Markt erwartet (★).

```
nexifyai.de
├── /                          Startseite (Agentur) → Shop-Teaser „Kapitel 0“
└── /teileklar                 Shop-Startseite · Kapitel 1 „Ankommen“
    ├── /teileklar/shop        Sortimentsübersicht · Kapitel 2 „Die Werkbank“
    ├── /teileklar/kategorien  Alle Kategorien
    │   └── /teileklar/kategorie/<slug>   Kategorie · Kapitel 3 „Die Ordnung“
    ├── /teileklar/suche       Suche + Ergebnisse
    ├── /teileklar/produkt/<id> Produkt · Kapitel 4 „Das Detail“
    ├── /teileklar/warenkorb   Warenkorb · Kapitel 5 „Der Kofferraum“
    ├── /teileklar/kasse       Kasse (Adresse → Versand → Prüfen → Zahlung) · Kapitel 6 „Die Abfahrt“
    ├── /teileklar/bestellung/<nr>  Bestätigung · Kapitel 7 „Unterwegs“
    ├── Ratgeber & Werkzeuge
    │   ├── /teileklar/fahrzeug-und-passung   → umbenennen: „Eignung prüfen“
    │   ├── /teileklar/reifenrechner
    │   └── /teileklar/batterie-berater
    ├── Service
    │   ├── /teileklar/werkstatt     Werkstattsuche · Kapitel 8 „Die Werkstatt“
    │   ├── /teileklar/termine
    │   ├── /teileklar/gutscheine
    │   └── /teileklar/partner-werden
    ├── Konto (privat): /teileklar/konto · /teileklar/bestellungen · /anmelden · /registrieren
    └── Rechtliches & Vertrauen
        ├── /teileklar/rechtliches   (AGB, Widerruf – vorhanden)
        ├── ★ /teileklar/versand-und-zahlung
        ├── ★ /teileklar/rueckgabe          (Retourenprozess, verständlich)
        ├── ★ /teileklar/batterie-und-altgeraete (BattG/ElektroG-Hinweise, falls Sortiment betroffen)
        ├── ★ /teileklar/hilfe              (FAQ + Kontakt, Reaktionszeit)
        └── Impressum · Datenschutz (seitenweit, Footer)
```

**Navigation (Kopf, TEILEKLAR-Kontext):** Shop · Kategorien · Werkstatt finden · Ratgeber · Suche ·
Kundenbereich · Warenkorb (mit Anzahl). Die mobile Commerce-Navigation (`.tk-mobile-commerce-nav`)
bleibt bei Suche · Kategorien · Warenkorb · Konto.

**Footer (TEILEKLAR):** vier Spalten.

| Spalte | Inhalt |
|---|---|
| Einkaufen | Shop, Kategorien, Gutscheine |
| Service | Werkstatt, Termine, Hilfe, Rückgabe |
| Rechtliches | AGB, Widerruf + Formular, Versand & Zahlung, Datenschutz, Impressum, Batterie/Altgeräte |
| Vertrauen | Zahlarten-Icons (nur tatsächlich angebotene), Versandpartner, Kontaktzeiten |

### 1.2 User Journeys (Arbeits-Personas)

Die Personas sind **Arbeitshypothesen aus Best Practice, keine Marktforschungsdaten**. Sie werden
nach Livegang mit echten Analysedaten überprüft.

| Persona | Ziel | Einstieg | Kritischer Moment | Was überzeugt |
|---|---|---|---|---|
| **Markus, 44, Pendler** (Pragmatiker) | Handyhalter, Dashcam, Ladegerät – „soll einfach funktionieren“ | Google-Suche → Produktseite | „Passt das in mein Auto?“ | Eignungsangaben (12 V, Halterung universell), Lieferzeit, Endpreis inkl. Versand |
| **Sabine, 36, Pflege-Enthusiastin** | Pflegeset, Mikrofasertücher, Innenraumreiniger | Kategorie „Pflege“ | Vergleich mehrerer Mittel | Grundpreis pro Liter, Anwendungshinweise, Sicherheitsdatenblatt-Hinweise |
| **Jonas, 29, Motorradfahrer** | Handschuhe, Regenkombi, Helmzubehör | Startseite → Kapitel „Motorrad“ | Größenwahl | Größentabelle, kostenlose Rückgabe-Info (wenn freigegeben), Normkennzeichnung (z. B. EN 13594) nur wenn im Datensatz |
| **Werkstatt / Gewerbe** | Verbrauchsmaterial, Werkzeug, Partnerschaft | Partner-werden | Konditionen | Klare Partnerstrecke, Ansprechpartner, Rechnung |

**Haupt-Journey (Conversion-Pfad):**
Einstieg → Kategorie oder Suche → Produkt (Eignung + Preis + Lieferzeit oben) → „In den Warenkorb“
→ Mini-Bestätigung mit „Weiter einkaufen“ oder „Zum Warenkorb“ → Warenkorb (Versand-Fortschritt,
Endsumme) → Kasse in 4 Schritten (bereits so umgesetzt: Adresse, Versand, Prüfen, Zahlung) →
Bestätigung → E-Mail → Bewertungseinladung erst nach Zustellung.

### 1.3 Vertrauensarchitektur (deutsches Recht und Käufererwartung)

Unterteilt in **Pflicht** (rechtlich erforderlich, vor Livegang juristisch prüfen) und **Vertrauen**
(Conversion-Hebel). Status bezieht sich auf das, was im Code sichtbar ist.

| # | Element | Art | Status heute | Maßnahme |
|---|---|---|---|---|
| T1 | Endpreis inkl. MwSt. + „zzgl. Versand“ mit Link (PAngV) | Pflicht | Preis + `taxShipping`-Hinweis vorhanden | Link „Versand“ auf neue Seite *Versand & Zahlung* |
| T2 | **Grundpreis** (€/l, €/kg) bei Flüssigkeiten/Mengenware (§ 4 PAngV) | Pflicht | fehlt | aus BigBuy-Inhalt/Gewicht ableiten; ohne gesicherte Menge kein Verkauf der Pflegemittel |
| T3 | Streichpreis nur mit **niedrigstem Preis der letzten 30 Tage** (§ 11 PAngV) | Pflicht | keine Streichpreise | Streichpreise vorerst **nicht** verwenden |
| T4 | Button „zahlungspflichtig bestellen“ (§ 312j BGB) | Pflicht | ✅ „Zahlungspflichtig bestellen“ | beibehalten |
| T5 | Wesentliche Merkmale + Gesamtpreis + Lieferzeit unmittelbar vor Bestellung | Pflicht | Prüfen-Schritt vorhanden | **Lieferzeit** und Widerrufs-Kurzhinweis im Schritt „Prüfen“ ergänzen |
| T6 | Widerrufsbelehrung + Muster-Widerrufsformular | Pflicht | Widerruf vorhanden | Formular als Download/Seite ergänzen; Link im Prüfen-Schritt |
| T7 | Versand & Zahlung als eigene Seite | Pflicht-nah | fehlt | neue Seite (★) |
| T8 | Lieferzeitangabe je Produkt | Pflicht | fehlt | aus BigBuy-Lager/Handling ableiten („Lieferzeit 3–6 Werktage“), nur konfigurierte Werte |
| T9 | **GPSR** (EU 2023/988): Hersteller/Verantwortlicher + Sicherheitshinweise auf Produktseite | Pflicht | Herkunft/Quelle angezeigt, Hersteller fehlt | Feld „Hersteller/Verantwortliche Person“ und Warnhinweise aus BigBuy-Daten; ohne Angaben kein Verkauf |
| T10 | **BattG**-Hinweis (Rücknahme Altbatterien), falls Batterien/Starthilfen | Pflicht bei Sortiment | fehlt | Seite ★ + Hinweis auf betroffenen Produktseiten |
| T11 | **ElektroG**-Hinweise (Altgeräterücknahme, WEEE-Reg.-Nr.), falls Elektronik | Pflicht bei Sortiment | fehlt | wie T10; Registrierung ist Voraussetzung, sonst Elektronik nicht listen |
| T12 | **VerpackG** (LUCID-Registrierung) | Pflicht | nicht im Code prüfbar | Registrierung nachweisen, Nummer intern führen |
| T13 | **BFSG** (Barrierefreiheit seit 28.06.2025) | Pflicht (außer Kleinstunternehmen) | WCAG-2.2-AA-Ziel bereits im Repo | Barrierefreiheitserklärung ergänzen |
| T14 | Impressum, Datenschutz, Cookie-Einwilligung (TDDDG) | Pflicht | vorhanden (seitenweit, Consent-UI) | Verkäufer-Entität im Shop-Impressum eindeutig (B.V., KvK, USt) |
| T15 | Zahlarten-Vielfalt: PayPal, Kauf auf Rechnung, Kreditkarte, Apple/Google Pay | Vertrauen | nur Revolut Hosted Checkout | Revolut-Methoden prüfen (Karte/Apple/Google Pay); Rechnung/PayPal als Phase 2 |
| T16 | Echte Bewertungen + Hinweis zur Echtheitsprüfung (§ 5b Abs. 3 UWG) | Vertrauen | keine | erst nach echten Bestellungen; **keine erfundenen Bewertungen** |
| T17 | Gütesiegel (z. B. Trusted Shops) | Vertrauen | keines | nur nach echter Zertifizierung zeigen |
| T18 | Deutscher Ansprechpartner, Reaktionszeit, Kontaktwege | Vertrauen | Kontaktseite vorhanden | Kontaktbox in Hilfe, Warenkorb und Kasse |
| T19 | Sichere Zahlung (TLS, Weiterleitung zum Zahlungsanbieter) | Vertrauen | Revolut-Hinweis vorhanden | kurze Trust-Zeile unter dem Bestellbutton |

**Trust-Leiste (einheitlich, unter Hero und im Warenkorb), nur belegbare Aussagen:**
`Endpreise inkl. MwSt.` · `14 Tage Widerrufsrecht` · `Sichere Zahlung über Revolut` ·
`Deutscher Ansprechpartner` · `Werkstattsuche für den Einbau`.
Freigabepflichtige Aussagen wie „Kostenloser Versand ab X €“ oder „Kostenlose Rückgabe“ erscheinen
erst, wenn der Wert in der Konfiguration steht und freigegeben ist.

---

## 2 · Visueller Storytelling-Faden

> **Stand 04.11.2026:** Eine erste Umsetzung als gezeichnete SVG-Szenen hat der Inhaber verworfen; sie ist vollständig zurückgenommen. Die Bildgeschichte wird nur mit hochwertigem Bildmaterial umgesetzt, also echter Fotografie oder fotorealistischen Renderings, kombiniert mit echten Packshots. Inhaberentscheidung 04.11.2026: **echte Produktfotos**. Die Hero-Bühne auf Shop, Kategorien, Kategorie und Suche (`apps/web/components/shop/ProductShowcase.tsx`) zeigt 3–4 echte, verfügbare Katalog-Packshots auf der Graphit-Bühne und verlinkt die Produkte. Liefert der Katalog weniger als drei Artikel mit gültigem Lieferantenbild, bleibt der freigegebene Atelier-Film. Szenische Motive (Kapitel 0–8) folgen erst mit echter Fotografie.

### 2.1 Leitidee: „Eine Saison mit Ihrem Fahrzeug“

Eine fortlaufende Bildgeschichte. **Ein und dasselbe neutrale Fahrzeug** begleitet den Kunden durch
den Shop: dunkelgraphitfarben, markenlos, ohne Logos und Kennzeichen. Jede Seite ist ein Kapitel. Das
Licht wandert durch den Tag: Morgendämmerung in der Garage, Arbeitslicht an der Werkbank, goldene
Stunde bei der Abfahrt.

**Warum das funktioniert:**

- Wiedererkennung: Dasselbe Fahrzeug und dieselbe Bühne schaffen Konsistenz und Vertrauen. Das „Peak-End“-Prinzip setzt die stärksten Bilder am Einstieg und auf der Bestätigungsseite.
- Produkte erscheinen **im Gebrauch und im Kontext** statt als isolierte Packshots. Das ist nachweislich der stärkste Treiber für Kaufabsicht bei Zubehör.

**Gestalterische Konstanten (aus dem bestehenden Designsystem, keine neuen Werte):**

| Konstante | Token / Regel | Bildwirkung |
|---|---|---|
| Grundfläche | `--color-graphit-900/850`, `--gradient-seitengrund` | Garage/Studio in tiefem Graphit; Bilder laufen randlos in den Seitengrund aus |
| Akzentlicht | `--color-marke-lime` (sparsam) | **eine** schmale Lime-Lichtkante pro Motiv (LED-Leiste, Reflex auf Lack), nie flächig |
| Warmes Kantenlicht | `--color-atelier-champagne`, `--gradient-atelier-stage` | warmer Rim auf Produkten und Karosseriekanten |
| Kühler Gegenpol | `--color-marke-cyan` (sehr sparsam) | Display-Glühen bei Elektronikmotiven |
| Bühne | `.identity-cast`-Prinzip, `--radius-home-media`, `--shadow-home-media` | 16:10-Glasbühne für Heros, wie auf der Startseite |
| Karten | `--radius-karte`, `--shadow-karte`, `--gradient-karte` | Produkt-Packshots auf Graphitkarte |

**Produktbilder, verbindliche Regel:** BigBuy-Packshots werden **unverändert** verwendet, also
keine generative Veränderung von Produkt oder Lieferumfang. Erlaubt ist deterministische
Aufbereitung über die vorhandene Bildpipeline: Format, Weißraum, Schärfe, WebP und Freistellung.
Danach wird das Produkt auf die einheitliche Graphitbühne komponiert. Hintergründe und Fahrzeugszenen
dürfen generiert oder fotografiert sein, aber **ohne Fremdmarken, ohne echte Personen ohne
Einwilligung und ohne erfundene Produkte**. Generierte Szenen werden intern als solche
gekennzeichnet (Herkunft in `config/editorial-art.json`).

### 2.2 Kapitel je Seite

Jedes Motiv beschreibt: **Szene · Komposition (Bildbereich rechts, Text links wie im Bestand) ·
Produktplatzierung · Alt-Text-Muster · Format**.

**Kapitel 0 – Startseite nexifyai.de, Shop-Teaser („Die Einladung“)**

- Szene: Garagentor halb geöffnet, Morgenlicht fällt als warme Fläche auf den Boden, Fahrzeugfront im Halbschatten, eine Lime-LED-Kante an der Werkbank im Hintergrund.
- Produkte: drei echte Bestseller-Packshots (Pflege, Elektronik, Sicherheit) stehen als Glaskarten (`hc-gallery-card`-Stil) vor dem Bild.
- Zum bestehenden Startseiten-Hero: Das Kapitel ist als **Teaser-Sektion unter dem Hero** gedacht. Es ersetzt den Agentur-Hero nicht, solange dieser laut AGENTS.md als Video-/Präsentationsbühne geführt wird. Soll der Hero selbst ersetzt werden, ist das eine Eigentümerentscheidung, die vorher in AGENTS.md zu dokumentieren ist.
- Format: 16:10, Bühne wie `.identity-cast`. Alt: „Garage im Morgenlicht mit Fahrzeugfront; davor Pflegeset, Dashcam und Warnweste aus dem TEILEKLAR-Sortiment“.

**Kapitel 1 – `/teileklar` Shop-Start („Ankommen“)**

- Szene: dasselbe Fahrzeug, jetzt in der Garage, Licht an. Seitlich eine aufgeräumte Werkbank, an der Wandleiste vier Zonen, die die Hauptkategorien andeuten (Pflege, Innenraum, Elektronik, Sicherheit).
- Produkte: 4–6 echte Packshots, je eins pro Hauptkategorie, auf der Werkbank. Sie sind über Bildkarten darunter klickbar, nicht über Hotspots im Bild (barrierearm).
- Hero-Text links, Bild rechts (Bestandslayout). Trust-Leiste direkt darunter.

**Kapitel 2 – `/teileklar/shop` („Die Werkbank“)**

- Szene: Draufsicht auf die Werkbank, Graphitfläche, Produkte in Reihen sortiert. Das Bild erklärt „Sortiment“ ohne Worte.
- Produkte: Kategorie-Repräsentanten; die Bildkarten verlinken die Kategorien.

**Kapitel 3 – `/teileklar/kategorie/<slug>` („Die Ordnung“)**, je Kategorie ein schmales Banner (21:9):

| Kategorie (BigBuy-Teilbaum) | Szene | Platzierte Produktart |
|---|---|---|
| Autopflege | Lack in Nahaufnahme, Wassertropfen perlen ab, champagnerfarbener Rim | Shampoo, Wachs, Mikrofaser |
| Innenraum & Organisation | Cockpit-Detail im Morgenlicht | Handyhalter, Sitzorganizer, Sonnenschutz |
| Elektronik & Laden | Armaturenbrett nachts, Display-Glühen in Cyan | Dashcam, 12-V-Ladegerät, Kabel |
| Sicherheit & Pannenhilfe | Kofferraum geöffnet, Warndreieck-Silhouette, Lime-LED als Warnlicht | Warnweste, Verbandkasten, Starthilfe |
| Werkzeug & Werkstatt | Werkbank im Arbeitslicht | Drehmoment-, Steckschlüsselsatz |
| Motorrad | dasselbe Garagenset, Motorrad statt Auto, gleiche Lichtstimmung | Handschuhe, Regenkombi, Helmzubehör |

Die tatsächlichen Kategorienamen kommen aus der BigBuy-Taxonomie. Die Banner werden über eine
Zuordnung *Kategorie-ID → Motiv* gepflegt, nicht hart codiert.

**Kapitel 4 – Produktdetail („Das Detail“)**

- Galerie: 1. echter Packshot auf Graphitbühne (Hauptbild), 2.–n. weitere BigBuy-Bilder, optional ein **Kontextbild** aus dem Kapitel der Kategorie (gekennzeichnet als „Anwendungsbeispiel“).
- Kein generiertes Bild des Produkts selbst.

**Kapitel 5 – Warenkorb („Der Kofferraum“)**

- Schmale Kopfgrafik: geöffneter Kofferraum, Produkte liegen geordnet in einer Box. Eine Lime-Kante am Fortschrittsbalken greift das Akzentlicht auf. Den Balken gibt es nur, wenn eine Versandschwelle freigegeben ist.

**Kapitel 6 – Kasse („Die Abfahrt“)**

- **Bewusst bildarm** (Ablenkung reduziert die Abschlussrate). Nur ein dezentes Garagentor-Motiv in der Schrittleiste: Das Tor öffnet sich Schritt für Schritt (rein dekorativ, `aria-hidden`).

**Kapitel 7 – Bestellbestätigung („Unterwegs“)**

- Szene: Fahrzeug fährt in goldener Stunde aus der Garage, Straße mit Lime-Lichtreflex. Das ist das Peak-End-Bild: Erleichterung und Vorfreude.
- Darunter: „Was jetzt passiert“-Zeitleiste (vorhandene `OrderTimeline`).

**Kapitel 8 – Werkstatt („Die Werkstatt“)**

- Szene: Profi-Werkstatt, gleiches Fahrzeug auf der Hebebühne, Hände eines Mechanikers (anonymisiert, Rückenansicht). Botschaft: „Wenn es mehr als Zubehör braucht.“

**Ratgeber/Werkzeuge** (Reifenrechner, Batterie-Berater, Eignung prüfen): Illustrative
Detailmotive (Reifenflanke mit Maßangabe, Batteriepol, Halterungsmechanik) im gleichen Licht.

**Rechtliches/Hilfe:** keine Heros. Ruhige Typografie, höchstens ein Icon pro Abschnitt.

### 2.3 Produktionsliste (Assets)

| ID | Motiv | Format | Varianten |
|---|---|---|---|
| H-00 | Einladung (Startseiten-Teaser) | 16:10, 2400×1500 | Desktop/Mobil-Crop 4:3 |
| H-01 | Ankommen (Shop-Start) | 16:10 | 4:3 |
| H-02 | Werkbank-Draufsicht | 16:10 | 4:3 |
| B-xx | Kategorie-Banner (6+) | 21:9, 2520×1080 | 16:9 mobil |
| K-05 | Kofferraum | 21:9 schmal | – |
| H-07 | Unterwegs (Bestätigung) | 16:10 | 4:3 |
| H-08 | Werkstatt | 16:10 | 4:3 |

Alle Dateien als WebP/AVIF mit Breitenstufen 640/1024/1600/2400, `loading="lazy"` außer dem
LCP-Hero (`fetchPriority="high"` wie im Bestand), Alt-Texte deutsch, beschreibend, ohne
Werbefloskeln.

---

## 3 · Optimierte Inhalte und Copywriting

Tonalität: **klar, sachlich-souverän, „Sie“, kurze Sätze**. Deutsche Käufer reagieren auf
Präzision und belegbare Zusagen, nicht auf Superlative. Verben in CTAs beschreiben das Ergebnis.
Keine Dringlichkeits-Tricks (künstliche Countdowns, „nur noch 1“ ohne echten Bestand). Das wäre
nach UWG und Omnibus-Richtlinie riskant und schadet dem Vertrauen.

### 3.1 Shop-Startseite `/teileklar`

- **H1:** Zubehör für Auto & Motorrad. Klar beschrieben, fair berechnet.
- **Sub:** Pflege, Elektronik, Sicherheit und Werkzeug – mit vollständigen Angaben, Endpreisen inkl. MwSt. und einer Werkstattsuche, wenn es mehr braucht.
- **CTA primär:** Sortiment entdecken · **sekundär:** Werkstatt in Ihrer Nähe finden
- Trust-Leiste (siehe 1.3)
- **Sektion „Beliebte Kategorien“**: 6 Bildkarten (Kapitel 3), je Karte: Name + eine Nutzenzeile, z. B. *Autopflege – Glanz, der hält.* · *Sicherheit – Für den Ernstfall vorbereitet.*
- **Sektion „Gerade gefragt“**: 8 Produktkarten. Nur echte, verfügbare und preisfreigegebene Artikel; Sortierung nach Verfügbarkeit, nicht nach Marge.
- **Sektion „So einfach geht's“**: drei Schritte: *Auswählen* → *Sicher bezahlen* → *Geliefert oder in der Werkstatt montiert*.
- **Sektion „Warum TEILEKLAR“**: drei Säulen (Klarheit · Eignung · Werkstatt), je zwei Sätze.
- **FAQ-Kurzblock** (4 Fragen: Versandkosten, Lieferzeit, Rückgabe, Zahlarten) mit Link „Alle Antworten“.

### 3.2 Kategorieseite

- **H1:** {Kategoriename}
- **Intro (2–3 Sätze, SEO + Orientierung):** z. B. Autopflege: *„Saubere Oberflächen schützen den Lack und den Wert Ihres Fahrzeugs. Hier finden Sie Reinigungs- und Pflegemittel für Lack, Felgen und Innenraum – mit Grundpreis und Anwendungshinweisen.“*
- Filter: Verfügbarkeit, Preis, Unterkategorie (Eignung erst, wenn Daten strukturiert vorliegen).
- Sortierung: *Empfohlen* (Verfügbarkeit + Datenqualität), *Preis aufsteigend/absteigend*, *Neu*.
- Leerzustand: *„In dieser Kategorie ist gerade nichts verfügbar. Schauen Sie in verwandte Kategorien oder lassen Sie sich von einer Werkstatt beraten.“*

### 3.3 Produktkarte (Formel)

```
[Packshot auf Graphitkarte]
{Produktname, max. 2 Zeilen, Hersteller vorn wenn vorhanden}
{Eignungs-Chip: „Universell“ | „12 V“ | „Gr. M–XL“}   (nur aus Daten)
{Preis} inkl. MwSt. · {Grundpreis bei Mengenware}
{Verfügbarkeit: „Auf Lager · Lieferzeit 3–6 Werktage“}
[In den Warenkorb]
```

### 3.4 Produktdetailseite (Template)

Above the fold, in dieser Reihenfolge (deutscher Standard):

1. Produktname (H1), darunter Hersteller · Art.-Nr. (SKU) · EAN
2. **Preis** groß, „inkl. MwSt., zzgl. [Versand]“ (Link), Grundpreis
3. **Verfügbarkeit + Lieferzeit**
4. Menge + **CTA „In den Warenkorb“**
5. Trust-Zeile: *14 Tage Widerruf · Sichere Zahlung · Deutscher Ansprechpartner*
6. **Eignung** (Box `tk-fitment`): *„Geeignet für: …“* / *„Bitte prüfen: …“*. Ist keine Eignung belegt, steht dort: *„Universelles Zubehör. Bei Fragen zur Montage hilft eine Werkstatt aus unserem Netz.“* mit Link zur Werkstattsuche.

Darunter in Reitern oder Abschnitten:

- **Beschreibung** (aus BigBuy, sprachlich bereinigt: Absätze, Aufzählung der Hauptmerkmale; keine erfundenen Eigenschaften)
- **Technische Daten** (`tk-facts`: Maße, Gewicht, Material, Inhalt)
- **Lieferumfang**
- **Sicherheit & Hersteller (GPSR)**: Hersteller/verantwortliche Person, Warn- und Sicherheitshinweise
- **Entsorgung** (BattG/ElektroG), falls betroffen
- **Versand & Rückgabe** (Kurzfassung + Link)

**Textformel Kurzbeschreibung** (3 Bullets über dem CTA, nur aus Produktdaten):
*Nutzen* – *Eignung/Anwendung* – *Besonderheit*. Beispiel Dashcam:
- Zeichnet Fahrten in {Auflösung} auf – für den Fall der Fälle.
- Für 12-V-Bordsteckdose, Saugnapfhalterung inklusive.
- {Speicherkarte bis X GB} – nur wenn im Datensatz.

**Rechtlicher Hinweis zu Dashcams:** Einen kurzen Hinweis auf die datenschutzkonforme Nutzung
(anlassbezogene Aufzeichnung) aufnehmen. Wortlaut zur juristischen Freigabe.

### 3.5 Warenkorb

- **H1:** Ihr Warenkorb
- Zeilen mit Bild, Name, Eignungs-Chip, Menge (±), Einzel- und Zeilenpreis, „Entfernen“
- **Zusammenfassung:** Zwischensumme · Versand · **Gesamtsumme inkl. MwSt.** (enthaltene MwSt. ausgewiesen, vorhanden: `vat_included_cents`)
- **CTA:** Zur Kasse · sekundär: Weiter einkaufen
- Preisänderungshinweis (vorhanden: `confirm-changes`): *„Seit Ihrem letzten Besuch hat sich ein Preis oder die Verfügbarkeit geändert. Bitte prüfen Sie die markierten Artikel.“*
- Trust-Box: Zahlarten · Widerruf · Kontakt mit Reaktionszeit

### 3.6 Kasse (4 Schritte, bestehende Struktur)

| Schritt | Überschrift | Microcopy |
|---|---|---|
| Adresse | Wohin dürfen wir liefern? | „Nur Angaben, die wir für die Lieferung benötigen.“ Gastbestellung prominent, Konto optional |
| Versand | Wie möchten Sie es erhalten? | Option „Standardversand · {Preis} · {Lieferzeit}“ |
| Prüfen | Bitte prüfen Sie Ihre Bestellung | Alle Artikel, Lieferadresse, Lieferzeit, Gesamtpreis; Checkbox: „Ich habe die [AGB] gelesen. Die [Widerrufsbelehrung] habe ich zur Kenntnis genommen.“ (Wortlaut juristisch freigeben) |
| Zahlung | Sicher bezahlen | Button **„Zahlungspflichtig bestellen“** (unverändert), darunter: „Sie werden zur gesicherten Zahlungsseite von Revolut weitergeleitet.“ |

### 3.7 Bestellbestätigung

- **H1:** Vielen Dank – Ihre Bestellung ist eingegangen.
- Sub: „Bestellnummer {nr}. Eine Bestätigung ist unterwegs an {E-Mail}.“
- Zeitleiste: *Bestellung eingegangen → Zahlung bestätigt → Versandt → Zugestellt*. Es werden nur tatsächlich erreichte Zustände gezeigt (AGENTS.md: keine vermischten Zustände).
- Nebenpfad: „Montage gewünscht? Werkstatt in Ihrer Nähe finden.“

### 3.8 Werkstatt, Ratgeber, Service

- **Werkstatt-H1:** Die richtige Werkstatt für Ihr Fahrzeug. · Sub: „Für Einbau, Prüfung und alles, was über Zubehör hinausgeht.“
- **Eignung prüfen** (statt „Fahrzeug und Passung“): „So finden Sie heraus, ob ein Zubehör zu Ihrem Fahrzeug passt“: Checkliste Bordnetz, Halterungstyp, Größen, Montageort.
- **Gutscheine:** „Ein Wert. Eindeutige Bedingungen.“ (bestehend, gut). Ergänzen: Gültigkeit, Einlösung, keine Barauszahlung (Freigabe).
- **Hilfe/FAQ** (★): Versand, Lieferzeit, Zahlung, Widerruf/Rückgabe, Garantie/Gewährleistung (Unterschied erklären), Altbatterien/Altgeräte, Kontakt.

### 3.9 Fehlermeldungen und Leerzustände (Prinzip)

Immer **was passiert ist + was der Kunde jetzt tun kann**, nie technische Codes. Beispiele:

- Katalog nicht erreichbar: „Der Katalog ist gerade nicht erreichbar. Bitte versuchen Sie es in einigen Minuten erneut.“ [Erneut laden]
- Katalog noch nicht eingerichtet: „Unser Sortiment wird gerade aufgebaut. Schauen Sie bald wieder vorbei – oder finden Sie schon jetzt eine Werkstatt.“
- Nicht genug Bestand: „Von diesem Artikel sind derzeit nur {n} Stück verfügbar.“

### 3.10 SEO-Grundlagen (für alle Shopseiten)

- Title-Muster: `{Produkt/Kategorie} kaufen | TEILEKLAR` (≤ 60 Zeichen), Meta-Description mit Nutzen + Preis-/Versandhinweis.
- Strukturierte Daten: `Product`, `Offer` (Preis, Verfügbarkeit, `priceCurrency: EUR`), `BreadcrumbList`. Keine `AggregateRating` ohne echte Bewertungen.
- Kategorie-Intro über dem Raster, längere Ratgebertexte unter dem Raster.

---

## 4 · Technische und visuelle Integration

### 4.1 Unveränderliche Rahmen

- **Keine neuen Farben, Radien, Schatten, Schriften.** Nur `config/design-tokens.json` (Graphit/Lime/Atelier, Inter + Plus Jakarta Sans). Jede Abweichung braucht zuerst einen Token-Eintrag (AGENTS.md), und dieses Konzept benötigt keinen.
- Layout: Text links / Medien rechts (`.identity-scene`-Prinzip), Content-Raster, Breakpoints `--breakpoint-s/m/l/xl`, Container-Queries wie im Bestand.
- Interaktion: Ziele ≥ 48 px (`--target-min`), Fokus 2 px Lime (`--focus-ring`), Reduced Motion respektieren.

### 4.2 Abbildung auf vorhandene Bausteine

| Konzeptelement | Bestehender Baustein | Änderung |
|---|---|---|
| Shop-Hero | `ShopFrame` + Muster aus `IdentityHero` (Bühne `.identity-cast`, 16:10) | Heromedium je Seite per Konfiguration |
| Trust-Leiste | neue kleine Komponente `TrustBar` mit vorhandenen Klassen `tk-note`/`tk-badge` | Texte aus Copy-Datei |
| Kategorie-Karten | `CategoryList`, `.tk-categories` | Bild aus Motivzuordnung |
| Produktkarte | `ProductCard`, `.tk-card` | Eignungs-Chip (`tk-badge`), Grundpreis, Lieferzeit |
| Produktdetail | `ProductDetail`, `.tk-product`, `.tk-facts`, `.tk-fitment`, `SellerInfo` | Abschnitte GPSR/Entsorgung/Lieferumfang |
| Warenkorb | `CartView`, `.tk-cart`, `.tk-lines` | Trust-Box, optional Versandfortschritt |
| Kasse | `Checkout`, `.tk-steps`, `.tk-review`, `.tk-terms` | Lieferzeit + Widerrufslink im Prüfen-Schritt |
| Bestätigung | `OrderConfirmation`, `OrderTimeline` | Hero H-07, Werkstatt-Nebenpfad |
| Rechtliches | `TeileklarLegal`, `config/teileklar-legal.json` | neue Dokumente: Versand & Zahlung, Rückgabe, Batterie/Altgeräte |

### 4.3 Daten und Konfiguration

- **Texte:** alle neuen Strings in `config/shop-interface-copy.json` mit identischem Schlüsselsatz de/nl/fr/en (i18n-Paritätsprüfung durch `make check`). Präfixe: `trust*`, `home*`, `category*Intro`, `pdp*`, `checkout*`, `help*`.
- **Seiten:** neue Inhaltsseiten in `config/site-map.json` (öffentlich, `site_context: teileklar`, `public_allowlist`), danach `apps/site/scripts/generate-public-data.mjs`.
- **Bilder:** Motive in `config/editorial-art.json` mit Quelle, Hash und Herkunft (generiert/fotografiert) analog den vorhandenen Atelier-Assets. Motivzuordnung *Kategorie-ID → Banner* als neues Feld dort.
- **Produktdaten (shop-api):** Folgende Felder ergänzen bzw. aus BigBuy übernehmen:
  - `manufacturer`, `safety_notes` (GPSR)
  - `net_content` + `unit` (Grundpreis)
  - `delivery_days_min/max` (Lieferzeit)
  - `disposal_class` (`battery` | `weee` | `none`)
  - `suitability[]` (strukturierte Eignung)

  Ein Artikel ohne Pflichtangaben wird **nicht** veröffentlicht. Das entspricht dem vorhandenen Prinzip „nur nach vollständiger Validierung atomar veröffentlichen“.
- **Preise und Versand:** ausschließlich `pricing.settings` (`markup_percent`, `shipping_cents`, Preisfreigabe). Eine Versandkostenfrei-Schwelle braucht ein neues Konfigurationsfeld mit Freigabe; bis dahin wird kein Fortschrittsbalken angezeigt.

### 4.4 Qualität und Abnahme

- `make check` (Design/i18n/A11y-Audit) und `make test` grün. Neue Komponenten mit Unit-Tests in `apps/site/tests`.
- Browser-Nachweis Shop über die neue shop-api-Teststrecke (`apps/site/tests/browser-shop-api.mjs`): Startseite → Kategorie → Produkt → Warenkorb → Kasse bis vor die Zahlung. Grundpreis, Lieferzeit und Pflichtangaben werden sichtbar geprüft. Es darf keine echte Bestellung entstehen.
- Breiten 320/390/820/1280/1920, kein horizontaler Überlauf, 200 % Textgröße.
- Lighthouse/LCP: Hero-WebP ≤ 200 KB in der 1600-px-Stufe, LCP < 2,5 s mobil.
- Rechtliche Texte (T1–T14) **juristisch prüfen lassen** vor Livegang; danach Freigabe durch den Inhaber.

### 4.5 Umsetzungsreihenfolge

| Phase | Inhalt | Ergebnis |
|---|---|---|
| 1 · Fundament (Pflicht) | Versand & Zahlung, Rückgabe, Hilfe; Lieferzeit, Grundpreis, GPSR-Felder; Prüfen-Schritt ergänzen; Trust-Leiste | rechtssicher verkaufsfähig |
| 2 · Conversion | neue Hero-/Kategorie-Motive (H-01…H-08, B-xx), Produktkarten-/PDP-Template, Kategorie-Intros, FAQ | Story und Orientierung |
| 3 · Vertrauen+ | weitere Zahlarten, echte Bewertungen nach Bestellungen, ggf. Gütesiegel | höhere Abschlussrate |
| 4 · Optimierung | A/B-Tests (CTA-Texte, Kartenlayout), SEO-Ratgeber | messbar steigern |

### 4.6 Festlegungen nach Bestpraxis (Nutzerauftrag „Entscheide nach Bestpraxis“, 04.11.2026)

| # | Thema | Festlegung | Wirkung im Code |
|---|---|---|---|
| 1 | Verkäufer und Rücksendeadresse | Es gelten die vorhandenen Impressums- und Rechtsangaben. Eine eigene Rücksendeanschrift erscheint erst, wenn sie in der Konfiguration steht. | Die Seite *Rückgabe* verweist auf die Widerrufsbelehrung und den Kontakt; eine Adresse wird nicht erfunden. |
| 2 | Versandkosten, Schwelle, Lieferzeit | Alle Werte kommen ausschließlich aus `pricing.settings` bzw. den Produktdaten. Ohne freigegebenen Wert erscheinen kein Versandkostenfrei-Balken und keine Lieferzeit. | Bedingtes Rendering in Produktkarte, Produktseite, Warenkorb und Kasse |
| 3 | Elektronik und Batterien | Entsorgungshinweise erscheinen produktbezogen über `disposal_class`. Vertriebsvoraussetzung ist die ElektroG-/BattG-Registrierung; ohne sie wird nicht veröffentlicht (Importfreigabe). | Hinweisseite *Batterie & Altgeräte* sowie ein Abschnitt auf der Produktseite |
| 4 | Startseiten-Hero | Der Agentur-Hero bleibt (Agenturbotschaft, Video-Endziel laut AGENTS.md). Der Shop-Erzählfaden beginnt als **Kapitel-0-Teaser direkt unter dem Hero** und setzt sich auf `/teileklar` mit eigenem Hero fort. | `HomeContent` + `ShopStoryHero` |
| 5 | Zahlarten | Gezeigt wird nur, was der Revolut-Checkout tatsächlich anbietet. PayPal und Rechnung folgen in Phase 3; keine Platzhalter-Logos. | Trust-Leiste ohne unbelegte Zahlarten |
| 6 | Rechtstexte | Die neuen Seiten sind als Entwurf gekennzeichnet (AGENTS.md: Entwurf 0.9). Vor dem Livegang ist eine juristische Prüfung Pflicht. | Gleiche Behandlung wie die bestehenden TEILEKLAR-Rechtsseiten |

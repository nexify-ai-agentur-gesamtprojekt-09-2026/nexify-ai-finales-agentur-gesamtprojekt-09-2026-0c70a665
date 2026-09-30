# TEILEKLAR — Design- und Lösungsdokumentation

**Dokument-ID:** DESIGN-001
**Stand:** 31.08.2026
**Bezug:** DK-001 (Integriertes Gesamtkonzept V1)
**Artefakt:** `TEILEKLAR Shop.dc.html` (eine Datei, alle Screens)
**Status:** Konzept-/Demo-Stand. Katalog-, Preis-, Zahlungs- und Versanddaten sind nicht angebunden.

---

## 1. Leitentscheidungen (gültig für alles Weitere)

1. **Passung vor Preis.** Kein Kauf ohne sichtbaren Passungsstatus. Fehlt der Fahrzeugkontext, steht jeder Treffer auf „Passung unbestätigt" — neutral grau, nicht grün.
2. **Belege statt Behauptungen.** Jede prominente Aussage trägt Quelle, Stand und Verantwortliche. Keine Zielzahl wird als Ist-Wert dargestellt.
3. **Klärweg statt Fehlkauf.** Bei unklarer Datenlage wird gestoppt und erklärt, was fehlt (Status „Prüfung erforderlich" / „Motorcode klären").
4. **Kein Lieferantenmarketing.** Beschaffungs- und Datenquellen werden nirgends im Frontend beworben. Statusmeldungen lauten „TEILEKLAR Katalogdaten · Stand …" bzw. „Integrationsschritt N1".
5. **Ehrliche Bilder.** Kein Produktbild ohne das tatsächliche Produkt. Fehlt ein Foto, wird der Artikel nicht mit Fremdmotiv bebildert (Feed-Review-Regel).
6. **Herstellermarken nur als Textnennung**, bis Logodateien mit Markenfreigabe je Hersteller vorliegen.

---

## 1a. Sprachregeln (verbindlich)

Grundsatz: **Der Nutzer muss nie ein Fachwort übersetzen.** Fachbegriffe bleiben nur dort, wo sie Produktdaten sind (Maße, Normen, OE-Nummern) — und dann mit Klartext-Label.

| Nicht mehr verwenden | Stattdessen |
|---|---|
| Passung belegt / Fitment | Passt zu deinem Auto |
| Spezifikation belegt | Passt zu deinem Motor |
| Prüfung erforderlich / Motorcode klären | Eine Frage offen |
| Passung unbestätigt | Auto noch nicht gewählt |
| Fahrzeugkontext | Dein Auto |
| Passungsnachweis | Warum das passt |
| Lieferfenster | Lieferzeit / Bei dir in … |
| HSN/TSN (allein) | Schlüsselnummern (aus dem Fahrzeugschein, Felder 2.1/2.2) |
| GTIN / MPN | Barcode (EAN) / Teilenummer (OE) |
| Feed / Marktplatz-Feed | Artikeldaten für Preisportale |
| Integrationsschritt N1/N4/N5 | „ist im Demo-Shop noch nicht aktiv" |
| Evidence / SafetyStop / Governance | ausgeschrieben in Alltagssprache |

Zusätzlich: **Ampel-Legende** („Was die Hinweise bedeuten": grün = passt, orange = eine Angabe fehlt, grau = kein Auto gewählt) auf Startseite und in der Teilesuche, damit die Chips ohne Vorwissen lesbar sind. Gate-Codes (N0–N7) leben nur noch in der Dokumentation, nicht im Shop.

## 2. Designsystem

### Farbe
| Rolle | Wert |
|---|---|
| Papier (Fläche) | `#F2F3EF` |
| Weiß (Karten) | `#FFFFFF` |
| Graphit (dunkle Flächen) | `#0E1315`, sekundär `#1B2226` |
| Tinte (Text) | `#14191C`, gedämpft `#6B7378`, Meta `#8A9296` / `#9AA2A6` |
| Linie | `#E0E2DC` / `#E5E7E1` |
| Akzent Lime | `#C8F04B`, Hover `#D5F76C`, tief `#4A5C10`, Fläche `#E9F6C9` |
| Warnung Amber | `#A9601C`, Fläche `#FBF3E9` / `#FBF0E1` |

Regeln: Lime ist der **einzige** Markenakzent. Amber **ausschließlich** für offene Prüfungen. Grau signalisiert „unbestätigt". Kein Blau, keine Pastellvielfalt (Bruch mit dem Vorgängerstand).

### Typografie
- **Archivo** — Display und Text. Überschriften 800, Tracking −0,04 bis −0,06 em.
- **IBM Plex Mono** — alle technischen Labels: SKU, OE, EAN, Quelle, Stand, Lieferfenster, Brotkrumen, Rechtszeile. 9–11 px, Tracking 0,10–0,18 em, Versalien.
- Prinzip: Was Daten ist, wird Mono gesetzt. Was Aussage ist, wird Archivo gesetzt.

### Form und Raum
Radien: Karten 18–20 px, Panels 20–26 px, Buttons 11–13 px, Chips 99 px.
Schatten sparsam, immer weich und tief (`0 24–34px 60–70px -30px rgba(14,19,21,.35–.45)`).
Container `min(1280px, 100% − 56px)`. Sektionsabstand 84 px Desktop / 56 px Mobil.
Bewegung: 0,25 s für Hover, 0,7 s für Einblendungen, `cubic-bezier(.22,.7,.3,1)`; `prefers-reduced-motion` wird respektiert.

### Logo-Lockup (pixelgenau festgelegt)
- **Header, horizontal:** Signet 14 px auf Versalhöhe der Wortmarke (20 px/800/−0,048 em), 10 px Abstand, 1-px-Trennstrich auf Versalhöhe, Slogan „NA KLAR." Mono 9 px/0,235 em auf gemeinsamer Grundlinie; abschließender Buchstabenabstand optisch ausgeglichen (`margin-right: -.235em`).
- **Footer, gestapelt:** Signet 19 px, Wortmarke 26 px, darunter „NA KLAR." + Lime-Haarlinie, die exakt an der rechten Wortmarkenkante endet (Rule auf `flex: 1`).
- Beide Sperrungen sind umbruchsicher (`white-space: nowrap`, `flex: 0 0 auto`); unter 820 px entfällt die Header-Slogan-Zeile, nie die Wortmarke.

### Bildwelt
Dunkles Studio, warmes Rim-Light, freigestellte Teile, Lime als Datenlinie. Alle Motive stammen aus einem Hero-Render (`assets/source-hero.png`) und sind mit gleicher Nachbearbeitung geschnitten: leichte Kontrastanhebung, Vignette, im Hero zusätzlich Lime-Glow oben rechts und Dunkelverlauf unten für die überlappende Nachweiskarte.
Assets: `hero-fitment.png`, `part-brake.png`, `part-brake-rear.png`, `part-battery.png`, `part-oil.png`, `part-wiper.png`, `part-wiper-rear.png`.
Bilder werden als `background-image` eingebunden (kein `src`-Hole), damit während des Aufbaus keine Fehlanfragen entstehen.

---

## 3. Screens und Bereiche

| Bereich | Zweck | Kernelemente |
|---|---|---|
| Startseite | Vertrauen in Sekunden | Hero mit Nachweis-Komposition, Trust-Band, Trefferraster + Detailpanel, Kundenstimmen, Markenband, FAQ, Werkstatt-Teaser |
| Teilesuche | strukturiertes Finden | Facetten (Kategorie, Einbauort, Marke, „nur belegte Passung"), Sortierung, Trefferzeilen mit OE/EAN/Zubehörhinweis |
| Klarwissen | Entscheidungswissen | 6 Ratgeber mit Thema, Verantwortlichen, Stand, Lesezeit; Symptom-Einstieg; Redaktionsregeln |
| Werkstatt | Einbau organisieren | 3-Schritt-Ablauf, Partnerliste (Entfernung, Leistungen, Termine, Stundensatz), Pro-Fläche mit Auftragsstatus |
| Kontakt | Erreichbarkeit | Anliegen-Chips, Fahrzeugkontext, Nachricht, Berater-Shortcut, Service-Level, Rechtslinks |
| Garage / Konto | Wiederverwendung | Fahrzeug, letzte Bestellung, Kennzahlen, Kontokacheln |
| Warenkorb | Entscheidung sichern | Mengen (+/−), Zeilensummen, Versand pro Position, Zwischensumme, Demo-Hinweis |

Navigation: Header (Teile finden → Suche, Klarwissen, Werkstatt, Garage, Anmelden, Warenkorb), Kontextleiste (Fahrzeug), Brotkrumen je Unterseite, Footer in vier Spalten plus Rechtszeile (Impressum, Datenschutz, AGB, Widerruf, Versand & Zahlung, Batterierücknahme).

---

## 4. TEILEKLAR AI Berater („KLARA")

### Auftritt
Großflächiger, mittig zentrierter Dialog mit Rand rundum (`min(1120px, 100vw − 96px)` × `min(860px, 100vh − 96px)`, 48 px Außenabstand; mobil 12 px). Linke Kontextspalte (Fahrzeug, Warenkorbstand, Bestellstatus, Fähigkeiten), rechts der Verlauf mit Tippindikator und Eingabe. Öffnet einmal pro Sitzung automatisch nach 1,4 s (`sessionStorage`, per Tweak abschaltbar), außerdem über den festen Button unten rechts, über „Produktdetails im Berater" auf jeder Karte und jeder Suchzeile, aus Klarwissen, Werkstatt und Kontakt. Esc schließt.

### Fähigkeiten (implementierte Logik, keine Attrappe)
1. **Fahrzeugkontext** setzen (3 Demo-Fahrzeuge mit HSN/TSN und Motorcode), ohne Fahrzeug keine Passungsaussage.
2. **Symptom-Diagnose** mit Rückfrage: Bremsen quietschen/rubbeln, schlechter Kaltstart, schmierende Wischer, fällige Wartung → begründete Teileempfehlung.
3. **Produktberatung** je Artikel: Einordnung, Prüfpunkte (Maße, Anzugsmomente, Serviceschritte), Variantenvergleich mit Unterscheidungsmerkmal.
4. **Zubehör- und Halterlogik** — der Kern: notwendige und optionale Zusatzpositionen mit Begründung, u. a. Bremsbeläge, Einweg-Schrauben, Verschleiß-Sensor, **Batterie-Bodenleiste B13 als separater Halter**, Polklemmen, Ölfilter mit Dichtring, Ablassschraube.
5. **Warenkorb-Aktionen**: Einzelposition, Zubehör einzeln, „alles Notwendige" als Bündel mit Summe.
6. **Bestellabwicklung im Chat**: Übersicht, Zahlart (Rechnung/Karte/Sofortüberweisung), Kontoanlage oder Gastbestellung, Demo-Bestellnummer, Anschluss an Werkstattvermittlung.
7. **Freitext**: OE-/EAN-/SKU-Erkennung, Stichwort-Zuordnung (Bremse, Batterie, Öl, Wischer, Fahrzeug, Versand/Retoure) und — wichtig — **ehrliches Nichtwissen** statt Raten.
8. **Terminanfrage** aus der Werkstattliste mit Übergabe von Fahrzeug, Status und Artikeldaten.

### Grenzen (im UI benannt)
Keine echte Zahlung, kein echtes Konto, keine Live-Bestände. Beratungswissen ist redaktionell hinterlegt, nicht generativ.

---

## 5. Vertrauensbausteine

- **Kundenstimmen:** 50 Demo-Stimmen im Slider (auto-Fortschritt 6 s, Pfeile, 1–3 Karten je Breite), jede mit Fahrzeug und Anlass. Ausdrücklich als Konzeptinhalte gekennzeichnet; Sterne-Rich-Snippets erst mit verifizierten Bewertungen.
- **Markenband:** Raster aus 24 Logofeldern (`image-slot`, ids `brand-1` … `brand-24`) für die offiziellen Herstellerdateien. Einheitliche Ausgabe: gleiche Feldhöhe 76 px, `fit: contain`, Graustufen-Filter, Deckkraft 0,72 — dadurch wirken unterschiedlich farbige Logos als eine Reihe. Bis eine Datei eingesetzt ist, steht der Markenname im Feld. Logos werden ausschließlich aus den Markenportalen der Hersteller mit deren Nutzungsbedingungen eingesetzt; keine aus dem Netz gezogenen oder nachgezeichneten Marken.
- **Nachweiskarte im Hero:** Fahrzeug, Maße, drei Prüfpunkte, Quelle mit Stand.
- **Feed-/Marktplatzblock** im Detailpanel: GTIN/EAN, MPN/OE, Marke, Zustand, Versand, Lieferfenster, Google-Produktkategorie, Feed-Titel mit Zeichenzähler (150), markiert als „Feed-POC N5".
- **Ehrliche Zustände:** Leerzustand Warenkorb, „Ohne Fahrzeug bestätigen wir keine Passung", Demo-Kennzeichnung in jedem Formular.

---

## 6. SEO und Marktplatz-Vorbereitung

- Title, Meta-Description, OG-Tags, `max-image-preview:large`.
- Strukturdaten: `Product` (SKU, MPN, GTIN-13, Marke, Preis, Zustand, Verfügbarkeit) und `FAQPage` mit vier echten Antworten.
- Keyword-tragende H1 je Seite, fahrzeugbezogene H2 („Ersatzteile für VW Golf VII 1.6 TDI (2015)").
- Produkttitel nach Marktplatzschema: Teiletyp + Maß/Spezifikation + Position + Marke; OE- und EAN-Zeile auf jeder Karte.
- Brotkrumen auf allen Unterseiten; FAQ-Sektion als Ranking- und Klärungsinstrument.
- Offen: Feed-Export, Kategorie-Mapping je Kanal, Preis-/Bestandsaktualität, Bewertungsdaten.

---

## 7. Zugänglichkeit und Robustheit

Fokusringe in Lime (`:focus-visible`), Tastaturbedienung der Karten (`tabIndex`), `aria-label` auf allen Icon-Buttons, `role="dialog"` + `aria-modal` für Berater, Fahrzeugdialog und Warenkorb, `role="img"` mit Beschriftung für Bildflächen, Esc-Schließen, `prefers-reduced-motion`, Umbruchschutz im Logo, Breakpoints bei 1100/1020/980/820/760/700 px (Layoutwerte kommen aus der Logik, nicht aus Media Queries, weil das Artefakt inline gestylt ist).

---

## 8. Tweaks (Design-Component-Props)

| Prop | Wirkung | Standard |
|---|---|---|
| `showDemoStrip` | Demo-Hinweisleiste oben | true |
| `showEvidence` | Passungsnachweis-Box im Detailpanel | true |
| `autoOpenChat` | Berater öffnet automatisch beim ersten Besuch | true |
| `advisorName` | Name des Beraters | KLARA |
| `heroCtaLabel` | Label der Hero-Suchschaltfläche | Suchen |

---

## 9. Offene Punkte (bewusst nicht behauptet)

1. Katalog-, Bestands-, Preis- und Lieferdaten (N1) — inkl. echter HSN/TSN-Fahrzeugsuche.
2. Fitment- und Evidence-Datensätze mit Versionierung, Compliance Cards (N2).
3. Checkout, Payment, Versand, Retoure, Bestellbestätigung (N4).
4. Konto, Login, Consent, Rollen; Bestell- und Dokumentenhistorie.
5. Feed-, Order- und Bestands-POC je Marktplatz (N5).
6. Partner- und Terminlogik der Werkstattfläche, Kartenansicht.
7. Verifizierte Kundenbewertungen; Markenfreigaben für Herstellerlogos.
8. Produktfotos für Artikel ohne eigenes Motiv (aktuell nicht im Sortiment geführt).
9. Rechtstexte (Impressum, Datenschutz, AGB, Widerruf, Versand, Batterierücknahme) und juristische Endprüfung.
10. Accessibility-Audit (BFSG/EN 301 549), Security- und Lasttests.

---

## 10. Änderungsverlauf dieses Artefakts

1. Vollständiger Neuaufbau des Shops als ein System (Farb-, Typo-, Form- und Bewegungsdisziplin).
2. Hero auf Nachweis-Komposition umgestellt, später auf das gelieferte Render gewechselt.
3. Responsives Verhalten über Logikflags ergänzt.
4. Produktdaten SEO-/marktplatzfähig gemacht, Feed-Block eingeführt.
5. Lieferantennennungen vollständig entfernt.
6. Fahrzeugdialog, Suchvorschläge, „Passung unbestätigt"-Zustand, Warenkorbmengen, FAQ + Strukturdaten, Rechtszeile, Mikrointeraktionen.
7. Bildquellen bereinigt (keine Fremdmotive), zwei Artikel durch tatsächlich abgebildete ersetzt.
8. Slogan pixelgenau in zwei Logo-Sperrungen integriert und umbruchsicher gemacht.
9. Teilesuche mit Facetten, AI Berater mit Beratungs-, Zubehör- und Bestelllogik, Klarwissen, Werkstatt, Kontakt, 50 Kundenstimmen, Markenband.

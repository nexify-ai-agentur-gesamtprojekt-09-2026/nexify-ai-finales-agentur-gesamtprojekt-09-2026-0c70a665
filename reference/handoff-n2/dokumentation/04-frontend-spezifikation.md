# 04 · Frontend-Spezifikation

Die `*.dc.html`-Dateien sind **Design-Referenzen** (HTML-Prototypen mit Mock-Logik), keine Produktionscodes. Nachbau im Zielsystem (Empfehlung: Next.js/React + TypeScript, Styling über die Tokens aus Dokument 03).

## Startseite (`NeXifyAI Cloud v12.dc.html`)
| Abschnitt | Inhalt | Interaktion | Zustand/Logik |
|---|---|---|---|
| Hero | H1 „Routine erledigt ein Agent. Sie entscheiden.“, Unterzeile Kennzahl-Konzept, 3 Kacheln (Kennzahl festlegen · Agent bauen · Nachmessen), CTA Erstgespräch | Signalfeld (Canvas, 620 Bahnen, 60°-Raster), Szene mit Maus-Neigung, Szenen-Takt 1,3 s (`heroSchritt` 0–8) | Reduced-Motion → Standbild |
| Laufband | 11 Leistungen | Endlosschleife 46 s | dekorativ, `aria-hidden` |
| Zusagen | 6 Zusagen | – | – |
| Die Zahl (`#zahl`) | Balken 26 Std. vs. 4 Min. (maßstäblich), Regler Anfragen/Woche 5–200 → unbeantwortet = round(n·0,23) | Range-Input | Beispiel-Chip, Quelle Matelso 2024 |
| So arbeitet ein Agent (`#weg`) | 4 Stationen, Grafik je Station, „Ihre Regel“ | Station wählen | `station` |
| Demos (`#demos`) | D1 Anfrage→Antwort (4 Branchen, freier Text), D2 Landingpage (Betrieb/Leistung/Stadt/Preis) | Lauf 650 ms/Schritt | `demoSchritt`; Preis nur wenn ganzzahlig; Domain-Slug aus Eingaben |
| Zwei Wege | Umschalter Individuell/Fertig, Vergleichsbalken | – | `weg` |
| Baukasten (`#leistungen`) | 8 Karten mit Mini-Oberfläche | – | – |
| Ein Entwicklungstag (`#tag`) | Uhr 08–20, Tagesbericht | Stunde wählen, Auto-Takt 4,2 s | `stunde` |
| Companion (`#companion`) | Signet-Zustände, Chat mit Regelwerk | Vorschlags-Chips, Freitext | `ANTWORTEN`-Regeln, Fallback → Übergabe an Pascal |
| Preise (`#preise`) | 3 Pakete, ROI-Rechner (4 Felder), BAFA-Beispiel, Erfahrungswerte | Zahlenfelder | Amortisation = 2.245 € / (P·Std·4,33·Anteil·Satz) |
| Ablauf (`#ablauf`) | 5 Schritte + Fortschrittsrail | – | – |
| FAQ | 6 Einwände, Akkordeon (`aria-expanded`) | – | – |
| Kontakt (`#kontakt`) | Formular Name, E-Mail (geschäftlich), Firma, Anliegen, Einwilligung | Inline-Prüfung, Senden 900 ms, Vorgangsnummer `NX-ANF-2026-nnnnn` | `POST /v1/requests` (Stub) |
| Schwebende CTA | nach 700 px Scroll | – | – |

## one/one+ (`NeXify AI one.dc.html`)
Hero (Terminal-Ablauf 14 Takte), **Arbeitsplatz** (4 Aufträge × 3 Modi; Rückfrage „Erlauben?“ bei Dateiänderung, im Modus „Autopilot“ automatisch, bei „Ablehnen“ Abbruch ohne Änderung; Ergebnis je Auftrag: Seite, Angebot, Code/JSON, Shop-Vorschläge; Prüfliste; Beispielverbrauch), Vergleich one/one+, Zugänge (Web/API/Terminal-Tabs), Prepaid (3 Punkte + Rechner `Aufladung / Verbrauch je Auftrag`), Grenzen (6), FAQ (6), Rechtliches (6, ausklappbar), Schluss-CTA.

## Muster-Shop (`NeXify Shop.dc.html`)
- **Katalog:** 10 Kategorien, 132 Artikel, generiert aus Name-Listen; Preis deterministisch (Hash) in Cent; Lieferzeit 1–2/2–4/3–5 Werktage; Bestand 5–64; Varianten: Größe (Textil), Farbe (Büro Stühle/Tische).
- **Ansichten:** home · liste (Kategorie/Suche/Merkliste) · prod · cart · kasse (Schritte 1–4) · fertig · recht.
- **Suche:** alle Wörter müssen in Name+Marke+Unterkategorie+Kategorie vorkommen; Wörter > 4 Zeichen auch ohne letzten Buchstaben.
- **Filter:** Marke (Mehrfach), Höchstpreis (Regler ×300 €), Lieferung 1–2 Tage; Sortierung Relevanz/Preis↑/Preis↓/Name.
- **Preise:** Cent-Ganzzahlen, brutto (19 %); Geschäftskunde-Schalter → netto (`round(c/1,19)`).
- **Warenkorb:** Menge 1–20, Gutschein `WILLKOMMEN10` = 10 % auf Warenwert; Versand Standard 4,95 € (ab 79,00 € frei), Express 9,95 €, Abholung 0.
- **Kasse:** 1 Adresse (Validierung: Name mit Vor-/Nachname, E-Mail, Straße ≥ 5, PLZ 5 Ziffern, Ort) · 2 Versand · 3 Zahlung (Karte, Vorkasse, Rechnung nur B2B; Demo-Schalter „Zahlung ablehnen“) · 4 Prüfen (AGB-Haken nicht vorbelegt, Button „Zahlungspflichtig bestellen“ § 312j BGB).
- **Berater:** Zweck → Budget → 3 Vorschläge nur aus Katalog, jede Antwort gekennzeichnet.
- **Bestätigung:** `NXS-2026-nnnn`, Statuskette (eingegangen → Zahlung → versendet → zugestellt), E-Mail-Vorschau.
- **Rechtstexte:** AGB, Widerruf inkl. Muster-Formular, Versand & Zahlung, Datenschutz, Impressum, Barrierefreiheit.

## Barrierefreiheit (geprüft im Prototyp)
Sprunglink, `main#inhalt`, Überschriftenfolge, `aria-live` für Protokoll/Chat/Rechner/Toast, `aria-pressed`/`aria-expanded`/`aria-current`, sichtbarer Fokus (2 px Lime), Ziele ≥ 44 px (Ausnahme Header-Pillen 30 px in 44-px-Zeile), Kontrast ≥ 4,5:1, Reduced-Motion.

## Backend-Stellen (im Code als `TODO(BACKEND)` / `data-api-endpoint`)
`POST /v1/requests` (Kontakt) · `POST /v1/shop/orders` (Bestellung, Idempotency-Key) · Chat/Berater → Gateway · Demos → Phase 3 mit echtem one+.

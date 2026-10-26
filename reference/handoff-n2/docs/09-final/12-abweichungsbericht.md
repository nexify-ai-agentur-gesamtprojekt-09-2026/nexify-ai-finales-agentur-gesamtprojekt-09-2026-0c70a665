# 12 · Abweichungsbericht Designsystem 2.0

**Stand 2026-09-29 · erzeugt mit `tools/ds-audit.js` gegen `config/design-rules.json`** · Definition: `docs/09-final/11-designsystem-definition.md` · Maschinenfassung: `config/abweichungen.json`

Geprüft wurden 41 Dateien (davon 3 Vorgängerstände, nur gelistet). Geprüft wird statisch im Quelltext: Farben, Radien, Schriften, Flächen, gemeinsame Bausteine, Barrierefreiheit (Heuristik) und Internationalisierung. **Nicht** geprüft werden gerenderte Kontraste, Layout bei 320/768/1440 px und Texte inhaltlich – das bleibt Handprüfung.

## 1 · Bilanz je Regel
| Regel | Titel | Stufe | Vorher | Nachher | Ausnahme dokumentiert |
|---|---|---|---|---|---|
| DS-C-01 | Farbe nicht im System | Fehler | 306 | 0 | 1 |
| DS-C-02 | Papierfarbe außerhalb der Papier-Palette | Warnung | 9 | 0 | 0 |
| DS-C-03 | Text auf Lime nicht #111312 | Fehler | 14 | 0 | 0 |
| DS-C-04 | Veraltete Farbe – auf Token migrieren | Fehler | 605 | 0 | 4 |
| DS-C-05 | Papier-Vorschau im Bildschirm (zulässig, dokumentiert) | Info | 0 | 108 | 0 |
| DS-T-01 | Schrift außerhalb Geist / Geist Mono | Warnung | 23 | 0 | 19 |
| DS-R-01 | Radius außerhalb der Skala | Warnung | 86 | 0 | 15 |
| DS-S-01 | Flache Karte statt Karten-Verlauf | Fehler | 6 | 0 | 0 |
| DS-S-02 | Flacher Primärbutton statt Verlauf | Fehler | 14 | 0 | 0 |
| DS-B-01 | Kein gemeinsamer Kopf (NX-Header) | Fehler | 0 | 0 | 0 |
| DS-B-02 | Kopf ohne Hauptmenü (variante="leiste") | Fehler | 0 | 0 | 0 |
| DS-B-03 | Kein gemeinsamer Fuß (NX-Footer) | Warnung | 5 | 0 | 4 |
| DS-A-01 | Kein <title> | Warnung | 0 | 0 | 0 |
| DS-A-02 | Bild ohne Alternativtext | Fehler | 0 | 0 | 0 |
| DS-A-03 | Fokus unterdrückt (outline:none) | Fehler | 1 | 0 | 0 |
| DS-A-04 | Bedienziel unter 44 px (Heuristik) | Warnung | 22 | 0 | 0 |
| DS-I-01 | Kein lang-Attribut am Dokument | Warnung | 5 | 0 | 0 |
| DS-I-02 | Sprache/Markt nicht an Kopf/Fuß übergeben | Warnung | 25 | 0 | 0 |
| DS-I-03 | Zahlen-/Datumsformat fest auf de-DE | Info | 45 | 45 | 0 |
| DS-I-04 | Übersetzungsschlüssel nicht deckungsgleich (de/nl/fr) | Fehler | 0 | 0 | 0 |
| DS-I-05 | Seitentext nur Deutsch | Info | 22 | 22 | 0 |

**Fehler:** 946 → 0 · **Warnungen:** 175 → 0. (Vorher = Stand vor der Bereinigung; DS-C-05 und DS-I-04 wurden erst nachträglich als Regel geführt.)

## 2 · Was automatisch behoben wurde
- Veraltete Farben (#3E4240, #FFA43A, #FF6B57 …) auf Tokens umgestellt; #1A1D1B und #E4FF7A ersetzt.
- Flache Karten und Primärbuttons auf Verlauf/Glanz gebracht; Text auf Lime einheitlich #111312.
- `variante="leiste"` entfernt (Hauptmenü überall); Cloud-Menü einheitlich; NX-Footer im Muster-Shop ergänzt.
- `lang`/`market` an alle Kopf-/Fuß-Importe; `<html lang="de">` ergänzt.
- NX-Header: Schlüssel nxOne, demos, shopMuster in nl und fr nachgetragen (Parität de = nl = fr).
- Bedienziele 36–40 px auf 44 px; Regler auf 44 px; Fokusring für die Palettensuche in myADMIN.
- Radien 99 → 999, 2/5 → 4; Schrift IBM Plex Mono → Geist Mono auf Bildschirmseiten.

## 3 · Dokumentierte Ausnahmen
- **NeXify API** – DS-C-01, DS-C-04, DS-R-01: Revolut-Checkout-Mock (Fremdmarke, hell, als Prototyp gekennzeichnet)
- **Papier-Dateien (Broschüren, Folien, Dokumente, Visitenkarte)** – DS-R-01, DS-T-01, DS-C-02: Papier-Variante CD-2026
- **Workspace, myADMIN, Leitstand, Posteingang** – DS-B-03: Anwendungs-Shell mit fester Höhe
- **NeXify Designsystem** – DS-C-01, DS-C-02, DS-B-03: Referenzseite

## 4 · Internationalisierung – Stand
| Baustein/Seite | de | nl | fr | Bemerkung |
|---|---|---|---|---|
| NX-Header | ✓ | ✓ | ✓ | Schlüssel deckungsgleich |
| NX-Footer | ✓ | ✓ | ✓ | Schlüssel deckungsgleich |
| Seiten mit nl/fr-Wörterbuch | ✓ | ✓ | ✓ | Anmeldung, Batterie-Berater, Fitment-Checker, Reifenrechner, TEILEKLAR Shop |
| Seiten nur Deutsch (DS-I-05) | ✓ | ✗ | ✗ | 22 Seiten: API-Rechtliches, Affiliate-Portal, Konto, Kundenportal, Kundenwege, Nachbarschaftskunden-Portal, NeXify AI one, NeXify API, NeXify Designsystem, NeXify Leitstand, NeXify Posteingang, NeXify Shop, NeXify Workspace, NeXify-AI-Companion, NeXifyAI Cloud v12, NeXifyAI-Local-SEO-Muster, NeXifyAI-Wissenshub-Artikel, Partner-werden, Partnerportal, Rechtliches, Werkstatt-Partnerseite, myADMIN v2 |

**Bewertung:** Die Bausteine sind vollständig dreisprachig; die Inhaltsseiten sind es nicht. Das ist ein Übersetzungsauftrag (nl/fr je Seite, Rechtstexte durch Recht), kein Designfehler. Zahlenformate sind an 12 Seiten fest auf `de-DE` (DS-I-03) – korrekt, solange die Seite deutsch ist; bei Übersetzung zentral aus der Sprache ableiten.

## 5 · Ergebnis je Datei

### API-Rechtliches.dc.html — konform
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1

### Affiliate-Portal.dc.html — konform
- **DS-I-03** Info · Zahlen-/Datumsformat fest auf de-DE · 2× (z. B. Zeile 89, 109) – 'de-DE' fest verdrahtet×2
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1

### Anmeldung.dc.html — konform
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 14× (z. B. Zeile 26, 50, 55) – #14191C×7, #4A5C10×4, #F3F4F2×3

### Batterie-Berater.dc.html — konform
- keine Abweichung

### E-Mail-Marketing-Newsletter.html — konform
- keine Abweichung

### E-Mail-Transaktional-Angebot.html — konform
- keine Abweichung

### Fitment-Checker.dc.html — konform
- keine Abweichung

### Geschaeftsdokumente-Vorlagen.dc.html — konform
- DS-T-01 Ausnahme · 4× · Papier-Variante CD-2026

### Investoren-PowerPoint.dc.html — konform
- DS-R-01 Ausnahme · 5× · Papier-Variante CD-2026
- DS-T-01 Ausnahme · 2× · Papier-Variante CD-2026

### Konto.dc.html — konform
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 9× (z. B. Zeile 26, 44, 44) – #14191C×5, #4A5C10×1, #1B2226×1, #4A4038×1, #4A3838×1
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1

### Kundenbroschuere.dc.html — konform
- DS-T-01 Ausnahme · 2× · Papier-Variante CD-2026

### Kundenportal.dc.html — konform
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 9× (z. B. Zeile 26, 67, 71) – #F3F4F2×3, #14191C×3, #4A5C10×1, #646769×1, #A1A3A4×1
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1

### Kundenwege.dc.html — konform
- **DS-I-03** Info · Zahlen-/Datumsformat fest auf de-DE · 3× (z. B. Zeile 202, 290, 313) – 'de-DE' fest verdrahtet×3
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1

### NX 2026 Website.dc.html — nicht Teil des Systems (Vorgänger)
- keine Abweichung

### NX-Footer.dc.html — konform
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 1× (z. B. Zeile 35) – #B4B5B6×1
- **DS-I-03** Info · Zahlen-/Datumsformat fest auf de-DE · 1× (z. B. Zeile 236) – 'de-DE' fest verdrahtet×1

### NX-Header.dc.html — konform
- keine Abweichung

### NX-Intern.dc.html — konform
- keine Abweichung

### Nachbarschaftskunden-Portal.dc.html — konform
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 11× (z. B. Zeile 26, 69, 73) – #14191C×6, #F3F4F2×3, #4A5C10×1, #646769×1
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1

### NeXify AI one.dc.html — konform
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 6× (z. B. Zeile 95, 95, 95) – #F6F7F4×1, #ECEEEB×1, #D8DAD6×1, #3A5F00×1, #33382F×1
- **DS-I-03** Info · Zahlen-/Datumsformat fest auf de-DE · 4× (z. B. Zeile 294, 346, 349) – 'de-DE' fest verdrahtet×4
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1

### NeXify API.dc.html — konform
- **DS-A-04** Warnung · Bedienziel unter 44 px (Heuristik) · 1× (z. B. Zeile 58) – 28 px Ziel×1
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 2× (z. B. Zeile 155, 157) – #5C6670×2
- **DS-I-03** Info · Zahlen-/Datumsformat fest auf de-DE · 5× (z. B. Zeile 196, 197, 305) – 'de-DE' fest verdrahtet×5
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1
- DS-C-04 Ausnahme · 4× · Revolut-Checkout-Mock (Fremdmarke, hell, als Prototyp gekennzeichnet)
- DS-C-01 Ausnahme · 1× · Revolut-Checkout-Mock (Fremdmarke, hell, als Prototyp gekennzeichnet)
- DS-R-01 Ausnahme · 2× · Revolut-Checkout-Mock (Fremdmarke, hell, als Prototyp gekennzeichnet)

### NeXify Designsystem.dc.html — konform
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 17× (z. B. Zeile 178, 178, 178) – #14191C×3, #C8F04B×3, #F2F3EF×2, #646769×2, #0E1315×2
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1

### NeXify Leitstand.dc.html — konform
- **DS-I-03** Info · Zahlen-/Datumsformat fest auf de-DE · 2× (z. B. Zeile 423, 441) – 'de-DE' fest verdrahtet×2
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1
- DS-B-03 Ausnahme · 1× · Anwendungs-Shell mit fester Höhe

### NeXify Posteingang.dc.html — konform
- **DS-I-03** Info · Zahlen-/Datumsformat fest auf de-DE · 4× (z. B. Zeile 153, 156, 165) – 'de-DE' fest verdrahtet×4
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1
- DS-B-03 Ausnahme · 1× · Anwendungs-Shell mit fester Höhe

### NeXify Shop.dc.html — konform
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 4× (z. B. Zeile 270, 271, 271) – #F6F7F4×1, #ECEEEB×1, #D8DAD6×1, #5C6157×1
- **DS-I-03** Info · Zahlen-/Datumsformat fest auf de-DE · 2× (z. B. Zeile 493, 389) – 'de-DE' fest verdrahtet×2
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1

### NeXify Workspace.dc.html — konform
- **DS-I-03** Info · Zahlen-/Datumsformat fest auf de-DE · 7× (z. B. Zeile 475, 476, 547) – 'de-DE' fest verdrahtet×7
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1
- DS-B-03 Ausnahme · 1× · Anwendungs-Shell mit fester Höhe

### NeXify-AI-Companion.dc.html — konform
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 3× (z. B. Zeile 26, 155, 189) – #4A5C10×2, #C4432B×1
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1

### NeXifyAI Cloud v10.dc.html — nicht Teil des Systems (Vorgänger)
- keine Abweichung

### NeXifyAI Cloud v11.dc.html — nicht Teil des Systems (Vorgänger)
- keine Abweichung

### NeXifyAI Cloud v12.dc.html — konform
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 7× (z. B. Zeile 199, 199, 200) – #ECEEEB×1, #D8DAD6×1, #F6F7F4×1, #3A5F00×1, #33382F×1
- **DS-I-03** Info · Zahlen-/Datumsformat fest auf de-DE · 2× (z. B. Zeile 593, 594) – 'de-DE' fest verdrahtet×2
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1

### NeXifyAI-Local-SEO-Muster.dc.html — konform
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 1× (z. B. Zeile 26) – #4A5C10×1
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1

### NeXifyAI-Wissenshub-Artikel.dc.html — konform
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 1× (z. B. Zeile 26) – #4A5C10×1
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1

### Partner-Broschuere.dc.html — konform
- DS-T-01 Ausnahme · 2× · Papier-Variante CD-2026

### Partner-PowerPoint Werkstatt.dc.html — konform
- DS-R-01 Ausnahme · 7× · Papier-Variante CD-2026
- DS-T-01 Ausnahme · 2× · Papier-Variante CD-2026

### Partner-werden.dc.html — konform
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 4× (z. B. Zeile 26, 49, 54) – #14191C×2, #4A5C10×1, #1B2226×1
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1

### Partnerportal.dc.html — konform
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 9× (z. B. Zeile 26, 71, 75) – #F3F4F2×3, #14191C×3, #4A5C10×1, #A1A3A4×1, #646769×1
- **DS-I-03** Info · Zahlen-/Datumsformat fest auf de-DE · 4× (z. B. Zeile 475, 483, 587) – 'de-DE' fest verdrahtet×4
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1

### Rechtliches.dc.html — konform
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1

### Reifenrechner.dc.html — konform
- keine Abweichung

### TEILEKLAR Shop.dc.html — konform
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 1× (z. B. Zeile 1522) – #E2E4E0×1

### Visitenkarte-Pascal-Courbois.dc.html — konform
- DS-R-01 Ausnahme · 1× · Papier-Variante CD-2026
- DS-T-01 Ausnahme · 7× · Papier-Variante CD-2026

### Werkstatt-Partnerseite.dc.html — konform
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 3× (z. B. Zeile 28, 56, 159) – #4A5C10×2, #14191C×1
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1

### myADMIN v2.dc.html — konform
- **DS-C-05** Info · Papier-Vorschau im Bildschirm (zulässig, dokumentiert) · 6× (z. B. Zeile 60, 247, 526) – #6B3A34×6
- **DS-I-03** Info · Zahlen-/Datumsformat fest auf de-DE · 9× (z. B. Zeile 594, 840, 854) – 'de-DE' fest verdrahtet×9
- **DS-I-05** Info · Seitentext nur Deutsch · 1× (z. B. Zeile 1) – nur Deutsch (kein nl/fr-Wörterbuch)×1
- DS-B-03 Ausnahme · 1× · Anwendungs-Shell mit fester Höhe

## 6 · Offene Punkte (manuell)
1. Gerenderte Kontraste und Layout bei 320/768/1440 px prüfen (nicht statisch messbar).
2. Bedienziele: Die Heuristik erkennt nur Höhenangaben im Quelltext; Symbolknöpfe ohne Höhenangabe manuell prüfen.
3. Seitentexte nl/fr übersetzen (Reihenfolge: Start, one, API, Shop, Rechtliches); Rechtstexte je Markt vom Recht freigeben.
4. Vorgängerstände (Cloud v10/v11, NX 2026 Website) archivieren oder löschen, damit sie nicht als Referenz missverstanden werden.
5. DS-C-05 (Papier-Vorschau im Bildschirm) regelmäßig sichten: helle Farbe steht dort absichtlich in dunkler Umgebung.

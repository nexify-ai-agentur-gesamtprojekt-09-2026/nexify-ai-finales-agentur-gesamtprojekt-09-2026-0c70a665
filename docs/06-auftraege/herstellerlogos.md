# Auftrag: Herstellerlogos für das Markenband „Marken im Sortiment"

**Auftraggeber:** TEILEKLAR (Projekt Shop-Design, Artefakt `TEILEKLAR Shop.dc.html`)
**Ziel:** 24 Herstellerlogos beschaffen und als **eine** Download-Datei (ZIP) liefern, damit sie in das bestehende Markenband eingesetzt werden können.
**Stand:** 31.08.2026

---

## 1. Aufgabe

Beschaffe die offiziellen Logodateien der unten genannten 24 Teilehersteller **aus den jeweiligen Marken-, Presse- oder Händlerportalen der Hersteller** (Brand-/Media-/Press-Center, Händler-Downloadbereiche, offizielle Markenrichtlinien-PDFs). Keine Logos aus Bildersuchen, Fan-Seiten, Logo-Sammelportalen, Marktplatz-Listings oder KI-Nachzeichnungen.

Für jede Marke gilt: Datei + Fundstelle + Nutzungsbedingung dokumentieren. Wenn eine Marke kein öffentliches Portal hat, ist der Kontaktweg (Presse-/Händler-E-Mail, Formular) statt einer Datei zu liefern — **lieber eine Lücke mit Nachweis als eine Datei ohne Recht**.

## 2. Markenliste (Feldnummer = Zielposition im Shop)

| Feld | Marke | Feld | Marke |
|---|---|---|---|
| brand-1 | Bosch | brand-13 | Gates |
| brand-2 | VARTA | brand-14 | Valeo |
| brand-3 | MANN-FILTER | brand-15 | HELLA |
| brand-4 | NGK | brand-16 | MAHLE |
| brand-5 | SKF | brand-17 | DENSO |
| brand-6 | SACHS | brand-18 | Elring |
| brand-7 | Lemförder | brand-19 | Pierburg |
| brand-8 | febi bilstein | brand-20 | Zimmermann (Otto Zimmermann) |
| brand-9 | Brembo | brand-21 | Textar |
| brand-10 | ATE | brand-22 | Corteco |
| brand-11 | TRW | brand-23 | NISSENS |
| brand-12 | Continental | brand-24 | OSRAM |

## 3. Technische Anforderungen je Datei

1. **Format:** SVG bevorzugt (Vektor, Pfade, keine eingebetteten Rasterbilder). Falls kein SVG verfügbar: PNG mit **transparentem** Hintergrund, mindestens 600 px Breite oder 200 px Höhe.
2. **Variante:** primäre Horizontalversion der Wortmarke bzw. Wort-Bild-Marke. Keine Claims, keine Jubiläums- oder Kampagnenversionen, keine „Partner"-/„Service"-Sublogos.
3. **Hintergrund:** Version für **helle** Hintergründe (dunkles oder farbiges Logo). Falls verfügbar zusätzlich die Version für dunkle Hintergründe als `*-invers`.
4. **Freistellung:** ohne Rahmen, ohne Schutzzonen-Hilfslinien, ohne Schatten, ohne weiße Box. Beschnitt exakt an der Logo-Bounding-Box.
5. **Farbe:** Originalfarben liefern. Die Graustufen-Vereinheitlichung macht der Shop selbst — keine eigene Umfärbung, kein Nachbau.
6. **Dateiname:** `brand-<Nummer>_<marke>.svg`, z. B. `brand-3_mann-filter.svg`. Kleinschreibung, Bindestriche statt Leerzeichen und Umlaute (`lemfoerder`).

## 4. Lieferung — eine Datei

Ein ZIP-Archiv `teileklar-herstellerlogos.zip` mit:

```
/logos/            alle Logodateien nach Namensschema
/logos-invers/     optionale Dunkelversionen
manifest.csv       eine Zeile je Marke
LIZENZ-HINWEISE.md Nutzungsbedingungen je Marke im Wortlaut oder als Link
```

**`manifest.csv` — Spalten (Semikolon-getrennt):**

`feld;marke;dateiname;format;quelle_url;portal_typ;nutzungsbedingung_url;freigabe_erforderlich;stand;anmerkung`

- `portal_typ`: `Brand-Portal` | `Presse-Center` | `Händlerbereich` | `Markenrichtlinie-PDF` | `kein Portal – Kontaktweg`
- `freigabe_erforderlich`: `nein` (freie Händlernutzung dokumentiert) | `ja` (schriftliche Zustimmung nötig) | `unklar`
- `stand`: Abrufdatum

## 5. Prüfkriterien für die Abnahme

- Jede Zeile in `manifest.csv` hat eine erreichbare `quelle_url` auf einer **herstellereigenen Domain**.
- Kein Logo aus einer Bildersuche, keinem Aggregator, keiner Nachzeichnung.
- SVGs öffnen sauber, enthalten keine externen Referenzen und keine eingebetteten Rasterbilder.
- PNGs haben tatsächlich transparente Pixel (nicht weiß hinterlegt).
- Logos sind bei einheitlicher Höhe von 48 px optisch lesbar (Feintest: auf 48 px skaliert, in Graustufen, 72 % Deckkraft).
- Marken mit ungeklärter Rechtslage sind als `freigabe_erforderlich = ja/unklar` markiert und **nicht** im Ordner `/logos/`, sondern in `/zur-freigabe/`.

## 6. Rechtlicher Rahmen (bitte einhalten)

Herstellerlogos sind eingetragene Marken. Zulässig ist in der Regel die beschreibende Verwendung zur Kennzeichnung tatsächlich gehandelter Ware; viele Hersteller regeln Größe, Schutzzone, Hintergrund und Kontext in ihren Markenrichtlinien. Aufgabe umfasst daher ausdrücklich: **die jeweilige Nutzungsbedingung mitliefern**, nicht nur die Datei. Wo ein Händler-/Partnervertrag Voraussetzung ist, ist das im Manifest zu vermerken.

## 7. Was danach im Shop passiert (Kontext, nicht Teil des Auftrags)

Die Dateien werden in die 24 vorbereiteten Logofelder eingesetzt (`brand-1` … `brand-24`). Die Darstellung ist bereits festgelegt und vereinheitlicht die Herkunftsvielfalt automatisch: Feldhöhe 76 px, Logohöhe 48 px, `contain`-Skalierung, Graustufen mit leicht reduziertem Kontrast, Deckkraft 72 %. Bis eine Datei vorliegt, steht der Markenname im Feld.

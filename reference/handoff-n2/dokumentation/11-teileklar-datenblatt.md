# 11 · TEILEKLAR – Beschreibung und Datenblatt

**Stand 29.09.2026 · Entwurf zur Freigabe.** Geschäftsbereich von NeXify AI. Kontakt: mail@teileklar.shop.

## Kurzbeschreibung
TEILEKLAR ist der Onlineshop für Fahrzeugteile, der zuerst prüft, ob das Teil passt, und erst dann verkauft. Kern ist der **Passgenauigkeits-Check**: Fahrzeug über Kennzeichen/HSN-TSN/VIN wählen, Teil suchen, Verträglichkeit sehen – bevor das Teil im Warenkorb liegt. Ziel: weniger Rücksendungen. Zwei Wege: **Teile-Shop** (Endkunden, Werkstätten) und **Partnerprogramm** für Werkstätten (Einbau-Termin zum Teil).

## Datenblatt
| Merkmal | Wert |
|---|---|
| Märkte | DE, NL, BE, LU, AT (Marktmatrix: Sprache, Währung, USt., Zahlarten je Land) |
| Sprachen | DE (vollständig), NL/FR/EN (Rahmen, Übersetzung offen) |
| Katalog | Teile mit SKU, OE-Nummer, EAN, Hersteller, Fitment-Liste, Lieferzeit, Bestand |
| Werkzeuge | Fitment-Checker, Reifenrechner, Batterie-Berater, Garage (gemerkte Fahrzeuge), Vergleich, Merkliste |
| Kasse | Adresse → Versand → Zahlung → Prüfen (Button „Zahlungspflichtig bestellen“), Gast oder Konto |
| Preise | brutto für Verbraucher, netto für Werkstatt-Konto; Grundpreis nach PAngV |
| Rechtliches | AGB, Widerruf (14 Tage), Versand & Zahlung, Datenschutz, Impressum, Barrierefreiheit, ElektroG/BattG/VerpackG |
| Standorte | Stadtseiten je Region (Local SEO), Wissens-Ratgeber |
| Schnittstellen (Soll) | Katalog-Import (CSV/TecDoc-kompatibles Mapping – Lizenz klären), Zahlung (Revolut), Versand-Labels, Fitment-Feed |

## Technische Angaben
- Front: Prototyp `TEILEKLAR Shop.dc.html`; Zielsystem wie Muster-Shop (Dokument 04/05).
- Fitment: Tabelle `fitment(sku, kba_hsn, kba_tsn, bau_von, bau_bis, position)`; Antwort **passt / passt nicht / prüfen** – nie „passt“ ohne Treffer.
- Preise in Cent, USt. nach Lieferland (OSS), Idempotency-Key auf Bestellung.
- Retouren: Grund-Erfassung „passt nicht“ speist die Fitment-Qualität zurück.

## Kennzahlen (Ziele, keine Ist-Werte)
Rücksendequote „passt nicht“ senken (Messung ab Live), Anteil Suche mit Fahrzeugwahl, Conversion Warenkorb → Kasse. Belege für Marktaussagen nur mit Quelle und Datum.

## Offen
Katalog-Datenquelle und Lizenz · Fitment-Datenqualität · Marktmatrix Zahlarten · anwaltliche Prüfung · NL/FR-Übersetzung.

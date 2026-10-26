# TEILEKLAR — der Shop

**Onlineshop für Kfz-Ersatzteile mit belegter Passung.**
Betreiber: NeXify AI by NeXify, Venlo (NL) · Sieben Marktversionen · Dreisprachig · Installierbar als App

> **Grundsatz:** Ohne Fahrzeugkontext wird keine Passung behauptet. Jede prominente Aussage trägt Quelle und Stand. Bei unklarer Datenlage wird geklärt oder gesperrt — nicht geschätzt.

Kernversprechen: **Fahrzeug einmal auswählen, danach nur noch passende Teile sehen** — mit Maßen, Herkunft der Angaben und einer belastbaren Lieferzeit statt vager Versprechen.

---

## Marktmatrix

| Markt | Pfad | Sprache | Währung | Steuer | Versand | Lieferzeit |
|---|---|---|---|---|---|---|
| Deutschland | /de/ | de | EUR | 19 % | 4,95 € | 1–2 Werktage |
| Österreich | /at/ | de | EUR | 20 % | 6,90 € | 2–3 Werktage |
| Schweiz | /ch/ | de | CHF | 8,1 % | CHF 12.90 | 3–5 Werktage |
| Niederlande | /nl/ | nl | EUR | 21 % | 5,95 € | 2–3 werkdagen |
| Belgien (NL) | /be-nl/ | nl | EUR | 21 % | 6,50 € | 2–3 werkdagen |
| Belgien (FR) | /be-fr/ | fr | EUR | 21 % | 6,50 € | 2–3 jours |
| Luxemburg | /lu/ | fr | EUR | 17 % | 7,90 € | 2–4 jours |

Ein nicht existierender Markt (etwa fr-FR) darf nirgends auftauchen.

## Daten und Schema

```
assets/legal/*.json      Rechtstexte je Markt (7 × 12 Dokumente)
assets/workshops.json    Werkstattverzeichnis (6.875 Betriebe, 1.104 Orte)
assets/brands/           24 Herstellerlogos mit Nutzungsnachweis
assets/part-*.png        Produktaufnahmen (6 Artikel), freigestellt
db/migrations/001…004    Märkte/Kategorien · Katalog/Passung · Bestellungen · Einwilligung
db/seed/seed_markets.sql Marktstammdaten (Steuer, Versand, Lieferzeit)
```

Vertrauensleiste namhafter Zulieferer (Bosch, ATE, Sachs, Febi Bilstein, Mahle, Zimmermann, Hella, Valeo) — keine No-Name-Ware. Ein Marken-Logo-Raster gibt es bewusst nicht; Hersteller erscheinen als aufklappbare Listen.

## Stand der Umsetzung

| Bereich | Stand |
|---|---|
| Frontend, sieben Marktversionen | fertig |
| Beratungslogik, Bestellstrecke, Einwilligung, Datenrechte | fertig |
| Werkstattverzeichnis (6.875 Betriebe, 1.104 Orte) | eingebunden |
| Rechtstexte (84 Marktdokumente, 8 Verträge) | Fassung 1.0.0, anwaltliche Endprüfung ausstehend |
| Datenbank (4 Migrationen, Stammdaten) | vorbereitet |
| Backend, Zahlung, Versand | spezifiziert |
| Katalog-, Bestands- und Preisanbindung | Lieferantenvertrag ausstehend |
| Login-Anbindung im Frontend | offen — Kontenverwaltung/Bestellhistorie damit noch nicht vollständig nutzbar |
| Interaktive Tools (3 SEO-Zielseiten, dreisprachig) | fertig |

## Rechtsmodell

**B2C und B2B mit getrennten Abläufen.** TEILEKLAR ist Verkäufer und Vertragspartner, kein Vermittler. Entschieden am 31.08.2026 durch den Betreiber, dokumentiert im [Gesamtprojektplan](gesamtprojektplan.md).

Rechtliche Basis: PAngV-Auszeichnung, Widerrufsrecht, Geoblocking-Verordnung (EU) 2018/302, Omnibus-Richtlinie, DIN 5008 für Zahlen- und Datumsformate, WCAG 2.2 / BITV 2.0 für Barrierefreiheit.

## Weiterführend

| Frage | Dokument |
|---|---|
| Was wird gebaut und warum? | [Gesamtprojektplan](gesamtprojektplan.md) |
| Wie ist der Shop gestaltet? | [Designsystem](designsystem.md) · [Design und Lösungen](design-und-loesungen.md) |
| Was genau ist umzusetzen? | [Pflichtenheft](../02-umsetzung/pflichtenheft-installation-betrieb.md) |
| Wie sieht das Backend aus? | [Backend und Datenbank](../03-backend/backend-und-datenbank.md) |
| Wie läuft der Betrieb? | [Betriebslogik und Prozesse](../04-betrieb/betriebslogik-und-prozesse.md) |
| Wie bedient das Serviceteam den Shop? | [Nutzerhandbuch](../04-betrieb/nutzerhandbuch.md) |
| Wie wird der Shop administriert? | [Admin-Handbuch](../04-betrieb/admin-handbuch.md) |
| Wie wird vermarktet? | [SEO, i18n und Local-Marketing](../05-marketing/seo-i18n-und-local-marketing.md) |

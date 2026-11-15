# Entwurfsregeln für die Rechtstexte (Stand 15.11.2026)

Diese Regeln gelten für jede Datei unter `docs/06-recht/entwuerfe/`. Sie sind Arbeitsgrundlage, kein Rechtstext.

## Status

- Alle Texte sind **Entwürfe zur Abnahme durch den Inhaber**. Nichts davon ist veröffentlicht oder in Kraft.
- Die Entwürfe sind sorgfältig recherchiert, aber **keine Rechtsberatung**. Vor Veröffentlichung ist eine anwaltliche Prüfung nach deutschem und niederländischem Recht empfohlen; die besonders prüfbedürftigen Stellen stehen je Dokument unter „Für die anwaltliche Prüfung“.
- Fundstellen stehen in `docs/06-recht/quellen/quellenregister-{de,nl,eu}.md` (Abruf 15.11.2026).

## Kopf jeder Datei

```
# <Titel>
Status: ENTWURF zur Abnahme · Fassung 1.0-entwurf · Stand 15.11.2026 · Sprache: <de|nl|fr|en>
Gilt für: <Seite/Adresse, Marke, Zielgruppe, Länder>
Führende Fassung: <de oder nl>; fr/en: Übersetzung, nicht muttersprachlich geprüft
Hinweis: Keine Rechtsberatung. Anwaltliche Prüfung (DE und NL) vor Veröffentlichung empfohlen.
```

Danach in dieser Reihenfolge: der Rechtstext selbst (so, wie er auf der Seite stehen soll), dann die drei Arbeitsabschnitte
„Änderungsübersicht gegenüber dem bisherigen Text“, „Offene Punkte / Platzhalter“, „Für die anwaltliche Prüfung“.
Die Arbeitsabschnitte stehen nur in der deutschen Fassung; die anderen Sprachfassungen verweisen darauf.

## Platzhalter

- Nicht belegte Tatsachen werden nie erfunden. Schreibweise: `[[OFFEN: <Frage an den Inhaber>]]`.
- Rechtsform: Zwei Varianten, deutlich getrennt, überall wo die Rechtsform den Text ändert:
  - `<<VARIANTE A – Eenmanszaak>> … <</VARIANTE A>>` (heutiger Stand des Impressums: Eenmanszaak, KvK 90483944, USt-IdNr. NL865786276B01, Inhaber Pascal Courbois, Graaf van Loonstraat 1E, 5921 JA Venlo, Niederlande)
  - `<<VARIANTE B – B.V.>> … <</VARIANTE B>>` (Firma, Sitz, KvK-Nummer, btw-id, Geschäftsführung als `[[OFFEN]]`)
  - Welche Variante gilt, entscheidet der Inhaber anhand des Handelsregisterauszugs. Kein Entwurf entscheidet das.
- Preise und Konditionen: Es wird kein Preis geändert und keiner neu gesetzt. Wo der bisherige Text einen Betrag nennt, bleibt er wörtlich stehen und wird bei Widerspruch zu einer anderen Quelle als offen markiert. Sonst Verweis auf „das Angebot“ bzw. „die im Shop vor der Bestellung angezeigten Angaben“.
- Dienstleister (Auftragsverarbeiter, Zahlungsdienst, Versand): nur nennen, was im Repository belegt ist (`config/loesungsregister.json`); Vertragsstand (AVV, Standardvertragsklauseln) ist dort nicht belegt und wird als `[[OFFEN]]` geführt.

## Sprache und Stil

- Klar, kurz, ohne Werbesprache. Anrede „Sie“ / „u“.
- Deutsch und Niederländisch sind eigenständige Fassungen mit den Begriffen der jeweiligen Rechtsordnung (keine wörtliche Übertragung deutscher Normbegriffe ins Niederländische). Länderabschnitte, wo sich die Rechtslage unterscheidet.
- Französisch und Englisch sind Übersetzungen der führenden Fassung und tragen den Vermerk „nicht muttersprachlich geprüft“.
- Produktname „NeX AIFly Suite“ (D-011). Marken: NeXify AI (Agentur), TEILEKLAR (Shop).
- Normzitate im Rechtstext sparsam (nur wo üblich, z. B. Widerrufsbelehrung, AVV); die Begründung mit Fundstelle steht in der Anforderungsmatrix.
- Keine Kundenprojekt-Einzelheiten, keine Namen von Kunden.

## Dateinamen

`docs/06-recht/entwuerfe/<sprache>/<nr>-<name>.md`, Sprache `de`, `nl`, `fr`, `en`.

| Nr. | Datei | Bisherige Seite/Quelle |
|---|---|---|
| 01 | `01-impressum` | `/impressum` (`config/site-map.json`, `imprint`) |
| 02 | `02-datenschutz` | `/datenschutz` (`privacy`) |
| 03 | `03-cookies` | `/cookies` (`cookies`) |
| 04 | `04-agb-b2b` | `/agb` (`apps/web/lib/legal/agb.json`) |
| 05 | `05-avv` | `/avv` (`apps/web/lib/legal/avv.json`) |
| 06 | `06-widerruf-agentur` | `/widerruf` (`apps/web/lib/legal/widerruf.json`) |
| 07 | `07-vertragsgrundlagen` | `/vertragsgrundlagen` (`terms`) |
| 08 | `08-ki-hinweise` | `/ki-hinweise` (`ai-notice`), dazu Footer-Kennzeichnung |
| 09 | `09-barrierefreiheit` | `/barrierefreiheit` (`accessibility`) |
| 10 | `10-teileklar-rechtliches` | `/teileklar/rechtliches` (`tk-legal`) |
| 11 | `11-teileklar-agb` | `config/teileklar-legal.json` → `agb` |
| 12 | `12-teileklar-widerruf` | `config/teileklar-legal.json` → `widerruf` |
| 13 | `13-teileklar-versand-zahlung-umwelt` | neu (bisher nur Sätze in den Shop-AGB) |
| 14 | `14-werkstatt-partnerbedingungen` | neu |
| 15 | `15-terminbuchung` | neu (Zweig `claude/werkstatt-termine-stufe1`) |
| 16 | `16-einwilligungstexte` | neu (Zweig `claude/quirky-gates-r14fnk`) |

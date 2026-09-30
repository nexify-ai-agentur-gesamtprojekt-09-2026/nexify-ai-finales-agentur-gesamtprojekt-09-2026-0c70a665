# i18n-Plan · NeXify AI (DE-DE · DE-AT · DE-CH · NL · EN · FR)

**Beschluss 27.09.2026 (Pascal): alle Flächen in DE (D/A/CH), NL, EN, FR.**

## Umgesetzt im Prototyp v10 (27.09.2026)

- Sprachwahl im Kopf (DE · AT · CH · NL · EN · FR), gemerkt in `localStorage` (`nx-loc`), Standard `de-DE`.
- Übersetzt: Navigation, Anmelden, Beratung, Erstgespräch, Menü, Startseiten-Einstieg (Kennung, Titel, Einleitung, Schaltflächen, Hinweis).
- Beträge und Stunden formatieren nach gewählter Region (`toLocaleString(loc)`).
- de-CH: ß → ss automatisch.
- **Noch deutsch:** alle übrigen Abschnitte und Unterseiten, Rechtstexte, Nexi-Dialoge. Beim Wechsel erscheint die Seite ab dem zweiten Abschnitt deutsch.

**Stand 27.09.2026 · Grundlage: Prüfung von `NeXifyAI Cloud v10.dc.html`.**

## Befund (IST)

| Prüfpunkt | Ergebnis |
|---|---|
| Versprechen auf der Seite | „auf Deutsch und Niederländisch“ an mehreren Stellen |
| Sprachwahl | **fehlt** |
| Texte | alle direkt im Template, keine Schlüssel |
| Englische Reststrings | keine gefunden (Download, Submit, Copy … geprüft) |
| Zahlen/Währung | 2× `toLocaleString("de-DE")` im Code (fest auf DE), 11 Beträge von Hand als Text (`449 €`) |
| `Intl`-API | nicht genutzt |
| 3D-Stage | deutsch seit 27.09.; Fehlermeldung noch englisch |

Der Prototyp ist bewusst einsprachig. Das ist in Ordnung, **solange** das Produktiv-Frontend von Anfang an mit Schlüsseln gebaut wird.

## SOLL (Produktiv-Frontend, Next.js)

- **Bibliothek:** next-intl (MIT), Routing `/de/…` und `/nl/…`, Standard `de`, Rückfall `de`.
- **Locales:** `de-DE` (Standard), `de-AT`, `de-CH`, `nl-NL`, `en` (Basis en-GB), `fr` (Basis fr-FR, BE/CH/LU mitgedacht). RTL nicht geplant.
- **Regionale Unterschiede:** de-AT Jänner/Paradeiser nur wo nötig, Geschäftssprache sonst wie DE; de-CH ohne ß, MWST statt MwSt., Beträge in EUR, CHF nur auf Kundenwunsch; FR Anrede „vous“; EN britische Schreibweise, Datum `27 September 2026`.
- **Steuertexte je Land:** DE 19 % USt, AT 20 % USt, CH Reverse Charge/MWST-Hinweis, NL 21 % BTW, FR/BE autoliquidation — aus dem Rechenkern, nie als fester Text.
- **Rechtstexte:** DE-Fassung führend; AT/CH/NL/EN/FR je eigene geprüfte Fassung, bis dahin Hinweis „verbindlich ist die deutsche Fassung“.
- **Struktur:** je Sprache ein Ordner, je Bereich eine Datei:

```
messages/
  de/ common.json  nav.json  home.json  leistungen.json  preise.json
      prozess.json  referenzen.json  kontakt.json  recht.json  portal.json  fehler.json
  nl/ (gleich)
```

- **Schlüssel:** `bereich.abschnitt.element`, z. B. `home.hero.titel`, `preise.tagessatz.hinweis`.
- **Beträge/Daten:** nur `Intl.NumberFormat(locale,{style:"currency",currency:"EUR"})` und `Intl.DateTimeFormat`. Keine Beträge als Text in Übersetzungen, nur Platzhalter: `„ab {preis} netto“`.
- **Plural:** ICU, z. B. `{n, plural, one {# Arbeitstag} other {# Arbeitstage}}`.
- **Kein Zusammensetzen** übersetzter Bruchstücke per Verkettung.
- **Rechtstexte:** eigene Dateien je Sprache, **von Hand juristisch geprüft**, nicht maschinell übersetzt. NL-Fassung braucht Prüfung nach niederländischem Recht (BTW, Verbraucherrecht).
- **KI-Kennzeichnung (Art. 50 KI-VO):** Pflichttext in beiden Sprachen.
- **Nexi/Companion:** antwortet in der Sprache der Seite; Systemtext je Locale in Schicht S2.
- **SEO:** `hreflang` de/nl + `x-default`, übersetzte Slugs (`/nl/diensten`), eigene Meta-Texte.
- **Layout:** NL ist ähnlich lang wie DE; Knöpfe und Überschriften trotzdem mit Umbruch testen (längste Zeichenkette je Schlüssel).

## Prüfung (automatisch)

- `eslint-plugin-i18next`: kein Klartext in Komponenten.
- `i18next-parser` bzw. next-intl-Typen: fehlende Schlüssel in `nl` = Build-Fehler.
- Test: jede Seite in `nl` rendert ohne Rückfalltext; Beträge `nl-NL` = `€ 449`.

## Glossar (Auszug, festzulegen)

| DE | NL |
|---|---|
| Tagessatz | dagtarief |
| Erstgespräch | kennismakingsgesprek |
| Werkstatt | werkplaats / garage |
| Angebot | offerte |
| Auftrag | opdracht |
| Tagesbericht | dagrapport |
| Kennzahl statt Versprechen | Cijfers in plaats van beloftes |

| DE | EN | FR |
|---|---|---|
| Tagessatz | day rate | tarif journalier |
| Erstgespräch | intro call | premier échange |
| Angebot | quote | devis |
| Auftrag | order / engagement | mission |
| Werkstatt | workshop / garage | garage / atelier |
| Tagesbericht | daily report | rapport quotidien |
| Leistungen | services | services |

Das Glossar gibt Pascal frei; er spricht Niederländisch und sollte Ton und Begriffe festlegen.

## Reihenfolge

1. Glossar freigeben.
2. Texte aus v10 in `messages/de/*.json` überführen (maschinell, 1:1).
3. NL-Übersetzung, von Pascal gegengelesen; Rechtstexte extern prüfen.
4. Sprachwahl im Kopf (DE | NL), Merken per Cookie, kein automatisches Umleiten nach IP.
5. Prüfungen in die CI.

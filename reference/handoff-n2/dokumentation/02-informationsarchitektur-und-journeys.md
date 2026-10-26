# 02 · Informationsarchitektur und Nutzerwege

## Seitenbaum
```
Öffentlich · nexifyai.cloud
├── Start (v12)  #zahl #weg #demos #leistungen #tag #companion #preise #ablauf #kontakt
├── NeXify AI one / one+  (#test #preise)
│   └── API & Konsole (NeXify API.dc.html)
├── Shop (NeXify Shop.dc.html · Muster-Shop)
│   ├── Start · Kategorie · Suche · Merkliste · Produkt
│   └── Warenkorb → Kasse (4 Schritte) → Bestätigung · Rechtliches
├── Rechtliches (Rechtliches.dc.html): Impressum · Datenschutz · AGB · AGB Shop · Widerruf · Versand · KI-Hinweise · one/one+ · Barrierefreiheit · Cookies
└── Companion (überall eingebettet)

Konto: Anmeldung.dc.html  → Rollen additiv: Kunde · Shop-Kunde · API · Partner · Affiliate · intern
Portale: Kundenportal (Angebote, Projekte, Abnahme, Guthaben, Rechnungen, Tickets, Daten) · Partner · API-Konsole
Intern: Workspace (one+ mit Seitenfeld) · Posteingang · Leitstand · Katalogpflege Shop
```
Hauptnavigation Kopf: **NeXify AI one · Demos · Shop · Preise · API** · Anmelden · CTA „Erstgespräch anfragen“. Kopfzeile oben: Marke (NeXify AI / TEILEKLAR), Statusanzeige, Portale (Kunde/Werkstatt/Gutschein), Sprache.

## Wichtigste Wege
| Weg | Schritte | Ende |
|---|---|---|
| J1 Interessent → Erstgespräch | Start → Zahl/Demo → Preise → Kontaktformular (Prüfung, Einwilligung) → Vorgangsnummer | Termin |
| J2 Ausprobieren | Start #demos oder one #test → Auftrag wählen → Schritte → Rückfrage → Ergebnis | Erstgespräch/Konto |
| J3 Shop-Kauf (Demo) | Suche/Kategorie → Produkt → Korb (Gutschein) → Adresse → Versand → Zahlung → Prüfen (Button-Lösung) → Bestätigung | Demo-Bestellung |
| J4 Shop unter eigener Marke | Muster-Shop → „Diesen Shop unter meiner Marke“ → Kontakt → Angebot → Annahme → Einrichtung 6–8 Tage | Shop live |
| J5 API/Terminal | one-Seite → Terminal-Demo → Konto → Guthaben laden → Schlüssel je Kostenstelle → `nexify login` | Nutzung |
| J6 Kunde im Projekt | Angebot annehmen (Button-Lösung) → Onboarding → Tagesbericht 20:00 → Abnahme L1–L3 → Rechnung → Care | Betrieb |

## Zustände (auf jeder Fläche)
Laden · Leer (mit Vorschlag) · Fehler (verständlich, Feld-nah, `role=alert`) · Erfolg (Vorgangsnummer) · Gesperrt (Guthaben leer, Budget erreicht) · Demo (sichtbar gekennzeichnet).

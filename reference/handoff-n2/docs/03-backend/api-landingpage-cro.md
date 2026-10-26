# NeXify AI API – Landingpage-Prüfung (CRO)

Stand 28.09.2026 · Seite `NeXify API.dc.html#start` · Ziel: **Konto anlegen** (Registrierung über Kundenwege) · Traffic: organisch, Website, Kundenportal.

## Bewertung vorher
| Dimension | Befund |
|---|---|
| Werteversprechen | klar: „Ein Schlüssel. Ein Guthaben. Eine Rechnung.“ + Unterzeile mit Nutzen |
| Headline | gut, aber ohne Zahl oder Beleg |
| CTA | primärer CTA handlungs-, nicht nutzenbezogen („Konto anlegen“); nur einmal auf der Seite |
| Vertrauen | EU-Hosting, Kennzeichnung erst weiter unten; **keine Referenzen, Logos, Kennzahlen** |
| Einwände | 5 FAQ; fehlend: „Was kostet eine Anfrage?“, „Kosten begrenzen?“ |
| Reibung | zweiter Knopf „Zur Konsole“ führte Neukunden in eine Konsole ohne Konto |

## Umgesetzt (Quick Wins)
1. CTA **„Konto kostenlos anlegen“** – Nutzen im Knopf; stimmt, weil keine Grundgebühr.
2. Zweiter Knopf **„Kosten vorab berechnen“** → Preise mit Rechner (größter Einwand: Kosten).
3. **Leiste unter dem CTA:** Keine Grundgebühr · Aufladen ab 50 € · Guthaben verfällt nicht · Hosting in Frankfurt · Nur für Unternehmen – jede Angabe belegt (Konfiguration, Rechtstext), Mindestbetrag über `config/fakten.json` geprüft.
4. **Zwei FAQ** zu Kosten je Anfrage und Budget je Kostenstelle.
5. **CTA-Wiederholung** am Seitenende nach den FAQ.

## Bewusst nicht umgesetzt
- **Social Proof:** keine echten Referenzen, Logos oder Nutzungszahlen vorhanden – erfundene Belege wären irreführend (UWG § 5). Sobald die ersten Kunden zustimmen: 1–3 Logos oder ein Zitat mit Namen unter dem Hero.
- **Headline mit Zahl** („… ab 0,01 € je Anfrage“) erst nach Freigabe der echten Preise.

## Hochwirksam, nach Freigabe
- Echte Preistabelle statt Beispielwerten (Prop `preiseFreigegeben`).
- Registrierung mit Absprung „API“: nach dem Onboarding direkt in die Konsole mit vorgewählter Aufladung.
- Codebeispiele in drei Sprachen (curl, JavaScript, Python) mit Kopierknopf.

## Testideen (`ab-test-planung`, GrowthBook self-hosted)
| Hypothese | Variante | Messgröße |
|---|---|---|
| Kosten sind der größte Einwand | Rechner direkt im Hero statt im Reiter | Registrierungen / Besucher |
| Konkretheit schlägt Abstraktion | H1 „Alle KI-Modelle. Ein Schlüssel. Abrechnung auf den Cent.“ | dito |
| Einstiegshürde Aufladung | Mindestaufladung 25 € vs. 50 € (Entscheidung E3) | erste Aufladung binnen 7 Tagen |

## Headline-Alternativen
1. „Alle KI-Modelle. Ein Schlüssel. Abrechnung auf den Cent.“ – betont Genauigkeit, passt zu Controlling-Käufern.
2. „KI-Modelle für Ihr Unternehmen – in Frankfurt gehostet, im Voraus bezahlt.“ – betont Datenschutz und Kostenkontrolle.
3. Bestand „Ein Schlüssel. Ein Guthaben. Eine Rechnung.“ – kurz, einprägsam; bleibt bis zum Test.

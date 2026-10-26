# Registrierung – Prüfung nach `registrierungsflow-optimierung`

Stand 28.09.2026 · `Kundenwege.dc.html?weg=reg` · Kern `lib/kundenwege.js` (25 Prüffälle, im Browser bestanden)

## Bestand – schon richtig
| Prinzip | Umsetzung |
|---|---|
| Pflichtfelder minimal | nur E-Mail + Passwort + Pflichteinwilligung; Firma, Adresse, USt-IdNr. erst im Onboarding (Progressive Profiling) |
| Kein Bestätigungsfeld | E-Mail und Passwort je einmal |
| Einfügen erlaubt | ja, Passwortmanager funktioniert |
| Mehrstufig mit Zurück | Rolle → Zugangsdaten → Einwilligungen, Zurück auf jeder Stufe, Eingaben bleiben erhalten |
| Vertrauen | freiwillige Einwilligungen nicht vorbelegt, getrennt widerrufbar |
| Fehler | Formular wird nie geleert; bestehende Adresse bekommt dieselbe Antwort (kein Ausspähen) |
| Nach dem Absenden | Bestätigungsschirm, erneut senden mit Bremse, zweiter Klick auf den Link führt zur Anmeldung |

## Befunde und Änderungen
| # | Befund | Wirkung | Lösung | Priorität | Stand |
|---|---|---|---|---|---|
| R1 | Kein sichtbarer Fortschritt | Unsicherheit „wie lange noch?“ | „Schritt n von 3 · Titel“ + Balken mit `progressbar` | hoch | umgesetzt |
| R2 | Tippfehler in der Domain (gmial.com) führen zu nie ankommender Bestätigung | stiller Abbruch | `emailVorschlag()` im Kern, Hinweis „Meinten Sie …?“ mit Übernehmen – keine automatische Korrektur | hoch | umgesetzt, Prüffall KW00 |
| R3 | Passwort nicht einsehbar | Fehleingaben ohne Wiederholungsfeld | Knopf Anzeigen/Verbergen (`aria-pressed`) | hoch | umgesetzt |
| R4 | Passwortregel nur als Zähler | Nutzer weiß nicht, wann es reicht | Restzeichen live, bei Erfüllung Bestätigung in Akzentfarbe | mittel | umgesetzt |
| R5 | Aus der API-Seite musste die Rolle erneut gewählt werden | unnötiger Schritt | `?rolle=kunde` wählt vor und startet bei Zugangsdaten; Zurück führt zur Rollenwahl | mittel | umgesetzt |
| R6 | Mobile Tastatur | Großschreibung/Autokorrektur in der E-Mail | `inputmode="email"`, `autocapitalize="off"`, `spellcheck="false"` | mittel | umgesetzt |
| R7 | CTA „Konto anlegen“ | handlungs- statt nutzenbezogen | „Konto kostenlos anlegen“ – stimmt, da keine Grundgebühr | niedrig | umgesetzt |

## Bewusst nicht umgesetzt
- **Social Login (Google/Microsoft):** braucht OAuth-Konfiguration in Supabase Auth, Datenschutzhinweis zur Übermittlung an den Anbieter und Pascals Freigabe. Vorbereitung: Band Plattform, Abschnitt Auth.
- **Magic Link statt Passwort:** ändert das Sicherheitsmodell (Konto = Postfach). Als Testhypothese geführt.
- **Zeitangabe „Dauert 30 Sekunden“:** nicht gemessen, daher nicht behauptet.
- **Nutzung vor Bestätigung:** nicht für Kunden mit Vertrags- und Zahlungsfunktionen.

## Messung (Gateway-Ereignisse, Langfuse/Matomo)
`reg.start` · `reg.schritt` {nr} · `reg.email_tipp` {angenommen} · `reg.fehler` {code} · `reg.angelegt` · `reg.bestaetigt` · Gerätetyp. Abbruchrate je Schritt = 1 − Folgeschritt/Schritt.

## Testhypothesen (`ab-test-planung`)
1. Rollenwahl nach den Zugangsdaten statt davor senkt den Abbruch in Schritt 1.
2. Magic Link als Alternative neben Passwort erhöht die Abschlussrate mobil.
3. Microsoft-Login für B2B erhöht die Abschlussrate (nach Freigabe R-Social).

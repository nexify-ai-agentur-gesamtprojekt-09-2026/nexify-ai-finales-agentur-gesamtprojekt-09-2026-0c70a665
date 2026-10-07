# NeXify AI API – Prepaid: Umsetzung von Grund auf

Stand 28.09.2026 · baut auf `nexifyai-api-abrechnungskonzept.md` (Fassung 0.9) auf und ersetzt dessen Abschnitte 3, 7 und 8 für Prepaid.

## Bausteine
| Baustein | Datei | Stand |
|---|---|---|
| Produktseite, Preise mit Rechner, Konsole | `NeXify API.dc.html` (#start, #preise, #konsole) | Prototyp; Beispielpreise gekennzeichnet |
| Rechtsseiten (Nutzung, Prepaid, Preisliste, AVV) | `API-Rechtliches.dc.html`; Website-AGB § 4 verweist vorrangig darauf, Datenschutz § 7 nennt Revolut | **Entwurf**, anwaltliche Prüfung NL/DE offen |
| Fachlogik | `lib/prepaid.js` – 24/24 Prüffälle (Browser) | fertig; Betrieb: `api-prepaid-betrieb.md` |
| Konfiguration | `config/api-prepaid.json` | EK-Werte, Formel, Grenzen: Freigabe Pascal |
| Datenbank | `db/migrations/008_api_prepaid.sql` – 6 Tabellen, RLS erzwungen, Journal nur anhängend | nicht gegen echte DB gelaufen |
| API-Vertrag | `api/openapi.yaml` 1.2.0 – `/credit`, `/credit/topups`, `/credit/auto-topup`, `/credit/refund`, `/invoices`, `/prices`, `/estimate`, `/payments/revolut/webhook` | Spectral-Lauf offen |

## Geldfluss
1. **Aufladen:** `POST /v1/credit/topups` → `aufladungAnlegen` prüft 10–5.000 € (Vorgabe Inhaber 29.09.2026, `config/api-prepaid.json` `aufladung.minCent` = 1000) → Worker legt Revolut-Order an (`POST /api/orders`, Betrag in Cent, `merchant_order_ext_ref = NX-<mandant>-<schlüssel>`) → Kunde zahlt im Revolut-Checkout (Revolut Pay oder Karte).
2. **Bestätigen:** Revolut sendet Webhook → Gateway prüft `Revolut-Signature` (HMAC-SHA256 über `v1.<Timestamp>.<Körper>`, 5 min Toleranz, mehrere Signaturen bei Schlüsselwechsel), antwortet sofort 200 → Worker ruft die Order ab und verbucht nur bei `state=completed`, gleicher Referenz, gleichem Betrag, EUR (`zahlungVerbuchen`). Doppelte oder ungeordnete Ereignisse wirken nicht doppelt.
3. **Beleg:** je Gutschrift Anzahlungsrechnung `NX-API-JJJJ-00000`.
4. **Verbrauch:** je Anfrage `reservieren` (Höchstkosten) → Modell → `abrechnen` (Ist, nie mehr als reserviert, idempotent je Anfrage-ID). Intern in Mikrocent, keine Rundung je Anfrage.
5. **Monat:** `monatsnachweis` je Kostenstelle, Rundung je Position.
6. **Ende:** `rueckzahlung` – Rest in ganzen Cent, Konto gesperrt, Überweisung durch Pascal.

## Trennung
Jede Tabelle mit `mandant_id`, RLS erzwungen, in `config/mandanten.json` eingetragen; `tools/mandanten-pruefung.js`: 0 Befunde. Konto-Zugriff im Kern zusätzlich geprüft (PP09). API-Schlüssel nur als SHA-256-Hash mit sichtbarem Präfix.

## Recht und Steuer (Prüfung nötig, nicht ersetzt)
- **B2B only** – schließt Verbraucherrecht (Widerruf, Button-Pflicht) aus; Registrierung bestätigt Unternehmereigenschaft, VIES-Prüfung.
- **E-Geld:** Guthaben nur für eigene Leistungen, nicht übertragbar, nicht auszahlbar außer bei Vertragsende → nach unserer Einschätzung kein E-Geld; **Bestätigung durch Fachanwalt (Wft/ZAG) offen**.
- **Steuer:** Anzahlungsrechnung bei Aufladung + Verbrauchsnachweis; NL 21 % / Reverse Charge / nicht steuerbar nach `lib/rechenkern.js steuer()`. **Steuerberatung (E4) bestätigt den Zeitpunkt.**
- **Kein Verfall**, Erstattung bei Vertragsende (E5) – vermeidet AGB-Kontrolle einer Verfallklausel.
- **Preiserhöhung** 30 Tage Vorlauf mit Sonderkündigung; Senkung sofort.
- Eine spezialisierte Rechts-Skill für Vertragsrecht NL/DE stand nicht zur Verfügung; die Texte folgen gängiger B2B-SaaS-Praxis und sind als Entwurf gekennzeichnet.

## Revolut – vor dem Bau bestätigen
Endpunktpfade, `Revolut-Api-Version`, Ereignisnamen und das Verfahren für gespeicherte Zahlungsmittel (Auto-Aufladung) sind aus dem Stand der Merchant-API übernommen und in `config/api-prepaid.json` als `ungeprueft` markiert. Sandbox zuerst (`sandbox-merchant.revolut.com`), Schlüssel nur aus OpenBao.

## Offene Entscheidungen (Pascal)
E1 Formel · E4 Steuer · E5 Verfall/Erstattung · echte EK-Werte je Stufe · Freigabe der Rechtstexte · Prop `preiseFreigegeben` erst danach auf `true`. (E3 Mindestaufladung ist entschieden: 10 €, Vorgabe Inhaber 29.09.2026.)

## Eingebunden in (28.09.2026)
Website `NeXifyAI Cloud v10` (Weitere Leistungen, Fußzeile, AGB § 4, Datenschutz § 7) · `NX-Footer` (DE/NL/FR) · `Kundenportal` (Bereich „API-Guthaben“) · Tag `#guthaben` im Tag-Router · Dienst `revolut` und Ereignis `zahlung.revolut` in `config/integrationen.json` · Runbooks RB-11–RB-14. Gleichlauf aller Texte prüft `tools/inhaltsabgleich.js` gegen `config/fakten.json`.

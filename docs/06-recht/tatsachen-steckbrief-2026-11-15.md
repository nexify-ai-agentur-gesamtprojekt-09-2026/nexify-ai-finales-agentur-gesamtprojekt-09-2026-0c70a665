# Tatsachen-Steckbrief für die Rechtstexte (Stand `main` 9c9c806, erhoben 15.11.2026)

Nur belegte Tatsachen mit Fundstelle, keine Bewertung. Grundlage für die Entwürfe unter `docs/06-recht/entwuerfe/`.
Erhoben durch Lesen des Repositorys; nichts davon ist am laufenden System nachgemessen.

## 1. Leistungen und Produkte

- **Agenturleistungen (B2B):** Marke & Web, Systeme & KI, Wachstum & Kampagnen. Auf den Seiten stehen keine Preise; Preise sind nicht freigegeben (O-1). — `config/site-map.json` (services, scope, pricing); `docs/05-marketing/gesamtkonzept-2026-11-14.md:63,229`
- **Tagessatz 449 € netto** — `config/fakten.json` (`projekt.tagessatz_eur`); `apps/web/lib/legal/agb.json` § 4 Abs. 1
- **KI-Aufschlag:** 38 % auf KI-Kosten in Projekten (`agb.json` § 4.7), aber 45 % bei der API (`config/api-prepaid.json`, `satz: 0.45`). Als offener Punkt geführt (E1).
- **NeXify AI API (B2B, Prepaid):** Mindestaufladung 10 €, höchstens 5.000 €, bis zu 2 automatische Aufladungen pro Tag, Guthaben verfällt nicht, Rückzahlung auf Antrag (rechtlich nicht bestätigt, E5) — `config/api-prepaid.json`. Älterer Prototyp nennt 50 € Mindestaufladung — `prototypen/API-Rechtliches.dc.html`. Seite sagt: „Tarife stehen noch zur Freigabe“.
- **Abo-Stufen** one 9,99 € / onePlus 19,99 € — `config/api-prepaid.json` („Entwurf“).
- **NeX AIFly Suite:** Test über 24 Stunden, beginnt erst auf eigene Wahl; BYOK (eigener Modellschlüssel des Kunden) oder einmalig 5 € bezahltes Testguthaben; am Testende keine automatische Abbuchung — site-map signup/nex2fly; die 5 € stehen nur in `config/selfservice-policy.json`, Freigabe nicht belegt.
- **AIFly ORACLE, NeX Agentic AIFly, one, Skills/MCP, Portale:** je Auftrag vereinbart, ohne Preis — site-map.
- **NeXify Care:** „Preis nicht öffentlich“ (Gesamtkonzept 2026-11-14:105); ältere Unterlagen nennen „ab 249 € netto/Monat, monatlich kündbar“ (`docs/09-final/01-produkt-und-marke.md:20`). Reaktionszeiten/SLA nicht belegt („SLA je Vertrag“, „no invented number“ in `config/operating-model.json`).
- **TEILEKLAR (B2C):** Endkunden in DE/AT/NL/BE/LU — Gesamtkonzept 2026-11-14:20.

## 2. Suite

- Funktionsliste nur auf dem Zweig `origin/claude/suite-funktionsliste` (`docs/04-betrieb/suite-funktionsliste-2026-11-14.md`): von 38 Funktionsaussagen keine nutzbar, 22 „Hülle“, 16 „fehlen“.
- Module im Code (`apps/shop-api/shop/nexify_api.py`): Portal mit Anfragen, Angeboten (Annahme/Ablehnung), Projekten, Dokumenten, Rechnungen, Tickets, API-Schlüsseln, Agent, Abo, Profil, Team, Datenschutzanfrage; Betreiber-Routen; ORACLE-Chat. Im Vercel-Einstieg nicht eingebunden.
- Composio (Kunden verbinden eigene Konten) standardmäßig aus — `apps/web/lib/composio.ts:24`.
- Mandantenfähigkeit als Konzept (`mandant_id`, RLS) — `config/mandanten.json`, `db/foundation/001_foundation.sql`. Shop-Dienst läuft heute auf MongoDB; Zielbild eigene Supabase-Instanz (D-013).

## 3. Shop TEILEKLAR

- **Lieferländer:** DE, AT, NL, BE, LU — `apps/shop-api/shop/checkout_api.py:19`. (Die bisherigen Shop-AGB nennen zusätzlich die Schweiz.)
- **Zahlung:** nur über die gehostete Zahlungsseite von Revolut (Merchant API); Mailtext „Revolut (Karte / Revolut Pay)“ — `Checkout.tsx`, `revolut.py`, `mail_templates.py`.
- **Versand:** nur Standardversand; Kosten aus Versandangebot des Lieferanten, sonst Pauschale (Vorgabe 9,95 €); ab 75 € Warenwert versandfrei (Vorgabewerte im Code, nicht als freigegebene Preise belegt) — `cart_api.py:184-197`, `config.py`.
- **Preise:** brutto; ein einheitlicher MwSt-Satz aus einer Umgebungsvariable, kein Satz je Lieferland — `pricing.py`.
- **Batteriepfand:** nur im AGB-Text, im Code kein Pfand.
- **Kundentypen:** B2C; kein B2B-Schalter, kein USt-ID-Feld in der Kasse.
- **Gastbestellung** möglich (Cookie `tk_guest`), Konto optional.
- **Ablauf:** Adresse → Versand → Prüfen → Zahlung; Button „Zahlungspflichtig bestellen“ — `Checkout.tsx`.
- **Einwilligung in der Kasse:** eine nicht vorbelegte Pflicht-Checkbox „Ich habe die AGB und die Widerrufsbelehrung gelesen und akzeptiere sie.“; gespeichert `terms_accepted_at`.
- **Bestellbestätigung** per Mail erst nach Zahlung (Resend), mit Widerrufshinweis und Links auf AGB, Widerruf, Muster-Widerrufsformular, Datenschutz; Statusmails.
- **Widerruf in der Oberfläche:** kein Widerrufsbutton, kein Rückgabeformular; nur Text im Bestellverlauf — `OrderTimeline.tsx:7`.
- **Bewertungen:** keine.
- **Lieferant:** BigBuy (Direktversand durch den Lieferanten); Produktbilder von `cdnbigbuy.com`.
- **Hersteller/GPSR:** Hersteller wird importiert, auf der Produktseite nicht angezeigt; angezeigt SKU, EAN, Kategorie, Maße, Zustand, Hinweis „keine Fahrzeugzuordnung geprüft“ — `ProductDetail.tsx`.
- **Rechtstexte:** `/teileklar/rechtliches` zeigt AGB und Widerruf aus `config/teileklar-legal.json`; darüber der Hinweis „vollständige Freigabe steht aus“.
- **Verkäufer in der Kasse:** „NeXify AI (by NeXify), Inhaber Pascal Courbois, Eenmanszaak …, KvK 90483944, mail@nexifyai.cloud“ — `SellerInfo.tsx`, `config/fakten.json`. Im Widerruf heißt der Empfänger „TEILEKLAR, Graaf van Loonstraat 1E …, mail@teileklar.shop“.

## 4. Werkstatt und Terminbuchung

- **Auf `main`:** Verzeichnissuche, Detailseite, Anfrageformular (Name, E-Mail, Telefon optional, Fahrzeug optional, Anliegen, Einwilligung). Ablage `workshop_requests`. Bestätigungsmail an den Anfragenden mit „kein TEILEKLAR-Vertragspartner“. Die Werkstatt wird nicht benachrichtigt. Kein Kennzeichenfeld. — `workshops_api.py:94-125`, `WorkshopDetail.tsx`
- **Zweig `claude/werkstatt-termine-stufe1`:** Terminwunsch Kunde → Partnerwerkstatt; Zustände wunsch, bestaetigt, verschoben, abgelehnt, abgesagt, erledigt, verfallen; die Werkstatt entscheidet, Schweigen ist keine Zustimmung. Daten: Name, E-Mail, Telefon, Fahrzeug, Anliegen, Wunschfenster, Einwilligung mit Fassung. Mails N1–N7 als Entwurf, nicht freigegeben; Schalter aus. Absage durch Kunde, Werkstatt oder Inhaber; Fristen und Folgen später Absage offen (E-04). Vergütung/Provision und Vermittlerrolle nicht entschieden (E-09, E-14). Werkstatt ist laut Seitentext „Verzeichnisbetrieb, kein Vertragspartner“; Termin, Umfang und Preis sagt die Werkstatt zu.
- Verzeichnisauftrag nennt DE/AT/CH/NL/BE/LU — `docs/06-auftraege/werkstatt-verzeichnis.md`.

## 5. Newsletter / Einwilligungsweg (Zweig `claude/quirky-gates-r14fnk`)

- Double-Opt-in hinter Schalter, aus; nichts versendet. Ablauf: Anmeldung → Bestätigungsmail (Resend) mit Bestätigungs- und Sperrlink → Bestätigung → Ein-Klick-Abmeldung (RFC 8058). Nie bestätigte Anmeldungen werden gelöscht; Sperrliste speichert nur SHA-256 der Adresse.
- Daten: Adresse, Sprache, Quelle, Fassung und SHA-256 des Einwilligungswortlauts, Zeitpunkte; bewusst keine IP, keine Browserkennung. Supabase-Schema `mailing` mit RLS.
- Einwilligungstext, Bestätigungsmail, Frist und Seiten sind noch leer (`config/integrations/mailing-consent.json`); Aufbewahrungsfristen offen.

## 6. Öffentlicher Chat und KI

- LLM: DeepSeek `deepseek/deepseek-v4.1-flash-1017` über 9router/OpenRouter, optional über Cloudflare AI Gateway; ohne Zugangsdaten 503 — `apps/web/lib/chat-llm.ts`, `config/llm-policy.json`.
- Speicherung der Gespräche in Supabase (selbst gehostet), Schema `chat` (Gespräche, Nachrichten inkl. Modell); Löschfrist nicht belegt. Rate-Limit über IP.
- Hinweis im Chat (de): „Bitte keine Passwörter oder Zahlungsdaten eingeben. Sie sprechen hier mit einem KI-Assistenten (NeX Agentic AIFly); Antworten können Fehler enthalten.“ Im statischen Modus: „Orientierung anhand der Website · ohne Live-KI“ — `PublicOrientationChat.tsx`.
- `/ki-hinweise` sagt heute „ohne Live-KI-Modell“ – widerspricht D-010 (Chat KI-geführt).
- Footer (de): Link „Markeninszenierung · KI-generiert“ auf `/ki-hinweise` — `SiteFooter.tsx:87`.
- Bildwelt und Filme der Seiten sind KI-gestützt erzeugt/bearbeitet (site-map `ai-notice`).

## 7. Formulare und Konten

- Kontakt/Partner: Name, E-Mail, Unternehmen, Anliegen, Einwilligung; Ablage MongoDB `requests`; interne Mail über Resend. Kein HubSpot-Aufruf im Code gefunden (HubSpot steht im Lösungsregister als CRM).
- Konten: eigene Konten (bcrypt), Cookie `tk_session` (httpOnly, 14 Tage); Passwort-Reset per Mail-Link (60 Minuten); Registrierung ohne E-Mail-Bestätigung.
- „Mit Google anmelden“ über Emergent (`auth.emergentagent.com`).

## 8. Cookies und Endgerätespeicher (Code von `apps/web`)

- Kein Consent-Banner. Nur „Fehlerdiagnose-Einstellungen“ im Footer (`DiagnosticConsent.tsx`); Wahl gilt bis zum Neuladen, wird nicht gespeichert.
- PostHog: nur Fehlerberichte, nur nach Einwilligung, Host `eu.i.posthog.com`, keine Persistenz, kein Replay.
- Sentry: Paket installiert, im Code nicht verwendet. Kein Vercel Analytics, keine Speed Insights.
- Cookies: `nx-theme` (1 Jahr), `nx-chat-open` (Sitzung), `nx-chat-width` (Sitzung), `tk_session` (14 Tage), `tk_guest` (30 Tage); `__Host-nexify-oracle` (24 h) definiert, setzende Route nicht gefunden.
- localStorage: `nx-theme`, `nexify-locale`, `nexify-install-dismissed-v1`.
- sessionStorage: `tk-order-key`, `nx-chat-open`, `nx-chat-width`, `nexify-presenter-guide`, `nx-partner-pending-v1`, `nexify-contact-attempt-v1:*`, `nexify-oracle-brief-transfer-v1`.
- Service Worker/PWA nur bei gesetztem Schalter; Caches `nexify-public-*`.
- Drittinhalte: Schriften lokal, Filme lokal. Werkstattkarte lädt Leaflet von `unpkg.com` und Kartenkacheln von `tile.openstreetmap.org` (`WorkshopMap.tsx`), von der CSP nicht erlaubt. Produktbilder vom Lieferanten-CDN. Kein YouTube, kein Calendly.

## 9. Unternehmensangaben und Widersprüche

- Impressum: NeXify AI by NeXify, Inhaber Pascal Courbois, Eenmanszaak, Graaf van Loonstraat 1E, 5921 JA Venlo; KvK 90483944; USt-IdNr. NL865786276B01; Telefon +31 6 133 188 56; hello@nexifyai.cloud.
- „NeXify AI FACTORY B.V.“ — `apps/site/src/Auth.tsx:7-10`, `apps/site/src/seo-state.mjs`; `site-map.operator_context`: `not_verified_for_BV`. Registerauszug fehlt.
- E-Mail-Adressen: hello@nexifyai.cloud (Impressum), mail@nexifyai.cloud (viele Stellen), angebot@nexifyai.cloud (Mail-Absender), mail@teileklar.shop (Shop-Widerruf).
- Domains: www.nexifyai.de (Canonical), nexifyai.cloud, teileklar.shop.
- Lieferländer: Schweiz in den Shop-AGB, nicht in der Kasse.
- B2B-AGB und `/widerruf` sagen „keine Verbraucherverträge“, der Shop verkauft an Verbraucher.
- Recht/Gerichtsstand bisher: niederländisches Recht, Venlo (B2B-AGB § 12, Shop-AGB § 9).

## 10. Barrierefreiheit

- axe 4.10.2 (WCAG 2.0–2.2 AA), 12.11.2026, 36 Seiten: 0 Verstöße, viele Fälle unvollständig geprüft (Kontrast, Untertitel); Kasse, Warenkorb, Produktseite nicht geprüft — `evidence/site-audit-2026-11-12/axe-main.json`.
- `/barrierefreiheit` erklärt heute keine Konformität.

## 11. Hosting und Datenstandorte

- Vercel: Shop-API in `fra1`; für `/api/chat` keine Region gesetzt — `vercel.json`.
- Hostinger: zwei Server; Standort im Register nicht genannt (bisheriger AVV: „VPS Frankfurt/DE“).
- Resend: eu-west-1. Supabase: selbst gehostet, Adresse nicht belegt. MongoDB: Ort nicht belegt.
- Bisheriger AVV nennt als Unterauftragsverarbeiter: Cloudflare, Supabase, Resend, DeepSeek über OpenRouter/9Router, Nscale, Hostinger. Nicht genannt: Revolut, BigBuy, PostHog, Emergent, Vercel.
- Produktion laut Dokumenten: Shop-Dienst antwortet mit 503; Bestellungen und Formulare gehen derzeit nicht durch.

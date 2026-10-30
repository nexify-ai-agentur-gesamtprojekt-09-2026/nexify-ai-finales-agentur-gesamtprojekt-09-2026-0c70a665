# NEX-CONTENT-REGRESSION-20261030-04 — Paket 1: TEILEKLAR / Shop

Status: **abgeschlossen, `make test` = 583 OK (grün)**. Kein main-Push/Publish (wartet auf Abnahme).

Quelle der Routentexte: `config/site-map.json` (öffentliche App = `apps/site`, Vite, via `apps/site/.generated/public-site.json`).
Interne Anforderungen bleiben im Quellregister erhalten (`source_refs` je Section unverändert).

## Was sich geändert hat (interne Bauanweisungen → Kundentexte)

| Route | Titel VORHER | Titel NACHHER |
|---|---|---|
| /teileklar/kasse | „Kasse: nicht zum Kauf freigegeben" | **„Kasse"** |
| /teileklar | „TEILEKLAR: Teile, Fahrzeug und nächste Schritte" | „TEILEKLAR: Teile und Fahrzeugservice" |
| /teileklar/suche | „Teilesuche: in Vorbereitung" | „Teil suchen" |
| /teileklar/kategorien | „Sortiment und Kategorien" | „Sortiment und Kategorien" (Text kundengerecht) |
| /teileklar/kategorie | „Kategorieansicht: in Vorbereitung" | „Kategorie" |
| /teileklar/produkt | „Produktdetails: in Vorbereitung" | „Produktdetails" |
| /teileklar/warenkorb | „Warenkorb: noch ohne Bestellung" | „Warenkorb" |
| /teileklar/fahrzeug-und-passung | „Fahrzeug und belegte Passung" | „Fahrzeug und Passung" |
| /teileklar/termine | „Werkstatttermin anfragen" | „Werkstatttermin anfragen" (Text kundengerecht) |
| /teileklar/gutscheine | „Gutscheine und Einlösung: aktueller Stand" | „Gutscheine" |
| /teileklar/partner-werden | „Werkstattpartner werden" | „Werkstattpartner werden" (Nutzen betont) |
| /teileklar/werkstatt | „Werkstattprofil: freigegebene Daten erforderlich" | „Werkstatt in Ihrer Nähe" |
| /teileklar/rechtliches | (Freigabe-/Prüfungsprosa) | „…Anbieter, Datenschutz und Kaufbedingungen" (kundengerecht) |
| /teileklar/konto *(geschützt)* | „Kundenkonto und Fahrzeug" | kundenfreundliche Anmelde-Info |
| /teileklar/partnerportal *(geschützt)* | „Werkstatt- und Partnerportal" | kundenfreundliche Anmelde-Info |
| /teileklar/nachbarschaft *(geschützt)* | „Nachbarschaftskunden" | kundenfreundliche Anmelde-Info |

### Kasse — Kernbeispiel (Beleg)
**Vorher (H1/Body):** „Kasse: nicht zum Kauf freigegeben" · „Ein Kaufabschluss ist bewusst nicht aktiviert. Zahlungs- und Bestellabläufe erscheinen erst, wenn Katalog, Preise und Bedingungen freigegeben sind…"

**Nachher (H1):** „Kasse"
**Nachher (Body):** „Der direkte Online-Kauf mit Sofortzahlung ist derzeit noch nicht verfügbar. Bis dahin nehmen wir Ihre Bestellung persönlich auf: Sie erhalten eine verbindliche Übersicht zu Preis, Lieferung und Bezahlung und entscheiden in Ruhe. Schreiben Sie uns dazu einfach an – wir melden uns zeitnah mit den nächsten Schritten."
**CTAs:** „Zurück zum Warenkorb" · **„Kontakt aufnehmen"** (Route → `contact`, echte Adresse `mail@nexifyai.cloud`) · „Bestellung im Chat klären" (Fallback → `contact`).
→ transparenter Zustand, **keine Fake-Bestellung, kein kaputter CTA**, funktionierender Kontaktweg.

## Grundsätze eingehalten
- Keine erfundenen Produkt-/Preis-/Bestandsdaten (historischer Katalog 3.720 Datensätze = Quarantäne, **nicht** verwendet).
- Kein internes Mandanten-/Admin-/Freigabe-Vokabular mehr in öffentlichen Texten (Jargon-Scan: 0 Treffer).
- DE + NL + FR durchgängig gepflegt (strukturelle Parität, keine leeren Felder).
- `source_refs` (internes Quellregister) je Section unverändert.

## Evidenz (echte Läufe) + SHA-Nachführung
- `config/site-map.json` SHA: `016bea7c…` → `d224213d…` (POC Kasse) → `e8b78867…` (Paket 1 komplett).
- Echte Chromium-Läufe (Node22, headless): `apps/site/tests/browser-critical.mjs` (8 Checks PASS), `browser-text-spacing.mjs` (108 Checks, 0 Issues), `browser-legal-footer.mjs` (216 Views, 0 external, passed).
- Regenerierte/aktualisierte Evidenz: `docs/design/detail-browser-evidence.json`, `evidence/one-app-2026-10-27/critical-browser-fresh.json`, `evidence/one-app-2026-10-27/text-spacing.json`.
- Surgical SHA-Bindungen nachgezogen: `config/presenter-sources.json`, `config/acceptance-coverage.json` (6 Einträge), `evidence/legal-footer-2026-10-28/{browser,next-browser}.json` (Struktur-Messung unverändert, nur Quellbindung neu).
- `apps/site/.generated/` + `apps/web/.generated/` neu generiert.

## EN-Staging Drift
- `i18n-staging/en/inventory.json`: `site_map_sha256` aktualisiert + `drift_notes` ergänzt. EN-Fragmente der Gruppe „teileklar" (151 Felder) sind jetzt **STALE** und vor einem EN-Release aus dem aktuellen DE neu zu übersetzen. Runtime unverändert (de/nl/fr).

## Verbleibende Pfadliste (noch interne/Bau-Texte → folgende Pakete)
- **Paket 2 — Partner:** bereits teils in Paket 1 berührt (tk-partner/tk-workshop/tk-appointments kundengerecht); separat zu prüfen: `affiliate-portal` (/portal/affiliate).
- **Paket 3 — Agentur/Nexify (öffentlich):** `/`, `/leistungen`, `/leistungen/websites`, `/leistungen/agenten-automatisierung`, `/leistungen/apps-portale`, `/leistungsumfang`, `/loesungen`, `/preise-ablauf`, `/wissen`, `/wissen/projekt-vorbereiten`, `/unternehmen`, `/kontakt`, `/produkte/nex2fly`, `/produkte/one`, `/produkte/api`, `/impressum`, `/datenschutz`, `/vertragsgrundlagen`, `/ki-hinweise`, `/barrierefreiheit`, `/cookies`, `/anmelden`, `/registrieren`, `/portal/kunde`, `/portal/api`, `/portal/affiliate`.
- **Paket 4 — Gemeinsame Chrome:** Footer-Label „Entwicklungsvorschau" (`apps/web/components/SiteFooter.tsx`), Navigation/Footer-Gruppenlabels, Presenter-Texte.

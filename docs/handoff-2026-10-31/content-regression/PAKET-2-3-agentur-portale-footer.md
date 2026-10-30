# NEX-CONTENT-FINAL-20261030-05 — Paket 2+3 (Agentur/Partner/Portale, Footer, Idempotenz)

Status: **abgeschlossen, `make test` = 583 OK (grün)**. Kein Main-Push/Publish (wartet auf gemeinsam geprüften Release-Stand).

## Dateigrenzen bestätigt (unverändert)
- RESERVIERT & unangetastet: `api/**`, `apps/agent-gateway/**` samt Backend-Tests; `tools/bigbuy_batch.py`, `tests/test_bigbuy_batch.py`, `docs/contracts/bigbuy-batch.md`. (git status dieser Pfade: leer.)
- Kein Test deaktiviert, keine vorhandene Datei gelöscht.

## Ergebnis der Prüfung der öffentlichen Agentur-Seiten
Die öffentlichen Nexify-Marketingseiten (`/leistungen*`, `/leistungsumfang`, `/loesungen`, `/preise-ablauf`, `/wissen*`, `/unternehmen`, `/kontakt`, `/produkte/{nex2fly,one,api}`) sind **bereits kundengerecht und transparent** formuliert (Nutzen, Ablauf, ehrliche Grenzen) — das sind **keine** internen Bauanweisungen. Bewusst **nicht** umgeschrieben, um keine Claims zu erfinden und guten Bestand nicht zu verschlechtern.
Rechts-/Transparenzseiten (`/impressum`, `/datenschutz`, `/vertragsgrundlagen`, `/ki-hinweise`, `/cookies`, `/barrierefreiheit`) **inhaltlich nicht angefasst** (keine erfundenen Rechtsdaten).

## Geändert (Vorher → Nachher)
| Bereich | Vorher | Nachher |
|---|---|---|
| `/portal/kunde` (geschützt) | „Geschützter Bereich … Rollen-, Website- und **Mandantenrechte**" | **„Kundenbereich"** — Projekte/Angebote/Dokumente, klare Anmelde-Erklärung |
| `/portal/api` (geschützt) | dto. (internes Mandanten-Vokabular) | **„API-Bereich"** — Zugänge/Einbindung, geschützte Anmeldung |
| `/portal/affiliate` (geschützt) | dto. | **„Partnerbereich"** — Empfehlungen/Konditionen/Abrechnung, Anmeldung mit Partnerzugang |
| Footer-Badge (alle Seiten) | **„Entwicklungsvorschau"** / „Ontwikkelvoorbeeld" / „Aperçu de développement" | **„Beta-Version"** / „Beta-versie" / „Version bêta" |

Alle Texte DE/NL/FR konsistent, `source_refs` (internes Quellregister) unverändert. Jargon („Mandant", „Entwicklungsvorschau") aus öffentlichen/kundenseitigen Flächen entfernt.

## Logik-Fix: Partneranfrage-Idempotenz (`apps/web/components/PartnerRequestForm.tsx`, Frontend)
- **Vorher:** `Idempotency-Key: crypto.randomUUID()` pro Submit → jeder Retry erzeugte einen neuen Schlüssel → Duplikat-Risiko.
- **Nachher:** Ein stabiler Schlüssel pro **unveränderter Eingabe** (Signatur aus company/contact/email/message/locale); gleicher Retry sendet denselben Key → Backend kann deduplizieren. Bei **unbekanntem Ausgang** (catch) wird zuerst das **Receipt** via `GET /api/partner/requests/mine` geprüft, bevor erneut gesendet wird. Backend bleibt getrennt/reserviert.

## Dezente 3D/Schatten-Akzente (Chat)
- Der Chatbereich nutzt **bereits** konsistente, dezente Elevation-Tokens (`--shadow-chat-panel`, `--shadow-chat-bubble`, `--shadow-chat-raised`) aus NEX-UI-DEPTH. Bewusst **keine** zusätzlichen Effekte ergänzt (Vermeidung doppelter/überzogener Effekte; keine Effekte über Logo/Figuren; Original-CI/Hero erhalten). `globals.css` unverändert.

## Messung (tatsächlich, nicht nur Screenshot)
- `browser-critical.mjs` (echtes Chromium headless, Node22): 8 Checks PASS inkl. Presenter-Contain/Overflow über **5 Desktop-Breiten (1024–1920)** + Gutter-Messung bei 1920/390.
- `browser-text-spacing.mjs`: **108 Checks, 0 Issues** (reale Geometrie, inkl. Partnerformular- und Footerquellen).
- `browser-legal-footer.mjs`: 216 Views, 0 external, passed.

## SHA/Evidenz (surgical, keine globale Reformatierung)
- `config/site-map.json` SHA: `e8b78867…` → `d06c7afb…`; `SiteFooter.tsx` SHA: `a15a9cb7…` → `b38a0e02…`.
- Echt regeneriert: `docs/design/detail-browser-evidence.json`, `evidence/one-app-2026-10-27/{critical-browser-fresh,text-spacing}.json`.
- Quellbindung neu (Messung unverändert, da nur Label-/Copy-Text): `evidence/legal-footer-2026-10-28/{browser,next-browser}.json`, `evidence/consent-ui-2026-10-28/{browser-consent-ui,next-public}.json`, `config/presenter-sources.json`, `config/acceptance-coverage.json` (9 Einträge, Helper `tools/_update_register_shas.py`).

## EN-Staging Drift
- `i18n-staging/en/inventory.json`: `site_map_sha256` aktualisiert + `drift_notes` (NEX-CONTENT-FINAL-05). STALE: Gruppen „portal-intern"/„footer" + `SiteFooter.en.json` (Label). **Keine** Runtime-Umschaltung, keine Neuübersetzung in diesem Sprint.

## Offene echte Integrationen (unverändert, getrennt)
- Partner-Empfang/Backend (`api/**`, `apps/agent-gateway/**`) — reserviert, Backend-Agent bereitet dort isoliert einen Idempotenzpatch vor.
- Clerk-Auth in Preview (Platform Publish durch Nutzer), ElevenLabs/Resend/OpenAI (API-Keys ausstehend), TEILEKLAR-Katalog (3.720 Datensätze, Quarantäne — nicht veröffentlicht).

## Verbleibende Pfadliste (öffentliche Kunden-Copy)
- **Leer** für Shop (Paket 1) + geschützte Portale + Footer-Badge. Agentur-Marketingseiten als kundengerecht bestätigt (nicht geändert). Optionaler späterer Feinschliff: Ton auf `/produkte/nex2fly` + `/registrieren` („Vorschau/noch nicht aktiviert" → wärmere, gleich wahrheitsgemäße Formulierung) — nur nach Abstimmung, da aktuell bereits wahrheitsgemäß.

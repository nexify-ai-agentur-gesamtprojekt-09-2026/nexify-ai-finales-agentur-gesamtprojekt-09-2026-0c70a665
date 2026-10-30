# Handoff 2026-10-31 — EN-i18n Integrationsgrundlage (Blueprint, read-only Inventur)

Stand: 2026-10-31. Pascalvorgabe 14:32 UTC: Englisch **zusätzlich** zu de/nl/fr in die bestehende
i18n, keine zweite i18n-Lösung, keine stille Entfernung anderer Sprachen. Umsetzungsvorgabe, kein
Dropdown-Eintrag. Erst nach sicherem Abschluss der Chat-/CI-Arbeit integrieren (erledigt: siehe
Phase 0.2 grün). Dieses Dokument ist die **geprüfte Grundlage**, keine erfolgte Umsetzung.

## Vorhandene Mechanik (eine i18n, nicht duplizieren)
- **Zentrale Sprachquellen**:
  - `config/i18n.json` → `"sprachen": ["de","nl","fr"]`, `"default": "de"`, Map `texte[*].{de,nl,fr}`.
  - `apps/web/lib/i18n.ts` → Dictionary für Chat/Workspace (`de`/`nl`/`fr`-Blöcke).
- **Seiteninhalte** (pro Locale): `config/site-map.json` (~321 KB) und `config/page-explainers.json`
  (~111 KB): je Seite `title/summary/sections.{de,nl,fr}`.
- **Hart kodierte Locale-Grenzen** `{"de","nl","fr"}` / `'de'|'nl'|'fr'` (alle müssen EN zulassen):
  - `apps/agent-gateway/server.py` (action-locale-Allowlist, speech route)
  - `apps/agent-gateway/integrations.py` (`CUSTOMER_TEXT`, `speech_texts`, `_when` fr-Sonderfall)
  - `packages/agent-runtime/public-orientation.ts` (`validateOrientationInput`, `copy`, `stopWords`)
  - `packages/agent-runtime/model-agent.ts` (`pageInput` locale-enum)
  - `apps/web/lib/i18n.ts` (Locale-Typ/Blöcke)
- **SEO/Routing**: `apps/site/scripts/generate-public-data.mjs` erzeugt Sitemap/hreflang/canonical.

## EN-Integrations-Checkliste (durchgängig, geordnet)
1. **Sprachregistrierung**: `config/i18n.json` `sprachen` + `en` je `texte`-Key; `apps/web/lib/i18n.ts`
   `en`-Block (Chat-Einstiege, Antwortsprache, Formulare, Fehler, Briefing/Angebots-Labels, PWA-Hilfe).
2. **Locale-Grenzen erweitern**: alle `{de,nl,fr}`/`'de'|'nl'|'fr'` → `en` additiv (Gateway, orientation,
   model-agent, integrations). Negative Tests (ungültige Locale) erhalten.
3. **Seiteninhalte**: `site-map.json` + `page-explainers.json` je Seite `en` ergänzen (echte Übersetzung,
   kein Sprachmix). **Marken/Produktnamen unverändert** (NeXify AI one/one+, TEILEKLAR, flash/pro).
   **Belegte Preise/Rechtsaussagen nicht verändern**; keine unbelegte Rechtsübersetzung als geprüft ausgeben
   (Impressum/AGB/Datenschutz EN nur mit klarem „nicht rechtlich geprüft"-Hinweis bzw. ausstehend).
4. **Shop/Werkstatt/Partner**: ShopPanel/WorkshopDirectory/PartnerRequestForm-Texte + Fehler/Validierung EN.
5. **Chat**: Seitenkontext + Antwortsprache folgen EN; Sprachwechsel erhält Route/Briefing, kein Mix.
6. **SEO**: `html lang`, stabile Locale-URLs, canonical + hreflang (inkl. Rückverweise), Metadaten/Sitemap,
   Zahlen/Währung/Datum (EN-Format) und sinnvoller Fallback. Bestehende Default-Locale/SEO-Pfade **nicht blind**
   migrieren.
7. **Evidence/CI**: betroffene Source-Hashes in `config/acceptance-coverage.json` (342 Einträge) + ggf.
   `docs/design/detail-browser-evidence.json` (sdk/aux) chirurgisch; Playwright via `.local/diagnostics/regen-affected.sh`.
8. **Tests/Nachweis**: Missing-Key-/Routeparitäts-/sichtbare-Text-Prüfung, längere EN-Labels mobil,
   Chat-Seitenkontext nach Sprachwechsel; mit Commit belegen.

## Aufwand/Risiko
Großer, evidence-intensiver Querschnitt (Inhalts-Übersetzung + Hash-Kaskade + Routeparität). Muss als
eigene Phase vollständig umgesetzt werden, damit keine Missing-Key-/Route-Parität-Fehler die CI röten.

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

## BELEGTE ATOMIZITÄT (warum kein grüner Teilschritt möglich ist)
Der Locale-Satz ist ein **einziger harter Vertrag**, testseitig erzwungen:
- `tests/test_site_map.py:18` → `require(locales == {'de','nl','fr'} and default_locale=='de')` und
  `:21` → `require(set(value) == locales, 'i18n key parity')` für **jedes** lokalisierte Feld in
  `config/site-map.json` (46 Seiten: title/summary/sections). `en` hinzufügen = alle Felder brauchen `en`.
- `tests/test_gateway_integrations.py:247` → Gateway-Fixtexte müssen **alle** Locales abdecken.
- `tests/test_identity_hero.py:25` → `identity-hero.json.locales == ['de','nl','fr']` (Hero-Szene hat **kein**
  EN-Audio → Hero bleibt de/nl/fr; EN gilt für Text/Nav/Chat/Formulare, NICHT für die gesprochene Szene).
- Hartkodiertes `['de','nl','fr']` in: `apps/site/tests/{browser-critical,browser-identity-hero,
  browser-legal-footer,browser-mail-workspace,explainers}.mjs`.
→ Folge: `en` muss **in einem atomaren Change** in site-map.json (alle 46 Seiten/Felder), page-explainers,
`apps/web/lib/i18n.ts`, `config/i18n.json`, Gateway `CUSTOMER_TEXT`/speech, `home-scenes` sceneLabels, alle
15 Inline-`{de,nl,fr}`-Maps, **diese Testverträge**, hreflang/Sitemap/`html lang` sowie 6 neu gemessene
Browser-Suiten landen. Kein partielles `en` kann grün sein.

## KONKRETE LAUFGRENZE DIESES PASSES (nicht bloßer Umfang)
- Redaktionelles EN-Volumen: `config/site-map.json` ~43 KB DE-Text (46 Seiten) + `config/page-explainers.json`
  ~111 KB je-Locale → echte EN-Übersetzung (kein Mix, keine erfundene Rechtsübersetzung) ≫ Token-Laufbudget
  dieses Passes. Der atomare Vertrag verbietet eine grüne Teillieferung.
- Gesicherter Zwischenstand: dieser Blueprint + Checkliste sind committet; NEX-MEDIA-SYNC ist mit echtem
  Funktionsnachweis grün abgeschlossen; Arbeitsbaum sauber. Nächster Pass **NEX-WEB-EN-20261030-01** führt
  den atomaren Change in einem Zug aus (Reihenfolge siehe Checkliste oben + Testverträge hier).
- Nicht erforderlich/verboten: neue Freigabe wegen Umfang, Produktion/Secrets, bezahlte Dienste.

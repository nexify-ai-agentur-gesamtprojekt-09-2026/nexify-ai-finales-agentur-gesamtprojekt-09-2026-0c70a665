# NEX-WEB-EN-20261030-01 — EN-Integrations-Runbook (vermessen, atomar)

Stand: **Alle EN-Übersetzungen sind zu 100 % vorbereitet und verifiziert** (Staging, runtime unverändert, `make test` = 583 OK). Dieser Runbook beschreibt die **atomare Integration in die Laufzeit** inklusive des vermessenen Blast-Radius. Nicht ausführen, solange nicht genug Rest-Budget für den vollständigen Regen vorhanden ist (sonst Gefahr einer nicht-grünen CI).

## 1) Fertige, verifizierte EN-Flächen (Staging)

| Fläche | Felder | Part(s) | Verify |
|---|---|---|---|
| site-map pages/footer | 483 | `parts/01..09` | `verify-part.mjs <part> <gruppen>` → VERIFY_OK |
| site-map chrome (ausserhalb pages/footer) | 12 | `parts/12-sitemap-chrome.en.json` | `verify-chrome.mjs` → VERIFY_OK |
| Chat/Gateway/Formulare/Cues (`apps/web/lib/i18n.ts`) | 61 | `parts/10-chat-ui.en.json` | `verify-ui.mjs chat-ui <part>` → VERIFY_OK |
| UI/PWA-Texte (`config/i18n.json`) | 26 | `parts/11-ui-config.en.json` | `verify-ui.mjs ui-config <part>` → VERIFY_OK |

Gesamt: site-map 495 loc-Objekte (483+12) + 61 + 26. **Lückenlos** (Gesamt-Doc-Scan: 0 missing, 0 stray).

## 2) Daten-Integration (Schritt A) — automatisiert
`node i18n-staging/en/_tools/integrate-en.mjs` schreibt `en` in:
- `config/site-map.json`: `en` in alle 495 loc-Objekte + `locales += "en"` (bleibt exakt `JSON.stringify(...,2)+"\n"`).
- `config/i18n.json`: `en` in alle 26 `texte` + `sprachen += "en"`.
- `apps/web/lib/i18n.ts`: `en:{…}` Block (61 Keys) nach dem `fr`-Block (Locale-Type aktualisiert sich automatisch).

## 3) Rendering-Schicht (Schritt B) — MUSS mit, sonst „fake" 4. Locale
Die öffentliche Vite-Site ignoriert `en` aktuell bewusst. Für echtes globales EN zusätzlich:
- `apps/site/scripts/generate-public-data.mjs` (Zeile ~9/10/26): Localize-Guard + `title.de` auf dynamische Locales inkl. `en` erweitern (statt hart `de/nl/fr`).
- Locale-Switcher-UI `#locale` (in `apps/web/components/Workspace.tsx` / `apps/site/src/main.tsx`): `en`-Option ergänzen.
- `apps/site/src/Auth.tsx`: `en`-Hilfetexte + Clerk `enUS` (`@clerk/localizations`) in `localizations`-Map.
- Browser-Suiten-Locale-Iteration auf `en` erweitern, u. a. `apps/site/tests/browser-critical.mjs` (`['de','nl','fr']` → inkl. `'en'`), damit EN real getestet (nicht nur deklariert) wird.

## 4) Vermessener Blast-Radius (empirisch via `make test` nach Schritt A)
Genau **4 Testmodule** brechen bei Daten-Integration (34 Fälle gesamt), alle erwartbar/mechanisch:
1. **`tests/test_site_map.py`** — Zeile 18 `locales == {'de','nl','fr'}` → auf `{'de','nl','fr','en'}` erweitern. (Behebt kaskadierend ~22 Negativtests, die zuerst am Locale-Contract scheiterten.)
2. **`tests/test_requirements_reconciliation.py`** — SHAs für `config/site-map.json` + `apps/web/lib/i18n.ts` im Register `config/acceptance-coverage.json` chirurgisch nachziehen, danach `python3 tools/verify_requirements_reconciliation.py --render`.
3. **`tests/test_browser_evidence.py`** (Browser/Shop/Catalog) — `config/site-map.json` ist in SOURCE_PATHS/SHOP/CATALOG gebunden → echte Regen:
   `browser-critical.mjs`, `browser-shop.mjs`, `browser-catalog.mjs` (+ danach drei Evidence-SHAs im Register nachziehen).
4. **`tests/test_resize_source_binding.py`** — `config/site-map.json` in `text-resize-sources.json` → `browser-text-spacing.mjs` echt neu messen.

Zusätzlich bei Schritt B (Rendering): da Switcher-UI/globals.css/Workspace betroffen sind, greift die **grosse Evidence-Kaskade** (siehe `ui-depth/NEX-UI-DEPTH-vorher-nachher.md`): `browser-critical`, `browser-text-spacing`, `browser-public-fallbacks`, `browser-accessibility`, `browser-exception-capture`, `browser-shop`, ggf. `browser-identity-hero`, `browser-oracle-companion`, `browser-video-player`. Next-Suiten (identity-hero/next, exceptions-next, next-clerk-locale) sind durch die enforced make-test-Guards **nicht** zwingend neu zu messen (detail-browser-evidence wird durch das Vite-`browser-critical` erzeugt); ein voller Next-Build braucht Clerk-Env (im Preview nicht gebunden).

## 5) Reihenfolge für grüne CI
1. `integrate-en.mjs` (Schritt A) + Rendering-Edits (Schritt B).
2. `test_site_map.py` Locale-Contract auf 4 Locales.
3. Regen-Skripte: `bash .local/diagnostics/regen-affected.sh` + `bash .local/diagnostics/regen-evidence-v2.sh` (echte Messung).
4. Register-SHAs (`config/acceptance-coverage.json`) für geänderte Evidence + `site-map.json` + `i18n.ts` nachziehen; `verify_requirements_reconciliation.py --render`.
5. `make test` → muss 583+ grün sein.
6. Vorher/Nachher-Belege + Commit.

**Wichtig:** Evidence aus echten neuen Messläufen; Register-Hash-Anpassung allein gilt nicht als Prüfung. Keine Teilausspielung committen, bevor `make test` grün ist (atomarer Contract).

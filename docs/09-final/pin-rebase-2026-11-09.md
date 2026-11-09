# Pin-Rebase 09.11.2026 (OF-11)

Nur Pins, deren aktuelle Bytes durch einen heute real erhobenen, bestandenen Nachweis bzw. eine grüne Testausführung belegt sind. Alle anderen Pins bleiben OFFEN (siehe unten). `tools/_update_register_shas.py` wurde nicht benutzt.

| Datei | alter Pin | neuer Pin | Beleg |
|---|---|---|---|
| `apps/web/components/HomeContent.tsx` | `9e000fea5f6b…` | `adf9b8495833…` | Nachweis docs/design/detail-browser-evidence.json (09.11.2026, bestanden) bindet die aktuellen Bytes |
| `apps/web/components/Workspace.tsx` | `41cbfd5625ce…` | `b1160ea73b58…` | Nachweis docs/design/detail-browser-evidence.json (09.11.2026, bestanden) bindet die aktuellen Bytes |
| `apps/web/components/WorkspaceRebuild.css` | `063e874a4da2…` | `591308b86d91…` | Nachweis evidence/identity-hero-2026-10-28/next.json (09.11.2026, bestanden) bindet die aktuellen Bytes |
| `config/design-tokens.json` | `84bb18f0f4db…` | `6e699c0082f4…` | Nachweis evidence/identity-hero-2026-10-28/next.json (09.11.2026, bestanden) bindet die aktuellen Bytes |
| `config/site-map.json` | `3407aea2d144…` | `6fbbbf4a5365…` | Nachweis docs/design/detail-browser-evidence.json (09.11.2026, bestanden) bindet die aktuellen Bytes |
| `apps/web/components/ExplainerSections.tsx` | `87f9a69de6af…` | `f46caac7d768…` | Nachweis evidence/one-app-2026-10-27/text-spacing.json (09.11.2026, bestanden) bindet die aktuellen Bytes |
| `apps/web/components/PublicExperience.tsx` | `f4619eb7baa2…` | `1e599cf9bf76…` | Nachweis evidence/one-app-2026-10-27/text-spacing.json (09.11.2026, bestanden) bindet die aktuellen Bytes |
| `apps/web/components/SiteFooter.tsx` | `f6814e05a912…` | `56a189a3feea…` | Nachweis evidence/consent-ui-2026-10-28/browser-consent-ui.json (09.11.2026, bestanden) bindet die aktuellen Bytes |
| `apps/web/proxy.ts` | `c837e4ec5fd3…` | `b3981c470e22…` | Nachweis evidence/workspace-read-2026-10-28/browser-workspace-read.json (09.11.2026, bestanden) bindet die aktuellen Bytes |
| `apps/web/components/IdentityHero.css` | `cf4cae78e3fc…` | `73037a5ff7d5…` | Nachweis evidence/identity-hero-2026-10-28/next.json (09.11.2026, bestanden) bindet die aktuellen Bytes |
| `packages/tokens/tokens.json` | `229ddd2a1ea3…` | `44735b27c2ee…` | Nachweis evidence/one-app-2026-10-27/text-spacing.json (09.11.2026, bestanden) bindet die aktuellen Bytes |
| `apps/web/components/IdentityHero.tsx` | `d39924ecc681…` | `36a88332e22e…` | Nachweis evidence/identity-hero-2026-10-28/next.json (09.11.2026, bestanden) bindet die aktuellen Bytes |
| `packages/tokens/tokens.ts` | `859ff4de7a5f…` | `ffb72538d182…` | Nachweis evidence/one-app-2026-10-27/text-spacing.json (09.11.2026, bestanden) bindet die aktuellen Bytes |
| `packages/tokens/tokens.css` | `dd45d0d93f50…` | `3ca2f06408bf…` | Nachweis evidence/identity-hero-2026-10-28/next.json (09.11.2026, bestanden) bindet die aktuellen Bytes |
| `tests/test_resize_source_binding.py` | `c998d3b6da6b…` | `20bbdf26a7ca…` | unittest tests.test_resize_source_binding: OK (erwartet 43 Routen = öffentliche Seiten in config/site-map.json) |
| `tests/test_identity_hero.py` | `7b7dba12cc82…` | `976035c6fbd2…` | unittest tests.test_identity_hero: OK |
| `apps/web/auth/tests/oracle-companion.test.mjs` | `5291c944bdd0…` | `3a948baf55e3…` | node --test apps/web/auth/tests: 19/19 OK (bzw. 12/12 der drei Dateien) |
| `apps/web/auth/tests/policy.test.mjs` | `831a6aca1661…` | `5374882d5e10…` | node --test apps/web/auth/tests: 19/19 OK (proxy-Vertrag nach D-007) |
| `apps/web/auth/tests/public-experience.test.mjs` | `5fdd3680f2f1…` | `bae306a95122…` | node --test apps/web/auth/tests: OK |
| `config/presenter-system.json` | `450a055992a7…` | `971f562fff93…` | Diff seit Pin geprüft: genau 1 Zeile, nur die Quell-URL `confirmed_rejection_source` (Referenz, kein Inhalt der Anforderung) |
| `docs/contracts/hero-media.json` | `92a55c579cd2…` | `fb8822874f90…` | Diff seit Pin geprüft: genau 1 Zeile, nur die Quell-URL `confirmed_rejection_source` (Referenz, kein Inhalt der Anforderung) |
| `docs/contracts/hero-production-plan.json` | `f351c138ff8c…` | `55a014852d06…` | Diff seit Pin geprüft: genau 1 Zeile, nur die Quell-URL `confirmed_rejection_source` (Referenz, kein Inhalt der Anforderung) |

## OFFEN (nicht rebased, Entscheidung/Abgleich nötig)

- `PROGRESS.md`
- `config/page-explainers.json`
- `docs/contracts/requirements-reconciliation.md`
- `apps/site/tests/public-video-assets.test.mjs`
- `config/page-media-registry.json`
- `apps/web/next.config.ts`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/[...slug]/page.tsx`
- `apps/web/app/anmelden/[[...sign-in]]/page.tsx`
- `apps/web/app/registrieren/[[...sign-up]]/page.tsx`
- `apps/site/tests/browser-scene-images.mjs`
- `apps/shop-api/requirements.in`
- `apps/site/tests/seo-sitemap.test.mjs`

Gelöscht (Entscheidungsvorschlag Pascal Courbois: Registerzeile entfernen oder ersetzen): `apps/web/components/PresenterEditorial.css`, `apps/web/components/PresenterScene.tsx`, `apps/web/public/sitemap.xml`.

## Nachtrag DS-REWORK (09.11.2026)

Die Pins betreffen Dateien, die der DS-REWORK bewusst geändert hat (Tokens), oder Belege, die danach mit echten Browserläufen neu erhoben wurden (Identity-Hero vite und next, Ausnahmeerfassung vite und next, Critical-Lauf, Text-Spacing; alle Exit 0, Quelle: Harnesses in `apps/site/tests/`). Die alten Fassungen liegen in `superseded/` (`*.pre-ds-rework-2026-11-09.json`). Die Gesamtsuite steht danach unverändert auf 18 Failures und 4 Errors; keine neuen.

| Datei | alter Pin | neuer Pin |
|---|---|---|
| `config/design-tokens.json` | `6e699c0082f4…` | `1482e2fa0e40…` |
| `docs/design/detail-browser-evidence.json` | `7e632cf96a63…` | `8a26dd144e36…` |
| `evidence/identity-hero-2026-10-28/next.json` | `261ae864584f…` | `0401d8f15ffd…` |
| `evidence/identity-hero-2026-10-28/vite.json` | `6302a6b1309c…` | `ba0180077b16…` |
| `evidence/observability-integration-2026-10-28/browser-exceptions-next.json` | `848b47e1df14…` | `e439c85f10a8…` |
| `evidence/observability-integration-2026-10-28/browser-exceptions-vite.json` | `30c0c184781b…` | `4a7b5703fb4c…` |
| `evidence/one-app-2026-10-27/critical-browser-fresh.json` | `7e632cf96a63…` | `8a26dd144e36…` |
| `evidence/one-app-2026-10-27/text-spacing.json` | `49211abd8719…` | `8f0ef3c7b587…` |
| `packages/tokens/tokens.css` | `3ca2f06408bf…` | `218355ed5fdd…` |
| `packages/tokens/tokens.json` | `44735b27c2ee…` | `5b9a4eb32842…` |
| `packages/tokens/tokens.ts` | `ffb72538d182…` | `5294aa6ed39b…` |

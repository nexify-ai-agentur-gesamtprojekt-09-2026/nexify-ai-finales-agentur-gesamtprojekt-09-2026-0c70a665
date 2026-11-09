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

## Nachtrag Consent-Kette (09.11.2026)

Public-Experience-Harness an das aktuelle UI angepasst und mit echtem Lauf bestanden (Next-Build, 70 Routen: 43 öffentliche Seiten, TEILEKLAR nur de; 10 private Hüllen mit no-store und noindex, interne APIs 401). Clerk-Locale-Brücke stillgelegt (ED-04). Beleg `evidence/consent-ui-2026-10-28/next-public.json` neu erhoben, alte Fassung in `superseded/`.

| Datei | alter Pin | neuer Pin | Beleg |
|---|---|---|---|
| `apps/web/auth/tests/browser-public-experience.mjs` | `2f05bb0e1911…` | `01dd50b5bddf…` | Harness, heute mit echtem Lauf ausgeführt (70 Routen, 10 private, passed) |
| `evidence/consent-ui-2026-10-28/next-public.json` | `f1f9f49988ca…` | `c452eba944bc…` | heute real erhobener Beleg (Next-Build, passed, 70 Routen, 10 private, interne APIs 401) |
| `tests/test_browser_evidence.py` | `dd428c7c5942…` | `7643cd0834b1…` | unittest tests.test_browser_evidence: 50 Tests OK |
| `tools/check_browser_evidence.py` | `e0860a8feef7…` | `bb6e835fc30a…` | tools/check_browser_evidence.py: gesamte Belegkette besteht; unittest tests.test_browser_evidence OK |
| `apps/web/app/layout.tsx` | `7497ff5dcc44…` | `4dacaac6a22c…` | bytegebunden im heutigen Beleg next-public.json (Harness-Lauf passed) |
| `apps/web/app/anmelden/[[...sign-in]]/page.tsx` | `0536dcc25c6a…` | `ae015545eb91…` | bytegebunden im heutigen Beleg next-public.json; Titelfix (Sprache aus lang), Mobil 320 px geprüft |
| `apps/web/app/registrieren/[[...sign-up]]/page.tsx` | `d1647612cdc4…` | `ed41b40219ce…` | bytegebunden im heutigen Beleg next-public.json; Titelfix (Sprache aus lang), Mobil 320 px geprüft |
| `evidence/one-app-2026-10-27/text-spacing.json` | `8f0ef3c7b587…` | `59c687d965c2…` | heute neu erhobener Text-Spacing-Lauf (129 Checks, 0 Befunde, 43 Routen) nach dem Titelfix auf Anmelden und Registrieren |

## Nachtrag gelöschte Quellen und grüne Tests (09.11.2026)

| Datei | Begründung |
|---|---|
| `apps/web/components/PresenterEditorial.css` | Datei entfernt; Pin entfällt (kein Nachfolger-Beleg nötig) |
| `apps/web/public/sitemap.xml` | Datei ersetzt durch den Next-Metadata-Route apps/web/app/sitemap.ts; Pin entfällt |
| `apps/web/app/sitemap.ts` | neuer Pin als Nachfolger von public/sitemap.xml; Bytes von seo-sitemap.test.mjs gelesen, heute 26 von 26 Tests grün |
| `apps/site/tests/seo-sitemap.test.mjs` | node --test tests/seo-sitemap.test.mjs tests/public-video-assets.test.mjs: 26 von 26 OK (heute) |
| `apps/site/tests/public-video-assets.test.mjs` | node --test tests/seo-sitemap.test.mjs tests/public-video-assets.test.mjs: 26 von 26 OK (heute) |

Bewusst offen bleiben `apps/web/components/PresenterScene.tsx` (Zeile REC-MEDIA-01 und der Harness `browser-scene-images.mjs` binden die gelöschte Datei; die Zeile braucht ein neues Urteil über die Zwischenbilder), `PROGRESS.md`, `apps/shop-api/requirements.in`, `apps/web/app/[...slug]/page.tsx`, `apps/web/app/page.tsx`, `apps/web/next.config.ts`, `config/page-explainers.json`, `config/page-media-registry.json` und `apps/site/tests/browser-scene-images.mjs`.

## Nachtrag Footer-Pfeil (09.11.2026)

`DiagnosticConsent.css` bekommt statt des Browser-Standardpfeils einen eigenen Chevron (dreht beim Öffnen, Reduced Motion ohne Übergang, Zielhöhe 48 px bleibt). Fünf gebundene Belege mit echten Läufen neu erhoben, alte Fassungen in `superseded/` (`*.pre-footer-2026-11-09.json`).

| Datei | alter Pin | neuer Pin | Beleg |
|---|---|---|---|
| `evidence/consent-ui-2026-10-28/browser-consent-ui.json` | `e01df765ed05…` | `526072b3bf9d…` | heute neu erhobener Consent-UI-Lauf (18 Checks, passed) |
| `evidence/consent-ui-2026-10-28/next-public.json` | `c452eba944bc…` | `b8888c4abbad…` | heute neu erhobener Next-Lauf (70 Routen, 10 private, passed) nach dem Footer-Pfeil |
| `evidence/observability-integration-2026-10-28/browser-exceptions-vite.json` | `4a7b5703fb4c…` | `96296be14d86…` | heute neu erhobene Ausnahmeerfassung (vite, Exit 0) |
| `evidence/observability-integration-2026-10-28/browser-exceptions-next.json` | `e439c85f10a8…` | `2d562005862f…` | heute neu erhobene Ausnahmeerfassung (next, Exit 0) |
| `evidence/one-app-2026-10-27/text-spacing.json` | `59c687d965c2…` | `b86244f8b4f0…` | heute neu erhobener Text-Spacing-Lauf (129 Checks, 0 Befunde, 43 Routen) |
| `apps/web/components/DiagnosticConsent.css` | `50931b2af39c…` | `a57940d16dac…` | Footer-Pfeil: Disclosure mit eigenem Chevron; bytegebunden in allen fünf heute neu erhobenen Belegen |

## Nachtrag Next-Quellen und Konfiguration (09.11.2026)

Der Next-Harness bindet jetzt auch `page.tsx`, `[...slug]/page.tsx` und `next.config.ts`, die er real ausführt. Ein Pin belegt nur unveränderte Bytes seit einem bestandenen Lauf, keine Abnahme der Anforderung.

| Datei | alter Pin | neuer Pin | Beleg |
|---|---|---|---|
| `apps/web/app/page.tsx` | `e6d38be79fa7…` | `80197fa46cf3…` | im Harness-Lauf (70 Routen, Startseite) real ausgeführt und im Beleg next-public.json bytegebunden |
| `apps/web/app/[...slug]/page.tsx` | `ff40ee25c730…` | `4b8a636c0410…` | im Harness-Lauf (alle öffentlichen Unterseiten in de und nl) real ausgeführt und bytegebunden |
| `apps/web/next.config.ts` | `78402edbe626…` | `d8b4e13bdcc6…` | im Harness-Lauf (Next-Build, Header, Routen) real ausgeführt und bytegebunden |
| `evidence/consent-ui-2026-10-28/next-public.json` | `b8888c4abbad…` | `5cbe162f0071…` | heute neu erhobener Next-Lauf, jetzt mit 18 statt 15 gebundenen Quellen (70 Routen, 10 private, passed) |
| `apps/web/auth/tests/browser-public-experience.mjs` | `01dd50b5bddf…` | `17cfd1c25cdc…` | Harness um drei Quellen erweitert, heute real ausgeführt (passed) |
| `tools/check_browser_evidence.py` | `bb6e835fc30a…` | `f6ec11afa854…` | Prüfer um dieselben drei Quellen erweitert; gesamte Belegkette besteht, unittest tests.test_browser_evidence OK |
| `config/page-explainers.json` | `dac4a03283c6…` | `5155527ac0ce…` | Bytes gebunden: vom heute grünen Test public-video-assets.test.mjs (26 von 26) und generate-public-data gelesen. Inhaltsurteil (REC-CONTENT-01) bleibt offen, full_requirement_accepted bleibt false |
| `config/page-media-registry.json` | `43d36f51f863…` | `f3fae02c19ba…` | Bytes gebunden: vom heute grünen Test public-video-assets.test.mjs (26 von 26) gelesen. Inhaltsurteil (REC-MEDIA-01) bleibt offen, full_requirement_accepted bleibt false |

Bewusst weiter offen (kein Test oder Lauf bindet den Inhalt): `PROGRESS.md`, `apps/shop-api/requirements.in`, `apps/site/tests/browser-scene-images.mjs` und die gelöschte `apps/web/components/PresenterScene.tsx` (Zeile REC-MEDIA-01).

## Nachtrag PROGRESS.md (09.11.2026)

| Datei | alter Pin | neuer Pin | Beleg |
|---|---|---|---|
| `PROGRESS.md` | `5a7e8ddbb508…` | `ee42461b8e39…` | Diff seit Pinstand e061fc8 geprüft: 49 angefügte Zeilen, 0 geänderte oder gelöschte; ausschließlich Dokumentation (Prüfberichte, Entscheidungen). Keine Änderung früherer Zeilen. |

Weiter offen mit Grund: `apps/shop-api/requirements.in` (seit Pin zwei Zeilen: Kommentar und Drittanbieter-Abhängigkeit `higgsfield-client==0.2.0`; kein Test oder Lauf prüft sie, Pin bindet keine Sicherheitsprüfung), `apps/site/tests/browser-scene-images.mjs` und `apps/web/components/PresenterScene.tsx` (gelöscht, Zeile REC-MEDIA-01).

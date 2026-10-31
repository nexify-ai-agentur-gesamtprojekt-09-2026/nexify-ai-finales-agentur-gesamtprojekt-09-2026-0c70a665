# EN-Integration (Auftrag 16) — Statusbeleg: AUSGESPIELT & grün (atomar)

Stand: 2026-10-31 · lokal · kein Push. `make test` = **620 OK** nach echtem Mehr-Suiten-Evidence-Regen
(vite **und** next Surfaces). EN-Laufzeit-Regressionstest `apps/site/tests/en-locale-audit.mjs` = **AUDIT_PASS**
(0 pageerrors über alle 36 öffentlichen Routen, Desktop+Mobil, Locale-Folge de/nl/fr/en).

## Was integriert wurde
- **Daten:** `integrate-en.mjs` (Skip-Guard für 3 entfernte Knoten) → `config/site-map.json` (492 Pointer, locales+=en),
  `config/i18n.json` (26), `apps/web/lib/i18n.ts` (61 Keys). `config/presenter-sources.json` SHA nachgezogen.
- **Render:** `generate-public-data.mjs` `localized()` liefert en (verifiziertes Staging, sonst Base-Fallback de).
- **Komponenten-Locale-Dicts (verifiziertes Staging):** SiteNavigation, SiteFooter, PublicContent, ExplainerSections,
  PresenterGuide, PresenterVideo, PageMediaBand, HomeContent, IdentityHero, ProblemExplorer, PublicOrientationChat,
  PublicRequestFallback, ShopPanel, MailWorkspacePanel, WorkshopDirectory, PartnerRequestForm, AuthAvailabilityNotice,
  DiagnosticConsent, Workspace (starters), Auth, main. Typ `Localized` um `en` erweitert (page-types.ts).
- **Kernweg vollständig Englisch:** Workspace-Inline-Chrome (skip-link, Header, Status, „you are here", Rollen,
  Quote-Ansicht, chat-hints, Modi, Pascal-Link, Prefill-Hinweise), tkWelcome, home-scenes `sceneLabels`,
  HomeContent `sceneLabel`, SiteFooter-Rechtsdict, InstallInvitation, PartnerRequestForm (4 Rest-Keys) — sinngenau
  aus bestehendem Deutsch übersetzt, keine neuen Produkt-/Preis-/Rechtsfakten erfunden.
- **Regressionstest ergänzt:** `apps/site/tests/en-locale-audit.mjs` (pageerror-frei je Locale über alle Routen).
- **Evidence real neu gemessen** (echte Chromium-Läufe): browser-critical (inkl. en-Iteration), text-spacing,
  public-fallbacks, exception-capture (vite+next), shop, catalog, consent-ui, legal-footer (vite+next), public-experience
  (next-public). Register-SHAs (`config/acceptance-coverage.json`) chirurgisch nachgezogen.

## Behobener EN-Timeout (Diagnosebefund, nicht Timeout-Verlängerung)
Ursache war **kein** Timeout-Problem: `#locale` hatte keine `en`-Option und zahlreiche Komponenten-Dicts hatten keinen
`en`-Schlüssel → React-Render-Crash beim Wechsel auf en (`reading 'ai'/'project'/'sound' of undefined`), wodurch
`selectOption('en')`/Folgeschritte ins Leere liefen. Behoben durch echte DOM-Option + vollständige en-Abdeckung aller
locale-indizierten Strukturen im Nutzerweg (per `en-locale-audit` iterativ ermittelt).

## Offene Abnahmegrenzen (bewusst dokumentiert, nicht aus Scope gestrichen)
1. **Video-Audiospur:** Erklärfilme existieren nur de/nl/fr. EN-Nutzer sehen den **deutschen** Film; dies ist
   im UI **sichtbar gekennzeichnet** (ExplainerSections, `data-testid="en-video-audio-note"`). Englischer Seitentext
   ist vorhanden. **Fehlende englische Audiospur bleibt offen** — keine kostenpflichtige Videoneuproduktion gestartet.
2. **WorkspaceStatusPanel (geschütztes Portal):** Label-Sprache fällt bei `en` auf `de` zurück (Dict nur de/nl).
   Nicht im öffentlichen Kernweg; bleibt offener Punkt.

## QA-Artefakte (nicht gelöscht, lokale Ablage)
`.local/diagnostics/en-slice-qa/`: Audit-Skript (+CANONICAL-Kopie), Report, Debug-Logs, Komponenten-Integrator,
Regen-Skripte. `apps/site/tests/en-locale-audit.mjs` als dauerhafter Regressionstest.

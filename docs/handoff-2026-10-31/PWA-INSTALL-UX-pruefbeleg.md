# PWA-Installationsbereich — Prüfbeleg (echte Läufe, Auftrag 15 + QS)

Stand: 2026-10-30 · lokal · kein Push/Deployment · kein neuer Dienst/Key · keine neuen Kosten.
Versionsbindung: Parent-HEAD `9a7bcd0bf2bbb574f9726078cafd5f95a880270f`; Node v20.20.2; Playwright 1.58.2; Chromium-1248.

## Umsetzung (bestehender Scope: installierbare PWA + mobile Nutzung)
Neuer, dezenter, barrierefreier Installationsbereich im **Footer-Dokumentfluss** (kein Overlay des Chats):
`apps/web/components/InstallInvitation.tsx` (+ `InstallInvitation.css`), eingehängt in `apps/web/components/SiteFooter.tsx` vor dem Consent-Block. Original-Signet, zentrale Tokens, bestehende Button-Klassen.

Ehrliches Verhalten je Browser:
- Nur bei real verfügbarem `beforeinstallprompt` erscheint die Aktion „Installieren“ (ruft den echten Prompt auf).
- Sonst ehrliche Browseranleitung (Browsermenü „App installieren“/„Zum Startbildschirm“).
- iOS-Safari: Hinweis auf Teilen-Menü → „Zum Home-Bildschirm“ (kein Prompt-Versprechen).
- Bereits standalone/installiert: kein Angebot. Dismiss wird persistiert (localStorage). Keine Auto-Popups, keine erfundenen Download-/Installationsgarantien.
- **Kein Offline-Cache** für Auth/API/Kundendaten (der Serviceworker bleibt network-only; dieser Bereich speichert nichts).

## Echte Prüfgrundlage (keine Hash-Kosmetik)
- Gezielter Chromium-UI-Test `apps/site/tests/browser-install-invitation.mjs` gegen den gebauten Build: **8/8 passed** — fehlendes Event (ehrliche Anleitung, kein Button), verfügbarer Prompt, akzeptierter Prompt, abgelehnter Prompt, Dismiss-Persistenz, standalone (kein Angebot), Tastaturaktivierung, schmaler Viewport (360px) ohne Überlagerung des Chat-Launchers.
- **Legal-Footer-Readback genuin neu gemessen** gegen den neuen Build (nicht nur Quellhash getauscht):
  - Vite-local `browser.json`: real re-run, 216 Views / 12 Interaktionen, `passed`, Disclosures=1, `all_pages_disclosures_outside`=1 — mit vorhandener Install-Sektion.
  - Next-local `next-browser.json`: real re-run gegen `next start` (Portal-Parität), 216/12, `passed`.
  - Beide nach `evidence/legal-footer-2026-10-28/` promotet; `report.source_sha256` enthält die aktuellen `SiteFooter.tsx`-Bytes.
- Text-Spacing `evidence/one-app-2026-10-27/text-spacing.json` per echtem Chromium-Lauf regeneriert (108 Checks/0 Issues), inkl. neuer Dateien.
- Consent/Disclosure: `evidence/consent-ui-2026-10-28/*.json` Quell-Bindung von `SiteFooter.tsx` nachgezogen; der Consent/Mail-DOM-Beleg ist durch einen Install-**Geschwisterblock** invariant (DiagnosticConsent unverändert). Historische, nicht betroffene Belege bleiben historisch erhalten.
- Gesamtregression `make test`: **620 Tests grün**. Echte Builds zusätzlich verifiziert: `apps/site` Typecheck OK, `apps/web` Next-Build grün (ein dabei aufgedeckter Typfehler in `InstallInvitation.tsx` wurde behoben).

## Tatsächliche Prüfgrenzen (ehrlich)
- Keine reale Betriebssystem-/geräteübergreifende Installations-/Update-/Deinstallationsabnahme; Läufe nur lokal (headless Chromium, lokale Server). Geräte-QA bleibt separat.
- Install-Prompt wird nicht auf allen Browsern versprochen; iOS nur manueller Hinweis.
- `next-browser.json` ist Next-local-Parität, keine Produktionsabnahme; produktive `/api`-Bindung/Zielorigin weiterhin unfreigegeben (siehe API-RUNTIME-BINDING-SOLL-IST.md).

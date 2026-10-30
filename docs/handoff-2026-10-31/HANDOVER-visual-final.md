# HANDOVER — NEX-WEB-VISUAL-FINAL / NEX-WEB-EN-20261030-01 (gesicherter Checkpoint)

Stand: 2026-10-31. Autor: Frontend-/Content-Writer (Emergent). Zweck: testbare Übergabe an das
Team für Backend-/Integrations-/Feinarbeit. **Keine Secrets. Kein Publish. Keine simulierten Aktionen.**

## 0. Repo-Koordinaten
- Branch: `main` · Head-Commit: `17b7e9aecd5b1b9a7dcf64434aa1353117c8c7ee`
- App-Root: `/app` (Monorepo). Öffentliche Preview = **`apps/site`** (Vite, über `frontend/preview-server.mjs`).
  Next.js-Portale = `apps/web`. Gateway = `apps/agent-gateway` (stdlib HTTP). Vercel-Functions = `api/`.
- CI-Toolchain: **Node 22** (`/root/toolchain/node22/bin/node`). Lokaler `make check-arch` schlägt nur
  wegen Default-Node v20 fehl (Umgebungsartefakt), unter Node22 grün.

## 1. Commit-Reihe dieses Auftragsbogens (alle lokal, nicht gepusht)
| SHA | Inhalt |
|---|---|
| `cfaca08` | Fail-closed Live-DeepSeek-Pfad (AUS) + Inventur/Audits |
| `241844d` | Ist-Fakten Stimme/Video |
| `ea28da1` | Weg B deterministischer A/V-Gleichlauf (TrioScene) |
| `0b410b2` | Echter Browser-Funktionsnachweis Weg B |
| `eafe5ea` | EN-Atomizität + Laufgrenze dokumentiert |
| `5fba64b` | EN-Prep: Inventar(483)+Glossar+Kerngruppe(95) |
| `536bc7e` | EN-Prep: leistungen-rahmen (44) |
| `17b7e9a` | EN-Prep: produkte (42) |

## 2. EN-Vorbereitung: Status (Build-Prep, NICHT ausgeliefert, Runtime unverändert)
- Alle Dateien unter `i18n-staging/en/`. Werkzeuge: `_tools/build-inventory.mjs`, `_tools/verify-part.mjs`
  (prüft Pointer-Vollständigkeit, DE-SHA-Bindung, Platzhalter-/Produktnamen-Erhalt).
- Inventar: `inventory.json` = **483 lokalisierte Seitenfelder** (+Footer), je Pointer + DE-SHA + Gruppe.
- **FERTIG & VERIFIZIERT (209 Felder, alle öffentlichen Marketing-Seiten):** `parts/01-core.en.json`
  (home/leistungen/unternehmen/kontakt, 95), `parts/02-leistungen-rahmen.en.json` (44),
  `parts/03-produkte.en.json` (42), `parts/04-wissen.en.json` (28) — je VERIFY_OK (Batch bestätigt).
- **OFFEN (274 Felder):** recht 54, auth 24, teileklar 151, portal-intern 42, footer 3.
  Pointer stehen vollständig in `inventory.json` (Gruppe-Feld). **recht/legal nur mit separater
  Rechtsprüfung übersetzen — nicht als juristisch geprüft ausgeben.**
- **NOCH NICHT inventarisiert (eigene Teilinventare nötig):** UI-Chrome (`apps/web/lib/i18n.ts`,
  `config/i18n.json`), Gateway-Texte (`apps/agent-gateway/integrations.py` `CUSTOMER_TEXT`/speech),
  Chat-Einstiege, Formular-/Fehlertexte, PWA-Installationshilfe, VTT/Cues.

## 3. Atomarer Integrationsvertrag EN (erst wenn ALLE Parts + Chrome/Gateway/Chat/Forms/PWA/Cues fertig)
EN ist durch harte Locale-Verträge **atomar** (kein grüner Teilschritt). In EINEM Change:
1. `config/site-map.json`: `locales` → `['de','nl','fr','en']`; je lokalisiertem Feld `en` aus den Parts
   (Pointer-gebunden) einsetzen. `default_locale` bleibt `de`.
2. Testverträge anpassen: `tests/test_site_map.py:18` (`{'de','nl','fr'}`→+`'en'`), `:21` Parität bleibt;
   `tests/test_gateway_integrations.py:247` (alle Locales); `tests/test_identity_hero.py:25` — Hero bleibt
   `['de','nl','fr']` (**kein EN-Audio**; EN = Text/UI, nicht gesprochene Szene).
3. `apps/web/lib/i18n.ts` `en`-Block + Typ `Locale`; **alle 15 Inline-`{de,nl,fr}`-Maps** um `en` ergänzen
   (sonst `tsc`-Bruch). `config/i18n.json` `sprachen`+`texte.en`.
4. Gateway `CUSTOMER_TEXT`/speech-Locales + `page-explainers.json`/`home-scenes` sceneLabels EN.
5. SEO: `html lang`, stabile Locale-URLs, canonical+hreflang (inkl. Rückverweise), Sitemap, Zahlen/Währung/
   Datum (EN-Format) in `apps/site/scripts/generate-public-data.mjs`.
6. Node-Suiten mit `['de','nl','fr']` (browser-critical/identity-hero/legal-footer/mail-workspace/explainers)
   auf `en` erweitern und **real neu messen** (`.local/diagnostics/regen-affected.sh`), Evidence-Hashes
   chirurgisch in `config/acceptance-coverage.json`.
Sprachwechsel erhält Route/Briefing; keine Sprachmischung; EN-Untertitel nie als EN-Audio ausgeben.

## 4. Backend-Schnittstellenvertrag Live-Chat (für Team; ohne Secrets)
- Route: Next.js `POST /api/agent-chat` (`api/agent-chat.ts` → `packages/agent-runtime/public-orientation.ts`;
  Live-Modul `packages/agent-runtime/managed-live-chat.ts`). Runtime `nodejs`.
- Request: AI-SDK UI-Message-Stream POST (JSON `{messages:[...]}`, same-origin). Response: UI-Message-Stream
  (`text/event-stream`), Header `x-nexify-agent-mode: public_guided_preview`, `x-nexify-session:false`,
  `x-nexify-persistence:false`. Fehler: 405 (GET), 403 (fremde Origin), 422 (private Seite), 413 (>Limit),
  499 (abgebrochen), **503 `managed_live_chat_unavailable`** (Gate offen).
- Live-Gate (AUS by default, fail-closed): aktiv nur bei `NEXIFY_LIVE_CHAT=enabled` **und** 9router
  `NINEROUTER_URL`+`ROUTER_KEY`; **kein** OPENAI/EMERGENT-Fallback. Adapter gepinnt auf DeepSeek
  `deepseek/deepseek-v4.1-flash-1017` (OpenRouter-Endpoint) — 9router-Repoint ist separat autorisierte
  Adapter-Änderung (`managed_live_chat_router_binding_pending`).
- Ziel-Secret-Speicher: **Vercel-Agency-Projekt-Env** (serverseitig, der die `api/`-Functions deployt) +
  autorisierte Budgetfreigabe. **Kein VPS für diese Route.** Keine neuen Credentials durch mich.
- Abhängigkeiten: `@openrouter/ai-sdk-provider`, `ai`. Keine neue serverseitige Persistenz ohne geklärte Grundlage.

## 5. Visual-Final: noch zu erledigende Content-Pakete (mein Rollenanteil, nächster Pass)
- **Touch48**: `apps/web/app/globals.css` Basis `min-height:44px`→48 + >15 Komponenten-Regeln; Schwelle in
  `apps/site/tests/browser-accessibility.mjs` (44→48); resize/accessibility/critical **real** neu messen;
  320px-Layout prüfen (eigener QA-Pass).
- **Shop/Werkstatt/Partner/Stadtseiten**: vorhandene TEILEKLAR-Seiten (tk-*) + reale Katalog-/Partnerdaten
  wiederverwenden; **keine** erfundenen Werkstätten/Partner/Bestände/Preise, **keine** Massen-Stadtseiten.
  Nicht angeschlossene Aktionen (Bestellung/Anmeldung/Versand) klar „nicht verfügbar", nicht simulieren.
- **Login/Registrierung/Portal** (`/anmelden`,`/registrieren`,`/portal/*`): Clerk serverseitig fehlt
  (`CLERK_SECRET_KEY` nicht gesetzt, Next.js-Review-App gestoppt) → als „nicht verfügbar" behandeln (kein Fake).

## 6. Credit-/Budgethinweis
Obergrenze lt. Pascal: **1.371,78 Emergent-Credits** für die restlichen Emergent-Arbeiten. Live-Restbestand
ist für mich nicht direkt auslesbar; ich arbeite sparsam, batchweise verifiziert, und sichere Checkpoints
früh. Kein Nachkauf/Abo/externer bezahlter Dienst. CI wird nicht umgangen/abgeschwächt.

## 7. Testbarkeit / Nachweis
- EN-Parts: `node i18n-staging/en/_tools/verify-part.mjs <part> <gruppen>` → VERIFY_OK.
- A/V Weg B: `apps/site/tests/browser-media-sync.mjs` (real, HeadlessChrome/145) + `docs/handoff-2026-10-31/weg-b-funktionsnachweis.md`.
- Gesamt: `make test` zuletzt **583 grün**. Keine unbewiesene Abnahme, keine automatische Veröffentlichung.

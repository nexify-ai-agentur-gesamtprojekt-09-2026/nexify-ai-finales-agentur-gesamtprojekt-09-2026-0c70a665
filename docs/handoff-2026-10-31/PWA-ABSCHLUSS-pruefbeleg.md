# PWA-Abschluss — Prüfbeleg (echter Chromium-Lauf gegen gebauten Preview)

Stand: 2026-10-30 · lokal · kein Push/Deployment · keine neuen Anbieter/Keys/Kosten.
Versionsbindung: Repo-HEAD `60193c1187901f01dea9158c22ef03c03718a386`; Node v20.20.2; Playwright 1.58.2; Chromium-1248; `PLAYWRIGHT_BROWSERS_PATH=/pw-browsers`.

## Build (expliziter public-pwa-Modus, keine Produktionsaktivierung)
```
cd apps/site
node scripts/generate-public-data.mjs          # 36 Seiten; geschützte Inhalte ausgeschlossen
node node_modules/vite/bin/vite.js build --mode public-pwa --outDir ../../.local/pwa-dist
```
Erzeugt u. a. `.local/pwa-dist/{manifest.webmanifest, public-install-worker.js, signet.svg}`.

## Manifest (geprüft, gebautes Artefakt)
`id/start_url/scope:"/"`, `name/short_name:"NeXify AI"`, `display:"standalone"`, `lang:"de"`,
`background_color/theme_color:"#080A0F"` (zentrales Token `color-graphit-900`),
`icons`: **Originalsignet** `/signet.svg` (`sizes:"any"`, `type:"image/svg+xml"`) für `purpose:"any"` **und** `"maskable"`.

## Service-Worker-/Cache-/Update-Verhalten
`apps/site/pwa/worker.js` ist **bewusst network-only**: kein `fetch`-Handler, kein CacheStorage,
kein Background-Sync, kein Push, keine automatische Wiederholung, kein `skipWaiting`/`clients.claim`.
Updates folgen dem normalen Browser-Lifecycle. Es gibt **keinen privaten Offline-Datenspeicher**;
Auth-/API-/Kundendaten werden **per Konstruktion nie offline gecacht**.

## Läufe und Ergebnisse
- Unit `apps/site/tests/public-installation.test.mjs`: **4/4 pass** (positiv/negativ, u. a. deaktiviert bei Nicht-public-pwa/Standalone/kein serviceWorker).
- Echter Chromium `apps/site/tests/browser-pwa.mjs`: **passed:true, 9 Checks, mutations=1** (genau ein Online-POST). Beleg: `evidence/one-app-2026-10-27/pwa-browser.json` (sha256 `3941c163987383e4b9c5ce6fb0d242ab92afe51ac75411d5636c4473dc6d186e`, byte-identisch zum committeten Stand → stabil/reproduzierbar).
  1. echte Registrierung + Controller
  2. Manifest durch Chromium fehlerfrei geparst (`name:"NeXify AI"`, `scope:"/"`)
  3. synthetische API-403 nicht gecacht
  4. genau ein Online-POST (kein Replay)
  5. Offline: privater GET **und** POST scheitern ohne Retry
  6. Offline-Navigation ausdrücklich nicht verfügbar; keine erfundenen Offline-Daten
  7. Reconnect stellt die Shell ohne POST-Replay wieder her
  8. `CacheStorage` bleibt leer (`caches.keys()==[]`)
  9. eigener Unregister-Rückweg nach Client-Schließung (nur die per scriptURL identifizierte `public-install-worker.js`)

## Offline-Fehlerfall
Netzverlust unterbricht die Navigation; `reload()` schlägt fehl (geprüft). Das ist korrekt und
beabsichtigt: **keine offlinefähige Geschäftsanwendung**, keine ersetzten Finanz-/Auth-Aktionen,
kein stiller Retry.

## Tatsächliche Prüfgrenzen (ehrlich)
- **Kein** reales OS-/geräteübergreifendes Installations-/Update-/Deinstallationsabnahme-Ergebnis; Lauf nur gegen lokalen HTTP-Fixtureserver + headless Chromium.
- **Kein Install-Prompt** wird im UI angeboten oder als erfolgreiche OS-Installation dargestellt → es wird **auf keinem Browser** eine Installierbarkeit versprochen. Für **iOS/Safari** gäbe es ohnehin kein `beforeinstallprompt`; eine Installation dort erfordert den manuellen „Zum Home-Bildschirm"-Weg. Da kein Prompt-UI existiert, wird diese Grenze nicht verletzt; ein iOS-Hinweis wäre erst bei Einführung eines Install-Affordance nötig (separater, hier nicht beauftragter Scope).
- Produktive Aktivierung/Zielorigin **unfreigegeben**; privater Offlinebetrieb benötigt separaten Daten-/Berechtigungs-/Löschvertrag.
- Node-Referenz im Vertrag ist 22.x; hier real mit Node v20.20.2 gebaut/geprüft (grün).

## Reproduktion/Rückweg
Normaler Build ohne `--mode public-pwa` aktiviert weder Manifest noch Registrierung
(`docs/contracts/public-installation.md`). Keine fremden Registrierungen/Caches angefasst.

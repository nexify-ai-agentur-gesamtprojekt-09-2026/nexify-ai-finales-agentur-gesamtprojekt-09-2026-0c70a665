# Öffentliche Installation in apps/web — begrenzter Cache und Offline-Seite

Stand 14.11.2026. Inhabervorgabe vom 14.11.2026: mobile Optimierung und eine vollwertige PWA
für nexifyai.de. Dieses Dokument ergänzt `docs/contracts/public-installation.md`; dessen Aussagen
gelten unverändert für den Worker von `apps/site` (`apps/site/pwa/worker.js`, ohne Cache).

`apps/web` liefert einen eigenen Worker aus (`apps/web/pwa/worker.js`, weiterhin unter
`/public-install-worker.js` und weiterhin nur im Build mit
`NEXIFY_PUBLIC_INSTALLATION=public-pwa`). Abweichung vom dortigen Satz „kein Fetchhandler,
kein Cache":

- Cache-zuerst ausschließlich für statische Dateien (`/_next/static/**`, `/fonts/**`,
  `/brand/**`, `/glass/**`, Icons), in Caches mit Build-Version.
- Eine gespeicherte Seite: `/offline` (Deutsch bei der Installation, weitere Sprachen bei
  Nutzung), ohne Cookies abgerufen. Alle anderen Seiten kommen immer aus dem Netz; ohne Netz
  erscheint die Offline-Seite mit Status 503.
- Unverändert ausgeschlossen: `/api/**`, `/webhook/**`, Anmelde-, Konto-, Warenkorb-, Kassen-,
  Bestell- und Portalseiten, Schreibanfragen, Filme, Antworten mit `no-store`, `private` oder
  `Set-Cookie`.
- Unverändert: kein `skipWaiting`, kein `clients.claim`, kein Push, keine Synchronisierung,
  keine Wiederholung von Anfragen, kein privater Offlinebetrieb.

Manifest: `apps/web/pwa/manifest.mjs` baut auf dem gemeinsamen Manifest auf und nennt nur Icons,
die `apps/web` ausliefert. Ein Manifest für den Ursprung; Seiten unter `/teileklar` verlinken es
nicht (eigene Marke ohne eigenes App-Icon) und bekommen offline einen schlichten eigenen Hinweis.

Registrierung (`apps/web/components/PublicInstallation.tsx`): nur im Produktions-Build, nach dem
ersten Seitenaufbau, nicht im Datensparmodus. Der Worker setzt kein Cookie und keine Kennung.

Aktivierung in der Produktion: Build-Variable `NEXIFY_PUBLIC_INSTALLATION=public-pwa` im
Vercel-Projekt. Rückweg: Build ohne die Variable; die Seite meldet dann die eigene Registrierung
ab und löscht nur Caches mit dem Präfix `nexify-public-`.

Nachweise: `apps/web/auth/tests/pwa-worker.test.mjs` (Grenzen, ohne Browser),
`apps/web/auth/tests/browser-pwa-offline.mjs` (Chromium, emuliertes Gerät),
`tools/live-check.mjs` (lesend: Manifest, Worker-Datei, Offline-Seite, Verweis im Kopf).

Offen: Installations-, Update- und Deinstallationslauf auf echten Zielgeräten (iOS Safari,
Android Chrome); Erwähnung des lokalen Speichers in der Datenschutzerklärung (Rechtstext,
Entwurf 0.9); Push-Benachrichtigungen (bräuchten Einwilligung und einen Zustellweg).

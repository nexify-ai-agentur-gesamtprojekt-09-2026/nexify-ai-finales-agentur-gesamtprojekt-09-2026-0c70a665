# Öffentliche Installation — begrenzter lokaler Schnitt

MASTER-13 war eine tatsächliche Implementierungslücke. Der neue explizite
Vite-Buildmodus `public-pwa` liefert Manifest und Serviceworker in derselben
`apps/site`-Anwendung. Normale Produktions-, Entwicklungs- und Standalone-Builds
aktivieren weder Manifest noch Registrierung. Keine Veröffentlichung erfolgt.
Das unveränderte vorhandene NeXify-Signet und zentrale Farbtokens werden benutzt.

Der Worker ist bewusst ausschließlich netzabhängig. Er hat keinen Fetchhandler,
keinen Cache, keine Background-Synchronisierung, keine Pushfunktion und keine
Wiederholung. Öffentliche Navigation, private/API-/Auth-Antworten und Schlüssel
werden nicht für Offlinebetrieb gespeichert. Ein Netzverlust kann die Navigation
unterbrechen; das ist keine offlinefähige Geschäftsanwendung. Die Registrierung
aktiviert keine Rollen, Provider oder Controllerroute. Ein Installationsdialog
wird weder erzwungen noch als erfolgreich bestätigte OS-Installation dargestellt.

Lokale Reproduktion (Node22.23.4, bestehende Abhängigkeiten):

```sh
cd apps/site
node scripts/generate-public-data.mjs
node node_modules/vite/bin/vite.js build --mode public-pwa --outDir ../../.local/pwa-dist
cd ../..
node --test apps/site/tests/public-installation.test.mjs
node apps/site/tests/browser-pwa.mjs
```

Playwright wird aus der bereits vorhandenen Umgebung geladen; bei Bedarf
PLAYWRIGHT_MODULE und PLAYWRIGHT_BROWSERS_PATH setzen. Der Browsertest verwendet
nur einen lokalen HTTP-Fixtureserver. Eine synthetische POST-Antwort wird gezählt;
Netzausfall und Wiederverbindung dürfen keinen zweiten POST auslösen. Das
Manifest wird durch Chromium geparst, der echte Worker registriert/kontrolliert,
leerer Cache sowie fehlende Offlineantworten und begrenzter Rückweg geprüft.
Das ist keine reale Provider- oder geräteübergreifende Installationsabnahme.

Rückweg vor Veröffentlichung: normaler Build ohne `--mode public-pwa`.
Nach einer gesondert autorisierten späteren Aktivierung reicht das Entfernen des
Registrierungscodes nicht zum Entfernen eines vorhandenen Workers: ausschließlich
die nach scriptURL identifizierte eigene public-install-worker.js-Registrierung
abmelden und deren Clients schließen/neu öffnen. Dies wurde lokal getestet.
Keine fremden Registrierungen/Caches löschen. Der Worker besitzt selbst keine
Daten, die migriert werden müssten. Browserupdate folgt dem normalen Lifecycle;
kein skipWaiting oder clients.claim verdrängt eine bestehende Sitzung.

Offen: Entscheidung zur produktiven Aktivierung und zum Zielorigin, wirklicher
Installations-/Update-/Deinstallationslauf auf freigegebenen Zielgeräten.
Privater Offlinebetrieb benötigt einen separaten Daten-/Berechtigungs-/Löschvertrag
und ist nicht Bestandteil dieses Patches. Fehlende Vorgaben werden nicht durch
Caching oder automatische Wiederaufnahme von Finanzaktionen ersetzt.

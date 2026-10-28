# Lokaler Quellen- und Telemetrievertrag

Rückweg: `88f965b182897044b905704623da6de4c090a8f7` bleibt erhalten. Lokaler
Integrationszweig verbindet dessen Avatar, Shared PublicExperience/Next-Parität
und Anfrage-/Katalog-/Chatfehlerkorrekturen mit vorhandenen Quellen aus
`696c0d2d416e90cfb25625d0d2c7e9e43938e0e0`. Kein fremder Branch wurde verändert.
Der externe Writer bleibt ungeklärt. Kein Push, CI, Upload, Deployment oder DNS.

Kompatibel übernommen: no-session204, begrenzte Server-Sentry-Erfassung,
öffentliche Metadaten/Sicherheitskontakt/robots/sitemap, bestehende CSP und
SPA-Ausnahmen für statische SEO-Dateien. Keine CSP-Aufweichung. Nicht aktiv
übernommen: anonyme Connect-Tokenprobe, zusätzliche Pageviewcalls und guessed
kanonische Domain mit Builddatum als lastmod. Der historische Analyticsadapter
bleibt ohne Aufruf; festes importiertes Sitemap ist keine neue Domainentscheidung.
Historische Evidenz wurde nicht als aktuelle Integration umetikettiert.

Browserpfad: beide Einstiegspunkte verwenden denselben Exceptioncontroller mit
gepinntem posthog-js1.438.24. Das SDK und lokale Exceptionextension werden erst nach
explizitem Einwilligungssignal geladen. Einmalinit; fehlende/abweichende Config,
Host, SHA oder Environment bleibt gesperrt. Browser ohne native Fetch-/Abort-
Unterstützung bleibt gesperrt. Laufzeitbindung siehe `docs/runbooks/sentry.md`.

Alle Eventproperties werden neu aus einer engen Allowlist aufgebaut: neutraler
Fehlertyp/-text, ausschließlich lokale statische Stackpfade ohne Query/Funktions-
name, Release/Environment/Surface, feste nicht personenbezogene technische distinct_id
für alle Ereignisse ohne Besucher-/Geräte-/Session-/Nutzerkennung. Der öffentliche SDK-Ingestiontoken
bleibt erhalten, weil das reale SDK sonst jedes Ereignis vor Versand verwirft.
Keine Requests/Bodies/E-Mails/Referrer/DOMdaten, keine Consolecapture, Profile,
Klick-/Pageviewevents oder Replays. Vorhandener SDK-Debug wird ausdrücklich mit
`debug:false` unterbunden. IP- und Infrastrukturmetadaten eines künftigen echten
Netzwerkverkehrs sind damit nicht als technisch anonym bewiesen.

Reviewbefund: SDK-Retries prüfen Consent nicht erneut; wechselndes fetch_options-
Signal bindet alte Queueeinträge nicht dauerhaft. Deshalb ist nach initialisierter
Erfassung der Widerruf bis Neuladen endgültig, das einzige Signal dauerhaft
abgebrochen, Beacon ausgeschaltet und kein Signalwechsel möglich. Frische
Einwilligung innerhalb desselben Dokuments bleibt blockiert. Kein Queue-Hack,
kein globaler Fetchpatch. Bereits abgeschlossener Versand ist nicht rückholbar.
Bei SDKupgrade sind Request-/Fallback-/Retryvertrag neu zu prüfen.

Private Sourcemaps: lokale opt-in Builds exportieren nach readback-/hashgeprüfter
privater Ablage; öffentliche Ausgabe enthält keine Maps/Mapdirektiven. Konflikt
zwischen Releasevariablen blockiert. Offizielle PostHog-Plugin-/Debug-ID-/Upload-
Bindung mit autorisiertem CI-Secret, serverseitige Ingestion/Deobfuskation und
wirklich ausgelieferte Releasezuordnung bleiben offen. Kein Uploadcode aktiviert.
Quellen: https://posthog.com/docs/error-tracking/installation/react,
https://posthog.com/docs/error-tracking/installation/nextjs,
https://posthog.com/docs/error-tracking/upload-source-maps/vite,
https://posthog.com/docs/error-tracking/upload-source-maps/nextjs.

Lokale tatsächliche SDK-Tests intercepten sämtlichen Verkehr. Synthetischer
Release und humanlike Navigator sind ausdrücklich Fixtures, keine Endnutzer-
oder Produktionsnachweise. Vite/Next: Unhandled Error, Rejection, tatsächliche
Chat-Boundary, Payloadminimierung, Nullverkehr ohne Consent, HTTP503→Widerruf→
unmittelbare erneute Einwilligung→Retry/Unload blockiert und keine SDKpersistenz.
Die nachfolgende lokale Consent-Oberfläche im vorhandenen Footer bindet den
Controller ausdrücklich an eine bewusste Auswahl. Default und Reload bleiben aus;
keine Persistenz. Rechtliche und reale Release-/Ingestionabnahme bleiben offen.

## CI-Installationsdelta 28.10.2026

CI40613522911 am Head4fc8753 wurde durch die unveränderte 24-Stunden-Supply-Chain-Regel vor den Browser-/Buildtests gestoppt. Beide Apps verwenden deshalb den offiziellen npm-Pin posthog-js1.438.24 (veröffentlicht26.10.2026 22:15UTC), mit vorhandenen kompatiblen Core-/Types-Versionen. Keine neue Release-Age-Ausnahme. Ein erfolgreicher Frozen-Install ersetzt nicht die erneuten SDK-/Consent-Browserprüfungen; deren aktuelle Nachweise sind separat gebunden.
# Konfigurationsprüfung optimierter Ausgaben · 28.10.2026

Der Harness erstellt optimierte Ausgaben nun selbst mit minimaler synthetischer
Prozessumgebung. Vorhandene Dotenvdateien werden nur auf Existenz geprüft und
blockieren den Lauf, ohne Inhalte zu lesen. Eingaben und tatsächlich getestete
Buildartefakte werden vor/nach gebunden; Next umfasst Static-, Servercode und
BUILD_ID. Der zur Laufzeit entstehende `server/route-cache` ist separat von diesen
unveränderlichen Buildartefakten ausgeschlossen. Kein stiller Stale-Build-Beleg.

Die Sentry-Option `dsn` ist in den gepinnten installierten Typen gültig;
`tsconfig.api.json` prüfte sie lokal ohne Fehler. Auch ein Versuch mit älterer
Modulauflösung reproduzierte TS2353 hier nicht. Deshalb keine Type-Casts,
Optionslöschung oder Behauptung einer nachgewiesenen Vercel-Ursachenbehebung.
Root-`tsconfig.json` benennt jetzt denselben vorhandenen NodeNext-Vertrag für
Root-Functions. Primärdoku: https://vercel.com/docs/functions/runtimes/node-js
und https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/.
Der tatsächliche Site-Build ruft Root-Lint und API-Typecheck vor Vite auf;
Root-Typecheck umfasst Site/API/Next. Der Linter verwendet den vorhandenen
TypeScriptcompiler für unerreichbaren Code, unbenutzte Labels und Switch-Fallthrough
über alle drei Konfigurationen plus bestehenden Designaudit; kein ESLint-Ersatz
mit behaupteter Stilvollabdeckung. Negative isolierte Quellen müssen fehlschlagen.

`browser-exception-capture.mjs` unterstützt zusätzlich
`NEXIFY_EXCEPTION_BUILD=1`: Der vorhandene Browsertest läuft dann gegen Vites
optimiertes `dist` via Previewserver, nicht gegen den Entwicklungsserver. Next
verwendet weiterhin den echten optimierten Build. Alle Ingestionrequests werden
lokal abgefangen. Reproduktionskonfiguration: ausschließlich synthetischer
Ingestiontoken, Release `1111111111111111111111111111111111111111`, Environment
`test`; keine realen Credentials. Die im Bericht erhaltenen Frames der bewusst
injizierten Fehlerquelle sind lokalisierbar, nicht ein symbolizierter Fehler aus
echtem Kundenverkehr. Dashboard-Issue, Source-Map-Upload und lesbarer produktiver
Stacktrace bleiben unbewiesen. Die Fixture-Release ist keine ausgelieferte Version.

Beide öffentlichen Einstiegspunkte verwenden denselben Controller genau einmal;
Default bleibt aus. Vite liest nur die expliziten öffentlichen `VITE_POSTHOG_*`
Variablen, Next die `NEXT_PUBLIC_POSTHOG_*` Variablen. Commit kommt aus
`VERCEL_GIT_COMMIT_SHA` beziehungsweise lokal `NEXIFY_RELEASE_SHA`, Environment aus
`VERCEL_ENV` beziehungsweise `NEXIFY_APP_ENV`. Fehlende/abweichende Werte blockieren
Erfassung; keine stille Production-/Previewverwechslung durch `NODE_ENV`.
Die alte Sentry-Browserdatei aus fremdem `ae6b884` ist hier nicht aktiv: weder
fehlende `VITE_SENTRY_RELEASE` noch ein hinzugefügtes Browser-DSN dürfen eine zweite
Erfassung erzeugen. Der getrennte Serveradapter benötigt `SENTRY_DSN` und verwendet
`VERCEL_ENV`/`VERCEL_GIT_COMMIT_SHA`; ein bloßes `VITE_SENTRY_DSN` aktiviert ihn nicht.
Keine ENV-Werte gelesen, kopiert oder gesetzt.

Kanonische Root-Vite-Konfiguration bleibt Repo-Root, `@nexify/site build`,
`apps/site/dist`, Node22. Die separate Next-Konfiguration bleibt `@nexify/web`
und `.next`; ihre nativen öffentlichen API-Routen verwenden dieselben begrenzten
Handler. Der anfängliche Verdacht eines überschriebenen Next-API-Routings ist nicht
bestätigt und führte zu keiner Rewriteänderung. Zehn private Routen bleiben von
der öffentlichen Projektion ausgeschlossen; Membership wird nicht aus Login
abgeleitet. Vercel-Autorbindung, reale API-/Tenant-Anbindung und Domainzuordnung
bleiben externe Schritte. Kostenfreigabe abgelaufen: kein Push/CI/Deployment.

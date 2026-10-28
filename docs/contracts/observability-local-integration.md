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
gepinntem posthog-js1.440.0. Das SDK und lokale Exceptionextension werden erst nach
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
Consentmanager-Anbindung fehlt noch; Standardbetrieb sendet daher nichts.

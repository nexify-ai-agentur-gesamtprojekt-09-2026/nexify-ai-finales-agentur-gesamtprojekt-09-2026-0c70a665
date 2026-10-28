# Beobachtbarkeit: lokaler Integrationskandidat

Die Quellen aus `696c0d2d416e90cfb25625d0d2c7e9e43938e0e0` werden lokal mit dem
neueren Frontendstand verbunden. Das ist weder Änderung noch Abnahme des laufenden
Produktionsdeployments. Fremde Writerzuständigkeit bleibt ungeklärt.

Browser: genau ein gemeinsamer PostHog-Exceptioncontroller für Vite/Next. Sentry
wird hier nicht zusätzlich im Browser initialisiert. `captureClientError` und die
Chat-Fehlergrenze verwenden denselben Controller. Kein Session-Replay, keine
Pageviews/Klickerfassung, keine Profile oder Identifikation. Der vorhandene
`analytics.ts`-Adapter bleibt historische, nicht aufgerufene Quelle.

Default ist aus. Ein berechtigter vorhandener Consentmanager kann ausdrücklich
`nexify:exception-consent` mit `detail.granted === true` senden; Widerruf `false`.
Die gemeinsame Consentoberfläche im vorhandenen Footer ist lokal verbunden. Die
Auswahl bleibt nur im Arbeitsspeicher und startet nach Reload wieder aus. Keine
Einwilligung aus Login, Sprache, Umgebungsvariable oder Seitenbesuch ableiten.
Nach initialisierter Erfassung ist Widerruf für dieses Dokument endgültig. Eine
erneute Einwilligung erfordert Neuladen: Das gepinnte SDK hat keinen verifizierten
öffentlichen Queue-Cancel-Vertrag. Ein dauerhaft abortiertes Fetchsignal verhindert
auch alte Retries/Unload; kein Signalwechsel nach Widerruf. Bereits vor Widerruf
übertragene Daten können dadurch nicht zurückgeholt werden.
Zudem sind ein vorhandener öffentlicher Projekt-Ingestiontoken, EU-Ingestionhost,
exakter Commit-SHA und Environment nötig. Ein Ingestiontoken ist kein persönlicher
Upload-/Adminschlüssel; das SDK benötigt ihn auch im redigierten Ereignis.

Next: `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` (bestehender KEY-Alias unterstützt).
Vite: `VITE_POSTHOG_PROJECT_TOKEN` (bestehender KEY-Alias unterstützt).
Host jeweils POSTHOG_HOST mit dem passenden Frameworkpräfix, ausschließlich
`https://eu.i.posthog.com`. Keine Werte auslesen, erzeugen oder kopieren.
Buildrelease: `VERCEL_GIT_COMMIT_SHA`, lokal alternativ `NEXIFY_RELEASE_SHA`;
widersprüchliche Werte brechen den Build ab. Environment aus VERCEL_ENV oder
NEXIFY_APP_ENV. Standalone/fehlende Konfiguration bleibt ohne Erfassung.

Server: bestehendes `packages/observability/sentry-server.ts` verwendet vorhandene
SENTRY_DSN nur für ausdrücklich gefangene unerwartete API-Fehler. Automatische
Integrationen/Tracing sind aus; `beforeSend` ersetzt Rohfehler durch einen neutralen
Fehlerdatensatz ohne Request/User/Breadcrumbs. Das ist kein getesteter Versandweg.
`scripts/sentry-health.sh` bleibt ein manuell auszuführendes historisches Hilfsmittel,
kein neu aktivierter Dienst und kein Beleg tatsächlicher Projektzuordnung. Der
Wrapper ruft `scripts/sentry_health.py` auf. Dieser liest pro festem Projekt nur
eine Seite mit höchstens einem Issue (maximal 64 KiB, Socket-Timeout 15 Sekunden,
keine Wiederholungen, Redirects oder Link-Verfolgung). Keine Rohdaten werden
ausgegeben oder gespeichert. Das bestehende Token wird nur im Requestheader
verwendet; keine neuen Credentials oder Projektzuordnungen.

Die JSONL-Ausgabe meldet immer `complete:false`, `total:null` und bei gültiger
Antwort `status:partial` sowie `unresolved_lower_bound:0` oder `1`. Null Issues in
der Stichprobe sind **kein Nachweis für Fehlerfreiheit**. Fehlende/fremde
Projekt-Slugs, fehlende Issue-ID, falscher Status, fehlerhafte/gekürzte/übergroße
Antworten oder Transportfehler ergeben `unavailable` mit unbekannter Untergrenze
und Exit 1. Exit 0 bedeutet nur: beide Stichproben konnten geprüft werden.

`source`, `requested_project`, `observed_at` und die angefragten Parameter bleiben
sichtbar. `statsPeriod=24h` wählt bei diesem Projekt-Issues-Endpoint nur die
Timeline-Statistik, nicht eine Suche ausschließlich nach Issues der letzten
24 Stunden. Deshalb entfällt die irreführende Kennzahl `unresolved_24h`.
Primärquelle: [Sentry: List a Project's Issues](https://docs.sentry.io/api/events/list-a-projects-issues/),
gelesen 28.10.2026. Der Endpoint ist dort als deprecated dokumentiert; eine
Umstellung auf Organization-Issues benötigt separat bestätigte Projektbindung.
Projekt-Slug im Body wird geprüft, Organisation stammt aus dem angefragten Pfad;
leere Antworten haben nur Requestbindung. Keine autoritative Organisation-,
Release-, Domain- oder Browserfunktionsabnahme aus diesem Sample ableiten.
Synthetische Health-Events und echte Browserexceptions werden hier nicht
klassifiziert; beide Nachweise bleiben ausdrücklich `not_evaluated`.

Offline-Regression: `python3 -m unittest discover -s tests -p test_sentry_health.py -v`.
Die Fixtures erzeugen weder echte Events noch API-Aufrufe. Bestehende externe
Parser müssten bei geplanter Runtimeübernahme auf das neue explizite JSONL-Schema
umgestellt werden; im kanonischen Repository ist kein automatischer Verbraucher
des alten `unresolved_24h`-Textformats vorhanden. Keine Serverumstellung erfolgt.

Prüfung: `node --test apps/site/tests/exception-privacy.test.mjs` und
`private-sourcemaps.test.mjs`; Browserregression
`apps/site/tests/browser-exception-capture.mjs` nutzt das tatsächliche gepinnte SDK
und lokale Vite- beziehungsweise Next-Ausgabe. Sämtliche Ingestionrequests werden
abgefangen; menschlicher Navigator wird nur in der eindeutig synthetischen Fixture
simuliert, da das SDK Bots verwirft. Keine externen Testevents oder Liveabnahme.

Private Maps: `NEXIFY_PRIVATE_SOURCE_MAPS=1` bei exaktem SHA; Vite hidden und Next
productionBrowserSourceMaps erzeugen lokal Maps. Buildhooks übertragen sie mit
Hash/Readback nach `.local/private-source-maps/<surface>/<sha>/` und entfernen
Maps sowie sourceMappingURL aus der öffentlichen Ausgabe. Kein Upload. Der
PostHog-Upload mit offiziellen Plugins/persönlichem autorisiertem CI-Schlüssel und
Debug-ID-/Releasezuordnung bleibt ein separater offener Schritt; lokale Maps allein
beweisen keine Deobfuskation. `NEXIFY_SOURCE_MAP_UPLOAD` bricht hier immer ab.

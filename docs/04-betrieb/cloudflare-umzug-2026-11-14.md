# Umzug von Vercel auf Cloudflare · Machbarkeit, Messwerte, Plan · 14.11.2026

Auftrag des Inhabers (14.11.2026): „Wenn möglich, lass uns den Umzug auf Cloudflare
durchführen, statt Vercel. Dort sind wir kostenfrei, und wir haben dort die Domains und
andere Dinge."

**Status: vorbereitet und lokal gemessen. Nicht umgeschaltet.** Kein DNS-Eintrag, keine
Domain-Zuweisung, kein Cloudflare-Objekt und kein Vercel-Objekt wurde geändert; nichts
wurde gekauft oder gebucht. Auf Cloudflare wurde nichts ausgeliefert, weil `wrangler`
in der Arbeitsumgebung nicht angemeldet ist.

Alle Messungen: 14.11.2026, Zweig `claude/cloudflare-umzug` auf `main` `31ccd6c`,
Node 22.23.4, pnpm 12.15.0, `@opennextjs/cloudflare` 1.20.17, `wrangler` 4.161.0,
`workerd` 1.20261110.1, Rechner mit 4 Kernen (Intel Xeon 2,1 GHz).

## 1. Ergebnis in drei Sätzen

1. **Der Umzug von `apps/web` geht.** Der Bau läuft durch, alle geprüften Seiten und
   Routen antworten in der Workers-Laufzeit lokal wie erwartet, kein Medium ist zu groß.
2. **Kostenfrei ist er im heutigen Zuschnitt sehr wahrscheinlich nicht.** Jede Seite wird
   bei jedem Abruf auf dem Server gerendert und brauchte lokal 46 bis 56 ms Rechenzeit;
   der kostenlose Workers-Tarif erlaubt 10 ms je Anfrage. Kostenfrei wird es nur, wenn
   die öffentlichen Seiten als fertige Dateien ausgeliefert werden (Umbau, Abschnitt 6)
   oder wenn die Messung auf echter Cloudflare-Infrastruktur wider Erwarten unter
   10 ms bleibt. Sonst kostet es den bezahlten Workers-Tarif (Mindestbetrag 5 USD je
   Monat und Konto).
3. **Die Shop-API (`apps/shop-api`, Python) zieht nicht mit auf Workers um.** Sie bleibt
   vorerst, wo sie ist, und wird vom Worker weitergereicht; ihr endgültiger Ort ist eine
   eigene Entscheidung (Abschnitt 7).

## 2. Grenzwerte von Cloudflare (Quelle, Abrufdatum 14.11.2026)

| Grenze | Workers Free | Workers Paid | Quelle |
|---|---|---|---|
| Größe des Workers | 64 MiB unkomprimiert | 64 MiB | [1] „There is no compressed size limit. Only the uncompressed bundle size counts." |
| Rechenzeit (CPU) je HTTP-Anfrage | **10 ms** | 5 min (Standard 30 s) | [1] |
| Anfragen | **100 000 je Tag**, Rücksetzung 00:00 UTC, danach Fehler 1027 | keine Grenze | [1] |
| Unteranfragen je Anfrage | 50 | 10 000 | [1] |
| Speicher je Isolat | 128 MB | 128 MB | [1] |
| Startzeit | 1 s | 1 s | [1] |
| Statische Dateien je Worker-Version | 20 000 | 100 000 | [1] |
| Größe je statischer Datei | 25 MiB | 25 MiB | [1] |
| Dauer einer HTTP-Antwort (Wanduhr) | keine feste Grenze, solange der Client verbunden ist | ebenso | [1] |
| Abrufe statischer Dateien | „free and unlimited" | ebenso | [2] |
| Preis | 0 | mindestens 5 USD je Monat; enthalten 10 Mio. Anfragen und 30 Mio. CPU-ms je Monat, danach 0,02 USD je weitere Mio. CPU-ms | [3] |
| Überschreitung der Rechenzeit | Fehler 1102 „Worker exceeded resource limits" | ebenso | [1] |
| R2 kostenlos | 10 GB-Monat Speicher, 1 Mio. Klasse-A- und 10 Mio. Klasse-B-Vorgänge je Monat, Ausgang frei | – | [4] |
| Container | nicht verfügbar | im bezahlten Tarif enthalten (Kontingente) | [5] |
| Tunnel | „Available on all plans" | ebenso | [6] |

- [1] https://developers.cloudflare.com/workers/platform/limits/
- [2] https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ (Stand der Seite 12.11.2026)
- [3] https://developers.cloudflare.com/workers/platform/pricing/
- [4] https://developers.cloudflare.com/r2/pricing/
- [5] https://developers.cloudflare.com/containers/pricing/
- [6] https://developers.cloudflare.com/tunnel/
- [7] https://opennext.js.org/cloudflare
- [8] https://developers.cloudflare.com/workers/languages/python/ mit `/packages/` und `/stdlib/`

Widerspruch in den Quellen: Die Seite des Adapters [7] nennt noch 3 MiB (Free) und
10 MiB (Paid) komprimiert. Maßgeblich ist die Plattformseite [1]. Das Paket liegt unter
beiden Grenzen (Abschnitt 3). `docs/deployment/cloudflare-workers.md` vom 13.11.2026
rechnete mit 3 MiB; die Aussage dort ist insoweit überholt.

Nicht aus der Dokumentation ablesbar: ob R2 ohne hinterlegtes Zahlungsmittel
einschaltbar ist, und wie streng die 10 ms im kostenlosen Tarif bei einzelnen
Überschreitungen durchgesetzt werden.

## 3. Messwerte gegen die Grenzen

### Bau

`node apps/site/scripts/generate-public-data.mjs`, dann
`NEXIFY_PUBLIC_INSTALLATION=public-pwa node apps/web/scripts/generate-public-data.mjs`,
dann `opennextjs-cloudflare build` in `apps/web`: **Exit 0**, 34 s. 34 Routen werden je
Anfrage gerendert (ƒ), 6 sind statisch (○). Der Adapter warnt: „Node.js middleware
support is experimental in cloudflare, and not officially maintained by OpenNext
maintainers" (betrifft `apps/web/proxy.ts`).

Befund am Rand: `pnpm install --frozen-lockfile` endet in diesem Stand mit Exit 1
(`ERR_PNPM_IGNORED_BUILDS: esbuild@0.28.2, workerd@1.20261110.1`), auch mit
`--ignore-scripts`. Die Pakete sind danach vollständig vorhanden, Bau und Laufzeit
funktionieren. Für einen automatischen Bau bei Cloudflare muss das behoben sein
(Eintrag beider Pakete unter `allowBuilds` in `pnpm-workspace.yaml`). Nicht geändert,
weil die Datei durch Browser-Belege gebunden ist (`nexify-belege-und-pins`).

### Größe (`wrangler deploy --dry-run`, mit dem neuen Einstieg `cloudflare/worker.mjs`)

| Messgröße | Wert | Grenze Free | Auslastung |
|---|---|---|---|
| Worker unkomprimiert | 11 213,62 KiB (10,95 MiB) | 64 MiB | 17 % |
| Worker gzip (nur zur Einordnung) | 2 528,96 KiB (2,47 MiB) | keine; alt 3 MiB | 82 % der alten Grenze |
| Statische Dateien | 231 Dateien, 113 MB | 20 000 Dateien | 1,2 % |
| Größte statische Datei | 13,44 MiB (`media/home-review/welcome-review.mp4`) | 25 MiB | 54 % |
| Dateien über 25 MiB | 0 | – | – |

### Rechenzeit je Anfrage (lokal, `wrangler dev`, Workers-Laufzeit `workerd`)

Verfahren: je Weg 5 Abrufe zum Aufwärmen, dann 20 Abrufe nacheinander; Rechenzeit aus
dem CPU-Profil der Laufzeit (Inspector, Abtastung 100 µs, Leerlauf abgezogen), geteilt
durch 20. Wanduhr ohne Profil mit `curl`: 41 bis 60 ms je Seite.

| Weg | Status | Antwort | Rechenzeit je Anfrage | Wanduhr Median | gegen 10 ms |
|---|---|---|---|---|---|
| `/` | 200 | 379 KB | 55,6 ms | 60,4 ms | 5,6-fach |
| `/leistungen` | 200 | 386 KB | 53,2 ms | 56,8 ms | 5,3-fach |
| `/kontakt` | 200 | 367 KB | 52,4 ms | 62,6 ms | 5,2-fach |
| `/teileklar` | 200 | 340 KB | 48,5 ms | 53,0 ms | 4,9-fach |
| `/anmelden` | 200 | 357 KB | 46,3 ms | 49,4 ms | 4,6-fach |
| `POST /api/chat` mit ungültigem JSON | 400 | 24 B | 8,8 ms | 10,2 ms | 0,9-fach |

**Belastbarkeit:** Das ist keine Messung auf Cloudflare. Der lokale Rechner ist nicht
die Hardware von Cloudflare, das Profil selbst kostet Zeit, und lokal wird keine Grenze
durchgesetzt. Belastbar ist die Größenordnung: Die Seiten liegen um das Fünffache über
der Grenze, nicht knapp darüber. Die Chat-Route liegt schon mit einer abgelehnten
Anfrage an der Grenze; ein echter Chat (Modellaufruf, Stream, Ablage) wurde nicht
gemessen und braucht mehr. Die endgültige Zahl liefert nur die Vorschau auf
`workers.dev` (Spalte „CPU Time" in den Worker-Protokollen).

### Anfragen je Tag

Im kostenlosen Tarif zählt jeder Seitenabruf und jeder API-Aufruf als eine Anfrage an
den Worker, Abrufe von Bildern, Filmen, Schriften, CSS und JavaScript nicht [2].
100 000 je Tag reichen für die heutige Besucherzahl mit Abstand; Zahlen zum heutigen
Verkehr wurden nicht erhoben.

### Verhalten in der Workers-Laufzeit (lokal)

| Weg | Ergebnis |
|---|---|
| `/`, `/leistungen`, `/kontakt`, `/teileklar`, `/anmelden`, `/?lang=nl` | 200 |
| `/login` | 308 nach `/anmelden` |
| `/sitemap.xml`, `/robots.txt`, `/media/runway/hero.mp4` (5,7 MB) | 200 |
| `/api/internal/workspace/status` ohne Anmeldung | 401 |
| `POST /api/chat`, ungültiges JSON, Platzhalter für `ROUTER_URL`/`ROUTER_KEY` | 400 `invalid_json`, kein Modellaufruf |
| `POST /api/chat` ohne Router-Variablen | 503 `chat_llm_not_configured` |
| `/api/health`, `/api/shop/products` ohne `SHOP_API_ORIGIN` | 503 `shop_api_origin_not_configured` |
| `/api/health` mit `SHOP_API_ORIGIN=https://nexifyai.de` (ein lesender Abruf) | 503 mit der Antwort der Shop-API (`database_binding_missing_or_unsuitable`), also korrekt durchgereicht |
| Kopfzeilen | `Content-Security-Policy` (aus `vercel.json`), `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |

### Abnahmewerkzeuge gegen die lokale Workers-Laufzeit

| Werkzeug | lokal (`wrangler dev`) | Produktion `https://nexifyai.de` (Vergleich, gleicher Tag) |
|---|---|---|
| `node tools/live-check.mjs` | 329 Prüfungen, 6 Befunde, Exit 1 | 329 Prüfungen, 6 Befunde, Exit 1 |
| `node tools/gleichmacher.mjs` | 44 Seiten, 14 034 Vergleiche; drei Läufe mit 8, 4, 4 Abweichungen, Exit 1 | 44 Seiten, 14 048 Vergleiche, 0 Abweichungen, Exit 0 |

- `live-check`: dieselben sechs Befunde wie in Produktion (viermal „Kopfleiste Abstand",
  zweimal Shop-Dienst 503). Der Umzug fügt keinen hinzu.
- `gleichmacher`: **nicht bestanden, Ursache offen.** Die Abweichungen betreffen je Lauf
  eine andere Seite (`/produkte/one` und `/impressum`, dann `/anmelden`, dann
  `/produkte/nex-agentic-aifly`), immer die Innenabstände der Kopfleiste bei 1440 px mit
  krummen Werten (11,43 bis 11,92 px statt 12 px). Derselbe Bau unter `next start` ergab
  in zwei Läufen 0 Abweichungen. Das Bild passt zu einer Messung während eines
  laufenden Übergangs, weil die lokale Workers-Laufzeit langsamer antwortet; belegt ist
  das nicht. Vor der Abnahme auf `workers.dev` wiederholen; bleibt es dort bei
  Abweichungen, ist die Ursache zu klären, bevor umgeschaltet wird.

## 4. Was im Zweig vorbereitet ist

| Datei | Zweck |
|---|---|
| `apps/web/cloudflare/worker.mjs` | Einstieg des Workers um den OpenNext-Worker: setzt die Content-Security-Policy und reicht die Wege der Shop-API weiter. Beides leistet auf Vercel die `vercel.json` an der Wurzel und fehlte bisher auf Cloudflare. |
| `apps/web/cloudflare/edge.mjs`, `edge.test.mjs` | Die Logik dazu als reine Funktionen mit drei Tests (`node --test apps/web/cloudflare/edge.test.mjs`). Die Liste der Shop-Wege wird gegen die `rewrites` der `vercel.json` geprüft. |
| `apps/web/wrangler.jsonc` | `main` auf den neuen Einstieg, `workers_dev` und `preview_urls` an, keine Route, keine eigene Domain, keine Variablenwerte, `keep_vars`. |
| `apps/web/.dev.vars.example` | Namen der Variablen ohne Werte; Muster für die lokale `.dev.vars`. |
| `.gitignore` | `apps/web/.dev.vars` wird nie versioniert. |
| dieses Dokument | Messwerte, Plan, Rückweg. |

Unverändert: `apps/web/next.config.ts`, `apps/web/package.json`, `vercel.json`,
`apps/shop-api`, alle Vercel-Einstellungen. Die Auslieferung über Vercel ist von
diesem Zweig nicht berührt (`cloudflare/` wird von `next build` nicht gelesen).

## 5. Was an Vercel hängt (aus dem Code) und wodurch es ersetzt wird

| Stelle | Bindung an Vercel | Auf Cloudflare |
|---|---|---|
| `vercel.json` `services` | Zwei Dienste in einem Projekt: `frontend` (`apps/web`) und `shop` (`apps/shop-api`, FastAPI, `vercel_app:app`, 30 s, `fra1`) | Worker nur für `apps/web`; Shop-API getrennt (Abschnitt 7) |
| `vercel.json` `rewrites` | 9 Wege (`/api/shop`, `/api/auth`, `/api/admin`, `/api/workshops`, `/api/requests`, `/api/health`, `/api/openapi.json`, `/api/docs`) gehen an den Dienst `shop` | `cloudflare/worker.mjs` reicht sie an `SHOP_API_ORIGIN` weiter; ohne Ziel 503 |
| `vercel.json` `headers` | Einzige Quelle der Content-Security-Policy | `cloudflare/worker.mjs` liest sie aus derselben Datei. Fällt `vercel.json` später weg, zieht die Richtlinie in eine eigene Datei um. Sie gilt für Antworten des Workers, nicht für direkt ausgelieferte statische Dateien. |
| `vercel.json` `functions` | `maxDuration` und Region `fra1` für `api/agent-chat`, `api/agent-runtime-status` | Keine Regionsbindung auf Workers; HTTP-Dauer unbegrenzt, Rechenzeit begrenzt |
| `apps/shop-api/vercel_app.py` | Bindungsprüfung: `VERCEL_PROJECT_ID` muss in `SHOP_ALLOWED_PROJECT_IDS` stehen, sonst 503 `project_binding_unverified` | Außerhalb von Vercel gibt es `VERCEL_PROJECT_ID` nicht. Die Prüfung braucht eine plattformneutrale Kennung. Schutzmechanismus, nur mit Freigabe des Inhabers (D-017). |
| `apps/web/next.config.ts` | `NEXT_PUBLIC_APP_ENV` aus `VERCEL_ENV` | Ersatz vorhanden: `NEXIFY_APP_ENV` beim Bau setzen |
| `apps/web/scripts/generate-public-data.mjs` | Stempel des Service Workers aus `VERCEL_GIT_COMMIT_SHA` | Ersatz vorhanden: `NEXIFY_WORKER_RELEASE` beim Bau setzen, sonst Zeitstempel |
| `tools/observability/private-sourcemaps.mjs`, `packages/observability/sentry-server.ts` | Release aus `VERCEL_GIT_COMMIT_SHA`, Umgebung aus `VERCEL_ENV` | `NEXIFY_RELEASE_SHA` beim Bau; Sentry-Umgebung fällt auf `NODE_ENV` zurück, Release bliebe leer (kleine Anpassung nötig, wenn Sentry genutzt wird) |
| `apps/web/app/api/chat/route.ts` | `VERCEL_ENV` nur im Protokoll (`deployment`) | Protokolliert `unset`; keine Funktion betroffen |
| `apps/web/auth/policy.ts`, `auth/public-provider.ts` | Clerk-Umgebung aus `VERCEL`, `VERCEL_ENV`, `VERCEL_TARGET_ENV`, `VERCEL_PROJECT_PRODUCTION_URL` | Clerk ist abgelöst (D-007); ohne Vercel-Variablen gilt der Zweig „eigenständige Produktion" |
| `apps/web/frame-headers.mjs` | `ALLOW_EMERGENT_PREVIEW_FRAME=1` wirkt nur außerhalb von Vercel | Auf Cloudflare würde der Schalter wirken: Variable dort nicht setzen |
| `packages/agent-runtime/preview-access.ts` | Vorschauzugang an `VERCEL_ENV`, `VERCEL_PROJECT_ID`, `VERCEL_GIT_COMMIT_REF` gebunden | Bleibt auf Cloudflare geschlossen (Ablehnung), kein Risiko, aber auch keine Funktion |
| `package.json` (Wurzel) | `@vercel/connect` 2.5.6, `ai` 7.0.153 | Kein Import in `apps/web/app` oder `lib` gefunden, der Vercel-Dienste zur Laufzeit voraussetzt; im Chat nicht verwendet (`lib/chat-llm.ts`: „nur fetch") |
| Bildoptimierung | `images: { unoptimized: true }` | nichts zu ersetzen |
| Cron | keiner in `vercel.json` | nichts zu ersetzen |
| Middleware | `proxy.ts` (Sprache, Zugriffsschutz) als Node-Middleware | läuft, laut Adapter „experimental" (seit 1.20.3) |
| `export const maxDuration = 60` (Chat) | Vercel-Funktionsdauer | auf Workers ohne Wirkung; Stream läuft, solange der Client verbunden ist |
| Variablen im Vercel-Projekt | `ROUTER_URL`, `ROUTER_KEY`, `COMPOSIO_*`, `BIGBUY_*`, `NEXIFY_COMPOSIO_WEBHOOK`, `SHOP_ALLOWED_PROJECT_IDS`, `NEXIFY_PUBLIC_INSTALLATION` | Für den Worker: Namen in `.dev.vars.example`, je `wrangler secret put`. `BIGBUY_*` und `SHOP_ALLOWED_PROJECT_IDS` gehören zur Shop-API, `NEXIFY_PUBLIC_INSTALLATION` zum Bau. Werte wurden nicht gelesen. |
| Auslieferung aus Git | Vercel baut `main` selbst | Workers Builds (Git-Verbindung im Dashboard) oder `wrangler deploy` von Hand. GitHub Actions startet kontoweit keine Jobs (`PROGRESS.md`). |
| Domains | `nexifyai.de`, `nexifyai.cloud`, je mit `www`, hängen am Vercel-Projekt `prj_lKQEWQKzjqq4Ifvmwy6dh1XCIgVR` | Eigene Domain am Worker, erst nach Abnahme |

## 6. Kostenaussage

| Weg | Kosten | Bedingung |
|---|---|---|
| A · Workers Free, Seiten wie heute (Rendern je Abruf) | 0 | Nur wenn die Rechenzeit auf Cloudflare unter 10 ms liegt. Lokal gemessen: 46 bis 56 ms. **Nicht zu erwarten.** Folge bei Überschreitung: Besucher sehen Fehler 1102. |
| B · Workers Free, öffentliche Seiten als fertige Dateien | 0 | Umbau in `apps/web`: Die Seiten dürfen beim Rendern weder Kopfzeilen noch Cookies lesen. Heute lesen `app/layout.tsx` das Farbschema (`nx-theme`), den Chat-Zustand (`nx-chat-open`) und die Sprache (`x-nexify-locale` aus `proxy.ts`, gesteuert über `?lang=`). Nötig wären feste Sprachpfade statt `?lang=` und das Setzen von Schema und Chat-Zustand im Browser. Danach liefert Cloudflare die Seiten als statische Dateien, „free and unlimited" [2]; der Worker bleibt nur für Chat, Angebote, Webhook. Der Chat muss dann je Anfrage unter 10 ms Rechenzeit bleiben (nicht gemessen). Eigener Auftrag, berührt die Startseite als Referenz (D-012). |
| C · Workers Paid | mindestens 5 USD je Monat und Konto [3] | Enthalten: 10 Mio. Anfragen und 30 Mio. CPU-ms je Monat. Bei 50 ms je Seite sind das rund 600 000 gerenderte Seiten je Monat ohne Aufpreis. Kaufentscheidung des Inhabers. Erlaubt auch Container. |
| R2 | 0 | Nicht nötig: keine Datei über 25 MiB, 113 MB gesamt. Erst nötig für einzelne Dateien über 25 MiB; dann 10 GB frei [4]. Vorhandener Bucket `nexify-agentur-pucket` (15.10.2026), Inhalt nicht geprüft. |
| Shop-API auf eigenem Server hinter Tunnel | 0 bei Cloudflare [6] | Server ist bezahlt vorhanden; Betrieb und Freigabe nach D-016 |
| Vercel während der Übergangszeit | wie heute | Projekt bleibt bis zur Abnahme bestehen (Rückweg) |

Die Aussage „dort sind wir kostenfrei" gilt für DNS, die Domains, statische Dateien und
R2 im Freikontingent. Für das Rendern der Seiten gilt sie im heutigen Zuschnitt
voraussichtlich nicht.

## 7. Shop-API (`apps/shop-api`, FastAPI, MongoDB)

IST: Auf Vercel als zweiter Dienst desselben Projekts, antwortet in Produktion mit 503
(`database_binding_missing_or_unsuitable`, gemessen 14.11.2026). Zielbild der
Datenhaltung ist nach D-013 die eigene Supabase-Instanz; MongoDB ist als Ziel überholt.

| Option | Befund | Urteil |
|---|---|---|
| Python Workers | Laufzeit ist Pyodide (CPython in WebAssembly). Unterstützt werden reine Python-Pakete und Pakete mit PyEmscripten-Rädern; „WebAssembly support for Python packages is still in early stages" [8]. `threading` und `multiprocessing` sind importierbar, aber ohne Funktion [8]. Die Shop-API braucht `pymongo` (eigene Überwachungs-Threads, eigene TLS-Verbindungen) und `bcrypt` (nativer Code). Zusätzlich gilt auch hier 10 ms Rechenzeit im kostenlosen Tarif. Reifegrad „Beta/GA" nennt die Seite nicht. | Nicht tragfähig ohne Neubau |
| Cloudflare Containers | Nur im bezahlten Tarif [5] | Nur mit Weg C |
| Auf Vercel belassen, Worker reicht weiter | Funktioniert mit `SHOP_API_ORIGIN` (lokal belegt). Vercel bleibt dann aber bestehen. | Für die Übergangszeit |
| Eigener Hostinger-Server hinter Cloudflare Tunnel | Tunnel in allen Tarifen verfügbar [6], kein offener Eingangsport nötig. Der Dienst startet dort mit `uvicorn`; Bindungsprüfung über `VERCEL_PROJECT_ID` muss ersetzt werden. | **Empfehlung**, zusammen mit dem Wechsel auf Supabase (D-013) |

Empfehlung: jetzt nichts umbauen. In der Übergangszeit zeigt `SHOP_API_ORIGIN` auf die
Vercel-Adresse des Projekts. Der endgültige Ort ist der eigene Server hinter einem
Tunnel, und zwar erst, wenn die Shop-API ohnehin auf Supabase umgestellt wird; eine
Portierung des MongoDB-Stands wäre Arbeit an einem überholten Ziel. Erst danach kann
das Vercel-Projekt ganz entfallen.

## 8. Cloudflare-Konto (nur gelesen, 14.11.2026)

- Worker (5): `nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665` (angelegt
  15.10.2026, geändert 26.10.2026), `icy-limit-ce60`, `withered-heart-dd99` (beide
  15.10.2026), `nexifyai-login-redirect` (08.07.2026), `cloudflare-relay` (Juni 2026).
  Einen Worker `nexify-web` gibt es noch nicht. Inhalt und Routen der vorhandenen Worker
  wurden nicht gelesen.
- R2: `nexify-agentur-pucket`. KV: `nexify-cache`. D1: `nexify-main` (0 Tabellen).
- Zonen: Die Namensserver von `nexifyai.de` und `nexifyai.cloud` sind
  `brynne.ns.cloudflare.com` und `carmelo.ns.cloudflare.com` (öffentliche DNS-Abfrage).
  Beide Zonen liegen also bei Cloudflare. Ob im selben Konto wie die Worker oben, ist mit
  den vorhandenen Lesewerkzeugen nicht ablesbar (kein Zonen-Werkzeug). Die Einträge
  zeigen auf Vercel (`216.150.x.x`, `www` als CNAME auf `vercel-dns`).
- `npx wrangler whoami`: „You are not authenticated." Es wurde nicht versucht,
  Zugangsdaten zu beschaffen.
- Der verwendete MCP-Zugang „Workers Bindings" ist laut Anbieter abgekündigt
  (Nachfolger `https://mcp.cloudflare.com/mcp`).

## 9. Umzugsplan

Voraussetzungen durch den Inhaber: Anmeldung von `wrangler` (oder ein API-Token mit
Recht „Workers Scripts: Edit" für dieses Konto, als Geheimnis der Umgebung, nicht im
Repository); Entscheidung über den Kostenweg (Abschnitt 6); Eintrag der neuen
Führungsentscheidung, denn `AGENTS.md` (13.11.2026) sagt noch „ausgeliefert wird
ausschließlich über Vercel" und „Cloudflare wird als Hosting nicht verfolgt".

1. **Vorschau ausliefern.** In `apps/web`: `pnpm cf:build`, dann `npx wrangler deploy`.
   Ergebnis ist `https://nexify-web.<konto>.workers.dev`, ohne Domain, ohne Route. Im
   kostenlosen Tarif kostet das nichts.
2. **Variablen setzen** (nur Namen aus `.dev.vars.example`; Werte gibt der Inhaber ein):
   `npx wrangler secret put ROUTER_URL` und so weiter. `SHOP_API_ORIGIN` und
   `SHOP_API_BASE_URL` auf die Vercel-Adresse des Projekts.
3. **Rechenzeit messen.** Die Wege aus Abschnitt 3 je 20-mal abrufen und in den
   Worker-Protokollen „CPU Time" ablesen; auf Fehler 1102 achten. Ergebnis entscheidet
   zwischen Weg A, B und C. Bei B oder C hier anhalten und entscheiden.
4. **Abnahme auf der Vorschau.** `node tools/live-check.mjs https://nexify-web.<konto>.workers.dev`
   und `node tools/gleichmacher.mjs https://nexify-web.<konto>.workers.dev`. Maßstab:
   `live-check` nicht schlechter als Produktion am selben Tag, `gleichmacher` 0
   Abweichungen. Dazu von Hand: Sprachen (`?lang=nl|fr|en`), Zugriffsschutz
   (`/intern`, `/api/internal/...` → 401), Chat mit echtem Modell einschließlich Stream
   und Angebot, Bestell-Mail, Composio-Webhook, Filme (Abspielen, Vorspulen), Installation
   der PWA, Sichtprüfung auf einem Telefon.
5. **Shop-Wege prüfen.** `/api/health` und `/api/shop/status` liefern auf der Vorschau
   dieselbe Antwort wie auf Vercel.
6. **Umschalten** (eigene Freigabe des Inhabers, nicht Teil dieses Zweigs). Zuerst eine
   Testadresse, zum Beispiel `cf.nexifyai.cloud`, als eigene Domain des Workers; Abnahme
   dort wiederholen. Danach je Domain: im Vercel-Projekt nichts löschen; in der
   Cloudflare-Zone die Einträge für Wurzel und `www` durch die eigene Domain des Workers
   ersetzen. Vorher die heutigen Einträge notieren (Wurzel `nexifyai.de`: A
   `216.150.16.129`, `216.150.1.129`; `www.nexifyai.de`: CNAME
   `6deb9ec02c598d1f.vercel-dns-016.com`; Wurzel `nexifyai.cloud`: A `216.150.1.193`,
   `216.150.16.193`; `www.nexifyai.cloud`: CNAME `cname.vercel-dns.com`; TTL je 300 s).
   Erst `nexifyai.cloud`, nach einem Tag ohne Befund `nexifyai.de`.
7. **Nach dem Umschalten.** `live-check` und `gleichmacher` gegen die echte Adresse;
   Worker-Protokolle auf 1102 und 1027 beobachten; `AGENTS.md`, `PROGRESS.md`,
   `DECISIONS.md` und `docs/deployment/environment-variables.md` nachführen
   (`nexify-stand-halten`).
8. **Vercel abbauen** erst, wenn die Shop-API einen anderen Ort hat (Abschnitt 7) und
   der Inhaber die Abnahme erklärt hat.

### Rückweg

Bis einschließlich Schritt 5 gibt es nichts zurückzunehmen: Die Vorschau ist eine
zusätzliche Adresse, Produktion bleibt Vercel. Nach Schritt 6: die eigene Domain vom
Worker lösen und die notierten Einträge wieder eintragen. Die TTL der heutigen Einträge
ist 300 s; die Domains bleiben während der ganzen Zeit dem Vercel-Projekt zugewiesen,
das Projekt und seine letzte Auslieferung bleiben bestehen, deshalb antwortet Vercel
sofort wieder. Der Rückweg ist einmal an der Testadresse zu üben, bevor eine echte
Domain umgestellt wird. Der Worker kann danach bestehen bleiben oder mit
`npx wrangler delete` entfernt werden.

## 10. Offene Entscheidungen des Inhabers

1. Kostenweg: A prüfen lassen (Messung auf der Vorschau), B beauftragen (Umbau auf
   fertige Seiten) oder C buchen (5 USD je Monat).
2. Anmeldung von `wrangler` oder API-Token für dieses Konto.
3. Ort der Shop-API (Empfehlung Abschnitt 7) und Ersatz der Bindung an
   `VERCEL_PROJECT_ID`.
4. Neue Führungsentscheidung in `AGENTS.md` und `DECISIONS.md`: Die Entscheidung vom
   13.11.2026 legt Vercel fest; D-011 bis D-020 legen kein Hosting fest.
5. Aufräumen der vier älteren Worker im Konto (nicht Teil dieses Auftrags).

## 11. Risiken

- Rechenzeit: im kostenlosen Tarif Fehlerseiten für Besucher statt langsamer Seiten.
- `proxy.ts` als Node-Middleware ist im Adapter „experimental"; sie trägt den
  Zugriffsschutz der Seiten. Nach jedem Update des Adapters erneut prüfen.
- Der Chat streamt; Rechenzeit eines echten Gesprächs auf Workers ist nicht gemessen.
- Die Content-Security-Policy gilt auf Cloudflare nur für Antworten des Workers.
  Statische Dateien (auch `X-Content-Type-Options`) kommen ohne diese Kopfzeilen, bis
  eine `_headers`-Datei oder eine Regel in der Zone sie ergänzt.
- Keine Regionsbindung: Auf Vercel laufen zwei Funktionen in `fra1`. Auf Workers läuft
  der Code am Standort des Besuchers; Aufrufe zur eigenen Supabase-Instanz können länger
  dauern.
- `gleichmacher` lokal nicht bestanden (Abschnitt 3), Ursache offen.
- Zwei Auslieferungswege gleichzeitig: Bis zum Abbau von Vercel muss jede Änderung an
  Kopfzeilen und Weiterleitungen in `vercel.json` gepflegt werden; der Worker liest sie
  von dort, die Liste der Shop-Wege prüft `edge.test.mjs`.

## 12. Nicht geprüft

Verhalten und Rechenzeit auf echter Cloudflare-Infrastruktur; Chat mit echtem Modell;
Angebot, Bestellung, Mail, Composio-Webhook; Sentry und PostHog in der Workers-Laufzeit;
Sichtprüfung im Browser und auf Geräten; Lastverhalten; Workers Builds aus Git; ob die
Zonen im selben Konto liegen; Inhalt des R2-Buckets; Besucherzahlen gegen 100 000
Anfragen je Tag.

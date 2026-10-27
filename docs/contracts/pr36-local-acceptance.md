# PR36: begrenzte lokale Abnahme · 27.10.2026

Basis: 66866298b3eb4054371b0e2a1e1f618f1bc8ca73. GitHub lesend abgeglichen:
PR36 offen, kein Entwurf, Basis main07833fb3f8166a3f8534f52bb1c1843c49f40919,
16 ungelöste Reviewthreads. Autor nexifyai-dev; keine aktuelle exklusive
Branchzuständigkeit aus Metadaten/Kommentaren belegt. Lokal keine laufenden
konkurrierenden Writer. Eigener Clone /workspace/nexify-pr36-review, Zweig
integration/pr36-acceptance-2026-10-27 ohne Remote. PR35 bleibt unverändert.

## Sprint und bestätigte Fälle

DoD dieses Teilpakets: reproduzierte Negativfälle, Regressionen, Build/Browser/
Gesamtgates und unabhängige Codeprüfung. Bestehendes aktives Feature unverändert.
Keine Änderung an Auth-Aktivierung, Rollen, Preisen oder Design.

- discussion_r4382373019: zwei Chunks akzeptiert, nur Entry eingebettet; vorher
  reproduziert. Dedicated Vite-Modus codeSplitting:false plus Parserprüfung auf
  Syntaxfehler, statische/dynamische Imports und externe Exporte. Nach unabhängigem
  P2-Finding auch Unterverzeichnis/mjs/Reexport/berechnete Imports regressiert.
- r4382373095: abgelehnter lazy SDK-Import entfernte die öffentliche Anwendung;
  vorher im Browser reproduziert. Eigene Fehler-/Suspensegrenze nur um Auth-Panel.
  Öffentliche Umgebung und ungesendete Eingaben bleiben erhalten. SDK wird auf
  normalen öffentlichen Routen nicht geladen; kein Workspace-Remount beim Laden.
- r4382373215: fehlende Abmeldung synthetisch reproduziert. Lokalisierter
  Tastaturbutton ruft signOut mit festem lokalem Redirect auf. Fehler bleiben
  ausdrücklich unbestätigt, erneuter Versuch bewusst; keine Geschäftsrechte.
- r4382373156/r4382376721: deDE trotz NL/FR reproduziert; Provider verwendet
  aktuelle Workspace-Locale und entsprechende originale SDK-Lokalisierung.
- r4382376714: engines22.x umfasst22.0–22.11; Vite8.3.5 verlangt laut Lockfile
  ^20.19.0 || >=22.12.0. Historische strengere Untergrenze22.23.4 wiederhergestellt,
  Obergrenze<23 bleibt; tatsächlich unter22.23.4 gebaut.

Nicht alle16 Hinweise bearbeitet: Domainbindung, veraltete Vercel-Prerequisites,
historische PROGRESS-Formatierung und fehlende lokale Skillinstallation bleiben
hier offen. .agents/skills fehlt im sauberen Clone; keine Installation behauptet.

## Verifikation, Grenzen und Rollback

24 Node-Regressionen und sieben Browserfälle mit synthetischem Clerk-Adapter;
keine echten Sitzungen oder externen Authanfragen. Tatsächliches Standalone-HTML
über file://, Hashrouten und Sprachen geprüft: keine externen Requests/JS-Fehler.
Node22.23.4 lokal von nodejs.org bereitgestellt und Archiv-SHA256 verifiziert.
Vorhandene gepinnte node_modules isoliert kopiert; keine Abhängigkeit geändert.
Host-pnpm11.25.0 scheiterte an seiner internen SQLite-Datenbank. Generator, tsc
und Vite deshalb direkt unter Node22.23.4 ausgeführt. Kein Codegate umgangen.
Standalone ca2,9MB, JS-Bundle ca789KB; >500KB-Bundlewarnung bleibt offen.

Reproduktion mit Node22.23.4 im PATH und installiertem Lockfile-Bestand:
- node --test apps/site/tests/*.test.mjs
- in apps/site: node scripts/generate-public-data.mjs; node node_modules/typescript/bin/tsc --noEmit
- dort: node node_modules/vite/bin/vite.js build --mode standalone; node scripts/build-standalone.mjs
- PLAYWRIGHT_MODULE=<installiertes playwright/index.mjs> node apps/site/tests/browser-auth.mjs
- gleiche Browserumgebung: node apps/site/tests/browser-standalone.mjs
- make check; make test; make e2e; make check-arch; make clean-check

Separater read-only Reviewer independent_pr36_review schloss den selbst
reproduzierten P2-Importgraphbefund nach Korrektur. Echte Clerk-/Tenant-/Runtime-
Abnahme bleibt offen. Gesamtgates sind lokale Repositorygates, kein externer
Geschäftsprozess. Evidenz: evidence/pr36-2026-10-27. Rollback: lokale Commits
verwerfen/revertieren; keine Runtime-/Datenmigration oder Veröffentlichung erfolgt.

## Semantik-Diff zum technischen Mastervertrag

Master v1/Stichtag2026-10-27T04:14Z. Übermittelte Hashreferenzen (hier nicht an
vollständigen Originalbytes geprüft): Markdown
d4f995ee0300ed40b49ffb16673c0b0b90d856f11f441c06ab5182a8e0f3f0c6;
Register91af17977216caf020c10ca9024779398a58bcb344b50d284c23929b8c3416a7.
Dieser spätere Code-/Teststand ist ein eigenes Delta, keine Rückdatierung.

Teilaufträge PR36-AUTH, PR36-STANDALONE und PR36-ENGINE aggregieren in
PR36-LOCAL-ACCEPTANCE. dependencies sind Abschlussaggregation, keine allgemeine
Startsperre. start_dependencies waren exakter vorhandener Quellstand, eigenes
lokales Schreibziel und sichere synthetische Eingaben. Ownerrolle ist keine
Executorzuweisung. source_reported_status, Implementierungsstatus, unabhängige
Reviewevidenz und Runtimeabnahme bleiben getrennt. Status hinsichtlich fachlicher
Liveabnahme: reported_implemented_unverified; Implementierung/lokale Tests belegt.
Produktionsübernahme benötigt reale Auth-/Tenant-/Domain-/Betriebsbelege und
konkrete Freigabe. GitHub-Threads werden durch diesen Beleg nicht geschlossen.
AIFly bleibt Steuerungsziel; kein Worker aktiviert. Private Geschäftsvorgänge,
Konten, Rechnungen und Kundenfälle sind ausgeschlossen.

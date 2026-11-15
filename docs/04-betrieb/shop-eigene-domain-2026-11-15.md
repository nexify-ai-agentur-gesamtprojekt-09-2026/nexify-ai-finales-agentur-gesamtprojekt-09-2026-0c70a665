# TEILEKLAR auf eigener Domain `teileklar.shop` (15.11.2026)

Auftrag des Inhabers Pascal Courbois vom 15.11.2026: Der Shop soll unter `teileklar.shop` laufen; die App bleibt eine.
Zweig `claude/shop-eigene-domain`, Stand der Messungen: Commit `fae6e5d` gegen `main` `9c9c806`. Nichts ist umgeschaltet,
nichts wurde in Vercel, Cloudflare oder am DNS geändert.

## 1. Kurzfassung

- Die Umstellung ist im Code vorbereitet und liegt hinter einem Schalter, Standard **AUS**: `NEXIFY_SHOP_HOST=enabled`.
  Ohne den Schalter verhält sich die Auslieferung wie heute (Abschnitt 6, Vergleich mit `main`).
- Mit Schalter zeigt `teileklar.shop` den Shop ohne `/teileklar` (`teileklar.shop/shop` ist das heutige `/teileklar/shop`),
  `/api/shop/…` bleibt erreichbar, und `nexifyai.de/teileklar/…` leitet dauerhaft auf die passende Adresse unter
  `teileklar.shop`. Canonical, hreflang, Sitemap und `robots.txt` folgen je Host.
- Das Erscheinungsbild ist unverändert: keine Stylesheet-, Token- oder Layoutdatei ist berührt. Gemessen: Gleichmacher
  0 Abweichungen, und 14 Bildvergleiche Shop-Domain gegen heutige Adresse mit 0 abweichenden Pixeln.
- Umgeschaltet wird erst, wenn der Katalog im neuen Namensraum gefüllt und abgenommen ist. Heute liefert die neue
  Shop-API `products: 0`, der alte Dienst unter `teileklar.shop` 3720 Produkte (Angabe der koordinierenden Sitzung vom
  15.11.2026, hier nicht nachgemessen). Das Umschalten ist danach ein kurzer Ablauf mit Rückweg (Abschnitt 8).
- Beim Inhaber liegen fünf Entscheidungen (Abschnitt 10).

## 2. Stand

| | Aussage | Quelle |
|---|---|---|
| IST | `nexifyai.de` und `www.nexifyai.de` antworten mit 200 von Vercel, ohne Cloudflare davor | eigene Messung 15.11.2026 (`server: Vercel`) |
| IST | `teileklar.shop` und `www.teileklar.shop` antworten mit 200 über Cloudflare (`server: cloudflare`) | eigene Messung 15.11.2026 |
| IST | Zone `teileklar.shop` bei Cloudflare, aktiv: zwei A-Einträge (`teileklar.shop`, `www.teileklar.shop`) auf denselben eigenen Server, Proxy an, TTL automatisch, zuletzt geändert 15.09.2026; drei TXT-Einträge für Mail (SPF `-all`, DMARC `reject`, DKIM); SSL-Modus `full` | Cloudflare-Schnittstelle, nur gelesen, 15.11.2026. Die Serveradresse steht bewusst nicht in diesem Dokument |
| IST | In der Zone gibt es keinen CNAME auf einen Tunnel | wie oben |
| ANNAHME | Für `teileklar.shop` greift heute der Weg über die A-Einträge; eine Tunnel-Regel auf einem zweiten Server ist ohne DNS-Eintrag von außen nicht erreichbar. Die Klärung läuft in einer anderen Sitzung | abgeleitet aus den DNS-Einträgen |
| IST | Die Shop-API des Projekts ist an die Datenbank gebunden, der Katalog im neuen Namensraum ist leer | Angabe der koordinierenden Sitzung, 15.11.2026 |
| SOLL | Der Shop läuft unter `teileklar.shop`; TEILEKLAR bleibt eine eigene Marke in derselben App | Inhaber, 15.11.2026 |
| OFFEN | Zeitpunkt des Umschaltens: nach Übernahme und Abnahme des Katalogs (Zweig `claude/shop-supabase-migration`) | Entscheidung der koordinierenden Sitzung |

## 3. Die Regel

Umsetzung: `apps/web/auth/shop-host.ts` (reine Funktionen, ohne Importe), angewendet in `apps/web/proxy.ts`.
Der Shop bleibt in der App unter `/teileklar`; nur die Adressen ändern sich.

Zwei Entscheidungen mit Begründung:

- **Kanonische Adresse ist `teileklar.shop` ohne `www`.** Die Marke heißt wörtlich „TEILEKLAR.shop", so steht sie in
  Seitentiteln und Kopfleiste. `www.teileklar.shop` leitet dauerhaft dorthin. Die Agentur bleibt bei `www.nexifyai.de`
  als Canonical (unverändert).
- **Agenturseiten unter `teileklar.shop`: bekannte Seiten leiten zur Agentur-Domain, alles andere ist 404.** Der Shop
  verlinkt selbst auf `/kontakt`, `/datenschutz` und weitere Agenturseiten; diese Verweise müssen ankommen, deshalb die
  Weiterleitung für genau die Seiten des Katalogs. Ein unbekannter Pfad wird nicht geraten und nicht über die
  Domaingrenze geschickt: Er endet im 404 der App. So entsteht keine offene Weiterleitung, und die Shop-Domain liefert
  nie eine Agenturseite aus.

Umgeleitet wird nur auf freigegebenen Produktionsdomains. Vorschauen (`*.vercel.app`), `localhost` und Aufrufe mit
gemischten Host-Angaben verhalten sich auch mit Schalter wie bisher; der Shop bleibt dort unter `/teileklar` prüfbar.

## 4. Weiterleitungstabelle (mit Schalter)

Dieselbe Tabelle steht als Test in `apps/web/auth/tests/shop-host.test.mjs` (59 Zeilen) und wurde am lokalen Build
abgerufen (41 Abrufe, Abschnitt 6).

| Host | Pfad | Ergebnis |
|---|---|---|
| `teileklar.shop` | `/` | 200, zeigt `/teileklar` |
| `teileklar.shop` | `/shop`, `/produkt/<id>`, `/kategorie/<id>`, `/warenkorb`, `/kasse`, `/bestellung/<id>`, `/rechtliches`, … | 200, zeigt `/teileklar/<Pfad>` |
| `teileklar.shop` | `/konto`, `/partnerportal`, `/nachbarschaft` | 200 als gesperrte Hülle mit `Cache-Control: private, no-store` und `X-Robots-Tag: noindex, nofollow`, wie heute unter `/teileklar/…` |
| `teileklar.shop` | `/teileklar`, `/teileklar/<Pfad>` | 308 auf `/` beziehungsweise `/<Pfad>` |
| `teileklar.shop` | `/api/…` | unverändert; `/api/internal/workspace` bleibt 401 |
| `teileklar.shop` | `/anmelden`, `/registrieren`, `/passwort-vergessen`, `/passwort-zuruecksetzen` | 200, unverändert (Begründung in Abschnitt 5) |
| `teileklar.shop` | `/portal/kunde` | 307 auf `/bestellungen` (Ziel nach der Anmeldung, Entscheidung E3) |
| `teileklar.shop` | `/intern/leitstand` | 307 auf `/admin` (Ziel nach der Anmeldung, Entscheidung E3) |
| `teileklar.shop` | `/kontakt`, `/datenschutz`, `/agb`, jede andere Agenturseite des Katalogs | 308 auf `https://www.nexifyai.de/<Pfad>` |
| `teileklar.shop` | alles Übrige, zum Beispiel `/gibt-es-nicht`, `/intern/x` | 404 |
| `teileklar.shop` | `/sitemap.xml`, `/robots.txt` | 200, eigene Fassung der Shop-Domain |
| `teileklar.shop` | Dateien (`/brand/…`, `/media/…`, `/fonts/…`, `/glass/…`, `/favicon.ico`) | unverändert |
| `www.teileklar.shop` | jeder Seitenpfad | 308 auf `https://teileklar.shop/<endgültiger Pfad>`, ein Sprung |
| `nexifyai.de`, `www.nexifyai.de`, `nexifyai.cloud`, `www.nexifyai.cloud` | `/teileklar`, `/teileklar/<Pfad>` | 308 auf `https://teileklar.shop/<Pfad>`, Abfrage bleibt erhalten |
| dieselben | alles andere | unverändert |
| `*.vercel.app`, `localhost`, gemischte Host-Angaben | alles | unverändert, keine Umleitung |

Geprüft im Test: keine Schleife (jede Kette endet nach höchstens zwei Sprüngen), jede Shop-Seite des Katalogs hat genau
eine Adresse, keine kollidiert mit einer Agenturseite, einer Kontoseite oder einem Dateiordner, und private Routen bleiben
gesperrt, weil die Sperre des Proxys nach der Adressentscheidung auf den Pfad der App greift.

## 5. Verweise, Indexierung, Shop-API, Anmeldung

**Verweise in der Oberfläche.** Die Komponenten rechnen weiter mit `/teileklar/…`. An genau einer Stelle
(`apps/web/components/NextRouterBridge.tsx`) wird auf der Shop-Domain der sichtbare Pfad in den Pfad der App übersetzt
und jeder Verweis in die Adresse der Shop-Domain: Shop-Seiten ohne Präfix, Kontoseiten und `/api` unverändert,
Agenturseiten mit voller Adresse `https://www.nexifyai.de/…`. Gemessen auf sieben Shop-Seiten: 0 Verweise mit Präfix,
Navigation per Klick ohne neuen Seitenaufbau. Keine Shop-Komponente wurde dafür geändert.

**Canonical, hreflang, strukturierte Daten.** Alle Adressen kommen aus einer Funktion (`publicUrl`, benutzt von
`lib/page-seo.ts`, `lib/shop-server.ts` und den beiden Seiten mit fester Adresse im Kopf). Mit Schalter steht für
Shop-Seiten `https://teileklar.shop/…`, für Agenturseiten weiter `https://www.nexifyai.de/…`.

**Sitemap und robots.** Mit Schalter führt die Shop-Domain nur Shop-Seiten, jede andere Domain nur Agentur- und
Rechtsseiten. `robots.txt` der Shop-Domain nennt dieselbe Sperrliste wie bisher ohne Präfix und
`https://teileklar.shop/sitemap.xml`. Ohne Schalter bleiben beide Dateien beim Build erzeugt und unverändert.

**Indexierung.** Die Regel aus `docs/04-betrieb/indexierung-freigabe-2026-11-14.md` gilt unverändert: TEILEKLAR-Seiten
sind gesperrt, bis `NEXIFY_INDEXING` und `NEXIFY_INDEXING_TEILEKLAR` gesetzt sind. Neu ist nur der Ort: Mit
`NEXIFY_SHOP_HOST` ist `teileklar.shop` die einzige freigegebene Adresse für Shop-Seiten; `www.teileklar.shop`, die
Agentur-Domains und Vorschauen bleiben für Shop-Seiten gesperrt. Lokal gemessen: Shop-Seiten tragen
`noindex, nofollow`, die Sitemap der Shop-Domain ist ohne den Shop-Indexschalter leer (0 Adressen).

**Shop-API: was `PREVIEW_PUBLIC_ORIGIN` steuert.** Der eine Wert (heute `https://nexifyai.de` laut koordinierender
Sitzung) hat vier Aufgaben: (1) Herkunftsprüfung für Schreibaufrufe des Browsers (`vercel_app.py`, `origin_rejected`),
(2) Verweise in E-Mails und der Verweis zum Zurücksetzen des Passworts, (3) Rücksprung nach der Zahlung,
(4) Adresse des Zahlungs-Webhooks. Für die Shop-Domain bricht nur (1): Der Browser sendet dort
`Origin: https://teileklar.shop`, jeder Schreibaufruf (Warenkorb, Kasse, Anmeldung) würde mit 403 abgewiesen.
Kleinste sichere Änderung, umgesetzt und getestet: `SHOP_ADDITIONAL_WRITE_ORIGINS` (Standard: nicht gesetzt) erweitert
allein die Herkunftsprüfung. (2) bis (4) bleiben bei `PREVIEW_PUBLIC_ORIGIN`; die dort erzeugten Adressen
`…/teileklar/bestellung/<id>` kommen über die 308-Weiterleitung an. Zahlung und Mailversand werden dadurch nicht
aktiviert. Regeln der Variable: `docs/deployment/environment-variables.md`, Abschnitt 8. Der zweite Laufweg
(`apps/shop-api/shop/main.py`, nicht auf Vercel) ist unverändert und kennt die Variable nicht.

**Sitzungen über zwei Domains.** Sitzungs- und Gast-Cookie der Shop-API gelten je Host (`Secure`, `HttpOnly`,
`SameSite=Lax`, ohne `Domain`). Daraus folgt:

- Anmeldung, Warenkorb und Kasse müssen auf demselben Host liegen. Deshalb bleiben die Kontoseiten auf
  `teileklar.shop` erreichbar, und `/api` wird dort direkt beantwortet.
- Eine Sitzung auf `nexifyai.de` gilt nicht auf `teileklar.shop` und umgekehrt. Wer im Shop angemeldet ist, ist im
  Kundenportal der Agentur nicht angemeldet. Ein gemeinsames Cookie über beide Domains ist technisch nicht möglich
  (verschiedene Hauptdomains) und nach `AGENTS.md` auch nicht gewollt („Unterschiedliche Domains … nicht durch einen
  gemeinsamen Cookie … gleichsetzen").
- Warenkörbe und Sitzungen, die vor dem Umschalten unter `nexifyai.de/teileklar` entstanden sind, sind auf
  `teileklar.shop` nicht sichtbar. Solange der neue Katalog leer ist, betrifft das keine Bestellung.

**Clerk.** Clerk ist seit D-007 nicht mehr im Einsatz; `apps/web` hat keine Clerk-Abhängigkeit, Sitzungen stellt die
Shop-API aus. Im Clerk-Konto ist für diese Umstellung **nichts** einzustellen. Reste ohne Wirkung: die
Clerk-Einträge in der Inhaltsrichtlinie von `vercel.json` und `clerkConfiguration` in `auth/policy.ts`. Sollte Clerk
später wieder eingeführt werden, braucht eine gemeinsame Anmeldung über zwei Hauptdomains dort eine eigene Einrichtung
(„Satellite Domains", Einstellung im Clerk-Konto und Variablen im Projekt; Kosten vorher prüfen). Das ist kein Teil
dieses Auftrags.

**Anmeldung mit Google.** Der Knopf übergibt die Adresse der jeweiligen Domain (`…/anmelden`) als Rücksprung an den
Vermittler. Ob der Vermittler `https://teileklar.shop/anmelden` annimmt, ist nicht belegt und gehört zu den Messpunkten
nach dem Umschalten (siehe auch OA zur eigenen OAuth-Anwendung in `PROGRESS.md`).

## 6. Tests und Messungen

Umgebung: Node v22.23.4, Python 3.13.18, Playwright 1.63.0 (festgelegt ist 1.65.0 in `.github/evidence-runner/package.json`;
Abweichung der Laufumgebung), lokaler Produktions-Build. Kein CI-Lauf (Actions startet keine Jobs, bekannte Lage).

| Prüfung | Ergebnis |
|---|---|
| `pnpm --filter @nexify/web test:auth` | 152 von 152 (vorher 138); davon `shop-host.test.mjs` 14 Tests, Tabelle mit 59 Zeilen |
| `python3 -m unittest discover -s apps/shop-api/tests` (eigene Umgebung mit den gepinnten Paketen) | 50 Tests, OK, 10 übersprungen (auf `main` 47); `test_vercel_adapter.py` 24 statt 21 |
| `node --test apps/site/tests/*.test.mjs` | 132 von 132 |
| `pnpm --filter @nexify/web typecheck` | Exit 0 |
| `pnpm --filter @nexify/web build`, `pnpm --filter @nexify/site build` | Exit 0; ohne Schalter bleiben `/robots.txt` und `/sitemap.xml` statisch |
| `make check`, `node tools/ds-audit-cli.js` | Exit 0; 0 Fehler, 0 Warnungen |
| `node tools/lint.mjs` | Exit 0; 0 Diagnosen in allen drei Projekten |
| `node apps/web/scripts/atelier-literale.mjs` | Exit 0 |
| `make check-arch` | Exit 2 wie auf `main`; Ausgabe identisch mit `main` (dieselben 3 Regeln rot, keine neue) |
| Python-Suite `python3 -m unittest discover -s tests`, Namensvergleich | 46 rote Namen vorher, 46 nachher, kein neuer, keiner entfallen; `make test` endet deshalb weiter mit Fehler |
| `node tools/gleichmacher.mjs` gegen den lokalen Build | 44 Seiten, 2 Breiten, 31 497 Vergleiche, 0 Abweichungen (auf `main` dieselben Zahlen) |
| `node tools/live-check.mjs` gegen den lokalen Build | 329 Prüfungen, 7 Befunde, dieselben 7 wie auf `main` lokal (Installation lokal aus, Shop-Dienst lokal nicht gestartet) |
| `python3 tools/check_text_resize_evidence.py` | besteht, 43 Routen |

**Schalter aus gegen `main`** (beide lokal gebaut, 26 Pfade, Host `www.nexifyai.de`): Statuscode und Kopfzeilen bei
26 von 26 gleich. Inhalt bei 4 von 4 Nicht-HTML-Antworten bytegleich (`/sitemap.xml`, `/robots.txt`, API-401,
Weiterleitung `/login`). Bei allen 22 HTML-Seiten ist das Markup bytegleich; im eingebetteten Datenstrom unterscheidet
sich bei 17 nur die Build-Kennung, bei 5 zusätzlich Nummerierung und Reihenfolge der Modulverweise (Folge des neuen
Moduls im Bündel). Der Host ändert ohne Schalter nichts: `teileklar.shop/shop` ist 404, `/teileklar/shop` 200.

**Schalter an** (lokaler Build mit `NEXIFY_SHOP_HOST=enabled`): 41 Abrufe nach Tabelle, alle wie erwartet, kein 500.
Im Browser: 7 Shop-Seiten in 2 Breiten, Shop-Domain gegen heutige Adresse, 14 Bildvergleiche mit gleicher Größe, gleichem
Text und 0 abweichenden Pixeln; 3 Klicks in der Shop-Navigation ohne neuen Seitenaufbau, Adresse ohne Präfix, aktuelle
Seite markiert; keine fehlgeschlagenen Abrufe. Der erste Bildvergleich fand ein fehlendes Bild (`/brand/…` wurde
umgeschrieben); behoben, Test ergänzt.

Hinweis zur lokalen Prüfung mit Schalter: `next start` mit `--hostname localhost` starten. Mit `--hostname 127.0.0.1`
behandelt der lokale Server die interne Umschreibung als zweiten Aufruf, und die Verweise erscheinen mit Präfix. Auf der
Plattform tritt das nicht auf, weil Aufruf und Umschreibung denselben Host tragen.

## 7. Belege und Pins (nach `.claude/skills/nexify-belege-und-pins`)

Drei Harnesse liefen am 15.11.2026 bei sauberem Arbeitsbaum und bestanden; die vorigen Fassungen liegen unverändert
unter `superseded/…pre-shop-eigene-domain-2026-11-15.json`.

| Lauf | fester Commit | Ergebnis | Beleg |
|---|---|---|---|
| `apps/site/tests/browser-text-spacing.mjs` | `78d4da1` | 129 Prüfungen, 43 Routen, 0 Befunde, keine Laufzeitfehler | `evidence/resize-2026-11-10/text-spacing.json` |
| `apps/web/auth/tests/browser-public-experience.mjs` | `33f3cb0` | 70 Routen, 10 private Hüllen, bestanden | `evidence/consent-ui-2026-10-28/next-public.json` |
| `apps/site/tests/browser-workspace-read.mjs` | `33f3cb0` | 4 Checks, 20 Negativsitzungen, Zustand unverändert | `evidence/workspace-read-2026-10-28/browser-workspace-read.json` |

Nachgezogen in `config/acceptance-coverage.json` (`tools/_update_register_shas.py` nicht benutzt):

| Datei | alter Pin | neuer Pin | Belegart |
|---|---|---|---|
| `apps/web/proxy.ts` | `aaf1245796ba…` | `e39fdbfc43ef…` | Browserlauf (beide Läufe binden die heutigen Bytes) |
| `apps/web/app/layout.tsx` | `ec2b970e0336…` | `17ccd81854d3…` | Browserlauf (Public-Experience) |
| `apps/shop-api/vercel_app.py` | `09b13b9fd5fd…` | `e49afd264cb1…` | grüner Test (`test_vercel_adapter.py`, 24 Tests, prüft die neue Herkunftsregel) |
| `apps/shop-api/tests/test_vercel_adapter.py` | `8440343c6811…` | `2a043ae9c8a2…` | grüner Test (die Datei selbst, 24 Tests) |
| `evidence/consent-ui-2026-10-28/next-public.json` | `42785bc15152…` | `b0582402b431…` | Browserlauf, neu erhobener Beleg |
| `evidence/workspace-read-2026-10-28/browser-workspace-read.json` | `aa94c75b5877…` | `1aa6b3efea80…` | Browserlauf, neu erhobener Beleg |

Im Resize-Beleg neu gebunden: `apps/web/components/NextRouterBridge.tsx`, `apps/web/lib/page-seo.ts`,
`apps/web/lib/shop-server.ts`.

Bewusst nicht nachgezogen: `evidence/observability-integration-2026-10-28/browser-exceptions-next.json` und
`browser-exceptions-vite.json` binden die alten Bytes von `apps/web/app/robots.ts`, `apps/web/app/teileklar/page.tsx`,
`apps/web/app/teileklar/shop/page.tsx`, `apps/web/lib/shop-server.ts` und `apps/web/components/NextRouterBridge.tsx`;
`evidence/one-app-2026-10-27/text-spacing.json` (historischer Beleg) die der beiden letzten. Der zugehörige Lauf
scheitert schon auf `main` (`tools/check_browser_evidence.py`, erster Befund unverändert `apps/site/src/Auth.tsx`), es
wird kein Testname neu rot. Grenze der Belege: Die Harnesse fahren den Proxy nur ohne Schalter. Das Verhalten mit
Schalter belegen `shop-host.test.mjs` und die Messungen aus Abschnitt 6.

## 8. Umschaltplan (nichts davon ist ausgeführt)

**Vorbedingungen, alle erfüllt und belegt, bevor Schritt 1 beginnt:**

1. Der Katalog im neuen Namensraum ist gefüllt und vom Inhaber abgenommen (`/api/shop/status` nennt eine Produktzahl
   größer 0, Stichprobe von Artikel, Kategorie, Warenkorb unter `nexifyai.de/teileklar`).
2. Dieser Zweig ist auf `main` und mit Schalter aus ausgeliefert; `node tools/live-check.mjs` gegen die Produktion zeigt
   keinen neuen Befund.
3. Die heutigen DNS-Einträge der Zone sind exportiert (Cloudflare, DNS, „Export") und außerhalb des Repositorys
   abgelegt. Sie enthalten die Adresse des alten Servers; das ist der Rückweg.
4. Der alte Dienst läuft unverändert (Abschnitt 9).
5. Die Entscheidungen E1 bis E3 sind getroffen (Abschnitt 10).

| Nr. | Schritt | Wo, wer | Wirkung | Rückweg | Wartezeit |
|---|---|---|---|---|---|
| 1 | Domains `teileklar.shop` und `www.teileklar.shop` dem Projekt `…-ut7r` hinzufügen. **Keine** Weiterleitung zwischen beiden in Vercel einrichten (Vercel schlägt beim Hinzufügen eine vor; die App leitet `www` selbst auf die Adresse ohne `www`) | Vercel, Projekt, Domains; Inhaber | Keine sichtbare. DNS zeigt weiter auf den alten Dienst; Vercel nennt die einzutragenden DNS-Werte und meldet „Invalid Configuration", bis Schritt 3 erfolgt ist | Domains im Projekt wieder entfernen | keine |
| 2 | Variablen für Production setzen: `SHOP_ADDITIONAL_WRITE_ORIGINS=https://teileklar.shop` und `NEXIFY_SHOP_HOST=enabled`; neu ausliefern | Vercel, Projekt, Environment Variables; Inhaber | `nexifyai.de/teileklar/…` leitet auf `teileklar.shop`. Dort antwortet bis Schritt 3 noch der alte Dienst; tiefe Adressen können dort fehlen. Deshalb Schritt 3 unmittelbar anschließen | `NEXIFY_SHOP_HOST` entfernen, neu ausliefern (die zweite Variable kann bleiben) | Dauer einer Auslieferung, einige Minuten |
| 3 | In der Zone `teileklar.shop` die beiden A-Einträge **bearbeiten** (nicht löschen): `teileklar.shop` und `www.teileklar.shop` auf die von Vercel in Schritt 1 genannten Werte. Proxy **aus** („DNS only"), TTL automatisch. Die drei TXT-Einträge bleiben unberührt | Cloudflare, DNS; Inhaber | `teileklar.shop` wird von der App ausgeliefert. Vercel stellt das Zertifikat aus, sobald die Einträge sichtbar sind; bis dahin kann der Aufruf per HTTPS scheitern. Zeitfenster mit wenig Besuch wählen | Beide Einträge auf die exportierten alten Werte zurückstellen, Proxy **an**: Der alte Dienst ist wieder da. Zusätzlich Rückweg aus Schritt 2, damit `nexifyai.de/teileklar` wieder selbst ausliefert | bis 5 Minuten für DNS, dazu das Zertifikat (meist Minuten) |
| 4 | Messen (Liste unten) | koordinierende Sitzung, nur lesend | Beleg, dass der Shop unter der eigenen Domain läuft | bei Befund: Rückweg aus Schritt 3 | etwa 15 Minuten |
| 5 | Alte Tunnel-Regel: **nicht anfassen**. Sie hat ohne DNS-Eintrag keine Wirkung (Annahme aus Abschnitt 2) und gehört bis zur Abnahme zum Rückweg des alten Dienstes | Cloudflare Zero Trust | keine | entfällt | nach Abnahme: eigene Entscheidung (Stilllegen ist Server-Bereinigung nach D-016) |
| 6 | Später und getrennt: `NEXIFY_INDEXING_TEILEKLAR` (Indexierung des Shops), `PREVIEW_PUBLIC_ORIGIN` auf die Shop-Domain (E4) | Inhaber | siehe jeweilige Entscheidung | Variable zurückstellen, neu ausliefern | – |

Warum Proxy aus in Schritt 3: `nexifyai.de` läuft heute ebenfalls ohne Cloudflare davor (Messung Abschnitt 2), und Vercel
stellt das Zertifikat ohne zweiten Dienst dazwischen ohne Zusatzschritte aus. Bleibt der Proxy an, muss der SSL-Modus der
Zone zu Vercel passen (heute `full`), und die Zertifikatsausstellung kann hängen. Das vor der Ausführung in der
Vercel-Anleitung zu Domains gegenlesen; hier nicht erprobt.

Die umgekehrte Reihenfolge (erst DNS, dann Schalter) ist möglich, zeigt aber zwischen beiden Schritten die Agenturseite
unter `teileklar.shop`. Deshalb zuerst der Schalter.

Zum Rückweg gehört ein Hinweis: Browser merken sich 308-Weiterleitungen. Wer `nexifyai.de/teileklar/…` zwischen
Schritt 2 und einem Rückweg aufgerufen hat, landet weiter auf `teileklar.shop`, also beim wiederhergestellten alten
Dienst. Der Shop bleibt damit erreichbar.

**Messpunkte nach Schritt 3** (alle nur lesend):

- `https://teileklar.shop/` 200 von Vercel (`server: Vercel`), Titel „TEILEKLAR.shop …"; `/shop` 200; `/gibt-es-nicht` 404.
- `https://www.teileklar.shop/shop` 308 auf `https://teileklar.shop/shop`.
- `https://nexifyai.de/teileklar/shop` und `https://www.nexifyai.de/teileklar` 308 auf `https://teileklar.shop/…`.
- `https://teileklar.shop/kontakt` 308 auf `https://www.nexifyai.de/kontakt`; `https://www.nexifyai.de/` 200 unverändert.
- `https://teileklar.shop/api/shop/status` 200 mit Produktzahl größer 0; `/api/internal/workspace` 401.
- Seitenkopf von `https://teileklar.shop/shop`: Canonical `https://teileklar.shop/shop`, `noindex, nofollow` (bis zur Freigabe).
- `https://teileklar.shop/robots.txt` nennt `https://teileklar.shop/sitemap.xml`; `https://www.nexifyai.de/sitemap.xml` enthält keine Adresse mit `teileklar`.
- Im Browser auf `teileklar.shop`: Artikel in den Warenkorb legen (Schreibaufruf wird angenommen, kein 403 `origin_rejected`), Anmeldung mit E-Mail, Anmeldung mit Google.
- `node tools/gleichmacher.mjs https://teileklar.shop` und `node tools/live-check.mjs https://nexifyai.de`; dazu die Statusprüfung nach `.claude/skills/nexify-auslieferung-pruefen` für die neue Domain.

## 9. Was am alten Dienst bis zur Abnahme unverändert bleiben muss

- Der Server, auf den die A-Einträge heute zeigen, läuft weiter, mit unveränderter Adresse.
- Sein Webserver beantwortet weiter `teileklar.shop` und `www.teileklar.shop`, mit dem Zertifikat, das der SSL-Modus
  `full` der Zone heute voraussetzt.
- Datenbestand und Bilder des alten Shops (die 3720 Produkte) bleiben, wie sie sind.
- Die Zoneneinstellungen bei Cloudflare bleiben, wie sie sind (SSL-Modus, Regeln); geändert werden in Schritt 3 allein
  die zwei A-Einträge.
- Die Tunnel-Regel auf dem zweiten Server bleibt bestehen.
- Der Export der DNS-Einträge aus Vorbedingung 3 bleibt aufbewahrt.
- Keine Server-Bereinigung am alten Dienst vor der Abnahme (D-016).

## 10. Offene Entscheidungen des Inhabers

| Nr. | Entscheidung | Vorschlag | Wirkung, wenn offen |
|---|---|---|---|
| E1 | Zeitpunkt des Umschaltens | nach Abnahme des Katalogs, Zeitfenster mit wenig Besuch | nichts wird umgeschaltet |
| E2 | Kanonische Adresse `teileklar.shop` ohne `www` (umgesetzt) und Proxy aus für die neuen DNS-Einträge | so lassen | bei anderer Wahl: Konstante und Test in `shop-host.ts` ändern |
| E3 | Ziel nach der Anmeldung auf der Shop-Domain: Kunde nach `/bestellungen`, Verwaltung nach `/admin` (umgesetzt als vorläufige Weiterleitung 307, weil die festen Ziele `/portal/kunde` und `/intern/leitstand` zur Agentur-Domain gehören und die Sitzung dort nicht gilt) | bestätigen; danach das Ziel in `components/shop/AuthForms.tsx` selbst setzen (eigener Auftrag, die Datei ist an Belege gebunden) | die Weiterleitung bleibt vorläufig |
| E4 | `PREVIEW_PUBLIC_ORIGIN` später auf `https://teileklar.shop` stellen (Verweise in E-Mails, Rücksprung nach der Zahlung, Webhook-Adresse) | erst nach stabilem Betrieb; Webhook-Adresse beim Zahlungsanbieter dann mit umstellen | E-Mail-Verweise laufen über die Weiterleitung, funktionieren aber |
| E5 | Mail-Einträge der Zone: Die Domain versendet heute keine Mail (SPF `-all`, DMARC `reject`). Sollen Shop-Mails von `@teileklar.shop` kommen, braucht es eigene Einträge | getrennt entscheiden, nicht Teil des Umschaltens | Shop-Mails kommen weiter vom bisherigen Absender |

## 11. Grenzen und nicht Belegtes

- Nichts ist live. Ein grüner lokaler Lauf ist keine Abnahme; die Messpunkte aus Abschnitt 8 stehen nach dem Umschalten an.
- Nicht erprobt: Zertifikatsausstellung bei Vercel für `teileklar.shop`, das Verhalten mit Cloudflare-Proxy davor, die
  Anmeldung mit Google von der Shop-Domain, eine echte Zahlung mit Rücksprung.
- Hinweis ohne Messung: Die Herkunftsprüfung der Shop-API vergleicht genau. Steht `PREVIEW_PUBLIC_ORIGIN` auf
  `https://nexifyai.de`, werden Schreibaufrufe von `https://www.nexifyai.de` abgewiesen. Das ist unabhängig von dieser
  Umstellung; `SHOP_ADDITIONAL_WRITE_ORIGINS` kann auch diese Herkunft aufnehmen. Zu prüfen durch die Sitzung, die den
  Shop-Dienst betreut.
- Verweise in Shop-Komponenten tragen im Quelltext weiter `/teileklar/…`; die Router-Brücke übersetzt sie. Ein Aufruf
  mit Präfix auf der Shop-Domain kostet eine Weiterleitung; im gerenderten Seitenbild kommt keiner mehr vor.
- `apps/web/app/sitemap.ts` hatte schon vorher keinen gültigen Pin und bleibt ohne (kein Lauf bindet die Sitemap).
- Der erste Commit des Zweigs (`48ebf18`) trägt versehentlich eine Werkzeug-Kennzeichnung in der Nachricht; die
  Historie wurde nicht umgeschrieben (kein Force-Push). Beim Squash-Merge die Nachricht ohne diese Zeilen schreiben.

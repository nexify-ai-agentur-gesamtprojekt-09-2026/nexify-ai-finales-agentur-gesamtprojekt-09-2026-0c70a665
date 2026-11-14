# Indexierung der Website: Entscheidungsvorlage zur Freigabe (14.11.2026)

Adressat: Inhaber Pascal Courbois. Diese Vorlage schaltet nichts ein. Sie beschreibt, was heute gilt, was die
Freigabe bewirkt und wie sie zurückgenommen wird. Keine Rechtsberatung.

## 1. Ist-Zustand (gemessen 14.11.2026, 18:31 bis 18:41 UTC, nur lesend)

Gemessen wurden auf `https://nexifyai.de` alle 53 Routen aus `config/site-map.json` in de, nl, fr und en sowie
`/agb`, `/avv`, `/widerruf`, `/offline`, die beiden Passwortseiten und eine nicht vorhandene Adresse (240 Abrufe),
dazu Stichproben auf `www.nexifyai.de`, `nexifyai.cloud`, `www.nexifyai.cloud` und der Vercel-Adresse.

| Befund | Wert |
|---|---|
| Startseite und 33 weitere Sitemap-Seiten | Meta `noindex, nofollow`, in allen vier Sprachen |
| `/agb`, `/avv`, `/widerruf`, `/teileklar/kategorien`, `/teileklar/werkstatt` | Meta `index, follow`, also **heute schon indexierbar**, am Schalter vorbei |
| `/anmelden`, `/registrieren`, `/teileklar/suche`, `/teileklar/warenkorb`, `/teileklar/kasse` | Meta `noindex, follow` |
| 10 private Routen (`/portal/*`, `/intern/*`, `/teileklar/konto`, `…/partnerportal`, `…/nachbarschaft`) | Meta und Kopfzeile `X-Robots-Tag: noindex, nofollow` |
| `robots.txt` | `Allow: /`, sperrt `/api/`, `/intern/`, `/portal/` und die privaten TEILEKLAR-Pfade, nennt die Sitemap |
| `sitemap.xml` | 39 Adressen (36 Katalogseiten, 3 Rechtsseiten), davon 34 mit `noindex` |
| Canonical | auf jedem Host `https://www.nexifyai.de/…`, je Sprache mit `?lang=` |
| hreflang | Agenturseiten de, nl, fr, en, x-default; passend zur Sitemap |
| Hosts | Alle vier Domains und `nexify-ai-finales-agentur-gesamtpro-one.vercel.app` liefern denselben Inhalt mit 200; kein Redirect von Apex auf `www` |
| Shop-Dienst | `/api/shop/status` 503 |

`robots.txt`, Sitemap und Meta passen also nicht zusammen: `robots.txt` erlaubt das Crawlen, die Sitemap reicht
Adressen ein, die Meta-Angabe sperrt 34 davon. Das ist die Folge einer bewussten Sperre, kein Zufall (Abschnitt 2).

## 2. Regel: Absicht, nicht Versehen

- `apps/web/lib/page-seo.ts:18`: „Indexierung ist standardmäßig AUS (noindex), bis der Inhaber die Veröffentlichung
  freigibt. Freigabe = Umgebungsvariable NEXIFY_INDEXING=enabled im Vercel-Projekt, danach neu deployen“. Der
  Schalter kam mit Commit `d8dedb41152cb5120fd4d2151697eb00ab180f76` (PR 94, 14.11.2026) auf `main`; die feste
  Sperre im Layout (`apps/web/app/layout.tsx:22`) stammt aus `db8555dec57df80886401959a54feccfcac5dda8` (08.11.2026).
- `tests/test_seo_metadata.py`: „Außerdem ist Indexierung bewusst AUS, bis der Inhaber die Veröffentlichung freigibt“.
- `docs/quality/seo-domain-vorschlag-2026-11-09.md`, Zeile 2: „Bewusste Sperre bis zur Veröffentlichungsfreigabe“,
  Freigabe „**ja**, Veröffentlichung“. Auftragsregister OF-18: Entscheidung über den „Zeitpunkt der Indexierung“ liegt bei Pascal.
- `PROGRESS.md`, „Offene Arbeiten“: „Indexierung einschalten (hängt an Impressum und Freigabe).“
- `config/site-map.json`, `publication_gate`: `production_release_claimed: false` mit sechs verlangten Prüfungen (Abschnitt 5).
- `AGENTS.md`: „Kein Livegang ohne Freigabe-Gate (`docs/09-final/07`, Abschnitt Gate)“. Dort: „Vorschau grün → Health
  ≥ 60 s stabil → E3-Gegentests → Rollback-Plan → PASS mit Zeitstempel im Log → Endabnahme. Ohne Nachweis: verweigern.“

`GO-LIVE.md`, `DECISIONS.md` und `config/acceptance-coverage.json` enthalten keine eigene Zeile zur Indexierung.

Versehen sind nur die fünf Seiten, die den Schalter umgehen: `routeMetadata(…, true)` (`page-seo.ts:32`) und die
festen Angaben in `apps/web/app/agb/page.tsx:22`, `avv/page.tsx:23`, `widerruf/page.tsx:23` (Commit `4f097ef6`).

## 3. Was der Zweig `claude/indexierung` vorbereitet (nicht eingeschaltet)

Der vorhandene Schalter bleibt. Neu ist `apps/web/auth/indexing.ts`; `apps/web/proxy.ts` setzt die Regel als Kopfzeile
`X-Robots-Tag: noindex, nofollow` durch. Suchmaschinen wenden die strengste Angabe an, ein `index` im Meta-Tag hebt die
Kopfzeile nicht auf. Eine Seite ist nur indexierbar, wenn alles zugleich gilt:

1. `NEXIFY_INDEXING=enabled` (genau dieser Wert),
2. Produktion (`VERCEL_ENV` fehlt oder ist `production`; Vorschauen nie),
3. Host ist `nexifyai.de`, `www.nexifyai.de`, `nexifyai.cloud` oder `www.nexifyai.cloud` (nie `*.vercel.app`, `*.workers.dev`, localhost),
4. der Pfad steht auf der Liste unten; alles Unbekannte bleibt gesperrt,
5. für `/teileklar` zusätzlich `NEXIFY_INDEXING_TEILEKLAR=enabled`.

Wirkung schon ohne Freigabe, sobald der Zweig ausgeliefert ist: Die fünf heute indexierbaren Seiten sind gesperrt, und
die Sitemap führt die elf TEILEKLAR-Seiten nicht mehr (28 statt 39 Adressen), bis der Shop-Schalter gesetzt ist.

## 4. Seiten nach der Freigabe

| Gruppe | Seiten | Nach `NEXIFY_INDEXING=enabled` |
|---|---|---|
| Agentur (19) | `/`, `/leistungen` und drei Unterseiten, `/leistungsumfang`, `/loesungen`, `/preise-ablauf`, `/wissen`, `/wissen/projekt-vorbereiten`, `/unternehmen`, `/kontakt`, sechs Seiten unter `/produkte/`, `/portale` | indexierbar, je vier Sprachen |
| Recht im Katalog (6) | `/impressum`, `/datenschutz`, `/vertragsgrundlagen`, `/ki-hinweise`, `/barrierefreiheit`, `/cookies` | indexierbar (bisherige Regel: in der Sitemap, folgen dem Schalter) |
| Rechtsseiten (3) | `/agb`, `/avv`, `/widerruf` | indexierbar (bisherige Regel: `index, follow`) |
| TEILEKLAR (11 und Artikel-/Kategorieseiten) | `/teileklar`, `/teileklar/shop`, `…/kategorien`, `…/werkstatt`, `…/fahrzeug-und-passung`, `…/termine`, `…/gutscheine`, `…/partner-werden`, `…/rechtliches`, `…/reifenrechner`, `…/batterie-berater`, `…/produkt/<id>`, `…/kategorie/<id>` | **gesperrt**, bis zusätzlich `NEXIFY_INDEXING_TEILEKLAR=enabled` |
| Anmeldung | `/anmelden`, `/registrieren`, `/passwort-vergessen`, `/passwort-zuruecksetzen` | immer gesperrt |
| Transaktion und Suche | `/teileklar/suche`, `…/warenkorb`, `…/kasse`, `…/bestellung/…`, `…/bestellungen` | immer gesperrt |
| Privat und intern | `/portal/*`, `/intern/*`, `/teileklar/konto`, `…/partnerportal`, `…/nachbarschaft`, `/teileklar/admin` | immer gesperrt |
| Sonstiges | `/offline`, `/api/*`, `/webhook/*`, `/teileklar/werkstatt/<id>`, jede unbekannte Adresse (404) | immer gesperrt |

## 5. Offene Gate-Bedingungen (Stand 14.11.2026)

Die sechs Prüfungen aus `config/site-map.json` (`publication_gate.required_reviews`) und das Gate aus `docs/09-final/07`:

| Bedingung | Stand | Beleg |
|---|---|---|
| `verified_operator_profile` | OFFEN | Impressum nennt live „Eenmanszaak“, KvK 90483944 und USt-IdNr.; `apps/site/src/Auth.tsx` nennt „B.V.“; Registerauszug fehlt (OF-03, `PROGRESS.md`) |
| `legal_texts_and_consumer_flow_where_applicable` | OFFEN | Rechtstexte sind „Entwurf 0.9“ (`AGENTS.md`); E1, E3, E4, E5, E6, E12 offen; `/ki-hinweise` und `/datenschutz` sind nach D-010 anzupassen |
| `authorized_catalog_and_prices` | OFFEN für TEILEKLAR | Shop-Dienst 503, kein freigegebener Preiskatalog; für die Agenturseiten ohne Preise nicht einschlägig |
| `runtime_auth_tenant_tests` | OFFEN | Konten laufen über den Shop-Dienst (503); betrifft keine indexierbare Seite |
| `cookie_media_processing_policy` | nicht geprüft | in dieser Arbeit nicht gemessen |
| `actual_route_and_CTA_validation` | erfüllt bis auf den Shop | `PROGRESS.md`: Live-Prüfung 323 Prüfungen, 2 Befunde (beide Shop-Dienst); Gleichmacher 0 Abweichungen (10:42 UTC) |
| Gate `docs/09-final/07` (Health, E3-Gegentests, Rollback-Plan, PASS im Log, Endabnahme) | kein PASS-Eintrag belegt | Rollback der Indexierung: Abschnitt 7 |

Mindestens zu entscheiden, bevor der Schalter gesetzt wird: (a) Rechtsform und Impressum sind richtig, (b) die
Rechtstexte dürfen in dieser Fassung öffentlich auffindbar sein, (c) welche Domain im Index stehen soll.

Zu (c): Alle vier Hosts antworten mit 200. Der Canonical zeigt überall auf `www.nexifyai.de` und fängt Dubletten ab;
sauberer ist ein 308 von Apex und `.cloud` auf `www.nexifyai.de` (Vorschlag 3 und 4 in
`docs/quality/seo-domain-vorschlag-2026-11-09.md`, Domain-Einstellung in Vercel, Freigabe des Inhabers).

## 6. Freigabe: wer, was, wo

Freigeben kann nur der Inhaber (Veröffentlichung, OF-18). Auslöser ist ausschließlich:

1. Zweig `claude/indexierung` über einen PR nach `main` bringen (Merge durch koordinierende Sitzung oder Inhaber).
2. Vercel, Team `nexify-projekte`, Projekt `…-ut7r` (`prj_lKQEWQKzjqq4Ifvmwy6dh1XCIgVR`) → Settings → Environment
   Variables: Name `NEXIFY_INDEXING`, Wert `enabled`, Umgebung **nur Production** (nicht Preview, nicht Development).
3. Production neu ausliefern (Redeploy). Ohne neue Auslieferung ändert sich nichts.

`NEXIFY_INDEXING_TEILEKLAR` wird **nicht** gesetzt, solange der Shop-Dienst 503 liefert.

## 7. Rückweg

Variable `NEXIFY_INDEXING` in Vercel entfernen (oder auf einen anderen Wert setzen) und Production neu ausliefern.
Danach tragen alle Seiten wieder `noindex, nofollow`. Bereits aufgenommene Seiten verschwinden erst beim nächsten
Besuch des Crawlers; schneller geht es über „Entfernen“ in der Search Console. `robots.txt` dabei nicht auf
`Disallow` stellen, sonst sieht der Crawler das `noindex` nicht.

## 8. Prüfschritte nach der Freigabe

```bash
# erwartet: 200, keine Zeile x-robots-tag, Meta "index, follow"
curl -sD - -o /tmp/s.html https://www.nexifyai.de/ | grep -i -E '^HTTP|x-robots-tag'; grep -o '<meta name="robots"[^>]*>' /tmp/s.html
# erwartet: x-robots-tag: noindex, nofollow
for u in https://www.nexifyai.de/anmelden https://www.nexifyai.de/teileklar https://www.nexifyai.de/portal/kunde \
         https://nexify-ai-finales-agentur-gesamtpro-one.vercel.app/; do curl -sD - -o /dev/null "$u" | grep -i x-robots-tag || echo "FEHLT: $u"; done
# erwartet: 28 Adressen, keine mit /teileklar
curl -s https://www.nexifyai.de/sitemap.xml | grep -o '<loc>[^<]*' | wc -l
```

Maßgeblich ist die strengere von Kopfzeile und Meta-Tag; beide prüfen. Danach in der Google Search Console die
Property `www.nexifyai.de` bestätigen, `https://www.nexifyai.de/sitemap.xml` einreichen, die Startseite per
URL-Prüfung testen („Indexierung zulässig: Ja“) und nach einigen Tagen den Bericht „Seiten“ auf „Durch noindex
ausgeschlossen“ prüfen (erwartet: nur Seiten der Sperrliste).

## 9. Bekannte Grenzen dieser Vorbereitung

- Meta-Tags sind unverändert (`page-seo.ts` und `layout.tsx` sind an Belege gebunden). Auf gesperrten Seiten kann
  das Meta-Tag deshalb `index, follow` zeigen; es gilt die Kopfzeile. Für die fünf Seiten mit eigener Route
  behoben: Abschnitt 11 (OA-164). `/teileklar` und `/teileklar/shop` tragen fest
  `noindex` aus dem Layout und bleiben auch mit dem Shop-Schalter gesperrt, bis ihre Metadaten ergänzt sind.
- TEILEKLAR-Seiten nennen im `<head>` hreflang für nl, fr und en, liefern aber nur deutschen Text (`lang="de"`);
  sieben davon setzen den Canonical auf `?lang=…`. Vor dem Shop-Schalter zu bereinigen.
- Die Sitemap wird beim Build erzeugt; der Shop-Schalter wirkt dort erst nach neuer Auslieferung. Solange der
  Hauptschalter aus ist, nennt sie weiter 28 gesperrte Adressen (Zustand wie bisher, nirgends eingereicht).
- Geprüft ist lokal (`next start` mit gesetztem Host), nicht auf Vercel. Ob Vercel den Host so übergibt wie lokal,
  zeigt erst Abschnitt 8 nach der Auslieferung; im Zweifel bleibt die Seite gesperrt, nicht offen.

## 10. Pins und Belege (nach `.claude/skills/nexify-belege-und-pins`)

`apps/web/proxy.ts` ist in zwei Browser-Belegen und im Register gebunden. Beide Harnesse sind am 14.11.2026 am festen
Commit `ddcb01f434f49fb2c547988c9ae4691d421ef8b6` (Zweig mit `main` `a8a5d66`) gelaufen: Node v22.23.4, Playwright 1.65.0,
Chromium 158.0.8127.18, davor `pnpm install --frozen-lockfile --ignore-scripts`,
`node apps/site/scripts/generate-public-data.mjs` und `pnpm --filter @nexify/web build` (ohne Installationsschalter), Exit 0.

| Lauf | Ergebnis | Beleg |
|---|---|---|
| `apps/web/auth/tests/browser-public-experience.mjs` (19:12 bis 19:14 UTC) | bestanden: 70 Routen, 10 private Hüllen, 20 Filmzeilen, 0 Fremdanfragen, 0 Seitenfehler | `evidence/consent-ui-2026-10-28/next-public.json`; alte Fassung unter `superseded/next-public.pre-indexierung-2026-11-14.json`; `check_consent_ui` besteht |
| `apps/site/tests/browser-workspace-read.mjs` (19:14 UTC) | bestanden: 4 Checks, 20 Negativsitzungen, dauerhafter Zustand unverändert | `evidence/workspace-read-2026-10-28/browser-workspace-read.json`; alte Fassung unter `superseded/browser-workspace-read.pre-indexierung-2026-11-14.json`; `check_workspace_read` besteht |

Nachgezogen in `config/acceptance-coverage.json` (`tools/_update_register_shas.py` nicht benutzt):

| Datei | alter Pin | neuer Pin | Belegart | Beleg |
|---|---|---|---|---|
| `apps/web/proxy.ts` | `c5acf79c8795…` | `aaf1245796ba…` | Browserlauf | beide Läufe oben binden die heutigen Bytes; der Public-Experience-Lauf fährt den gebauten Proxy für alle 70 Routen und prüft an den 10 privaten Hüllen `Cache-Control` und `X-Robots-Tag` |
| `evidence/consent-ui-2026-10-28/next-public.json` | `98c7f0da8cce…` | `42785bc15152…` | Browserlauf | neu erhobener Beleg |
| `evidence/workspace-read-2026-10-28/browser-workspace-read.json` | `8f6e1bdc142d…` | `aa94c75b5877…` | Browserlauf | neu erhobener Beleg |

Grenze der Belege: Keiner der beiden Harnesse prüft die neue Kopfzeile auf öffentlichen Seiten. Der Workspace-Lauf
bindet nur die Bytes von `proxy.ts` und führt den Proxy nicht aus. Das neue Verhalten selbst belegen
`apps/web/auth/tests/indexing.test.mjs`, `indexing-proxy.test.mjs` und die lokale Probe aus Abschnitt 9.

Das Regelmodul liegt bewusst unter `apps/web/auth/` neben `policy.ts`: `apps/web/lib` ist als Verzeichnis an den
Text-Resize-Beleg gebunden, jede neue Datei dort macht ihn ungültig. `apps/web/app/sitemap.ts` war schon vorher ohne
gültigen Pin und bleibt es (kein Lauf, der die Sitemap bindet).

## 11. Nachtrag OA-164: Meta-Tag der fünf Seiten folgt der Regel (14.11.2026, Zweig `claude/belege-runde-3`)

Befund: Auf `/agb`, `/avv`, `/widerruf`, `/teileklar/kategorien` und `/teileklar/werkstatt` stand im HTML fest
`<meta name="robots" content="index, follow">`, während `proxy.ts` dieselben Pfade per `X-Robots-Tag: noindex, nofollow`
sperrt (Abschnitt 2, letzter Absatz). Lokal nachgestellt an `main` `2396553`: alle fünf Seiten Meta `index, follow`,
Kopfzeile `noindex, nofollow`.

Änderung: Das Meta-Tag kommt aus derselben Entscheidung wie die Kopfzeile. `apps/web/auth/page-robots.ts` ruft
`indexingDecision` mit denselben Eingaben wie der Proxy (Pfad, Host und `X-Forwarded-Host` des Aufrufs, `process.env`,
Pfadliste aus `config/site-map.json`) und übersetzt das Ergebnis mit `robotsDirective` (`auth/indexing.ts`): gesperrt heißt
`noindex, nofollow`, frei heißt `index, follow`. Die drei Rechtsseiten nutzen `generateMetadata` statt fester `metadata`
(nur die Metadaten, kein Rechtstext geändert); die beiden TEILEKLAR-Seiten geben die Entscheidung an `routeMetadata`, das
kein festes `true` mehr annimmt (`false` = nie indexiert wie bisher). Eine Funktion für alle fünf Seiten. Das Modul liegt
neben `indexing.ts` und nicht unter `apps/web/lib`, weil `lib/` als Verzeichnis an den Text-Resize-Beleg gebunden ist.

Hostprüfung: Die fünf Seiten werden je Aufruf gerendert (`app/layout.tsx` liest Kopfzeilen und Cookies; der Build führt
sie als `ƒ`, an `main` wie im Zweig). Der Host ist deshalb bekannt und wird auch im Meta-Tag geprüft. Würden sie statisch
gebaut, kennte das Meta-Tag den Host nicht; die Hostprüfung läge dann allein in der Kopfzeile. Das ist heute nicht der Fall.

Lokale Probe (`next start`, Build des Zweigs, Kopfzeile `Host` gesetzt):

| Umgebung | Host | fünf Seiten: Meta | Kopfzeile |
|---|---|---|---|
| ohne Schalter | `127.0.0.1` und `www.nexifyai.de` | `noindex, nofollow` | `noindex, nofollow` |
| `NEXIFY_INDEXING=enabled`, `VERCEL_ENV=production` | `127.0.0.1` | `noindex, nofollow` | `noindex, nofollow` |
| dasselbe | `www.nexifyai.de` | Recht `index, follow`; TEILEKLAR `noindex, nofollow` | Recht keine; TEILEKLAR `noindex, nofollow` |
| zusätzlich `NEXIFY_INDEXING_TEILEKLAR=enabled` | `www.nexifyai.de` | `index, follow` | keine |

Tests: `apps/web/auth/tests/indexing-meta.test.mjs` (8 Tests: Übersetzung der Entscheidung, beide Schalterzustände je Seite,
falscher Host und Vorschau, 210 Kombinationen aus Seite, Umgebung und Host ohne Widerspruch, Bindung der Seitendateien an
`pageRobots`, kein festes `index` in Seitendateien und `routeMetadata`). `tests/test_seo_metadata.py` ist unverändert und grün.

Grenze: Die Katalogseiten aus `pageMetadata` folgen im Meta-Tag weiter nur `NEXIFY_INDEXING`. Mit Schalter, aber falschem
Host oder für `/teileklar` ohne Shop-Schalter zeigen sie `index, follow` bei gesperrender Kopfzeile (lokal gesehen an
`/impressum` mit Host `127.0.0.1`). Es gilt die strengere Kopfzeile; ohne Schalter tritt der Fall nicht auf.
`page-seo.ts` Zeile 18 nennt das jetzt ausdrücklich.

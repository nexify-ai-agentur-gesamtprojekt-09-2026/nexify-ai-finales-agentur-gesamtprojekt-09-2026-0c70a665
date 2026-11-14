---
name: nexify-klon-fabrik
description: Seiten und Abschnitte für nexifyai.de und TEILEKLAR ausschließlich aus den vorhandenen Bausteinen der Startseite zusammensetzen und vor jeder Auslieferung gegen die Startseite messen. Verwenden bei jeder neuen Seite, jedem neuen Abschnitt, jedem Hero, Film, Schalter oder jeder Kopf- und Fußzeile in apps/web, und immer dann, wenn eine Seite „anders aussieht" als die Startseite.
---

# Klon-Fabrik und Gleichmacher

Inhabervorgabe vom 14.11.2026: Die Startseite `/` ist die einzige fertige Referenz. Jede andere Seite verwendet deren Bausteine wieder. Nachbauen und Wertekopien sind Fehler, auch wenn das Ergebnis gleich aussieht, weil die nächste Änderung an der Startseite die Kopie nicht mehr erreicht.

`AGENTS.md` und `CLAUDE.md` gelten unverändert. Dieser Skill ersetzt keine ihrer Regeln.

## Inventar

Nur diese Bausteine verwenden. Fehlt einer, zuerst den Inhaber fragen, statt einen neuen zu bauen.

| Bedarf | Baustein | Datei |
|---|---|---|
| Kopfbereich einer Seite | `HeroStage` | `apps/web/components/IdentityHero.tsx` |
| Film, Poster, Untertitel, Lautstärke | `AtelierFilm` | `apps/web/components/AtelierFilm.tsx` |
| Filmrahmen mit Bedienleiste und Film-Schaltern | `AtelierFilm hero` in der Einbettung der Startseite: `identity-media` > `figure.identity-hero-photo` > `AtelierFilm`; außerhalb von Hero und Galerie-Karte die umgebende Klasse in die `:is(.identity-hero,.hc-gallery-card,…)`-Selektoren von `AtelierSystem.css` aufnehmen | `apps/web/components/AtelierFilm.tsx` |
| Schalter mit Linkziel | `ActionLink` | `apps/web/components/ActionControl` |
| Schalter mit Aktion | `ActionButton` | `apps/web/components/ActionControl` |
| Absendeschalter eines Formulars | `ActionButton variant="primary"` mit `className="hc-finish-primary"` und `type="submit"` | `apps/web/components/ActionControl` |
| Eingabefeld mit Beschriftung | `div.tk-field` oder `label.tk-field` mit `label` und `input`/`textarea` in der Hülle `pc-supplement` (Konto: `nx-konto-blatt`); die Stile stehen einmal in `PageConcept.css` | `apps/web/components/PageConcept.css` |
| Kopfleiste, Fußzeile | `SiteNavigation`, `SiteFooter` | `apps/web/components/` |
| Abstände, Farben, Radien | Tokens `--as-s-*` und die Werte aus `config/design-tokens.json` | — |

## Vorgehen

1. **Original suchen.** Das Element auf der Startseite finden (`apps/web/components/HomeContent.tsx`, `IdentityHero.tsx`) und seinen Baustein aus der Tabelle bestimmen.
2. **Klonen heißt aufrufen.** Den Baustein importieren und nur die Parameter setzen: Text, Linkziel, Filmquelle, Test-ID. Kein kopiertes Markup, keine kopierten Klassenlisten.
3. **Hülle übernehmen.** Die Stile der Startseite hängen an der Hülle `home-concept` (Unterseiten zusätzlich `page-concept`). Ohne diese Hülle greifen sie nicht.
4. **Stile teilen, nicht duplizieren.** Braucht ein zweiter Ort dieselben Stile, den Selektor in `apps/web/components/AtelierSystem.css` zu `:is(.original, .neu)` erweitern. Keine zweite Regel mit denselben Werten.
5. **Besonderheiten.**
   - Nur der Film im Hero der Startseite startet von selbst. Jeder andere `AtelierFilm` bekommt `autostart:false`.
   - Texte mit Preisbezug nur aus `config/fakten.json` und `config/api-prepaid.json`.
   - Vorhandene `data-testid` bleiben erhalten.
   - Kundenmarken (zum Beispiel Studienkolleg Aachen) bekommen die NeXify-Gestaltung nicht ungeprüft.

## Gleichmacher: Pflicht vor jeder Auslieferung

Lokal bauen und starten, dann messen. Vor jedem Neubau zuerst den eigenen alten Server beenden:

```bash
ss -ltnp | grep ':3311 '
kill <pid aus der Zeile darüber>
```

Läuft der alte `next-server` weiter, während `next build` die Ausgabe ersetzt, liefert er die neuen Seiten mit Verweisen auf Stylesheets, die er nicht mehr findet: Die Seite kommt ohne Stil, und Gleichmacher und Live-Check melden Abweichungen in großer Zahl, die keine sind (Bericht vom 14.11.2026, nicht nachgemessen). Beendet wird nur der Prozess am eigenen Port, anhand seiner Prozessnummer. Kein `pkill next`, kein `killall node`: Andere Worktrees lassen eigene Server laufen, und die gehören deren Sitzungen. Ist der eigene Port von einem fremden Prozess belegt (`readlink /proc/<pid>/cwd` zeigt einen anderen Worktree), einen anderen Port nehmen.

```bash
node apps/web/scripts/generate-public-data.mjs
cd apps/web && npx next build && npx next start -p 3311
```

Zur Sicherheit vor der Messung einmal prüfen, dass der Server den neuen Stand mit Stil liefert: Die Startseite antwortet mit 200, und das erste in ihr verlinkte Stylesheet unter `/_next/static/` ebenfalls.

```bash
node tools/gleichmacher.mjs http://localhost:3311
```

```bash
node tools/live-check.mjs http://localhost:3311
```

`tools/gleichmacher.mjs` lädt jede verlinkte Seite im echten Browser und vergleicht die berechneten Stile der gemeinsamen Bausteine mit der Startseite, bei 390 und 1440 px. Exit 0 heißt: keine Abweichung. Jeder Befund nennt Baustein, Eigenschaft, Norm und Istwert.

Ein Befund wird an der Ursache behoben: Die Seite verwendet den Baustein oder seine Hülle nicht richtig. Nicht zulässig sind ein Überschreiben mit festen Werten, eine Ausnahme im Prüfskript oder das Entfernen des Bausteins aus der Prüfliste.

Danach die Gates aus `AGENTS.md`: `make check`, `node tools/ds-audit-cli.js`, `node tools/lint.mjs`, `node apps/web/scripts/atelier-literale.mjs`.

## Stand (14.11.2026, gegen nexifyai.de)

44 Seiten, 0 Abweichungen. Geprüft werden elf Bausteine: Hero-Titel, Akzent, Hero-Text, primärer Hero-Schalter, Kopfleiste, Logo, Fußzeile, Fußzeilen-Link, Abschnitts-Titel, Text-Schalter und Abschluss-Schalter.

Seit dem Befund zu `/anmelden` (14.11.2026, abweichender Filmrahmen und andere Schalter) kommen dazu: Filmrahmen, Filmbild, Film-Bedienleiste, Film-Schalter, Eingabefeld und Eingabefeld-Beschriftung, neben dem Absendeschalter. Die Film-Selektoren treffen jeden Film im Seiteninhalt, auch einen nachgebauten. Eingabefelder gibt es auf der Startseite nicht; ihre Norm ist das Kontaktformular (`/kontakt`, zweite Normseite, am Baustein in `tools/gleichmacher.mjs` vermerkt). Vor der Umstellung meldete das erweiterte Werkzeug 188 Abweichungen auf zehn Seiten, danach 0.

Seit dem 14.11.2026 kommt als zwölfter Baustein der Absendeschalter von Formularen dazu (`.home-concept form button[type="submit"]`). Die Startseite hat kein Formular; er wird deshalb gegen den Abschluss-Schalter der Startseite gemessen. Lokal gegen den Stand dieses Commits: 44 Seiten, 0 Abweichungen, einschließlich der Kontakt-, Such- und Konto-Formulare. Auf dem Konto-Blatt (`AuthForms.tsx`) ist der Absendeschalter der Abschluss-Schalter und der Google-Schalter der Text-Schalter der Startseite; die Konto-Regeln legen nur noch Breite und Anordnung fest. Die Startseite hat keinen eigenen sekundären Schalter neben dem primären, ihr zweiter Schalter ist der Text-Schalter.

Seit dem 14.11.2026 (Register OA-052, D-012) stehen auch die Karten in der Prüfliste: Detailkarte geschlossen und aufgeklappt (`.hc-service-detail`), Ablaufkarte (`.hc-process>ol>li`), Galerie-Karte, Angebots-, Kosten- und Satzkarte sowie die Abschluss-Fläche (`.hc-finish`). Verglichen wird das Material der Fläche (Form, Grund, Kante, Tiefe, Innenabstand), nicht Inhalt und Größe. Die Satzkarte (`.hc-rate`) kommt heute nur einmal auf der Startseite vor; sie hat noch kein zweites Vorkommen zum Vergleich. Die Ausgabe nennt je Baustein die Zahl der Vergleiche (`jeBaustein`); 0 heißt: gelistet, aber ohne Vergleichspartner.

Dazu kommen der Abschlussbereich und der Chat-Hinweis. `Abschluss-Schalterliste` (`.hc-finish-actions` ab zwei Schaltern, PR 173) hat `/kontakt` als Normseite, `Chat-Hinweis` (Hinweis unter der Chat-Eingabe, PR 172) die Startseite; er wird auch bei geschlossener Scheibe gemessen.

**Feste Regeln.** Ein Vergleich gegen eine Normseite bleibt still, wenn ein Rückfall alle Seiten zugleich trifft. Deshalb prüft der Gleichmacher drei Regeln auf jeder Seite, auch auf der Normseite:

| Regel | Bedingung |
|---|---|
| Abschluss-Schalterliste | Ab zwei Schaltern: alle gleich breit, eine linke Kante, zwischen ihnen genau der Abstandswert der Liste, genau ein Hauptschalter (`.hc-finish-primary`), und er steht nach seiner Lage an erster Stelle. |
| Chat-Hinweis | Die Schriftgröße ist die kleinste Schriftstufe (`--as-t-12`); der Sollwert wird im Browser aus dem Token gelesen. |
| Kopfleiste der Marke | Jede Seite trägt genau eine sichtbare Kopfleiste: unter `/teileklar` die Shop-Kopfleiste, sonst `.site-header`. |

**TEILEKLAR.** Die Shop-Marke hat bewusst eine eigene Kopfleiste (`CommerceHeader`, in `Workspace.tsx` statt `.site-header` gesetzt; `docs/01-konzept/cd-2026-bildschirm.md`: TEILEKLAR behält die eigene Marke). Sie wird nicht gegen die NeXify-Kopfleiste gemessen, sondern innerhalb der Marke: Normseite ist `/teileklar`, verglichen werden zehn Bausteine der Shop-Kopfleiste (Leiste, Dienstzeile, Hauptzeile, Wortmarke, Suchfeld, Suchschalter, Konto-Links, Navigation, Navigations-Link, aktiver Navigations-Link) auf jeder Seite unter `/teileklar`. `tools/live-check.mjs` misst die Geometrie beim Blättern weiterhin nur an `.site-header`.

Stand dieser Erweiterung: lokal 44 Seiten, 31.497 Vergleiche, 0 Abweichungen (zwei Läufe); gegen nexifyai.de am 14.11.2026, 20:04 UTC: 44 Seiten, 31.553 Vergleiche, 0 Abweichungen. Gegenprobe: Jeder neue Messpunkt und jede Regel schlägt an, wenn der Wert im Testbrowser verstellt wird; die Satzkarte ausgenommen (kein zweites Vorkommen).

Gemessen wird überall mit geschlossener Chat-Scheibe. Die Scheibe öffnet sich ab 1200 px nur auf NeXify-Seiten von selbst und macht den Inhalt schmaler; weil die Schriftgröße mit der Behälterbreite wächst, sähe ein Vergleich mit gemischtem Zustand wie eine Abweichung aus. Der erste Lauf des Werkzeugs meldete deshalb 70 Abweichungen im Shop, die keine waren.

## Nach dem Merge: Live-Nachprüfung

Pflicht nach jedem Merge auf `main`, der `apps/web`, `apps/shop-api`, Seitentexte, Tokens oder die Auslieferung berührt. Ein gemergter PR und ein grüner Build sind kein Livegang (`AGENTS.md`, „Umsatz zuerst“).

1. **Auslieferung des Merge-Commits abwarten.** Der Commit-Status des Produktionsprojekts muss für genau diesen Commit „success“ zeigen; im Vercel-Projekt entspricht das dem Zustand READY der Bereitstellung.

   ```bash
   gh api repos/{owner}/{repo}/commits/<merge-sha>/status --jq '.statuses[] | [.context, .state] | @tsv'
   ```

   Maßgeblich sind die Zeilen der Projekte `…-ut7r` und `…-s4k5`. Steht dort noch „pending“, misst man den alten Stand. Fehlmeldungen der verwaisten Projekte zählen nicht (`nexify-zweig-und-pr`, „Bekannte Lage“).

2. **Beide Werkzeuge gegen die Produktion**, nur lesend:

   ```bash
   node tools/live-check.mjs https://nexifyai.de
   node tools/gleichmacher.mjs https://nexifyai.de
   ```

   Vergleichswerte vom 14.11.2026: Live-Check 329 Prüfungen mit 2 bekannten Befunden, beide vom nicht gebundenen Shop-Dienst (laut PR 188 lokal gemessen; in `PROGRESS.md` als „laut PR“ geführt); Gleichmacher 44 Seiten, 31.553 Vergleiche, 0 Abweichungen (gegen nexifyai.de, 20:04 UTC, siehe „Stand“ oben). Verglichen wird wie bei den Python-Tests: Befunde namentlich gegen die bekannten halten, nicht die Zahl. Zwei Befunde sind nur dann „wie vorher“, wenn es dieselben zwei sind. Ändert sich die Zahl der Prüfungen oder Seiten, den Grund nennen (neue Seite, neuer Messpunkt).

3. **Den geänderten Weg gezielt im Browser gehen**, auf der Produktion, mit abgefangenen schreibenden Anfragen. Die Werkzeuge aus Schritt 2 prüfen Bausteine und Regeln, nicht den einzelnen Ablauf, den der PR geändert hat. Damit dabei nichts Echtes gesendet, gespeichert oder bestellt wird, fängt der Lauf jede Anfrage ab, die nicht `GET` oder `HEAD` ist, und beantwortet sie selbst:

   ```js
   await page.route('**/*', route => {
     const m = route.request().method();
     if (m === 'GET' || m === 'HEAD') return route.continue();
     gesendet.push({ url: route.request().url(), methode: m });
     return route.fulfill({ status: 503, contentType: 'application/json', body: '{"abgefangen":true}' });
   });
   ```

   Vorbild im Repository: `apps/web/auth/tests/browser-public-experience.mjs` (bricht fremde Ursprünge und alles außer `GET`/`HEAD` ab und zählt beides). Der Bericht nennt Adresse, Uhrzeit in UTC, die Schritte, das Gesehene und die Liste der abgefangenen Anfragen. Ohne Abfangen wird auf der Produktion kein Formular abgesendet.

4. **Protokolle richtig lesen.** „Keine Fehler in den Vercel-Protokollen“ ist nur dann ein Beleg, wenn im betrachteten Zeitfenster überhaupt Zeilen für den geänderten Weg vorliegen. Ein leeres Fenster belegt, dass niemand den Weg aufgerufen hat, nicht dass er funktioniert. Deshalb erst Schritt 3 gehen, dann das Fenster ab diesem Zeitpunkt lesen und die Zahl der Zeilen nennen.

5. Ergebnis mit Commit und Uhrzeit an `nexify-stand-halten`. Ein neuer Befund ist ein Befund für den Bericht und den Verantwortlichen des PR, kein Anlass für eine Ausnahme im Werkzeug.

### Formular- und Empfängerwege

„Keine Fehlermeldung“ heißt nicht „kommt an“. Ein Formular kann absenden, eine freundliche Bestätigung zeigen und trotzdem nichts zustellen, wenn der Empfänger hinter der Adresse nicht läuft. Befund vom 14.11.2026: Über vier Formulare kam keine Anfrage an, weil `POST /api/requests` am Laufzeit-Gate des Shop-Dienstes abgewiesen wurde (`docs/04-betrieb/anfrageweg-befund-2026-11-14.md`).

Deshalb zu jedem Formularweg den Empfänger selbst fragen, mit leerem Körper, einmal:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'content-type: application/json' -d '{}' https://nexifyai.de/api/requests
```

| Antwort | Bedeutung |
|---|---|
| `400` oder `422` | Der Empfänger läuft und prüft die Eingabe: Er hat den leeren Körper gelesen und abgelehnt. Gespeichert wird dabei nichts. |
| `503` vom Laufzeit-Gate (`runtime_binding_unavailable`) | Der Empfänger läuft nicht. Kein Formular auf diesem Weg kommt an, gleich was die Oberfläche zeigt. |
| `403` (`origin_rejected`) | Abgewiesen vor jeder Verarbeitung; mit der Herkunft der Seite wiederholen, bevor ein Urteil fällt. |
| `200` oder `201` auf einen leeren Körper | Der Empfänger prüft nicht. Befund, und nicht wiederholen: Es könnte ein leerer Eintrag entstanden sein. |
| `404`, `405`, HTML statt JSON | Die Adresse führt nicht zum Empfänger. |

Ein `400`/`422` belegt nur, dass der Empfänger läuft und prüft. Ob eine gültige Anfrage beim Inhaber ankommt (Speicherung, Benachrichtigung, Postfach), belegt erst ein Durchlauf mit einer als Test gekennzeichneten Anfrage, den der Inhaber freigibt und dessen Eingang er bestätigt. Bis dahin steht die Zustellung als OFFEN. Nur an eigenen Adressen; fremde Seiten nach `nexify-kundenprojekt`, Regel 5.

## Neuen Baustein in die Prüfung aufnehmen

Entsteht mit Freigabe des Inhabers ein neuer gemeinsamer Baustein, im selben Commit:

1. Zeile in der Inventar-Tabelle oben ergänzen.
2. Eintrag in `BAUSTEINE` in `tools/gleichmacher.mjs` ergänzen (Name und Selektor). Kommt der Baustein auf der Startseite nicht vor, als `[Selektor, Norm-Baustein]` eintragen: verglichen wird dann mit dem genannten Baustein der Startseite. Hat er auch dort kein Gegenstück, eine zweite Normseite angeben (`seite`); Bausteine der Marke TEILEKLAR bekommen `/teileklar`. Ein Schalter trägt „Schalter“ im Namen, sonst zählt seine Mindesthöhe nicht.
3. Gegenprobe: den Wert auf einer Seite absichtlich verstellen und prüfen, dass der Gleichmacher genau diesen Baustein meldet. Ein Messpunkt gilt erst, wenn er dabei anschlägt; ein Baustein, der nie anschlägt, prüft nichts. Zwei Wege, beide ohne Änderung am Quelltext der Seite:
   - im Testbrowser den berechneten Wert des Elements überschreiben und das Messwerkzeug im selben Browser laufen lassen;
   - einen lokalen Proxy vor den lokalen Build stellen, der in die Antwort einer einzelnen Seite eine Stilregel einspritzt, und `node tools/gleichmacher.mjs <proxy-url>` unverändert dagegen laufen lassen (so die Gegenproben zu PR 188 laut Bericht vom 14.11.2026, nicht nachgemessen; die PR-Beschreibung nennt 82 gezielt ausgelöste Abweichungen und 377 beim Rückfall auf allen Seiten).

   Zwei Gegenproben je Messpunkt: eine einzelne Seite verstellt (der Vergleich gegen die Normseite muss anschlagen) und, bei festen Regeln, alle Seiten zugleich verstellt (die Regel muss anschlagen, obwohl der Vergleich still bleibt). Der Proxy und die verstellte Seite werden nie ausgeliefert und nicht eingecheckt.
4. Messpunkte ohne Vergleichspartner ausdrücklich nennen, im PR und im Abschnitt „Stand“: In der Ausgabe stehen sie unter `jeBaustein` mit 0 Vergleichen. Sie sind gelistet, prüfen aber nichts, und eine Gegenprobe ist für sie nicht möglich (Stand 14.11.2026: die Satzkarte). „0 Abweichungen“ sagt über sie nichts aus.

## Mobil und PWA

Stand 14.11.2026. `apps/web` liefert ein Manifest (`/manifest.webmanifest`), einen kleinen handgeschriebenen Worker (`apps/web/pwa/worker.js`, ausgeliefert als `/public-install-worker.js`) und die Offline-Seite `/offline` (aus `HeroStage`, `ActionButton`, `ActionLink`; Texte in `apps/web/lib/offline-copy.ts`). Alles drei gibt es nur im Build mit `NEXIFY_PUBLIC_INSTALLATION=public-pwa`; ohne den Schalter entfernt die Seite eine vorhandene eigene Registrierung samt eigener Caches wieder.

Cache-Grenzen des Workers. Sie werden nicht aufgeweicht; wer mehr speichern will, braucht die Freigabe des Inhabers und einen Vertrag über Daten, Rechte und Löschung.

- **Cache-zuerst nur für statische Dateien:** `/_next/static/**`, `/fonts/**`, `/brand/**`, `/glass/**` und die Icons. Die Cache-Namen tragen die Build-Version.
- **Einzige gespeicherte Seite ist `/offline`** (Deutsch bei der Installation, weitere Sprachen erst bei Nutzung), ohne Cookies abgerufen. Jede andere Seite kommt immer aus dem Netz; ohne Netz erscheint die Offline-Seite mit Status 503, nie ein alter Stand der angefragten Seite.
- **Nie beantwortet und nie gespeichert:** `/api/**`, `/webhook/**`, Anmeldung, Registrierung, Passwort, Konto, Warenkorb, Kasse, Bestellungen, Portale und `/intern` (Liste `PRIVATE_PREFIXES`); alles außer `GET`; fremde Ursprünge; Bereichsanfragen und Filme (`/media/**`); Seitendaten (`?_rsc=`).
- **Nie gespeichert:** Antworten mit `Cache-Control: no-store` oder `private`, mit `Set-Cookie`, mit anderem Status als 200, umgeleitete und fremde Antworten.
- **Kein `skipWaiting`, kein `clients.claim`:** ein neuer Worker übernimmt erst, wenn alle Fenster geschlossen sind, und räumt dann nur Caches mit dem eigenen Präfix `nexify-public-` ab.
- **Kein Push, keine Hintergrund-Synchronisierung, kein eigener Installations-Dialog.** Der Worker setzt kein Cookie und keine Kennung.
- Registriert wird nur im Produktions-Build und nicht im Datensparmodus (`Save-Data`).
- TEILEKLAR ist eine eigene Marke ohne eigenes App-Icon: Seiten unter `/teileklar` verlinken das Manifest nicht und bekommen offline einen schlichten eigenen Hinweis statt der NeXify-Offline-Seite.

Kommt ein neuer Pfad mit Sitzung, Konto oder Zahlung dazu, im selben Commit `PRIVATE_PREFIXES` in `apps/web/pwa/worker.js` ergänzen.

Prüfen:

```bash
cd apps/web && node --test auth/tests/pwa-worker.test.mjs
```

```bash
node apps/web/auth/tests/browser-pwa-offline.mjs http://localhost:3311
```

`tools/live-check.mjs` prüft lesend Manifest, Icons, Worker-Datei, Offline-Seite und den Manifest-Verweis im Kopf.

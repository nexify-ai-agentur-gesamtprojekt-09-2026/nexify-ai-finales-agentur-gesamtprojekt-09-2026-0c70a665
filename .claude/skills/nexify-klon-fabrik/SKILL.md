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

Lokal bauen und starten, dann messen:

```bash
cd apps/web && npx next build && npx next start -p 3311
```

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

Gemessen wird überall mit geschlossener Chat-Scheibe. Die Scheibe öffnet sich ab 1200 px nur auf NeXify-Seiten von selbst und macht den Inhalt schmaler; weil die Schriftgröße mit der Behälterbreite wächst, sähe ein Vergleich mit gemischtem Zustand wie eine Abweichung aus. Der erste Lauf des Werkzeugs meldete deshalb 70 Abweichungen im Shop, die keine waren.

## Neuen Baustein in die Prüfung aufnehmen

Entsteht mit Freigabe des Inhabers ein neuer gemeinsamer Baustein, im selben Commit:

1. Zeile in der Inventar-Tabelle oben ergänzen.
2. Eintrag in `BAUSTEINE` in `tools/gleichmacher.mjs` ergänzen (Name und Selektor). Kommt der Baustein auf der Startseite nicht vor, als `[Selektor, Norm-Baustein]` eintragen: verglichen wird dann mit dem genannten Baustein der Startseite.

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

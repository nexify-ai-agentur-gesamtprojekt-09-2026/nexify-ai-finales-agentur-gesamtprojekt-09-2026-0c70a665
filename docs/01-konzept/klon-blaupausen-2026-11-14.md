# Klon-Blaupausen · kundenneutrale Muster aus dem Bestand

**Stand 14.11.2026 · additiv.** Diese Blaupausen beschreiben, **wie** Seiten und
Abschnitte aus den vorhandenen Bausteinen der Startseite zusammengesetzt werden —
nicht welche Werte sie tragen. Sie folgen `.claude/skills/nexify-klon-fabrik` und
ersetzen keine seiner Regeln. `AGENTS.md` und `CLAUDE.md` gelten unverändert.

Zweck: Folgeprojekte und neue NeXify-Seiten sollen die bewährte Struktur und den
Ton übernehmen können, **ohne** Markup zu kopieren und **ohne** die
NeXify-Gestaltung ungeprüft auf eine Kundenmarke zu übertragen.

## Grundsatz (aus der Klon-Fabrik)

- **Klonen heißt aufrufen, nicht nachbauen.** Baustein importieren, nur Parameter
  setzen (Text, Linkziel, Filmquelle, Test-ID). Kein kopiertes Markup, keine
  kopierten Klassenlisten, keine Wertekopien (`nexify-klon-fabrik`, „Vorgehen").
- **Hülle übernehmen.** Stile hängen an `home-concept` (Unterseiten zusätzlich
  `page-concept`). Ohne Hülle greifen sie nicht.
- **Stile teilen, nicht duplizieren.** Zweiter Ort braucht dieselben Stile →
  Selektor in `apps/web/components/AtelierSystem.css` zu `:is(.alt, .neu)`
  erweitern. Keine zweite Regel mit denselben Werten.
- **Vor jeder Auslieferung messen:** `tools/gleichmacher.mjs` (0 Abweichungen),
  dann `tools/live-check.mjs` und die Gates aus `AGENTS.md`.

## Baustein-Inventar (Quelle der Blaupausen)

Nur diese Bausteine verwenden (Vollständige Tabelle: `nexify-klon-fabrik`,
„Inventar"):

| Bedarf | Baustein | Datei |
|---|---|---|
| Kopfbereich/Hero | `HeroStage` | `apps/web/components/IdentityHero.tsx` |
| Film + Bedienleiste | `AtelierFilm` | `apps/web/components/AtelierFilm.tsx` |
| Schalter mit Linkziel | `ActionLink` | `apps/web/components/ActionControl` |
| Schalter mit Aktion | `ActionButton` | `apps/web/components/ActionControl` |
| Absendeschalter | `ActionButton variant="primary"` + `hc-finish-primary` | `apps/web/components/ActionControl` |
| Eingabefeld + Beschriftung | `div.tk-field`/`label.tk-field` in `pc-supplement` | `apps/web/components/PageConcept.css` |
| Kopfleiste / Fußzeile | `SiteNavigation`, `SiteFooter` | `apps/web/components/` |
| Karten (Detail, Ablauf, Galerie, Angebot, Kosten) | `.hc-*` | `apps/web/components/HomeContent.tsx` |
| Abstände/Farben/Radien | Tokens `--as-*` / `config/design-tokens.json` | — |

## Seitentyp-Blaupausen

**Kopf- und Fußzeile sind Rahmen der Laufzeit, nicht Teil der Blaupause.**
`RootLayout` → `Workspace` (`apps/web/components/Workspace.tsx`) umschließt jede
`apps/web`-Route und rendert genau **eine** Kopfleiste (unter `/teileklar` die
`CommerceHeader`, sonst `.site-header` mit `SiteNavigation`) vor `<main>` und die
`SiteFooter` danach. Eine Seitenblaupause komponiert deshalb **nur den Inhalt
innerhalb von `<main>`** und fügt **keine** eigene Kopf-/Fußzeile ein — das
verletzte sonst die Ein-Kopfleisten-Regel des Gleichmachers (zwei Kopf-/Fußzeilen).

Jede Blaupause unten ist eine Reihenfolge von Bausteinen in der Hülle
`home-concept` (Unterseite zusätzlich `page-concept`), eingesetzt in `<main>`.
Reihenfolge und Auswahl sind generisch; Texte kommen aus
`config/site-map.json` / `config/home-concept-copy.json`
(`.claude/skills/nexify-seitentexte`).

1. **Landing / Produktseite.** `HeroStage` (optional `AtelierFilm` im Hero, aber
   **ohne Autostart** — `autostart:false`; nur der Hero-Film der Startseite `/`
   startet von selbst, `.claude/skills/nexify-klon-fabrik`) → ein bis mehrere
   Abschnitte aus Karten (`.hc-service-detail`, `.hc-process`, `.hc-gallery`) →
   Abschlussbereich `.hc-finish` mit genau einem Hauptschalter
   (`hc-finish-primary`).
2. **Informations-/Leistungsseite.** `HeroStage` (ohne Autostart-Film) →
   Textabschnitte mit `.hc-section-heading` und Lese-Zeilenlänge → optional
   Galerie-Karten → `.hc-finish`.
3. **Formularseite (Kontakt/Anfrage).** `HeroStage` → Formular in `pc-supplement`
   mit `tk-field`-Feldern und Absendeschalter
   (`ActionButton variant="primary" type="submit"` **mit**
   `className="hc-finish-primary"` — ohne diese Klasse greifen die geteilten
   Abschluss-Schalter-Selektoren nicht, und der Gleichmacher misst jeden
   Formular-Absendeschalter gegen den Abschluss-Schalter der Startseite). Normseite
   der Felder ist `/kontakt` (zweite Normseite des Gleichmachers). Empfängerweg
   getrennt prüfen (`nexify-klon-fabrik`, „Formular- und Empfängerwege").
4. **Konto-/Portalblatt.** `HeroStage` → Inhalt im `nx-konto-blatt` mit
   `tk-field`; Absendeschalter = Abschluss-Schalter, Zweitschalter = Text-Schalter
   der Startseite (`nexify-klon-fabrik`, „Stand").
5. **Film-/Galerieseite.** Jeder Film außerhalb des Startseiten-Heros bekommt
   `autostart:false`. Filmrahmen, -bild, -leiste und -schalter werden gegen den
   Hero-Film der Startseite gemessen.

## Komponentenmuster

- **Hero:** Titel (`.identity-hero h1`), Akzent (`.identity-title-accent`), Text
  (`.identity-body`), ein Primärschalter (`.identity-primary-link`). Figuren in
  jeder Breite vollständig; **kein** `object-fit: cover` auf der transparenten
  Dreier-Bühne (`AGENTS.md`).
- **Abschluss:** `.hc-finish` mit Titel; ab zwei Schaltern wird
  `.hc-finish-actions` zur Liste (gleich breit, eine linke Kante, genau ein
  Hauptschalter zuerst — feste Gleichmacher-Regel).
- **Karten:** Material (Form, Grund, Kante, Tiefe, Innenabstand) kommt aus dem
  Baustein; Inhalt und Größe sind frei. Nie das Material mit festen Werten
  überschreiben.
- **Kopf/Fuß:** genau eine sichtbare Kopfleiste je Seite; Claim im Fuß.

## Tonvorlagen

- **Hochwertig, locker, klar, vertrauensvoll** (siehe
  `docs/01-konzept/markenzeichen-2026-11-14.md`, Abschnitt 4).
- Kurze, konkrete Sätze; Zahlen in Mono; vier Sprachen mit identischem
  Schlüsselsatz (de Quelle, nl/fr Kopf/Fuß und Marktseiten).
- Keine erfundenen Referenzen/Messwerte; Beispiele kennzeichnen; nur erreichte
  Zustände zeigen (`AGENTS.md`, „Ehrlich bleiben").
- Keine Preise/Rechtstexte ohne Freigabe (D-017).

## Grenze: Kundenmarken (verbindlich)

Diese Blaupausen übertragen **Struktur und Ton**, nicht das NeXify-Aussehen. Für
Kundenprojekte gelten die Kundenvorgaben, nicht die NeXify-Tokens:

- **Studienkolleg Aachen:** kundenspezifische Vorgaben, **keine Videos**
  (`AGENTS.md`; `.claude/skills/nexify-kundenprojekt`). Die NeXify-Gestaltung
  wird hier nicht übernommen; Hero-Blaupausen mit Film entfallen.
- Kundenarbeit läuft in eigenen Repositories/Sitzungen; Kundendaten und
  Branding gehören nicht in dieses Repository (`AGENTS.md`;
  `config/source-boundaries.json`). Ähnliche Namen begründen keine gemeinsame
  Marke.
- **TEILEKLAR** ist eine eigene Shop-Marke mit eigener Kopfleiste
  (`CommerceHeader`); nicht gegen die NeXify-Kopfleiste messen, sondern innerhalb
  der Marke gegen `/teileklar`.

## Prüfung einer Blaupausen-Anwendung

1. Original-Baustein auf der Startseite finden, importieren, nur Parameter setzen.
2. Hülle `home-concept` (+ `page-concept`) übernehmen.
3. `node tools/gleichmacher.mjs http://localhost:3311` → 0 Abweichungen.
4. `node tools/live-check.mjs …`, dann `make check`, `node tools/ds-audit-cli.js`.
5. Bei Kundenmarke: `.claude/skills/nexify-kundenprojekt` zuerst; keine
   NeXify-Tokens ungeprüft übernehmen.

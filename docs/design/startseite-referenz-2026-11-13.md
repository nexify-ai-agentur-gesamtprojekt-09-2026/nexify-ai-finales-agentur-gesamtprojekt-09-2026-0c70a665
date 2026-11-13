# Startseite als Referenz · 13.11.2026

Auftrag des Inhabers Pascal Courbois (13.11.2026): Layout und Aufbau erhalten, hochwertig
ausführen (Glas, Tiefe/3D, 2D, Typografie, Abstände); die Startseite ist die Referenz, nach
der die übrigen Seiten nachgezogen werden.

**Status: im Quellcode umgesetzt und lokal geprüft. Nicht ausgeliefert, nicht abgenommen.**

## Umfang

- Neu: `apps/web/components/HomeReference.css` (nach `HomeConcept.css` geladen).
- Geändert: `HomeContent.tsx` (eine Importzeile), `IdentityHero.tsx` (Haupthandlung als
  Schaltfläche statt Textlink).
- **Nicht angefasst:** Chat-Spalte und Chat-Dateien (eigene Session, Zweig
  `claude/chat-ki-gefuehrt`), Kopf- und Fußleiste, Texte, Rechtstexte, Preise, Medien, Tokens.
- Aufbau, Reihenfolge der Abschnitte und Spaltenverhältnisse sind unverändert.

## Muster (gelten für alle Folgeseiten)

Alle Werte kommen aus `config/design-tokens.json`; im Stylesheet steht kein Farbwert.

| Nr. | Muster | Tokens | Wo auf der Startseite |
|---|---|---|---|
| R1 | Hauptüberschrift nie unter dem Minimum; Platz für Unterlängen | `typeHero.size`, `typeHero.leading` | Hero (ab 821 px Spaltenbreite): 45,6 px statt 37 px bei 1440 px |
| R2 | Film als Scheibe im Raum: leichte Drehung mit Perspektive, Bühnenlicht darunter, gerichteter Schatten nach rechts unten; richtet sich beim Zeigen oder Fokussieren gerade aus | `material.filmTurn`, `material.filmPerspective`, `gradient.atelierStage`, `material.shadow`, `shadow.atelierDepth` | Hero-Film |
| R3 | Genau eine Lime-Schaltfläche je Ansicht für die Haupthandlung, 48 px hoch | `gradient.buttonPrimaer`, `shadow.buttonPrimaer`, `target.min` | „Mit Oracle beginnen“ |
| R4 | Glasleiste: Milchglas mit 20 px Unschärfe, 1 px Lichtkante oben, Pillenform; mobil als 2-spaltiges Feld | `material.blur`, `material.veil`, `material.highlight`, `gradient.atelierGlass`, `material.shadowRaised` | Sprungmarken unter dem Hero |
| R5 | Abschnitte trennen sich durch eine feine Lichtlinie und einen Lichtfleck, nicht durch Kästen | `material.sectionDivider`, `material.sectionGlow` | alle Abschnitte außer dem Schluss |
| R6 | Bilder als gerahmte Scheiben mit Reflex; beim Zeigen hebt sich das Bild um 4 px und der Schatten wird tiefer | `material.shadowRaised`, `material.shadow`, `gradient.atelierReflection`, `motion.feedback` | drei Szenenkarten, vier Produktkarten |
| R7 | Gleichrangige Aussagen als Glaskarten; Schritte mit Zähler in Geist Mono | wie R4, `font.mono`, `radius.atelier` | „Sichtbarkeit“, „Zusammenarbeit“ |
| R8 | Inhaltskarten reagieren mit Schatten und Lichtkante, nicht mit Farbe | `material.shadow`, `color.atelier.glassEdge` | Leistungs- und Produktkarten |

Bewegung ist nur Rückmeldung (180 ms). Es gibt bewusst keine Einblend- oder Scroll-Animation:
`design_guidelines.md` §5.3 („Motion ist Zustand/Feedback, nicht Deko“) und die Entscheidung
gegen aufgesetzte Effekte in `nexify-creative-experience-2026-11-09.md`.

Barrierefreiheit: `prefers-reduced-motion` schaltet Drehung und Übergänge ab;
`prefers-reduced-transparency` und `prefers-contrast` ersetzen Glas durch eine deckende Fläche.

### Für die Chat-Session

Die Chat-Spalte behält Platz und Breite (`layout.panelWidth`). Für Flächen im Chat gelten R4
(Glas) und R8 (Rückmeldung); Themenvorschläge sollten als Pillen nach R4 statt als
unterstrichene Links erscheinen. Die Klassen aus `HomeReference.css` sind auf `.home-concept`
begrenzt und greifen nicht in die Chat-Spalte.

## Lokaler Nachweis (Chromium, `next start`, Stand `c226c92` + dieser Zweig)

| Prüfung | Ergebnis |
|---|---|
| `pnpm build`, `npx tsc --noEmit` in `apps/web` | erfolgreich |
| `tests.test_identity_hero`, `tests.test_public_surface_contract`, `tests.test_static_preview` | 17 Tests, alle bestanden |
| 1440 px und 390 px: horizontaler Überlauf | 0 px |
| Bedienziele auf der Startseite unter 44 px | keine |
| Film 1440 px | 542 × 307 px, 3D-Transformation aktiv; mobil ohne Drehung |
| Elemente mit Glas (`backdrop-filter`) in der Startseite | 11 (vorher 5 auf der ganzen Seite samt Chat) |
| Tastatur: Tab durch die ersten 12 Ziele | jedes mit sichtbarem Rahmen, 2 px |
| Reduced Motion | keine Drehung, Übergänge 0 s |

Bilder: `docs/design/belege/startseite-2026-11-13/`. Im Vorher-Bild der ganzen Seite fehlen
vier Produktbilder nur, weil die Aufnahme sie nicht nachgeladen hatte; das ist kein Unterschied.

**Nicht geprüft:** Safari, Firefox, echte Geräte, NL/FR/EN, Breiten zwischen 390 und 1440 px,
Kontrastmessung, Screenreader, `make check`, vollständige Testsuite. GitHub Actions laufen nicht.

## Offen

1. **Texte und KI-Kennzeichnungen unverändert.** Die über eine andere Session weitergereichte
   Entscheidung (KI-typische Formulierungen und sichtbare KI-Kennzeichnungen entfernen) hebt
   eine Grenze des Auftrags auf und betrifft Art. 50 der KI-Verordnung. Sie wird erst nach
   direkter Bestätigung des Inhabers umgesetzt, als eigenes Paket.
2. Bedienleiste des Films verdeckt mobil die Figuren in der Bildmitte (`AtelierFilm`, bestand vorher).
3. `config/acceptance-coverage.json` führt für `HomeContent.tsx` und `IdentityHero.tsx` Prüfsummen,
   die schon auf `main` nicht zum Dateistand passten. Nicht nachgezogen, weil der Abgleich vorher
   bereits abwich und kein lokal ausgeführter Test ihn prüft.

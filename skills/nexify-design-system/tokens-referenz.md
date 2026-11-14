# Token-Referenz (nur Namen und Zweck, keine Werte)

Werte stehen in `config/design-tokens.json`; Build: `node packages/tokens/build-tokens.mjs`.
Stand: Zweig `claude/atelier-fehlerbehebung`, 14.11.2026.

## Farben (`color.*`)

| Gruppe | Zweck |
| --- | --- |
| `graphit.*` | Grund- und Kartenflächen dunkel |
| `linie.fein/mittel/stark` | Trennlinien |
| `text.primaer/sekundaer/tertiaer/gedaempft/aufLime` | Textstufen; `aufLime` = Schrift auf Lime |
| `marke.limeSignal` | Kleines Funktionssignal (X im Logo, Live-Punkt), nie Fläche |
| `marke.lime/limeHell/limeDunkel/limeGruen/cyan` | Markenpalette |
| `semantik.erfolg/warnung/fehler/licht` | Zustände |
| `atelier.*` | Atelier-Material (canvas, surface, raised, platinum, glass, glassEdge, film*, pageGlow ...) |
| `dunkel.*` / `hell.*` | Themensatz: grund, ebene, flaeche, licht, schrift(+Neben/Leise), schatten, tag*, limeHandlung, limeSchein, aufLime |
| `identityScene.*`, `print.*` | Szenen- bzw. Druckfarben |

## Atelier-System (`atelierSystem.*`)

| Gruppe | Zweck |
| --- | --- |
| `radius.*` | schalter (Kapsel), flaeche, buehne, kachel, feld, klein |
| `raum.*` | Raster 4/8 (CSS: `--as-s-*`) |
| `schrift.*` | Größen, Zeilenhöhen, Gewichte (CSS: `--as-t-*`, `--as-z-*`) |
| `zeilenlaenge.kurz/lese/breit` | Maximale Zeilenlänge in em |
| `bewegung.kurve/schnell/ruhig` | Eine Kurve, zwei Dauern |
| `schalter.*` | Höhen der Schalter |
| `glas.*` | Unschärfe je Glasstärke, Sättigung |
| `tiefe.*` | Ebenenordnung (CSS: `--as-e-*`) |
| `logo.s/m/l` | Höhe der Logo-Figur |
| `rollbalken.*` | Breite, Griff, Abstand der Scrollbalken |
| `chat.*`, `kopf.*` | Breiten- und Höhenschwellen der Chat-Front und Kopfleiste |
| `schwelle.*` | Seitenschwellen (nur Nachweis) |

## Ältere Gruppen (Wurzel von `design-tokens.json`)

`typeHero/typeBody/typeSmall/typeSection/typeCard/typeDisplay/typeHome`, `type`, `space`,
`radius`, `breakpoint`, `container`, `shadow`, `gradient`, `motion`, `focus`, `material`,
`control`, `target`. Bei neuer Arbeit die `atelierSystem`-Gruppen bevorzugen.

## CSS-Kurznamen in `AtelierSystem.css`

`--as-ink/-2/-3` Textstufen · `--as-ground` Grund · `--as-lime`, `--as-signal`, `--as-accent` Lime-Rollen ·
`--as-glass-clear/mid/dense/solid`, `--as-front-body/-glanz/-kante/-licht` Glasstärken und Chat-Front ·
`--as-drop` < `--as-depth` < `--as-depth-raised` Tiefe · `--as-ambient` Raumlicht ·
`--as-scroll/-scroll-hover` Scrollbalken · `--ca-pad`, `--ca-fuss`, `--ca-lese` Chat-Maße.

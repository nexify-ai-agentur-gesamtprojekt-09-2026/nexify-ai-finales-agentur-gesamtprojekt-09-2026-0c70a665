# Startseite als Referenz · 13.11.2026

Auftrag des Inhabers Pascal Courbois (13.11.2026): Layout und Aufbau erhalten, hochwertig
ausführen (Glas, Tiefe/3D, 2D, Typografie, Abstände); die Startseite ist die Referenz, nach
der die übrigen Seiten nachgezogen werden.

**Status: im Quellcode umgesetzt und lokal geprüft. Nicht ausgeliefert, nicht abgenommen.**

## Umfang

- Neu: `apps/web/components/HomeReference.css` (nach `HomeConcept.css` geladen) und
  `apps/web/components/HomeEffects.tsx` (setzt nur CSS-Variablen und Klassen, keine Stile).
- Geändert: `HomeContent.tsx` (zwei Importe, eine Zeile), `IdentityHero.tsx` (Haupthandlung als
  Schaltfläche statt Textlink).
- **Nicht angefasst:** Chat-Spalte und Chat-Dateien (eigene Session, Zweig
  `claude/chat-ki-gefuehrt`), Kopf- und Fußleiste, Texte, Rechtstexte, Preise, Medien, Tokens.
- Aufbau und Reihenfolge der Abschnitte sind unverändert.

## Zwei Fassungen

Die erste Fassung (Commits `5d909db`, `8d697ac`) hielt sich an die zurückhaltenden Regeln der
älteren Dokumente und wurde als zu unauffällig zurückgewiesen (Rückmeldung des Inhabers,
weitergegeben über die übergeordnete Session: „Wo sind die Lichteffekte“). Die zweite Fassung
setzt Licht, Tiefe und Schalter sichtbar um.

**Bewusster Widerspruch zu älteren Vorgaben**, zugunsten des Auftrags vom 13.11.2026:

| Ältere Vorgabe | Quelle | Jetzt |
|---|---|---|
| „Motion ist Zustand/Feedback, nicht Deko“ | `design_guidelines.md` §5.3 | Lichtfelder ziehen langsam, Glanz läuft über Film und Schaltfläche, Abschnitte blenden ein |
| „Keine Neon-Glows“, Lime nie als Fläche | `design_guidelines.md` §3.2, Token `marke.limeSignal` | Lime als weiches Licht (höchstens 32 % Deckung in Schatten und Lichtfeldern); keine Lime-Flächen außer der Haupt-Schaltfläche |
| „Hairlines statt Schatten“, keine gestapelten Schatten | `design_guidelines.md` §11.2 | Glasflächen tragen gerichteten Schatten und Tiefenschatten übereinander |
| Aufgesetzte Effekte abgelehnt | `nexify-creative-experience-2026-11-09.md` | Zeigerlicht und Neigung auf Karten |

Der Inhaber sollte an der Vorschau entscheiden, ob das Maß stimmt; alles ist in einer Datei
regelbar (Variablen `--fx-turn`, `--fx-glow`, `--fx-reveal`).

**Tokens:** Es wurden keine neuen Tokens angelegt. Farben und Schatten kommen aus
`config/design-tokens.json`, teils als Mischung (`color-mix`) daraus. Nicht als Token vorhanden
und deshalb im Stylesheet gesetzt: Neigungswinkel (aus `material.filmTurn` × 12 = 6°, plus
2–4° Zeigerneigung), Deckungen der Lichtfelder, Dauer des Einblendens (0,7 s). Wenn die Fassung
bleibt, gehören diese Werte als Tokens nachgetragen.

## Muster (gelten für alle Folgeseiten)

| Nr. | Muster | Tokens | Wo auf der Startseite |
|---|---|---|---|
| R1 | Hauptüberschrift nie unter dem Minimum, Silberverlauf mit Platz für Unterlängen | `typeHero.size`, `gradient.atelierHeading` | Hero: 45,6 px statt 37 px bei 1440 px |
| R2 | Film als Glasscheibe im Raum: Glasrahmen in zwei Schichten, 6° Neigung mit Perspektive, Lime-Schein und Spiegelung am Boden, Lichtreflex zieht alle 7 s über das Glas, Scheibe folgt dem Zeiger | `material.film*`, `gradient.homeMediaRim`, `gradient.atelierGlass`, `shadow.atelierPanelDepth`, `motion.schimmer` | Hero-Film, 585 px breit (vorher 537) |
| R3 | Haupthandlung als plastischer Lime-Schalter: Verlauf, Lichtkante, Innenschatten, ziehender Glanz; hebt sich beim Zeigen, senkt sich beim Drücken | `marke.lime*`, `material.shadowRaised`, `motion.schimmer` | „Mit Oracle beginnen“, „Vorhaben schildern“ |
| R4 | Glasleiste mit Zeigerlicht | `material.blur`, `material.veil`, `material.highlight` | Sprungmarken |
| R5 | Abschnitte: Lichtlinie mit Lime-Kern, Lichtfeld abwechselnd links (Lime) und rechts (Silber) | `marke.lime`, `atelier.platinum` | alle Abschnitte |
| R6 | Bildscheiben mit Glasrahmen und Reflex; neigen sich zum Zeiger, Bild zoomt 4 % | `material.shadow`, `gradient.atelierReflection` | Szenen- und Produktbilder |
| R7 | Glaskarten in Schichten mit Facette; Schrittzähler als runde, leuchtende Marke | `gradient.atelierPanelFacet`, `shadow.well`, `font.mono` | Leistungen, Sichtbarkeit, Zusammenarbeit, Produkte, Kosten |
| R9 | Glas-Schalter mit fünf Zuständen (Ruhe, Zeigen, Drücken, Fokus, deaktiviert), mindestens 48 px | `material.*`, `shadow.well`, `control.*` | Kartenlinks, Sprungmarken, Filmsteuerung |
| R10 | Kulisse: zwei Lichtfelder (Lime, Silber) ziehen in 46 s hin und her | `motion.laufband`, `marke.lime`, `marke.cyan`, `atelier.platinum` | hinter der ganzen Seite |
| R11 | Lichtpunkt folgt dem Zeiger über Glasflächen | Variable `--fx-glow` | alle Glaskarten |
| R12 | Abschnitte und Karten blenden beim Scrollen ein, gestaffelt | Variable `--fx-reveal` | ganze Seite |

Technik: Bewegung nur über `transform`, `opacity` und `background-position`; Zeigerwerte werden
einmal je Bild gesetzt (`requestAnimationFrame`). Ohne Skript ist die Seite vollständig sichtbar.

Barrierefreiheit: Bei `prefers-reduced-motion` startet `HomeEffects` nicht und alle Animationen
stehen; `prefers-reduced-transparency` und `prefers-contrast` ersetzen Glas durch deckende Flächen.

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
| Film 1440 px | 585 px breit, 3D-Neigung aktiv; mobil ohne Neigung |
| Einblenden | nach Durchscrollen kein verborgenes Element; ohne Skript alles sichtbar (Regel greift nur mit `data-fx`) |
| Tastatur: Tab durch die ersten 12 Ziele | jedes mit sichtbarem Rahmen, 2 px |
| Reduced Motion | keine Drehung, Übergänge 0 s |
| NL, FR, EN je 1440 und 390 px; DE zusätzlich 320, 768, 1024 px | kein Überlauf, keine Bedienziele unter 44 px, keine abgeschnittenen Beschriftungen (320 px: Sprungmarken einspaltig) |
| Kontrast, gerechnet aus Token-Farben gegen die hellste Kartenfläche `#363A38` | Text primär 10,1 : 1, sekundär 9,2 : 1, tertiär 6,3 : 1, Silber (Zähler, Dachzeilen) 6,1 : 1, Schrift auf Lime 9,8 : 1 |

Bilder: `docs/design/belege/startseite-2026-11-13/`. Im Vorher-Bild der ganzen Seite fehlen
vier Produktbilder nur, weil die Aufnahme sie nicht nachgeladen hatte; das ist kein Unterschied.

Bekannte Grenze: Bei 1024 × 768 px (Chat-Spalte offen, Hero einspaltig) liegt die Schaltfläche
unter der ersten Ansicht; bei 390 × 844 und 768 × 1024 px ist sie sichtbar.

**Nicht geprüft:** Bildrate der Effekte (keine Messung, nur Bauweise), Ladezeit des Kopfes, Safari, Firefox, echte Geräte, Kontrast über dem Film und über Glas mit
durchscheinendem Hintergrund (nur gerechnet, nicht gemessen), Screenreader, `make check`,
vollständige Testsuite. GitHub Actions laufen nicht.

## Offen

1. **Texte und KI-Kennzeichnungen unverändert.** Die über eine andere Session weitergereichte
   Entscheidung (KI-typische Formulierungen und sichtbare KI-Kennzeichnungen entfernen) hebt
   eine Grenze des Auftrags auf und betrifft Art. 50 der KI-Verordnung. Sie wird erst nach
   direkter Bestätigung des Inhabers umgesetzt, als eigenes Paket.
2. Bedienleiste des Films verdeckt mobil die Figuren in der Bildmitte (`AtelierFilm`, bestand vorher).
3. `config/acceptance-coverage.json` führt für `HomeContent.tsx` und `IdentityHero.tsx` Prüfsummen,
   die schon auf `main` nicht zum Dateistand passten. Nicht nachgezogen, weil der Abgleich vorher
   bereits abwich und kein lokal ausgeführter Test ihn prüft.

# Atelier-System · Stand 14.11.2026

Arbeitsstand auf dem Zweig `claude/atelier-fehlerbehebung`. Nicht abgenommen, nicht in `main`.
Diese Seite beschreibt, was im Code steht – nicht, was noch geplant ist. Offene Punkte stehen am Ende.

## Wo es liegt

| Was | Datei |
| --- | --- |
| Gestaltung (eine Datei, jede Regel beginnt mit `#atelier`) | `apps/web/components/AtelierSystem.css` |
| Farb- und System-Tokens | `config/design-tokens.json` → `node packages/tokens/build-tokens.mjs` → `packages/tokens/tokens.css` |
| Thema am Wurzelelement, Cookie `nx-theme` | `apps/web/app/layout.tsx` |
| Hell/Dunkel-Schalter, Kantenbrechung (`#as-linse`), Scroll-Zustand | `apps/web/components/Workspace.tsx` |
| Verschiebungskarte für die Glaskante | `apps/web/public/glass/linse.svg` |
| Chat-Front | `apps/web/components/PublicOrientationChat.tsx` |

## Logik

- **Themen.** Dunkel ist Standard (Grund `color.dunkel.grund` = rgb(27,30,29)). Hell gibt es nur, wenn der Besucher es am Schalter wählt
  (`data-theme="light"` am `html`); `prefers-color-scheme` wird nicht ausgewertet. Beide Themen füllen denselben Satz `--as-*`.
- **Licht.** Eine Richtung, von oben links: Glanzlicht oben/links, Gegenrand unten/rechts, Schatten nach unten.
- **Glas.** Ein Material in Stärken: `--as-glass-clear` (Schalter), `--as-glass-mid` (Kacheln), `--as-glass-dense` (über Bild, Film, Text; Eingabe),
  `--as-glass-solid` (Menüs), `--as-front-body` (Chat-Front). In der Front liegt keine zweite brechende Schicht, nur Tönung und Kante.
- **Tiefe.** `--as-drop` < `--as-depth` < `--as-depth-raised`.
- **Form.** Schalter Kapsel, Fläche 28 px, Bühne 40 px (`atelierSystem.radius.*`).
- **Raum.** Raster 4/8 (`atelierSystem.raum.*`). Im Chat ist `--ca-pad` die Fluchtlinie der Flächen; Text sitzt 20 px dahinter.
- **Farbe.** Graphit trägt, Silbergrau ist Licht. Lime in drei Rollen: Signal (`marke.limeSignal`: X im Logo, Signalpunkte),
  Handlung (`color.<thema>.limeHandlung`: Körper der Haupthandlung), Schein (`limeSchein`: Licht unter dem Hauptschalter).
  Schrift auf Lime: `color.<thema>.aufLime`.
- **Schalter.** Ränge Haupt, Neben, Still, Symbol 48, Segmentleiste (innen gerade, außen rund). Zustände ohne Layoutsprung.
- **Bewegung.** Eine Kurve, zwei Dauern (`atelierSystem.bewegung.*`). `prefers-reduced-motion` schaltet Bewegung ab.
- **Text.** Keine Unterstreichung, weder in Ruhe noch beim Zeigen. Links im Fließtext: Hauptton und Gewicht 600.

## Prüfskripte (liegen im Arbeitsordner der Sitzung, nicht im Repo)

`kontrast.js` (Text gegen gerenderten Hintergrund, beide Themen), `strich.js` (Unterstreichungen = 0), `chat.js` (Zustände und Breiten der Front,
`/api/chat` wird im Browser beantwortet), `kopf.js`/`kopfbild.js` (Kopfleiste je Sprache), `shot.js`, `seite.js`, `bewegung.js`.

## Offen (Stand dieses Dokuments)

- Maße in `AtelierSystem.css` sind nur für Radien und Bewegung an Tokens gebunden; Abstände, Schriftstufen, Schatten und Glasstärken
  stehen weiter als Werte in den Variablenblöcken bzw. Regeln.
- Kein gemeinsamer React-Baustein für Schalter, Segmentleiste, Kachel; die Optik hängt an Klassen und `--as-*`.
- Ältere Regeln im oberen Teil der Datei überlagern sich weiterhin; die Gliederung nach Abschnitten ist nicht durchgezogen.
- Schrift-Pfeile („→") sind außerhalb der Chat-Eingabe nicht durch gezeichnete Zeichen ersetzt.
- Rückfallzustand des Chats: nur die Darstellung ist überarbeitet, nicht der Ablauf (Eingabe, Reihenfolge, Kartentexte).

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

## Zweiter Durchgang (14.11.2026, abends)

Alles Folgende steht in `AtelierSystem.css` ab der Marke „ZWEITER DURCHGANG" und in den genannten Bausteinen.

- **Tokens.** `atelierSystem` in `config/design-tokens.json` ergänzt um `schrift` (12 13 15 16 18 24, Zeilenhöhen, Gewichte), `glas`
  (Unschärfe je Stärke, Sättigung), `tiefe` (Ebenenordnung), `logo` (Höhen s/m/l), `rollbalken`, `schwelle`, weitere Radien und Räume.
  Kurznamen in der CSS: `--as-s-*` Raum, `--as-t-*` Schrift, `--as-z-*` Zeile, `--as-r-*` Radius, `--as-e-*` Ebene.
  Nachweis: `node apps/web/scripts/atelier-literale.mjs [--liste]` zählt Maßzahlen, die noch nicht aus Tokens kommen
  (Stand: 517 von 2811 Deklarationen, fast alle in den älteren Abschnitten; die neuen Abschnitte liegen bei 0 bis 6).
- **Logo.** `components/Logo.tsx`: Varianten `voll` / `ohne-claim` / `figur`, Größen `s` / `m` / `l`, beide Themen.
  Figur = eine Datei `public/brand/nexify-figur.png` (512 × 512, 1:1-Box), freigestellt aus dem gelieferten Bild mit
  `scripts/logo-freistellen.py` (Körper über Farbe, Hut als geometrische Maske, Saum aus der Innenfarbe). Die Vorlage trägt bei
  doppelter Dichte rund 100 px; größer wird die Figur nirgends gezeigt. Kommt das Original, wird nur diese Datei getauscht.
  Wortmarke und Claim sind Text; X = Signal-Lime (hell: Handlungs-Lime), Claim = `--as-ink-3`.
  Icons neu: `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico`, `public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.
  **Archiv:** das bisherige Bildzeichen (Blüte) liegt unverändert unter `apps/web/public/archiv/logo-bis-2026-11-13/`
  (`signet.svg`, `icon.svg`, `favicon.ico`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`).
- **Name.** `ORACLE_NAME` / `<OracleName/>` in `Logo.tsx`: „AIFly ORACLE" (Zeile 1) „with NeXify AI Intelligence by NeXify" (Zeile 2);
  im Chat in Kopfzone und beim Gastgeber. Arbeitsfassung, Endform bestätigt der Inhaber.
- **Zeichensatz.** `components/Zeichen.tsx` (Raster 24, Strich 1.5, Farbe = Textfarbe). Schrift-Pfeile in Chat, Navigation, Portal,
  Shop-Schaufenster und Problemwähler sind ersetzt.
- **Tiefe und Licht.** `--as-volume` (Dicke der Glaskörper), `--as-ambient` (Raumlicht hinter Film und Konto-Szene),
  `--as-front-licht` (zwei feste Lichtfelder hinter der Chat-Front), `--as-front-glanz`, `--as-front-kante`.
- **Chat-Front.** Die Brechung liegt in `#aifly-panel::before`; dadurch brechen Kopfzone und Eingabe den Verlauf wirklich
  (Glas in Glas bricht in Chromium sonst nicht). Der Verlauf läuft unter Kopfzone und Eingabe durch; `--ca-fuss` misst die Fußzone
  (`PublicOrientationChat.tsx`). Die Front ist Container in beiden Achsen: Breite schaltet schmal / mittel / breit (480, 640, 820),
  Höhe die Abstände (760, 960, 1200). Breit: Gastgeber links fest, eine Lesespalte rechts (`--ca-lese`).
  Mobil deckt das Blatt (keine Brechung der Seite dahinter).
- **Kopfleiste.** Beim Blättern je Seite um `--kopf-einzug` kürzer, 32 px Innenabstand, Volumenkante. Die Kantenbrechung über
  `#as-linse-leiste` ist vorbereitet, aber nicht aktiv: mit ihr blieb der Hintergrund unter der Leiste scharf und der Text unlesbar.
- **Rollbalken.** Abschnitt „Rollbalken": 10 px, Griff mit 3 px Abstand, runde Enden, beide Themen; Blink/WebKit über
  `::-webkit-scrollbar`, Firefox über `scrollbar-color`.
- **Film in Bildflächen.** `components/SceneLoop.tsx`: stumm, in Schleife, lädt und läuft nur im Sichtbereich, Ton nur auf Wahl,
  bei „weniger Bewegung" oder Datensparen nur das Bild. Eingebaut: drei Galerie-Karten der Startseite (Bemusterung, Fertigung,
  Logistik) und die Konto-Seiten (Tablet im Foyer). `pageVideos` enthält jetzt auch `tk-home` (Logistik).
- **Konto-Seiten.** `components/shop/AuthForms.tsx`: zweispaltige Bühne (`.nx-konto-*`), Formular als Glasfläche, Felder als Glas,
  Passwort-Anzeige, „oder", Nebenschalter Google, Seitentitel der Routen korrigiert.

## Offen (Stand dieses Dokuments)

- Die älteren Abschnitte von `AtelierSystem.css` (vor der Marke „ZWEITER DURCHGANG") tragen weiter Maßzahlen statt Tokens (siehe Nachweis-Skript)
  und überlagern sich; sie sind nicht neu gegliedert. Schattengeometrie und Glasverläufe stehen als Werte in den Themenblöcken.
- Kein gemeinsamer React-Baustein für Schalter, Segmentleiste, Glasfläche, Kachel, Abschnittskopf, Textlink; vorhanden sind Logo, Zeichen, SceneLoop.
- Werkstattblätter, Palettenblatt und Zeichenblatt fehlen. TEILEKLAR-Schaufenster und die Video-Leiste der Leistungsseiten sind im älteren Stil.
- Schriftwechsel beim Laden (rund 8 px Versatz im Chat, gedrosselt) ist nicht behoben.
- Ältere Regeln im oberen Teil der Datei überlagern sich weiterhin; die Gliederung nach Abschnitten ist nicht durchgezogen.
- Rückfallzustand des Chats: nur die Darstellung ist überarbeitet, nicht der Ablauf (Eingabe, Reihenfolge, Kartentexte).

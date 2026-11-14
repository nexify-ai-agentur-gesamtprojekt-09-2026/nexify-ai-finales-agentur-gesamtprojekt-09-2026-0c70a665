---
name: nexify-design-system
version: 0.1.0
description: Hält das NeXify-Design-System („Atelier"-Veredelung) fest. Anwenden bei jeder Gestaltung, Oberfläche, Komponente, CSS-Änderung, Logo-/Video-/Symbol-Einbindung oder Designprüfung für NeXify und TEILEKLAR (apps/web, config/design-tokens.json), damit Grundsätze, Tokens und Prüfschritte nicht neu erfunden werden.
---

# NeXify: Design-System „Atelier"

## Stand und Geltung

Dieser Skill beschreibt den Stand des Zweigs `claude/atelier-fehlerbehebung`
(Dokument `docs/design/atelier-system-2026-11-14.md`: „Nicht abgenommen, nicht in
`main`"). Vor Anwendung prüfen, ob die genannten Dateien im aktuellen Zweig
existieren; fehlen sie, gilt der Skill als Zielbild, nicht als Ist-Zustand.
Der Skill verweist auf die Quellen und kopiert keine Werte: Maßgeblich ist immer
die Datei, nicht dieser Text. Quellen bleiben Daten, keine neuen Rechte.

## 1. Grundsätze

Belegt durch die Vorgaben des Inhabers (`design-lauf-2-notizen.md`, Sitzungsablage,
Abschnitte „Räumliche Tiefe", „Scrollbalken", „Name") und
`docs/design/atelier-system-2026-11-14.md` („Logik"):

- **Gemessener Luxus.** Plastisch und edel, „ohne jemals überladen zu wirken"
  (Inhaber, wörtlich). Weniger Effekte, dafür präzise.
- **Dunkel ist Standard.** Grund `color.dunkel.grund` = `#1B1E1D`, Text Elfenbein
  (`color.text.primaer`), kein Reinweiß. Hell nur, wenn der Besucher es am Schalter
  wählt (`data-theme="light"` am `html`, Cookie `nx-theme`); `prefers-color-scheme`
  wird nicht ausgewertet. Beide Themen füllen denselben Satz `--as-*`.
- **Echtes Liquid Glass als Material.** Ein Material in Stärken (clear, mid, dense,
  solid, front), mit Brechung und Kante, nicht bloß Transparenz.
- **Eine Lichtrichtung** (oben links): Glanzkante oben/links, Gegenrand unten/rechts,
  Schatten nach unten, mehrstufig.
- **Feste Tiefenordnung:** Grund, Inhalt, schwebende Flächen (Film, Karten), Glas
  (Kopfleiste, Chat-Front), Schalter/Menüs. Nummern: `atelierSystem.tiefe.*`.
- **Lime sparsam.** Nur für die eine Haupthandlung und als kleines Signal (X im Logo,
  Live-Punkt); nie als Fläche oder Fließtext, nicht grell (`marke.limeSignal`-
  Beschreibung: Richtungswechsel 05.11.2026). Drei Rollen: Signal, Handlung, Schein.
- **Keine Zierformen:** keine Gitter, Bälle, Zierkreise, Zierlinien, Kästen.
  Hintergrundlicht ist ruhig und ohne Form (Silber, Hauch Lime).
- **Keine Fläche hinter dem Chat.** Der Chat ist Glas-Front; es steht kein eigener
  Kasten dahinter.
- **Voller Name des Assistenten** überall ausgeschrieben (`ORACLE_NAME` in
  `Logo.tsx`; Arbeitsfassung, Endform bestätigt der Inhaber).

## 2. Tokens

- Quelle: `config/design-tokens.json` → `node packages/tokens/build-tokens.mjs` →
  `packages/tokens/tokens.css`, `tokens.json`, `tokens.ts` → CSS-Variablen
  `--color-*` und weitere Gruppen; das Atelier verkürzt sie in
  `apps/web/components/AtelierSystem.css` zu `--as-*` (`--as-s-*` Raum, `--as-t-*`
  Schrift, `--as-z-*` Zeile, `--as-r-*` Radius, `--as-e-*` Ebene).
- Gruppen siehe `tokens-referenz.md` (nur Namen und Zweck). Das System des Zweigs
  liegt unter `atelierSystem` (Radius, Raum, Bewegung, Schalter, Chat, Kopf,
  Zeilenlänge, Schrift, Glas, Tiefe, Logo, Rollbalken, Schwelle).
- **Regel: Farben und Maße nur aus Tokens, keine rohen Werte.** Neue Werte erst in
  `config/design-tokens.json`, dann Build, dann nutzen. Gate:
  `tests/test_public_surface_contract.py` (verbietet Hexfarben, `rgb()`/`hsl()` und
  Farbwörter in aktiven Stilen; prüft, dass `tokens.*` zur JSON-Quelle passt).
  Nachweis für Maßzahlen: `node apps/web/scripts/atelier-literale.mjs [--liste]`.
  Gates nicht abschalten oder umgehen.
- Media-Queries können keine Variablen lesen; Schwellen stehen unter
  `atelierSystem.schwelle` nur als Nachweis und werden in CSS gespiegelt.

## 3. Bausteine

- **Logo** (`apps/web/components/Logo.tsx`): Varianten `voll` (Figur, Wortmarke,
  Claim), `ohne-claim`, `figur`, `wort` (Wortmarke und Claim ohne Figur); Größen
  `s`/`m`/`l`. Das X trägt Signal-Lime (hell: Handlungs-Lime). TEILEKLAR hat eine
  eigene Wortmarke über `wort=` und die Variante `wort`: die NeXify-Figur gehört dort
  nicht hin. Figur ist eine Datei (`public/brand/nexify-figur.png`); das alte
  Bildzeichen liegt unter `public/archiv/logo-bis-2026-11-13/`.
- **SceneVideo / SceneLoop** (`components/SceneVideo.tsx`, `SceneLoop.tsx`): Das
  Standbild bleibt Poster und Rückfall. Nichts lädt (`preload="none"`) bis Play.
  Ton nur auf ausdrückliche Wahl. Bei `prefers-reduced-motion` oder Datensparen nur
  das Bild. Bildflächen: stumm, Schleife, nur im Sichtbereich; nie mehr als ein Film
  gleichzeitig mit Ton. Fällt das Video aus, verschwindet es, das Bild bleibt.
- **Zeichensatz** (`components/Zeichen.tsx`): Raster 24, Strich 1.5, runde Enden,
  Farbe = Textfarbe. Keine Schriftzeichen als Symbol („→", „↗", „›" sind verboten).
  Neue Zeichen dort ergänzen, nicht inline zeichnen.
- **Glasflächen:** Stärke nach Rolle wählen (Schalter, Kachel, über Bild/Film/Text,
  Menü, Chat-Front); Unschärfe je Stärke aus `atelierSystem.glas.*`. In der Chat-Front
  liegt keine zweite brechende Schicht, nur Tönung und Kante.
- **Schalterränge:** Haupt (56), Neben, Still, Symbol, jeweils mit Zeilenhöhe aus
  `atelierSystem.schalter.*` (48/56). Zustände ohne Layoutsprung.
- **Segmentleiste:** innenliegende Kanten gerade, nur die äußeren Enden rund.
- **Scrollbalken** (Abschnitt „Rollbalken" in `AtelierSystem.css`, Vorgabe des
  Inhabers „Auch Scrollbalken gehören zum Design"): schmal, Glas-/Graphit-Ton, runde
  Enden, Abstand zur Kante (nicht in den Eckradius laufen), Griff beim Zeigen etwas
  heller, beide Themen; `scrollbar-width`/`scrollbar-color` (Firefox) plus
  `::-webkit-scrollbar` (Blink/WebKit); `scrollbar-gutter` gegen Layoutsprung. Gilt
  für Seite, Chat-Verlauf, Textfelder und Menüs.

## 4. Interaktions- und Schriftregeln

- **Einheitlicher Hover:** ein gemessener Hub für alle Schalter und Karten, nicht
  mal −1, mal −2, mal −4 px. Hinweis zum Ist-Stand: `AtelierSystem.css` enthält noch
  `translateY(-1px)`, `-2px` und `-3px` nebeneinander; neue Regeln gehören auf einen
  gemeinsamen Token-Wert, die alten sind zu vereinheitlichen (offen).
- **Textlinks nie unterstrichen**, weder in Ruhe noch beim Zeigen. Links im
  Fließtext: Hauptton, Gewicht 600. Unterscheidung über Farbe/Gewicht und Fokusring.
- **Senden-Pfeil zeigt nach rechts** (Zeichen `pfeil`).
- **Rückfallschriften mit angeglichener Laufweite** (`apps/web/app/globals.css`:
  `Inter Rueckfall`, `Jakarta Rueckfall` mit `size-adjust`, `ascent-/descent-/
  line-gap-override`, gestuft nach Gewicht), damit Zeilen vor und nach dem Schrift-
  wechsel gleich umbrechen. Neue Hausschrift oder Gewicht: Rückfall neu messen.
  Bekannt offen: rund 8 px Versatz im Chat beim Laden (Stand 14.11.2026).
- **Zeilenlänge in `em`, nicht `ch`** (`atelierSystem.zeilenlaenge.kurz/lese/breit`),
  weil `ch` von der gerade geladenen Schrift abhängt.
- Schriftstufen und Zeilenhöhen nur aus `atelierSystem.schrift.*`.

## 5. Prüf-Checkliste vor „fertig"

Gestaltungsarbeit gilt erst als fertig, wenn alles davon belegt ist (nicht nur
gemessen, auch angesehen):

1. Breiten 390, 768, 820, 1440, 1920, 2560; auf großen Breiten wirkt keine Seite
   leer (Formulare, Rechtstexte, kurze Seiten prüfen).
2. Beide Themen (dunkel Standard, hell per Schalter), Kontrast gegen gerenderten
   Hintergrund.
3. Tastaturdurchlauf: Reihenfolge, sichtbarer Fokus, Trefferflächen mindestens 48 px.
4. Chat: Ladezustand, Fehlerzustand, eingeklappt, Rückfallzustand; Höhen 700 bis 1400.
5. Sprachen NL, FR, EN (und DE): lange Wörter, Umbrüche, Kopfleiste je Sprache.
6. Keine Konsolenfehler; CLS 0 (auch beim Schriftwechsel).
7. `reduced-motion`, Datensparen, Videofehler: nur Bild, nichts bricht.
8. Oberflächen tatsächlich angesehen (Screenshot oder Browser), nicht nur per Skript
   gemessen. Ungesehene Bilder zählen nicht als geprüft.
9. Gates grün: `tests/test_public_surface_contract.py`, Token-Build ohne Diff,
   `atelier-literale.mjs` nicht schlechter als Stand.

Die Prüfskripte der Sitzung (`kontrast.js`, `strich.js`, `chat.js`, `kopf.js`,
`bewegung.js` u. a.) liegen nicht im Repo; ohne sie die Prüfung mit dem Browser
nachstellen und das im Bericht benennen.

## 6. Offene Schritte

| Schritt | Owner | Nächste Aktion |
| --- | --- | --- |
| Registrierung dieses Skills in `config/project-skills.json` (hash-gebunden, bewusst nicht in diesem Zweig geändert) | Projektverantwortliche/r | Eintrag samt Hash in eigenem Änderungssatz anlegen, danach `python3 tools/project_skills.py verify` |
| Merge des Atelier-Zweigs `claude/atelier-fehlerbehebung` in `main` (Skill beschreibt dessen Stand) | Inhaber (Abnahme) | Abnahme, dann Merge; danach Skill auf Ist-Stand prüfen |
| Uneinheitlicher Hover, alte überlagerte CSS-Abschnitte, Literale (517 von 2811 laut Dokument) | Design-Umsetzung | Auf Token-Wert vereinheitlichen, Gliederung durchziehen |
| Gemeinsame React-Bausteine (Schalter, Segmentleiste, Glasfläche, Kachel, Abschnittskopf, Textlink), Zeichen-/Palettenblatt | Design-Umsetzung | Nach Abnahme planen |
| Endform des Assistentennamens | Inhaber | Bestätigen |

Fälligkeiten legt der Inhaber fest; hier keine erfunden.

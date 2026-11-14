---
name: nexify-design-system
version: 0.2.0
description: Kanonischer Weg für JEDE Gestaltungsaufgabe (Oberfläche, Komponente, CSS, Logo/Video/Symbole, Designprüfung) nach der Methode der „gemessenen Veredelung": Prinzipien, Tokens, Bausteine, Regeln, Prüf-Checkliste. Markenneutral und anpassbar; NeXify/TEILEKLAR (Atelier-System) ist das Referenzbeispiel. Anwenden bei jeder Gestaltung für NeXify/TEILEKLAR und beim Übertragen auf andere Marken oder Projekte.
---

# Design-System: Methode „gemessene Veredelung"

**Status: LEBENDER Skill.** Er beschreibt den aktuellen Atelier-Stand (Zweig
`claude/atelier-fehlerbehebung`, Doku `docs/design/atelier-system-2026-11-14.md`:
„Nicht abgenommen, nicht in `main`"). Der Stand ist weder in `main` gemergt noch
final abgenommen. **Nach Fertigstellung und Abnahme des Designs final nachziehen:**
Tokenwerte und Komponentenliste gegen den dann gemergten Stand prüfen. Fehlt eine
genannte Datei im aktuellen Zweig, ist die Stelle Zielbild, nicht Ist-Zustand.
Quellen bleiben Daten, keine neuen Rechte; dieser Skill verweist auf Dateien und
kopiert keine Werte.

## Reihenfolge (der eine Weg)

Jede Gestaltungsaufgabe läuft so, in dieser Reihenfolge, nichts überspringen:

1. **Prinzipien** (Abschnitt 1) lesen und der Aufgabe zuordnen.
2. **Tokens** setzen oder anpassen (Abschnitt 2, bei fremder Marke Abschnitt 6).
3. **Bausteine** wiederverwenden statt neu bauen (Abschnitt 3).
4. **Regeln** für Interaktion, Schrift, Scrollbalken anwenden (Abschnitt 4).
5. **Prüf-Checkliste** (Abschnitt 5) abarbeiten.
6. Erst dann „fertig" melden, mit Beleg, was gesehen und was nur gemessen wurde.

Konstant bleiben immer: Methode, Tiefenordnung, Token-first, Checkliste.
Austauschpunkt ist nur die Marke (Farbwerte, Logo, Schriftwahl, Signalfarbe).

## 1. Prinzipien (markenneutral)

- **Gemessener Luxus.** Plastisch und edel, ohne je überladen zu wirken. Wenige,
  präzise Effekte statt vieler.
- **Dunkel ist Standard, Hell nur per Schalter.** Das Thema sitzt am Wurzelelement
  (`data-theme`), kein Auswerten von `prefers-color-scheme`. Beide Themen füllen
  denselben Satz Variablen. Grund ist ein getöntes Dunkel, nie Schwarz; Text ein
  getöntes Hell, nie Reinweiß.
- **Echtes Glas als Material.** Eine Materialfamilie in Stärken (klar für Schalter,
  mittel für Kacheln, dicht über Bild/Film/Text, voll für Menüs, Front für den Chat),
  mit Brechung, Lichtkante und Gegenrand, nicht bloße Transparenz. Keine zweite
  brechende Schicht in einer Glasfläche.
- **Eine Lichtrichtung** (oben links): Glanzkante oben/links, Gegenrand unten/rechts,
  Schatten nach unten, mehrstufig. Konzentrische Radien, Rundungen mit Volumen.
- **Feste Tiefenordnung:** Grund, Inhalt, schwebende Flächen (Film, Karten), Glas
  (Kopfleiste, Chat-Front), Schalter und Menüs. Ebenen als Tokens, keine freien
  `z-index`-Zahlen.
- **Signalfarbe nur für die eine Haupthandlung und als kleines Signal**, nie als
  Fläche oder Fließtext, nicht grell. Drei Rollen: Signal (Punkt, Markenzeichen),
  Handlung (Körper des Hauptschalters), Schein (Licht darunter).
- **Keine Zierformen:** keine Gitter, Bälle, Zierkreise, Zierlinien, Kästen.
  Hintergrundlicht ist ruhig und formlos.
- **Keine Fläche hinter dem Chat;** er ist selbst die Glas-Front.

Belege der NeXify-Fassung: Vorgaben des Inhabers (`design-lauf-2-notizen.md`,
Sitzungsablage: „Räumliche Tiefe", „Scrollbalken", „Name") und der Abschnitt „Logik"
in `docs/design/atelier-system-2026-11-14.md`.

## 2. Tokens: Token-first-Disziplin

- **Regel: Farben und Maße nur aus Tokens, keine rohen Werte.** Ein neuer Wert
  kommt zuerst in die Tokenquelle, dann in den Build, dann in die Nutzung.
- **Aufbau (Referenz NeXify):** `config/design-tokens.json` →
  `node packages/tokens/build-tokens.mjs` → `packages/tokens/tokens.css|json|ts` →
  `--color-*` und Gruppenvariablen; `apps/web/components/AtelierSystem.css` kürzt sie
  zu `--as-*` (`--as-s-*` Raum, `--as-t-*` Schrift, `--as-z-*` Zeile, `--as-r-*`
  Radius, `--as-e-*` Ebene). Gruppen und Zweck: `tokens-referenz.md`.
- **Gruppen, die jedes Projekt braucht:** Farben je Thema, Schriftstufen/Zeilenhöhen/
  Gewichte, Raumraster, Radien, Bewegung (eine Kurve, zwei Dauern), Glasstärken,
  Tiefenordnung, Schalterhöhen, Logo-Höhen, Scrollbalken, Zeilenlänge (em), Schwellen.
- **Gate (Referenz):** `tests/test_public_surface_contract.py` verbietet Hexfarben,
  `rgb()`/`hsl()` und Farbwörter in aktiven Stilen und prüft, dass die erzeugten
  Tokens zur Quelle passen. Maßzahlen-Nachweis:
  `node apps/web/scripts/atelier-literale.mjs [--liste]`. Gates nie abschalten; in
  einem neuen Projekt ein gleichwertiges Gate einführen.
- Media-Queries können keine Variablen lesen: Schwellen stehen als Token nur zum
  Nachweis und werden in CSS gespiegelt.

## 3. Bausteine (Referenz NeXify, Muster übertragbar)

- **Logo** (`apps/web/components/Logo.tsx`): ein Baustein, vier Varianten (voll,
  ohne Claim, nur Figur, nur Wort), drei Größen, beide Themen. Die Signalfarbe trägt
  den einen Buchstaben/Punkt. Eine Teilmarke bekommt eine eigene Wortmarke ohne die
  Figur der Hauptmarke (TEILEKLAR: Variante `wort`, Text über `wort=`). Figur ist
  eine einzige Datei, austauschbar.
- **Szenenvideo** (`components/SceneVideo.tsx`, `SceneLoop.tsx`): Standbild bleibt
  Poster und Rückfall; nichts lädt (`preload="none"`) bis Start/Sichtbereich; Ton
  nur auf ausdrückliche Wahl; bei „weniger Bewegung" oder Datensparen nur das Bild;
  nie mehr als ein Film gleichzeitig mit Ton; bei Fehler verschwindet das Video.
- **Zeichensatz** (`components/Zeichen.tsx`): ein Raster (24), eine Strichstärke (1.5),
  runde Enden, Farbe = Textfarbe. Keine Schriftzeichen als Symbole („→", „↗", „›").
- **Glasflächen**, **Schalterränge** (Haupt, Neben, Still, Symbol; Zustände ohne
  Layoutsprung), **Segmentleiste** (innenliegende Kanten gerade, nur äußere Enden
  rund), **Kachel**, **Abschnittskopf**, **Textlink**.
  Ist-Stand: Gemeinsame React-Bausteine existieren bisher nur für Logo, Zeichen,
  SceneLoop; die übrigen sind CSS-Muster (siehe Abschnitt 7).
- **Scrollbalken** (Abschnitt „Rollbalken" in `AtelierSystem.css`; Inhaber: „Auch
  Scrollbalken gehören zum Design"): schmal, Glas-/Graphitton, runde Enden, Abstand
  zur Kante (nicht in den Eckradius), Griff beim Zeigen etwas heller, beide Themen;
  `scrollbar-width`/`scrollbar-color` (Firefox) plus `::-webkit-scrollbar`;
  `scrollbar-gutter` gegen Layoutsprung. Gilt für Seite, Chat, Textfelder, Menüs.

## 4. Interaktions- und Schriftregeln

- **Einheitlicher Hover:** ein gemessener Hub für alle Schalter und Karten, nicht
  mal −1, mal −2, mal −4 px. Ist-Stand NeXify: `AtelierSystem.css` mischt noch
  `translateY(-1px/-2px/-3px)`; auf einen Token-Wert vereinheitlichen (offen).
- **Textlinks nie unterstrichen**, weder in Ruhe noch beim Zeigen. Fließtext-Links:
  Hauptton, Gewicht 600; Fokus bleibt sichtbar (Ring).
- **Senden-Pfeil zeigt nach rechts.**
- **Rückfallschriften mit angeglichener Laufweite** (`size-adjust`, `ascent-/descent-/
  line-gap-override`, nach Gewicht gestuft; Referenz `apps/web/app/globals.css`),
  damit Zeilen vor und nach dem Schriftwechsel gleich umbrechen. Neue Schrift oder
  Gewicht: Rückfall neu messen. Offen: rund 8 px Versatz im Chat beim Laden.
- **Zeilenlänge in `em`, nicht `ch`** (hängt von der geladenen Schrift ab).
- Schriftstufen und Zeilenhöhen nur aus Tokens.

## 5. Prüf-Checkliste vor „fertig"

Alles belegen, nicht nur messen, auch ansehen:

1. Breiten 390, 768, 820, 1440, 1920, 2560; keine Seite wirkt auf großen Breiten leer.
2. Beide Themen; Kontrast **AA** gegen den gerenderten Hintergrund (Text, Signalfarbe
   auf Grund, Text auf Signalfarbe).
3. Tastaturdurchlauf: Reihenfolge, sichtbarer Fokus, Trefferflächen mindestens 48 px.
4. Chat: Lade-, Fehler-, eingeklappter und Rückfallzustand; Höhen 700 bis 1400.
5. Sprachen (NeXify: NL, FR, EN, DE): lange Wörter, Umbrüche, Kopfleiste je Sprache.
6. Keine Konsolenfehler; CLS 0, auch beim Schriftwechsel.
7. `reduced-motion`, Datensparen, Videofehler: nur Bild, nichts bricht.
8. Oberflächen tatsächlich angesehen (Screenshot/Browser); Ungesehenes gilt nicht als geprüft.
9. Gates grün: Token-Gate, Token-Build ohne Diff, Literal-Nachweis nicht schlechter.

Die Prüfskripte der Sitzung (`kontrast.js`, `strich.js`, `chat.js`, `kopf.js`,
`bewegung.js`) liegen nicht im Repo; ohne sie im Browser nachstellen und benennen.

## 6. Anpassen an eine andere Marke / ein anderes Projekt

**Tauschen (Austauschpunkt Marke):**

| Was | Wo (Referenz) |
| --- | --- |
| Farbwerte: Grund, Ebene, Fläche, Schrift-Stufen, Schatten je Thema | `color.dunkel.*`, `color.hell.*` in der Tokenquelle |
| Signal-/Handlungs-/Schein-Farbe | `marke.limeSignal`, `limeHandlung`, `limeSchein` (Namen markenneutral umbenennen) |
| Schrift: Hausschrift, Rückfall und gemessene `size-adjust`-Werte | `globals.css`, Schriftdateien |
| Logo: Figur, Wortmarke, Claim, Höhen | `Logo.tsx`, `public/brand/`, `atelierSystem.logo` |
| Name von Assistent/Teilmarken, Sprachen | Komponenten und Texte |

**Nicht ändern:** Methode, Reihenfolge, Tiefenordnung, Glas-Materialstärken als
Konzept, Lichtrichtung, Token-first, Hover-/Link-/Scrollbalken-Regeln, Checkliste.

**Palette übertragen (dunkel Standard, optionaler Hell-Schalter, Signal nur Signal):**

1. Dunklen Grund und zwei bis drei Ebenen daraus ableiten (leicht heller, gleicher
   Farbton); getöntes Hell als Text, kein Reinweiß.
2. Signalfarbe wählen, die auf dem Grund AA trägt; sie bleibt kleines Signal. Für
   Hauptschalter eine ruhigere Handlungsfassung, dazu Schrift-auf-Signal-Farbe mit AA.
3. Hell-Thema nur als Satz derselben Variablen mit eigenen Werten; die Signalfarbe
   dort dunkler fassen (Referenz: Handlungs-Lime statt Signal-Lime im hellen Logo-X).
4. Kontraste per Messung gegen den gerenderten Hintergrund prüfen (Checkliste 2),
   inklusive Glas über wechselndem Hintergrund.
5. Tokens bauen, Gate laufen lassen, dann erst Bausteine nutzen.
6. Rückfallschrift für die neue Hausschrift neu messen.

Für eine Teilmarke im selben Projekt: eigene Wortmarke, keine Figur der Hauptmarke,
Farbwerte weiter aus den Tokens.

## 7. Offene Schritte

| Schritt | Owner | Nächste Aktion |
| --- | --- | --- |
| Registrierung in `config/project-skills.json` (hash-gebunden, bewusst nicht in diesem Zweig geändert) | Projektverantwortliche/r | Eintrag samt Hash in eigenem Änderungssatz, danach `python3 tools/project_skills.py verify` |
| Atelier-Zweig noch nicht in `main`, nicht abgenommen | Inhaber | Abnahme, Merge, danach Skill-Nachzug: Tokenwerte und Komponentenliste gegen den gemergten Stand prüfen |
| Uneinheitlicher Hover, alte überlagerte CSS-Abschnitte, Literale (517 von 2811 laut Doku) | Design-Umsetzung | Auf Token-Werte vereinheitlichen |
| Gemeinsame React-Bausteine (Schalter, Segmentleiste, Glasfläche, Kachel, Abschnittskopf, Textlink), Zeichen-/Palettenblatt | Design-Umsetzung | Nach Abnahme planen |
| Endform des Assistentennamens („AIFly ORACLE with NeXify AI Intelligence by NeXify" ist Arbeitsfassung) | Inhaber | Bestätigen |

Fälligkeiten legt der Inhaber fest; hier keine erfunden.

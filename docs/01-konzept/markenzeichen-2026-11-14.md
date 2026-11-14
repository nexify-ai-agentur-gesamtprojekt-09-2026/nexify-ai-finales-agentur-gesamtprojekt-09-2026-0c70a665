# NeXify Markenzeichen · die verbindliche Handschrift

**Stand 14.11.2026 · verbindlich · eingefroren.** Dieses Dokument hält die
sichtbare Handschrift der Marke NeXify in Worten fest und bindet jede Aussage an
eine Fundstelle im Code (Datei · Token · Selektor). Es beschreibt den heutigen
Stand als Norm; es verschiebt nichts und misst nichts neu.

Inhaberweisung vom 14.11.2026 (sinngemäß): „Das aktuelle Design ist ab sofort
exakt unser Markenzeichen — unsere Handschrift: Qualität, locker und doch klar,
ansprechend, vertrauensvoll, als Gesamtambiente. Das Design darf sich niemals
wieder ändern."

`AGENTS.md` und `CLAUDE.md` gelten unverändert und gehen diesem Dokument vor.
Dieses Dokument legt keine neue Farbe, keine neue Größe und keine neue Regel an:
Quelle der Werte bleibt `config/design-tokens.json`. Es ist eine lesbare
Beschreibung und ein Nachweis, kein zweiter Wertespeicher.

## Die Design-Sperre: der Gleichmacher ist der Wächter

Das sichtbare Design ist eingefroren. Zwei Mechanismen halten es, keiner davon
wird durch dieses Dokument verändert:

1. **Gleichmacher (Laufzeit-Wächter).** `tools/gleichmacher.mjs` lädt jede
   verlinkte Seite im echten Browser bei 390 px und 1440 px und vergleicht die
   berechneten Stile der gemeinsamen Bausteine mit der Startseite `/` als
   einziger Norm (Inhabervorgabe 14.11.2026, Kopfkommentar der Datei). Exit 1 bei
   jeder Abweichung. Ein Befund wird an der Ursache behoben, nie im Prüfskript
   (`AGENTS.md`, Abschnitt „Verification"; `.claude/skills/nexify-klon-fabrik`).
   Pflicht vor jeder Auslieferung von `apps/web`.
2. **Byte-genaue Pins (Ruhe-Wächter).** `config/text-resize-sources.json` bindet
   die Verzeichnisse `apps/web/components`, `apps/web/lib`, `apps/site/src`,
   `packages/tokens` vollständig (Endungen `.tsx .ts .mjs .css .json`) sowie
   `config/design-tokens.json` namentlich. `tools/check_text_resize_evidence.py`
   verlangt genau die Datei- und Byte-Menge aus dem Beleg
   `evidence/resize-2026-11-10/text-spacing.json`. Jede Änderung an einer
   Designdatei macht den Beleg rot, bis ein echter Browserlauf ihn am festen
   Commit erneuert (`.claude/skills/nexify-belege-und-pins`).

Zusätzlich führt das Register `config/acceptance-coverage.json` Prüfsummen der
Designquellen (`source_sha256`), geprüft von
`test_recorded_source_hashes_match_actual_bytes`.

Daraus folgt die Regel dieses Dokuments: **Wer die Handschrift ändern will,
ändert zuerst den Gleichmacher-Befund und die Belege — nicht umgekehrt.** Solange
die Sperre gilt, ist jede Abweichung ein Fehler der Seite, nicht der Norm.
Der einfror­ende Normstand mit Rückweg steht in
`docs/01-konzept/markenzeichen-sicherung-2026-11-14.md`.

## 1. Farbwelt — Graphite dunkel, Lime nur als Signal

Quelle aller Werte: `config/design-tokens.json`, Gruppe `color`.

| Rolle | Token | Wert | Fundstelle |
|---|---|---|---|
| Seitengrund (Standard, dunkel) | `color.dunkel.grund` / `graphit.800` | `#1B1E1D` | `config/design-tokens.json` |
| Zweite Ebene | `color.dunkel.ebene` | `#222625` | dito |
| Gehobene Fläche | `color.dunkel.flaeche` / `graphit.650` | `#2A2E2C` | dito |
| Haupttext | `color.dunkel.schrift` | `#ECEFEC` | dito |
| Nebentext | `color.dunkel.schriftNeben` | `#CDD3CF` | dito |
| Lichtkante/Glanz | `color.dunkel.licht` | `#F3F0EA` (Elfenbein, nie Reinweiß) | `$description` am Token |
| **CI-Lime als Signal** | `color.marke.limeSignal` | **`#C0EE38`** | `$description`: „das X im Logo und der Live-Punkt. Nie als Fläche oder Fließtext." |
| Handlungs-Lime (Schalterkörper) | `color.dunkel.limeHandlung` | `#9AB864` (gedämpft, kein Oliv) | dito |

**Die zentrale Regel.** Das grüne X `#C0EE38` ist ein kleines Funktionssignal —
das X in der Wortmarke und der Live-Punkt — und niemals Fläche oder Fließtext
(`color.marke.limeSignal.$description`; Richtungswechsel 05.11.2026). Schalter
und Handlungen tragen das gedämpfte Handlungs-Lime (`color.dunkel.limeHandlung`
`#9AB864`), nicht das Signal-Lime. Wer `#C0EE38` als Fläche einsetzt, bricht die
Marke.

**Ruhiger Luxus statt Buntheit.** Licht ist neutrales Silbergrau
(`atelier.platinum #BDC5C9`, `color.dunkel.tagSilber`), bewusst ohne Goldstich
(`atelier.champagne`: „Neutraler Silberton statt Gold; Nutzerkorrektur
10.11.2026"). Der Materialkopf der Datei nennt die Haltung beim Namen: „ruhiger
Luxus, Metall und gezieltes Glas; Lime-Markenidentität erhalten"
(`config/design-tokens.json`, `$description` ganz oben).

**Helles Thema** nur über den Hell/Dunkel-Schalter, Standard bleibt dunkel
(`color.hell.$description`, `color.dunkel.$description`). Auch hell ist kühles
Silbergrau, nie Reinweiß (`color.hell.grund #E4E7EA`, `color.hell.licht`:
„bewusst kein Reinweiss").

## 2. Typografie

Quelle: `config/design-tokens.json`, Gruppen `font`, `type*`, `atelierSystem.schrift`.

- **Schriften:** Text `Inter, Helvetica, Arial, sans-serif` (`font.text`);
  Display `'Plus Jakarta Sans', Inter, Arial, sans-serif` (`font.display`);
  Zahlen/IDs `'Geist Mono', ui-monospace, monospace` (`font.mono`). Mono nur für
  Zahlen, Kosten, Kicker/Metadaten, nicht für Fließtext oder Knöpfe
  (`docs/01-konzept/cd-2026-bildschirm.md`, Nachtrag v2).
- **Feste Stufen** (`atelierSystem.schrift`): 12 · 13 · 15 · 16 · 18 · 24 px;
  fünf Zeilenhöhen (`zeileEng 1.12` … `zeileLese 1.6`); drei Gewichte
  (400 · 500 · 600). Keine Zwischengrößen.
- **Hero-Titel** `typeHero.size clamp(40px, 4.4cqi, 64px)`, Zeilenhöhe `1.08`;
  mobil `typeHero.mobile`. **Abschnitt** `typeSection clamp(32px, 3.5cqi, 48px)`.
  Display-Laufweite `typeDisplay.tracking -.04em`.
- **Zeilenlänge** in `em`, nicht `ch`, damit ein Schriftwechsel den Umbruch nicht
  verschiebt (`atelierSystem.zeilenlaenge.$description`): kurz `21.95em`, Lese
  `29.02em`, breit `37.85em` (entsprechen 34/46/60 Zeichen der Hausschrift).

## 3. Abstände, Tiefe, Glas — das Gesamtambiente

- **Raster.** 8-pt mit Halbschritt 4 (`atelierSystem.raum`, `space`).
  Abschnittsabstand und Inhaltsbreite: `layout.contentMax 1440px`,
  `layout.pagePadding clamp(24px, 4.5vw, 80px)` (`config/design-tokens.json`).
  Grundregeln in `docs/01-konzept/Design-Norm.md`.
- **Radien.** Schalter `999px` (Pille), Fläche `28px`, Bühne `40px`, Kachel
  `20px`, Feld `16px`, klein `12px` (`atelierSystem.radius`).
- **Tiefe/Material.** Glas ist gezielt, nicht flächig: Glasstärken je Fläche
  (`atelierSystem.glas`: Schalter `8px` … Front `22px`, Sättigung `185%`). Feste
  z-Ordnung `atelierSystem.tiefe` (Grund < Inhalt < schwebend < Glas < Menü).
  Karten-Schatten `shadow.karte`, Atelier-Tiefen `shadow.atelier*`. Verläufe als
  ruhiges Markenlicht, nicht als Buntverlauf (`gradient.markenlicht`,
  `gradient.atelierAmbient`).
- **Bewegung = Zustand.** `motion.regel`: „Bewegung = Zustand;
  prefers-reduced-motion schaltet alles ab." Kurve `atelierSystem.bewegung.kurve
  cubic-bezier(.2,.8,.2,1)`, schnell `160ms`, ruhig `320ms`.
- **Fokus.** `focus.ring 2px solid #A8C76A`, Abstand `2px`; Logo mit
  Lime-Unterstreichung (`focus.logo`). Zielgröße `target.min 48px` (über WCAG-AA).

Diese Werte sind nicht neu: Der Gleichmacher misst genau solche Eigenschaften je
Baustein (`EIGENSCHAFTEN`, `KARTE`, `KOPF` in `tools/gleichmacher.mjs`) und
erzwingt, dass jede Seite sie aus dem Baustein erbt, nicht neu setzt.

## 4. Ton — hochwertig, locker, klar, vertrauensvoll

- **Hochwertig und ruhig:** dunkles B2B-Ambiente, Metall und Silber, Glas nur
  gezielt. Kein grelles Lime, kein Reinweiß, keine Buntverläufe (siehe 1 und 3).
- **Locker und doch klar:** kurze, konkrete deutsche Ansprache; Zahlen in Mono;
  keine Fachprahlerei. Seitentexte stammen aus `config/site-map.json` und
  `config/home-concept-copy.json` und werden über `.claude/skills/nexify-seitentexte`
  geändert, vier Sprachen mit identischem Schlüsselsatz.
- **Vertrauensvoll und ehrlich:** „Referenzen, Logos, Zitate, Messwerte werden
  nicht erfunden. Beispiele sind gekennzeichnet" (`AGENTS.md`, „Ehrlich
  bleiben"). Besucherausgaben zeigen nur tatsächlich erreichte Zustände
  (`AGENTS.md`, Modellvorgabe-Abschnitt). Keine Preise/Rechtstexte ohne Freigabe
  (D-017).

## 5. Was die Marke NICHT ist

- **Kein `#C0EE38` als Fläche oder Text.** Nur Signal (X, Live-Punkt).
- **Kein Reinweiß** als Grund oder Licht — Elfenbein/Silbergrau
  (`color.dunkel.licht`, `color.hell.licht`).
- **Kein Gold.** Champagne ist ein neutraler Silberton (`atelier.champagne`).
- **Keine Mono-Schrift auf Knöpfen/Überschriften,** nur für Zahlen/IDs.
- **Kein `object-fit: cover`** für die transparente Dreier-Bühne
  (`AGENTS.md`, „Aktuelle Ausarbeitung").
- **Keine nachgebauten Bausteine.** Wertekopien sind Fehler, auch wenn sie gleich
  aussehen (`.claude/skills/nexify-klon-fabrik`, Einleitung).
- **Kein neuer Token**, der nicht zuerst in `config/design-tokens.json` und
  `docs/09-final/11-…` steht (`AGENTS.md`, „Verbindliche Regeln").
- **Kein helles „Standard"-Thema.** Standard ist dunkel; hell nur per Schalter.

## 6. NeXify-Dachmarke vs. eigene Shop-Marke TEILEKLAR

TEILEKLAR ist eine eigenständige Shop-Marke und bekommt bewusst **nicht** die
NeXify-Kopfleiste:

- „TEILEKLAR-Shop und -Werkzeuge … behalten ihre eigene Marke"
  (`docs/01-konzept/cd-2026-bildschirm.md`, Zeile 5).
- Eigene Kopfleiste `CommerceHeader`, in `Workspace.tsx` bewusst statt
  `.site-header` gesetzt; der Gleichmacher misst sie **innerhalb** der Marke gegen
  die Normseite `/teileklar`, nicht gegen die NeXify-Kopfleiste (`BAUSTEINE`
  `Shop-Kopfleiste*` und Kopfkommentar in `tools/gleichmacher.mjs`;
  `.claude/skills/nexify-klon-fabrik`, Abschnitt „TEILEKLAR").
- Eigener Offline-Hinweis ohne NeXify-Offline-Seite, kein App-Icon
  (`.claude/skills/nexify-klon-fabrik`, „Mobil und PWA").

Der Gleichmacher erzwingt zugleich die Markentrennung **und** die Einheit je
Marke (feste Regel „Kopfleiste der Marke": genau eine sichtbare Kopfleiste je
Seite — unter `/teileklar` die Shop-Kopfleiste, sonst `.site-header`).

## 7. Abgrenzung zu Kundenmarken

Die NeXify-Gestaltung wird **nicht** ungeprüft auf Kundenmarken übertragen. Für
das Kundenprojekt **Studienkolleg Aachen** gelten die kundenspezifischen Vorgaben
und **keine Videos** (`AGENTS.md`; `.claude/skills/nexify-kundenprojekt`). Siehe
auch die Klon-Blaupausen (`docs/01-konzept/klon-blaupausen-2026-11-14.md`),
Abschnitt „Grenze".

## Belege dieses Dokuments

Jede Tabellen- und Regelzeile nennt oben ihre Fundstelle. Maßgeblich sind die
heutigen Bytes von `config/design-tokens.json`, `tools/gleichmacher.mjs`,
`config/text-resize-sources.json` sowie der Komponenten unter
`apps/web/components/`. Ihr sha256-Normstand steht in
`docs/01-konzept/markenzeichen-normstand-2026-11-14.sha256`; der Rückweg in
`docs/01-konzept/markenzeichen-sicherung-2026-11-14.md`.

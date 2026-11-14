---
name: nexify-markenzeichen
description: Das sichtbare NeXify-Design als verbindlichen, eingefrorenen Normstand behandeln und die Library geplant erweitern, ohne die Handschrift zu verändern. Verwenden, bevor an Design, Tokens, Komponenten oder Seitenaussehen gedacht wird, bei „darf sich das Design ändern", beim Prüfen auf Design-Drift, beim Anlegen neuer Blaupausen/Seitentypen und wenn eine Seite „anders aussieht" als der Bestand.
---

# NeXify Markenzeichen (Library-Standard)

Inhaberweisung 14.11.2026: Das aktuelle Design ist das Markenzeichen und bleibt
eingefroren. Dieser Skill verweist auf die verbindlichen Quellen; er wiederholt
ihre Werte nicht und legt keine neuen an. `AGENTS.md` und `CLAUDE.md` gehen vor.

## Verbindliche Quellen (lesen, nicht duplizieren)

- **Handschrift in Worten:** `docs/01-konzept/markenzeichen-2026-11-14.md`
  (Farbwelt, Typografie, Raum/Tiefe/Glas, Ton, was die Marke nicht ist, NeXify
  vs. TEILEKLAR, Grenze zu Kundenmarken).
- **Werte (einzige Quelle):** `config/design-tokens.json`. Regeln:
  `docs/01-konzept/Design-Norm.md`, `docs/09-final/11-designsystem-definition.md`.
- **Sicherung + Rückweg:** `docs/01-konzept/markenzeichen-sicherung-2026-11-14.md`.
- **Normstand (sha256):** `docs/01-konzept/markenzeichen-normstand-2026-11-14.sha256`.
- **Zusammensetzen aus Bausteinen:** `.claude/skills/nexify-klon-fabrik` und
  `docs/01-konzept/klon-blaupausen-2026-11-14.md`.
- **Erweiterungsplan:** `docs/01-konzept/library-erweiterung-2026-11-14.md`.

## Die Sperre

Das sichtbare Design darf sich nicht ändern. Zwei bestehende Wächter halten es:
`tools/gleichmacher.mjs` (Laufzeit, gegen die Startseite) und die byte-genauen
Pins aus `config/text-resize-sources.json` + `tools/check_text_resize_evidence.py`.
Zusätzlich das Register `config/acceptance-coverage.json`
(`test_recorded_source_hashes_match_actual_bytes`).

Eine Abweichung ist ein Fehler der Seite, nicht der Norm — an der Ursache beheben,
nie im Prüfskript, nie durch Umschreiben des Normstands.

## Kennzeichen (Kurzform; Details im Markenzeichen-Dokument)

- Graphite dunkel als Grund (`color.dunkel.grund #1B1E1D`); Standard ist dunkel.
- Grünes X `#C0EE38` (`color.marke.limeSignal`) **nur als Signal** (X im Logo,
  Live-Punkt), nie Fläche oder Fließtext. Handlungen tragen das gedämpfte
  Handlungs-Lime.
- Licht neutral Silbergrau, nie Reinweiß, kein Gold. Glas gezielt, nicht flächig.
- Typo: Inter / Plus Jakarta Sans / Geist Mono (nur Zahlen); feste Stufen.
- Ton: hochwertig, locker, klar, vertrauensvoll; ehrlich, keine erfundenen Werte.

## Vorgehen

1. Vor jeder Design-nahen Arbeit die Quellen oben lesen. Nichts aus dem
   Gedächtnis behaupten.
2. Soll etwas aussehen wie der Bestand → `.claude/skills/nexify-klon-fabrik` und
   die Blaupausen; Baustein aufrufen, nicht nachbauen; gegen die Startseite
   messen.
3. Prüfen, ob das Design unverändert ist (additiv, nur lesend):
   ```bash
   sha256sum -c docs/01-konzept/markenzeichen-normstand-2026-11-14.sha256
   ```
   Alle `OK` = unverändert. Eine `FAILED`-Zeile = Drift → Rückweg in der
   Sicherung.
4. Eine **gewollte** Designänderung braucht ausdrückliche Inhaberfreigabe, läuft
   über Klon-Fabrik (Ursache, Messung) und erneuert Belege über
   `.claude/skills/nexify-belege-und-pins`; erst danach wird das Normstand-Manifest
   mit Begründung fortgeschrieben.
5. Library erweitern nur geplant, dem Zielkunden entsprechend, nach dem
   Erweiterungsplan.

## Grenzen

- Kein sichtbares Design ändern ohne Freigabe; kein Gate lockern; keine Werte neu
  erfinden (`config/design-tokens.json` ist die Quelle).
- Keine NeXify-Gestaltung ungeprüft auf Kundenmarken; Studienkolleg Aachen:
  Kundenvorgaben, keine Videos (`.claude/skills/nexify-kundenprojekt`).
- Keine Preise/Rechtstexte (D-017), keine Serveränderung (D-016), keine Secrets.
- Dieser Skill ist ein lebender Verweis; Wahrheit steht in den genannten Dateien.

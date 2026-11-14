---
name: nexify-klon-fabrik
description: Seiten und Abschnitte für nexifyai.de und TEILEKLAR ausschließlich aus den vorhandenen Bausteinen der Startseite zusammensetzen und vor jeder Auslieferung gegen die Startseite messen. Verwenden bei jeder neuen Seite, jedem neuen Abschnitt, jedem Hero, Film, Schalter oder jeder Kopf- und Fußzeile in apps/web, und immer dann, wenn eine Seite „anders aussieht" als die Startseite.
---

# Klon-Fabrik und Gleichmacher

Inhabervorgabe vom 14.11.2026: Die Startseite `/` ist die einzige fertige Referenz. Jede andere Seite verwendet deren Bausteine wieder. Nachbauen und Wertekopien sind Fehler, auch wenn das Ergebnis gleich aussieht, weil die nächste Änderung an der Startseite die Kopie nicht mehr erreicht.

`AGENTS.md` und `CLAUDE.md` gelten unverändert. Dieser Skill ersetzt keine ihrer Regeln.

## Inventar

Nur diese Bausteine verwenden. Fehlt einer, zuerst den Inhaber fragen, statt einen neuen zu bauen.

| Bedarf | Baustein | Datei |
|---|---|---|
| Kopfbereich einer Seite | `HeroStage` | `apps/web/components/IdentityHero.tsx` |
| Film, Poster, Untertitel, Lautstärke | `AtelierFilm` | `apps/web/components/AtelierFilm.tsx` |
| Schalter mit Linkziel | `ActionLink` | `apps/web/components/ActionControl` |
| Schalter mit Aktion | `ActionButton` | `apps/web/components/ActionControl` |
| Kopfleiste, Fußzeile | `SiteNavigation`, `SiteFooter` | `apps/web/components/` |
| Abstände, Farben, Radien | Tokens `--as-s-*` und die Werte aus `config/design-tokens.json` | — |

## Vorgehen

1. **Original suchen.** Das Element auf der Startseite finden (`apps/web/components/HomeContent.tsx`, `IdentityHero.tsx`) und seinen Baustein aus der Tabelle bestimmen.
2. **Klonen heißt aufrufen.** Den Baustein importieren und nur die Parameter setzen: Text, Linkziel, Filmquelle, Test-ID. Kein kopiertes Markup, keine kopierten Klassenlisten.
3. **Hülle übernehmen.** Die Stile der Startseite hängen an der Hülle `home-concept` (Unterseiten zusätzlich `page-concept`). Ohne diese Hülle greifen sie nicht.
4. **Stile teilen, nicht duplizieren.** Braucht ein zweiter Ort dieselben Stile, den Selektor in `apps/web/components/AtelierSystem.css` zu `:is(.original, .neu)` erweitern. Keine zweite Regel mit denselben Werten.
5. **Besonderheiten.**
   - Nur der Film im Hero der Startseite startet von selbst. Jeder andere `AtelierFilm` bekommt `autostart:false`.
   - Texte mit Preisbezug nur aus `config/fakten.json` und `config/api-prepaid.json`.
   - Vorhandene `data-testid` bleiben erhalten.
   - Kundenmarken (zum Beispiel Studienkolleg Aachen) bekommen die NeXify-Gestaltung nicht ungeprüft.

## Gleichmacher: Pflicht vor jeder Auslieferung

Lokal bauen und starten, dann messen:

```bash
cd apps/web && npx next build && npx next start -p 3311
```

```bash
node tools/gleichmacher.mjs http://localhost:3311
```

```bash
node tools/live-check.mjs http://localhost:3311
```

`tools/gleichmacher.mjs` lädt jede verlinkte Seite im echten Browser und vergleicht die berechneten Stile der gemeinsamen Bausteine mit der Startseite, bei 390 und 1440 px. Exit 0 heißt: keine Abweichung. Jeder Befund nennt Baustein, Eigenschaft, Norm und Istwert.

Ein Befund wird an der Ursache behoben: Die Seite verwendet den Baustein oder seine Hülle nicht richtig. Nicht zulässig sind ein Überschreiben mit festen Werten, eine Ausnahme im Prüfskript oder das Entfernen des Bausteins aus der Prüfliste.

Danach die Gates aus `AGENTS.md`: `make check`, `node tools/ds-audit-cli.js`, `node tools/lint.mjs`, `node apps/web/scripts/atelier-literale.mjs`.

## Stand (14.11.2026, gegen nexifyai.de)

44 Seiten, 0 Abweichungen. Geprüft werden elf Bausteine: Hero-Titel, Akzent, Hero-Text, primärer Hero-Schalter, Kopfleiste, Logo, Fußzeile, Fußzeilen-Link, Abschnitts-Titel, Text-Schalter und Abschluss-Schalter.

Gemessen wird überall mit geschlossener Chat-Scheibe. Die Scheibe öffnet sich ab 1200 px nur auf NeXify-Seiten von selbst und macht den Inhalt schmaler; weil die Schriftgröße mit der Behälterbreite wächst, sähe ein Vergleich mit gemischtem Zustand wie eine Abweichung aus. Der erste Lauf des Werkzeugs meldete deshalb 70 Abweichungen im Shop, die keine waren.

## Neuen Baustein in die Prüfung aufnehmen

Entsteht mit Freigabe des Inhabers ein neuer gemeinsamer Baustein, im selben Commit:

1. Zeile in der Inventar-Tabelle oben ergänzen.
2. Eintrag in `BAUSTEINE` in `tools/gleichmacher.mjs` ergänzen (Name und Selektor).

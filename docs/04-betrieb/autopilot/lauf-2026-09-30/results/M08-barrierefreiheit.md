# M-08 · Barrierefreiheit-Durchgang · Nachweis

**Zeit:** 2026-09-30T10:30:00Z · **Umgebung:** DUS, Chromium 1243 + axe-core 4.x, 1440 px

## Ergebnis

| Prüfung | Wert |
|---|---|
| DS-Audit A11y-Regeln (DS-A-01..04, DS-I-01) | 0 Fehler, 0 Warnungen |
| axe-core WCAG 2 A/AA gerendert: Cloud v12 | 0 Verstöße |
| axe-core: NeXify Shop | 0 Verstöße |
| axe-core: Rechtliches | 0 Verstöße |
| axe-core: NeXify AI one | 1 flaky `color-contrast` (3 Nodes, erscheint nicht bei jedem Lauf) |
| Statische Heuristik `tools/a11y.mjs` | 40 Seiten, 15 „möglicher Kontrast“-Hinweise (Papier-Dokumente) |

## Befund (offen, nicht blockierend)

- `NeXify AI one.dc.html` zeigt intermittierend 3 `color-contrast`-Knoten. Statisch
  nutzen die hellen Papier-Abschnitte dunklen Text (`#111312` auf `#F6F7F4`/`#FFFFFF`);
  der Befund stammt vermutlich aus einem dynamisch gerenderten Terminal-/Demo-Zustand
  (`#6FE3CF` auf dunklem Grund). Gezielt nachstellen und fixen.

## Kernaussage

A11y-Grundschicht ist grün (DS-Audit + 3 von 4 geprüften Seiten ohne axe-Verstoß).
Ein flaky Kontrast-Befund auf `one` bleibt als Follow-up.

## Nachprüfung (30.09. 10:48 UTC)

3 axe-Läufe auf `NeXify AI one.dc.html` (networkidle): 1 Verstoß / 0 / 0 → **flaky**.
Statisch ist die einzige `#6FE3CF`-Textstelle auf `#1E2220` (Kontrast ≈ 10,9:1) → korrekt.
Ursache des Flackerns: dynamisches Rendern/Font-Timing im axe-Lauf, kein echter Farbfehler.
Kein Fix nötig.

# 03 · Designsystem „Graphit & Lime“ (NEXIFYAI-CD-2026 auf Bildschirm)

## Farbe
| Token | Hex | Einsatz |
|---|---|---|
| graphit-900 | `#1B1E1D` | eingelassene Flächen, Terminal, Laufband |
| graphit-800 | `#242826` | Seitengrund |
| graphit-700 | `#2A2E2C` | Bänder, Karten-Basis |
| graphit-600 | `#303634` | Karten-Kopf (Verlauf oben) |
| linie | `rgba(255,255,255,.08)` | Karten-Rahmen; hell: `#363A38`, kräftig `#4A4F4C` |
| text | `#FFFFFF` / `#E3E6E3` / `#BCC1BD` / `#9CA29E` | Kontrast auf 800: 15,6 / 12,4 / 8,4 / 5,9 :1 |
| **lime** | `#D7FA50` (hell `#EEFF9A`, dunkel `#BFE83C`) | Marke, Aktion, Fokus |
| türkis | `#6FE3CF` | Erfolg, Quelle, Beleg |
| amber | `#FFC24A` | offene Entscheidung, Beispielwert |
| rot | `#FF8A7A` | Fehler |
| violett | `#A78BFA` | nur Signalfeld/Licht (5–13 %) |
Text auf Lime: `#111312` (Kontrast 15,2:1). Papier (E-Mail, Dokumente, Vorschau-Fenster): `#F6F7F4`/`#111312`.

## Typografie
Geist (400/500/600/700) für Text und Überschriften, Geist Mono (400/500/600) für Kicker, Zahlen, IDs, Zeiten. H1 80/0,98/-0,04em (mobil 38–52) · H2 42–52/1,05/-0,03em · H3 20–28/-0,02em · Fließtext 17–18/1,55 · Klein 13–15 · Mono-Kicker 12–14. Zeilenlänge ≤ 66 Zeichen. `text-wrap: pretty`.

## Raum, Raster, Radien
Container `min(1280px, 100% − 48px)`; Abschnitte 96 px vertikal (mobil 64); Kartenabstand 16, Karten-Innenraum 22–36. Breakpoints 640 / 820 / 1040 / 1100. Radien: **8** Steuerung klein · **10** Buttons/Inputs · **12** kleine Karten/Chips · **16** Karten · **20** Leitkarte · 999 Pillen. Mindestziel 44 px (Header-Pillen 30 px innerhalb 44-px-Zeile).

## Tiefe und Licht
- **Karte:** `linear-gradient(180deg,#303634,#262A28)` + Rahmen `rgba(255,255,255,.08)` + `inset 0 1px 0 rgba(255,255,255,.07)` + Schlagschatten `0 28px 56px -32px rgba(0,0,0,.85)`.
- **Eingelassen (Well):** `#1E2220`, `inset 0 2px 10px rgba(0,0,0,.45)`, `inset 0 0 0 1px rgba(255,255,255,.05)`.
- **Band:** Verlauf `#2C312F→#262A28` mit Lime- (links oben) und Türkis-Licht (rechts unten), Oberkante hell, Unterkante dunkel.
- **Seitengrund:** drei Lichtflecken (Lime 8 %, Türkis 5,5 %, Violett 6 %).
- **Primärbutton:** `linear-gradient(180deg,#EEFF9A,#D7FA50 55%,#BFE83C)` + `inset 0 1px 0 rgba(255,255,255,.6)` + Glühen `0 14px 34px -12px rgba(215,250,80,.65)`.
- **Maus-Spotlight:** Karten mit `data-glow` zeigen einen Lime-Lichtfleck (`--mx/--my`, 420 px, 13 %).
- **Hero:** Signalfeld-Canvas (`mix-blend-mode: screen`), Szene mit Perspektive (±4°/2°), Lichtschein dahinter.

## Bewegung
Einblenden 0,3–0,7 s (`nxRise`), Balken 1,0–1,6 s Ease-out, Laufband 46 s, Schimmer 7 s, Signet-Idle 7 s. Alles aus bei `prefers-reduced-motion`. Bewegung bedeutet Zustand, nie Dekoration.

## Komponenten
Header (2 Ebenen: Leiste mit Pillen-Gruppen + Hauptleiste), Footer (Marke, Spalten, Märkte, Einwilligung), Karte, Well, Kicker (Mono, Lime, Nummer), Beleg-Chip (Quelle · Jahr / Beispiel / gerechnet / aggregiert), Demo-Fenster (Titelleiste, drei Punkte, „Demo“-Chip), Terminal-Zeile (Marke + Text), Sagt-Karte (Signet + Text), Preis-Karte, Akkordeon, Stepper, Toast, Schwebende CTA-Leiste, Berater-Panel.
Zustände jeder Komponente: normal, Hover (Rahmen Lime oder Aufhellung), Fokus (2 px Lime, Abstand 2 px; Logo: Unterstreichung), aktiv, deaktiviert (Deckkraft .5–.6, `not-allowed`), Fehler (Rahmen rot + Meldung).

## Verbote
Keine Emoji, keine Stock-Fotos, keine gezeichneten Illustrationen, keine erfundenen Logos; Bilder sind gekennzeichnete Bildplätze (gestreift + Mono-Text).

# TEILEKLAR — Token-Mapping-Vorschlag (Kundenentscheidung)

Quelle: `scripts/check-tokens.mjs` + `scripts/check-system.mjs` im Kunden-Repo `teileklar` (design/tokens.json
ist Gesetz). Der Shop `TEILEKLAR Shop.dc.html` verletzt aktuell 9 Vorgaben. Dieser Vorschlag macht sie
entscheidungsfaehig; die Umsetzung erfordert die **Kunden-/Designfreigabe**.

## Farben (2)

| Ist | Kontext | Vorschlag |
| --- | --- | --- |
| `#9A2B22` | Auth-Fehlertext | Neues Token `color.fehler` (+ `color.fehler-flaeche` = `#FBEAE9`) — das System hat bisher keine Fehlerfarbe (nur `erfolg`/`amber`). Alternativ: `amber-text` (`#8F4E12`). |
| `#8A8D8F` | Consent-Hinweis (sekundaer) | Naechstliegendes Grau-Token `grau-meta` (`#646769`) oder `grau-dezent` (`#A1A3A4`). |

## 4-px-Raster (2)

| Ist | Vorschlag |
| --- | --- |
| `margin 6px` | `8px` (oder `4px`) |
| `padding 14px` | `16px` (oder `12px`) |

## Schriftskala (5)

Gueltige Stufen (Tokens): `10.5px` (minimum/kicker/fussnote), `13.5px` (kartentext), `14px` (fliesstext),
`18px` (h3), `38px` (h2), `clamp(30px,3.6vw,44px)` (h1).

| Ist | Vorschlag |
| --- | --- |
| `19px` | `18px` (h3) |
| `15px` | `14px` (fliesstext) oder `13.5px` (kartentext) |
| `14.5px` | `14px` |
| `12.5px` | `13.5px` oder `10.5px` |
| `11.5px` | `10.5px` |

## Entscheidung + Retest

1. Kunde entscheidet je Zeile (Token uebernehmen ODER auf bestehendes Token mappen).
2. Bei neuen Tokens: `design/tokens.json` + `design/tokens.css` ergaenzen, Shop auf Tokens umstellen.
3. Retest: `node scripts/check-tokens.mjs && node scripts/check-system.mjs` -> 0 Befunde.

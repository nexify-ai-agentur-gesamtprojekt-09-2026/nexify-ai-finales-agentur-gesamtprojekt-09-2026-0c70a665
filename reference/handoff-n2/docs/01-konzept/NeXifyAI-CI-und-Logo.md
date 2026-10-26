# NeXify AI — Charakterfamilie und CI (verbindlich)

**Status:** ab 04.09.2026 — ersetzt die Vorgängerfassung. **Ausdrückliche Nutzerentscheidung 04.09.2026:** Die frühere Regel „nur ein Signet" ist bewusst aufgehoben. NeXify AI tritt jetzt als **Familie mehrerer Charaktere** auf — eigene Form, eigene Farbe je Charakter, gemeinsame Bauweise, damit die Familie erkennbar zusammengehört statt wie zufällig gesammelte Icons zu wirken.

## 1. Warum eine Familie statt eines Symbols

„NeXify AI für Teams" verkauft mehrere Agenten/Rollen in einem Abo (Marketingkonzept §5). Ein einzelnes Signet für drei unterschiedliche Rollen hätte diese Unterscheidung nur über Text transportiert. Eine Charakterfamilie macht sie auf den ersten Blick sichtbar.

## 2. Die Charaktere

| Charakter | Rolle | Einsatzort | Form | Farbe |
|---|---|---|---|---|
| **NeXify AI** | Vertrieb & Erstberatung | nexifyai.cloud, alle bisherigen Flächen | Kreis-Badge, Signet unverändert | Lime `#C8F04B` (Original, unverändert) |
| **NeXify Support** | Betreuung, Rückfragen, laufender Kontakt im Team-Zugang | „NeXify AI für Teams", Kundenportal | Sechseck-Badge | Amber `#F0B84B` (Icon-Filter: `hue-rotate(-38deg) saturate(1.05) brightness(1.05)`) |
| **NeXify Research** | Recherche, Automatisierungslogik, Datenauswertung im Team-Zugang | „NeXify AI für Teams", Kundenportal | Abgerundetes Quadrat (`border-radius:24%`), Badge | Indigo `#7A8CFF` (Icon-Filter: `hue-rotate(155deg) saturate(1.1) brightness(1.02)`) |
| **TEILEKLAR-Berater** | Einkaufsberatung im Shop (bisher „KLARA", dann „NeXify AI") | teileklar.shop | Raute (`polygon(50% 0%,100% 50%,50% 100%,0% 50%)`), Badge | Lime `#C8F04B` — **TEILEKLAR-eigener Token, keine neue Farbe** (CLAUDE.md bindend) |

## 3. Gemeinsame Bauweise (das, was die Familie zusammenhält)

Alle vier nutzen **dasselbe Basis-Artwork** (`assets/nexify-ai/nexify-ai-signet.svg`, das reale Visual-Pack-Asset — keine Neuzeichnung). Unterscheidung entsteht ausschließlich über:

1. **Badge-Form** (Kreis/Sechseck/Rundes Quadrat/Raute) — Hintergrundfläche hinter dem Icon, ~72px Standardgröße, Icon darin ~44px zentriert.
2. **Icon-Filter** (`filter: hue-rotate(...) saturate(...) brightness(...)`) — verschiebt die Signet-Farbe, ohne die Form neu zu zeichnen.
3. **Badge-Hintergrund** — Farbtonwert bei niedriger Deckkraft (`background: rgba(…, .12–.14)`), passend zum jeweiligen Charakter.

**Nie** neu: die Blattform des Signets selbst, die Apertur, der Kernpunkt. Das bleibt bei jedem Charakter erkennbar dieselbe DNA — nur Rahmen und Farbe wechseln.

## 4. Textfarben für Kontrast (AA, auf hellem Grund)

| Charakter | Textfarbe auf Weiß/Papier |
|---|---|
| NeXify AI | `#4A5C10` (bestehend) |
| NeXify Support | `#8A5A0E` |
| NeXify Research | `#4247B0` |
| TEILEKLAR-Berater | `#4A5C10` (TEILEKLAR-Token „Lime dunkel") |

## 5. Bewegung

Unverändert aus der Vorgängerfassung: `idle` als Ruhezustand für reine Markendarstellung (Roster-Karten, Teaser); `listening`/`working`/`success` ausschließlich bei echter laufender Interaktion — pro Charakter identische Zustandsnamen, nur der jeweilige Icon-Filter bleibt während der Animation erhalten.

## 6. Verboten (weiterhin)

- Ein fünftes „Ad-hoc"-Symbol ohne Eintrag in dieser Tabelle.
- Formen/Filter mischen (z. B. Support-Farbe auf Vertrieb-Form) — jede Zeile der Tabelle ist eine feste Kombination.
- Für TEILEKLAR-Berater einen anderen Ton als das bestehende Lime-Token verwenden.

## 7. Referenzimplementierung

Roster-Darstellung („NeXify AI für Teams"-Abschnitt) in `NeXifyAI Cloud.dc.html`, Home-Ansicht. TEILEKLAR-Berater-Badge in `TEILEKLAR Shop.dc.html` (Beratungspanel/Toggle).

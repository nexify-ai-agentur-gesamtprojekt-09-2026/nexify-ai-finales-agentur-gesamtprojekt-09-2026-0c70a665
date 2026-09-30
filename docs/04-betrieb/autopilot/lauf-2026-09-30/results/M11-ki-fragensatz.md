# M-11 · KI-Fragensatz-Lauf · Nachweis

**Zeit:** 2026-09-30T10:37:00Z · **Umgebung:** DUS, Modell `ds/deepseek-v4-pro` via ai-router

## Ergebnis

| Prüfung | Wert |
|---|---|
| Fragensatz validiert | 150 Fälle, 5 Vorgangsarten (anfrage/rechnung/recht/support/werkstatt), 0 unvollständig |
| Repräsentativer Lauf (5 Fälle, je 1 je Art) | alle beantwortet |
| Modell erreichbar | ja (chat/completions, Streaming-Antwort) |

## Befund (echt, aus dem Lauf)

- **AN01 (anfrage)** erwartet laut Fragensatz: „Preis nur aus lib/rechenkern.js, sonst
  ‚Angebot folgt‘ – keine freie Preisnennung“.
- Modellantwort nannte freie Preise („Setup 500–1.500 € …“). → **Abweichung**: Preishoheit
  wird umgangen. Muss über System-Prompt/Regelwerk erzwungen werden.

## Kernaussage

Der goldene Fragensatz läuft und deckt eine echte Regelverletzung auf (freie Preisnennung).
Vollständiger 150-Fälle-Lauf als eigener Job offen.

## Fix (nachgetragen)

`config/prompts/s1-master-orchestrator-2.0.0.md` (nexify-neu) um die unverrückbare Regel
ergänzt: „Nie einen Preis aus dem Gedächtnis; Betrag nur aus `lib/rechenkern.js` bzw.
`config/fakten.json`, sonst ‚Angebot folgt‘.“ Verifiziert: AN01 antwortet jetzt
„Preis: Angebot folgt“ statt freier Preise.

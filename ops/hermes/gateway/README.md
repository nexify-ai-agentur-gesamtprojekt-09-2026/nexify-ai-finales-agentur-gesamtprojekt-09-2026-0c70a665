# Modell-Wächter (Entwurf)

Stand 14.11.2026. **Nicht eingespielt, nicht freigegeben, kein laufender Dienst.** Einordnung, Grenzen und Bewertung der Alternativen: `docs/04-betrieb/hermes-arbeitsbereich-2026-11-14.md`, Abschnitt 3a.

## Wozu

`config/llm-policy.json` verlangt exakt ein Modell und exakt eine Reasoning-Stufe, ohne stillen Ersatz. Die Hermes-Konfiguration stellt das nur als Voreinstellung her: Die Oberfläche bietet eine Modell- und Reasoning-Auswahl je Gespräch, und ein Zeitplan kann ein eigenes Modell tragen. Der Wächter sitzt zwischen Hermes und dem Anbieter und lässt nur Anfragen durch, die der Vorgabe entsprechen.

## Verhalten

| Anfrage | Ergebnis |
|---|---|
| Modell und Stufe der Vorgabe | weitergeleitet; `provider.require_parameters: true` gesetzt |
| Modell der Vorgabe, keine Reasoning-Angabe | weitergeleitet mit der vorgeschriebenen Stufe |
| anderes Modell, auch mit Anhang oder ohne `-1017` | 422 `model_policy`, kein Aufruf beim Anbieter |
| andere Stufe, Reasoning abgeschaltet, eigenes Token-Budget | 422 `reasoning_policy`, kein Aufruf beim Anbieter |
| Ausweichliste (`models`, `route`), Ausweichanbieter | 422 `model_policy` |
| Antwort oder Strom nennt ein anderes oder kein Modell | 502 `model_policy`, nichts wird ausgeliefert |
| ohne gültigen Zugangswert | 401 |

Der Wächter bindet nur an die lokale Schleife, folgt keinen Weiterleitungen und lässt als Gegenstelle nur `https://openrouter.ai` zu. Das Protokoll nennt Zeit, Urteil und verlangtes Modell, nie Inhalte oder Schlüssel.

## Zugänge (nur Bezeichnung und Ablageort)

| Bezeichnung | Ablageort | Wer trägt ein |
|---|---|---|
| `WAECHTER_UPSTREAM_KEY` (OpenRouter-Schlüssel mit Ausgabenlimit) | Umgebungsdatei des Dienstes auf dem Server, Rechte 600, außerhalb der in den Hermes-Container eingehängten Ordner | Inhaber |
| `WAECHTER_CLIENT_TOKEN` (gilt nur am Wächter, mindestens 24 Zeichen) | dieselbe Datei und `/root/.hermes/.env` | Inhaber |

## Prüfen

```bash
python3 -m unittest tests.test_hermes_arbeitsbereich -k ModellWaechter
```

Die Tests laufen gegen eine Attrappe auf `127.0.0.1`, ohne Schlüssel und ohne Modellaufruf.

## Nicht belegt

- Hermes mit dem Wächter als Gegenstelle (ob jede Art von Aufruf dort ankommt, auch Nebenaufgaben und Zeitpläne).
- Ein echter Aufruf bei OpenRouter und die dort abgerechnete Reasoning-Stufe.
- Betrieb als Dienst: Start, Neustart, Protokollablage, Überwachung, Last.
- Unabhängige Prüfung des Quelltexts. Vor einem Einsatz nötig, ebenso die Entscheidung des Inhabers; `config/llm-policy.json` nennt als Zielroute 9router.

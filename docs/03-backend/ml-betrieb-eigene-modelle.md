# ML-Betrieb · eigene und lokale Modelle (NeXify AI)

**Stand 27.09.2026 · Plan.** Ergänzt Abschnitt 10b in `docs/03-backend/nexifyai-api-abrechnungskonzept.md` (eigene/lokale Modelle über 9router, Stufen 0–2). Rolle: ML Engineer, zuständig dafür, dass ein Modell **zuverlässig in Produktion** läuft, nicht für Prototypen.

## 1 · Was betrieben wird

| Modell | Zweck | Stufe | Betrieb |
|---|---|---|---|
| Einordner (klein, feinjustiert) | Tag/Absicht erkennen, Vorgang zuordnen | 0 lokal | CPU, ONNX Runtime |
| Antwort-Modell (offen, feinjustiert auf NeXify-Stil und Wissen) | Standardantworten, Entwürfe | 0/1 | GPU-Knoten, OpenAI-kompatibler Endpunkt hinter 9router |
| Einbettungen | Wissenssuche (LightRAG) | 0 lokal | CPU |
| Fremdmodell (stark) | Unsicherheit, schwierige Fälle | 2 | extern über 9router |

9router bleibt die einzige Tür: Kunde und Agenten sehen nie, welches Modell antwortet. Abrechnung immer über den Rechenkern.

## 2 · Serving

- Container je Modell (Docker) auf eigener VPS in Frankfurt, hinter Cloudflare, nicht öffentlich erreichbar, nur 9router spricht mit ihnen.
- Endpunkt OpenAI-kompatibel, Health-Endpunkt, Metriken (Latenz p50/p95, Fehler, Tokens/s).
- **Rückfall:** Modell nicht gesund oder zu langsam → 9router stuft automatisch eine Stufe hoch. Kosten steigen, Dienst bleibt.
- Zwischenspeicher: diskcache bzw. Postgres, kein Redis.

## 3 · Ausrollen neuer Modellversionen

1. Training → Registrierung (MLflow, Version, Datensatz-Hash, Parameter).
2. **Fragensatz-Test** offline: fester Satz aus echten, bereinigten Vorgängen je Vorgangsart. Neue Version muss ≥ alte sein, sonst Stopp.
3. **Vorschau-Stufe:** 60 s stabil, E3-Gegentest (falsche Eingabe, leere Eingabe, Rückfall ausgelöst).
4. **Canary:** 5 % der Vorgänge einer Art, 48 h, getrennte Messung.
5. Stufenweise 25 % → 100 %, nur wenn Qualität und Kosten halten.
6. **Rollback:** Umschalten in 9router auf Vorversion, ein Klick in myADMIN, ohne Serverzugriff. Wird bei jedem Rollout einmal ausgeführt, nicht nur beschrieben.

Freigabe jeder Übernahme auf 100 %: Pascal.

## 4 · Überwachung

| Messgröße | Schwelle | Folge |
|---|---|---|
| Fragensatz-Treffer (täglich) | fällt > 3 Punkte | Alarm, Canary stoppen |
| Hochstufungen auf Stufe 2 | steigt > 50 % zur Vorwoche | Hinweis: Modell deckt Fälle nicht mehr |
| Eingabeverteilung (KS-Test gegen Training) | p < 0,05 an 3 Tagen | Drift-Hinweis, Retraining prüfen |
| Latenz p95 | > 2 s (Stufe 0/1) | Rückfall prüfen |
| Kosten je Vorgang | über Budget der Vorgangsart | Optimierer + Hinweis im Cockpit |
| Beschwerden/Korrekturen durch Menschen | steigt | Stichprobe durch Pascal |

Qualität wird gemessen, nicht nur Technik. Ein schneller, falsch antwortender Dienst ist nicht gesund.

## 5 · Training und Daten

- Trainingsdaten nur aus Vorgängen mit Einwilligung (offen: welche Kundendaten dürfen hinein, Entscheidung Pascal).
- Personenbezogenes wird vor dem Training entfernt; Datensatz versioniert mit Hash.
- **Train/Serve-Gleichheit:** dieselbe Vorverarbeitung (eine Funktion) für Training und Betrieb, mit Test.
- Retraining monatlich oder bei Drift-Hinweis, nie automatisch live, immer über Abschnitt 3.

## 6 · Werkzeuge

| Zweck | Werkzeug | Lizenz |
|---|---|---|
| Serving | vLLM oder llama.cpp-Server (Antwort-Modell), ONNX Runtime (klein) | Apache 2.0 / MIT |
| Registry, Versuche | MLflow | Apache 2.0 |
| Feinjustierung | Hugging Face Transformers + PEFT (LoRA) | Apache 2.0 |
| Drift | SciPy (KS-Test) | BSD |
| Router | 9router (vorhanden) | eigen |

Feature Store (Feast) ist hier **nicht nötig**: wenige, stabile Merkmale; eine dokumentierte Funktion reicht.

## 7 · Offen

- GPU-Knoten: eigen oder gemietet, Kosten je Monat.
- Welche Kundendaten ins Training dürfen.
- Fragensatz: Pascal wählt je Vorgangsart 30 Beispielfälle aus.
- Mindestqualität je Vorgangsart, ab der Stufe 0 statt 1 genutzt wird.

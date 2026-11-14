---
name: nexify-graph
description: Den Wissensgraphen des Repositories (Graphify) abfragen, bevor Dateien einzeln gelesen oder durchsucht werden. Verwenden bei Fragen wie „wo wird X verwendet", „was hängt von X ab", „wie hängen A und B zusammen", vor jeder Änderung an einem gemeinsam genutzten Baustein und beim Einarbeiten in einen unbekannten Bereich.
---

# Wissensgraph (Graphify)

Inhabervorgabe vom 14.11.2026: Graphify wird überall eingesetzt, damit Einarbeitung und Wirkungsanalyse nicht jedes Mal neu durch Lesen vieler Dateien entstehen. Quelle: https://github.com/Graphify-Labs/graphify (Apache-2.0), feste Version in `tools/graph.sh`.

`AGENTS.md` und `CLAUDE.md` gelten unverändert. Der Graph ersetzt keine Prüfung und kein Gate.

## Was hier eingerichtet ist

| Teil | Zweck |
|---|---|
| `tools/graph.sh` | Einziger Einstieg. Baut den Graphen und reicht Abfragen durch. |
| `make graph` | Graph bauen oder aktualisieren. |
| `.graphifyignore` | Was nicht in den Graphen gehört (fremde Referenzen, Belege). |
| `.graphifyrc` | Vorgaben für Abfragen. |
| `graphify-out/` | Ausgabe, nicht versioniert. Enthält `graph.json`, `GRAPH_REPORT.md`, `graph.html`. |

Es läuft nur der lokale Code-Lauf (tree-sitter). Kein LLM, kein Konto, keine Projektinhalte verlassen die Maschine. Der Cloud-Dienst von Graphify ist nicht eingerichtet; ein Konto dort ist eine Inhaberentscheidung.

## Verwenden

```bash
bash tools/graph.sh
```

```bash
bash tools/graph.sh explain "HeroStage"
```

```bash
bash tools/graph.sh affected "verifyWebhookSignature"
```

```bash
bash tools/graph.sh path "Storefront" "ActionLink"
```

```bash
bash tools/graph.sh query "Wo wird die Projektbindung des Shops geprüft?"
```

- **Vor einer Änderung an einem gemeinsamen Baustein:** `affected` zeigt, welche Seiten, Tests und Module betroffen sind. Diese Liste gehört in die Beschreibung des Pull Requests.
- **Beim Einarbeiten:** erst `explain` oder `query`, dann gezielt die genannten Dateien lesen.
- **Nach größeren Änderungen:** `bash tools/graph.sh` erneut; der Lauf dauert rund 30 Sekunden.

## Grenzen

- Kanten mit `EXTRACTED` stehen so im Quelltext, Kanten mit `INFERRED` sind abgeleitet. Eine abgeleitete Kante ist ein Hinweis, kein Beleg.
- CSS-Dateien und reine Datendateien liefern keine Symbole. Fragen zur Gestaltung beantwortet weiter `tools/gleichmacher.mjs`.
- Ein Name, der mehrfach vorkommt, wird mit Kandidatenliste abgelehnt (Exit 3); kein Treffer ist Exit 4.
- Der Graph ist so alt wie sein letzter Lauf. `GRAPH_REPORT.md` nennt den Commit.

## Stand (14.11.2026, main 2d1eb69)

11.829 Knoten, 20.760 Kanten, 809 Gruppen; Laufzeit 28 Sekunden.

## In ein anderes Projekt übernehmen

`tools/graph.sh`, `.graphifyrc` und diesen Skill kopieren, `.graphifyignore` an das Projekt anpassen, `graphify-out/` in `.gitignore` eintragen. Kundendaten und Graphen verschiedener Kunden werden nicht zusammengeführt.

# Skills des NeXify-Monorepos

Übersicht, welcher Skill wann zu verwenden ist. Der Inhalt steht nur im jeweiligen `SKILL.md`; diese Tabelle wiederholt ihn nicht. `AGENTS.md` und `CLAUDE.md` gelten unverändert und gehen jedem Skill vor.

Kommt ein Skill dazu, hier genau eine Zeile ergänzen, im selben Commit.

## Arbeitsweisen

| Skill | Wann verwenden |
|---|---|
| [`nexify-zweig-und-pr`](nexify-zweig-und-pr/SKILL.md) | Vor jeder Änderung an einer Datei: eigener Worktree, Gates, `main` einholen, Entwurfs-PR. |
| [`nexify-pr-sichtung`](nexify-pr-sichtung/SKILL.md) | Offene Pull Requests einordnen (mergebar, überholt, braucht Entscheidung), vor jeder Merge-Runde. |
| [`nexify-agenten-koordination`](nexify-agenten-koordination/SKILL.md) | Als koordinierende Sitzung Fachagenten beauftragen, Berichte nachprüfen, mergen. |
| [`nexify-stand-halten`](nexify-stand-halten/SKILL.md) | Nach jedem Merge und jeder Inhaberentscheidung die führenden Dokumente nachführen. |
| [`nexify-belege-und-pins`](nexify-belege-und-pins/SKILL.md) | Vor Änderungen an gebundenen Dateien; wenn Prüfsummen abweichen oder Browser-Belege zu erneuern sind. |
| [`nexify-graph`](nexify-graph/SKILL.md) | Vor dem Einzellesen vieler Dateien und vor Änderungen an gemeinsam genutzten Bausteinen. |

## Fachliche Arbeiten

| Skill | Wann verwenden |
|---|---|
| [`nexify-klon-fabrik`](nexify-klon-fabrik/SKILL.md) | Neue Seiten, Abschnitte, Heros, Schalter in `apps/web`; Messung gegen die Startseite. |
| [`nexify-seitentexte`](nexify-seitentexte/SKILL.md) | Seitentexte in `config/site-map.json` und `config/home-concept-copy.json` ändern, vier Sprachen. |
| [`nexify-shop-zugriffsschicht`](nexify-shop-zugriffsschicht/SKILL.md) | Datenzugriff von `apps/shop-api` hinter die Zugriffsschicht legen (D-013). |
| [`nexify-auslieferung-pruefen`](nexify-auslieferung-pruefen/SKILL.md) | Prüfen, ob eine öffentliche Auslieferung mehr preisgibt als die gebaute Seite. |
| [`nexify-kundenprojekt`](nexify-kundenprojekt/SKILL.md) | Sobald eine Aufgabe einen Kunden, dessen Daten, Design oder Abnahme betrifft. |
| [`composio`](composio/SKILL.md) | Arbeit mit Composio (Anbindung fremder Apps, MCP, SDK, CLI). |

## Reihenfolge bei einer gewöhnlichen Änderung

`nexify-zweig-und-pr` → passender Fach-Skill → `nexify-belege-und-pins`, falls gebundene Dateien betroffen sind → Entwurfs-PR → Merge durch die koordinierende Sitzung oder den Inhaber → `nexify-stand-halten`.

Daneben gibt es die in `CLAUDE.md` genannten Projekt-Skills unter `skills/` (Verzeichnis `config/project-skills.json`, Prüfung `python3 tools/project_skills.py verify`). Sie sind hier nicht aufgeführt und bleiben unberührt.

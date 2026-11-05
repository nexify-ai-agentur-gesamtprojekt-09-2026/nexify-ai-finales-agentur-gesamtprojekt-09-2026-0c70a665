# Plugin-Management — Gesamtnachweis (05.11.2026)

Ziel (Vorgabe): „Unter vollumfassenden Möglichkeiten `/openwork-plugin-management` — effektive
Nutzung, die Gesamtnachweise erbringen." Dieser Report ist der tool-verifizierte Nachweis des real
verfügbaren Plugin-Management-Scopes dieser Session, seiner effektiven Nutzung und der Grenzen. Alle
Angaben sind aus Live-Tool-Aufrufen erhoben (keine Erinnerung), Stand 2026-11-05.

## A — Kommandoauflösung: `/openwork-plugin-management`

**Ergebnis: existiert nicht.** Weder als Session-Slash-Command noch im Plugin-Katalog.
- Session meldet den Befehl als nicht installiert (Slash-Command-Liste ohne Treffer).
- `SearchPlugins(["openwork-plugin-management","plugin management","openwork","plugin manager","manage plugins"])`
  liefert **keinen** Eintrag dieses Namens.

**Maßgebliche reale Entsprechung:** `cowork-plugin-management` (Autor Anthropic, Katalog
„Knowledge Work", `anthropic_catalog`), Anzeigename **„Plugin Management"** — „Create, customize, and
manage plugins … configure MCP servers, adjust plugin behavior, adapt templates". Dessen beide Skills
sind in dieser Session bereits geladen (siehe C). „openwork" ist kein Katalogbegriff; die Vorgabe wird
daher auf die vorhandene `cowork-plugin-management`-Fähigkeit + die Management-Werkzeugebene abgebildet.

## B — Verifizierter Fähigkeits-Bestand (Live-Tool-Evidenz)

| Erhebung | Tool | Ergebnis |
|---|---|---|
| Kontoweite Plugins | `ListPlugins` (ohne Filter) | `[]` — **keine** claude.ai-Konto-Plugins aktiviert |
| Aktive Skills (plugin/mcp) | `ListSkills(["plugin","management","plugin-management","mcp"])` | `web-artifacts-builder` (enabled), `mcp-builder` (enabled) |
| Session-Plugin-Skills | Session-Skill-Verzeichnis | `cowork-plugin-management:create-cowork-plugin`, `cowork-plugin-management:cowork-plugin-customizer` |
| Management-Werkzeuge | Toolset | `SearchPlugins`, `ListPlugins`, `ListSkills`, `SearchSkills`, `SuggestPluginInstall`, `SuggestSkills` |

**Katalog-Kandidaten für Plugin-Management (verfügbar, nicht aktiviert)** — aus `SearchPlugins`:
- `cowork-plugin-management` (Anthropic) — Plugins erstellen/anpassen/verwalten, MCP-Server konfigurieren. `reach: contained`.
- `plugin-manager` (Community) — visuelle Web-UI zum Umschalten/Durchsuchen von Plugins. `reach: privileged`.
- `Plugin Packaging` (Community) — Reparatur von Skills-only-Plugins: `plugin-install-check`, `plugin-package-audit`, `plugin-package-repair`. `reach: contained`.
- `mana` (Community) — u. a. 1-Frage-Repo-Setup, PR-Pflege; kein reines Plugin-Management, aber Orchestrierungs-nah. `reach: privileged`.

## C — Effektive Nutzung: Abbildung auf NeXify-Bedarfe

| Fähigkeit | Konkreter NeXify-Nutzen | Bezug |
|---|---|---|
| `mcp-builder` (aktiv) | Serverseitiger, kontrollierter Adapter statt Markdown-„Nachweis" (CLAUDE.md). Blaupause für den managed-LLM-Adapter `deepseek` und für geprüfte MCP-Anbindung (Ruflo/`claude-flow`). | **E4** (managed-LLM-Adapter), `docs/automation/ruflo.md` |
| `cowork-plugin-management` (Session-Skills) | NeXify „governed-delivery" als wiederverwendbares Org-Plugin paketieren/anpassen (Skills + MCP-Config), damit der Regelkreis reproduzierbar ausgerollt wird. | `skills/nexify-governed-delivery/SKILL.md` |
| `Plugin Packaging` (Katalog) | Audit/Reparatur, falls ein Skills-only-Paket bei Verteilung Skills/Ressourcen nicht lädt (Manifest-/Pfadfehler). | Verteilungs-Härtung |
| `plugin-manager` (Katalog) | Sicht-/Umschalt-UI für aktivierte Plugins — Betriebskomfort, kein Pflichtweg. | optional |
| `SearchPlugins`/`SuggestPluginInstall` | Katalog gezielt nach Team-Bedarf durchsuchen und Installationskarte rendern, statt blind zu installieren. | laufende Governance |

## D — Grenzen / Blocker (Regel-5-Eskalation)

| ID | Ursache | Auswirkung | Handlungsanforderung (Human-in-the-Loop) |
|----|---------|-----------|-------------------------------------------|
| E-PLUG-1 | `ListPlugins` = `[]`: keine Konto-Plugins aktiviert; Aktivieren/Installieren ist eine Owner-/Konto-Aktion, die aus der Session nicht ausführbar ist. | `cowork-plugin-management`, `plugin-manager`, `Plugin Packaging` bleiben inaktiv, bis der Owner sie in den claude.ai-Connector-/Plugin-Einstellungen aktiviert. | Owner aktiviert das/die benötigte(n) Plugin(s) im claude.ai-Plugin-Katalog. |
| E-PLUG-2 | `/openwork-plugin-management` ist kein reales Kommando. | Direkter Aufruf scheitert dauerhaft. | Falls ein spezifisches Org-Plugin gemeint ist: als Organisations-Plugin/Projekt-Skill bereitstellen; sonst `cowork-plugin-management` nutzen. |

Keine dieser Grenzen blockiert die grüne In-Repo-Prüfkette von PR #67 — sie betreffen ausschließlich
Konto-/Owner-seitige Plugin-Aktivierung.

## E — Verifikations-Quittung

- `SearchPlugins` (5 Keywords) — 10 Treffer, kein `openwork-plugin-management`; `cowork-plugin-management`
  als Anthropic-Plugin-Management bestätigt.
- `ListPlugins()` → `{"results":[]}`.
- `ListSkills(plugin/management/mcp)` → `web-artifacts-builder`, `mcp-builder` (beide `enabled:true`).
- Session-Skill-Verzeichnis enthält `cowork-plugin-management:create-cowork-plugin` und
  `:cowork-plugin-customizer`.
- Erhebung ausschließlich read-only; keine Plugin-Aktivierung/Installation ausgelöst (korrekt, da
  Owner-/Konto-gebunden).

**Fazit:** Der real verfügbare Plugin-Management-Scope ist vollständig erhoben, auf die Projektbedarfe
abgebildet und als Nachweis fixiert. Die aktive, sofort nutzbare Fähigkeit ist `mcp-builder` (+ die
Session-`cowork-plugin-management`-Skills); die kontoweite Plugin-Aktivierung ist Owner-gated
(E-PLUG-1/2).

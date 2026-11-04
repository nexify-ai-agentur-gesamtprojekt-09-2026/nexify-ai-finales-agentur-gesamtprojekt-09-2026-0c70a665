# Ruflo · Agenten-Orchestrierung

Stand 04.11.2026 · Nutzerentscheidung: Ruflo fest im Repository integrieren.

Ruflo (`ruflo@3.71.1`, MIT, Upstream `ruvnet/claude-flow`) stellt Swarm-Orchestrierung,
Skills und einen MCP-Server für Claude Code bereit. Gepinnte Metadaten und Prüfsummen:
`config/integrations/ruflo.json`.

## Was versioniert ist
- `config/integrations/ruflo.mcp.json`: MCP-Server `claude-flow` über `npx -y ruflo@3.71.1 mcp start`. Bewusst **nicht** als Projekt-`.mcp.json`: Headless-Sitzungen (`claude -p`, Agent SDK, CI) würden ihn sonst ohne Einzelfreigabe starten.
- `.claude/settings.json` → `env`: `CLAUDE_FLOW_V3_ENABLED`, `CLAUDE_FLOW_HOOKS_ENABLED`, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`.
- `.claude/skills/`: acht Ruflo-Skills (Swarm-Orchestrierung, SPARC, Verifikation, Pair-Programming u. a.).
- `.claude-flow/config.yaml` und `CAPABILITIES.md`; Laufzeitdaten sind gitignoriert.

## Nutzung
```bash
npx -y ruflo@3.71.1 init check
npx -y ruflo@3.71.1 swarm init --topology mesh --max-agents 5
npx -y ruflo@3.71.1 metaharness score
```
MCP bewusst lokal aktivieren (pro Arbeitsplatz, nicht für CI):
```bash
claude mcp add-json claude-flow "$(python3 -c 'import json;print(json.dumps(json.load(open("config/integrations/ruflo.mcp.json"))["mcpServers"]["claude-flow"]))')" --scope local
```
Tool-Aufrufe bleiben bestätigungspflichtig.

## Grenzen
- Kein eigener Providerschlüssel und kein Modellwechsel. NeXify-managed LLM-Aufrufe bleiben an
  `config/llm-policy.json` gebunden (`deepseek/deepseek-v4.1-flash-1017`, Reasoning `high`).
- Ruflo-Skills ergänzen `skills/` und `config/project-skills.json`, ersetzen sie nicht. Bei Widerspruch
  gelten `AGENTS.md`, die Gates und die Secret-/Mandantengrenzen.
- Nicht aktiviert: globaler `~/.claude/CLAUDE.md`-Block, Cognitum-Anmeldung, `skills.sh`, Mod-Plugins,
  Cloud-MCP (`ruv-swarm`, `flow-nexus`), Daemon-Autostart.
- Upgrade nur über das Verfahren in `config/integrations/ruflo.json`.

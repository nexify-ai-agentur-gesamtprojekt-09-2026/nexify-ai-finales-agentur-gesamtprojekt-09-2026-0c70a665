# Ruflo · Agenten-Orchestrierung

Stand 04.11.2026 · Nutzerentscheidung: Ruflo fest im Repository integrieren.

Ruflo (`ruflo@3.71.1`, MIT, Upstream `ruvnet/claude-flow`) stellt Swarm-Orchestrierung,
Skills und einen MCP-Server für Claude Code bereit. Gepinnte Metadaten und Prüfsummen:
`config/integrations/ruflo.json`.

## Was versioniert ist
- `.mcp.json`: MCP-Server `claude-flow` über `npx -y ruflo@3.71.1 mcp start`, `autoStart: false`.
- `.claude/settings.json` → `env`: `CLAUDE_FLOW_V3_ENABLED`, `CLAUDE_FLOW_HOOKS_ENABLED`, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`.
- `.claude/skills/`: acht Ruflo-Skills (Swarm-Orchestrierung, SPARC, Verifikation, Pair-Programming u. a.).
- `.claude-flow/config.yaml` und `CAPABILITIES.md`; Laufzeitdaten sind gitignoriert.

## Nutzung
```bash
npx -y ruflo@3.71.1 init check
npx -y ruflo@3.71.1 swarm init --topology mesh --max-agents 5
npx -y ruflo@3.71.1 metaharness score
```
In Claude Code den MCP-Server `claude-flow` freigeben; Tool-Aufrufe bleiben bestätigungspflichtig.

## Grenzen
- Kein eigener Providerschlüssel und kein Modellwechsel. NeXify-managed LLM-Aufrufe bleiben an
  `config/llm-policy.json` gebunden (`deepseek/deepseek-v4.1-flash-1017`, Reasoning `high`).
- Ruflo-Skills ergänzen `skills/` und `config/project-skills.json`, ersetzen sie nicht. Bei Widerspruch
  gelten `AGENTS.md`, die Gates und die Secret-/Mandantengrenzen.
- Nicht aktiviert: globaler `~/.claude/CLAUDE.md`-Block, Cognitum-Anmeldung, `skills.sh`, Mod-Plugins,
  Cloud-MCP (`ruv-swarm`, `flow-nexus`), Daemon-Autostart.
- Upgrade nur über das Verfahren in `config/integrations/ruflo.json`.

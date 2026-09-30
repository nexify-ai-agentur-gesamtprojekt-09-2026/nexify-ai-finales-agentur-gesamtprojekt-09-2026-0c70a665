// Automatische Dokumentation: erzeugt Markdown aus den Konfigurationen, damit Doku nie hinter dem Stand herläuft.
// Aufruf in GitLab-CI: node tools/doku-generator.js → docs/generiert/*.md (wird per Merge Request vorgeschlagen, nicht direkt geschrieben).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const lies = (p) => JSON.parse(readFileSync(p, "utf8"));
const int = lies("config/integrationen.json");
const lauf = lies("config/langlauf.json");
const llm = lies("config/llm-verbindungen.json");
const regeln = lies("config/regelwerk.json");
const lernen = lies("config/lernen.json");
const mcpCfg = lies("config/mcp-server.json");
const heute = new Date().toISOString().slice(0, 10);
const kopf = (t) => `# ${t}\n\n> Automatisch erzeugt am ${heute} aus \`config/\`. Nicht von Hand ändern – Quelle ändern.\n\n`;

const dienste = kopf("Dienste- und Verbindungsverzeichnis") +
  "| Dienst | Schicht | Rolle | Prüfung | Status | Soll | Belegt am |\n|---|---|---|---|---|---|---|\n" +
  int.dienste.map((d) => `| ${d.id} | ${d.schicht} | ${d.rolle} | ${d.pruefung || "–"} | ${d.status} | ${d.soll || "–"} | ${d.belegt_am || "–"} |`).join("\n") +
  (int.statusregel ? "\n\n" + int.statusregel : "") +
  "\n\n## Ereignisse (Hooks)\n\n| Ereignis | Quelle | Folgeschritte |\n|---|---|---|\n" +
  int.ereignisse.map((e) => `| \`${e.name}\` | ${e.quelle} | ${e.folgt.join(" → ")} |`).join("\n") +
  "\n\n**Regeln:** " + int.hooks_regeln.join(" · ") + "\n";

const mcp = kopf("MCP-Werkzeuge") + `Server: \`${int.gateway.mcp}\`\n\n` + int.mcp_werkzeuge.map((w) => `- \`${w}\``).join("\n") + "\n\n" + int.mcp_regeln.map((r) => `- ${r}`).join("\n") + "\n";

const betrieb = kopf("Betriebshandbuch · Kurzfassung") +
  "## Gesundheitsprüfungen\n\n" + int.dienste.filter((d) => d.pruefung).map((d) => `- **${d.id}**: ${d.pruefung}`).join("\n") +
  "\n\n## Modelle\n\n" + JSON.stringify(llm.stufen || llm, null, 2).slice(0, 1200).replace(/^/gm, "    ") +
  "\n\n## Langlauf\n\n" + (lauf.pipeline || []).map((s, i) => `${i + 1}. ${s.id} · ${s.agent}${s.braucht ? " (nach " + s.braucht.join(", ") + ")" : ""}${s.mensch ? " · " + s.mensch : ""}`).join("\n") + "\n";

const regelDoku = kopf("Regelverzeichnis") +
  `Version ${regeln.version}. Durchsetzung: ${Object.entries(regeln.durchsetzung).map(([k, v]) => `**${k}**: ${v}`).join(" · ")}\n\n` +
  "| Regel | Quelle | Inhalt | Folge |\n|---|---|---|---|\n" + regeln.regeln.map((r) => `| ${r.id} | ${r.quelle} | ${r.text} | ${r.folge} |`).join("\n") +
  "\n\n## Lernformen\n\n| Form | Ziel | Übernahme |\n|---|---|---|\n" + Object.entries(lernen.lernformen).map(([k, v]) => `| ${k} | ${v.ziel} | ${v.uebernahme} |`).join("\n") +
  `\n\nGate: Toleranz ${lernen.gate.toleranzPunkte} Punkte, Sicherheit ${lernen.gate.sicherheitPflicht} %, Kosten ≤ ${lernen.gate.kostenFaktorMax}× · Canary ${lernen.rollout.stufen.join(" → ")} %, je Stufe ${lernen.rollout.mindestStunden} h · MCP ${mcpCfg.server.protokollVersion}, ${mcpCfg.werkzeuge.length} Werkzeuge\n`;

mkdirSync("docs/generiert", { recursive: true });
writeFileSync("docs/generiert/regelverzeichnis.md", regelDoku);
writeFileSync("docs/generiert/dienste.md", dienste);
writeFileSync("docs/generiert/mcp.md", mcp);
writeFileSync("docs/generiert/betriebshandbuch-kurz.md", betrieb);
console.log("4 Dokumente erzeugt");

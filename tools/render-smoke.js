// Erstes Render aller Logikklassen ohne Browser: Syntax + renderVals() mit leerem Zustand.
// Fängt Absturz vor Datenladen (z. B. Shop 28.09.2026) und Ersetzungsreste ("$1") ab. Aufruf: node tools/render-smoke.js
import { readdirSync, readFileSync } from "node:fs";
const dateien = readdirSync(".").filter((f) => f.endsWith(".dc.html"));
const ignorierbar = /createRef|localStorage|sessionStorage|document is not defined|window is not defined|matchMedia|fetch is not/;
let fehler = 0;
for (const f of dateien) {
  const t = readFileSync(f, "utf8");
  const s = t.lastIndexOf('<script type="text/x-dc"'); if (s < 0) continue;
  const b = t.indexOf(">", s) + 1, e = t.indexOf("</script>", b);
  const js = t.slice(b, e).replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  if (/\n\s*\$\d"/.test(js)) { console.log("FEHLER", f, "Ersetzungsrest $n"); fehler++; continue; }
  try {
    const C = new Function("React", "class DCLogic{constructor(p){this.props=p||{};this.state={};} setState(s){Object.assign(this.state, typeof s==='function'?s(this.state):s);} forceUpdate(){}}; " + js + "\nreturn Component;")({ createElement: () => null, Fragment: null, createRef: () => ({ current: null }) });
    const inst = new C({}); if (inst.renderVals) inst.renderVals(); console.log("ok    ", f);
  } catch (err) { if (ignorierbar.test(err.message)) { console.log("stub  ", f, "-", err.message.slice(0, 60)); continue; } console.log("FEHLER", f, "-", err.message.slice(0, 120)); fehler++; }
}
if (fehler) { console.error(fehler + " Seite(n) stürzen beim ersten Render ab."); process.exit(1); }

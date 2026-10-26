// Seiten-Übersetzung für Prototyp-Seiten: folgt der Markt-/Sprachwahl aus NX-Header/NX-Footer (Ereignis "nx:markt", Speicher "nx-market").
// Quelle bleibt Deutsch im Template; Übersetzungen liegen je Seite in i18n/<seite>.json als { "<de>": { "nl": "…", "fr": "…" } }.
// Produktiv ersetzt durch Übersetzungsschlüssel im Build (siehe docs/09-final/14 §8).
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = (s) => s.replace(/\s+/g, " ").trim();
export const sprache = (code) => { const l = String(code || "de").slice(0, 2).toLowerCase(); return l === "nl" || l === "fr" ? l : "de"; };

export function start(root, dict) {
  const exact = { nl: new Map(), fr: new Map() }, muster = [];
  for (const de of Object.keys(dict)) {
    const tr = dict[de];
    if (de.includes("{{")) muster.push([new RegExp("^" + de.split(/\{\{[^}]*\}\}/).map((t) => esc(norm(t))).join("(.+?)") + "$"), tr]);
    else for (const l of ["nl", "fr"]) if (tr[l]) exact[l].set(norm(de), tr[l]);
  }
  const suche = (src, l) => {
    const n = norm(src); if (!n) return null;
    if (exact[l].has(n)) return exact[l].get(n);
    for (const [rx, tr] of muster) { const m = n.match(rx); if (m && tr[l]) { let i = 1; return tr[l].replace(/\{\{[^}]*\}\}/g, () => m[i++] || ""); } }
    return null;
  };
  const knoten = new WeakMap(), attr = new WeakMap(); let lang = "de", plan = 0, aktiv = false;
  const setze = (node, src, l) => {
    const ziel = l === "de" ? src : suche(src, l);
    const aus = ziel == null ? src : (src.match(/^\s*/)[0] + ziel + src.match(/\s*$/)[0]);
    knoten.set(node, { src, aus });
    if (node.data !== aus) node.data = aus;
  };
  const quelle = (node) => { const k = knoten.get(node); return k && node.data === k.aus ? k.src : node.data; };
  const lauf = () => {
    plan = 0; const l = lang; if (l === "de" && !aktiv) return; aktiv = l !== "de";
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    for (let el = w.currentNode; el; el = w.nextNode()) {
      if (el.nodeName === "SCRIPT" || el.nodeName === "STYLE") continue;
      const kids = [...el.childNodes];
      if (kids.length > 1 && kids.every((k) => k.nodeType === 3)) {
        // Blatt mit mehreren Textknoten (Lücken): als Ganzes übersetzen
        const src = kids.map(quelle).join(""); const ziel = l === "de" ? null : suche(src, l);
        if (ziel != null) { setze(kids[0], src, l); knoten.set(kids[0], { src: kids[0].data === src ? src : knoten.get(kids[0]).src, aus: kids[0].data }); kids.slice(1).forEach((k) => { knoten.set(k, { src: quelle(k), aus: "" }); if (k.data) k.data = ""; }); }
        else kids.forEach((k) => setze(k, quelle(k), "de"));
      } else for (const k of kids) if (k.nodeType === 3 && /[A-Za-zÄÖÜäöü]/.test(k.data)) setze(k, quelle(k), l);
      for (const a of ["placeholder", "aria-label", "title", "alt"]) {
        if (!el.hasAttribute(a)) continue;
        const m = attr.get(el) || {}; const cur = el.getAttribute(a);
        const src = m[a] && cur === m[a].aus ? m[a].src : cur; const ziel = l === "de" ? src : (suche(src, l) || src);
        m[a] = { src, aus: ziel }; attr.set(el, m); if (cur !== ziel) el.setAttribute(a, ziel);
      }
    }
  };
  const planen = () => { if (!plan) plan = setTimeout(lauf, 150); };
  const mo = new MutationObserver(planen);
  mo.observe(root, { subtree: true, childList: true, characterData: true });
  const wechsel = (code) => { lang = sprache(code); document.documentElement.lang = lang; planen(); };
  const onEv = (e) => wechsel(e.detail && e.detail.code);
  window.addEventListener("nx:markt", onEv);
  try { wechsel(window.localStorage.getItem("nx-market") || "de-DE"); } catch (e) { wechsel("de-DE"); }
  return { stop() { mo.disconnect(); window.removeEventListener("nx:markt", onEv); }, wechsel };
}

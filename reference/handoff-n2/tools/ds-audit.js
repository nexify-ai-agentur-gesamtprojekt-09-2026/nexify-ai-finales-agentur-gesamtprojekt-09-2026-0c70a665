// NeXify Designsystem 2.0 · Prüfskript (läuft im Browser oder Node). Regeln: config/design-rules.json · Definition: docs/09-final/11-designsystem-definition.md

function auditDateien(dateien, T) {
  const RULES = T.rules;
  const ok = new Set(RULES.farbe.bildschirm.map(x => x.toUpperCase()));
  const abgeleitet = new Set(RULES.farbe.abgeleitet.map(x => x.toUpperCase()));
  const veraltet = new Set(RULES.farbe.veraltet.map(x => x.toUpperCase()));
  const papier = new Set(RULES.farbe.papier.map(x => x.toUpperCase()));
  const radOk = new Set(RULES.radius.erlaubt);
  const ergebnis = {};
  const zeile = (text, idx) => text.slice(0, idx).split('\n').length;
  for (const d of dateien) {
    const t = d.text, art = d.art; const f = {}; 
    const add = (id, wert, idx) => { (f[id] = f[id] || { n: 0, werte: {}, zeilen: [] }); f[id].n++; if (wert) f[id].werte[wert] = (f[id].werte[wert] || 0) + 1; if (f[id].zeilen.length < 3 && idx != null) f[id].zeilen.push(zeile(t, idx)); };
    if (art === 'bildschirm' || art === 'papier') {
      for (const m of t.matchAll(/#[0-9A-Fa-f]{6}\b/g)) { const h = m[0].toUpperCase(); 
        if (art === 'papier') { if (!papier.has(h) && !ok.has(h) && !abgeleitet.has(h)) add('DS-C-02', h, m.index); }
        else { if (veraltet.has(h)) add('DS-C-04', h, m.index); else if (papier.has(h) && !ok.has(h) && !abgeleitet.has(h)) add('DS-C-05', h, m.index); else if (!ok.has(h) && !abgeleitet.has(h)) add('DS-C-01', h, m.index); } }
      for (const m of t.matchAll(/border-radius:\s*([0-9.]+)(px|%)?/g)) { const v = m[1] + (m[2] || 'px'); if (m[2] === '%' || radOk.has(v)) continue; if (+m[1] >= 999) continue; add('DS-R-01', v, m.index); }
      for (const m of t.matchAll(/font-family:\s*([^;"}]+)/g)) { const v = m[1].trim(); if (/^(inherit|var\()/.test(v) || /^\{\{/.test(v)) continue; if (!/Geist|Helvetica|Arial|MONO|sans-serif/.test(v) || /IBM Plex|Inter|Roboto|Fraunces/i.test(v)) add('DS-T-01', v.slice(0, 40), m.index); }
    }
    if (art === 'bildschirm') {
      for (const m of t.matchAll(/background:#2A2E2C;border:1px solid #(?:3E4240|363A38);border-radius:(?:12|14|16|18|20)px/g)) add('DS-S-01', 'flache Karte', m.index);
      for (const m of t.matchAll(/background:#D7FA50;(?:(?!background)[^"]){0,160}?color:#(?:111312|1A1D1B)/g)) add('DS-S-02', 'flacher Primärbutton', m.index);
      for (const m of t.matchAll(/color:#1A1D1B/g)) add('DS-C-03', '#1A1D1B statt #111312', m.index);
      if (!/(<dc-import name="NX-Header"|<header)/.test(t) && !/^NX-/.test(d.name)) add('DS-B-01', 'kein Kopf', 0);
      else if (!/<dc-import name="NX-Header"/.test(t) && !/^NX-/.test(d.name)) add('DS-B-01', 'eigener Kopf statt NX-Header', t.indexOf('<header'));
      for (const m of t.matchAll(/<dc-import name="NX-Header"[^>]*variante="leiste"/g)) add('DS-B-02', 'variante=leiste', m.index);
      if (!/<dc-import name="NX-Footer"/.test(t) && !/^NX-/.test(d.name) && !/Designsystem/.test(d.name)) add('DS-B-03', 'kein NX-Footer', 0);
      for (const m of t.matchAll(/<img(?![^>]*\balt=)[^>]*>/g)) add('DS-A-02', 'img ohne alt', m.index);
      for (const m of t.matchAll(/outline:\s*none/g)) add('DS-A-03', 'outline:none', m.index);
      for (const m of t.matchAll(/min-height:\s*(\d+)px[^"]{0,120}cursor:pointer|height:\s*(2\d|3[0-9]|40)px[^"]{0,80}cursor:pointer/g)) { const h = +(m[1] || m[2]); if (h < 44 && h >= 20) add('DS-A-04', h + ' px Ziel', m.index); }
    }
    if (art !== 'e-mail') { if (!/<title>/.test(t) && !/^NX-/.test(d.name)) add('DS-A-01', 'kein title', 0); }
    // i18n
    if (art === 'bildschirm') {
      const imp = t.match(/<dc-import name="NX-(?:Header|Footer)"[^>]*>/g) || [];
      const ohneLang = imp.filter(x => !/\blang=/.test(x)).length;
      if (imp.length && ohneLang) add('DS-I-02', ohneLang + ' Baustein(e) ohne lang/market', t.indexOf(imp[0]));
      for (const m of t.matchAll(/toLocale(?:String|DateString|TimeString)\(\s*["']de-DE["']/g)) add('DS-I-03', "'de-DE' fest verdrahtet", m.index);
      for (const m of t.matchAll(/Intl\.(?:NumberFormat|DateTimeFormat)\(\s*["']de-DE["']/g)) add('DS-I-03', "'de-DE' fest verdrahtet", m.index);
      const wb = /\bnl\s*:\s*\{/.test(t) && /\bfr\s*:\s*\{/.test(t);
      if (!wb && !/^NX-/.test(d.name)) add('DS-I-05', 'nur Deutsch (kein nl/fr-Wörterbuch)', 0);
      if (!/<html lang=/.test(t)) add('DS-I-01', 'kein html lang', 0);
    }
    ergebnis[d.name] = f;
  }
  return ergebnis;
}
function schluessel(o, p = '') { return Object.keys(o).flatMap(k => (o[k] && typeof o[k] === 'object') ? schluessel(o[k], p + k + '.') : [p + k]); }
function paritaet(dateiText) { try { const i = dateiText.indexOf('const T = {'); if (i < 0) return null; let d = 0, j = dateiText.indexOf('{', i); const s = j; for (; j < dateiText.length; j++) { const c = dateiText[j]; if (c === '{') d++; else if (c === '}') { d--; if (!d) break; } } const T = (new Function('return ' + dateiText.slice(s, j + 1)))(); const de = new Set(schluessel(T.de)); const out = {}; for (const l of ['nl', 'fr']) { if (!T[l]) { out[l] = ['Sprache fehlt']; continue; } const a = new Set(schluessel(T[l])); out[l] = [...de].filter(k => !a.has(k)).map(k => 'fehlt: ' + k).concat([...a].filter(k => !de.has(k)).map(k => 'überzählig: ' + k)); } return out; } catch (e) { return { fehler: String(e) }; } }

if (typeof module !== "undefined") module.exports = { auditDateien, paritaet };

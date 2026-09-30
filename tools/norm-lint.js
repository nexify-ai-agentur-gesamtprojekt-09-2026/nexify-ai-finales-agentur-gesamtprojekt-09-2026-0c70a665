// Norm-Prüfung und Korrektur: CSS-Fehler, Überlappungsursachen, WCAG 2.2 / EN 301 549 / DIN EN ISO 9241-125.
function normLint(s) {
  const st = { dup: 0, overlapAbs: 0, translate: 0, nowrap: 0, measure: 0, wrap: 0, focusA: 0, target: 0, badVal: 0, alt: 0 };
  const si = s.search(/<script (type="text\/x-dc" )?data-dc-script/);
  let tpl = si > 0 ? s.slice(0, si) : s; const js = si > 0 ? s.slice(si) : '';
  const clean = (css) => {
    const parts = css.split(';').map((x) => x.trim()).filter(Boolean);
    const map = new Map();
    for (const p of parts) {
      const i = p.indexOf(':'); if (i < 1) { st.badVal++; continue; }
      const k = p.slice(0, i).trim().toLowerCase(); const v = p.slice(i + 1).trim();
      if (!v || /undefined|NaN|null/.test(v) || /^\d+(\.\d+)?$/.test(v) && /^(width|height|min-height|max-width|gap|padding|margin|top|left|right|bottom|font-size)/.test(k) && v !== '0') { st.badVal++; continue; }
      if (map.has(k) && !k.startsWith('-webkit')) { st.dup++; map.delete(k); }
      map.set(k, v);
    }
    return [...map].map(([k, v]) => k + ':' + v).join(';');
  };
  tpl = tpl.replace(/<([a-zA-Z][\w-]*)\b[^<>]*>/g, (tag, name) => {
    let out = tag.replace(/(\sstyle(?:-hover|-active|-focus)?=")([^"]*)(")/g, (m, a, css, c) => /\{\{/.test(css) ? a + css.replace(/;;+/g, ';') + c : a + clean(css) + c);
    const sm = out.match(/\sstyle="([^"]*)"/); let css = sm ? sm[1] : '';
    if (!sm) return out;
    const n0 = css;
    // absolut gesetzte Inhaltslisten in Karten -> normaler Fluss
    if (/^position:absolute;top:\d+px;left:\d+px;right:\d+px;display:grid/.test(css)) { css = css.replace(/^position:absolute;top:\d+px;left:\d+px;right:\d+px;/, '') + ';margin-bottom:auto'; st.overlapAbs++; }
    if (/transform:translateY\(24px\)/.test(css)) { css = css.replace(/;?transform:translateY\(24px\)/, ''); st.translate++; }
    if (/^(button|a)$/i.test(name) && /white-space:nowrap/.test(css) && /min-height:(44|48|52)px/.test(css)) { css = css.replace(/;?white-space:nowrap/, ';flex-wrap:wrap;text-align:left'); st.nowrap++; }
    if (/^p$/i.test(name) && !/max-width/.test(css) && /font-size:(16|18|20)px|font-size:clamp\(1[68]px/.test(css)) { css += ';max-width:68ch'; st.measure++; }
    if (/^(h1|h2|h3|strong)$/i.test(name) && !/overflow-wrap/.test(css)) { css += /^(h1|h2)$/i.test(name) ? ';overflow-wrap:break-word;hyphens:auto' : ';overflow-wrap:break-word'; st.wrap++; }
    if (/^(a|button)$/i.test(name) && /min-height:auto/.test(css)) { css = css.replace('min-height:auto', 'min-height:24px'); st.target++; }
    if (css !== n0) out = out.replace(/\sstyle="[^"]*"/, ' style="' + css.replace(/^;/, '') + '"');
    if (/^a$/i.test(name) && !/style-focus=/.test(out)) { out = out.replace(/>$/, ' style-focus="outline:2px solid #D7FA50;outline-offset:2px">'); st.focusA++; }
    if (/^img$/i.test(name) && !/\salt=/.test(out)) { out = out.replace(/<img/, '<img alt=""'); st.alt++; }
    return out;
  });
  if (!/prefers-reduced-motion/.test(tpl) && /<\/helmet>/.test(tpl)) tpl = tpl.replace('</helmet>', '<style>@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}</style>\n</helmet>');
  if (/<html(?![^>]*lang=)/.test(tpl)) tpl = tpl.replace(/<html/, '<html lang="de"');
  normLint.stat = st;
  return tpl + js;
}

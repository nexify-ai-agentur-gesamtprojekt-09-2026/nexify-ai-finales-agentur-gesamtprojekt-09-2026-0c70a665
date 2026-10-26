// NeXify Design-Norm 1.0: rastert alle Maße auf feste Skalen (8-pt-Raster, Typoskala, 4 Radien).
function designNorm(s) {
  const SP = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80, 96, 112, 128, 144];
  const FS = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64];
  const snap = (v, arr) => arr.reduce((b, x) => (Math.abs(x - v) < Math.abs(b - v) || (Math.abs(x - v) === Math.abs(b - v) && x > b)) ? x : b, arr[0]);
  const R = (v) => v <= 1 ? v : v <= 4 ? 4 : v <= 9 ? 8 : v === 17 ? 17 : v <= 24 ? 16 : v >= 99 ? 999 : 16;
  const stat = { fs: 0, sp: 0, r: 0, h: 0 };
  const px = (list, fn, key) => /^\s*1px\s*$/.test(list) ? list :  list.replace(/(-?\d+(?:\.\d+)?)px/g, (m, n) => { const v = Math.abs(+n); const w = fn(v); if (w !== v) stat[key]++; return (+n < 0 ? '-' : '') + w + 'px'; });
  function decl(css, tag) {
    return css.replace(/(^|;)(\s*)([a-z-]+)(\s*:\s*)([^;]*)/gi, (m, pre, sp, prop, col, val) => {
      const p = prop.toLowerCase(); let v = val;
      if (/\{\{/.test(v)) return m;
      if (p === 'font-size') {
        if (/^h1$/i.test(tag)) { v = 'clamp(48px,7.2vw,96px)'; stat.h++; }
        else if (/^h2$/i.test(tag)) { v = 'clamp(32px,4.2vw,56px)'; stat.h++; }
        else if (/^h3$/i.test(tag) && /clamp/.test(v)) { v = 'clamp(24px,2.4vw,32px)'; stat.h++; }
        else if (/clamp/.test(v)) { const mx = +((v.match(/(\d+)px\)$/) || [])[1] || 0); if (mx >= 44) v = 'clamp(40px,5vw,64px)'; else if (mx >= 30) v = 'clamp(24px,2.8vw,32px)'; else if (mx >= 22) v = '24px'; else v = snap(mx || 18, FS) + 'px'; stat.fs++; }
        else v = px(v, (x) => snap(x, FS), 'fs');
      } else if (/^(padding|margin|gap|row-gap|column-gap)(-|$)/.test(p) && !/clamp|calc|auto|%/.test(v)) v = px(v, (x) => snap(x, SP), 'sp');
      else if (p === 'border-radius' && !/%/.test(v)) v = px(v, R, 'r');
      else if (p === 'line-height' && /^h[12]$/i.test(tag)) v = /^h1$/i.test(tag) ? '1' : '1.05';
      else if (p === 'letter-spacing' && /^h[12]$/i.test(tag)) v = /^h1$/i.test(tag) ? '-.05em' : '-.04em';
      return pre + sp + prop + col + v;
    });
  }
  const si = s.search(/<script (type="text\/x-dc" )?data-dc-script/);
  let tpl = si > 0 ? s.slice(0, si) : s; const js = si > 0 ? s.slice(si) : '';
  tpl = tpl.replace(/<([a-zA-Z][\w-]*)\b[^<>]*>/g, (tag, name) => tag.replace(/(\sstyle(?:-hover|-active|-focus)?=")([^"]*)(")/g, (m, a, css, c) => a + decl(css, name) + c));
  designNorm.stat = stat;
  return tpl + js;
}

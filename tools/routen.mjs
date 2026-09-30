#!/usr/bin/env node
// Routen der Website aus config/routen.json: Auflösung, Sitemap/robots, nginx-Schnipsel, Prüfung.
//   node tools/routen.mjs pruefen     Regressionsprüfung (Exit 1 bei Fehlern)
//   node tools/routen.mjs schreiben   erzeugt prototypen/sitemap.xml, prototypen/robots.txt, infra/nginx/nexifyai-routen.conf
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/routen.json'), 'utf8'));
export const DOCROOT = path.join(ROOT, cfg.docroot);

const enc = f => '/' + f.split('/').map(encodeURIComponent).join('/');
const dec = p => { try { return decodeURIComponent(p); } catch { return null; } };

// Liefert { status: 200, datei } | { status: 301, ziel } | { status: 404 } für einen URL-Pfad (ohne Query).
export function aufloesen(pfad) {
  let p = pfad.length > 1 ? pfad.replace(/\/+$/, '') : pfad;
  if (cfg.seiten[p]) return { status: 200, datei: cfg.seiten[p] };
  if (cfg.weiterleitungen[p]) return { status: 301, ziel: cfg.weiterleitungen[p] };
  for (const [pre, ziel] of Object.entries(cfg.praefixWeiterleitungen)) if (p.startsWith(pre)) return { status: 301, ziel };
  for (const sp of cfg.sprachpraefixe) {
    if (p === sp) return { status: 301, ziel: '/' };
    if (p.startsWith(sp + '/')) {
      const rest = p.slice(sp.length);
      const r = aufloesen(rest);
      if (r.status === 301) return r;
      if (r.status === 200) return { status: 301, ziel: rest };
      return r;
    }
  }
  const rel = dec(p.slice(1));
  if (rel === null || rel.split('/').includes('..')) return { status: 404 };
  const abs = path.join(DOCROOT, rel);
  if (rel && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    const kurz = Object.entries(cfg.seiten).find(([, f]) => f === rel);
    if (kurz && kurz[0] !== '/favicon.ico') return { status: 200, datei: rel, kanonisch: kurz[0] };
    return { status: 200, datei: rel };
  }
  return { status: 404 };
}

export function seitenInfo(datei) {
  const html = fs.readFileSync(path.join(DOCROOT, datei), 'utf8');
  return {
    noindex: /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html),
    intern: /data-nx-intern/.test(html),
  };
}

export function sitemapUrls() {
  const kurz = new Map(Object.entries(cfg.seiten).filter(([r]) => r !== '/favicon.ico').map(([r, f]) => [f, r]));
  const urls = [];
  const html = fs.readdirSync(DOCROOT).filter(f => f.endsWith('.html')).sort();
  for (const f of html) {
    if (cfg.nichtInSitemap.includes(f)) continue;
    const i = seitenInfo(f);
    if (i.noindex || i.intern) continue;
    urls.push(kurz.has(f) ? kurz.get(f) : enc(f));
  }
  return urls.sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));
}

export function sitemapXml() {
  const zeilen = sitemapUrls().map(u => `  <url><loc>${cfg.host}${u}</loc>${u === '/' ? '<priority>1.0</priority>' : ''}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${zeilen.join('\n')}\n</urlset>\n`;
}

export function robotsTxt() {
  return `User-agent: *\nAllow: /\nDisallow: /lib/\nSitemap: ${cfg.host}/sitemap.xml\n`;
}

export function nginxConf() {
  const q = s => `"${s.replace(/"/g, '\\"')}"`;
  const z = ['# Erzeugt von tools/routen.mjs aus config/routen.json – nicht von Hand ändern.',
    '# Einbinden im server-Block für www.nexifyai.cloud (root = Docroot prototypen/):  include /etc/nginx/snippets/nexifyai-routen.conf;', ''];
  z.push('error_page 404 /404.html;', '');
  for (const [r, f] of Object.entries(cfg.seiten)) z.push(`location = ${r} { try_files ${q('/' + f)} =404; }`);
  for (const [r, f] of Object.entries(cfg.seiten)) {
    if (r === '/' || r === '/favicon.ico') continue;
    z.push(`location = ${q('/' + f)} { return 301 ${r}; }`);
  }
  for (const [r, ziel] of Object.entries(cfg.weiterleitungen)) {
    z.push(`location = ${r} { return 301 ${ziel}; }`);
    if (r !== '/index.html') z.push(`location = ${r}/ { return 301 ${ziel}; }`);
  }
  for (const [pre, ziel] of Object.entries(cfg.praefixWeiterleitungen)) z.push(`location ^~ ${pre} { return 301 ${ziel}; }`);
  for (const sp of cfg.sprachpraefixe) {
    z.push(`location = ${sp} { return 301 /; }`);
    for (const [r] of Object.entries(cfg.seiten)) if (r !== '/' && r !== '/favicon.ico') z.push(`location = ${sp}${r} { return 301 ${r}; }`);
    for (const [r, ziel] of Object.entries(cfg.weiterleitungen)) if (r !== '/index.html') z.push(`location = ${sp}${r} { return 301 ${ziel}; }`);
    for (const [pre, ziel] of Object.entries(cfg.praefixWeiterleitungen)) z.push(`location ^~ ${sp}${pre} { return 301 ${ziel}; }`);
    z.push(`location = ${sp}/ { return 301 /; }`);
  }
  return z.join('\n') + '\n';
}

// Altpfade aus der Sitemap des Vorgängerauftritts (live bis zur Umstellung, 36 davon 404).
export const ALT_SITEMAP = (() => {
  const basis = ['/', '/shop', '/partner-werden', '/werkstatt-partner', '/reifenrechner', '/batterie-berater', '/fitment-checker',
    '/wissenshub', '/local-seo', '/partner-broschuere', '/kundenbroschuere', '/visitenkarte', '/start', '/standort'];
  const orte = ['berlin', 'muenchen', 'koeln', 'wien', 'graz', 'zuerich', 'bern', 'amsterdam'].map(o => '/standort/' + o);
  const recht = ['impressum', 'datenschutz', 'agb', 'avv', 'widerruf', 'cookie', 'ki-hinweise', 'barrierefreiheit', 'security'];
  return [...basis, ...orte, ...recht.flatMap(r => ['/' + r, '/nl/' + r, '/fr/' + r])];
})();

function zielPruefen(ziel) {
  const [p, anker] = ziel.split('#');
  const r = aufloesen(p);
  if (r.status !== 200) return `Ziel ${ziel} liefert ${r.status}`;
  if (anker && r.datei.endsWith('.html')) {
    const html = fs.readFileSync(path.join(DOCROOT, r.datei), 'utf8');
    const statisch = new RegExp(`id=["']${anker}["']`).test(html);
    const rechtListe = new RegExp(`\\[\\s*["']${anker}["']\\s*,`).test(html);
    if (!statisch && !rechtListe) return `Anker #${anker} fehlt in ${r.datei}`;
  }
  return null;
}

export function pruefen() {
  const f = [];
  const muss = (ok, msg) => { if (!ok) f.push(msg); };
  for (const [r, d] of Object.entries(cfg.seiten)) muss(fs.existsSync(path.join(DOCROOT, d)), `Route ${r}: Datei ${d} fehlt`);
  for (const [r, z] of Object.entries(cfg.weiterleitungen)) { const e = zielPruefen(z); muss(!e, `Weiterleitung ${r}: ${e}`); }
  for (const [r, z] of Object.entries(cfg.praefixWeiterleitungen)) { const e = zielPruefen(z); muss(!e, `Präfix ${r}: ${e}`); }
  // Alle Altpfade der Live-Sitemap enden auf 200 (direkt oder nach genau einer Weiterleitung).
  for (const alt of ALT_SITEMAP) {
    const r = aufloesen(alt);
    if (r.status === 301) { const e = zielPruefen(r.ziel); muss(!e, `Altpfad ${alt} → ${r.ziel}: ${e}`); }
    else muss(r.status === 200, `Altpfad ${alt} liefert ${r.status}`);
  }
  const login = aufloesen('/login');
  muss(login.status === 301 && zielPruefen(login.ziel) === null, '/login muss zur vorhandenen Anmeldung führen');
  const favicon = aufloesen('/favicon.ico');
  muss(favicon.status === 301 && favicon.ziel === '/assets/nexify-ai/nexify-ai-signet.svg', '/favicon.ico muss auf das vorhandene SVG führen');
  // Startseite ist die echte Seite, nicht der Lader.
  muss(aufloesen('/').datei === 'NeXifyAI Cloud v12.dc.html', '/ muss direkt die Startseite liefern');
  const idx = fs.readFileSync(path.join(DOCROOT, 'index.html'), 'utf8');
  muss(/name=["']robots["'][^>]*noindex/.test(idx), 'index.html (Lader) muss noindex tragen');
  muss(/rel=["']canonical["'][^>]*href=["']\/["']/.test(idx) || /href=["']\/["'][^>]*rel=["']canonical["']/.test(idx), 'index.html muss auf / kanonisieren');
  // Sitemap/robots auf dem öffentlichen Host, nur indexierbare Seiten, synchron mit dem Generator.
  const sm = fs.readFileSync(path.join(DOCROOT, 'sitemap.xml'), 'utf8');
  muss(sm === sitemapXml(), 'prototypen/sitemap.xml ist nicht aktuell (node tools/routen.mjs schreiben)');
  const rb = fs.readFileSync(path.join(DOCROOT, 'robots.txt'), 'utf8');
  muss(rb === robotsTxt(), 'prototypen/robots.txt ist nicht aktuell (node tools/routen.mjs schreiben)');
  const ng = path.join(ROOT, 'infra/nginx/nexifyai-routen.conf');
  muss(fs.existsSync(ng) && fs.readFileSync(ng, 'utf8') === nginxConf(), 'infra/nginx/nexifyai-routen.conf ist nicht aktuell (node tools/routen.mjs schreiben)');
  for (const loc of [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])) {
    muss(loc.startsWith(cfg.host + '/'), `Sitemap-URL ${loc} liegt nicht auf ${cfg.host}`);
    const r = aufloesen(new URL(loc).pathname);
    muss(r.status === 200, `Sitemap-URL ${loc} liefert ${r.status}`);
    if (r.status === 200) {
      const i = seitenInfo(r.datei);
      muss(!i.noindex, `Sitemap-URL ${loc} ist noindex`);
      muss(!i.intern, `Sitemap-URL ${loc} ist intern`);
      muss(!r.kanonisch, `Sitemap-URL ${loc} hat die Kurz-URL ${r.kanonisch}`);
    }
  }
  return f;
}

// Seitenübergreifende Regressionen aus der Live-Prüfung vom 30.09.2026.
export function seitenPruefen() {
  const f = [];
  const dateien = fs.readdirSync(DOCROOT).filter(d => d.endsWith('.html'));
  const lies = d => fs.readFileSync(path.join(DOCROOT, d), 'utf8');
  for (const d of dateien) {
    const h = lies(d);
    // Interne Kurz-URLs und lokale Dateien/Assets müssen tatsächlich auflösbar sein.
    for (const m of h.matchAll(/href=["']([^"'{}]+)["']/g)) {
      const raw = m[1].split(/[?#]/)[0];
      if (raw.startsWith('/') && !/^(?:\/\/)/.test(raw)) {
        const r = aufloesen(raw);
        if (r.status !== 200 && r.status !== 301) f.push(`${d}: interne Route ${raw} liefert ${r.status}`);
      }
    }
    for (const m of h.matchAll(/(?:href|src|from)=["']([^"'#?:{}$]+\.(?:html|js|json|css|svg|png|webp|woff2|ico|jpe?g|gif))(?:[#?][^"']*)?["']/gi)) {
      const ref = dec(m[1]);
      if (!ref || /^(?:https?:|\/\/)/i.test(ref)) continue;
      const abs = path.join(DOCROOT, ref.replace(/^\/+/, ''));
      if (!fs.existsSync(abs)) f.push(`${d}: Verweis auf fehlende Datei ${m[1]}`);
    }
    // Sprunglink „Zum Inhalt“ des NX-Headers braucht ein Ziel.
    if (d !== 'NX-Header.dc.html' && /NX-Header\.dc\.html/.test(h) && !/skipHref=/.test(h) && !/id=["']inhalt["']/.test(h)) f.push(`${d}: NX-Header ohne Sprungziel id="inhalt"`);
  }
  const start = lies('NeXifyAI Cloud v12.dc.html');
  const footer = lies('NX-Footer.dc.html');
  for (const m of footer.matchAll(/CLOUD \+ ["']#([\w-]+)["']/g)) if (!new RegExp(`id=["']${m[1]}["']`).test(start)) f.push(`NX-Footer: Anker #${m[1]} fehlt auf der Startseite`);
  const wp = lies('Werkstatt-Partnerseite.dc.html');
  const cta = wp.match(/ctaHref=["']#([\w-]+)["']/);
  if (cta && !new RegExp(`id=["']${cta[1]}["']`).test(wp)) f.push(`Werkstatt-Partnerseite: CTA-Anker #${cta[1]} fehlt`);
  const newsletter = lies('E-Mail-Marketing-Newsletter.html');
  if (!newsletter.includes('https://www.nexifyai.cloud/#preise') || !/id=["']preise["']/.test(start)) f.push('Newsletter-CTA muss auf den vorhandenen Rechner #preise zeigen');
  const transaktional = lies('E-Mail-Transaktional-Angebot.html');
  if (!transaktional.includes('https://www.nexifyai.cloud/login')) f.push('Angebots-E-Mail muss die kanonische /login-Route verwenden');
  const shop = lies('TEILEKLAR Shop.dc.html');
  const routes = (shop.match(/const ANSICHT = \{([^}]+)\}/) || [])[1] || '';
  for (const id of ['teile', 'fahrzeug', 'garage', 'standorte', 'werkstatt', 'klarwissen']) {
    if (!new RegExp(`\\b${id}\\s*:`).test(routes)) f.push(`TEILEKLAR Shop: Hash-Route #${id} fehlt`);
  }
  const deckFiles = ['Investoren-PowerPoint.dc.html', 'Partner-PowerPoint Werkstatt.dc.html'];
  for (const d of deckFiles) if (!lies(d).includes('from="./deck-stage.js"')) f.push(`${d}: deck-stage.js wird nicht eingebunden`);
  if (!fs.existsSync(path.join(DOCROOT, 'deck-stage.js'))) f.push('deck-stage.js fehlt');
  return f;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2] || 'pruefen';
  if (cmd === 'schreiben') {
    fs.writeFileSync(path.join(DOCROOT, 'sitemap.xml'), sitemapXml());
    fs.writeFileSync(path.join(DOCROOT, 'robots.txt'), robotsTxt());
    fs.mkdirSync(path.join(ROOT, 'infra/nginx'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'infra/nginx/nexifyai-routen.conf'), nginxConf());
    console.log(`geschrieben: sitemap.xml (${sitemapUrls().length} URLs), robots.txt, infra/nginx/nexifyai-routen.conf`);
  } else {
    const fehler = [...pruefen(), ...seitenPruefen()];
    for (const e of fehler) console.log('✗ ' + e);
    console.log(fehler.length ? `${fehler.length} Fehler` : `Routen OK · ${Object.keys(cfg.seiten).length} Kurz-URLs · ${ALT_SITEMAP.length} Altpfade · ${sitemapUrls().length} Sitemap-URLs`);
    process.exit(fehler.length ? 1 : 0);
  }
}

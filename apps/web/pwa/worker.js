/* Öffentlicher Worker von apps/web (nexifyai.de). Klein und handgeschrieben; die Grenzen stehen
   in .claude/skills/nexify-klon-fabrik/SKILL.md, Abschnitt „Mobil und PWA", und werden von
   apps/web/auth/tests/pwa-worker.test.mjs geprüft.

   Gespeichert wird nur zweierlei:
   1. Statische Dateien des Builds (Cache-zuerst): /_next/static/**, Schriften (/fonts/**), Logo und Glasflächen
      (/brand/**, /glass/**) und die Icons.
   2. Die Offline-Seite /offline (Deutsch sofort, weitere Sprachen bei Nutzung), ohne Cookies abgerufen:
      die einzige gespeicherte HTML-Antwort.

   Nie gespeichert und nie beantwortet: /api/**, /webhook/**, Anmelde-, Konto-, Warenkorb-, Kassen-,
   Bestell- und Portalseiten, alles außer GET, fremde Ursprünge, Bereichsanfragen (Filme).
   Seiten (Navigation) kommen immer aus dem Netz; nur ohne Netz erscheint die Offline-Seite.
   Kein skipWaiting, kein clients.claim: ein neuer Worker übernimmt erst, wenn alle Fenster zu sind.
   Keine Push- und keine Hintergrund-Synchronisierung. */
const VERSION = '__NEXIFY_WORKER_VERSION__';
const PREFIX = 'nexify-public-';
const STATIC = PREFIX + 'static-' + VERSION;
const OFFLINE = PREFIX + 'offline-' + VERSION;
const LOCALES = ['de', 'nl', 'fr', 'en'];
const STATIC_PREFIXES = ['/_next/static/', '/fonts/', '/brand/', '/glass/'];
const STATIC_FILES = ['/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-icon.png', '/icon.png', '/favicon.ico'];
// Pfade mit Sitzung, Konto, Warenkorb, Kasse oder Portal. Der Worker beantwortet sie nicht einmal.
const PRIVATE_PREFIXES = ['/api', '/webhook', '/anmelden', '/registrieren', '/login', '/signup', '/passwort-vergessen', '/passwort-zuruecksetzen', '/konto', '/portal', '/intern',
 '/teileklar/warenkorb', '/teileklar/kasse', '/teileklar/bestellung', '/teileklar/bestellungen', '/teileklar/konto', '/teileklar/admin', '/teileklar/partnerportal', '/teileklar/nachbarschaft'];

const under = (path, prefix) => path === prefix || path.startsWith(prefix + '/');
const isPrivate = path => PRIVATE_PREFIXES.some(prefix => under(path, prefix));
const isStatic = path => !isPrivate(path) && (STATIC_PREFIXES.some(prefix => path.startsWith(prefix)) || STATIC_FILES.includes(path));
const offlineUrl = locale => locale === 'de' ? '/offline' : '/offline?lang=' + locale;

// Set-Cookie ist für Skripte unsichtbar. Deshalb entscheidet zuerst der Pfad (nur statische Dateien),
// danach diese Prüfung: vollständige, eigene, nicht umgeleitete Antwort ohne no-store/private.
function storable(response) {
 if (!response || response.status !== 200 || response.type !== 'basic' || response.redirected) return false;
 const control = (response.headers.get('cache-control') || '').toLowerCase();
 return !/\b(?:no-store|private)\b/.test(control) && !response.headers.has('set-cookie');
}

// Offline-Seite einer Sprache holen und speichern. Ohne Cookies: die gespeicherte Seite ist für jeden Besucher
// dieselbe und trägt keine Sitzung. Gibt den Seitentext zurück, oder null, wenn sie schon gespeichert ist.
async function storeOffline(locale) {
 const cache = await caches.open(OFFLINE), url = offlineUrl(locale);
 if (await cache.match(url)) return null;
 const response = await fetch(url, {credentials: 'omit', cache: 'no-store', redirect: 'error'});
 if (response.status !== 200 || !(response.headers.get('content-type') || '').includes('text/html')) throw new Error('offline page unavailable');
 const html = await response.text();
 await cache.put(url, new Response(html, {headers: {'Content-Type': 'text/html; charset=utf-8', 'Content-Language': locale}}));
 return html;
}

// Zwei Navigationen kurz nacheinander lösen nur einen Abruf aus.
const inFlight = {};
function ensureOffline(locale) {
 if (!inFlight[locale]) inFlight[locale] = storeOffline(locale).then(() => { delete inFlight[locale]; }, () => { delete inFlight[locale]; });
 return inFlight[locale];
}

// Beim Installieren: die deutsche Offline-Seite und alles, was sie zum Aufbau braucht. Schlägt etwas fehl,
// wird der Worker nicht installiert. Weitere Sprachen folgen erst, wenn der Besucher sie nutzt (siehe fetch).
async function precache() {
 const html = await storeOffline(LOCALES[0]) || '', assets = await caches.open(STATIC), found = new Set();
 for (const match of html.matchAll(/["'(=]\\?["']?(\/(?:_next\/static|fonts|brand|glass)\/[A-Za-z0-9._~\/\[\]@%-]+)/g)) found.add(match[1]);
 await Promise.all([...found].filter(isStatic).map(async path => {
  const response = await fetch(path, {credentials: 'omit'});
  if (!storable(response)) throw new Error('static file unavailable');
  await assets.put(path, response);
 }));
}

async function cacheFirst(request) {
 const cache = await caches.open(STATIC);
 const hit = await cache.match(request.url, {ignoreVary: true});
 if (hit) return hit;
 const response = await fetch(request);
 if (storable(response)) await cache.put(request.url, response.clone());
 return response;
}

// Schlichter Hinweis ohne Seitengerüst: für TEILEKLAR (eigene Marke, die Offline-Seite trägt die NeXify-Kopfleiste)
// und als Rückfall, falls die gespeicherte Offline-Seite fehlt. Nur feste Texte; nichts aus der Anfrage wird ausgegeben.
function plainNotice(brand) {
 const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Keine Verbindung · ${brand}</title><style>html{color-scheme:dark light;font-family:system-ui,sans-serif}body{min-height:100vh;min-height:100dvh;margin:0;display:grid;place-items:center}main{box-sizing:border-box;width:min(100%,36rem);padding:2rem}p{line-height:1.6}a{display:inline-flex;align-items:center;min-height:48px;padding:0 1rem;border:1px solid;border-radius:999px;color:inherit;text-decoration:none}a:focus-visible{outline:3px solid;outline-offset:4px}</style></head><body><main><p>${brand}</p><h1>Keine Verbindung</h1><p>Die Seite ist gerade nicht erreichbar. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.</p><p><a href="">Erneut versuchen</a></p></main></body></html>`;
 return new Response(html, {status: 503, headers: {'Content-Type': 'text/html; charset=utf-8', 'Content-Language': 'de', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
}

async function offlineNotice(url) {
 if (under(url.pathname, '/teileklar')) return plainNotice('TEILEKLAR');
 const requested = url.searchParams.get('lang');
 const locale = LOCALES.includes(requested) ? requested : 'de';
 const cache = await caches.open(OFFLINE);
 const page = await cache.match(offlineUrl(locale)) || await cache.match(offlineUrl('de'));
 if (!page) return plainNotice('NeXify AI');
 // 503, damit nichts die Offline-Seite für die angefragte Seite hält; nie zwischenspeichern.
 return new Response(page.body, {status: 503, headers: {'Content-Type': 'text/html; charset=utf-8', 'Content-Language': page.headers.get('content-language') || 'de', 'Cache-Control': 'no-store'}});
}

self.addEventListener('install', event => { event.waitUntil(precache()); });

// Erst wenn kein Fenster mehr den alten Worker nutzt: eigene alte Caches entfernen, fremde nie.
self.addEventListener('activate', event => {
 event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== STATIC && key !== OFFLINE).map(key => caches.delete(key)))));
});

self.addEventListener('fetch', event => {
 const request = event.request;
 if (request.method !== 'GET') return;
 const url = new URL(request.url);
 if (url.origin !== self.location.origin || isPrivate(url.pathname) || request.headers.has('range')) return;
 if (isStatic(url.pathname)) { event.respondWith(cacheFirst(request)); return; }
 if (request.mode !== 'navigate') return;
 event.respondWith(fetch(request).catch(() => offlineNotice(url)));
 // Nutzt der Besucher eine andere Sprache, deren Offline-Seite nachladen (einmal je Version, ohne die Navigation aufzuhalten).
 const locale = url.searchParams.get('lang');
 if (locale !== LOCALES[0] && LOCALES.includes(locale) && !under(url.pathname, '/teileklar')) event.waitUntil(ensureOffline(locale));
});

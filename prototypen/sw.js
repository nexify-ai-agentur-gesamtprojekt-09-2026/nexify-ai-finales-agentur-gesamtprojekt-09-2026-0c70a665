// TEILEKLAR Service Worker — App-Installation und Offline-Grundbetrieb
const CACHE = 'teileklar-v4';
const CORE = ['./', './TEILEKLAR%20Shop.dc.html', './support.js', './image-slot.js', './manifest.webmanifest',
  './assets/hero-fitment.webp', './assets/part-brake.webp', './assets/part-brake-rear.webp', './assets/part-battery.webp',
  './assets/part-oil.webp', './assets/part-wiper.webp', './assets/part-wiper-rear.webp', './assets/icon-192.png', './assets/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(CORE.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // Bilder und Assets: aus dem Cache anzeigen, im Hintergrund erneuern
  if (/\.(png|jpg|jpeg|webp|svg|woff2?|js|webmanifest|json)$/i.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => {
      const fresh = fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || fresh;
    }));
    return;
  }
  // Dokumente: Netz zuerst, Cache als Rückfall
  e.respondWith(fetch(req).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
    return res;
  }).catch(() => caches.match(req)));
});

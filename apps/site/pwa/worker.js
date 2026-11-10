/* A neutral offline notice for navigations only. No CacheStorage, API handling,
   background sync, push, automatic retry, claim or forced activation. */
self.addEventListener('install', () => {});

// Copy, language and brand are selected from fixed values; no URL or user text is rendered.
const messages = {
 de:{title:'Keine Verbindung',body:'Die Seite ist gerade nicht erreichbar. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',retry:'Erneut versuchen'},
 nl:{title:'Geen verbinding',body:'De pagina is momenteel niet bereikbaar. Controleer uw internetverbinding en probeer het opnieuw.',retry:'Opnieuw proberen'},
 fr:{title:'Pas de connexion',body:'Cette page est momentanément inaccessible. Vérifiez votre connexion Internet et réessayez.',retry:'Réessayer'},
 en:{title:'No connection',body:'This page is currently unavailable. Check your internet connection and try again.',retry:'Try again'}
};
function offlineNotice(url){
 const isTeileklar=url.pathname==='/teileklar'||url.pathname.startsWith('/teileklar/')||url.hostname==='teileklar.shop'||url.hostname.endsWith('.teileklar.shop');
 const requested=url.searchParams.get('lang');
 const locale=!isTeileklar&&Object.prototype.hasOwnProperty.call(messages,requested)?requested:'de';
 const brand=isTeileklar?'TEILEKLAR':'NeXify AI';
 const {title,body,retry}=messages[locale];
 return {locale,html:`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} · ${brand}</title><style>html{color-scheme:dark light;font-family:system-ui,sans-serif}body{min-height:100vh;min-height:100dvh;margin:0;display:grid;place-items:center}main{box-sizing:border-box;width:min(100%,36rem);padding:2rem}p{line-height:1.6}a{display:inline-flex;align-items:center;min-height:44px;padding:0 1rem;border:1px solid;border-radius:999px;color:inherit;text-decoration:none}a:focus-visible{outline:3px solid;outline-offset:4px}</style></head><body><main><p>${brand}</p><h1>${title}</h1><p>${body}</p><p><a href="">${retry}</a></p></main></body></html>`};
}

self.addEventListener('fetch', event => {
 const request = event.request;
 const url = new URL(request.url);
 if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== self.location.origin || url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
 event.respondWith(fetch(request).catch(() => {
  const notice=offlineNotice(url);
  return new Response(notice.html, {
   status: 503,
   headers: {'Content-Type': 'text/html; charset=utf-8', 'Content-Language':notice.locale, 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}
  });
 }));
});

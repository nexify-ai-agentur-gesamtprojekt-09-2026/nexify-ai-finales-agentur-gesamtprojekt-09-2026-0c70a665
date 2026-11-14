// Was auf Vercel die Datei vercel.json an der Wurzel leistet und ein Worker selbst tun muss:
// die Content-Security-Policy an Antworten hängen und die Wege der Shop-API an einen anderen Dienst reichen.
// Reine Funktionen ohne Laufzeitbindung, geprüft in edge.test.mjs.

// Dieselben Wege wie die "rewrites" in vercel.json (Dienst "shop").
const SHOP_PREFIXES = ['/api/shop', '/api/auth', '/api/admin', '/api/workshops', '/api/requests', '/api/docs'];
const SHOP_EXACT = ['/api/health', '/api/openapi.json'];

/** Gehört der Pfad zur Shop-API (apps/shop-api) und nicht zu apps/web? */
export function isShopPath(pathname) {
  if (SHOP_EXACT.includes(pathname)) return true;
  return SHOP_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}

/** Zieladresse der Shop-API oder null, wenn keine gültige https-Herkunft gesetzt ist. Pfad und Abfrage bleiben unverändert. */
export function shopTarget(requestUrl, origin) {
  if (typeof origin !== 'string' || !origin) return null;
  let base;
  try { base = new URL(origin); } catch { return null; }
  if (base.protocol !== 'https:' || base.pathname !== '/' || base.search || base.hash || base.username || base.password) return null;
  const url = new URL(requestUrl);
  // Kein Kreis: zeigt die Herkunft auf den Worker selbst, riefe er sich endlos auf.
  if (base.host === url.host) return null;
  return new URL(url.pathname + url.search, base).toString();
}

/** Wert der Content-Security-Policy aus den "headers" einer vercel.json, sonst null. */
export function cspFrom(vercelConfig) {
  for (const rule of vercelConfig?.headers ?? []) {
    for (const header of rule.headers ?? []) {
      if (String(header.key).toLowerCase() === 'content-security-policy' && typeof header.value === 'string') return header.value;
    }
  }
  return null;
}

/** Antwort mit Content-Security-Policy; eine bereits gesetzte bleibt stehen. Der Körper wird durchgereicht (auch ein Stream). */
export function withCsp(response, csp) {
  if (!csp || response.headers.has('content-security-policy') || response.status === 101) return response;
  const next = new Response(response.body, response);
  next.headers.set('Content-Security-Policy', csp);
  return next;
}

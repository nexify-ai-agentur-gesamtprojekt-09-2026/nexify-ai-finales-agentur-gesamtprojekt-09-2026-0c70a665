# Produktive /api-Runtime-Bindung der .de-Seite — Soll/Ist (lesende Analyse)

Stand: 2026-10-30 · rein lesend · keine Veröffentlichung, kein Force, keine neuen Credentials/Kosten.
Reservierte Dateien (`api/**`, `apps/agent-gateway/**`) wurden nur gelesen, nicht verändert.

## 1. Ist-Zustand der Produktion (Vercel)

### 1.1 Öffentliche .de-Seite = Vite-SPA (`apps/site`)
`vercel.json` (Repo-Root):
- `framework: vite`, `outputDirectory: apps/site/dist`.
- SPA-Fallback-Rewrite (Zeile 30-35): `"/((?!api(?:/|$)|\.well-known(?:/|$)|robots\.txt$|sitemap\.xml$).*)" -> /index.html`.
  → **`/api/*` ist vom SPA-Fallback ausdrücklich ausgenommen.** Eine ungebundene `/api`-Route liefert daher **nicht** die SPA-HTML (200), sondern 404. Ein SPA-200 darf also nicht als API-Erfolg gewertet werden; hier liegt gar kein SPA-200 vor.
- `functions` (Zeile 36-49): nur `api/agent-chat.ts`, `api/agent-runtime-status.ts` (Region fra1).
- Vercel deployt zusätzlich automatisch alle Dateien unter `api/` als Serverless Functions.

### 1.2 Serverless-Handler unter `api/` (reserviert, nur gelesen)
- `api/agent-chat.ts` → öffentlicher, modelfreier Chat-Handler. **Gebunden.**
- `api/agent-runtime-status.ts` → Runtime-Status-Handler. **Gebunden.**
- `api/session.ts` → liefert bewusst **HTTP 204** ("Public deployment has no visitor session"): **kein Cookie, kein CSRF, keine History.** D. h. produktiv existiert **keine** Besuchersitzung.

### 1.3 Portal = Next.js (`apps/web`)
`apps/web/next.config.ts`:
- `rewrites()` bindet `/api/:path* -> http://127.0.0.1:3003/api/:path*` **nur in `development`**; in Produktion `[]` (keine Weiterleitung).
- Produktive API-Endpunkte im Portal: nur die Route-Handler `app/api/agent-chat`, `app/api/agent-runtime-status` (+ `manifest.webmanifest`, `public-install-worker.js`).

### 1.4 Zustandsbehafteter Gateway (`apps/agent-gateway/server.py`, reserviert)
- Bindet auf **Loopback** `127.0.0.1:3003`, eigener **SQLite**-Store, HttpOnly-Cookie + CSRF, Origin-Allowlist.
- Wird in Dev/Preview über den Vite-/Next-Proxy erreicht. **Produktiv ist dieser Prozess nirgends gehostet/gebunden.**

## 2. Soll/Ist je /api-Pfad (Produktion)

| /api-Pfad | Dev (Gateway) | Produktion | Status |
|---|---|---|---|
| `/api/agent-chat` | ✓ | Serverless `api/agent-chat.ts` | **gebunden** |
| `/api/agent-runtime-status` | ✓ | Serverless `api/agent-runtime-status.ts` | **gebunden** |
| `/api/session` | ✓ Cookie+CSRF | Serverless `api/session.ts` → **204, keine Session** | **Stub, nicht funktional** |
| `/api/capabilities` | ✓ | — | **fehlt (404)** |
| `/api/pages` | ✓ | — | **fehlt (404)** |
| `/api/slots` | ✓ | — | **fehlt (404)** |
| `/api/deliveries` | ✓ | — | **fehlt (404)** |
| `/api/chat`,`/api/quotes`,`/api/bookings`,`/api/marketing` | ✓ | — | **fehlt (404)** |
| `/api/shop/cart` (+items/checkout-draft) | ✓ | — | **fehlt (404)** |
| `/api/shop/catalog` | ✓ | — | **fehlt (404)** |
| `/api/partner/requests` (+`/mine`,`/receipt`) | ✓ | — | **fehlt (404)** |
| `/api/assistant/chatgpt` | ✓ | — | **fehlt (404)** |

**Folge:** Produktiv liefert `/api/session` 204 → Frontend erhält keine `csrf`/`history` → `session` bleibt `null` → die gesamte interaktive Fläche (Chat, Booking, Shop, Partner-Intake) bleibt im „Verbindung wird vorbereitet"-Zustand. Shop/Partner/Booking sind produktiv **nicht** funktionsfähig.

## 3. Cookie/CSRF/Tenant/Origin-Vertrag (muss eine Bindung erhalten)

Aus `apps/agent-gateway/server.py` (gelesen):
- Session-Cookie: `nx_visit=<token>; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400` (+`; Secure`, wenn `--public-origin` eine https-Origin setzt).
- CSRF: pro Visitor ein `csrf`; Mutationen (POST) verlangen `X-CSRF-Token` == gespeicherter csrf (`hmac.compare_digest`) **und** `Origin` in Allowlist (`web_origin`/`public_origin`). `/api/session` (GET) legt Visitor + Cookie an und gibt `csrf` zurück.
- Cart-Cookie: `nx_cart=<token>; HttpOnly; SameSite=Lax; Path=/api/shop; Max-Age=...`.
- Tenant: `_tenant()`-Regex `[A-Za-z0-9_-]{1,100}`; Partner-Intake fest `teileklar-partner-intake`; Empfang ist rollen-/tenant-gebunden (fail-closed, separat vom Intake).
- Host-/Origin-Check (`check_host`, Origin-Allowlist) ⇒ die Bindung muss die **öffentliche .de-Origin** als `web_origin`/`public_origin` konfigurieren, sonst 403.

**Konsequenz für die Route:** Cookies müssen **first-party** sein. Nur ein **Same-Origin-Rewrite** (Browser sieht dieselbe .de-Origin, Vercel leitet serverseitig zum Gateway-Host) erfüllt gleichzeitig: first-party `nx_visit`/`nx_cart`, `Secure`-Cookies, CSRF-Origin-Allowlist und die CSP `connect-src 'self'` (siehe `vercel.json` Zeile 25). Ein Fremd-Subdomain-Direktaufruf würde an CSP `connect-src 'self'` und/oder Cookie-/Origin-Regeln scheitern.

## 4. Konkret vorbereitete fehlende Route (INERT — NICHT veröffentlicht)

Ziel: die zustandsbehafteten Gateway-Pfade produktiv an einen gehosteten Gateway binden, **ohne** die bereits gebundenen Serverless-Funktionen zu überschatten.

Vercel wertet `vercel.json > rewrites` als **afterFiles** (erst Dateisystem/Functions, dann Rewrites). Ein einzelner Catch-all-Rewrite trifft daher **nur** `/api`-Pfade ohne Serverless-Datei — also genau die fehlenden Gateway-Endpunkte.

Vorbereiteter Zusatz in `vercel.json` (`rewrites`-Array, VOR dem SPA-Fallback einfügen) — Platzhalter `GATEWAY_ORIGIN` bleibt bis zur gesicherten Einrichtung bewusst unkonfiguriert:

```jsonc
// NICHT aktivieren, solange GATEWAY_ORIGIN nicht auf einen gehosteten,
// zustandsbehafteten Gateway mit persistentem Store zeigt. Vercel interpoliert
// keine ENV in Rewrite-Zielen -> hier muss eine konkrete https-Origin stehen.
{
  "source": "/api/:path*",
  "destination": "https://GATEWAY_ORIGIN/api/:path*"
}
```

Begleitende Pflichtbedingungen der Bindung:
1. Gateway starten mit `--web-origin https://<öffentliche-.de-Origin>` und (bei TLS-Reverse-Proxy) `--public-origin https://<.de-Origin>` ⇒ `Secure`-Cookies + Origin-Allowlist korrekt.
2. Persistenter SQLite-/Datenpfad am Host (kein ephemeres FS); der Gateway ist bewusst zustandsbehaftet und **nicht** als stateless Lambda konzipiert.
3. `local_private`-Katalog bleibt Loopback-only (serverseitiger Betreibertest) — **nicht** über die öffentliche Route exponieren (`X-Local-Catalog-Access` + Origin-Gate in `server.py`).
4. CSP unverändert nutzbar (`connect-src 'self'`), da der Rewrite same-origin bleibt.

## 5. Offene Blocker / Koordination (keine ungeprüfte Veröffentlichung)

- **Gateway-Hosting:** Der Python-Gateway muss zustandsbehaftet gehostet werden (Infrastruktur-/Kostenentscheidung). Pro Vorgabe („keine neuen Kosten") **zurückgestellt**; Hosting-Origin ist vom Betreiber bereitzustellen.
- **`/api/session`-Stub (reserviert):** `api/session.ts` liefert 204 und wird als Serverless-Datei dem afterFiles-Rewrite **vorgezogen**. Solange der Stub existiert, bleibt `/api/session` ohne echte Session — der Catch-all-Rewrite kann ihn in einem Vite-Projekt (nur afterFiles-Rewrites) **nicht** überschreiben. Ablösung/Anpassung dieses Stubs ist **Backend-Owner-Domäne** und muss gezielt koordiniert werden.
- **Keine Portierung ohne Scope-Freigabe:** Ein Umbau der Gateway-Endpunkte zu einzelnen Serverless-Funktionen + Managed-DB wäre größerer Scope und ist hier nicht beauftragt.

## 6. Nächste konkrete Schritte (nach Freigabe)
1. Betreiber stellt gehostete Gateway-Origin + persistenten Store bereit (Entscheidung/Kosten).
2. Backend-Owner löst den `api/session.ts`-204-Stub ab bzw. leitet `/api/session` an den Gateway.
3. `GATEWAY_ORIGIN` im vorbereiteten Rewrite setzen, Gateway mit korrekter `--web-origin`/`--public-origin` starten.
4. Verifizierter Readback je Pfad (Set-Cookie `nx_visit`, `csrf`, echte 200/403/404 statt 204/SPA) **vor** Veröffentlichung; kein SPA-/204-Ergebnis als Erfolg werten.

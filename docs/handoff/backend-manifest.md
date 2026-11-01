# Backend manifest (TEILEKLAR shop API) – handoff for a later backend writer

Status: Phase 1 checkpoint. Generated from code and from `GET /api/openapi.json` (machine-readable contract with all request/response schemas, source of truth).

## Services and ports
| Service | Path | Port | Start |
|---|---|---|---|
| Shop API (FastAPI, ASGI) | `apps/shop-api/shop/main.py` (`app`) | 8001 (supervisor `backend`, 0.0.0.0) | supervisor: `uvicorn server:app` in `/app/backend`; `backend/server.py` only puts `apps/shop-api` and `apps/agent-gateway` on `sys.path` and imports `shop.main:app` |
| Web (Next.js) | `apps/web` | 3000 (supervisor `frontend`) | `frontend/start.sh`: `next build` then `next start --port 3000` |
| Agent gateway (Python stdlib) | `apps/agent-gateway` | `GATEWAY_PORT` (dev rewrite target 127.0.0.1:3003) | existing repo tooling; not part of the shop API |

Ingress: `/api/*` goes to 8001, everything else to 3000. Every shop route has the `/api` prefix. Cache-Control `no-store` on `/api/shop`, `/api/admin`, `/api/auth`, `/api/workshops`.

## Backend files (`apps/shop-api/shop/`)
| File | Responsibility |
|---|---|
| `main.py` | App, router registration, no-store middleware |
| `config.py` | Env reading (names below), modes |
| `db.py` | Motor client and collection handles, indexes |
| `auth.py` | `identity()` (session or guest cookie), `require_user`, `require_admin` (401 anonymous or invalid session, 403 authenticated non-admin) |
| `accounts_api.py` | Register/login/logout/me, reset, lockout (5 failures in 15 min), Emergent Google session; cookie `tk_session` (httpOnly, Secure, Lax) |
| `catalog_api.py` | Products, categories, catalog status |
| `cart_api.py` | Cart (guest cookie or user), merge on login, confirmation of price/stock changes |
| `checkout_api.py` | Quote (server prices, quote_hash), address validation, shipping options, order creation (Idempotency-Key), order read/list (owner only) |
| `revolut.py` | Hosted Checkout order, webhook signature check, idempotent webhook events, status readback |
| `pricing.py` | Purchase price, markup, VAT, rounding (cents, Decimal) |
| `bigbuy_import.py` / `bigbuy_ftp.py` | API and FTP catalog import (manifest, dedupe, previous catalog kept on error) |
| `admin_api.py` | Settings, import, orders/status/tracking, outbox, Revolut webhook registration |
| `workshops_api.py` | Workshop search (zip/city, radius, distance), detail, workshop request |
| `requests_api.py` | General contact request |
| `mailer.py` / `mail_templates.py` | Resend outbox (idempotent per event, retry without duplicates, text versions, daily cap) |

## Routes (Auth: P = public, G = guest or user cookie, U = logged-in user, A = admin, S = Revolut signature)
| Method | Path | Auth | Request body |
|---|---|---|---|
| GET | /api/health | P | – |
| POST | /api/auth/register | P | RegisterIn {email, password>=10, name?} |
| POST | /api/auth/login | P | LoginIn {email, password} |
| POST | /api/auth/logout | U | – |
| GET | /api/auth/me | U (401 otherwise) | – |
| POST | /api/auth/forgot-password | P | ForgotIn {email} |
| POST | /api/auth/reset-password | P (token) | ResetIn {token, password} |
| POST | /api/auth/google/session | P | GoogleIn {session_id} |
| GET | /api/shop/status | P | – |
| GET | /api/shop/products | P | query: q, category, page |
| GET | /api/shop/products/{product_id} | P | – |
| GET | /api/shop/categories | P | – |
| GET | /api/shop/cart | G | – |
| POST | /api/shop/cart/items | G | ItemIn {product_id, quantity} |
| POST | /api/shop/cart/confirm-changes | G | – |
| POST | /api/shop/checkout/quote | G | – |
| POST | /api/shop/checkout/validate-address | G | Address |
| GET | /api/shop/checkout/shipping-options | G | – |
| POST | /api/shop/orders | U, header Idempotency-Key | CheckoutIn {address, shipping_method, accept_terms, quote_hash} |
| GET | /api/shop/orders | U (own only) | – |
| GET | /api/shop/orders/{order_id} | U (owner) | – |
| POST | /api/shop/webhooks/revolut | S | Revolut event (raw body) |
| GET | /api/workshops/search | P | query: q (zip/city), radius |
| GET | /api/workshops/{workshop_id} | P | – |
| POST | /api/workshops/{workshop_id}/requests | P | RequestIn (workshop) |
| POST | /api/requests | P | RequestIn {name, email, message, consent} |
| GET, PUT | /api/admin/settings | A | SettingsIn {markup_percent, shipping_cents} |
| GET, POST | /api/admin/import | A | ImportIn {source?} |
| GET | /api/admin/orders | A | – |
| POST | /api/admin/orders/{order_id}/status | A | StatusIn {status, tracking?} |
| GET | /api/admin/outbox | A | – |
| POST | /api/admin/outbox/retry | A | – |
| POST | /api/admin/revolut/webhook | A | – |

Response schemas: `/api/openapi.json` (also `/api/docs`). Errors are `{"detail": {"error": "<code>", ...}}`.

## MongoDB collections (DB from `DB_NAME`)
| Collection | Short schema |
|---|---|
| users | user_id, email (unique), password_hash (bcrypt), name, role customer or admin, google_sub?, created_at |
| sessions | token hash, user_id, expires_at |
| login_failures | email, at (lockout window) |
| password_resets | token hash, user_id, expires_at, used |
| carts | owner (user:… or guest:…), items [{product_id, quantity, price_cents seen}], updated_at |
| products | _id bb-<id>, bigbuy_id, sku, ean, name, purchase_cents, stock, active, images, category_ids, source, imported_at |
| categories | id, name, parent_id |
| imports | started_at, source api/ftp, status, error, counts |
| source_manifests | import id, files, hashes, row counts |
| settings | markup_percent, shipping_cents |
| orders | order_id, owner, lines, totals (net/VAT/gross cents), address, shipping, status, timeline, revolut ids, tracking, idempotency key |
| revolut_webhooks / webhook_events | event id (unique, idempotency), payload digest, processed_at |
| outbox | event key (unique), template, to, subject, text/html, status, attempts, provider_id |
| workshops | id TKW-…, name, kind_label, street, zip, city, lat/lon, tel, web, hours |
| workshop_requests | workshop_id, contact data, message, status |
| requests | number NX-…, contact data, message, status |

## Env variable names (values never in repo)
`MONGO_URL`, `DB_NAME`, `GATEWAY_PORT`, `PREVIEW_PUBLIC_ORIGIN`, `SHOP_VAT_PERCENT`, `REVOLUT_MODE`, `REVOLUT_API_VERSION`, `REVOLUT_MERCHANT_SECRET_KEY_PRODUCTION`, `REVOLUT_MERCHANT_SECRET_KEY_SANDBOX`, `BIGBUY_API_KEY_PRODUCTION`, `BIGBUY_API_KEY_SANDBOX`, `BIGBUY_FTP_HOST`, `BIGBUY_FTP_USER`, `BIGBUY_FTP_PASSWORD`, `BIGBUY_TAXONOMY_IDS`, `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_FROM_ADDRESS`, `MAIL_INTERNAL_TO`, `MAIL_DAILY_CAP`. Web only: `ALLOW_EMERGENT_PREVIEW_FRAME` (pod only).

## Tests
- `python3 -m unittest tests.test_teileklar_shop_api`: isolated DB, accounts created by the test itself (fixtures in `setUp`), Revolut webhook with a test signing secret, mail through outbox only, no network.
- `tests/test_local_shop_cart.py`, `tests/test_local_shop_http.py`: older local shop tests.
- Web: `cd apps/web && node --test auth/tests/*.test.mjs` (including frame headers).
- Full suite `make check && make test`: currently red because of older groups (birefnet, browser_evidence, product_image_batch, reconciliation, resize).

## Open delivery boundary
- GitHub main = b06044526a9300663c87ae7e23796267f71afe00; the canonical Vercel project reports production READY on this SHA.
- vercel.json builds @nexify/site → apps/site/dist (Vite), while the shop, auth and new pages live in apps/web (Next.js) and the shop API in apps/shop-api.
- READY and repo saves therefore do not prove a working live shop; nothing in Vercel, vercel.json or the workflows was changed.

## Known open items
- BigBuy: API `access_denied` (401 Invalid Token), FTP `ftp_login_incorrect`; catalog 0.
- Google Auth and reset by real mail: no E2E run (external systems not allowed).

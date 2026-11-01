# PRD — NeXify AI / TEILEKLAR, Phase 1

## Original problem statement (summary)
Phase 1 is built inside the existing monorepo (`apps/web` Next.js, `apps/site` Vite adapter, `apps/agent-gateway`). Scope:
- Preview on :3000/:8001
- BigBuy "Auto & Motorrad" import
- Admin markup
- Catalog, cart, checkout and orders with Revolut Hosted Checkout (live)
- Workshop finder
- Own auth instead of Clerk: bcrypt, httpOnly session, reset via Resend, lockout, Emergent Google Auth, roles, cart merge
- REQ-40..48 and JRN-26..31

COPY-17 copy is moved to Phase 1b; shop, checkout and auth use only factual function texts.

## Architecture
- `apps/shop-api` (FastAPI, Motor/MongoDB), started via `backend/server.py`. Next.js runs via the `frontend/` wrapper in production mode.
- Modules: accounts_api, auth, catalog_api, cart_api, checkout_api, revolut, bigbuy_import (API) + bigbuy_ftp (FTP/CSV), workshops_api, admin_api, pricing.
- Decisions: DECISIONS.md D-005..D-009.

## Implemented (2026-10-31)
- Shop UI: /teileklar/shop, kategorien, kategorie, produkt, suche, warenkorb, kasse, bestellung(en), werkstatt, admin.
- Own accounts: /anmelden, /registrieren, /passwort-vergessen, /passwort-zuruecksetzen. Google login is included. Clerk is removed (no @clerk packages).
- Server-side pricing: purchase price × (1+markup) incl. 19% VAT. Markup is 30% by default and set in Admin.
- Revolut live checkout and webhook (signature + idempotency tested with mocks).
- 489 workshops with radius search and map.
- BigBuy import: API and FTP/CSV source, both switchable. FTP keeps a source manifest (name, size, SHA256, time). The previous catalog is kept when an import fails.
- GitHub workflow `.github/workflows/vercel-deploy.yml`: gated by `make check && make test`, deploy is opt-in via `VERCEL_CI_DEPLOY`.
- F-22 prepared: policy use case `product_enrichment` (ds/deepseek-v4-pro, high, no fallback).

## Implemented (2026-10-31, later the same day)
- Phase 1 extension: Resend outbox. Mails: order confirmation, internal new-order, welcome, reset, workshop receipt, in-progress/shipped.
- Order timeline with "Was passiert als Nächstes" and admin order status (tracking number).
- Checkout shows seller and delivery countries (fakten.json); TEILEKLAR AGB/Widerruf incl. Muster-Widerrufsformular on /teileklar/rechtliches.
- Phase 1b (WIP, stopped by coordination change):
  - docs/content/seiten-logik-audit.md
  - Contact and partner requests via /api/requests
  - Fitment checklist, tyre calculator, honest placeholders
  - Removed dead ShopPanel calls
  - Resizable docked chat
- HEAD f0279a1 on branch phase1/teileklar-shop-auth-vercel-ci, not pushed.

## Blockers
- BigBuy API: 401 Invalid Token. BigBuy FTP: 530 Login incorrect. The catalog has 0 products.
- RESEND_API_KEY / RESEND_FROM_ADDRESS are missing, so reset mails are not sent.
- test_browser_evidence (21) is fail-closed after UI/auth source changes. Browser evidence must be regenerated.

## Backlog
- P0: Valid BigBuy credentials, then run the import.
- P0: Set the Resend key.
- P1: Phase 1b: full copy concept for all pages.
- P1: Regenerate browser evidence.
- P2: Phase 2 F-22: product enrichment via router; images processed deterministically into object storage.

## 2026-10-31 Phase-1 completion package (HEAD 76c3bad)
- Truthful status copy (empty catalog, directory workshops not verified partners), chat loading state, TEILEKLAR account scope label.
- Preview-only frame-ancestors via ALLOW_EMERGENT_PREVIEW_FRAME (pod env); otherwise X-Frame-Options DENY, with tests.
- Blocked: BigBuy API access_denied, FTP ftp_login_incorrect; catalog 0 products.
- Open: admin anonymous 403 vs 401 decision; full make test failures pre-existing; test_credentials.md missing.


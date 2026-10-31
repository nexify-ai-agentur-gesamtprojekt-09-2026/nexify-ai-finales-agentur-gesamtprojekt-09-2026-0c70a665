# Requirements: TEILEKLAR Shop, Werkstattsuche und Portale (NeXify AI Repo)

## Core Value
A real, working TEILEKLAR auto-parts online shop (real BigBuy products, real Revolut payment, real orders) plus a real workshop finder (Werkstattsuche), followed by real customer/partner/neighbourhood/affiliate portals and myADMIN. Built inside the EXISTING repo and design system. The current new design/layout (apps/web, design tokens, header/footer) is LEADING. Prototype pages in `/app/prototypen/*.dc.html` are the functional source: the texts ON those pages (and `<!-- TODO(BACKEND) -->` comments, `data-api-endpoint` attributes, inline notes) are HANDOFF build instructions describing how each page must be built and behave — NOT marketing copy to paste.

## Personas & Roles
- Guest shopper (B2C, DE/NL/BE…): browse, search, cart, checkout as guest or logged in.
- Registered customer (own auth: e-mail+password or Emergent Google login): order history, account, later garage/portal.
- Workshop seeker: find a workshop by PLZ/Ort, view profile, send a request (request ≠ appointment).
- Partner workshop (phase 3): own profile, requests, appointments, vouchers.
- Neighbourhood customer (phase 3), Affiliate (phase 3).
- Admin (Pascal / NeXify team, role admin in own user DB): markup %, catalog sync, orders; full myADMIN in phase 4.

## Features
| id | feature | persona | phase |
|---|---|---|---|
| F-1 | BigBuy import of category "Auto & Motorrad" (real API, production key; sandbox for tests), stored with source/stand, dedupe, pagination | admin/system | 1 |
| F-2 | Selling price = BigBuy purchase price + fixed % markup (start 30 %), editable by admin | admin | 1 |
| F-3 | Shop home, category listing, search, product detail (TEILEKLAR Shop prototype views shop/search/product), honest fitment status (no invented "passt") | shopper | 1 |
| F-4 | Server-side cart (guest + own user account), quantity, price/stock re-check | shopper | 1 |
| F-5 | Checkout (address, shipping, review, "Zahlungspflichtig bestellen", AGB checkbox not pre-ticked) → Revolut hosted checkout (LIVE) → webhook + status readback → order confirmed exactly once | shopper | 1 |
| F-6 | Order confirmation page + order list in account | customer | 1 |
| F-7 | Werkstattsuche: PLZ/Ort search over the 4,000 workshops (`prototypen/assets/workshops.json`), radius/distance (Luftlinie labelled), map with text alternative, result list, zero-hit state | seeker | 1 |
| F-8 | Workshop detail page + persisted contact/appointment REQUEST (status "Anfrage", never "Termin bestätigt"); no partner badge for non-partners | seeker | 1 |
| F-9 | NEX-COPY-17 remainder: 6 service pages, AIFly/Pascal cards, related cards, TEILEKLAR footer intro, brandline in i18n (Sie-Form) | visitor | 1 |
| F-10 | Garage / vehicle selection, Fitment-Checker, Batterie-Berater, Reifenrechner wired to the real catalog | shopper | 2 |
| F-11 | Order mails (Resend), invoice PDF, BigBuy order forwarding/fulfilment status, returns/withdrawal flow, coupons, B2B VAT-ID | customer/admin | 2 |
| F-12 | City/Standorte pages linked both ways with workshop profiles (Masterplan §30) | seeker | 2 |
| F-13 | Kundenportal (offers accept/decline/change, invoices, documents) | customer | 3 |
| F-14 | Partnerportal + Partner-werden onboarding, profile → approval → publish, requests/appointments, vouchers | partner | 3 |
| F-15 | Nachbarschaftskunden-Portal (voucher redeem, appointments), Affiliate-Portal (links, conversions) | neighbour/affiliate | 3 |
| F-16 | myADMIN v2 + Leitstand: orders, catalog, partners review, settings | admin | 4 |

## Phases
- Phase 1 (MVP): Real shop loop + Werkstattsuche + NEX-COPY-17 remainder → F-1…F-9. Docs: `/app/memory/product/phase1/requirement.md`, `/app/memory/product/phase1/journeys.md`
- Phase 1b (user priority 31.10.2026, directly after Phase 1): GESAMT-TEXTKONZEPT for ALL 46 pages in `config/site-map.json` (+ page-explainers, i18n, header/footer). Problem: yesterday's round turned page-structure/build descriptions into marketing copy. Goal: one continuous concept from home to footer — every page gets purpose, audience, section flow and new customer copy written from its real function; build instructions are implemented or removed, never published as text → F-21. Replaces the COPY-17 copy items of Phase 1.
- Phase 1c (user request 31.10.2026, right after 1b): DESIGN POLISH on every page, header to footer, the full programme. Depth and elevation (layered shadows, surfaces, light and glow, borders), spacing rhythm, typography hierarchy, hover, focus and active states, micro-interactions (reduced-motion safe), images and media framing, empty and error states, all breakpoints (320/768/1440+). Stays inside the existing design system (Graphit/Lime/Türkis, Geist). New tokens may be added, but core token values change only with a documented reason → F-23. Includes REMOVAL OF ALL "AI TELLS" (user: "all the characteristics of AI are still there, like divider lines etc. All of that has to go. All AI characteristics."). Visual tells: hairline divider lines between every section, list item or card (border-top/bottom 1px everywhere); numbered kickers "01 / 02 / 03"; small mono uppercase eyebrow labels above every heading; arrow "→" links everywhere; uniform 3-column card grids; generic glow blobs and purple/teal gradients; identical cards with thin borders; centred-everything symmetry; emoji or icon bullets; pill badges everywhere; excessive mono font. Text tells: em-dash chains, "nahtlos / maßgeschneidert / ganzheitlich / revolutionär / im Handumdrehen", triplet lists, rhetorical questions, "Nicht X, sondern Y" patterns. Separation of areas comes from real depth instead (surfaces, elevation, spacing, light), not from lines. DEPTH/3D must be truly premium: layered multi-shadow elevation scale, subtle ambient + key light, inner highlights on raised surfaces, perspective/tilt only as state (reduced-motion off), consistent light direction across all components. Includes SPACING everywhere (user: "Achte auf Abstände, rundum, auch um die Formulare"): one spacing scale from tokens; consistent outer padding of sections, cards, forms, inputs, buttons, labels, error texts, form groups and modals; no element touches an edge or a neighbour; equal gaps between fields; enough space between form and surrounding content on all breakpoints. Includes SEAMLESS VIDEOS (user reminder 31.10.2026: the background must be removed IN THE VIDEO FILES THEMSELVES. Hiding it with CSS is not enough, and there must be no "double background" of video backdrop plus page): remove the visible "box" around every presenter/hero video (cause: the video background is a dark gradient, #0A0A0A at the edges up to about #2C3E30, which does not match the page's #242826). Target is real transparency: the figures are cut out by video matting and delivered as WebM VP9 alpha plus a "stacked alpha" MP4 (colour + alpha mask) rendered via WebGL/canvas for Safari, because HEVC alpha needs macOS. Fallback is a CSS mask-image feather with a backdrop matched to the video edges. No border, radius, shadow or player frame. Effects are scoped to :not(:fullscreen). Reduced-motion users get the poster.
- Phase 2: Shop completion (vehicle/fitment tools, mails, invoices, fulfilment, returns, coupons, city pages) → F-10…F-12
- Phase 3: Portals → F-13…F-15
- Phase 4: myADMIN / Leitstand → F-16
- Phase 5: NeX2fly Suite + one/one+ + API (Masterplan §9, §10, P2B): registration/trial, workspace, usage/ledger, prepaid → F-17
- Phase 6: Arbeitsplatzdienste (Masterplan §13, §14, P2D): mail, CRM, documents, Brain → F-18
- Phase 7: Medien/Content finalisation + public agency gates (§7, §8, P2A/P2E) → F-19
- Phase 8: Go-Live (§21, §22 P4): deployment, domains, live readback, legal gates, independent acceptance → F-20

## Operating Mode
- UPDATE 31.10.2026 (new coordinator on Pascal's behalf), SUPERSEDES the autopilot and full-approval lines below:
  - Credit budget: 1,073.86 at handover. No top-ups, no plan changes, no new paid services.
  - Keep the single web_app_dev writer and do not start a second writer.
  - No automatic expansion after Phase 1. First verify and checkpoint Phase 1 together with the preview. Phases 1b/1c/2+ are prioritised separately by the coordinator.
  - Do not output or forward secrets or OTPs. No new credentials, rights or security changes, and no real payments or orders, without concrete approval.
  - Mode confirmed 31.10.2026 (user re-sent the autopilot text and then chose explicitly): COORDINATION MODE stays. Packages are run one at a time, each with an offer and an approval, under budget control. The answer "push/deploy after successful tests" was given only for the autopilot case and does not apply. Production deployment still needs its own approval.
  - Coordinator note 31.10.2026: the form answers saved at 14:57/14:58 (mode choice / deploy "Ja") were NOT submitted by the coordinator. Nothing may be derived from them: no push, no deploy, no autopilot. The chat message "einfach nur pauschal +30%" is unverified, so no price release and no price change follow from it. Budget: 899.35 before the external design run, 852.50 at the stop.
  - RELEASE (31.10.2026, coordinator takes release coordination). Pascal at 15:08 MEZ: "Du hast alle Freigaben, stell die Scheiße online. Punkt." Target: 18:00 MEZ (17:00 UTC).
    - Allowed now: push to the dedicated branch `release/emergent-20261031` on the canonical remote nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665. No force-push, no change to main. Versioned code/tests/docs only, no .env, no secrets, no new raw logs.
    - Still not allowed: own deployment by us, changing the Vite/Next target binding, any site-k23m rebuild, credential/security/rights/DNS changes, payments, price release. The coordinator deploys on the canonical Vercel project after integration and tests.
    - The bounded autopilot continues within the 150-credit frame, with no scope growth.
  - BOUNDED AUTOPILOT, APPROVED (31.10.2026; Pascal confirmed in the coordinator's chat, and the coordinator handed it over):
    - Budget: at most 150 credits in total, counted from the 15:03 run. Hard stop at a remaining balance of 692.55; at handover 822.56 visible, so at most 130.01 left. No top-up, no subscription, no paid media. Never work down to zero; when in doubt, secure and stop earlier.
    - Owner: web_app_dev is the only implementation owner. Keep commit 1a59991 and build on it. No new inventory analysis, no feature growth. `checkout_api.py` and `mailer.py` stay reserved for Codex.
    - Priorities:
      1. Close the chat/video patch: one desktop launcher; typing, scroll, resize and close; no 0:00 error when the duration is unknown; visible focus; checked at 320/390/1180/1440. The existing cut-out hero graphic may be used as a provisional fallback. Keep the original videos, and do not report real video matting as done.
      2. Make the shop surfaces and existing flows consistent by fixing concrete bugs, not adding modules. Orders, payments and price release stay blocked.
      3. Targeted regressions plus honest acceptance evidence. Never make a test pass by replacing its expected results. German requirements only from primary sources and where actually applicable. No invented company, manufacturer or contract data, and no claim of legal sign-off.
    - Limits: no push, no PR approval, no deploy. No domain, network, rights, security or credential change. No deletion, no real mails or payments, no further BigBuy imports. The Vite-vs-Next delivery boundary stays open and must not be reconfigured silently.
    - Delivery: small local commits per package, each reported with SHA, files, tests and remaining budget. One final report split into done / tested locally / not tested / blocked.
  - SAFE AUTOPILOT — REVOKED by the coordinator (31.10.2026): the 150-credit cap and the autopilot sequence are NOT approved. Nothing (phases, prices, legal texts, deployment) may be derived from chat messages whose sender is unclear. All writers stay stopped until the coordinator has clarified control with Pascal. Phase 1d docs exist only as a draft and are not approved.
  - (revoked) SAFE AUTOPILOT (chat instruction 31.10.2026: "think logically, research German standards, apply them, start autopilot"). The sequence below runs without further questions, only within these hard limits:
    - Credit cap 150 for the whole run.
    - Checkpoint and short report after each package.
    - No push, no deployment.
    - No price release, no live payment.
    - No credential, rights or security changes.
    - `checkout_api.py` and `mailer.py` stay untouched.
    - No paid media.
    Order: (1) 1c-a A+B chat depth + video controls; (2) 1d German shop standards; (3) re-run the stale browser evidence so `make test` turns green. Stop after that, or earlier at the cap.
  - Local packages eee6f637 and dcd9377 exist outside Emergent. Do not rebuild or overwrite them blindly.
  - Price rule (31.10.2026): purchase price + 30 % is an UNCONFIRMED calculation assumption, not an approved selling price. A price-release gate is required; the default is "nicht freigegeben", and cart/checkout stay blocked until an admin records the release.
  - Design: Pascal commissioned a design alignment (spatial depth, entire right chat area, video backgrounds). An independent visual review is running and its findings will follow. No parallel edits to the same frontend files. Code, tests and docs stay in the repo with clear file owners and local commit/test evidence.
  - No key transfer, rotation or security change as part of the import package.
  - DELIVERY BOUNDARY (verified 31.10.2026): GitHub main = b06044526a9300663c87ae7e23796267f71afe00, and the canonical Vercel project reports production READY on it. However, vercel.json builds @nexify/site → apps/site/dist (Vite), while the shop, auth and new pages live in apps/web (Next). READY or a repo save is therefore NOT proof of a working live shop. Do not change Vercel or workflows. An independent Codex repo reviewer reads b060445 and tests the backend in isolation, without writing files.
  - Budget checkpoints: 974.75 at 14:24, 920.38 at the import pause.
- AUTOPILOT (user instruction 31.10.2026): "Lade SOLL-WISSEN und SOLL-ZIEL (Gesamtziel) – Go-Live – führe aus und stelle fertig." Proceed phase to phase without waiting for feedback; stop only for measured blockers that need owner action (keys, legal/price decisions, real payments). Source of truth for the Gesamtziel: `docs/masterplan/NeXify-Masterplan-v2-2026-10-29.md` (V2.1).
- FULL APPROVAL (user 31.10.2026: "Setze alles um. Freigabe."): all planned phases 1, 1b, 2–8 incl. Vercel CI are approved. Go-Live/production changes are executed in Phase 8 as planned.
- Composio Connect (MCP, `COMPOSIO_API_KEY` ck_) gives access to Vercel/Hostinger. Read freely; production/DNS/deploy changes only as part of the Go-Live phase.

| F-17 | NeX2fly Suite Privat/Business, one/one+, AIFly API, 24h trial, 30 days access + usage | customer | 5 |
| F-18 | Mail workspace, CRM, Belegpipeline, documents, Brain/LightRAG | internal | 6 |
| F-19 | Media/scene integration all routes, content/legal/SEO gates | visitor | 7 |
| F-20 | Go-Live: production deploy, domains, live readback, monitoring | owner | 8 |
| F-22 | Permanent AI product enrichment via own router (9router, `ROUTER_URL=https://ai-router.nexifyai.cloud/v1`, `ROUTER_KEY`, OpenAI-compatible, model `ds/deepseek-v4-pro` (user decision 31.10.2026, overrides config/llm-policy.json for product enrichment), reasoning high): rewrite product descriptions from verified BigBuy facts only (versioned, raw data kept) + image normalisation (background/size/sharpness, never alter product or scope of delivery); runs on every import/sync | admin/system | 2 |

## UI/UX Rules
- The NEW design system in the repo is leading (`config/design-tokens.json`, apps/web components, shared header/footer). Prototypes give structure/behaviour/content-intent only.
- German Sie-Form in customer texts; DE first, NL/FR via existing i18n where present.
- Inline validation with `role=alert`; button "Zahlungspflichtig bestellen"; AGB checkbox never pre-checked; reduced-motion respected.
- Never invent: fitment ("passt"), delivery days, stock "sofort lieferbar", workshop partner status, slots, ratings, prices.

## Integrations
- BigBuy API: `BIGBUY_API_KEY_PRODUCTION` (import), `BIGBUY_API_KEY_SANDBOX` (tests). Existing `apps/agent-gateway/bigbuy_get.py` to be reused.
- Revolut Merchant API (Hosted Checkout + webhook HMAC signature verification): `REVOLUT_MERCHANT_SECRET_KEY_PRODUCTION` = LIVE (user decision: live money immediately); `REVOLUT_MERCHANT_SECRET_KEY_SANDBOX` for automated tests. Mode switch via server env.
- Auth (user decision 31.10.2026): Clerk REPLACED by own auth — e-mail + password (JWT in httpOnly cookie, bcrypt, register/login/logout/password reset) PLUS Emergent-managed Google social login. Same user record for both methods (linked by e-mail). Clerk code paths removed or disabled.
- Resend (managed, available) – phase 2.
- Note: keys are stored in the frontend env file; they must only ever be read server-side.

## Edge Cases
- Price/stock change between cart and payment → re-check, show change before payment.
- Double click / reload / back on checkout → one order only (idempotency).
- Webhook duplicated / out of order / bad signature → exactly one paid transition; bad signature rejected.
- Browser closed after payment → order still confirmed through webhook/readback.
- Foreign order ID → 404.
- PLZ unknown / zero hits / workshops without coordinates / same city names.

## Seed Data
- Products: real BigBuy "Auto & Motorrad" import (no fake products).
- Workshops: `prototypen/assets/workshops.json` (4,000 DE entries, TKW-IDs) as directory data, all flagged "Verzeichnisbetrieb", not partners.
- Admin user: a test admin (e-mail+password) documented in `/app/memory/test_credentials.md`.

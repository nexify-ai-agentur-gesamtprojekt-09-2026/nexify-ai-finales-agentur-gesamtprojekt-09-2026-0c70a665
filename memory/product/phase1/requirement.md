# Phase 1 Requirement — Echter Shop + Werkstattsuche + NEX-COPY-17-Rest

Version: phase-1
Goal: A visitor can find a real BigBuy "Auto & Motorrad" product, put it in a server-side cart, check out and pay via Revolut (live), and receives exactly one confirmed order visible in their account; a visitor can find workshops by PLZ/Ort and send a persisted request. The open NEX-COPY-17 copy items are finished. See `/app/memory/product/overview.md` for context, integrations, edge cases.

Sources to read first: `prototypen/TEILEKLAR Shop.dc.html` (views shop, search, product, cart, checkout, account, partner/locations), `prototypen/Werkstatt-Partnerseite.dc.html`, `prototypen/assets/workshops.json`, Masterplan §11, §30 (`docs/masterplan/NeXify-Masterplan-v2-2026-10-29.md`), `docs/contracts/local-shop-*.md`, `docs/handoff-2026-10-31/COPY-17-MANIFEST-REMAINING.md` + `patches-copy/`. On-page prototype texts are build instructions, not copy.

## Functional requirements

Catalog / import
- REQ-1 [event] When an admin starts the BigBuy import, the system shall fetch all pages of the BigBuy category "Auto & Motorrad" with the production key.
- REQ-2 [always] The system shall store each product with BigBuy ID, SKU, EAN, name, images, category, purchase price, stock and import timestamp.
- REQ-3 [unwanted] If a product already exists by BigBuy ID, then the system shall update it instead of creating a duplicate.
- REQ-4 [unwanted] If the BigBuy API fails or rate-limits, then the system shall keep the previous catalog and show the error in the admin import status.
- REQ-5 [always] The system shall compute the selling price as purchase price × (1 + markup %) incl. VAT, with markup starting at 30 %.
- REQ-6 [event] When an admin changes the markup %, the system shall show recalculated prices on all product pages.
- REQ-7 [unwanted] If a non-admin calls the markup or import endpoint, then the system shall answer 403.

Shop
- REQ-8 [always] The system shall show a shop home, category listing with pagination, and search by name/SKU/EAN in the TEILEKLAR shop layout of the new design.
- REQ-9 [state] While a search has no hits, the system shall show an empty state with a "Suche zurücksetzen" action.
- REQ-10 [always] The system shall show on the product page images, price incl. VAT, stock status, EAN/SKU and BigBuy-derived details.
- REQ-11 [always] The system shall show fitment as "Passung nicht geprüft" unless a fitment source exists (no invented "passt").
- REQ-12 [unwanted] If a product has stock 0, then the system shall disable "In den Warenkorb".

Cart
- REQ-13 [event] When a shopper adds a product, the system shall store the item in a server-side cart bound to the guest session or the logged-in user.
- REQ-14 [always] The system shall compute cart totals on the server from current catalog prices.
- REQ-15 [unwanted] If a client sends a manipulated price, then the system shall ignore it.
- REQ-16 [event] When a guest logs in, the system shall merge the guest cart into the user cart.

Checkout & payment
- REQ-17 [always] The system shall run checkout in steps: address, shipping, review, payment.
- REQ-18 [unwanted] If a required address field is missing, then the system shall show an inline error with role=alert.
- REQ-19 [always] The system shall render the AGB/Widerruf checkbox unchecked by default.
- REQ-20 [unwanted] If the AGB checkbox is not checked, then the system shall keep "Zahlungspflichtig bestellen" disabled.
- REQ-21 [event] When the shopper clicks "Zahlungspflichtig bestellen", the system shall create an immutable order snapshot and a Revolut order server-side with an idempotency key.
- REQ-22 [unwanted] If the price or stock changed since the cart, then the system shall show the change and require confirmation before payment.
- REQ-23 [event] When Revolut sends a webhook with a valid signature, the system shall set the order to "bezahlt" exactly once after reading back the Revolut order status.
- REQ-24 [unwanted] If the webhook signature is invalid, then the system shall reject it with 401 and not change the order.
- REQ-25 [unwanted] If the payment fails or is cancelled, then the system shall show "Zahlung nicht abgeschlossen" and keep the cart.
- REQ-26 [always] The system shall use the Revolut LIVE key by default and the SANDBOX key when the server env mode is set to sandbox (tests).
- REQ-27 [event] When payment succeeds, the system shall show a confirmation page with order number, items and total.
- REQ-28 [always] The system shall list a logged-in user's orders with status in the account area.
- REQ-29 [unwanted] If a user requests another user's order, then the system shall answer 404.

Werkstattsuche
- REQ-30 [event] When a visitor enters a PLZ or city, the system shall list matching workshops sorted by straight-line distance with the label "Luftlinie".
- REQ-31 [always] The system shall show the results on a map plus an equivalent text list.
- REQ-32 [state] While a search has no hits, the system shall show "Keine Werkstatt gefunden" with a hint to widen the radius.
- REQ-33 [always] The system shall mark directory workshops as "Verzeichnisbetrieb" and never show a partner badge for them.
- REQ-34 [event] When a visitor opens a workshop, the system shall show its detail page with address, phone, website, hours (only if present).
- REQ-35 [event] When a visitor submits the request form, the system shall persist the request with status "Anfrage gesendet – noch kein Termin".
- REQ-36 [unwanted] If request fields are invalid, then the system shall show inline errors with role=alert.

NEX-COPY-17
- REQ-37 [always] The system shall show the six service pages `/leistungen`, `/leistungen/websites`, `/leistungen/agenten-automatisierung`, `/leistungen/apps-portale`, `/preise-ablauf`, `/kontakt` with finished customer copy in Sie-Form.
- REQ-38 [always] The system shall show the AIFly and Pascal cards, Partner/Kategorien related cards and the TEILEKLAR footer intro per the COPY-17 manifest.
- REQ-39 [always] The system shall show the brandline in `apps/web/lib/i18n.ts` in Sie-Form with the label "KI-Assistent".

## Quality requirements
```
Q-1  Tag: Payment.Correctness
     Scale: orders per successful payment
     Meter: tester sandbox runs + duplicate webhook replay, 5 trials
     Must: exactly 1   Plan: exactly 1
Q-2  Tag: Payment.Security
     Scale: % invalid-signature webhooks rejected
     Meter: tester crafted webhooks, 5 trials
     Must: 100 %   Plan: 100 %
Q-3  Tag: Data.Isolation
     Scale: foreign orders/carts readable
     Meter: tester with 2 users
     Must: 0   Plan: 0
Q-4  Tag: Catalog.Completeness
     Scale: imported products vs BigBuy count for category
     Meter: import manifest counts
     Must: ≥ 95 % (estimate)   Plan: 100 %
Q-5  Tag: Shop.Speed
     Scale: ms from search submit to results rendered
     Meter: browser, 5 trials
     Must: < 2000   Plan: < 800
Q-6  Tag: Finder.Speed
     Scale: ms from PLZ submit to list rendered
     Meter: browser, 5 trials
     Must: < 2000   Plan: < 600
Q-7  Tag: Layout.Responsive
     Scale: horizontal overflow / broken layout at 320, 768, 1440 px
     Meter: browser screenshots of shop, product, cart, checkout, finder
     Must: 0 defects   Plan: 0
Q-8  Tag: Images.Quality
     Scale: stretched/distorted product images
     Meter: visual check of 10 products
     Must: 0   Plan: 0
Q-9  Tag: Payment.Live
     Scale: real live payment completed end-to-end
     Meter: human (owner pays a small real order)
     Must: 1   Plan: 1
```

## Addendum (31.10.2026): own authentication replaces Clerk
- REQ-40 [event] When a visitor registers with e-mail and password, the system shall create an account with a bcrypt-hashed password and log the user in.
- REQ-41 [unwanted] If the e-mail is already registered, then the system shall show "Diese E-Mail-Adresse ist bereits registriert".
- REQ-42 [unwanted] If the password is shorter than 10 characters, then the system shall show an inline error with role=alert.
- REQ-43 [event] When a user logs in with correct credentials, the system shall set an httpOnly session cookie.
- REQ-44 [unwanted] If the credentials are wrong, then the system shall show "E-Mail oder Passwort ist falsch" without revealing which one.
- REQ-45 [unwanted] If there are 5 failed logins for an account within 15 minutes, then the system shall block further attempts for 15 minutes.
- REQ-46 [event] When a user clicks "Mit Google anmelden", the system shall log in via Emergent-managed Google Auth and link to the existing account with the same e-mail.
- REQ-47 [event] When a user logs out, the system shall invalidate the session.
- REQ-48 [always] The system shall store role (customer, admin) on the user record; admin endpoints check it server-side.

## Addendum (31.10.2026): customer clarity, operations and transactional e-mails (Resend)
User: "Especially in the shop, everything has to be perfect: the presentation, and the logic must be clear to the customer, how the processes and operations run. Resend too, of course: confirmation e-mails etc. Really think of everything."
Resend is managed and set up (RESEND_API_KEY, RESEND_FROM/RESEND_FROM_ADDRESS, MAIL_INTERNAL_TO, MAIL_DAILY_CAP exist).

- REQ-49 [event] When an order is paid, the system shall send the customer a Bestellbestätigung via Resend. It contains the order number, items, prices incl. VAT, shipping, total, billing and delivery address, payment method, and links to the AGB, Widerrufsbelehrung + Muster-Widerrufsformular and Datenschutz.
- REQ-50 [event] When an order is paid, the system shall send an internal new-order notification to MAIL_INTERNAL_TO.
- REQ-51 [event] When a user registers, the system shall send a welcome/confirmation e-mail.
- REQ-52 [event] When a user requests a password reset, the system shall send a reset e-mail with a single-use link valid for 60 minutes.
- REQ-53 [event] When a workshop request is submitted, the system shall send the requester a receipt e-mail stating "Anfrage gesendet – noch kein Termin".
- REQ-54 [unwanted] If an e-mail fails to send, then the system shall keep the order or request unchanged, record the mail status "fehlgeschlagen", and retry without sending duplicates (outbox, idempotent per event).
- REQ-55 [always] The system shall render all e-mails in the TEILEKLAR / NeXify brand design (based on the prototype e-mail templates), with a plain-text alternative, in Sie-Form.
- REQ-56 [always] The system shall show on the order page a status timeline: "Bestellt" → "Bezahlt" → "In Bearbeitung" → "Versendet" → "Zugestellt". Only states that are actually reached are marked.
- REQ-57 [always] The system shall explain "Was passiert als Nächstes" on the confirmation page and in the e-mail: processing, shipping by the supplier, expected handling time only when the source data provides it, and how to withdraw or return.
- REQ-58 [always] The system shall show, before checkout, the shipping costs, the delivery country restrictions, the total incl. VAT, and the seller identity from config/fakten.json.
- REQ-59 [always] The system shall give the admin an order list with status. Admins can manually set "In Bearbeitung" and "Versendet" (with tracking number), and each change triggers the matching customer e-mail (interpreted).

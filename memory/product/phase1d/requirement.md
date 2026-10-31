# Phase 1d Requirement: German online shop standards (TEILEKLAR)

Version: phase-1d
Goal: the TEILEKLAR shop meets the current German and EU duties for B2C online trade as of Oct 2026. Sources: IHK checklists for e-commerce, Händlerbund Gesetzesänderungen 2026, Bundesfachstelle Barrierefreiheit. This is not legal advice; Pascal releases the legal texts (Masterplan decisions E1/E3–E6/E12).

Boundaries: no change to `apps/shop-api/shop/checkout_api.py` or `apps/shop-api/shop/mailer.py`, which are reserved for Codex. Use mailer only through its existing public functions. No price release. No live payment. No legal texts invented: missing company data shows as a visible gap from `config/fakten.json`.

- REQ-301 [always] The system shall show the gross final price incl. VAT, plus shipping costs, on every product card, product page and in the cart (PAngV).
- REQ-302 [always] The system shall show a Grundpreis (per kg/l/m) where the product data contains quantity units (PAngV §4) (interpreted).
- REQ-303 [always] The system shall show GPSR information on the product page: manufacturer name, postal address, e-mail, product identifier (EAN/SKU/type), and safety/warning notes where the source data provides them.
- REQ-304 [unwanted] If GPSR manufacturer data is missing, then the system shall mark the product "nicht verkaufsbereit (Herstellerangaben fehlen)" and block it from purchase.
- REQ-305 [always] The system shall label the order button exactly "Zahlungspflichtig bestellen" (§312j BGB).
- REQ-306 [always] The system shall offer an electronic Widerrufsbutton ("Vertrag widerrufen"), mandatory since 19.06.2026, that stays visible and reachable for the whole withdrawal period.
- REQ-307 [event] When a customer clicks "Vertrag widerrufen", the system shall show a form (name, order number, e-mail) with a confirmation button "Widerruf bestätigen".
- REQ-308 [event] When the withdrawal is confirmed, the system shall store it and queue a receipt e-mail on a durable medium through the existing outbox.
- REQ-309 [always] The system shall show the Widerrufsbelehrung (incl. the withdrawal button) and the Muster-Widerrufsformular.
- REQ-310 [always] The system shall not show any link to the EU ODR platform (shut down 20.07.2025). It shows the VSBG statement on dispute resolution instead.
- REQ-311 [always] The system shall reach the Impressum (§5 DDG) from every page in at most 2 clicks.
- REQ-312 [always] The system shall load no non-essential cookies or trackers before an active opt-in with nothing pre-selected (TDDDG).
- REQ-313 [always] The system shall show the BattG notice (take-back, crossed-out bin symbol, chemical symbols) on battery products and in the legal area.
- REQ-314 [always] The system shall meet BFSG/EN 301 549 (WCAG 2.1 AA) on the shop pages: keyboard operability, visible focus, contrast ≥ 4.5:1, alt texts, form labels, error messages with role=alert.

## Quality
```
Q-301 Tag: Legal.Completeness
      Scale: missing items of REQ-301..313 on shop pages
      Meter: checklist run on product, cart, checkout, legal pages
      Must: 0   Plan: 0
Q-302 Tag: A11y.BFSG
      Scale: axe-core serious/critical violations on shop pages
      Meter: automated scan (if available) + manual keyboard run
      Must: 0   Plan: 0
Q-303 Tag: Legal.Approval
      Scale: legal texts released by Pascal
      Meter: human
      Must: released before sales start   Plan: released
```

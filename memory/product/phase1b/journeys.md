# Phase 1b Journeys

superseded: [JRN-22, JRN-23] (copy assertions of COPY-17 are replaced by the concept-based rewrite below)

- JRN-101 steps: Open `docs/content/gesamt-textkonzept.md`. expected: contains positioning, target groups, tone, glossary, and a table with all 46 page ids, each with purpose, audience, section order and primary CTA.
- JRN-102 steps: Visit all 46 routes in DE. expected: none of the banned terms from REQ-107 appear in visible text. No section reads like a description of how the page is built.
- JRN-103 steps: Repeat JRN-102 for NL and FR. expected: same result; translations present, no German leftovers in NL/FR body text.
- JRN-104 steps: Read the start page top to bottom, then follow the primary CTA to a service page, then to /kontakt. expected: one continuous storyline, each page has exactly one primary CTA, wording consistent with the glossary.
- JRN-105 steps: Open /leistungen, /leistungen/websites, /leistungen/agenten-automatisierung, /leistungen/apps-portale, /preise-ablauf, /kontakt. expected: each page states what the customer gets, how it works, and the next step, with no caveat or specification sentences.
- JRN-106 steps: Open /produkte/nex2fly, /produkte/one, /produkte/api. expected: copy matches glossary (NeX enthält AIFly; Privat/Business), and every price shown equals the value in config/fakten.json or config/api-prepaid.json.
- JRN-107 steps: Open /teileklar and the shop/werkstatt pages. expected: TEILEKLAR voice, real shop functions described plainly, unbuilt features show only a short "Folgt in Kürze" line.
- JRN-108 steps: Open the legal pages. expected: factual legal text, no marketing claims, company data equals fakten.json.
- JRN-109 steps: Check header, footer, TEILEKLAR footer intro and brandline. expected: wording follows the concept, Sie-Form, label "KI-Assistent".
- JRN-110 steps: Inspect page title and meta description of 10 pages. expected: unique per page and derived from the new copy.
- JRN-111 steps: View home, /leistungen, /produkte/one, /teileklar, /kontakt at 320/768/1440 px. expected: no cut or overflowing text.
- JRN-112 steps: (human) Pascal reads home, /leistungen, /produkte/one, /teileklar. expected: approves the result as one continuous concept.
- JRN-113 steps: Open docs/content/seiten-logik-audit.md. expected: every prototype file in prototypen/ appears, each mapped to route(s) or marked "ohne Route", each instruction carries a status and a target phase.
- JRN-114 steps: Pick 5 instructions marked "implemented" from the audit (incl. at least 2 from TEILEKLAR Shop, 1 from Werkstatt-Partnerseite) and use them in the preview. expected: behaviour matches the instruction.
- JRN-115 steps: Click every form submit / action button on public pages. expected: either real persisted result or honest placeholder; no fake "Erfolgreich"/"Gesendet" without backend.
- JRN-116 steps: Crawl all internal links on all routes. expected: 0 broken links (no 404).
- JRN-117 steps: On desktop 1440 px, drag the chat handle narrower and wider. expected: width follows between 320 px and 50 % viewport; the page content reflows live, with no horizontal scrollbar and no overlap.
- JRN-118 steps: Focus the handle, press Arrow Left 3 times, then double-click the handle. expected: the width changes in 16 px steps, then resets to the default.
- JRN-119 steps: Collapse the chat, reload, reopen. expected: the page uses the full width while collapsed, the state survives reload, and the reopen control is visible.
- JRN-120 steps: View at 768 px and 390 px. expected: single main view, chat as a drawer, and the composer stays usable with the on-screen keyboard.
- JRN-121 steps: Open the shop, a form page and the footer with the chat open at minimum and maximum width. expected: grids and forms adapt, with no clipped text.

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

# Phase 1b Requirement: Gesamt-Textkonzept for all pages

Version: phase-1b
Goal: Every public page (all 46 entries in `config/site-map.json`, plus header, footer, page explainers and i18n strings) carries new customer copy. The copy follows ONE continuous concept from the home page to the footer. Page-structure descriptions, build instructions and internal process language no longer appear as visible text anywhere. Context: `/app/memory/product/overview.md`. Yesterday's round (NEX-COPY-17) turned build descriptions into marketing text. This phase replaces that work completely.

Sources: Masterplan V2.1 §1, §2, §7 (Informationsarchitektur, Inhaltspflicht pro Seite), §8.5. Other sources: `config/fakten.json`, `config/api-prepaid.json`, `dokumentation/01-…` (Produkt/Marke), and `prototypen/*.dc.html`. Read the prototypes only to learn what each page is for and how it is structured. On-page prototype texts are build instructions, never copy.

## Functional requirements

Concept first
- REQ-101 [always] The system shall have a written Gesamt-Textkonzept at `docs/content/gesamt-textkonzept.md` before any page copy is changed.
- REQ-102 [always] The concept shall define positioning, target groups (agency clients, NeX2fly/one users, TEILEKLAR shoppers, workshops/partners), tone of voice (Sie-Form, clear, concrete, no hype), and the page roles.
- REQ-103 [always] The concept shall define the journey from start page through each service, product and TEILEKLAR page to contact/checkout, with one primary call-to-action per page.
- REQ-104 [always] The concept shall contain a glossary so that terms are identical on every page (e.g. NeX2fly, NeX, AIFly, one/one+, TEILEKLAR, Werkstattsuche).
- REQ-105 [always] The concept shall list, for every page id, its purpose, audience, section sequence and primary CTA.

Copy rewrite
- REQ-106 [always] The system shall show new DE customer copy on every one of the 46 pages, written from the page's real function and following the concept.
- REQ-107 [always] The system shall show no build or handoff instructions as visible text (e.g. "Bauanweisung", "Handoff", "TODO", "Abnahme", "Nachweis", "Beleg", "Gate", "Owner", "Quellenbindung", "Implementierungsstatus", "keine Lieferzusage", "prüfbarer Umfang") (interpreted).
- REQ-108 [always] The system shall describe a feature only when it exists in the build. A feature that is not built yet gets one short, honest line such as "Folgt in Kürze", never a specification (interpreted).
- REQ-109 [always] The system shall use only prices, figures and company data from `config/fakten.json` / `config/api-prepaid.json`, never invented numbers.
- REQ-110 [always] The system shall give each page a coherent flow: hero line, benefit, how it works, proof or example, FAQ where useful, CTA. Each section is clearly a different step, and content does not repeat between sections.
- REQ-111 [always] The system shall keep legal pages (Impressum, Datenschutz, Vertragsgrundlagen, KI-Hinweise, Barrierefreiheit, Cookies, TEILEKLAR Rechtliches) legally factual, without marketing.
- REQ-112 [always] The system shall rewrite header, footer (incl. TEILEKLAR footer intro), navigation labels, page explainers and the brandline in `apps/web/lib/i18n.ts` to match the concept.
- REQ-113 [always] The system shall provide NL and FR (and EN where present) as translations of the new DE copy with identical meaning.
- REQ-114 [always] The system shall write SEO title and meta description per page from the new copy.
- REQ-115 [unwanted] If an old text key remains unused after the rewrite, then the system shall remove it instead of leaving stale copy.
- REQ-116 [always] The system shall keep TEILEKLAR copy in the TEILEKLAR brand voice ("TEILEKLAR – Na KLAR!"), separate from the NeXify agency voice, as defined in the concept.

## Quality requirements
```
Q-101 Tag: Copy.NoBuildText
      Scale: occurrences of banned process/build terms in rendered page text
      Meter: tester crawl of all 46 routes (DE/NL/FR) + grep list from REQ-107
      Must: 0   Plan: 0
Q-102 Tag: Copy.Consistency
      Scale: glossary terms spelled/used differently across pages
      Meter: tester crawl vs glossary
      Must: 0   Plan: 0
Q-103 Tag: Copy.Readability
      Scale: average sentence length (words) in DE body copy
      Meter: script over rendered text
      Must: ≤ 22 (estimate)   Plan: ≤ 16
Q-104 Tag: Copy.Truth
      Scale: numbers/prices on pages not traceable to fakten.json/api-prepaid.json
      Meter: tester comparison
      Must: 0   Plan: 0
Q-105 Tag: Copy.Quality
      Scale: owner verdict "liest sich wie ein durchgehendes Konzept"
      Meter: human (Pascal reviews home, Leistungen, one, TEILEKLAR home)
      Must: approved   Plan: approved without changes
Q-106 Tag: Layout.TextFit
      Scale: overflowing/cut text at 320/768/1440 px
      Meter: tester screenshots of 10 key pages
      Must: 0   Plan: 0
```

## Addendum (31.10.2026): page-logic audit for all pages, done before the copy rewrite
User instruction: "Go through all pages and their logic. Orient yourself on the prototype files: read what is written on them and in their front ends, because that says what has to be done. Transfer it to the new design (the new design is the correct one). Correct every mistake made so far, think logically, make sure the logic is right, implement it."

- REQ-117 [always] The system shall have an audit file `docs/content/seiten-logik-audit.md`. It maps every prototype file in `prototypen/*.dc.html` to its route(s) in `config/site-map.json`, including any prototype without a route.
- REQ-118 [always] For every prototype, the audit shall list each on-page instruction: visible handoff texts, `TODO(BACKEND)` comments, `data-api-endpoint` attributes, views, states, forms, validations and calculations.
- REQ-119 [always] For every instruction, the audit shall record its status in the new build: implemented, wrong, missing or out of phase. Each entry carries a target phase.
- REQ-120 [always] The system shall fix every audit entry marked "wrong", for example invented values, fake success messages, wrong states, broken links or build text published as copy.
- REQ-121 [always] The system shall implement every "missing" item that belongs to the public pages, Shop, Werkstattsuche or Auth of Phase 1/1b, in the new design.
- REQ-122 [always] The system shall show an honest, short placeholder for every "missing" item assigned to Phases 2–8, plus a note in the audit.
- REQ-123 [always] The system shall keep the new design system as the visual source. Prototype layout is used only for structure, order and behaviour.
- REQ-124 [unwanted] If a page action has no real backend, then the system shall not show a success state for it.

## Addendum (31.10.2026): right-hand chat panel becomes dynamic
User: "Load all the specifications for the chat on the right. It is not dynamic, cannot be made narrower or wider and does not adapt dynamically with the whole page."
Sources: Masterplan §6.1–6.6 (public hero chat right, workspace layout, closed view, responsive & state retention, shell contract), `prototypen/NeXifyAI Cloud v12.dc.html` (Companion-Chat, chat bar under the shared header), `prototypen/NeXify Workspace.dc.html`, `NeXify-AI-Companion.dc.html`.
- REQ-125 [always] The system shall render the right-hand chat as a docked column in the page layout grid, below the shared header, never as an overlay covering core content (interpreted).
- REQ-126 [event] When the user drags the chat's resize handle, the system shall change the chat width live between a minimum of 320 px and a maximum of 50 % of the viewport (interpreted).
- REQ-127 [event] When the resize handle has focus and the user presses Arrow Left/Right, the system shall change the width in 16 px steps (role="separator" with aria-valuenow).
- REQ-128 [event] When the chat width changes, the system shall reflow the page content (hero, sections, shop grid, forms, footer) through container queries without horizontal scroll or overlapping.
- REQ-129 [event] When the user collapses the chat, the system shall give the freed width to the page and show a clear reopen control.
- REQ-130 [always] The system shall keep the chat width and the open/closed state per session after reload (non-sensitive UI preference only).
- REQ-131 [event] When the user double-clicks the resize handle, the system shall reset the chat to its default width.
- REQ-132 [state] While the viewport is too narrow for two usable columns, the system shall switch to a single main view with the chat as a toggleable drawer that respects the keyboard and safe area.
- REQ-133 [always] The system shall limit the chat reading column and keep the composer aligned to it (no full-width chat text), per Masterplan §6.3.
- REQ-134 [always] The system shall apply the same panel behaviour in the internal workspace's right work area (Browser/Artefakt/PDF/Dokument), per Masterplan §6.2/6.4.

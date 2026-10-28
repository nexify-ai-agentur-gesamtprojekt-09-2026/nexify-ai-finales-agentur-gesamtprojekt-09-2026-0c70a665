# Current public legal source adoption · 28 October 2026

Scope: the owner's explicit instruction at 18:46:40 UTC to adopt the legal texts
and operator details of the currently public www.nexifyai.cloud site. This is a
local source/content integration, not a publication or legal certification.

The consumer-local archive SHA256 is
`ec4ab0c8e1a10287b3b06651ab3b20da85d75115ad7abbf9bb0f8c0e9c99d359`.
The ten archived text payloads are preserved byte-for-byte in
`docs/sources/legal-public-2026-10-28/`; their manifest records URL, retrieval
instant, bytes and text/HTML hashes. Text hashes were independently recalculated.
HTML extraction was performed by the upstream source worker; it is not a new
independent HTML fetch or an independent company-register verification.

The adopted operator is NeXify AI by NeXify, owner Pascal Courbois, Netherlands
Eenmanszaak. The source replaces the former B.V. placeholder. Published legal
contact hello@nexifyai.cloud is distinguished from the existing operational
project contact mail@nexifyai.cloud. No identity, VAT number, price, retention
period or new contract entitlement is invented.

## Source to existing-route projection

| Public source document | Existing application route |
| --- | --- |
| impressum | /impressum |
| security | /impressum, security sections |
| recht | /impressum, native links to current legal routes |
| datenschutz | /datenschutz |
| agb, avv, widerruf | /vertragsgrundlagen |
| ki-transparenz | /ki-hinweise |
| barrierefreiheit | /barrierefreiheit |
| cookie-richtlinie | /cookies |

The source legal index contains nine document summaries. These are consolidated
into actual application links rather than copied as nine inert “open” labels.
The other 48 source sections have explicit projections. No new public routes,
media modules, private access or alias are introduced. Source URLs remain
provenance references, not claims that their historical paths exist on this app.
TEILEKLAR retains its separate legal context and pending consumer/shop conditions.
Agency B2B terms are not silently made consumer checkout conditions.

`config/legal-public-documents.json` records every original section and each
technical adaptation/reason. `config/site-map.json` projects those into the
shared Vite/Next renderer. German legal originals stay German with `lang=de`
on the sections and their navigation; DE/NL/FR explanatory UI makes that clear.
There is no automatic legal translation. Multiline originals remain readable.

## Technical adaptations

Historical Sites, Resend magic links, fixed session durations, existing-cookie
claims and live model claims are not copied into the new runtime description.
The replacement describes Vercel delivery, Clerk configuration (Vite route-local; configured Next global provider), the
deterministic own-route orientation, explicit mailto contact and memory-only
project preparation. Opening a draft, email link or quote form is not sending,
booking, an order or a contract. The old AGB numeric day rate is not newly
released; individual approved offers remain authoritative.

Optional PostHog diagnostic capture is off by default, explicit-consent gated,
redacted, exception-only and memory-based. Withdrawal stops pending retries;
reload starts off. No replay, marketing, click collection, identification or
cross-domain consent is added. A recipient still receives transport IP metadata.
Optional server Sentry configuration does not prove live ingestion. No provider
credentials, disclosure/capture settings, enforcement headers or uploads change.
Accessibility goals are separated from bounded local checks and still missing
qualified assistive-technology/provider acceptance. The AVV remains a framework
requiring project-specific annexes, not a completed processing contract.

## Open completion dependencies

Owner/lawyer must verify the adapted legal scope, recipient legal identities,
actual release-specific processing/retention/transfer arrangements, consumer
applicability and company particulars. Specific provider agreements and final
third-party license inventory remain unverified. No legal completeness or
conformity guarantee follows from tests. Actual deployment/alias and provider
readback remain separate release gates. Existing original source, chat commit
and Sentry fix are retained as the rollback chain; no remote history is rewritten.

## Local reproduction

Use pinned Node22/pnpm from the existing checkout, credential-free build env.
Run `node --test apps/site/tests/legal-public-source.test.mjs`, full typecheck,
Vite/Next builds, `browser-legal-footer.mjs` against both optimized renderers,
consent regression and spacing/resize checks. Existing required repository gates
must pass with genuinely refreshed, source-bound evidence. A local request
intercept is not an external provider test. Independent source/diff review and
REA static analysis/readback are recorded separately at the final local hash.

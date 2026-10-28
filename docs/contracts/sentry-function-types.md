# Sentry types in the Vercel function compiler

## Observed release

The externally merged main commit `1ca8eb8f45b1e900eb189b184cbf36abc8ffd1d7`
has the same source tree as reviewed candidate `2475d7a`. Its canonical production
build `dpl_BHGK78EVcYhzCHjJ8rnVU3ZbuqBa` reports TypeScript TS2353 at
`packages/observability/sentry-server.ts:11`: `dsn` is absent from
`BaseNodeOptions`. The diagnostic appears during function packaging, after the
explicit API typecheck and static-site build succeed. Vercel reports READY
despite the diagnostic; READY alone does not prove a clean function compilation.

The log identifies Vercel CLI 65.1.0 and TypeScript 5.9.3. The official npm
metadata for that CLI pins `@vercel/node` 27.0.0. Sentry Node and Core are both
11.9.0. This is a current release finding, not an inference from an older build.

## Cause and bounded repair

The builder's default legacy TypeScript language-service host lacks `realpath`.
In the pnpm symlink layout it reads Sentry Node declarations through
`node_modules/@sentry/node`, but cannot resolve the Core dependency from that
location when Core exists only in the transitive store. `NodeOptions` then loses
inherited Core fields, including `dsn`. Ordinary `tsc` resolves the real paths
and passes. Adding `realpath` to an isolated diagnostic copy of the compiler also
eliminates the error; this is a cause probe, not a deployed vendor patch.

The application declares the already locked Core version as a direct dependency
and consumes its `ErrorEvent` type in the existing `beforeSend` signature. The
lockfile adds only the root importer binding; no package version, integrity or
transitive resolution changes. No broad hoisting, compiler flag, type assertion,
diagnostic suppression, SDK upgrade, data collection, DSN or runtime setting is
changed. The emitted server JavaScript is identical to the main baseline.

## Verification and limits

`node --test apps/site/tests/sentry-function-types.test.mjs` checks the default
no-realpath language-service host against actual application source. Hiding the
direct Core path reproduces the old `dsn` diagnostic. With the explicit binding,
valid source passes while numeric DSNs and unknown options still fail. A separate
test compares emitted JavaScript with the exact main baseline.

The local diagnosis also extracts only the TypeScript compiler section from the
official `@vercel/node@27.0.0` archive after matching npm SHA-512 integrity. It
invokes that default compiler on the actual API and Sentry source without
executing application code. The only unavailable build-utils helpers are
represented by a Node executable-path accessor and an error class. This verifies
the compiler path, not a complete remote Vercel build or production transport.
The archive and diagnosis scripts remain private local evidence outside the
tracked deliverable. No new remote build is triggered by local verification.

Official contracts:
- [Sentry Node initialization options](https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/)
- [Vercel Node compiler source](https://github.com/vercel/vercel/blob/main/packages/node/src/typescript.ts)
- [Pinned builder metadata](https://registry.npmjs.org/@vercel/node/27.0.0)

This repair does not close pending legal content, release-check permissions,
public-domain cutover, provider integration or website acceptance. Any subsequent
release must identify its exact new SHA and verify its own function build logs.

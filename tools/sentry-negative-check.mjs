// Negativtest: ohne SENTRY_DSN darf die Fehlererfassung weder werfen noch senden.
import assert from 'node:assert/strict';
const mod = await import('../packages/observability/sentry-server.ts');
delete process.env.SENTRY_DSN;
assert.equal(typeof mod.captureServerError, 'function');
assert.doesNotThrow(() => mod.captureServerError(new Error('no-dsn-negative-test')));
await mod.flush(100);
console.log('sentry-negative-check: PASS (no DSN -> no-op, kein Wurf)');

import test from 'node:test';
import assert from 'node:assert/strict';
import {issueOracleSession, oracleSessionDigest, ORACLE_COOKIE, ORACLE_SESSION_SECONDS} from '../../lib/oracle-visitor-session.mjs';

test('host-only secure session yields matching database digest without exposing it in cookie', () => {
  const now = 1800000000000, a = issueOracleSession(now), b = issueOracleSession(now);
  assert.match(a.cookie, /^__Host-nexify-oracle=v1\./);
  for (const attribute of ['Path=/', 'Secure', 'HttpOnly', 'SameSite=Lax']) assert.ok(a.cookie.includes(attribute));
  assert.doesNotMatch(a.cookie, /Domain=/i);
  assert.notEqual(a.cookie, b.cookie);
  assert.notDeepEqual(a.digest, b.digest);
  assert.deepEqual(oracleSessionDigest(a.cookie.split(';')[0], now), a.digest);
  assert.equal(a.digest.length, 32);
});
test('missing, duplicated, expired and malformed cookies are rejected', () => {
  const now = 1800000000000, a = issueOracleSession(now), value = a.cookie.split(';')[0];
  for (const candidate of ['', `${value}; ${value}`, `${ORACLE_COOKIE}=garbage`, `${value}x`, 'other=x']) {
    assert.equal(oracleSessionDigest(candidate, now), null);
  }
  assert.equal(oracleSessionDigest(value, now + ORACLE_SESSION_SECONDS * 1000), null);
  assert.equal(oracleSessionDigest('x'.repeat(8193), now), null);
});
test('modifying expiry changes the owner digest rather than extending the session', () => {
  const now = 1800000000000, a = issueOracleSession(now), value = a.cookie.split(';')[0];
  const altered = value.replace(/v1\.(\d{10})\./, (_, exp) => `v1.${Number(exp) - 1}.`);
  assert.notDeepEqual(oracleSessionDigest(altered, now), a.digest);
});

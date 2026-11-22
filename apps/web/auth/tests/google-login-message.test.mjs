import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GOOGLE_LOGIN_FAILED, GOOGLE_LOGIN_MESSAGES, googleLoginMessage } from '../../components/shop/google-login-message.ts';

// Punkt 5 (Belege-Runde 3): Zuordnung Fehlercode -> Meldung nach abgelehnter Google-Anmeldung. Die Fehlerform ist die von
// components/shop/api.ts: `error` kommt aus `detail.error` der FastAPI-Antwort (HTTPException mit dict-detail).
test('409 account_exists_unverified bekommt den Hinweis auf Passwort und „Passwort vergessen?“', () => {
  const text = googleLoginMessage({ status: 409, error: 'account_exists_unverified' });
  assert.equal(text, GOOGLE_LOGIN_MESSAGES.account_exists_unverified);
  assert.match(text, /bereits ein Konto mit Passwort/);
  assert.match(text, /„Passwort vergessen\?“/);
  assert.match(text, /Danach ist die Anmeldung mit Google möglich\.$/);
});

test('403 google_login_not_allowed bekommt den Hinweis auf die Passwortanmeldung', () => {
  assert.equal(googleLoginMessage({ status: 403, error: 'google_login_not_allowed' }), 'Für dieses Konto ist die Anmeldung mit Google nicht freigegeben. Bitte melden Sie sich mit Ihrem Passwort an.');
});

test('Jeder andere Fehler behält den bisherigen Text, auch gegen das heutige Backend', () => {
  assert.equal(GOOGLE_LOGIN_FAILED, 'Die Anmeldung mit Google ist fehlgeschlagen.');
  for (const failure of [
    { status: 401, error: 'google_session_invalid' }, { status: 500, error: 'request_failed' }, { status: 502, error: 'invalid_json_response' },
    { status: 503, error: 'runtime_binding_unavailable' }, { status: 409, error: 'email_taken' }, { status: 403, error: 'toString' },
    { status: 403, error: '__proto__' }, { status: 409 }, { error: 42 }, new TypeError('Failed to fetch'), null, undefined, 'account_exists_unverified',
  ]) assert.equal(googleLoginMessage(failure), GOOGLE_LOGIN_FAILED, JSON.stringify(failure));
  assert.deepEqual(Object.keys(GOOGLE_LOGIN_MESSAGES).sort(), ['account_exists_unverified', 'google_login_not_allowed']);
});

test('AuthForms leitet jeden Fehler der Google-Sitzung über googleLoginMessage in die vorhandene Fehleranzeige', () => {
  const source = readFileSync(new URL('../../components/shop/AuthForms.tsx', import.meta.url), 'utf8');
  assert.match(source, /api\("\/api\/auth\/google\/session", \{ method: "POST", json: \{ session_id: decodeURIComponent\(match\[1\]\) \} \}\)\.then\(\(\) => landing\(\)\)\.catch\(failure => setMessage\(googleLoginMessage\(failure\)\)\);/);
  assert.match(source, /\{message && <p role="alert" className="tk-alert" data-testid="auth-error">\{message\}<\/p>\}/);
  assert.doesNotMatch(source, /Die Anmeldung mit Google ist fehlgeschlagen/);
});

import {createHash, randomBytes} from 'node:crypto';

// A visitor capability, not a user login or tenant identity. The database must
// compare the digest with the conversation owner before returning any data.
export const ORACLE_COOKIE = '__Host-nexify-oracle';
export const ORACLE_SESSION_SECONDS = 60 * 60 * 24;
const TOKEN = /^v1\.([0-9]{10})\.([A-Za-z0-9_-]{43})$/;

export function issueOracleSession(now = Date.now()) {
  const expiry = Math.floor(now / 1000) + ORACLE_SESSION_SECONDS;
  const token = `v1.${expiry}.${randomBytes(32).toString('base64url')}`;
  return {
    cookie: `${ORACLE_COOKIE}=${token}; Path=/; Max-Age=${ORACLE_SESSION_SECONDS}; Secure; HttpOnly; SameSite=Lax`,
    digest: createHash('sha256').update(token, 'ascii').digest(),
  };
}

export function oracleSessionDigest(cookieHeader, now = Date.now()) {
  if (typeof cookieHeader !== 'string' || cookieHeader.length > 8192) return null;
  const values = cookieHeader.split(';').map(part => part.trim()).filter(part => part.startsWith(`${ORACLE_COOKIE}=`));
  if (values.length !== 1) return null;
  const token = values[0].slice(ORACLE_COOKIE.length + 1);
  const match = TOKEN.exec(token);
  if (!match || Buffer.from(match[2], 'base64url').toString('base64url') !== match[2]) return null;
  const expiry = Number(match[1]);
  const current = Math.floor(now / 1000);
  if (expiry <= current || expiry > current + ORACLE_SESSION_SECONDS) return null;
  return createHash('sha256').update(token, 'ascii').digest();
}

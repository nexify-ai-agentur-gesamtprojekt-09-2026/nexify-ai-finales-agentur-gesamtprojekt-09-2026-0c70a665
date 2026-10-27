/** Public UI configuration only; it grants no business authorization. */
export function validPublicClerkKey(key) {
  if (typeof key !== 'string') return false;
  const encoded = /^pk_(?:live|test)_([A-Za-z0-9+/]+={0,2})$/.exec(key)?.[1];
  if (!encoded) return false;
  try {
    const decoded = atob(encoded);
    if (!decoded.endsWith('$')) return false;
    const host = decoded.slice(0,-1), labels = host.split('.');
    return host.length <= 253 && labels.length >= 2 && labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
  } catch { return false; }
}
export function publicAuthConfiguration(env, {hashMode=false}={}) {
  const key = env.VITE_CLERK_PUBLISHABLE_KEY;
  const enabled = env.VITE_CLERK_ENABLED === 'true' && !hashMode && validPublicClerkKey(key);
  return {enabled, publishableKey:enabled ? key : null};
}
export const AUTH_REDIRECT = '/';

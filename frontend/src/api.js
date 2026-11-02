export const API = (import.meta.env.REACT_APP_BACKEND_URL || '') + '/api';

export class ApiError extends Error {
  constructor(status, detail) {
    super((detail && (detail.message || detail.error)) || 'Fehler ' + status);
    this.status = status; this.detail = detail || {};
  }
}

export async function api(path, { method = 'GET', body, headers = {}, form } = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      method, credentials: 'include',
      headers: form ? headers : { 'Content-Type': 'application/json', ...headers },
      body: form || (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (e) {
    throw new ApiError(0, { error: 'network', message: 'Verbindung unterbrochen. Ihre Eingaben bleiben erhalten.' });
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw new ApiError(res.status, data && (data.detail || data));
  return data;
}

export function newKey() {
  const a = new Uint8Array(18); crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

export const euro = c => c == null ? 'offen' : (c / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
export const dt = s => s ? new Date(s).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '–';

/** Server-sent events reader for /api/ai streams. */
export async function stream(path, body, onEvent) {
  const res = await fetch(API + path, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) { let d = null; try { d = await res.json(); } catch { /* */ } throw new ApiError(res.status, d && d.detail); }
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    let i; while ((i = buf.indexOf('\n\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 2); if (line.startsWith('data: ')) onEvent(JSON.parse(line.slice(6))); }
  }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../site/node_modules/vite/dist/node/index.js';

const server = await createServer({ root: fileURLToPath(new URL('../../../..', import.meta.url)), configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { settleTurn, stopAllowed, STOP_GUARD_MS, serializeChat, parseStoredChat, loadChat, saveChat, chatStoreKey, CHAT_STORE_VERSION } = await server.ssrLoadModule('/apps/web/lib/chat-session.ts');
test.after(() => server.close());

const user = (text, id = 'user-1') => ({ id, role: 'user', text, state: 'done' });
const answer = (text, id = 'assistant-1', state = 'done') => ({ id, role: 'assistant', text, state });
const NOW = 1_800_000_000_000;
const input = (overrides = {}) => ({ base: [user('Ich brauche eine Website.')], message: 'Ich brauche eine Website.', answerId: 'assistant-2', draft: '', exchanged: false, ...overrides });

/** Speicher wie im Browser, wahlweise mit Fehlern. */
function memory({ failing = false } = {}) {
  const map = new Map();
  return { map,
    getItem: key => { if (failing) throw new Error('blocked'); return map.has(key) ? map.get(key) : null; },
    setItem: (key, value) => { if (failing) throw new Error('quota'); map.set(key, String(value)); },
    removeItem: key => { if (failing) throw new Error('blocked'); map.delete(key); } };
}

test('A1/A2: a stop within the double-click window does not count, later it does', () => {
  assert.equal(stopAllowed(NOW, NOW), false);
  assert.equal(stopAllowed(NOW, NOW + STOP_GUARD_MS - 1), false);
  assert.equal(stopAllowed(NOW, NOW + STOP_GUARD_MS), true);
  assert.ok(STOP_GUARD_MS >= 300 && STOP_GUARD_MS <= 500);
});

test('A2: stopped before any text returns the message to the empty field, or offers to send again', () => {
  const back = settleTurn(input(), { kind: 'stopped', text: '', conversationId: null }, NOW);
  assert.deepEqual(back.turns, []);
  assert.equal(back.draft, 'Ich brauche eine Website.');
  assert.equal(back.phase, 'idle');
  assert.equal(back.unavailable, false);
  // Steht inzwischen etwas Neues im Feld, bleibt die Nachricht im Verlauf und kann erneut gesendet werden.
  const kept = settleTurn(input({ draft: 'Noch etwas' }), { kind: 'stopped', text: '   ', conversationId: null }, NOW);
  assert.equal(kept.turns.length, 1);
  assert.equal(kept.draft, 'Noch etwas');
  assert.equal(kept.phase, 'halted');
  assert.equal(kept.pending, 'Ich brauche eine Website.');
  // Mit Teiltext bleibt die angehaltene Antwort stehen.
  const partial = settleTurn(input(), { kind: 'stopped', text: 'Erster Satz.', conversationId: 'local-1' }, NOW);
  assert.deepEqual(partial.turns.at(-1), { id: 'assistant-2', role: 'assistant', text: 'Erster Satz.', state: 'stopped' });
  assert.equal(partial.phase, 'idle');
  assert.equal(partial.exchanged, true);
});

test('A3: the fallback needs the explicit server message and no earlier exchange; the conversation is never dropped', () => {
  const first = settleTurn(input(), { kind: 'unavailable' }, NOW);
  assert.equal(first.unavailable, true);
  assert.deepEqual(first.turns, input().base);
  assert.equal(first.pending, 'Ich brauche eine Website.');
  const history = [user('Erste Frage'), answer('Erste Antwort'), user('Zweite Frage', 'user-2')];
  const later = settleTurn(input({ base: history, message: 'Zweite Frage', exchanged: true }), { kind: 'unavailable' }, NOW);
  assert.equal(later.unavailable, false);
  assert.equal(later.phase, 'failed');
  assert.deepEqual(later.turns, history);
  assert.equal(later.pending, 'Zweite Frage');
  // Eine gewöhnliche Störung führt nie in den Rückfall.
  const failed = settleTurn(input(), { kind: 'failed', text: 'Teil', conversationId: null }, NOW);
  assert.equal(failed.unavailable, false);
  assert.equal(failed.phase, 'failed');
  assert.deepEqual(failed.turns, input().base);
});

test('A15/A16: the wait comes from the server; a rejected message is not offered for retry', () => {
  const limited = settleTurn(input(), { kind: 'limited', retryAfterSeconds: 42 }, NOW);
  assert.equal(limited.phase, 'limited');
  assert.equal(limited.retryAt, NOW + 42_000);
  assert.equal(limited.pending, 'Ich brauche eine Website.');
  const rejected = settleTurn(input(), { kind: 'rejected' }, NOW);
  assert.equal(rejected.phase, 'rejected');
  assert.equal(rejected.pending, '');
  assert.equal(rejected.draft, 'Ich brauche eine Website.');
  assert.deepEqual(rejected.turns, []);
});

test('a finished answer completes the turn and carries a briefing', () => {
  const briefing = { data: { vorhaben: 'Website' }, text: 'Projektbriefing' };
  const done = settleTurn(input(), { kind: 'done', text: 'Gern.', briefing, conversationId: 'local-1' }, NOW);
  assert.deepEqual(done.turns.at(-1), { id: 'assistant-2', role: 'assistant', text: 'Gern.', state: 'done', briefing });
  assert.deepEqual([done.phase, done.pending, done.exchanged, done.unavailable, done.retryAt], ['idle', '', true, false, null]);
});

test('A6: conversation, draft and conversation id survive in session storage; a running answer is stored as paused', () => {
  const storage = memory();
  const turns = [user('Erste Frage'), answer('Erste Antwort'), user('Zweite Frage', 'user-2'), answer('Teil der', 'assistant-2', 'streaming')];
  saveChat(storage, 'nexify', { turns, draft: 'Entwurf', conversationId: 'local-abc', exchanged: true, pending: 'Zweite Frage', phase: 'streaming' }, NOW);
  assert.deepEqual([...storage.map.keys()], [`nx-chat-v${CHAT_STORE_VERSION}:nexify`]);
  assert.equal(chatStoreKey('teileklar'), `nx-chat-v${CHAT_STORE_VERSION}:teileklar`);
  const loaded = loadChat(storage, 'nexify', NOW + 1000);
  assert.deepEqual(loaded.turns.map(turn => [turn.role, turn.text, turn.state]), [['user', 'Erste Frage', 'done'], ['assistant', 'Erste Antwort', 'done'], ['user', 'Zweite Frage', 'done'], ['assistant', 'Teil der', 'stopped']]);
  assert.equal(new Set(loaded.turns.map(turn => turn.id)).size, 4);
  assert.deepEqual([loaded.draft, loaded.conversationId, loaded.exchanged, loaded.phase, loaded.pending], ['Entwurf', 'local-abc', true, 'idle', '']);
  // Die andere Marke hat ihr eigenes Gespräch.
  assert.equal(loadChat(storage, 'teileklar', NOW), null);
  // Eine unbeantwortete Nachricht (Neuladen während des Wartens, Störung) kommt als wiederholbar zurück.
  saveChat(storage, 'nexify', { turns: [user('Offene Frage')], draft: '', conversationId: null, exchanged: false, pending: 'Offene Frage', phase: 'sending' }, NOW);
  const open = loadChat(storage, 'nexify', NOW);
  assert.deepEqual([open.phase, open.pending, open.turns.length], ['failed', 'Offene Frage', 1]);
  // Ein leeres Gespräch ohne Entwurf räumt den Eintrag ab; nur ein Entwurf bleibt erhalten.
  saveChat(storage, 'nexify', { turns: [], draft: 'nur Entwurf', conversationId: null, exchanged: false, pending: '', phase: 'idle' }, NOW);
  assert.equal(loadChat(storage, 'nexify', NOW).draft, 'nur Entwurf');
  saveChat(storage, 'nexify', { turns: [], draft: '', conversationId: null, exchanged: false, pending: '', phase: 'idle' }, NOW);
  assert.equal(storage.map.size, 0);
});

test('A6: broken, foreign or outdated stored data is discarded and removed; storage errors never throw', () => {
  const good = serializeChat({ turns: [user('Frage'), answer('Antwort')], draft: '', conversationId: 'local-1', exchanged: true, pending: '', phase: 'idle' }, NOW);
  assert.ok(parseStoredChat(good, NOW));
  const mutate = change => { const value = JSON.parse(good); change(value); return JSON.stringify(value); };
  const broken = [null, '', '{kaputt', '[]', '"text"', 'null',
    mutate(v => { v.v = CHAT_STORE_VERSION + 1; }),
    mutate(v => { delete v.savedAt; }),
    mutate(v => { v.savedAt = NOW + 3_600_000; }),
    mutate(v => { v.turns = 'x'; }),
    mutate(v => { v.turns[0].role = 'system'; }),
    mutate(v => { v.turns[0].text = 5; }),
    mutate(v => { v.turns[1].state = 'streaming'; }),
    mutate(v => { v.turns[1].briefing = { text: 'ohne Daten' }; }),
    mutate(v => { v.turns = Array.from({ length: 41 }, () => v.turns[0]); }),
    mutate(v => { v.draft = 'x'.repeat(1001); }),
    mutate(v => { v.conversationId = 'mit leerzeichen <script>'; }),
    mutate(v => { v.exchanged = 'ja'; }),
    mutate(v => { v.phase = 'streaming'; }),
    mutate(v => { v.phase = 'failed'; v.pending = 'x'; }), // letzte Nachricht ist keine eigene
    'x'.repeat(400_001)];
  for (const raw of broken) assert.equal(parseStoredChat(raw, NOW), null, String(raw).slice(0, 60));
  // Veraltet nach zwölf Stunden.
  assert.equal(parseStoredChat(good, NOW + 12 * 60 * 60 * 1000 + 1), null);
  const storage = memory();
  storage.map.set(chatStoreKey('nexify'), '{kaputt');
  assert.equal(loadChat(storage, 'nexify', NOW), null);
  assert.equal(storage.map.size, 0);
  const failing = memory({ failing: true });
  assert.equal(loadChat(failing, 'nexify', NOW), null);
  assert.doesNotThrow(() => saveChat(failing, 'nexify', { turns: [user('Frage')], draft: '', conversationId: null, exchanged: false, pending: '', phase: 'idle' }, NOW));
  assert.equal(loadChat(null, 'nexify', NOW), null);
  assert.doesNotThrow(() => saveChat(undefined, 'nexify', { turns: [], draft: '', conversationId: null, exchanged: false, pending: '', phase: 'idle' }, NOW));
});

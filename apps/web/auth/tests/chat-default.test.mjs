// Ausgangszustand der Gesprächsleiste (Inhaberauftrag 15.11.2026): ohne gespeicherte Wahl offen in der
// kleinsten vorhandenen Breite; eine gespeicherte Wahl geht vor; das mobile Verhalten bleibt, wie es war.
// Der Browserlauf dazu steht in docs/09-final/chat-standard-offen-2026-11-15.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../site/node_modules/vite/dist/node/index.js';

const root = fileURLToPath(new URL('../../../..', import.meta.url));
const server = await createServer({ root, configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { CHAT_MIN, CHAT_MAX, initialChatFromCookie, chatWidthFromCookie } = await server.ssrLoadModule('/apps/web/lib/chat-panel.ts');
const handle = await server.ssrLoadModule('/apps/web/components/ChatResizeHandle.tsx');
test.after(() => server.close());
const source = path => readFile(new URL('../../' + path, import.meta.url), 'utf8');
const workspace = await source('components/Workspace.tsx');

test('ohne gespeicherte Wahl steht die offene Leiste in der kleinsten vorhandenen Breite', async () => {
  // Die Leiste bekommt die Breite an genau einer Stelle; fehlt eine gespeicherte Breite, gilt CHAT_MIN.
  assert.equal(workspace.split('chatWidthStyle(').length - 1, 1, 'genau eine Stelle setzt die Breite');
  assert.ok(workspace.includes('style={open?chatWidthStyle(chatWidth??CHAT_MIN,mobile):undefined}'));
  assert.deepEqual(handle.chatWidthStyle(null ?? CHAT_MIN, false), { '--layout-panel-width': CHAT_MIN + 'px' });
  // Kein neuer Wert: CHAT_MIN ist die Untergrenze des Ziehgriffs und die Untergrenze der bisherigen Standardbreite.
  assert.equal(handle.CHAT_MIN, CHAT_MIN);
  assert.ok((await source('components/ChatResizeHandle.tsx')).includes('aria-valuemin={CHAT_MIN}'));
  assert.ok((await source('components/AtelierSystem.css')).includes(`#atelier{--layout-panel-width:clamp(${CHAT_MIN}px,`));
});

test('ohne gespeicherte Wahl startet die Leiste ab 1200 px offen, darunter eingeklappt', async () => {
  assert.equal(initialChatFromCookie(undefined), 'auto');
  assert.ok(workspace.includes('const roomy=()=>window.innerWidth>=1200;'));
  assert.ok(workspace.includes('boot==="open"||(boot==="auto"&&roomy())'));
  const css = await source('components/LuxuryMaterials.css');
  assert.match(css, /@media\(max-width:1199\.98px\) \{\s*#atelier\[data-chat-boot="auto"\] \{ grid-template-columns:minmax\(0,1fr\); \}\s*#atelier\[data-chat-boot="auto"\]>#aifly-panel \{ display:none; \}/);
});

test('eine gespeicherte Wahl geht dem Ausgangszustand vor', () => {
  assert.equal(initialChatFromCookie('0'), 'closed');
  assert.equal(initialChatFromCookie('1'), 'open');
  assert.equal(chatWidthFromCookie('520'), 520);
  assert.equal(chatWidthFromCookie(String(CHAT_MAX)), CHAT_MAX);
  assert.equal(chatWidthFromCookie(undefined), null);
  assert.equal(chatWidthFromCookie(String(CHAT_MIN - 1)), null);
  assert.deepEqual(handle.chatWidthStyle(520 ?? CHAT_MIN, false), { '--layout-panel-width': '520px' });
  // Eingeklappt gespeichert: Es wird gar keine Breite gesetzt.
  assert.ok(workspace.includes('style={open?chatWidthStyle('));
});

test('das mobile Verhalten bleibt unverändert', async () => {
  // Als Überlagerung bekommt die Leiste weiterhin keine eigene Breite, auch nicht die kleinste.
  assert.equal(handle.chatWidthStyle(CHAT_MIN, true), undefined);
  assert.equal(handle.chatWidthStyle(520, true), undefined);
  // Mobil startet sie eingeklappt, gleich was gespeichert ist.
  assert.ok(workspace.includes("const MOBILE_CHAT='(max-width: 820px), (max-height: 500px) and (pointer: coarse)';"));
  assert.ok(workspace.includes('setMobile(query.matches);setOpen(!query.matches&&first);setBoot(null);'));
  assert.ok((await source('components/LuxuryMaterials.css')).includes('@media(max-width:820px) { #atelier[data-chat-boot="open"]>#aifly-panel { display:none; } }'));
});

#!/usr/bin/env node
// NeXify/Jeff Hook — liest Hook-stdin (JSON), fragt Orakel, gibt Kontext aus.
// Advisory: immer Exit 0. Kein Blocken von Arbeit, kein Simulieren.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

let input = {};
try { const raw = readFileSync(0, 'utf8'); if (raw.trim()) input = JSON.parse(raw); } catch {}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const event = input.hook_event_name || process.env.NX_JEFF_HOOK_EVENT || 'Hook';
const prompt = String(input.prompt || input.tool_input || input.tool_name || '').slice(0, 300);
const cwd = input.cwd || process.cwd() || '';

function jeff(method, args) {
  try { return execFileSync('nx-jeff', [method, ...args], { encoding: 'utf8', timeout: 25000 }).trim(); }
  catch { return ''; }
}

let out = '';
if (event === 'UserPromptSubmit' && /^\s*starte\b/i.test(prompt)) {
  // "Starte" -> sofort Orchestrierung (Auftragsladen) statt nur Einordnung
  try { out = execFileSync('node', [join(root, 'tools', 'chat-auftrag-adapter.mjs'), prompt], { encoding: 'utf8', cwd: root }).trim().slice(0, 400); }
  catch { out = ''; }
}
else if (event === 'SessionStart' || event === 'UserPromptSubmit') {
  out = jeff('frage', ['--state', JSON.stringify({ ereignis: event, cwd, prompt }),
    '--choice', 'einordnung', 'Wie einordnen?',
    'fortfahren:weiterarbeiten', 'rueckfrage:Betreiber fragen', 'stopp:nicht ausfuehren']);
} else if (event === 'Stop' || event === 'SessionEnd' || event === 'TaskCompleted') {
  out = jeff('frage', ['--state', JSON.stringify({ ereignis: event, cwd, prompt }),
    '--choice', 'review', 'Arbeit freigeben?',
    'go:freigeben', 'rueckfrage:nachpruefen', 'stopp:fehlerhaft']);
}

if (out) process.stdout.write(`[NeXify/Jeff·${event}] ${out}\n`);
else process.stdout.write(`[NeXify/Jeff·${event}] nicht erreichbar — konservativ fortfahren\n`);
process.exit(0);

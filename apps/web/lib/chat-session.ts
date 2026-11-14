/**
 * Zustand des öffentlichen Gesprächs ohne React: was nach jedem Ausgang eines Aufrufs gilt und wie
 * das Gespräch im Sitzungsspeicher des Browsers liegt. Getrennt von der Oberfläche, damit die
 * Übergänge direkt prüfbar sind (apps/web/auth/tests/chat-session.test.mjs).
 */
import type { BriefingDTO } from './chat-contract';
import type { ChatOutcome } from './chat-client';

export type ChatTurn = { id: string; role: 'user' | 'assistant'; text: string; state: 'done' | 'streaming' | 'stopped'; briefing?: BriefingDTO };
/**
 * idle: bereit · sending: wartet auf das erste Zeichen · streaming: Antwort wächst ·
 * failed: Störung, wiederholbar · limited: Mengenbegrenzung mit Wartezeit ·
 * rejected: Nachricht abgelehnt, nicht wiederholbar · halted: angehalten, bevor Text kam.
 */
export type ChatPhase = 'idle' | 'sending' | 'streaming' | 'failed' | 'limited' | 'rejected' | 'halted';

/** In dieser Zeit nach dem Absenden gilt ein Klick auf „Anhalten" als zweiter Klick eines Doppelklicks. */
export const STOP_GUARD_MS = 400;
export const stopAllowed = (sentAt: number, now: number): boolean => now - sentAt >= STOP_GUARD_MS;

export interface SettleInput {
  /** Verlauf einschließlich der gerade gesendeten eigenen Nachricht am Ende. */
  base: ChatTurn[];
  message: string;
  answerId: string;
  /** Was inzwischen im Eingabefeld steht. */
  draft: string;
  /** Gab es in diesem Gespräch schon eine Antwort des Servers? */
  exchanged: boolean;
}
export interface Settled {
  turns: ChatTurn[];
  phase: ChatPhase;
  draft: string;
  /** Nachricht, die „Erneut versuchen" noch einmal sendet. */
  pending: string;
  exchanged: boolean;
  /** Rückfall auf den Kontaktweg: nur bei ausdrücklicher Meldung und vor dem ersten Austausch. */
  unavailable: boolean;
  /** Zeitpunkt (ms), ab dem nach einer Mengenbegrenzung wieder gesendet werden darf. */
  retryAt: number | null;
}

/** Die eigene Nachricht geht zurück ins Feld, wenn dort nichts Neues steht; sonst bleibt sie im Verlauf. */
function returnToField(input: SettleInput): { turns: ChatTurn[]; draft: string; returned: boolean } {
  const last = input.base.at(-1);
  if (input.draft.trim() || !last || last.role !== 'user' || last.text !== input.message) return { turns: input.base, draft: input.draft, returned: false };
  return { turns: input.base.slice(0, -1), draft: input.message, returned: true };
}

export function settleTurn(input: SettleInput, outcome: ChatOutcome, now: number): Settled {
  const keep = { turns: input.base, draft: input.draft, pending: input.message, exchanged: input.exchanged, unavailable: false, retryAt: null };
  switch (outcome.kind) {
    case 'done':
      return { ...keep, turns: [...input.base, { id: input.answerId, role: 'assistant', text: outcome.text, state: 'done', ...(outcome.briefing ? { briefing: outcome.briefing } : {}) }], phase: 'idle', pending: '', exchanged: true };
    case 'stopped': {
      if (outcome.text.trim()) return { ...keep, turns: [...input.base, { id: input.answerId, role: 'assistant', text: outcome.text, state: 'stopped' }], phase: 'idle', pending: '', exchanged: true };
      // Angehalten, bevor Text kam: nichts geht verloren.
      const back = returnToField(input);
      return back.returned ? { ...keep, turns: back.turns, draft: back.draft, phase: 'idle', pending: '' } : { ...keep, phase: 'halted' };
    }
    case 'unavailable':
      // Nach einem gelungenen Austausch ist der Chat nachweislich angebunden: dann ist es eine Störung.
      return input.exchanged ? { ...keep, phase: 'failed' } : { ...keep, phase: 'failed', unavailable: true };
    case 'limited':
      return { ...keep, phase: 'limited', retryAt: now + outcome.retryAfterSeconds * 1000 };
    case 'rejected': {
      const back = returnToField(input);
      return { ...keep, turns: back.turns, draft: back.draft, phase: 'rejected', pending: '' };
    }
    case 'failed':
      return { ...keep, phase: 'failed' };
  }
}

// ---- Sitzungsspeicher ------------------------------------------------------------------------

export const CHAT_STORE_VERSION = 1;
export type ChatSite = 'nexify' | 'teileklar';
export const chatStoreKey = (site: ChatSite): string => `nx-chat-v${CHAT_STORE_VERSION}:${site}`;
const MAX_TURNS = 40;
const MAX_TEXT = 12_000;
const MAX_DRAFT = 1000;
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const MAX_RAW = 400_000;

export interface StoredChat {
  turns: ChatTurn[];
  draft: string;
  conversationId: string | null;
  exchanged: boolean;
  pending: string;
  phase: 'idle' | 'failed';
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function storedBriefing(value: unknown): BriefingDTO | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as { data?: unknown; text?: unknown };
  if (!candidate.data || typeof candidate.data !== 'object' || Array.isArray(candidate.data) || typeof candidate.text !== 'string' || !candidate.text.trim() || candidate.text.length > MAX_TEXT) return undefined;
  return candidate as BriefingDTO;
}

/** Fassung für den Speicher. Eine laufende Antwort wird als angehaltener Teiltext abgelegt. */
export function serializeChat(state: { turns: ChatTurn[]; draft: string; conversationId: string | null; exchanged: boolean; pending: string; phase: ChatPhase }, now: number): string {
  const turns = state.turns
    .filter((turn) => turn.text.trim() || turn.briefing)
    .slice(-MAX_TURNS)
    .map((turn) => ({ role: turn.role, text: turn.text.slice(0, MAX_TEXT), state: turn.state === 'done' ? 'done' : 'stopped', ...(turn.briefing ? { briefing: turn.briefing } : {}) }));
  const unanswered = turns.at(-1)?.role === 'user';
  // Eine offene Anfrage kann nach dem Neuladen nicht weiterlaufen: sie wird als wiederholbar abgelegt.
  const interrupted = state.phase === 'sending' || state.phase === 'streaming';
  const phase = unanswered && (interrupted || state.phase === 'failed' || state.phase === 'limited' || state.phase === 'halted') ? 'failed' : 'idle';
  return JSON.stringify({
    v: CHAT_STORE_VERSION,
    savedAt: now,
    turns,
    draft: state.draft.slice(0, MAX_DRAFT),
    conversationId: state.conversationId,
    exchanged: state.exchanged,
    pending: phase === 'failed' ? turns.at(-1)!.text.slice(0, MAX_DRAFT) : '',
    phase,
  });
}

/** Liest eine abgelegte Fassung. Alles, was nicht genau dem Format entspricht, gilt als kaputt (null). */
export function parseStoredChat(raw: string | null, now: number): StoredChat | null {
  if (typeof raw !== 'string' || !raw || raw.length > MAX_RAW) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (data.v !== CHAT_STORE_VERSION || typeof data.savedAt !== 'number' || data.savedAt > now + 60_000 || now - data.savedAt > MAX_AGE_MS) return null;
  if (!Array.isArray(data.turns) || data.turns.length > MAX_TURNS || typeof data.draft !== 'string' || data.draft.length > MAX_DRAFT) return null;
  if (typeof data.exchanged !== 'boolean' || typeof data.pending !== 'string' || data.pending.length > MAX_DRAFT) return null;
  if (data.phase !== 'idle' && data.phase !== 'failed') return null;
  if (data.conversationId !== null && (typeof data.conversationId !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(data.conversationId))) return null;
  const turns: ChatTurn[] = [];
  for (const [index, entry] of data.turns.entries()) {
    if (!entry || typeof entry !== 'object') return null;
    const turn = entry as Record<string, unknown>;
    if ((turn.role !== 'user' && turn.role !== 'assistant') || typeof turn.text !== 'string' || turn.text.length > MAX_TEXT) return null;
    if (turn.state !== 'done' && turn.state !== 'stopped') return null;
    const briefing = turn.briefing === undefined ? undefined : storedBriefing(turn.briefing);
    if (turn.briefing !== undefined && !briefing) return null;
    if (!turn.text.trim() && !briefing) return null;
    turns.push({ id: `stored-${index}`, role: turn.role, text: turn.text, state: turn.state, ...(briefing ? { briefing } : {}) });
  }
  const last = turns.at(-1);
  if (data.phase === 'failed' && (last?.role !== 'user' || !data.pending.trim())) return null;
  return { turns, draft: data.draft, conversationId: data.conversationId as string | null, exchanged: data.exchanged, pending: data.pending, phase: data.phase };
}

/** Lesen aus dem Speicher; kaputte oder veraltete Einträge werden entfernt. Wirft nie. */
export function loadChat(storage: StorageLike | null | undefined, site: ChatSite, now: number): StoredChat | null {
  try {
    if (!storage) return null;
    const raw = storage.getItem(chatStoreKey(site));
    if (raw === null) return null;
    const parsed = parseStoredChat(raw, now);
    if (!parsed) storage.removeItem(chatStoreKey(site));
    return parsed;
  } catch {
    return null;
  }
}

/** Ablegen; ein leeres Gespräch ohne Entwurf räumt den Eintrag ab. Wirft nie (voller oder gesperrter Speicher). */
export function saveChat(storage: StorageLike | null | undefined, site: ChatSite, state: Parameters<typeof serializeChat>[0], now: number): void {
  try {
    if (!storage) return;
    if (state.turns.length === 0 && !state.draft) storage.removeItem(chatStoreKey(site));
    else storage.setItem(chatStoreKey(site), serializeChat(state, now));
  } catch {
    /* Das Gespräch läuft ohne Ablage weiter. */
  }
}

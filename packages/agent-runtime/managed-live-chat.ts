/** Managed live-chat assembly (OFF by default, fail-closed).
 *
 * This module only *prepares* the real managed live-AI path for /api/agent-chat by reusing the
 * existing, policy-pinned router adapter in ./model-agent.ts. It is deliberately inert:
 *
 *  - Importing or constructing anything here performs no model request and reads no secret.
 *  - The gate is closed unless an explicit server flag AND the managed 9router server
 *    configuration are present. Preview/CI never set these, so the deterministic public
 *    orientation remains the live behaviour.
 *  - OPENAI_API_KEY / EMERGENT_LLM_KEY are never considered: they are not a managed fallback.
 *  - DeepSeek must be reached through the NeXify managed 9router, never a direct provider bypass.
 *
 * Activation additionally requires a separately authorised router binding + funding release
 * (see assembleManagedLiveChat): the approved adapter is still pinned to the OpenRouter
 * inference endpoint, so routing through the 9router stays fail-closed until that explicit
 * release. No secret value, endpoint or key is ever logged or returned from here.
 */
import { createPinnedOpenRouterModel, createPublicPageAgent, EXACT_MODEL_ID } from './model-agent.ts';

/**
 * Offline preparation for the managed 9router chat-completions wire contract.
 * This function neither receives credentials nor accepts an endpoint or fetch.
 * `system` must be constructed by trusted server code; `turns` are untrusted
 * text and do not confer authority. No request can be sent by this function.
 * The public route and the separately authorised budget/tenant/network gate
 * remain closed until a real integration validates this contract end-to-end.
 */
export function prepareNineRouterChatPayload(input: {
  system: string;
  turns: readonly { role: 'user' | 'assistant'; content: string }[];
}) {
  if (EXACT_MODEL_ID !== 'deepseek/deepseek-v4.1-flash-1017') throw new Error('unsupported_model_policy');
  if (!input || typeof input.system !== 'string' || !input.system.trim() || input.system.length > 8000
      || !Array.isArray(input.turns) || input.turns.length < 1 || input.turns.length > 20) {
    throw new Error('invalid_ninerouter_input');
  }
  // Array.from visits holes as undefined; Array.prototype.map would silently
  // preserve sparse entries and JSON serialization would turn them into null.
  const turns = Array.from(input.turns, turn => {
    if (!turn || !['user', 'assistant'].includes(turn.role) || typeof turn.content !== 'string'
        || !turn.content.trim() || turn.content.length > 4000) throw new Error('invalid_ninerouter_turn');
    return { role: turn.role, content: turn.content };
  });
  if (turns.at(-1)?.role !== 'user') throw new Error('ninerouter_user_turn_required');
  return {
    model: EXACT_MODEL_ID,
    messages: [{ role: 'system' as const, content: input.system }, ...turns],
    reasoning: { effort: 'high' as const },
    max_tokens: 1024,
    stream: true,
  };
}

/** Server-only activation flag. Must be exactly 'enabled' to even consider the live path. */
export const LIVE_CHAT_FLAG = 'NEXIFY_LIVE_CHAT';
/** Managed 9router base URL (OpenAI-compatible). Pascal priority over any direct provider. */
export const ROUTER_URL_VAR = 'NINEROUTER_URL';
/** Managed 9router server key (server-only secret store; never NEXT_PUBLIC_, never logged). */
export const ROUTER_KEY_VAR = 'ROUTER_KEY';
/** The approved adapter is pinned to this inference endpoint; the managed 9router binding is a
 * separately authorised change. Until then the live path stays closed even if a URL is present. */
export const PINNED_PROVIDER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

type Env = Record<string, string | undefined>;

export type LiveChatGate =
  | { enabled: false; reason: string; missing: string[] }
  | { enabled: true; routerUrl: string; routerKey: string };

/** Pure, secret-safe gate. Returns which activation requirements are missing by NAME only;
 * it never echoes a value. Closed whenever the flag or any managed router variable is absent. */
export function managedLiveChatGate(env: Env): LiveChatGate {
  const missing: string[] = [];
  if (env[LIVE_CHAT_FLAG] !== 'enabled') missing.push(LIVE_CHAT_FLAG + '=enabled');
  const routerUrl = (env[ROUTER_URL_VAR] ?? '').trim();
  const routerKey = (env[ROUTER_KEY_VAR] ?? '').trim();
  if (!routerUrl) missing.push(ROUTER_URL_VAR);
  if (!routerKey) missing.push(ROUTER_KEY_VAR);
  if (missing.length > 0) return { enabled: false, reason: 'managed_live_chat_fail_closed', missing };
  return { enabled: true, routerUrl, routerKey };
}

/** Assemble the managed public-page agent by reusing the pinned adapter. Explicit server
 * arguments only; no environment lookup here. Fails closed if the managed route is not the
 * authorised pinned endpoint, so the 9router binding cannot silently become a live provider
 * bypass before it is explicitly released and funded. */
export function assembleManagedLiveChat(config: { routerUrl: string; routerKey: string; fetch: typeof fetch }) {
  if (config.routerUrl !== PINNED_PROVIDER_ENDPOINT) {
    throw new Error('managed_live_chat_router_binding_pending');
  }
  const model = createPinnedOpenRouterModel({ apiKey: config.routerKey, fetch: config.fetch });
  return createPublicPageAgent({ model });
}

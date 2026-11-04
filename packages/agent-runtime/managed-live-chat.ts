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
import { createPinnedOpenRouterModel, createPublicPageAgent } from './model-agent.ts';

/** Server-only activation flag. Must be exactly 'enabled' to even consider the live path. */
export const LIVE_CHAT_FLAG = 'NEXIFY_LIVE_CHAT';
/** Managed 9router base URL (OpenAI-compatible). Pascal priority over any direct provider. */
export const ROUTER_URL_VAR = 'NINEROUTER_URL';
/** Managed 9router server key (server-only secret store; never NEXT_PUBLIC_, never logged). */
export const ROUTER_KEY_VAR = 'ROUTER_KEY';
/** Owner-set spend boundary: maximum live model requests per UTC day and per function instance.
 * Without a positive integer the live path stays closed (no budget, no paid calls). */
export const DAILY_CAP_VAR = 'NEXIFY_LIVE_CHAT_DAILY_CAP';
/** The approved adapter is pinned to this inference endpoint; the managed 9router binding is a
 * separately authorised change. Until then the live path stays closed even if a URL is present. */
export const PINNED_PROVIDER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

type Env = Record<string, string | undefined>;

export type LiveChatGate =
  | { enabled: false; reason: string; missing: string[] }
  | { enabled: true; routerUrl: string; routerKey: string; dailyCap: number };

/** Pure, secret-safe gate. Returns which activation requirements are missing by NAME only;
 * it never echoes a value. Closed whenever the flag or any managed router variable is absent. */
export function managedLiveChatGate(env: Env): LiveChatGate {
  const missing: string[] = [];
  if (env[LIVE_CHAT_FLAG] !== 'enabled') missing.push(LIVE_CHAT_FLAG + '=enabled');
  const routerUrl = (env[ROUTER_URL_VAR] ?? '').trim();
  const routerKey = (env[ROUTER_KEY_VAR] ?? '').trim();
  if (!routerUrl) missing.push(ROUTER_URL_VAR);
  if (!routerKey) missing.push(ROUTER_KEY_VAR);
  const capText = (env[DAILY_CAP_VAR] ?? '').trim();
  const dailyCap = /^[1-9]\d{0,5}$/.test(capText) ? Number(capText) : 0;
  if (!dailyCap) missing.push(DAILY_CAP_VAR);
  if (missing.length > 0) return { enabled: false, reason: 'managed_live_chat_fail_closed', missing };
  return { enabled: true, routerUrl, routerKey, dailyCap };
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

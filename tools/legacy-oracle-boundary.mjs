/** Unverified nx-jeff is not a governed runtime. Never launch it or inspect keys.
 * Existing local backup/metadata work remains the caller's separate responsibility.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export const MANAGED_MODEL = 'deepseek/deepseek-v4.1-flash-1017';
const policyFile = fileURLToPath(new URL('../config/llm-policy.json', import.meta.url));

export function currentManagedPolicy() {
  let policy;
  try { policy = JSON.parse(readFileSync(policyFile, 'utf8')); }
  catch { throw new Error('managed_policy_unavailable'); }
  if (policy?.model?.id !== MANAGED_MODEL || policy.model.reasoning_effort !== 'high'
      || policy.status !== 'mandatory_for_repository_controlled_managed_llm_calls'
      || policy.routing?.silent_model_fallback !== false
      || policy.routing?.silent_reasoning_downgrade !== false) {
    throw new Error('managed_policy_mismatch');
  }
  return {model: MANAGED_MODEL, reasoning_effort: 'high'};
}

export function blockedLegacyOracleRuntime() {
  currentManagedPolicy();
  // No executable, endpoint, credential, approval or funding contract for this
  // external binary has been verified. No environment flag bypass is provided.
  throw new Error('legacy_oracle_runtime_unverified_not_launched');
}

export function blockedLegacyBrainRuntime() {
  currentManagedPolicy();
  // Remote /query or document ingestion can trigger inference/embeddings. Its
  // source/tenant/model/funding contract must be proven before even reading keys.
  throw new Error('legacy_brain_runtime_scope_and_funding_unverified_not_launched');
}

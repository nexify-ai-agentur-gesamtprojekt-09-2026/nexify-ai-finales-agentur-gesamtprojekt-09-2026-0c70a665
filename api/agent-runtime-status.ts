/** Read-only, project/branch-gated preview metadata. No inference or entitlement grant. */
import { createPreviewAccessHandler } from '../packages/agent-runtime/preview-access.ts';

export default { fetch: createPreviewAccessHandler() };

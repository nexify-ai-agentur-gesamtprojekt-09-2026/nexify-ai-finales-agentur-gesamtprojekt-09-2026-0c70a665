/** Export for the explicitly selected NeXify Gesamtprojekt only.
 * The guard checks identity, not source provenance or deployment readiness.
 */
import {readFile} from 'node:fs/promises';

const TARGET_PROJECT = 'appgprj_6af2144e2af881918282f28c4b57411a';
const manifestPath = new URL('../.openai/hosting.json', import.meta.url);
let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch {
  throw new Error('Target export refused: hosting manifest is missing or invalid');
}
if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) ||
    manifest.project_id !== TARGET_PROJECT || manifest.static?.directory !== 'dist') {
  throw new Error('Target export refused: expected Gesamtprojekt project_id and static directory dist');
}
// Import only after the check: sites-output performs the actual file writes.
await import('./sites-output.mjs');

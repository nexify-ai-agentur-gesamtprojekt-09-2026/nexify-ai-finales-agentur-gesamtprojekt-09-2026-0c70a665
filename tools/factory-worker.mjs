#!/usr/bin/env node
// Retired legacy CLI. Deliberately no imports, credential lookup, network or writes.
// The former implementation remains in Git history; no flag can reactivate it.
console.error('LEGACY_AUTOMATION_RETIRED: factory-worker.mjs is disabled. Use the separately reviewed CI/autonomy pipeline; see docs/automation/legacy-runners.md.');
process.exit(2);

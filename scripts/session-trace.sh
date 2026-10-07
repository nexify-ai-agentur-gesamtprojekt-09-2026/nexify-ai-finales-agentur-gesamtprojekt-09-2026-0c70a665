#!/usr/bin/env bash
# session-trace.sh — sammelt Laufzeitsignale einer Sitzung als JSONL nach .harness/traces/.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .harness/traces
ev="${1:-session-start}"
node -e "const fs=require('node:fs');const os=require('node:os');const line=JSON.stringify({ts:new Date().toISOString(),event:process.argv[1],host:os.hostname(),node:process.version,head:process.env.GIT_HEAD||''});fs.appendFileSync('.harness/traces/traces.jsonl',line+'\n');console.log('session-trace: '+line)" "$ev"

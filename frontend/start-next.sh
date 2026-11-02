#!/usr/bin/env bash
# Thin supervisor wrapper: serve the ORIGINAL NeXify Next.js app (apps/web) on port 3000
# in PRODUCTION mode (no HMR websocket -> works behind the preview proxy; hydration intact).
# Build is produced out-of-band; here we only (re)generate public data and start.
set -euo pipefail
WEB_DIR="/root/repo_src/apps/web"
cd "$WEB_DIR"
export npm_config_engine_strict=false
export NODE_ENV=production
node scripts/generate-public-data.mjs || true
if [ ! -d "$WEB_DIR/.next" ]; then
  ./node_modules/.bin/next build
fi
exec ./node_modules/.bin/next start --hostname 0.0.0.0 --port 3000

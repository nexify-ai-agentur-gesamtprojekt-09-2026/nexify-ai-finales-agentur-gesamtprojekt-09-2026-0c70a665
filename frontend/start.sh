#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../apps/web"
set -a; [ -f ../../frontend/.env ] && . ../../frontend/.env; set +a
node scripts/generate-public-data.mjs
if [ "${WEB_MODE:-production}" = "dev" ]; then
  exec ./node_modules/.bin/next dev --hostname 0.0.0.0 --port 3000
fi
./node_modules/.bin/next build
exec ./node_modules/.bin/next start --hostname 0.0.0.0 --port 3000

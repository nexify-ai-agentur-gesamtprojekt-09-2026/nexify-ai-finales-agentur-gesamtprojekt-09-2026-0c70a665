#!/usr/bin/env bash
# E2E-Cockpit (Layer 3): echter Browserlauf im Scanner-Container gegen die Live-URL.
set -euo pipefail
cd "$(dirname "$0")/.."
CONTAINER="${E2E_CONTAINER:-deploy-scanner-1}"
COCKPIT_URL="${COCKPIT_URL:-https://179.198.195.91.sslip.io/myadmin/cockpit}"
docker cp tools/e2e-cockpit.mjs "$CONTAINER:/tmp/e2e-cockpit.mjs" >/dev/null
docker exec -e COCKPIT_URL="$COCKPIT_URL" "$CONTAINER" sh -lc 'node /tmp/e2e-cockpit.mjs'

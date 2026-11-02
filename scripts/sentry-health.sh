#!/usr/bin/env bash
# Manual, bounded issue sample; never a total or proof of browser error capture.
set -euo pipefail
exec python3 "$(dirname -- "${BASH_SOURCE[0]}")/sentry_health.py"

#!/usr/bin/env bash
# GitHub canonical main -> explicitly configured GitLab downstream. Dry-run default.
set -euo pipefail
exec /usr/bin/python3 "$(dirname -- "$(readlink -f -- "${BASH_SOURCE[0]}")")/automation/mirror.py" "$@"

#!/usr/bin/env bash
# Only the isolated local foundation database is permitted; no production target.
set -euo pipefail
container="${1:-onboarding-postgres}"
database="${2:-nx_foundation}"
if [[ "$container" != onboarding-postgres || "$database" != nx_foundation ]]; then
  echo 'Refusing target: tests are restricted to onboarding-postgres / nx_foundation.' >&2
  exit 2
fi
here="$(cd "$(dirname "$0")" && pwd)"
bash "$here/run_checks.sh" docker --host=unix:///var/run/docker.sock exec -i "$container" psql -U postgres -d "$database"

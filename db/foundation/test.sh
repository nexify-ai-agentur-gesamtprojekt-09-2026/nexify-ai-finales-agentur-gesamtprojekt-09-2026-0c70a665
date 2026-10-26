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
psql_command=(docker --host=unix:///var/run/docker.sock exec -i "$container" psql -X -U postgres -d "$database" -v ON_ERROR_STOP=1)
"${psql_command[@]}" < "$here/001_foundation.sql"
"${psql_command[@]}" < "$here/001_foundation.sql"
"${psql_command[@]}" < "$here/verify.sql"

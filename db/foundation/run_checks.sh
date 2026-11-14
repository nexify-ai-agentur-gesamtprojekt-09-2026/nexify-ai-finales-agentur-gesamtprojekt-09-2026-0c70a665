#!/usr/bin/env bash
# Shared sequence for test.sh (CI container) and test_local.sh (throwaway cluster).
# Usage: run_checks.sh <psql command and arguments...>   -- the caller has already restricted the target.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
apply() { local file="$here/$1"; shift; "$@" -X -v ON_ERROR_STOP=1 -q < "$file"; }
sql() { local text="$1"; shift; printf '%s\n' "$text" | "$@" -X -v ON_ERROR_STOP=1 -q; }
guard_row="f0000000-0000-0000-0000-00000000000f"

apply 001_foundation.sql "$@"
apply 001_foundation.sql "$@"
apply verify.sql "$@"
# Suite tenancy: forward twice (repeatable) and prove isolation.
apply 002_suite_tenancy.sql "$@"
apply 002_suite_tenancy.sql "$@"
apply verify_002.sql "$@"
# The way back must refuse while data exists (nothing is dropped silently) ...
sql "INSERT INTO nx_suite.organisation(id, name) VALUES ('$guard_row', 'way-back guard fixture');" "$@"
if apply 002_suite_tenancy.down.sql "$@" 2>/dev/null; then
  echo 'FAIL: way back dropped a schema that still held data' >&2
  exit 1
fi
echo 'PASS: way back refuses while suite tables hold data'
sql "DELETE FROM nx_suite.organisation WHERE id = '$guard_row';" "$@"
# ... and work on an empty schema; afterwards forward again.
apply 002_suite_tenancy.down.sql "$@"
apply verify_002_down.sql "$@"
apply 002_suite_tenancy.sql "$@"
# The foundation stays repeatable and intact with the suite schema present.
apply 001_foundation.sql "$@"
apply verify.sql "$@"
apply verify_002.sql "$@"
echo "db/foundation: all migration and isolation checks passed"

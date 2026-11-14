#!/usr/bin/env bash
# Runs the same checks as test.sh without Docker, against a throwaway PostgreSQL cluster that this script
# creates in a fresh temporary directory and removes afterwards. It never connects to an existing server:
# the cluster listens on a private unix socket only (no TCP), so no production target is reachable.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
bindir="${PG_BINDIR:-$(dirname "$(command -v initdb 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/initdb 2>/dev/null | sort -V | tail -1)")}"
[[ -x "$bindir/initdb" ]] || { echo 'No local PostgreSQL binaries (initdb) found; use test.sh in CI.' >&2; exit 3; }
work="$(mktemp -d)"
as_pg=()
if [[ "$(id -u)" == 0 ]]; then  # the server refuses to run as root
  id postgres >/dev/null 2>&1 || { echo 'Running as root needs an unprivileged "postgres" OS user.' >&2; exit 3; }
  chown postgres "$work"
  as_pg=(runuser -u postgres --)
fi
cleanup() {
  "${as_pg[@]}" "$bindir/pg_ctl" -D "$work/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT
"${as_pg[@]}" "$bindir/initdb" -D "$work/data" -U postgres -A trust --locale=C -E UTF8 >/dev/null
"${as_pg[@]}" "$bindir/pg_ctl" -D "$work/data" -w -o "-c listen_addresses='' -k $work" -l "$work/log" start >/dev/null
"${as_pg[@]}" "$bindir/psql" -X -h "$work" -U postgres -d postgres -q -c 'CREATE DATABASE nx_foundation'
bash "$here/run_checks.sh" "${as_pg[@]}" "$bindir/psql" -h "$work" -U postgres -d nx_foundation

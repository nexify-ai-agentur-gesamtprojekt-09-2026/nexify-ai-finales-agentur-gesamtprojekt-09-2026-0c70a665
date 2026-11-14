#!/usr/bin/env bash
# Only a disposable local database called nx_shop_fixture is permitted; no Supabase
# or production target, no credentials.
#   bash db/shop/test.sh onboarding-postgres     CI: inside the isolated service container
#   PGHOST=/socket/dir bash db/shop/test.sh      local cluster via unix socket or loopback
set -euo pipefail
database=nx_shop_fixture
if [[ $# -ge 1 ]]; then
  if [[ "$1" != onboarding-postgres || $# -ne 1 ]]; then
    echo 'Refusing target: container tests are restricted to onboarding-postgres.' >&2
    exit 2
  fi
  target=(docker --host=unix:///var/run/docker.sock exec -i "$1" psql -U postgres)
else
  host="${PGHOST:-}"
  if [[ "$host" != /* && "$host" != localhost && "$host" != 127.0.0.1 && "$host" != ::1 ]]; then
    echo 'Refusing target: PGHOST must be a local socket directory or loopback.' >&2
    exit 2
  fi
  if [[ -n "${PGPASSWORD:-}" || -n "${PGSERVICE:-}" || -n "${PGPASSFILE:-}" || -n "${DATABASE_URL:-}" ]]; then
    echo 'Refusing target: this test uses no credentials or service definitions.' >&2
    exit 2
  fi
  target=(psql)
fi
here="$(cd "$(dirname "$0")" && pwd)"
psql_command=("${target[@]}" -X -q -v ON_ERROR_STOP=1)
"${psql_command[@]}" -d postgres <<SQL
SELECT 'CREATE DATABASE $database' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$database')\gexec
SQL
for file in ../foundation/001_foundation.sql 001_shop.sql 001_shop.sql ../foundation/001_foundation.sql verify.sql; do
  "${psql_command[@]}" -d "$database" < "$here/$file"
done

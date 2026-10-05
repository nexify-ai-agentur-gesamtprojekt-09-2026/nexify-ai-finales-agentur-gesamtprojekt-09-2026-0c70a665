#!/usr/bin/env bash
# P0-Nachweis: Mandantentrennung (Prueffall A/B).
# Laeuft gegen die Datenbank aus /etc/myadmin/pg.env. Kein Passwort im Repo.
set -Eeuo pipefail

# Zwei Betriebsarten: direktes psql (CI/Service-Container) oder docker exec
# in den lokalen Container. Passwoerter kommen nie aus dem Repo.
if [[ -n ${PGHOST:-} ]]; then
  SQL_USER=${PGUSER:-postgres}
  SQL_DB=${PGDATABASE:-myadmin}
  SQL() { psql -v ON_ERROR_STOP=1 "$@"; }
else
  ENV_FILE=${MYADMIN_PG_ENV:-/etc/myadmin/pg.env}
  [[ -r $ENV_FILE ]] || { echo "FAIL: $ENV_FILE fehlt"; exit 1; }
  # shellcheck disable=SC1090
  set -a; . "$ENV_FILE"; set +a
  SQL_USER=$MYADMIN_PG_SUPERUSER
  SQL_DB=$MYADMIN_PG_DB
  SQL() { docker exec -i -e PGPASSWORD="$MYADMIN_PG_PASSWORD" myadmin-pg \
    psql -U "$SQL_USER" -d "$SQL_DB" -v ON_ERROR_STOP=1 "$@"; }
fi

SQL -q -f - < infra/db/001_cockpit.sql

# Seed: je Mandant eine Zeile.
SQL -q -c "
  delete from myadmin.kennzahl where quelle = 'rls-test';
  insert into myadmin.kennzahl (tenant_id, name, wert, quelle) values
    ('tenant-a', 'test.a', 1, 'rls-test'),
    ('tenant-b', 'test.b', 2, 'rls-test');"

check() { # $1 tenant, $2 erwartete Anzahl
  local got
  got=$(SQL -tA -c "
    set role myadmin_app;
    select set_config('myadmin.tenant', '$1', false);
    select count(*) from myadmin.kennzahl;")
  got=$(printf '%s\n' "$got" | tail -1)
  if [[ $got != "$2" ]]; then
    echo "FAIL: Mandant $1 sieht $got Zeilen, erwartet $2"; exit 1
  fi
  echo "  ok   Mandant $1 sieht genau $2 Zeile(n)"
}

echo "[rls] Prueffall A/B"
check tenant-a 1
check tenant-b 1

# Ohne gesetzten Mandanten darf nichts sichtbar sein.
none=$(SQL -tA -c "set role myadmin_app; reset myadmin.tenant; select count(*) from myadmin.kennzahl;" | tail -1)
[[ $none == 0 ]] || { echo "FAIL: ohne Mandant sichtbar: $none"; exit 1; }
echo "  ok   ohne Mandantenkontext 0 Zeilen"

SQL -q -c "delete from myadmin.kennzahl where quelle = 'rls-test';"
echo "rls-test: OK"

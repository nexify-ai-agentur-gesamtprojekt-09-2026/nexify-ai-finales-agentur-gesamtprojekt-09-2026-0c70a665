#!/usr/bin/env bash
# Prüft den ENTWURF 0004 in einem Wegwerf-PostgreSQL-Cluster auf diesem Rechner.
# Legt einen eigenen Cluster in einem temporären Ordner an (nur Unix-Socket,
# kein Netz), führt die Prüfdateien aus und entfernt den Cluster wieder.
# Berührt keine bestehende Datenbank und nimmt keine Verbindungsdaten entgegen.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
bindir="${PG_BINDIR:-$(pg_config --bindir 2>/dev/null || true)}"
if [[ -z "$bindir" || ! -x "$bindir/initdb" ]]; then
  echo 'PostgreSQL-Serverprogramme (initdb) nicht gefunden: Prüfung NICHT ausgeführt.' >&2
  exit 3
fi
major="$("$bindir/postgres" --version | sed -E 's/[^0-9]*([0-9]+).*/\1/')"
if (( major < 15 )); then
  echo "PostgreSQL $major ist zu alt (mindestens 15): Prüfung NICHT ausgeführt." >&2
  exit 3
fi
if [[ "$(id -u)" == 0 ]]; then
  # PostgreSQL startet nicht als root: mit einer lesbaren Kopie der Dateien als
  # Systemnutzer postgres neu starten.
  work="$(mktemp -d)"
  trap 'rm -rf "$work"' EXIT
  cp -r "$here/.." "$work/supabase"
  chmod -R a+rX "$work"
  runuser -u postgres -- env PG_BINDIR="$bindir" bash "$work/supabase/tests/$(basename "$0")"
  exit $?
fi
data="$(mktemp -d)"
db=nexify_chat_entwurf_0004_fixture
stop() { "$bindir/pg_ctl" -D "$data/pg" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$data"; }
trap stop EXIT
"$bindir/initdb" -D "$data/pg" -A trust -U postgres --no-sync >/dev/null
"$bindir/pg_ctl" -D "$data/pg" -w -l "$data/server.log" \
  -o "-c listen_addresses='' -c unix_socket_directories='$data' -c fsync=off" start >/dev/null
run=("$bindir/psql" -X -h "$data" -U postgres -v ON_ERROR_STOP=1)
"${run[@]}" -d postgres -q \
  -c "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;"
"${run[@]}" -d postgres -q -c "create database $db"

echo '1/3 Hauptprüfung (Datenregeln, RLS, Löschlauf, Auskunft, Rückweg)'
"${run[@]}" -d "$db" -q -f "$here/entwurf_0004_mandant_einwilligung_loeschfrist.sql" \
  >"$data/main.out" 2>"$data/main.err" || { cat "$data/main.err" >&2; exit 1; }
grep -q '^ENTWURF_0004_TEST_BESTANDEN$' "$data/main.out"
grep -q 'rueckweg_0004_wuerde_nachweise_entfernen' "$data/main.err"

echo '2/3 Freigabeschutz (muss scheitern)'
if "${run[@]}" -d "$db" -q -f "$here/entwurf_0004_freigabeschutz.sql" >/dev/null 2>"$data/guard.err"; then
  echo 'Entwurf lief ohne Freigabe durch.' >&2
  exit 1
fi
grep -q 'entwurf_0004_nicht_freigegeben' "$data/guard.err"

echo '3/3 Bestehende Prüfung 0001–0003 weiterhin grün (eigene Wegwerf-Datenbank)'
"${run[@]}" -d postgres -q -c "create database nexify_chat_owner_fixture"
"${run[@]}" -d nexify_chat_owner_fixture -q -f "$here/conversation_owner_digest.sql" >/dev/null

if [[ "$("${run[@]}" -d "$db" -At -c "select count(*) from pg_namespace where nspname='chat'")" != 0 ]]; then
  echo 'Prüfung hat Objekte hinterlassen.' >&2
  exit 1
fi
echo "ENTWURF 0004: alle Prüfungen bestanden (PostgreSQL $major, Wegwerf-Cluster entfernt)."

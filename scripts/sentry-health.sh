#!/usr/bin/env bash
# Sentry-Dauerueberwachung: meldet Anzahl offener Issues je Projekt. Exit != 0 bei API-Fehler.
set -euo pipefail
: "${SENTRY_AUTH_TOKEN:?SENTRY_AUTH_TOKEN fehlt}"
base="https://de.sentry.io/api/0/projects"
fail=0
for p in nex2fly/sentry-bistre-cable nexify-chat-it-automate-it/javascript-nextjs; do
  body=$(curl -fsS -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" "$base/$p/issues/?query=is:unresolved&statsPeriod=24h&limit=1" || echo "__ERR__")
  if [ "$body" = "__ERR__" ]; then echo "FAIL $p"; fail=1; continue; fi
  n=$(printf '%s' "$body" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else "ERR")')
  echo "OK $p unresolved_24h=$n"
  [ "$n" = "ERR" ] && fail=1
done
exit "$fail"

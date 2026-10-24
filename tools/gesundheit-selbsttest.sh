#!/usr/bin/env bash
# Negativtest des kritischen Gesundheitsmonitors (Master-Direktive §8).
# Belegt fail-closed: erzwungener Ausfall UND Unterschreiten der Check-Untergrenze => Exit 1 + Ausfall in der Statusdatei.
# Beruehrt die Live-Statusdatei NICHT (eigener GESUNDHEIT_STATUS).
set -uo pipefail
cd "$(dirname "$0")/.."
FAIL=0
TMP="$(mktemp -d)"
ok(){ echo "  OK   $1"; }
bad(){ echo "  FEHL $1"; FAIL=1; }

echo "== 1) Normaler Lauf =="
if GESUNDHEIT_STATUS="$TMP/normal.json" node tools/gesundheit.mjs >/dev/null 2>&1; then ok "normaler Lauf Exit 0"; else bad "normaler Lauf nicht Exit 0"; fi
[ "$(node --input-type=commonjs -e "console.log((require('$TMP/normal.json').ausfaelle||[]).length)")" = "0" ] && ok "keine Ausfaelle" || bad "unerwartete Ausfaelle"

echo "== 2) Erzwungener Ausfall =="
if GESUNDHEIT_STATUS="$TMP/fail.json" GESUNDHEIT_ERZWINGE_FEHLER=1 node tools/gesundheit.mjs >/dev/null 2>&1; then bad "erzwungener Ausfall ergab Exit 0 (fail-open)"; else ok "Exit 1 (fail-closed)"; fi
[ "$(node --input-type=commonjs -e "console.log((require('$TMP/fail.json').ausfaelle||[]).length)")" -ge 1 ] && ok "Ausfall in Statusdatei" || bad "kein Ausfall in Statusdatei"

echo "== 3) Anti-Bypass: Check-Untergrenze =="
if GESUNDHEIT_STATUS="$TMP/min.json" GESUNDHEIT_MIN_CHECKS=9999 node tools/gesundheit.mjs >/dev/null 2>&1; then bad "Untergrenze nicht durchgesetzt (fail-open)"; else ok "Exit 1 (fail-closed)"; fi
node -e "const a=require('$TMP/min.json').ausfaelle||[];process.exit(a.some(x=>/monitor-untergrenze/.test(x))?0:1)" && ok "monitor-untergrenze gemeldet" || bad "monitor-untergrenze fehlt"

node -e "require('node:fs').rmSync('$TMP',{recursive:true,force:true})"
[ "$FAIL" = 0 ] && { echo "gesundheit-selbsttest: bestanden"; exit 0; }
echo "gesundheit-selbsttest: FEHLGESCHLAGEN"; exit 1

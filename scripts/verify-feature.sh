#!/usr/bin/env bash
# verify-feature.sh — prueft ein Feature mehrschichtig (Layer 1..3) aus feature_list.json.
set -euo pipefail
cd "$(dirname "$0")/.."
id="${1:-}"
[[ -z "$id" ]] && { echo "Nutzung: verify-feature.sh <id>"; exit 2; }
row="$(node -e "const f=require('./feature_list.json').features.find(x=>x.id===process.argv[1]);if(!f){console.error('unbekannte ID '+process.argv[1]);process.exit(3)};process.stdout.write(JSON.stringify(f))" "$id")" || exit 1
echo "Feature $id — $(node -e "process.stdout.write(JSON.parse(process.argv[1]).behavior)" "$row")"
n=$(node -e "process.stdout.write(String(JSON.parse(process.argv[1]).layers.length))" "$row")
for i in $(seq 0 $((n-1))); do
  label="$(node -e "process.stdout.write(JSON.parse(process.argv[1]).layers[$i].label)" "$row")"
  cmd="$(node -e "process.stdout.write(JSON.parse(process.argv[1]).layers[$i].cmd)" "$row")"
  repair="$(node -e "process.stdout.write(JSON.parse(process.argv[1]).layers[$i].repair)" "$row")"
  echo "-> $label: $cmd"
  if ! eval "$cmd"; then
    echo "FAIL $id @ $label"; echo "WHAT: $(node -e "process.stdout.write(JSON.parse(process.argv[1]).behavior)" "$row")"
    echo "WHY:  Feature darf nicht passing sein, solange ein Layer rot ist."; echo "FIX:  $repair"; exit 1
  fi
done
echo "PASS $id — alle $n Layer gruen"

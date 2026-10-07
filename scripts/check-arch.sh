#!/usr/bin/env bash
# check-arch.sh — Architektur-Regeln aus .harness/arch-rules.json (check/expect), WHAT/WHY/FIX.
set -euo pipefail
cd "$(dirname "$0")/.."
fail=0
while IFS=$'\t' read -r id check expect; do
  [[ -z "$id" ]] && continue
  if eval "$check" >/dev/null 2>&1; then actual=0; else actual=1; fi
  want=0; [[ "$expect" != "exit 0" ]] && want=1
  if [[ "$actual" != "$want" ]]; then
    echo "arch $id VERLETZT (erwartet: $expect)"
    node -e "const r=require('./.harness/arch-rules.json').rules.find(x=>x.id===process.argv[1]);console.log('  WHAT: '+r.what+'\n  WHY:  '+r.why+'\n  FIX:  '+r.fix)" "$id"
    fail=1
  fi
done < <(node -e "for(const r of require('./.harness/arch-rules.json').rules)console.log([r.id,r.check,r.expect].join('\t'))")
[[ $fail -eq 0 ]] && echo "check-arch: alle Regeln eingehalten"
exit $fail

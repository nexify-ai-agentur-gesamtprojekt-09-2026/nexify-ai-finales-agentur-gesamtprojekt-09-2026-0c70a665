#!/usr/bin/env bash
# clean-state-check.sh — idempotenter Sauber-Zustand-Check (5 Dimensionen), Exit 0 nur wenn alle passen.
set -euo pipefail
cd "$(dirname "$0")/.."
fail=0
# 1) Statik/Audit
if ! npm run -s check >/dev/null 2>&1; then echo "clean-state: FAIL check (npm run check)"; fail=1; fi
# 2) Tests
if ! npm test >/dev/null 2>&1; then echo "clean-state: FAIL Tests (npm test)"; fail=1; fi
# 3) Feature-Liste gueltig, hoechstens ein active
act="$(grep -c '"state":[[:space:]]*"active"' feature_list.json 2>/dev/null || true)"; act="${act:-0}"
if [[ "$act" -gt 1 ]]; then echo "clean-state: FAIL mehr als ein aktives Feature (WIP=1)"; fail=1; fi
# 4) PROGRESS.md vorhanden + Next Steps
[[ -f PROGRESS.md ]] || { echo "clean-state: FAIL PROGRESS.md fehlt"; fail=1; }
grep -qiE "next step" PROGRESS.md || { echo "clean-state: FAIL PROGRESS.md ohne Next Steps"; fail=1; }
# 5) keine Debug-/Temp-Artefakte
while IFS= read -r f; do [[ -z "$f" ]] && continue; echo "clean-state: unsauber: $f"; fail=1; done < <(
  find . -path ./node_modules -prune -o -path ./.git -prune -o -path '*/node_modules' -prune -o -type f \( -name '*-tmp.*' -o -name '*.bak' -o -name '*.orig' -o -name '.DS_Store' \) -print 2>/dev/null | sed 's|^\./||'
)
[[ $fail -eq 0 ]] && echo "clean-state: OK — alle 5 Dimensionen gruen"
exit $fail

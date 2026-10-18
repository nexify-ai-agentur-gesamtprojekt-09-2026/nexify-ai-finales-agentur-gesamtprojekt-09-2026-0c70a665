# NeXify AI Gesamtloesung (myADMIN) — ein Befehl pro Repo-Operation.
.PHONY: setup dev build check test e2e audit vcr verify-feature check-arch session-start session-end clean-check

setup:
	npm ci --ignore-scripts

dev:
	npm --workspace @nexify/web run dev

build:
	npm --workspace @nexify/web run build

check:
	npm run -s check

test:
	npm test

e2e:
	bash scripts/e2e.sh

audit:
	bash /root/.codex/skills/harness-engineering/scripts/audit-harness.sh .

# VCR = passing / aktivierte Features.
vcr:
	@node -e "const f=require('./feature_list.json').features;const p=f.filter(x=>x.state==='passing').length;const a=f.filter(x=>x.state==='active').length;console.log('VCR '+p+'/'+(p+a)+(a?' ('+a+' aktiv, noch nicht passing)':' = 1.0'))"

# Feature mehrschichtig verifizieren: make verify-feature F=F-COCKPIT
verify-feature:
	bash scripts/verify-feature.sh $(F)

check-arch:
	bash scripts/check-arch.sh

session-start:
	bash scripts/session-trace.sh session-start

session-end:
	bash scripts/session-trace.sh session-end

clean-check:
	bash scripts/clean-state-check.sh

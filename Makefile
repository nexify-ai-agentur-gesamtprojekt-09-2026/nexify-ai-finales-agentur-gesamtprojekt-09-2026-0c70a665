# NeXify AI Gesamtloesung — ein Befehl pro Repo-Operation (Harness-Standard).
.PHONY: setup dev build check test e2e audit vcr verify-feature check-arch session-start session-end clean-check contract-check automation-check web-build source-boundaries governance-check governance-status

setup:
	@node --version >/dev/null && python3 --version >/dev/null && echo "setup: node + python3 vorhanden (keine Paketabhaengigkeiten)"

dev:
	pnpm dev

build:
	@cd prototypen && sha256sum -c MANIFEST.sha256
	@node -e "const fs=require('fs'),p=require('path');(function w(d){for(const f of fs.readdirSync(d)){const x=p.join(d,f);if(fs.statSync(x).isDirectory())w(x);else if(x.endsWith('.json'))JSON.parse(fs.readFileSync(x,'utf8'))}})('config');console.log('config/*.json gueltig')"

check:
	node tools/ds-audit-cli.js
	bash tools/gesundheit-selbsttest.sh

test:
	node tools/ds-audit-cli.js
	python3 -m unittest discover -s tests -q
	@$(MAKE) --no-print-directory build

e2e:
	@$(MAKE) --no-print-directory test
	@echo "Lokale Pruefkette bestanden (Prototypen-Audit + Python-Tests + Artefakt-/Config-Integritaet); Browser-/Live-E2E ist separat nachzuweisen."

audit:
	bash /root/.codex/skills/harness-engineering/scripts/audit-harness.sh .

# Konsolidierte Company-Lage (Repos, Dienste, Blocker, Defekte) inkl. Netz-/Rechte-Pruefung
company-status:
	-node tools/exposure-check.mjs
	-node tools/secret-perms-check.mjs
	-node tools/history-secret-check.mjs
	node tools/company-status.mjs

# VCR = passing / aktivierte Features.
vcr:
	@node -e "const f=require('./feature_list.json').features;const p=f.filter(x=>x.state==='passing').length;const a=f.filter(x=>x.state==='active').length;console.log('VCR '+p+'/'+(p+a)+(a?' ('+a+' aktiv, noch nicht passing)':' = 1.0'))"

# Feature mehrschichtig verifizieren: make verify-feature F=F-001
verify-feature:
	bash scripts/verify-feature.sh $(F)

check-arch:
	bash scripts/check-arch.sh

# Offline controls only: no inference, credential read, external agent or repair command.
governance-check:
	python3 tools/check_llm_policy.py
	python3 tools/project_skills.py verify
	python3 tools/check_ai_coverage.py --audit

governance-status:
	python3 tools/remediation_queue.py due

# Vollstaendige Quellenbindung benoetigt die im Katalog bezeichneten Checkouts.
# Kein Provideraufruf und keine Behauptung einer laufenden Factory-API.
contract-check:
	python3 tools/verify_factory_contract.py
	python3 -m unittest discover -s tests -p test_factory_contract.py -q

automation-check:
	python3 -m unittest discover -s tests -p 'test_automation_*.py' -q
	python3 -m unittest discover -s tests -p test_legacy_automation.py -q
	python3 -m unittest discover -s tests -p test_small_business_integration.py -q

web-build:
	pnpm --filter @nexify/site typecheck
	pnpm --filter @nexify/site build

next-reference-build:
	pnpm --filter @nexify/web typecheck
	pnpm --filter @nexify/web build

source-boundaries:
	python3 tools/check_source_boundaries.py
	python3 -m unittest discover -s tests -p test_source_boundaries.py -q

session-start:
	bash scripts/session-trace.sh session-start

session-end:
	bash scripts/session-trace.sh session-end

clean-check:
	bash scripts/clean-state-check.sh

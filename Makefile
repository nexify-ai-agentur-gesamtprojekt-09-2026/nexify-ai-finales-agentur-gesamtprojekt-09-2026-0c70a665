# NeXify AI Gesamtloesung — ein Befehl pro Repo-Operation (Harness-Standard).
.PHONY: setup dev build check test e2e audit vcr verify-feature check-arch session-start session-end clean-check contract-check

setup:
	@node --version >/dev/null && python3 --version >/dev/null && echo "setup: node + python3 vorhanden (keine Paketabhaengigkeiten)"

dev:
	@echo "Kein Dev-Server: statische Produktoberflaeche + Konfiguration. Vorschau: apps-index.html"
	@echo "Pruefung: make check · Artefakte: make build"

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
	@echo "e2e: vollstaendige Pruefkette (Audit + Tests + Artefakt-/Config-Integritaet) gruen"

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

# Vollstaendige Quellenbindung benoetigt die im Katalog bezeichneten Checkouts.
# Kein Provideraufruf und keine Behauptung einer laufenden Factory-API.
contract-check:
	python3 tools/verify_factory_contract.py
	python3 -m unittest discover -s tests -p test_factory_contract.py -q

session-start:
	bash scripts/session-trace.sh session-start

session-end:
	bash scripts/session-trace.sh session-end

clean-check:
	bash scripts/clean-state-check.sh

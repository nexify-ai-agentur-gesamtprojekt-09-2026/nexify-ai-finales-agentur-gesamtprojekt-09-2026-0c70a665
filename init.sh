#!/usr/bin/env bash
# init.sh — Startpfad: Voraussetzungen pruefen, Basispruefung gruen bestaetigen.
set -euo pipefail
cd "$(dirname "$0")"
echo "node $(node --version) · python $(python3 --version)"
node tools/ds-audit-cli.js
python3 -m unittest discover -s tests -q
echo "init: bereit — Produktoberflaeche: apps-index.html · Doku: docs/09-final/00-INDEX.md"

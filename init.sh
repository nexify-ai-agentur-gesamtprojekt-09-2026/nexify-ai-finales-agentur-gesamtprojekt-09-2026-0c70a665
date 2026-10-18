#!/usr/bin/env bash
# init.sh — Startpfad: Umgebung pruefen, abhaengigkeiten installieren, Basispruefung.
set -euo pipefail
cd "$(dirname "$0")"
echo "node $(node --version)"
npm ci --ignore-scripts
npm run -s check
npm test
echo "init: bereit — 'make dev' startet die Web-App"

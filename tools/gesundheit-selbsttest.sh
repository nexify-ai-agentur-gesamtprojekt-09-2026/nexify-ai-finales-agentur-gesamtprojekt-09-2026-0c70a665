#!/usr/bin/env bash
# Testet denselben Monitorkern wie der Live-Runner, ohne Produktions-DNS,
# fremde Hostdateien, Systemdienste, Agentmemory oder Live-Status zu beruehren.
set -euo pipefail
cd "$(dirname "$0")/.."
node --test tests/gesundheit.test.mjs

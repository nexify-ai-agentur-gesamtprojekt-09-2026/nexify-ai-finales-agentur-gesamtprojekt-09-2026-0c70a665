#!/usr/bin/env bash
# Prueft, dass die versionierte Harness-Konfiguration eine gueltige
# Profilkomposition ergibt und die Modellroute enthaelt.
set -Eeuo pipefail

DSH_BIN=${DSH_BIN:-dsh}
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT

export DSH_HOME=$work/home
mkdir -p "$DSH_HOME"

"$DSH_BIN" --profile web --dump-default-config >/dev/null
cp harness/cordis.patch.yml "$DSH_HOME/cordis.patch.yml"

out=$("$DSH_BIN" --profile web --dump-config)

grep -q 'nexifyai-router' <<< "$out" || { echo "FAIL: Provider nexifyai-router fehlt"; exit 1; }
grep -q 'http://127.0.0.1:20128/v1' <<< "$out" || { echo "FAIL: baseURL fehlt"; exit 1; }
grep -q 'ollama-local/deepseek-v4.1-flash:cloud' <<< "$out" || { echo "FAIL: Modell fehlt"; exit 1; }

echo "harness-config-check: OK ($("$DSH_BIN" --version))"

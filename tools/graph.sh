#!/usr/bin/env bash
# Wissensgraph des Repositories mit Graphify (Apache-2.0, https://github.com/Graphify-Labs/graphify).
# Nur der lokale Code-Lauf: tree-sitter, kein LLM, kein Netzwerkzugriff auf Projektinhalte, kein Konto.
#   bash tools/graph.sh                 Graph bauen oder aktualisieren (graphify-out/, nicht versioniert)
#   bash tools/graph.sh query "Frage"   Teilgraph zu einer Frage
#   bash tools/graph.sh explain "Name"  ein Symbol und seine Nachbarn
#   bash tools/graph.sh path "A" "B"    kürzester Weg zwischen zwei Symbolen
#   bash tools/graph.sh affected "Name" was von einem Symbol abhängt
set -euo pipefail
GRAPHIFY_VERSION="${GRAPHIFY_VERSION:-0.9.108}"
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
if ! command -v uvx >/dev/null 2>&1; then
  echo 'uvx fehlt. Installation: https://docs.astral.sh/uv/ (danach erneut starten).' >&2
  exit 2
fi
run=(uvx --from "graphifyy[sql]==${GRAPHIFY_VERSION}" graphify)
if [[ $# -eq 0 ]]; then
  exec "${run[@]}" update .
fi
if [[ ! -f graphify-out/graph.json ]]; then
  "${run[@]}" update . >&2
fi
exec "${run[@]}" "$@"

#!/usr/bin/env bash
# NeXify Vorschau online bringen: statischer Server + Cloudflare-Quick-Tunnel.
# Startet die kanonischen Seiten aus prototypen/ auf :8091 und legt einen
# oeffentlichen trycloudflare.com-Tunnel darueber. URL erscheint in /tmp/nexify-tunnel.log.
set -euo pipefail
SRC="$(cd "$(dirname "$0")/../prototypen" && pwd)"
SERVER="$(cd "$(dirname "$0")" && pwd)/vorschau-server.py"
PORT="${PORT:-8091}"
pkill -f "http.server $PORT" 2>/dev/null || true
pkill -f "vorschau-server.py $PORT" 2>/dev/null || true
pkill -f "cloudflared tunnel --url http://localhost:$PORT" 2>/dev/null || true
setsid bash -c 'exec python3 "$1" "$2" "$3" >/tmp/nexify-static.log 2>&1' _ "$SERVER" "$PORT" "$SRC" </dev/null &
sleep 1
setsid bash -c 'exec cloudflared tunnel --url "http://localhost:$1" --no-autoupdate >/tmp/nexify-tunnel.log 2>&1' _ "$PORT" </dev/null &
sleep 6
URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/nexify-tunnel.log | head -1)
echo "ONLINE: $URL (Einstieg: /NeXifyAI%20Cloud%20v12.dc.html)"

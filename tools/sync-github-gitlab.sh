#!/usr/bin/env bash
# NeXify Gesamtlösung · GitHub → GitLab Mirror (Einweg: GitHub = Quelle).
# Läuft auf DUS per systemd-Timer. Geheimnisse: GitLab-PAT aus OpenBao,
# GitHub-App-Token je Lauf frisch von FRA (Key bleibt auf FRA).
set -euo pipefail

REPO="/opt/ai-stack/design_handoff_nexify_gesamtloesung"
GH_REPO="https://github.com/nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026.git"
GL_REPO="http://127.0.0.1:8922/nexifyai_group/nexify-ai-finales-agentur-gesamtprojekt.git"
GL_PROJECT_ID="42"
FRA="nexifyai-frankfurt"
LOCK="/run/nexify-sync-gesamt.lock"
LOG="/var/log/nexifyai/sync-gesamt.log"

exec 9>"$LOCK"; flock -n 9 || { echo "bereits laufend"; exit 0; }
mkdir -p "$(dirname "$LOG")"
log(){ echo "[$(date '+%F %T')] $*" >>"$LOG"; }

# GitLab-PAT aus OpenBao
BAO_TOKEN=$(grep -E '^OPENBAO_TOKEN=' /opt/ai-stack/nexify-neu/.dev/openbao/gateway.env | cut -d= -f2-)
GL=$(curl -sS -H "X-Vault-Token: $BAO_TOKEN" http://127.0.0.1:8200/v1/nexify/data/gitlab --max-time 8 | python3 -c 'import json,sys;print(json.load(sys.stdin)["data"]["data"]["token"])')

# GitHub-App-Token frisch erzeugen (Key liegt auf FRA)
GH=$(ssh -o BatchMode=yes -o ConnectTimeout=15 "$FRA" 'python3 -c "import jwt,time,json,urllib.request;K=open(\"/opt/nexifyai/security/github/nexify-github-app.pem\").read();n=int(time.time());j=jwt.encode({\"iat\":n,\"exp\":n+600,\"iss\":\"3865469\"},K,algorithm=\"RS256\");q=urllib.request.Request(\"https://api.github.com/app/installations/135674457/access_tokens\",data=json.dumps({}).encode(),method=\"POST\",headers={\"Authorization\":\"Bearer \"+j,\"Accept\":\"application/vnd.github+json\",\"User-Agent\":\"nexify-automation\",\"Content-Type\":\"application/json\"});print(json.load(urllib.request.urlopen(q,timeout=20))[\"token\"])"')

cd "$REPO"
git fetch "https://x-access-token:$GH@github.com/nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026.git" main 2>/dev/null
LOCAL=$(git rev-parse FETCH_HEAD)
GH_TREE=$(git rev-parse "$LOCAL^{tree}")
git fetch "http://oauth2:$GL@127.0.0.1:8922/nexifyai_group/nexify-ai-finales-agentur-gesamtprojekt.git" main:refs/remotes/gl/main 2>/dev/null || true
GL_TREE=$(git rev-parse refs/remotes/gl/main^{tree} 2>/dev/null || echo "")
if [ "$GH_TREE" = "$GL_TREE" ]; then log "in Sync (tree $GH_TREE)"; exit 0; fi

git push --force "http://oauth2:$GL@127.0.0.1:8922/nexifyai_group/nexify-ai-finales-agentur-gesamtprojekt.git" "$LOCAL":refs/heads/main 2>/dev/null
log "Sync: tree $GL_TREE -> $GH_TREE (direct force-push)"

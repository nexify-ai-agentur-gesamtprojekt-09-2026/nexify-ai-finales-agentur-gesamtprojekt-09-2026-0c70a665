#!/usr/bin/env bash
# NeXify Gesamtloesung · Mirror GitLab -> GitHub (Einweg: GitLab = Quelle).
# Läuft auf DUS per systemd-Timer. GitHub ist nur Spiegel; fehlt die
# GitHub-Auth oder ist das Ziel-Repo nicht erreichbar, wird sauber
# übersprungen statt GitLab mit veraltetem Stand zu überschreiben.
set -uo pipefail

REPO="/opt/ai-stack/design_handoff_nexify_gesamtloesung"
GL_REPO="http://127.0.0.1:8922/nexifyai_group/nexify-ai-finales-agentur-gesamtprojekt.git"
GH_PATH="nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026.git"
FRA="nexifyai-frankfurt"
LOCK="/run/nexify-sync-gesamt.lock"
LOG="/var/log/nexifyai/sync-gesamt.log"

exec 9>"$LOCK"; flock -n 9 || { echo "bereits laufend"; exit 0; }
mkdir -p "$(dirname "$LOG")"
log(){ echo "[$(date '+%F %T')] $*" >>"$LOG"; }

# GitLab-PAT aus OpenBao. Ohne Token ist GitLab nicht lesbar -> kontrolliert enden.
BAO_TOKEN=$(grep -E '^OPENBAO_TOKEN=' /opt/ai-stack/nexify-neu/.dev/openbao/gateway.env | cut -d= -f2-)
GL=$(curl -sS -H "X-Vault-Token: $BAO_TOKEN" http://127.0.0.1:8200/v1/nexify/data/gitlab --max-time 8 \
  | python3 -c 'import json,sys;print(json.load(sys.stdin)["data"]["data"]["token"])' 2>/dev/null) \
  || { log "SKIP: GitLab-Token nicht lesbar"; exit 0; }

cd "$REPO"
git fetch "http://oauth2:$GL@127.0.0.1:8922/nexifyai_group/nexify-ai-finales-agentur-gesamtprojekt.git" \
  +main:refs/remotes/gl/main 2>/dev/null || { log "SKIP: GitLab fetch fehlgeschlagen"; exit 0; }
GL_SHA=$(git rev-parse refs/remotes/gl/main)
GL_TREE=$(git rev-parse refs/remotes/gl/main^{tree})

# GitHub-App-Token frisch erzeugen (Key liegt auf FRA). Fehlt der Schlüssel oder
# schlägt SSH fehl, bleibt GitLab unangetastet.
GH=$(ssh -o BatchMode=yes -o ConnectTimeout=15 "$FRA" \
  'python3 -c "import jwt,time,json,urllib.request;K=open(\"/opt/nexifyai/security/github/nexify-github-app.pem\").read();n=int(time.time());j=jwt.encode({\"iat\":n,\"exp\":n+600,\"iss\":\"3865469\"},K,algorithm=\"RS256\");q=urllib.request.Request(\"https://api.github.com/app/installations/135674457/access_tokens\",data=json.dumps({}).encode(),method=\"POST\",headers={\"Authorization\":\"Bearer \"+j,\"Accept\":\"application/vnd.github+json\",\"User-Agent\":\"nexify-automation\",\"Content-Type\":\"application/json\"});print(json.load(urllib.request.urlopen(q,timeout=20))[\"token\"])"' \
  2>/dev/null) || { log "SKIP: GitHub-Auth nicht erzeugbar (mirror ausgesetzt)"; exit 0; }
[ -n "$GH" ] || { log "SKIP: GitHub-Token leer"; exit 0; }

# Nichtdestruktiver Einweg-Spiegel (Masterprompt §17, TEST-AP007):
# KEIN --force, KEINE Ref-Loeschung, KEIN Pruning. Nur Fast-Forward.
# Divergenz wird bewahrt und sichtbar gemacht, nicht ueberschrieben.
if git ls-remote "https://x-access-token:$GH@github.com/$GH_PATH" main >/dev/null 2>&1; then
  git fetch "https://x-access-token:$GH@github.com/$GH_PATH" main:refs/remotes/gh/main 2>/dev/null || true
  GH_SHA=$(git rev-parse --verify --quiet refs/remotes/gh/main || echo "")
  if [ -n "$GH_SHA" ] && [ "$GH_SHA" = "$GL_SHA" ]; then
    log "Mirror aktuell: GitHub main=$GH_SHA (keine Aktion)"
  elif [ -z "$GH_SHA" ] || git merge-base --is-ancestor "$GH_SHA" "$GL_SHA" 2>/dev/null; then
    # Fast-Forward: genau den geprueften Commit pushen, ohne --force.
    git push "https://x-access-token:$GH@github.com/$GH_PATH" "$GL_SHA":refs/heads/main 2>/dev/null \
      && log "Mirror: GitLab $GL_TREE -> GitHub (fast-forward ${GH_SHA:-neu}..$GL_SHA)" \
      || log "SKIP: GitHub-Push fehlgeschlagen (Spiegel ausgesetzt)"
  else
    log "DIVERGENZ: GitHub main=$GH_SHA ist kein Vorfahre von GitLab $GL_SHA; kein Force-Push, beide Staende bleiben erhalten"
    exit 1
  fi
else
  log "SKIP: GitHub-Ziel nicht erreichbar/berechtigt (tree $GL_TREE bleibt Quelle)"
fi

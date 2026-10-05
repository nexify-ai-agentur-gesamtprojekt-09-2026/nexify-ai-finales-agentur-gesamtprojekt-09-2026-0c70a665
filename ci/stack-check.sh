#!/usr/bin/env bash
# Prueft den DSH-Enterprise-Stack. --static laeuft ueberall, --live braucht
# Netzwerkzugriff auf den Zielserver.
set -Eeuo pipefail

MODE=${1:---static}
FAIL=0

ok()   { printf '  ok   %s\n' "$1"; }
bad()  { printf '  FAIL %s\n' "$1"; FAIL=1; }

static_checks() {
  printf '[static] Syntax und Struktur\n'
  bash -n install-dsh-enterprise.sh && ok 'install-dsh-enterprise.sh (bash -n)' || bad 'install-dsh-enterprise.sh Syntax'
  bash -n ci/stack-check.sh && ok 'ci/stack-check.sh (bash -n)' || bad 'ci/stack-check.sh Syntax'
  python3 -m json.tool ci/requirements.json >/dev/null && ok 'ci/requirements.json (JSON)' || bad 'ci/requirements.json unlesbar'

  printf '[static] Keine Geheimnisse im Repo\n'
  if git ls-files -z 2>/dev/null | xargs -0 -r grep -lEi '(sk-[A-Za-z0-9]{16,}|glpat-[A-Za-z0-9_-]{16,}|BEGIN (RSA|OPENSSH) PRIVATE KEY|password\s*[:=]\s*[^"'"'"'[:space:]]{8,})' 2>/dev/null | grep -q .; then
    bad 'moegliche Geheimnisse in versionierten Dateien'
  else
    ok 'keine offensichtlichen Geheimnisse'
  fi

  if [[ -f prod/docker/docker-compose.yml ]] && command -v docker >/dev/null 2>&1; then
    printf '[static] Compose-Konfiguration\n'
    if docker compose -f prod/docker/docker-compose.yml -f prod/docker/docker-compose.gateway.yml config --quiet 2>/dev/null; then
      ok 'docker-compose.yml + gateway-Overlay'
    else
      bad 'Compose-Konfiguration ungueltig'
    fi
  else
    printf '[static] Compose uebersprungen (kein prod/ oder docker)\n'
  fi
}

live_checks() {
  local stack=${STACK_URL:-https://179.198.195.91.nip.io}
  local harness=${HARNESS_URL:-https://179.198.195.91.sslip.io}
  printf '[live] %s und %s\n' "$stack" "$harness"

  code=$(curl -sk -m 15 -o /dev/null -w '%{http_code}' "$stack/api/dsh/jwks" || true)
  [[ $code == 200 ]] && ok "Gateway JWKS ($code)" || bad "Gateway JWKS ($code)"

  code=$(curl -sk -m 15 -o /dev/null -w '%{http_code}' "$stack/api/v1/dsh/browser-config" || true)
  [[ $code == 200 ]] && ok "Enterprise API ($code)" || bad "Enterprise API ($code)"

  code=$(curl -sk -m 15 -o /dev/null -w '%{http_code}' "$harness/" || true)
  [[ $code == 200 || $code == 303 ]] && ok "Harness Web-UI ($code)" || bad "Harness Web-UI ($code)"

  if command -v curl >/dev/null 2>&1; then
    code=$(curl -sk -m 15 -o /dev/null -w '%{http_code}' -H 'Host: evil.example' "$harness/api/remote.mux" -X POST || true)
    [[ $code == 403 ]] && ok 'Host-Fence weist fremde Hosts ab (403)' || bad "Host-Fence ($code)"
  fi
}

case $MODE in
  --static) static_checks;;
  --live)   static_checks; live_checks;;
  *) printf 'usage: %s [--static|--live]\n' "$0" >&2; exit 2;;
esac

[[ $FAIL == 0 ]] && printf '\nstack-check: OK\n' || { printf '\nstack-check: FEHLER\n' >&2; exit 1; }

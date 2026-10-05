#!/usr/bin/env bash
# Prueft den DSH-Enterprise-Stack. --static laeuft ueberall, --live braucht
# Netzwerkzugriff auf den Zielserver.
set -Eeuo pipefail

MODE=${1:---static}
FAIL=0

# Hersteller-Skript: Integritaet ueber Hash statt Textsuche. Die Datei enthaelt
# dokumentierte Standard-Zugangsdaten des Anbieters (CR-Registry, Beispiel-MySQL),
# die kein Geheimnis dieses Projekts sind.
INSTALLER=install-dsh-enterprise.sh
INSTALLER_SHA=2b0594525655a9cdaa19324cd104eea3179f883f214b081e86c302b18a3a7a0a

ok()   { printf '  ok   %s\n' "$1"; }
bad()  { printf '  FAIL %s\n' "$1"; FAIL=1; }

static_checks() {
  printf '[static] Syntax und Struktur\n'
  bash -n "$INSTALLER" && ok "$INSTALLER (bash -n)" || bad "$INSTALLER Syntax"
  bash -n ci/stack-check.sh && ok 'ci/stack-check.sh (bash -n)' || bad 'ci/stack-check.sh Syntax'
  python3 -m json.tool ci/requirements.json >/dev/null && ok 'ci/requirements.json (JSON)' || bad 'ci/requirements.json unlesbar'

  printf '[static] Hersteller-Skript unveraendert\n'
  actual=$(sha256sum "$INSTALLER" | cut -d' ' -f1)
  [[ $actual == "$INSTALLER_SHA" ]] && ok "$INSTALLER SHA-256 unveraendert" || bad "$INSTALLER SHA-256 abweichend ($actual)"

  printf '[static] Keine Geheimnisse im Repo\n'
  if git ls-files -z 2>/dev/null | tr '\0' '\n' | grep -vx "$INSTALLER" \
       | xargs -r -d '\n' grep -lEi '(sk-[A-Za-z0-9]{16,}|glpat-[A-Za-z0-9_-]{16,}|BEGIN (RSA|OPENSSH) PRIVATE KEY|password\s*[:=]\s*[^"'"'"'[:space:]]{8,})' 2>/dev/null | grep -q .; then
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

  local dsh_bin=${DSH_BIN:-}
  if [[ -z $dsh_bin && -x /opt/dsh/node_modules/.bin/dsh ]]; then
    dsh_bin=/opt/dsh/node_modules/.bin/dsh
  fi
  if [[ -z $dsh_bin ]] && command -v dsh >/dev/null 2>&1; then
    dsh_bin=$(command -v dsh)
  fi
  if [[ -n $dsh_bin ]]; then
    printf '[static] Harness-Konfiguration\n'
    if DSH_BIN=$dsh_bin ./ci/harness-config-check.sh >/dev/null 2>&1; then
      ok 'Profil web komponiert mit Modellroute'
    else
      bad 'Harness-Konfiguration ungueltig'
    fi
  else
    printf '[static] Harness-Konfiguration uebersprungen (kein dsh im PATH)\n'
  fi

  if [[ -f /srv/dsh/home/profiles/web/package.json ]]; then
    printf '[static] Harness-Plugin dsh-context\n'
    if grep -q '"dsh-context"' /srv/dsh/home/profiles/web/package.json; then
      ok 'dsh-context im Profil web registriert'
    else
      bad 'dsh-context fehlt im Profil web'
    fi
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
  # Ohne Start-Token ist 401 die korrekte Antwort: erreichbar und Auth aktiv.
  case $code in
    200|303) ok "Harness Web-UI erreichbar ($code)";;
    401)     ok 'Harness Web-UI erreichbar, Auth aktiv (401)';;
    *)       bad "Harness Web-UI ($code)";;
  esac

  # Die Host-Fence sitzt am Listener, nicht am Proxy; nur direkt pruefbar.
  local listener=${HARNESS_LISTENER:-http://127.0.0.1:3085}
  if curl -s -m 5 -o /dev/null "$listener/" 2>/dev/null || curl -s -m 5 -o /dev/null -w '' "$listener/api/remote.mux" -X POST 2>/dev/null; then
    code=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H 'Host: evil.example' -X POST "$listener/api/remote.mux" || true)
    [[ $code == 403 ]] && ok 'Host-Fence weist fremde Hosts ab (403)' || bad "Host-Fence ($code)"
  else
    printf '  skip Host-Fence (Listener %s nicht erreichbar)\n' "$listener"
  fi

  printf '[live] Sicherheitsheader und TLS-Erzwingung (%s)\n' "$harness"
  hdr=$(curl -sk -m 15 -D - -o /dev/null "$harness/" | tr -d '\r' || true)
  grep -qi '^strict-transport-security: max-age=3' <<<"$hdr" && ok 'HSTS gesetzt' || bad 'HSTS fehlt'
  grep -qi '^x-content-type-options: nosniff' <<<"$hdr" && ok 'X-Content-Type-Options: nosniff' || bad 'nosniff fehlt'
  grep -qi '^referrer-policy: ' <<<"$hdr" && ok 'Referrer-Policy gesetzt' || bad 'Referrer-Policy fehlt'
  code=$(curl -s -m 15 -o /dev/null -w '%{http_code}' "http://${harness#https://}/" || true)
  [[ $code == 301 || $code == 308 ]] && ok "HTTP leitet auf HTTPS um ($code)" || bad "HTTP-Redirect ($code)"
}

case $MODE in
  --static) static_checks;;
  --live)   static_checks; live_checks;;
  *) printf 'usage: %s [--static|--live]\n' "$0" >&2; exit 2;;
esac

[[ $FAIL == 0 ]] && printf '\nstack-check: OK\n' || { printf '\nstack-check: FEHLER\n' >&2; exit 1; }

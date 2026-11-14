#!/usr/bin/env bash
# NeXify · Hermes-Konfiguration in ein vorhandenes Hermes-Home einspielen.
#
# Für die belegte Installationsform: Compose-Projekt `docker-hermes`, Container
# `hermes`, Home auf dem Host unter /root/.hermes. Das Skript installiert nichts
# neu und löscht nichts. Ohne --anwenden ändert es nichts (Trockenlauf). Mit
# --anwenden sichert es zuerst config.yaml und SOUL.md und schreibt dann die
# neuen Fassungen. Die .env wird nie geschrieben und nie ausgegeben; geprüft
# werden nur Variablennamen. Ein Neustart des Containers geschieht nur mit
# --neustart.
set -euo pipefail

HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HIER/../.." && pwd)"
ZIEL="/root/.hermes"
QUELLE="/usr/local/lib/hermes-agent"
CONTAINER="hermes"
ZUSATZ=""
ZURUECK=""
ANWENDEN=false
NEUSTART=false
VERSION_UNGEPRUEFT=false
# Abschnitte, die nur aus dem Repository kommen dürfen (Modell, Reasoning, Ausweichketten).
GESPERRT="model fallback_providers fallback_model fallback providers custom_providers agent auxiliary delegation provider_routing cron"

hilfe() {
    cat <<'TXT'
Aufruf: einspielen.sh [--ziel DIR] [--quelle DIR] [--zusatz DATEI] [--anwenden]
                      [--version-ungeprueft-zulassen] [--neustart] [--container NAME]
        einspielen.sh --zurueck SICHERUNGSORDNER [--ziel DIR] [--anwenden]

  --ziel DIR      Hermes-Home auf dem Host (Standard /root/.hermes)
  --quelle DIR    Hermes-Quellbaum auf dem Host (Standard /usr/local/lib/hermes-agent)
  --zusatz DATEI  serverlokale YAML-Abschnitte, die erhalten bleiben sollen
                  (z. B. mcp_servers); keine Abschnitte zu Modell oder Ausweichkette
  --anwenden      wirklich schreiben; ohne diesen Schalter nur Trockenlauf
  --version-ungeprueft-zulassen
                  auch schreiben, wenn der Hermes-Commit nicht dem gebundenen entspricht
  --neustart      nach dem Schreiben `docker restart <container>` ausführen
  --zurueck DIR   config.yaml und SOUL.md aus einer Sicherung zurückspielen
TXT
}

while [ $# -gt 0 ]; do
    case "$1" in
        --ziel|--quelle|--zusatz|--zurueck|--container)
            [ $# -ge 2 ] || { echo "$1 braucht einen Wert" >&2; exit 2; }
            case "$1" in
                --ziel) ZIEL="$2" ;; --quelle) QUELLE="$2" ;; --zusatz) ZUSATZ="$2" ;;
                --zurueck) ZURUECK="$2" ;; --container) CONTAINER="$2" ;;
            esac
            shift 2 ;;
        --anwenden) ANWENDEN=true; shift ;;
        --neustart) NEUSTART=true; shift ;;
        --version-ungeprueft-zulassen) VERSION_UNGEPRUEFT=true; shift ;;
        -h|--help) hilfe; exit 0 ;;
        *) echo "unbekannte Option: $1" >&2; exit 2 ;;
    esac
done

melde() { printf '%s\n' "$*"; }
abbruch() { printf 'ABBRUCH: %s\n' "$*" >&2; exit 1; }
summe() { sha256sum "$1" | cut -d' ' -f1; }
kopfschluessel() { grep -oE '^[A-Za-z_][A-Za-z0-9_.-]*:' "$1" | tr -d ':' | sort -u; }
stempel() { date -u +%Y%m%dT%H%M%SZ; }

[ -n "$ZIEL" ] && [ -d "$ZIEL" ] || abbruch "Hermes-Home '$ZIEL' fehlt. Dieses Skript legt keine Neuinstallation an."

# --- Rückweg -----------------------------------------------------------------
if [ -n "$ZURUECK" ]; then
    [ -f "$ZURUECK/MANIFEST.sha256" ] || abbruch "$ZURUECK ist keine Sicherung dieses Skripts."
    (cd "$ZURUECK" && sha256sum --quiet -c MANIFEST.sha256) || abbruch "Sicherung beschädigt."
    ABGELEGT="$ZURUECK/ersetzt-$(stempel)"
    for datei in config.yaml SOUL.md; do
        if [ -f "$ZURUECK/$datei" ]; then
            melde "zurück: $datei aus $ZURUECK"
            if [ "$ANWENDEN" = true ]; then
                mkdir -p "$ABGELEGT"
                [ ! -f "$ZIEL/$datei" ] || cp -p "$ZIEL/$datei" "$ABGELEGT/$datei"
                install -m 600 "$ZURUECK/$datei" "$ZIEL/$datei"
            fi
        elif grep -qx "fehlte: $datei" "$ZURUECK/FEHLTE" 2>/dev/null; then
            melde "zurück: $datei gab es vorher nicht; die eingespielte Fassung wird nach $ABGELEGT verschoben"
            if [ "$ANWENDEN" = true ] && [ -f "$ZIEL/$datei" ]; then
                mkdir -p "$ABGELEGT"
                mv "$ZIEL/$datei" "$ABGELEGT/$datei"
            fi
        fi
    done
    if [ "$ANWENDEN" = true ]; then
        melde "Rückweg ausgeführt. Neustart nur von Hand: docker restart $CONTAINER"
    else
        melde "Trockenlauf: nichts geändert. Mit --anwenden ausführen."
    fi
    exit 0
fi

# --- 1. Vorgabe prüfen (offline) ---------------------------------------------
command -v python3 >/dev/null 2>&1 || abbruch "python3 fehlt; die Prüfung gegen config/llm-policy.json ist Pflicht."
python3 "$REPO/tools/check_hermes_config.py" >/dev/null \
    || abbruch "ops/hermes/home/config.yaml weicht von config/llm-policy.json ab (python3 tools/check_hermes_config.py)."
melde "1 Vorgabe: Konfiguration stimmt mit config/llm-policy.json überein."

# --- 2. Hermes-Version gegen den gebundenen Commit -----------------------------
PIN="$(python3 - "$REPO/config/integrations/nexify-team-runtime-candidate.json" <<'PY'
import json, sys
print(next(r["commit"] for r in json.load(open(sys.argv[1]))["runtime_candidates"] if r["id"] == "hermes-candidate"))
PY
)"
IST="$(git -C "$QUELLE" rev-parse HEAD 2>/dev/null || true)"
if [ "$IST" = "$PIN" ]; then
    melde "2 Version: $QUELLE steht auf dem gebundenen Commit $PIN."
else
    melde "2 Version: gebunden $PIN, vorgefunden ${IST:-nicht feststellbar} in $QUELLE."
    melde "  Das Konfigurationsformat ist nur für den gebundenen Commit belegt."
    if [ "$ANWENDEN" = true ] && [ "$VERSION_UNGEPRUEFT" = false ]; then
        abbruch "Version abweichend oder unbekannt. Erst klären oder --version-ungeprueft-zulassen setzen."
    fi
fi

# --- 3. .env: nur Namen, nie Werte ---------------------------------------------
ENVDATEI="$ZIEL/.env"
env_gesetzt() { grep -qE "^[[:space:]]*(export[[:space:]]+)?$1=[^[:space:]]" "$ENVDATEI" 2>/dev/null; }
ENV_OK=true
for name in OPENROUTER_API_KEY NEXIFY_REPO; do
    if env_gesetzt "$name"; then
        melde "3 .env: $name ist gesetzt."
    else
        melde "3 .env: $name fehlt oder ist leer."
        ENV_OK=false
    fi
done
for name in HERMES_INFERENCE_MODEL HERMES_YOLO_MODE; do
    if env_gesetzt "$name"; then
        melde "3 .env: $name ist gesetzt und muss entfernt werden."
        ENV_OK=false
    fi
done
if [ -f "$ENVDATEI" ] && [ "$(stat -c %a "$ENVDATEI")" != 600 ]; then
    melde "3 .env: Rechte sind $(stat -c %a "$ENVDATEI"), erwartet 600."
fi
[ "$ENV_OK" = true ] || melde "  So kann Hermes nicht regelkonform laufen. Werte trägt der Inhaber von Hand ein."

# --- 4. Neue Fassung zusammenstellen -------------------------------------------
ARBEIT="$(mktemp -d)"
trap 'rm -rf "${ARBEIT:?}"' EXIT
cp "$HIER/home/config.yaml" "$ARBEIT/config.yaml"
cp "$HIER/home/SOUL.md" "$ARBEIT/SOUL.md"
if [ -n "$ZUSATZ" ]; then
    [ -f "$ZUSATZ" ] || abbruch "Zusatzdatei $ZUSATZ fehlt."
    for schluessel in $(kopfschluessel "$ZUSATZ"); do
        for gesperrt in $GESPERRT; do
            [ "$schluessel" != "$gesperrt" ] || abbruch "Zusatz enthält gesperrten Abschnitt '$schluessel'."
        done
        if kopfschluessel "$HIER/home/config.yaml" | grep -qx "$schluessel"; then
            abbruch "Zusatz überschneidet sich mit der Repository-Fassung: '$schluessel'."
        fi
    done
    if grep -qE '(api_key|token|password|secret)[[:space:]]*:[[:space:]]*[^[:space:]$#]' "$ZUSATZ"; then
        abbruch "Zusatz enthält ein eingetragenes Geheimnis. Zulässig sind nur \${NAME}-Verweise auf die .env."
    fi
    { printf '\n# --- serverlokaler Zusatz (%s) ---\n' "$(basename "$ZUSATZ")"; cat "$ZUSATZ"; } >> "$ARBEIT/config.yaml"
    melde "4 Zusatz: Abschnitte $(kopfschluessel "$ZUSATZ" | tr '\n' ' ')übernommen."
fi

# Abschnitte der bisherigen Fassung, die mit der neuen wegfielen: nur Namen zeigen.
VERLUST=""
if [ -f "$ZIEL/config.yaml" ]; then
    for schluessel in $(kopfschluessel "$ZIEL/config.yaml"); do
        [ "$schluessel" != _config_version ] || continue
        kopfschluessel "$ARBEIT/config.yaml" | grep -qx "$schluessel" || VERLUST="$VERLUST $schluessel"
    done
fi
if [ -n "$VERLUST" ]; then
    melde "4 Bisherige Abschnitte, die in der neuen Fassung fehlen:$VERLUST"
    melde "  Gewünschte Abschnitte in eine Zusatzdatei legen (--zusatz); sonst gelten Hermes-Standardwerte."
fi

GLEICH=true
for datei in config.yaml SOUL.md; do
    if [ -f "$ZIEL/$datei" ] && [ "$(summe "$ZIEL/$datei")" = "$(summe "$ARBEIT/$datei")" ]; then
        melde "4 $datei: unverändert."
    else
        GLEICH=false
        melde "4 $datei: wird ersetzt (neu sha256 $(summe "$ARBEIT/$datei"))."
    fi
done

if [ "$ANWENDEN" = false ]; then
    melde "Trockenlauf: nichts geändert. Mit --anwenden ausführen."
    exit 0
fi

# --- 5. Sichern, dann schreiben -------------------------------------------------
if [ "$GLEICH" = true ]; then
    melde "5 Nichts zu tun: Zielstand entspricht bereits der neuen Fassung."
else
    SICHERUNG="$ZIEL/backups/nexify-$(stempel)"
    mkdir -p "$SICHERUNG"
    chmod 700 "$SICHERUNG"
    : > "$SICHERUNG/FEHLTE"
    GESICHERT="FEHLTE"
    for datei in config.yaml SOUL.md; do
        if [ -f "$ZIEL/$datei" ]; then
            cp -p "$ZIEL/$datei" "$SICHERUNG/$datei"
            GESICHERT="$GESICHERT $datei"
        else
            echo "fehlte: $datei" >> "$SICHERUNG/FEHLTE"
        fi
    done
    # shellcheck disable=SC2086
    (cd "$SICHERUNG" && sha256sum $GESICHERT > MANIFEST.sha256 && sha256sum --quiet -c MANIFEST.sha256) \
        || abbruch "Sicherung nicht lesbar; nichts geschrieben."
    for datei in config.yaml SOUL.md; do
        install -m 600 "$ARBEIT/$datei" "$ZIEL/$datei.nexify-neu"
        mv -f "$ZIEL/$datei.nexify-neu" "$ZIEL/$datei"
    done
    melde "5 Geschrieben. Sicherung: $SICHERUNG"
    melde "  Rückweg: $0 --zurueck $SICHERUNG --ziel $ZIEL --anwenden"
fi

# --- 6. Neustart nur auf ausdrücklichen Schalter ---------------------------------
if [ "$NEUSTART" = true ]; then
    command -v docker >/dev/null 2>&1 || abbruch "docker fehlt; Neustart nicht ausgeführt."
    docker restart "$CONTAINER"
    melde "6 Container $CONTAINER neu gestartet."
else
    melde "6 Kein Neustart. Laufende Sitzungen behalten ihre alte Konfiguration; neue lesen die neue."
fi

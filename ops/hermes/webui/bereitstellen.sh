#!/usr/bin/env bash
# NeXify · Erweiterungsordner für Hermes WebUI zusammenstellen (Graphite-Skin).
#
# Kopiert die Gestaltungsdateien aus ops/hermes/webui sowie Schriften und Icons aus
# apps/web/public (eine Quelle, keine zweite Kopie im Repository) in einen Zielordner,
# den die Oberfläche über HERMES_WEBUI_EXTENSION_DIR ausliefert. Das Skript startet
# nichts neu, ändert keine Konfiguration und löscht nichts. Ohne --anwenden zeigt es
# nur, was es täte. Ein vorhandener Zielordner wird vorher als <ziel>.vorher-<Zeit>
# daneben gesichert (Rückweg: diesen Ordner zurückbenennen).
set -euo pipefail

HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HIER/../../.." && pwd)"
ZIEL="/opt/nexify/hermes-webui-ext"
ANWENDEN=false

while [ $# -gt 0 ]; do
    case "$1" in
        --ziel) [ $# -ge 2 ] || { echo "--ziel braucht einen Wert" >&2; exit 2; }; ZIEL="$2"; shift 2 ;;
        --anwenden) ANWENDEN=true; shift ;;
        -h|--help) echo "Aufruf: bereitstellen.sh [--ziel DIR] [--anwenden]"; exit 0 ;;
        *) echo "unbekannte Option: $1" >&2; exit 2 ;;
    esac
done

DATEIEN="nexify-graphite.css nexify-graphite.js extensions.json app-manifest.json"
SCHRIFTEN="inter-latin.woff2 jakarta-latin.woff2 geist-mono-latin.woff2"
ICONS="icon-192.png icon-512.png icon-maskable-512.png"

for f in $DATEIEN; do [ -f "$HIER/$f" ] || { echo "ABBRUCH: $HIER/$f fehlt" >&2; exit 1; }; done
for f in $SCHRIFTEN; do [ -f "$REPO/apps/web/public/fonts/$f" ] || { echo "ABBRUCH: Schrift $f fehlt" >&2; exit 1; }; done
for f in $ICONS; do [ -f "$REPO/apps/web/public/$f" ] || { echo "ABBRUCH: Icon $f fehlt" >&2; exit 1; }; done
python3 "$HIER/pruefe-gestaltung.py" >/dev/null || { echo "ABBRUCH: Gestaltung weicht von config/design-tokens.json ab" >&2; exit 1; }

echo "Ziel: $ZIEL"
echo "Dateien: $DATEIEN · fonts/: $SCHRIFTEN · icons/: $ICONS"
if [ "$ANWENDEN" = false ]; then
    echo "Trockenlauf: nichts geändert. Mit --anwenden ausführen."
    exit 0
fi

NEU="$ZIEL.neu-$$"
mkdir -p "$NEU/fonts" "$NEU/icons"
for f in $DATEIEN; do install -m 644 "$HIER/$f" "$NEU/$f"; done
for f in $SCHRIFTEN; do install -m 644 "$REPO/apps/web/public/fonts/$f" "$NEU/fonts/$f"; done
for f in $ICONS; do install -m 644 "$REPO/apps/web/public/$f" "$NEU/icons/$f"; done
(cd "$NEU" && find . -type f | sort | xargs sha256sum > MANIFEST.sha256)
if [ -e "$ZIEL" ]; then
    VORHER="$ZIEL.vorher-$(date -u +%Y%m%dT%H%M%SZ)"
    mv "$ZIEL" "$VORHER"
    echo "Bisheriger Stand gesichert: $VORHER"
fi
mv "$NEU" "$ZIEL"
echo "Bereitgestellt: $ZIEL ($(find "$ZIEL" -type f | wc -l) Dateien)"
echo "Wirksam erst, wenn die Oberfläche mit HERMES_WEBUI_EXTENSION_DIR und"
echo "HERMES_WEBUI_EXTENSION_MANIFEST=extensions.json gestartet ist (siehe webui.env.example)."

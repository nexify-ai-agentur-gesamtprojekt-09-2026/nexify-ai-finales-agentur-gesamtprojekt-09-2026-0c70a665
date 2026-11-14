#!/usr/bin/env bash
# NeXify · Erweiterungsordner für Hermes WebUI zusammenstellen (Graphite-Skin).
#
# Kopiert die Gestaltungsdateien aus ops/hermes/webui sowie Schriften und Icons aus
# apps/web/public (eine Quelle, keine zweite Kopie im Repository) in einen Zielordner,
# den die Oberfläche über HERMES_WEBUI_EXTENSION_DIR ausliefert. Das Skript startet
# nichts neu, ändert keine Konfiguration und löscht nichts. Ohne --anwenden zeigt es
# nur, was es täte.
#
# Der Zielordner selbst bleibt bestehen und wird Datei für Datei aktualisiert: Ein
# laufender Container hat den Ordner eingehängt, und ein Austausch durch Umbenennen
# würde ihn weiter den alten Ordner sehen lassen. Vor jeder Änderung entsteht daneben
# eine vollständige Kopie <ziel>.vorher-<Zeit>-<pid>; --zurueck spielt sie zurück.
set -euo pipefail

HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HIER/../../.." && pwd)"
ZIEL="/opt/nexify/hermes-webui-ext"
ZURUECK=""
ANWENDEN=false

while [ $# -gt 0 ]; do
    case "$1" in
        --ziel|--zurueck)
            [ $# -ge 2 ] || { echo "$1 braucht einen Wert" >&2; exit 2; }
            if [ "$1" = --ziel ]; then ZIEL="$2"; else ZURUECK="$2"; fi
            shift 2 ;;
        --anwenden) ANWENDEN=true; shift ;;
        -h|--help)
            echo "Aufruf: bereitstellen.sh [--ziel DIR] [--anwenden]"
            echo "        bereitstellen.sh --zurueck SICHERUNGSORDNER [--ziel DIR] [--anwenden]"
            exit 0 ;;
        *) echo "unbekannte Option: $1" >&2; exit 2 ;;
    esac
done

abbruch() { printf 'ABBRUCH: %s\n' "$*" >&2; exit 1; }
MANIFEST="MANIFEST.sha256"
BELEG="SICHERUNG.sha256"
# Prüfsummen aller Nutzdateien; das Manifest selbst steht nicht darin.
manifest_schreiben() { (cd "$1" && find . -type f ! -name "$MANIFEST" | sort | xargs -r sha256sum > "$MANIFEST"); }

SPERRE="$ZIEL.sperre"
ARBEIT=""
aufraeumen() {
    [ -z "$ARBEIT" ] || rm -rf "${ARBEIT:?}"
    rmdir "$SPERRE" 2>/dev/null || true
}
sperren() {
    mkdir -p "$(dirname "$ZIEL")"
    mkdir "$SPERRE" 2>/dev/null || abbruch "Ein anderer Lauf arbeitet an $ZIEL (Sperre $SPERRE). Liegt sie nach einem Abbruch noch da: rmdir $SPERRE"
    trap aufraeumen EXIT
}
sichern() {
    [ -d "$ZIEL" ] || return 0
    VORHER="$ZIEL.vorher-$(date -u +%Y%m%dT%H%M%SZ)-$$"
    [ ! -e "$VORHER" ] || abbruch "Sicherungsordner $VORHER gibt es schon."
    cp -a "$ZIEL" "$VORHER"
    # Hält fest, was beim Sichern tatsächlich im Ordner lag, auch wenn es vom Manifest abwich.
    (cd "$VORHER" && find . -type f ! -name "$BELEG" | sort | xargs -r sha256sum > "$BELEG")
    echo "Bisheriger Stand gesichert: $VORHER"
    echo "Rückweg: $0 --zurueck $VORHER --ziel $ZIEL --anwenden"
}
# Dateien einzeln und je Datei atomar in den bestehenden Ordner legen.
einlegen() {
    local quelle="$1" datei
    (cd "$quelle" && find . -type f ! -name "$BELEG" | sort) | while read -r datei; do
        mkdir -p "$ZIEL/$(dirname "$datei")"
        install -m 644 "$quelle/$datei" "$ZIEL/$datei.neu-$$"
        mv -f "$ZIEL/$datei.neu-$$" "$ZIEL/$datei"
    done
}

# --- Rückweg -----------------------------------------------------------------
if [ -n "$ZURUECK" ]; then
    [ -f "$ZURUECK/$BELEG" ] || abbruch "$ZURUECK ist keine Sicherung dieses Skripts."
    (cd "$ZURUECK" && sha256sum --quiet -c "$BELEG") || abbruch "Sicherung beschädigt."
    echo "zurück: $ZURUECK → $ZIEL"
    if [ "$ANWENDEN" = false ]; then echo "Trockenlauf: nichts geändert. Mit --anwenden ausführen."; exit 0; fi
    sperren
    sichern
    mkdir -p "$ZIEL"
    einlegen "$ZURUECK"
    (cd "$ZIEL" && sha256sum --quiet -c "$ZURUECK/$BELEG") || abbruch "Zielordner stimmt nach dem Rückweg nicht mit der Sicherung überein."
    echo "Rückweg ausgeführt. Dateien, die es in der Sicherung nicht gab, bleiben liegen und werden nicht geladen."
    exit 0
fi

# --- Bereitstellen -------------------------------------------------------------
DATEIEN="nexify-graphite.css nexify-graphite.js extensions.json app-manifest.json"
SCHRIFTEN="inter-latin.woff2 jakarta-latin.woff2 geist-mono-latin.woff2"
ICONS="icon-192.png icon-512.png icon-maskable-512.png"

for f in $DATEIEN; do [ -f "$HIER/$f" ] || abbruch "$HIER/$f fehlt"; done
for f in $SCHRIFTEN; do [ -f "$REPO/apps/web/public/fonts/$f" ] || abbruch "Schrift $f fehlt"; done
for f in $ICONS; do [ -f "$REPO/apps/web/public/$f" ] || abbruch "Icon $f fehlt"; done
python3 "$HIER/pruefe-gestaltung.py" >/dev/null || abbruch "Gestaltung weicht von config/design-tokens.json ab"

echo "Ziel: $ZIEL"
echo "Dateien: $DATEIEN · fonts/: $SCHRIFTEN · icons/: $ICONS"
if [ "$ANWENDEN" = false ]; then
    echo "Trockenlauf: nichts geändert. Mit --anwenden ausführen."
    exit 0
fi

sperren
ARBEIT="$(mktemp -d)"
mkdir -p "$ARBEIT/fonts" "$ARBEIT/icons"
for f in $DATEIEN; do cp "$HIER/$f" "$ARBEIT/$f"; done
for f in $SCHRIFTEN; do cp "$REPO/apps/web/public/fonts/$f" "$ARBEIT/fonts/$f"; done
for f in $ICONS; do cp "$REPO/apps/web/public/$f" "$ARBEIT/icons/$f"; done
manifest_schreiben "$ARBEIT"

if [ -d "$ZIEL" ] && [ -f "$ZIEL/$MANIFEST" ] && cmp -s "$ARBEIT/$MANIFEST" "$ZIEL/$MANIFEST" \
    && (cd "$ZIEL" && sha256sum --quiet -c "$MANIFEST" 2>/dev/null); then
    echo "Nichts zu tun: $ZIEL entspricht bereits diesem Stand."
    exit 0
fi

sichern
mkdir -p "$ZIEL"
einlegen "$ARBEIT"
(cd "$ZIEL" && sha256sum --quiet -c "$MANIFEST") || abbruch "Zielordner stimmt nach dem Schreiben nicht mit dem Manifest überein."
echo "Bereitgestellt: $ZIEL ($(cd "$ZIEL" && grep -c . "$MANIFEST") Dateien und $MANIFEST)"
echo "Prüfung: (cd $ZIEL && sha256sum -c $MANIFEST)"
echo "Ein laufender Container sieht die Dateien sofort (gleicher Ordner); geladen werden sie beim"
echo "nächsten Seitenaufruf. Erstmals wirksam erst, wenn die Oberfläche mit HERMES_WEBUI_EXTENSION_DIR"
echo "und HERMES_WEBUI_EXTENSION_MANIFEST=extensions.json gestartet ist (siehe webui.env.example)."

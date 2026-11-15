#!/usr/bin/env bash
# Markenzeichen-Sperre: additive, NUR LESENDE Pruefung, dass das sichtbare Design
# unveraendert gegen den eingefrorenen Normstand ist. Aendert nichts, misst nichts
# neu. Exit 0 = unveraendert; Exit 1 = Drift (mit Hinweis auf Sperrregel und
# Rueckweg); Exit 2 = Manifest nicht gefunden.
#
# Norm: docs/01-konzept/markenzeichen-normstand-2026-11-14.sha256 (sha256 der
# sichtbaren Designdateien). Die Pfade im Manifest sind repo-root-relativ; dieses
# Skript wird aus dem Repo-Wurzelverzeichnis aufgerufen (so in `make check`).
# Ein optionaler erster Parameter erlaubt ein anderes Manifest (fuer Tests).
set -u

MANIFEST="${1:-docs/01-konzept/markenzeichen-normstand-2026-11-14.sha256}"

if [ ! -f "$MANIFEST" ]; then
  echo "Markenzeichen-Sperre: Normstand-Manifest nicht gefunden: $MANIFEST" >&2
  exit 2
fi

if out="$(sha256sum -c --strict "$MANIFEST" 2>&1)"; then
  anzahl="$(printf '%s\n' "$out" | grep -c ': OK$' || true)"
  echo "Markenzeichen-Sperre: Design unveraendert gegen den Normstand (${anzahl} Dateien geprueft, ${MANIFEST})."
  exit 0
fi

echo "Markenzeichen-Sperre: DESIGN-DRIFT erkannt. Das sichtbare Design ist eingefroren (Inhaberweisung 14.11.2026)." >&2
echo "Abweichende Pruefungen:" >&2
printf '%s\n' "$out" | grep -Ev ': OK$' >&2
echo >&2
echo "Regel:   docs/01-konzept/markenzeichen-2026-11-14.md (Design-Sperre; der Gleichmacher ist der Waechter)." >&2
echo "Rueckweg: docs/01-konzept/markenzeichen-sicherung-2026-11-14.md, Abschnitt 'Rueckweg bei Design-Drift'." >&2
echo "Eine gewollte Aenderung braucht Inhaberfreigabe und wird dort belegt fortgeschrieben;" >&2
echo "das Manifest wird NICHT still angepasst, um diese Pruefung gruen zu bekommen." >&2
exit 1

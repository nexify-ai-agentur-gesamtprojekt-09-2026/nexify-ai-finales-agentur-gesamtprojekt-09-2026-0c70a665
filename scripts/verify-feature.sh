#!/usr/bin/env bash
# verify-feature.sh — prueft ein Feature mehrschichtig (Layer 1..3) aus feature_list.json.
set -euo pipefail
cd "$(dirname "$0")/.."
id="${1:-}"
[[ -z "$id" ]] && { echo "Nutzung: verify-feature.sh <id>"; exit 2; }
# Alle Verifier halten denselben Lock bis nach dem atomaren Nachweis-Write.
# Andere Werkzeuge, die feature_list.json schreiben, muessen diesen Lock teilen.
mkdir -p .harness
exec 9>.harness/feature-verification.lock
flock -n 9 || { echo "Feature-Verifikation bereits aktiv" >&2; exit 75; }
row="$(node --input-type=commonjs - "$id" <<'NODE'
const fs = require('node:fs');
const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const feature = data.features.find(item => item.id === process.argv[2]);
if (!feature) throw new Error('Unbekannte Feature-ID');
if (!['active', 'passing'].includes(feature.state)) throw new Error('Feature muss vor der Verifikation active sein');
if (data.features.filter(item => item.state === 'active').length > 1) throw new Error('WIP=1 verletzt');
if (!Array.isArray(feature.layers) || !feature.layers.length || feature.layers.some(layer => typeof layer.cmd !== 'string' || !layer.cmd.trim())) throw new Error('Feature benoetigt mindestens einen nichtleeren Prueflayer');
process.stdout.write(JSON.stringify(feature));
NODE
)" || exit 1
echo "Feature $id — $(node -e "process.stdout.write(JSON.parse(process.argv[1]).behavior)" "$row")"
n=$(node -e "process.stdout.write(String(JSON.parse(process.argv[1]).layers.length))" "$row")
for i in $(seq 0 $((n-1))); do
  label="$(node -e "process.stdout.write(JSON.parse(process.argv[1]).layers[$i].label)" "$row")"
  cmd="$(node -e "process.stdout.write(JSON.parse(process.argv[1]).layers[$i].cmd)" "$row")"
  repair="$(node -e "process.stdout.write(JSON.parse(process.argv[1]).layers[$i].repair)" "$row")"
  echo "-> $label: $cmd"
  if ! bash -euo pipefail -c "$cmd" 9>&-; then
    echo "FAIL $id @ $label"; echo "WHAT: $(node -e "process.stdout.write(JSON.parse(process.argv[1]).behavior)" "$row")"
    echo "WHY:  Feature darf nicht passing sein, solange ein Layer rot ist."; echo "FIX:  $repair"; exit 1
  fi
done
# Nur dieser erfolgreiche Pruefpfad darf active -> passing protokollieren.
# Ein fehlgeschlagener Layer erreicht den Recorder nicht; waehrend der Pruefung
# geaenderte Featuredefinitionen duerfen keinen veralteten Nachweis erhalten.
node --input-type=commonjs - "$id" "$row" <<'NODE'
const fs = require('node:fs');
const [id, snapshot] = process.argv.slice(2);
const filename = 'feature_list.json';
const original = fs.readFileSync(filename, 'utf8');
const data = JSON.parse(original);
const feature = data.features.find(item => item.id === id);
if (!feature || JSON.stringify(feature) !== snapshot) throw new Error('Featuredefinition waehrend der Pruefung geaendert');
if (data.features.filter(item => item.state === 'active').length > 1) throw new Error('WIP=1 verletzt');
if (!['active', 'passing'].includes(feature.state)) throw new Error('Feature muss vor der Verifikation active sein');
if (feature.state === 'active') {
  feature.state = 'passing';
  feature.verified_at = new Date().toISOString();
  feature.evidence = `make verify-feature F=${id}: alle ${feature.layers.length} Layer bestanden; lokaler technischer Nachweis, keine Produktivabnahme`;
  const temporary = filename + '.' + process.pid + '.verify.tmp';
  try {
    fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + '\n', { mode: fs.statSync(filename).mode });
    if (fs.readFileSync(filename, 'utf8') !== original) throw new Error('Featureliste waehrend der Speicherung geaendert');
    fs.renameSync(temporary, filename);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
NODE
echo "PASS $id — alle $n Layer gruen (technisch verifiziert, keine Produktivabnahme)"

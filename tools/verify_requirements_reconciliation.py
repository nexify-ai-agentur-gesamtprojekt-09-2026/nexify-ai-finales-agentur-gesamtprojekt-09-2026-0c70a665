"""Validate the existing acceptance register and render its derived human view.

No execution queue, authority assignment or runtime acceptance is created here.
"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTER = Path('config/acceptance-coverage.json')
VIEW = Path('docs/contracts/requirements-reconciliation.md')


def validate(document, root):
    errors = []
    if str(REGISTER) in document.get('source_sha256', {}):
        errors.append('Register self-hash is recursive; bind it with commit/package manifest instead')
    record = document.get('requirements_reconciliation', {})
    if record.get('all_original_chats_recovered') is not False or record.get('raw_private_notes_imported') is not False:
        errors.append('Recovery and privacy boundaries must remain explicit')
    sources = record.get('sources', [])
    ids = [source.get('id') for source in sources]
    if not all(ids) or len(ids) != len(set(ids)):
        errors.append('Missing or duplicate source ID')
    for source in sources:
        if not all(source.get(field) for field in ('locator', 'role', 'acquisition', 'scope')):
            errors.append('Incomplete source provenance')
        if source.get('acquisition') == 'parent_verified_excerpt' and source.get('original_seen_here') is not False:
            errors.append('Reported excerpt cannot be a direct original read')
    requirements = record.get('requirements', [])
    row_ids = [row.get('requirement_id') for row in requirements]
    if not requirements or not all(row_ids) or len(row_ids) != len(set(row_ids)):
        errors.append('Missing or duplicate requirement ID')
    for row in requirements:
        if not row.get('source_ids') or set(row['source_ids']) - set(ids):
            errors.append('Unresolved requirement source')
        for field in ('applicable_requirement', 'interpretation', 'test_evidence', 'actual_delivery',
                      'gap', 'next_step', 'completion_criterion', 'owner_area'):
            if not row.get(field):
                errors.append('Incomplete requirement: ' + field)
        if row.get('full_requirement_accepted') is not False:
            errors.append('This bounded reconciliation cannot grant full acceptance')
        for relative in row.get('implementation_files', []):
            path = root / relative
            if (Path(relative).is_absolute() or '..' in Path(relative).parts
                    or path.is_symlink() or not path.resolve().is_relative_to(root.resolve())
                    or not path.is_file()):
                errors.append('Invalid implementation source: ' + relative)
            elif relative != str(REGISTER):
                expected = document.get('source_sha256', {}).get(relative)
                if expected is None:
                    errors.append('Unbound implementation source: ' + relative)
                elif expected != hashlib.sha256(path.read_bytes()).hexdigest():
                    errors.append('Stale implementation source: ' + relative)
    return errors


def render(document):
    record = document['requirements_reconciliation']
    lines = ['# Quellengebundener Soll-Ist-Abgleich', '',
             'Automatisch abgeleitete Ansicht von config/acceptance-coverage.json; keine zweite Queue oder Originaltranskription.',
             'Geprüfte Ausgangsbasis: ' + record['baseline_commit'] + '. Vollständige Laufzeitabnahme bleibt offen.', '', '## Quellen', '']
    for source in record['sources']:
        lines.append(f"- {source['id']}: {source['role']}; Datum {source.get('source_date') or 'unbekannt'}; {source['acquisition']}; {source['locator']}. Umfang: {source['scope']}")
    lines += ['', '## Soll / Ist / Abschluss', '']
    for row in record['requirements']:
        lines += [f"### {row['requirement_id']}", '',
                  f"Soll ({', '.join(row['source_ids'])}): {row['applicable_requirement']}",
                  'Einordnung: ' + row['interpretation'],
                  'Dateien/Funktionen: ' + ', '.join(row['implementation_files']),
                  'Beleg: ' + row['test_evidence'],
                  'Auslieferung: ' + row['actual_delivery'] + '; keine Gesamtanforderung abgenommen.',
                  'Lücke: ' + row['gap'],
                  f"Nächster Schritt ({row['owner_area']}): {row['next_step']}",
                  'Abschluss: ' + row['completion_criterion'], '']
    return '\n'.join(lines).rstrip() + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--render', action='store_true')
    args = parser.parse_args()
    document = json.loads((ROOT / REGISTER).read_text())
    errors = validate(document, ROOT)
    if not errors:
        expected = render(document)
        if args.render:
            (ROOT / VIEW).write_text(expected)
        elif (ROOT / VIEW).read_text() != expected:
            errors.append('Derived requirement view is stale; run --render')
    for error in errors:
        print('FAIL: ' + error)
    if not errors:
        print('Requirements reconciliation valid; no runtime acceptance granted')
    return bool(errors)


if __name__ == '__main__':
    raise SystemExit(main())

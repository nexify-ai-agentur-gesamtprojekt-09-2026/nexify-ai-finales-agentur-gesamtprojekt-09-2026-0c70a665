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


def validate_legal_footer_evidence(root):
    """Stored local measurements only; never run a browser or grant acceptance."""
    errors = []
    def read_fixed(relative):
        path = root / relative
        if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()):
            raise ValueError('Unsafe fixed evidence/source path')
        return path
    try:
        mapping = json.loads(read_fixed('config/site-map.json').read_text())
        pages = {p['path']: p for p in mapping['pages'] if p['id'] in mapping['public_allowlist']
                 and p['access']['visibility'] == 'public' and p['access']['auth_required'] is False}
        locales, widths = ('de', 'nl', 'fr'), (320, 1280)
        expected = {(path, locale, width) for path in pages for locale in locales for width in widths}
        interactions = {(path, locale, width) for path in ('/', '/teileklar') for locale in locales for width in widths}
        sources = ('apps/web/components/SiteFooter.tsx', 'apps/web/components/WorkspaceRebuild.css',
                   'config/site-map.json', 'apps/site/tests/browser-legal-footer.mjs')
        current = {p: hashlib.sha256(read_fixed(p).read_bytes()).hexdigest() for p in sources}
        key = lambda row: (row.get('path'), row.get('locale'), row.get('width'))
        for name in ('browser.json', 'next-browser.json'):
            report = json.loads(read_fixed('evidence/legal-footer-2026-10-28/' + name).read_text())
            rows, actions = report.get('views', []), report.get('interaction', [])
            renderer = 'Vite-local' if name == 'browser.json' else 'Next-local'
            valid = (report.get('renderer') == renderer and report.get('passed') is True and type(report.get('external_requests')) is int
                     and report.get('external_requests') == 0
                     and report.get('page_errors') == [] and report.get('source_sha256') == current
                     and len(rows) == len(expected) and {key(r) for r in rows} == expected
                     and len(actions) == len(interactions) and {key(r) for r in actions} == interactions)
            for row in rows:
                context = pages.get(row.get('path'), {}).get('site_context')
                paths = ['/teileklar/rechtliches'] if context == 'teileklar' else ['/impressum', '/datenschutz']
                valid = valid and (row.get('passed') is True and row.get('legal_context') == context
                                   and type(row.get('width')) is int
                                   and row.get('legal_paths') == paths and row.get('legal_disclosures') == 1
                                   and type(row.get('legal_disclosures')) is int
                                   and type(row.get('all_pages_disclosures_outside')) is int
                                   and row.get('all_pages_disclosures_outside') == 1)
            valid = valid and all(all(row.get(k) is True for k in
                    ('passed', 'keyboard_open_close', 'direct_links', 'back_reload')) for row in actions)
            if not valid:
                errors.append('Incomplete or stale legal footer browser evidence: ' + name)
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        errors.append('Unreadable or malformed legal footer browser evidence')
    return errors


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
    if not errors and any(row.get('requirement_id') == 'REC-LEGAL-FOOTER-01' for row in requirements):
        errors.extend(validate_legal_footer_evidence(root))
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

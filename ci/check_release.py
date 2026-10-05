import datetime, hashlib, json, os, pathlib, re, sys

def require(condition, message):
    if not condition:
        raise ValueError(message)

def local_file(value):
    require(isinstance(value, str) and value, 'Dateireferenz fehlt')
    root = pathlib.Path.cwd().resolve()
    path = (root / value).resolve()
    require(path.is_relative_to(root), 'Pfad verlässt das Repository')
    require(path.is_file() and path.stat().st_size > 0, 'Leerer/fehlender Nachweis: ' + value)
    return path

def main():
    required = json.loads(pathlib.Path(sys.argv[1]).read_text())
    evidence = json.loads(pathlib.Path(sys.argv[2]).read_text())
    commit = os.environ.get('RELEASE_COMMIT', '')
    require(bool(re.fullmatch(r'[0-9a-f]{40}', commit)), 'RELEASE_COMMIT fehlt/ungültig')
    require(evidence['commit_sha'] == commit, 'Nachweise gehören zu anderem Commit')
    now = datetime.datetime.now(datetime.timezone.utc)
    tested = datetime.datetime.fromisoformat(evidence['tested_at'].replace('Z', '+00:00'))
    require(tested.tzinfo is not None, 'tested_at benötigt Zeitzone')
    require(datetime.timedelta(0) <= now - tested <= datetime.timedelta(days=7), 'Nachweise älter als 7 Tage oder aus Zukunft')
    artifact = local_file(evidence['artifact']['path'])
    digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
    require(digest == evidence['artifact']['sha256'], 'Artefakt-Prüfsumme abweichend')
    require(not evidence.get('open_blockers', []), 'Offene Releaseblocker')
    wanted = {r['id'] for r in required['requirements']}
    require(len(wanted) == len(required['requirements']), 'Doppelte Anforderungs-ID')
    rows = evidence['requirements']
    require({r['id'] for r in rows} == wanted and len(rows) == len(wanted), 'Nachweise fehlen, sind doppelt oder unbekannt')
    for row in rows:
        require(row['status'] in ('pass', 'not_applicable'), 'Nicht bestandene Anforderung: ' + row['id'])
        require(bool(row.get('owner')), 'Verantwortliche Rolle fehlt')
        if row['status'] == 'not_applicable':
            require(bool(row.get('rationale')) and bool(row.get('approved_by')), 'Nichtanwendung unbegründet/unfreigegeben')
        else:
            require(bool(row.get('evidence_paths')), 'Belege fehlen: ' + row['id'])
            for path in row['evidence_paths']:
                local_file(path)
    roles = {'technical', 'domain', 'privacy_legal', 'operations'}
    approvals = evidence['approvals']
    require({a['role'] for a in approvals} == roles and len(approvals) == len(roles), 'Abnahmen fehlen/dupliziert')
    for approval in approvals:
        require(bool(approval.get('reviewer')) and approval.get('commit_sha') == commit, 'Abnahme nicht passend')
        local_file(approval['evidence_path'])
    print('Release-Nachweisstruktur und Artefakt-Hash gültig für ' + commit)

if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, TypeError, OSError, json.JSONDecodeError) as error:
        print('BLOCKED: ' + str(error), file=sys.stderr)
        sys.exit(1)

#!/usr/bin/env python3
"""Local SEO research staging. No publishing, network access or business coverage grants."""
import argparse
import csv
import hashlib
import io
import json
import re
import sqlite3
import unicodedata
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

COUNTRIES = {'DE', 'AT', 'CH', 'NL', 'BE'}
PPL_CODES = {'PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPLA5', 'PPLC', 'PPLF', 'PPLG', 'PPLL', 'PPLR', 'PPLS', 'PPLX'}
QUALITIES = {'measured_estimate', 'range', 'unavailable'}
KEYWORD_COLUMNS = {'keyword', 'country', 'language', 'period', 'monthly_volume', 'source', 'source_observed_at', 'metric_quality'}
SCHEMA = """
CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT OR IGNORE INTO metadata VALUES ('schema_version','1');
CREATE TABLE IF NOT EXISTS geo_source (
 id TEXT PRIMARY KEY, country TEXT NOT NULL, source TEXT NOT NULL,
 version TEXT NOT NULL, license TEXT NOT NULL, sha256 TEXT NOT NULL,
 UNIQUE(country,source,version));
CREATE TABLE IF NOT EXISTS city (
 id TEXT PRIMARY KEY, geoname_id TEXT NOT NULL, country TEXT NOT NULL,
 name TEXT NOT NULL, canonical_slug TEXT NOT NULL UNIQUE,
 latitude REAL NOT NULL, longitude REAL NOT NULL, feature_code TEXT NOT NULL,
 city_type_status TEXT NOT NULL DEFAULT 'populated_place_not_verified_official_city');
CREATE TABLE IF NOT EXISTS city_source (
 city_id TEXT NOT NULL REFERENCES city(id), source_id TEXT NOT NULL REFERENCES geo_source(id),
 PRIMARY KEY(city_id,source_id));
CREATE TABLE IF NOT EXISTS alias (
 city_id TEXT NOT NULL REFERENCES city(id), name TEXT NOT NULL,
 PRIMARY KEY(city_id,name));
CREATE TABLE IF NOT EXISTS landing_page_draft (
 city_id TEXT PRIMARY KEY REFERENCES city(id), status TEXT NOT NULL DEFAULT 'draft',
 robots TEXT NOT NULL DEFAULT 'noindex,nofollow', published INTEGER NOT NULL DEFAULT 0 CHECK(published=0),
 service_coverage_verified INTEGER NOT NULL DEFAULT 0 CHECK(service_coverage_verified=0),
 office_address TEXT CHECK(office_address IS NULL), brief_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS keyword_measurement (
 id TEXT PRIMARY KEY, tenant TEXT NOT NULL, project TEXT NOT NULL,
 keyword TEXT NOT NULL, keyword_key TEXT NOT NULL, country TEXT NOT NULL,
 language TEXT NOT NULL, period TEXT NOT NULL, monthly_volume INTEGER CHECK(monthly_volume>=0),
 volume_raw TEXT NOT NULL, source TEXT NOT NULL, source_observed_at TEXT NOT NULL,
 metric_quality TEXT NOT NULL, cluster TEXT NOT NULL, keyword_role TEXT NOT NULL,
 main_keyword TEXT, intent TEXT NOT NULL, evidence TEXT NOT NULL, input_sha256 TEXT NOT NULL,
 UNIQUE(tenant,project,keyword_key,country,language,period,source));
"""


def stable_id(*parts):
    return hashlib.sha256(json.dumps(parts, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def clean_reference(value):
    """Remove URL credentials, all query strings and fragments before persistence/readback."""
    value = value.strip()
    if not value:
        raise ValueError('Source/license/evidence reference must not be empty')
    if '://' in value:
        url = urlsplit(value)
        if url.scheme not in {'https', 'http'} or not url.hostname:
            raise ValueError('Only HTTP(S) source references are accepted')
        host = url.hostname
        if ':' in host:
            host = '[' + host + ']'
        if url.port:
            host += ':' + str(url.port)
        # Also redact common tokens accidentally placed in URL paths.
        path = re.sub(r'(?i)(?:sk[-_](?:live|test)[-_]|sk-or-v1-)[A-Za-z0-9_-]+', '[redacted]', url.path)
        return urlunsplit((url.scheme, host, path, '', ''))
    if '@' in value or re.search(r'(?i)(?:api[_-]?key|secret|token|password)\s*[:=]', value):
        raise ValueError('Use a public source identifier; credentials are not evidence')
    return value


def local_input(path, suffix):
    path = Path(path).absolute()
    if path.suffix.lower() != suffix or not path.is_file():
        raise ValueError('Expected an existing local ' + suffix + ' file')
    if any(p.is_symlink() for p in [path, *path.parents]):
        raise ValueError('Symlink input paths are not accepted')
    raw = path.read_bytes()
    return raw.decode('utf-8-sig'), hashlib.sha256(raw).hexdigest()


def connect(path):
    path = Path(path).absolute()
    base = (Path.cwd() / '.local').resolve()
    if not path.resolve().is_relative_to(base) or path.suffix != '.sqlite3':
        raise ValueError('Staging database must be a .sqlite3 file below this repository .local directory')
    if any(p.is_symlink() for p in [path, *path.parents]):
        raise ValueError('Symlink database paths are not accepted')
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    path.chmod(0o600)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys=ON')
    connection.executescript(SCHEMA)
    if connection.execute("SELECT value FROM metadata WHERE key='schema_version'").fetchone()[0] != '1':
        raise ValueError('Unsupported staging schema version')
    return connection


def slug(name):
    ascii_name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower()
    return re.sub('[^a-z0-9]+', '-', ascii_name).strip('-') or 'place'


def country_code(value):
    value = value.strip().upper()
    if value not in COUNTRIES:
        raise ValueError('Country is outside the explicit candidate set DE/AT/CH/NL/BE')
    return value


def import_cities(db, path, country, source, license_name, version):
    country = country_code(country)
    source, license_name = clean_reference(source), clean_reference(license_name)
    if not version.strip():
        raise ValueError('Source version is required')
    content, digest = local_input(path, '.tsv')
    source_id = stable_id(country, source, version)
    included = skipped = 0
    with db:
        # Reserve the single SQLite writer before checking identity: no check/insert race.
        db.execute('BEGIN IMMEDIATE')
        prior = db.execute('SELECT sha256,license FROM geo_source WHERE id=?', (source_id,)).fetchone()
        if prior:
            if prior['sha256'] != digest or prior['license'] != license_name:
                raise ValueError('A source version is immutable; use a new version for changed bytes/license')
            # A known snapshot is readback only, even after a newer version changed city data.
            # Source insertion and all city writes commit together, so an existing source is complete.
            count = db.execute('SELECT COUNT(*) FROM city_source WHERE source_id=?', (source_id,)).fetchone()[0]
            return {'status': 'source_already_imported_readback', 'source_id': source_id,
                    'sha256': digest, 'included_records': count, 'skipped_records': None,
                    'all_official_cities_claimed': False, 'service_coverage_verified': False}
        db.execute('INSERT INTO geo_source VALUES (?,?,?,?,?,?)', (source_id, country, source, version, license_name, digest))
        for row in csv.reader(io.StringIO(content), delimiter='\t'):
            if not row:
                continue
            if len(row) != 19:
                raise ValueError('GeoNames input requires exactly 19 columns per record')
            if row[8] != country or row[6] != 'P' or row[7] not in PPL_CODES:
                skipped += 1
                continue
            if not row[0].isdigit() or not row[1].strip():
                raise ValueError('Invalid GeoNames identity/name')
            lat, lon = float(row[4]), float(row[5])
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                raise ValueError('Coordinates outside geographical bounds')
            city_id = country + ':' + row[0]
            canonical = country.lower() + '/' + slug(row[1]) + '-' + row[0]
            # Historical city rows are retained; a changed source cannot silently change an assigned URL.
            db.execute('''INSERT INTO city(id,geoname_id,country,name,canonical_slug,latitude,longitude,feature_code)
                          VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
                          name=excluded.name,latitude=excluded.latitude,longitude=excluded.longitude,feature_code=excluded.feature_code''',
                       (city_id, row[0], country, row[1].strip(), canonical, lat, lon, row[7]))
            for alias in {row[1], row[2], *row[3].split(',')}:
                if alias.strip():
                    db.execute('INSERT OR IGNORE INTO alias VALUES (?,?)', (city_id, alias.strip()))
            db.execute('INSERT OR IGNORE INTO city_source VALUES (?,?)', (city_id, source_id))
            brief = json.dumps({'kind': 'candidate_place_brief', 'research_required': True,
                                'unique_local_value_required': True, 'business_coverage_evidence': None,
                                'city_type_unverified': True, 'copy_generated': False}, sort_keys=True)
            db.execute('INSERT OR IGNORE INTO landing_page_draft(city_id,brief_json) VALUES (?,?)', (city_id, brief))
            included += 1
    return {'status': 'local_drafts_only', 'source_id': source_id, 'sha256': digest,
            'included_records': included, 'skipped_records': skipped,
            'all_official_cities_claimed': False, 'service_coverage_verified': False}


def scope(tenant, project):
    for value in (tenant, project):
        if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,127}', value):
            raise ValueError('Explicit opaque tenant/project identifiers required')
    return tenant, project


def import_keywords(db, path, tenant, project):
    scope(tenant, project)
    content, digest = local_input(path, '.csv')
    reader = csv.DictReader(io.StringIO(content))
    if not KEYWORD_COLUMNS.issubset(reader.fieldnames or []):
        raise ValueError('Missing required keyword CSV columns')
    imported = 0
    with db:
        for row in reader:
            keyword = row['keyword'].strip()
            if not keyword:
                raise ValueError('Keyword must not be empty')
            country = country_code(row['country'])
            language = row['language'].strip().lower()
            if not re.fullmatch('[a-z]{2}(?:-[a-z]{2})?', language):
                raise ValueError('Language must be an explicit language code')
            period = row['period'].strip()
            if not re.fullmatch(r'\d{4}-\d{2}', period):
                raise ValueError('Monthly period must be YYYY-MM')
            date.fromisoformat(period + '-01')
            observed = datetime.fromisoformat(row['source_observed_at'].strip().replace('Z', '+00:00'))
            if observed.tzinfo is None:
                raise ValueError('Observation timestamp requires timezone')
            if observed > datetime.now(timezone.utc):
                raise ValueError('Observation timestamp cannot be in the future')
            quality = row['metric_quality'].strip()
            if quality not in QUALITIES:
                raise ValueError('Unknown metric quality')
            period_start = date.fromisoformat(period + '-01')
            next_month = date(period_start.year + (period_start.month == 12), period_start.month % 12 + 1, 1)
            if quality == 'measured_estimate' and observed.date() < next_month:
                raise ValueError('Comparable measured monthly cohorts require a completed observation month')
            raw = row['monthly_volume'].strip()
            volume = int(raw) if raw.isdigit() else None
            if raw and volume is None and quality != 'range':
                raise ValueError('Volume must be a nonnegative integer or empty; ranges require range quality')
            if quality == 'unavailable' and raw:
                raise ValueError('Unavailable metrics require an empty volume')
            role = row.get('keyword_role', 'unassigned').strip() or 'unassigned'
            if role not in {'main', 'secondary', 'unassigned'}:
                raise ValueError('Keyword role must be main, secondary or unassigned')
            main = row.get('main_keyword', '').strip() or None
            if role == 'secondary' and not main:
                raise ValueError('Secondary keywords require a main_keyword relation')
            source = clean_reference(row['source'])
            evidence = clean_reference(row.get('evidence', '').strip() or source)
            key = ' '.join(keyword.casefold().split())
            uid = stable_id(tenant, project, key, country, language, period, source)
            values = (uid, tenant, project, keyword, key, country, language, period, volume, raw, source,
                      observed.isoformat(), quality, row.get('cluster', '').strip(), role, main,
                      row.get('intent', '').strip() or 'unclassified', evidence, digest)
            prior = db.execute('SELECT * FROM keyword_measurement WHERE id=?', (uid,)).fetchone()
            if prior and datetime.fromisoformat(prior['source_observed_at']) > observed:
                raise ValueError('Older observation cannot overwrite a newer scoped measurement')
            if prior and datetime.fromisoformat(prior['source_observed_at']) == observed and tuple(prior)[:-1] != values[:-1]:
                raise ValueError('Conflicting observations with identical identity/timestamp require evidence review')
            db.execute('''INSERT INTO keyword_measurement VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
             ON CONFLICT(id) DO UPDATE SET keyword=excluded.keyword, monthly_volume=excluded.monthly_volume,
             volume_raw=excluded.volume_raw, source_observed_at=excluded.source_observed_at,
             metric_quality=excluded.metric_quality,cluster=excluded.cluster,keyword_role=excluded.keyword_role,
             main_keyword=excluded.main_keyword,intent=excluded.intent,evidence=excluded.evidence,input_sha256=excluded.input_sha256''', values)
            imported += 1
    return {'status': 'staged_not_ranked', 'tenant': tenant, 'project': project, 'records': imported, 'sha256': digest}


def report(db, tenant, project):
    scope(tenant, project)
    rows = [dict(row) for row in db.execute('SELECT * FROM keyword_measurement WHERE tenant=? AND project=? ORDER BY id', (tenant, project))]
    return {'tenant': tenant, 'project': project, 'keyword_measurements': rows,
            'geo_catalog': {'places': db.execute('SELECT COUNT(*) FROM city').fetchone()[0],
                            'draft_pages': db.execute('SELECT COUNT(*) FROM landing_page_draft').fetchone()[0],
                            'publicly_published': 0, 'service_coverage_verified': False,
                            'country_scope': 'candidate_research_geographies_not_verified_business_coverage'}}


def plan(db, tenant, project, country, language, period, source):
    scope(tenant, project)
    source = clean_reference(source)
    rows = [dict(row) for row in db.execute('''SELECT * FROM keyword_measurement
      WHERE tenant=? AND project=? AND country=? AND language=? AND period=? AND source=? ORDER BY monthly_volume DESC,keyword_key''',
      (tenant, project, country_code(country), language.lower(), period, source))]
    mains = [row for row in rows if row['keyword_role'] == 'main']
    blockers = []
    if len(mains) < 10:
        blockers.append('At least ten explicitly designated main keywords required in one comparable cohort')
    if any(r['metric_quality'] != 'measured_estimate' or r['monthly_volume'] is None for r in rows):
        blockers.append('Missing, range or unavailable metrics block final ranking; estimates never imply exact search counts')
    if any(not r['cluster'] or r['intent'] == 'unclassified' for r in rows):
        blockers.append('Research must classify keyword cluster and intent before strategy')
    keys = {r['keyword_key'] for r in mains}
    if any(r['keyword_role'] == 'secondary' and ' '.join(r['main_keyword'].casefold().split()) not in keys for r in rows):
        blockers.append('Secondary keyword relation must resolve to a main keyword in the same cohort')
    top = [] if blockers else mains[:10]
    return {'status': 'research_incomplete' if blockers else 'measurement_ready_for_strategy_review',
            'tenant': tenant, 'project': project, 'cohort': dict(country=country.upper(), language=language.lower(), period=period, source=source),
            'blockers': blockers, 'top_ten': top,
            'secondary_keywords': [] if blockers else [r for r in rows if r['keyword_role'] == 'secondary' and ' '.join(r['main_keyword'].casefold().split()) in {x['keyword_key'] for x in top}],
            'copy_generation_authorized': False, 'publication_authorized': False,
            'quality_note': 'Measured estimates are approximate source metrics, not exact counts or a ranking/traffic guarantee.'}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db', default='.local/seo/catalog.sqlite3')
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('scan')
    cities = commands.add_parser('import-cities')
    for name in ['input', 'country', 'source', 'license', 'version']:
        cities.add_argument('--' + name, required=True)
    keywords = commands.add_parser('import-keywords')
    keywords.add_argument('--input', required=True)
    for cmd in [keywords, commands.add_parser('report'), commands.add_parser('plan')]:
        cmd.add_argument('--tenant', required=True);cmd.add_argument('--project', required=True)
    for name in ['country', 'language', 'period', 'source']:
        commands.choices['plan'].add_argument('--' + name, required=True)
    args = parser.parse_args(argv)
    try:
        with connect(args.db) as db:
            if args.command == 'scan':
                result = {'schema_version': 1, 'mode': 'local_nonproduction_staging', 'sources': [dict(x) for x in db.execute('SELECT * FROM geo_source ORDER BY id')], 'places': db.execute('SELECT COUNT(*) FROM city').fetchone()[0], 'keyword_scopes_redacted': True, 'network_or_publication_performed': False}
            elif args.command == 'import-cities':
                result = import_cities(db, args.input, args.country, args.source, args.license, args.version)
            elif args.command == 'import-keywords':
                result = import_keywords(db, args.input, args.tenant, args.project)
            elif args.command == 'report':
                result = report(db, args.tenant, args.project)
            else:
                result = plan(db, args.tenant, args.project, args.country, args.language, args.period, args.source)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (ValueError, OSError, sqlite3.Error, csv.Error):
        # Never echo untrusted rows, input URLs, paths or credentials on error.
        print(json.dumps({'status': 'rejected', 'reason': 'Invalid local input, evidence, scope or staging state; no publication performed'}))
        return 2


if __name__ == '__main__':
    raise SystemExit(main())

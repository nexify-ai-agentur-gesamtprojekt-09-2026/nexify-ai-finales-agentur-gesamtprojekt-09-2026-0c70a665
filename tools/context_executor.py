#!/usr/bin/env python3
"""Local, bounded evidence selector. Never executes extracted instructions."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat

ROOT = Path(__file__).resolve().parents[1]
CORE = ('AGENTS.md', 'config/llm-policy.json', 'config/source-boundaries.json',
        'config/selfservice-policy.json', 'config/operating-model.json', 'config/change-impact-policy.json')
ALIASES = {
    'llm': ('llm', 'chat', 'chatbot', 'agent', 'agentic', 'agenten', 'model', 'modell', 'inferenz', 'sdk', 'website', 'ki', 'ai', 'lightrag'),
    'seo': ('seo', 'geo', 'copy', 'keyword', 'marketing', 'suchmaschine', 'content'),
    'auth': ('auth', 'login', 'clerk', 'oauth', 'anmeldung'),
    'selfservice': ('selfservice', 'trial', 'byok', 'wallet', 'prepaid', 'registrierung'),
    'media': ('video', 'presenter', 'runway', 'elevenlabs', 'hero'),
    'operations': ('deploy', 'vercel', 'backup', 'dns', 'hostinger', 'betrieb', 'ressourcen', 'kapazität', 'kapazitaet', 'last', 'kosten', 'server', 'load', 'capacity', 'cpu', 'ram'),
    'standards': ('din', 'iso', 'wcag', 'accessibility', 'barrierefreiheit'),
}
DOCS = {
    'llm': ('docs/architecture/0015-vercel-agent-runtime.md', 'docs/contracts/factory-api-auth.md'),
    'seo': ('config/seo-workflow.json', 'docs/09-final/11-seo-kampagne-und-wettbewerb.md'),
    'auth': ('docs/contracts/factory-api-auth.md', 'docs/deployment/clerk-mcp.md'),
    'selfservice': ('docs/operating-model/NEXIFY-GESAMTSYSTEM.md',),
    'media': ('docs/contracts/hero-media.md', 'docs/research/presenter-options.md'),
    'operations': ('docs/deployment/react-backup.md', 'docs/architecture/0020-capacity-and-cost-planning.md'),
    'standards': ('docs/quality/standards-applicability.md',),
}
CHECKS = (
    ('repository_scope_and_user_authority', 'AGENTS.md'),
    ('managed_llm_exact_1017_high_no_fallback_and_separate_customer_byok', 'config/llm-policy.json'),
    ('agency_customer_and_tenant_boundaries', 'config/source-boundaries.json'),
    ('selfservice_trial_and_financial_authority', 'config/selfservice-policy.json'),
    ('delivery_before_go_to_market_sequence', 'config/operating-model.json'),
    ('change_impact_and_preserve_existing_work_before_cutover', 'config/change-impact-policy.json'),
)
TOKEN = re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----.*?-----END [^-]*PRIVATE KEY-----'
                   r'|\b(?:sk-(?:or-v1-|proj-)?[A-Za-z0-9_-]{16,}|(?:sk|rk)_(?:live|test)_[A-Za-z0-9_-]{16,}'
                   r'|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{16,}'
                   r'|AKIA[A-Z0-9]{16}|rot_[A-Za-z0-9_-]{16,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)', re.S)
ASSIGNMENT = re.compile(r'(?im)(["\']?[\w-]*(?:api[_-]?key|secret|password|passwd|token|authorization)[\w-]*["\']?\s*[:=]\s*)([^\n,]+)')


class SourceError(Exception):
    pass


def redact(text):
    def token(match):
        return '[REDACTED]' + '\n' * match[0].count('\n')
    text = TOKEN.sub(token, text)
    text = re.sub(r'(?i)\b(https?|postgres(?:ql)?|mongodb(?:\+srv)?|redis)://[^\s/:@]+:[^\s/@]+@',
                  lambda match: match[1] + '://[REDACTED]@', text)
    def assignment(match):
        value = match[2].strip().strip('"\'')
        if ((re.search(r'_env(?:_name)?["\']?\s*[:=]', match[1], re.I)
             and re.fullmatch(r'[A-Z_][A-Z0-9_]*', value)) or '${' in value
                or value in ('true', 'false', 'null', 'None') or 'os.environ' in value
                or 'process.env' in value or value == '[REDACTED]'):
            return match[0]
        return match[1] + '"[REDACTED]"'
    return ASSIGNMENT.sub(assignment, text)


def safe_relative(relative):
    if not isinstance(relative, str) or '\\' in relative or any(ord(c) < 32 for c in relative):
        raise SourceError('forbidden_source_path')
    parts = PurePosixPath(relative).parts
    if (not parts or PurePosixPath(relative).is_absolute() or '..' in parts
            or (relative != 'AGENTS.md' and parts[0] not in {'config', 'docs'})):
        raise SourceError('forbidden_source_path')
    forbidden = {'secrets', 'credentials', 'node_modules', 'reference', 'customer', 'customers', '.git', '.aws', '.ssh'}
    if (any(part.startswith('.') or part.lower() in forbidden or 'affilinet' in part.lower() for part in parts)
            or re.search(r'(?i)secret|credential|private[-_]?key|access[-_]?token|refresh[-_]?token', parts[-1])
            or PurePosixPath(relative).suffix.lower() not in {'.md', '.json'}):
        raise SourceError('forbidden_source_path')
    return parts


def read_source(root, relative, maximum):
    """Directory-FD traversal refuses links, including links in root ancestors."""
    parts = safe_relative(relative)
    opened = []
    try:
        fd = os.open('/', os.O_RDONLY | os.O_DIRECTORY)
        opened.append(fd)
        for part in Path(root).absolute().parts[1:] + parts[:-1]:
            fd = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            opened.append(fd)
        file_fd = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
        with os.fdopen(file_fd, 'rb') as stream:
            before = os.fstat(stream.fileno())
            if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1 or before.st_size > maximum:
                raise SourceError('source_type_or_byte_limit')
            raw = stream.read(maximum + 1)
            after = os.fstat(stream.fileno())
        if len(raw) > maximum or (before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_ino, after.st_size, after.st_mtime_ns):
            raise SourceError('source_changed_or_byte_limit')
        if not raw:
            raise SourceError('empty_source')
        return raw, raw.decode('utf-8')
    except FileNotFoundError:
        raise SourceError('source_missing') from None
    except (OSError, UnicodeError):
        raise SourceError('unsafe_or_unreadable_source') from None
    finally:
        for fd in reversed(opened):
            os.close(fd)


def task_groups(task):
    tokens = re.findall(r'[\w-]+', task.casefold())
    words = set(tokens)
    words.update(part for token in tokens for part in token.split('-') if part)
    return {group: sorted(words.intersection(aliases)) for group, aliases in ALIASES.items() if words.intersection(aliases)}


def md_sections(text):
    lines = text.splitlines(keepends=True)
    starts = [index for index, line in enumerate(lines) if re.match(r'^#{1,6}\s+', line)]
    if not starts or starts[0] != 0:
        starts.insert(0, 0)
    return [(start + 1, (starts[index + 1] if index + 1 < len(starts) else len(lines)),
             lines[start].strip().lstrip('#').strip()) for index, start in enumerate(starts)]


def json_field(text, key):
    match = re.search(r'^\s*' + re.escape(json.dumps(key)) + r'\s*:', text, re.M)
    if not match:
        return None
    offset = match.end()
    while offset < len(text) and text[offset].isspace():
        offset += 1
    _, length = json.JSONDecoder().raw_decode(text[offset:])
    return text.count('\n', 0, match.start()) + 1, text.count('\n', 0, offset + length) + 1, key


def citation(path, text, digest, interval, reason, active, limit=1300):
    start, end, heading = interval
    lines = text.splitlines(keepends=True)
    selected, size = [], 0
    for line in lines[start - 1:end]:
        if size + len(line.encode()) > limit:
            break
        selected.append(line)
        size += len(line.encode())
    if not selected:
        return None
    original = ''.join(selected)
    quote = redact(original)
    command_like = bool(re.search(r'(?i)\b(must|never|execute|run|ignore|muss|darf|verbot|ausführen|pflicht|before|zuerst)\b|```|^\s*(?:sudo|curl|rm|bash)\s', quote, re.M))
    category = 'constraint' if active and command_like else 'workflow' if active and ('sequence' in heading or 'workflow' in heading) else 'candidate_instruction' if command_like else 'fact'
    return {'path': path, 'start_line': start, 'end_line': start + len(selected) - 1,
            'source_sha256': digest, 'excerpt_sha256': hashlib.sha256(original.encode()).hexdigest(),
            'heading': redact(heading), 'quote': quote, 'redacted': quote != original,
            'excerpt_truncated': start + len(selected) - 1 < end, 'relevance': reason,
            'classification': category, 'source_role': 'active_policy_reference' if active else 'candidate_knowledge',
            'claim_verified': False, 'executable': False, 'grants_authority': False}


def encoded(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')


def build_context(task, *, root=ROOT, max_output_bytes=65536, max_records=24,
                  max_tokens=32768, max_read_bytes=524288, max_file_bytes=262144):
    if not isinstance(task, str) or not task.strip() or len(task.encode('utf-8')) > 4096:
        raise ValueError('invalid_task')
    limits = (max_output_bytes, max_records, max_tokens, max_read_bytes, max_file_bytes)
    if any(type(value) is not int or value < 1 for value in limits) or max_records > 128:
        raise ValueError('invalid_budget')
    if max_output_bytes < 256 or max_tokens < 256 or max_output_bytes > 262144 or max_read_bytes > 2097152 or max_file_bytes > 524288:
        raise ValueError('invalid_budget')
    budget = min(max_output_bytes, max_tokens) - 1  # Reserve CLI newline; not a tokeniser measurement.
    groups = task_groups(task)
    selected = dict.fromkeys(CORE)
    for group in groups:
        selected.update(dict.fromkeys(DOCS[group]))
    refs, citations, missing, read_bytes = [], [], [], 0
    for path in selected:
        active = path in CORE or path == 'config/seo-workflow.json'
        try:
            raw, text = read_source(root, path, min(max_file_bytes, max_read_bytes - read_bytes))
            read_bytes += len(raw)
            digest = hashlib.sha256(raw).hexdigest()
            if active:
                refs.append({'path': path, 'sha256': digest, 'status': 'read', 'grants_authority': False})
            reason = 'always_required_core_policy' if path in CORE else 'task_alias:' + ','.join(group for group in groups if path in DOCS[group])
            if path.endswith('.json'):
                json.loads(text)
                keys = {'config/llm-policy.json': ['model', 'customer_byok', 'cost_and_access'],
                        'config/source-boundaries.json': ['authority', 'reuse_policy'],
                        'config/selfservice-policy.json': ['authority', 'registration'],
                        'config/operating-model.json': ['go_to_market_sequence'],
                        'config/change-impact-policy.json': ['impact_checks', 'transition_rule'],
                        'config/seo-workflow.json': ['workflow', 'research_requirements', 'quality_gate', 'hard_limits', 'keyword_measurement']}.get(path, [])
                intervals = [value for key in keys if (value := json_field(text, key))]
                if path == 'config/seo-workflow.json':
                    for index, line in enumerate(text.splitlines()):
                        if re.search(r'"stage"\s*:\s*"quality"', line):
                            intervals.append((index + 1, index + 1, 'workflow_quality_stage'))
                if path == 'config/operating-model.json' and 'seo' in groups:
                    for index, line in enumerate(text.splitlines()):
                        if re.search(r'"id"\s*:\s*"GTM-02"', line):
                            intervals.append((index + 1, min(index + 22, len(text.splitlines())), 'go_to_market_seo_stage'))
                if not intervals:
                    intervals = [(1, len(text.splitlines()), 'structured_source')]
            else:
                intervals = md_sections(text)
                if path == 'AGENTS.md':
                    intervals = [interval for interval in intervals if any(key in interval[2].casefold() for key in ['aktueller gesamtauftrag', 'verbindliche regeln', 'wiederverwendbare'])] or intervals[:1]
                else:
                    aliases = [alias for values in groups.values() for alias in values]
                    def relevance(interval):
                        body = ''.join(text.splitlines(keepends=True)[interval[0]-1:interval[1]]).casefold()
                        return sum(3 * bool(re.search(r'(?<!\w)' + re.escape(alias) + r'(?!\w)', interval[2].casefold()))
                                   + bool(re.search(r'(?<!\w)' + re.escape(alias) + r'(?!\w)', body)) for alias in aliases)
                    intervals.sort(key=lambda interval: -relevance(interval))
                    intervals = intervals[:3]
            for interval in intervals:
                entry = citation(path, text, digest, interval, reason, active)
                if entry:
                    citations.append(entry)
                else:
                    missing.append({'path': path, 'reason': 'citation_line_exceeds_excerpt_budget'})
        except (SourceError, ValueError) as error:
            missing.append({'path': path, 'reason': str(error) if isinstance(error, SourceError) else 'invalid_structured_source'})
            if active:
                refs[:] = [ref for ref in refs if ref['path'] != path]
                refs.append({'path': path, 'status': 'missing_or_rejected', 'grants_authority': False})
    required = [{'id': ident, 'source': path, 'status': 'source_reference_only_not_executed' if any(ref['path'] == path and ref['status'] == 'read' for ref in refs) else 'blocked_missing_source'} for ident, path in CHECKS]
    if 'seo' in groups:
        required.append({'id': 'seo_research_before_copy_and_evidence_quality_gate', 'source': 'config/seo-workflow.json',
                         'status': 'source_reference_only_not_executed' if any(ref['path'] == 'config/seo-workflow.json' and ref['status'] == 'read' for ref in refs) else 'blocked_missing_source'})
    dropped = max(0, len(citations) - max_records)
    citations = citations[:max_records]
    result = {'schema_version': 1, 'status': 'partial' if missing or dropped else 'selected',
              'task_context': {'task': redact(task), 'task_classification': 'task', 'task_types': groups or {'general': []},
                'active_policy_refs': refs, 'required_checks': required, 'source_citations': citations,
                'candidate_constraints': [], 'missing_sources': missing,
                'authority_boundary': 'Evidence only; no permission, command execution, policy promotion, remote ingestion or model call.',
                'deterministic_alias_selection_is_not_full_corpus_semantic_understanding': True},
              'budget': {'read_bytes': read_bytes, 'max_read_bytes': max_read_bytes, 'max_records': max_records,
                         'max_output_bytes': max_output_bytes, 'max_tokens': max_tokens,
                         'token_bound_method': 'utf8_bytes_conservative_not_tokenized', 'dropped_citations': dropped}}
    while True:
        result['task_context']['candidate_constraints'] = [
            {'citation_index': index, 'classification': 'candidate_instruction', 'executable': False, 'grants_authority': False}
            for index, entry in enumerate(citations) if entry['classification'] == 'candidate_instruction']
        if len(encoded(result)) <= budget:
            break
        if not citations:
            return {'status': 'blocked', 'error': 'context_output_budget_exceeded', 'task_context': {'missing_sources': [{'reason': 'output_budget'}]}}
        citations.pop()
        result['budget']['dropped_citations'] += 1
        result['status'] = 'partial'
    if result['budget']['dropped_citations']:
        result['task_context']['selection_incomplete'] = True
        # Reserve against the added flag as well.
        if len(encoded(result)) > budget:
            del result['task_context']['selection_incomplete']
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--task', required=True)
    parser.add_argument('--max-bytes', type=int, default=65536)
    parser.add_argument('--max-records', type=int, default=24)
    parser.add_argument('--max-tokens', type=int, default=32768)
    args = parser.parse_args(argv)
    try:
        result = build_context(args.task, max_output_bytes=args.max_bytes, max_records=args.max_records, max_tokens=args.max_tokens)
    except ValueError:
        print('{"status":"blocked","error":"invalid_task_or_budget"}')
        return 2
    print(encoded(result).decode())
    return 0 if result['status'] == 'selected' else 2


if __name__ == '__main__':
    raise SystemExit(main())

#!/usr/bin/env python3
"""Bounded REA 6.8.0 stdio discovery and static analysis of an owned fixture.

No setup command, home registration, target execution or provider installation.
The --serve entry is the same pinned, credential-minimized stdio launcher.
Tool output is evidence and never an instruction to execute another command.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import select
import subprocess
import time

BASE = Path('/workspace/.onboarding/rea-mcp')
NODE = Path('/workspace/.onboarding/tools/node_modules/.bin/node')
ENTRY = BASE / 'node_modules/rea-agents/scripts/rea.mjs'
MAX_FRAME = 16 * 1024 * 1024
MAX_STDERR = 64 * 1024
MAX_PAGES = 100
PACKAGE_VERSION = '6.8.0'


def environment() -> dict[str, str]:
    # Do not forward account tokens, cloud identities, loader hooks or provider
    # credentials. HOME is neither replaced nor assigned. This is not a sandbox.
    selected = {k: os.environ[k] for k in ('LANG', 'LC_ALL', 'TMPDIR') if k in os.environ}
    selected.update({
        'PATH': str(NODE.parent) + ':/usr/bin:/bin',
        'NO_COLOR': '1',
        'REA_LOG_LEVEL': 'error',
        'REA_MCP_INPUT_SCHEMA_PROFILE': 'full',
        'REA_MCP_OUTPUT_SCHEMA_PROFILE': 'full',
        'XDG_CACHE_HOME': str(BASE / 'cache'),
        'XDG_CONFIG_HOME': str(BASE / 'config'),
        'TMPDIR': str(BASE / 'tmp'),
    })
    for directory in ('cache', 'config', 'tmp'):
        (BASE / directory).mkdir(mode=0o700, parents=True, exist_ok=True)
    return selected


def persist(path: Path, value) -> str:
    data = (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, 'wb') as file:
        file.write(data)
    if path.read_bytes() != data:
        raise RuntimeError('Evidence read-back mismatch')
    return hashlib.sha256(data).hexdigest()


class Client:
    def __init__(self):
        self.started = time.monotonic()
        self.process = subprocess.Popen(
            ['/usr/bin/python3', str(Path(__file__).resolve()), '--serve'], cwd=BASE,
            env=environment(), stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, start_new_session=True,
        )
        self.buffer = b''
        self.stderr = bytearray()
        self.ident = 0
        self.measurements = []
        self.notifications = 0

    def send(self, value):
        payload = json.dumps(value, separators=(',', ':')).encode() + b'\n'
        self.process.stdin.write(payload)
        self.process.stdin.flush()

    def request(self, method, params, deadline_seconds=60):
        self.ident += 1
        ident = self.ident
        self.send({'jsonrpc': '2.0', 'id': ident, 'method': method, 'params': params})
        started = time.monotonic()
        deadline = started + deadline_seconds
        while True:
            if b'\n' in self.buffer:
                line, self.buffer = self.buffer.split(b'\n', 1)
                if not line:
                    continue
                reply = json.loads(line)
                if reply.get('jsonrpc') != '2.0':
                    raise RuntimeError('Invalid JSON-RPC frame')
                if 'method' in reply:
                    # This client exposes no roots, sampling, approval or tools.
                    if 'id' in reply:
                        self.send({'jsonrpc': '2.0', 'id': reply['id'], 'error': {'code': -32601, 'message': 'Client capability not provided'}})
                    else:
                        self.notifications += 1
                    continue
                if reply.get('id') != ident:
                    raise RuntimeError('Unexpected response identity')
                self.measurements.append({'method': method, 'elapsed_ms': round((time.monotonic() - started) * 1000, 3), 'response_bytes': len(line), 'jsonrpc_error': 'error' in reply})
                if 'error' in reply:
                    raise RuntimeError(f'JSON-RPC {method} failed: {reply["error"].get("code")}')
                return reply['result']
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError(f'{method} deadline exceeded; execution outcome not assumed')
            ready, _, _ = select.select([self.process.stdout, self.process.stderr], [], [], remaining)
            if not ready:
                continue
            for stream in ready:
                chunk = os.read(stream.fileno(), 65536)
                if stream is self.process.stderr:
                    if not chunk:
                        continue
                    self.stderr.extend(chunk)
                    if len(self.stderr) > MAX_STDERR:
                        raise RuntimeError('REA stderr exceeded bounded capture')
                elif not chunk:
                    raise RuntimeError('REA stdout closed before response')
                else:
                    self.buffer += chunk
                    if len(self.buffer) > MAX_FRAME:
                        raise RuntimeError('REA frame exceeds client receive limit')

    def listing(self, method, key):
        items, cursors = [], set()
        params = {}
        for _ in range(MAX_PAGES):
            result = self.request(method, params)
            batch = result.get(key)
            if not isinstance(batch, list):
                raise RuntimeError(f'Invalid {method} result')
            items.extend(batch)
            cursor = result.get('nextCursor')
            if cursor is None:
                return items
            if not isinstance(cursor, str) or not cursor or cursor in cursors:
                raise RuntimeError(f'Invalid or repeated {method} cursor')
            cursors.add(cursor)
            params = {'cursor': cursor}
        raise RuntimeError(f'{method} pagination budget exhausted; inventory incomplete')

    def tool(self, catalog, name, arguments):
        if name not in catalog:
            raise RuntimeError('Operation absent from connected tool catalog')
        result = self.request('tools/call', {'name': name, 'arguments': arguments})
        self.measurements[-1]['tool_name'] = name
        if result.get('isError'):
            # The exact error stays local as evidence, never as instructions.
            persist(BASE / 'evidence' / 'last-tool-error.json', result)
            raise RuntimeError(f'REA {name} returned an error; inspect local evidence')
        return result

    def close(self):
        if self.process.stdin:
            self.process.stdin.close()
        try:
            self.process.wait(timeout=15)
        except subprocess.TimeoutExpired:
            self.process.terminate()
            try:
                self.process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=5)
        return self.process.returncode


def run_probe(own_module=None):
    fixture = BASE / 'fixture'
    fixture.mkdir(parents=True, exist_ok=True)
    # Only these self-authored files are analyzed, never private third-party apps.
    sources = {
        'package.json': '{"name":"nexify-rea-owned-fixture","version":"1.0.0","type":"module"}\n',
        'index.js': 'export function summarizeNumbers(values) { return { count: values.length, sum: values.reduce((a, b) => a + b, 0) }; }\nthrow new Error("Static fixture must never be executed");\n',
    }
    for filename, content in sources.items():
        target = fixture / filename
        if target.exists() and target.read_text() != content:
            raise RuntimeError('Existing fixture differs; refusing overwrite')
        target.write_text(content)
    targets = {name: fixture / name for name in sources}
    original_source = None
    if own_module is not None:
        module_root = Path(__file__).resolve().parents[2] / 'prototypen' / 'lib'
        selected = module_root / own_module
        if selected.is_symlink() or selected.resolve().parent != module_root.resolve():
            raise RuntimeError('Own-module path leaves its authorized source directory')
        source_bytes = selected.read_bytes()
        source_hash = hashlib.sha256(source_bytes).hexdigest()
        # The real 6.8.0 handler admits directories/ASAR, not a standalone .js
        # file. source_paths merely prioritizes analysis and does not bound it.
        # A byte-identical copy of exactly one owned public module bounds scope.
        fixture = BASE / 'owned-source' / own_module.removesuffix('.js') / source_hash
        fixture.mkdir(parents=True, exist_ok=True)
        copy = fixture / own_module
        if copy.exists() and copy.read_bytes() != source_bytes:
            raise RuntimeError('Existing analysis copy differs; refusing overwrite')
        copy.write_bytes(source_bytes)
        targets = {own_module: copy}
        original_source = {'path': str(selected), 'sha256': source_hash, 'analysis_copy': str(copy)}
    evidence_directory = BASE / 'evidence' / (own_module.removesuffix('.js') if own_module else 'fixture')
    before = {name: hashlib.sha256(target.read_bytes()).hexdigest() for name, target in targets.items()}
    client = Client()
    report = {'schema_version': 1, 'package_version': PACKAGE_VERSION, 'scope': 'owned local static module' if own_module else 'owned local static fixture; no execution of supplied code', 'input_path': str(fixture), 'registration_changed': False, 'outcome': 'incomplete'}
    if original_source:
        report['original_source'] = original_source
    try:
        initialized = client.request('initialize', {'protocolVersion': '2025-11-25', 'capabilities': {}, 'clientInfo': {'name': 'nexify-rea-stdio-probe', 'version': '1.0.0'}})
        if initialized.get('serverInfo', {}).get('version') != PACKAGE_VERSION:
            raise RuntimeError('Unexpected REA server version')
        report['initialize'] = initialized
        report['startup_to_initialize_ms'] = round((time.monotonic() - client.started) * 1000, 3)
        client.send({'jsonrpc': '2.0', 'method': 'notifications/initialized'})
        tools = client.listing('tools/list', 'tools')
        catalog = {tool['name']: tool for tool in tools}
        if len(catalog) != len(tools):
            raise RuntimeError('Duplicate connected tool name')
        report['tool_count'] = len(tools)
        report['catalog_pagination_exhausted'] = True
        report['catalog_sha256'] = persist(evidence_directory / 'tools.json', tools)
        caps = initialized.get('capabilities', {})
        report['resources'] = client.listing('resources/list', 'resources') if 'resources' in caps else {'state': 'not_advertised_not_called'}
        prompts = client.listing('prompts/list', 'prompts') if 'prompts' in caps else []
        report['prompt_count'] = len(prompts)
        report['prompts_sha256'] = persist(evidence_directory / 'prompts.json', prompts)
        session = client.tool(catalog, 'binary_session', {'expected_package_version': PACKAGE_VERSION})
        report['session_sha256'] = persist(evidence_directory / 'session.json', session)
        arguments = {'input_path': str(fixture), 'format': 'directory', 'integrity_policy': 'fail', 'max_heap_mb': 256, 'analysis_timeout_ms': 10000, 'max_semantic_nodes': 512, 'max_semantic_nodes_per_file': 256, 'max_semantic_unknowns': 128, 'detail': 'complete'}
        analysis = client.tool(catalog, 'analyze_javascript_application', arguments)
        report['analysis_sha256'] = persist(evidence_directory / 'analysis.json', analysis)
        evidence = analysis.get('structuredContent')
        if not isinstance(evidence, dict) or not evidence.get('evidence_id'):
            raise RuntimeError('Missing complete structured Evidence')
        report['evidence_id'] = evidence['evidence_id']
        if own_module:
            functions = [node for node in evidence['normalized_result']['semantic_graph']['nodes'] if node.get('kind') == 'function']
            selected_function = next((node for node in functions if node.get('label') == 'buche'), functions[0] if functions else None)
            if selected_function is None:
                raise RuntimeError('Owned module analysis did not retain a function seed')
            trace = client.tool(catalog, 'trace_javascript_semantics', {
                'application': {'kind': 'retained-evidence', 'evidence_id': evidence['evidence_id']},
                'query': {'direction': 'callers', 'seed': {'kind': 'semantic-node', 'node_id': selected_function['node_id']}},
            })
            report['javascript_trace_sha256'] = persist(evidence_directory / 'javascript-trace.json', trace)
            report['javascript_trace_seed'] = {'name': selected_function.get('label'), 'node_id': selected_function['node_id'], 'location': selected_function.get('evidence', {}).get('location')}
        retained = client.tool(catalog, 'get_evidence_bundle', {'detail': 'summary', 'filters': {'evidence_id': evidence['evidence_id']}})
        report['retained_readback_sha256'] = persist(evidence_directory / 'retained.json', retained)
        records = retained['structuredContent']['result']['records']
        if len(records) != 1 or records[0]['evidence_id'] != evidence['evidence_id'] or records[0]['subject'] != evidence['subject'] or records[0]['operation'] != evidence['operation']:
            raise RuntimeError('Retained Evidence metadata did not match analyzed artifact')
        bundle = client.tool(catalog, 'get_evidence_bundle', {})
        report['complete_bundle_sha256'] = persist(evidence_directory / 'complete-bundle.json', bundle)
        def find_record(value):
            if isinstance(value, dict):
                if value.get('evidence_id') == evidence['evidence_id'] and 'normalized_result' in value:
                    return value
                for nested in value.values():
                    found = find_record(nested)
                    if found is not None:
                        return found
            if isinstance(value, list):
                for nested in value:
                    found = find_record(nested)
                    if found is not None:
                        return found
            return None
        readback = find_record(bundle.get('structuredContent'))
        if readback != evidence:
            raise RuntimeError('Complete retained Evidence content mismatch')
        report['complete_evidence_readback_equal'] = True
        report['evidence_content_sha256'] = hashlib.sha256(json.dumps(evidence, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        report['fixture_hashes'] = before
        after = {name: hashlib.sha256(target.read_bytes()).hexdigest() for name, target in targets.items()}
        if before != after:
            raise RuntimeError('Static input files changed')
        if original_source and hashlib.sha256(Path(original_source['path']).read_bytes()).hexdigest() != original_source['sha256']:
            raise RuntimeError('Original source changed during analysis')
        report['input_files_unchanged'] = True
        report['tool_schema_hashes'] = {name: hashlib.sha256(json.dumps(catalog[name]['inputSchema'], sort_keys=True, separators=(',', ':')).encode()).hexdigest() for name in ['binary_session', 'analyze_javascript_application', 'get_evidence_bundle']}
        if own_module:
            report['tool_schema_hashes']['trace_javascript_semantics'] = hashlib.sha256(json.dumps(catalog['trace_javascript_semantics']['inputSchema'], sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        report['outcome'] = 'passed'
    finally:
        report['server_exit_status'] = client.close()
        report['measurements'] = client.measurements
        report['server_notifications'] = client.notifications
        report['stderr_bytes'] = len(client.stderr)
        persist(evidence_directory / 'probe-report.json', report)
    if report['server_exit_status'] != 0:
        raise RuntimeError('REA did not exit cleanly')
    print(json.dumps({key: report.get(key) for key in ['package_version', 'tool_count', 'prompt_count', 'resources', 'startup_to_initialize_ms', 'evidence_id', 'input_files_unchanged', 'server_exit_status']}, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--serve', action='store_true', help='Launch the pinned MCP stdio server without installing/registering anything')
    parser.add_argument('--own-module', choices=['rechenkern.js', 'kundenwege.js'], help='Read one existing authorized N1 reference module, without executing it')
    args = parser.parse_args()
    if args.serve:
        os.chdir(BASE)
        os.execve(NODE, [str(NODE), str(ENTRY), 'mcp'], environment())
    run_probe(args.own_module)


if __name__ == '__main__':
    main()

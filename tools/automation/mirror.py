#!/usr/bin/env python3
"""Bounded one-branch GitHub -> GitLab FF mirror; no checkout or code execution."""
import argparse
import ipaddress
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import urlsplit

SOURCE = 'https://github.com/nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665.git'
REF = 'refs/heads/main'
REPO = Path(__file__).resolve().parents[2]


class Blocked(Exception):
    pass


def binding(value, development=False):
    if not isinstance(value, str) or not value or any(ord(c) < 33 or ord(c) > 126 for c in value):
        raise Blocked('Missing or invalid downstream binding')
    parsed = urlsplit(value)
    if parsed.username is not None or parsed.password is not None or parsed.query or parsed.fragment or '%' in value or '\\' in value:
        raise Blocked('Downstream URL must not contain credentials, escapes, query or fragment')
    try:
        parsed.port
        local = ipaddress.ip_address(parsed.hostname or '').is_loopback
    except ValueError:
        local = False
        try:
            parsed.port
        except ValueError:
            raise Blocked('Invalid downstream port') from None
    if parsed.scheme != 'https' and not (development and parsed.scheme == 'http' and parsed.hostname == '127.0.0.1'):
        raise Blocked('HTTPS required; development permits HTTP only on 127.0.0.1')
    if not parsed.hostname or parsed.hostname.lower() in {'github.com', 'www.github.com'}:
        raise Blocked('Downstream must be distinct from canonical GitHub')
    if parsed.scheme == 'https' and local:
        raise Blocked('Loopback downstream requires explicit development HTTP binding')
    if not re.fullmatch(r'/[A-Za-z0-9_-]+(?:/[A-Za-z0-9_.-]+)+\.git', parsed.path) or any(p in {'.', '..'} for p in parsed.path.split('/')):
        raise Blocked('Bind a concrete GitLab repository path ending in .git')
    return value


class Git:
    def __init__(self):
        # Normal Git credential helpers are the configured credential contract.
        # Never discover .env/vault/key files or embed tokens in arguments.
        self.env = {k: v for k, v in os.environ.items() if not k.startswith('GIT_')}
        self.env.update({'GIT_TERMINAL_PROMPT': '0', 'GIT_CONFIG_NOSYSTEM': '1'})

    def run(self, *arguments, cwd=None, acceptable=(0,)):
        command = ['/usr/bin/git', '-c', 'core.hooksPath=/dev/null', '-c', 'http.followRedirects=false', '-c', 'push.followTags=false',
                   '-c', 'protocol.allow=never', '-c', 'protocol.https.allow=always',
                   '-c', 'protocol.http.allow=always', *arguments]
        try:
            result = subprocess.run(command, cwd=cwd, env=self.env, stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE, text=True, timeout=120)
        except (OSError, subprocess.TimeoutExpired):
            raise Blocked('Git unavailable or timed out; reconcile before retry') from None
        if result.returncode not in acceptable:
            raise Blocked('Git operation failed; no successful mirror is claimed')
        return result.returncode, result.stdout.strip()

    def head(self, url):
        _, output = self.run('ls-remote', '--exit-code', '--refs', url, REF, acceptable=(0, 2))
        if not output:
            return None
        lines = output.splitlines()
        if len(lines) != 1:
            raise Blocked('Ambiguous main ref')
        fields = lines[0].split()
        if len(fields) != 2 or fields[1] != REF or not re.fullmatch('[a-f0-9]{40}', fields[0]):
            raise Blocked('Invalid main ref response')
        return fields[0]


def mirror(repository, downstream, apply=False, development=False, git=None):
    target = binding(downstream, development)
    git = git or Git()
    # A configured credential helper is trusted, a transport URL rewrite is not
    # an approved alternative source/destination. Read names only, never values.
    _, rewrites = git.run('config', '--name-only', '--get-regexp', r'^url\..*\.(insteadof|pushinsteadof)$', cwd=repository, acceptable=(0, 1))
    if rewrites:
        raise Blocked('URL rewriting must be removed before identity-bound mirroring')
    _, origin = git.run('remote', 'get-url', 'origin', cwd=repository)
    if origin not in {SOURCE, SOURCE.removesuffix('.git')}:
        raise Blocked('Checkout origin is not the canonical GitHub repository')
    source_sha = git.head(SOURCE)
    if source_sha is None:
        raise Blocked('Canonical GitHub main is missing')
    old = git.head(target)
    report = {'direction': 'github_canonical_to_gitlab_downstream', 'branch': 'main',
              'source_sha': source_sha, 'target_before': old, 'apply': apply,
              'state': 'incomplete', 'pushed': False}
    with tempfile.TemporaryDirectory(prefix='nexify-mirror-') as directory:
        git.run('init', '--bare', directory)
        git.run('fetch', '--no-tags', SOURCE, REF, cwd=directory)
        _, fetched = git.run('rev-parse', 'FETCH_HEAD^{commit}', cwd=directory)
        if fetched != source_sha:
            raise Blocked('Canonical source changed during capture')
        if old is not None and old != source_sha:
            git.run('fetch', '--no-tags', target, REF, cwd=directory)
            _, fetched_target = git.run('rev-parse', 'FETCH_HEAD^{commit}', cwd=directory)
            if fetched_target != old:
                raise Blocked('Downstream changed during capture')
            status, _ = git.run('merge-base', '--is-ancestor', old, source_sha, cwd=directory, acceptable=(0, 1))
            if status:
                raise Blocked('Downstream diverged; preserve both histories')
        if git.head(target) != old:
            raise Blocked('Downstream changed before push; no update attempted')
        if old == source_sha:
            report['state'] = 'already_current'
        elif not apply:
            report['state'] = 'dry_run_fast_forward' if old else 'dry_run_create_main'
        else:
            # Ordinary protocol old-object CAS and server FF; no force/lease,
            # delete, --mirror or prune. See documented negotiation race window.
            git.run('push', '--porcelain', target, f'{source_sha}:{REF}', cwd=directory)
            report['pushed'] = True
            if git.head(target) != source_sha:
                raise Blocked('Post-push target differs; reconcile outcome')
            report['state'] = 'applied_verified'
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Explicit controller-authorized downstream update')
    parser.add_argument('--development', action='store_true', help='Permit explicitly bound 127.0.0.1 HTTP GitLab')
    args = parser.parse_args()
    try:
        result = mirror(REPO, os.environ.get('NEXIFY_GITLAB_MIRROR_URL'), args.apply, args.development)
        print(json.dumps(result, sort_keys=True))
        return 0
    except (Blocked, ValueError):
        print(json.dumps({'state': 'blocked', 'reason': 'Mirror precondition or Git operation failed; verify binding, identity and history', 'success_claimed': False}))
        return 3


if __name__ == '__main__':
    raise SystemExit(main())

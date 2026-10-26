"""Exercise the real local preview server and its preserved prototype navigation."""

from html.parser import HTMLParser
from pathlib import Path
import os
import re
import select
import shutil
import subprocess
import tempfile
import unittest
from urllib.parse import quote, urljoin
from urllib.request import Request, build_opener, HTTPRedirectHandler, urlopen
from urllib.error import HTTPError


ROOT = Path(__file__).resolve().parents[1]
PAGES = {
    'NeXifyAI Cloud v12.dc.html', 'NeXify AI one.dc.html',
    'NeXify Designsystem.dc.html', 'NeXify Workspace.dc.html',
    'NeXify Leitstand.dc.html', 'NeXify Posteingang.dc.html',
    'NeXify Shop.dc.html', 'NeXify API.dc.html', 'Kundenportal.dc.html',
    'Kundenwege.dc.html', 'Anmeldung.dc.html', 'Konto.dc.html',
    'TEILEKLAR Shop.dc.html', 'Reifenrechner.dc.html',
    'Batterie-Berater.dc.html', 'Fitment-Checker.dc.html',
    'Partnerportal.dc.html', 'Partner-werden.dc.html',
    'Affiliate-Portal.dc.html', 'Nachbarschaftskunden-Portal.dc.html',
    'Rechtliches.dc.html', 'API-Rechtliches.dc.html',
    'Geschaeftsdokumente-Vorlagen.dc.html', 'myADMIN v2.dc.html',
    'NX-Intern.dc.html',
}


class Navigation(HTMLParser):
    def __init__(self):
        super().__init__()
        self.base = None
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'base':
            self.base = attrs.get('href')
        if tag == 'a':
            self.links.append(attrs.get('href'))


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class PreviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = subprocess.Popen(
            ['node', 'server.mjs'], cwd=ROOT,
            env={**os.environ, 'PORT': '0', 'HOST': ''},
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True,
        )
        try:
            ready, _, _ = select.select([cls.server.stdout], [], [], 10)
            if not ready:
                raise RuntimeError('Preview server did not announce startup')
            line = cls.server.stdout.readline()
            cls.startup_line = line
            port = re.search(r'localhost:(\d+)', line)
            if not port:
                raise RuntimeError(f'Unexpected startup output: {line!r}')
            cls.origin = f'http://127.0.0.1:{port.group(1)}'
        except Exception:
            cls.server.terminate()
            cls.server.communicate(timeout=5)
            raise

    @classmethod
    def tearDownClass(cls):
        cls.server.terminate()
        try:
            cls.server.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            cls.server.kill()
            cls.server.communicate(timeout=5)

    def test_canonical_directory_redirect_preserves_query_and_head(self):
        opener = build_opener(NoRedirect)
        for method in ['GET', 'HEAD']:
            with self.subTest(method=method):
                with self.assertRaises(HTTPError) as caught:
                    opener.open(Request(self.origin + '/prototypen?lang=de', method=method), timeout=5)
                response = caught.exception
                self.assertEqual(response.code, 308)
                self.assertEqual(response.headers['Location'], '/prototypen/?lang=de')
                self.assertEqual(response.read(), b'')
                response.close()

    def test_overview_aliases_and_all_25_target_contents(self):
        expected = (ROOT / 'preview-prototypes.html').read_bytes()
        expected_links = {quote(name) for name in PAGES}
        for route in ['/prototypen/', '/prototypen/index.html', '/preview-prototypes.html']:
            with self.subTest(route=route):
                with urlopen(self.origin + route, timeout=5) as response:
                    body = response.read()
                    self.assertEqual(response.status, 200)
                    self.assertTrue(response.headers['Content-Type'].startswith('text/html'))
                    self.assertEqual(body, expected)
                page = Navigation()
                page.feed(body.decode())
                self.assertEqual(page.base, '/prototypen/')
                self.assertEqual(len(page.links), 25)
                self.assertEqual(set(page.links), expected_links)
                base = urljoin(self.origin + route, page.base)
                for name in sorted(PAGES):
                    with urlopen(urljoin(base, quote(name)), timeout=5) as response:
                        self.assertEqual(response.status, 200, name)
                        self.assertEqual(response.read(), (ROOT / 'prototypen' / name).read_bytes(), name)

    def test_head_has_get_headers_without_body(self):
        for route in ['/', '/prototypen/', '/prototypen/index.html', '/tokens.css']:
            with self.subTest(route=route):
                with urlopen(self.origin + route, timeout=5) as get:
                    expected_type = get.headers['Content-Type']
                    self.assertTrue(get.read())
                with urlopen(Request(self.origin + route, method='HEAD'), timeout=5) as head:
                    self.assertEqual(head.status, 200)
                    self.assertEqual(head.headers['Content-Type'], expected_type)
                    self.assertEqual(head.read(), b'')

    def test_root_and_tokens_are_actual_files(self):
        for route, filename in [('/', 'apps-index.html'), ('/index.html', 'apps-index.html'), ('/tokens.css', 'packages/tokens/tokens.css'), ('/packages/ui/index.html', 'packages/ui/index.html'), ('/packages/ui/components.css', 'packages/ui/components.css'), ('/packages/tokens/tokens.css', 'packages/tokens/tokens.css')]:
            with self.subTest(route=route):
                with urlopen(self.origin + route, timeout=5) as response:
                    self.assertEqual(response.read(), (ROOT / filename).read_bytes())

    def test_default_listener_is_loopback(self):
        self.assertIn('(bound to 127.0.0.1)', self.startup_line)

    def test_private_files_and_traversal_are_denied_for_get_and_head(self):
        for route in [
            '/.git/HEAD', '/%2egit/HEAD', '/%2e%67it/config',
            '/config/fakten.json', '/config/api-prepaid.json',
            '/package.json', '/server.mjs', '/tools/ds-audit.js',
            '/packages/tokens/tokens.json', '/packages/tokens/tokens.ts',
            '/prototypen/.env', '/prototypen/%2eprivate.json',
            '/prototypen/MANIFEST.sha256', '/prototypen/lib/ARCHITECTURE.md',
            '/..%2fpackage.json', '/prototypen/%2e%2e/config/fakten.json',
            '/%2fconfig/fakten.json', '/prototypen%5c..%5cconfig/fakten.json',
        ]:
            for method in ['GET', 'HEAD']:
                with self.subTest(route=route, method=method):
                    with self.assertRaises(HTTPError) as caught:
                        urlopen(Request(self.origin + route, method=method), timeout=5)
                    response = caught.exception
                    self.assertEqual(response.code, 403)
                    body = response.read()
                    self.assertEqual(body, b'' if method == 'HEAD' else b'Forbidden')
                    response.close()

    def test_symlink_cannot_expose_private_or_external_file(self):
        # Isolated miniature checkout: no fixture touches protected prototypes.
        with tempfile.TemporaryDirectory(prefix='nexify-preview-security-') as directory:
            fixture = Path(directory)
            checkout = fixture / 'checkout'
            checkout.mkdir()
            shutil.copyfile(ROOT / 'server.mjs', checkout / 'server.mjs')
            (checkout / 'config').mkdir()
            private = checkout / 'config' / 'private.json'
            private.write_text('{"fixture": "must stay private"}')
            external = fixture / 'external.html'
            external.write_text('outside the checkout')
            link = checkout / 'preview-prototypes.html'
            server = subprocess.Popen(
                ['node', 'server.mjs'], cwd=checkout,
                env={**os.environ, 'PORT': '0', 'HOST': ''},
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
            )
            try:
                self.assertTrue(select.select([server.stdout], [], [], 10)[0])
                line = server.stdout.readline()
                port = re.search(r'localhost:(\d+)', line)
                self.assertIsNotNone(port, line)
                origin = f'http://127.0.0.1:{port.group(1)}'
                for target in [private, external]:
                    link.symlink_to(target)
                    try:
                        for route in ['/preview-prototypes.html', '/prototypen/']:
                            for method in ['GET', 'HEAD']:
                                with self.subTest(target=target.name, route=route, method=method):
                                    with self.assertRaises(HTTPError) as caught:
                                        urlopen(Request(origin + route, method=method), timeout=5)
                                    response = caught.exception
                                    self.assertEqual(response.code, 403)
                                    self.assertEqual(response.read(), b'' if method == 'HEAD' else b'Forbidden')
                                    response.close()
                    finally:
                        link.unlink()
            finally:
                server.terminate()
                try:
                    server.communicate(timeout=5)
                except subprocess.TimeoutExpired:
                    server.kill()
                    server.communicate(timeout=5)


if __name__ == '__main__':
    unittest.main()

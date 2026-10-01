#!/usr/bin/env python3
"""Statischer Server fuer prototypen/ mit Cache-Control und Gzip-Kompression.

Ersatz fuer "python3 -m http.server": liefert dieselben Dateien, setzt aber
zusaetzlich Cache-Control-Header (bislang komplett abwesend, jede Anfrage von
jedem Besucher war ein voller Re-Fetch) und komprimiert textbasierte Antworten
(HTML/JS/CSS/SVG/JSON/Webmanifest) per Gzip, wenn der Client es unterstuetzt.
Binaerformate wie WEBP/PNG/WOFF2 sind bereits komprimiert und werden nicht
erneut gzippt.

Aufruf identisch zu "python3 -m http.server PORT --directory DIR":
    python3 tools/vorschau-server.py PORT DIR
"""
import email.utils
import gzip
import os
import sys
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# Sekunden Cache-Control je Endung. HTML-Seiten (die .dc.html-Prototypen
# werden haeufig bearbeitet) bleiben kurz lebend und revalidieren, statische
# Assets (Bilder/Fonts/Skripte/Icons) duerfen deutlich laenger im Browser-
# Cache bleiben, weil sie sich erfahrungsgemaess seltener aendern.
SHORT_CACHE = 300  # 5 Minuten: Seiteninhalt, haeufig bearbeitet
LONG_CACHE = 86400  # 24 Stunden: Bilder/Schriften/Skripte/Icons

CACHE_SECONDS = {
    '.html': SHORT_CACHE, '.htm': SHORT_CACHE, '.webmanifest': SHORT_CACHE, '.json': SHORT_CACHE,
    '.js': LONG_CACHE, '.mjs': LONG_CACHE, '.css': LONG_CACHE,
    '.png': LONG_CACHE, '.jpg': LONG_CACHE, '.jpeg': LONG_CACHE, '.webp': LONG_CACHE,
    '.svg': LONG_CACHE, '.ico': LONG_CACHE,
    '.woff': LONG_CACHE, '.woff2': LONG_CACHE,
}
DEFAULT_CACHE = SHORT_CACHE

# Nur textbasierte Typen lohnen sich fuer Gzip; Bilder/Fonts sind bereits
# komprimiert und wuerden durch erneutes Gzippen nur CPU-Zeit kosten.
COMPRESSIBLE_EXT = {'.html', '.htm', '.js', '.mjs', '.css', '.svg', '.json', '.webmanifest', '.txt', '.xml'}

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
    '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
}


class CachingGzipHandler(BaseHTTPRequestHandler):
    server_version = 'NeXifyVorschau/1.0'
    directory = '.'

    def _safe_path(self):
        # Query-/Fragment-Anteil entfernen, Pfad auf das Serververzeichnis einschraenken
        # (verhindert Pfad-Traversal via "..").
        path = self.path.split('?', 1)[0].split('#', 1)[0]
        path = os.path.normpath('/' + path.lstrip('/'))
        if path == '/':
            path = '/index.html'
        full = os.path.normpath(os.path.join(self.directory, path.lstrip('/')))
        base = os.path.normpath(self.directory)
        if os.path.commonpath([full, base]) != base:
            return None
        if os.path.isdir(full):
            full = os.path.join(full, 'index.html')
        return full

    def _handle(self, send_body):
        full = self._safe_path()
        if full is None or not os.path.isfile(full):
            self.send_error(HTTPStatus.NOT_FOUND, 'File not found')
            return
        ext = os.path.splitext(full)[1].lower()
        try:
            fs = os.stat(full)
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND, 'File not found')
            return

        # Bedingte Anfrage: unveraenderte Datei -> 304 ohne Body, spart die
        # komplette Uebertragung, solange der Browser-Cache noch gueltig ist.
        ims = self.headers.get('If-Modified-Since')
        if ims:
            try:
                ims_ts = email.utils.mktime_tz(email.utils.parsedate_tz(ims))
                if int(fs.st_mtime) <= int(ims_ts):
                    self.send_response(HTTPStatus.NOT_MODIFIED)
                    self.end_headers()
                    return
            except (TypeError, ValueError, OverflowError):
                pass

        with open(full, 'rb') as fh:
            body = fh.read()

        accept_enc = self.headers.get('Accept-Encoding', '')
        gzip_ok = ext in COMPRESSIBLE_EXT and 'gzip' in accept_enc and len(body) > 256
        if gzip_ok:
            body = gzip.compress(body, compresslevel=6)

        self.send_response(HTTPStatus.OK)
        self.send_header('Content-Type', MIME_TYPES.get(ext, 'application/octet-stream'))
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', f'public, max-age={CACHE_SECONDS.get(ext, DEFAULT_CACHE)}')
        self.send_header('Last-Modified', email.utils.formatdate(fs.st_mtime, usegmt=True))
        if gzip_ok:
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Vary', 'Accept-Encoding')
        self.end_headers()
        if send_body:
            self.wfile.write(body)

    def do_GET(self):
        self._handle(send_body=True)

    def do_HEAD(self):
        self._handle(send_body=False)

    def log_message(self, fmt, *args):
        sys.stderr.write(f'{self.address_string()} - - [{self.log_date_time_string()}] {fmt % args}\n')


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    directory = sys.argv[2] if len(sys.argv) > 2 else '.'
    CachingGzipHandler.directory = os.path.abspath(directory)
    httpd = ThreadingHTTPServer(('', port), CachingGzipHandler)
    print(f'Serving {CachingGzipHandler.directory} on :{port} (Cache-Control + Gzip aktiv)')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()

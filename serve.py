#!/usr/bin/env python3
"""Run MallWay locally with consistent MIME types and a free loopback port."""
import argparse
import errno
import functools
import http.server
from pathlib import Path
import sys
import threading
import webbrowser

ROOT = Path(__file__).resolve().parent
WEB_ROOT = ROOT / 'dist'
REQUIRED = ['index.html', 'bootstrap.js', 'app.mjs', 'camera.mjs', 'core.mjs',
            'plan-network.mjs', 'navigation.mjs', 'directory.json', 'geometry.json', 'assets/qrcode.js']


class MallWayHandler(http.server.SimpleHTTPRequestHandler):

    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map,
                          **{'.mjs': 'text/javascript', '.js': 'text/javascript',
                             '.json': 'application/json', '.wasm': 'application/wasm',
                             '.css': 'text/css', '.html': 'text/html',
                             '.svg': 'image/svg+xml', '.png': 'image/png',
                             '.webmanifest': 'application/manifest+json'})

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()


def validate_project(directory=WEB_ROOT):
    missing = [name for name in REQUIRED if not (directory / name).is_file()]
    if missing:
        raise RuntimeError('Project files are missing: ' + ', '.join(missing)
                           + '. Extract the entire ZIP before starting MallWay.')


def make_server(host='127.0.0.1', port=8765, strict_port=False, directory=WEB_ROOT):
    handler = functools.partial(MallWayHandler, directory=str(directory))
    for candidate in range(port, min(port + (1 if strict_port or port == 0 else 20), 65536)):
        try:
            return http.server.ThreadingHTTPServer((host, candidate), handler)
        except OSError as error:
            if error.errno not in (errno.EADDRINUSE, 10048):
                raise
    raise RuntimeError('No available port. Close an old MallWay server or try --port 9000.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--strict-port', action='store_true')
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error('Port must be between 0 and 65535.')
    try:
        validate_project()
        server = make_server(args.host, args.port, args.strict_port)
    except (OSError, RuntimeError) as error:
        print('\nMallWay could not start: ' + str(error), flush=True)
        return 1
    host = '127.0.0.1' if args.host in ('0.0.0.0', '127.0.0.1') else args.host
    address = 'http://{}:{}/'.format(host, server.server_port)
    print('\nMallWay is ready: ' + address, flush=True)
    print('Keep this window open. Press Ctrl+C to stop.\n', flush=True)
    if not args.no_browser:
        opener = threading.Timer(.5, lambda: webbrowser.open(address))
        opener.daemon = True
        opener.start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nMallWay stopped.', flush=True)
    finally:
        server.server_close()
    return 0


if __name__ == '__main__':
    sys.exit(main())

import http.client
import http.server
import importlib.util
import json
import mimetypes
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('mallway_local', ROOT / 'serve.py')
local = importlib.util.module_from_spec(spec)
spec.loader.exec_module(local)


class LocalServerTests(unittest.TestCase):
    def test_bad_system_mime_mapping_is_overridden_for_real_http_requests(self):
        mimetypes.init()
        with patch.dict(mimetypes.types_map, {'.mjs': 'application/octet-stream', '.wasm': 'text/plain'}):
            ordinary = object.__new__(http.server.SimpleHTTPRequestHandler)
            self.assertEqual(ordinary.guess_type('app.mjs'), 'application/octet-stream')
            server = local.make_server(port=0)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                for path, expected in [('/app.mjs', 'text/javascript'), ('/core.mjs', 'text/javascript'),
                                       ('/bootstrap.js', 'text/javascript'), ('/directory.json', 'application/json'),
                                       ('/assets/ocr/tesseract-core-lstm.wasm', 'application/wasm')]:
                    client = http.client.HTTPConnection('127.0.0.1', server.server_port)
                    client.request('HEAD', path)
                    response = client.getresponse()
                    self.assertEqual(response.status, 200, path)
                    self.assertEqual(response.getheader('Content-Type'), expected, path)
                    self.assertIn('no-store', response.getheader('Cache-Control'))
                    response.read()
                    client.close()
                client = http.client.HTTPConnection('127.0.0.1', server.server_port)
                client.request('GET', '/')
                response = client.getresponse()
                self.assertIn(b'bootstrap.js', response.read())
                client.close()
                client = http.client.HTTPConnection('127.0.0.1', server.server_port)
                client.request('GET', '/directory.json')
                response = client.getresponse()
                self.assertEqual(len(json.loads(response.read())['stores']), 179)
                client.close()
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=2)

    def test_busy_port_selects_another_port_without_stopping_existing_server(self):
        first = local.make_server(port=0)
        second = None
        try:
            second = local.make_server(port=first.server_port)
            self.assertNotEqual(first.server_port, second.server_port)
            with self.assertRaises(RuntimeError):
                local.make_server(port=first.server_port, strict_port=True)
        finally:
            first.server_close()
            if second:
                second.server_close()

    def test_incomplete_extraction_has_actionable_error(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(RuntimeError, 'Extract the entire ZIP'):
                local.validate_project(Path(directory))
        local.validate_project()


if __name__ == '__main__':
    unittest.main()

"""Catch case URLs that look valid in a reply but no longer open."""
import importlib.util
import json
import sqlite3
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("rehearse", Path(__file__).with_name("rehearse.py"))
rehearse = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rehearse)


class CaseLinkTest(unittest.TestCase):
    def run_reply(self, status=200, returned_id="example123", page_status=200):
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(status if self.path.startswith('/api/') else page_status)
                self.end_headers()
                self.wfile.write(json.dumps({"id": returned_id}).encode())

            def log_message(self, *args):
                pass

        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        base = f'http://127.0.0.1:{server.server_port}'
        with tempfile.TemporaryDirectory() as tmp:
            profile = Path(tmp)
            (profile / '.env').write_text(f'CASEFILE_URL={base}/api/mcp\n')
            db = sqlite3.connect(profile / 'state.db')
            db.execute('create table messages (session_id text, role text, content text, tool_name text)')
            db.execute('insert into messages values (?, ?, ?, ?)', ('test', 'assistant', f'Case: {base}/c/example123', None))
            db.commit()
            db.close()
            proc = SimpleNamespace(stdout='Session: test\n', stderr='', returncode=0)
            with patch.object(rehearse, 'PROFILE_HOME', profile), patch.object(rehearse.subprocess, 'run', return_value=proc):
                return rehearse.run_once('fixture', '', 10)

    def test_deleted_case_is_a_failed_rehearsal(self):
        result = self.run_reply(status=404)
        self.assertTrue(result['caseLink'])
        self.assertIn('404', result['error'])

    def test_live_case_passes(self):
        self.assertEqual(self.run_reply()['error'], '')

    def test_wrong_case_response_fails(self):
        self.assertTrue(self.run_reply(returned_id='different123')['error'])

    def test_broken_case_page_fails_even_if_api_works(self):
        self.assertIn('404', self.run_reply(page_status=404)['error'])


if __name__ == '__main__':
    unittest.main()

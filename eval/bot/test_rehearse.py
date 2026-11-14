"""Check rehearsal isolation and case URLs that look valid but no longer open."""
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


class MemoryIsolationTest(unittest.TestCase):
    def test_inherited_and_prior_run_user_memory_are_cleared_before_invocation(self):
        with tempfile.TemporaryDirectory() as tmp:
            live_home = Path(tmp) / 'live'
            profile = live_home / 'profiles' / 'rehearse'
            inherited = {'MEMORY.md': 'Live household facts\n', 'USER.md': 'Live user facts\n'}
            for home in (live_home, profile):
                (home / 'memories').mkdir(parents=True)
                for name, content in inherited.items():
                    (home / 'memories' / name).write_text(content, encoding='utf-8')
            db = sqlite3.connect(profile / 'state.db')
            db.execute('create table messages (session_id text, role text, content text, tool_name text)')
            db.close()
            seen = []

            def invoke(*args, **kwargs):
                seen.append({name: (profile / 'memories' / name).read_text(encoding='utf-8')
                             for name in inherited})
                # Simulate facts saved by a model turn; the next invocation must not inherit them.
                for name in inherited:
                    (profile / 'memories' / name).write_text('Previous rehearsal facts\n', encoding='utf-8')
                return SimpleNamespace(stdout='Session: test\n', stderr='', returncode=0)

            with patch.object(rehearse, 'HOME', live_home), patch.object(rehearse, 'PROFILE_HOME', profile), \
                    patch.object(rehearse.subprocess, 'run', side_effect=invoke) as run:
                self.assertEqual(rehearse.run_once('first fixture', 'Selected rehearsal seed', 10)['error'], '')
                self.assertEqual(rehearse.run_once('second fixture', '', 10)['error'], '')
            self.assertEqual(run.call_count, 2)
            self.assertEqual(seen, [
                {'MEMORY.md': 'Selected rehearsal seed\n', 'USER.md': ''},
                {'MEMORY.md': '', 'USER.md': ''},
            ])
            for name, content in inherited.items():
                self.assertEqual((live_home / 'memories' / name).read_text(encoding='utf-8'), content)


if __name__ == '__main__':
    unittest.main()

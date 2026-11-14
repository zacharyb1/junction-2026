"""Offline checks for init completion/failure; no model service or download is used."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("init.sh")
FAKE_OLLAMA = r'''#!/usr/bin/env python3
import json, os, sys, time
from pathlib import Path
state = Path(os.environ["FAKE_STATE"])
calls = json.loads(state.read_text()) if state.exists() else []
calls.append(sys.argv[1:])
state.write_text(json.dumps(calls))
mode = os.environ["FAKE_MODE"]
command = sys.argv[1]
if command == "list" and mode == "offline":
    sys.exit(1)
if command == "show" and mode in ("missing", "pull_error"):
    sys.exit(1)
if command == "pull" and mode == "pull_error":
    sys.exit(1)
if command == "run" and mode == "warm_timeout":
    time.sleep(15)
'''


@unittest.skipUnless(shutil.which("timeout"), "The Linux init image supplies GNU timeout")
class GateInitTest(unittest.TestCase):
    def run_init(self, mode, **overrides):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            cli = root / "ollama"
            cli.write_text(FAKE_OLLAMA)
            cli.chmod(0o755)
            state = root / "calls.json"
            env = {**os.environ, "PATH": f"{root}{os.pathsep}{os.environ['PATH']}",
                   "FAKE_STATE": str(state), "FAKE_MODE": mode,
                   "KAVERI_GATE_MODEL": "gemma3:1b",
                   "KAVERI_GATE_READY_TIMEOUT": "1", "KAVERI_GATE_PULL_TIMEOUT": "1",
                   "KAVERI_GATE_WARM_TIMEOUT": "1", **overrides}
            result = subprocess.run(["sh", str(SCRIPT)], env=env, capture_output=True,
                                    text=True, timeout=10)
            calls = json.loads(state.read_text()) if state.exists() else []
            return result, calls

    def test_cached_model_is_loaded_without_a_download(self):
        result, calls = self.run_init("cached")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual([call[0] for call in calls], ["list", "show", "run"])
        self.assertEqual(calls[-1], ["run", "gemma3:1b", "", "--keepalive", "60m"])

    def test_missing_model_is_downloaded_before_loading(self):
        result, calls = self.run_init("missing")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual([call[0] for call in calls], ["list", "show", "pull", "run"])

    def test_failed_download_does_not_report_ready_or_try_loading(self):
        result, calls = self.run_init("pull_error")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Could not download", result.stderr)
        self.assertNotIn("run", [call[0] for call in calls])

    def test_unreachable_service_stops_with_a_bounded_error(self):
        result, calls = self.run_init("offline")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("did not become ready", result.stderr)
        self.assertTrue(calls)
        self.assertTrue(all(call[0] == "list" for call in calls))

    def test_slow_model_loading_stops_with_a_bounded_error(self):
        result, _ = self.run_init("warm_timeout")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Could not load", result.stderr)

    def test_invalid_timeout_is_rejected_before_contacting_ollama(self):
        result, calls = self.run_init("cached", KAVERI_GATE_READY_TIMEOUT="invalid")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("positive whole seconds", result.stderr)
        self.assertEqual(calls, [])


if __name__ == "__main__":
    unittest.main()

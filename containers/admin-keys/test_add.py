import os
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("add.sh")
KEYS = Path(__file__).with_name("keys.pub")
DEPLOY = 'command="/usr/local/sbin/kaveri-deploy",restrict ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDEPLOYKEYdeploykeydeploykeydeploykeydeploy kaveri-deploy'


def keys():
    return [l for l in KEYS.read_text().splitlines() if l.startswith("ssh-ed25519 ")]


class AddKeysTest(unittest.TestCase):
    def run_script(self, target):
        env = {**os.environ, "AUTHORIZED_KEYS": str(target), "KEYS_FILE": str(KEYS)}
        return subprocess.run(["sh", str(SCRIPT)], env=env, capture_output=True, text=True)

    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.target = Path(self.dir.name) / "authorized_keys"

    def tearDown(self):
        self.dir.cleanup()

    def lines(self):
        return [l for l in self.target.read_text().splitlines() if l]

    def test_appends_the_keys_and_keeps_the_deploy_key(self):
        self.target.write_text(DEPLOY + "\n")
        result = self.run_script(self.target)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.lines(), [DEPLOY, *keys()])

    def test_a_second_run_changes_nothing(self):
        self.target.write_text(DEPLOY + "\n")
        self.run_script(self.target)
        before = self.target.read_bytes()
        result = self.run_script(self.target)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("added 0 key(s)", result.stdout)
        self.assertEqual(self.target.read_bytes(), before)

    def test_a_file_without_a_final_newline_keeps_every_line_whole(self):
        self.target.write_text(DEPLOY)
        self.run_script(self.target)
        self.assertEqual(self.lines(), [DEPLOY, *keys()])

    def test_a_key_already_there_under_another_name_is_not_added_again(self):
        first = keys()[0].split()
        self.target.write_text(DEPLOY + "\n" + f"{first[0]} {first[1]} old-name\n")
        self.run_script(self.target)
        self.assertEqual(self.lines(), [DEPLOY, f"{first[0]} {first[1]} old-name", *keys()[1:]])

    def test_a_missing_file_is_not_created(self):
        result = self.run_script(self.target)
        self.assertEqual(result.returncode, 1)
        self.assertFalse(self.target.exists())

    def test_keys_file_holds_only_public_keys(self):
        text = KEYS.read_text()
        self.assertNotIn("PRIVATE", text)
        self.assertEqual(len(keys()), 2)


if __name__ == "__main__":
    unittest.main()

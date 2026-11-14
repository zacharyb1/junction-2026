import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("container_state", Path(__file__).with_name("state.py"))
state = importlib.util.module_from_spec(spec)
spec.loader.exec_module(state)


class ContainerStateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.home = Path(self.tmp.name)
        self.env = {
            "TELEGRAM_BOT_TOKEN": "12345:fake-test-token",
            "TELEGRAM_ALLOWED_USERS": "42, 43",
            "NVIDIA_API_KEY": "fake-provider",
            "EXA_API_KEY": "fake-exa",
            "CASEFILE_URL": "http://web:3000/api/mcp",
            "CASEFILE_SECRET": "fake-case-secret",
        }

    def test_missing_credentials_dont_claim_home(self):
        del self.env["NVIDIA_API_KEY"]
        with self.assertRaisesRegex(ValueError, "NVIDIA_API_KEY"):
            state.preflight(self.home, self.env)
        self.assertFalse((self.home / state.MARKER).exists())

    def test_first_boot_accepts_upstream_shell_skeleton(self):
        for name in state.SEED_FILES:
            (self.home / name).write_text("# upstream skeleton\n")
        state.preflight(self.home, self.env)
        marker = json.loads((self.home / state.MARKER).read_text())
        self.assertEqual(marker, state.identity(self.env))
        self.assertNotIn(self.env["TELEGRAM_BOT_TOKEN"], str(marker))

    def test_repeat_keeps_existing_memories_and_jobs(self):
        state.preflight(self.home, self.env)
        for relative in ["memories/MEMORY.md", "cron/jobs.json", ".env"]:
            path = self.home / relative
            path.parent.mkdir(exist_ok=True)
            path.write_text("preserve me")
        state.preflight(self.home, self.env)
        self.assertEqual((self.home / "cron/jobs.json").read_text(), "preserve me")
        self.assertEqual((self.home / "memories/MEMORY.md").read_text(), "preserve me")

    def test_other_token_rejected_before_mutation(self):
        state.preflight(self.home, self.env)
        marker = (self.home / state.MARKER).read_bytes()
        self.env["TELEGRAM_BOT_TOKEN"] = "98765:different-token"
        with self.assertRaisesRegex(ValueError, "different bot token"):
            state.preflight(self.home, self.env)
        self.assertEqual((self.home / state.MARKER).read_bytes(), marker)

    def test_unmarked_native_state_is_not_adopted(self):
        (self.home / "state.db").write_bytes(b"private-state")
        with self.assertRaisesRegex(ValueError, "unmarked"):
            state.preflight(self.home, self.env)
        self.assertFalse((self.home / state.MARKER).exists())

    def test_invalid_group_and_admin_values_rejected(self):
        for key, value in [("KAVERI_TELEGRAM_CHAT_ID", "-100typo"), ("TELEGRAM_ALLOWED_USERS", "*"),
                           ("KAVERI_TELEGRAM_OPEN_GROUPS", "yes")]:
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, key):
                state.preflight(self.home, {**self.env, key: value})

    def test_named_profiles_rejected(self):
        state.preflight(self.home, self.env)
        profile = self.home / "profiles" / "other-bot"
        profile.mkdir(parents=True)
        (profile / "SOUL.md").write_text("Other bot")
        with self.assertRaisesRegex(ValueError, "default profile"):
            state.preflight(self.home, self.env)

    def test_pending_gateway_recovery_rejected_before_cli_calls(self):
        state.preflight(self.home, self.env)
        (self.home / ".hermes-update-paused-gateways.test.json").write_text("{}")
        with self.assertRaisesRegex(ValueError, "gateway-update recovery"):
            state.preflight(self.home, self.env)


if __name__ == "__main__":
    unittest.main()

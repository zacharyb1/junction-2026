"""Check admin access setup without running Hermes or touching a live home."""
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parent


class ConfigureAdminTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        scripts = self.root / "hermes"
        (scripts / "bin").mkdir(parents=True)
        for name in ("configure.sh", "secrets.sh", "config.snippet.yaml", "bin/hermes"):
            shutil.copy2(SCRIPTS / name, scripts / name)
        (scripts / "install.sh").write_text("#!/usr/bin/env bash\nexit 0\n")
        self.local = self.root / ".hermes-local"
        (self.local / "home").mkdir(parents=True)
        self.env_file = self.local / "home" / ".env"
        self.calls_file = self.root / "calls.jsonl"
        executable = self.local / "agent" / ".hermes" / "bin" / "hermes"
        executable.parent.mkdir(parents=True)
        executable.write_text(
            "#!/usr/bin/env python3\n"
            "import json, os, sys\n"
            "with open(os.environ['CONFIGURE_CALLS'], 'a') as out:\n"
            "    out.write(json.dumps(sys.argv[1:]) + '\\n')\n"
        )
        executable.chmod(0o700)
        keys = self.root / "keys"
        keys.mkdir()
        (keys / "bot.env").write_text("")
        self.environment = {
            "PATH": os.environ["PATH"],
            "KAVERI_HERMES_LOCAL": str(self.local),
            "KAVERI_KEYS": str(keys),
            "CONFIGURE_CALLS": str(self.calls_file),
        }

    def run_script(self, script="configure.sh", *arguments):
        return subprocess.run(
            ["bash", str(self.root / "hermes" / script), *arguments],
            env=self.environment, capture_output=True, text=True, check=False,
        )

    def test_missing_admins_block_every_config_mode_before_writes(self):
        modes = ((), ("--group", "-100123"), ("--mode-a",), ("--mode-b",))
        for contents in (None, "TELEGRAM_ALLOW_ALL_USERS=true\n", "TELEGRAM_ALLOWED_USERS=\n"):
            for arguments in modes:
                with self.subTest(contents=contents, arguments=arguments):
                    if contents is None:
                        self.env_file.unlink(missing_ok=True)
                    else:
                        self.env_file.write_text(contents)
                    result = self.run_script("configure.sh", *arguments)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn("TELEGRAM_ALLOWED_USERS", result.stderr)
                    self.assertFalse(self.calls_file.exists())

    def test_invalid_admins_are_rejected_before_writes(self):
        for admins in ("*", "@owner", "-100123", "0", "123,", "123,,456", "123,wrong", "12 34"):
            with self.subTest(admins=admins):
                self.env_file.write_text(f"TELEGRAM_ALLOWED_USERS={admins}\nTELEGRAM_ALLOW_ALL_USERS=true\n")
                result = self.run_script()
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("positive numeric Telegram user IDs", result.stderr)
                self.assertFalse(self.calls_file.exists())

    def test_valid_admins_restrict_dm_and_group_commands(self):
        self.env_file.write_text("TELEGRAM_ALLOWED_USERS= 123, 456 \nTELEGRAM_ALLOW_ALL_USERS=true\n")
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = [json.loads(line) for line in self.calls_file.read_text().splitlines()]
        settings = {call[2]: json.loads(call[3]) for call in calls if call[2].startswith("platforms.telegram.extra.")}
        self.assertEqual(settings, {
            "platforms.telegram.extra.allow_admin_from": ["123", "456"],
            "platforms.telegram.extra.group_allow_admin_from": ["123", "456"],
            "platforms.telegram.extra.user_allowed_commands": ["start", "new"],
            "platforms.telegram.extra.group_user_allowed_commands": ["start", "new"],
        })

    def test_web_runtime_skips_admins_and_telegram(self):
        # The web instance has no Telegram token and no admins; it must still be configured.
        self.environment["KAVERI_RUNTIME"] = "web"
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = [json.loads(line) for line in self.calls_file.read_text().splitlines()]
        settings = {call[2]: call[3] for call in calls if call[:2] == ["config", "set"]}
        self.assertFalse([key for key in settings if key.startswith("platforms.telegram") or key.startswith("display.platforms.telegram")])
        disabled = json.loads(settings["agent.disabled_toolsets"])
        self.assertEqual(disabled[-2:], ["memory", "cronjob"])
        self.assertIn("terminal", disabled)
        self.assertEqual(settings["api_server.max_concurrent_runs"], "4")

    def test_web_runtime_can_research_and_read_cases_only(self):
        # Anonymous web visitors must not be able to talk AIDaddy into changing someone else's case.
        self.environment["KAVERI_RUNTIME"] = "web"
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = [json.loads(line) for line in self.calls_file.read_text().splitlines()]
        settings = {call[2]: call[3] for call in calls if call[:2] == ["config", "set"]}
        self.assertEqual(json.loads(settings["mcp_servers.casefile.tools.include"]), ["research_case", "case_get", "find_products"])

    def test_telegram_runtime_keeps_every_case_tool(self):
        self.env_file.write_text("TELEGRAM_ALLOWED_USERS=123\n")
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = [json.loads(line) for line in self.calls_file.read_text().splitlines()]
        self.assertFalse([call for call in calls if "mcp_servers.casefile.tools" in " ".join(call)])

    def test_web_calls_need_explicit_operator_opt_in(self):
        self.environment.update(KAVERI_RUNTIME="web", KAVERI_DEMO_CALLS="1")
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = [json.loads(line) for line in self.calls_file.read_text().splitlines()]
        settings = {call[2]: call[3] for call in calls if call[:2] == ["config", "set"]}
        self.assertEqual(json.loads(settings["mcp_servers.casefile.tools.include"]), [
            "research_case", "case_get", "find_products", "prepare_demo_call", "start_demo_call", "get_demo_call",
        ])

    def test_telegram_runtime_still_requires_admins(self):
        self.environment["KAVERI_RUNTIME"] = "telegram"
        result = self.run_script()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("TELEGRAM_ALLOWED_USERS", result.stderr)

    def test_open_groups_clears_the_group_allowlist_only(self):
        self.env_file.write_text("TELEGRAM_ALLOWED_USERS=123\n")
        result = self.run_script("configure.sh", "--open-groups")
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = [json.loads(line) for line in self.calls_file.read_text().splitlines()]
        # An empty allowed_chats is Hermes' "every group". Home-group settings stay as --group wrote them.
        self.assertEqual(calls, [["config", "set", "telegram.allowed_chats", ""]])

    def test_open_groups_still_requires_admins(self):
        self.env_file.write_text("TELEGRAM_ALLOW_ALL_USERS=true\n")
        result = self.run_script("configure.sh", "--open-groups")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.calls_file.exists())

    def test_open_bot_status_still_requires_admins(self):
        self.env_file.write_text("TELEGRAM_ALLOW_ALL_USERS=true\n")
        result = self.run_script("secrets.sh", "--status")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("[missing] TELEGRAM_ALLOWED_USERS (required for admin commands", result.stdout)
        self.assertNotIn("[optional] TELEGRAM_ALLOWED_USERS", result.stdout)
        self.assertFalse(self.calls_file.exists())


if __name__ == "__main__":
    unittest.main()

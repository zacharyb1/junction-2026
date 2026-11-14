"""The bot's name wakes the gate, and words that only contain its letters do not."""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "hermes" / "plugins" / "kaveri-gate"))
import gate  # noqa: E402


class BotNameTest(unittest.TestCase):
    def assert_wakes(self, *texts):
        for text in texts:
            with self.subTest(text=text):
                self.assertTrue(gate.BOT_NAME.search(text), f"should wake: {text!r}")

    def test_ukk_wakes(self):
        # Finnish case endings follow a colon: "UKK:lta" is "from UKK".
        self.assert_wakes("UKK, we got a letter", "hei ukk", "@UKK help", "kysyin UKK:lta")

    def test_old_names_still_wake(self):
        self.assert_wakes("AIDaddy?", "ai daddy help", "Kaveri, katso tämä")

    def test_lookalikes_do_not_wake(self):
        for text in ("ukko tulee kotiin", "Ukkonen soitti", "joulupukki", "bukk"):
            with self.subTest(text=text):
                self.assertIsNone(gate.BOT_NAME.search(text), f"should not wake: {text!r}")


if __name__ == "__main__":
    unittest.main()

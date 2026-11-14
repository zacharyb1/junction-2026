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

    def test_aidaddy_wakes(self):
        self.assert_wakes("AIDaddy, we got a letter", "hei aidaddy", "AI Daddy help", "ai daddy help",
                          "@AIDaddy help", "AIDaddy?")

    def test_aidaddy_with_a_finnish_case_ending_wakes(self):
        # A Finnish case ending is written straight after the name: "AIDaddylta" is "from AIDaddy".
        self.assert_wakes("AIDaddyn suunnitelma", "kerro AIDaddylle", "kysyin AIDaddylta", "odotetaan AIDaddya")
        # People also type the endings with front vowels, and the other common cases.
        self.assert_wakes("kysyin AIDaddyltä", "odotetaan AIDaddyä", "AIDaddylla on suunnitelma",
                          "luotan AIDaddyyn", "kerro AI Daddylle")

    def test_earlier_names_still_wake(self):
        # After an abbreviation the case ending follows a colon: "UKK:lta" is "from UKK".
        self.assert_wakes("UKK, we got a letter", "hei ukk", "@UKK help", "kysyin UKK:lta")
        self.assert_wakes("Kaveri, katso tämä", "kaveri?")

    def test_lookalikes_do_not_wake(self):
        for text in ("ukko tulee kotiin", "Ukkonen soitti", "joulupukki", "bukk", "raidaddy",
                     "daddy is home", "AI is everywhere", "kaverit tulevat kylään"):
            with self.subTest(text=text):
                self.assertIsNone(gate.BOT_NAME.search(text), f"should not wake: {text!r}")


if __name__ == "__main__":
    unittest.main()

import unittest

from rehearse_capabilities import assert_proactive_proposal


class ProactiveEvidenceChecks(unittest.TestCase):
    plan = "Prepare a written notice for your landlord and review it before sending. [1]"
    url = "https://aidaddy.example/c/TESTPROACTIVE"
    memory = "Household -100101: Finland.\n§\nOpen case TESTPROACTIVE: Moving out — chat -100101"

    def check(self, announcement, memory=None):
        assert_proactive_proposal([self.plan + "\n" + self.url, announcement], self.plan, self.url,
                                  self.memory if memory is None else memory, "\n§\n")

    def test_accepts_draft_that_waits_for_review(self):
        self.check("I drafted the notice. Sending waits for your click on the case page.")

    def test_research_plan_cannot_supply_missing_approval_wording(self):
        with self.assertRaises(AssertionError):
            self.check("I drafted the notice.")

    def test_rejects_sending_claim_even_when_approval_is_also_mentioned(self):
        with self.assertRaises(AssertionError):
            self.check("I drafted the notice. Sending waits for your click. I have sent it.")

    def test_seeded_chat_label_cannot_supply_missing_case_ownership(self):
        with self.assertRaises(AssertionError):
            self.check("I drafted the notice. Sending waits for your click.",
                       "Household -100101: Finland.\n§\nOpen case TESTPROACTIVE: Moving out")


if __name__ == "__main__":
    unittest.main()

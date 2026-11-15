"""The live rehearsal must fail when a transcript hides an unfinished step."""
import unittest

from rehearse_telegram_context import CASE_ID, CASE_URL, CHAT, CONTEXT, PLAN, assert_rehearsal, not_now_response


class ContextRehearsalEvidenceTest(unittest.TestCase):
    def report(self):
        draft = {"kind": "letter", "title": "Notice to the current landlord", "body": "Please review this draft."}
        return {
            "completed": True, "trigger_prompt": "\n".join(CONTEXT), "gate_results": ["skip", "skip", "wake"],
            "timeline": [
                {"kind": "notification", "text": "Checking the official sources."},
                {"kind": "tool", "name": "research_case", "input": {"country": "Finland", "region": "Helsinki",
                    "situation": "Moving from Helsinki to Tampere on 1 December 2026.", "household": "Two adults, no children."}},
                {"kind": "tool", "name": "case_update", "input": {"id": CASE_ID, "patch": {"drafts": [draft]}}},
                {"kind": "interim", "text": f"Your plan is ready.\n{PLAN}\n{CASE_URL}\nI drafted the notice. Sending waits for your review."},
                {"kind": "clarify", "questions": [{"qid": "next", "choices": ["Review the draft", "Not now"]}], "answer": "Not now"},
            ],
            "drafts": [draft], "premature_questions": [], "final_response": "Okay.",
            "memory": f"Open case {CASE_ID}: Moving, chat {CHAT}", "memory_delimiter": "\n§\n",
        }

    def test_accepts_context_and_proposal_presented_before_approval(self):
        assert_rehearsal(self.report())

    def test_rejects_lost_city_despite_context_in_prompt(self):
        report = self.report()
        del report["timeline"][1]["input"]["region"]
        report["timeline"][1]["input"]["situation"] = "Moving to Tampere on 1 December 2026."
        with self.assertRaisesRegex(AssertionError, "earlier city"):
            assert_rehearsal(report)

    def test_rejects_cities_with_reversed_roles(self):
        report = self.report()
        report["timeline"][1]["input"]["situation"] = "Moving from Tampere to Helsinki on 1 December 2026."
        with self.assertRaisesRegex(AssertionError, "origin/destination"):
            assert_rehearsal(report)

    def test_rejects_contradictory_move_direction(self):
        report = self.report()
        report["timeline"][1]["input"]["household"] += " Moving from Tampere to Helsinki."
        with self.assertRaisesRegex(AssertionError, "contradicted"):
            assert_rehearsal(report)

    def test_rejects_cities_without_roles(self):
        report = self.report()
        report["timeline"][1]["input"]["situation"] = "Helsinki, Tampere, moving on 1 December 2026."
        with self.assertRaisesRegex(AssertionError, "origin/destination"):
            assert_rehearsal(report)

    def test_rejects_missing_or_changed_date(self):
        for date in ("soon", "1 December", "1 December 2027", "2 December 2026", "1 November 2026"):
            with self.subTest(date=date):
                report = self.report()
                report["timeline"][1]["input"]["situation"] = f"Moving from Helsinki to Tampere on {date}."
                with self.assertRaisesRegex(AssertionError, "move date"):
                    assert_rehearsal(report)

    def test_rejects_contradictory_date_elsewhere_in_request(self):
        report = self.report()
        report["timeline"][1]["input"]["household"] += " Moving on 1 December 2027."
        with self.assertRaisesRegex(AssertionError, "move date"):
            assert_rehearsal(report)

    def test_accepts_equivalent_date_formats_and_explicit_roles(self):
        for date in ("2026-12-01", "1.12.2026", "December 1, 2026", "1 Dec 2026"):
            with self.subTest(date=date):
                report = self.report()
                report["timeline"][1]["input"]["situation"] = f"Current home Helsinki; destination Tampere; moving on {date}."
                assert_rehearsal(report)

    def test_rejects_changed_household(self):
        report = self.report()
        report["timeline"][1]["input"]["household"] = "Two adults with children."
        with self.assertRaisesRegex(AssertionError, "no-children"):
            assert_rehearsal(report)

    def test_rejects_unsupported_arrival_or_residency_tenure(self):
        for addition in ("First year or two in Finland.", "Recently arrived in Finland.",
                         "Newcomers to Finland.", "They have lived in Finland for two years.",
                         "They moved to Finland in 2025.", "Two years in Finland."):
            with self.subTest(addition=addition):
                report = self.report()
                report["timeline"][1]["input"]["household"] += " " + addition
                with self.assertRaisesRegex(AssertionError, "invented arrival or residency"):
                    assert_rehearsal(report)

    def test_rejects_start_after_research(self):
        report = self.report()
        report["timeline"][0:2] = reversed(report["timeline"][0:2])
        with self.assertRaisesRegex(AssertionError, "Start notification"):
            assert_rehearsal(report)

    def test_rejects_duplicate_model_acknowledgement(self):
        report = self.report()
        report["timeline"].insert(0, {"kind": "interim", "text": "I will check now."})
        with self.assertRaisesRegex(AssertionError, "duplicated"):
            assert_rehearsal(report)

    def test_rejects_plan_only_in_final_response_after_question(self):
        report = self.report()
        report["final_response"] = report["timeline"].pop(3)["text"]
        with self.assertRaisesRegex(AssertionError, "not presented before"):
            assert_rehearsal(report)

    def test_rejects_draft_attached_only_after_approval(self):
        report = self.report()
        report["timeline"].append(report["timeline"].pop(2))
        with self.assertRaisesRegex(AssertionError, "not attached before"):
            assert_rehearsal(report)

    def test_rejects_invalid_only_draft_attempt_without_crashing(self):
        report = self.report()
        report["timeline"][2]["input"]["patch"] = '{"drafts": []}'
        with self.assertRaisesRegex(AssertionError, "not attached before"):
            assert_rehearsal(report)

    def test_accepts_recovery_after_invalid_draft_attempt(self):
        report = self.report()
        report["timeline"].insert(2, {"kind": "tool", "name": "case_update", "succeeded": False,
                                     "input": {"id": CASE_ID, "patch": '{"drafts": []}'}})
        report["timeline"][3]["succeeded"] = True
        assert_rehearsal(report)

    def test_rejects_valid_looking_draft_attempt_that_failed(self):
        report = self.report()
        report["timeline"][2]["succeeded"] = False
        with self.assertRaisesRegex(AssertionError, "not attached before"):
            assert_rehearsal(report)

    def test_rejects_attempt_that_does_not_match_the_saved_draft(self):
        report = self.report()
        report["timeline"][2]["input"]["patch"]["drafts"] = [{"kind": "letter", "title": "Different letter", "body": "Different body"}]
        with self.assertRaisesRegex(AssertionError, "not attached before"):
            assert_rehearsal(report)

    def test_rejects_draft_without_its_own_sending_boundary(self):
        report = self.report()
        report["timeline"][3]["text"] = f"{PLAN}\n{CASE_URL}\nI drafted the notice."
        with self.assertRaisesRegex(AssertionError, "awaiting review"):
            assert_rehearsal(report)

    def test_rejects_sending_claim(self):
        report = self.report()
        report["timeline"][3]["text"] += " I have sent it."
        with self.assertRaisesRegex(AssertionError, "irreversible"):
            assert_rehearsal(report)

    def test_rejects_case_ownership_borrowed_from_another_entry(self):
        report = self.report()
        report["memory"] = f"Household {CHAT}: Finland.\n§\nOpen case {CASE_ID}: Moving"
        with self.assertRaisesRegex(AssertionError, "ownership"):
            assert_rehearsal(report)

    def test_rejects_missing_not_now_option(self):
        report = self.report()
        report["timeline"][4]["questions"][0]["choices"] = ["Review the draft", "Set reminders"]
        with self.assertRaisesRegex(AssertionError, "Not now choice"):
            assert_rehearsal(report)

    def test_rejects_irreversible_action_choices(self):
        for choice in ("Send the letter", "Review and send", "Submit the notice", "File the appeal", "Pay the rent", "Book a mover", "Email the landlord"):
            with self.subTest(choice=choice):
                report = self.report()
                report["timeline"][4]["questions"][0]["choices"].insert(0, choice)
                with self.assertRaisesRegex(AssertionError, "irreversible action"):
                    assert_rehearsal(report)

    def test_cannot_hide_irreversible_choice_in_normalized_list(self):
        report = self.report()
        question = report["timeline"][4]["questions"][0]
        question["choices_offered"] = ["Send the notice", "Not now"]
        with self.assertRaisesRegex(AssertionError, "irreversible action"):
            assert_rehearsal(report)

    def test_callback_returns_actual_offered_not_now_option(self):
        questions = [{"qid": "next", "choices": ["Review the draft", "Not now (Recommended)"],
                      "choices_offered": ["Review the draft", "Not now"]}]
        self.assertEqual(not_now_response(questions), {"outcome": "submitted", "answers": {"next": "Not now"}})

    def test_callback_rejects_missing_option_instead_of_inventing_answer(self):
        with self.assertRaisesRegex(AssertionError, "Not now choice"):
            not_now_response([{"qid": "next", "choices": ["Review the draft"]}])


if __name__ == "__main__":
    unittest.main()

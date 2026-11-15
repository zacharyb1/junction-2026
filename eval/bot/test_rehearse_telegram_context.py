"""The live rehearsal must fail when a transcript hides an unfinished step."""
import unittest
from pathlib import Path
import tempfile

import rehearsal_prompt
from rehearsal_prompt import verify_skill_prompt
from rehearse_telegram_context import (
    CASE_ID, CASE_URL, CHAT, CONTEXT, FORM_PLAN, FORM_PORTAL, PLAN,
    UNCONFIRMED_PLAN, assert_rehearsal, not_now_response,
)


# Sanitized structural reproduction of the live #103 failure. No real family,
# chat, Case ID or text from a private conversation is retained here.
INVALID_DVV_LETTER = {
    "kind": "letter", "title": "Notification of move to DVV",
    "body": "To: DVV\nSubject: Notification of move\nWe notify you of our move from Helsinki to Tampere on 1 December 2026. Please update our address.\n[Household names]",
}


class ConfiguredSkillsTest(unittest.TestCase):
    def test_rehearsal_reads_all_skills_from_the_deployed_configuration(self):
        sources = rehearsal_prompt.configured_skill_sources(Path(__file__).resolve().parents[2])
        self.assertEqual(list(sources), ["life-event-butler", "letter-decoder", "deadline-keeper",
                                         "birthday-planner", "law-check", "product-finder"])
        proof = verify_skill_prompt("\n".join(sources.values()), sources, list(sources))
        self.assertEqual(set(proof["skills"]), set(sources))

    def test_missing_configured_skill_stops_before_rehearsal(self):
        with tempfile.TemporaryDirectory() as temporary:
            repo = Path(temporary)
            (repo / "hermes").mkdir()
            (repo / "hermes/configure.sh").write_text('set_key skills.auto_load \'["missing-skill"]\'\n')
            with self.assertRaisesRegex(ValueError, "current SKILL.md.*missing-skill"):
                rehearsal_prompt.configured_skill_sources(repo)

    def test_dynamic_configuration_cannot_silently_fall_back_to_one_skill(self):
        with tempfile.TemporaryDirectory() as temporary:
            repo = Path(temporary)
            (repo / "hermes").mkdir()
            (repo / "hermes/configure.sh").write_text('set_key skills.auto_load "$AUTO_LOAD"\n')
            with self.assertRaisesRegex(ValueError, "one literal skills.auto_load"):
                rehearsal_prompt.configured_skill_sources(repo)


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

    def form_report(self, scenario="official-form", checklist=False):
        report = self.report()
        report["case_scenario"] = scenario
        report["drafts"] = []
        report["timeline"].pop(2)
        plan = FORM_PLAN if scenario == "official-form" else UNCONFIRMED_PLAN
        report["timeline"][2]["text"] = f"Your plan is ready.\n{plan}\n{CASE_URL}"
        report["timeline"][3]["questions"][0]["choices"] = ["Set reminders", "Why I spoke", "Not now"]
        if checklist:
            route = f"Complete the official process at {FORM_PORTAL}." if scenario == "official-form" else "Verify the official submission route before proceeding."
            draft = {"kind": "checklist", "title": "Move preparation notes", "body": f"Preparation only: Helsinki to Tampere, 1 December 2026. {route}"}
            report["drafts"] = [draft]
            report["timeline"].insert(2, {"kind": "tool", "name": "case_update", "succeeded": True,
                "input": {"id": CASE_ID, "patch": {"drafts": [draft]}}})
            report["timeline"][3]["text"] += "\nI prepared a notification checklist for your own preparation."
        return report

    def captured_bad_form_report(self):
        report = self.form_report("unconfirmed-route")
        draft = dict(INVALID_DVV_LETTER)
        report["drafts"] = [draft]
        report["timeline"].insert(2, {"kind": "tool", "name": "case_update", "succeeded": True,
            "input": {"id": CASE_ID, "patch": {"drafts": [draft]}}})
        report["timeline"][3]["text"] += "\nI drafted the DVV notification. Sending waits for your review."
        return report

    def test_accepts_context_and_proposal_presented_before_approval(self):
        assert_rehearsal(self.report())

    def test_accepts_move_out_and_tenancy_notice_without_recipient_label(self):
        for title, body in (
            ("Notice of move-out", "We are moving out of the rental home on 1 December 2026. Please arrange a move-out inspection."),
            ("Tenancy termination notice", "We give notice that our tenancy will end. [Your names]"),
        ):
            with self.subTest(title=title):
                report = self.report()
                report["drafts"][0].update(title=title, body=body)
                assert_rehearsal(report)

    def test_rejects_unrelated_letter_in_landlord_scenario(self):
        report = self.report()
        report["drafts"][0].update(title="Notification to DVV", body="Please update our address.")
        with self.assertRaisesRegex(AssertionError, "landlord draft is malformed"):
            assert_rehearsal(report)

    def test_move_out_notice_does_not_excuse_plan_only_after_buttons(self):
        report = self.report()
        report["drafts"][0].update(title="Notice of move-out", body="We are moving out of the rental home.")
        report["final_response"] = report["timeline"].pop(3)["text"]
        with self.assertRaisesRegex(AssertionError, "not presented before"):
            assert_rehearsal(report)

    def test_accepts_official_form_without_any_draft(self):
        assert_rehearsal(self.form_report())

    def test_accepts_official_form_preparation_checklist(self):
        assert_rehearsal(self.form_report(checklist=True))

    def test_rejects_sanitized_live_dvv_letter_pattern(self):
        with self.assertRaisesRegex(AssertionError, "fabricated a filing draft"):
            assert_rehearsal(self.captured_bad_form_report())

    def test_reports_filing_letter_even_when_attached_with_preparation_notes(self):
        report = self.captured_bad_form_report()
        report["drafts"].append({"kind": "checklist", "title": "Preparation notes", "body": "Confirm the official submission route."})
        report["timeline"][2]["input"]["patch"]["drafts"] = report["drafts"]
        with self.assertRaisesRegex(AssertionError, "fabricated a filing draft"):
            assert_rehearsal(report)

    def test_rejects_duplicate_preparation_notes(self):
        report = self.form_report(checklist=True)
        report["drafts"].append(dict(report["drafts"][0]))
        with self.assertRaisesRegex(AssertionError, "duplicate preparation notes"):
            assert_rehearsal(report)

    def test_rejects_fabricated_letter_even_when_route_is_known(self):
        report = self.captured_bad_form_report()
        report["case_scenario"] = "official-form"
        report["timeline"][3]["text"] = report["timeline"][3]["text"].replace(UNCONFIRMED_PLAN, FORM_PLAN)
        with self.assertRaisesRegex(AssertionError, "fabricated a filing draft"):
            assert_rehearsal(report)

    def test_checklist_label_cannot_disguise_a_filing_letter(self):
        report = self.form_report(checklist=True)
        report["drafts"][0]["body"] += "\nTo: DVV\nPlease update our address."
        with self.assertRaisesRegex(AssertionError, "addressed as an official filing"):
            assert_rehearsal(report)

    def test_rejects_notes_presented_for_submission(self):
        for claim in ("Submit these notes to DVV.", "Hand in this checklist.", "Sending waits for your review."):
            with self.subTest(claim=claim):
                report = self.form_report(checklist=True)
                report["timeline"][3]["text"] += "\n" + claim
                with self.assertRaisesRegex(AssertionError, "preparation notes as a submission"):
                    assert_rehearsal(report)

    def test_accepts_household_submitting_the_verified_official_form(self):
        report = self.form_report()
        report["timeline"][2]["text"] += (
            "\nSubmission route: the official online move-notification service, or a paper form from an official service point"
            " — no letter draft is needed; you submit it yourselves. I never send anything on your behalf."
        )
        assert_rehearsal(report)

    def test_accepts_explicitly_negated_drafting_and_sending(self):
        report = self.form_report()
        report["timeline"][2]["text"] += (
            "\nSubmission route: the official online move service, or the paper form from an official service point"
            " — no letter route is confirmed by the sources, so there is nothing for me to draft and send on your behalf."
        )
        assert_rehearsal(report)

    def test_negation_does_not_hide_affirmative_filing_or_exceptions(self):
        for claim in (
            "I will draft and send a letter on your behalf.",
            "There is nothing else for me to do except draft and send a letter on your behalf.",
            "There is nothing for me to draft and send on your behalf, except this DVV notification.",
            "There is nothing for me to draft and send on your behalf. I will draft and send a letter.",
            "No letter route is confirmed by the sources, but I will draft and send a letter.",
        ):
            with self.subTest(claim=claim):
                report = self.form_report()
                report["timeline"][2]["text"] += "\n" + claim
                with self.assertRaisesRegex(AssertionError, "preparation notes as a submission"):
                    assert_rehearsal(report)

    def test_rejects_recommending_an_unsaved_filing_letter(self):
        report = self.form_report("unconfirmed-route")
        report["timeline"][2]["text"] += (
            "\nI could not save the draft letter to DVV — you can write and send it yourselves;"
            " I never send anything on your behalf."
        )
        with self.assertRaisesRegex(AssertionError, "preparation notes as a submission"):
            assert_rehearsal(report)

    def test_rejects_preparation_notes_without_official_route(self):
        report = self.form_report(checklist=True)
        report["drafts"][0]["body"] = "Preparation notes: Helsinki to Tampere."
        with self.assertRaisesRegex(AssertionError, "omitted the official route"):
            assert_rehearsal(report)

    def test_rejects_draft_notice_and_reply_choices_for_forms(self):
        for choice in ("Draft notice", "Draft a reply", "Draft a response", "Hand in the notice"):
            with self.subTest(choice=choice):
                report = self.form_report()
                report["timeline"][3]["questions"][0]["choices"].insert(0, choice)
                with self.assertRaisesRegex(AssertionError, "offered a fabricated filing draft"):
                    assert_rehearsal(report)

    def test_form_still_requires_plan_before_buttons(self):
        report = self.form_report()
        report["timeline"][2]["text"] = CASE_URL
        with self.assertRaisesRegex(AssertionError, "Plan and Case link"):
            assert_rehearsal(report)

    def test_accepts_unconfirmed_route_without_inventing_method(self):
        assert_rehearsal(self.form_report("unconfirmed-route"))
        assert_rehearsal(self.form_report("unconfirmed-route", checklist=True))

    def test_rejects_invented_submission_url_without_route_evidence(self):
        report = self.form_report("unconfirmed-route")
        report["timeline"][2]["text"] += f"\nUse {FORM_PORTAL}."
        with self.assertRaisesRegex(AssertionError, "unverified submission URL"):
            assert_rehearsal(report)

    def test_rejects_invented_submission_method_without_url(self):
        report = self.form_report("unconfirmed-route")
        report["timeline"][2]["text"] += "\nUse the joint online service or paper form."
        with self.assertRaisesRegex(AssertionError, "unverified submission method"):
            assert_rehearsal(report)

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

    def test_accepts_home_as_the_current_origin(self):
        for home in ("Home is Helsinki, Finland", "Home Helsinki, Finland"):
            with self.subTest(home=home):
                report = self.report()
                report["timeline"][1]["input"]["situation"] = f"{home}; moving to Tampere on 1 December 2026."
                assert_rehearsal(report)

    def test_home_wording_does_not_allow_reversed_move(self):
        report = self.report()
        report["timeline"][1]["input"]["situation"] = "Home is Tampere; moving to Helsinki on 1 December 2026."
        with self.assertRaisesRegex(AssertionError, "origin/destination"):
            assert_rehearsal(report)

    def test_new_home_is_not_the_current_origin(self):
        report = self.report()
        report["timeline"][1]["input"]["situation"] = "New home Helsinki; destination Tampere; moving on 1 December 2026."
        with self.assertRaisesRegex(AssertionError, "origin/destination"):
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


class SkillPromptPreflightTest(unittest.TestCase):
    source = "---\nname: life-event-butler\n---\n\n# Life Event Butler\nUse the current route rule.\n"

    def test_records_proof_of_complete_current_body(self):
        proof = verify_skill_prompt("System\n# Life Event Butler\nUse the current route rule.\n",
                                    {"life-event-butler": self.source}, ["life-event-butler"])
        self.assertEqual(proof["loaded_skills"], ["life-event-butler"])
        self.assertTrue(proof["skills"]["life-event-butler"]["loaded"])
        self.assertEqual(len(proof["skills"]["life-event-butler"]["source_sha256"]), 64)

    def test_rejects_discovery_description_without_skill_body(self):
        with self.assertRaisesRegex(AssertionError, "omitted the current full"):
            verify_skill_prompt("Available skills: life-event-butler — research life events.",
                                {"life-event-butler": self.source}, ["life-event-butler"])

    def test_rejects_stale_loaded_skill_body(self):
        with self.assertRaisesRegex(AssertionError, "omitted the current full"):
            verify_skill_prompt("# Life Event Butler\nUse the old rule.",
                                {"life-event-butler": self.source}, ["life-event-butler"])

    def test_rejects_body_without_native_auto_load_evidence(self):
        with self.assertRaisesRegex(AssertionError, "did not auto-load"):
            verify_skill_prompt(self.source, {"life-event-butler": self.source}, [])


if __name__ == "__main__":
    unittest.main()

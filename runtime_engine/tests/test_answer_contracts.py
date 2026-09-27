import unittest

from scripture_archive_runtime.answer_contracts import (
    answer_contract_descriptor,
    canonical_task_type,
    validate_answer_dto,
)
from scripture_archive_runtime.package_adapters import adapt_node_for_runtime
from scripture_archive_runtime.provenance import canonical_answer_dto
from scripture_archive_runtime.security import ValidationError


class AnswerContractTests(unittest.TestCase):
    def test_speaker_recipient_contract(self):
        dto = validate_answer_dto("SPEAKER_RECIPIENT", {"schema":"ANSWER_DTO_v1","task_type":"SPEAKER_RECIPIENT","speaker":"Narrator","recipient":"Reader"})
        self.assertEqual(dto["speaker"], "Narrator")

    def test_ot_nt_link_contract(self):
        dto = validate_answer_dto("OT_NT_LINK", {"ot_passage":"2 Samuel 7:14","nt_passage":"Hebrews 1:5","relation_category":"DIRECT_QUOTATION","confidence":"T2","evidence_id":"EV-1"})
        self.assertEqual(dto["task_type"], "OT_NT_LINK")

    def test_matching_pairs_are_linear_json(self):
        dto = validate_answer_dto("MATCHING", {"pairs":[{"left":"Matthew","right":"Matthew 14"}]})
        self.assertEqual(dto["pairs"][0]["left"], "Matthew")

    def test_unknown_field_fails_closed(self):
        with self.assertRaises(ValidationError):
            validate_answer_dto("SINGLE_CHOICE", {"choice":"A", "script":"bad"})

    def test_task_type_mismatch_fails_closed(self):
        with self.assertRaises(ValidationError):
            validate_answer_dto("SINGLE_CHOICE", {"schema":"ANSWER_DTO_v1","task_type":"MULTI_SELECT","choice":"A"})

    def test_descriptor_is_versioned(self):
        self.assertEqual(answer_contract_descriptor("OT_NT_LINK")["schema"], "ANSWER_DTO_v1")

    def test_short_free_response_uses_existing_short_text_contract_and_grader(self):
        self.assertEqual(canonical_task_type("short free response"), "SHORT_TEXT")
        dto = validate_answer_dto(
            "SHORT_FREE_RESPONSE",
            {"task_type": "SHORT_TEXT", "text": "До в'язниці і до смерті."},
        )
        self.assertEqual(dto["task_type"], "SHORT_TEXT")
        self.assertEqual(dto["text"], "До в'язниці і до смерті.")

        # Exact canonical semantics from LN04-N07: historical spelling is a
        # short semantic text response, not a new grader or answer shape.
        node = {
            "node_id": "LN04-N07",
            "mission_id": "LN-04",
            "response_mode": "short free response",
            "accepted_answer": "До в'язниці і до смерті.",
            "accepted_variants": "prison/imprisonment + death.",
            "required_evidence": "Lk 22:33.",
        }
        projected = canonical_answer_dto(node)
        self.assertEqual(projected["task_type"], "SHORT_TEXT")
        self.assertEqual(projected["text"], node["accepted_answer"])

        adapted = adapt_node_for_runtime(node, lane="LN-04")
        self.assertEqual(adapted["task_type"], "SHORT_TEXT")
        self.assertEqual(adapted["answer_dto"], projected)
        self.assertEqual(adapted["grading"]["accepted_text"], node["accepted_answer"])
        self.assertEqual(adapted["grading"]["accepted_text_aliases"], [node["accepted_variants"]])


    def test_structured_free_response_uses_existing_short_text_contract(self):
        self.assertEqual(canonical_task_type("structured free response"), "SHORT_TEXT")
        dto = validate_answer_dto(
            "STRUCTURED_FREE_RESPONSE",
            {
                "task_type": "SHORT_TEXT",
                "text": "A large upper room that was furnished, where the preparation was to be made.",
            },
        )
        self.assertEqual(dto["task_type"], "SHORT_TEXT")

        # Canonical LN01-N08 semantics: this historical response_mode is still
        # a semantic free-text answer.  Preserve authored truth and project it
        # through the existing text DTO/grader instead of inventing a new type.
        node = {
            "node_id": "LN01-N08",
            "mission_id": "LN-01",
            "response_mode": "structured free response",
            "task_family": "evidence extraction",
            "accepted_answer": "A large upper/upstairs room that was furnished, where the preparation was to be made.",
            "accepted_variants": "Equivalent translation wording preserving large + upper/upstairs + furnished.",
            "required_evidence": ["Mark 14:15", "Luke 22:12"],
        }
        projected = canonical_answer_dto(node)
        self.assertEqual(projected["task_type"], "SHORT_TEXT")
        self.assertEqual(projected["text"], node["accepted_answer"])

        adapted = adapt_node_for_runtime(node, lane="LN-01")
        self.assertEqual(adapted["task_type"], "SHORT_TEXT")
        self.assertEqual(adapted["answer_dto"], projected)
        self.assertEqual(adapted["grading"]["accepted_text"], node["accepted_answer"])
        self.assertEqual(adapted["grading"]["accepted_text_aliases"], [node["accepted_variants"]])


if __name__ == '__main__': unittest.main()

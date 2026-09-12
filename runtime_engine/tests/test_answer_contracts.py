import unittest

from scripture_archive_runtime.answer_contracts import answer_contract_descriptor, canonical_task_type, validate_answer_dto
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

    def test_historical_free_response_aliases_preserve_text_contract(self):
        for historical in ("short free response", "structured free response", "citation + paraphrase"):
            self.assertEqual("SHORT_TEXT", canonical_task_type(historical))
            dto = validate_answer_dto(historical, {"text": "Not stated in the cited text."})
            self.assertEqual("SHORT_TEXT", dto["task_type"])
            self.assertEqual("Not stated in the cited text.", dto["text"])

    def test_historical_explanation_aliases_follow_packaged_mapper_contract(self):
        self.assertEqual("LONG_TEXT", canonical_task_type("comparison + explanation"))
        self.assertEqual("SINGLE_CHOICE", canonical_task_type("classification + explanation"))

if __name__ == '__main__': unittest.main()

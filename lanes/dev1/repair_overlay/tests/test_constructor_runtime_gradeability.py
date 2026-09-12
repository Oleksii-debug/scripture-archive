from __future__ import annotations

import unittest

from scripture_archive_runtime.grading import GraderRegistry as RuntimeGraderRegistry
from scripture_archive_runtime.models import Correctness, TaskDefinition
from scripture_archive_platform.authoring.model import (
    DRAFT_SCHEMA,
    blank_campaign,
    blank_mission,
    blank_node,
)
from scripture_archive_platform.authoring.service import AuthoringService
from scripture_archive_platform.domain.models import BUILTIN_TASK_TYPES
from scripture_archive_platform.domain.registries import build_task_registries


class ConstructorRuntimeGradeabilityContractTests(unittest.TestCase):
    """Self-contained #67 publishability -> real runtime-grader contract proof.

    This suite deliberately avoids draft-store operations. The previously dedicated
    QA67 workflow failed before reaching its target because it imported a persistence
    implementation that is supplied only by the reconstructed DEV1 source. For the
    #67 criterion we exercise the real AuthoringService validation/publish methods,
    the real registry contracts, TaskDefinition.from_canonical, ANSWER_DTO_v1 shapes,
    and the real runtime GraderRegistry without mocking any of those boundaries.
    """

    def setUp(self) -> None:
        self.registry = build_task_registries()[0]
        self.runtime_graders = RuntimeGraderRegistry()
        self.service = object.__new__(AuthoringService)
        self.service.task_registry = self.registry
        self.service.clock = lambda: 1000

    @staticmethod
    def _draft(task_type: str) -> dict[str, object]:
        node = blank_node()
        node.update(
            {
                "node_id": "ZZ01-N99",
                "mission_id": "ZZ-01",
                "task_type": task_type,
                "task_family": "source discipline",
                "difficulty": "2/6",
                "required": True,
                "skill_target": "distinguish witnesses",
                "knowledge_target": "bounded proposition",
                "why_this_node_exists": "Distinct learning purpose without changing source truth.",
                "player_prompt": "Prompt",
                "source_scope_visible_to_player": "Fixture 1:1",
                "response_mode": task_type.lower(),
                "accepted_answer": "bounded answer",
                "accepted_variants": ["equivalent bounded answer"],
                "required_evidence": ["Fixture 1:1"],
                "rejected_answers": ["overclaim"],
                "rejection_reason": "Not stated in cited text.",
                "confidence_code": "T1",
                "textual_variant_flag": "none",
                "success_feedback": "Supported.",
                "partial_feedback": "Preserve source boundary.",
                "failure_feedback": "Re-read source.",
                "on_hint_threshold": "guided_then_follow_on_correct",
                "on_correct": "none",
                "on_partial": "return_to_current_node",
                "on_incorrect": "return_to_current_node",
                "optional_evidence_unlock": "none",
                "later_retrieval_effect": "REVIEW_QUEUE ZZ_REVIEW",
                "mastery_domains": ["SOURCE_SCOPE_DISCIPLINE"],
                "evidence_strength": ["recognition"],
                "mastery_mode": "independent; H6/H7 records guided mastery",
                "spaced_retrieval": "yes",
                "review_queue_rule": "ZZ_REVIEW",
                "functional_nonvisual_equivalent": "Keyboard-complete labelled linear controls.",
            }
        )
        node["hints"] = {
            f"H{i}": ("Guided answer with evidence." if i == 7 else f"Hint {i}")
            for i in range(1, 8)
        }
        return {
            "draft_schema": DRAFT_SCHEMA,
            "draft_id": "draft-qa67",
            "kind": "node",
            "title": "QA67 runtime gradeability",
            "status": "DRAFT",
            "revision": 1,
            "created_at": 1000,
            "updated_at": 1000,
            "base_identity": None,
            "campaign": blank_campaign(),
            "mission": blank_mission(),
            "node": node,
            "change_record": [],
        }

    @staticmethod
    def _populate(draft: dict[str, object], task_type: str) -> dict[str, object]:
        node = draft["node"]
        ui = node["ui_metadata"]
        node["grading"] = {}
        if task_type in {"SINGLE_CHOICE", "COMBOBOX_SELECT", "PARALLEL_WITNESS_COMPARE"}:
            ui["options"] = [{"id": "a", "label": "A"}, {"id": "b", "label": "B"}]
            node["answer_contract"] = {"accepted_choice_ids": ["a"]}
            node["grading"] = {"accepted_choice": "a"}
        elif task_type == "MULTI_SELECT":
            ui["options"] = [{"id": "a", "label": "A"}, {"id": "b", "label": "B"}]
            node["answer_contract"] = {"accepted_choice_ids": ["a", "b"]}
            node["grading"] = {"accepted_set": ["a", "b"]}
        elif task_type == "ORDERING":
            ui["items"] = [{"id": "a", "label": "A"}, {"id": "b", "label": "B"}]
            node["answer_contract"] = {"accepted_order": ["b", "a"]}
            node["grading"] = {"accepted_order": ["b", "a"]}
        elif task_type == "MATCHING":
            ui["pairs"] = [
                {"left": "L1", "right": "R1"},
                {"left": "L2", "right": "R2"},
            ]
            node["answer_contract"] = {"accepted_pairs": {"L1": "R1", "L2": "R2"}}
            node["grading"] = {"accepted_pairs": {"L1": "R1", "L2": "R2"}}
        elif task_type == "EVIDENCE_SELECT":
            ui["evidence_options"] = [
                {"id": "e1", "label": "Evidence 1"},
                {"id": "e2", "label": "Evidence 2"},
            ]
            node["answer_contract"] = {"accepted_choice_ids": ["e1"]}
            node["grading"] = {"required_evidence_ids": ["e1"]}
        elif task_type == "CLAIM_EVIDENCE":
            ui["evidence_options"] = [
                {"id": "e1", "label": "Evidence 1"},
                {"id": "e2", "label": "Evidence 2"},
            ]
            node["answer_contract"] = {
                "accepted_value": {"claim": "bounded answer", "evidence_ids": ["e1"]}
            }
            node["grading"] = {
                "accepted_text": "bounded answer",
                "required_evidence_ids": ["e1"],
            }
        elif task_type == "COMPOSITE_MULTI_STEP":
            ui["steps"] = [
                {
                    "step_id": "s1",
                    "prompt": "State the bounded proposition.",
                    "answer_contract": {"task_type": "SHORT_TEXT"},
                }
            ]
            node["answer_contract"] = {
                "accepted_value": {
                    "schema": "ANSWER_DTO_v1",
                    "task_type": "COMPOSITE_MULTI_STEP",
                    "steps": [{"step_id": "s1", "answer": {"text": "bounded answer"}}],
                }
            }
            node["grading"] = {
                "steps": [
                    {
                        "id": "s1",
                        "task_type": "SHORT_TEXT",
                        "accepted_text": "bounded answer",
                    }
                ]
            }
        elif task_type == "SPEAKER_RECIPIENT":
            node["grading"] = {"speaker": "Paul", "recipient": "church"}
        elif task_type == "OT_NT_LINK":
            ui["relation_types"] = [
                {"id": "DIRECT_QUOTATION", "label": "Direct quotation"}
            ]
            node["grading"] = {
                "ot_nt_link": {
                    "ot_passage": "Isaiah 1:1",
                    "nt_passage": "Matthew 1:1",
                    "relation_category": "DIRECT_QUOTATION",
                    "confidence": "T1",
                    "evidence_id": "Fixture 1:1",
                }
            }
        return draft

    @staticmethod
    def _answer(task_type: str) -> dict[str, object]:
        base = {"schema": "ANSWER_DTO_v1", "task_type": task_type}
        if task_type in {"SINGLE_CHOICE", "COMBOBOX_SELECT", "PARALLEL_WITNESS_COMPARE"}:
            return {**base, "choice": "a"}
        if task_type == "MULTI_SELECT":
            return {**base, "choices": ["a", "b"]}
        if task_type in {"SHORT_TEXT", "LONG_TEXT", "ARGUMENT"}:
            return {**base, "text": "bounded answer"}
        if task_type == "ORDERING":
            return {**base, "items": ["b", "a"]}
        if task_type == "MATCHING":
            return {
                **base,
                "pairs": [
                    {"left": "L1", "right": "R1"},
                    {"left": "L2", "right": "R2"},
                ],
            }
        if task_type == "EVIDENCE_SELECT":
            return {**base, "evidence_ids": ["e1"]}
        if task_type == "CLAIM_EVIDENCE":
            return {**base, "claim": "bounded answer", "evidence_ids": ["e1"]}
        if task_type == "COMPOSITE_MULTI_STEP":
            return {
                **base,
                "steps": [{"step_id": "s1", "answer": {"text": "bounded answer"}}],
            }
        if task_type == "SPEAKER_RECIPIENT":
            return {**base, "speaker": "Paul", "recipient": "church"}
        if task_type == "OT_NT_LINK":
            return {
                **base,
                "ot_passage": "Isaiah 1:1",
                "nt_passage": "Matthew 1:1",
                "relation_category": "DIRECT_QUOTATION",
                "confidence": "T1",
                "evidence_id": "Fixture 1:1",
            }
        raise AssertionError(task_type)

    def _validate(self, draft: dict[str, object]) -> dict[str, object]:
        return self.service.validate_draft(draft)

    def test_all_builtin_publish_fixtures_reach_real_runtime_and_grade_correct(self) -> None:
        self.assertEqual(set(BUILTIN_TASK_TYPES), {row["id"] for row in self.registry.list()})
        for task_type in BUILTIN_TASK_TYPES:
            with self.subTest(task_type=task_type):
                draft = self._populate(self._draft(task_type), task_type)
                validation = self._validate(draft)
                self.assertTrue(validation["valid"], validation)
                self.assertTrue(validation["valid_for_publish"], validation)
                candidate = self.service.prepare_publish_candidate(draft)
                self.assertFalse(candidate["canonical_mutation_performed"])
                runtime_task = TaskDefinition.from_canonical(candidate["node"])
                grade = self.runtime_graders.grade(runtime_task, self._answer(task_type))
                self.assertEqual(Correctness.CORRECT, grade.correctness, grade.to_dict())
                self.assertEqual(1.0, grade.score, grade.to_dict())

    def test_choice_ids_that_collapse_under_runtime_normalization_cannot_publish(self) -> None:
        draft = self._populate(self._draft("SINGLE_CHOICE"), "SINGLE_CHOICE")
        draft["node"]["ui_metadata"]["options"] = [
            {"id": "A-B", "label": "Hyphen"},
            {"id": "a b", "label": "Space"},
        ]
        draft["node"]["answer_contract"] = {"accepted_choice_ids": ["A-B"]}
        draft["node"]["grading"] = {"accepted_choice": "A-B"}
        result = self._validate(draft)
        self.assertFalse(result["valid_for_publish"], result)
        self.assertTrue(
            any("runtime grader normalization" in item for item in result["errors"]),
            result,
        )

    def test_nfkc_colliding_order_ids_cannot_publish(self) -> None:
        draft = self._populate(self._draft("ORDERING"), "ORDERING")
        draft["node"]["ui_metadata"]["items"] = [
            {"id": "Ａ", "label": "Full width A"},
            {"id": "A", "label": "ASCII A"},
        ]
        draft["node"]["answer_contract"] = {"accepted_order": ["Ａ", "A"]}
        draft["node"]["grading"] = {"accepted_order": ["Ａ", "A"]}
        result = self._validate(draft)
        self.assertFalse(result["valid_for_publish"], result)
        self.assertTrue(
            any("runtime grader normalization" in item for item in result["errors"]),
            result,
        )

    def test_matching_left_and_right_runtime_collisions_cannot_publish(self) -> None:
        draft = self._populate(self._draft("MATCHING"), "MATCHING")
        draft["node"]["ui_metadata"]["pairs"] = [
            {"left": "Witness-A", "right": "Claim-X"},
            {"left": "witness a", "right": "claim x"},
        ]
        draft["node"]["answer_contract"] = {
            "accepted_pairs": {"Witness-A": "Claim-X", "witness a": "claim x"}
        }
        draft["node"]["grading"] = {
            "accepted_pairs": {"Witness-A": "Claim-X", "witness a": "claim x"}
        }
        result = self._validate(draft)
        self.assertFalse(result["valid_for_publish"], result)
        messages = "\n".join(result["errors"])
        self.assertIn("MATCHING left-side IDs must remain unique", messages)
        self.assertIn("MATCHING right-side choices must remain unique", messages)

    def test_nested_composite_runtime_task_requires_explicit_child_type(self) -> None:
        draft = self._populate(self._draft("COMPOSITE_MULTI_STEP"), "COMPOSITE_MULTI_STEP")
        draft["node"]["grading"] = {
            "steps": [
                {
                    "id": "s1",
                    "task": {
                        "accepted_answer": "bounded answer",
                        "grading": {"accepted_text": "bounded answer"},
                    },
                }
            ]
        }
        result = self._validate(draft)
        self.assertFalse(result["valid_for_publish"], result)
        self.assertTrue(
            any("requires explicit task_type" in item for item in result["errors"]),
            result,
        )
        with self.assertRaises(ValueError):
            self.service.prepare_publish_candidate(draft)

    def test_explicit_nested_composite_child_type_matches_real_runtime(self) -> None:
        draft = self._populate(self._draft("COMPOSITE_MULTI_STEP"), "COMPOSITE_MULTI_STEP")
        draft["node"]["grading"] = {
            "steps": [
                {
                    "id": "s1",
                    "task": {
                        "task_type": "SHORT_TEXT",
                        "accepted_answer": "bounded answer",
                        "grading": {"accepted_text": "bounded answer"},
                    },
                }
            ]
        }
        result = self._validate(draft)
        self.assertTrue(result["valid_for_publish"], result)
        candidate = self.service.prepare_publish_candidate(draft)
        runtime_task = TaskDefinition.from_canonical(candidate["node"])
        grade = self.runtime_graders.grade(runtime_task, self._answer("COMPOSITE_MULTI_STEP"))
        self.assertEqual(Correctness.CORRECT, grade.correctness, grade.to_dict())


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools.analyze_pedagogical_quality import BLOCKER, WARN, analyze


def _node(node_id: str = "T-N01") -> dict:
    return {
        "node_id": node_id,
        "mission_id": "T-01",
        "task_family": "source comparison",
        "difficulty": "2/6",
        "required": True,
        "skill_target": "distinguish direct text from comparison evidence",
        "knowledge_target": "compare two explicitly cited passages",
        "why_this_node_exists": "This node trains source-bound comparison without importing unstated details.",
        "player_prompt": "Which claim is established by the cited witness?",
        "source_scope_visible_to_player": "Example 1:1-2",
        "response_mode": "classification",
        "accepted_answer": "Only the claim stated in the cited witness.",
        "accepted_variants": "Equivalent source-bound wording.",
        "required_evidence": "Example 1:1-2",
        "rejected_answers": "A claim imported from another witness.",
        "rejection_reason": "The cited text does not state that imported detail.",
        "confidence_code": "T1",
        "textual_variant_flag": "none",
        "success_feedback": "Correct: you kept the conclusion inside the cited source boundary.",
        "partial_feedback": "Your source is right; remove the one detail that the passage does not state.",
        "failure_feedback": "Return to the cited passage and identify only what its wording directly establishes.",
        "hints": {
            "H1": "Identify the exact claim being tested before comparing witnesses.",
            "H2": "Read only the cited passage first and list what it explicitly states.",
            "H3": "Now compare the second witness without importing its details into the first.",
            "H4": "Separate direct wording from a conclusion that requires cross-witness synthesis.",
            "H5": "Check whether the disputed detail appears in the cited source itself.",
            "H6": "The decisive source boundary is the exact wording of Example 1:1-2.",
            "H7": "Guided answer/model may be shown; mastery becomes guided.",
        },
        "on_correct": "mission_complete",
        "on_partial": "return_to_current_node_after_targeted_partial_feedback",
        "on_incorrect": "return_to_current_node_after_targeted_source_recheck",
        "on_hint_threshold": "guided_then_follow_on_correct",
        "optional_evidence_unlock": "none",
        "later_retrieval_effect": "REVIEW_QUEUE TEST_SOURCE_REVIEW",
        "mastery_domains": ["SOURCE_SCOPE_DISCIPLINE"],
        "evidence_strength": ["application"],
        "mastery_mode": "independent; H6/H7 or answer reveal records guided mastery",
        "spaced_retrieval": "yes",
        "review_queue_rule": "TEST_SOURCE_REVIEW",
        "functional_nonvisual_equivalent": "Keyboard-complete labelled linear flow with textual result, source, mastery effect and next action.",
    }


def _write_pack(root: Path, nodes: list[dict], *, status: str = "AUTHOR_COMPLETE / DEVELOPER_SOURCE_AUDITED / INDEPENDENT_AUDIT_PENDING") -> Path:
    path = root / "nodes.json"
    path.write_text(
        json.dumps(
            {
                "schema_version": "CONTENT_NODE_SCHEMA_v1.2",
                "mission_id": "T-01",
                "canonical_status": status,
                "nodes": nodes,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    return path


class PedagogicalQualityAnalyzerTests(unittest.TestCase):
    def test_substantive_node_has_no_blocker(self):
        with tempfile.TemporaryDirectory() as tmp:
            _write_pack(Path(tmp), [_node()])
            result = analyze([tmp])
        blockers = [f for f in result.findings if f.severity == BLOCKER]
        self.assertEqual(blockers, [])
        self.assertEqual(result.nodes_analyzed, 1)

    def test_missing_hint_step_is_blocker(self):
        node = _node()
        del node["hints"]["H4"]
        with tempfile.TemporaryDirectory() as tmp:
            _write_pack(Path(tmp), [node])
            result = analyze([tmp])
        self.assertIn("HINT_LADDER_KEYS", {f.code for f in result.findings if f.severity == BLOCKER})

    def test_placeholder_feedback_is_blocker(self):
        node = _node()
        node["failure_feedback"] = "Try again"
        with tempfile.TemporaryDirectory() as tmp:
            _write_pack(Path(tmp), [node])
            result = analyze([tmp])
        self.assertIn("FEEDBACK_NOT_SUBSTANTIVE", {f.code for f in result.findings if f.severity == BLOCKER})

    def test_identical_outcome_feedback_is_blocker(self):
        node = _node()
        repeated = "Read the passage and compare the evidence carefully."
        node["success_feedback"] = repeated
        node["partial_feedback"] = repeated
        node["failure_feedback"] = repeated
        with tempfile.TemporaryDirectory() as tmp:
            _write_pack(Path(tmp), [node])
            result = analyze([tmp])
        self.assertIn("FEEDBACK_OUTCOME_COLLAPSE", {f.code for f in result.findings if f.severity == BLOCKER})

    def test_guided_reveal_requires_guided_mastery_semantics(self):
        node = _node()
        node["mastery_mode"] = "independent"
        with tempfile.TemporaryDirectory() as tmp:
            _write_pack(Path(tmp), [node])
            result = analyze([tmp])
        self.assertIn(
            "GUIDED_REVEAL_WITHOUT_MASTERY_DOWNGRADE",
            {f.code for f in result.findings if f.severity == BLOCKER},
        )

    def test_duplicate_ladder_is_warning_not_source_defect(self):
        nodes = [_node(f"T-N0{i}") for i in range(1, 4)]
        for index, node in enumerate(nodes, start=1):
            node["player_prompt"] = f"Prompt {index}: determine the source-bound claim."
            node["accepted_answer"] = f"Answer {index}: source-bound conclusion."
            node["success_feedback"] = f"Correct outcome {index}: source boundary preserved."
            node["partial_feedback"] = f"Partial outcome {index}: remove the unsupported detail."
            node["failure_feedback"] = f"Failure outcome {index}: reread the exact source boundary."
        with tempfile.TemporaryDirectory() as tmp:
            _write_pack(Path(tmp), nodes)
            result = analyze([tmp], duplicate_threshold=3)
        warning_codes = {f.code for f in result.findings if f.severity == WARN}
        self.assertIn("DUPLICATE_HINT_LADDER", warning_codes)
        self.assertNotIn("DUPLICATE_HINT_LADDER", {f.code for f in result.findings if f.severity == BLOCKER})

    def test_duplicate_prompt_answer_fingerprint_warns_across_stable_ids(self):
        a = _node("T-N01")
        b = _node("T-N02")
        with tempfile.TemporaryDirectory() as tmp:
            _write_pack(Path(tmp), [a, b])
            result = analyze([tmp])
        self.assertIn(
            "DUPLICATE_PROMPT_ANSWER_FINGERPRINT",
            {f.code for f in result.findings if f.severity == WARN},
        )

    def test_report_keeps_canonical_status_inventory_without_audit_promotion(self):
        status = "AUTHOR_COMPLETE / DEVELOPER_SOURCE_AUDITED / INDEPENDENT_AUDIT_PENDING"
        with tempfile.TemporaryDirectory() as tmp:
            _write_pack(Path(tmp), [_node()], status=status)
            result = analyze([tmp])
            payload = result.to_dict()
        self.assertEqual(payload["canonical_status_counts"], {status: 1})
        self.assertIn("independent audit acceptance", payload["interpretation"]["not_claimed"])

    def test_non_schema_json_is_ignored_not_reclassified(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "other.json").write_text('{"schema_version":"OTHER","nodes":[{}]}', encoding="utf-8")
            result = analyze([tmp])
        self.assertEqual(result.schema_files, 0)
        self.assertEqual(result.nodes_analyzed, 0)
        self.assertEqual(result.findings, [])


if __name__ == "__main__":
    unittest.main()

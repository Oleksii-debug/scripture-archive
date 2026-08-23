from __future__ import annotations

from types import SimpleNamespace
import unittest
from unittest.mock import patch

from scripture_archive_runtime.preintegration_gate import (
    PreintegrationGateError,
    _cross_record_integrity,
    summarize_validated_inputs,
)


class FakeSnapshot:
    def __init__(self, node_count: int, nodes=None):
        self._nodes = tuple(nodes) if nodes is not None else tuple({"node_id": f"n{i}"} for i in range(node_count))

    def collection(self, name: str):
        if name != "nodes":
            raise KeyError(name)
        return SimpleNamespace(records=self._nodes)


def fake_input(lane: str, node_count: int, evidence_count: int, relation_count: int = 0, nodes=None):
    return SimpleNamespace(
        expectation=SimpleNamespace(lane=lane, expected_nodes=node_count),
        snapshot=FakeSnapshot(node_count, nodes=nodes),
        node_ids=frozenset(f"{lane}-n-{i}" for i in range(node_count)),
        evidence_ids=frozenset(f"{lane}-e-{i}" for i in range(evidence_count)),
        relation_ids=frozenset(f"{lane}-r-{i}" for i in range(relation_count)),
    )


def strict_pass(nodes, *, lane: str):
    total = len(nodes)
    return {
        "total": total,
        "strict_release_pass_count": total,
        "strict_release_blocker_count": 0,
        "strict_release_pass": True,
        "correctness_counts": {"CORRECT": total},
        "truth_class_counts": {"AUTHORED_DIRECT_PASS": total},
        "task_type_counts": {"SHORT_TEXT": total},
    }


class Stage05PreintegrationGateTests(unittest.TestCase):
    def setUp(self):
        self.inputs = [
            fake_input("D2", 386, 184),
            fake_input("D3", 360, 240),
            fake_input("D4", 450, 90, 24),
        ]

    @patch(
        "scripture_archive_runtime.preintegration_gate.check_nodes_strict",
        side_effect=strict_pass,
    )
    def test_exact_stage05_totals_pass(self, _mock):
        result = summarize_validated_inputs(self.inputs)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["total_nodes"], 1196)
        self.assertEqual(result["total_evidence"], 514)
        self.assertEqual(result["total_relations"], 24)
        self.assertEqual(result["strict_release_pass_count"], 1196)
        self.assertEqual(result["canonical_answer_correct_count"], 1196)
        self.assertEqual(result["adapter_inferred_truth_count"], 0)
        self.assertEqual(result["node_collisions"], 0)
        self.assertEqual(result["evidence_collisions"], 0)
        self.assertEqual(result["relation_collisions"], 0)
        self.assertEqual(result["semantic_duplicate_blocker_count"], 0)
        self.assertEqual(result["semantic_conflict_blocker_count"], 0)
        self.assertEqual(result["branch_reachability_blocker_count"], 0)

    def test_missing_lane_fails_closed(self):
        with self.assertRaisesRegex(PreintegrationGateError, "final lane set mismatch"):
            summarize_validated_inputs(self.inputs[:2])

    def test_relation_collision_fails_closed(self):
        broken = list(self.inputs)
        broken[1] = fake_input("D3", 360, 240)
        broken[1].relation_ids = frozenset({"D4-r-0"})
        with patch(
            "scripture_archive_runtime.preintegration_gate.check_nodes_strict",
            side_effect=strict_pass,
        ):
            with self.assertRaisesRegex(PreintegrationGateError, "relation-ID collisions"):
                summarize_validated_inputs(broken)

    def test_strict_blocker_fails_closed(self):
        def strict_fail(nodes, *, lane: str):
            report = strict_pass(nodes, lane=lane)
            if lane == "D3":
                report["strict_release_pass_count"] -= 1
                report["strict_release_blocker_count"] = 1
                report["strict_release_pass"] = False
            return report

        with patch(
            "scripture_archive_runtime.preintegration_gate.check_nodes_strict",
            side_effect=strict_fail,
        ):
            with self.assertRaisesRegex(
                PreintegrationGateError,
                "D3 strict provenance/correctness blockers",
            ):
                summarize_validated_inputs(self.inputs)

    def test_wrong_total_fails_closed(self):
        broken = [
            fake_input("D2", 385, 184),
            fake_input("D3", 360, 240),
            fake_input("D4", 450, 90, 24),
        ]
        with patch(
            "scripture_archive_runtime.preintegration_gate.check_nodes_strict",
            side_effect=strict_pass,
        ):
            with self.assertRaisesRegex(
                PreintegrationGateError,
                "preintegration total node count",
            ):
                summarize_validated_inputs(broken)

    @staticmethod
    def semantic_node(node_id, accepted, *, prompt="same question", scope="Acts 9"):
        return {
            "node_id": node_id,
            "player_prompt": prompt,
            "source_scope_visible_to_player": scope,
            "task_type": "SINGLE_CHOICE",
            "accepted_answer": accepted,
        }

    def test_semantic_duplicate_fails_closed(self):
        rows = [
            fake_input("D2", 1, 0, nodes=[self.semantic_node("D2-N1", "A")]),
            fake_input("D3", 1, 0, nodes=[self.semantic_node("D3-N1", "A")]),
        ]
        decision = SimpleNamespace(canonical_dto={"schema": "ANSWER_DTO_v1", "task_type": "SINGLE_CHOICE", "choice": "A"})
        with patch("scripture_archive_runtime.preintegration_gate.classify_provenance", return_value=decision):
            with self.assertRaisesRegex(PreintegrationGateError, "semantic duplicate blockers"):
                _cross_record_integrity(rows)

    def test_semantic_truth_conflict_fails_closed(self):
        rows = [
            fake_input("D2", 1, 0, nodes=[self.semantic_node("D2-N1", "A")]),
            fake_input("D3", 1, 0, nodes=[self.semantic_node("D3-N1", "B")]),
        ]
        def classify(row):
            return SimpleNamespace(canonical_dto={"choice": row["accepted_answer"]})
        with patch("scripture_archive_runtime.preintegration_gate.classify_provenance", side_effect=classify):
            with self.assertRaisesRegex(PreintegrationGateError, "semantic truth conflicts"):
                _cross_record_integrity(rows)

    def test_missing_optional_evidence_fails_closed(self):
        row = self.semantic_node("D2-N1", "A", prompt="unique")
        row["optional_evidence_unlock"] = "E-MISSING"
        rows = [fake_input("D2", 1, 0, nodes=[row])]
        decision = SimpleNamespace(canonical_dto={"choice": "A"})
        with patch("scripture_archive_runtime.preintegration_gate.classify_provenance", return_value=decision):
            with self.assertRaisesRegex(PreintegrationGateError, "unresolved optional_evidence_unlock"):
                _cross_record_integrity(rows)


if __name__ == "__main__":
    unittest.main()

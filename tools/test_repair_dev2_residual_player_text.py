#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
import sys
import unittest
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
TOOLS = REPO_ROOT / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from repair_dev2_residual_player_text import (
    REPORT_REL,
    RepairError,
    hybrid_tokens,
    protected_projection,
    repair_record,
    scan_record,
)


class ResidualPlayerTextRepairTests(unittest.TestCase):
    def fixture(self):
        return {
            "node_id": "X-N001",
            "mission_id": "X",
            "player_prompt": "Оберіть запис доказуs.",
            "success_feedback": "Порівняння джерело-safe: match твердженняs to local джерелоs.",
            "partial_feedback": "Порівняйте свідків по локальних твердженняs.",
            "failure_feedback": "cross-уривок доказ set",
            "rejection_reason": "Do not force a single verbatim transcript across all three свідченняs.",
            "functional_nonvisual_equivalent": "джерело-map structure",
            "hints": {
                "H1": "parallel_свідчення_compare / джерело_твердження_matching",
                "H2": "Corinthian адресатаs",
            },
            "rejected_answers": ["твердження-source swaps"],
            "accepted_answer": {"truth": "UNCHANGED"},
            "accepted_variants": ["UNCHANGED"],
            "grading": {"truth": "UNCHANGED"},
            "required_evidence": ["EV-1"],
            "confidence_code": "T1",
            "textual_variant_flag": "none",
            "response_contract": {"kind": "UNCHANGED"},
            "on_correct": "X-N002",
        }

    def test_repair_eliminates_hybrid_tokens_and_preserves_protected_projection(self):
        original = self.fixture()
        before = protected_projection(original)
        repaired, changed = repair_record(original, Counter())
        self.assertTrue(changed)
        self.assertEqual(before, protected_projection(repaired))
        self.assertEqual([], scan_record(repaired))

    def test_hybrid_scanner_detects_script_mixing(self):
        self.assertEqual(["твердженняs"], hybrid_tokens("локальні твердженняs"))
        self.assertEqual([], hybrid_tokens("Acts 9:10 / локальні твердження"))

    def test_committed_successor_has_no_hybrid_player_tokens_after_materialization(self):
        root = REPO_ROOT / "docs/campaigns/PA/R06_DEV2_MATERIALIZATION_05"
        report = root / REPORT_REL
        if not report.is_file():
            self.skipTest("successor materialization has not self-committed yet")
        payload = json.loads(report.read_text(encoding="utf-8"))
        self.assertGreater(payload["changed_node_count"], 0)
        self.assertGreater(payload["hybrid_player_tokens_before"], 0)
        self.assertEqual(0, payload["hybrid_player_tokens_after"])
        self.assertFalse(payload["source_truth_changed"])
        self.assertEqual("PENDING", payload["independent_source_theological_audit"])


if __name__ == "__main__":
    unittest.main()

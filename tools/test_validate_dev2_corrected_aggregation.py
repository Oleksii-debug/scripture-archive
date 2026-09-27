from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from validate_dev2_corrected_aggregation import PreflightError, run_preflight


def node(node_id: str = "PA03-N001") -> dict:
    return {
        "node_id": node_id,
        "mission_id": "PA-03",
        "accepted_answer": "truth",
        "accepted_variants": ["truth", "alias"],
        "confidence_code": "T1",
        "textual_variant_flag": "none",
        "grading": {"accepted_aliases": ["truth", "alias"], "mode": "exact_or_alias"},
        "required_evidence": ["EVR-R06-D2-0001"],
        "source_citations": ["Acts 9:10"],
        "semantic_target_claim": "canonical claim",
        "response_contract": {"kind": "single_choice", "accepted_option_index": 0},
        "on_correct": "PA03-N002",
        "on_incorrect": "return_to_current_node_after_evidence_review",
        "player_prompt": "Old prompt",
        "success_feedback": "Old success",
        "partial_feedback": "Old partial",
        "failure_feedback": "Old failure",
        "rejection_reason": "Old rejection",
        "functional_nonvisual_equivalent": "Old NVDA text",
        "hints": {f"H{i}": f"old hint {i}" for i in range(1, 8)},
        "rejected_answers": ["old A", "old B"],
    }


def canonical_sha(value: dict) -> str:
    import hashlib

    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


class CorrectedAggregationPreflightTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.baseline = self.root / "baseline"
        self.candidate = self.root / "candidate"
        self.baseline.mkdir()
        self.candidate.mkdir()

    def tearDown(self) -> None:
        self.temp.cleanup()

    def write_jsonl(self, directory: Path, name: str, records: list[dict]) -> Path:
        path = directory / name
        path.write_text(
            "".join(
                json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
                for record in records
            ),
            encoding="utf-8",
        )
        return path

    def write_node_index(self, records: list[dict], *, corrupt: bool = False) -> Path:
        entries = []
        for record in records:
            digest = canonical_sha(record)
            if corrupt and record is records[0]:
                digest = "0" * 64
            entries.append({"id": record["node_id"], "sha256": digest})
        aggregate_input = "".join(f"{r['id']}\t{r['sha256']}\n" for r in sorted(entries, key=lambda x: x["id"]))
        import hashlib

        root = {
            "record_count": len(entries),
            "aggregate_sha256": hashlib.sha256(aggregate_input.encode()).hexdigest(),
            "records": entries,
        }
        path = self.root / "node_hash_index.json"
        path.write_text(json.dumps(root), encoding="utf-8")
        return path

    def write_evidence_index(self, ids: list[str]) -> Path:
        root = {
            "record_count": len(ids),
            "records": [{"id": evidence_id, "sha256": "a" * 64} for evidence_id in ids],
        }
        path = self.root / "evidence_hash_index.json"
        path.write_text(json.dumps(root), encoding="utf-8")
        return path

    def test_only_bounded_player_text_changes_pass(self) -> None:
        baseline = node()
        corrected = json.loads(json.dumps(baseline))
        corrected["player_prompt"] = "Corrected prompt"
        corrected["failure_feedback"] = "Corrected failure"
        corrected["hints"]["H3"] = "Corrected hint"
        corrected["rejected_answers"][1] = "Corrected rejection option"
        self.write_jsonl(self.baseline, "base.jsonl", [baseline])
        self.write_jsonl(self.candidate, "candidate.jsonl", [corrected])
        result = run_preflight(
            baseline_inputs=[self.baseline],
            candidate_inputs=[self.candidate],
            node_hash_index=self.write_node_index([baseline]),
            evidence_hash_index=self.write_evidence_index(["EVR-R06-D2-0001"]),
            require_complete=True,
        )
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["comparison"]["changed_nodes"], 1)
        self.assertEqual(
            result["comparison"]["changes"][0]["changed_player_paths"],
            ["failure_feedback", "player_prompt", "hints.H3", "rejected_answers[1]"],
        )

    def test_accepted_answer_change_fails_closed(self) -> None:
        baseline = node()
        corrected = json.loads(json.dumps(baseline))
        corrected["accepted_answer"] = "different truth"
        self.write_jsonl(self.baseline, "base.jsonl", [baseline])
        self.write_jsonl(self.candidate, "candidate.jsonl", [corrected])
        with self.assertRaisesRegex(PreflightError, "protected semantic/source/grading projection changed"):
            run_preflight(baseline_inputs=[self.baseline], candidate_inputs=[self.candidate])

    def test_source_grading_evidence_and_branching_changes_fail_closed(self) -> None:
        fields = ["confidence_code", "required_evidence", "source_citations", "grading", "response_contract", "on_correct"]
        for field in fields:
            with self.subTest(field=field):
                baseline = node()
                corrected = json.loads(json.dumps(baseline))
                if field == "confidence_code":
                    corrected[field] = "T2"
                elif field == "required_evidence":
                    corrected[field] = ["EVR-R06-D2-9999"]
                elif field == "source_citations":
                    corrected[field] = ["Acts 22:1"]
                elif field == "grading":
                    corrected[field]["accepted_aliases"] = ["different"]
                elif field == "response_contract":
                    corrected[field]["accepted_option_index"] = 1
                else:
                    corrected[field] = "PA03-N099"
                base_dir = self.root / f"b-{field}"
                cand_dir = self.root / f"c-{field}"
                base_dir.mkdir(); cand_dir.mkdir()
                self.write_jsonl(base_dir, "base.jsonl", [baseline])
                self.write_jsonl(cand_dir, "candidate.jsonl", [corrected])
                with self.assertRaises(PreflightError):
                    run_preflight(baseline_inputs=[base_dir], candidate_inputs=[cand_dir])

    def test_mutable_shape_change_fails(self) -> None:
        baseline = node()
        corrected = json.loads(json.dumps(baseline))
        corrected["hints"].pop("H7")
        self.write_jsonl(self.baseline, "base.jsonl", [baseline])
        self.write_jsonl(self.candidate, "candidate.jsonl", [corrected])
        with self.assertRaisesRegex(PreflightError, "hints key set changed"):
            run_preflight(baseline_inputs=[self.baseline], candidate_inputs=[self.candidate])

    def test_duplicate_candidate_id_across_shards_fails(self) -> None:
        baseline = node()
        self.write_jsonl(self.baseline, "base.jsonl", [baseline])
        self.write_jsonl(self.candidate, "a.jsonl", [baseline])
        self.write_jsonl(self.candidate, "b.jsonl", [baseline])
        with self.assertRaisesRegex(PreflightError, "duplicate node_id PA03-N001"):
            run_preflight(baseline_inputs=[self.baseline], candidate_inputs=[self.candidate])

    def test_unknown_candidate_id_fails(self) -> None:
        baseline = node()
        unknown = node("PA03-N999")
        self.write_jsonl(self.baseline, "base.jsonl", [baseline])
        self.write_jsonl(self.candidate, "candidate.jsonl", [unknown])
        with self.assertRaisesRegex(PreflightError, "unknown node IDs"):
            run_preflight(baseline_inputs=[self.baseline], candidate_inputs=[self.candidate])

    def test_baseline_hash_index_mismatch_fails(self) -> None:
        baseline = node()
        self.write_jsonl(self.baseline, "base.jsonl", [baseline])
        self.write_jsonl(self.candidate, "candidate.jsonl", [baseline])
        with self.assertRaisesRegex(PreflightError, "baseline canonical SHA256 mismatch"):
            run_preflight(
                baseline_inputs=[self.baseline],
                candidate_inputs=[self.candidate],
                node_hash_index=self.write_node_index([baseline], corrupt=True),
            )

    def test_missing_required_evidence_in_index_fails(self) -> None:
        baseline = node()
        self.write_jsonl(self.baseline, "base.jsonl", [baseline])
        self.write_jsonl(self.candidate, "candidate.jsonl", [baseline])
        with self.assertRaisesRegex(PreflightError, "absent from immutable evidence index"):
            run_preflight(
                baseline_inputs=[self.baseline],
                candidate_inputs=[self.candidate],
                evidence_hash_index=self.write_evidence_index(["EVR-R06-D2-0002"]),
            )

    def test_complete_mode_rejects_missing_candidate_nodes(self) -> None:
        first = node("PA03-N001")
        second = node("PA03-N002")
        self.write_jsonl(self.baseline, "base.jsonl", [first, second])
        self.write_jsonl(self.candidate, "candidate.jsonl", [first])
        with self.assertRaisesRegex(PreflightError, "complete candidate required"):
            run_preflight(
                baseline_inputs=[self.baseline],
                candidate_inputs=[self.candidate],
                node_hash_index=self.write_node_index([first, second]),
                require_complete=True,
            )

    def test_immutable_metadata_pair_mismatch_fails(self) -> None:
        baseline = node()
        self.write_jsonl(self.baseline, "base.jsonl", [baseline])
        self.write_jsonl(self.candidate, "candidate.jsonl", [baseline])
        original = self.root / "source.json"
        candidate = self.root / "candidate-source.json"
        original.write_text("same", encoding="utf-8")
        candidate.write_text("different", encoding="utf-8")
        with self.assertRaisesRegex(PreflightError, "immutable file mismatch"):
            run_preflight(
                baseline_inputs=[self.baseline],
                candidate_inputs=[self.candidate],
                immutable_pairs=[(original, candidate)],
            )

    def test_immutable_metadata_pair_equal_passes(self) -> None:
        baseline = node()
        self.write_jsonl(self.baseline, "base.jsonl", [baseline])
        self.write_jsonl(self.candidate, "candidate.jsonl", [baseline])
        original = self.root / "source.json"
        candidate = self.root / "candidate-source.json"
        original.write_text("same", encoding="utf-8")
        candidate.write_text("same", encoding="utf-8")
        result = run_preflight(
            baseline_inputs=[self.baseline],
            candidate_inputs=[self.candidate],
            immutable_pairs=[(original, candidate)],
        )
        self.assertEqual(len(result["immutable_pairs"]), 1)


if __name__ == "__main__":
    unittest.main()

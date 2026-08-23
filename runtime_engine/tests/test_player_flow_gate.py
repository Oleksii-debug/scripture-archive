from types import SimpleNamespace
import unittest

from scripture_archive_runtime.player_flow_gate import (
    PlayerFlowGateError,
    PlayerFlowPolicy,
    run_player_flow_gate,
)


class Snapshot:
    def __init__(self, rows): self.rows = tuple(rows)
    def collection(self, name):
        if name != "nodes": raise KeyError(name)
        return SimpleNamespace(records=self.rows)


def input_row(lane, rows):
    return SimpleNamespace(expectation=SimpleNamespace(lane=lane), snapshot=Snapshot(rows))


def node(node_id, *, hint=True):
    return {
        "node_id": node_id,
        "task_type": "SHORT_TEXT",
        "functional_nonvisual_equivalent": "Text equivalent",
        "answer": "ok",
        "hint": "H1 text" if hint else "",
    }


class FakeAttempt:
    def __init__(self, answer): self.answer_snapshot = answer


class FakeState:
    def __init__(self, answer): self.completed = True; self.attempts = [FakeAttempt(answer)]


class FakeApplication:
    grade_correct = True
    accessibility_complete = True
    complete_state = True
    mutate_source = False
    provenance_present = True
    provenance_release_pass = True
    provenance_schema = "GROUND_TRUTH_PROVENANCE_v1"
    provenance_class = "CANONICAL_LOSSLESS_NORMALIZATION_PASS"

    def __init__(self, records):
        self.records = {r["node_id"]: r for r in records}
        self.memory = SimpleNamespace(node_history={}, mistakes={})
        self.session = SimpleNamespace(shown_node_ids=[])
        self.current = None

    def load_task(self, node_id):
        self.current = node_id
        self.session.shown_node_ids.append(node_id)
        row = self.records[node_id]
        task = {
            "node_id": node_id,
            "task_type": row["task_type"],
            "answer_contract": {"schema": "ANSWER_DTO_v1"},
            "functional_nonvisual_equivalent": row["functional_nonvisual_equivalent"],
            "hints_available": 1 if row.get("hint") else 0,
        }
        if self.provenance_present:
            task["ground_truth_provenance"] = {
                "schema": self.provenance_schema,
                "class": self.provenance_class,
                "release_pass": self.provenance_release_pass,
            }
        return {"api_version": "runtime.v1", "task": task}

    def request_hint(self, node_id):
        return {
            "hint": {"level": 1, "text": "H1 text"},
            "accessibility": {"event_type": "hint", "heading": "Hint", "message": "H1", "status": "info", "focus_target": "hint"},
        }

    def submit_answer(self, node_id, answer):
        if self.mutate_source:
            self.records[node_id]["mutated"] = True
        if self.complete_state:
            self.memory.node_history[node_id] = FakeState(answer)
        events = [
            {"event_type": "grade", "heading": "Grade", "message": "ok", "status": "correct", "focus_target": "feedback"},
            {"event_type": "branch", "heading": "Next", "message": "done", "status": "info", "focus_target": "next"},
        ]
        if not self.accessibility_complete:
            events = events[:1]
        return {"grade": {"correctness": "CORRECT" if self.grade_correct else "INCORRECT"}, "accessibility": events}


def adapt(raw, *, lane): return raw
def answer(raw): return {"value": raw["answer"]}


class PlayerFlowGateTests(unittest.TestCase):
    def setUp(self):
        FakeApplication.grade_correct = True
        FakeApplication.accessibility_complete = True
        FakeApplication.complete_state = True
        FakeApplication.mutate_source = False
        FakeApplication.provenance_present = True
        FakeApplication.provenance_release_pass = True
        FakeApplication.provenance_schema = "GROUND_TRUTH_PROVENANCE_v1"
        FakeApplication.provenance_class = "CANONICAL_LOSSLESS_NORMALIZATION_PASS"
        self.inputs = [input_row("D2", [node("D2-N1")]), input_row("D3", [node("D3-N1", hint=False)])]
        self.policy = PlayerFlowPolicy(required_lanes=("D2", "D3"), expected_nodes=2)

    def run_gate(self):
        return run_player_flow_gate(
            self.inputs,
            policy=self.policy,
            application_factory=FakeApplication,
            adapt_node=adapt,
            derive_answer=answer,
        )

    def test_happy_path_exercises_load_hint_submit_accessibility_state(self):
        result = self.run_gate()
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["load_task_pass_count"], 2)
        self.assertEqual(result["submit_answer_correct_count"], 2)
        self.assertEqual(result["first_hint_eligible_count"], 1)
        self.assertEqual(result["first_hint_pass_count"], 1)
        self.assertEqual(result["accessibility_grade_branch_pass_count"], 2)
        self.assertEqual(result["runtime_state_completion_pass_count"], 2)
        self.assertEqual(result["session_unique_shown_count"], 2)
        self.assertEqual(result["ground_truth_provenance_class_counts"], {"CANONICAL_LOSSLESS_NORMALIZATION_PASS": 2})

    def test_wrong_lane_set_fails_closed(self):
        with self.assertRaisesRegex(PlayerFlowGateError, "lane set mismatch"):
            run_player_flow_gate(
                self.inputs[:1], policy=self.policy,
                application_factory=FakeApplication, adapt_node=adapt, derive_answer=answer,
            )

    def test_duplicate_node_fails_closed(self):
        rows = [input_row("D2", [node("SAME")]), input_row("D3", [node("SAME")])]
        with self.assertRaisesRegex(PlayerFlowGateError, "duplicate player-flow node_id"):
            run_player_flow_gate(rows, policy=self.policy, application_factory=FakeApplication, adapt_node=adapt, derive_answer=answer)

    def test_incorrect_canonical_submission_fails(self):
        FakeApplication.grade_correct = False
        with self.assertRaisesRegex(PlayerFlowGateError, "canonical answer player submission is not CORRECT"):
            self.run_gate()

    def test_missing_branch_accessibility_event_fails(self):
        FakeApplication.accessibility_complete = False
        with self.assertRaisesRegex(PlayerFlowGateError, "accessibility event is not an object"):
            self.run_gate()

    def test_runtime_state_must_record_completion(self):
        FakeApplication.complete_state = False
        with self.assertRaisesRegex(PlayerFlowGateError, "did not mark node complete"):
            self.run_gate()

    def test_canonical_input_mutation_fails(self):
        FakeApplication.mutate_source = True
        with self.assertRaisesRegex(PlayerFlowGateError, "canonical input record mutated"):
            self.run_gate()

    def test_missing_ground_truth_provenance_fails(self):
        FakeApplication.provenance_present = False
        with self.assertRaisesRegex(PlayerFlowGateError, "ground_truth_provenance missing"):
            self.run_gate()

    def test_non_release_ground_truth_provenance_fails(self):
        FakeApplication.provenance_release_pass = False
        FakeApplication.provenance_class = "MISMATCH_FAIL"
        with self.assertRaisesRegex(PlayerFlowGateError, "ground_truth_provenance is not release-pass"):
            self.run_gate()

    def test_wrong_ground_truth_provenance_schema_fails(self):
        FakeApplication.provenance_schema = "GROUND_TRUTH_PROVENANCE_v0"
        with self.assertRaisesRegex(PlayerFlowGateError, "ground_truth_provenance schema mismatch"):
            self.run_gate()


if __name__ == "__main__":
    unittest.main()

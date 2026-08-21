import unittest
from datetime import datetime, timezone

from scripture_archive_runtime.branching import BranchEngine
from scripture_archive_runtime.mastery import MasteryEngine
from scripture_archive_runtime.models import Correctness, KnowledgeState, MasteryState, TaskDefinition
from tests.fixtures import node_from


class BranchMasteryTests(unittest.TestCase):
    def test_branch_resolution_and_named_terminals(self):
        engine = BranchEngine()
        task = TaskDefinition.from_canonical(node_from(on_correct="RESOLVED_NODE LN01-N04", later_retrieval_effect="REVIEW_QUEUE LN_REVIEW"))
        r = engine.resolve(task, Correctness.CORRECT)
        self.assertEqual(r.next_node_id, "LN01-N04")
        retrieval = engine.parse_target(task.later_retrieval_effect, task=task)
        self.assertEqual(retrieval.queue_id, "LN_REVIEW")

    def test_reachability_validation_catches_missing_target(self):
        engine = BranchEngine()
        a = TaskDefinition.from_canonical(node_from(node_id="LN01-N01", on_correct="LN01-N02", later_retrieval_effect="REVIEW_QUEUE X"))
        nodes = {a.node_id: a}
        errors = engine.validate_reachability(nodes)
        self.assertTrue(any("LN01-N02" in e for e in errors))

    def test_cycle_guard(self):
        engine = BranchEngine(max_node_visits_per_session=2)
        with self.assertRaises(RuntimeError):
            engine.enforce_cycle_guard("LN01-N01", {"LN01-N01":2})

    def test_mastery_independent_success_and_lapse(self):
        engine = MasteryEngine(); s = MasteryState("concept"); now = datetime(2026,8,21,tzinfo=timezone.utc)
        engine.apply(s, correctness=Correctness.CORRECT, independent=True, used_hints=0, now=now)
        self.assertEqual(s.state, KnowledgeState.LEARNING)
        engine.apply(s, correctness=Correctness.CORRECT, independent=True, used_hints=0, now=now)
        self.assertEqual(s.state, KnowledgeState.STABLE)
        engine.apply(s, correctness=Correctness.INCORRECT, independent=True, used_hints=0, now=now)
        self.assertEqual(s.state, KnowledgeState.LAPSED)

    def test_guided_success_never_promotes_mastered(self):
        engine = MasteryEngine(); s = MasteryState("concept", state=KnowledgeState.LEARNING)
        engine.apply(s, correctness=Correctness.CORRECT, independent=False, used_hints=7)
        self.assertEqual(s.state, KnowledgeState.LEARNING); self.assertEqual(s.guided_successes, 1)

if __name__ == "__main__": unittest.main()

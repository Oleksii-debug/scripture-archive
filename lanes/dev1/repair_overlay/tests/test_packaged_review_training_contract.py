from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[4]


class PackagedReviewTrainingContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.contracts = (ROOT / "scripture_archive_platform" / "transport" / "contracts.py").read_text(encoding="utf-8")
        cls.adapter = (ROOT / "scripture_archive_platform" / "transport" / "runtime_compat.py").read_text(encoding="utf-8")
        cls.service = (ROOT / "scripture_archive_platform" / "application" / "service.py").read_text(encoding="utf-8")
        cls.runtime = (REPO_ROOT / "runtime_engine" / "scripture_archive_runtime" / "application.py").read_text(encoding="utf-8")
        cls.security = (REPO_ROOT / "runtime_engine" / "scripture_archive_runtime" / "security.py").read_text(encoding="utf-8")

    def test_review_training_commands_are_allowlisted_at_both_boundaries(self):
        for command in ("player.start_review", "player.finish_review"):
            self.assertIn(command, self.contracts)
            self.assertIn(command, self.adapter)
            self.assertIn(command, self.service)
        for command in ('"start_review"', '"finish_review"'):
            self.assertIn(command, self.security)
            self.assertIn(command, self.runtime)

    def test_review_training_commands_are_empty_payload_only(self):
        self.assertIn("{'player.get_review_queue','player.start_review','player.finish_review'}", self.contracts)
        self.assertIn("'start_review','finish_review'", self.adapter)
        self.assertIn('runtime.v1 {command} accepts an empty payload', self.security)
        self.assertIn('self._empty_payload(p, "start_review")', self.runtime)
        self.assertIn('self._empty_payload(p, "finish_review")', self.runtime)

    def test_platform_never_accepts_a_review_target_from_the_caller(self):
        start_method = self.service.split("def _start_review(self):", 1)[1].split("def _finish_review", 1)[0]
        self.assertIn("self.player_gateway.invoke('player.start_review',{}", start_method)
        self.assertNotIn("target_node_id", start_method)
        self.assertNotIn("p.get", start_method)
        self.assertNotIn("node_id':", start_method.split("rr=self.player_gateway.invoke", 1)[0])

    def test_platform_rerenders_only_runtime_selected_canonical_node(self):
        start_method = self.service.split("def _start_review(self):", 1)[1].split("def _finish_review", 1)[0]
        self.assertIn("task=rr.get('task')", start_method)
        self.assertIn("nid=self._id(task,'node_id')", start_method)
        self.assertIn("node=self.loader.load_node(nid)", start_method)
        self.assertIn("mission=self.loader.mission_for_node(nid)", start_method)
        self.assertIn("runtime review task mission does not match canonical content", start_method)
        self.assertIn("truth_owner':'D5/runtime'", start_method)

    def test_runtime_uses_existing_scheduler_not_local_sort_policy(self):
        start = self.runtime.split("def start_review(self)", 1)[1].split("def finish_review", 1)[0]
        self.assertIn("self.scheduler.choose_next", start)
        self.assertIn("adjacent_successful_exact_ids=adjacent", start)
        self.assertNotIn("random", start.lower())
        self.assertNotIn("sorted(self.memory.review_queue", start)

    def test_bootstrap_exposes_explicit_review_training_capability(self):
        self.assertIn("'review_training':bool(self.player_gateway)", self.service)
        self.assertIn("'review_queue':bool(self.player_gateway)", self.service)


if __name__ == "__main__":
    unittest.main()

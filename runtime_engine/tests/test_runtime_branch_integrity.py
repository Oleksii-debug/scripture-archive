import sys
import unittest
from pathlib import Path

from scripture_archive_runtime.application import RuntimeApplication
from scripture_archive_runtime.content import ContentRepository
from scripture_archive_runtime.security import ValidationError
from tests.fixtures import LN01_N03, PA02_N04, node_from

REPO_ROOT = Path(__file__).resolve().parents[2]
PLATFORM_OVERLAY = REPO_ROOT / "lanes" / "dev1" / "repair_overlay"
for import_root in (REPO_ROOT, PLATFORM_OVERLAY):
    if str(import_root) not in sys.path:
        sys.path.insert(0, str(import_root))
from scripture_archive_platform.transport.runtime_compat import RuntimeEngineContractAdapter


class RuntimeBranchIntegrityTests(unittest.TestCase):
    @staticmethod
    def _nodes():
        a = node_from(
            LN01_N03,
            node_id="TST01-N01",
            mission_id="TST-01",
            on_correct="TST01-N02",
            on_partial="return_to_current_node",
            on_incorrect="return_to_current_node",
            on_hint_threshold="return_to_current_node",
            later_retrieval_effect="REVIEW_QUEUE TST",
        )
        b = node_from(
            PA02_N04,
            node_id="TST01-N02",
            mission_id="TST-01",
            on_correct="REVIEW_QUEUE TST",
            later_retrieval_effect="REVIEW_QUEUE TST",
        )
        c = node_from(
            PA02_N04,
            node_id="TST01-N03",
            mission_id="TST-01",
            on_correct="REVIEW_QUEUE TST",
            later_retrieval_effect="REVIEW_QUEUE TST",
        )
        cross = node_from(
            PA02_N04,
            node_id="OTH01-N01",
            mission_id="OTH-01",
            on_correct="REVIEW_QUEUE OTH",
            later_retrieval_effect="REVIEW_QUEUE OTH",
        )
        return a, b, c, cross

    @staticmethod
    def _next_command(payload=None):
        return {
            "api_version": "runtime.v1",
            "command": "next",
            "request_id": "next-test",
            "payload": payload or {},
        }

    @staticmethod
    def _load_command(node_id):
        return {
            "api_version": "runtime.v1",
            "command": "load_task",
            "request_id": "load-test",
            "payload": {"node_id": node_id},
        }

    @staticmethod
    def _platform_load_request(node_id):
        return {
            "api_version": "scripture.transport.v1",
            "command": "player.load_node",
            "request_id": "platform-load-test",
            "payload": {"node_id": node_id},
        }

    @staticmethod
    def _state_snapshot(app):
        return {
            "current_node_id": app.current_node_id,
            "shown": list(app.session.shown_node_ids),
            "correct": sorted(app.session.correct_node_ids),
            "recent_task_families": list(app.session.recent_task_families),
            "mistakes": dict(app.memory.mistakes),
            "evidence_exposure": dict(app.memory.evidence_exposure),
            "visit_counts": dict(app._visit_counts),
            "active_hint_counts": dict(app._active_hint_counts),
            "attempt_counts": {nid: len(state.attempts) for nid, state in app.memory.node_history.items()},
        }

    def _new_app(self):
        a, b, c, cross = self._nodes()
        return RuntimeApplication(ContentRepository([a, b, c, cross]))

    def _ready_app(self):
        a, b, c, cross = self._nodes()
        app = RuntimeApplication(ContentRepository([a, b, c, cross]))
        app.load_task("TST01-N01")
        app.submit_answer("TST01-N01", a["accepted_answer"])
        return app

    def test_initial_player_load_is_allowed(self):
        app = self._new_app()
        out = app.handle(self._load_command("TST01-N01"))
        self.assertEqual(out["task"]["node_id"], "TST01-N01")
        self.assertEqual(app.current_node_id, "TST01-N01")

    def test_reload_of_current_node_is_read_only(self):
        app = self._new_app()
        app.handle(self._load_command("TST01-N01"))
        before = self._state_snapshot(app)
        out = app.handle(self._load_command("TST01-N01"))
        self.assertEqual(out["task"]["node_id"], "TST01-N01")
        self.assertEqual(self._state_snapshot(app), before)

    def test_player_load_arbitrary_existing_same_mission_target_is_rejected_without_state_mutation(self):
        app = self._ready_app(); before = self._state_snapshot(app)
        with self.assertRaisesRegex(ValidationError, "cannot change current node"):
            app.handle(self._load_command("TST01-N03"))
        self.assertEqual(self._state_snapshot(app), before)

    def test_player_load_cross_mission_target_is_rejected_without_state_mutation(self):
        app = self._ready_app(); before = self._state_snapshot(app)
        with self.assertRaisesRegex(ValidationError, "cannot change current node"):
            app.handle(self._load_command("OTH01-N01"))
        self.assertEqual(self._state_snapshot(app), before)

    def test_player_load_unknown_target_is_rejected_without_lookup_or_state_mutation(self):
        app = self._ready_app(); before = self._state_snapshot(app)
        with self.assertRaisesRegex(ValidationError, "cannot change current node"):
            app.handle(self._load_command("ZZZ99-N99"))
        self.assertEqual(self._state_snapshot(app), before)

    def test_scripture_transport_player_load_cannot_bypass_runtime_entry_policy(self):
        app = self._ready_app(); before = self._state_snapshot(app)
        adapter = RuntimeEngineContractAdapter(app.handle)
        with self.assertRaisesRegex(ValidationError, "cannot change current node"):
            adapter.invoke_runtime(self._platform_load_request("TST01-N03"))
        self.assertEqual(self._state_snapshot(app), before)

    def test_canonical_target_is_accepted_only_by_runtime_resolution(self):
        app = self._ready_app()
        out = app.handle(self._next_command())
        self.assertEqual(out["task"]["node_id"], "TST01-N02")
        self.assertEqual(app.current_node_id, "TST01-N02")

    def test_arbitrary_existing_same_mission_target_is_rejected_without_state_mutation(self):
        app = self._ready_app(); before = self._state_snapshot(app)
        with self.assertRaisesRegex(ValidationError, "accepts no caller-selected target payload"):
            app.handle(self._next_command({"node_id": "TST01-N03"}))
        self.assertEqual(self._state_snapshot(app), before)

    def test_cross_mission_target_is_rejected_without_state_mutation(self):
        app = self._ready_app(); before = self._state_snapshot(app)
        with self.assertRaisesRegex(ValidationError, "accepts no caller-selected target payload"):
            app.handle(self._next_command({"node_id": "OTH01-N01"}))
        self.assertEqual(self._state_snapshot(app), before)

    def test_unknown_target_is_rejected_without_lookup_or_state_mutation(self):
        app = self._ready_app(); before = self._state_snapshot(app)
        with self.assertRaisesRegex(ValidationError, "accepts no caller-selected target payload"):
            app.handle(self._next_command({"node_id": "ZZZ99-N99"}))
        self.assertEqual(self._state_snapshot(app), before)

    def test_direct_next_explicit_target_compatibility_parameter_fails_closed(self):
        app = self._ready_app(); before = self._state_snapshot(app)
        with self.assertRaisesRegex(ValidationError, "forbids caller-selected node targets"):
            app.next(explicit_node_id="TST01-N02")
        self.assertEqual(self._state_snapshot(app), before)


if __name__ == "__main__":
    unittest.main()

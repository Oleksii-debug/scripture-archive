import copy
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

# DEV1 tests execute from reconstructed r06_platform; runtime_engine remains at repo root.
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from runtime_engine.scripture_archive_runtime.models import (
    PlayerMemory,
    RetrievalRelation,
    ReviewQueueItem,
    Session,
)
from scripture_archive_platform.application.daily_case_projection import (
    DAILY_CASE_RESPONSE_SCHEMA,
    DailyCaseProjection,
)
from scripture_archive_platform.application.runtime_gateway import (
    RuntimeBackedPlayerGateway,
    RuntimeGatewayError,
)
from scripture_archive_platform.application.service import PlatformApplication


FIXED_NOW = datetime(2026, 9, 12, 0, 0, tzinfo=timezone.utc)


class FakeContent:
    def __init__(self, tasks):
        self.tasks = tasks

    def get(self, node_id):
        return self.tasks[node_id]


class FakeLoader:
    def __init__(self, missions, mission_for_node):
        self.missions = missions
        self.by_node = mission_for_node

    def list_campaigns(self):
        return [{"campaign_id": "LN"}]

    def list_missions(self, campaign_id):
        return list(self.missions) if campaign_id == "LN" else []

    def mission_for_node(self, node_id):
        return dict(self.by_node[node_id])


class FakeRuntime:
    def __init__(self, tasks):
        self.content = FakeContent(tasks)
        self.memory = PlayerMemory(profile_id="test")
        self.session = Session(session_id="session")
        self.current_node_id = "LN01-N01"
        self.provenance_checked = []

    def _require_release_ground_truth(self, task):
        self.provenance_checked.append(task.raw["node_id"])
        return True


class PackagedDailyCaseProjectionTests(unittest.TestCase):
    def setUp(self):
        audited = {
            "mission_id": "LN-01",
            "campaign_id": "LN",
            "entry_node": "LN01-N01",
            "canonical_status": "AUTHOR_COMPLETE / DEVELOPER_SOURCE_AUDITED / INDEPENDENT_AUDIT_PENDING",
        }
        authored_only = {
            "mission_id": "LN-02",
            "campaign_id": "LN",
            "entry_node": "LN02-N01",
            "canonical_status": "AUTHOR_COMPLETE",
        }
        auditor_only = {
            "mission_id": "LN-03",
            "campaign_id": "LN",
            "entry_node": "LN03-N01",
            "canonical_status": "AUDITOR_ACCEPTED",
        }
        self.missions = [audited, authored_only, auditor_only]
        tasks = {
            node_id: SimpleNamespace(
                raw={"node_id": node_id, "task_family": family},
                task_type="SHORT_TEXT",
                mastery_domains=(concept,),
            )
            for node_id, family, concept in [
                ("LN01-N01", "entry", "C-ENTRY"),
                ("LN01-N02", "review", "C-REVIEW"),
                ("LN02-N01", "authored", "C-AUTHORED"),
                ("LN03-N01", "auditor", "C-AUDITOR"),
            ]
        }
        self.runtime = FakeRuntime(tasks)
        self.runtime.memory.review_queue.append(
            ReviewQueueItem(
                queue_id="review-1",
                concept_id="C-REVIEW",
                node_id="LN01-N02",
                due_at=FIXED_NOW - timedelta(days=1),
                priority=5,
                relation=RetrievalRelation.VARIANT,
                reason="runtime-owned review",
            )
        )
        mission_for_node = {
            "LN01-N01": audited,
            "LN01-N02": audited,
            "LN02-N01": authored_only,
            "LN03-N01": auditor_only,
        }
        self.loader = FakeLoader(self.missions, mission_for_node)

    def project(self):
        return DailyCaseProjection(
            self.runtime,
            self.loader,
            now_provider=lambda: FIXED_NOW,
        ).response()

    def test_projection_delegates_ranking_and_requires_explicit_source_audit(self):
        data = self.project()
        self.assertEqual(DAILY_CASE_RESPONSE_SCHEMA, data["schema"])
        self.assertTrue(data["read_only"])
        self.assertEqual(4, data["candidate_count"])
        rows = data["daily_case"]["items"]
        self.assertEqual(["LN01-N02", "LN01-N01"], [row["node_id"] for row in rows])
        self.assertEqual("DUE", rows[0]["queue"])
        self.assertEqual("VARIANT", rows[0]["relation"])
        self.assertNotIn("LN02-N01", {row["node_id"] for row in rows})
        self.assertNotIn("LN03-N01", {row["node_id"] for row in rows})
        self.assertEqual("daily-case.v1", data["daily_case"]["schema"])

    def test_projection_is_read_only_and_does_not_leak_task_truth(self):
        before_memory = copy.deepcopy(self.runtime.memory)
        before_session = copy.deepcopy(self.runtime.session)
        before_current = self.runtime.current_node_id
        data = self.project()
        self.assertEqual(before_memory, self.runtime.memory)
        self.assertEqual(before_session, self.runtime.session)
        self.assertEqual(before_current, self.runtime.current_node_id)
        self.assertFalse(data["truth"]["mutation"])
        self.assertFalse(data["truth"]["inferred_source_claims"])
        serialized = repr(data).lower()
        for forbidden in ("accepted_answer", "accepted_variants", "hints", "player_prompt", "required_evidence"):
            self.assertNotIn(forbidden, serialized)
        self.assertGreaterEqual(len(data["linear"]), data["daily_case"]["item_count"] + 1)
        self.assertEqual(
            {"LN01-N01", "LN01-N02", "LN02-N01", "LN03-N01"},
            set(self.runtime.provenance_checked),
        )

    def test_naive_now_provider_fails_closed(self):
        projection = DailyCaseProjection(
            self.runtime,
            self.loader,
            now_provider=lambda: datetime(2026, 9, 12),
        )
        with self.assertRaises(ValueError):
            projection.response()


class PackagedDailyCaseBoundaryTests(unittest.TestCase):
    def test_application_allowlist_requires_empty_payload(self):
        response = {"schema": DAILY_CASE_RESPONSE_SCHEMA, "read_only": True}
        gateway = SimpleNamespace(get_daily_case=lambda: response)
        app = object.__new__(PlatformApplication)
        app.player_gateway = gateway
        self.assertIs(response, app._dispatch("player.get_daily_case", {}))
        with self.assertRaises(ValueError):
            app._dispatch("player.get_daily_case", {"limit": 50})

    def test_application_and_gateway_fail_closed_without_canonical_runtime(self):
        app = object.__new__(PlatformApplication)
        app.player_gateway = None
        with self.assertRaises(ValueError):
            app._dispatch("player.get_daily_case", {})
        gateway = RuntimeBackedPlayerGateway(lambda request: request)
        with self.assertRaises(RuntimeGatewayError):
            gateway.get_daily_case()

    def test_supplemental_ui_keeps_single_startup_owner_and_safe_semantics(self):
        overlay = Path(__file__).resolve().parents[1]
        frontend = overlay / "frontend"
        self.assertTrue((frontend / "index.html").exists())
        self.assertTrue((frontend / "app.js").exists())
        app = (frontend / "app.js").read_text(encoding="utf-8")
        transport = (frontend / "transport.js").read_text(encoding="utf-8")
        ui = (frontend / "daily-case-ui.js").read_text(encoding="utf-8")
        self.assertNotIn("./daily-case-ui.js", app)
        self.assertEqual(1, transport.count("void import('./daily-case-ui.js')"))
        self.assertIn("player.get_daily_case", ui)
        self.assertNotIn("innerHTML", ui)
        self.assertIn("textContent", ui)
        self.assertIn("createElement", ui)
        self.assertIn("aria-live", ui)
        self.assertIn("role:'status'", ui)
        self.assertIn("caption", ui)
        self.assertIn("daily-case-linear", ui)
        self.assertIn("MutationObserver", ui)
        self.assertIn("generation", ui)
        for forbidden_command in (
            "player.submit_answer",
            "player.request_hint",
            "player.navigate_branch",
            "player.save_checkpoint",
            "authoring.",
        ):
            self.assertNotIn(forbidden_command, ui)


if __name__ == "__main__":
    unittest.main()

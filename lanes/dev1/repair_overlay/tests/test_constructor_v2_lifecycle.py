import itertools
import tempfile
import unittest
from pathlib import Path
import sys

for _parent in Path(__file__).resolve().parents:
    _runtime_root = _parent / "runtime_engine"
    if (_runtime_root / "scripture_archive_runtime").is_dir():
        sys.path.insert(0, str(_runtime_root))
        break

from scripture_archive_platform.authoring.service import AuthoringService
from scripture_archive_platform.content.loader import TaskPresentationMapper
from scripture_archive_platform.domain.registries import build_task_registries
from scripture_archive_platform.persistence.store import JsonFileStore


class ConstructorV2LifecycleTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.ids = itertools.count(1)
        self.registry = build_task_registries()[0]
        self.service = self._service()

    def tearDown(self):
        self.tmp.cleanup()

    def _service(self):
        return AuthoringService(
            JsonFileStore(self.root), self.registry, TaskPresentationMapper(),
            clock=lambda: 1700000000,
            id_factory=lambda: f"{next(self.ids):012d}",
        )

    def _campaign(self, title="Version one"):
        draft = self.service.new_draft("Campaign draft", "campaign")
        draft["campaign"].update({
            "campaign_id": "ZZ-CAMPAIGN",
            "title_ua": title,
            "scope": "Bounded fixture scope",
            "player_promise": "Fixture promise",
            "estimated_total_time": "5 min",
            "completion_reward_type": "none",
            "editorial_status": "DRAFT",
            "source_audit_status": "NOT_AUDITED",
        })
        return self.service.save_draft(draft)

    def test_undo_redo_persist_across_service_restart_with_monotonic_revision(self):
        draft = self._campaign("Version one")
        draft["campaign"]["title_ua"] = "Version two"
        saved = self.service.save_draft(draft)
        saved_revision = saved["revision"]

        restarted = self._service()
        history = restarted.history(saved["draft_id"])
        self.assertTrue(history["can_undo"])
        self.assertFalse(history["can_redo"])

        undone = restarted.undo(saved["draft_id"])
        self.assertEqual("Version one", undone["campaign"]["title_ua"])
        self.assertGreater(undone["revision"], saved_revision)
        redone = restarted.redo(saved["draft_id"])
        self.assertEqual("Version two", redone["campaign"]["title_ua"])
        self.assertGreater(redone["revision"], undone["revision"])

        restarted_again = self._service()
        self.assertEqual("Version two", restarted_again.load_draft(saved["draft_id"])["campaign"]["title_ua"])
        self.assertTrue(restarted_again.history(saved["draft_id"])["can_undo"])

    def test_snapshot_diff_restore_is_persisted_and_creates_safety_snapshot(self):
        draft = self._campaign("Before snapshot")
        snap = self.service.create_snapshot(draft["draft_id"], "Known good")
        draft["campaign"]["title_ua"] = "After snapshot"
        changed = self.service.save_draft(draft)

        diff = self.service.diff_draft(changed["draft_id"], snap["snapshot_id"])
        self.assertTrue(diff["changed"])
        self.assertIn("$.campaign.title_ua", diff["changed_paths"])

        restarted = self._service()
        restored = restarted.restore_snapshot(changed["draft_id"], snap["snapshot_id"])
        self.assertEqual("Before snapshot", restored["campaign"]["title_ua"])
        self.assertGreater(restored["revision"], changed["revision"])
        snapshots = restarted.list_snapshots(changed["draft_id"])
        self.assertGreaterEqual(len(snapshots), 2)
        self.assertIn("Known good", {row["label"] for row in snapshots})
        self.assertIn(
            "Automatic safety snapshot before snapshot restore",
            {row["label"] for row in snapshots},
        )

    def test_publish_version_is_fail_closed_compatible_persistent_and_never_canonical_write(self):
        draft = self._campaign("Publishable campaign")
        expected = self.service.pack_compatibility()
        bad = dict(expected)
        bad["content_schema_version"] = "CONTENT_NODE_SCHEMA_future"
        with self.assertRaisesRegex(ValueError, "pack compatibility mismatch"):
            self.service.publish_version(draft["draft_id"], bad)

        version = self.service.publish_version(draft["draft_id"], expected)
        self.assertFalse(version["canonical_mutation_performed"])
        self.assertTrue(version["requires_explicit_integration"])
        self.assertFalse(version["candidate"]["canonical_mutation_performed"])
        self.assertEqual(expected, version["compatibility"])

        draft["campaign"]["title_ua"] = "Later edit"
        later = self.service.save_draft(draft)
        restarted = self._service()
        versions = restarted.list_versions(draft["draft_id"])
        self.assertEqual([version["version_id"]], [row["version_id"] for row in versions])

        rolled = restarted.rollback_version(draft["draft_id"], version["version_id"])
        self.assertEqual("Publishable campaign", rolled["campaign"]["title_ua"])
        self.assertGreater(rolled["revision"], later["revision"])
        self.assertEqual("DRAFT", rolled["status"])
        self.assertNotIn("publish_manifest", rolled)
        self.assertNotIn("canonical_mutation_performed", rolled)

    def test_cross_draft_snapshot_and_version_restore_are_rejected(self):
        first = self._campaign("First")
        snapshot = self.service.create_snapshot(first["draft_id"], "First only")
        version = self.service.publish_version(first["draft_id"], self.service.pack_compatibility())
        second = self._campaign("Second")
        with self.assertRaisesRegex(ValueError, "another draft"):
            self.service.restore_snapshot(second["draft_id"], snapshot["snapshot_id"])
        with self.assertRaisesRegex(ValueError, "another draft"):
            self.service.rollback_version(second["draft_id"], version["version_id"])


if __name__ == "__main__":
    unittest.main()

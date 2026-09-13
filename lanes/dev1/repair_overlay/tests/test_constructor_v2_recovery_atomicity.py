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

from scripture_archive_platform.authoring.recoverable import (
    RecoverableAuthoringService,
    TRANSACTION_CATEGORY,
)
from scripture_archive_platform.content.loader import TaskPresentationMapper
from scripture_archive_platform.domain.registries import build_task_registries
from scripture_archive_platform.persistence.store import JsonFileStore


class SimulatedCrash(RuntimeError):
    pass


class FailAfterWriteStore:
    """Proxy that simulates process death after one durable component write."""

    def __init__(self, inner):
        self.inner = inner
        self.fail_category = None

    def arm(self, category):
        self.fail_category = category

    def put_json(self, category, key, value):
        self.inner.put_json(category, key, value)
        if self.fail_category == category:
            self.fail_category = None
            raise SimulatedCrash(f"crash after {category} write")

    def __getattr__(self, name):
        return getattr(self.inner, name)


class ConstructorV2RecoveryAtomicityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.ids = itertools.count(1)
        self.registry = build_task_registries()[0]
        self.base_store = JsonFileStore(self.root)
        self.service = self._service(self.base_store)

    def tearDown(self):
        self.tmp.cleanup()

    def _service(self, store):
        return RecoverableAuthoringService(
            store,
            self.registry,
            TaskPresentationMapper(),
            clock=lambda: 1700000000,
            id_factory=lambda: f"{next(self.ids):012d}",
        )

    def _restart(self):
        return self._service(JsonFileStore(self.root))

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

    def _assert_recovered(self, service, draft_id):
        self.assertEqual([], service.store.list_keys(TRANSACTION_CATEGORY))
        return service.load_draft(draft_id)

    def test_save_recovers_if_crash_occurs_after_history_before_draft(self):
        saved = self._campaign("Version one")
        saved["campaign"]["title_ua"] = "Version two"

        crashing = FailAfterWriteStore(self.base_store)
        crashing.arm("authoring_history")
        self.service.store = crashing
        with self.assertRaises(SimulatedCrash):
            self.service.save_draft(saved)

        # The draft write did not happen yet, but the durable intent did.
        self.assertEqual(
            "Version one",
            self.base_store.get_json("drafts", saved["draft_id"])["campaign"]["title_ua"],
        )
        restarted = self._restart()
        recovered = self._assert_recovered(restarted, saved["draft_id"])
        self.assertEqual("Version two", recovered["campaign"]["title_ua"])
        self.assertTrue(restarted.history(saved["draft_id"])["can_undo"])

    def test_undo_recovers_consumed_history_and_draft_as_one_revision(self):
        first = self._campaign("Version one")
        first["campaign"]["title_ua"] = "Version two"
        second = self.service.save_draft(first)

        crashing = FailAfterWriteStore(self.base_store)
        crashing.arm("authoring_history")
        self.service.store = crashing
        with self.assertRaises(SimulatedCrash):
            self.service.undo(second["draft_id"])

        restarted = self._restart()
        recovered = self._assert_recovered(restarted, second["draft_id"])
        self.assertEqual("Version one", recovered["campaign"]["title_ua"])
        history = restarted.history(second["draft_id"])
        self.assertTrue(history["can_redo"])
        redone = restarted.redo(second["draft_id"])
        self.assertEqual("Version two", redone["campaign"]["title_ua"])

    def test_redo_recovers_consumed_history_and_draft_as_one_revision(self):
        first = self._campaign("Version one")
        first["campaign"]["title_ua"] = "Version two"
        second = self.service.save_draft(first)
        undone = self.service.undo(second["draft_id"])
        self.assertEqual("Version one", undone["campaign"]["title_ua"])

        crashing = FailAfterWriteStore(self.base_store)
        crashing.arm("authoring_history")
        self.service.store = crashing
        with self.assertRaises(SimulatedCrash):
            self.service.redo(second["draft_id"])

        restarted = self._restart()
        recovered = self._assert_recovered(restarted, second["draft_id"])
        self.assertEqual("Version two", recovered["campaign"]["title_ua"])
        self.assertTrue(restarted.history(second["draft_id"])["can_undo"])

    def test_snapshot_restore_recovers_after_safety_snapshot_write(self):
        original = self._campaign("Before snapshot")
        snapshot = self.service.create_snapshot(original["draft_id"], "Known good")
        original["campaign"]["title_ua"] = "After snapshot"
        changed = self.service.save_draft(original)

        crashing = FailAfterWriteStore(self.base_store)
        crashing.arm("authoring_snapshots")
        self.service.store = crashing
        with self.assertRaises(SimulatedCrash):
            self.service.restore_snapshot(changed["draft_id"], snapshot["snapshot_id"])

        restarted = self._restart()
        recovered = self._assert_recovered(restarted, changed["draft_id"])
        self.assertEqual("Before snapshot", recovered["campaign"]["title_ua"])
        labels = {row["label"] for row in restarted.list_snapshots(changed["draft_id"])}
        self.assertIn("Known good", labels)
        self.assertIn("Automatic safety snapshot before snapshot restore", labels)

    def test_version_rollback_recovers_after_safety_snapshot_write(self):
        original = self._campaign("Publishable")
        version = self.service.publish_version(
            original["draft_id"],
            self.service.pack_compatibility(),
        )
        original["campaign"]["title_ua"] = "Later edit"
        later = self.service.save_draft(original)

        crashing = FailAfterWriteStore(self.base_store)
        crashing.arm("authoring_snapshots")
        self.service.store = crashing
        with self.assertRaises(SimulatedCrash):
            self.service.rollback_version(later["draft_id"], version["version_id"])

        restarted = self._restart()
        recovered = self._assert_recovered(restarted, later["draft_id"])
        self.assertEqual("Publishable", recovered["campaign"]["title_ua"])
        self.assertEqual("DRAFT", recovered["status"])
        self.assertNotIn("publish_manifest", recovered)
        self.assertNotIn("canonical_mutation_performed", recovered)
        labels = {row["label"] for row in restarted.list_snapshots(later["draft_id"])}
        self.assertIn("Automatic safety snapshot before version rollback", labels)

    def test_all_state_mutations_replay_from_every_durable_write_boundary(self):
        """Exercise intent/component/draft crash boundaries for every V2 mutation.

        The earlier independent QA finding required restart recovery at every
        inter-write boundary, including redo.  Each subcase gets an isolated
        store so a pending transaction from one simulated process death cannot
        contaminate another scenario.
        """

        cases = {
            "save": ("authoring_transactions", "authoring_history", "drafts"),
            "undo": ("authoring_transactions", "authoring_history", "drafts"),
            "redo": ("authoring_transactions", "authoring_history", "drafts"),
            "restore_snapshot": (
                "authoring_transactions",
                "authoring_history",
                "authoring_snapshots",
                "drafts",
            ),
            "rollback_version": (
                "authoring_transactions",
                "authoring_history",
                "authoring_snapshots",
                "drafts",
            ),
        }

        for operation, fail_categories in cases.items():
            for fail_category in fail_categories:
                with self.subTest(operation=operation, fail_category=fail_category):
                    with tempfile.TemporaryDirectory() as directory:
                        root = Path(directory)
                        ids = itertools.count(1)
                        base_store = JsonFileStore(root)

                        def make_service(store):
                            return RecoverableAuthoringService(
                                store,
                                self.registry,
                                TaskPresentationMapper(),
                                clock=lambda: 1700000000,
                                id_factory=lambda: f"{next(ids):012d}",
                            )

                        service = make_service(base_store)

                        def campaign(title):
                            draft = service.new_draft("Campaign draft", "campaign")
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
                            return service.save_draft(draft)

                        if operation == "save":
                            current = campaign("Version one")
                            current["campaign"]["title_ua"] = "Version two"
                            draft_id = current["draft_id"]
                            expected_title = "Version two"
                            invoke = lambda: service.save_draft(current)
                        elif operation == "undo":
                            current = campaign("Version one")
                            current["campaign"]["title_ua"] = "Version two"
                            current = service.save_draft(current)
                            draft_id = current["draft_id"]
                            expected_title = "Version one"
                            invoke = lambda: service.undo(draft_id)
                        elif operation == "redo":
                            current = campaign("Version one")
                            current["campaign"]["title_ua"] = "Version two"
                            current = service.save_draft(current)
                            draft_id = current["draft_id"]
                            service.undo(draft_id)
                            expected_title = "Version two"
                            invoke = lambda: service.redo(draft_id)
                        elif operation == "restore_snapshot":
                            current = campaign("Before snapshot")
                            snapshot = service.create_snapshot(current["draft_id"], "Known good")
                            current["campaign"]["title_ua"] = "After snapshot"
                            current = service.save_draft(current)
                            draft_id = current["draft_id"]
                            expected_title = "Before snapshot"
                            invoke = lambda: service.restore_snapshot(draft_id, snapshot["snapshot_id"])
                        else:
                            current = campaign("Publishable")
                            version = service.publish_version(
                                current["draft_id"],
                                service.pack_compatibility(),
                            )
                            current["campaign"]["title_ua"] = "Later edit"
                            current = service.save_draft(current)
                            draft_id = current["draft_id"]
                            expected_title = "Publishable"
                            invoke = lambda: service.rollback_version(draft_id, version["version_id"])

                        crashing = FailAfterWriteStore(base_store)
                        crashing.arm(fail_category)
                        service.store = crashing
                        with self.assertRaises(SimulatedCrash):
                            invoke()

                        restarted = make_service(JsonFileStore(root))
                        self.assertEqual([], restarted.store.list_keys(TRANSACTION_CATEGORY))
                        recovered = restarted.load_draft(draft_id)
                        self.assertEqual(expected_title, recovered["campaign"]["title_ua"])


if __name__ == "__main__":
    unittest.main()

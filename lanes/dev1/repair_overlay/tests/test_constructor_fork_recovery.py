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
    def __init__(self, inner, fail_category):
        self.inner = inner
        self.fail_category = fail_category

    def put_json(self, category, key, value):
        self.inner.put_json(category, key, value)
        if self.fail_category == category:
            self.fail_category = None
            raise SimulatedCrash(f"crash after {category} write")

    def __getattr__(self, name):
        return getattr(self.inner, name)


class ConstructorForkRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.registry = build_task_registries()[0]

    def _service(self, store, ids):
        return RecoverableAuthoringService(
            store,
            self.registry,
            TaskPresentationMapper(),
            clock=lambda: 1700000000,
            id_factory=lambda: f"{next(ids):012d}",
        )

    def test_fork_is_recovered_from_every_durable_write_boundary_without_blank_prewrite(self):
        record = {
            "campaign_id": "ZZ-CAMPAIGN",
            "title_ua": "Canonical fixture",
        }
        for fail_category in (TRANSACTION_CATEGORY, "authoring_history", "drafts"):
            with self.subTest(fail_category=fail_category), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                ids = itertools.count(1)
                base_store = JsonFileStore(root)
                service = self._service(
                    FailAfterWriteStore(base_store, fail_category),
                    ids,
                )

                with self.assertRaises(SimulatedCrash):
                    service.fork_record("campaign", record, "Edit canonical fixture")

                if fail_category == TRANSACTION_CATEGORY:
                    self.assertEqual([], base_store.list_keys("drafts"))
                self.assertEqual(1, len(base_store.list_keys(TRANSACTION_CATEGORY)))

                restarted = self._service(JsonFileStore(root), ids)
                self.assertEqual([], restarted.store.list_keys(TRANSACTION_CATEGORY))
                drafts = restarted.list_drafts()
                self.assertEqual(1, len(drafts))
                recovered = restarted.load_draft(drafts[0]["draft_id"])
                self.assertEqual(record, recovered["campaign"])
                self.assertEqual(
                    {"campaign": "ZZ-CAMPAIGN"},
                    recovered["base_identity"],
                )
                self.assertEqual(2, recovered["revision"])
                history = restarted.history(recovered["draft_id"])
                self.assertTrue(history["can_undo"])
                self.assertFalse(history["can_redo"])


if __name__ == "__main__":
    unittest.main()

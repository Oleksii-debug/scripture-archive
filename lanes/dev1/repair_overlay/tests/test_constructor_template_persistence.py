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

from scripture_archive_platform.authoring.recoverable import RecoverableAuthoringService
from scripture_archive_platform.authoring.service import AuthoringService
from scripture_archive_platform.content.loader import TaskPresentationMapper
from scripture_archive_platform.domain.registries import build_task_registries
from scripture_archive_platform.persistence.store import JsonFileStore


class ConstructorTemplatePersistenceTests(unittest.TestCase):
    def setUp(self):
        self.registry = build_task_registries()[0]

    def _service(self, service_type, root, ids, *, clock=1700000000):
        return service_type(
            JsonFileStore(root),
            self.registry,
            TaskPresentationMapper(),
            clock=lambda: clock,
            id_factory=lambda: f"{next(ids):012d}",
        )

    def test_new_node_template_survives_store_reload_and_service_restart(self):
        for service_type in (AuthoringService, RecoverableAuthoringService):
            with self.subTest(service=service_type.__name__), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                ids = itertools.count(1)
                service = self._service(service_type, root, ids)

                created = service.new_node_from_task_type(
                    "Restart-safe choice",
                    "single_choice",
                )
                self.assertEqual("SINGLE_CHOICE", created["node"]["task_type"])
                self.assertEqual("single_choice", created["node"]["response_mode"])
                self.assertEqual(1, created["revision"])
                self.assertEqual([], created["change_record"])

                persisted = service.load_draft(created["draft_id"])
                self.assertEqual(created, persisted)

                restarted = self._service(
                    service_type,
                    root,
                    itertools.count(100),
                    clock=1700000001,
                )
                restored = restarted.load_draft(created["draft_id"])
                self.assertEqual("SINGLE_CHOICE", restored["node"]["task_type"])
                self.assertEqual("single_choice", restored["node"]["response_mode"])
                self.assertEqual(1, restored["revision"])
                self.assertEqual("DRAFT", restored["status"])
                self.assertEqual([], restored["change_record"])

    def test_unknown_template_is_rejected_before_any_draft_is_persisted(self):
        for service_type in (AuthoringService, RecoverableAuthoringService):
            with self.subTest(service=service_type.__name__), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                service = self._service(service_type, root, itertools.count(1))
                before = set(service.store.list_keys("drafts"))

                with self.assertRaisesRegex(ValueError, "Unknown task_type"):
                    service.new_node_from_task_type("Bad template", "not_a_task")

                self.assertEqual(before, set(service.store.list_keys("drafts")))


if __name__ == "__main__":
    unittest.main()

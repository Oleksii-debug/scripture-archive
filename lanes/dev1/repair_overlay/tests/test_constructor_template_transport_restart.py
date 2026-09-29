import tempfile
import unittest
from pathlib import Path

from _fixture import make_repo
from scripture_archive_platform.application.service import build_default_application


class ConstructorTemplateTransportRestartTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.repo = make_repo(self.root / "repo")
        self.store_root = self.root / "store"
        self.app = build_default_application(self.repo, self.store_root)

    def tearDown(self):
        self.tmp.cleanup()

    @staticmethod
    def _request(app, command, payload, request_id):
        return app.handle({
            "api_version": "scripture.transport.v1",
            "request_id": request_id,
            "command": command,
            "payload": payload,
        })

    def test_task_template_survives_full_application_restart(self):
        created_response = self._request(
            self.app,
            "authoring.new_node_from_task_type",
            {"title": "Persistent ordering task", "task_type": "ORDERING"},
            "create-template",
        )
        self.assertTrue(created_response["ok"], created_response)
        created = created_response["data"]["draft"]
        self.assertEqual("ORDERING", created["node"]["task_type"])
        self.assertEqual("ordering", created["node"]["response_mode"])

        restarted = build_default_application(self.repo, self.store_root)
        loaded_response = self._request(
            restarted,
            "authoring.load_draft",
            {"draft_id": created["draft_id"]},
            "load-after-restart",
        )
        self.assertTrue(loaded_response["ok"], loaded_response)
        loaded = loaded_response["data"]["draft"]

        self.assertEqual(created, loaded)
        self.assertEqual("ORDERING", loaded["node"]["task_type"])
        self.assertEqual("ordering", loaded["node"]["response_mode"])
        self.assertEqual(1, loaded["revision"])


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scripture_archive_platform.application.content_pack_manager import ContentPackManagerService
from scripture_archive_platform.application.service import PlatformApplication
from scripture_archive_platform.domain.models import TRANSPORT_API_VERSION
from scripture_archive_platform.transport.contracts import ALLOWLISTED_COMMANDS


CONTENT_PACK_COMMANDS = (
    "content_packs.list",
    "content_packs.inspect",
    "content_packs.install",
    "content_packs.verify",
    "content_packs.activate",
    "content_packs.rollback",
)


class ContentPackBridgeAllowlistTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.app = object.__new__(PlatformApplication)
        self.app.content_packs = ContentPackManagerService(self.root)

    def tearDown(self):
        self.temp.cleanup()

    @staticmethod
    def request(command: str, payload: dict | None = None) -> dict:
        return {
            "api_version": TRANSPORT_API_VERSION,
            "request_id": "content-pack-bridge-test",
            "command": command,
            "payload": payload or {},
        }

    def test_exact_existing_content_pack_commands_are_centrally_allowlisted(self):
        for command in CONTENT_PACK_COMMANDS:
            with self.subTest(command=command):
                self.assertIn(command, ALLOWLISTED_COMMANDS)
        self.assertNotIn("content_packs.execute", ALLOWLISTED_COMMANDS)
        self.assertNotIn("content_packs.remove", ALLOWLISTED_COMMANDS)

    def test_list_reaches_existing_manager_through_platform_handle(self):
        response = self.app.handle(self.request("content_packs.list"))
        self.assertTrue(response["ok"], response)
        self.assertEqual("scripture.content-pack-manager.v1", response["data"]["schema"])
        self.assertEqual([], response["data"]["candidates"])
        self.assertEqual([], response["data"]["installed"])

    def test_unknown_content_pack_command_still_fails_at_central_allowlist(self):
        response = self.app.handle(self.request("content_packs.execute"))
        self.assertFalse(response["ok"])
        self.assertEqual("VALIDATION_ERROR", response["error"]["code"])
        self.assertEqual("command not allowlisted", response["error"]["message"])

    def test_reachable_manager_keeps_private_inbox_path_validation(self):
        response = self.app.handle(
            self.request("content_packs.inspect", {"file_name": "../escape.zip"})
        )
        self.assertFalse(response["ok"])
        self.assertEqual("VALIDATION_ERROR", response["error"]["code"])
        self.assertIn("invalid content pack file_name", response["error"]["message"])


if __name__ == "__main__":
    unittest.main()

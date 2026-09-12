from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scripture_archive_platform.application.content_pack_manager import ContentPackManagerService


class ContentPackManagerServiceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.manager = ContentPackManagerService(self.root)

    def tearDown(self):
        self.temp.cleanup()

    def test_list_exposes_private_inbox_without_arbitrary_path_input(self):
        data = self.manager.handle("content_packs.list", {})
        self.assertEqual("scripture.content-pack-manager.v1", data["schema"])
        self.assertEqual(str((self.root / "content-packs-v1" / "inbox").resolve()), data["inbox_path"])
        self.assertEqual([], data["candidates"])
        self.assertEqual([], data["installed"])

    def test_candidate_path_rejects_traversal_absolute_backslash_and_non_zip_names(self):
        for value in ("../escape.zip", "/absolute.zip", r"..\escape.zip", "C:drive.zip", "payload.exe", ".zip"):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    self.manager.handle("content_packs.inspect", {"file_name": value})

    def test_inbox_symlink_is_not_listed_or_accepted(self):
        outside = self.root / "outside.zip"
        outside.write_bytes(b"not-a-pack")
        link = self.manager.inbox / "linked.zip"
        try:
            link.symlink_to(outside)
        except (OSError, NotImplementedError):
            self.skipTest("symlink creation unavailable on this host")
        data = self.manager.handle("content_packs.list", {})
        self.assertEqual([], data["candidates"])
        with self.assertRaisesRegex(ValueError, "symlinks are forbidden"):
            self.manager.handle("content_packs.inspect", {"file_name": "linked.zip"})

    def test_invalid_zip_validation_error_is_safely_translated(self):
        candidate = self.manager.inbox / "broken.zip"
        candidate.write_bytes(b"not-a-zip")
        with self.assertRaises(ValueError):
            self.manager.handle("content_packs.inspect", {"file_name": candidate.name})

    def test_unknown_content_pack_command_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "command not implemented"):
            self.manager.handle("content_packs.execute", {})


class ContentPackManagerSurfaceTests(unittest.TestCase):
    def test_frontend_uses_semantic_dom_and_exact_allowlisted_commands(self):
        overlay = Path(__file__).resolve().parents[1]
        script = (overlay / "frontend" / "content-pack-manager.js").read_text(encoding="utf-8")
        wrapper = (overlay / "frontend" / "renderers.js").read_text(encoding="utf-8")
        self.assertIn("createElement('dialog')", script)
        self.assertIn("textContent", script)
        self.assertNotIn("innerHTML", script)
        self.assertNotIn("<input type=\"file\"", script)
        for command in (
            "content_packs.list",
            "content_packs.inspect",
            "content_packs.install",
            "content_packs.verify",
            "content_packs.activate",
            "content_packs.rollback",
        ):
            self.assertIn(command, script)
        self.assertIn("content-pack-manager.js", wrapper)
        self.assertIn("renderers-base.js", wrapper)


if __name__ == "__main__":
    unittest.main()

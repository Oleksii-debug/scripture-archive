import hashlib
import json
import os
import tempfile
import unittest
from pathlib import Path

from runtime_engine.scripture_archive_runtime.application_update import (
    ApplicationUpdateError,
    ApplicationUpdateManifest,
)
from runtime_engine.scripture_archive_runtime.application_update_staging import stage_local_update


@unittest.skipUnless(hasattr(os, "symlink"), "symlink support required")
class ApplicationUpdateStagingSymlinkTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.artifact = self.root / "ScriptureArchive-0.6.1.exe"
        self.artifact.write_bytes(b"symlink-boundary-update")
        digest = hashlib.sha256(self.artifact.read_bytes()).hexdigest()
        self.manifest = ApplicationUpdateManifest.from_mapping(
            {
                "schema": "scripture.application-update.v1",
                "product_id": "scripture-archive",
                "target_platform": "windows-x64",
                "target_version": "0.6.1",
                "source_head": "c" * 40,
                "artifact_name": self.artifact.name,
                "artifact_size": self.artifact.stat().st_size,
                "artifact_sha256": digest,
            }
        )

    def tearDown(self):
        self.temp.cleanup()

    def stage(self, root):
        return stage_local_update(
            self.manifest,
            self.artifact,
            root,
            current_version="0.6.0-r06.3dev.a",
            same_publisher_authenticode_verified=True,
        )

    def _make_directory_symlink_or_skip(self, link, target):
        target.mkdir(parents=True, exist_ok=True)
        try:
            link.symlink_to(target, target_is_directory=True)
        except (OSError, NotImplementedError) as exc:
            self.skipTest(f"directory symlink unavailable: {exc}")

    def test_staging_root_symlink_fails_closed(self):
        external = self.root / "external-root"
        link = self.root / "application-updates"
        self._make_directory_symlink_or_skip(link, external)
        with self.assertRaises(ApplicationUpdateError):
            self.stage(link)
        self.assertEqual([], list(external.iterdir()))

    def test_pending_directory_symlink_fails_closed(self):
        staging = self.root / "application-updates"
        staging.mkdir()
        external = self.root / "external-pending"
        self._make_directory_symlink_or_skip(staging / "pending", external)
        with self.assertRaises(ApplicationUpdateError):
            self.stage(staging)
        self.assertEqual([], list(external.iterdir()))
        self.assertFalse((staging / "pending-update.json").exists())


if __name__ == "__main__":
    unittest.main()

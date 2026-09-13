import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import scripture_archive_runtime.content_packs as content_packs_module
from scripture_archive_runtime import ContentPackStore
from scripture_archive_runtime.security import ValidationError
from test_content_packs import _write_pack


class PublicContentPackStoreTests(unittest.TestCase):
    def test_install_validates_private_snapshot_not_mutable_caller_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "caller-owned.zip"
            _write_pack(source)
            store = ContentPackStore(root / "store")
            real_inspect = content_packs_module.inspect_content_pack
            inspected_paths = []

            def inspect_snapshot(path):
                resolved = Path(path).resolve()
                inspected_paths.append(resolved)
                self.assertEqual(store.staging_root, resolved.parent)
                self.assertNotEqual(source.resolve(), resolved)
                return real_inspect(resolved)

            with patch("scripture_archive_runtime.content_packs.inspect_content_pack", side_effect=inspect_snapshot):
                store.install(source)

            self.assertEqual(1, len(inspected_paths))
            self.assertFalse(inspected_paths[0].exists())
            store.verify_installed("study-core", "1.0.0")

    def test_failed_verification_does_not_publish_or_block_retry(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "pack.zip"
            _write_pack(source)
            store = ContentPackStore(root / "store")
            target = store.packs_root / "study-core" / "1.0.0"

            with patch.object(
                store,
                "verify_installed",
                side_effect=ValidationError("forced staged verification failure"),
            ):
                with self.assertRaisesRegex(ValidationError, "forced staged verification failure"):
                    store.install(source)

            self.assertFalse(target.exists())
            self.assertEqual((), store.installed_versions("study-core"))
            self.assertEqual([], list(store.staging_root.iterdir()))

            installed = store.install(source)
            self.assertEqual("study-core", installed.manifest.pack_id)
            self.assertTrue(target.is_dir())
            store.verify_installed("study-core", "1.0.0")

    def test_export_cannot_mutate_immutable_store_and_versions_are_semver_sorted(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            versions = (
                "1.0.0-alpha",
                "1.0.0-alpha.1",
                "1.0.0-alpha.2",
                "1.0.0-alpha.10",
                "1.0.0-alpha.beta",
                "1.0.0-beta",
                "1.0.0-beta.2",
                "1.0.0-beta.11",
                "1.0.0-rc.1",
                "1.0.0",
                "1.2.0",
                "1.10.0",
            )
            store = ContentPackStore(root / "store")
            for index, version in enumerate(reversed(versions)):
                archive = root / f"pack-{index}.zip"
                _write_pack(archive, version=version)
                store.install(archive)
            self.assertEqual(versions, store.installed_versions("study-core"))

            with self.assertRaisesRegex(ValidationError, "outside the immutable pack store"):
                store.export_pack("study-core", "1.2.0", store.root / "exports" / "pack.zip")

            exported = store.export_pack("study-core", "1.2.0", root / "outside.zip")
            self.assertTrue(exported.is_file())
            store.verify_installed("study-core", "1.2.0")

    def test_case_distinct_semver_versions_cannot_alias_on_windows(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            upper = root / "upper.zip"
            lower = root / "lower.zip"
            _write_pack(upper, version="1.0.0-Alpha")
            _write_pack(lower, version="1.0.0-alpha")
            store = ContentPackStore(root / "store")
            store.install(upper)
            with self.assertRaisesRegex(ValidationError, "collides case-insensitively"):
                store.install(lower)


if __name__ == "__main__":
    unittest.main()

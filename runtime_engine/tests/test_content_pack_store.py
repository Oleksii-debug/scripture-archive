import tempfile
import unittest
from pathlib import Path

from scripture_archive_runtime import ContentPackStore
from scripture_archive_runtime.security import ValidationError
from test_content_packs import _write_pack


class PublicContentPackStoreTests(unittest.TestCase):
    def test_export_cannot_mutate_immutable_store_and_versions_are_semver_sorted(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            pack_12 = root / "pack-1.2.0.zip"
            pack_110 = root / "pack-1.10.0.zip"
            _write_pack(pack_12, version="1.2.0")
            _write_pack(pack_110, version="1.10.0")

            store = ContentPackStore(root / "store")
            store.install(pack_110)
            store.install(pack_12)
            self.assertEqual(("1.2.0", "1.10.0"), store.installed_versions("study-core"))

            with self.assertRaisesRegex(ValidationError, "outside the immutable pack store"):
                store.export_pack("study-core", "1.2.0", store.root / "exports" / "pack.zip")

            exported = store.export_pack("study-core", "1.2.0", root / "outside.zip")
            self.assertTrue(exported.is_file())
            store.verify_installed("study-core", "1.2.0")


if __name__ == "__main__":
    unittest.main()

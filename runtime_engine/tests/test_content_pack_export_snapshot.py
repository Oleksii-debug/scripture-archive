import hashlib
import json
import tempfile
import unittest
import zipfile
from copy import deepcopy
from pathlib import Path, PurePosixPath

from fixtures import LN01_N03
from scripture_archive_runtime.content_packs import (
    CONTENT_PACK_SCHEMA,
    CONTENT_SCHEMA_VERSION,
    MANIFEST_NAME,
    ContentPackStore,
    inspect_content_pack,
)
from scripture_archive_runtime.security import ValidationError


def _json_bytes(value, *, indent=None):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=indent) + "\n").encode("utf-8")


def _write_pack(path: Path, payload: bytes) -> None:
    digest = hashlib.sha256(payload).hexdigest()
    manifest = {
        "schema": CONTENT_PACK_SCHEMA,
        "pack_id": "study-core",
        "version": "1.0.0",
        "content_schema_version": CONTENT_SCHEMA_VERSION,
        "entry_points": ["content/nodes.json"],
        "files": {"content/nodes.json": digest},
    }
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(MANIFEST_NAME, _json_bytes(manifest))
        zf.writestr("content/nodes.json", payload)


class _SwapAfterVerifyStore(ContentPackStore):
    def __init__(self, root: Path, replacement: Path) -> None:
        super().__init__(root)
        self.replacement = replacement
        self.swap_after_verify = False

    def verify_installed(self, pack_id: str, version: str):
        manifest = super().verify_installed(pack_id, version)
        if self.swap_after_verify:
            self.swap_after_verify = False
            pack_dir = self._pack_dir(pack_id, version)
            with zipfile.ZipFile(self.replacement, "r") as zf:
                for name in [MANIFEST_NAME, *manifest.files]:
                    destination = pack_dir.joinpath(*PurePosixPath(name).parts)
                    destination.write_bytes(zf.read(name))
        return manifest


class ContentPackExportSnapshotTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def test_export_rejects_consistent_manifest_and_payload_swap_after_verification(self):
        original = self.root / "original.zip"
        replacement = self.root / "replacement.zip"
        node_payload = {"nodes": [deepcopy(LN01_N03)]}
        original_payload = _json_bytes(node_payload)
        replacement_payload = _json_bytes(node_payload, indent=2)
        self.assertNotEqual(original_payload, replacement_payload)
        _write_pack(original, original_payload)
        _write_pack(replacement, replacement_payload)

        original_manifest = inspect_content_pack(original).manifest
        replacement_manifest = inspect_content_pack(replacement).manifest
        self.assertEqual(original_manifest.pack_id, replacement_manifest.pack_id)
        self.assertEqual(original_manifest.version, replacement_manifest.version)
        self.assertNotEqual(original_manifest.files, replacement_manifest.files)

        store = _SwapAfterVerifyStore(self.root / "store", replacement)
        store.install(original)
        store.swap_after_verify = True
        destination = self.root / "export.zip"

        with self.assertRaisesRegex(ValidationError, "changed during export"):
            store.export_pack("study-core", "1.0.0", destination)

        self.assertFalse(destination.exists())
        self.assertEqual([], list(self.root.glob(".export.zip.*.tmp")))


if __name__ == "__main__":
    unittest.main()

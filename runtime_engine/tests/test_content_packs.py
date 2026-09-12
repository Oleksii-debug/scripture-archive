import hashlib
import json
import stat
import tempfile
import unittest
import zipfile
from copy import deepcopy
from pathlib import Path

from fixtures import LN01_N03
from scripture_archive_runtime.content_packs import (
    CONTENT_PACK_SCHEMA,
    CONTENT_SCHEMA_VERSION,
    MANIFEST_NAME,
    ContentPackStore,
    inspect_content_pack,
)
from scripture_archive_runtime.security import ValidationError


def _json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True) + "\n").encode("utf-8")


def _write_pack(
    path: Path,
    *,
    version: str = "1.0.0",
    pack_id: str = "study-core",
    node=None,
    digest_override: str | None = None,
) -> None:
    payload = _json_bytes({"nodes": [deepcopy(node or LN01_N03)]})
    digest = digest_override or hashlib.sha256(payload).hexdigest()
    manifest = {
        "schema": CONTENT_PACK_SCHEMA,
        "pack_id": pack_id,
        "version": version,
        "content_schema_version": CONTENT_SCHEMA_VERSION,
        "entry_points": ["content/nodes.json"],
        "files": {"content/nodes.json": digest},
    }
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(MANIFEST_NAME, _json_bytes(manifest))
        zf.writestr("content/nodes.json", payload)


def _write_raw_zip(path: Path, members: list[tuple[zipfile.ZipInfo | str, bytes]]) -> None:
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name, data in members:
            zf.writestr(name, data)


class ContentPackTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def test_inspect_install_activate_rollback_and_deterministic_export(self):
        first = self.root / "first.zip"
        second = self.root / "second.zip"
        _write_pack(first, version="1.0.0")
        _write_pack(second, version="1.1.0")

        inspected = inspect_content_pack(first)
        self.assertEqual("study-core", inspected.manifest.pack_id)
        self.assertEqual("1.0.0", inspected.manifest.version)
        self.assertEqual(1, inspected.node_count)
        self.assertEqual(2, inspected.file_count)

        store = ContentPackStore(self.root / "store")
        store.install(first)
        store.install(second)
        self.assertEqual(("1.0.0", "1.1.0"), store.installed_versions("study-core"))

        store.activate("study-core", "1.0.0")
        self.assertEqual({"study-core": "1.0.0"}, store.active_versions())
        store.activate("study-core", "1.1.0")
        self.assertEqual({"study-core": "1.1.0"}, store.active_versions())
        rolled_back = store.rollback("study-core")
        self.assertEqual("1.0.0", rolled_back.version)
        self.assertEqual({"study-core": "1.0.0"}, store.active_versions())

        exported_a = store.export_pack("study-core", "1.0.0", self.root / "export-a.zip")
        exported_b = store.export_pack("study-core", "1.0.0", self.root / "export-b.zip")
        self.assertEqual(exported_a.read_bytes(), exported_b.read_bytes())
        roundtrip = inspect_content_pack(exported_a)
        self.assertEqual("1.0.0", roundtrip.manifest.version)
        self.assertEqual(inspected.manifest.files, roundtrip.manifest.files)

    def test_installed_pack_versions_are_immutable_and_tampering_fails_closed(self):
        pack = self.root / "pack.zip"
        _write_pack(pack)
        store = ContentPackStore(self.root / "store")
        store.install(pack)
        with self.assertRaisesRegex(ValidationError, "immutable"):
            store.install(pack)

        installed_payload = self.root / "store" / "packs" / "study-core" / "1.0.0" / "content" / "nodes.json"
        installed_payload.write_text("{}\n", encoding="utf-8")
        with self.assertRaisesRegex(ValidationError, "SHA-256 mismatch"):
            store.activate("study-core", "1.0.0")

    def test_manifest_hash_mismatch_is_rejected_before_install(self):
        pack = self.root / "bad-hash.zip"
        _write_pack(pack, digest_override="0" * 64)
        with self.assertRaisesRegex(ValidationError, "SHA-256 mismatch"):
            inspect_content_pack(pack)

    def test_invalid_canonical_entrypoint_is_rejected(self):
        pack = self.root / "invalid-node.zip"
        bad = deepcopy(LN01_N03)
        bad.pop("required_evidence")
        _write_pack(pack, node=bad)
        with self.assertRaisesRegex(ValidationError, "Missing canonical fields"):
            inspect_content_pack(pack)

    def test_parent_traversal_absolute_and_windows_ambiguous_paths_are_rejected(self):
        unsafe_paths = (
            "../escape.json",
            "/absolute.json",
            "C:/drive.json",
            "dir\\evil.json",
            "safe/file.json:ads",
        )
        for index, unsafe in enumerate(unsafe_paths):
            archive = self.root / f"unsafe-{index}.zip"
            _write_raw_zip(archive, [(MANIFEST_NAME, b"{}"), (unsafe, b"{}")])
            with self.subTest(path=unsafe):
                with self.assertRaises(ValidationError):
                    inspect_content_pack(archive)

    def test_windows_invalid_and_control_characters_in_member_segments_are_rejected(self):
        unsafe_paths = (
            "content/bad?.json",
            "content/bad*.json",
            "content/bad|name.json",
            "content/bad<name.json",
            "content/bad>name.json",
            'content/bad"name.json',
            "content/bad\x1bname.json",
        )
        for index, unsafe in enumerate(unsafe_paths):
            archive = self.root / f"windows-invalid-{index}.zip"
            _write_raw_zip(archive, [(MANIFEST_NAME, b"{}"), (unsafe, b"{}")])
            with self.subTest(path=repr(unsafe)):
                with self.assertRaisesRegex(ValidationError, "unsafe on Windows"):
                    inspect_content_pack(archive)

    def test_pack_identity_and_versions_are_windows_safe_and_strict_semver(self):
        for index, pack_id in enumerate(("con", "nul.txt", "com1.cfg", "lpt9.data", "study.")):
            archive = self.root / f"unsafe-id-{index}.zip"
            _write_pack(archive, pack_id=pack_id)
            with self.subTest(pack_id=pack_id):
                with self.assertRaises(ValidationError):
                    inspect_content_pack(archive)

        invalid_versions = (
            "01.0.0",
            "1.01.0",
            "1.0.01",
            "1.0.0-alpha.01",
            "1.0.0-01",
            "1.0.0-a.",
        )
        for index, version in enumerate(invalid_versions):
            archive = self.root / f"unsafe-version-{index}.zip"
            _write_pack(archive, version=version)
            with self.subTest(version=version):
                with self.assertRaises(ValidationError):
                    inspect_content_pack(archive)

    def test_case_collision_and_duplicate_names_are_rejected(self):
        archive = self.root / "collision.zip"
        _write_raw_zip(
            archive,
            [
                (MANIFEST_NAME, b"{}"),
                ("content/Data.json", b"{}"),
                ("content/data.json", b"{}"),
            ],
        )
        with self.assertRaisesRegex(ValidationError, "case-colliding"):
            inspect_content_pack(archive)

    def test_symlink_special_members_are_rejected(self):
        archive = self.root / "symlink.zip"
        link = zipfile.ZipInfo("content/link.json")
        link.create_system = 3
        link.external_attr = (stat.S_IFLNK | 0o777) << 16
        _write_raw_zip(archive, [(MANIFEST_NAME, b"{}"), (link, b"target")])
        with self.assertRaisesRegex(ValidationError, "Symlink/special"):
            inspect_content_pack(archive)

    def test_executable_scripts_nested_archives_and_unknown_types_are_rejected(self):
        for index, forbidden in enumerate(("payload.js", "payload.exe", "nested.zip", "page.html", "unknown.bin")):
            archive = self.root / f"forbidden-{index}.zip"
            _write_raw_zip(archive, [(MANIFEST_NAME, b"{}"), (forbidden, b"x")])
            with self.subTest(path=forbidden):
                with self.assertRaises(ValidationError):
                    inspect_content_pack(archive)

    def test_unmanifested_payload_is_rejected(self):
        pack = self.root / "extra.zip"
        _write_pack(pack)
        rewritten = self.root / "extra-rewritten.zip"
        with zipfile.ZipFile(pack, "r") as src, zipfile.ZipFile(rewritten, "w", compression=zipfile.ZIP_DEFLATED) as dst:
            for info in src.infolist():
                dst.writestr(info.filename, src.read(info.filename))
            dst.writestr("extra.txt", b"not declared")
        with self.assertRaisesRegex(ValidationError, "file manifest mismatch"):
            inspect_content_pack(rewritten)

    def test_activation_state_corruption_fails_closed(self):
        pack = self.root / "pack.zip"
        _write_pack(pack)
        store = ContentPackStore(self.root / "store")
        store.install(pack)
        store.state_path.write_text("{broken", encoding="utf-8")
        with self.assertRaisesRegex(ValidationError, "state is corrupt"):
            store.active_versions()


if __name__ == "__main__":
    unittest.main()

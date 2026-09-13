from __future__ import annotations

import importlib.util
import struct
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "packaging" / "packaged_payload_fidelity.py"
SPEC = importlib.util.spec_from_file_location("dev01_packaged_payload_fidelity", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class FakeArchive:
    def __init__(self, entries: dict[str, bytes]):
        self.entries = entries
        self.toc = {name: (0, 0, 0, 0, "x") for name in entries}

    def extract(self, name: str) -> bytes:
        return self.entries[name]


class FakeRawArchive(FakeArchive):
    _COOKIE_MAGIC_PATTERN = b"MEI\014\013\012\013\016"
    _COOKIE_FORMAT = "!8sIIII64s"
    _COOKIE_LENGTH = struct.calcsize(_COOKIE_FORMAT)
    _TOC_ENTRY_FORMAT = "!IIIIBc"
    _TOC_ENTRY_LENGTH = struct.calcsize(_TOC_ENTRY_FORMAT)

    def __init__(self, entries: dict[str, bytes], raw_names: list[str]):
        super().__init__(entries)
        toc = bytearray()
        for name in raw_names:
            encoded_name = name.encode("utf-8") + b"\0"
            entry_length = self._TOC_ENTRY_LENGTH + len(encoded_name)
            toc.extend(
                struct.pack(
                    self._TOC_ENTRY_FORMAT,
                    entry_length,
                    0,
                    0,
                    0,
                    0,
                    b"x",
                )
            )
            toc.extend(encoded_name)
        archive_length = len(toc) + self._COOKIE_LENGTH
        cookie = struct.pack(
            self._COOKIE_FORMAT,
            self._COOKIE_MAGIC_PATTERN,
            archive_length,
            0,
            len(toc),
            312,
            b"python312.dll".ljust(64, b"\0"),
        )
        self._raw_pkg = bytes(toc) + cookie

    def raw_pkg_data(self) -> bytes:
        return self._raw_pkg


class PackagedPayloadFidelityTests(unittest.TestCase):
    def test_git_blob_sha_matches_known_empty_blob(self):
        self.assertEqual(
            MODULE.git_blob_sha(b""),
            "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391",
        )

    def test_verify_reader_accepts_exact_bytes_and_normalizes_windows_paths(self):
        app = b"console.log('archive');\n"
        campaign = b'{"id":"case-1"}\n'
        manifest = {
            "schema_version": 1,
            "git_sha": "1" * 40,
            "source_archive_sha256": "2" * 64,
            "entries": [
                {
                    "package_path": "r06_platform/frontend/app.js",
                    "size_bytes": len(app),
                    "sha256": MODULE.sha256_hex(app),
                    "git_blob_sha1": MODULE.git_blob_sha(app),
                    "provenance": "git_overlay",
                },
                {
                    "package_path": "docs/campaigns/case.jsonl",
                    "size_bytes": len(campaign),
                    "sha256": MODULE.sha256_hex(campaign),
                    "git_blob_sha1": MODULE.git_blob_sha(campaign),
                    "provenance": "git_campaign",
                },
            ],
            "not_proven": ["human NVDA acceptance"],
        }
        reader = FakeArchive(
            {
                "r06_platform\\frontend\\app.js": app,
                "docs/campaigns/case.jsonl": campaign,
                "pyi-runtime-internal": b"allowed unprotected member",
            }
        )

        result = MODULE.verify_reader(reader, manifest)

        self.assertTrue(result["ok"])
        self.assertEqual(result["files_verified"], 2)
        self.assertEqual(result["errors"], [])
        self.assertEqual(result["not_proven"], ["human NVDA acceptance"])

    def test_verify_reader_fails_closed_on_missing_or_mutated_payload(self):
        expected = b"expected"
        manifest = {
            "schema_version": 1,
            "entries": [
                {
                    "package_path": "r06_platform/frontend/app.js",
                    "size_bytes": len(expected),
                    "sha256": MODULE.sha256_hex(expected),
                    "git_blob_sha1": MODULE.git_blob_sha(expected),
                    "provenance": "git_overlay",
                },
                {
                    "package_path": "docs/campaigns/missing.jsonl",
                    "size_bytes": 1,
                    "sha256": MODULE.sha256_hex(b"x"),
                    "provenance": "git_campaign",
                },
            ],
        }
        result = MODULE.verify_reader(
            FakeArchive({"r06_platform/frontend/app.js": b"mutated"}), manifest
        )

        self.assertFalse(result["ok"])
        self.assertEqual(result["files_verified"], 0)
        self.assertTrue(any(error.startswith("SHA256_MISMATCH") for error in result["errors"]))
        self.assertTrue(any(error.startswith("GIT_BLOB_MISMATCH") for error in result["errors"]))
        self.assertTrue(any(error.startswith("MISSING") for error in result["errors"]))

    def test_entry_rejects_staged_bytes_that_do_not_match_git_blob_pin(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "app.js"
            source.write_bytes(b"actual")
            with self.assertRaises(RuntimeError):
                MODULE._entry(
                    source,
                    "r06_platform/frontend/app.js",
                    "git_overlay",
                    repo_path="lanes/dev1/repair_overlay/frontend/app.js",
                    git_blob=MODULE.git_blob_sha(b"different"),
                )

    def test_normalize_archive_path_rejects_traversal_absolute_and_ambiguous_members(self):
        unsafe = (
            "../docs/campaigns/case.jsonl",
            "..\\r06_platform\\frontend\\app.js",
            "./docs/campaigns/case.jsonl",
            "/docs/campaigns/case.jsonl",
            "C:/docs/campaigns/case.jsonl",
            "\\\\server\\share\\case.jsonl",
            "docs//campaigns/case.jsonl",
            "docs/./campaigns/case.jsonl",
            "docs/campaigns/../case.jsonl",
        )
        for value in unsafe:
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    MODULE.normalize_archive_path(value)

    def test_verify_reader_rejects_traversal_alias_instead_of_matching_expected(self):
        payload = b'{"id":"case-1"}\n'
        manifest = {
            "schema_version": 1,
            "entries": [
                {
                    "package_path": "docs/campaigns/case.jsonl",
                    "size_bytes": len(payload),
                    "sha256": MODULE.sha256_hex(payload),
                    "git_blob_sha1": MODULE.git_blob_sha(payload),
                    "provenance": "git_campaign",
                }
            ],
        }
        result = MODULE.verify_reader(
            FakeArchive({"../docs/campaigns/case.jsonl": payload}), manifest
        )
        self.assertFalse(result["ok"])
        self.assertTrue(any(error.startswith("INVALID_ARCHIVE_PATH") for error in result["errors"]))
        self.assertTrue(any(error.startswith("MISSING") for error in result["errors"]))

    def test_verify_reader_rejects_unexpected_protected_payload(self):
        app = b"console.log('archive');\n"
        manifest = {
            "schema_version": 1,
            "entries": [
                {
                    "package_path": "r06_platform/frontend/app.js",
                    "size_bytes": len(app),
                    "sha256": MODULE.sha256_hex(app),
                    "git_blob_sha1": MODULE.git_blob_sha(app),
                    "provenance": "git_overlay",
                }
            ],
        }
        result = MODULE.verify_reader(
            FakeArchive(
                {
                    "r06_platform/frontend/app.js": app,
                    "r06_platform/frontend/injected.js": b"injected",
                }
            ),
            manifest,
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["files_verified"], 1)
        self.assertIn(
            "UNEXPECTED_PROTECTED_PAYLOAD r06_platform/frontend/injected.js",
            result["errors"],
        )

    def test_raw_carchive_readback_rejects_exact_duplicate_member_names(self):
        app = b"console.log('archive');\n"
        path = "r06_platform/frontend/app.js"
        manifest = {
            "schema_version": 1,
            "entries": [
                {
                    "package_path": path,
                    "size_bytes": len(app),
                    "sha256": MODULE.sha256_hex(app),
                    "git_blob_sha1": MODULE.git_blob_sha(app),
                    "provenance": "git_overlay",
                }
            ],
        }
        reader = FakeRawArchive({path: app}, [path, path])

        raw_names = MODULE._raw_carchive_member_names(reader)
        result = MODULE.verify_reader(reader, manifest, archive_names=raw_names)

        self.assertEqual(raw_names, [path, path])
        self.assertFalse(result["ok"])
        self.assertIn(
            f"DUPLICATE_NORMALIZED_PATH {path}: {path!r} vs {path!r}",
            result["errors"],
        )


if __name__ == "__main__":
    unittest.main()

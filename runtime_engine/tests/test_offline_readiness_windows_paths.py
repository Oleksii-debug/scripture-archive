import hashlib
import os
from pathlib import Path
import tempfile
import unittest

from scripture_archive_runtime.offline_readiness import (
    NETWORK_POLICY_FORBIDDEN,
    OFFLINE_MANIFEST_SCHEMA,
    OfflineDependency,
    OfflineReadinessError,
    OfflineReadinessManifest,
    verify_offline_bundle,
)


PAYLOAD = b"x"
DIGEST = hashlib.sha256(PAYLOAD).hexdigest()


def manifest_for(path: str) -> dict:
    return {
        "schema": OFFLINE_MANIFEST_SCHEMA,
        "product_id": "scripture-archive",
        "target_platform": "windows-x64",
        "network_policy": NETWORK_POLICY_FORBIDDEN,
        "dependencies": [
            {
                "path": path,
                "role": "content",
                "size": len(PAYLOAD),
                "sha256": DIGEST,
            }
        ],
    }


class OfflineReadinessWindowsPathTests(unittest.TestCase):
    def test_windows_invalid_filename_characters_are_rejected_in_every_component(self):
        for char in '<>"|?*':
            for path in (f"data/a{char}b.json", f"seg{char}ment/file.json"):
                with self.subTest(char=char, path=path):
                    with self.assertRaises(OfflineReadinessError) as caught:
                        OfflineReadinessManifest.from_mapping(manifest_for(path))
                    self.assertEqual(caught.exception.code, "manifest_path")

    def test_windows_superscript_reserved_devices_are_rejected_in_every_component(self):
        for prefix in ("COM", "LPT"):
            for digit in "¹²³":
                for path in (
                    f"data/{prefix}{digit}",
                    f"data/{prefix.lower()}{digit}.txt",
                    f"{prefix}{digit}/file.json",
                ):
                    with self.subTest(prefix=prefix, digit=digit, path=path):
                        with self.assertRaises(OfflineReadinessError) as caught:
                            OfflineReadinessManifest.from_mapping(manifest_for(path))
                        self.assertEqual(caught.exception.code, "manifest_path")

    def test_direct_dataclass_construction_cannot_bypass_windows_path_validation(self):
        dependency = OfflineDependency(
            path="data/a?.json",
            role="content",
            size=len(PAYLOAD),
            sha256=DIGEST,
        )
        manifest = OfflineReadinessManifest(
            product_id="scripture-archive",
            target_platform="windows-x64",
            dependencies=(dependency,),
        )
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaises(OfflineReadinessError) as caught:
                verify_offline_bundle(manifest, Path(temp))
        self.assertEqual(caught.exception.code, "manifest_path")

    def test_direct_dataclass_construction_cannot_bypass_superscript_device_validation(self):
        dependency = OfflineDependency(
            path="data/LPT³.json",
            role="content",
            size=len(PAYLOAD),
            sha256=DIGEST,
        )
        manifest = OfflineReadinessManifest(
            product_id="scripture-archive",
            target_platform="windows-x64",
            dependencies=(dependency,),
        )
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaises(OfflineReadinessError) as caught:
                verify_offline_bundle(manifest, Path(temp))
        self.assertEqual(caught.exception.code, "manifest_path")

    @unittest.skipIf(os.name == "nt", "POSIX-only counterexample for a Linux-creatable Windows-invalid path")
    def test_posix_creatable_question_mark_file_cannot_false_ready_for_windows(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "data").mkdir()
            invalid_on_windows = root / "data" / "a?.json"
            invalid_on_windows.write_bytes(PAYLOAD)
            self.assertTrue(invalid_on_windows.is_file())

            with self.assertRaises(OfflineReadinessError) as caught:
                OfflineReadinessManifest.from_mapping(manifest_for("data/a?.json"))
            self.assertEqual(caught.exception.code, "manifest_path")

    @unittest.skipIf(os.name == "nt", "POSIX-only counterexample for a Windows reserved device name")
    def test_posix_creatable_superscript_device_cannot_false_ready_for_windows(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "data").mkdir()
            invalid_on_windows = root / "data" / "COM¹.txt"
            invalid_on_windows.write_bytes(PAYLOAD)
            self.assertTrue(invalid_on_windows.is_file())

            with self.assertRaises(OfflineReadinessError) as caught:
                OfflineReadinessManifest.from_mapping(manifest_for("data/COM¹.txt"))
            self.assertEqual(caught.exception.code, "manifest_path")


if __name__ == "__main__":
    unittest.main()

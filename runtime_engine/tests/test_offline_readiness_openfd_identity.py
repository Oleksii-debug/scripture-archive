import hashlib
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from scripture_archive_runtime.offline_readiness import (
    OFFLINE_MANIFEST_SCHEMA,
    OfflineReadinessError,
    OfflineReadinessManifest,
    verify_offline_bundle,
)


VERIFIED_BYTES = b"offline-launch-critical-bytes\x00\x01"


class OfflineReadinessOpenIdentityTests(unittest.TestCase):
    def test_opened_descriptor_must_match_prechecked_dependency_path_identity(self):
        manifest = OfflineReadinessManifest.from_mapping(
            {
                "schema": OFFLINE_MANIFEST_SCHEMA,
                "product_id": "scripture-archive",
                "target_platform": "windows-x64",
                "network_policy": "forbidden",
                "dependencies": [
                    {
                        "path": "app/ScriptureArchive.exe",
                        "role": "application",
                        "size": len(VERIFIED_BYTES),
                        "sha256": hashlib.sha256(VERIFIED_BYTES).hexdigest(),
                    }
                ],
            }
        )

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            app = root / "app"
            app.mkdir()
            path = app / "ScriptureArchive.exe"
            substitute = root / "substitute.exe"
            path.write_bytes(b"X" * len(VERIFIED_BYTES))
            substitute.write_bytes(VERIFIED_BYTES)

            real_open = Path.open

            def redirected_open(candidate, *args, **kwargs):
                if candidate == path:
                    return real_open(substitute, *args, **kwargs)
                return real_open(candidate, *args, **kwargs)

            with patch.object(Path, "open", new=redirected_open):
                with self.assertRaisesRegex(
                    OfflineReadinessError,
                    "opened dependency identity does not match verified path",
                ) as caught:
                    verify_offline_bundle(manifest, root)

            self.assertEqual(caught.exception.code, "dependency_changed")
            self.assertEqual(caught.exception.path, "app/ScriptureArchive.exe")


if __name__ == "__main__":
    unittest.main()

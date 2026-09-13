import hashlib
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from scripture_archive_runtime.application_update import (
    ApplicationUpdateError,
    ApplicationUpdateManifest,
    UPDATE_MANIFEST_SCHEMA,
    verify_local_update,
)


SOURCE_HEAD = "9dc82b50ac82de00e3af9ee7a58204982d39217d"
VERIFIED_BYTES = b"scripture-archive-release-bytes\x00\x01"


class ApplicationUpdateOpenIdentityTests(unittest.TestCase):
    def test_opened_descriptor_must_match_prechecked_path_identity(self):
        manifest = ApplicationUpdateManifest.from_mapping(
            {
                "schema": UPDATE_MANIFEST_SCHEMA,
                "product_id": "scripture-archive",
                "target_platform": "windows-x64",
                "target_version": "1.2.0",
                "source_head": SOURCE_HEAD,
                "artifact_name": "ScriptureArchive-1.2.0-win-x64.zip",
                "artifact_size": len(VERIFIED_BYTES),
                "artifact_sha256": hashlib.sha256(VERIFIED_BYTES).hexdigest(),
            }
        )

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            path = root / manifest.artifact_name
            substitute = root / "substitute.zip"
            path.write_bytes(b"X" * len(VERIFIED_BYTES))
            substitute.write_bytes(VERIFIED_BYTES)

            real_open = Path.open

            def redirected_open(candidate, *args, **kwargs):
                if candidate == path:
                    return real_open(substitute, *args, **kwargs)
                return real_open(candidate, *args, **kwargs)

            with patch.object(Path, "open", new=redirected_open):
                with self.assertRaisesRegex(
                    ApplicationUpdateError,
                    "opened artifact identity does not match verified path",
                ):
                    verify_local_update(manifest, path, current_version="1.1.0")


if __name__ == "__main__":
    unittest.main()

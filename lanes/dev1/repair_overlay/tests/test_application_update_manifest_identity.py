from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripture_archive_platform.desktop_host.update_application import (
    NativeApplicationUpdateLayer,
)


class ApplicationUpdateManifestIdentityTests(unittest.TestCase):
    def test_manifest_path_swap_between_lstat_and_open_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            manifest = root / "update-manifest.json"
            replacement = root / "replacement-manifest.json"
            manifest.write_text('{"schema":"original-authority"}\n', encoding="utf-8")
            replacement.write_text('{"schema":"replacement-data"}\n', encoding="utf-8")

            original_open = Path.open
            swapped = False

            def racing_open(path: Path, *args, **kwargs):
                nonlocal swapped
                if path == manifest and not swapped:
                    swapped = True
                    os.replace(replacement, manifest)
                return original_open(path, *args, **kwargs)

            with patch.object(Path, "open", new=racing_open):
                with self.assertRaisesRegex(ValueError, "changed before being read"):
                    NativeApplicationUpdateLayer._read_manifest_fail_closed(manifest)

            self.assertTrue(swapped)


if __name__ == "__main__":
    unittest.main()

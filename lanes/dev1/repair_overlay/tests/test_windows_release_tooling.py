from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "packaging" / "windows_release.py"
SPEC = importlib.util.spec_from_file_location("dev01_windows_release", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class WindowsReleaseToolingTests(unittest.TestCase):
    def make_fixture(self, root: Path) -> Path:
        platform_root = root / "r06 platform Тест"
        (platform_root / "frontend").mkdir(parents=True)
        (platform_root / "scripture_archive_platform").mkdir()
        (root / "docs" / "campaigns").mkdir(parents=True)
        (platform_root / "run_windows.py").write_text("print('ok')\n", encoding="utf-8")
        (platform_root / "requirements-build.txt").write_text("pywebview\n", encoding="utf-8")
        return platform_root

    def test_diagnostics_are_unicode_and_space_path_safe(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            platform_root = self.make_fixture(Path(temp_dir))
            payload = MODULE.diagnose(platform_root)
            self.assertTrue(payload["path_has_spaces"])
            self.assertTrue(payload["path_has_non_ascii"])
            self.assertEqual(MODULE.evaluate(payload, require_source=True), [])

    def test_missing_source_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            payload = MODULE.diagnose(Path(temp_dir))
            problems = MODULE.evaluate(payload, require_source=True)
            self.assertTrue(problems)
            self.assertIn("Required runtime paths missing", problems[0])

    def test_artifact_hash_and_size_readback(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            artifact = root / "ScriptureArchive-R06-DEV01.exe"
            artifact.write_bytes(b"test-artifact")
            manifest = root / "build_manifest.json"
            manifest.write_text(
                json.dumps(
                    {
                        "artifact_name": artifact.name,
                        "size_bytes": artifact.stat().st_size,
                        "sha256": hashlib.sha256(artifact.read_bytes()).hexdigest(),
                    }
                ),
                encoding="utf-8",
            )
            result = MODULE.verify_artifact(artifact, manifest)
            self.assertTrue(result["ok"])
            self.assertEqual(result["problems"], [])


if __name__ == "__main__":
    unittest.main()

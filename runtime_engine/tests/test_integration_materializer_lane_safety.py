from pathlib import Path
import hashlib
import os
import tempfile
import unittest
from unittest import mock
import zipfile

from scripture_archive_runtime.integration_materializer import (
    MaterializationError,
    PackageSpec,
    materialize_packages,
)


def _spec(lane: str) -> PackageSpec:
    return PackageSpec(
        lane=lane,
        zip_path="not-opened.zip",
        expected_sha256="0" * 64,
        drive_id="drive-id",
        branch_head="head",
        node_members=(),
        evidence_members=(),
        expected_nodes=0,
        expected_evidence=0,
    )


def _empty_package_spec(root: Path, lane: str = "DEV1") -> PackageSpec:
    package = root / f"{lane.lower()}.zip"
    with zipfile.ZipFile(package, "w"):
        pass
    return PackageSpec(
        lane=lane,
        zip_path=str(package),
        expected_sha256=hashlib.sha256(package.read_bytes()).hexdigest(),
        drive_id="drive-id",
        branch_head="head",
        node_members=(),
        evidence_members=(),
        expected_nodes=0,
        expected_evidence=0,
    )


class IntegrationMaterializerLaneSafetyTests(unittest.TestCase):
    def test_traversal_lane_fails_before_output_mutation(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "materialized"
            output.mkdir()
            sentinel = output / "keep.txt"
            sentinel.write_text("preserve", encoding="utf-8")
            escaped = root / "escape"

            with self.assertRaisesRegex(MaterializationError, "single path segment"):
                materialize_packages([_spec("../escape")], output)

            self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve")
            self.assertFalse(escaped.exists())

    def test_windows_reserved_lane_fails_before_output_mutation(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "materialized"
            output.mkdir()
            sentinel = output / "keep.txt"
            sentinel.write_text("preserve", encoding="utf-8")

            with self.assertRaisesRegex(MaterializationError, "unsafe Windows path semantics"):
                materialize_packages([_spec("CON")], output)

            self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve")

    def test_case_insensitive_duplicate_lanes_fail_before_output_mutation(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "materialized"
            output.mkdir()
            sentinel = output / "keep.txt"
            sentinel.write_text("preserve", encoding="utf-8")

            with self.assertRaisesRegex(MaterializationError, "unique case-insensitively"):
                materialize_packages([_spec("DEV1"), _spec("dev1")], output)

            self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve")

    def test_sha_mismatch_fails_before_output_mutation(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "materialized"
            output.mkdir()
            sentinel = output / "keep.txt"
            sentinel.write_text("preserve", encoding="utf-8")
            package = root / "corrupt.zip"
            package.write_bytes(b"not-the-expected-package")

            spec = PackageSpec(
                lane="DEV1",
                zip_path=str(package),
                expected_sha256="0" * 64,
                drive_id="drive-id",
                branch_head="head",
                node_members=(),
                evidence_members=(),
                expected_nodes=0,
                expected_evidence=0,
            )

            with self.assertRaisesRegex(MaterializationError, "SHA256 mismatch"):
                materialize_packages([spec], output)

            self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve")

    def test_publish_failure_restores_previous_complete_output(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "materialized"
            output.mkdir()
            sentinel = output / "keep.txt"
            sentinel.write_text("preserve", encoding="utf-8")
            spec = _empty_package_spec(root)
            real_replace = os.replace

            def fail_replacement(source, destination):
                source_path = Path(source)
                destination_path = Path(destination)
                if (
                    source_path.name == ".materialized.scripture-archive-staging"
                    and destination_path == output
                ):
                    raise OSError("simulated replacement failure")
                return real_replace(source, destination)

            with mock.patch(
                "scripture_archive_runtime.integration_materializer.os.replace",
                side_effect=fail_replacement,
            ):
                with self.assertRaisesRegex(MaterializationError, "previous corpus restored"):
                    materialize_packages([spec], output)

            self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve")
            self.assertFalse((output / "dev1").exists())
            self.assertFalse((root / ".materialized.scripture-archive-staging").exists())
            self.assertFalse((root / ".materialized.scripture-archive-backup").exists())

    def test_successful_publish_replaces_previous_output_without_sidecars(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "materialized"
            output.mkdir()
            (output / "keep.txt").write_text("old", encoding="utf-8")
            spec = _empty_package_spec(root)

            manifest = materialize_packages([spec], output)

            self.assertEqual(manifest["total_nodes"], 0)
            self.assertFalse((output / "keep.txt").exists())
            self.assertTrue((output / "dev1" / "nodes.json").is_file())
            self.assertTrue((output / "INTEGRATION_MANIFEST.json").is_file())
            self.assertFalse((root / ".materialized.scripture-archive-staging").exists())
            self.assertFalse((root / ".materialized.scripture-archive-backup").exists())

    def test_interrupted_backup_is_restored_before_new_preflight(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "materialized"
            backup = root / ".materialized.scripture-archive-backup"
            backup.mkdir()
            sentinel = backup / "keep.txt"
            sentinel.write_text("preserve", encoding="utf-8")
            staging = root / ".materialized.scripture-archive-staging"
            staging.mkdir()
            (staging / "partial.txt").write_text("partial", encoding="utf-8")
            package = root / "corrupt.zip"
            package.write_bytes(b"not-the-expected-package")
            spec = PackageSpec(
                lane="DEV1",
                zip_path=str(package),
                expected_sha256="0" * 64,
                drive_id="drive-id",
                branch_head="head",
                node_members=(),
                evidence_members=(),
                expected_nodes=0,
                expected_evidence=0,
            )

            with self.assertRaisesRegex(MaterializationError, "SHA256 mismatch"):
                materialize_packages([spec], output)

            self.assertEqual((output / "keep.txt").read_text(encoding="utf-8"), "preserve")
            self.assertFalse(backup.exists())
            self.assertFalse(staging.exists())


if __name__ == "__main__":
    unittest.main()

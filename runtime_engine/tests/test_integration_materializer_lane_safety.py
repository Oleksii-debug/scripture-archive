import hashlib
import os
from pathlib import Path
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


def _valid_empty_spec(root: Path, lane: str = "DEV1") -> PackageSpec:
    package = root / f"{lane.lower()}.zip"
    with zipfile.ZipFile(package, "w"):
        pass
    digest = hashlib.sha256(package.read_bytes()).hexdigest()
    return PackageSpec(
        lane=lane,
        zip_path=str(package),
        expected_sha256=digest,
        drive_id="drive-id",
        branch_head="head",
        node_members=(),
        evidence_members=(),
        expected_nodes=0,
        expected_evidence=0,
    )


def _transaction_artifacts(root: Path, output_name: str) -> list[str]:
    prefixes = (f".{output_name}.staging-", f".{output_name}.backup-")
    return sorted(path.name for path in root.iterdir() if path.name.startswith(prefixes))


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

    def test_staging_write_failure_preserves_existing_output(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "materialized"
            output.mkdir()
            sentinel = output / "keep.txt"
            sentinel.write_text("preserve", encoding="utf-8")
            spec = _valid_empty_spec(root)
            real_write_bytes = Path.write_bytes

            def fail_staging_write(path: Path, data: bytes) -> int:
                if any(part.startswith(".materialized.staging-") for part in path.parts):
                    raise OSError("forced staged write failure")
                return real_write_bytes(path, data)

            with mock.patch.object(Path, "write_bytes", new=fail_staging_write):
                with self.assertRaisesRegex(MaterializationError, "failed to stage complete"):
                    materialize_packages([spec], output)

            self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve")
            self.assertEqual(_transaction_artifacts(root, output.name), [])

    def test_publish_failure_restores_existing_output(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "materialized"
            output.mkdir()
            sentinel = output / "keep.txt"
            sentinel.write_text("preserve", encoding="utf-8")
            spec = _valid_empty_spec(root)
            real_replace = os.replace

            def fail_staged_publish(src: str | os.PathLike[str], dst: str | os.PathLike[str]) -> None:
                if Path(src).name.startswith(".materialized.staging-"):
                    raise OSError("forced publish failure")
                real_replace(src, dst)

            with mock.patch(
                "scripture_archive_runtime.integration_materializer.os.replace",
                side_effect=fail_staged_publish,
            ):
                with self.assertRaisesRegex(MaterializationError, "previous output restored"):
                    materialize_packages([spec], output)

            self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve")
            self.assertFalse((output / "INTEGRATION_MANIFEST.json").exists())
            self.assertEqual(_transaction_artifacts(root, output.name), [])


if __name__ == "__main__":
    unittest.main()

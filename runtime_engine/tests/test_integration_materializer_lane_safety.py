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

    def test_publish_parent_sync_failure_restores_existing_output(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "materialized"
            output.mkdir()
            sentinel = output / "keep.txt"
            sentinel.write_text("preserve", encoding="utf-8")
            spec = _valid_empty_spec(root)

            from scripture_archive_runtime import integration_materializer as materializer

            real_sync = materializer._fsync_directory
            parent_sync_calls = 0

            def fail_second_parent_sync(path: Path) -> None:
                nonlocal parent_sync_calls
                if Path(path) == root:
                    parent_sync_calls += 1
                    if parent_sync_calls == 2:
                        raise OSError("forced parent durability-sync failure")
                real_sync(path)

            with mock.patch(
                "scripture_archive_runtime.integration_materializer._fsync_directory",
                side_effect=fail_second_parent_sync,
            ):
                with self.assertRaisesRegex(MaterializationError, "previous output restored"):
                    materialize_packages([spec], output)

            self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve")
            self.assertFalse((output / "INTEGRATION_MANIFEST.json").exists())
            self.assertEqual(_transaction_artifacts(root, output.name), [])

    def test_interrupted_publish_backup_is_restored_before_new_preflight(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "materialized"
            backup = root / f".materialized.backup-{'a' * 32}"
            backup.mkdir()
            (backup / "keep.txt").write_text("preserve", encoding="utf-8")
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

    def test_multiple_recovery_backups_fail_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "materialized"
            backups = [
                root / f".materialized.backup-{'a' * 32}",
                root / f".materialized.backup-{'b' * 32}",
            ]
            for index, backup in enumerate(backups):
                backup.mkdir()
                (backup / "keep.txt").write_text(str(index), encoding="utf-8")

            with self.assertRaisesRegex(MaterializationError, "multiple materializer recovery backups"):
                materialize_packages([_spec("DEV1")], output)

            self.assertFalse(output.exists())
            self.assertTrue(all(backup.is_dir() for backup in backups))

    def test_non_directory_recovery_backup_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "materialized"
            backup = root / f".materialized.backup-{'c' * 32}"
            backup.write_text("not-a-directory", encoding="utf-8")

            with self.assertRaisesRegex(MaterializationError, "unsafe materializer recovery backup"):
                materialize_packages([_spec("DEV1")], output)

            self.assertFalse(output.exists())
            self.assertTrue(backup.is_file())

    def test_successful_publish_replaces_output_and_cleans_backup(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "materialized"
            output.mkdir()
            (output / "keep.txt").write_text("old", encoding="utf-8")
            spec = _valid_empty_spec(root)

            manifest = materialize_packages([spec], output)

            self.assertEqual(manifest["total_nodes"], 0)
            self.assertFalse((output / "keep.txt").exists())
            self.assertTrue((output / "dev1" / "nodes.json").is_file())
            self.assertTrue((output / "INTEGRATION_MANIFEST.json").is_file())
            self.assertEqual(_transaction_artifacts(root, output.name), [])


if __name__ == "__main__":
    unittest.main()

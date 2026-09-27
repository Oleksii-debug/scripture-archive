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


def _bad_sha_spec(root: Path, lane: str = "DEV1") -> PackageSpec:
    package = root / "corrupt.zip"
    package.write_bytes(b"not-the-expected-package")
    return PackageSpec(
        lane=lane,
        zip_path=str(package),
        expected_sha256="0" * 64,
        drive_id="drive-id",
        branch_head="head",
        node_members=(),
        evidence_members=(),
        expected_nodes=0,
        expected_evidence=0,
    )


class IntegrationMaterializerRecoveryAmbiguityTests(unittest.TestCase):
    def test_rollback_failure_restart_preserves_backup_and_fails_closed_before_preflight(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "materialized"
            output.mkdir()
            old_sentinel = output / "keep.txt"
            old_sentinel.write_text("prior-known-good", encoding="utf-8")
            spec = _valid_empty_spec(root)

            from scripture_archive_runtime import integration_materializer as materializer

            real_sync = materializer._fsync_directory
            real_replace = os.replace
            parent_sync_calls = 0

            def fail_second_parent_sync(path: Path) -> None:
                nonlocal parent_sync_calls
                if Path(path) == root:
                    parent_sync_calls += 1
                    if parent_sync_calls == 2:
                        raise OSError("forced parent durability-sync failure")
                real_sync(path)

            def fail_output_to_staging_rollback(
                src: str | os.PathLike[str],
                dst: str | os.PathLike[str],
            ) -> None:
                if Path(src) == output and Path(dst).name.startswith(".materialized.staging-"):
                    raise OSError("forced rollback output-to-staging failure")
                real_replace(src, dst)

            with (
                mock.patch(
                    "scripture_archive_runtime.integration_materializer._fsync_directory",
                    side_effect=fail_second_parent_sync,
                ),
                mock.patch(
                    "scripture_archive_runtime.integration_materializer.os.replace",
                    side_effect=fail_output_to_staging_rollback,
                ),
            ):
                with self.assertRaisesRegex(MaterializationError, "rollback failed"):
                    materialize_packages([spec], output)

            backups = sorted(root.glob(".materialized.backup-*"))
            self.assertEqual(len(backups), 1)
            backup = backups[0]
            self.assertTrue(output.is_dir())
            self.assertTrue((output / "INTEGRATION_MANIFEST.json").is_file())
            self.assertFalse((output / "keep.txt").exists())
            self.assertEqual((backup / "keep.txt").read_text(encoding="utf-8"), "prior-known-good")

            published_manifest = (output / "INTEGRATION_MANIFEST.json").read_bytes()
            bad_spec = _bad_sha_spec(root)

            with self.assertRaisesRegex(MaterializationError, "ambiguous materializer recovery state"):
                materialize_packages([bad_spec], output)

            self.assertEqual((output / "INTEGRATION_MANIFEST.json").read_bytes(), published_manifest)
            self.assertTrue(backup.is_dir())
            self.assertEqual((backup / "keep.txt").read_text(encoding="utf-8"), "prior-known-good")


if __name__ == "__main__":
    unittest.main()

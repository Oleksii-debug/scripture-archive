from __future__ import annotations

import hashlib
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from scripture_archive_runtime.application_update import ApplicationUpdateError
from scripture_archive_runtime.application_update_pending import PendingApplicationUpdate
from scripture_archive_runtime.application_update_updater import (
    _copy_exact,
    consume_apply_handoff,
    rollback_installed_update,
)


def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class AtomicApplicationUpdaterTests(unittest.TestCase):
    def _pending(self, staged: bytes) -> PendingApplicationUpdate:
        return PendingApplicationUpdate(
            product_id="scripture-archive",
            target_platform="windows-x64",
            current_version="1.0.0",
            target_version="1.1.0",
            source_head="a" * 40,
            artifact_name="ScriptureArchive.exe",
            artifact_size=len(staged),
            artifact_sha256=_sha(staged),
        )

    def test_consume_handoff_replaces_exact_bytes_and_keeps_verified_rollback(self):
        old = b"old executable bytes"
        new = b"new signed executable bytes"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "ScriptureArchive.exe"
            staged = root / "staged" / "ScriptureArchive.exe"
            staged.parent.mkdir()
            target.write_bytes(old)
            staged.write_bytes(new)
            pending = self._pending(new)

            with patch(
                "scripture_archive_runtime.application_update_updater.inspect_apply_handoff",
                return_value=pending,
            ), patch(
                "scripture_archive_runtime.application_update_updater.staged_artifact_path",
                return_value=staged,
            ), patch(
                "scripture_archive_runtime.application_update_updater.discard_apply_handoff",
                return_value=True,
            ):
                result = consume_apply_handoff(
                    root,
                    current_version="1.0.0",
                    install_target=target,
                    verify_same_publisher=lambda current, candidate: current == target and candidate == staged,
                )

            self.assertEqual(target.read_bytes(), new)
            self.assertEqual(result.installed_sha256, _sha(new))
            self.assertEqual(result.previous_sha256, _sha(old))
            self.assertEqual(result.target_version, "1.1.0")
            self.assertEqual(result.rollback_path.read_bytes(), old)

    def test_consume_handoff_atomically_replaces_prior_rollback_generation(self):
        old = b"current pre-update executable"
        older = b"older rollback generation"
        new = b"new signed executable bytes"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "ScriptureArchive.exe"
            rollback = root / "ScriptureArchive.exe.scripture-archive.rollback"
            staged = root / "staged" / "ScriptureArchive.exe"
            staged.parent.mkdir()
            target.write_bytes(old)
            rollback.write_bytes(older)
            staged.write_bytes(new)
            pending = self._pending(new)

            with patch(
                "scripture_archive_runtime.application_update_updater.inspect_apply_handoff",
                return_value=pending,
            ), patch(
                "scripture_archive_runtime.application_update_updater.staged_artifact_path",
                return_value=staged,
            ), patch(
                "scripture_archive_runtime.application_update_updater.discard_apply_handoff",
                return_value=True,
            ):
                consume_apply_handoff(
                    root,
                    current_version="1.0.0",
                    install_target=target,
                    verify_same_publisher=lambda _current, _candidate: True,
                )

            self.assertEqual(target.read_bytes(), new)
            self.assertEqual(rollback.read_bytes(), old)

    def test_failed_new_rollback_copy_preserves_prior_generation(self):
        old = b"current pre-update executable"
        older = b"older rollback generation"
        new = b"new signed executable bytes"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "ScriptureArchive.exe"
            rollback = root / "ScriptureArchive.exe.scripture-archive.rollback"
            staged = root / "staged" / "ScriptureArchive.exe"
            staged.parent.mkdir()
            target.write_bytes(old)
            rollback.write_bytes(older)
            staged.write_bytes(new)
            pending = self._pending(new)

            from scripture_archive_runtime import application_update_updater as updater_module
            real_copy = updater_module._copy_exact

            def fail_backup_copy(source: Path, destination: Path) -> None:
                if ".scripture-archive.rollback.build-" in destination.name:
                    raise ApplicationUpdateError("forced rollback copy failure")
                real_copy(source, destination)

            with patch(
                "scripture_archive_runtime.application_update_updater.inspect_apply_handoff",
                return_value=pending,
            ), patch(
                "scripture_archive_runtime.application_update_updater.staged_artifact_path",
                return_value=staged,
            ), patch(
                "scripture_archive_runtime.application_update_updater._copy_exact",
                side_effect=fail_backup_copy,
            ):
                with self.assertRaisesRegex(ApplicationUpdateError, "forced rollback copy failure"):
                    consume_apply_handoff(
                        root,
                        current_version="1.0.0",
                        install_target=target,
                        verify_same_publisher=lambda _current, _candidate: True,
                    )

            self.assertEqual(target.read_bytes(), old)
            self.assertEqual(rollback.read_bytes(), older)

    def test_consume_handoff_fails_closed_when_publisher_check_rejects(self):
        old = b"old"
        new = b"new"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "ScriptureArchive.exe"
            target.write_bytes(old)
            pending = self._pending(new)
            staged_named = root / "staged" / pending.artifact_name
            staged_named.parent.mkdir()
            staged_named.write_bytes(new)

            with patch(
                "scripture_archive_runtime.application_update_updater.inspect_apply_handoff",
                return_value=pending,
            ), patch(
                "scripture_archive_runtime.application_update_updater.staged_artifact_path",
                return_value=staged_named,
            ):
                with self.assertRaisesRegex(ApplicationUpdateError, "same-publisher"):
                    consume_apply_handoff(
                        root,
                        current_version="1.0.0",
                        install_target=target,
                        verify_same_publisher=lambda _current, _candidate: False,
                    )

            self.assertEqual(target.read_bytes(), old)
            self.assertFalse((root / "ScriptureArchive.exe.scripture-archive.rollback").exists())

    def test_consume_handoff_detects_staged_mutation_during_signature_check(self):
        old = b"old"
        new = b"new"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "ScriptureArchive.exe"
            staged = root / "staged" / "ScriptureArchive.exe"
            staged.parent.mkdir()
            target.write_bytes(old)
            staged.write_bytes(new)
            pending = self._pending(new)

            def mutate(_current: Path, candidate: Path) -> bool:
                candidate.write_bytes(b"tampered")
                return True

            with patch(
                "scripture_archive_runtime.application_update_updater.inspect_apply_handoff",
                return_value=pending,
            ), patch(
                "scripture_archive_runtime.application_update_updater.staged_artifact_path",
                return_value=staged,
            ):
                with self.assertRaisesRegex(ApplicationUpdateError, "changed during publisher verification"):
                    consume_apply_handoff(
                        root,
                        current_version="1.0.0",
                        install_target=target,
                        verify_same_publisher=mutate,
                    )

            self.assertEqual(target.read_bytes(), old)

    def test_consume_handoff_rejects_target_mutation_during_signature_check(self):
        old = b"old trusted executable"
        new = b"new signed executable"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "ScriptureArchive.exe"
            staged = root / "staged" / "ScriptureArchive.exe"
            staged.parent.mkdir()
            target.write_bytes(old)
            staged.write_bytes(new)
            pending = self._pending(new)

            def mutate_target(current: Path, _candidate: Path) -> bool:
                current.write_bytes(b"attacker replacement")
                return True

            with patch(
                "scripture_archive_runtime.application_update_updater.inspect_apply_handoff",
                return_value=pending,
            ), patch(
                "scripture_archive_runtime.application_update_updater.staged_artifact_path",
                return_value=staged,
            ):
                with self.assertRaisesRegex(
                    ApplicationUpdateError,
                    "target changed during publisher verification",
                ):
                    consume_apply_handoff(
                        root,
                        current_version="1.0.0",
                        install_target=target,
                        verify_same_publisher=mutate_target,
                    )

            self.assertEqual(target.read_bytes(), b"attacker replacement")
            self.assertFalse(
                (root / "ScriptureArchive.exe.scripture-archive.rollback").exists()
            )

    def test_consume_handoff_rejects_cancelled_authority_after_signature_check(self):
        old = b"old trusted executable"
        new = b"new signed executable"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "ScriptureArchive.exe"
            staged = root / "staged" / "ScriptureArchive.exe"
            staged.parent.mkdir()
            target.write_bytes(old)
            staged.write_bytes(new)
            pending = self._pending(new)
            inspections = [pending, None]

            with patch(
                "scripture_archive_runtime.application_update_updater.inspect_apply_handoff",
                side_effect=inspections,
            ), patch(
                "scripture_archive_runtime.application_update_updater.staged_artifact_path",
                return_value=staged,
            ):
                with self.assertRaisesRegex(
                    ApplicationUpdateError,
                    "apply handoff changed during publisher verification",
                ):
                    consume_apply_handoff(
                        root,
                        current_version="1.0.0",
                        install_target=target,
                        verify_same_publisher=lambda _current, _candidate: True,
                    )

            self.assertEqual(target.read_bytes(), old)
            self.assertFalse(
                (root / "ScriptureArchive.exe.scripture-archive.rollback").exists()
            )

    def test_consume_handoff_rolls_back_when_post_publish_verification_errors(self):
        old = b"old executable bytes"
        new = b"new signed executable bytes"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "ScriptureArchive.exe"
            staged = root / "staged" / "ScriptureArchive.exe"
            staged.parent.mkdir()
            target.write_bytes(old)
            staged.write_bytes(new)
            pending = self._pending(new)

            real_hash = hashlib.sha256
            target_hash_reads = 0

            def fail_post_publish_hash(path: Path) -> str:
                nonlocal target_hash_reads
                if path == target:
                    target_hash_reads += 1
                    if target_hash_reads == 3:
                        raise ApplicationUpdateError("forced post-publish hash failure")
                digest = real_hash()
                digest.update(path.read_bytes())
                return digest.hexdigest()

            with patch(
                "scripture_archive_runtime.application_update_updater.inspect_apply_handoff",
                return_value=pending,
            ), patch(
                "scripture_archive_runtime.application_update_updater.staged_artifact_path",
                return_value=staged,
            ), patch(
                "scripture_archive_runtime.application_update_updater._sha256_file",
                side_effect=fail_post_publish_hash,
            ):
                with self.assertRaisesRegex(
                    ApplicationUpdateError,
                    "failed after publication; rollback restored",
                ):
                    consume_apply_handoff(
                        root,
                        current_version="1.0.0",
                        install_target=target,
                        verify_same_publisher=lambda _current, _candidate: True,
                    )

            self.assertEqual(target.read_bytes(), old)
            self.assertEqual(
                (root / "ScriptureArchive.exe.scripture-archive.rollback").read_bytes(),
                old,
            )

    def test_consume_handoff_rolls_back_when_authority_changes_after_publication(self):
        old = b"old executable bytes"
        new = b"new signed executable bytes"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "ScriptureArchive.exe"
            staged = root / "staged" / "ScriptureArchive.exe"
            staged.parent.mkdir()
            target.write_bytes(old)
            staged.write_bytes(new)
            pending = self._pending(new)
            inspections = [pending, pending, pending, None]

            with patch(
                "scripture_archive_runtime.application_update_updater.inspect_apply_handoff",
                side_effect=inspections,
            ) as inspect, patch(
                "scripture_archive_runtime.application_update_updater.staged_artifact_path",
                return_value=staged,
            ), patch(
                "scripture_archive_runtime.application_update_updater.discard_apply_handoff",
                return_value=True,
            ) as discard:
                with self.assertRaisesRegex(
                    ApplicationUpdateError,
                    "failed after publication; rollback restored",
                ):
                    consume_apply_handoff(
                        root,
                        current_version="1.0.0",
                        install_target=target,
                        verify_same_publisher=lambda _current, _candidate: True,
                    )

            self.assertEqual(inspect.call_count, 4)
            discard.assert_not_called()
            self.assertEqual(target.read_bytes(), old)
            self.assertEqual(
                (root / "ScriptureArchive.exe.scripture-archive.rollback").read_bytes(),
                old,
            )

    def test_consume_handoff_rolls_back_if_disarm_reports_missing_authority(self):
        old = b"old executable bytes"
        new = b"new signed executable bytes"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "ScriptureArchive.exe"
            staged = root / "staged" / "ScriptureArchive.exe"
            staged.parent.mkdir()
            target.write_bytes(old)
            staged.write_bytes(new)
            pending = self._pending(new)

            with patch(
                "scripture_archive_runtime.application_update_updater.inspect_apply_handoff",
                return_value=pending,
            ), patch(
                "scripture_archive_runtime.application_update_updater.staged_artifact_path",
                return_value=staged,
            ), patch(
                "scripture_archive_runtime.application_update_updater.discard_apply_handoff",
                return_value=False,
            ):
                with self.assertRaisesRegex(
                    ApplicationUpdateError,
                    "failed after publication; rollback restored",
                ):
                    consume_apply_handoff(
                        root,
                        current_version="1.0.0",
                        install_target=target,
                        verify_same_publisher=lambda _current, _candidate: True,
                    )

            self.assertEqual(target.read_bytes(), old)

    def test_copy_exact_source_open_failure_never_creates_destination(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "source.exe"
            destination = root / "destination.exe"

            with patch.object(
                Path,
                "open",
                side_effect=OSError("forced source-open failure"),
            ), patch(
                "scripture_archive_runtime.application_update_updater.os.open",
            ) as destination_open:
                with self.assertRaisesRegex(
                    ApplicationUpdateError,
                    "update source could not be opened",
                ):
                    _copy_exact(source, destination)

            destination_open.assert_not_called()
            self.assertFalse(destination.exists())

    def test_copy_exact_fdopen_failure_closes_descriptor_and_removes_destination(self):
        source_bytes = b"source bytes"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "source.exe"
            destination = root / "destination.exe"
            source.write_bytes(source_bytes)

            with patch(
                "scripture_archive_runtime.application_update_updater.os.fdopen",
                side_effect=OSError("forced fdopen failure"),
            ), patch(
                "scripture_archive_runtime.application_update_updater.os.close",
                wraps=os.close,
            ) as close_descriptor:
                with self.assertRaisesRegex(OSError, "forced fdopen failure"):
                    _copy_exact(source, destination)

            close_descriptor.assert_called_once()
            self.assertFalse(destination.exists())

    def test_consume_handoff_disarms_apply_authority_after_success(self):
        old = b"old executable bytes"
        new = b"new signed executable bytes"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "ScriptureArchive.exe"
            staged = root / "staged" / "ScriptureArchive.exe"
            staged.parent.mkdir()
            target.write_bytes(old)
            staged.write_bytes(new)
            pending = self._pending(new)

            with patch(
                "scripture_archive_runtime.application_update_updater.inspect_apply_handoff",
                return_value=pending,
            ), patch(
                "scripture_archive_runtime.application_update_updater.staged_artifact_path",
                return_value=staged,
            ), patch(
                "scripture_archive_runtime.application_update_updater.discard_apply_handoff",
                return_value=True,
            ) as discard:
                consume_apply_handoff(
                    root,
                    current_version="1.0.0",
                    install_target=target,
                    verify_same_publisher=lambda _current, _candidate: True,
                )

            discard.assert_called_once_with(root)
            self.assertEqual(target.read_bytes(), new)

    def test_consume_handoff_rolls_back_if_apply_authority_cannot_be_disarmed(self):
        old = b"old executable bytes"
        new = b"new signed executable bytes"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "ScriptureArchive.exe"
            staged = root / "staged" / "ScriptureArchive.exe"
            staged.parent.mkdir()
            target.write_bytes(old)
            staged.write_bytes(new)
            pending = self._pending(new)

            with patch(
                "scripture_archive_runtime.application_update_updater.inspect_apply_handoff",
                return_value=pending,
            ), patch(
                "scripture_archive_runtime.application_update_updater.staged_artifact_path",
                return_value=staged,
            ), patch(
                "scripture_archive_runtime.application_update_updater.discard_apply_handoff",
                side_effect=ApplicationUpdateError("forced disarm failure"),
            ):
                with self.assertRaisesRegex(
                    ApplicationUpdateError,
                    "failed after publication; rollback restored",
                ):
                    consume_apply_handoff(
                        root,
                        current_version="1.0.0",
                        install_target=target,
                        verify_same_publisher=lambda _current, _candidate: True,
                    )

            self.assertEqual(target.read_bytes(), old)

    def test_explicit_rollback_restores_exact_previous_bytes(self):
        old = b"previous exact executable"
        new = b"installed update"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "ScriptureArchive.exe"
            rollback = root / "ScriptureArchive.exe.scripture-archive.rollback"
            target.write_bytes(new)
            rollback.write_bytes(old)

            restored = rollback_installed_update(target, expected_previous_sha256=_sha(old))

            self.assertEqual(restored, _sha(old))
            self.assertEqual(target.read_bytes(), old)
            self.assertEqual(rollback.read_bytes(), old)

    def test_symlink_install_target_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            real = root / "real.exe"
            real.write_bytes(b"old")
            target = root / "ScriptureArchive.exe"
            try:
                target.symlink_to(real)
            except (OSError, NotImplementedError):
                self.skipTest("symlinks unavailable")
            staged = root / "staged" / "ScriptureArchive.exe"
            staged.parent.mkdir()
            staged.write_bytes(b"new")
            pending = self._pending(b"new")

            with patch(
                "scripture_archive_runtime.application_update_updater.inspect_apply_handoff",
                return_value=pending,
            ), patch(
                "scripture_archive_runtime.application_update_updater.staged_artifact_path",
                return_value=staged,
            ):
                with self.assertRaisesRegex(ApplicationUpdateError, "regular non-symlink"):
                    consume_apply_handoff(
                        root,
                        current_version="1.0.0",
                        install_target=target,
                        verify_same_publisher=lambda _a, _b: True,
                    )

            self.assertEqual(real.read_bytes(), b"old")


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import hashlib
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from scripture_archive_runtime.application_update import ApplicationUpdateError
from scripture_archive_runtime.application_update_pending import PendingApplicationUpdate
from scripture_archive_runtime.application_update_updater import (
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

    def test_consume_handoff_fails_closed_when_publisher_check_rejects(self):
        old = b"old"
        new = b"new"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "ScriptureArchive.exe"
            staged = root / "ScriptureArchive.new.exe"
            target.write_bytes(old)
            staged.write_bytes(new)
            pending = self._pending(new)
            staged_named = root / pending.artifact_name
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
                    if target_hash_reads == 2:
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

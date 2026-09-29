from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from scripture_archive_runtime.application_update import ApplicationUpdateError
from scripture_archive_runtime.application_update_health import (
    HEALTH_RECEIPT_SCHEMA,
    _read_receipt,
    commit_update_health_receipt,
    discard_update_health_receipt,
    inspect_update_health_receipt,
    publish_update_health_receipt,
)


PREVIOUS_VERSION = "1.0.0"
TARGET_VERSION = "1.1.0"


def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _fixture(tmp_path: Path):
    root = tmp_path / "state" / "updates"
    root.mkdir(parents=True)
    target = tmp_path / "install" / "Scripture Archive.exe"
    target.parent.mkdir()
    previous = b"previous-installed-exact-bytes"
    installed = b"updated-installed-exact-bytes"
    target.write_bytes(installed)
    rollback = target.with_name(target.name + ".scripture-archive.rollback")
    rollback.write_bytes(previous)
    return root, target, rollback, previous, installed


def _publish(tmp_path: Path):
    root, target, rollback, previous, installed = _fixture(tmp_path)
    receipt = publish_update_health_receipt(
        root,
        previous_version=PREVIOUS_VERSION,
        target_version=TARGET_VERSION,
        install_target=target,
        previous_sha256=_sha(previous),
        installed_sha256=_sha(installed),
    )
    return root, target, rollback, previous, installed, receipt


class ApplicationUpdateHealthTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.temp.name)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_publish_and_inspect_bind_version_name_and_exact_installed_rollback_bytes(self) -> None:
        root, target, rollback, previous, installed, receipt = _publish(self.tmp_path)

        self.assertEqual(receipt.previous_version, PREVIOUS_VERSION)
        self.assertEqual(receipt.target_version, TARGET_VERSION)
        self.assertEqual(receipt.installed_executable_name, target.name)
        self.assertEqual(receipt.previous_sha256, _sha(previous))
        self.assertEqual(receipt.installed_sha256, _sha(installed))
        self.assertEqual(
            inspect_update_health_receipt(
                root,
                current_version=TARGET_VERSION,
                install_target=target,
            ),
            receipt,
        )

        payload = json.loads((root / "update-health.json").read_text(encoding="utf-8"))
        self.assertEqual(payload["schema"], HEALTH_RECEIPT_SCHEMA)
        self.assertEqual(payload["status"], "awaiting_health_commit")
        serialized = json.dumps(payload)
        self.assertNotIn(str(self.tmp_path), serialized)
        self.assertNotIn("install_target", payload)
        self.assertNotIn("rollback_path", payload)

    def test_publish_is_idempotent_only_for_same_exact_identity(self) -> None:
        root, target, rollback, previous, installed, first = _publish(self.tmp_path)
        before = (root / "update-health.json").read_bytes()
        second = publish_update_health_receipt(
            root,
            previous_version=PREVIOUS_VERSION,
            target_version=TARGET_VERSION,
            install_target=target,
            previous_sha256=_sha(previous),
            installed_sha256=_sha(installed),
        )
        self.assertEqual(second, first)
        self.assertEqual((root / "update-health.json").read_bytes(), before)

        with self.assertRaisesRegex(ApplicationUpdateError, "different identity"):
            publish_update_health_receipt(
                root,
                previous_version=PREVIOUS_VERSION,
                target_version="1.2.0",
                install_target=target,
                previous_sha256=_sha(previous),
                installed_sha256=_sha(installed),
            )

    def test_inspect_fails_closed_on_version_installed_or_rollback_tamper(self) -> None:
        root, target, rollback, previous, installed, receipt = _publish(self.tmp_path)

        with self.assertRaisesRegex(ApplicationUpdateError, "target version is not current"):
            inspect_update_health_receipt(root, current_version="1.2.0", install_target=target)

        target.write_bytes(b"x" * len(installed))
        with self.assertRaisesRegex(ApplicationUpdateError, "installed application bytes changed"):
            inspect_update_health_receipt(root, current_version=TARGET_VERSION, install_target=target)
        target.write_bytes(installed)

        rollback.write_bytes(b"y" * len(previous))
        with self.assertRaisesRegex(ApplicationUpdateError, "rollback bytes changed"):
            inspect_update_health_receipt(root, current_version=TARGET_VERSION, install_target=target)

    def test_receipt_shape_extra_field_and_symlink_fail_closed(self) -> None:
        root, target, rollback, previous, installed, receipt = _publish(self.tmp_path)
        path = root / "update-health.json"
        payload = json.loads(path.read_text(encoding="utf-8"))
        payload["unexpected"] = True
        path.write_text(json.dumps(payload), encoding="utf-8")
        with self.assertRaisesRegex(ApplicationUpdateError, "shape is invalid"):
            inspect_update_health_receipt(root, current_version=TARGET_VERSION, install_target=target)

        path.unlink()
        real = root / "real-health.json"
        real.write_text("{}", encoding="utf-8")
        try:
            path.symlink_to(real)
        except (OSError, NotImplementedError):
            self.skipTest("symlinks unavailable")
        with self.assertRaisesRegex(ApplicationUpdateError, "regular non-symlink"):
            inspect_update_health_receipt(root, current_version=TARGET_VERSION, install_target=target)

    def test_receipt_path_swap_before_open_fails_closed(self) -> None:
        root, target, rollback, previous, installed, receipt = _publish(self.tmp_path)
        path = root / "update-health.json"
        replacement = root / "replacement-health.json"
        parked = root / "parked-health.json"
        replacement.write_bytes(path.read_bytes())
        original_open = Path.open
        swapped = False

        def swapping_open(path_obj: Path, *args, **kwargs):
            nonlocal swapped
            if path_obj == path and not swapped:
                swapped = True
                os.replace(path, parked)
                os.replace(replacement, path)
            return original_open(path_obj, *args, **kwargs)

        with patch.object(Path, "open", new=swapping_open):
            with self.assertRaisesRegex(ApplicationUpdateError, "changed before readback"):
                inspect_update_health_receipt(
                    root,
                    current_version=TARGET_VERSION,
                    install_target=target,
                )

        self.assertTrue(swapped)
        self.assertTrue(parked.exists())
        self.assertTrue(path.exists())

    def test_oversized_receipt_is_rejected_before_open(self) -> None:
        root = self.tmp_path / "state" / "updates"
        root.mkdir(parents=True)
        path = root / "update-health.json"
        path.write_bytes(b"x" * 4097)

        with patch.object(Path, "open", side_effect=AssertionError("receipt must not be opened")) as opened:
            with self.assertRaisesRegex(ApplicationUpdateError, "unexpectedly large"):
                _read_receipt(path)
        opened.assert_not_called()

    def test_commit_disarms_old_pending_then_receipt_and_rollback_after_exact_proof(self) -> None:
        root, target, rollback, previous, installed, receipt = _publish(self.tmp_path)
        pending = root / "pending-update.json"
        pending.write_text("old-version journal need not be parsed", encoding="utf-8")

        committed = commit_update_health_receipt(
            root,
            current_version=TARGET_VERSION,
            install_target=target,
        )
        self.assertEqual(committed, receipt)
        self.assertFalse(pending.exists())
        self.assertFalse((root / "update-health.json").exists())
        self.assertFalse(rollback.exists())
        self.assertEqual(target.read_bytes(), installed)

    def test_failed_health_proof_preserves_receipt_pending_and_rollback(self) -> None:
        root, target, rollback, previous, installed, receipt = _publish(self.tmp_path)
        pending = root / "pending-update.json"
        pending.write_text("old-version journal", encoding="utf-8")
        target.write_bytes(b"tampered")

        with self.assertRaises(ApplicationUpdateError):
            commit_update_health_receipt(root, current_version=TARGET_VERSION, install_target=target)
        self.assertTrue(pending.exists())
        self.assertTrue((root / "update-health.json").exists())
        self.assertTrue(rollback.exists())

    def test_discard_only_disarms_receipt_and_preserves_recovery_bytes(self) -> None:
        root, target, rollback, previous, installed, receipt = _publish(self.tmp_path)
        self.assertIs(discard_update_health_receipt(root), True)
        self.assertIs(discard_update_health_receipt(root), False)
        self.assertEqual(rollback.read_bytes(), previous)
        self.assertEqual(target.read_bytes(), installed)


if __name__ == "__main__":
    unittest.main()

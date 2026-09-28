from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from scripture_archive_runtime.application_update import ApplicationUpdateError
from scripture_archive_runtime.application_update_health import (
    HEALTH_RECEIPT_SCHEMA,
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


def test_publish_and_inspect_bind_version_name_and_exact_installed_rollback_bytes(tmp_path: Path) -> None:
    root, target, rollback, previous, installed, receipt = _publish(tmp_path)

    assert receipt.previous_version == PREVIOUS_VERSION
    assert receipt.target_version == TARGET_VERSION
    assert receipt.installed_executable_name == target.name
    assert receipt.previous_sha256 == _sha(previous)
    assert receipt.installed_sha256 == _sha(installed)
    assert inspect_update_health_receipt(
        root,
        current_version=TARGET_VERSION,
        install_target=target,
    ) == receipt

    payload = json.loads((root / "update-health.json").read_text(encoding="utf-8"))
    assert payload["schema"] == HEALTH_RECEIPT_SCHEMA
    assert payload["status"] == "awaiting_health_commit"
    serialized = json.dumps(payload)
    assert str(tmp_path) not in serialized
    assert "install_target" not in payload
    assert "rollback_path" not in payload


def test_publish_is_idempotent_only_for_same_exact_identity(tmp_path: Path) -> None:
    root, target, rollback, previous, installed, first = _publish(tmp_path)
    before = (root / "update-health.json").read_bytes()
    second = publish_update_health_receipt(
        root,
        previous_version=PREVIOUS_VERSION,
        target_version=TARGET_VERSION,
        install_target=target,
        previous_sha256=_sha(previous),
        installed_sha256=_sha(installed),
    )
    assert second == first
    assert (root / "update-health.json").read_bytes() == before

    with pytest.raises(ApplicationUpdateError, match="different identity"):
        publish_update_health_receipt(
            root,
            previous_version=PREVIOUS_VERSION,
            target_version="1.2.0",
            install_target=target,
            previous_sha256=_sha(previous),
            installed_sha256=_sha(installed),
        )


def test_inspect_fails_closed_on_version_installed_or_rollback_tamper(tmp_path: Path) -> None:
    root, target, rollback, previous, installed, receipt = _publish(tmp_path)

    with pytest.raises(ApplicationUpdateError, match="target version is not current"):
        inspect_update_health_receipt(root, current_version="1.2.0", install_target=target)

    target.write_bytes(b"x" * len(installed))
    with pytest.raises(ApplicationUpdateError, match="installed application bytes changed"):
        inspect_update_health_receipt(root, current_version=TARGET_VERSION, install_target=target)
    target.write_bytes(installed)

    rollback.write_bytes(b"y" * len(previous))
    with pytest.raises(ApplicationUpdateError, match="rollback bytes changed"):
        inspect_update_health_receipt(root, current_version=TARGET_VERSION, install_target=target)


def test_receipt_shape_extra_field_and_symlink_fail_closed(tmp_path: Path) -> None:
    root, target, rollback, previous, installed, receipt = _publish(tmp_path)
    path = root / "update-health.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    payload["unexpected"] = True
    path.write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(ApplicationUpdateError, match="shape is invalid"):
        inspect_update_health_receipt(root, current_version=TARGET_VERSION, install_target=target)

    path.unlink()
    real = root / "real-health.json"
    real.write_text("{}", encoding="utf-8")
    try:
        path.symlink_to(real)
    except (OSError, NotImplementedError):
        pytest.skip("symlinks unavailable")
    with pytest.raises(ApplicationUpdateError, match="regular non-symlink"):
        inspect_update_health_receipt(root, current_version=TARGET_VERSION, install_target=target)


def test_commit_disarms_old_pending_then_receipt_and_rollback_after_exact_proof(tmp_path: Path) -> None:
    root, target, rollback, previous, installed, receipt = _publish(tmp_path)
    pending = root / "pending-update.json"
    pending.write_text("old-version journal need not be parsed", encoding="utf-8")

    committed = commit_update_health_receipt(
        root,
        current_version=TARGET_VERSION,
        install_target=target,
    )
    assert committed == receipt
    assert not pending.exists()
    assert not (root / "update-health.json").exists()
    assert not rollback.exists()
    assert target.read_bytes() == installed


def test_failed_health_proof_preserves_receipt_pending_and_rollback(tmp_path: Path) -> None:
    root, target, rollback, previous, installed, receipt = _publish(tmp_path)
    pending = root / "pending-update.json"
    pending.write_text("old-version journal", encoding="utf-8")
    target.write_bytes(b"tampered")

    with pytest.raises(ApplicationUpdateError):
        commit_update_health_receipt(root, current_version=TARGET_VERSION, install_target=target)
    assert pending.exists()
    assert (root / "update-health.json").exists()
    assert rollback.exists()


def test_discard_only_disarms_receipt_and_preserves_recovery_bytes(tmp_path: Path) -> None:
    root, target, rollback, previous, installed, receipt = _publish(tmp_path)
    assert discard_update_health_receipt(root) is True
    assert discard_update_health_receipt(root) is False
    assert rollback.read_bytes() == previous
    assert target.read_bytes() == installed

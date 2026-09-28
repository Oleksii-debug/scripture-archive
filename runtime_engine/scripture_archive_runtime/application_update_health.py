"""Durable post-update health receipt for rollback-preserving application updates.

The standalone updater publishes this fixed-path receipt only after exact-byte atomic
publication and before relaunch.  The new packaged application can later prove that
its own executable/version and the preserved rollback bytes still match the receipt
before disarming stale pending authority and rollback recovery state.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path
import stat
from typing import Any

from .application_update import ApplicationUpdateError, SemVer
from .application_update_pending import discard_pending_update


HEALTH_RECEIPT_SCHEMA = "scripture.application-update-health.v1"
_HEALTH_RECEIPT_NAME = "update-health.json"
_ROLLBACK_SUFFIX = ".scripture-archive.rollback"
_COPY_CHUNK = 1024 * 1024
_RECEIPT_KEYS = frozenset(
    {
        "schema",
        "status",
        "previous_version",
        "target_version",
        "installed_executable_name",
        "previous_sha256",
        "installed_sha256",
    }
)


@dataclass(frozen=True)
class UpdateHealthReceipt:
    previous_version: str
    target_version: str
    installed_executable_name: str
    previous_sha256: str
    installed_sha256: str


def publish_update_health_receipt(
    staging_root: str | os.PathLike[str],
    *,
    previous_version: str,
    target_version: str,
    install_target: str | os.PathLike[str],
    previous_sha256: str,
    installed_sha256: str,
) -> UpdateHealthReceipt:
    """Publish one fixed receipt after verifying installed and rollback exact bytes."""

    SemVer.parse(previous_version)
    SemVer.parse(target_version)
    _require_sha256(previous_sha256)
    _require_sha256(installed_sha256)
    target = Path(install_target)
    root = Path(staging_root)
    _require_real_directory(root, "update staging root")
    _require_regular_file(target, "installed application target")
    rollback = target.with_name(target.name + _ROLLBACK_SUFFIX)
    _require_regular_file(rollback, "rollback artifact")
    if _sha256_file(target) != installed_sha256:
        raise ApplicationUpdateError("installed bytes do not match health receipt identity")
    if _sha256_file(rollback) != previous_sha256:
        raise ApplicationUpdateError("rollback bytes do not match health receipt identity")

    receipt = UpdateHealthReceipt(
        previous_version=previous_version,
        target_version=target_version,
        installed_executable_name=target.name,
        previous_sha256=previous_sha256,
        installed_sha256=installed_sha256,
    )
    payload = _encode_receipt(receipt)
    path = root / _HEALTH_RECEIPT_NAME
    existing = _read_receipt_if_present(path)
    if existing is not None:
        if existing != receipt:
            raise ApplicationUpdateError("existing update health receipt has different identity")
        return receipt
    _atomic_write(path, payload)
    if _read_receipt(path) != receipt:
        raise ApplicationUpdateError("published update health receipt failed readback")
    return receipt


def inspect_update_health_receipt(
    staging_root: str | os.PathLike[str],
    *,
    current_version: str,
    install_target: str | os.PathLike[str],
) -> UpdateHealthReceipt | None:
    """Re-verify a receipt against the currently running version and exact files."""

    SemVer.parse(current_version)
    root = Path(staging_root)
    _require_real_directory(root, "update staging root")
    path = root / _HEALTH_RECEIPT_NAME
    receipt = _read_receipt_if_present(path)
    if receipt is None:
        return None
    target = Path(install_target)
    if receipt.target_version != current_version:
        raise ApplicationUpdateError("update health receipt target version is not current")
    if receipt.installed_executable_name != target.name:
        raise ApplicationUpdateError("update health receipt executable identity changed")
    _require_regular_file(target, "installed application target")
    rollback = target.with_name(target.name + _ROLLBACK_SUFFIX)
    _require_regular_file(rollback, "rollback artifact")
    if _sha256_file(target) != receipt.installed_sha256:
        raise ApplicationUpdateError("installed application bytes changed before health commit")
    if _sha256_file(rollback) != receipt.previous_sha256:
        raise ApplicationUpdateError("rollback bytes changed before health commit")
    return receipt


def commit_update_health_receipt(
    staging_root: str | os.PathLike[str],
    *,
    current_version: str,
    install_target: str | os.PathLike[str],
) -> UpdateHealthReceipt | None:
    """Commit a proven healthy relaunch and disarm stale update recovery authority.

    The fixed pending journal is removed first without parsing its old-version identity.
    The health receipt is then removed before the rollback artifact, so a crash during
    cleanup can leave at most inert rollback bytes rather than live rollback authority.
    """

    receipt = inspect_update_health_receipt(
        staging_root,
        current_version=current_version,
        install_target=install_target,
    )
    if receipt is None:
        return None
    root = Path(staging_root)
    target = Path(install_target)
    discard_pending_update(root)
    _discard_regular_file(root / _HEALTH_RECEIPT_NAME, "update health receipt")
    _discard_regular_file(
        target.with_name(target.name + _ROLLBACK_SUFFIX),
        "rollback artifact",
    )
    return receipt


def discard_update_health_receipt(staging_root: str | os.PathLike[str]) -> bool:
    """Disarm only the fixed health receipt, leaving recovery bytes untouched."""

    root = Path(staging_root)
    _require_real_directory(root, "update staging root")
    path = root / _HEALTH_RECEIPT_NAME
    try:
        metadata = path.lstat()
    except FileNotFoundError:
        return False
    except OSError as exc:
        raise ApplicationUpdateError("update health receipt is unavailable") from exc
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISREG(metadata.st_mode):
        raise ApplicationUpdateError("update health receipt must be a regular non-symlink file")
    try:
        path.unlink()
    except OSError as exc:
        raise ApplicationUpdateError("update health receipt could not be removed") from exc
    return True


def _encode_receipt(receipt: UpdateHealthReceipt) -> bytes:
    payload = {
        "schema": HEALTH_RECEIPT_SCHEMA,
        "status": "awaiting_health_commit",
        "previous_version": receipt.previous_version,
        "target_version": receipt.target_version,
        "installed_executable_name": receipt.installed_executable_name,
        "previous_sha256": receipt.previous_sha256,
        "installed_sha256": receipt.installed_sha256,
    }
    return (json.dumps(payload, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def _read_receipt_if_present(path: Path) -> UpdateHealthReceipt | None:
    try:
        path.lstat()
    except FileNotFoundError:
        return None
    except OSError as exc:
        raise ApplicationUpdateError("update health receipt is unavailable") from exc
    return _read_receipt(path)


def _read_receipt(path: Path) -> UpdateHealthReceipt:
    _require_regular_file(path, "update health receipt")
    try:
        raw = path.read_bytes()
    except OSError as exc:
        raise ApplicationUpdateError("update health receipt could not be read") from exc
    if len(raw) > 4096:
        raise ApplicationUpdateError("update health receipt is unexpectedly large")
    try:
        payload: Any = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ApplicationUpdateError("update health receipt is invalid JSON") from exc
    if not isinstance(payload, dict) or frozenset(payload) != _RECEIPT_KEYS:
        raise ApplicationUpdateError("update health receipt shape is invalid")
    if payload.get("schema") != HEALTH_RECEIPT_SCHEMA or payload.get("status") != "awaiting_health_commit":
        raise ApplicationUpdateError("update health receipt schema/status is invalid")
    fields = (
        payload.get("previous_version"),
        payload.get("target_version"),
        payload.get("installed_executable_name"),
        payload.get("previous_sha256"),
        payload.get("installed_sha256"),
    )
    if not all(isinstance(value, str) for value in fields):
        raise ApplicationUpdateError("update health receipt fields must be strings")
    previous_version, target_version, executable_name, previous_sha, installed_sha = fields
    SemVer.parse(previous_version)
    SemVer.parse(target_version)
    if not executable_name or Path(executable_name).name != executable_name:
        raise ApplicationUpdateError("update health receipt executable name is invalid")
    _require_sha256(previous_sha)
    _require_sha256(installed_sha)
    return UpdateHealthReceipt(
        previous_version=previous_version,
        target_version=target_version,
        installed_executable_name=executable_name,
        previous_sha256=previous_sha,
        installed_sha256=installed_sha,
    )


def _atomic_write(path: Path, content: bytes) -> None:
    temp = path.with_name(f".{path.name}.write-{os.getpid()}.tmp")
    try:
        metadata = temp.lstat()
    except FileNotFoundError:
        pass
    except OSError as exc:
        raise ApplicationUpdateError("health receipt temporary path is unavailable") from exc
    else:
        if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISREG(metadata.st_mode):
            raise ApplicationUpdateError("health receipt temporary path is unsafe")
        try:
            temp.unlink()
        except OSError as exc:
            raise ApplicationUpdateError("health receipt temporary path could not be cleared") from exc
    try:
        descriptor = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except OSError as exc:
        raise ApplicationUpdateError("health receipt temporary file could not be created") from exc
    try:
        with os.fdopen(descriptor, "wb", closefd=True) as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp, path)
        _fsync_directory(path.parent)
    except Exception:
        try:
            temp.unlink()
        except OSError:
            pass
        raise


def _discard_regular_file(path: Path, label: str) -> None:
    _require_regular_file(path, label)
    try:
        path.unlink()
    except OSError as exc:
        raise ApplicationUpdateError(f"{label} could not be removed") from exc


def _require_sha256(value: str) -> None:
    if len(value) != 64 or any(ch not in "0123456789abcdef" for ch in value):
        raise ApplicationUpdateError("update health SHA-256 identity is invalid")


def _require_regular_file(path: Path, label: str) -> None:
    try:
        metadata = path.lstat()
    except OSError as exc:
        raise ApplicationUpdateError(f"{label} is unavailable") from exc
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISREG(metadata.st_mode):
        raise ApplicationUpdateError(f"{label} must be a regular non-symlink file")


def _require_real_directory(path: Path, label: str) -> None:
    try:
        metadata = path.lstat()
    except OSError as exc:
        raise ApplicationUpdateError(f"{label} is unavailable") from exc
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISDIR(metadata.st_mode):
        raise ApplicationUpdateError(f"{label} must be a real directory")


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    try:
        with path.open("rb") as handle:
            while True:
                chunk = handle.read(_COPY_CHUNK)
                if not chunk:
                    break
                digest.update(chunk)
    except OSError as exc:
        raise ApplicationUpdateError("update health artifact could not be hashed") from exc
    return digest.hexdigest()


def _fsync_directory(path: Path) -> None:
    flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)
    try:
        descriptor = os.open(path, flags)
    except OSError:
        return
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)

"""Standalone atomic consumer for a verified application-update apply handoff.

This module is intentionally not exposed through browser transport. A trusted host/updater
process supplies the fixed staging root and exact installed executable path. The consumer
re-opens the durable apply handoff, re-verifies the staged bytes and publisher, preserves a
same-directory rollback copy, atomically replaces the target, and rolls back automatically
when installed-byte verification fails.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import os
from pathlib import Path
import shutil
import stat
from typing import Callable

from .application_update import ApplicationUpdateError
from .application_update_apply import inspect_apply_handoff
from .application_update_pending import PendingApplicationUpdate, staged_artifact_path


_ROLLBACK_SUFFIX = ".scripture-archive.rollback"
_COPY_CHUNK = 1024 * 1024


@dataclass(frozen=True)
class UpdateApplyResult:
    previous_sha256: str
    installed_sha256: str
    rollback_path: Path
    target_path: Path
    target_version: str


def consume_apply_handoff(
    staging_root: str | os.PathLike[str],
    *,
    current_version: str,
    install_target: str | os.PathLike[str],
    verify_same_publisher: Callable[[Path, Path], bool],
) -> UpdateApplyResult:
    """Atomically replace one installed executable from the fixed verified handoff.

    The caller must be a trusted standalone updater/host boundary. ``install_target`` is
    never accepted from browser transport. The existing target and staged candidate must
    both be regular non-symlink files. Publisher verification is repeated immediately
    before replacement and exact SHA-256 is checked both before and after publication.
    """

    if not callable(verify_same_publisher):
        raise ApplicationUpdateError("same-publisher verifier is required")

    root = Path(staging_root)
    target = Path(install_target)
    pending = inspect_apply_handoff(root, current_version=current_version)
    if pending is None:
        raise ApplicationUpdateError("no verified apply handoff is available")

    staged = staged_artifact_path(root, pending)
    _require_regular_file(staged, "staged update artifact")
    _require_regular_file(target, "installed application target")
    _require_safe_parent(target.parent)

    if staged.name != pending.artifact_name:
        raise ApplicationUpdateError("staged artifact name does not match apply handoff")
    if _sha256_file(staged) != pending.artifact_sha256:
        raise ApplicationUpdateError("staged artifact bytes changed before apply")
    if not verify_same_publisher(target, staged):
        raise ApplicationUpdateError("staged artifact failed same-publisher verification")
    if _sha256_file(staged) != pending.artifact_sha256:
        raise ApplicationUpdateError("staged artifact bytes changed during publisher verification")

    rollback = target.with_name(target.name + _ROLLBACK_SUFFIX)
    _prepare_rollback_slot(rollback)
    previous_sha = _sha256_file(target)
    _copy_exact(target, rollback)
    if _sha256_file(rollback) != previous_sha:
        _discard_file(rollback)
        raise ApplicationUpdateError("rollback copy failed exact-byte verification")

    candidate = target.with_name(f".{target.name}.update-{os.getpid()}.tmp")
    _prepare_temp_slot(candidate)
    published = False
    try:
        _copy_exact(staged, candidate)
        if _sha256_file(candidate) != pending.artifact_sha256:
            raise ApplicationUpdateError("temporary install candidate failed exact-byte verification")
        os.replace(candidate, target)
        published = True
        _fsync_directory(target.parent)
        _require_regular_file(target, "installed application target")
        installed_sha = _sha256_file(target)
        if installed_sha != pending.artifact_sha256:
            raise ApplicationUpdateError("installed artifact failed exact-byte verification")
    except Exception as apply_error:
        try:
            candidate.unlink()
        except OSError:
            pass
        if published or (not target.exists() and rollback.exists()):
            try:
                _rollback_replace(target, rollback, previous_sha)
            except Exception as rollback_error:
                raise ApplicationUpdateError(
                    "update apply failed and automatic rollback also failed"
                ) from rollback_error
            if published:
                raise ApplicationUpdateError(
                    "update apply failed after publication; rollback restored"
                ) from apply_error
        raise

    return UpdateApplyResult(
        previous_sha256=previous_sha,
        installed_sha256=pending.artifact_sha256,
        rollback_path=rollback,
        target_path=target,
        target_version=pending.target_version,
    )


def rollback_installed_update(
    install_target: str | os.PathLike[str],
    *,
    expected_previous_sha256: str,
) -> str:
    """Restore the fixed same-directory rollback copy and verify exact prior bytes."""

    target = Path(install_target)
    _require_safe_sha256(expected_previous_sha256)
    _require_safe_parent(target.parent)
    rollback = target.with_name(target.name + _ROLLBACK_SUFFIX)
    _require_regular_file(rollback, "rollback artifact")
    _rollback_replace(target, rollback, expected_previous_sha256)
    return expected_previous_sha256


def _rollback_replace(target: Path, rollback: Path, expected_sha: str) -> None:
    _require_regular_file(rollback, "rollback artifact")
    if _sha256_file(rollback) != expected_sha:
        raise ApplicationUpdateError("rollback artifact does not match expected prior bytes")
    restore = target.with_name(f".{target.name}.rollback-{os.getpid()}.tmp")
    _prepare_temp_slot(restore)
    try:
        _copy_exact(rollback, restore)
        if _sha256_file(restore) != expected_sha:
            raise ApplicationUpdateError("rollback temporary copy failed exact-byte verification")
        os.replace(restore, target)
        _fsync_directory(target.parent)
    finally:
        try:
            restore.unlink()
        except OSError:
            pass
    _require_regular_file(target, "restored application target")
    if _sha256_file(target) != expected_sha:
        raise ApplicationUpdateError("rollback restoration failed exact-byte verification")


def _prepare_rollback_slot(path: Path) -> None:
    try:
        metadata = path.lstat()
    except FileNotFoundError:
        return
    except OSError as exc:
        raise ApplicationUpdateError("rollback path is unavailable") from exc
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISREG(metadata.st_mode):
        raise ApplicationUpdateError("rollback path must not redirect update writes")
    _discard_file(path)


def _prepare_temp_slot(path: Path) -> None:
    try:
        metadata = path.lstat()
    except FileNotFoundError:
        return
    except OSError as exc:
        raise ApplicationUpdateError("temporary update path is unavailable") from exc
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISREG(metadata.st_mode):
        raise ApplicationUpdateError("temporary update path must not redirect update writes")
    _discard_file(path)


def _discard_file(path: Path) -> None:
    try:
        path.unlink()
    except FileNotFoundError:
        return
    except OSError as exc:
        raise ApplicationUpdateError("update artifact could not be removed safely") from exc


def _copy_exact(source: Path, destination: Path) -> None:
    try:
        descriptor = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o700)
    except OSError as exc:
        raise ApplicationUpdateError("could not create update copy safely") from exc
    try:
        with source.open("rb") as src, os.fdopen(descriptor, "wb", closefd=True) as dst:
            shutil.copyfileobj(src, dst, length=_COPY_CHUNK)
            dst.flush()
            os.fsync(dst.fileno())
    except Exception:
        try:
            destination.unlink()
        except OSError:
            pass
        raise


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
        raise ApplicationUpdateError("update artifact could not be hashed") from exc
    return digest.hexdigest()


def _require_regular_file(path: Path, label: str) -> None:
    try:
        metadata = path.lstat()
    except OSError as exc:
        raise ApplicationUpdateError(f"{label} is unavailable") from exc
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISREG(metadata.st_mode):
        raise ApplicationUpdateError(f"{label} must be a regular non-symlink file")


def _require_safe_parent(path: Path) -> None:
    try:
        metadata = path.lstat()
    except OSError as exc:
        raise ApplicationUpdateError("install directory is unavailable") from exc
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISDIR(metadata.st_mode):
        raise ApplicationUpdateError("install directory must be a real directory")


def _require_safe_sha256(value: str) -> None:
    if len(value) != 64 or any(ch not in "0123456789abcdef" for ch in value):
        raise ApplicationUpdateError("expected rollback SHA-256 is invalid")


def _fsync_directory(path: Path) -> None:
    flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)
    try:
        descriptor = os.open(path, flags)
    except OSError:
        return
    try:
        os.fsync(descriptor)
    except OSError:
        pass
    finally:
        os.close(descriptor)

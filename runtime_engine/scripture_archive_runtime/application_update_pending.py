"""Fail-closed readback and disarm semantics for a staged application update.

This module deliberately does not install, execute, replace, restart, or roll back
application code.  It gives the packaged host a durable way to re-open the fixed
pending-update journal after restart, bind it back to exact staged bytes, and remove
only the journal authority when the user cancels a pending update.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
import os
from pathlib import Path
import stat
import threading
from typing import Any

from .application_update import (
    ApplicationUpdateError,
    ApplicationUpdateManifest,
    verify_local_update,
)
from .application_update_staging import STAGING_JOURNAL_SCHEMA


_JOURNAL_NAME = "pending-update.json"
_PENDING_DIRECTORY = "pending"
_MAX_JOURNAL_BYTES = 16 * 1024
_REQUIRED_KEYS = frozenset(
    {
        "schema",
        "status",
        "product_id",
        "target_platform",
        "current_version",
        "target_version",
        "source_head",
        "artifact_name",
        "artifact_size",
        "artifact_sha256",
        "authenticity",
    }
)
_STATE_LOCKS_GUARD = threading.Lock()
_STATE_LOCKS: dict[str, threading.RLock] = {}


@dataclass(frozen=True)
class PendingApplicationUpdate:
    product_id: str
    target_platform: str
    current_version: str
    target_version: str
    source_head: str
    artifact_name: str
    artifact_size: int
    artifact_sha256: str
    authenticity: str = "same_publisher_authenticode_verified"
    status: str = "staged"


def inspect_pending_update(
    staging_root: str | os.PathLike[str],
    *,
    current_version: str,
) -> PendingApplicationUpdate | None:
    """Re-open a fixed pending journal and re-verify its exact staged bytes.

    ``None`` means there is no pending journal. Any present but malformed, stale,
    redirected, or byte-mismatched state raises ``ApplicationUpdateError`` rather
    than being presented as an installable update.
    """

    root = Path(staging_root)
    lock = _state_lock_for_root(root)
    with lock:
        if not root.exists():
            return None
        _require_real_directory(root, "update state root")
        journal = root / _JOURNAL_NAME
        payload = _read_fixed_journal(journal)
        if payload is None:
            return None
        row = _parse_journal(payload)
        if row["current_version"] != current_version:
            raise ApplicationUpdateError(
                "pending update was staged by a different current application version"
            )

        manifest = ApplicationUpdateManifest.from_mapping(
            {
                "schema": "scripture.application-update.v1",
                "product_id": row["product_id"],
                "target_platform": row["target_platform"],
                "target_version": row["target_version"],
                "source_head": row["source_head"],
                "artifact_name": row["artifact_name"],
                "artifact_size": row["artifact_size"],
                "artifact_sha256": row["artifact_sha256"],
            }
        )
        pending_root = root / _PENDING_DIRECTORY
        digest_root = pending_root / manifest.artifact_sha256
        _require_real_directory(pending_root, "pending update directory")
        _require_real_directory(digest_root, "pending digest directory")
        artifact = digest_root / manifest.artifact_name
        verified = verify_local_update(
            manifest,
            artifact,
            current_version=current_version,
        )
        return PendingApplicationUpdate(
            product_id=verified.product_id,
            target_platform=verified.target_platform,
            current_version=verified.current_version,
            target_version=verified.target_version,
            source_head=verified.source_head,
            artifact_name=verified.artifact_name,
            artifact_size=verified.artifact_size,
            artifact_sha256=verified.artifact_sha256,
        )


def staged_artifact_path(
    staging_root: str | os.PathLike[str],
    pending: PendingApplicationUpdate,
) -> Path:
    """Reconstruct the host-private staged path from already-validated identity.

    Callers must never serialize this path into browser-visible transport data.
    ``inspect_pending_update`` should be called again after any signature operation
    to bind that result back to exact bytes.
    """

    if not isinstance(pending, PendingApplicationUpdate):
        raise ApplicationUpdateError("pending update identity is invalid")
    root = Path(staging_root)
    _require_real_directory(root, "update state root")
    pending_root = root / _PENDING_DIRECTORY
    digest_root = pending_root / pending.artifact_sha256
    _require_real_directory(pending_root, "pending update directory")
    _require_real_directory(digest_root, "pending digest directory")
    return digest_root / pending.artifact_name


def discard_pending_update(staging_root: str | os.PathLike[str]) -> bool:
    """Disarm pending authority without deleting staged executable bytes.

    Cancellation intentionally removes only the fixed journal. Staged bytes become
    inert and may be overwritten by a later staging operation. This avoids turning
    recovery into a recursive deletion primitive when journal contents are corrupt.
    The fixed journal path may itself be a symlink; unlinking that symlink is safe and
    does not touch its target.
    """

    root = Path(staging_root)
    lock = _state_lock_for_root(root)
    with lock:
        if not root.exists():
            return False
        _require_real_directory(root, "update state root")
        journal = root / _JOURNAL_NAME
        try:
            metadata = journal.lstat()
        except FileNotFoundError:
            return False
        except OSError as exc:
            raise ApplicationUpdateError("pending update journal is unavailable") from exc
        if not (stat.S_ISREG(metadata.st_mode) or stat.S_ISLNK(metadata.st_mode)):
            raise ApplicationUpdateError("pending update journal path is unsafe")
        try:
            journal.unlink()
            _fsync_directory(root)
        except OSError as exc:
            raise ApplicationUpdateError("pending update could not be cancelled safely") from exc
        return True


def _parse_journal(payload: bytes) -> dict[str, Any]:
    try:
        raw = json.loads(payload.decode("utf-8"), object_pairs_hook=_strict_json_object)
    except ApplicationUpdateError:
        raise
    except (UnicodeDecodeError, TypeError, ValueError) as exc:
        raise ApplicationUpdateError("pending update journal is not valid UTF-8 JSON") from exc
    if not isinstance(raw, dict):
        raise ApplicationUpdateError("pending update journal must be an object")
    keys = frozenset(raw.keys())
    if keys != _REQUIRED_KEYS:
        raise ApplicationUpdateError("pending update journal keys do not match the staging schema")
    if raw["schema"] != STAGING_JOURNAL_SCHEMA:
        raise ApplicationUpdateError("unsupported pending update journal schema")
    if raw["status"] != "staged":
        raise ApplicationUpdateError("pending update journal is not in staged state")
    if raw["authenticity"] != "same_publisher_authenticode_verified":
        raise ApplicationUpdateError("pending update journal lacks same-publisher authenticity")
    current_version = raw["current_version"]
    if not isinstance(current_version, str) or not current_version or len(current_version) > 128:
        raise ApplicationUpdateError("pending update current_version is invalid")
    return raw


def _read_fixed_journal(path: Path) -> bytes | None:
    try:
        before = path.lstat()
    except FileNotFoundError:
        return None
    except OSError as exc:
        raise ApplicationUpdateError("pending update journal is unavailable") from exc
    if stat.S_ISLNK(before.st_mode) or not stat.S_ISREG(before.st_mode):
        raise ApplicationUpdateError("pending update journal must be a regular non-symlink file")
    if before.st_size <= 0 or before.st_size > _MAX_JOURNAL_BYTES:
        raise ApplicationUpdateError("pending update journal is empty or exceeds the size limit")
    before_identity = (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns)
    try:
        with path.open("rb") as handle:
            opened = os.fstat(handle.fileno())
            opened_identity = (
                opened.st_dev,
                opened.st_ino,
                opened.st_size,
                opened.st_mtime_ns,
            )
            if opened_identity != before_identity or not stat.S_ISREG(opened.st_mode):
                raise ApplicationUpdateError("pending update journal changed before readback")
            payload = handle.read(_MAX_JOURNAL_BYTES + 1)
            opened_after = os.fstat(handle.fileno())
            after_open_identity = (
                opened_after.st_dev,
                opened_after.st_ino,
                opened_after.st_size,
                opened_after.st_mtime_ns,
            )
            if after_open_identity != opened_identity:
                raise ApplicationUpdateError("pending update journal changed during readback")
        after = path.lstat()
    except ApplicationUpdateError:
        raise
    except OSError as exc:
        raise ApplicationUpdateError("pending update journal could not be read safely") from exc
    after_identity = (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)
    if (
        after_identity != before_identity
        or len(payload) != before.st_size
        or len(payload) > _MAX_JOURNAL_BYTES
    ):
        raise ApplicationUpdateError("pending update journal changed during readback")
    return payload


def _strict_json_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in pairs:
        if key in out:
            raise ApplicationUpdateError(f"pending update journal contains duplicate key: {key}")
        out[key] = value
    return out


def _require_real_directory(path: Path, label: str) -> None:
    try:
        metadata = path.lstat()
    except OSError as exc:
        raise ApplicationUpdateError(f"{label} is unavailable") from exc
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISDIR(metadata.st_mode):
        raise ApplicationUpdateError(f"{label} must be a real directory")


def _state_lock_for_root(root: Path) -> threading.RLock:
    key = os.path.normcase(str(root.absolute()))
    with _STATE_LOCKS_GUARD:
        lock = _STATE_LOCKS.get(key)
        if lock is None:
            lock = threading.RLock()
            _STATE_LOCKS[key] = lock
        return lock


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

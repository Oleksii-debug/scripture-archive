"""Durable, fail-closed apply handoff for a verified staged application update.

This module does not replace or execute application bytes. It creates a fixed,
host-owned apply intent that a future privileged/standalone updater can consume only
after independently re-verifying the same pending journal and exact staged bytes.
Browser code never receives filesystem paths from this module.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import stat
from typing import Any

from .application_update import ApplicationUpdateError
from .application_update_pending import PendingApplicationUpdate, inspect_pending_update


APPLY_INTENT_SCHEMA = "scripture.application-update.apply-intent.v1"
_APPLY_INTENT_NAME = "apply-update.json"
_MAX_INTENT_BYTES = 16 * 1024
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


def prepare_apply_handoff(
    staging_root: str | os.PathLike[str],
    *,
    current_version: str,
) -> PendingApplicationUpdate:
    """Persist an idempotent apply intent bound to the current verified pending bytes.

    Existing intent is accepted only when it is a regular non-symlink file and its
    complete semantic identity exactly matches the freshly re-verified pending
    update. Any divergent/corrupt intent fails closed rather than being overwritten.
    """

    root = Path(staging_root)
    pending = inspect_pending_update(root, current_version=current_version)
    if pending is None:
        raise ApplicationUpdateError("no pending update is available for apply handoff")

    payload = _intent_payload(pending)
    encoded = (json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
    if len(encoded) > _MAX_INTENT_BYTES:
        raise ApplicationUpdateError("apply intent exceeds the size limit")

    intent = root / _APPLY_INTENT_NAME
    existing = _read_existing_intent(intent)
    if existing is not None:
        if existing != payload:
            raise ApplicationUpdateError("existing apply intent does not match verified pending update")
        return pending

    temp = root / f".{_APPLY_INTENT_NAME}.{os.getpid()}.tmp"
    try:
        descriptor = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except OSError as exc:
        raise ApplicationUpdateError("could not create apply intent safely") from exc
    try:
        with os.fdopen(descriptor, "wb", closefd=True) as handle:
            handle.write(encoded)
            handle.flush()
            os.fsync(handle.fileno())
        # Re-verify pending bytes immediately before publication so the durable
        # intent is never published from stale verification state.
        rebound = inspect_pending_update(root, current_version=current_version)
        if rebound != pending:
            raise ApplicationUpdateError("pending update changed before apply handoff publication")
        os.replace(temp, intent)
        _fsync_directory(root)
    except Exception:
        try:
            temp.unlink()
        except OSError:
            pass
        raise

    readback = _read_existing_intent(intent)
    if readback != payload:
        raise ApplicationUpdateError("apply intent readback does not match verified pending update")
    return pending


def inspect_apply_handoff(
    staging_root: str | os.PathLike[str],
    *,
    current_version: str,
) -> PendingApplicationUpdate | None:
    """Return the verified pending identity only when the fixed apply intent matches it."""

    root = Path(staging_root)
    payload = _read_existing_intent(root / _APPLY_INTENT_NAME)
    if payload is None:
        return None
    pending = inspect_pending_update(root, current_version=current_version)
    if pending is None or payload != _intent_payload(pending):
        raise ApplicationUpdateError("apply intent is detached from current pending update")
    return pending


def discard_apply_handoff(staging_root: str | os.PathLike[str]) -> bool:
    """Remove only the fixed apply-intent authority; never delete staged bytes."""

    path = Path(staging_root) / _APPLY_INTENT_NAME
    try:
        metadata = path.lstat()
    except FileNotFoundError:
        return False
    except OSError as exc:
        raise ApplicationUpdateError("apply intent is unavailable") from exc
    if not (stat.S_ISREG(metadata.st_mode) or stat.S_ISLNK(metadata.st_mode)):
        raise ApplicationUpdateError("apply intent path is unsafe")
    try:
        path.unlink()
        _fsync_directory(path.parent)
    except OSError as exc:
        raise ApplicationUpdateError("apply intent could not be discarded safely") from exc
    return True


def _intent_payload(pending: PendingApplicationUpdate) -> dict[str, Any]:
    if not isinstance(pending, PendingApplicationUpdate):
        raise ApplicationUpdateError("pending update identity is invalid")
    return {
        "schema": APPLY_INTENT_SCHEMA,
        "status": "ready",
        "product_id": pending.product_id,
        "target_platform": pending.target_platform,
        "current_version": pending.current_version,
        "target_version": pending.target_version,
        "source_head": pending.source_head,
        "artifact_name": pending.artifact_name,
        "artifact_size": pending.artifact_size,
        "artifact_sha256": pending.artifact_sha256,
        "authenticity": pending.authenticity,
    }


def _read_existing_intent(path: Path) -> dict[str, Any] | None:
    try:
        before = path.lstat()
    except FileNotFoundError:
        return None
    except OSError as exc:
        raise ApplicationUpdateError("apply intent is unavailable") from exc
    if stat.S_ISLNK(before.st_mode) or not stat.S_ISREG(before.st_mode):
        raise ApplicationUpdateError("apply intent must be a regular non-symlink file")
    if before.st_size <= 0 or before.st_size > _MAX_INTENT_BYTES:
        raise ApplicationUpdateError("apply intent is empty or exceeds the size limit")
    identity = (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns)
    try:
        with path.open("rb") as handle:
            opened = os.fstat(handle.fileno())
            if (opened.st_dev, opened.st_ino, opened.st_size, opened.st_mtime_ns) != identity:
                raise ApplicationUpdateError("apply intent changed before readback")
            raw = handle.read(_MAX_INTENT_BYTES + 1)
        after = path.lstat()
    except ApplicationUpdateError:
        raise
    except OSError as exc:
        raise ApplicationUpdateError("apply intent could not be read safely") from exc
    if (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns) != identity or len(raw) != before.st_size:
        raise ApplicationUpdateError("apply intent changed during readback")
    try:
        value = json.loads(raw.decode("utf-8"), object_pairs_hook=_strict_json_object)
    except ApplicationUpdateError:
        raise
    except (UnicodeDecodeError, TypeError, ValueError) as exc:
        raise ApplicationUpdateError("apply intent is not valid UTF-8 JSON") from exc
    if not isinstance(value, dict) or frozenset(value) != _REQUIRED_KEYS:
        raise ApplicationUpdateError("apply intent keys do not match schema")
    if value["schema"] != APPLY_INTENT_SCHEMA or value["status"] != "ready":
        raise ApplicationUpdateError("apply intent schema or status is invalid")
    if value["authenticity"] != "same_publisher_authenticode_verified":
        raise ApplicationUpdateError("apply intent lacks same-publisher authenticity")
    return value


def _strict_json_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in pairs:
        if key in out:
            raise ApplicationUpdateError(f"apply intent contains duplicate key: {key}")
        out[key] = value
    return out


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

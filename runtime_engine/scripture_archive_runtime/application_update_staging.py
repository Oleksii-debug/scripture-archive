"""Trusted staging for a locally verified Scripture Archive application update.

Staging is deliberately narrower than installation. It copies already-selected local
bytes into a host-owned per-user update state, verifies those copied bytes again,
and atomically records a bounded pending journal. It never executes, unpacks,
replaces, restarts, or rolls back an application executable.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path
import secrets
import stat
from typing import Any

from .application_update import (
    ApplicationUpdateError,
    ApplicationUpdateManifest,
    verify_local_update,
)


STAGING_JOURNAL_SCHEMA = "scripture.application-update-staging.v1"
_PENDING_DIRECTORY = "pending"
_JOURNAL_NAME = "pending-update.json"
_MAX_JOURNAL_BYTES = 16 * 1024
_COPY_CHUNK_BYTES = 1024 * 1024


@dataclass(frozen=True)
class StagedApplicationUpdate:
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


def stage_local_update(
    manifest: ApplicationUpdateManifest,
    artifact_path: str | os.PathLike[str],
    staging_root: str | os.PathLike[str],
    *,
    current_version: str,
    same_publisher_authenticode_verified: bool,
) -> StagedApplicationUpdate:
    """Copy exact candidate bytes into trusted state and persist a pending journal.

    The caller must supply a positive native same-publisher Authenticode decision.
    This function does not trust that decision as byte identity: source bytes are
    verified before copying, the copy is hashed while written, and the staged file
    is verified again through the canonical application-update verifier.

    ``staging_root`` is host-owned state. The journal intentionally contains no
    original local path and no absolute staged path. A future apply operation must
    reconstruct its host-owned path and repeat both exact-byte and authenticity
    verification instead of treating this journal as install authority.
    """

    if same_publisher_authenticode_verified is not True:
        raise ApplicationUpdateError(
            "same-publisher Authenticode verification is required before staging"
        )

    verified_source = verify_local_update(
        manifest,
        artifact_path,
        current_version=current_version,
    )
    root = Path(staging_root)
    _ensure_directory(root)
    pending_root = root / _PENDING_DIRECTORY
    _ensure_directory(pending_root)
    digest_root = pending_root / verified_source.artifact_sha256
    _ensure_directory(digest_root)

    destination = digest_root / verified_source.artifact_name
    temporary = digest_root / (
        f".{verified_source.artifact_name}.tmp-{secrets.token_hex(12)}"
    )
    source = Path(artifact_path)

    try:
        copied_size, copied_digest = _copy_exact_bytes(source, temporary)
        if copied_size != verified_source.artifact_size:
            raise ApplicationUpdateError("staged artifact size does not match manifest")
        if copied_digest != verified_source.artifact_sha256:
            raise ApplicationUpdateError("staged artifact SHA-256 does not match manifest")
        _ensure_directory(digest_root)
        os.replace(temporary, destination)
        _fsync_directory(digest_root)
    except Exception:
        try:
            temporary.unlink(missing_ok=True)
        except OSError:
            pass
        raise

    verified_staged = verify_local_update(
        manifest,
        destination,
        current_version=current_version,
    )
    staged = StagedApplicationUpdate(
        product_id=verified_staged.product_id,
        target_platform=verified_staged.target_platform,
        current_version=verified_staged.current_version,
        target_version=verified_staged.target_version,
        source_head=verified_staged.source_head,
        artifact_name=verified_staged.artifact_name,
        artifact_size=verified_staged.artifact_size,
        artifact_sha256=verified_staged.artifact_sha256,
    )
    _write_pending_journal(root, staged)
    return staged


def _ensure_directory(path: Path) -> None:
    try:
        path.mkdir(parents=True, exist_ok=True)
        metadata = path.lstat()
    except OSError as exc:
        raise ApplicationUpdateError("trusted update staging directory is unavailable") from exc
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISDIR(metadata.st_mode):
        raise ApplicationUpdateError("trusted update staging path must be a real directory")


def _copy_exact_bytes(source: Path, destination: Path) -> tuple[int, str]:
    try:
        before = source.lstat()
    except OSError as exc:
        raise ApplicationUpdateError("update artifact is unavailable for staging") from exc
    if stat.S_ISLNK(before.st_mode) or not stat.S_ISREG(before.st_mode):
        raise ApplicationUpdateError("update artifact must remain a regular non-symlink file")
    before_identity = (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns)

    digest = hashlib.sha256()
    total = 0
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    try:
        with source.open("rb") as input_handle:
            opened_before = os.fstat(input_handle.fileno())
            opened_identity = (
                opened_before.st_dev,
                opened_before.st_ino,
                opened_before.st_size,
                opened_before.st_mtime_ns,
            )
            if opened_identity != before_identity or not stat.S_ISREG(opened_before.st_mode):
                raise ApplicationUpdateError("update artifact changed before staging copy")

            output_fd = os.open(destination, flags, 0o600)
            try:
                output_handle = os.fdopen(output_fd, "wb")
            except Exception:
                os.close(output_fd)
                raise
            with output_handle:
                while True:
                    chunk = input_handle.read(_COPY_CHUNK_BYTES)
                    if not chunk:
                        break
                    total += len(chunk)
                    digest.update(chunk)
                    output_handle.write(chunk)
                output_handle.flush()
                os.fsync(output_handle.fileno())

            opened_after = os.fstat(input_handle.fileno())
            after_open_identity = (
                opened_after.st_dev,
                opened_after.st_ino,
                opened_after.st_size,
                opened_after.st_mtime_ns,
            )
            if after_open_identity != opened_identity:
                raise ApplicationUpdateError("update artifact changed during staging copy")
        after = source.lstat()
    except ApplicationUpdateError:
        raise
    except OSError as exc:
        raise ApplicationUpdateError("update artifact could not be staged safely") from exc

    after_identity = (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)
    if after_identity != before_identity:
        raise ApplicationUpdateError("update artifact changed during staging copy")
    return total, digest.hexdigest()


def _write_pending_journal(root: Path, staged: StagedApplicationUpdate) -> None:
    payload: dict[str, Any] = {
        "schema": STAGING_JOURNAL_SCHEMA,
        "status": staged.status,
        "product_id": staged.product_id,
        "target_platform": staged.target_platform,
        "current_version": staged.current_version,
        "target_version": staged.target_version,
        "source_head": staged.source_head,
        "artifact_name": staged.artifact_name,
        "artifact_size": staged.artifact_size,
        "artifact_sha256": staged.artifact_sha256,
        "authenticity": staged.authenticity,
    }
    encoded = (json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
    if len(encoded) > _MAX_JOURNAL_BYTES:
        raise ApplicationUpdateError("pending update journal exceeds size limit")

    temporary = root / f".{_JOURNAL_NAME}.tmp-{secrets.token_hex(12)}"
    journal = root / _JOURNAL_NAME
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    try:
        descriptor = os.open(temporary, flags, 0o600)
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(encoded)
            handle.flush()
            os.fsync(handle.fileno())
        _ensure_directory(root)
        os.replace(temporary, journal)
        _fsync_directory(root)
    except Exception:
        try:
            temporary.unlink(missing_ok=True)
        except OSError:
            pass
        raise


def _fsync_directory(path: Path) -> None:
    """Best-effort metadata durability where directory fsync is supported."""

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

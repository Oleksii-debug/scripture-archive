from __future__ import annotations

import os
import shutil
import threading
import uuid
from pathlib import Path

from .content_packs import (
    MAX_ARCHIVE_BYTES,
    ContentPackInspection,
    ContentPackManifest,
    ContentPackStore as _CoreContentPackStore,
    inspect_content_pack,
)
from .security import ValidationError


_STATE_LOCKS_GUARD = threading.Lock()
_STATE_LOCKS: dict[str, threading.RLock] = {}


def _state_lock_for_root(root: Path) -> threading.RLock:
    key = os.path.normcase(str(root))
    with _STATE_LOCKS_GUARD:
        lock = _STATE_LOCKS.get(key)
        if lock is None:
            lock = threading.RLock()
            _STATE_LOCKS[key] = lock
        return lock


def _semver_key(value: str) -> tuple[int, int, int, int, tuple[tuple[int, int | str], ...]]:
    main, separator, prerelease = value.partition("-")
    major, minor, patch = (int(part) for part in main.split("."))
    if not separator:
        return major, minor, patch, 1, ()
    identifiers = tuple(
        (0, int(identifier)) if identifier.isdigit() else (1, identifier)
        for identifier in prerelease.split(".")
    )
    return major, minor, patch, 0, identifiers


class ContentPackStore(_CoreContentPackStore):
    """Public store boundary with atomic publication and serialized state changes.

    Caller-owned archives are copied into the private staging root before the
    core validator/extractor sees them. The core installation target is also
    redirected to a private path until its full post-extraction verification
    succeeds; only then is the verified directory atomically published into
    the immutable version store. This closes both caller-path TOCTOU and the
    crash/retry window where an unverified target could otherwise be visible.

    Activation and rollback read-modify-write transitions are serialized per
    resolved store root within this process so separate public-store instances
    cannot lose concurrent updates to the shared activation state file.
    """

    def __init__(self, root: str | Path) -> None:
        super().__init__(root)
        # Core install and verify dynamically route through ``self._pack_dir``.
        # Keep the private target override local to the calling thread so one
        # overlapping install cannot redirect another install/verification (or
        # an unrelated read) onto the wrong target.
        self._install_context = threading.local()
        self._state_transaction_lock = _state_lock_for_root(self.root)

    def _pack_dir(self, pack_id: str, version: str) -> Path:
        real_target = super()._pack_dir(pack_id, version)
        override = getattr(self._install_context, "target_override", None)
        if override is not None and override[0] == pack_id and override[1] == version:
            return override[2]
        return real_target

    def install(self, archive: str | Path) -> ContentPackInspection:
        source = Path(archive).expanduser().resolve()
        snapshot = self.staging_root / f".incoming-{uuid.uuid4().hex}.zip"
        verified_target: Path | None = None
        total = 0
        try:
            try:
                with source.open("rb") as src, snapshot.open("xb") as dst:
                    while True:
                        chunk = src.read(1024 * 1024)
                        if not chunk:
                            break
                        total += len(chunk)
                        if total > MAX_ARCHIVE_BYTES:
                            raise ValidationError("Content pack archive exceeds compressed size limit")
                        dst.write(chunk)
                    dst.flush()
                    os.fsync(dst.fileno())
            except ValidationError:
                raise
            except OSError as exc:
                raise ValidationError("Content pack archive is not readable") from exc

            inspection = inspect_content_pack(snapshot)
            manifest = inspection.manifest
            real_target = super()._pack_dir(manifest.pack_id, manifest.version)
            if real_target.exists():
                raise ValidationError(
                    f"Content pack version is immutable and already installed: {manifest.pack_id}@{manifest.version}"
                )
            real_target.parent.mkdir(parents=True, exist_ok=True)

            verified_target = self.staging_root / f".verified-{uuid.uuid4().hex}"
            self._install_context.target_override = (manifest.pack_id, manifest.version, verified_target)
            try:
                installed = super().install(snapshot)
            finally:
                self._install_context.target_override = None

            if installed.manifest != manifest or installed.archive_sha256 != inspection.archive_sha256:
                raise ValidationError("Content pack installation snapshot changed during verification")
            if real_target.exists():
                raise ValidationError(
                    f"Content pack version is immutable and already installed: {manifest.pack_id}@{manifest.version}"
                )
            os.replace(verified_target, real_target)
            self._fsync_directory(real_target.parent)
            verified_target = None
            return inspection
        finally:
            self._install_context.target_override = None
            if verified_target is not None and verified_target.exists():
                shutil.rmtree(verified_target, ignore_errors=True)
            snapshot.unlink(missing_ok=True)

    def activate(self, pack_id: str, version: str) -> ContentPackManifest:
        with self._state_transaction_lock:
            return super().activate(pack_id, version)

    def rollback(self, pack_id: str) -> ContentPackManifest:
        with self._state_transaction_lock:
            return super().rollback(pack_id)

    def installed_versions(self, pack_id: str) -> tuple[str, ...]:
        return tuple(sorted(super().installed_versions(pack_id), key=_semver_key))

    def export_pack(self, pack_id: str, version: str, destination: str | Path) -> Path:
        target = Path(destination).expanduser().resolve()
        if target == self.root or self.root in target.parents:
            raise ValidationError("Content pack export destination must be outside the immutable pack store")
        return super().export_pack(pack_id, version, target)

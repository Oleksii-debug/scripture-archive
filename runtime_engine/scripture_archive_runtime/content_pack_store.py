from __future__ import annotations

import os
import uuid
from pathlib import Path

from .content_packs import MAX_ARCHIVE_BYTES, ContentPackInspection, ContentPackStore as _CoreContentPackStore
from .security import ValidationError


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
    """Public store boundary with stable-input and immutable-store protection.

    Caller-owned archives are copied into the private staging root before the
    core validator/extractor sees them. This closes the inspect-versus-extract
    TOCTOU window for a source file that changes during installation.
    """

    def install(self, archive: str | Path) -> ContentPackInspection:
        source = Path(archive).expanduser().resolve()
        snapshot = self.staging_root / f".incoming-{uuid.uuid4().hex}.zip"
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
            return super().install(snapshot)
        finally:
            snapshot.unlink(missing_ok=True)

    def installed_versions(self, pack_id: str) -> tuple[str, ...]:
        return tuple(sorted(super().installed_versions(pack_id), key=_semver_key))

    def export_pack(self, pack_id: str, version: str, destination: str | Path) -> Path:
        target = Path(destination).expanduser().resolve()
        if target == self.root or self.root in target.parents:
            raise ValidationError("Content pack export destination must be outside the immutable pack store")
        return super().export_pack(pack_id, version, target)

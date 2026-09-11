from __future__ import annotations

from pathlib import Path

from .content_packs import ContentPackStore as _CoreContentPackStore
from .security import ValidationError


def _semver_key(value: str) -> tuple[int, int, int, int, str]:
    main, separator, prerelease = value.partition("-")
    major, minor, patch = (int(part) for part in main.split("."))
    return major, minor, patch, 0 if separator else 1, prerelease


class ContentPackStore(_CoreContentPackStore):
    """Public store boundary with immutable-store export protection.

    The core class owns archive validation, install, activation and rollback.
    This public facade additionally prevents callers from exporting generated
    archives back inside the immutable pack store and returns semver-ordered
    installed versions.
    """

    def installed_versions(self, pack_id: str) -> tuple[str, ...]:
        return tuple(sorted(super().installed_versions(pack_id), key=_semver_key))

    def export_pack(self, pack_id: str, version: str, destination: str | Path) -> Path:
        target = Path(destination).expanduser().resolve()
        if target == self.root or self.root in target.parents:
            raise ValidationError("Content pack export destination must be outside the immutable pack store")
        return super().export_pack(pack_id, version, target)

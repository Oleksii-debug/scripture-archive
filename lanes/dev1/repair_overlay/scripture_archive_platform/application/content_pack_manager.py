from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Mapping

_SAFE_INBOX_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._ -]{0,159}\.zip$", re.IGNORECASE)


class ContentPackManagerService:
    """Packaged-app adapter around the canonical safe Content Pack V1 store.

    The bridge never accepts an arbitrary path. Users place ZIP candidates in a
    private import inbox and the UI sends only an allowlisted basename. The
    canonical runtime remains the sole owner of archive validation, immutable
    installation, activation, verification, and rollback semantics.
    """

    def __init__(self, state_root: str | Path) -> None:
        from runtime_engine.scripture_archive_runtime.content_pack_store import ContentPackStore
        from runtime_engine.scripture_archive_runtime.content_packs import inspect_content_pack
        from runtime_engine.scripture_archive_runtime.security import ValidationError

        self.root = Path(state_root).expanduser().resolve() / "content-packs-v1"
        self.inbox = self.root / "inbox"
        self.inbox.mkdir(parents=True, exist_ok=True)
        self.store = ContentPackStore(self.root / "store")
        self._inspect = inspect_content_pack
        self._validation_error = ValidationError

    def handle(self, command: str, payload: Mapping[str, Any] | None = None) -> dict[str, Any]:
        data = payload if isinstance(payload, Mapping) else {}
        try:
            if command == "content_packs.list":
                return self._snapshot()
            if command == "content_packs.inspect":
                path = self._candidate_path(data)
                return {"inspection": self._inspection_dict(self._inspect(path)), **self._snapshot()}
            if command == "content_packs.install":
                path = self._candidate_path(data)
                inspection = self.store.install(path)
                activated = bool(data.get("activate", False))
                if activated:
                    self.store.activate(inspection.manifest.pack_id, inspection.manifest.version)
                return {"inspection": self._inspection_dict(inspection), "activated": activated, **self._snapshot()}
            if command == "content_packs.verify":
                manifest = self.store.verify_installed(self._identity(data, "pack_id"), self._identity(data, "version"))
                return {"manifest": manifest.as_dict(), **self._snapshot()}
            if command == "content_packs.activate":
                manifest = self.store.activate(self._identity(data, "pack_id"), self._identity(data, "version"))
                return {"manifest": manifest.as_dict(), **self._snapshot()}
            if command == "content_packs.rollback":
                manifest = self.store.rollback(self._identity(data, "pack_id"))
                return {"manifest": manifest.as_dict(), **self._snapshot()}
            raise ValueError("content pack command not implemented")
        except self._validation_error as exc:
            raise ValueError(str(exc)) from exc

    def _snapshot(self) -> dict[str, Any]:
        active = self.store.active_versions()
        pack_ids = set(active)
        if self.store.packs_root.is_dir():
            for child in self.store.packs_root.iterdir():
                if not child.is_dir() or child.is_symlink():
                    continue
                try:
                    if self.store.installed_versions(child.name):
                        pack_ids.add(child.name)
                except self._validation_error:
                    continue

        installed: list[dict[str, Any]] = []
        for pack_id in sorted(pack_ids):
            try:
                versions = list(self.store.installed_versions(pack_id))
            except self._validation_error:
                continue
            installed.append({"pack_id": pack_id, "active_version": active.get(pack_id), "versions": versions})

        candidates: list[dict[str, Any]] = []
        for path in sorted(self.inbox.iterdir(), key=lambda item: item.name.casefold()):
            if path.is_symlink() or not path.is_file() or not _SAFE_INBOX_NAME.fullmatch(path.name):
                continue
            try:
                size = path.stat().st_size
            except OSError:
                continue
            candidates.append({"file_name": path.name, "size_bytes": size})

        return {
            "schema": "scripture.content-pack-manager.v1",
            "inbox_path": str(self.inbox),
            "candidates": candidates,
            "installed": installed,
        }

    def _candidate_path(self, payload: Mapping[str, Any]) -> Path:
        value = payload.get("file_name")
        if not isinstance(value, str) or not _SAFE_INBOX_NAME.fullmatch(value):
            raise ValueError("invalid content pack inbox file_name")
        if "/" in value or "\\" in value or value in {".", ".."}:
            raise ValueError("invalid content pack inbox file_name")
        candidate = self.inbox / value
        if candidate.is_symlink():
            raise ValueError("content pack inbox symlinks are forbidden")
        try:
            resolved = candidate.resolve(strict=True)
        except OSError as exc:
            raise ValueError("content pack inbox file is not readable") from exc
        if resolved.parent != self.inbox.resolve() or not resolved.is_file():
            raise ValueError("content pack inbox file is outside the private inbox")
        return resolved

    @staticmethod
    def _identity(payload: Mapping[str, Any], key: str) -> str:
        value = payload.get(key)
        if not isinstance(value, str) or not value or len(value) > 100:
            raise ValueError(f"invalid {key}")
        return value

    @staticmethod
    def _inspection_dict(inspection: Any) -> dict[str, Any]:
        return {
            "manifest": inspection.manifest.as_dict(),
            "archive_sha256": inspection.archive_sha256,
            "file_count": inspection.file_count,
            "uncompressed_bytes": inspection.uncompressed_bytes,
            "node_count": inspection.node_count,
        }

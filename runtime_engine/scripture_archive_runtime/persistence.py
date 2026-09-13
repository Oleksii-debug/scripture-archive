from __future__ import annotations

import json
import os
import shutil
import threading
import uuid
from dataclasses import asdict, is_dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Mapping

from .security import ValidationError

CURRENT_SCHEMA_VERSION = 3
MAX_RECOVERY_POINTS = 5
MAX_STATE_BYTES = 64 * 1024 * 1024

_SAVE_LOCKS_GUARD = threading.Lock()
_SAVE_LOCKS: dict[Path, threading.RLock] = {}


def _save_lock_for(root: Path):
    with _SAVE_LOCKS_GUARD:
        lock = _SAVE_LOCKS.get(root)
        if lock is None:
            lock = threading.RLock()
            _SAVE_LOCKS[root] = lock
        return lock


def _json_default(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    if hasattr(value, "value"):
        return value.value
    if isinstance(value, set):
        return sorted(value)
    if is_dataclass(value):
        return asdict(value)
    raise TypeError(f"Not JSON serializable: {type(value).__name__}")


class PersistenceStore:
    def __init__(self, root: str | Path) -> None:
        self.root = Path(root).expanduser().resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.backups = self.root / "backups"
        self.backups.mkdir(exist_ok=True)
        self.state_path = self.root / "state.json"
        self.backup_path = self.root / "state.json.bak"
        self._save_lock = _save_lock_for(self.root)

    def _ensure_inside(self, path: Path) -> Path:
        resolved = path.resolve()
        if resolved != self.root and self.root not in resolved.parents:
            raise ValidationError("Path escapes persistence root")
        return resolved

    @staticmethod
    def default_state() -> dict[str, Any]:
        return {
            "schema_version": CURRENT_SCHEMA_VERSION,
            "profile": {},
            "settings": {},
            "sessions": [],
            "history": {},
            "mastery": {},
            "review_queue": [],
            "campaign_checkpoints": {},
            "passage_exposure": {},
            "mistakes": {},
            "recent_fatigue": {},
            "session_rollup": {},
            "constructor_drafts": {},
            "keymap": {},
            "evidence_exposure": {},
            "accessibility_state": {},
            "current_node_id": None,
        }

    def save(self, state: Mapping[str, Any]) -> None:
        with self._save_lock:
            data = dict(state)
            data["schema_version"] = CURRENT_SCHEMA_VERSION
            payload = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True, default=_json_default) + "\n"
            if len(payload.encode("utf-8")) > MAX_STATE_BYTES:
                raise ValidationError("State exceeds 64 MB safety limit")
            tmp = self._ensure_inside(self.root / f".state.{os.getpid()}.{uuid.uuid4().hex}.tmp")
            try:
                self._backup_current_if_valid()
                with open(tmp, "x", encoding="utf-8", newline="\n") as fh:
                    fh.write(payload)
                    fh.flush()
                    os.fsync(fh.fileno())
                os.replace(tmp, self.state_path)
                self._fsync_directory(self.root)
            finally:
                if tmp.exists():
                    tmp.unlink(missing_ok=True)

    def load(self) -> dict[str, Any]:
        if not self.state_path.exists():
            return self.default_state()
        try:
            raw = self._load_json(self.state_path)
        except (json.JSONDecodeError, UnicodeDecodeError, OSError, ValidationError):
            return self._recover_corrupt()
        return self._migrate_if_needed(raw)

    def _load_json(self, path: Path) -> dict[str, Any]:
        if path.stat().st_size > MAX_STATE_BYTES:
            raise ValidationError("State exceeds 64 MB safety limit")
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValidationError("State root must be object")
        version = data.get("schema_version", 0)
        if not isinstance(version, int) or version < 0:
            raise ValidationError("Invalid state schema_version")
        return data

    def _backup_current_if_valid(self) -> None:
        if not self.state_path.exists():
            return
        try:
            self._load_json(self.state_path)
        except (json.JSONDecodeError, UnicodeDecodeError, OSError, ValidationError):
            return
        shutil.copy2(self.state_path, self.backup_path)

    def create_recovery_point(self, label: str = "manual") -> Path | None:
        if not self.state_path.exists():
            return None
        self._load_json(self.state_path)
        safe_label = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in label)[:40] or "manual"
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        target = self._ensure_inside(self.backups / f"state.{stamp}.{safe_label}.json")
        shutil.copy2(self.state_path, target)
        self._prune_recovery_points()
        return target

    def list_recovery_points(self) -> list[Path]:
        return sorted(self.backups.glob("state.*.*.json"), key=lambda p: p.name, reverse=True)

    def _prune_recovery_points(self) -> None:
        points = self.list_recovery_points()
        for old in points[MAX_RECOVERY_POINTS:]:
            old.unlink(missing_ok=True)

    def restore_backup(self) -> dict[str, Any]:
        if not self.backup_path.exists():
            raise ValidationError("No backup state available")
        backup = self._migrate_state(self._load_json(self.backup_path))
        if self.state_path.exists():
            try:
                self.create_recovery_point("pre_restore")
            except (json.JSONDecodeError, UnicodeDecodeError, OSError, ValidationError):
                pass
        self.save(backup)
        return backup

    def _recover_corrupt(self) -> dict[str, Any]:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        if self.state_path.exists():
            quarantine = self._ensure_inside(self.root / f"state.corrupt.{stamp}.json")
            shutil.move(self.state_path, quarantine)
        if self.backup_path.exists():
            try:
                backup = self._migrate_state(self._load_json(self.backup_path))
                self.save(backup)
                return backup
            except Exception:
                pass
        fresh = self.default_state()
        self.save(fresh)
        return fresh

    def _migrate_state(self, state: Mapping[str, Any]) -> dict[str, Any]:
        migrated = dict(state)
        version = int(migrated.get("schema_version", 0))
        if version > CURRENT_SCHEMA_VERSION:
            raise ValidationError(f"State schema {version} is newer than runtime {CURRENT_SCHEMA_VERSION}")
        while version < CURRENT_SCHEMA_VERSION:
            migrator = MIGRATIONS.get(version)
            if migrator is None:
                raise ValidationError(f"No migration from schema {version}")
            migrated = migrator(migrated)
            next_version = int(migrated["schema_version"])
            if next_version <= version:
                raise ValidationError("Migration did not advance schema version")
            version = next_version
        return migrated

    def _migrate_if_needed(self, state: dict[str, Any]) -> dict[str, Any]:
        version = int(state.get("schema_version", 0))
        if version == CURRENT_SCHEMA_VERSION:
            return state
        if self.state_path.exists():
            snapshot = self.backups / f"state.pre_migration_v{version}.json"
            shutil.copy2(self.state_path, snapshot)
        migrated = self._migrate_state(state)
        self.save(migrated)
        return migrated

    def export_state(self, destination: str | Path) -> Path:
        target = Path(destination).expanduser().resolve()
        target.parent.mkdir(parents=True, exist_ok=True)
        state = self.load()
        target.write_text(json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True, default=_json_default) + "\n", encoding="utf-8")
        return target

    def import_state(
        self,
        source: str | Path,
        *,
        validator: Callable[[Mapping[str, Any]], None] | None = None,
    ) -> dict[str, Any]:
        """Validate an import completely before replacing the current persisted state."""
        source_path = Path(source).expanduser().resolve()
        data = self._migrate_state(self._load_json(source_path))
        if validator is not None:
            try:
                validator(data)
            except ValidationError:
                raise
            except Exception as exc:
                raise ValidationError("Imported state failed semantic validation") from exc
        if self.state_path.exists():
            self.create_recovery_point("pre_import")
        self.save(data)
        return data

    def delete_progress(self, *, preserve_profile: bool = True, preserve_settings: bool = True, preserve_keymap: bool = True, preserve_accessibility: bool = True) -> dict[str, Any]:
        current = self.load()
        if self.state_path.exists():
            self.create_recovery_point("pre_delete_progress")
        fresh = self.default_state()
        if preserve_profile:
            fresh["profile"] = dict(current.get("profile") or {})
        if preserve_settings:
            fresh["settings"] = dict(current.get("settings") or {})
        if preserve_keymap:
            fresh["keymap"] = dict(current.get("keymap") or {})
        if preserve_accessibility:
            fresh["accessibility_state"] = dict(current.get("accessibility_state") or {})
        self.save(fresh)
        return fresh

    @staticmethod
    def _fsync_directory(path: Path) -> None:
        flags = getattr(os, "O_DIRECTORY", 0)
        try:
            fd = os.open(str(path), os.O_RDONLY | flags)
        except OSError:
            return
        try:
            os.fsync(fd)
        except OSError:
            pass
        finally:
            os.close(fd)


def migrate_v0_to_v1(state: dict[str, Any]) -> dict[str, Any]:
    out = dict(state)
    out.setdefault("profile", {})
    out.setdefault("settings", {})
    out.setdefault("sessions", [])
    out.setdefault("history", {})
    out.setdefault("mastery", {})
    out.setdefault("review_queue", [])
    out.setdefault("constructor_drafts", {})
    out.setdefault("keymap", {})
    out["schema_version"] = 1
    return out


def migrate_v1_to_v2(state: dict[str, Any]) -> dict[str, Any]:
    out = dict(state)
    out.setdefault("evidence_exposure", {})
    out.setdefault("accessibility_state", {})
    out["schema_version"] = 2
    return out


def migrate_v2_to_v3(state: dict[str, Any]) -> dict[str, Any]:
    out = dict(state)
    out.setdefault("campaign_checkpoints", {})
    out.setdefault("passage_exposure", {})
    out.setdefault("mistakes", {})
    out.setdefault("recent_fatigue", {})
    out.setdefault("session_rollup", {})
    out.setdefault("current_node_id", None)
    out["schema_version"] = 3
    return out


MIGRATIONS: dict[int, Callable[[dict[str, Any]], dict[str, Any]]] = {
    0: migrate_v0_to_v1,
    1: migrate_v1_to_v2,
    2: migrate_v2_to_v3,
}

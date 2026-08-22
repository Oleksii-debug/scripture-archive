from __future__ import annotations

import json
import os
import shutil
from dataclasses import asdict, is_dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Mapping

from .security import ValidationError, validate_content_import

CURRENT_SCHEMA_VERSION = 2


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
            "constructor_drafts": {},
            "keymap": {},
            "evidence_exposure": {},
            "accessibility_state": {},
        }

    def save(self, state: Mapping[str, Any]) -> None:
        data = dict(state)
        data["schema_version"] = CURRENT_SCHEMA_VERSION
        validate_content_import(data)
        payload = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True, default=_json_default) + "\n"
        tmp = self._ensure_inside(self.root / f".state.{os.getpid()}.tmp")
        if self.state_path.exists():
            shutil.copy2(self.state_path, self.backup_path)
        with open(tmp, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(payload)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, self.state_path)

    def load(self) -> dict[str, Any]:
        if not self.state_path.exists():
            return self.default_state()
        try:
            raw = self._load_json(self.state_path)
        except (json.JSONDecodeError, UnicodeDecodeError, OSError, ValidationError):
            return self._recover_corrupt()
        return self._migrate_if_needed(raw)

    def _load_json(self, path: Path) -> dict[str, Any]:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValidationError("State root must be object")
        validate_content_import(data)
        return data

    def _recover_corrupt(self) -> dict[str, Any]:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        if self.state_path.exists():
            quarantine = self._ensure_inside(self.root / f"state.corrupt.{stamp}.json")
            shutil.move(self.state_path, quarantine)
        if self.backup_path.exists():
            try:
                backup = self._load_json(self.backup_path)
                recovered = self._migrate_if_needed(backup)
                self.save(recovered)
                return recovered
            except Exception:
                pass
        fresh = self.default_state()
        self.save(fresh)
        return fresh

    def _migrate_if_needed(self, state: dict[str, Any]) -> dict[str, Any]:
        version = int(state.get("schema_version", 0))
        if version > CURRENT_SCHEMA_VERSION:
            raise ValidationError(f"State schema {version} is newer than runtime {CURRENT_SCHEMA_VERSION}")
        if version == CURRENT_SCHEMA_VERSION:
            return state
        if self.state_path.exists():
            snapshot = self.backups / f"state.pre_migration_v{version}.json"
            shutil.copy2(self.state_path, snapshot)
        migrated = dict(state)
        while version < CURRENT_SCHEMA_VERSION:
            migrator = MIGRATIONS.get(version)
            if migrator is None:
                raise ValidationError(f"No migration from schema {version}")
            migrated = migrator(migrated)
            version = int(migrated["schema_version"])
        self.save(migrated)
        return migrated

    def export_state(self, destination: str | Path) -> Path:
        target = Path(destination).expanduser().resolve()
        target.parent.mkdir(parents=True, exist_ok=True)
        state = self.load()
        target.write_text(json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True, default=_json_default) + "\n", encoding="utf-8")
        return target

    def import_state(self, source: str | Path) -> dict[str, Any]:
        source_path = Path(source).expanduser().resolve()
        data = self._load_json(source_path)
        data = self._migrate_if_needed(data)
        self.save(data)
        return data


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


MIGRATIONS: dict[int, Callable[[dict[str, Any]], dict[str, Any]]] = {0: migrate_v0_to_v1, 1: migrate_v1_to_v2}

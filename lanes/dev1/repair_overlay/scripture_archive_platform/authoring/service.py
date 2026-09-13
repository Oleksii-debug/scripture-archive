from __future__ import annotations

import copy
import json
import re
import time
import uuid
from typing import Any, Callable

from runtime_engine.scripture_archive_runtime.content_packs import (
    CONTENT_PACK_SCHEMA,
    CONTENT_SCHEMA_VERSION,
)
from scripture_archive_platform.transport.contracts import MAX_IMPORT_BYTES
from .model import (
    CHANGE_RECORD_SCHEMA, DRAFT_SCHEMA, KINDS, PUBLISH_SCHEMA,
    blank_campaign, blank_mission, blank_node,
)
from .validation import identity, identity_errors, publish_blockers, validate_draft


HISTORY_SCHEMA = "scripture.authoring-history.v1"
SNAPSHOT_SCHEMA = "scripture.authoring-snapshot.v1"
VERSION_SCHEMA = "scripture.authoring-version.v1"
PACK_COMPAT_SCHEMA = "scripture.authoring-pack-compat.v1"
MAX_HISTORY_DEPTH = 50
MAX_DIFF_PATHS = 1000


class AuthoringService:
    """Backward-compatible data-only constructor; never mutates audited canonical files."""

    def __init__(self, store: Any, task_registry: Any, mapper: Any, *,
                 clock: Callable[[], float] = time.time,
                 id_factory: Callable[[], str] | None = None) -> None:
        self.store = store
        self.task_registry = task_registry
        self.mapper = mapper
        self.clock = clock
        self.id_factory = id_factory or (lambda: uuid.uuid4().hex[:12])

    def list_drafts(self) -> list[dict[str, Any]]:
        out = []
        for key in self.store.list_keys("drafts"):
            d = self.store.get_json("drafts", key, {}) or {}
            out.append({
                "draft_id": key, "kind": d.get("kind", "node"), "title": d.get("title", key),
                "updated_at": d.get("updated_at"), "status": d.get("status", "DRAFT"),
                "revision": d.get("revision", 1), "node_id": (d.get("node") or {}).get("node_id"),
                "mission_id": (d.get("mission") or {}).get("mission_id"),
                "campaign_id": (d.get("campaign") or {}).get("campaign_id"),
            })
        return sorted(out, key=lambda x: (-(int(x.get("updated_at") or 0)), x["draft_id"]))

    def new_draft(self, title: str = "Нова чернетка", kind: str = "node") -> dict[str, Any]:
        kind = self._kind(kind)
        title = self._title(title)
        now = int(self.clock())
        draft = {
            "draft_schema": DRAFT_SCHEMA, "draft_id": "draft-" + self.id_factory(),
            "kind": kind, "title": title, "status": "DRAFT", "revision": 1,
            "created_at": now, "updated_at": now, "base_identity": None,
            "campaign": blank_campaign(), "mission": blank_mission(), "node": blank_node(),
            "change_record": [],
        }
        self.store.put_json("drafts", draft["draft_id"], draft)
        return copy.deepcopy(draft)

    def new_node_from_task_type(self, title: str, task_type: str) -> dict[str, Any]:
        task_type = str(task_type).upper()
        if task_type not in self.task_registry:
            raise ValueError("Unknown task_type")
        draft = self.new_draft(title, "node")
        draft["node"]["task_type"] = task_type
        draft["node"]["response_mode"] = task_type.lower()
        return draft

    def load_draft(self, draft_id: str) -> dict[str, Any]:
        self._validate_id(draft_id, "draft id")
        draft = self.store.get_json("drafts", draft_id)
        if draft is None:
            raise ValueError("draft not found")
        return copy.deepcopy(draft)

    def save_draft(self, draft: Any) -> dict[str, Any]:
        draft = self._envelope(draft)
        stored = self.store.get_json("drafts", draft["draft_id"])
        now = int(self.clock())
        if stored is not None:
            expected = int(stored.get("revision", 1))
            if int(draft.get("revision", expected)) != expected:
                raise ValueError("stale draft revision; reload before saving")
            created_at = int(stored.get("created_at", now))
            revision = expected + 1
            base_identity = stored.get("base_identity") or draft.get("base_identity")
        else:
            created_at = int(draft.get("created_at", now))
            revision = max(1, int(draft.get("revision", 1)))
            base_identity = draft.get("base_identity")
        out = copy.deepcopy(draft)
        out.update({
            "status": "DRAFT", "created_at": created_at, "updated_at": now,
            "revision": revision, "base_identity": base_identity,
        })
        self._protect_identity(out)
        out.setdefault("change_record", []).append({
            "timestamp": now, "action": "save_draft", "revision": revision,
        })
        if stored is not None:
            self._remember_for_undo(out["draft_id"], stored)
        self.store.put_json("drafts", out["draft_id"], out)
        return copy.deepcopy(out)

    def delete_draft(self, draft_id: str) -> dict[str, Any]:
        self.load_draft(draft_id)
        self.store.delete("drafts", draft_id)
        self.store.delete("authoring_history", draft_id)
        return {"draft_id": draft_id, "deleted": True}

    def fork_record(self, kind: str, record: dict[str, Any], title: str | None = None) -> dict[str, Any]:
        kind = self._kind(kind)
        if not isinstance(record, dict):
            raise ValueError("record must be an object")
        stable_id = identity(kind, record)
        draft = self.new_draft(title or stable_id or f"Edit {kind}", kind)
        draft[kind] = self._json_copy(record)
        draft["base_identity"] = {kind: stable_id}
        return self.save_draft(draft)

    @staticmethod
    def move_collection_item(draft: dict[str, Any], path: str,
                             index: int, direction: str) -> dict[str, Any]:
        """Pure keyboard-linear reorder primitive used by Move up/Move down controls."""
        if direction not in {"up", "down"}:
            raise ValueError("direction must be up or down")
        out = copy.deepcopy(draft)
        parts = path.split(".")
        if not 2 <= len(parts) <= 6 or any(
            not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", part) for part in parts
        ):
            raise ValueError("invalid collection path")
        target: Any = out
        for part in parts:
            if not isinstance(target, dict) or part not in target:
                raise ValueError("unknown collection path")
            target = target[part]
        if not isinstance(target, list) or not isinstance(index, int) or not 0 <= index < len(target):
            raise ValueError("invalid collection/index")
        other = index - 1 if direction == "up" else index + 1
        if 0 <= other < len(target):
            target[index], target[other] = target[other], target[index]
        return out

    def validate_draft(self, draft: Any) -> dict[str, Any]:
        return validate_draft(draft, self.task_registry)

    def preview(self, draft: Any) -> dict[str, Any]:
        result = self.validate_draft(draft)
        node = (draft or {}).get("node") or {}
        renderable = None
        if node.get("node_id") and node.get("mission_id") and node.get("task_type") in self.task_registry:
            renderable = self.mapper.to_renderable(node, (draft or {}).get("mission"))
        return {
            "validation": result, "renderable": renderable,
            "focus_target": "authoring-preview-heading",
            "announcement": (
                "Попередній перегляд готовий." if result["valid"]
                else "Перевірте помилки чернетки."
            ),
        }

    def prepare_publish_candidate(self, draft: Any) -> dict[str, Any]:
        result = self.validate_draft(draft)
        if not result["valid"]:
            raise ValueError("draft validation failed; canonical content is not modified")
        blockers = publish_blockers(draft)
        if blockers:
            raise ValueError("; ".join(blockers))
        now = int(self.clock())
        candidate = copy.deepcopy(draft)
        candidate["status"] = "PUBLISH_CANDIDATE"
        candidate["canonical_mutation_performed"] = False
        candidate["publish_manifest"] = {
            "schema_version": PUBLISH_SCHEMA, "prepared_at": now,
            "source_draft_id": draft["draft_id"],
            "source_draft_revision": draft.get("revision", 1),
            "requires_source_audit": draft.get("kind", "node") == "node",
            "requires_integration_review": True, "stable_id_change_prohibited": True,
        }
        kind = draft.get("kind", "node")
        candidate["publish_change_record"] = {
            "schema_version": CHANGE_RECORD_SCHEMA, "prepared_at": now,
            "kind": "REPLACE_VERSION" if draft.get("base_identity") else "CREATE",
            "stable_identity": identity(kind, draft.get(kind) or {}),
            "requires_explicit_integration": True, "canonical_write_performed": False,
        }
        return candidate

    def pack_compatibility(self) -> dict[str, str]:
        return {
            "schema": PACK_COMPAT_SCHEMA,
            "content_pack_schema": CONTENT_PACK_SCHEMA,
            "content_schema_version": CONTENT_SCHEMA_VERSION,
            "constructor_draft_schema": DRAFT_SCHEMA,
        }

    def create_snapshot(self, draft_id: str, label: str = "") -> dict[str, Any]:
        draft = self.load_draft(draft_id)
        label = self._label(label)
        snapshot = self._snapshot_from_draft(draft, label=label)
        return copy.deepcopy(snapshot)

    def list_snapshots(self, draft_id: str) -> list[dict[str, Any]]:
        self._validate_id(draft_id, "draft id")
        out: list[dict[str, Any]] = []
        for key in self.store.list_keys("authoring_snapshots"):
            value = self.store.get_json("authoring_snapshots", key, {}) or {}
            if value.get("draft_id") != draft_id:
                continue
            out.append({
                "snapshot_id": value.get("snapshot_id", key),
                "draft_id": draft_id,
                "draft_revision": value.get("draft_revision"),
                "created_at": value.get("created_at"),
                "label": value.get("label", ""),
            })
        return sorted(out, key=lambda row: (int(row.get("created_at") or 0), str(row.get("snapshot_id"))))

    def restore_snapshot(self, draft_id: str, snapshot_id: str) -> dict[str, Any]:
        current = self.load_draft(draft_id)
        snapshot = self._load_snapshot(draft_id, snapshot_id)
        self._snapshot_from_draft(current, label="Automatic safety snapshot before snapshot restore")
        self._remember_for_undo(draft_id, current)
        return self._restore_draft(current, snapshot["draft"], "restore_snapshot", snapshot_id)

    def diff_draft(self, draft_id: str, from_snapshot_id: str,
                   to_snapshot_id: str | None = None) -> dict[str, Any]:
        left = self._load_snapshot(draft_id, from_snapshot_id)["draft"]
        if to_snapshot_id:
            right = self._load_snapshot(draft_id, to_snapshot_id)["draft"]
            right_ref = to_snapshot_id
        else:
            right = self.load_draft(draft_id)
            right_ref = "CURRENT"
        paths: list[str] = []
        self._diff_paths(left, right, "$", paths)
        return {
            "schema": "scripture.authoring-diff.v1",
            "draft_id": draft_id,
            "from": from_snapshot_id,
            "to": right_ref,
            "changed": bool(paths),
            "changed_paths": paths,
            "truncated": len(paths) >= MAX_DIFF_PATHS,
        }

    def history(self, draft_id: str) -> dict[str, Any]:
        draft = self.load_draft(draft_id)
        state = self._history_state(draft_id)
        return {
            "schema": HISTORY_SCHEMA,
            "draft_id": draft_id,
            "revision": draft.get("revision", 1),
            "can_undo": bool(state["undo"]),
            "can_redo": bool(state["redo"]),
            "change_record": self._json_copy(draft.get("change_record", [])),
            "snapshots": self.list_snapshots(draft_id),
            "versions": self.list_versions(draft_id),
        }

    def undo(self, draft_id: str) -> dict[str, Any]:
        current = self.load_draft(draft_id)
        state = self._history_state(draft_id)
        if not state["undo"]:
            raise ValueError("nothing to undo")
        target = state["undo"].pop()
        state["redo"].append(self._json_copy(current))
        state["redo"] = state["redo"][-MAX_HISTORY_DEPTH:]
        self._write_history(draft_id, state)
        return self._restore_draft(current, target, "undo")

    def redo(self, draft_id: str) -> dict[str, Any]:
        current = self.load_draft(draft_id)
        state = self._history_state(draft_id)
        if not state["redo"]:
            raise ValueError("nothing to redo")
        target = state["redo"].pop()
        state["undo"].append(self._json_copy(current))
        state["undo"] = state["undo"][-MAX_HISTORY_DEPTH:]
        self._write_history(draft_id, state)
        return self._restore_draft(current, target, "redo")

    def publish_version(self, draft_id: str, compatibility: Any) -> dict[str, Any]:
        draft = self.load_draft(draft_id)
        compat = self._validate_pack_compatibility(compatibility)
        candidate = self.prepare_publish_candidate(draft)
        version_id = "version-" + self.id_factory()
        self._validate_id(version_id, "version id")
        version = {
            "schema": VERSION_SCHEMA,
            "version_id": version_id,
            "draft_id": draft_id,
            "draft_revision": draft.get("revision", 1),
            "created_at": int(self.clock()),
            "kind": draft.get("kind", "node"),
            "stable_identity": identity(draft.get("kind", "node"), draft.get(draft.get("kind", "node")) or {}),
            "compatibility": compat,
            "candidate": candidate,
            "canonical_mutation_performed": False,
            "requires_explicit_integration": True,
        }
        self.store.put_json("authoring_versions", version_id, version)
        return copy.deepcopy(version)

    def list_versions(self, draft_id: str) -> list[dict[str, Any]]:
        self._validate_id(draft_id, "draft id")
        out: list[dict[str, Any]] = []
        for key in self.store.list_keys("authoring_versions"):
            value = self.store.get_json("authoring_versions", key, {}) or {}
            if value.get("draft_id") != draft_id:
                continue
            out.append({
                "version_id": value.get("version_id", key),
                "draft_id": draft_id,
                "draft_revision": value.get("draft_revision"),
                "created_at": value.get("created_at"),
                "kind": value.get("kind"),
                "stable_identity": value.get("stable_identity"),
                "compatibility": self._json_copy(value.get("compatibility", {})),
                "canonical_mutation_performed": False,
            })
        return sorted(out, key=lambda row: (int(row.get("created_at") or 0), str(row.get("version_id"))))

    def rollback_version(self, draft_id: str, version_id: str) -> dict[str, Any]:
        current = self.load_draft(draft_id)
        version = self._load_version(draft_id, version_id)
        target = self._json_copy(version.get("candidate") or {})
        if target.get("draft_id") != draft_id:
            raise ValueError("version draft identity mismatch")
        self._snapshot_from_draft(current, label="Automatic safety snapshot before version rollback")
        self._remember_for_undo(draft_id, current)
        target.pop("publish_manifest", None)
        target.pop("publish_change_record", None)
        target.pop("canonical_mutation_performed", None)
        return self._restore_draft(current, target, "rollback_version", version_id)

    def export_draft(self, draft_id: str) -> str:
        return json.dumps(self.load_draft(draft_id), ensure_ascii=False, indent=2) + "\n"

    def import_draft(self, text: str) -> dict[str, Any]:
        if not isinstance(text, str) or len(text.encode("utf-8")) > MAX_IMPORT_BYTES:
            raise ValueError("draft import exceeds size limit")
        obj = json.loads(text)
        if not isinstance(obj, dict) or obj.get("draft_schema") != DRAFT_SCHEMA:
            raise ValueError("invalid imported draft")
        obj = self._envelope(obj)
        now = int(self.clock())
        obj["draft_id"] = "draft-" + self.id_factory()
        obj["status"] = "DRAFT"
        obj["revision"] = 1
        obj["created_at"] = obj["updated_at"] = now
        obj["change_record"] = [{"timestamp": now, "action": "import_data_only"}]
        self._protect_identity(obj)
        self.store.put_json("drafts", obj["draft_id"], obj)
        return copy.deepcopy(obj)

    def _envelope(self, draft: Any) -> dict[str, Any]:
        if not isinstance(draft, dict) or draft.get("draft_schema") != DRAFT_SCHEMA:
            raise ValueError("invalid draft schema")
        out = self._json_copy(draft)
        self._validate_id(out.get("draft_id"), "draft id")
        out["kind"] = self._kind(str(out.get("kind", "node")))
        out["title"] = self._title(str(out.get("title", "")))
        for key in KINDS:
            if not isinstance(out.get(key), dict):
                raise ValueError(f"{key} must be an object")
        return out

    def _history_state(self, draft_id: str) -> dict[str, Any]:
        self._validate_id(draft_id, "draft id")
        state = self.store.get_json("authoring_history", draft_id, None)
        if state is None:
            return {"schema": HISTORY_SCHEMA, "draft_id": draft_id, "undo": [], "redo": []}
        if not isinstance(state, dict) or state.get("schema") != HISTORY_SCHEMA or state.get("draft_id") != draft_id:
            raise ValueError("invalid persisted authoring history")
        undo = state.get("undo")
        redo = state.get("redo")
        if not isinstance(undo, list) or not isinstance(redo, list):
            raise ValueError("invalid persisted authoring history")
        return self._json_copy(state)

    def _write_history(self, draft_id: str, state: dict[str, Any]) -> None:
        state = self._json_copy(state)
        state.update({"schema": HISTORY_SCHEMA, "draft_id": draft_id})
        state["undo"] = list(state.get("undo", []))[-MAX_HISTORY_DEPTH:]
        state["redo"] = list(state.get("redo", []))[-MAX_HISTORY_DEPTH:]
        self.store.put_json("authoring_history", draft_id, state)

    def _remember_for_undo(self, draft_id: str, prior: dict[str, Any]) -> None:
        state = self._history_state(draft_id)
        state["undo"].append(self._json_copy(prior))
        state["undo"] = state["undo"][-MAX_HISTORY_DEPTH:]
        state["redo"] = []
        self._write_history(draft_id, state)

    def _restore_draft(self, current: dict[str, Any], target: Any,
                       action: str, reference_id: str | None = None) -> dict[str, Any]:
        target = self._envelope(target)
        if target["draft_id"] != current["draft_id"]:
            raise ValueError("restore draft identity mismatch")
        out = self._json_copy(target)
        now = int(self.clock())
        out["status"] = "DRAFT"
        out["created_at"] = int(current.get("created_at", now))
        out["updated_at"] = now
        out["revision"] = int(current.get("revision", 1)) + 1
        out["base_identity"] = current.get("base_identity") or out.get("base_identity")
        record = {"timestamp": now, "action": action, "revision": out["revision"]}
        if reference_id:
            record["reference_id"] = reference_id
        out.setdefault("change_record", []).append(record)
        self._protect_identity(out)
        self.store.put_json("drafts", out["draft_id"], out)
        return copy.deepcopy(out)

    def _snapshot_from_draft(self, draft: dict[str, Any], *, label: str) -> dict[str, Any]:
        snapshot_id = "snapshot-" + self.id_factory()
        self._validate_id(snapshot_id, "snapshot id")
        snapshot = {
            "schema": SNAPSHOT_SCHEMA,
            "snapshot_id": snapshot_id,
            "draft_id": draft["draft_id"],
            "draft_revision": draft.get("revision", 1),
            "created_at": int(self.clock()),
            "label": self._label(label),
            "draft": self._json_copy(draft),
        }
        self.store.put_json("authoring_snapshots", snapshot_id, snapshot)
        return snapshot

    def _load_snapshot(self, draft_id: str, snapshot_id: str) -> dict[str, Any]:
        self._validate_id(draft_id, "draft id")
        self._validate_id(snapshot_id, "snapshot id")
        value = self.store.get_json("authoring_snapshots", snapshot_id)
        if not isinstance(value, dict) or value.get("schema") != SNAPSHOT_SCHEMA:
            raise ValueError("snapshot not found")
        if value.get("draft_id") != draft_id:
            raise ValueError("snapshot belongs to another draft")
        return self._json_copy(value)

    def _load_version(self, draft_id: str, version_id: str) -> dict[str, Any]:
        self._validate_id(draft_id, "draft id")
        self._validate_id(version_id, "version id")
        value = self.store.get_json("authoring_versions", version_id)
        if not isinstance(value, dict) or value.get("schema") != VERSION_SCHEMA:
            raise ValueError("version not found")
        if value.get("draft_id") != draft_id:
            raise ValueError("version belongs to another draft")
        if value.get("compatibility") != self.pack_compatibility():
            raise ValueError("version pack compatibility no longer matches this runtime")
        return self._json_copy(value)

    def _validate_pack_compatibility(self, value: Any) -> dict[str, str]:
        expected = self.pack_compatibility()
        if not isinstance(value, dict) or value != expected:
            raise ValueError("pack compatibility mismatch; refresh Constructor compatibility before publish")
        return self._json_copy(expected)

    def _diff_paths(self, left: Any, right: Any, path: str, out: list[str]) -> None:
        if len(out) >= MAX_DIFF_PATHS:
            return
        if type(left) is not type(right):
            out.append(path)
            return
        if isinstance(left, dict):
            for key in sorted(set(left) | set(right)):
                if len(out) >= MAX_DIFF_PATHS:
                    return
                child = f"{path}.{key}"
                if key not in left or key not in right:
                    out.append(child)
                else:
                    self._diff_paths(left[key], right[key], child, out)
            return
        if isinstance(left, list):
            if len(left) != len(right):
                out.append(f"{path}.length")
            for index, (a, b) in enumerate(zip(left, right)):
                if len(out) >= MAX_DIFF_PATHS:
                    return
                self._diff_paths(a, b, f"{path}[{index}]", out)
            return
        if left != right:
            out.append(path)

    @staticmethod
    def _protect_identity(draft: dict[str, Any]) -> None:
        errors = identity_errors(draft)
        if errors:
            raise ValueError(errors[0])

    @staticmethod
    def _kind(kind: str) -> str:
        kind = kind.lower().strip()
        if kind not in KINDS:
            raise ValueError("kind must be campaign, mission or node")
        return kind

    @staticmethod
    def _title(title: str) -> str:
        title = title.strip()
        if not title or len(title) > 300:
            raise ValueError("title must be 1..300 characters")
        return title

    @staticmethod
    def _label(label: Any) -> str:
        if not isinstance(label, str):
            raise ValueError("snapshot label must be text")
        label = label.strip()
        if len(label) > 160:
            raise ValueError("snapshot label must be at most 160 characters")
        return label

    @staticmethod
    def _validate_id(value: Any, label: str) -> None:
        if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9._-]{1,80}", value):
            raise ValueError(f"invalid {label}")

    @staticmethod
    def _json_copy(value: Any) -> Any:
        try:
            return json.loads(json.dumps(value, ensure_ascii=False))
        except (TypeError, ValueError) as exc:
            raise ValueError("authoring data must be JSON-safe") from exc

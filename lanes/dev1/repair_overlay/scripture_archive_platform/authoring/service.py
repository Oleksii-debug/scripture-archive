from __future__ import annotations

import copy
import json
import re
import time
import uuid
from typing import Any, Callable

from scripture_archive_platform.transport.contracts import MAX_IMPORT_BYTES
from .model import (
    CHANGE_RECORD_SCHEMA, DRAFT_SCHEMA, KINDS, PUBLISH_SCHEMA,
    blank_campaign, blank_mission, blank_node,
)
from .validation import identity, identity_errors, publish_blockers, validate_draft


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
        self.store.put_json("drafts", out["draft_id"], out)
        return copy.deepcopy(out)

    def delete_draft(self, draft_id: str) -> dict[str, Any]:
        self.load_draft(draft_id)
        self.store.delete("drafts", draft_id)
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

    def export_draft(self, draft_id: str) -> str:
        return json.dumps(self.load_draft(draft_id), ensure_ascii=False, indent=2) + "\n"

    def import_draft(self, text: str) -> dict[str, Any]:
        if not isinstance(text, str) or len(text.encode("utf-8")) > MAX_IMPORT_BYTES:
            raise ValueError("draft import exceeds size limit")
        obj = json.loads(text)
        if not isinstance(obj, dict) or obj.get("draft_schema") != DRAFT_SCHEMA:
            raise ValueError("invalid imported draft")
        obj = self._json_copy(obj)
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
    def _validate_id(value: Any, label: str) -> None:
        if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9._-]{1,80}", value):
            raise ValueError(f"invalid {label}")

    @staticmethod
    def _json_copy(value: Any) -> Any:
        try:
            return json.loads(json.dumps(value, ensure_ascii=False))
        except (TypeError, ValueError) as exc:
            raise ValueError("authoring data must be JSON-safe") from exc

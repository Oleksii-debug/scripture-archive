from __future__ import annotations

import copy
import json
import re
import time
import uuid
from dataclasses import asdict, dataclass
from typing import Any, Callable

DRAFT_SCHEMA = "scripture.authoring.draft.v1"
EXPORT_SCHEMA = "scripture.authoring.export.v1"
PUBLISH_CANDIDATE_SCHEMA = "scripture.authoring.publish-candidate.v1"
CHANGE_RECORD_SCHEMA = "scripture.authoring.change-record.v1"
CONTENT_SCHEMA_VERSION = "CONTENT_NODE_SCHEMA_v1.2"
MAX_IMPORT_BYTES = 1_048_576
MAX_COLLECTION_ITEMS = 500
MAX_STRING_CHARS = 100_000
KINDS = {"campaign", "mission", "node"}
CONFIDENCE_CODES = {"T1", "T2", "C1", "I1", "D1"}
TEXTUAL_VARIANT_FLAGS = {"none", "TX1"}
EVIDENCE_STRENGTH = {"recognition", "recall", "application", "synthesis"}

CAMPAIGN_REQUIRED = (
    "campaign_id", "title_ua", "scope", "player_promise", "estimated_total_time",
    "entry_requirements", "mission_sequence", "mastery_domains", "source_corpus",
    "theological_risk_notes", "accessibility_risk_notes", "completion_reward_type",
    "editorial_status", "source_audit_status",
)
MISSION_REQUIRED = (
    "mission_id", "campaign_id", "title", "mission_role", "estimated_time", "difficulty",
    "learning_objectives", "mastery_tags", "retrieval_targets", "future_repetition_hooks",
    "primary_scripture", "secondary_scripture", "historical_context_sources",
    "interpretive_sources", "source_classification_notes", "disputed_points",
    "textual_variant_points", "opening_brief", "case_question", "known_facts_at_start",
    "unknowns_to_resolve", "completion_synthesis", "entry_node", "task_nodes",
    "optional_nodes", "failure_recovery_routes", "completion_conditions",
    "perfect_investigation_conditions", "accessibility",
)
NODE_REQUIRED = (
    "node_id", "mission_id", "task_family", "difficulty", "required", "skill_target",
    "knowledge_target", "why_this_node_exists", "player_prompt",
    "source_scope_visible_to_player", "response_mode", "accepted_answer",
    "accepted_variants", "required_evidence", "rejected_answers", "rejection_reason",
    "confidence_code", "textual_variant_flag", "success_feedback", "partial_feedback",
    "failure_feedback", "hints", "on_hint_threshold", "on_correct", "on_partial",
    "on_incorrect", "optional_evidence_unlock", "later_retrieval_effect",
    "mastery_domains", "evidence_strength", "mastery_mode", "spaced_retrieval",
    "review_queue_rule", "functional_nonvisual_equivalent",
)

_ID_RE = re.compile(r"^[A-Z][A-Z0-9_-]{1,63}$")
_HINT_KEYS = tuple(f"H{i}" for i in range(1, 8))


class AuthoringError(ValueError):
    pass


@dataclass(frozen=True)
class ValidationIssue:
    code: str
    field: str
    message: str
    severity: str = "error"

    def as_dict(self) -> dict[str, str]:
        return asdict(self)


class AuthoringService:
    """Versioned data-only constructor domain; never writes canonical repository files."""

    def __init__(
        self,
        store: Any,
        task_types: Any,
        mapper: Any,
        *,
        clock: Callable[[], float] = time.time,
        id_factory: Callable[[], str] | None = None,
    ) -> None:
        self.store = store
        self.task_types = task_types
        self.mapper = mapper
        self.clock = clock
        self.id_factory = id_factory or (lambda: uuid.uuid4().hex[:16])

    def list_drafts(self) -> list[dict[str, Any]]:
        out = []
        for draft_id, draft in self._all_drafts().items():
            out.append({
                "draft_id": draft_id,
                "kind": draft.get("kind"),
                "title": draft.get("title"),
                "revision": draft.get("revision"),
                "status": draft.get("status"),
                "updated_at": draft.get("updated_at"),
                "record_id": self._record_id(draft.get("kind"), draft.get("record") or {}),
            })
        return sorted(out, key=lambda x: (-(int(x.get("updated_at") or 0)), x["draft_id"]))

    def new_draft(self, title: str, kind: str = "node") -> dict[str, Any]:
        kind = self._kind(kind)
        title = self._clean_title(title)
        now = int(self.clock())
        draft = {
            "draft_schema": DRAFT_SCHEMA,
            "draft_id": f"DRAFT-{self.id_factory()}",
            "kind": kind,
            "title": title,
            "revision": 1,
            "status": "DRAFT",
            "base_identity": None,
            "record": self._blank_record(kind),
            "created_at": now,
            "updated_at": now,
        }
        self._put_draft(draft)
        return copy.deepcopy(draft)

    def load_draft(self, draft_id: str) -> dict[str, Any]:
        draft = self._all_drafts().get(self._draft_id(draft_id))
        if not isinstance(draft, dict):
            raise AuthoringError(f"unknown draft_id {draft_id!r}")
        return copy.deepcopy(draft)

    def save_draft(self, draft: Any) -> dict[str, Any]:
        draft = self._draft_envelope(draft)
        existing = self._all_drafts().get(draft["draft_id"])
        now = int(self.clock())
        if existing:
            if int(draft.get("revision") or 0) != int(existing.get("revision") or 0):
                raise AuthoringError("stale draft revision; reload before saving")
            created_at = int(existing.get("created_at") or now)
            revision = int(existing.get("revision") or 0) + 1
            base_identity = existing.get("base_identity") or draft.get("base_identity")
        else:
            created_at = int(draft.get("created_at") or now)
            revision = max(1, int(draft.get("revision") or 1))
            base_identity = draft.get("base_identity")
        saved = copy.deepcopy(draft)
        saved.update({
            "draft_schema": DRAFT_SCHEMA,
            "revision": revision,
            "created_at": created_at,
            "updated_at": now,
            "status": "DRAFT",
            "base_identity": base_identity,
        })
        self._protect_base_identity(saved)
        self._put_draft(saved)
        return copy.deepcopy(saved)

    def delete_draft(self, draft_id: str) -> dict[str, Any]:
        draft_id = self._draft_id(draft_id)
        drafts = self._all_drafts()
        if draft_id not in drafts:
            raise AuthoringError(f"unknown draft_id {draft_id!r}")
        removed = drafts.pop(draft_id)
        self.store.put_json("authoring", "drafts", drafts)
        return {
            "draft_id": draft_id,
            "deleted": True,
            "record_id": self._record_id(removed.get("kind"), removed.get("record") or {}),
        }

    def fork_record(self, kind: str, record: dict[str, Any], title: str | None = None) -> dict[str, Any]:
        kind = self._kind(kind)
        if not isinstance(record, dict):
            raise AuthoringError("record must be object")
        draft = self.new_draft(title or self._record_id(kind, record) or f"Редагування {kind}", kind)
        draft["record"] = copy.deepcopy(record)
        draft["base_identity"] = self._record_id(kind, record)
        return self.save_draft(draft)

    def set_field(self, draft_id: str, path: str, value: Any) -> dict[str, Any]:
        draft = self.load_draft(draft_id)
        parts = self._path(path)
        if parts[0] != "record":
            raise AuthoringError("authoring field path must begin with record")
        self._set_path(draft, parts, self._safe_json(value))
        return self.save_draft(draft)

    def add_collection_item(self, draft_id: str, path: str, item: Any, index: int | None = None) -> dict[str, Any]:
        draft = self.load_draft(draft_id)
        collection = self._collection(draft, path)
        if len(collection) >= MAX_COLLECTION_ITEMS:
            raise AuthoringError("collection item limit exceeded")
        item = self._safe_json(item)
        if index is None:
            collection.append(item)
        else:
            collection.insert(self._index(index, len(collection), allow_end=True), item)
        return self.save_draft(draft)

    def remove_collection_item(self, draft_id: str, path: str, index: int) -> dict[str, Any]:
        draft = self.load_draft(draft_id)
        self._collection(draft, path).pop(self._index(index, len(self._collection(draft, path))))
        return self.save_draft(draft)

    def move_collection_item(self, draft_id: str, path: str, index: int, direction: str) -> dict[str, Any]:
        """Keyboard-linear reorder primitive used by Move up / Move down controls."""
        draft = self.load_draft(draft_id)
        collection = self._collection(draft, path)
        index = self._index(index, len(collection))
        if direction not in {"up", "down"}:
            raise AuthoringError("direction must be up or down")
        target = index - 1 if direction == "up" else index + 1
        if target < 0 or target >= len(collection):
            return draft
        collection[index], collection[target] = collection[target], collection[index]
        return self.save_draft(draft)

    def validate_draft(self, draft: Any) -> dict[str, Any]:
        draft = self._draft_envelope(draft)
        issues = self._validate_record(draft["kind"], draft["record"], draft.get("base_identity"))
        return {
            "valid": not any(x.severity == "error" for x in issues),
            "draft_id": draft["draft_id"],
            "kind": draft["kind"],
            "content_schema": CONTENT_SCHEMA_VERSION if draft["kind"] == "node" else None,
            "issues": [x.as_dict() for x in issues],
        }

    def preview(self, draft: Any) -> dict[str, Any]:
        draft = self._draft_envelope(draft)
        validation = self.validate_draft(draft)
        if draft["kind"] == "node":
            record = copy.deepcopy(draft["record"])
            previewable = not any(
                i["field"] in {"node_id", "mission_id", "task_type"}
                for i in validation["issues"] if i["severity"] == "error"
            )
            renderable = self.mapper.to_renderable(record, None) if previewable else None
            return {
                "preview_schema": "scripture.authoring.preview.v1",
                "kind": "node",
                "valid_for_publish": validation["valid"],
                "renderable": renderable,
                "validation": validation,
                "focus_target": "authoring-preview-heading",
                "announcement": "Попередній перегляд готовий." if validation["valid"] else "Попередній перегляд оновлено. Перевірте помилки перед публікацією.",
            }
        return {
            "preview_schema": "scripture.authoring.preview.v1",
            "kind": draft["kind"],
            "valid_for_publish": validation["valid"],
            "record": copy.deepcopy(draft["record"]),
            "validation": validation,
            "focus_target": "authoring-preview-heading",
            "announcement": "Попередній перегляд готовий." if validation["valid"] else "Попередній перегляд містить помилки.",
        }

    def prepare_publish_candidate(self, draft: Any) -> dict[str, Any]:
        draft = self._draft_envelope(draft)
        validation = self.validate_draft(draft)
        if not validation["valid"]:
            raise AuthoringError("draft is not publishable; resolve validation issues first")
        now = int(self.clock())
        record = copy.deepcopy(draft["record"])
        identity = self._record_id(draft["kind"], record)
        change_record = {
            "schema": CHANGE_RECORD_SCHEMA,
            "change_id": f"CHANGE-{self.id_factory()}",
            "kind": "CREATE" if not draft.get("base_identity") else "REPLACE_VERSION",
            "content_kind": draft["kind"],
            "stable_identity": identity,
            "base_identity": draft.get("base_identity"),
            "draft_id": draft["draft_id"],
            "draft_revision": draft["revision"],
            "created_at": now,
            "canonical_write_performed": False,
            "requires_explicit_integration": True,
            "requires_source_audit_for_answer_bearing_changes": draft["kind"] == "node",
        }
        return {
            "schema": PUBLISH_CANDIDATE_SCHEMA,
            "content_schema": CONTENT_SCHEMA_VERSION if draft["kind"] == "node" else None,
            "kind": draft["kind"],
            "stable_identity": identity,
            "record": record,
            "change_record": change_record,
            "validation": validation,
            "canonical_write_performed": False,
        }

    def export_draft(self, draft_id: str) -> str:
        return json.dumps(
            {"schema": EXPORT_SCHEMA, "draft": self.load_draft(draft_id)},
            ensure_ascii=False,
            sort_keys=True,
            indent=2,
        )

    def import_draft(self, text: str) -> dict[str, Any]:
        if not isinstance(text, str):
            raise AuthoringError("import must be UTF-8 JSON text")
        if len(text.encode("utf-8")) > MAX_IMPORT_BYTES:
            raise AuthoringError("import exceeds size limit")
        payload = json.loads(text)
        if not isinstance(payload, dict):
            raise AuthoringError("import root must be object")
        incoming = payload.get("draft") if payload.get("schema") == EXPORT_SCHEMA else payload
        incoming = self._draft_envelope(incoming)
        incoming["draft_id"] = f"DRAFT-{self.id_factory()}"
        incoming["revision"] = 1
        incoming["status"] = "DRAFT"
        incoming["created_at"] = int(self.clock())
        incoming["updated_at"] = incoming["created_at"]
        self._protect_base_identity(incoming)
        self._put_draft(incoming)
        return copy.deepcopy(incoming)

    def new_node_from_task_type(self, title: str, task_type: str) -> dict[str, Any]:
        if task_type not in self.task_types:
            raise AuthoringError(f"unknown task type {task_type!r}")
        draft = self.new_draft(title, "node")
        draft["record"]["task_type"] = task_type
        draft["record"]["response_mode"] = task_type.lower()
        if task_type in {"SINGLE_CHOICE", "MULTI_SELECT", "COMBOBOX_SELECT", "PARALLEL_WITNESS_COMPARE"}:
            draft["record"]["ui_metadata"] = {"options": []}
        elif task_type == "ORDERING":
            draft["record"]["ui_metadata"] = {"items": []}
        elif task_type == "MATCHING":
            draft["record"]["ui_metadata"] = {"pairs": []}
        elif task_type in {"EVIDENCE_SELECT", "CLAIM_EVIDENCE"}:
            draft["record"]["ui_metadata"] = {"evidence_options": []}
        elif task_type == "COMPOSITE_MULTI_STEP":
            draft["record"]["ui_metadata"] = {"steps": []}
        return self.save_draft(draft)

    def _all_drafts(self) -> dict[str, dict[str, Any]]:
        value = self.store.get_json("authoring", "drafts", {}) or {}
        if not isinstance(value, dict):
            raise AuthoringError("authoring draft store is corrupt")
        return copy.deepcopy(value)

    def _put_draft(self, draft: dict[str, Any]) -> None:
        drafts = self._all_drafts()
        drafts[draft["draft_id"]] = copy.deepcopy(draft)
        self.store.put_json("authoring", "drafts", drafts)

    def _draft_envelope(self, draft: Any) -> dict[str, Any]:
        if not isinstance(draft, dict):
            raise AuthoringError("draft must be object")
        out = self._safe_json(draft)
        if out.get("draft_schema") not in {None, DRAFT_SCHEMA}:
            raise AuthoringError("unsupported draft schema")
        out["draft_schema"] = DRAFT_SCHEMA
        out["draft_id"] = self._draft_id(str(out.get("draft_id") or ""))
        out["kind"] = self._kind(str(out.get("kind") or ""))
        out["title"] = self._clean_title(str(out.get("title") or ""))
        if not isinstance(out.get("record"), dict):
            raise AuthoringError("draft record must be object")
        out.setdefault("revision", 1)
        out.setdefault("status", "DRAFT")
        out.setdefault("base_identity", None)
        return out

    def _validate_record(self, kind: str, record: dict[str, Any], base_identity: Any) -> list[ValidationIssue]:
        required = {"campaign": CAMPAIGN_REQUIRED, "mission": MISSION_REQUIRED, "node": NODE_REQUIRED}[kind]
        issues: list[ValidationIssue] = []
        for field in required:
            if field not in record:
                issues.append(ValidationIssue("REQUIRED_FIELD", field, "Поле є обов'язковим і не може бути пропущене."))
            elif self._empty(record[field]) and field not in {
                "secondary_scripture", "historical_context_sources", "interpretive_sources",
                "textual_variant_points", "optional_evidence_unlock",
            }:
                issues.append(ValidationIssue("EMPTY_FIELD", field, "Обов'язкове поле не може бути порожнім."))
        identity = self._record_id(kind, record)
        id_field = {"campaign": "campaign_id", "mission": "mission_id", "node": "node_id"}[kind]
        if identity and not _ID_RE.fullmatch(identity):
            issues.append(ValidationIssue("INVALID_STABLE_ID", id_field, "Stable ID має бути platform/translation-neutral ASCII identifier."))
        if base_identity and identity and base_identity != identity:
            issues.append(ValidationIssue("STABLE_ID_IMMUTABLE", id_field, "Stable ID існуючого canonical record не можна змінювати через authoring edit."))
        if kind == "node":
            issues.extend(self._validate_node(record))
        return issues

    def _validate_node(self, record: dict[str, Any]) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        task_type = record.get("task_type")
        if not isinstance(task_type, str) or task_type not in self.task_types:
            issues.append(ValidationIssue("TASK_TYPE", "task_type", "Оберіть task type з TaskTypeRegistry."))
        if record.get("confidence_code") not in CONFIDENCE_CODES:
            issues.append(ValidationIssue("CONFIDENCE", "confidence_code", "Дозволені лише T1/T2/C1/I1/D1."))
        if record.get("textual_variant_flag") not in TEXTUAL_VARIANT_FLAGS:
            issues.append(ValidationIssue("TX1_FLAG", "textual_variant_flag", "TX1 є окремим textual-variant flag; використайте TX1 або none."))
        hints = record.get("hints")
        if not isinstance(hints, dict):
            issues.append(ValidationIssue("HINTS", "hints", "Hints мають бути object H1…H7."))
        else:
            for key in _HINT_KEYS:
                if not str(hints.get(key) or "").strip():
                    issues.append(ValidationIssue("HINT_MISSING", f"hints.{key}", f"{key} має бути явною підказкою; H7 розкриває guided model."))
        for field in ("on_correct", "on_partial", "on_incorrect", "on_hint_threshold", "optional_evidence_unlock", "later_retrieval_effect"):
            if field in record and record[field] is None:
                issues.append(ValidationIssue("EXPLICIT_BRANCH", field, "Branch має бути explicit; використайте none/return_to_current_node якщо не застосовується."))
        strengths = record.get("evidence_strength")
        if isinstance(strengths, str):
            strengths = [strengths]
        if not isinstance(strengths, list) or any(x not in EVIDENCE_STRENGTH for x in strengths):
            issues.append(ValidationIssue("EVIDENCE_STRENGTH", "evidence_strength", "Дозволено recognition/recall/application/synthesis."))
        if record.get("spaced_retrieval") not in {"yes", "no", True, False}:
            issues.append(ValidationIssue("SPACED_RETRIEVAL", "spaced_retrieval", "Вкажіть yes/no (або boolean)."))
        if len(str(record.get("functional_nonvisual_equivalent") or "").strip()) < 20:
            issues.append(ValidationIssue("ACCESSIBILITY_EQUIVALENT", "functional_nonvisual_equivalent", "Потрібен функціональний keyboard/nonvisual equivalent."))
        ui = record.get("ui_metadata") if isinstance(record.get("ui_metadata"), dict) else {}
        if task_type in {"SINGLE_CHOICE", "MULTI_SELECT", "COMBOBOX_SELECT", "PARALLEL_WITNESS_COMPARE"}:
            if not isinstance(ui.get("options"), list) or not ui.get("options"):
                issues.append(ValidationIssue("OPTIONS_REQUIRED", "ui_metadata.options", "Цей task type потребує декларативних options."))
        if task_type == "ORDERING":
            if not isinstance(ui.get("items"), list) or len(ui.get("items") or []) < 2:
                issues.append(ValidationIssue("ORDER_ITEMS", "ui_metadata.items", "Ordering потребує щонайменше 2 items і Move up/down keyboard contract."))
        return issues

    @staticmethod
    def _blank_record(kind: str) -> dict[str, Any]:
        if kind == "campaign":
            record = {k: "" for k in CAMPAIGN_REQUIRED}
            for key in ("entry_requirements", "mission_sequence", "mastery_domains", "source_corpus"):
                record[key] = []
            return record
        if kind == "mission":
            record = {k: "" for k in MISSION_REQUIRED}
            for key in (
                "learning_objectives", "mastery_tags", "retrieval_targets", "future_repetition_hooks",
                "primary_scripture", "known_facts_at_start", "unknowns_to_resolve", "task_nodes",
                "optional_nodes", "failure_recovery_routes", "completion_conditions",
            ):
                record[key] = []
            record.update({
                "secondary_scripture": "none",
                "historical_context_sources": "none",
                "interpretive_sources": "none",
                "textual_variant_points": "none",
                "perfect_investigation_conditions": "not used",
                "accessibility": {"keyboard_complete": True, "nonvisual_equivalent": ""},
            })
            return record
        record = {k: "" for k in NODE_REQUIRED}
        record.update({
            "required": True,
            "accepted_variants": [],
            "required_evidence": [],
            "rejected_answers": [],
            "hints": {k: "" for k in _HINT_KEYS},
            "on_correct": "none",
            "on_partial": "return_to_current_node",
            "on_incorrect": "return_to_current_node",
            "on_hint_threshold": "guided_then_follow_on_correct",
            "optional_evidence_unlock": "none",
            "later_retrieval_effect": "REVIEW_QUEUE",
            "mastery_domains": [],
            "evidence_strength": ["recognition"],
            "mastery_mode": "independent",
            "spaced_retrieval": "yes",
            "review_queue_rule": "REVIEW_QUEUE",
            "confidence_code": "T1",
            "textual_variant_flag": "none",
            "functional_nonvisual_equivalent": "Keyboard-complete labelled linear flow with textual result, evidence, confidence/TX1 and next action.",
            "task_type": "SHORT_TEXT",
            "ui_metadata": {},
            "visual_metadata": {},
        })
        return record

    @staticmethod
    def _empty(value: Any) -> bool:
        return value == "" or value == [] or value == {} or value is None

    @staticmethod
    def _safe_json(value: Any) -> Any:
        try:
            encoded = json.dumps(value, ensure_ascii=False)
            if len(encoded) > MAX_STRING_CHARS * 20:
                raise AuthoringError("authoring payload too large")
            return json.loads(encoded)
        except (TypeError, ValueError) as exc:
            if isinstance(exc, AuthoringError):
                raise
            raise AuthoringError("authoring data must be JSON-safe; executable objects are forbidden") from exc

    @staticmethod
    def _kind(kind: str) -> str:
        kind = kind.strip().lower()
        if kind not in KINDS:
            raise AuthoringError("kind must be campaign, mission or node")
        return kind

    @staticmethod
    def _clean_title(title: str) -> str:
        title = title.strip()
        if not title or len(title) > 300:
            raise AuthoringError("title must be 1..300 characters")
        return title

    @staticmethod
    def _draft_id(value: str) -> str:
        if not re.fullmatch(r"DRAFT-[A-Za-z0-9_-]{4,80}", value):
            raise AuthoringError("invalid draft_id")
        return value

    @staticmethod
    def _record_id(kind: Any, record: dict[str, Any]) -> str | None:
        key = {"campaign": "campaign_id", "mission": "mission_id", "node": "node_id"}.get(kind)
        value = record.get(key) if key else None
        return str(value) if value else None

    def _protect_base_identity(self, draft: dict[str, Any]) -> None:
        base = draft.get("base_identity")
        current = self._record_id(draft.get("kind"), draft.get("record") or {})
        if base and current and base != current:
            raise AuthoringError("stable canonical identity cannot be changed")

    @staticmethod
    def _path(path: str) -> list[str]:
        if not isinstance(path, str):
            raise AuthoringError("field path must be string")
        parts = path.split(".")
        if not 2 <= len(parts) <= 8 or any(not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", p) for p in parts):
            raise AuthoringError("invalid field path")
        return parts

    @staticmethod
    def _set_path(root: dict[str, Any], parts: list[str], value: Any) -> None:
        target = root
        for part in parts[:-1]:
            current = target.get(part)
            if current is None:
                current = {}
                target[part] = current
            if not isinstance(current, dict):
                raise AuthoringError("field path traverses non-object value")
            target = current
        target[parts[-1]] = value

    def _collection(self, draft: dict[str, Any], path: str) -> list[Any]:
        parts = self._path(path)
        if parts[0] != "record":
            raise AuthoringError("collection path must begin with record")
        target: Any = draft
        for part in parts:
            if not isinstance(target, dict) or part not in target:
                raise AuthoringError("unknown collection path")
            target = target[part]
        if not isinstance(target, list):
            raise AuthoringError("target field is not a collection")
        return target

    @staticmethod
    def _index(index: int, length: int, allow_end: bool = False) -> int:
        if not isinstance(index, int):
            raise AuthoringError("collection index must be integer")
        upper = length if allow_end else length - 1
        if index < 0 or index > upper:
            raise AuthoringError("collection index out of range")
        return index

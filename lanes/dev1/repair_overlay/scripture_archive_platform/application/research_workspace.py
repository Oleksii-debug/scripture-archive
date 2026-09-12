from __future__ import annotations

import re
import threading
from typing import Any


BOOKMARK_SCHEMA = "scripture.research.bookmark.v1"
NOTE_SCHEMA = "scripture.research.note.v1"
CANONICAL_TARGET_KIND = "canonical_node"
CANONICAL_TARGET_TRUTH_OWNER = "CanonicalContentLoader"
_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$")
_TAG_LIKE_RE = re.compile(r"<\s*(?:/\s*)?[A-Za-z!][^>]*>")
_ACTIVE_URI_RE = re.compile(r"(?:javascript|data)\s*:", re.IGNORECASE)
_INPUT_TARGET_KEYS = frozenset(
    {"kind", "id", "campaign_id", "mission_id", "node_id", "source_references"}
)
_PERSISTED_TARGET_KEYS = _INPUT_TARGET_KEYS | {"truth_owner"}
_REQUIRED_TARGET_KEYS = frozenset({"kind", "id", "campaign_id", "mission_id", "node_id"})


class ResearchWorkspaceService:
    """Persistent user research records linked only to canonical content targets.

    Note bodies/tags/titles are user-authored inert text. Target identity and source
    references are not caller-owned truth: they are validated/derived from the same
    canonical loader + presentation mapper used by the packaged player.
    """

    def __init__(self, store: Any, loader: Any, mapper: Any):
        if loader is None or mapper is None:
            raise ValueError("canonical loader and mapper are required")
        self.store = store
        self.loader = loader
        self.mapper = mapper
        self._lock = threading.RLock()

    @staticmethod
    def _identifier(value: Any, field: str) -> str:
        if not isinstance(value, str):
            raise ValueError(f"{field} must be string")
        if value != value.strip() or not _ID_RE.fullmatch(value):
            raise ValueError(f"invalid {field}")
        return value

    @staticmethod
    def _plain_text(value: Any, field: str, *, max_len: int, required: bool = True) -> str:
        if value is None and not required:
            return ""
        if not isinstance(value, str):
            raise ValueError(f"{field} must be string")
        text = value.replace("\r\n", "\n").replace("\r", "\n").strip()
        if required and not text:
            raise ValueError(f"{field} is required")
        if len(text) > max_len:
            raise ValueError(f"{field} too long")
        if any(ord(ch) < 32 and ch not in "\n\t" for ch in text):
            raise ValueError(f"{field} contains control characters")
        if _TAG_LIKE_RE.search(text) or _ACTIVE_URI_RE.search(text):
            raise ValueError(f"{field} must be plain text")
        return text

    @classmethod
    def _tags(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list) or len(value) > 20:
            raise ValueError("tags must be a list of at most 20 strings")
        out: list[str] = []
        seen: set[str] = set()
        for item in value:
            tag = cls._plain_text(item, "tag", max_len=50)
            key = tag.casefold()
            if key not in seen:
                seen.add(key)
                out.append(tag)
        return out

    @classmethod
    def _source_references(cls, value: Any) -> list[str]:
        if not isinstance(value, list) or len(value) > 20:
            raise ValueError("source_references must be a list of at most 20 strings")
        out: list[str] = []
        seen: set[str] = set()
        for item in value:
            ref = cls._plain_text(item, "source_reference", max_len=200)
            key = ref.casefold()
            if key not in seen:
                seen.add(key)
                out.append(ref)
        return out

    def _target(self, value: Any, *, persisted: bool = False) -> dict[str, Any]:
        if not isinstance(value, dict):
            raise ValueError("target must be object")
        allowed = _PERSISTED_TARGET_KEYS if persisted else _INPUT_TARGET_KEYS
        unknown = set(value) - allowed
        if unknown:
            raise ValueError(f"unsupported target fields: {', '.join(sorted(map(str, unknown)))}")
        missing = _REQUIRED_TARGET_KEYS - set(value)
        if missing:
            raise ValueError(f"target missing fields: {', '.join(sorted(missing))}")

        kind = self._identifier(value.get("kind"), "target.kind")
        if kind != CANONICAL_TARGET_KIND:
            raise ValueError("target.kind must be canonical_node")
        node_id = self._identifier(value.get("node_id"), "target.node_id")
        target_id = self._identifier(value.get("id"), "target.id")
        mission_id = self._identifier(value.get("mission_id"), "target.mission_id")
        campaign_id = self._identifier(value.get("campaign_id"), "target.campaign_id")
        if target_id != node_id:
            raise ValueError("target.id must equal target.node_id")

        node = self.loader.load_node(node_id)
        mission = self.loader.mission_for_node(node_id)
        if not isinstance(node, dict) or node.get("node_id") != node_id:
            raise ValueError("canonical target node identity mismatch")
        if node.get("mission_id") != mission_id:
            raise ValueError("target mission does not own canonical node")
        if not isinstance(mission, dict) or mission.get("mission_id") != mission_id:
            raise ValueError("canonical mission identity mismatch")
        if mission.get("campaign_id") != campaign_id:
            raise ValueError("target campaign does not own canonical mission")

        renderable = self.mapper.to_renderable(node, mission)
        if not isinstance(renderable, dict):
            raise ValueError("canonical presentation mapping is malformed")
        canonical_refs = self._source_references(renderable.get("source_references"))
        if "source_references" in value:
            supplied_refs = self._source_references(value.get("source_references"))
            if supplied_refs != canonical_refs:
                raise ValueError("target source_references must match canonical presentation")
        if persisted:
            if value.get("truth_owner") != CANONICAL_TARGET_TRUTH_OWNER:
                raise ValueError("persisted target truth owner mismatch")
            if "source_references" not in value:
                raise ValueError("persisted target missing canonical source_references")

        return {
            "kind": CANONICAL_TARGET_KIND,
            "id": node_id,
            "campaign_id": campaign_id,
            "mission_id": mission_id,
            "node_id": node_id,
            "source_references": canonical_refs,
            "truth_owner": CANONICAL_TARGET_TRUTH_OWNER,
        }

    def _normalize_bookmark(self, payload: Any, *, persisted: bool = False) -> dict[str, Any]:
        if not isinstance(payload, dict):
            raise ValueError("bookmark must be object")
        allowed = {"bookmark_id", "title", "target", "tags"} | ({"schema"} if persisted else set())
        unknown = set(payload) - allowed
        if unknown:
            raise ValueError(f"unsupported bookmark fields: {', '.join(sorted(map(str, unknown)))}")
        if persisted and payload.get("schema") != BOOKMARK_SCHEMA:
            raise ValueError("unsupported bookmark schema")
        return {
            "schema": BOOKMARK_SCHEMA,
            "bookmark_id": self._identifier(payload.get("bookmark_id"), "bookmark_id"),
            "title": self._plain_text(payload.get("title"), "title", max_len=200),
            "target": self._target(payload.get("target"), persisted=persisted),
            "tags": self._tags(payload.get("tags")),
        }

    def _normalize_note(self, payload: Any, *, persisted: bool = False) -> dict[str, Any]:
        if not isinstance(payload, dict):
            raise ValueError("note must be object")
        allowed = {"note_id", "title", "body", "target", "tags"} | ({"schema"} if persisted else set())
        unknown = set(payload) - allowed
        if unknown:
            raise ValueError(f"unsupported note fields: {', '.join(sorted(map(str, unknown)))}")
        if persisted and payload.get("schema") != NOTE_SCHEMA:
            raise ValueError("unsupported note schema")
        target = self._target(payload.get("target"), persisted=persisted) if payload.get("target") is not None else None
        return {
            "schema": NOTE_SCHEMA,
            "note_id": self._identifier(payload.get("note_id"), "note_id"),
            "title": self._plain_text(payload.get("title"), "title", max_len=200),
            "body": self._plain_text(payload.get("body"), "body", max_len=20_000),
            "target": target,
            "tags": self._tags(payload.get("tags")),
        }

    def _load(self, key: str) -> dict[str, dict[str, Any]]:
        namespace = "research_workspace"
        present_before = key in set(self.store.list_keys(namespace))
        missing = object()
        raw = self.store.get_json(namespace, key, missing)
        if raw is missing:
            # JsonFileStore returns the provided default after quarantining unreadable
            # JSON. A key that existed before/after that read is corruption, not absence.
            present_after = key in set(self.store.list_keys(namespace))
            if present_before or present_after:
                raise ValueError("workspace persistence is unreadable")
            return {}
        if not isinstance(raw, dict):
            raise ValueError("workspace persistence is malformed")
        out: dict[str, dict[str, Any]] = {}
        for storage_key, payload in raw.items():
            exact_key = self._identifier(storage_key, f"{key} storage key")
            if key == "bookmarks":
                record = self._normalize_bookmark(payload, persisted=True)
                record_id = record["bookmark_id"]
            elif key == "notes":
                record = self._normalize_note(payload, persisted=True)
                record_id = record["note_id"]
            else:
                raise ValueError("unsupported workspace collection")
            if exact_key != record_id:
                raise ValueError("workspace persistence id mismatch")
            if exact_key in out:
                raise ValueError("workspace persistence duplicate id")
            out[exact_key] = record
        return out

    def _save(self, key: str, records: dict[str, dict[str, Any]]) -> None:
        self.store.put_json("research_workspace", key, records)

    @staticmethod
    def _matches(record: dict[str, Any], query: str) -> bool:
        if not query:
            return True
        target = record.get("target") or {}
        parts = [record.get("title"), record.get("body"), *(record.get("tags") or [])]
        parts.extend(target.get("source_references") or [])
        parts.extend(target.get(field) for field in ("kind", "id", "campaign_id", "mission_id", "node_id"))
        haystack = "\n".join(str(part) for part in parts if part is not None).casefold()
        return all(token in haystack for token in query.casefold().split())

    @classmethod
    def _query(cls, value: Any) -> str:
        if value is None:
            return ""
        return cls._plain_text(value, "query", max_len=200, required=False)

    def list_bookmarks(self, query: Any = None) -> list[dict[str, Any]]:
        q = self._query(query)
        with self._lock:
            rows = [record for record in self._load("bookmarks").values() if self._matches(record, q)]
        return sorted(rows, key=lambda row: (row["title"].casefold(), row["bookmark_id"]))

    def upsert_bookmark(self, payload: Any) -> dict[str, Any]:
        record = self._normalize_bookmark(payload)
        with self._lock:
            records = self._load("bookmarks")
            records[record["bookmark_id"]] = record
            self._save("bookmarks", records)
        return dict(record)

    def delete_bookmark(self, bookmark_id: Any) -> bool:
        key = self._identifier(bookmark_id, "bookmark_id")
        with self._lock:
            records = self._load("bookmarks")
            existed = key in records
            if existed:
                del records[key]
                self._save("bookmarks", records)
        return existed

    def list_notes(self, query: Any = None) -> list[dict[str, Any]]:
        q = self._query(query)
        with self._lock:
            rows = [record for record in self._load("notes").values() if self._matches(record, q)]
        return sorted(rows, key=lambda row: (row["title"].casefold(), row["note_id"]))

    def upsert_note(self, payload: Any) -> dict[str, Any]:
        record = self._normalize_note(payload)
        with self._lock:
            records = self._load("notes")
            records[record["note_id"]] = record
            self._save("notes", records)
        return dict(record)

    def delete_note(self, note_id: Any) -> bool:
        key = self._identifier(note_id, "note_id")
        with self._lock:
            records = self._load("notes")
            existed = key in records
            if existed:
                del records[key]
                self._save("notes", records)
        return existed

from __future__ import annotations

import re
from typing import Any


BOOKMARK_SCHEMA = "scripture.research.bookmark.v1"
NOTE_SCHEMA = "scripture.research.note.v1"
_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$")
_TAG_LIKE_RE = re.compile(r"<\s*(?:/\s*)?[A-Za-z!][^>]*>")
_ACTIVE_URI_RE = re.compile(r"(?:javascript|data)\s*:", re.IGNORECASE)
_ALLOWED_TARGET_KEYS = frozenset(
    {"kind", "id", "campaign_id", "mission_id", "node_id", "source_references"}
)


class ResearchWorkspaceService:
    """Bookmarks/notes persisted through the platform store as inert JSON data.

    Records carry references to canonical product entities/source references; this
    service never copies Scripture/source truth into a second content store.
    """

    def __init__(self, store: Any):
        self.store = store

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
        if value is None:
            return []
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

    @classmethod
    def _target(cls, value: Any) -> dict[str, Any]:
        if not isinstance(value, dict):
            raise ValueError("target must be object")
        unknown = set(value) - _ALLOWED_TARGET_KEYS
        if unknown:
            raise ValueError(f"unsupported target fields: {', '.join(sorted(map(str, unknown)))}")
        target: dict[str, Any] = {"kind": cls._identifier(value.get("kind"), "target.kind")}
        for field in ("id", "campaign_id", "mission_id", "node_id"):
            if value.get(field) is not None:
                target[field] = cls._identifier(value.get(field), f"target.{field}")
        refs = cls._source_references(value.get("source_references"))
        if refs:
            target["source_references"] = refs
        if not any(target.get(field) for field in ("id", "mission_id", "node_id")) and not refs:
            raise ValueError("target requires a stable id or source reference")
        return target

    @classmethod
    def _normalize_bookmark(cls, payload: Any, *, persisted: bool = False) -> dict[str, Any]:
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
            "bookmark_id": cls._identifier(payload.get("bookmark_id"), "bookmark_id"),
            "title": cls._plain_text(payload.get("title"), "title", max_len=200),
            "target": cls._target(payload.get("target")),
            "tags": cls._tags(payload.get("tags")),
        }

    @classmethod
    def _normalize_note(cls, payload: Any, *, persisted: bool = False) -> dict[str, Any]:
        if not isinstance(payload, dict):
            raise ValueError("note must be object")
        allowed = {"note_id", "title", "body", "target", "tags"} | ({"schema"} if persisted else set())
        unknown = set(payload) - allowed
        if unknown:
            raise ValueError(f"unsupported note fields: {', '.join(sorted(map(str, unknown)))}")
        if persisted and payload.get("schema") != NOTE_SCHEMA:
            raise ValueError("unsupported note schema")
        target = cls._target(payload.get("target")) if payload.get("target") is not None else None
        return {
            "schema": NOTE_SCHEMA,
            "note_id": cls._identifier(payload.get("note_id"), "note_id"),
            "title": cls._plain_text(payload.get("title"), "title", max_len=200),
            "body": cls._plain_text(payload.get("body"), "body", max_len=20_000),
            "target": target,
            "tags": cls._tags(payload.get("tags")),
        }

    def _load(self, key: str) -> dict[str, dict[str, Any]]:
        missing = object()
        raw = self.store.get_json("research_workspace", key, missing)
        if raw is missing:
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
        rows = [record for record in self._load("bookmarks").values() if self._matches(record, q)]
        return sorted(rows, key=lambda row: (row["title"].casefold(), row["bookmark_id"]))

    def upsert_bookmark(self, payload: Any) -> dict[str, Any]:
        record = self._normalize_bookmark(payload)
        records = self._load("bookmarks")
        records[record["bookmark_id"]] = record
        self._save("bookmarks", records)
        return dict(record)

    def delete_bookmark(self, bookmark_id: Any) -> bool:
        key = self._identifier(bookmark_id, "bookmark_id")
        records = self._load("bookmarks")
        existed = key in records
        if existed:
            del records[key]
            self._save("bookmarks", records)
        return existed

    def list_notes(self, query: Any = None) -> list[dict[str, Any]]:
        q = self._query(query)
        rows = [record for record in self._load("notes").values() if self._matches(record, q)]
        return sorted(rows, key=lambda row: (row["title"].casefold(), row["note_id"]))

    def upsert_note(self, payload: Any) -> dict[str, Any]:
        record = self._normalize_note(payload)
        records = self._load("notes")
        records[record["note_id"]] = record
        self._save("notes", records)
        return dict(record)

    def delete_note(self, note_id: Any) -> bool:
        key = self._identifier(note_id, "note_id")
        records = self._load("notes")
        existed = key in records
        if existed:
            del records[key]
            self._save("notes", records)
        return existed

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Mapping

ALLOWED_COMMANDS = {"load_task", "submit_answer", "request_hint", "next", "save", "restore", "get_mastery", "get_review_queue", "get_evidence"}
REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")
DANGEROUS_IMPORT_KEYS = {"script", "executable", "command", "shell", "python", "javascript", "__code__", "__import__"}


class ValidationError(ValueError):
    pass


@dataclass(frozen=True)
class CommandEnvelope:
    api_version: str
    command: str
    request_id: str
    payload: Mapping[str, Any]

    @classmethod
    def from_mapping(cls, value: Mapping[str, Any]) -> "CommandEnvelope":
        validate_command_dto(value)
        return cls(str(value["api_version"]), str(value["command"]), str(value["request_id"]), dict(value.get("payload") or {}))


def _validate_json_value(value: Any, *, depth: int = 0) -> None:
    if depth > 12:
        raise ValidationError("DTO nesting too deep")
    if value is None or isinstance(value, (bool, int, float)):
        return
    if isinstance(value, str):
        if len(value) > 100_000:
            raise ValidationError("String exceeds DTO size limit")
        return
    if isinstance(value, list):
        if len(value) > 10_000:
            raise ValidationError("List exceeds DTO item limit")
        for item in value:
            _validate_json_value(item, depth=depth + 1)
        return
    if isinstance(value, Mapping):
        if len(value) > 2_000:
            raise ValidationError("Object exceeds DTO key limit")
        for key, item in value.items():
            if not isinstance(key, str) or len(key) > 256:
                raise ValidationError("Invalid DTO key")
            _validate_json_value(item, depth=depth + 1)
        return
    raise ValidationError(f"DTO contains non-JSON type: {type(value).__name__}")


def validate_command_dto(value: Mapping[str, Any]) -> None:
    if not isinstance(value, Mapping):
        raise ValidationError("Command must be an object")
    if set(value) - {"api_version", "command", "request_id", "payload"}:
        raise ValidationError("Unknown top-level command fields")
    if value.get("api_version") != "runtime.v1":
        raise ValidationError("Unsupported api_version")
    command = value.get("command")
    if command not in ALLOWED_COMMANDS:
        raise ValidationError("Command is not allowlisted")
    request_id = str(value.get("request_id", ""))
    if not REQUEST_ID_RE.fullmatch(request_id):
        raise ValidationError("Invalid request_id")
    payload = value.get("payload", {})
    if not isinstance(payload, Mapping):
        raise ValidationError("payload must be an object")
    _validate_json_value(payload)
    encoded = json.dumps(value, ensure_ascii=False).encode("utf-8")
    if len(encoded) > 1_000_000:
        raise ValidationError("Command exceeds 1 MB")


def validate_content_import(value: Any) -> None:
    _validate_json_value(value)
    def walk(item: Any) -> None:
        if isinstance(item, Mapping):
            for key, child in item.items():
                if key.casefold() in DANGEROUS_IMPORT_KEYS:
                    raise ValidationError(f"Executable/import control key forbidden: {key}")
                walk(child)
        elif isinstance(item, list):
            for child in item:
                walk(child)
    walk(value)

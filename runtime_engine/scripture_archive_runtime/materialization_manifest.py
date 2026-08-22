from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any, Iterable, Mapping

READABLE_MATERIALIZATION_SCHEMA = "R06_RECORD_HASH_MATERIALIZATION_MANIFEST_v1"
CANONICAL_JSON_METHOD = "UTF-8; ensure_ascii=false; sorted keys; separators=(',',':'); no trailing newline"
DEFAULT_MAX_PART_BYTES = 256 * 1024
HARD_MAX_PART_BYTES = 512 * 1024


class MaterializationManifestError(ValueError):
    pass


@dataclass(frozen=True)
class MaterializedCollection:
    kind: str
    records: tuple[Mapping[str, Any], ...]
    record_hashes: Mapping[str, str]
    aggregate_sha256: str
    record_paths: Mapping[str, str]


@dataclass(frozen=True)
class MaterializationSnapshot:
    manifest: Mapping[str, Any]
    collections: Mapping[str, MaterializedCollection]

    def collection(self, kind: str) -> MaterializedCollection:
        try:
            return self.collections[kind]
        except KeyError as exc:
            raise MaterializationManifestError(f"missing collection {kind!r}") from exc


def canonical_record_bytes(record: Any) -> bytes:
    try:
        text = json.dumps(
            record,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        )
    except (TypeError, ValueError) as exc:
        raise MaterializationManifestError(f"record is not canonical JSON serializable: {exc}") from exc
    return text.encode("utf-8")


def canonical_record_sha256(record: Any) -> str:
    return hashlib.sha256(canonical_record_bytes(record)).hexdigest()


def aggregate_record_hash(record_hashes: Mapping[str, str]) -> str:
    normalized = [{"id": key, "sha256": record_hashes[key]} for key in sorted(record_hashes)]
    return hashlib.sha256(canonical_record_bytes(normalized)).hexdigest()


def deterministic_manifest_key(kind: str, index: int, record: Mapping[str, Any]) -> str:
    return f"{kind}:anon:{index:06d}:{canonical_record_sha256(record)[:16]}"


def _safe_relative_path(raw: str) -> PurePosixPath:
    if not isinstance(raw, str) or not raw.strip():
        raise MaterializationManifestError("part path must be a non-empty string")
    p = PurePosixPath(raw)
    if p.is_absolute() or ".." in p.parts or any(part in {"", "."} for part in p.parts):
        raise MaterializationManifestError(f"unsafe materialization part path: {raw!r}")
    if p.suffix.lower() != ".json":
        raise MaterializationManifestError("materialization parts must be .json")
    return p


def _resolve_part(root: Path, raw: str) -> Path:
    rel = _safe_relative_path(raw)
    target = (root / Path(*rel.parts)).resolve()
    root_resolved = root.resolve()
    if root_resolved != target and root_resolved not in target.parents:
        raise MaterializationManifestError(f"part path escapes root: {raw!r}")
    if target.is_symlink():
        raise MaterializationManifestError(f"materialization part may not be a symlink: {raw!r}")
    if not target.is_file():
        raise MaterializationManifestError(f"materialization part missing: {raw!r}")
    return target


def _load_json_utf8(path: Path, *, max_bytes: int) -> Any:
    size = path.stat().st_size
    if size > max_bytes:
        raise MaterializationManifestError(f"materialization part exceeds size limit: {path.name} ({size} > {max_bytes})")
    try:
        raw = path.read_bytes()
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise MaterializationManifestError(f"materialization part is not UTF-8: {path.name}") from exc
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise MaterializationManifestError(f"invalid JSON materialization part {path.name}: {exc}") from exc


def _records_from_payload(payload: Any, container_key: str) -> list[Mapping[str, Any]]:
    if isinstance(payload, list):
        records = payload
    elif isinstance(payload, Mapping):
        records = payload.get(container_key)
    else:
        records = None
    if not isinstance(records, list):
        raise MaterializationManifestError(f"part must contain array {container_key!r}")
    out: list[Mapping[str, Any]] = []
    for index, record in enumerate(records):
        if not isinstance(record, Mapping):
            raise MaterializationManifestError(f"{container_key}[{index}] is not an object")
        out.append(dict(record))
    return out


def _record_key(
    kind: str,
    record: Mapping[str, Any],
    *,
    id_fields: tuple[str, ...],
    index: int,
    allow_generated_keys: bool,
) -> str:
    for field in id_fields:
        value = record.get(field)
        if isinstance(value, str) and value.strip():
            return value.strip()
    if allow_generated_keys:
        return deterministic_manifest_key(kind, index, record)
    raise MaterializationManifestError(f"{kind} record lacks stable id field(s): {', '.join(id_fields)}")


def _require_hex_sha256(value: Any, field: str) -> str:
    if not isinstance(value, str) or len(value) != 64:
        raise MaterializationManifestError(f"{field} must be SHA256 hex")
    try:
        int(value, 16)
    except ValueError as exc:
        raise MaterializationManifestError(f"{field} must be SHA256 hex") from exc
    return value.lower()


def validate_materialization_manifest(
    root: str | Path,
    manifest_path: str | Path,
    *,
    max_part_bytes: int = DEFAULT_MAX_PART_BYTES,
) -> MaterializationSnapshot:
    root_path = Path(root).resolve()
    manifest_file = Path(manifest_path)
    if not manifest_file.is_absolute():
        manifest_file = (root_path / manifest_file).resolve()
    if root_path != manifest_file and root_path not in manifest_file.parents:
        raise MaterializationManifestError("manifest path escapes materialization root")
    if not manifest_file.is_file() or manifest_file.is_symlink():
        raise MaterializationManifestError("materialization manifest missing or unsafe")
    if max_part_bytes <= 0 or max_part_bytes > HARD_MAX_PART_BYTES:
        raise MaterializationManifestError("invalid part size limit")

    manifest = _load_json_utf8(manifest_file, max_bytes=HARD_MAX_PART_BYTES)
    if not isinstance(manifest, Mapping):
        raise MaterializationManifestError("materialization manifest must be an object")
    if manifest.get("schema") != READABLE_MATERIALIZATION_SCHEMA:
        raise MaterializationManifestError("unsupported materialization manifest schema")
    if manifest.get("canonical_json_method") != CANONICAL_JSON_METHOD:
        raise MaterializationManifestError("canonical JSON method mismatch")

    source = manifest.get("source_package")
    if not isinstance(source, Mapping):
        raise MaterializationManifestError("source_package is required")
    _require_hex_sha256(source.get("sha256"), "source_package.sha256")
    for name in ("filename", "drive_id"):
        if not isinstance(source.get(name), str) or not source[name].strip():
            raise MaterializationManifestError(f"source_package.{name} is required")

    github = manifest.get("github")
    if not isinstance(github, Mapping):
        raise MaterializationManifestError("github object is required")
    for name in ("branch", "head"):
        if not isinstance(github.get(name), str) or not github[name].strip():
            raise MaterializationManifestError(f"github.{name} is required")

    raw_collections = manifest.get("collections")
    if not isinstance(raw_collections, Mapping) or "nodes" not in raw_collections:
        raise MaterializationManifestError("collections.nodes is required")

    collections: dict[str, MaterializedCollection] = {}
    for kind, spec in raw_collections.items():
        if not isinstance(kind, str) or not isinstance(spec, Mapping):
            raise MaterializationManifestError("invalid collection declaration")
        container_key = spec.get("container_key", "records")
        if not isinstance(container_key, str) or not container_key:
            raise MaterializationManifestError(f"{kind}.container_key must be a string")
        id_fields_raw = spec.get("id_fields")
        if not isinstance(id_fields_raw, list) or not id_fields_raw or not all(isinstance(v, str) and v for v in id_fields_raw):
            raise MaterializationManifestError(f"{kind}.id_fields must be a non-empty string array")
        id_fields = tuple(id_fields_raw)
        allow_generated = bool(spec.get("allow_generated_keys", False))
        parts = spec.get("parts")
        if not isinstance(parts, list) or not parts:
            raise MaterializationManifestError(f"{kind}.parts must be a non-empty array")
        expected_hashes = spec.get("record_hashes")
        if not isinstance(expected_hashes, Mapping):
            raise MaterializationManifestError(f"{kind}.record_hashes must be an object")
        expected_hashes = {str(k): _require_hex_sha256(v, f"{kind}.record_hashes[{k!r}]") for k, v in expected_hashes.items()}
        expected_count = spec.get("count")
        if not isinstance(expected_count, int) or expected_count < 0:
            raise MaterializationManifestError(f"{kind}.count must be a non-negative integer")
        expected_aggregate = _require_hex_sha256(spec.get("aggregate_sha256"), f"{kind}.aggregate_sha256")

        actual_records: list[Mapping[str, Any]] = []
        actual_hashes: dict[str, str] = {}
        record_paths: dict[str, str] = {}
        ordinal = 0
        for part in parts:
            if isinstance(part, str):
                part_path = part
                declared_ids = None
            elif isinstance(part, Mapping):
                part_path = part.get("path")
                declared_ids = part.get("record_ids")
                if declared_ids is not None and (
                    not isinstance(declared_ids, list) or not all(isinstance(v, str) and v for v in declared_ids)
                ):
                    raise MaterializationManifestError(f"{kind} part record_ids must be a string array")
            else:
                raise MaterializationManifestError(f"{kind} part must be a path or object")
            target = _resolve_part(root_path, str(part_path))
            records = _records_from_payload(_load_json_utf8(target, max_bytes=max_part_bytes), container_key)
            ids_in_part: list[str] = []
            for record in records:
                ordinal += 1
                rid = _record_key(kind, record, id_fields=id_fields, index=ordinal, allow_generated_keys=allow_generated)
                if rid in actual_hashes:
                    raise MaterializationManifestError(f"duplicate {kind} record id: {rid}")
                digest = canonical_record_sha256(record)
                actual_hashes[rid] = digest
                record_paths[rid] = PurePosixPath(str(part_path)).as_posix()
                actual_records.append(record)
                ids_in_part.append(rid)
            if declared_ids is not None and ids_in_part != declared_ids:
                raise MaterializationManifestError(f"{kind} part record_ids do not match readback order for {part_path}")

        if len(actual_records) != expected_count:
            raise MaterializationManifestError(f"{kind} count mismatch: {len(actual_records)} != {expected_count}")
        if set(actual_hashes) != set(expected_hashes):
            missing = sorted(set(expected_hashes) - set(actual_hashes))
            extra = sorted(set(actual_hashes) - set(expected_hashes))
            raise MaterializationManifestError(f"{kind} stable-ID set mismatch; missing={missing[:5]} extra={extra[:5]}")
        mismatched = sorted(rid for rid in actual_hashes if actual_hashes[rid] != expected_hashes[rid])
        if mismatched:
            raise MaterializationManifestError(f"{kind} record hash mismatch: {mismatched[:5]}")
        aggregate = aggregate_record_hash(actual_hashes)
        if aggregate != expected_aggregate:
            raise MaterializationManifestError(f"{kind} aggregate hash mismatch")
        collections[kind] = MaterializedCollection(
            kind=kind,
            records=tuple(actual_records),
            record_hashes=dict(sorted(actual_hashes.items())),
            aggregate_sha256=aggregate,
            record_paths=dict(sorted(record_paths.items())),
        )

    counts = manifest.get("counts")
    if isinstance(counts, Mapping):
        for kind, value in counts.items():
            if kind in collections and value != len(collections[kind].records):
                raise MaterializationManifestError(f"top-level count mismatch for {kind}")

    return MaterializationSnapshot(manifest=dict(manifest), collections=collections)

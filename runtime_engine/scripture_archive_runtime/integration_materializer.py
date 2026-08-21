from __future__ import annotations

import hashlib
import json
import shutil
import zipfile
from dataclasses import dataclass, asdict
from pathlib import Path, PurePosixPath
from typing import Any, Iterable, Mapping

from .package_adapters import iter_nodes_from_payload
from .security import ValidationError


@dataclass(frozen=True)
class PackageSpec:
    lane: str
    zip_path: str
    expected_sha256: str
    drive_id: str
    branch_head: str
    node_members: tuple[str, ...]
    evidence_members: tuple[str, ...]
    expected_nodes: int
    expected_evidence: int


class MaterializationError(ValidationError):
    pass


def sha256_file(path: str | Path) -> str:
    h = hashlib.sha256()
    with Path(path).open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _safe_member(name: str) -> bool:
    p = PurePosixPath(name)
    return not p.is_absolute() and ".." not in p.parts and not any(part in {"", "."} for part in p.parts)


def _load_json_member(zf: zipfile.ZipFile, member: str) -> Any:
    if member not in zf.namelist():
        raise MaterializationError(f"missing package member: {member}")
    if not _safe_member(member):
        raise MaterializationError(f"unsafe ZIP member: {member}")
    return json.loads(zf.read(member).decode("utf-8"))


def _evidence_records(payload: Any) -> list[Mapping[str, Any]]:
    if not isinstance(payload, Mapping):
        raise MaterializationError("evidence payload must be object")
    if isinstance(payload.get("records"), list):
        return [r for r in payload["records"] if isinstance(r, Mapping)]
    if isinstance(payload.get("Evidence"), list):
        return [r for r in payload["Evidence"] if isinstance(r, Mapping)]
    if isinstance(payload.get("evidence"), list):
        return [r for r in payload["evidence"] if isinstance(r, Mapping)]
    raise MaterializationError("unrecognized evidence registry shape")


def _canonical_json_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def _record_id(record: Mapping[str, Any], names: tuple[str, ...]) -> str:
    for name in names:
        value = record.get(name)
        if isinstance(value, str) and value.strip():
            return value.strip()
    raise MaterializationError(f"record lacks stable id ({', '.join(names)})")


def materialize_packages(specs: Iterable[PackageSpec], output_dir: str | Path) -> dict[str, Any]:
    out = Path(output_dir)
    if out.exists():
        if out.is_symlink():
            raise MaterializationError("output directory must not be symlink")
        shutil.rmtree(out)
    out.mkdir(parents=True, exist_ok=False)

    global_nodes: dict[str, tuple[bytes, str]] = {}
    global_evidence: dict[str, tuple[bytes, str]] = {}
    inputs: list[dict[str, Any]] = []
    unresolved: list[dict[str, str]] = []
    lane_counts: dict[str, dict[str, int]] = {}

    for spec in specs:
        path = Path(spec.zip_path)
        actual_sha = sha256_file(path)
        if actual_sha.lower() != spec.expected_sha256.lower():
            raise MaterializationError(f"{spec.lane}: package SHA256 mismatch")
        with zipfile.ZipFile(path) as zf:
            names = zf.namelist()
            if len(names) != len(set(names)):
                raise MaterializationError(f"{spec.lane}: duplicate ZIP member names")
            for name in names:
                if name and not name.endswith("/") and not _safe_member(name):
                    raise MaterializationError(f"{spec.lane}: unsafe ZIP member {name}")
            nodes: list[Mapping[str, Any]] = []
            for member in spec.node_members:
                nodes.extend(iter_nodes_from_payload(_load_json_member(zf, member)))
            evidence: list[Mapping[str, Any]] = []
            for member in spec.evidence_members:
                evidence.extend(_evidence_records(_load_json_member(zf, member)))

        if len(nodes) != spec.expected_nodes:
            raise MaterializationError(f"{spec.lane}: node count {len(nodes)} != {spec.expected_nodes}")
        if len(evidence) != spec.expected_evidence:
            raise MaterializationError(f"{spec.lane}: evidence count {len(evidence)} != {spec.expected_evidence}")

        for node in nodes:
            node_id = _record_id(node, ("node_id",))
            raw = _canonical_json_bytes(node)
            if node_id in global_nodes and global_nodes[node_id][0] != raw:
                raise MaterializationError(f"conflicting duplicate node_id {node_id}")
            if node_id in global_nodes:
                raise MaterializationError(f"duplicate node_id {node_id}")
            global_nodes[node_id] = (raw, spec.lane)

        for record in evidence:
            evidence_id = _record_id(record, ("evidence_id", "id"))
            raw = _canonical_json_bytes(record)
            if evidence_id in global_evidence and global_evidence[evidence_id][0] != raw:
                raise MaterializationError(f"conflicting duplicate evidence_id {evidence_id}")
            if evidence_id in global_evidence:
                raise MaterializationError(f"duplicate evidence_id {evidence_id}")
            global_evidence[evidence_id] = (raw, spec.lane)

        lane_dir = out / spec.lane.lower()
        lane_dir.mkdir(parents=True, exist_ok=False)
        (lane_dir / "nodes.json").write_bytes(_canonical_json_bytes({"nodes": [dict(n) for n in nodes]}))
        (lane_dir / "evidence.json").write_bytes(_canonical_json_bytes({"records": [dict(r) for r in evidence]}))
        lane_counts[spec.lane] = {"nodes": len(nodes), "evidence": len(evidence)}
        inputs.append({**asdict(spec), "zip_path": path.name, "actual_sha256": actual_sha})

    evidence_ids = set(global_evidence)
    for node_id, (raw, lane) in global_nodes.items():
        node = json.loads(raw)
        req = node.get("required_evidence")
        ids: list[str] = []
        if isinstance(req, str) and req.strip():
            ids = [part.strip() for part in req.split(';') if part.strip()]
        elif isinstance(req, list):
            ids = [str(x) for x in req if str(x).strip()]
        for evidence_id in ids:
            if evidence_id not in evidence_ids:
                unresolved.append({"lane": lane, "node_id": node_id, "evidence_id": evidence_id})
    if unresolved:
        raise MaterializationError(f"unresolved evidence refs: {len(unresolved)}")

    output_hashes: dict[str, str] = {}
    for path in sorted(p for p in out.rglob("*") if p.is_file()):
        output_hashes[path.relative_to(out).as_posix()] = sha256_file(path)

    manifest = {
        "schema": "R06_INTEGRATION_MATERIALIZER_MANIFEST_v1",
        "inputs": inputs,
        "lane_counts": lane_counts,
        "total_nodes": len(global_nodes),
        "total_evidence": len(global_evidence),
        "duplicate_node_ids": 0,
        "conflicting_node_ids": 0,
        "duplicate_evidence_ids": 0,
        "conflicting_evidence_ids": 0,
        "unresolved_required_evidence_refs": 0,
        "output_hashes": output_hashes,
    }
    (out / "INTEGRATION_MANIFEST.json").write_bytes(_canonical_json_bytes(manifest))
    manifest["manifest_sha256"] = sha256_file(out / "INTEGRATION_MANIFEST.json")
    return manifest

#!/usr/bin/env python3
"""DEV09 deterministic D4 readable materializer and readback verifier.

This tool does not author biblical content. It reconstructs the immutable Stage05
D4 transport payload, applies the already-closed 63x hints.H1 typo overlay, and
requires exact existing per-record hashes before writing missing readable records.
"""
from __future__ import annotations

import argparse
import base64
import glob
import hashlib
import json
import pathlib
import shutil
import tempfile
import zipfile
from collections import Counter

TRANSPORT_SHA256 = "e8b008c31462d7ed9388a7a84f73bb8666c8449181000751e9da45c2468779c9"
CLOSURE_SHA256 = "c4e8dfe4ea62df2c3d52b810fb2413b31d6dcfd4cc711320beae3258ac6a981a"
NODE_AGGREGATE_SHA256 = "ffb5fc49efaa42e4cd5b5a665f3b027a427a03498758b6622bb91649ea0dce5f"
LEGACY_PARENT_HEAD = "998087dfa52408d2c1a9ab067373a75e8d493764"
PRESERVE_FILES = {
    "nodes_001_002.jsonl",
    "nodes_003_004.jsonl",
    "nodes_005_007.jsonl",
    "nodes_008_009.jsonl",
}


def canon(obj: object) -> bytes:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def expected_node_hashes(repo: pathlib.Path) -> dict[str, str]:
    root = repo / "docs/campaigns/OT/R06_D4_STAGE05_READABLE/record_hashes"
    out: dict[str, str] = {}
    for path in sorted(root.glob("nodes_*.sha256.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        overlap = set(out).intersection(payload)
        if overlap:
            raise SystemExit(f"duplicate node hash IDs in registries: {sorted(overlap)[:5]}")
        out.update(payload)
    if len(out) != 450:
        raise SystemExit(f"expected hash registry count {len(out)} != 450")
    return out


def aggregate_hash(hashes: dict[str, str]) -> str:
    return sha256("".join(hashes[key] for key in sorted(hashes)).encode("ascii"))


def load_readable_nodes(repo: pathlib.Path) -> tuple[list[dict], list[pathlib.Path]]:
    root = repo / "docs/campaigns/OT/R06_D4_STAGE05_READABLE/nodes"
    files = sorted(root.glob("nodes_*.jsonl"))
    nodes: list[dict] = []
    for path in files:
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip():
                continue
            try:
                nodes.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise SystemExit(f"invalid JSONL {path}:{lineno}: {exc}") from exc
    return nodes, files


def verify_readable(repo: pathlib.Path, require_manifest: bool = False) -> dict:
    expected = expected_node_hashes(repo)
    nodes, files = load_readable_nodes(repo)
    ids = [node.get("node_id") for node in nodes]
    if len(nodes) != 450 or len(set(ids)) != 450 or None in ids:
        raise SystemExit(f"readable node count/uniqueness FAIL nodes={len(nodes)} unique={len(set(ids))}")
    got = {node["node_id"]: sha256(canon(node)) for node in nodes}
    if got != expected:
        bad = [key for key in sorted(set(got) | set(expected)) if got.get(key) != expected.get(key)]
        raise SystemExit(f"readable per-record hash FAIL count={len(bad)} first={bad[:5]}")
    agg = aggregate_hash(got)
    if agg != NODE_AGGREGATE_SHA256:
        raise SystemExit(f"readable aggregate FAIL {agg}")

    confidence = Counter(node.get("confidence_code") for node in nodes)
    if confidence.get("D1") != 6 or confidence.get("I1") != 27:
        raise SystemExit(f"D1/I1 regression {dict(confidence)}")
    otnt = [node for node in nodes if node.get("task_type") == "OT_NT_LINK"]
    authored = sum(
        1 for node in otnt
        if isinstance(node.get("grading"), dict) and isinstance(node["grading"].get("ot_nt_link"), dict)
    )
    if len(otnt) != 24 or authored != 24:
        raise SystemExit(f"OT_NT_LINK authored truth FAIL authored={authored} total={len(otnt)}")

    readable_root = repo / "docs/campaigns/OT/R06_D4_STAGE05_READABLE"
    evidence_ids: set[str] = set()
    evidence_records = 0
    for path in sorted((readable_root / "evidence").glob("*.jsonl")):
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                record = json.loads(line)
                evidence_records += 1
                evidence_ids.add(record["evidence_id"])
    if evidence_records != 90 or len(evidence_ids) != 90:
        raise SystemExit(f"evidence readable count FAIL {evidence_records}/{len(evidence_ids)}")

    required: set[str] = set()
    for node in nodes:
        value = node.get("required_evidence")
        if isinstance(value, str) and value:
            required.add(value)
        elif isinstance(value, list):
            required.update(item for item in value if isinstance(item, str) and item)
    missing = sorted(required - evidence_ids)
    if missing:
        raise SystemExit(f"unresolved required_evidence {missing[:10]}")

    relation_records = 0
    for path in sorted((readable_root / "relations").glob("*.jsonl")):
        relation_records += sum(1 for line in path.read_text(encoding="utf-8").splitlines() if line.strip())
    if relation_records != 24:
        raise SystemExit(f"relation readable count FAIL {relation_records}")

    dossier_records = 0
    for path in sorted((readable_root / "dossiers").glob("*.jsonl")):
        dossier_records += sum(1 for line in path.read_text(encoding="utf-8").splitlines() if line.strip())
    if dossier_records != 15:
        raise SystemExit(f"dossier readable count FAIL {dossier_records}")

    if require_manifest:
        manifest_path = repo / "docs/workflow/r06_dev09/D4_READABLE_MATERIALIZATION_MANIFEST.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for item in manifest["node_files"]:
            path = repo / item["path"]
            data = path.read_bytes()
            if len(data) != item["bytes"] or sha256(data) != item["sha256"]:
                raise SystemExit(f"manifest file readback FAIL {item['path']}")

    task_types = Counter(node.get("task_type") for node in nodes)
    print(
        "D4_READABLE_VERIFY_PASS "
        f"nodes=450 evidence=90 relations=24 dossiers=15 OT_NT_LINK=24/24 "
        f"D1={confidence.get('D1')} I1={confidence.get('I1')} aggregate={agg}"
    )
    print("task_types=" + json.dumps(task_types, sort_keys=True))
    return {"nodes": nodes, "files": files, "hashes": got, "aggregate": agg}


def reconstruct_closed_nodes(repo: pathlib.Path) -> list[dict]:
    parts = sorted(glob.glob(str(repo / "lanes/dev4/finalprep_payload_parts/part_*.b64")))
    if not parts:
        raise SystemExit("D4 transport parts missing")
    raw = base64.b64decode(
        "".join(pathlib.Path(path).read_text(encoding="ascii").strip() for path in parts),
        validate=True,
    )
    got_sha = sha256(raw)
    if got_sha != TRANSPORT_SHA256:
        raise SystemExit(f"transport payload SHA FAIL {got_sha}")

    with tempfile.TemporaryDirectory(prefix="dev09-d4-") as td:
        zip_path = pathlib.Path(td) / "payload.zip"
        zip_path.write_bytes(raw)
        extract = pathlib.Path(td) / "src"
        with zipfile.ZipFile(zip_path) as archive:
            bad = archive.testzip()
            if bad:
                raise SystemExit(f"transport ZIP CRC FAIL {bad}")
            archive.extractall(extract)
        campaign = extract / "docs/campaigns/OT/R06_D4_OT_CANONICAL_v1.0"
        payloads = [json.loads(path.read_text(encoding="utf-8")) for path in sorted(campaign.glob("nodes_part_*.json"))]
        nodes = [node for payload in payloads for node in payload["nodes"]]

    if len(nodes) != 450:
        raise SystemExit(f"transport node count {len(nodes)} != 450")
    repairs = 0
    for node in nodes:
        h1 = node.get("hints", {}).get("H1")
        if isinstance(h1, str) and "доказовий запис запис" in h1:
            node["hints"]["H1"] = h1.replace("доказовий запис запис", "доказовий запис")
            repairs += 1
    if repairs != 63:
        raise SystemExit(f"closure H1 repair count {repairs} != 63")

    expected = expected_node_hashes(repo)
    got = {node["node_id"]: sha256(canon(node)) for node in nodes}
    if got != expected or aggregate_hash(got) != NODE_AGGREGATE_SHA256:
        bad = [key for key in sorted(set(got) | set(expected)) if got.get(key) != expected.get(key)]
        raise SystemExit(f"closed-node ground-truth hash FAIL count={len(bad)} first={bad[:5]}")
    print("D4_CLOSED_SOURCE_HASH_PASS nodes=450 H1_REPAIR=63 aggregate=" + NODE_AGGREGATE_SHA256)
    return nodes


def materialize(repo: pathlib.Path, chunk_size: int) -> None:
    nodes = reconstruct_closed_nodes(repo)
    out = repo / "docs/campaigns/OT/R06_D4_STAGE05_READABLE/nodes"
    out.mkdir(parents=True, exist_ok=True)
    for path in out.glob("nodes_*.jsonl"):
        if path.name not in PRESERVE_FILES:
            path.unlink()
    tail = nodes[9:]
    for offset in range(0, len(tail), chunk_size):
        chunk = tail[offset:offset + chunk_size]
        start = 10 + offset
        end = start + len(chunk) - 1
        path = out / f"nodes_{start:03}_{end:03}.jsonl"
        path.write_text("".join(canon(node).decode("utf-8") + "\n" for node in chunk), encoding="utf-8")

    result = verify_readable(repo)
    files = []
    for path in result["files"]:
        data = path.read_bytes()
        files.append({
            "path": str(path.relative_to(repo)).replace("\\", "/"),
            "bytes": len(data),
            "sha256": sha256(data),
        })
    manifest = {
        "schema": "DEV09_D4_READABLE_MATERIALIZATION_v1",
        "legacy_parent_head": LEGACY_PARENT_HEAD,
        "closure_package": "DEV_LANE_SCRIPTURE_R06_D4_CLOSURE_03.zip",
        "closure_drive_id": "1LSrCc1M8DcqRBwpO2NAVmcB9EzazgMDq",
        "closure_sha256": CLOSURE_SHA256,
        "transport_payload_sha256": TRANSPORT_SHA256,
        "canonical_serialization": "UTF-8 JSON ensure_ascii=false sort_keys=true separators=(comma,colon)",
        "counts": {"nodes": 450, "evidence": 90, "relations": 24, "dossiers": 15, "missions": 15},
        "node_record_aggregate_sha256": NODE_AGGREGATE_SHA256,
        "controlled_player_text_repair": {"field": "hints.H1", "count": 63, "ground_truth_fields_changed": 0},
        "preserved_legacy_readback_records": "N001-N009",
        "newly_materialized_records": "N010-N450",
        "node_files": files,
    }
    manifest_path = repo / "docs/workflow/r06_dev09/D4_READABLE_MATERIALIZATION_MANIFEST.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"D4_MATERIALIZATION_PASS node_files={len(files)} new_records=441")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path.cwd())
    parser.add_argument("--verify-only", action="store_true")
    parser.add_argument("--require-manifest", action="store_true")
    parser.add_argument("--chunk-size", type=int, default=30)
    args = parser.parse_args()
    repo = args.root.resolve()
    if args.verify_only:
        verify_readable(repo, require_manifest=args.require_manifest)
    else:
        if args.chunk_size < 1 or args.chunk_size > 90:
            raise SystemExit("chunk-size must be 1..90")
        materialize(repo, args.chunk_size)


if __name__ == "__main__":
    main()

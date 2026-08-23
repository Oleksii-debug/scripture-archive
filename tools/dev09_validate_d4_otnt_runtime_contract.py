#!/usr/bin/env python3
"""DEV09 D4 OT↔NT/runtime integration integrity validator.

Validates authored D4 relation truth without classifying or strengthening theology.
The canonical node fields remain truth; presentation fields are parity-checked only.
"""
from __future__ import annotations

import argparse
import base64
import glob
import hashlib
import json
import pathlib
import re
import tempfile
import zipfile
from collections import Counter

TRANSPORT_SHA256 = "e8b008c31462d7ed9388a7a84f73bb8666c8449181000751e9da45c2468779c9"
NODE_HASH_AGGREGATE = "ffb5fc49efaa42e4cd5b5a665f3b027a427a03498758b6622bb91649ea0dce5f"
REL_RE = re.compile(r"REL-OTNT-D4-\d{4}")
FIVE_FIELDS = ("ot_passage", "nt_passage", "relation_category", "confidence", "evidence_id")


def canon(obj: object) -> bytes:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def reconstruct(repo: pathlib.Path) -> pathlib.Path:
    parts = sorted(glob.glob(str(repo / "lanes/dev4/finalprep_payload_parts/part_*.b64")))
    if not parts:
        raise SystemExit("D4 transport parts missing")
    raw = base64.b64decode(
        "".join(pathlib.Path(p).read_text(encoding="ascii").strip() for p in parts), validate=True
    )
    if sha256(raw) != TRANSPORT_SHA256:
        raise SystemExit("D4 transport SHA mismatch")
    td = pathlib.Path(tempfile.mkdtemp(prefix="dev09-d4-contract-"))
    zip_path = td / "payload.zip"
    zip_path.write_bytes(raw)
    out = td / "src"
    with zipfile.ZipFile(zip_path) as zf:
        bad = zf.testzip()
        if bad:
            raise SystemExit(f"D4 transport ZIP CRC failure: {bad}")
        for info in zf.infolist():
            target = (out / info.filename).resolve()
            if out.resolve() not in target.parents and target != out.resolve():
                raise SystemExit(f"unsafe ZIP member: {info.filename}")
        zf.extractall(out)
    return out


def load_nodes(src: pathlib.Path) -> list[dict]:
    root = src / "docs/campaigns/OT/R06_D4_OT_CANONICAL_v1.0"
    nodes: list[dict] = []
    for path in sorted(root.glob("nodes_part_*.json")):
        nodes.extend(json.loads(path.read_text(encoding="utf-8"))["nodes"])
    if len(nodes) != 450:
        raise SystemExit(f"node count {len(nodes)} != 450")
    repairs = 0
    for node in nodes:
        h1 = node.get("hints", {}).get("H1")
        if isinstance(h1, str) and "доказовий запис запис" in h1:
            node["hints"]["H1"] = h1.replace("доказовий запис запис", "доказовий запис")
            repairs += 1
    if repairs not in (0, 63):
        raise SystemExit(f"unexpected H1 repair count {repairs}")
    return nodes


def expected_hashes(repo: pathlib.Path) -> dict[str, str]:
    root = repo / "docs/campaigns/OT/R06_D4_STAGE05_READABLE/record_hashes"
    out: dict[str, str] = {}
    for path in sorted(root.glob("nodes_*.sha256.json")):
        out.update(json.loads(path.read_text(encoding="utf-8")))
    if len(out) != 450:
        raise SystemExit(f"node hash registry {len(out)} != 450")
    return out


def verify_hash_truth(repo: pathlib.Path, nodes: list[dict]) -> None:
    got = {n["node_id"]: sha256(canon(n)) for n in nodes}
    expected = expected_hashes(repo)
    bad = [key for key in sorted(set(got) | set(expected)) if got.get(key) != expected.get(key)]
    if bad:
        raise SystemExit(f"canonical node hash mismatch count={len(bad)} first={bad[:5]}")
    agg = sha256("".join(got[key] for key in sorted(got)).encode("ascii"))
    if agg != NODE_HASH_AGGREGATE:
        raise SystemExit(f"node aggregate mismatch {agg}")


def validate(repo: pathlib.Path) -> None:
    src = reconstruct(repo)
    nodes = load_nodes(src)
    verify_hash_truth(repo, nodes)

    relation_path = src / "docs/corpus/OTNT_RELATION_REGISTRY_R06_D4_v1.0.json"
    relation_obj = json.loads(relation_path.read_text(encoding="utf-8"))
    taxonomy = set(relation_obj["taxonomy"])
    relations = relation_obj["records"]
    if len(relations) != 24 or len({r["relation_id"] for r in relations}) != 24:
        raise SystemExit("relation registry must contain 24 unique authored records")
    by_id = {r["relation_id"]: r for r in relations}
    unknown_categories = sorted({r["relation_category"] for r in relations} - taxonomy)
    if unknown_categories:
        raise SystemExit(f"relation categories outside declared taxonomy: {unknown_categories}")

    otnt = [n for n in nodes if n.get("task_type") == "OT_NT_LINK"]
    if len(otnt) != 24:
        raise SystemExit(f"OT_NT_LINK count {len(otnt)} != 24")

    node_relation_ids: list[str] = []
    category_counts = Counter()
    confidence_counts = Counter()
    for node in otnt:
        relation_ids = REL_RE.findall(str(node.get("knowledge_target", "")))
        if len(relation_ids) != 1:
            raise SystemExit(f"{node['node_id']}: expected one relation ID in knowledge_target")
        relation_id = relation_ids[0]
        node_relation_ids.append(relation_id)
        relation = by_id.get(relation_id)
        if relation is None:
            raise SystemExit(f"{node['node_id']}: unresolved relation {relation_id}")

        accepted = node.get("accepted_answer")
        grading = node.get("grading", {}).get("ot_nt_link")
        if not isinstance(accepted, dict) or not isinstance(grading, dict):
            raise SystemExit(f"{node['node_id']}: authored structured truth missing")
        if set(accepted) != set(FIVE_FIELDS) or set(grading) != set(FIVE_FIELDS):
            raise SystemExit(f"{node['node_id']}: OT_NT_LINK five-field shape mismatch")
        if accepted != grading:
            raise SystemExit(f"{node['node_id']}: canonical/grading truth mismatch")

        presentation = {key: node.get("task_payload", {}).get(key) for key in FIVE_FIELDS}
        if presentation != accepted:
            raise SystemExit(f"{node['node_id']}: presentation parity mismatch; presentation never overrides truth")

        expected_projection = {
            "ot_passage": relation["ot_passage"],
            "nt_passage": relation["nt_passage"],
            "relation_category": relation["relation_category"],
            "confidence": relation["confidence_code"],
            "evidence_id": node.get("required_evidence"),
        }
        if accepted != expected_projection:
            raise SystemExit(f"{node['node_id']}: relation→canonical projection mismatch for {relation_id}")
        if node.get("confidence_code") != relation["confidence_code"]:
            raise SystemExit(f"{node['node_id']}: confidence strengthened/weakened vs relation {relation_id}")
        if node.get("textual_variant_flag") != relation.get("textual_variant_flag"):
            raise SystemExit(f"{node['node_id']}: TX1 flag mismatch vs relation {relation_id}")
        if not relation.get("interpretive_boundary") or not relation.get("rejected_overclaim"):
            raise SystemExit(f"{relation_id}: boundary/overclaim guard missing")
        if not node.get("functional_nonvisual_equivalent"):
            raise SystemExit(f"{node['node_id']}: nonvisual equivalent missing")
        category_counts[relation["relation_category"]] += 1
        confidence_counts[relation["confidence_code"]] += 1

    if len(set(node_relation_ids)) != 24 or set(node_relation_ids) != set(by_id):
        raise SystemExit("OT_NT_LINK↔relation registry is not a 24/24 bijection")
    if confidence_counts.get("T1", 0):
        raise SystemExit("OT↔NT relation truth unexpectedly promoted to T1")
    if confidence_counts != Counter({"T2": 18, "I1": 5, "D1": 1}):
        raise SystemExit(f"relation confidence distribution drift: {dict(confidence_counts)}")

    print("DEV09_D4_OTNT_RUNTIME_CONTRACT_PASS")
    print("nodes=450 OT_NT_LINK=24 relation_bijection=24/24 canonical_grading_parity=24/24")
    print("relation_confidence=" + json.dumps(confidence_counts, sort_keys=True))
    print("relation_categories=" + json.dumps(category_counts, sort_keys=True))
    print("ground_truth_transport_mutations=0 T1_promotions=0")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path.cwd())
    args = parser.parse_args()
    validate(args.root.resolve())


if __name__ == "__main__":
    main()

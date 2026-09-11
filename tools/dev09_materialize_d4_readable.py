#!/usr/bin/env python3
"""DEV09 deterministic D4 readable materializer with #60 provenance-scope repair.

The immutable FINALPREP transport is verified by SHA-256, then two explicit,
versioned overlays are applied: the already-closed H1 player-text typo repair and
D4_PROVENANCE_SCOPE_REPAIR_04 (GitHub issue #60). Stable semantic IDs and claim
propositions are preserved; only source/display scopes needed to establish exact
speaker identity are broadened.
"""
from __future__ import annotations

import argparse
import base64
import glob
import hashlib
import io
import json
import pathlib
import tempfile
import zipfile
from collections import Counter

TRANSPORT_SHA256 = "e8b008c31462d7ed9388a7a84f73bb8666c8449181000751e9da45c2468779c9"
CLOSURE_SHA256 = "c4e8dfe4ea62df2c3d52b810fb2413b31d6dcfd4cc711320beae3258ac6a981a"
NODE_AGGREGATE_SHA256 = "9fd8f668868e267e97b718a1de3025ad47577748e1054e146b6279da585e2ef7"
LEGACY_PARENT_HEAD = "998087dfa52408d2c1a9ab067373a75e8d493764"
OVERLAY_REL = pathlib.Path("docs/workflow/r06_dev09/D4_PROVENANCE_SCOPE_REPAIR_04.json")

PRESERVED_PREFIX_LAYOUT = ((1, 2), (3, 4), (5, 7), (8, 9))
EVIDENCE_LAYOUT = ((1,15,"evidence_01.jsonl"),(16,30,"evidence_02.jsonl"),(31,45,"evidence_03.jsonl"),(46,60,"evidence_04.jsonl"),(61,75,"evidence_05.jsonl"),(76,82,"evidence_06a.jsonl"),(83,90,"evidence_06b.jsonl"))
HASH_LAYOUT = ((1,90),(91,180),(181,270),(271,360),(361,450))

def canon(obj: object) -> bytes:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def aggregate_hash(hashes: dict[str,str]) -> str:
    return sha256("".join(hashes[key] for key in sorted(hashes)).encode("ascii"))

def load_overlay(repo: pathlib.Path) -> dict:
    payload=json.loads((repo/OVERLAY_REL).read_text(encoding="utf-8"))
    if payload.get("schema")!="DEV09_D4_PROVENANCE_SCOPE_REPAIR_v1": raise SystemExit("unexpected provenance repair schema")
    repairs=payload.get("evidence_repairs")
    if not isinstance(repairs,list) or len(repairs)!=5: raise SystemExit("provenance repair overlay must contain exactly 5 audited evidence repairs")
    if payload.get("changed_node_count")!=29: raise SystemExit("provenance repair overlay changed_node_count must be 29")
    if payload.get("node_record_aggregate_sha256")!=NODE_AGGREGATE_SHA256: raise SystemExit("provenance repair aggregate constant/overlay mismatch")
    return payload

def _replace(value: object, old: str, new: str) -> object:
    if isinstance(value,str): return value.replace(old,new)
    if isinstance(value,list): return [_replace(item,old,new) for item in value]
    if isinstance(value,dict): return {key:_replace(item,old,new) for key,item in value.items()}
    return value

def _load_transport_bytes(repo:pathlib.Path, transport_zip:pathlib.Path|None)->bytes:
    if transport_zip is not None: raw=transport_zip.read_bytes()
    else:
        parts=sorted(glob.glob(str(repo/"lanes/dev4/finalprep_payload_parts/part_*.b64")))
        if not parts: raise SystemExit("D4 transport parts missing")
        raw=base64.b64decode("".join(pathlib.Path(path).read_text(encoding="ascii").strip() for path in parts),validate=True)
    got=sha256(raw)
    if got!=TRANSPORT_SHA256: raise SystemExit(f"transport payload SHA FAIL {got}")
    return raw

def reconstruct_source(repo:pathlib.Path,transport_zip:pathlib.Path|None=None)->tuple[list[dict],list[dict]]:
    raw=_load_transport_bytes(repo,transport_zip)
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        bad=archive.testzip()
        if bad: raise SystemExit(f"transport ZIP CRC FAIL {bad}")
        prefix="docs/campaigns/OT/R06_D4_OT_CANONICAL_v1.0/"
        node_names=sorted(name for name in archive.namelist() if name.startswith(prefix+"nodes_part_") and name.endswith(".json"))
        nodes=[]
        for name in node_names: nodes.extend(json.loads(archive.read(name).decode("utf-8"))["nodes"])
        evidence=json.loads(archive.read("docs/evidence/OT_R06_D4_EVIDENCE_REGISTRY_v1.0.json").decode("utf-8"))["records"]
    if len(nodes)!=450 or len(evidence)!=90: raise SystemExit(f"transport counts FAIL nodes={len(nodes)} evidence={len(evidence)}")
    h1_repairs=0
    for node in nodes:
        h1=node.get("hints",{}).get("H1")
        if isinstance(h1,str) and "доказовий запис запис" in h1:
            node["hints"]["H1"]=h1.replace("доказовий запис запис","доказовий запис"); h1_repairs+=1
    if h1_repairs!=63: raise SystemExit(f"closure H1 repair count {h1_repairs} != 63")
    overlay=load_overlay(repo); changed_nodes=set(); evidence_by_id={r["evidence_id"]:r for r in evidence}
    for repair in overlay["evidence_repairs"]:
        eid,old,new=repair["evidence_id"],repair["old_source_passage"],repair["new_source_passage"]
        record=evidence_by_id.get(eid)
        if record is None: raise SystemExit(f"repair evidence missing {eid}")
        if record.get("source_passage")!=old: raise SystemExit(f"repair old evidence scope drift {eid}: {record.get('source_passage')!r}")
        if record.get("speaker_or_narrator")!=repair["speaker_or_narrator"]: raise SystemExit(f"repair speaker drift {eid}")
        record["source_passage"]=new
        suffix=f" Speaker identity is controlled by the included anchor {repair['speaker_anchor']}."
        note=record.get("provenance_notes","")
        if suffix.strip() not in note: record["provenance_notes"]=note.rstrip()+suffix
        for node in nodes:
            serialized=json.dumps(node,ensure_ascii=False)
            if eid in serialized and old in serialized:
                replaced=_replace(node,old,new); node.clear(); node.update(replaced); changed_nodes.add(node["node_id"])
    expected_ids=set(overlay["changed_node_ids"])
    if changed_nodes!=expected_ids: raise SystemExit(f"provenance node repair drift expected={len(expected_ids)} got={len(changed_nodes)} missing={sorted(expected_ids-changed_nodes)[:5]} extra={sorted(changed_nodes-expected_ids)[:5]}")
    hashes={node["node_id"]:sha256(canon(node)) for node in nodes}; agg=aggregate_hash(hashes)
    if agg!=NODE_AGGREGATE_SHA256: raise SystemExit(f"repaired node aggregate FAIL {agg}")
    print(f"D4_REPAIRED_SOURCE_PASS nodes=450 evidence=90 H1_REPAIR=63 provenance_evidence=5 provenance_nodes=29 aggregate={agg}")
    return nodes,evidence

def write_hash_registries(repo:pathlib.Path,nodes:list[dict])->None:
    root=repo/"docs/campaigns/OT/R06_D4_STAGE05_READABLE/record_hashes"; root.mkdir(parents=True,exist_ok=True); hashes=[sha256(canon(n)) for n in nodes]
    for start,end in HASH_LAYOUT:
        payload={nodes[idx-1]["node_id"]:hashes[idx-1] for idx in range(start,end+1)}
        (root/f"nodes_{start:03}_{end:03}.sha256.json").write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")

def write_readable_nodes(repo:pathlib.Path,nodes:list[dict],chunk_size:int)->None:
    out=repo/"docs/campaigns/OT/R06_D4_STAGE05_READABLE/nodes"; out.mkdir(parents=True,exist_ok=True)
    for path in out.glob("nodes_*.jsonl"): path.unlink()
    for start,end in PRESERVED_PREFIX_LAYOUT:
        (out/f"nodes_{start:03}_{end:03}.jsonl").write_text("".join(canon(nodes[idx-1]).decode("utf-8")+"\n" for idx in range(start,end+1)),encoding="utf-8")
    for offset in range(9,len(nodes),chunk_size):
        chunk=nodes[offset:offset+chunk_size]; start=offset+1; end=start+len(chunk)-1
        (out/f"nodes_{start:03}_{end:03}.jsonl").write_text("".join(canon(n).decode("utf-8")+"\n" for n in chunk),encoding="utf-8")

def write_readable_evidence(repo:pathlib.Path,evidence:list[dict])->None:
    out=repo/"docs/campaigns/OT/R06_D4_STAGE05_READABLE/evidence"; out.mkdir(parents=True,exist_ok=True)
    for start,end,name in EVIDENCE_LAYOUT:
        (out/name).write_text("".join(canon(evidence[idx-1]).decode("utf-8")+"\n" for idx in range(start,end+1)),encoding="utf-8")

def expected_node_hashes(repo:pathlib.Path)->dict[str,str]:
    root=repo/"docs/campaigns/OT/R06_D4_STAGE05_READABLE/record_hashes"; out={}
    for path in sorted(root.glob("nodes_*.sha256.json")):
        payload=json.loads(path.read_text(encoding="utf-8")); overlap=set(out).intersection(payload)
        if overlap: raise SystemExit(f"duplicate node hash IDs in registries: {sorted(overlap)[:5]}")
        out.update(payload)
    if len(out)!=450: raise SystemExit(f"expected hash registry count {len(out)} != 450")
    if aggregate_hash(out)!=NODE_AGGREGATE_SHA256: raise SystemExit("hash registry aggregate does not match repaired canonical aggregate")
    return out

def load_readable_nodes(repo:pathlib.Path)->tuple[list[dict],list[pathlib.Path]]:
    root=repo/"docs/campaigns/OT/R06_D4_STAGE05_READABLE/nodes"; files=sorted(root.glob("nodes_*.jsonl")); nodes=[]
    for path in files:
        for lineno,line in enumerate(path.read_text(encoding="utf-8").splitlines(),1):
            if not line.strip(): continue
            try: nodes.append(json.loads(line))
            except json.JSONDecodeError as exc: raise SystemExit(f"invalid JSONL {path}:{lineno}: {exc}") from exc
    return nodes,files

def verify_provenance_scope(repo:pathlib.Path,nodes:list[dict])->None:
    overlay=load_overlay(repo); evidence={}; evidence_root=repo/"docs/campaigns/OT/R06_D4_STAGE05_READABLE/evidence"
    for path in sorted(evidence_root.glob("*.jsonl")):
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rec=json.loads(line); evidence[rec["evidence_id"]]=rec
    if len(evidence)!=90: raise SystemExit(f"evidence readable count FAIL {len(evidence)}")
    by_id={node["node_id"]:node for node in nodes}
    for repair in overlay["evidence_repairs"]:
        eid=repair["evidence_id"]; rec=evidence.get(eid)
        if rec is None: raise SystemExit(f"repaired evidence missing {eid}")
        if rec.get("source_passage")!=repair["new_source_passage"]: raise SystemExit(f"repaired evidence scope FAIL {eid}: {rec.get('source_passage')!r}")
        if rec.get("speaker_or_narrator")!=repair["speaker_or_narrator"]: raise SystemExit(f"repaired evidence speaker FAIL {eid}")
        for nid in repair["affected_node_ids"]:
            node=by_id.get(nid)
            if node is None: raise SystemExit(f"repaired node readback missing {nid}")
            serialized=json.dumps(node,ensure_ascii=False)
            if repair["old_source_passage"] in serialized: raise SystemExit(f"stale provenance scope remains in {nid} for {eid}")
            if repair["new_source_passage"] not in serialized: raise SystemExit(f"repaired provenance scope absent in {nid} for {eid}")
    print("D4_PROVENANCE_SCOPE_REGRESSION_PASS evidence=5 nodes=29")

def verify_readable(repo:pathlib.Path,require_manifest:bool=False)->dict:
    expected=expected_node_hashes(repo); nodes,files=load_readable_nodes(repo); ids=[n.get("node_id") for n in nodes]
    if len(nodes)!=450 or len(set(ids))!=450 or None in ids: raise SystemExit(f"readable node count/uniqueness FAIL nodes={len(nodes)} unique={len(set(ids))}")
    got={n["node_id"]:sha256(canon(n)) for n in nodes}
    if got!=expected:
        bad=[key for key in sorted(set(got)|set(expected)) if got.get(key)!=expected.get(key)]; raise SystemExit(f"readable per-record hash FAIL count={len(bad)} first={bad[:5]}")
    agg=aggregate_hash(got)
    if agg!=NODE_AGGREGATE_SHA256: raise SystemExit(f"readable aggregate FAIL {agg}")
    confidence=Counter(n.get("confidence_code") for n in nodes)
    if confidence.get("D1")!=6 or confidence.get("I1")!=27: raise SystemExit(f"D1/I1 regression {dict(confidence)}")
    otnt=[n for n in nodes if n.get("task_type")=="OT_NT_LINK"]; authored=sum(1 for n in otnt if isinstance(n.get("grading"),dict) and isinstance(n["grading"].get("ot_nt_link"),dict))
    if len(otnt)!=24 or authored!=24: raise SystemExit(f"OT_NT_LINK authored truth FAIL authored={authored} total={len(otnt)}")
    verify_provenance_scope(repo,nodes)
    if require_manifest:
        manifest=json.loads((repo/"docs/workflow/r06_dev09/D4_READABLE_MATERIALIZATION_MANIFEST.json").read_text(encoding="utf-8"))
        for item in manifest["node_files"]:
            path=repo/item["path"]; data=path.read_bytes()
            if len(data)!=item["bytes"] or sha256(data)!=item["sha256"]: raise SystemExit(f"manifest file readback FAIL {item['path']}")
    print(f"D4_READABLE_VERIFY_PASS nodes=450 evidence=90 OT_NT_LINK=24/24 D1={confidence.get('D1')} I1={confidence.get('I1')} aggregate={agg}")
    return {"nodes":nodes,"files":files,"hashes":got,"aggregate":agg}

def materialize(repo:pathlib.Path,chunk_size:int,transport_zip:pathlib.Path|None)->None:
    nodes,evidence=reconstruct_source(repo,transport_zip=transport_zip); write_readable_nodes(repo,nodes,chunk_size); write_readable_evidence(repo,evidence); write_hash_registries(repo,nodes)
    result=verify_readable(repo); files=[]
    for path in result["files"]:
        data=path.read_bytes(); files.append({"path":str(path.relative_to(repo)).replace("\\","/"),"bytes":len(data),"sha256":sha256(data)})
    manifest={"schema":"DEV09_D4_READABLE_MATERIALIZATION_v2","legacy_parent_head":LEGACY_PARENT_HEAD,"closure_package":"DEV_LANE_SCRIPTURE_R06_D4_CLOSURE_03.zip","closure_drive_id":"1LSrCc1M8DcqRBwpO2NAVmcB9EzazgMDq","closure_sha256":CLOSURE_SHA256,"transport_payload_sha256":TRANSPORT_SHA256,"canonical_serialization":"UTF-8 JSON ensure_ascii=false sort_keys=true separators=(comma,colon)","counts":{"nodes":450,"evidence":90,"relations":24,"dossiers":15,"missions":15},"node_record_aggregate_sha256":NODE_AGGREGATE_SHA256,"controlled_player_text_repair":{"field":"hints.H1","count":63,"ground_truth_fields_changed":0},"provenance_scope_repair":{"issue":60,"overlay":str(OVERLAY_REL).replace("\\","/"),"evidence_records":5,"dependent_nodes":29,"stable_semantic_ids_changed":0,"claim_propositions_changed":0,"independent_audit_status":"PENDING"},"node_files":files}
    manifest_path=repo/"docs/workflow/r06_dev09/D4_READABLE_MATERIALIZATION_MANIFEST.json"; manifest_path.parent.mkdir(parents=True,exist_ok=True); manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    verify_readable(repo,require_manifest=True); print(f"D4_MATERIALIZATION_PASS node_files={len(files)} source_scope_repair=5/29")

def main()->None:
    parser=argparse.ArgumentParser(); parser.add_argument("--root",type=pathlib.Path,default=pathlib.Path.cwd()); parser.add_argument("--verify-only",action="store_true"); parser.add_argument("--require-manifest",action="store_true"); parser.add_argument("--chunk-size",type=int,default=30); parser.add_argument("--transport-zip",type=pathlib.Path,default=None,help="Exact FINALPREP payload ZIP; test/offline override for repo base64 transport parts"); args=parser.parse_args(); repo=args.root.resolve()
    if args.verify_only: verify_readable(repo,require_manifest=args.require_manifest)
    else:
        if args.chunk_size<1 or args.chunk_size>90: raise SystemExit("chunk-size must be 1..90")
        materialize(repo,args.chunk_size,args.transport_zip)

if __name__=="__main__": main()

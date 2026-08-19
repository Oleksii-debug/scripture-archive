#!/usr/bin/env python3
"""Static validator for Scripture Archive CONTENT_NODE_SCHEMA v1.2 canonical JSON.

Pre-production QA only. This is not product/runtime code.
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

REQUIRED = [
    "node_id","mission_id","task_family","difficulty","required",
    "skill_target","knowledge_target","why_this_node_exists",
    "player_prompt","source_scope_visible_to_player","response_mode",
    "accepted_answer","accepted_variants","required_evidence",
    "rejected_answers","rejection_reason","confidence_code",
    "textual_variant_flag","success_feedback","partial_feedback",
    "failure_feedback","hints","on_correct","on_partial","on_incorrect",
    "on_hint_threshold","optional_evidence_unlock","later_retrieval_effect",
    "mastery_domains","evidence_strength","mastery_mode","spaced_retrieval",
    "review_queue_rule","functional_nonvisual_equivalent"
]
VALID_CONF = {"T1","T2","C1","I1","D1"}
VALID_TX = {"none","TX1"}
VALID_RETR = ("RESOLVED_NODE","REVIEW_QUEUE","DEFERRED_CAMPAIGN","RETIRED")

def nonempty(v):
    if v is None: return False
    if isinstance(v, str): return bool(v.strip())
    if isinstance(v, (list, dict, tuple, set)): return bool(v)
    return True

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ns=ap.parse_args()
    errors=[]
    all_nodes={}
    for fname in ns.files:
        p=Path(fname)
        try:
            doc=json.loads(p.read_text(encoding="utf-8"))
        except Exception as e:
            errors.append(f"{p}: JSON_PARSE: {e}")
            continue
        if doc.get("schema_version")!="CONTENT_NODE_SCHEMA_v1.2":
            errors.append(f"{p}: wrong schema_version {doc.get('schema_version')!r}")
        nodes=doc.get("nodes")
        if not isinstance(nodes,list) or not nodes:
            errors.append(f"{p}: missing/non-list nodes")
            continue
        local=set()
        for n in nodes:
            nid=n.get("node_id","<missing>")
            missing=[k for k in REQUIRED if k not in n or not nonempty(n[k])]
            if missing: errors.append(f"{p}:{nid}: MISSING {','.join(missing)}")
            if nid in local: errors.append(f"{p}:{nid}: duplicate local node_id")
            if nid in all_nodes: errors.append(f"{p}:{nid}: duplicate global node_id")
            local.add(nid); all_nodes[nid]=(p,n)
            if n.get("confidence_code") not in VALID_CONF:
                errors.append(f"{p}:{nid}: invalid confidence_code {n.get('confidence_code')!r}")
            if n.get("textual_variant_flag") not in VALID_TX:
                errors.append(f"{p}:{nid}: invalid textual_variant_flag {n.get('textual_variant_flag')!r}")
            lr=str(n.get("later_retrieval_effect",""))
            if not lr.startswith(VALID_RETR):
                errors.append(f"{p}:{nid}: unresolved later_retrieval_effect {lr!r}")
        print(f"FILE {p.name}: nodes={len(nodes)} field_presence={len(nodes)-sum(1 for n in nodes if any(k not in n or not nonempty(n[k]) for k in REQUIRED))}/{len(nodes)} unique={len(local)}/{len(nodes)}")
    for p,n in all_nodes.values():
        nid=n["node_id"]
        oc=str(n["on_correct"])
        if oc not in {"mission_complete","return_to_required_path","return_to_current_node"} and oc.startswith(("LN","PA")) and oc not in all_nodes:
            prefix=nid.split("-")[0]
            if oc.startswith(prefix+"-"):
                errors.append(f"{p}:{nid}: missing same-mission on_correct target {oc}")
    for nid,(p,n) in all_nodes.items():
        if n.get("mission_id")=="PA-02":
            h=n.get("hints")
            if not isinstance(h,dict) or set(h)!=set(f"H{i}" for i in range(1,8)):
                errors.append(f"{p}:{nid}: PA02 hints must materialize H1-H7")
            elif any(not nonempty(v) or str(v).strip()=="not_used" for v in h.values()):
                errors.append(f"{p}:{nid}: PA02 contains non-concrete hint")
            for fk in ("success_feedback","partial_feedback","failure_feedback"):
                if len(str(n.get(fk," ")).strip())<12:
                    errors.append(f"{p}:{nid}: feedback too placeholder-like: {fk}")
    chains=[["LN04-N09","LN09-N11","LN12-N08"],["LN09-O01","LN12-N10"]]
    for ch in chains:
        for nid in ch:
            if nid not in all_nodes:
                errors.append(f"TX1_CHAIN: missing {nid}"); continue
            n=all_nodes[nid][1]
            if n.get("textual_variant_flag")!="TX1": errors.append(f"TX1_CHAIN:{nid}: flag is {n.get('textual_variant_flag')!r}")
            if n.get("confidence_code") not in VALID_CONF: errors.append(f"TX1_CHAIN:{nid}: invalid separate confidence")
    expected={"LN04-N09":"RESOLVED_NODE LN09-N11","LN09-N11":"RESOLVED_NODE LN12-N08","LN09-O01":"RESOLVED_NODE LN12-N10"}
    for src,want in expected.items():
        if src in all_nodes and str(all_nodes[src][1]["later_retrieval_effect"]) != want:
            errors.append(f"TX1_EDGE:{src}: expected {want!r}, got {all_nodes[src][1]['later_retrieval_effect']!r}")
    print(f"GLOBAL nodes={len(all_nodes)} required_fields={len(REQUIRED)}")
    print(f"RESULT {'PASS' if not errors else 'FAIL'} errors={len(errors)}")
    for e in errors: print("ERROR",e)
    return 0 if not errors else 1

if __name__=="__main__":
    raise SystemExit(main())

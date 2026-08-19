#!/usr/bin/env python3
from __future__ import annotations
import json, sys
from pathlib import Path

NODE_REQUIRED = [
"node_id","mission_id","task_family","difficulty","required","skill_target","knowledge_target",
"why_this_node_exists","player_prompt","source_scope_visible_to_player","response_mode",
"accepted_answer","accepted_variants","required_evidence","rejected_answers","rejection_reason",
"confidence_code","textual_variant_flag","success_feedback","partial_feedback","failure_feedback",
"hints","on_correct","on_partial","on_incorrect","on_hint_threshold","optional_evidence_unlock",
"later_retrieval_effect","mastery_domains","evidence_strength","mastery_mode","spaced_retrieval",
"review_queue_rule","functional_nonvisual_equivalent"
]
SOURCE_FIELDS = ["secondary_scripture","historical_context_sources","interpretive_sources","textual_variant_points"]
TERMINALS = ("RESOLVED_NODE","REVIEW_QUEUE","DEFERRED_CAMPAIGN","RETIRED")
VALID_CONF = {"T1","T2","C1","I1","D1"}
VALID_TX = {"none","TX1"}

def empty(v):
    return v is None or v == "" or v == [] or v == {}

def main(root: str) -> int:
    base=Path(root)
    errors=[]
    indexes=list(base.rglob("MISSION_INDEX.json"))
    node_count=0
    ids=set()
    for p in indexes:
        d=json.loads(p.read_text(encoding="utf-8"))
        m=d.get("mission",{})
        for f in SOURCE_FIELDS:
            if f not in m or empty(m.get(f)):
                errors.append(f"{p}: mission.{f} must be explicit source value or 'none'")
        if d.get("schema_version")!="CONTENT_NODE_SCHEMA_v1.2":
            errors.append(f"{p}: bad schema_version")
        for rel in d.get("node_files",[]):
            np=p.parent/rel
            if not np.is_file():
                errors.append(f"{p}: missing node file {rel}")
                continue
            nd=json.loads(np.read_text(encoding="utf-8"))
            for n in nd.get("nodes",[]):
                node_count += 1
                nid=n.get("node_id")
                if nid in ids: errors.append(f"duplicate node_id {nid}")
                ids.add(nid)
                for f in NODE_REQUIRED:
                    if f not in n or empty(n.get(f)):
                        errors.append(f"{np}:{nid}: missing/empty {f}")
                if n.get("confidence_code") not in VALID_CONF:
                    errors.append(f"{np}:{nid}: invalid confidence_code")
                if n.get("textual_variant_flag") not in VALID_TX:
                    errors.append(f"{np}:{nid}: invalid textual_variant_flag")
                h=n.get("hints",{})
                for k in [f"H{i}" for i in range(1,8)]:
                    if k not in h or empty(h[k]): errors.append(f"{np}:{nid}: missing {k}")
                lr=n.get("later_retrieval_effect","")
                if not lr.startswith(TERMINALS):
                    errors.append(f"{np}:{nid}: invalid later_retrieval_effect {lr}")
        declared=set(m.get("task_nodes",[])+m.get("optional_nodes",[]))
        actual=set()
        for rel in d.get("node_files",[]):
            np=p.parent/rel
            if np.is_file():
                actual.update(x["node_id"] for x in json.loads(np.read_text(encoding="utf-8")).get("nodes",[]))
        if declared != actual:
            errors.append(f"{p}: declared node set != actual node set")
        if d.get("node_count") != len(actual):
            errors.append(f"{p}: node_count mismatch")
    print(f"MISSION_INDEXES={len(indexes)} NODES={node_count} ERRORS={len(errors)}")
    for e in errors: print("ERROR",e)
    return 1 if errors else 0

if __name__=="__main__":
    raise SystemExit(main(sys.argv[1] if len(sys.argv)>1 else "."))

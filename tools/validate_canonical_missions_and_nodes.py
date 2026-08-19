#!/usr/bin/env python3
from __future__ import annotations
import json, sys
from collections import Counter
from pathlib import Path

NODE_REQUIRED=["node_id","mission_id","task_family","difficulty","required","skill_target","knowledge_target","why_this_node_exists","player_prompt","source_scope_visible_to_player","response_mode","accepted_answer","accepted_variants","required_evidence","rejected_answers","rejection_reason","confidence_code","textual_variant_flag","success_feedback","partial_feedback","failure_feedback","hints","on_correct","on_partial","on_incorrect","on_hint_threshold","optional_evidence_unlock","later_retrieval_effect","mastery_domains","evidence_strength","mastery_mode","spaced_retrieval","review_queue_rule","functional_nonvisual_equivalent"]
SOURCE_FIELDS=["secondary_scripture","historical_context_sources","interpretive_sources","textual_variant_points"]
TERMINALS=("RESOLVED_NODE","REVIEW_QUEUE","DEFERRED_CAMPAIGN","RETIRED")
VALID_CONF={"T1","T2","C1","I1","D1"}; VALID_TX={"none","TX1"}
BAD_HINT_PHRASES=("guided answer with mastery downgrade","placeholder","todo","tbd")
GENERIC_FEEDBACK=("відповідь джерельно коректна.","виправте лише неточний елемент.","перечитайте вказаний уривок і повторіть.")

def empty(v): return v is None or v=="" or v==[] or v=={}
def low(s): return str(s).strip().lower()

def main(root:str)->int:
    base=Path(root); errors=[]; indexes=list(base.rglob("MISSION_INDEX.json")); node_count=0; ids=set(); feedback_triplets=[]
    for p in indexes:
        d=json.loads(p.read_text(encoding="utf-8")); m=d.get("mission",{})
        for f in SOURCE_FIELDS:
            if f not in m or empty(m.get(f)): errors.append(f"{p}: mission.{f} must be explicit source value or 'none'")
        if d.get("schema_version")!="CONTENT_NODE_SCHEMA_v1.2": errors.append(f"{p}: bad schema_version")
        actual=set()
        for rel in d.get("node_files",[]):
            np=p.parent/rel
            if not np.is_file(): errors.append(f"{p}: missing node file {rel}"); continue
            nd=json.loads(np.read_text(encoding="utf-8"))
            for n in nd.get("nodes",[]):
                node_count+=1; nid=n.get("node_id"); actual.add(nid)
                if nid in ids: errors.append(f"duplicate node_id {nid}")
                ids.add(nid)
                for f in NODE_REQUIRED:
                    if f not in n or empty(n.get(f)): errors.append(f"{np}:{nid}: missing/empty {f}")
                if n.get("confidence_code") not in VALID_CONF: errors.append(f"{np}:{nid}: invalid confidence_code")
                if n.get("textual_variant_flag") not in VALID_TX: errors.append(f"{np}:{nid}: invalid textual_variant_flag")
                h=n.get("hints",{})
                for k in [f"H{i}" for i in range(1,8)]:
                    if k not in h or empty(h[k]): errors.append(f"{np}:{nid}: missing {k}")
                h7=low(h.get("H7",""))
                if any(x in h7 for x in BAD_HINT_PHRASES): errors.append(f"{np}:{nid}: placeholder H7")
                if len(h7)<40 or ("guided" not in h7 and "mastery=guided" not in h7): errors.append(f"{np}:{nid}: H7 must reveal/explain answer and guided mastery")
                trip=(low(n.get("success_feedback")),low(n.get("partial_feedback")),low(n.get("failure_feedback")))
                feedback_triplets.append((np,nid,trip))
                if any(x in GENERIC_FEEDBACK for x in trip): errors.append(f"{np}:{nid}: known generic feedback placeholder")
                lr=n.get("later_retrieval_effect","")
                if not str(lr).startswith(TERMINALS): errors.append(f"{np}:{nid}: invalid later_retrieval_effect {lr}")
                if str(lr).startswith("DEFERRED_CAMPAIGN") and len(str(lr).split())<3: errors.append(f"{np}:{nid}: DEFERRED_CAMPAIGN lacks explicit campaign binding")
        declared=set(m.get("task_nodes",[])+m.get("optional_nodes",[]))
        if declared!=actual: errors.append(f"{p}: declared node set != actual node set")
        if d.get("node_count")!=len(actual): errors.append(f"{p}: node_count mismatch")
    # Detect bulk-identical pedagogy inside a mission/package. Three or more identical feedback triplets is suspicious.
    counts=Counter(t for _,_,t in feedback_triplets)
    for np,nid,t in feedback_triplets:
        if counts[t]>=3: errors.append(f"{np}:{nid}: feedback triplet duplicated {counts[t]} times; semantic authoring review required")
    print(f"MISSION_INDEXES={len(indexes)} NODES={node_count} ERRORS={len(errors)}")
    for e in errors: print("ERROR",e)
    print("NOTE static validation does not replace semantic source/pedagogy audit")
    return 1 if errors else 0

if __name__=="__main__": raise SystemExit(main(sys.argv[1] if len(sys.argv)>1 else "."))

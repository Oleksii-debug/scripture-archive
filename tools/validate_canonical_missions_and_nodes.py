#!/usr/bin/env python3
from __future__ import annotations
import copy, json, sys
from collections import Counter
from pathlib import Path

NODE_REQUIRED=["node_id","mission_id","task_family","difficulty","required","skill_target","knowledge_target","why_this_node_exists","player_prompt","source_scope_visible_to_player","response_mode","accepted_answer","accepted_variants","required_evidence","rejected_answers","rejection_reason","confidence_code","textual_variant_flag","success_feedback","partial_feedback","failure_feedback","hints","on_correct","on_partial","on_incorrect","on_hint_threshold","optional_evidence_unlock","later_retrieval_effect","mastery_domains","evidence_strength","mastery_mode","spaced_retrieval","review_queue_rule","functional_nonvisual_equivalent"]
SOURCE_FIELDS=["secondary_scripture","historical_context_sources","interpretive_sources","textual_variant_points"]
EVIDENCE_REQUIRED=["evidence_record_id","lane","mission_id","node_id","relation","source_scope","required_evidence","confidence_code","textual_variant_flag","claim","provenance_status","nonvisual_access"]
TERMINALS=("RESOLVED_NODE","REVIEW_QUEUE","DEFERRED_CAMPAIGN","RETIRED")
VALID_CONF={"T1","T2","C1","I1","D1"}; VALID_TX={"none","TX1"}
BAD_HINT_PHRASES=("guided answer with mastery downgrade","placeholder","todo","tbd")
GENERIC_FEEDBACK=("відповідь джерельно коректна.","виправте лише неточний елемент.","перечитайте вказаний уривок і повторіть.")
PEDAGOGY_OVERLAY_ALLOWED={"success_feedback","partial_feedback","failure_feedback","hints","on_hint_threshold","mastery_mode"}
SEMANTIC_ALLOWED={"player_prompt","source_scope_visible_to_player","accepted_answer","accepted_variants","required_evidence","rejected_answers","rejection_reason","confidence_code","textual_variant_flag","success_feedback","partial_feedback","failure_feedback","hints"}
EVIDENCE_CORRECTION_ALLOWED={"node_id","source_scope","required_evidence","confidence_code","textual_variant_flag","claim"}
R05_NODE_TARGETS=("LN11-N01","LN11-N02","LN11-N03","LN11-N04","LN11-N07","LN11-N09")
R05_EVIDENCE_TARGETS=("EVR-R05-0061","EVR-R05-0062","EVR-R05-0063","EVR-R05-0064","EVR-R05-0067","EVR-R05-0069")
R05_PAIR=dict(zip(R05_EVIDENCE_TARGETS,R05_NODE_TARGETS))

def empty(v): return v is None or v=="" or v==[] or v=={}
def low(s): return str(s).strip().lower()

def load_pedagogy_overlays(base:Path, errors:list[str]):
    patches={}
    for ip in base.rglob("R05_PEDAGOGY_OVERLAY_INDEX.json"):
        idx=json.loads(ip.read_text(encoding="utf-8")); folder=ip.parent
        for name in idx.get("chunks",[]):
            cp=folder/name
            if not cp.is_file(): errors.append(f"{ip}: missing overlay chunk {name}"); continue
            d=json.loads(cp.read_text(encoding="utf-8"))
            if d.get("schema_version")!="CONTENT_NODE_PEDAGOGY_OVERLAY_v1.0": errors.append(f"{cp}: bad overlay schema")
            for nid,patch in d.get("patches",{}).items():
                if nid in patches: errors.append(f"duplicate pedagogy overlay patch {nid}")
                if not isinstance(patch,dict): errors.append(f"{cp}:{nid}: overlay patch must be object"); continue
                forbidden=set(patch)-PEDAGOGY_OVERLAY_ALLOWED
                if forbidden: errors.append(f"{cp}:{nid}: forbidden overlay keys {sorted(forbidden)}")
                patches[nid]=(cp,patch)
    return patches

def load_semantic_corrections(base:Path, errors:list[str]):
    patches={}
    for cp in base.rglob("PRE_R05_SEMANTIC_CORRECTIONS_v1.0.json"):
        d=json.loads(cp.read_text(encoding="utf-8"))
        if d.get("schema_version")!="R05_PRECHECK_SEMANTIC_CORRECTIONS_v1.0": errors.append(f"{cp}: bad semantic correction schema")
        declared=set(d.get("allowed_keys",[]))
        if declared and declared!=SEMANTIC_ALLOWED: errors.append(f"{cp}: semantic allowed_keys drift {sorted(declared ^ SEMANTIC_ALLOWED)}")
        for nid,patch in d.get("patches",{}).items():
            if nid in patches: errors.append(f"duplicate semantic correction patch {nid}")
            if not isinstance(patch,dict): errors.append(f"{cp}:{nid}: semantic patch must be object"); continue
            forbidden=set(patch)-SEMANTIC_ALLOWED
            if forbidden: errors.append(f"{cp}:{nid}: forbidden semantic keys {sorted(forbidden)}")
            patches[nid]=(cp,patch)
    return patches

def load_effective_evidence(base:Path, errors:list[str]):
    records={}; corrections={}; index_count=0
    for ip in base.rglob("R05_EVIDENCE_PROVENANCE_REGISTRY_v0.1_INDEX.json"):
        index_count+=1; idx=json.loads(ip.read_text(encoding="utf-8")); folder=ip.parent; local_count=0
        for name in idx.get("part_files",[]):
            rp=folder/name
            if not rp.is_file(): errors.append(f"{ip}: missing evidence part {name}"); continue
            d=json.loads(rp.read_text(encoding="utf-8"))
            for rec in d.get("records",[]):
                rid=rec.get("evidence_record_id"); local_count+=1
                if rid in records: errors.append(f"duplicate evidence_record_id {rid}")
                records[rid]=(rp,copy.deepcopy(rec))
        if idx.get("record_count")!=local_count: errors.append(f"{ip}: evidence record_count mismatch {idx.get('record_count')} != {local_count}")
    for cp in base.rglob("R05_EVIDENCE_PROVENANCE_CORRECTIONS_v0.1.json"):
        d=json.loads(cp.read_text(encoding="utf-8"))
        if d.get("schema_version")!="R05_EVIDENCE_PROVENANCE_CORRECTIONS_v0.1": errors.append(f"{cp}: bad evidence correction schema")
        for rid,patch in d.get("patches",{}).items():
            if rid in corrections: errors.append(f"duplicate evidence correction {rid}")
            if not isinstance(patch,dict): errors.append(f"{cp}:{rid}: evidence correction must be object"); continue
            forbidden=set(patch)-EVIDENCE_CORRECTION_ALLOWED
            if forbidden: errors.append(f"{cp}:{rid}: forbidden evidence correction keys {sorted(forbidden)}")
            corrections[rid]=(cp,patch)
    for rid,(cp,patch) in corrections.items():
        if rid not in records: errors.append(f"{cp}:{rid}: correction targets unknown evidence record"); continue
        rp,rec=records[rid]
        for k,v in patch.items(): rec[k]=copy.deepcopy(v)
        records[rid]=(rp,rec)
    for rid,(rp,rec) in records.items():
        for f in EVIDENCE_REQUIRED:
            if f not in rec or empty(rec.get(f)): errors.append(f"{rp}:{rid}: missing/empty {f}")
        if rec.get("confidence_code") not in VALID_CONF: errors.append(f"{rp}:{rid}: invalid confidence_code")
        if rec.get("textual_variant_flag") not in VALID_TX: errors.append(f"{rp}:{rid}: invalid textual_variant_flag")
    return records,corrections,index_count

def validate_r05_effective_contract(nodes:dict, evidence:dict, semantic:dict, corrections:dict, errors:list[str]):
    if not semantic and not corrections: return (0,0)
    for nid in R05_NODE_TARGETS:
        if nid not in semantic: errors.append(f"PRE-R05-005: missing semantic correction for {nid}")
        if nid not in nodes: errors.append(f"PRE-R05-005: missing effective node {nid}")
    for rid in R05_EVIDENCE_TARGETS:
        if rid not in corrections: errors.append(f"PRE-R05-005: missing evidence correction for {rid}")
        if rid not in evidence: errors.append(f"PRE-R05-005: missing effective evidence {rid}")
    if any(nid not in nodes for nid in R05_NODE_TARGETS) or any(rid not in evidence for rid in R05_EVIDENCE_TARGETS):
        return (sum(n in nodes for n in R05_NODE_TARGETS),sum(r in evidence for r in R05_EVIDENCE_TARGETS))
    n01=nodes["LN11-N01"]; e61=evidence["EVR-R05-0061"][1]
    if n01.get("confidence_code")!="C1" or e61.get("confidence_code")!="C1": errors.append("PRE-R05-005: LN11-N01/EVR-R05-0061 must be C1")
    if "project" not in low(n01.get("source_scope_visible_to_player")) or "not" not in low(n01.get("source_scope_visible_to_player")): errors.append("PRE-R05-005: LN11-N01 must expose project-defined/non-direct-scripture scope")
    for nid,rid in (("LN11-N02","EVR-R05-0062"),("LN11-N03","EVR-R05-0063"),("LN11-N07","EVR-R05-0067")):
        n=nodes[nid]; e=evidence[rid][1]
        joined=low(" ".join([str(n.get("source_scope_visible_to_player","")),str(n.get("accepted_answer","")),str(n.get("required_evidence","")),str(e.get("source_scope","")),str(e.get("claim",""))]))
        if "jn 18:10" not in joined and "john 18:10" not in joined: errors.append(f"PRE-R05-005: {nid}/{rid} must preserve John 18:10 right-ear provenance")
        if "right ear" not in joined: errors.append(f"PRE-R05-005: {nid}/{rid} must explicitly preserve right-ear fact")
        if "lk 22:51" not in joined and "luke 22:51" not in joined: errors.append(f"PRE-R05-005: {nid}/{rid} must preserve Luke 22:51 healing provenance")
        if "heal" not in joined: errors.append(f"PRE-R05-005: {nid}/{rid} must explicitly preserve healing distinction")
    n04=nodes["LN11-N04"]; e64=evidence["EVR-R05-0064"][1]
    if n04.get("textual_variant_flag")!="TX1" or e64.get("textual_variant_flag")!="TX1": errors.append("PRE-R05-005: LN11-N04/EVR-R05-0064 must be TX1")
    if "tx1" not in low(n04.get("source_scope_visible_to_player")): errors.append("PRE-R05-005: LN11-N04 must disclose TX1 before grading")
    n09=nodes["LN11-N09"]; e69=evidence["EVR-R05-0069"][1]
    if n09.get("confidence_code")!="D1" or e69.get("confidence_code")!="D1": errors.append("PRE-R05-005: LN11-N09/EVR-R05-0069 must be D1")
    joined09=low(str(n09.get("accepted_answer",""))+" "+str(e69.get("claim","")))
    if ("lk 22:66" not in joined09 and "luke 22:66" not in joined09) or "not established" not in joined09: errors.append("PRE-R05-005: LN11-N09/EVR-R05-0069 must retain Luke 22:66 anchor + not-established merged chronology")
    for rid,nid in R05_PAIR.items():
        n=nodes[nid]; e=evidence[rid][1]
        if e.get("node_id")!=nid: errors.append(f"PRE-R05-005: {rid} node_id must be {nid}")
        if e.get("confidence_code")!=n.get("confidence_code"): errors.append(f"PRE-R05-005: confidence mismatch {nid}/{rid}")
        if e.get("textual_variant_flag")!=n.get("textual_variant_flag"): errors.append(f"PRE-R05-005: TX1 mismatch {nid}/{rid}")
    return (len(R05_NODE_TARGETS),len(R05_EVIDENCE_TARGETS))

def main(root:str)->int:
    base=Path(root); errors=[]
    semantic=load_semantic_corrections(base,errors)
    overlays=load_pedagogy_overlays(base,errors)
    evidence,evidence_corrections,evidence_indexes=load_effective_evidence(base,errors)
    indexes=list(base.rglob("MISSION_INDEX.json")); node_count=0; ids=set(); feedback_triplets=[]; seen_nodes=set(); effective_nodes={}
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
            for base_node in nd.get("nodes",[]):
                n=copy.deepcopy(base_node); nid=n.get("node_id"); actual.add(nid); seen_nodes.add(nid); node_count+=1
                if nid in ids: errors.append(f"duplicate node_id {nid}")
                ids.add(nid)
                if nid in semantic:
                    _,patch=semantic[nid]
                    for k,v in patch.items(): n[k]=copy.deepcopy(v)
                if nid in overlays:
                    _,patch=overlays[nid]
                    for k,v in patch.items(): n[k]=copy.deepcopy(v)
                effective_nodes[nid]=n
                for f in NODE_REQUIRED:
                    if f not in n or empty(n.get(f)): errors.append(f"{np}:{nid}: missing/empty {f}")
                if n.get("confidence_code") not in VALID_CONF: errors.append(f"{np}:{nid}: invalid confidence_code")
                if n.get("textual_variant_flag") not in VALID_TX: errors.append(f"{np}:{nid}: invalid textual_variant_flag")
                h=n.get("hints",{})
                for k in [f"H{i}" for i in range(1,8)]:
                    if k not in h or empty(h[k]): errors.append(f"{np}:{nid}: missing {k}")
                h7=low(h.get("H7",""))
                if any(x in h7 for x in BAD_HINT_PHRASES): errors.append(f"{np}:{nid}: placeholder H7")
                if len(h7)<40 or "guided" not in h7: errors.append(f"{np}:{nid}: H7 must reveal/explain answer and guided mastery")
                trip=(low(n.get("success_feedback")),low(n.get("partial_feedback")),low(n.get("failure_feedback")))
                feedback_triplets.append((np,nid,trip))
                if any(x in GENERIC_FEEDBACK for x in trip): errors.append(f"{np}:{nid}: known generic feedback placeholder")
                lr=n.get("later_retrieval_effect","")
                if not str(lr).startswith(TERMINALS): errors.append(f"{np}:{nid}: invalid later_retrieval_effect {lr}")
                if str(lr).startswith("DEFERRED_CAMPAIGN") and len(str(lr).split())<3: errors.append(f"{np}:{nid}: DEFERRED_CAMPAIGN lacks explicit campaign binding")
        declared=set(m.get("task_nodes",[])+m.get("optional_nodes",[]))
        if declared!=actual: errors.append(f"{p}: declared node set != actual node set")
        if d.get("node_count")!=len(actual): errors.append(f"{p}: node_count mismatch")
    for nid,(cp,_) in semantic.items():
        if nid not in seen_nodes: errors.append(f"{cp}:{nid}: semantic correction targets unknown canonical node")
    for nid,(cp,_) in overlays.items():
        if nid not in seen_nodes: errors.append(f"{cp}:{nid}: overlay targets unknown canonical node")
    counts=Counter(t for _,_,t in feedback_triplets)
    for np,nid,t in feedback_triplets:
        if counts[t]>=3: errors.append(f"{np}:{nid}: effective feedback triplet duplicated {counts[t]} times; semantic authoring review required")
    rn,re=validate_r05_effective_contract(effective_nodes,evidence,semantic,evidence_corrections,errors)
    print(f"MISSION_INDEXES={len(indexes)} NODES={node_count} SEMANTIC_CORRECTIONS={len(semantic)} OVERLAYS={len(overlays)} EVIDENCE_INDEXES={evidence_indexes} EVIDENCE_RECORDS={len(evidence)} EVIDENCE_CORRECTIONS={len(evidence_corrections)} PRE_R05_NODE_TARGETS={rn}/6 PRE_R05_EVIDENCE_TARGETS={re}/6 ERRORS={len(errors)}")
    for e in errors: print("ERROR",e)
    print("NOTE static validation does not replace independent semantic source/pedagogy audit")
    return 1 if errors else 0

if __name__=="__main__": raise SystemExit(main(sys.argv[1] if len(sys.argv)>1 else "."))

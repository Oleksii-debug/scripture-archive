#!/usr/bin/env python3
from __future__ import annotations
import json, subprocess, sys, tempfile
from pathlib import Path

REPO=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
VALIDATOR=REPO/'tools'/'validate_canonical_missions_and_nodes.py'
NODE_IDS=['LN11-N01','LN11-N02','LN11-N03','LN11-N04','LN11-N07','LN11-N09']
EV_IDS=['EVR-R05-0061','EVR-R05-0062','EVR-R05-0063','EVR-R05-0064','EVR-R05-0067','EVR-R05-0069']
SEM_ALLOWED=["player_prompt","source_scope_visible_to_player","accepted_answer","accepted_variants","required_evidence","rejected_answers","rejection_reason","confidence_code","textual_variant_flag","success_feedback","partial_feedback","failure_feedback","hints"]

def write(p:Path,obj): p.parent.mkdir(parents=True,exist_ok=True); p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def run(root:Path):
    p=subprocess.run([sys.executable,str(VALIDATOR),str(root)],text=True,capture_output=True)
    return p.returncode,p.stdout+p.stderr

def node(nid:str):
    i=NODE_IDS.index(nid)+1
    return {'node_id':nid,'mission_id':'LN-11','task_family':'fixture','difficulty':'medium','required':True,'skill_target':f'skill {i}','knowledge_target':f'knowledge {i}','why_this_node_exists':f'fixture purpose {i}','player_prompt':f'base prompt {i}','source_scope_visible_to_player':'base scope','response_mode':'short_text','accepted_answer':f'base answer {i}','accepted_variants':'equivalent wording','required_evidence':f'base evidence {i}','rejected_answers':f'wrong {i}','rejection_reason':f'reason {i}','confidence_code':'T2','textual_variant_flag':'none','success_feedback':f'unique success {i}','partial_feedback':f'unique partial {i}','failure_feedback':f'unique failure {i}','hints':{f'H{h}':(f'GUIDED fixture answer {i} with sufficient evidence explanation and Mastery=guided.' if h==7 else f'unique hint {i}.{h}') for h in range(1,8)},'on_correct':'RESOLVED_NODE','on_partial':'REVIEW_QUEUE FIXTURE','on_incorrect':'REVIEW_QUEUE FIXTURE','on_hint_threshold':'guided mastery then review','optional_evidence_unlock':'none','later_retrieval_effect':'REVIEW_QUEUE FIXTURE','mastery_domains':['fixture'],'evidence_strength':'fixture','mastery_mode':'independent','spaced_retrieval':'enabled','review_queue_rule':'fixture queue','functional_nonvisual_equivalent':'linear text fixture'}

def make_fixture(root:Path):
    mission=root/'docs/campaigns/LN/LN-11_CANONICAL_v1.2'
    write(mission/'MISSION_INDEX.json',{'schema_version':'CONTENT_NODE_SCHEMA_v1.2','node_count':6,'node_files':['nodes.json'],'mission':{'secondary_scripture':'none','historical_context_sources':'none','interpretive_sources':'none','textual_variant_points':'none','task_nodes':NODE_IDS,'optional_nodes':[]}})
    write(mission/'nodes.json',{'nodes':[node(n) for n in NODE_IDS]})
    semantic={'LN11-N01':{'source_scope_visible_to_player':'Project-internal canonical sequence; not a direct Scriptural statement.','confidence_code':'C1'},'LN11-N02':{'source_scope_visible_to_player':'Mt 26:51; Mk 14:47; Lk 22:50–51; Jn 18:10','accepted_answer':'John 18:10 states right ear; Luke 22:50 states right ear; Luke 22:51 adds healing.'},'LN11-N03':{'source_scope_visible_to_player':'Mt 26:51; Mk 14:47; Lk 22:50–51; Jn 18:10','accepted_answer':'John 18:10 states right ear; Luke 22:51 provides healing provenance.'},'LN11-N04':{'source_scope_visible_to_player':'TX1 notice before grading; Mark rooster wording is textually sensitive.','textual_variant_flag':'TX1'},'LN11-N07':{'source_scope_visible_to_player':'Mt 26:51; Mk 14:47; Lk 22:50–51; Jn 18:10','accepted_answer':'John 18:10 states right ear; Luke 22:51 adds healing.'},'LN11-N09':{'accepted_answer':'Luke 22:66 is witness-local; exact merged timing/procedure is not established.','confidence_code':'D1'}}
    write(mission/'PRE_R05_SEMANTIC_CORRECTIONS_v1.0.json',{'schema_version':'R05_PRECHECK_SEMANTIC_CORRECTIONS_v1.0','allowed_keys':SEM_ALLOWED,'patches':semantic})
    edir=root/'docs/evidence'; base_records=[]
    for rid,nid in zip(EV_IDS,NODE_IDS): base_records.append({'evidence_record_id':rid,'lane':'LN','mission_id':'LN-11','node_id':nid,'relation':'supports','source_scope':'base','required_evidence':'base','confidence_code':'T2','textual_variant_flag':'none','claim':'base','provenance_status':'fixture','nonvisual_access':True})
    write(edir/'R05_EVIDENCE_PROVENANCE_REGISTRY_v0.1_INDEX.json',{'record_count':6,'part_files':['R05_EVIDENCE_PROVENANCE_REGISTRY_v0.1_part_01.json']})
    write(edir/'R05_EVIDENCE_PROVENANCE_REGISTRY_v0.1_part_01.json',{'records':base_records})
    epatch={'EVR-R05-0061':{'node_id':'LN11-N01','source_scope':'Project-internal sequence; not direct Scripture.','required_evidence':'project sequence','confidence_code':'C1','textual_variant_flag':'none','claim':'Project contract, not T1.'},'EVR-R05-0062':{'node_id':'LN11-N02','source_scope':'Jn 18:10; Lk 22:50–51','required_evidence':'Jn 18:10; Lk 22:50–51','confidence_code':'T2','textual_variant_flag':'none','claim':'John 18:10 right ear; Luke 22:51 healing.'},'EVR-R05-0063':{'node_id':'LN11-N03','source_scope':'Jn 18:10; Lk 22:50–51','required_evidence':'Jn 18:10; Lk 22:50–51','confidence_code':'T2','textual_variant_flag':'none','claim':'John 18:10 right ear; Luke 22:51 healing.'},'EVR-R05-0064':{'node_id':'LN11-N04','source_scope':'TX1 notice; Mark rooster trace','required_evidence':'TX1 trace','confidence_code':'T2','textual_variant_flag':'TX1','claim':'Mark rooster wording TX1.'},'EVR-R05-0067':{'node_id':'LN11-N07','source_scope':'Jn 18:10; Lk 22:50–51','required_evidence':'Jn 18:10; Lk 22:50–51','confidence_code':'T2','textual_variant_flag':'none','claim':'John 18:10 right ear; Luke 22:51 healing.'},'EVR-R05-0069':{'node_id':'LN11-N09','source_scope':'Lk 22:66','required_evidence':'Lk 22:66','confidence_code':'D1','textual_variant_flag':'none','claim':'Luke 22:66 anchor; exact merged chronology is not established.'}}
    write(edir/'R05_EVIDENCE_PROVENANCE_CORRECTIONS_v0.1.json',{'schema_version':'R05_EVIDENCE_PROVENANCE_CORRECTIONS_v0.1','patches':epatch})

def main():
    with tempfile.TemporaryDirectory(prefix='r05_effective_fixture_') as td:
        root=Path(td); make_fixture(root)
        rc,out=run(root)
        if rc!=0 or 'PRE_R05_NODE_TARGETS=6/6' not in out or 'PRE_R05_EVIDENCE_TARGETS=6/6' not in out:
            print('EFFECTIVE_GOOD_FIXTURE_FAIL'); print(out); return 1
        sem=root/'docs/campaigns/LN/LN-11_CANONICAL_v1.2/PRE_R05_SEMANTIC_CORRECTIONS_v1.0.json'; d=json.loads(sem.read_text(encoding='utf-8')); d['patches']['LN11-N04']['textual_variant_flag']='none'; write(sem,d)
        rc_bad_node,out_bad_node=run(root)
        if rc_bad_node==0 or 'LN11-N04/EVR-R05-0064 must be TX1' not in out_bad_node:
            print('BAD_NODE_CORRECTION_NOT_REJECTED'); print(out_bad_node); return 1
        d['patches']['LN11-N04']['textual_variant_flag']='TX1'; write(sem,d)
        ec=root/'docs/evidence/R05_EVIDENCE_PROVENANCE_CORRECTIONS_v0.1.json'; e=json.loads(ec.read_text(encoding='utf-8')); e['patches']['EVR-R05-0069']['confidence_code']='T2'; write(ec,e)
        rc_bad_ev,out_bad_ev=run(root)
        if rc_bad_ev==0 or 'LN11-N09/EVR-R05-0069 must be D1' not in out_bad_ev:
            print('BAD_EVIDENCE_CORRECTION_NOT_REJECTED'); print(out_bad_ev); return 1
        print('R05_EFFECTIVE_NODE_TARGETS=6/6 PASS')
        print('R05_EFFECTIVE_EVIDENCE_TARGETS=6/6 PASS')
        print('BAD_SEMANTIC_CORRECTION=REJECTED')
        print('BAD_EVIDENCE_CORRECTION=REJECTED')
        return 0
if __name__=='__main__': raise SystemExit(main())

from __future__ import annotations
import json, re
from pathlib import Path
from typing import Any

class ContentLoadError(RuntimeError): pass

class CanonicalContentLoader:
    """Read-only loader over canonical mission indexes and JSON shards. No question text is hard-coded here."""
    def __init__(self, repo_root: Path):
        self.repo_root=Path(repo_root).resolve(); self._missions=None; self._nodes=None; self._mission_for_node={}
    @property
    def campaigns_root(self)->Path:return self.repo_root/'docs'/'campaigns'
    def _scan(self):
        missions=[]; nodes={}; mission_for_node={}
        if not self.campaigns_root.exists(): raise ContentLoadError(f'campaign root missing: {self.campaigns_root}')
        for idx_path in sorted(self.campaigns_root.rglob('MISSION_INDEX.json')):
            try: idx=json.loads(idx_path.read_text(encoding='utf-8'))
            except Exception as exc: raise ContentLoadError(f'invalid mission index {idx_path}: {exc}') from exc
            mission=idx.get('mission') or {}; mid=mission.get('mission_id'); cid=mission.get('campaign_id')
            if not mid or not cid: raise ContentLoadError(f'mission index missing ids: {idx_path}')
            entry={'mission_id':mid,'campaign_id':cid,'title':mission.get('title',mid),'difficulty':mission.get('difficulty'),'entry_node':mission.get('entry_node'),'node_count':idx.get('node_count'),'primary_scripture':mission.get('primary_scripture',[]),'secondary_scripture':mission.get('secondary_scripture','none'),'canonical_status':idx.get('canonical_status','unknown'),'index_path':str(idx_path.relative_to(self.repo_root)).replace('\\','/'),'accessibility':mission.get('accessibility',{})}
            missions.append(entry)
            for shard_name in idx.get('node_files',[]):
                shard=(idx_path.parent/shard_name).resolve()
                if idx_path.parent.resolve() not in shard.parents: raise ContentLoadError('node shard path escape')
                data=json.loads(shard.read_text(encoding='utf-8'))
                for node in data.get('nodes',[]):
                    nid=node.get('node_id')
                    if not nid or nid in nodes: raise ContentLoadError(f'duplicate/empty node_id {nid!r}')
                    nodes[nid]=node; mission_for_node[nid]=entry
        self._missions=missions; self._nodes=nodes; self._mission_for_node=mission_for_node
    def refresh(self): self._scan()
    def _ensure(self):
        if self._missions is None:self._scan()
    def list_campaigns(self)->list[dict[str,Any]]:
        self._ensure(); grouped={}
        for m in self._missions:
            g=grouped.setdefault(m['campaign_id'],{'campaign_id':m['campaign_id'],'title':{'LN':'Остання ніч','PA':'Дорога Павла'}.get(m['campaign_id'],m['campaign_id']),'mission_count':0,'machine_node_count':0})
            g['mission_count']+=1; g['machine_node_count']+=int(m.get('node_count') or 0)
        return sorted(grouped.values(),key=lambda x:x['campaign_id'])
    def list_missions(self,campaign_id:str)->list[dict[str,Any]]:
        self._ensure(); return [dict(m) for m in self._missions if m['campaign_id']==campaign_id]
    def load_node(self,node_id:str)->dict[str,Any]:
        self._ensure()
        if node_id not in self._nodes: raise ContentLoadError(f'unknown machine-readable canonical node {node_id}')
        return dict(self._nodes[node_id])
    def mission_for_node(self,node_id:str)->dict[str,Any]:
        self._ensure(); return dict(self._mission_for_node[node_id])
    def next_node_id(self,node_id:str,outcome:str='correct')->str|None:
        node=self.load_node(node_id); raw=node.get({'correct':'on_correct','partial':'on_partial','incorrect':'on_incorrect'}.get(outcome,'on_correct'))
        if not isinstance(raw,str): return None
        match=re.fullmatch(r'(?:RESOLVED_NODE\s+)?([A-Z]{2,4}\d{2}-[NO]\d{2})',raw.strip())
        return match.group(1) if match else None

class TaskPresentationMapper:
    """Backward-compatible view mapper. It uses response/task metadata, never node IDs."""
    LONG_MARKERS=('argument','synthesis','comparison','witness','court','explain','editor')
    def infer_task_type(self,node:dict[str,Any])->str:
        explicit=node.get('task_type')
        if explicit:return str(explicit).upper()
        mode=(str(node.get('response_mode',''))+' '+str(node.get('task_family',''))).lower()
        if 'speaker' in mode and 'recipient' in mode:return 'SPEAKER_RECIPIENT'
        if 'parallel' in mode and 'witness' in mode:return 'PARALLEL_WITNESS_COMPARE'
        if ('ot' in mode and 'nt' in mode) or 'ot_nt_link' in mode:return 'OT_NT_LINK'
        if 'order' in mode or 'chronology' in mode:return 'ORDERING'
        if 'matching' in mode:return 'MATCHING'
        if 'combobox' in mode or 'select one' in mode:return 'COMBOBOX_SELECT'
        if 'claim' in mode and 'evidence' in mode:return 'CLAIM_EVIDENCE'
        if 'evidence select' in mode:return 'EVIDENCE_SELECT'
        if 'multi' in mode and 'select' in mode:return 'MULTI_SELECT'
        if 'classification' in mode or 'single choice' in mode:return 'SINGLE_CHOICE'
        if any(m in mode for m in self.LONG_MARKERS):return 'LONG_TEXT'
        return 'SHORT_TEXT'
    def to_renderable(self,node:dict[str,Any],mission:dict[str,Any]|None=None)->dict[str,Any]:
        task_type=self.infer_task_type(node); ui=dict(node.get('ui_metadata') or {}); options=list(ui.get('options') or [])
        if not options and task_type in {'SINGLE_CHOICE','COMBOBOX_SELECT'}:
            accepted=str(node.get('accepted_answer','')).strip(); rejected=str(node.get('rejected_answers','')).strip()
            if accepted: options.append({'id':'accepted','label':accepted})
            for i,p in enumerate([x.strip() for x in re.split(r';|\n',rejected) if x.strip()]): options.append({'id':f'rejected-{i+1}','label':p})
        answer_contract=dict(node.get('answer_contract') or {})
        if not answer_contract:
            if task_type in {'SINGLE_CHOICE','COMBOBOX_SELECT'} and options: answer_contract={'accepted_choice_ids':['accepted']}
            elif task_type=='MULTI_SELECT': answer_contract={'accepted_choice_ids':ui.get('accepted_choice_ids',[])}
        return {'node_id':node['node_id'],'mission_id':node['mission_id'],'task_type':task_type,'task_family':node.get('task_family'),'difficulty':node.get('difficulty'),'required':bool(node.get('required')),'heading':ui.get('heading') or f"Завдання {node['node_id']}",'prompt':node.get('player_prompt',''),'source_scope':node.get('source_scope_visible_to_player',''),'source_references':self._source_refs(node,mission),'options':options,'items':list(ui.get('items') or []),'pairs':list(ui.get('pairs') or []),'evidence_options':list(ui.get('evidence_options') or []),'steps':list(ui.get('steps') or []),'fields':list(ui.get('fields') or []),'witnesses':list(ui.get('witnesses') or []),'relation_types':list(ui.get('relation_types') or []),'answer_contract':answer_contract,'accessibility':{'nonvisual_equivalent':node.get('functional_nonvisual_equivalent',''),'announcements':'Result, evidence, confidence/TX1 and next action are textual.'},'visual':dict(node.get('visual_metadata') or {'state_badge':node.get('confidence_code'),'media_slot':None})}
    @staticmethod
    def _source_refs(node,mission):
        vals=[]
        for value in [node.get('required_evidence'), node.get('source_scope_visible_to_player')]:
            if isinstance(value,str) and value.strip(): vals.append(value.strip())
            elif isinstance(value,list): vals.extend(map(str,value))
        if mission:
            primary=mission.get('primary_scripture',[])
            if isinstance(primary,str): vals.append(primary)
            else: vals.extend(map(str,primary))
        out=[]
        for v in vals:
            if v not in out:out.append(v)
        return out[:12]

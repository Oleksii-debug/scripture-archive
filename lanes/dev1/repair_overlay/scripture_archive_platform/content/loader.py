from __future__ import annotations
import json, re
from pathlib import Path
from typing import Any
from scripture_archive_platform.domain.models import CONTENT_SCHEMA_VERSION
from scripture_archive_platform.transport.answer_contracts import canonical_task_type, answer_contract_descriptor
from scripture_archive_platform.composite_accessibility import inspect_packaged_task

class ContentLoadError(RuntimeError): pass

class CanonicalContentLoader:
    """Read-only loader over canonical mission indexes and JSON shards. No question text is hard-coded here."""
    def __init__(self,repo_root: Path):
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
            entry={
              'mission_id':mid,'campaign_id':cid,'title':mission.get('title',mid),'difficulty':mission.get('difficulty'),
              'entry_node':mission.get('entry_node'),'node_count':idx.get('node_count'),
              'primary_scripture':mission.get('primary_scripture',[]),'secondary_scripture':mission.get('secondary_scripture','none'),
              'canonical_status':idx.get('canonical_status','unknown'),'index_path':str(idx_path.relative_to(self.repo_root)).replace('\\','/'),
              'accessibility':mission.get('accessibility',{})
            }; missions.append(entry)
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
    COMPOSITE_HAZARD_KEYS=(
        'mouse_only','pointer_only','drag_only','color_only','image_only','hover_only','timed_only',
        'visual_only','spatial_only','requires_mouse','requires_pointer','requires_drag',
        'requires_color_discrimination','requires_image_recognition','requires_hover','timed_response_only',
        'interaction_mode','input_mode','control_mode','response_mode','visual_dependency',
    )
    def infer_task_type(self,node:dict[str,Any])->str:
        explicit=node.get('task_type')
        if explicit:return canonical_task_type(str(explicit))
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
        if 'argument' in mode:return 'ARGUMENT'
        if any(m in mode for m in self.LONG_MARKERS):return 'LONG_TEXT'
        return 'SHORT_TEXT'
    @staticmethod
    def _option_objects(values):
        out=[]
        for item in values or []:
            if isinstance(item,dict):
                value=item.get('value',item.get('id',item.get('label','')))
                label=item.get('label',value)
            else:
                value=label=str(item)
            if str(value).strip(): out.append({'id':str(value),'label':str(label)})
        return out
    def _matching_objects(self,raw_pairs):
        raw_pairs=list(raw_pairs or [])
        if raw_pairs and all(isinstance(x,dict) and 'left_id' in x and 'right_options' in x for x in raw_pairs):
            return [
                {
                    'left_id':str(x.get('left_id','')),
                    'left_label':str(x.get('left_label',x.get('left_id',''))),
                    'right_options':self._option_objects(x.get('right_options') or []),
                }
                for x in raw_pairs
            ]
        if raw_pairs and all(isinstance(x,dict) and 'passage' in x and 'claim' in x for x in raw_pairs):
            rights=[{'id':str(x['claim']),'label':str(x['claim'])} for x in raw_pairs]
            return [{'left_id':str(x['passage']),'left_label':str(x['passage']),'right_options':rights} for x in raw_pairs]
        if raw_pairs and all(isinstance(x,dict) and 'left' in x and 'right' in x for x in raw_pairs):
            rights=[{'id':str(x['right']),'label':str(x['right'])} for x in raw_pairs]
            return [{'left_id':str(x['left']),'left_label':str(x['left']),'right_options':rights} for x in raw_pairs]
        return []
    def _normalize_composite_steps(self,steps,preserve_contract:bool):
        normalized_steps=[]
        for i,step in enumerate(steps or []):
            if not isinstance(step,dict):
                normalized_steps.append({'step_id':str(i+1),'label':str(step),'prompt':str(step)})
                continue
            normalized={
                'step_id':str(step.get('step_id',step.get('id',step.get('step',i+1)))),
                'label':str(step.get('label',step.get('required',step.get('type',f'Крок {i+1}')))),
                'prompt':str(step.get('prompt',step.get('required',''))),
            }
            if preserve_contract:
                child_type=step.get('task_type') or step.get('renderer_type')
                if child_type:
                    ctype=canonical_task_type(str(child_type))
                    normalized['task_type']=ctype
                    normalized['answer_contract']=answer_contract_descriptor(ctype)
                accessibility=step.get('accessibility')
                if isinstance(accessibility,dict):
                    normalized['accessibility']=dict(accessibility)
                else:
                    nonvisual=step.get('functional_nonvisual_equivalent')
                    if isinstance(nonvisual,str) and nonvisual.strip():
                        normalized['accessibility']={
                            'nonvisual_equivalent':nonvisual.strip(),
                            'announcements':str(step.get('announcements') or 'Result, evidence, confidence/TX1 and next action are textual.'),
                        }
                visual=step.get('visual') if isinstance(step.get('visual'),dict) else step.get('visual_metadata')
                if isinstance(visual,dict): normalized['visual']=dict(visual)
                for key in self.COMPOSITE_HAZARD_KEYS:
                    if key in step: normalized[key]=step[key]
                if 'options' in step: normalized['options']=self._option_objects(step.get('options'))
                if 'items' in step: normalized['items']=self._option_objects(step.get('items'))
                if 'evidence_options' in step: normalized['evidence_options']=self._option_objects(step.get('evidence_options'))
                if 'pairs' in step: normalized['pairs']=self._matching_objects(step.get('pairs'))
                for key in ('fields','witnesses','relation_types'):
                    if key in step and isinstance(step.get(key),list): normalized[key]=list(step[key])
                if 'steps' in step:
                    normalized['steps']=self._normalize_composite_steps(step.get('steps'),True)
                if isinstance(step.get('source_scope'),str) and step.get('source_scope').strip():
                    normalized['source_scope']=step.get('source_scope').strip()
            normalized_steps.append(normalized)
        return normalized_steps
    def to_renderable(self,node:dict[str,Any],mission:dict[str,Any]|None=None)->dict[str,Any]:
        task_type=self.infer_task_type(node)
        ui=dict(node.get('ui_metadata') or {})
        payload=dict(node.get('response_contract') or node.get('task_contract') or node.get('task_payload') or {})
        options=self._option_objects(ui.get('options') or payload.get('options') or [])
        evidence_options=self._option_objects(ui.get('evidence_options') or payload.get('evidence_options') or [])
        if not evidence_options and task_type in {'EVIDENCE_SELECT','CLAIM_EVIDENCE'}:
            evidence_options=self._option_objects(payload.get('options') or payload.get('evidence') or [])
        raw_items=ui.get('items') or payload.get('items') or payload.get('ordered_items') or (payload.get('options') if task_type=='ORDERING' else [])
        items=[]
        for item in raw_items or []:
            if isinstance(item,dict): items.append({'id':str(item.get('id',item.get('value',item.get('label','')))),'label':str(item.get('label',item.get('value',item.get('id',''))))})
            else: items.append({'id':str(item),'label':str(item)})
        raw_pairs=ui.get('pairs') or payload.get('pairs') or []
        pairs=self._matching_objects(raw_pairs) if task_type=='MATCHING' else []
        ui_steps=ui.get('steps')
        payload_steps=payload.get('steps')
        if ui_steps:
            steps=list(ui_steps); preserve_step_contract=True
        elif payload_steps:
            steps=list(payload_steps); preserve_step_contract=True
        else:
            steps=[]; preserve_step_contract=False
        normalized_steps=self._normalize_composite_steps(steps,preserve_step_contract)
        relation_types=list(ui.get('relation_types') or payload.get('relation_types') or [])
        if task_type=='OT_NT_LINK' and not relation_types and payload.get('relation_category'):
            relation_types=[{'id':str(payload['relation_category']),'label':str(payload['relation_category'])}]
        legacy_answer_contract=dict(node.get('answer_contract') or {})
        if not legacy_answer_contract:
            if task_type in {'SINGLE_CHOICE','COMBOBOX_SELECT','PARALLEL_WITNESS_COMPARE'}:
                accepted=str(node.get('accepted_answer','')).strip()
                if accepted: legacy_answer_contract={'accepted_choice_ids':[accepted]}
            elif task_type=='MULTI_SELECT': legacy_answer_contract={'accepted_choice_ids':ui.get('accepted_choice_ids',payload.get('accepted_options',[]))}
        answer_contract=answer_contract_descriptor(task_type)
        surface={
          'node_id':node['node_id'],'mission_id':node['mission_id'],'task_type':task_type,
          'task_family':node.get('task_family'),'difficulty':node.get('difficulty'),'required':bool(node.get('required')),
          'heading':ui.get('heading') or f"Завдання {node['node_id']}",
          'prompt':node.get('player_prompt',''),'source_scope':node.get('source_scope_visible_to_player',''),
          'source_references':self._source_refs(node,mission),'options':options,'items':items,'pairs':pairs,
          'evidence_options':evidence_options,'steps':normalized_steps,'fields':list(ui.get('fields') or []),
          'witnesses':list(ui.get('witnesses') or []),'relation_types':relation_types,
          'answer_contract':answer_contract,'legacy_answer_contract':legacy_answer_contract,
          'accessibility':{'nonvisual_equivalent':node.get('functional_nonvisual_equivalent',''),'announcements':'Result, evidence, confidence/TX1 and next action are textual.'},
          'visual':dict(node.get('visual_metadata') or {'state_badge':node.get('confidence_code'),'media_slot':None}),
        }
        inspection=inspect_packaged_task(surface)
        surface['accessibility']['inspection']=inspection.to_dict()
        surface['accessibility']['inspection_linear']=list(inspection.linear())
        return surface
    @staticmethod
    def _source_refs(node,mission):
        vals=[]
        value=node.get('source_scope_visible_to_player')
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

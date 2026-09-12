from __future__ import annotations
import copy,json,time,traceback
from pathlib import Path
from typing import Any
from scripture_archive_platform.domain.models import TRANSPORT_API_VERSION
from scripture_archive_platform.domain.registries import build_task_registries
from scripture_archive_platform.transport.contracts import validate_request_shape,ok_response,error_response
from scripture_archive_platform.transport.review_queue_contract import validate_review_queue_projection
from scripture_archive_platform.content.loader import CanonicalContentLoader,TaskPresentationMapper,ContentLoadError
from scripture_archive_platform.content.library import CanonicalLibraryIndex
from scripture_archive_platform.grading.reference import ReferenceGrader
from scripture_archive_platform.persistence.store import JsonFileStore
from scripture_archive_platform.application.keymap import KeybindingService
from scripture_archive_platform.application.content_pack_manager import ContentPackManagerService
from scripture_archive_platform.application.research_workspace import ResearchWorkspaceService
from scripture_archive_platform.authoring.service import AuthoringService

class PlatformApplication:
    def __init__(self,repo_root:Path,store=None,loader=None,grader=None,player_gateway=None):
        self.repo_root=Path(repo_root).resolve(); self.store=store or JsonFileStore(JsonFileStore.default_root())
        self.loader=loader or CanonicalContentLoader(self.repo_root); self.library=CanonicalLibraryIndex(self.loader); self.mapper=TaskPresentationMapper(); self.grader=grader or ReferenceGrader(); self.player_gateway=player_gateway
        self.task_types,self.renderers,self.graders,self.editors,self.templates=build_task_registries()
        self.keymap=KeybindingService(self.store); self.research=ResearchWorkspaceService(self.store,self.loader,self.mapper); self.authoring=AuthoringService(self.store,self.task_types,self.mapper); self.content_packs=ContentPackManagerService(self.store.root)
        self._hint_level:dict[str,int]={}; self._last_node:dict[str,dict[str,Any]]={}
    def handle(self,request:dict[str,Any])->dict[str,Any]:
        rid=str(request.get('request_id','invalid')) if isinstance(request,dict) else 'invalid'
        try:
            rid,cmd,payload=validate_request_shape(request); data=self._dispatch(cmd,payload); return ok_response(rid,data)
        except (ValueError,KeyError,ContentLoadError,json.JSONDecodeError) as exc:return error_response(rid,'VALIDATION_ERROR',str(exc))
        except Exception as exc:return error_response(rid,'APPLICATION_ERROR','Операцію не виконано. Деталі записано в локальний журнал.')
    def _dispatch(self,cmd,p):
        if cmd=='system.bootstrap':return self._bootstrap()
        if cmd.startswith('content_packs.'):return self.content_packs.handle(cmd,p)
        if cmd=='content.list_campaigns':return {'campaigns':self.loader.list_campaigns()}
        if cmd=='content.list_missions':return {'missions':self.loader.list_missions(self._id(p,'campaign_id'))}
        if cmd=='library.catalog':return self.library.catalog()
        if cmd=='library.search':return self.library.search(p.get('query'),campaign_id=p.get('campaign_id'),mission_id=p.get('mission_id'),limit=p.get('limit',25))
        if cmd=='research.list_bookmarks':return {'bookmarks':self.research.list_bookmarks(p.get('query'))}
        if cmd=='research.upsert_bookmark':return {'bookmark':self.research.upsert_bookmark(p.get('bookmark'))}
        if cmd=='research.delete_bookmark':return {'deleted':self.research.delete_bookmark(p.get('bookmark_id'))}
        if cmd=='research.list_notes':return {'notes':self.research.list_notes(p.get('query'))}
        if cmd=='research.upsert_note':return {'note':self.research.upsert_note(p.get('note'))}
        if cmd=='research.delete_note':return {'deleted':self.research.delete_note(p.get('note_id'))}
        if cmd=='research.get_evidence_graph':return self._evidence_graph()
        if cmd=='research.get_chronology_lab':
            if p:raise ValueError('research.get_chronology_lab accepts an empty payload')
            return self._chronology_lab()
        if cmd=='player.load_node':return self._load_node(self._id(p,'node_id'))
        if cmd=='player.submit_answer':return self._submit(p)
        if cmd=='player.request_hint':return self._hint(self._id(p,'node_id'))
        if cmd=='player.reveal_evidence':return self._evidence(self._id(p,'node_id'))
        if cmd in {'player.next','player.navigate_branch'}:return self._next(p)
        if cmd=='player.get_progress':return {'progress':self._progress(self._id(p,'node_id'))}
        if cmd=='player.get_mastery':return self._mastery()
        if cmd=='player.get_review_queue':return self._review_queue()
        if cmd=='player.get_daily_case':
            if p:raise ValueError('player.get_daily_case accepts an empty payload')
            return self._daily_case()
        if cmd=='player.save_checkpoint':return self._save_checkpoint(p)
        if cmd=='player.restore_checkpoint':return self._restore_checkpoint()
        if cmd=='authoring.list_drafts':return {'drafts':self.authoring.list_drafts()}
        if cmd=='authoring.new_draft':return {'draft':self.authoring.new_draft(str(p.get('title') or 'Нова чернетка'),str(p.get('kind') or 'node'))}
        if cmd=='authoring.new_node_from_task_type':return {'draft':self.authoring.new_node_from_task_type(str(p.get('title') or 'Нова чернетка'),self._id(p,'task_type'))}
        if cmd=='authoring.load_draft':return {'draft':self.authoring.load_draft(self._id(p,'draft_id'))}
        if cmd=='authoring.save_draft':return {'draft':self.authoring.save_draft(p.get('draft'))}
        if cmd=='authoring.delete_draft':return self.authoring.delete_draft(self._id(p,'draft_id'))
        if cmd=='authoring.fork_record':return {'draft':self.authoring.fork_record(self._id(p,'kind'),p.get('record'),str(p.get('title') or '') or None)}
        if cmd=='authoring.fork_canonical_node':
            nid=self._id(p,'node_id'); node=self.loader.load_node(nid); return {'draft':self.authoring.fork_record('node',node,str(p.get('title') or f'Edit {nid}'))}
        if cmd=='authoring.move_collection_item':
            return {'draft':self.authoring.move_collection_item(p.get('draft'),self._id(p,'path'),p.get('index'),self._id(p,'direction'))}
        if cmd=='authoring.validate_draft':return self.authoring.validate_draft(p.get('draft'))
        if cmd=='authoring.preview_draft':return self.authoring.preview(p.get('draft'))
        if cmd=='authoring.prepare_publish_candidate':return {'candidate':self.authoring.prepare_publish_candidate(p.get('draft'))}
        if cmd=='authoring.export_draft':return {'format':'json','text':self.authoring.export_draft(self._id(p,'draft_id'))}
        if cmd=='authoring.import_draft':return {'draft':self.authoring.import_draft(str(p.get('text') or ''))}
        if cmd=='keymap.list':return {'actions':self.keymap.list(p.get('context'),str(p.get('search') or ''))}
        if cmd=='keymap.rebind':return {'action':self.keymap.rebind(self._id(p,'action_id'),p.get('binding'))}
        if cmd=='keymap.clear':return {'action':self.keymap.clear(self._id(p,'action_id'))}
        if cmd=='keymap.reset_context':return {'actions':self.keymap.reset_context(self._id(p,'context'))}
        if cmd=='keymap.reset_all':return {'actions':self.keymap.reset_all()}
        if cmd=='keymap.export':return self.keymap.export_data()
        if cmd=='keymap.import':return {'actions':self.keymap.import_data(p.get('data'))}
        if cmd=='settings.get':return {'settings':self.store.get_json('settings','ui',{}) or {}}
        if cmd=='settings.set':
            settings=p.get('settings');
            if not isinstance(settings,dict):raise ValueError('settings must be object')
            allowed={k:settings[k] for k in settings if k in {'theme','font_scale','high_contrast_mode','reduced_motion'}};self.store.put_json('settings','ui',allowed);return {'settings':allowed}
        raise ValueError('command not implemented')
    def _bootstrap(self):
        campaigns=self.loader.list_campaigns()
        return {'app':{'name':'Архів Писання','version':'R06-3DEV-A','runtime':'Windows 11 x64 / WebView2 semantic UI','transport_api_version':TRANSPORT_API_VERSION},'registries':{'task_types':self.task_types.list(),'renderers':self.renderers.list(),'graders':self.graders.list(),'editors':self.editors.list(),'templates':self.templates.list()},'campaigns':campaigns,'keymap':self.keymap.list(),'capabilities':{'constructor':True,'draft_vs_canonical':True,'web_portable_transport':True,'allowlisted_bridge':True,'library_catalog_search':True,'bundled_full_bible_text':False,'research_bookmarks_notes':True,'research_workspace_persistence':True,'evidence_graph':bool(self.player_gateway),'chronology_lab':bool(self.player_gateway),'arbitrary_filesystem':False,'content_pack_manager':True,'content_pack_inbox_only':True,'shell':False,'python_eval':False,'runtime_truth':bool(self.player_gateway),'review_queue':bool(self.player_gateway),'grading_truth':'D5/runtime' if self.player_gateway else 'REFERENCE_TEST_ONLY'}}
    def _load_node(self,nid):
        if self.player_gateway:self.player_gateway.invoke('player.load_node',{'node_id':nid},request_id='load-'+nid)
        node=self.loader.load_node(nid); mission=self.loader.mission_for_node(nid); renderable=self.mapper.to_renderable(node,mission); self._last_node[nid]=node
        return {'mission':mission,'task':renderable,'progress':self._progress(nid),'hint_level':self._hint_level.get(nid,0),'truth_owner':'D5/runtime' if self.player_gateway else 'REFERENCE_TEST_ONLY'}
    def _submit(self,p):
        nid=self._id(p,'node_id'); node=self.loader.load_node(nid); renderable=self.mapper.to_renderable(node,self.loader.mission_for_node(nid))
        if self.player_gateway:
            rr=self.player_gateway.invoke('player.submit_answer',{'node_id':nid,'task_type':renderable['task_type'],'answer':p.get('answer')},request_id='submit-'+nid)
            grade=dict(rr.get('grade') or {}); branch=dict(rr.get('branch') or {}); status=str(grade.get('correctness') or 'INCORRECT')
            return {'node_id':nid,'status':status,'score':grade.get('score'),'feedback':grade.get('feedback') or '','confidence_code':grade.get('confidence'),'textual_variant_flag':'TX1' if grade.get('tx1') else 'none','evidence':grade.get('evidence') or [],'uncertainty':grade.get('uncertainty'),'next_node_id':branch.get('next_node_id'),'branch':branch,'mastery_consequence':rr.get('mastery_consequence') or [],'accessibility':rr.get('accessibility') or [],'progress':self._progress(nid),'truth_owner':'D5/runtime'}
        result=self.grader.grade(node,renderable,p.get('answer')); hist=self.store.get_json('player','history',{}) or {}; rec=hist.setdefault(nid,{'attempts':0,'hints':0,'last_status':None});rec['attempts']+=1;rec['hints']=max(rec['hints'],self._hint_level.get(nid,0));rec['last_status']=result.status;rec['updated_at']=int(time.time());self.store.put_json('player','history',hist)
        next_id=self.loader.next_node_id(nid,'correct' if result.status=='CORRECT' else 'partial' if result.status in {'PARTIAL','REVIEW_REQUIRED'} else 'incorrect'); data=result.as_dict();data.update({'node_id':nid,'next_node_id':next_id,'progress':self._progress(nid),'truth_owner':'REFERENCE_TEST_ONLY'}); return data
    def _hint(self,nid):
        if self.player_gateway:
            rr=self.player_gateway.invoke('player.request_hint',{'node_id':nid},request_id='hint-'+nid); hint=dict(rr.get('hint') or {}); return {'node_id':nid,'hint_level':hint.get('level'),'hint':hint.get('text') or '','guided_mastery':int(hint.get('level') or 0)>=6,'accessibility':rr.get('accessibility'),'truth_owner':'D5/runtime'}
        node=self.loader.load_node(nid); hints=node.get('hints') or {}; level=min(7,self._hint_level.get(nid,0)+1);self._hint_level[nid]=level; text=hints.get(f'H{level}') if isinstance(hints,dict) else None; hist=self.store.get_json('player','history',{}) or {}; rec=hist.setdefault(nid,{'attempts':0,'hints':0,'last_status':None});rec['hints']=max(rec['hints'],level);self.store.put_json('player','history',hist); return {'node_id':nid,'hint_level':level,'hint':text or 'Для цього рівня немає додаткової підказки.','guided_mastery':level>=6,'truth_owner':'REFERENCE_TEST_ONLY'}
    def _evidence(self,nid):
        node=self.loader.load_node(nid)
        if self.player_gateway:
            rr=self.player_gateway.invoke('player.reveal_evidence',{},request_id='evidence-'+nid); return {'node_id':nid,'evidence':rr.get('linear') or rr.get('unlocked') or [],'unlocked_evidence_ids':rr.get('unlocked') or [],'confidence_code':node.get('confidence_code'),'textual_variant_flag':node.get('textual_variant_flag'),'notice':'TX1 qualification must be visible before affected grading.' if node.get('textual_variant_flag')=='TX1' else None,'truth_owner':'D5/runtime'}
        v=node.get('required_evidence',[]); evidence=list(map(str,v)) if isinstance(v,list) else ([str(v)] if v else []); return {'node_id':nid,'evidence':evidence,'confidence_code':node.get('confidence_code'),'textual_variant_flag':node.get('textual_variant_flag'),'notice':'TX1 qualification must be visible before affected grading.' if node.get('textual_variant_flag')=='TX1' else None,'truth_owner':'REFERENCE_TEST_ONLY'}
    def _evidence_graph(self):
        if not self.player_gateway:raise ValueError('Evidence Graph requires canonical runtime')
        return self.player_gateway.get_evidence_graph()
    def _next(self,p):
        nid=self._id(p,'node_id')
        if self.player_gateway:
            target=p.get('target_node_id'); payload={'target_node_id':str(target)} if target else {}; rr=self.player_gateway.invoke('player.navigate_branch' if target else 'player.next',payload,request_id='next-'+nid); task=rr.get('task') or {}; next_id=task.get('node_id')
            if not next_id:return {'complete_or_queued':True,'current_node_id':nid,'branch':rr.get('branch'),'accessibility':rr.get('accessibility'),'truth_owner':'D5/runtime'}
            node=self.loader.load_node(str(next_id)); mission=self.loader.mission_for_node(str(next_id)); renderable=self.mapper.to_renderable(node,mission); self._last_node[str(next_id)]=node; return {'mission':mission,'task':renderable,'progress':self._progress(str(next_id)),'hint_level':0,'truth_owner':'D5/runtime'}
        target=p.get('target_node_id') or self.loader.next_node_id(nid,'correct'); return {'complete_or_queued':True,'current_node_id':nid} if not target else self._load_node(str(target))
    def _mastery(self):
        if not self.player_gateway:return {'mastery':[],'truth_owner':'REFERENCE_TEST_ONLY'}
        rr=self.player_gateway.invoke('player.get_mastery',{},request_id='mastery-player'); return {'mastery':rr.get('mastery') or [],'truth_owner':'D5/runtime'}
    def _review_queue(self):
        if not self.player_gateway:return {'review_queue':[],'truth_owner':'REFERENCE_TEST_ONLY'}
        rr=self.player_gateway.invoke('player.get_review_queue',{},request_id='review-queue-player'); return {'review_queue':validate_review_queue_projection(rr.get('review_queue')),'truth_owner':'D5/runtime'}
    def _daily_case(self):
        if not self.player_gateway:raise ValueError('Daily Case requires canonical runtime')
        return self.player_gateway.get_daily_case()
    def _chronology_lab(self):
        if not self.player_gateway:raise ValueError('Chronology Lab requires canonical runtime')
        return self.player_gateway.get_chronology_lab()
    def _save_checkpoint(self,p):
        checkpoint={'campaign_id':p.get('campaign_id'),'mission_id':p.get('mission_id'),'node_id':p.get('node_id'),'saved_at':int(time.time()),'checkpoint_schema':'scripture.player.checkpoint.v1'}
        if self.player_gateway:self.player_gateway.invoke('player.save_checkpoint',{},request_id='save-'+str(p.get('node_id') or 'current'))
        self.store.put_json('player','checkpoint',checkpoint);return {'checkpoint':checkpoint,'truth_owner':'D5/runtime' if self.player_gateway else 'REFERENCE_TEST_ONLY'}
    def _restore_checkpoint(self):
        if self.player_gateway:
            rr=self.player_gateway.invoke('player.restore_checkpoint',{},request_id='restore-player'); nid=rr.get('current_node_id'); checkpoint=None
            if nid:
                try: mission=self.loader.mission_for_node(str(nid));checkpoint={'campaign_id':mission.get('campaign_id'),'mission_id':mission.get('mission_id'),'node_id':str(nid),'checkpoint_schema':'scripture.player.checkpoint.v1'}
                except Exception:checkpoint={'node_id':str(nid),'checkpoint_schema':'scripture.player.checkpoint.v1'}
            return {'checkpoint':checkpoint,'runtime_schema_version':rr.get('schema_version'),'truth_owner':'D5/runtime'}
        return {'checkpoint':self.store.get_json('player','checkpoint'),'truth_owner':'REFERENCE_TEST_ONLY'}
    def _progress(self,nid):
        mission=self.loader.mission_for_node(nid); mids=self.loader.list_missions(mission['campaign_id']); current=None; node_ids=[]
        for m in mids:
            if m['mission_id']==mission['mission_id']:
                self.loader._ensure(); node_ids=[x for x,v in self.loader._mission_for_node.items() if v['mission_id']==m['mission_id']]; break
        if nid in node_ids:current=node_ids.index(nid)+1
        return {'campaign_id':mission['campaign_id'],'mission_id':mission['mission_id'],'current':current,'machine_node_total':len(node_ids),'text':f"Завдання {current or '?'} з {len(node_ids)}"}
    @staticmethod
    def _id(p,key):
        v=p.get(key)
        if not isinstance(v,str) or not v or len(v)>100:raise ValueError(f'invalid {key}')
        return v

def build_default_application(repo_root:Path|None=None,store_root:Path|None=None):
    if repo_root is None:repo_root=Path(__file__).resolve().parents[3]
    repo_root=Path(repo_root); store=JsonFileStore(store_root) if store_root else None; effective_store=store or JsonFileStore(JsonFileStore.default_root())
    runtime_application=repo_root/'runtime_engine'/'scripture_archive_runtime'/'application.py'
    if runtime_application.exists():
        from scripture_archive_platform.application.runtime_gateway import build_runtime_gateway
        gateway=build_runtime_gateway(repo_root,effective_store.root); return PlatformApplication(repo_root,store=effective_store,player_gateway=gateway)
    return PlatformApplication(repo_root,store=effective_store)
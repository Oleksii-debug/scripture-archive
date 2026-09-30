from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Protocol
from scripture_archive_platform.domain.models import TRANSPORT_API_VERSION, GradeResult

MAX_REQUEST_BYTES = 262_144
MAX_IMPORT_BYTES = 2_000_000
DOSSIER_KINDS = frozenset({"PERSON", "EVENT", "PLACE", "THEME"})

ALLOWLISTED_COMMANDS = frozenset({
  "system.bootstrap",
  "content.list_campaigns","content.list_missions","library.catalog","library.search","player.load_node",
  "player.submit_answer","player.request_hint","player.reveal_evidence","player.next",
  "player.get_progress","player.get_mastery","player.get_review_queue","player.start_review","player.finish_review","player.get_daily_case","player.save_checkpoint","player.restore_checkpoint",
  "research.list_bookmarks","research.upsert_bookmark","research.delete_bookmark",
  "research.list_notes","research.upsert_note","research.delete_note","research.get_chronology_lab","research.get_evidence_graph","research.get_witness_matrix","research.get_cross_testament","research.export",
  "authoring.list_drafts","authoring.new_draft","authoring.new_node_from_task_type","authoring.load_draft","authoring.save_draft",
  "authoring.delete_draft","authoring.fork_record","authoring.fork_canonical_node","authoring.move_collection_item",
  "authoring.validate_draft","authoring.preview_draft","authoring.prepare_publish_candidate",
  "authoring.export_draft","authoring.import_draft","authoring.pack_compatibility",
  "authoring.create_snapshot","authoring.list_snapshots","authoring.restore_snapshot","authoring.diff_draft","authoring.history",
  "authoring.undo","authoring.redo","authoring.publish_version","authoring.list_versions","authoring.rollback_version",
  "keymap.list","keymap.rebind","keymap.clear","keymap.reset_context","keymap.reset_all",
  "keymap.export","keymap.import","settings.get","settings.set",
  "speech.status","speech.synthesize_prompt","application_update.select_verify","application_update.select_verify_stage","application_update.pending_status","application_update.prepare_apply","application_update.apply_and_restart","application_update.cancel_pending","application_update.commit_post_restart_health","dossier.get","diagnostics.get_report","library.text_catalog","library.read_chapter","library.text_search"
})

_PLAYER_TRUTH_OWNERS = frozenset({"D5/runtime", "REFERENCE_TEST_ONLY"})
_PRIVATE_PLAYER_TASK_KEYS = frozenset({
  "legacy_answer_contract",
  "accepted_answer",
  "rejected_answers",
  "accepted_choice_ids",
  "accepted_options",
  "accepted_pairs",
  "correct_answer",
  "correct_answers",
  "answer_key",
  "solution",
  "grading",
  "grader",
})

class ContentLoaderPort(Protocol):
    def list_campaigns(self)->list[dict[str,Any]]: ...
    def list_missions(self,campaign_id:str)->list[dict[str,Any]]: ...
    def load_node(self,node_id:str)->dict[str,Any]: ...
    def next_node_id(self,node_id:str,outcome:str='correct')->str|None: ...
class GraderPort(Protocol):
    def grade(self,node:dict[str,Any],renderable:dict[str,Any],answer:Any)->GradeResult: ...
class PersistencePort(Protocol):
    def get_json(self,namespace:str,key:str,default:Any=None)->Any: ...
    def put_json(self,namespace:str,key:str,value:Any)->None: ...
    def delete(self,namespace:str,key:str)->None: ...
    def list_keys(self,namespace:str)->list[str]: ...
class TransportAdapterPort(Protocol):
    def invoke(self,request:dict[str,Any])->dict[str,Any]: ...

def _validate_short_string(payload:dict[str,Any], key:str, *, max_length:int=256)->None:
    value=payload.get(key)
    if not isinstance(value,str) or not value.strip() or len(value)>max_length or any(ord(ch)<32 for ch in value):
        raise ValueError(f'invalid {key}')

def _require_clean_text(value:Any,key:str,max_length:int)->str:
    if not isinstance(value,str) or not value or len(value)>max_length or value!=value.strip():
        raise ValueError(f'invalid {key}')
    if any(ord(ch)<0x20 or 0x7f<=ord(ch)<=0x9f or ch in {'\u2028','\u2029'} for ch in value):
        raise ValueError(f'invalid {key}')
    return value

def validate_request_shape(request:Any)->tuple[str,str,dict[str,Any]]:
    if not isinstance(request,dict): raise ValueError('request must be an object')
    if request.get('api_version')!=TRANSPORT_API_VERSION: raise ValueError('unsupported api_version')
    rid=request.get('request_id'); cmd=request.get('command'); payload=request.get('payload',{})
    if not isinstance(rid,str) or not rid or len(rid)>128: raise ValueError('invalid request_id')
    if cmd not in ALLOWLISTED_COMMANDS: raise ValueError('command not allowlisted')
    if not isinstance(payload,dict): raise ValueError('payload must be an object')
    if cmd=='library.text_catalog' and payload:
        raise ValueError('library.text_catalog accepts an empty payload')
    if cmd=='library.read_chapter':
        if set(payload)!={'book','chapter'}:
            raise ValueError('library.read_chapter requires exactly book and chapter')
        _validate_short_string(payload,'book',max_length=4)
        chapter=payload.get('chapter')
        if isinstance(chapter,bool) or not isinstance(chapter,int) or not 1<=chapter<=200:
            raise ValueError('chapter must be integer 1..200')
    if cmd=='library.text_search':
        if set(payload)-{'query','limit'} or 'query' not in payload:
            raise ValueError('library.text_search requires query and optional limit only')
        _validate_short_string(payload,'query',max_length=128)
        limit=payload.get('limit',50)
        if isinstance(limit,bool) or not isinstance(limit,int) or not 1<=limit<=100:
            raise ValueError('limit must be integer 1..100')
    if cmd=='dossier.get':
        if set(payload)!={'subject_id','display_name','kind'}:
            raise ValueError('dossier.get requires exactly subject_id, display_name and kind')
        _require_clean_text(payload.get('subject_id'),'subject_id',100)
        _require_clean_text(payload.get('display_name'),'display_name',160)
        if payload.get('kind') not in DOSSIER_KINDS:
            raise ValueError('invalid dossier kind')
    if cmd=='player.next':
        unknown=set(payload)-{'node_id'}
        if unknown: raise ValueError('player.next accepts only current node_id context; target selection is forbidden')
        if 'node_id' in payload and (not isinstance(payload['node_id'],str) or not payload['node_id'] or len(payload['node_id'])>100): raise ValueError('invalid node_id')
    if cmd in {'player.get_review_queue','player.start_review','player.finish_review'} and payload:
        raise ValueError(f'{cmd} accepts an empty payload')
    if cmd=='player.get_daily_case' and payload:
        raise ValueError('player.get_daily_case accepts an empty payload')
    if cmd=='research.get_chronology_lab' and payload:
        raise ValueError('research.get_chronology_lab accepts an empty payload')
    if cmd=='research.get_evidence_graph' and payload:
        raise ValueError('research.get_evidence_graph accepts an empty payload')
    if cmd=='research.get_witness_matrix' and payload:
        raise ValueError('research.get_witness_matrix accepts an empty payload')
    if cmd=='research.get_cross_testament' and payload:
        raise ValueError('research.get_cross_testament accepts an empty payload')
    if cmd=='research.export' and payload:
        raise ValueError('research.export accepts an empty payload')
    if cmd=='authoring.pack_compatibility' and payload:
        raise ValueError('authoring.pack_compatibility accepts an empty payload')
    if cmd=='speech.status' and payload:
        raise ValueError('speech.status accepts an empty payload')
    if cmd in {'application_update.pending_status','application_update.prepare_apply','application_update.apply_and_restart','application_update.cancel_pending','application_update.commit_post_restart_health'} and payload:
        raise ValueError(f'{cmd} accepts an empty payload')
    if cmd=='speech.synthesize_prompt':
        allowed={'provider_id','voice_id','speed','allow_network'}
        unknown=set(payload)-allowed
        if unknown:
            raise ValueError('speech.synthesize_prompt accepts presentation preferences only')
        _validate_short_string(payload,'provider_id',max_length=100)
        _validate_short_string(payload,'voice_id',max_length=256)
        if type(payload.get('allow_network')) is not bool:
            raise ValueError('allow_network must be boolean')
        try: speed=float(payload.get('speed',1.0))
        except (TypeError,ValueError) as exc: raise ValueError('speech speed must be numeric') from exc
        if not 0.25<=speed<=4.0: raise ValueError('speech speed must be between 0.25 and 4.0')
    return rid,cmd,payload

def _redact_private_player_task(value:Any)->Any:
    if isinstance(value,dict):
        return {
          key:_redact_private_player_task(item)
          for key,item in value.items()
          if key not in _PRIVATE_PLAYER_TASK_KEYS
        }
    if isinstance(value,list): return [_redact_private_player_task(item) for item in value]
    return value

def _public_transport_data(data:Any)->Any:
    if not isinstance(data,dict): return data
    task=data.get('task')
    if data.get('truth_owner') not in _PLAYER_TRUTH_OWNERS or not isinstance(task,dict): return data
    public=dict(data)
    public['task']=_redact_private_player_task(task)
    return public

def ok_response(request_id:str,data:Any)->dict[str,Any]:
    return {"api_version":TRANSPORT_API_VERSION,"request_id":request_id,"ok":True,"data":_public_transport_data(data)}
def error_response(request_id:str,code:str,message:str,details:Any=None)->dict[str,Any]:
    err={"code":code,"message":message}
    if details is not None: err['details']=details
    return {"api_version":TRANSPORT_API_VERSION,"request_id":request_id,"ok":False,"error":err}
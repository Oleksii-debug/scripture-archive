from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Protocol
from scripture_archive_platform.domain.models import TRANSPORT_API_VERSION, GradeResult

MAX_REQUEST_BYTES = 262_144
MAX_IMPORT_BYTES = 2_000_000

ALLOWLISTED_COMMANDS = frozenset({
  "system.bootstrap",
  "content.list_campaigns","content.list_missions","library.catalog","library.search","player.load_node",
  "player.submit_answer","player.request_hint","player.reveal_evidence","player.next",
  "player.get_progress","player.get_mastery","player.get_review_queue","player.get_daily_case","player.save_checkpoint","player.restore_checkpoint",
  "research.list_bookmarks","research.upsert_bookmark","research.delete_bookmark",
  "research.list_notes","research.upsert_note","research.delete_note","research.get_chronology_lab","research.get_evidence_graph","research.get_witness_matrix","research.export",
  "authoring.list_drafts","authoring.new_draft","authoring.new_node_from_task_type","authoring.load_draft","authoring.save_draft",
  "authoring.delete_draft","authoring.fork_record","authoring.fork_canonical_node","authoring.move_collection_item",
  "authoring.validate_draft","authoring.preview_draft","authoring.prepare_publish_candidate",
  "authoring.export_draft","authoring.import_draft",
  "keymap.list","keymap.rebind","keymap.clear","keymap.reset_context","keymap.reset_all",
  "keymap.export","keymap.import","settings.get","settings.set",
  "application_update.select_verify","diagnostics.get_report",
  "content_packs.list","content_packs.inspect","content_packs.install","content_packs.verify","content_packs.activate","content_packs.rollback"
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

def _require_only(payload:dict[str,Any],allowed:set[str],command:str)->None:
    unknown=set(payload)-allowed
    if unknown: raise ValueError(f'{command} contains unsupported payload fields')

def _require_identity(payload:dict[str,Any],key:str,command:str)->str:
    value=payload.get(key)
    if not isinstance(value,str) or not value or len(value)>160: raise ValueError(f'{command} has invalid {key}')
    return value

def validate_request_shape(request:Any)->tuple[str,str,dict[str,Any]]:
    if not isinstance(request,dict): raise ValueError('request must be an object')
    if request.get('api_version')!=TRANSPORT_API_VERSION: raise ValueError('unsupported api_version')
    rid=request.get('request_id'); cmd=request.get('command'); payload=request.get('payload',{})
    if not isinstance(rid,str) or not rid or len(rid)>128: raise ValueError('invalid request_id')
    if cmd not in ALLOWLISTED_COMMANDS: raise ValueError('command not allowlisted')
    if not isinstance(payload,dict): raise ValueError('payload must be an object')
    if cmd=='player.next':
        unknown=set(payload)-{'node_id'}
        if unknown: raise ValueError('player.next accepts only current node_id context; target selection is forbidden')
        if 'node_id' in payload and (not isinstance(payload['node_id'],str) or not payload['node_id'] or len(payload['node_id'])>100): raise ValueError('invalid node_id')
    if cmd in {
        'player.get_review_queue','player.get_daily_case','research.get_chronology_lab','research.get_evidence_graph',
        'research.get_witness_matrix','research.export','application_update.select_verify','diagnostics.get_report','content_packs.list'
    } and payload:
        raise ValueError(f'{cmd} accepts an empty payload')
    if cmd=='content_packs.inspect':
        _require_only(payload,{'file_name'},cmd); _require_identity(payload,'file_name',cmd)
    if cmd=='content_packs.install':
        _require_only(payload,{'file_name','activate'},cmd); _require_identity(payload,'file_name',cmd)
        if 'activate' in payload and not isinstance(payload['activate'],bool): raise ValueError('content_packs.install activate must be boolean')
    if cmd in {'content_packs.verify','content_packs.activate'}:
        _require_only(payload,{'pack_id','version'},cmd); _require_identity(payload,'pack_id',cmd); _require_identity(payload,'version',cmd)
    if cmd=='content_packs.rollback':
        _require_only(payload,{'pack_id'},cmd); _require_identity(payload,'pack_id',cmd)
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
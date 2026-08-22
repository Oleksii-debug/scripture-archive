from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Protocol
from scripture_archive_platform.domain.models import TRANSPORT_API_VERSION, GradeResult

MAX_REQUEST_BYTES = 262_144
MAX_IMPORT_BYTES = 2_000_000

ALLOWLISTED_COMMANDS = frozenset({
  "system.bootstrap",
  "content.list_campaigns","content.list_missions","player.load_node",
  "player.submit_answer","player.request_hint","player.reveal_evidence","player.next","player.navigate_branch",
  "player.get_progress","player.get_mastery","player.save_checkpoint","player.restore_checkpoint",
  "authoring.list_drafts","authoring.new_draft","authoring.load_draft","authoring.save_draft",
  "authoring.validate_draft","authoring.preview_draft","authoring.prepare_publish_candidate",
  "authoring.export_draft","authoring.import_draft",
  "keymap.list","keymap.rebind","keymap.clear","keymap.reset_context","keymap.reset_all",
  "keymap.export","keymap.import","settings.get","settings.set"
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

def validate_request_shape(request:Any)->tuple[str,str,dict[str,Any]]:
    if not isinstance(request,dict): raise ValueError('request must be an object')
    if request.get('api_version')!=TRANSPORT_API_VERSION: raise ValueError('unsupported api_version')
    rid=request.get('request_id'); cmd=request.get('command'); payload=request.get('payload',{})
    if not isinstance(rid,str) or not rid or len(rid)>128: raise ValueError('invalid request_id')
    if cmd not in ALLOWLISTED_COMMANDS: raise ValueError('command not allowlisted')
    if not isinstance(payload,dict): raise ValueError('payload must be an object')
    return rid,cmd,payload

def ok_response(request_id:str,data:Any)->dict[str,Any]:
    return {"api_version":TRANSPORT_API_VERSION,"request_id":request_id,"ok":True,"data":data}
def error_response(request_id:str,code:str,message:str,details:Any=None)->dict[str,Any]:
    err={"code":code,"message":message}
    if details is not None: err['details']=details
    return {"api_version":TRANSPORT_API_VERSION,"request_id":request_id,"ok":False,"error":err}

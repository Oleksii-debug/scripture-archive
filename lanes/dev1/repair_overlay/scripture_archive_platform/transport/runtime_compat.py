from __future__ import annotations
import json
from typing import Any, Callable, Mapping
from scripture_archive_platform.domain.models import TRANSPORT_API_VERSION
from scripture_archive_platform.transport.contracts import validate_request_shape
from scripture_archive_platform.transport.answer_contracts import validate_answer_dto, AnswerContractError

RUNTIME_API_VERSION = "runtime.v1"
PLAYER_COMMAND_MAP = {
    "player.load_node": "load_task", "player.submit_answer": "submit_answer", "player.request_hint": "request_hint",
    "player.next": "next", "player.navigate_branch": "next", "player.get_mastery": "get_mastery",
    "player.save_checkpoint": "save", "player.restore_checkpoint": "restore", "player.reveal_evidence": "get_evidence",
}
class RuntimeContractError(ValueError): pass
class RuntimeEngineContractAdapter:
    """Boundary-only adapter from scripture.transport.v1 to canonical runtime.v1.

    Grading/mastery/scheduling remain runtime-owned. Player submissions are validated
    against the runtime-owned ANSWER_DTO_v1 before crossing the boundary.
    """
    def __init__(self, runtime_invoke: Callable[[Mapping[str, Any]], Mapping[str, Any]]): self._runtime_invoke=runtime_invoke
    def to_runtime_request(self, request: Mapping[str, Any]) -> dict[str, Any]:
        rid,command,payload=validate_request_shape(dict(request));runtime_command=PLAYER_COMMAND_MAP.get(command)
        if not runtime_command:raise RuntimeContractError(f"No runtime mapping for platform command: {command}")
        runtime_payload=dict(payload)
        if runtime_command=='submit_answer':
            answer=runtime_payload.get('answer');task_type=runtime_payload.get('task_type') or (answer.get('task_type') if isinstance(answer,Mapping) else None)
            if not isinstance(task_type,str) or not task_type:raise RuntimeContractError('player.submit_answer requires task_type for ANSWER_DTO_v1 validation')
            try:runtime_payload['answer']=validate_answer_dto(task_type,answer)
            except AnswerContractError as exc:raise RuntimeContractError(str(exc)) from exc
        if runtime_command in {'save','restore','get_evidence','get_mastery'}:runtime_payload={}
        if command=='player.navigate_branch' and runtime_payload.get('target_node_id'):
            runtime_payload={'node_id':str(runtime_payload['target_node_id'])}
        return {'api_version':RUNTIME_API_VERSION,'command':runtime_command,'request_id':rid,'payload':runtime_payload}
    def invoke_runtime(self,request:Mapping[str,Any])->dict[str,Any]:
        runtime_request=self.to_runtime_request(request);response=self._runtime_invoke(runtime_request)
        try:normalized=json.loads(json.dumps(response,ensure_ascii=False))
        except (TypeError,ValueError) as exc:raise RuntimeContractError('runtime response is not JSON-safe') from exc
        if not isinstance(normalized,dict):raise RuntimeContractError('runtime response must be an object')
        if normalized.get('api_version')!=RUNTIME_API_VERSION:raise RuntimeContractError('Unexpected runtime api_version')
        if normalized.get('request_id') not in {None,runtime_request['request_id']}:raise RuntimeContractError('runtime request_id mismatch')
        return normalized
    @staticmethod
    def platform_envelope(request_id:str,runtime_response:Mapping[str,Any])->dict[str,Any]:
        return {'api_version':TRANSPORT_API_VERSION,'request_id':request_id,'ok':True,'data':{'runtime_v1':dict(runtime_response)}}

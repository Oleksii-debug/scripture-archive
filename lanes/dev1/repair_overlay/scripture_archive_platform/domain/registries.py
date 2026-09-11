from __future__ import annotations
from typing import Any
from .models import BUILTIN_TASK_TYPES, TaskTypeDefinition
from scripture_archive_platform.transport.answer_contracts import answer_contract_descriptor

class RegistryError(ValueError): pass
class VersionedRegistry:
    def __init__(self,name:str,version:str="1"): self.name=name; self.version=version; self._items={}
    def register(self,key:str,value:Any)->None:
        if not key or key in self._items: raise RegistryError(f"{self.name}: duplicate/empty key {key!r}")
        self._items[key]=value
    def get(self,key:str)->Any:
        try:return self._items[key]
        except KeyError as exc: raise RegistryError(f"{self.name}: unknown key {key!r}") from exc
    def list(self)->list[dict[str,Any]]:
        out=[]
        for key,val in self._items.items():
            payload=dict(val.__dict__) if hasattr(val,'__dict__') else dict(val) if isinstance(val,dict) else {"value":str(val)}
            out.append({"id":key,**payload})
        return out
    def __contains__(self,key:str)->bool:return key in self._items
class TaskTypeRegistry(VersionedRegistry): pass
class RendererRegistry(VersionedRegistry): pass
class GraderRegistry(VersionedRegistry): pass
class EditorRegistry(VersionedRegistry): pass
class TaskTemplateRegistry(VersionedRegistry): pass
class ActionRegistry(VersionedRegistry): pass

# One explicit authoring/publishability contract for every built-in task type.
# Validation consumes this registry metadata; it does not maintain a second task-type table.
AUTHORING_TASK_CONTRACTS: dict[str, dict[str, Any]] = {
    "SINGLE_CHOICE": {"mode":"collection","collection":"options","min_items":2,"item_kind":"option"},
    "MULTI_SELECT": {"mode":"collection","collection":"options","min_items":2,"item_kind":"option"},
    "SHORT_TEXT": {"mode":"intrinsic","collection":None,"min_items":0,"item_kind":None},
    "LONG_TEXT": {"mode":"intrinsic","collection":None,"min_items":0,"item_kind":None},
    "ARGUMENT": {"mode":"intrinsic","collection":None,"min_items":0,"item_kind":None},
    "COMBOBOX_SELECT": {"mode":"collection","collection":"options","min_items":2,"item_kind":"option"},
    "ORDERING": {"mode":"collection","collection":"items","min_items":2,"item_kind":"option"},
    "MATCHING": {"mode":"collection","collection":"pairs","min_items":2,"item_kind":"matching_pair"},
    "EVIDENCE_SELECT": {"mode":"collection","collection":"evidence_options","min_items":1,"item_kind":"option"},
    "CLAIM_EVIDENCE": {"mode":"collection","collection":"evidence_options","min_items":1,"item_kind":"option"},
    "COMPOSITE_MULTI_STEP": {
        "mode":"collection","collection":"steps","min_items":1,"item_kind":"composite_step",
        "step_answer_task_types":["SHORT_TEXT","LONG_TEXT","ARGUMENT"],
    },
    "SPEAKER_RECIPIENT": {"mode":"intrinsic","collection":None,"min_items":0,"item_kind":None},
    "PARALLEL_WITNESS_COMPARE": {"mode":"collection","collection":"options","min_items":2,"item_kind":"option"},
    "OT_NT_LINK": {"mode":"collection","collection":"relation_types","min_items":1,"item_kind":"option"},
}

if set(AUTHORING_TASK_CONTRACTS) != set(BUILTIN_TASK_TYPES):
    missing = sorted(set(BUILTIN_TASK_TYPES) - set(AUTHORING_TASK_CONTRACTS))
    extra = sorted(set(AUTHORING_TASK_CONTRACTS) - set(BUILTIN_TASK_TYPES))
    raise RegistryError(f"Authoring contract registry mismatch: missing={missing} extra={extra}")

def _shape(task_type:str)->str:
    return "ANSWER_DTO_v1 " + str(answer_contract_descriptor(task_type)["fields"])

def _authoring_contract(task_type:str)->dict[str,Any]:
    contract=dict(AUTHORING_TASK_CONTRACTS[task_type])
    contract["answer_fields"]=dict(answer_contract_descriptor(task_type)["fields"])
    return contract

def build_task_registries():
    task=TaskTypeRegistry('TaskTypeRegistry','1.3');render=RendererRegistry('RendererRegistry','1.2');grader=GraderRegistry('GraderRegistry','1.2');editor=EditorRegistry('EditorRegistry','1.2');templates=TaskTemplateRegistry('TaskTemplateRegistry','1.2')
    for t in BUILTIN_TASK_TYPES:
        d=TaskTypeDefinition(t,f'render.{t.lower()}',f'grade.{t.lower()}',f'edit.{t.lower()}',_shape(t),'Keyboard-linear semantic HTML control; JSON-safe ANSWER_DTO_v1; no drag/color/spatial-only dependency.',_authoring_contract(t))
        task.register(t,d);render.register(t,{"renderer_id":d.renderer_id,"frontend_registry":True});grader.register(t,{"grader_id":d.grader_id,"port":"GraderPort","ownership":"DEV5/runtime"});editor.register(t,{"editor_id":d.editor_id,"frontend_registry":True});templates.register(t,{"template_id":f'template.{t.lower()}',"task_type":t,"defaults":{"required":True,"difficulty":"2/6"}})
    return task,render,grader,editor,templates

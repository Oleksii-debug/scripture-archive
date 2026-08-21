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

def _shape(task_type:str)->str:
    return "ANSWER_DTO_v1 " + str(answer_contract_descriptor(task_type)["fields"])

def build_task_registries():
    task=TaskTypeRegistry('TaskTypeRegistry','1.2');render=RendererRegistry('RendererRegistry','1.2');grader=GraderRegistry('GraderRegistry','1.2');editor=EditorRegistry('EditorRegistry','1.2');templates=TaskTemplateRegistry('TaskTemplateRegistry','1.2')
    for t in BUILTIN_TASK_TYPES:
        d=TaskTypeDefinition(t,f'render.{t.lower()}',f'grade.{t.lower()}',f'edit.{t.lower()}',_shape(t),'Keyboard-linear semantic HTML control; JSON-safe ANSWER_DTO_v1; no drag/color/spatial-only dependency.')
        task.register(t,d);render.register(t,{"renderer_id":d.renderer_id,"frontend_registry":True});grader.register(t,{"grader_id":d.grader_id,"port":"GraderPort","ownership":"DEV5/runtime"});editor.register(t,{"editor_id":d.editor_id,"frontend_registry":True});templates.register(t,{"template_id":f'template.{t.lower()}',"task_type":t,"defaults":{"required":True,"difficulty":"2/6"}})
    return task,render,grader,editor,templates

from __future__ import annotations
from typing import Any
from .models import BUILTIN_TASK_TYPES, TaskTypeDefinition

class RegistryError(ValueError): pass

class VersionedRegistry:
    def __init__(self, name: str, version: str = "1"):
        self.name=name; self.version=version; self._items: dict[str, Any]={}
    def register(self, key: str, value: Any) -> None:
        if not key or key in self._items: raise RegistryError(f"{self.name}: duplicate/empty key {key!r}")
        self._items[key]=value
    def get(self,key:str)->Any:
        try:return self._items[key]
        except KeyError as exc: raise RegistryError(f"{self.name}: unknown key {key!r}") from exc
    def list(self)->list[dict[str,Any]]:
        out=[]
        for key,val in self._items.items():
            if hasattr(val,'__dict__'): payload=dict(val.__dict__)
            elif isinstance(val,dict): payload=dict(val)
            else: payload={"value":str(val)}
            out.append({"id":key,**payload})
        return out
    def __contains__(self,key:str)->bool:return key in self._items

class TaskTypeRegistry(VersionedRegistry): pass
class RendererRegistry(VersionedRegistry): pass
class GraderRegistry(VersionedRegistry): pass
class EditorRegistry(VersionedRegistry): pass
class TaskTemplateRegistry(VersionedRegistry): pass
class ActionRegistry(VersionedRegistry): pass

def build_task_registries():
    task=TaskTypeRegistry('TaskTypeRegistry','1.0')
    render=RendererRegistry('RendererRegistry','1.0')
    grader=GraderRegistry('GraderRegistry','1.0')
    editor=EditorRegistry('EditorRegistry','1.0')
    templates=TaskTemplateRegistry('TaskTemplateRegistry','1.0')
    shapes={
      'SINGLE_CHOICE':'choice_id','MULTI_SELECT':'choice_id[]','SHORT_TEXT':'text','LONG_TEXT':'text',
      'COMBOBOX_SELECT':'choice_id','ORDERING':'item_id[]','MATCHING':'{left_id:right_id}',
      'EVIDENCE_SELECT':'evidence_id[]','CLAIM_EVIDENCE':'{claim,evidence[]}',
      'COMPOSITE_MULTI_STEP':'{step_id:value}',
      'SPEAKER_RECIPIENT':'{speaker,recipient}',
      'PARALLEL_WITNESS_COMPARE':'{witnesses:{witness_id:text},synthesis}',
      'OT_NT_LINK':'{ot_ref,nt_ref,relation_type,explanation}'
    }
    for t in BUILTIN_TASK_TYPES:
        definition=TaskTypeDefinition(t,f'render.{t.lower()}',f'grade.{t.lower()}',f'edit.{t.lower()}',shapes[t],
          'Keyboard-linear semantic HTML control with textual state/result; no drag/color/spatial-only dependency.')
        task.register(t,definition)
        render.register(t,{"renderer_id":definition.renderer_id,"frontend_registry":True})
        grader.register(t,{"grader_id":definition.grader_id,"port":"GraderPort","ownership":"DEV5/runtime"})
        editor.register(t,{"editor_id":definition.editor_id,"frontend_registry":True})
        templates.register(t,{"template_id":f'template.{t.lower()}',"task_type":t,"defaults":{"required":True,"difficulty":"2/6"}})
    return task,render,grader,editor,templates

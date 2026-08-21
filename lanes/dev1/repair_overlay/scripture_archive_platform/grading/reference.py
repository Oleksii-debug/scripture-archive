from __future__ import annotations
import re, unicodedata
from typing import Any
from scripture_archive_platform.domain.models import GradeResult
from scripture_archive_platform.transport.answer_contracts import validate_answer_dto, AnswerContractError

def _norm(value:Any)->str:
    s=unicodedata.normalize('NFKC',str(value or '')).casefold()
    s=re.sub(r'[^\w]+',' ',s,flags=re.UNICODE)
    return ' '.join(s.split())

def _variants(node):
    ans=[]
    primary=node.get('accepted_answer')
    if primary: ans.append(str(primary))
    extra=node.get('accepted_variants')
    if isinstance(extra,list):ans.extend(map(str,extra))
    elif isinstance(extra,str) and extra.strip():
        if '\n' in extra or ' | ' in extra: ans.extend(x.strip() for x in re.split(r'\n|\s\|\s',extra) if x.strip())
        else:ans.append(extra.strip())
    return ans

class ReferenceGrader:
    """Safe DEV1 compatibility grader. DEV5 can replace through GraderPort without UI changes."""
    def grade(self,node:dict[str,Any],renderable:dict[str,Any],answer:Any)->GradeResult:
        t=renderable['task_type']; contract=renderable.get('legacy_answer_contract') or {}
        if isinstance(answer,dict) and (answer.get('schema')=='ANSWER_DTO_v1' or 'task_type' in answer):
            try: normalized=validate_answer_dto(t,answer)
            except AnswerContractError:
                return GradeResult('INCORRECT',0.0,'Структура відповіді не відповідає ANSWER_DTO_v1.',needs_human_or_dev5_grader=False,**{'evidence':self._evidence(node),'confidence_code':node.get('confidence_code'),'textual_variant_flag':node.get('textual_variant_flag')})
            if t in {'SINGLE_CHOICE','COMBOBOX_SELECT','PARALLEL_WITNESS_COMPARE'}: answer=normalized['choice']
            elif t=='MULTI_SELECT': answer=normalized['choices']
            elif t in {'SHORT_TEXT','LONG_TEXT','ARGUMENT'}: answer=normalized['text']
            elif t=='ORDERING': answer=normalized['items']
            elif t=='MATCHING': answer={x['left']:x['right'] for x in normalized['pairs']}
            elif t=='EVIDENCE_SELECT': answer=normalized['evidence_ids']
            else: answer=normalized
        common={'evidence':self._evidence(node),'confidence_code':node.get('confidence_code'),'textual_variant_flag':node.get('textual_variant_flag')}
        if t in {'SINGLE_CHOICE','COMBOBOX_SELECT'} and contract.get('accepted_choice_ids'):
            correct=str(answer) in set(map(str,contract['accepted_choice_ids']))
            return GradeResult('CORRECT' if correct else 'INCORRECT',1.0 if correct else 0.0,node.get('success_feedback') if correct else node.get('failure_feedback'),**common)
        if t in {'MULTI_SELECT','EVIDENCE_SELECT'} and contract.get('accepted_choice_ids') is not None and contract.get('accepted_choice_ids')!=[]:
            got=set(map(str,answer if isinstance(answer,list) else [])); expected=set(map(str,contract['accepted_choice_ids']))
            if got==expected:return GradeResult('CORRECT',1.0,node.get('success_feedback',''),**common)
            if got & expected:return GradeResult('PARTIAL',0.5,node.get('partial_feedback',''),**common)
            return GradeResult('INCORRECT',0.0,node.get('failure_feedback',''),**common)
        if t=='ORDERING' and contract.get('accepted_order'):
            correct=list(map(str,answer if isinstance(answer,list) else []))==list(map(str,contract['accepted_order']))
            return GradeResult('CORRECT' if correct else 'INCORRECT',1.0 if correct else 0.0,node.get('success_feedback') if correct else node.get('failure_feedback'),**common)
        if t=='MATCHING' and contract.get('accepted_pairs'):
            correct={str(k):str(v) for k,v in (answer or {}).items()}=={str(k):str(v) for k,v in contract['accepted_pairs'].items()}
            return GradeResult('CORRECT' if correct else 'INCORRECT',1.0 if correct else 0.0,node.get('success_feedback') if correct else node.get('failure_feedback'),**common)
        if t in {'CLAIM_EVIDENCE','COMPOSITE_MULTI_STEP'} and contract:
            expected=contract.get('accepted_value')
            if expected is not None:
                correct=answer==expected; return GradeResult('CORRECT' if correct else 'INCORRECT',1.0 if correct else 0.0,node.get('success_feedback') if correct else node.get('failure_feedback'),**common)
        if t=='SHORT_TEXT':
            got=_norm(answer); candidates=[_norm(v) for v in _variants(node) if _norm(v)]
            if got and got in candidates:
                return GradeResult('CORRECT',1.0,node.get('success_feedback',''),**common)
            return GradeResult('REVIEW_REQUIRED',None,'Відповідь збережено. Для вільного тексту потрібен proposition-level grader DEV5; DEV1 не позначає семантично можливу відповідь неправильно.',needs_human_or_dev5_grader=True,**common)
        if t in {'LONG_TEXT','ARGUMENT'}:
            return GradeResult('REVIEW_REQUIRED',None,'Аргумент збережено. Остаточне proposition/evidence grading надає DEV5 через GraderPort.',needs_human_or_dev5_grader=True,**common)
        return GradeResult('REVIEW_REQUIRED',None,'Немає безпечного reference grader для цього контракту.',needs_human_or_dev5_grader=True,**common)
    @staticmethod
    def _evidence(node):
        v=node.get('required_evidence',[])
        return list(map(str,v)) if isinstance(v,list) else ([str(v)] if v else [])

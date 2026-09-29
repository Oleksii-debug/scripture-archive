import unittest
from scripture_archive_platform.transport.answer_contracts import validate_answer_dto, answer_contract_descriptor, AnswerContractError

class AnswerDtoTests(unittest.TestCase):
    def test_exact_shared_descriptors(self):
        expected={
            'SINGLE_CHOICE':{'choice':'string'},'MULTI_SELECT':{'choices':'string[]'},'SHORT_TEXT':{'text':'string'},'LONG_TEXT':{'text':'string'},'ARGUMENT':{'text':'string'},
            'COMBOBOX_SELECT':{'choice':'string'},'ORDERING':{'items':'string[]'},'MATCHING':{'pairs':'{left:string,right:string}[]'},'EVIDENCE_SELECT':{'evidence_ids':'string[]'},
            'CLAIM_EVIDENCE':{'claim':'string','evidence_ids':'string[]'},'SPEAKER_RECIPIENT':{'speaker':'string','recipient':'string'},'PARALLEL_WITNESS_COMPARE':{'synthesis':'string','witnesses':'string[]'},
            'OT_NT_LINK':{'ot_passage':'string','nt_passage':'string','relation_category':'string','confidence':'T1|T2|C1|I1|D1','evidence_id':'string'},
            'COMPOSITE_MULTI_STEP':{'steps':'{step_id:string,answer:object}[]'},
        }
        for task_type,fields in expected.items(): self.assertEqual(fields,answer_contract_descriptor(task_type)['fields'])
    def test_parallel_witness_contract_is_structured_and_choice_shape_is_rejected(self):
        dto=validate_answer_dto('PARALLEL_WITNESS_COMPARE',{'synthesis':'Порівняння без гармонізації','witnesses':['Acts 9; Acts 22']})
        self.assertEqual('Порівняння без гармонізації',dto['synthesis'])
        self.assertEqual(['Acts 9; Acts 22'],dto['witnesses'])
        with self.assertRaises(AnswerContractError): validate_answer_dto('PARALLEL_WITNESS_COMPARE',{'choice':'legacy'})

    def test_normalizes_matching_and_composite(self):
        m=validate_answer_dto('MATCHING',{'schema':'ANSWER_DTO_v1','task_type':'MATCHING','pairs':{'a':'b'}})
        self.assertEqual([{'left':'a','right':'b'}],m['pairs'])
        c=validate_answer_dto('COMPOSITE_MULTI_STEP',{'steps':[{'step_id':'s1','answer':{'text':'x'}}]})
        self.assertEqual('ANSWER_DTO_v1',c['schema'])
    def test_fail_closed_unknown_fields_and_empty(self):
        with self.assertRaises(AnswerContractError): validate_answer_dto('SINGLE_CHOICE',{'choice':'x','extra':'y'})
        with self.assertRaises(AnswerContractError): validate_answer_dto('SHORT_TEXT',{'text':''})

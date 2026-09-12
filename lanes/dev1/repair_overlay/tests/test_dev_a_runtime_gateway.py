import unittest
from scripture_archive_platform.application.runtime_gateway import RuntimeBackedPlayerGateway
from scripture_archive_platform.domain.models import BUILTIN_TASK_TYPES
from scripture_archive_platform.transport.answer_contracts import ANSWER_CONTRACT_VERSION,AnswerContractError,answer_contract_descriptor,validate_answer_dto
from runtime_engine.scripture_archive_runtime.package_adapters import adapt_node_for_runtime

class DevARuntimeGatewayTests(unittest.TestCase):
    def runtime(self,r):
        if r['command']=='submit_answer':return {'api_version':'runtime.v1','request_id':r['request_id'],'grade':{'correctness':'CORRECT'},'branch':{'next_node_id':'LN01-N02'}}
        return {'api_version':'runtime.v1','request_id':r['request_id'],'ok':True}
    def test_runtime_owns_answer_contract_for_all_14_types(self):
        self.assertEqual('ANSWER_DTO_v1',ANSWER_CONTRACT_VERSION);self.assertEqual(14,len(BUILTIN_TASK_TYPES))
        for t in BUILTIN_TASK_TYPES:self.assertEqual(t,answer_contract_descriptor(t)['task_type'])
    def test_gateway_validates_before_runtime(self):
        g=RuntimeBackedPlayerGateway(self.runtime);r=g.invoke('player.submit_answer',{'node_id':'LN01-N01','answer':{'schema':'ANSWER_DTO_v1','task_type':'SHORT_TEXT','text':'x'}},request_id='g-1');self.assertEqual('CORRECT',r['grade']['correctness'])
        with self.assertRaises(Exception):g.invoke('player.submit_answer',{'node_id':'LN01-N01','answer':'x'},request_id='g-2')
    def test_unknown_fields_fail_closed(self):
        with self.assertRaises(AnswerContractError):validate_answer_dto('SINGLE_CHOICE',{'choice':'a','forbidden':'x'})
    def test_legacy_citation_selection_projects_without_rewriting_authored_truth(self):
        authored='Matthew 26:17–19; Mark 14:12–16; Luke 22:7–13.'
        node={'response_mode':'citation selection','accepted_answer':authored,'accepted_variants':'Equivalent citation ranges containing the same preparation scenes.','required_evidence':'Matthew 26:17–19; Mark 14:12–16; Luke 22:7–13.'}
        adapted=adapt_node_for_runtime(node,lane='DEV-A')
        expected=['Matthew 26:17–19','Mark 14:12–16','Luke 22:7–13.']
        self.assertEqual(authored,adapted['accepted_answer'])
        self.assertEqual(expected,adapted['answer_dto']['choices'])
        self.assertEqual(expected,adapted['grading']['accepted_set'])

import unittest
from scripture_archive_platform.application.runtime_gateway import RuntimeBackedPlayerGateway,RuntimeGatewayError
from scripture_archive_platform.domain.models import BUILTIN_TASK_TYPES
from scripture_archive_platform.transport.answer_contracts import ANSWER_CONTRACT_VERSION,AnswerContractError,answer_contract_descriptor,validate_answer_dto

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
    def test_bound_gateway_rejects_stale_replayed_next_before_runtime_mutation(self):
        state={'current':'LN01-N01','calls':0}
        def runtime(request):
            self.assertEqual('next',request['command'])
            self.assertEqual({},request['payload'])
            state['calls']+=1
            state['current']='LN01-N02'
            return {'api_version':'runtime.v1','request_id':request['request_id'],'task':{'node_id':'LN01-N02'}}
        g=RuntimeBackedPlayerGateway(runtime,current_node_getter=lambda:state['current'])
        first=g.invoke('player.next',{},request_id='next-LN01-N01')
        self.assertEqual('LN01-N02',first['task']['node_id']);self.assertEqual(1,state['calls'])
        with self.assertRaisesRegex(RuntimeGatewayError,'stale player.next current-node context'):
            g.invoke('player.next',{},request_id='next-LN01-N01')
        self.assertEqual(1,state['calls'])
    def test_bound_gateway_requires_internal_current_node_context_for_next(self):
        calls=[]
        g=RuntimeBackedPlayerGateway(lambda request:calls.append(request) or {'api_version':'runtime.v1','request_id':request['request_id']},current_node_getter=lambda:'LN01-N01')
        with self.assertRaisesRegex(RuntimeGatewayError,'requires internal current-node context'):
            g.invoke('player.next',{},request_id='g-plain')
        self.assertEqual([],calls)
    def test_bound_gateway_accepts_matching_context_but_forwards_no_target_payload(self):
        seen=[]
        def runtime(request):
            seen.append(request)
            return {'api_version':'runtime.v1','request_id':request['request_id'],'branch':{'next_node_id':None}}
        g=RuntimeBackedPlayerGateway(runtime,current_node_getter=lambda:'LN01-N01')
        g.invoke('player.next',{},request_id='next-LN01-N01')
        self.assertEqual(1,len(seen));self.assertEqual({},seen[0]['payload']);self.assertNotIn('target_node_id',seen[0]['payload'])
